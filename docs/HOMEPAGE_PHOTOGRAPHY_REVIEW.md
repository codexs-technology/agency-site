# Homepage photography upgrade — local review, 2026-10-23

## Scope and outcome
Replaced six homepage project visuals and all ten service visuals without changing card text, links, header/footer, payment code, APIs, authentication, migrations or remote data. All six featured projects are concepts; photography is illustrative, not client evidence. Stock disclosure is in image alt/title and project detail captions. Slug-based mapping only replaces known concept SVGs and preserves owner-supplied images.

Actual featured projects in the isolated local seeded database: Orbit Workspace, Atlas Knowledge, Field Notes, Signal Corporate, Form & Field Storefront, Orbit Operations. The first three are database-seeded records, not the similarly named fallback concepts. Three additional fallback concepts have photography mappings for their detail pages. Production database ordering has not been queried or changed.

## Assets and license
Assets are local WebP, 320×213, 640×427 and 960×640. Responsive srcset/sizes, explicit dimensions, existing fixed card heights, cover cropping, lazy loading and async decoding retain layout and loading behavior. No runtime third-party image requests. No generated imagery.

Pexels License: https://www.pexels.com/license/ (checked October 23, 2026). Website/commercial use and modification are permitted; attribution is optional. No implied endorsement, resale of unaltered stock, or trademark claims. Source names below identify original photo pages; people/brands are not CodesBoxs clients or staff. Photographer fields in the acquisition metadata are preliminary, not independently authenticated credits; the numeric Pexels photo ID/source page is the authoritative provenance reference.

All exact assets are under D:\company site\codesboxs-site\public\images\photography\. manifest.json records per-file bytes, SHA-256, source/download URL and license. Total 51 WebP files, 1450804 bytes. Files include additional fallback-detail imagery, not just the sixteen homepage uses.

| Asset stem (each has -320.webp, -640.webp, -960.webp) | Source | Use |
|---|---|---|
| saas-engineering-workspace | https://www.pexels.com/photo/3861964/ | service: saas-development |
| signal-corporate-workspace | https://www.pexels.com/photo/black-smartphone-on-white-table-696899/ | project: corporate-website |
| form-field-online-store | https://www.pexels.com/photo/photo-of-a-person-shopping-online-6207736/ | project: ecommerce-storefront |
| orbit-operations-analytics | https://www.pexels.com/photo/graph-on-laptop-screen-3861957/ | project: saas-platform |
| relay-voice-support | https://www.pexels.com/photo/a-person-holding-a-headset-8867202/ | project: ai-voice-agent |
| atlas-knowledge-assistant | https://www.pexels.com/photo/laptop-with-chatgpt-ai-system-16094056/ | project: ai-chatbot |
| field-notes-mobile-workflow | https://www.pexels.com/photo/close-up-of-hands-using-smart-phone-at-desk-10376030/ | project: mobile-application |
| website-development-workstation | https://www.pexels.com/photo/a-person-doing-computer-programming-7988086/ | service: web-development |
| mobile-app-device-workspace | https://www.pexels.com/photo/smartphone-on-desk-16564512/ | service: mobile-app-development |
| ai-agent-business-analysis | https://www.pexels.com/photo/a-person-using-laptop-7947638/ | service: ai-agents-automation |
| custom-software-collaboration | https://www.pexels.com/photo/discussion-about-software-development-in-office-12899191/ | service: custom-software |
| saas-product-planning | https://www.pexels.com/photo/people-having-a-business-meeting-in-the-office-7988219/ | service: saas-development |
| ecommerce-shopping-experience | https://www.pexels.com/photo/shopping-bags-wallet-and-smartphone-6956923/ | service: ecommerce-development |
| digital-marketing-campaign-analysis | https://www.pexels.com/photo/people-looking-at-graphs-on-a-laptop-and-a-digital-tablet-6930432/ | service: digital-marketing |
| ui-ux-digital-design-workspace | https://www.pexels.com/photo/photo-of-person-using-laptop-for-graphic-designs-4348404/ | service: ui-ux-design |
| brand-design-color-study | https://www.pexels.com/photo/man-designing-on-screen-11619023/ | service: branding-logo-design |
| cloud-api-network-infrastructure | https://www.pexels.com/photo/server-racks-on-data-center-5480781/ | service: cloud-api-integration |

Orbit Workspace uses orbit-operations-analytics; Orbit Operations uses saas-product-planning. Atlas Knowledge and Field Notes use their same-named photographic subjects. SaaS service uses saas-engineering-workspace. All sixteen homepage subjects are distinct.

