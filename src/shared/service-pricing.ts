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
