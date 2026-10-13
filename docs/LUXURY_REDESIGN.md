# Engineered Objects — visual redesign

## System
Obsidian #0B0A09, charcoal #171512, ivory #F3F0E9, text #F5F2EC,
secondary #A9A39A, champagne #C5A46D and titanium #C7C4BF.
Space Grotesk and italic Newsreader are self-hosted; accompanying OFL licenses
are in `public/fonts`. System sans and Georgia provide loading fallbacks.

Homepage is a new composition, not a recolored template: cinematic typography,
editorial statement, numbered expertise rows, intelligence scene, asymmetric
concept previews, interactive capabilities, horizontal process, industry rows,
philosophy and contact statement. Existing service/detail, portfolio/filter,
contact, blog, process and supporting routes inherit the editorial system.

## Original artwork
`scripts/generate-assets.mjs` generates a depth-sorted projected trefoil sculpture,
architectural line studies and original software/device concept mockups. All are
local SVG assets. They are illustrative 3D-style studies, not physically rendered
photorealistic images or real client products. No licensed stock imagery is used.
The sculpture has subtle transform motion rather than a WebGL runtime.

## Motion and accessibility
CSS hero arrival and sculpture drift, image-scale previews, numbered-row hover,
native horizontal scroll and existing IntersectionObserver/Web Animations section
reveals. No new animation or 3D dependencies. Reduced motion removes animation,
transitions and smooth scrolling; SSR content stays visible. Existing mobile focus
trap/Escape/restore and process keyboard controls retained. Inline-style CSP is not
relaxed for animation. Mobile stacks adapt rather than shrinking desktop grids.

## Preservation
No API schemas, D1 migrations, admin authentication, CSRF, outbox, lead/content
management or submission contracts changed. Newsletter remains present on home.
Pages advanced-mode build and Worker build remain supported. Font requests are
served through the existing ASSETS binding. No production secrets are added.

## Verification
`luxury-*.log` capture typecheck/build, lint, unit and isolated Worker/D1 E2E.
Playwright visual outputs include desktop/mobile home, services, portfolio and
contact. Logs and generated screenshots remain ignored rather than in the repo.
Final local result: TypeScript, lint, production build/Worker dry-run, 20 unit
tests and all 15 Playwright tests passed. The browser suite ran against an isolated
local Cloudflare Worker/D1 database, not production. Screenshot files reviewed:
`D:\Tech Website\artifacts\luxury\home-desktop.png`, `home-mobile.png`,
`services-desktop.png`, `portfolio-desktop.png`, and `contact-desktop.png`.
Standalone capture requires a running server; its later connection-refused attempt
is distinct from the successful Playwright screenshots. No live deployment or
remote database/SMTP verification is implied by these local results.

## Remaining production gates
Remote D1 migration, production environment/public URL, actual Turnstile and email
provider configuration, legal review and deployed runtime measurement remain
separate from visual implementation. Pages does not run scheduled Worker tasks.
No awards, client logos, testimonials, outcomes or team identities are fabricated.