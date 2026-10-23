import { Hono } from "hono";
import { z } from "zod";
import type { AppEnv } from "./types";
import { randomToken } from "./security";
import { services } from "../shared/content";

// Mounted beneath the existing session + CSRF middleware. Never mount publicly.
export const commerce = new Hono<AppEnv>();
export const pricingSchema = z
  .object({
    slug: z.string().regex(/^[a-z0-9-]{2,100}$/),
    service_slug: z
      .string()
      .regex(/^[a-z0-9-]{2,100}$/)
      .or(z.literal(""))
      .refine(
        (value) => !value || services.some((service) => service.slug === value),
        "Choose an existing service",
      )
      .default(""),
    billing_interval: z.enum(["", "monthly", "yearly"]).default(""),
    title: z.string().trim().min(3).max(100),
    description: z.string().trim().min(10).max(500),
    features_json: z
      .string()
      .max(5000)
      .refine((value) => {
        try {
          const items: unknown = JSON.parse(value);
          return (
            Array.isArray(items) &&
            items.length > 0 &&
            items.length <= 20 &&
            items.every(
              (item) =>
                typeof item === "string" &&
                item.length > 0 &&
                item.length <= 300,
            )
          );
        } catch {
          return false;
        }
      }, "Use a JSON array of 1–20 feature strings"),
    amount_minor: z.number().int().min(0).max(100000000).nullable(),
    currency: z
      .string()
      .regex(/^[A-Z]{3}$/)
      .refine(
        (value) => Intl.supportedValuesOf("currency").includes(value),
        "Use a recognized currency code",
      ),
    billing: z.enum(["one_time", "recurring", "quote"]),
    delivery: z.string().trim().max(1000),
    revisions: z.string().trim().max(500),
    exclusions: z.string().trim().max(2000),
    disclosures: z.string().trim().max(2000),
    approved: z.union([z.literal(0), z.literal(1)]),
    status: z.enum(["draft", "published", "archived"]),
  })
  .refine(
    (p) =>
      p.status !== "published" ||
      !p.approved ||
      (!!p.delivery &&
        !!p.revisions &&
        !!p.exclusions &&
        !!p.disclosures &&
        (p.billing === "quote" ||
          (p.amount_minor !== null && !!p.service_slug)) &&
        (p.billing !== "recurring" || !!p.billing_interval)),
    "Approved publication requires delivery, revisions, exclusions, disclosures and a price or quote classification",
  );
const testimonial = z
  .object({
    name: z.string().trim().min(2).max(100),
    role: z.string().max(150),
    company: z.string().max(150),
    review: z.string().trim().min(20).max(3000),
    permission_reference: z.string().max(1000),
    verified: z.union([z.literal(0), z.literal(1)]),
    status: z.enum(["draft", "published", "archived"]),
  })
  .refine(
    (t) =>
      t.status !== "published" ||
      (t.verified === 1 && t.permission_reference.trim().length > 5),
    "Published reviews require verified evidence and permission",
  );
const compliance = z
  .object({
    title: z.string().trim().min(5).max(250),
    evidence: z.string().max(3000),
    status: z.enum(["incomplete", "review", "verified"]),
  })
  .refine(
    (c) => c.status !== "verified" || c.evidence.trim().length > 5,
    "Verification requires evidence",
  );
