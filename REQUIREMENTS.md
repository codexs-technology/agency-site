# Requirements and acceptance gates

All unchecked gates are pending, not implied complete.

## Public routes
- [x] /, /about, /services, /ai-solutions, /portfolio, /industries, /process (page/image browser check passed)
- [x] /technologies, /engagement-models, /blog, /careers, /faq, /contact, /start-project (page/image browser check passed)
- [ ] /privacy-policy, /terms-of-service, /cookie-policy, /thank-you, /404
- [ ] 13 unique service pages, portfolio details, published blog details
- [ ] Unique SSR titles, descriptions, canonical, OG, Twitter, structured data
- [x] robots.txt, sitemap.xml, real HTTP 404 (local HTTP integration checks)
- [ ] Desktop mega menu, mobile drawer, complete footer and link verification
- [x] Original local images, meaningful alt, sizes, lazy loading, no fake claims (decoded browser image checks)
- [ ] Portfolio search/filter, searchable FAQ, interactive process and AI sample demo

## Persistence and administration
- [ ] Contact, project, consultation and newsletter endpoints and validated UI
- [ ] Job listings/application flow with truthful empty state
- [x] Versioned D1 migrations, indexes, constraints and safe seeds (local migration verification)
- [x] Tables: admins, admin_sessions, contacts, project_inquiries, newsletter_subscribers, services, portfolio_projects, portfolio_images, blog_posts, blog_categories, job_openings, job_applications, site_settings, audit_logs
- [ ] Bootstrap without public credentials, strong password hash, session expiration/logout
- [ ] Admin overview, lead statuses/search/pagination, subscribers, applications, audits
- [ ] Blog/portfolio/service/job CRUD, publish controls, settings
- [ ] API validation, authorization, CSRF, rate limits, security headers, safe errors
- [ ] Turnstile fails closed in production; email status honest, durable retry
- [ ] Resume upload optional only if securely configured; never imply it works when absent

## Quality and deployment
- [x] Strict TypeScript, ESLint, formatting, unit tests (10 unit tests passed; rerun after future changes)
- [x] Actual Worker/D1 API, authentication and database integration tests (local, not production)
- [ ] Playwright E2E, accessibility, responsive, images and links
- [ ] Production frontend and Worker build and local runtime verified
- [x] Lighthouse measured on representative local mobile pages: Performance 93/97/97, Accessibility 100, Best Practices 96, SEO 100; production measurement pending
- [ ] README, setup, security, backup/recovery and deployment instructions
- [ ] GitHub CI and approval-gated deployment workflow
- [ ] No secrets committed; .env.example and Wrangler settings
- [ ] Git remote/push verified or explicitly blocked
- [ ] Live deployment approved and verified or explicitly blocked
- [ ] Final GO/NO-GO with every unverified gate disclosed

Business facts are restricted to the supplied company name, email, GitHub organization and Calendly URL. Technology listings do not imply certifications. Legal content is a review draft. Concept work is visibly labeled.