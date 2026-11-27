import { services } from "./content";

/** Central scope defaults, not commercial offers. Approved priced packages live in D1 Commercial Admin. */
export const servicePricing = Object.fromEntries(
  services.map((service) => [
    service.slug,
    {
      service: service.slug,
      deliverables: service.deliverables,
      delivery:
        "Estimated after discovery and confirmed in the signed scope; no date committed.",
      billing: "quote" as const,
      amountMinor: null,
      ownerApprovalReference: null,
      exclusions:
        "Taxes, external licenses, advertising spend and add-ons require an itemized quote.",
    },
  ]),
);

/** Owner-approved starting prices in USD minor units (approved 2026-11-28). */
export const packageStartingPrices: Record<string, number> = {
  starter: 49900,
  business: 149900,
  enterprise: 199900,
};
const serviceTier: Record<string, keyof typeof packageStartingPrices> = {
  "web-development": "starter",
  "ui-ux-design": "starter",
  "digital-marketing": "starter",
  "branding-logo-design": "starter",
  seo: "starter",
  "banner-graphic-design": "starter",
  "mobile-app-development": "business",
  "custom-software": "business",
  "saas-development": "business",
  "ecommerce-development": "business",
  "cloud-devops": "business",
  "api-integrations": "business",
  "erp-crm": "business",
  cybersecurity: "business",
  "cloud-api-integration": "business",
  "ai-development": "enterprise",
  "ai-agents-automation": "enterprise",
  "ai-chatbot-development": "enterprise",
};
export function serviceStartingPrice(slug: string): number | null {
  const tier = serviceTier[slug];
  return tier ? packageStartingPrices[tier] : null;
}
