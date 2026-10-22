import type { Env } from "./types";

export type CareersPayload = {
  name: string;
  email: string;
  position: string;
  reference: string;
  coverLetter: string;
  files: { name: string; mimeType: string; base64: string }[];
};

export function careersConfigured(env: Env) {
  try {
    const url = new URL(env.CAREERS_WEBHOOK_URL || "");
    return (
      url.protocol === "https:" &&
      url.hostname === "script.google.com" &&
      /^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url.pathname) &&
      !url.search &&
      !url.hash &&
      !url.username &&
      !url.password &&
      (env.CAREERS_WEBHOOK_SECRET?.length || 0) >= 32
    );
  } catch {
    return false;
  }
}

export function toBase64(bytes: Uint8Array) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192)
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary);
}

/** No automatic POST retry: ambiguous outcomes require reconciliation. */
export async function deliverCareers(
  env: Env,
  payload: CareersPayload,
): Promise<{
  state: "sent" | "pending" | "failed";
  code: string;
}> {
  if (!careersConfigured(env))
    return { state: "failed", code: "configuration" };
  try {
    const signal = AbortSignal.timeout(20000);
    let response = await fetch(env.CAREERS_WEBHOOK_URL!, {
      method: "POST",
      redirect: "manual",
      signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        secret: env.CAREERS_WEBHOOK_SECRET,
        issuedAt: Date.now(),
        version: 1,
      }),
    });
    // ContentService returns a one-time GET URL. Never forward the secret/body.
    if (response.status === 302 || response.status === 303) {
      const location = new URL(response.headers.get("Location") || "");
      if (
        location.protocol !== "https:" ||
        location.hostname !== "script.googleusercontent.com" ||
        location.username ||
        location.password
      )
        throw new Error("redirect");
      response = await fetch(location.href, {
        method: "GET",
        redirect: "error",
        signal,
      });
    }
    if (
      !response.ok ||
      !response.headers.get("Content-Type")?.includes("application/json")
    )
      return { state: "pending", code: "unconfirmed_response" };
    const text = await response.text();
    if (text.length > 4096)
      return { state: "pending", code: "unconfirmed_response" };
    const result = JSON.parse(text) as Record<string, unknown>;
    if (result.reference !== payload.reference || result.version !== 1)
      return { state: "pending", code: "protocol_mismatch" };
    if (result.ok === true && result.state === "sent")
      return { state: "sent", code: "accepted_by_mailapp" };
    if (
      result.state === "failed" &&
      ["quota", "invalid", "unauthorized", "ledger_full"].includes(
        String(result.code),
      )
    )
      return { state: "failed", code: String(result.code) };
    return { state: "pending", code: "manual_reconciliation" };
  } catch {
    return { state: "pending", code: "unconfirmed_delivery" };
  }
}