const entities = {
  pricing: { table: "pricing_packages", schema: pricingSchema },
  testimonials: { table: "testimonials", schema: testimonial },
  compliance: { table: "compliance_items", schema: compliance },
} as const;
commerce.get("/:entity", async (c) => {
  const entity = c.req.param("entity");
  if (entity === "invoice-requests") {
    const page = Math.max(
      1,
      Math.min(10000, Math.trunc(Number(c.req.query("page")) || 1)),
    );
    const search = `%${(c.req.query("search") || "").slice(0, 100)}%`;
    const rows = await c.env.DB.prepare(
      "SELECT r.id,r.request_type,r.status,r.display_currency,r.created_at,c.name,c.email,c.country,c.company FROM guest_requests r JOIN guest_customers c ON c.id=r.customer_id WHERE c.email LIKE ? ORDER BY r.created_at DESC,r.id LIMIT 20 OFFSET ?",
    )
      .bind(search, (page - 1) * 20)
      .all();
    const total = await c.env.DB.prepare(
      "SELECT COUNT(*) AS total FROM guest_requests r JOIN guest_customers c ON c.id=r.customer_id WHERE c.email LIKE ?",
    )
      .bind(search)
      .first<{ total: number }>();
    return c.json({ items: rows.results, total: total?.total || 0, page });
  }
  const config = entities[entity as keyof typeof entities];
  const table = config?.table || (entity === "orders" ? "orders" : undefined);
  if (!table) return c.json({ error: "Unknown collection" }, 404);
  const page = Math.max(
    1,
    Math.min(10000, Math.trunc(Number(c.req.query("page")) || 1)),
  );
  const search = `%${(c.req.query("search") || "").slice(0, 100)}%`;
  const field =
    entity === "orders"
      ? "customer_email"
      : entity === "testimonials"
        ? "name"
        : "title";
  const result = await c.env.DB.batch([
    c.env.DB.prepare(
      `SELECT * FROM ${table} WHERE ${field} LIKE ? ORDER BY created_at DESC,id LIMIT 20 OFFSET ?`,
    ).bind(search, (page - 1) * 20),
    c.env.DB.prepare(
      `SELECT COUNT(*) AS total FROM ${table} WHERE ${field} LIKE ?`,
    ).bind(search),
  ]);
  return c.json({
    items: result[0].results,
    total: (result[1].results[0] as { total: number }).total,
    page,
  });
});
commerce.post("/:entity", async (c) => {
  const entity = c.req.param("entity");
  if (entity !== "testimonials" && entity !== "pricing")
    return c.json(
      {
        error:
          "Only testimonial creation is supported; edit the seeded pricing and compliance records.",
      },
      405,
    );
  const parsed = (entity === "pricing" ? pricingSchema : testimonial).safeParse(
    await c.req.json(),
  );
  if (!parsed.success)
    return c.json(
      { error: parsed.error.issues.map((i) => i.message).join("; ") },
      400,
    );
  const id = randomToken(),
    fields = Object.keys(parsed.data),
    values = Object.values(parsed.data);
  await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT INTO ${entity === "pricing" ? "pricing_packages" : "testimonials"}(id,${fields.join(",")}) VALUES(${[id, ...values].map(() => "?").join(",")})`,
    ).bind(id, ...values),
    c.env.DB.prepare(
      "INSERT INTO audit_logs(id,admin_id,action,entity,entity_id) VALUES(?,?,?,?,?)",
    ).bind(randomToken(), c.get("session").admin_id, "create", entity, id),
  ]);
  return c.json({ saved: true, id }, 201);
});
commerce.put("/:entity/:id", async (c) => {
  const entity = c.req.param("entity"),
    config = entities[entity as keyof typeof entities];
  if (!config) return c.json({ error: "Unsupported collection" }, 404);
  const parsed = config.schema.safeParse(await c.req.json());
  if (!parsed.success)
    return c.json(
      {
        error: parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      },
      400,
    );
  const id = c.req.param("id");
  const existing = await c.env.DB.prepare(
    `SELECT id FROM ${config.table} WHERE id=?`,
  )
    .bind(id)
    .first();
  if (!existing) return c.json({ error: "Record not found" }, 404);
  const fields = Object.keys(parsed.data),
    values = Object.values(parsed.data);
  await c.env.DB.batch([
    c.env.DB.prepare(
      `UPDATE ${config.table} SET ${fields.map((f) => `${f}=?`).join(",")},updated_at=CURRENT_TIMESTAMP WHERE id=?`,
    ).bind(...values, id),
    c.env.DB.prepare(
      "INSERT INTO audit_logs(id,admin_id,action,entity,entity_id) VALUES(?,?,?,?,?)",
    ).bind(randomToken(), c.get("session").admin_id, "update", entity, id),
  ]);
  return c.json({ saved: true });
});
