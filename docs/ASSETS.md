# Original asset inventory

All assets are generated locally for this project; no downloaded stock imagery, third-party logos, or invented client work is used.

| File under public/images | Purpose |
| --- | --- |
| hero.svg | Premium software/AI infrastructure illustration |
| ai.svg | AI and machine-learning workflow |
| engineering.svg | Software engineering systems |
| cloud.svg | Cloud infrastructure |
| mobile.svg | Original application mockup |
| dashboard.svg | Original dashboard mockup |
| security.svg | Security architecture illustration |
| team.svg | Team collaboration illustration; not actual staff photography |
| favicon.svg | Original brand mark |
| social-preview.png | Original 1200×630 OG/Twitter share image; SSR wired, verification in social-verification.log |

SVGs are resolution-independent and sized in markup. Noncritical images lazy-load, with decoding verified in browser tests. Concept mockups do not represent commissioned client work. The PNG can be regenerated with `node scripts/generate-social-image.mjs` after installing a Playwright browser (or setting PLAYWRIGHT_CHANNEL to an installed Chrome).

No outside license attribution is required for the generated original illustrations. Owner review of branding and publication remains necessary.