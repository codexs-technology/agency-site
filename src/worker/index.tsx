import { Hono } from "hono";
import { renderToString } from "react-dom/server";
import { App } from "../web/App";
import { Admin } from "../web/Admin";
import {
  business,
  pages,
  services,
  type ContentRecord,
  type SiteData,
} from "../shared/content";
import { api } from "./api";
import { isLocal, randomToken } from "./security";
import { processOutbox } from "./email";
import type { AppEnv, Env } from "./types";
import { portfolioConcepts, mergeEditorial } from "../shared/portfolio";
import { editorialArticles } from "../shared/editorial";
import { recruitment } from "./recruitment";

const app = new Hono<AppEnv>();
const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
const safeJson = (value: unknown) =>
  JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
app.use("*", async (c, next) => {
  c.set("requestId", randomToken());
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header("X-Frame-Options", "DENY");
  c.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  c.header(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' https://challenges.cloudflare.com; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
  );
  if (new URL(c.req.url).protocol === "https:")
    c.header(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    );
  await next();
});
app.use("/api/*", async (c, next) => {
  if (!c.env.DB) {
    c.header("Cache-Control", "no-store");
    return c.json(
      {
        error:
          "Online services are not configured yet. Please contact codexstechnology@gmail.com.",
      },
      503,
    );
  }
  await next();
});
app.route("/api/recruitment", recruitment);
app.route("/api", api);
app.get("/robots.txt", (c) =>
  c.text(
    `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nSitemap: ${c.env.PUBLIC_SITE_URL}/sitemap.xml\n`,
  ),
);
app.get("/sitemap.xml", async (c) => {
  const paths = [
    ...portfolioConcepts.map((item) => `/portfolio/${item.slug}`),
    ...editorialArticles.map((item) => `/blog/${item.slug}`),
    ...Object.keys(pages).filter(
      (p) =>
        ![
          "/404",
          "/thank-you",
          "/newsletter/unsubscribe",
          "/careers/application-status",
          "/newsletter/confirm",
          "/privacy-policy",
          "/terms-of-service",
          "/cookie-policy",
          "/refund-policy",
          "/service-delivery-policy",
        ].includes(p),
    ),
    ...services.map((s) => `/services/${s.slug}`),
  ];
  for (const [table, prefix] of [
    ["blog_posts", "blog"],
    ["portfolio_projects", "portfolio"],
    ["services", "services"],
  ]) {
    if (!c.env.DB) continue;
    const rows = await c.env.DB.prepare(
      `SELECT slug FROM ${table} WHERE status='published'`,
    ).all<{ slug: string }>();
    paths.push(...rows.results.map((r) => `/${prefix}/${r.slug}`));
  }
  c.header("Content-Type", "application/xml");
  return c.body(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[...new Set(paths)].map((p) => `<url><loc>${escape(c.env.PUBLIC_SITE_URL + p)}</loc></url>`).join("")}</urlset>`,
  );
});
app.get("*", async (c) => {
  const requestedPath = new URL(c.req.url).pathname;
  // Preserve the existing draft URL and its canonical/noindex behavior.
  if (requestedPath.replace(/\/$/, "") === "/terms-and-conditions")
    return c.redirect("/terms-of-service", 308);
  const adminRoutes = [
    "/admin/login",
    "/admin/dashboard",
    "/admin/leads",
    "/admin/services",
    "/admin/pricing",
    "/admin/portfolio",
    "/admin/testimonials",
    "/admin/orders",
    "/admin/newsletter",
    "/admin/content",
    "/admin/settings",
    "/admin/audit-logs",
  ];
  const path = adminRoutes.includes(requestedPath) ? "/admin" : requestedPath;
  if (
    path.startsWith("/assets/") ||
    path.startsWith("/images/") ||
    path.startsWith("/fonts/")
  )
    return c.env.ASSETS.fetch(c.req.raw);
  if (path === "/admin" && !c.env.DB)
    return c.html(
      '<!doctype html><html lang="en"><head><meta name="robots" content="noindex"><title>Administration unavailable | CodesBoxs</title></head><body><main><h1>Administration is not configured yet</h1><p>A production database must be connected before administrator access is available.</p><a href="/">Return to the website</a></main></body></html>',
      503,
    );
  if (path !== "/" && path.endsWith("/"))
    return c.redirect(path.slice(0, -1), 308);
  const query = async (table: string): Promise<ContentRecord[]> =>
    c.env.DB
      ? (
          await c.env.DB.prepare(
            `SELECT * FROM ${table} WHERE status='published' ORDER BY created_at DESC LIMIT 200`,
          ).all<ContentRecord>()
        ).results
      : [];
  const [managedPosts, managedProjects, jobs, serviceContent] =
    await Promise.all([
      query("blog_posts"),
      query("portfolio_projects"),
      query("job_openings"),
      query("services"),
    ]);
  const posts = mergeEditorial(managedPosts, editorialArticles);
  const projects = mergeEditorial(managedProjects, portfolioConcepts);
  const settingRows = c.env.DB
    ? await c.env.DB.prepare("SELECT key,value FROM site_settings").all<{
        key: string;
        value: string;
      }>()
    : { results: [] };
  const data: SiteData = {
    applicationUploadsReady:
      !!c.env.APPLICATION_DOCUMENTS &&
      c.env.APPLICATION_UPLOADS_APPROVED === "true",
    adminSection:
      (
        {
          login: "dashboard",
          dashboard: "dashboard",
          leads: "contacts",
          services: "services",
          pricing: "pricing",
          portfolio: "portfolio",
          testimonials: "testimonials",
          orders: "orders",
          newsletter: "subscribers",
          content: "blog",
          settings: "settings",
          "audit-logs": "audits",
        } as Record<string, string>
      )[requestedPath.split("/")[2]] || "dashboard",
    pricing: c.env.DB
      ? (
          await c.env.DB.prepare(
            "SELECT * FROM pricing_packages WHERE status='published' AND approved=1 ORDER BY amount_minor,id",
          ).all<Record<string, unknown>>()
        ).results
      : [],
    testimonials: c.env.DB
      ? (
          await c.env.DB.prepare(
            "SELECT id,name,role,company,review FROM testimonials WHERE status='published' AND verified=1 AND length(permission_reference)>5 ORDER BY created_at DESC LIMIT 3",
          ).all<Record<string, unknown>>()
        ).results
      : [],
    path,
    posts,
    projects,
    jobs,
    serviceContent,
    turnstileSiteKey:
      c.env.DB && c.env.TURNSTILE_SECRET_KEY
        ? c.env.TURNSTILE_SITE_KEY || ""
        : "",
    siteUrl: c.env.PUBLIC_SITE_URL,
    localTestMode: isLocal(c.env, c.req.url),
    settings: Object.fromEntries(
      settingRows.results.map((row) => [row.key, row.value]),
    ),
  };
  const service = services.find((s) => path === `/services/${s.slug}`);
  const managedService = path.startsWith("/services/")
    ? serviceContent.find((s) => path === `/services/${s.slug}`)
    : undefined;
  const post = posts.find((p) => path === `/blog/${p.slug}`);
  const project = projects.find((p) => path === `/portfolio/${p.slug}`);
  if (project && c.env.DB && !project.id.startsWith("concept-")) {
    const images = await c.env.DB.prepare(
      "SELECT url,alt FROM portfolio_images WHERE project_id=? ORDER BY position,id",
    )
      .bind(project.id)
      .all<{ url: string; alt: string }>();
    Object.assign(project, { gallery: images.results });
  }
  const found = !!(
    pages[path] ||
    service ||
    managedService ||
    post ||
    project ||
    path === "/admin"
  );
  const title =
    managedService?.title ||
    service?.title ||
    post?.title ||
    project?.title ||
    (path === "/admin" ? "Administrator" : pages[found ? path : "/404"][0]);
  const description =
    managedService?.summary ||
    service?.summary ||
    post?.summary ||
    project?.summary ||
    (path === "/admin"
      ? "Authorized administration only."
      : pages[found ? path : "/404"][1]);
  const canonical = c.env.PUBLIC_SITE_URL.replace(/\/$/, "") + path;
  const privatePage =
    path.startsWith("/newsletter/") || path === "/careers/application-status";
  const schema: Record<string, unknown> = post
    ? {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: title,
        description,
        author: { "@type": "Organization", name: post.author },
        datePublished: post.published_at,
        mainEntityOfPage: canonical,
        publisher: {
          "@type": "Organization",
          name: business.brand,
          url: c.env.PUBLIC_SITE_URL,
        },
        articleSection: post.category,
        image: c.env.PUBLIC_SITE_URL + post.image,
      }
    : service || managedService
      ? {
          "@context": "https://schema.org",
          "@type": "Service",
          name: title,
          description,
          provider: { "@type": "Organization", name: business.name },
        }
      : {
          "@context": "https://schema.org",
          "@type": "Organization",
          name: business.brand,
          legalName: business.name,
          url: c.env.PUBLIC_SITE_URL,
          email: business.email,
          telephone: business.phone,
          contactPoint: {
            "@type": "ContactPoint",
            contactType: "customer support",
            email: business.supportEmail,
          },
          sameAs: business.socials.map((social) => social.url),
        };
  if (privatePage) c.header("X-Robots-Tag", "noindex, nofollow");
  c.header("Cache-Control", "no-store");
  return c.html(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(title)} | CodesBoxs</title><meta name="description" content="${escape(description)}"><link rel="canonical" href="${escape(canonical)}"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:url" content="${escape(canonical)}"><meta property="og:type" content="${post ? "article" : "website"}"><meta property="og:image" content="${escape(c.env.PUBLIC_SITE_URL)}/images/social-preview.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="CodesBoxs — We Build Intelligent Digital Experiences"><meta name="twitter:image" content="${escape(c.env.PUBLIC_SITE_URL)}/images/social-preview.png"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escape(title)}"><meta name="twitter:description" content="${escape(description)}"><meta name="theme-color" content="#0B0A09">${!found || path === "/admin" || path.includes("policy") || path === "/terms-of-service" ? '<meta name="robots" content="noindex,follow">' : ""}<link rel="icon" href="/images/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/assets/entry.css"><script type="application/ld+json">${safeJson(schema)}</script></head><body><div id="root">${renderToString(path === "/admin" ? <Admin /> : <App data={data} />)}</div><script id="site-data" type="application/json">${safeJson(data)}</script><script type="module" src="/assets/app.js"></script>${data.turnstileSiteKey ? '<script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" defer></script>' : ""}</body></html>`,
    found ? 200 : 404,
  );
});
app.onError((error, c) => {
  console.error(
    JSON.stringify({
      event: "request_error",
      requestId: c.get("requestId"),
      type: error.name,
    }),
  );
  return c.req.path.startsWith("/api/")
    ? c.json(
        {
          error: "The request could not be completed.",
          requestId: c.get("requestId"),
        },
        500,
      )
    : c.html(
        '<!doctype html><html lang="en"><title>Temporarily unavailable | CodesBoxs</title><body><main><h1>Temporarily unavailable</h1><p>Please try again or email codexstechnology@gmail.com.</p></main></body></html>',
        503,
      );
});
export default {
  fetch: app.fetch,
  async scheduled(
    _controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ) {
    ctx.waitUntil(processOutbox(env));
    ctx.waitUntil(
      env.DB.batch([
        env.DB.prepare("DELETE FROM admin_sessions WHERE expires_at<?").bind(
          Math.floor(Date.now() / 1000),
        ),
        env.DB.prepare("DELETE FROM rate_limits WHERE expires_at<?").bind(
          Math.floor(Date.now() / 1000),
        ),
      ]),
    );
  },
};