## Files changed by this task
- src/web/PremiumHome.tsx: service and featured-project image integration; original card interactions remain.
- src/web/Photography.tsx: shared responsive image renderer and slug mappings.
- src/web/App.tsx: matching concept detail image and honest stock caption only; pre-existing payment-page changes preserved.
- src/web/premium.css: cover images and image-frame sizing only.
- e2e/homepage-images.spec.ts: three viewports, all 16 decoded images, alt/srcset, overflow, detail consistency, link responses, hover and JavaScript exceptions.
- scripts/homepage-photo-sources.json, prepare-homepage-photos.mjs, inspect-homepage-photos.mjs, review-homepage-images.mjs, document-homepage-images.mjs: acquisition/review evidence utilities. Image processing uses the already installed sharp package; no dependency/lockfile changes.

## Validation
Initial baseline browser test passed. Initial development typecheck found optional-image and test DOM typing errors; both corrected. Final command results (0 = pass):

[
  {
    "name": "format-changed",
    "status": 0
  },
  {
    "name": "typecheck",
    "status": 0
  },
  {
    "name": "lint",
    "status": 0
  },
  {
    "name": "format",
    "status": 0
  },
  {
    "name": "unit",
    "status": 0
  },
  {
    "name": "build",
    "status": 0
  },
  {
    "name": "browser",
    "status": 0
  },
  {
    "name": "diff",
    "status": 0
  }
]

Unit test log records 77 passing tests. Targeted browser run covers new photography regression plus existing public/link suites. Production build command includes Cloudflare dry-run only, never deployment. Browser databases are isolated local test stores.

## Screenshots and visual review
Evidence directory: D:\company site\codesboxs-site\artifacts\homepage-images\.
- after-projects-desktop.png
- after-projects-mobile.png
- after-projects-tablet.png
- after-services-desktop.png
- after-services-mobile.png
- after-services-tablet.png
- before-projects-desktop.png
- before-projects-mobile.png
- before-projects-tablet.png
- before-services-desktop.png
- before-services-mobile.png
- before-services-tablet.png

Desktop 1440px, tablet 768px, mobile 390px captured before and after. Desktop comparison preserves section/card geometry and typography while replacing repeated mockups with photography. Mobile cards remain two-column services and single-column projects. Fixed header/skip-link are hidden only for final section screenshot capture to avoid screenshot overlay artifacts; no production header styles were edited. Contact sheet is photo-contact-sheet.png. All sixteen images loaded in browser. Photographs are contextual stock, not bespoke screenshots of these concepts. No missing homepage assets remain; genuine authorized product screenshots would improve specificity if supplied later.

## Git and deployment
No commit, push or deployment. No remote database mutation. Existing unrelated edits and untracked files retained. Image changes are locally prepared for a separately approved deployment after reviewing this combined dirty working tree; do not blindly commit/deploy all pending payment/integration work.

Git status at report generation:
 M src/shared/content.ts
 M src/web/App.tsx
 M src/web/PremiumHome.tsx
 M src/web/premium.css
 M src/worker/api.ts
 M src/worker/index.tsx
 M src/worker/payments.ts
 M src/worker/types.ts
?? docs/HOMEPAGE_PHOTOGRAPHY_REVIEW.md
?? docs/LIVE_HANDOFF.md
?? docs/RAPIDGATEWAY_INTEGRATION_REVIEW.md
?? e2e/homepage-images.spec.ts
?? e2e/rapidgateway.spec.ts
?? github-reviewed-push-result.json
?? gmail-live-readonly.json
?? gmail-state.json
?? gmail-validation-results.json
?? public/images/photography/
?? scripts/check-upgrade-state.mjs
?? scripts/document-homepage-images.mjs
?? scripts/finish-upgrade-validation.mjs
?? scripts/homepage-photo-sources.json
?? scripts/inspect-homepage-photos.mjs
?? scripts/inspect-upgrade.mjs
?? scripts/live-smoke.mjs
?? scripts/live-smoke.test.mjs
?? scripts/prepare-homepage-photos.mjs
?? scripts/review-homepage-images.mjs
?? scripts/validate-upgrade.mjs
?? src/web/CheckoutSandbox.tsx
?? src/web/Photography.tsx
?? src/worker/rapidgateway-signature.ts
?? tests/rapidgateway.test.ts
?? upgrade-final-results.json
?? upgrade-head.txt
?? upgrade-live-audit.json
?? upgrade-remote-head.txt
?? upgrade-state.json
?? upgrade-unit-tail.txt
?? upgrade-validation-finished.txt
?? upgrade-validation-results.json
?? worker-build-production/
