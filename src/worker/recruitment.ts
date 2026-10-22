import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { z } from "zod";
import { recruitmentSchema } from "../shared/validation";
import type { AppEnv } from "./types";
import { digest, randomToken, rateLimit, verifyTurnstile } from "./security";
import { emailConfigured, notification, processOutbox } from "./email";

export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;
/** Structural allowlist only, NOT malware scanning. Production requires owner approval. */
export async function validateDocument(file: File) {
  if (!file.size || file.size > MAX_DOCUMENT_BYTES)
    throw new Error("Each document must be between 1 byte and 5 MB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const extension = file.name.toLowerCase().split(".").pop();
  const text = new TextDecoder("latin1").decode(bytes);
  if (
    extension === "pdf" &&
    file.type === "application/pdf" &&
    text.startsWith("%PDF-") &&
    text.includes("%%EOF") &&
    !/\/JavaScript|\/JS\b|\/Launch|\/EmbeddedFile|\/OpenAction/i.test(text)
  )
    return { bytes, type: "application/pdf", extension: "pdf" };
  if (
    extension === "docx" &&
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    bytes[2] === 3 &&
    bytes[3] === 4 &&
    text.includes("[Content_Types].xml") &&
    text.includes("word/document.xml") &&
    !/vbaProject|embeddings\/|activeX\//i.test(text)
  )
    return { bytes, type: file.type, extension: "docx" };
  throw new Error(
    "Use a valid PDF or DOCX without active or embedded content. Documents are untrusted; this check is not a malware scan.",
  );
}

// Mounted separately from JSON-only API; same security headers and DB fail-closed guard apply.
export const recruitment = new Hono<AppEnv>();
recruitment.use(
  "*",
  bodyLimit({
    maxSize: 11 * 1024 * 1024,
    onError: (c) =>
      c.json({ error: "Application exceeds the 11 MB request limit." }, 413),
  }),
);
recruitment.use("*", async (c, next) => {
  c.header("Cache-Control", "no-store");
  if (c.req.header("Origin") !== new URL(c.req.url).origin)
    return c.json({ error: "Origin not allowed" }, 403);
  await next();
});
recruitment.post("/submit", async (c) => {
  if (!(await rateLimit(c, "recruitment-submit", 3, 3600)))
    return c.json({ error: "Too many applications. Please try later." }, 429);
  if (
    !c.env.APPLICATION_DOCUMENTS ||
    c.env.APPLICATION_UPLOADS_APPROVED !== "true"
  )
    return c.json(
      {
        error:
          "Document applications are not configured and approved. Nothing has been saved. Contact codexstechnology@gmail.com.",
      },
      503,
    );
  if (!c.req.header("Content-Type")?.startsWith("multipart/form-data"))
    return c.json({ error: "Multipart form required" }, 415);
  let form: FormData;
  try {
    form = await c.req.formData();
  } catch {
    return c.json({ error: "Invalid application form" }, 400);
  }
  const parsed = recruitmentSchema.safeParse({
    ...Object.fromEntries(form),
    consent: form.get("consent") === "true",
  });
  if (!parsed.success)
    return c.json(
      { error: "Check application fields, HTTPS links and privacy consent." },
      400,
    );
  const d = parsed.data;
  if (!(await verifyTurnstile(c, d.turnstileToken, d.website)))
    return c.json(
      {
        error:
          "Security verification failed. Refresh the challenge and try again.",
      },
      422,
    );
  const job = await c.env.DB.prepare(
    "SELECT id,title FROM job_openings WHERE id=? AND status='published'",
  )
    .bind(d.job_id)
    .first<{ id: string; title: string }>();
  if (!job)
    return c.json(
      {
        error:
          "This position is not open. No general-interest applications are authorized.",
      },
      404,
    );
  if (
    await c.env.DB.prepare(
      "SELECT id FROM job_applications WHERE job_id=? AND email=?",
    )
      .bind(job.id, d.email)
      .first()
  )
    return c.json(
      {
        error:
          "An application already exists for this position and email. Use your existing reference and access key, or contact careers.",
      },
      409,
    );
  const resume = form.get("resume");
  const cover = form.get("cover_file");
  if (!(resume instanceof File))
    return c.json({ error: "A PDF or DOCX resume is required." }, 400);
  let resumeData: Awaited<ReturnType<typeof validateDocument>>;
  let coverData: Awaited<ReturnType<typeof validateDocument>> | undefined;
  try {
    resumeData = await validateDocument(resume);
    if (cover instanceof File && cover.size)
      coverData = await validateDocument(cover);
  } catch (error) {
    return c.json({ error: (error as Error).message }, 400);
  }
  const id = randomToken(),
    accessKey = randomToken();
  const resumeKey = `applications/${id}/resume.${resumeData.extension}`;
  const coverKey = coverData
    ? `applications/${id}/cover.${coverData.extension}`
    : null;
  const uploaded: string[] = [];
  try {
    await c.env.APPLICATION_DOCUMENTS.put(resumeKey, resumeData.bytes, {
      httpMetadata: { contentType: resumeData.type },
    });
    uploaded.push(resumeKey);
    if (coverData && coverKey) {
      await c.env.APPLICATION_DOCUMENTS.put(coverKey, coverData.bytes, {
        httpMetadata: { contentType: coverData.type },
      });
      uploaded.push(coverKey);
    }
    const statements = [
      c.env.DB.prepare(
        "INSERT INTO job_applications(id,job_id,name,email,cover_letter,portfolio_url,consent,phone,country,applicant_location,experience,skills,professional_url,resume_key,cover_file_key,access_hash) VALUES(?,?,?,?,?,?,1,?,?,?,?,?,?,?,?,?)",
      ).bind(
        id,
        job.id,
        d.name,
        d.email,
        d.cover_letter,
        d.portfolio_url,
        d.phone,
        d.country,
        d.applicant_location,
        d.experience,
        d.skills,
        d.professional_url,
        resumeKey,
        coverKey,
        await digest(accessKey),
      ),
      notification(c.env, "job application", id),
    ];
    if (c.env.SEND_CONFIRMATIONS === "true")
      statements.push(
        c.env.DB.prepare(
          "INSERT INTO email_outbox(id,kind,recipient,subject,text,status) VALUES(?,?,?,?,?,?)",
        ).bind(
          randomToken(),
          "application confirmation",
          d.email,
          "CodesBoxs application recorded",
          `Your application for ${job.title} was recorded. Reference: ${id}. Status access uses the separate private key shown after submission; it is not included in this email. This is not an interview or offer. Contact codexstechnology@gmail.com if you lose the key.`,
          emailConfigured(c.env) ? "pending" : "blocked",
        ),
      );
    await c.env.DB.batch(statements);
  } catch {
    // R2 and D1 cannot share a transaction. Compensate uploaded objects on failed persistence.
    await Promise.allSettled(
      uploaded.map((key) => c.env.APPLICATION_DOCUMENTS!.delete(key)),
    );
    return c.json(
      {
        error:
          "Application could not be saved. Receipt is not confirmed; contact careers before resubmitting.",
      },
      503,
    );
  }
  c.executionCtx.waitUntil(processOutbox(c.env));
  return c.json(
    {
      stored: true,
      id,
      accessKey,
      message:
        "Application saved. Keep your reference and separate access key private. Email delivery is not confirmed.",
      notification: emailConfigured(c.env) ? "queued" : "blocked",
    },
    201,
  );
});
const accessSchema = z.object({
  reference: z.string().regex(/^[a-f0-9]{64}$/),
  accessKey: z.string().regex(/^[a-f0-9]{64}$/),
});
for (const action of ["status", "withdraw"] as const)
  recruitment.post(`/${action}`, async (c) => {
    if (!(await rateLimit(c, "recruitment-access", 10, 900)))
      return c.json({ error: "Please try again later" }, 429);
    if (!c.req.header("Content-Type")?.startsWith("application/json"))
      return c.json({ error: "JSON required" }, 415);
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON" }, 400);
    }
    const parsed = accessSchema.safeParse(body);
    if (!parsed.success)
      return c.json({ error: "Invalid application credentials" }, 401);
    const hash = await digest(parsed.data.accessKey);
    const row = await c.env.DB.prepare(
      "SELECT a.id,a.recruitment_status,a.created_at,j.title FROM job_applications a JOIN job_openings j ON j.id=a.job_id WHERE a.id=? AND a.access_hash=?",
    )
      .bind(parsed.data.reference, hash)
      .first<{
        id: string;
        recruitment_status: string;
        created_at: string;
        title: string;
      }>();
    if (!row) return c.json({ error: "Invalid application credentials" }, 401);
    if (action === "withdraw") {
      await c.env.DB.prepare(
        "UPDATE job_applications SET recruitment_status='Withdrawn' WHERE id=? AND access_hash=?",
      )
        .bind(row.id, hash)
        .run();
      row.recruitment_status = "Withdrawn";
    }
    return c.json({
      reference: row.id,
      status: row.recruitment_status,
      position: row.title,
      receivedAt: row.created_at,
    });
  });
