import type { Env } from "./types";
import { randomToken } from "./security";
import { z } from "zod";

const emailAddress = z.email();
export function emailConfigured(env: Env) {
  const sender = env.EMAIL_FROM?.trim();
  const senderAddress = sender?.match(/<([^<>]+)>$/)?.[1] || sender;
  return !!(
    env.RESEND_API_KEY &&
    emailAddress.safeParse(senderAddress).success &&
    emailAddress.safeParse(
      env.NOTIFICATION_EMAIL || "codexstechnology@gmail.com",
    ).success
  );
}

export function notification(env: Env, kind: string, id: string) {
  const configured = emailConfigured(env);
  return env.DB.prepare(
    "INSERT INTO email_outbox(id,kind,recipient,subject,text,status) VALUES(?,?,?,?,?,?)",
  ).bind(
    randomToken(),
    kind,
    env.NOTIFICATION_EMAIL || "codexstechnology@gmail.com",
    `CodesBoxs: new ${kind}`,
    `A new ${kind} was stored. Reference: ${id}. Sign in to the administrator dashboard to view the details.`,
    configured ? "pending" : "blocked",
  );
}
const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
export async function processOutbox(env: Env) {
  if (!emailConfigured(env)) return;
  const now = Math.floor(Date.now() / 1000);
  await env.DB.prepare(
    "UPDATE email_outbox SET status='pending' WHERE status='blocked'",
  ).run();
  // Sending records are retried using a stable provider idempotency key after an interrupted request.
  const rows = await env.DB.prepare(
    "SELECT * FROM email_outbox WHERE status IN ('pending','sending') AND next_attempt_at<=? AND attempts<5 ORDER BY created_at LIMIT 10",
  )
    .bind(now)
    .all<{
      id: string;
      recipient: string;
      subject: string;
      text: string;
      attempts: number;
    }>();
  for (const row of rows.results) {
    const claimed = await env.DB.prepare(
      "UPDATE email_outbox SET status='sending', attempts=attempts+1, next_attempt_at=? WHERE id=? AND status IN ('pending','sending') AND next_attempt_at<=? RETURNING id",
    )
      .bind(now + 120, row.id, now)
      .first();
    if (!claimed) continue;
    if (!emailAddress.safeParse(row.recipient).success) {
      await env.DB.prepare(
        "UPDATE email_outbox SET status='failed',last_error='invalid_recipient' WHERE id=?",
      )
        .bind(row.id)
        .run();
      continue;
    }
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
          "Idempotency-Key": row.id,
        },
        body: JSON.stringify({
          from: env.EMAIL_FROM,
          to: [row.recipient],
          subject: row.subject,
          text: row.text,
          html: `<p>${escape(row.text)}</p>`,
        }),
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new Error(`provider_${response.status}`);
      await env.DB.prepare(
        "UPDATE email_outbox SET status='sent',sent_at=CURRENT_TIMESTAMP,last_error=NULL WHERE id=?",
      )
        .bind(row.id)
        .run();
    } catch (error) {
      const message =
        error instanceof Error && /^provider_\d+$/.test(error.message)
          ? error.message
          : "provider_unavailable";
      await env.DB.prepare(
        "UPDATE email_outbox SET status=?,next_attempt_at=?,last_error=? WHERE id=?",
      )
        .bind(
          row.attempts + 1 >= 5 ? "failed" : "pending",
          now + Math.min(3600, 60 * 2 ** row.attempts),
          message,
          row.id,
        )
        .run();
      console.warn(
        JSON.stringify({ event: "email_failure", id: row.id, code: message }),
      );
    }
  }
}
