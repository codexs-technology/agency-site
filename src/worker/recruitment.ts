import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { z } from "zod";
import { recruitmentSchema } from "../shared/validation";
import type { AppEnv } from "./types";
import { digest, randomToken, rateLimit, verifyTurnstile } from "./security";
import { careersConfigured, deliverCareers, toBase64 } from "./careers-webhook";

export const MAX_DOCUMENT_BYTES = 2 * 1024 * 1024;
export const MAX_COMBINED_BYTES = 3 * 1024 * 1024;
/** Structural allowlist only, NOT malware scanning. Production requires owner approval. */
export async function validateDocument(file: File) {
  if (!file.size || file.size > MAX_DOCUMENT_BYTES)
    throw new Error("Each document must be between 1 byte and 2 MiB.");
  if (
    file.name.length > 120 ||
    !file.name.length ||
    /[/\\]/.test(file.name) ||
    [...file.name].some(
      (char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127,
    )
  )
    throw new Error(
      "Use a document filename of at most 120 characters without path separators.",
    );
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
    maxSize: MAX_COMBINED_BYTES + 65536,
    onError: (c) =>
      c.json(
        { error: "Application exceeds the 3 MiB combined upload limit." },
        413,
      ),
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
    !careersConfigured(c.env) ||
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
  const files = [...form.values()].filter(
    (value) => value instanceof File && value.size,
  );
  if (
    files.length > 2 ||
    files.some((file) => file !== resume && file !== cover) ||
    files.reduce((size, file) => size + (file as File).size, 0) >
      MAX_COMBINED_BYTES
  )
    return c.json(
      {
        error:
          "Upload only a resume and optional cover document, at most 3 MiB combined.",
      },
      413,
    );
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
  const documents = [
    {
      name: `resume.${resumeData.extension}`,
      mimeType: resumeData.type,
      base64: toBase64(resumeData.bytes),
    },
    ...(coverData
      ? [
          {
            name: `cover.${coverData.extension}`,
            mimeType: coverData.type,
            base64: toBase64(coverData.bytes),
          },
        ]
      : []),
  ];
  const requestHash = await digest(`${job.id}:${d.email}`);
  try {
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
        null,
        null,
        await digest(accessKey),
      ),
      c.env.DB.prepare(
        "INSERT INTO recruitment_replays(request_hash,application_id) VALUES(?,?)",
      ).bind(requestHash, id),
      c.env.DB.prepare(
        "UPDATE job_applications SET document_metadata=?,delivery_code='dispatch_started',delivery_updated_at=CURRENT_TIMESTAMP WHERE id=?",
      ).bind(
        JSON.stringify(
          documents.map(({ name, mimeType }, index) => ({
            name,
            mimeType,
            size:
              index === 0 ? resumeData.bytes.length : coverData!.bytes.length,
          })),
        ),
        id,
      ),
    ];
    await c.env.DB.batch(statements);
  } catch {
    return c.json(
      {
        error:
          "Application could not be saved. Receipt is not confirmed; contact careers before resubmitting.",
      },
      503,
    );
  }
  const delivery = await deliverCareers(c.env, {
    name: d.name,
    email: d.email,
    position: job.title,
    reference: id,
    coverLetter: `${d.cover_letter}\n\nPhone: ${d.phone}\nCountry: ${d.country}\nLocation: ${d.applicant_location}\nExperience: ${d.experience}\nSkills: ${d.skills}\nPortfolio: ${d.portfolio_url}\nProfessional profile: ${d.professional_url}`,
    files: documents,
  });
  // A failed acknowledgement write must not trigger a second Gmail message.
  let deliveryState = delivery.state;
  try {
    await c.env.DB.prepare(
      "UPDATE job_applications SET delivery_state=?,delivery_code=?,delivery_updated_at=CURRENT_TIMESTAMP WHERE id=?",
    )
      .bind(delivery.state, delivery.code, id)
      .run();
  } catch {
    deliveryState = "pending";
  }
  return c.json(
    {
      stored: true,
      id,
      accessKey,
      message:
        "Application metadata saved. Keep your reference and access key private. Delivery state is shown separately; pending or failed delivery requires contacting careers, not another submission. Documents are not retained by this website.",
      notification: deliveryState,
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
      "SELECT a.id,a.recruitment_status,a.delivery_state,a.created_at,j.title FROM job_applications a JOIN job_openings j ON j.id=a.job_id WHERE a.id=? AND a.access_hash=?",
    )
      .bind(parsed.data.reference, hash)
      .first<{
        id: string;
        recruitment_status: string;
        delivery_state: string;
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
      deliveryState: row.delivery_state,
      position: row.title,
      receivedAt: row.created_at,
    });
  });
