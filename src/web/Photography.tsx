import type { ContentRecord } from "../shared/content";

export type Photograph = { key: string; alt: string; position?: string };
export const projectPhotography: Record<string, Photograph> = {
  "orbit-workspace": {
    key: "orbit-operations-analytics",
    alt: "Laptop displaying analytical charts in a professional workspace",
  },
  "atlas-knowledge": {
    key: "atlas-knowledge-assistant",
    alt: "Professional reviewing information on a laptop at a desk",
  },
  "field-notes": {
    key: "field-notes-mobile-workflow",
    alt: "Professional reviewing content on a smartphone alongside a laptop",
  },
  "corporate-website": {
    key: "signal-corporate-workspace",
    alt: "Laptop, phone and stationery arranged in a modern business workspace",
  },
  "ecommerce-storefront": {
    key: "form-field-online-store",
    alt: "Customer browsing an online store on a laptop at a wooden desk",
  },
  "saas-platform": {
    key: "saas-product-planning",
    alt: "Product team reviewing operational information during an office meeting",
  },
  "ai-voice-agent": {
    key: "relay-voice-support",
    alt: "Support headset being prepared at an office workstation",
  },
  "ai-chatbot": {
    key: "atlas-assistant-workstation",
    alt: "Software professional reviewing an application across two monitors",
  },
  "mobile-application": {
    key: "field-mobile-device-desk",
    alt: "Smartphone and laptop arranged together in a working desk setup",
  },
  "crm-software": {
    key: "pipeline-crm-review",
    alt: "Colleagues reviewing business information on a laptop",
  },
  "workflow-automation": {
    key: "flowline-team-coordination",
    alt: "Business team coordinating work around laptops and reports",
  },
  "product-design": {
    key: "ui-ux-digital-design-workspace",
    alt: "Designer reviewing digital layouts with a laptop and pen tablet",
  },
  "cloud-api-integration": {
    key: "cloud-api-network-infrastructure",
    alt: "Network cables and server racks inside a data center",
  },
  "seo-digital-marketing": {
    key: "digital-marketing-campaign-analysis",
    alt: "Marketing colleagues reviewing charts on a laptop and tablet",
  },
  "brand-identity": {
    key: "brand-design-color-study",
    alt: "Designer selecting colors with a pen tablet",
  },
};
export const blogPhotography: Record<string, Photograph> = {
  "a-useful-discovery-brief": {
    key: "editorial-discovery-planning",
    alt: "Color-coded planning notes arranged on a cork board",
  },
  "designing-ai-with-review-boundaries": {
    key: "custom-software-collaboration",
    alt: "Two software professionals reviewing work together at a laptop",
  },
  "a-release-checklist-that-helps": {
    key: "editorial-release-checklist",
    alt: "Task checklist on a tablet beside a development monitor",
  },
  "ai-agents-business-automation-2026": {
    key: "ai-agent-business-analysis",
    alt: "Business analyst reviewing structured information on a laptop",
  },
  "ai-voice-agents-customer-support": {
    key: "editorial-voice-support",
    alt: "Support professional wearing a headset in an office",
  },
  "ai-chatbots-vs-traditional-chatbots": {
    key: "atlas-knowledge-assistant",
    alt: "Person exploring a conversational AI interface on a laptop",
  },
  "custom-software-small-business": {
    key: "pipeline-crm-review",
    alt: "Small business colleagues reviewing information on a laptop",
  },
  "saas-mvp-planning-launch": {
    key: "saas-product-planning",
    alt: "Product team planning work during an office meeting",
  },
  "react-vs-nextjs-business-websites": {
    key: "website-development-workstation",
    alt: "Developer working with code across a laptop and external monitor",
  },
  "cloudflare-workers-scalable-web-applications": {
    key: "editorial-cloud-operations",
    alt: "Computer workstation beside server racks in a data center",
  },
  "api-integration-business-automation": {
    key: "cloud-api-network-infrastructure",
    alt: "Network connections linking equipment in server racks",
  },
  "n8n-workflow-automation-business": {
    key: "flowline-team-coordination",
    alt: "Business team coordinating workflows around laptops and reports",
  },
  "ecommerce-development-best-practices": {
    key: "form-field-online-store",
    alt: "Customer browsing an online store on a laptop",
  },
  "technical-seo-checklist-2026": {
    key: "editorial-search-measurement",
    alt: "Person reviewing website analytics on a laptop beside a window",
  },
  "google-ads-vs-meta-ads": {
    key: "editorial-analytics-reports",
    alt: "Laptop analytics alongside printed business reports",
  },
  "mobile-app-development-process": {
    key: "mobile-app-device-workspace",
    alt: "Smartphone, tablet and laptop arranged on a work desk",
  },
  "ui-ux-design-modern-saas": {
    key: "ui-ux-digital-design-workspace",
    alt: "Product designer working with digital layouts on a laptop and pen tablet",
  },
  "website-security-performance": {
    key: "saas-engineering-workspace",
    alt: "Software professional reviewing an application at an engineering workstation",
  },
  "crm-automation-ai-sales-workflows": {
    key: "orbit-operations-analytics",
    alt: "Laptop showing analytical charts for a business reporting workflow",
  },
};

export function photographForArticle(article: ContentRecord) {
  return !article.image ||
    /^\/images\/(?:editorial\/[^/]+|team|ai|cloud|engineering|dashboard)\.svg$/.test(
      article.image,
    )
    ? blogPhotography[article.slug]
    : undefined;
}
export function photographForContent(
  item: ContentRecord,
  type: "portfolio" | "blog",
) {
  return type === "portfolio"
    ? photographForProject(item)
    : photographForArticle(item);
}
export const servicePhotography: Record<string, Photograph> = {
  "web-development": {
    key: "website-development-workstation",
    alt: "Developer working with code on a laptop and external monitor",
  },
  "mobile-app-development": {
    key: "mobile-app-device-workspace",
    alt: "Smartphone, tablet and laptop arranged on a wooden work desk",
  },
  "ai-agents-automation": {
    key: "ai-agent-business-analysis",
    alt: "Business analyst reviewing structured information on a laptop",
  },
  "custom-software": {
    key: "custom-software-collaboration",
    alt: "Two developers reviewing software together on a laptop",
  },
  "saas-development": {
    key: "saas-engineering-workspace",
    alt: "Software professional working on a laptop during a remote collaboration",
  },
  "ecommerce-development": {
    key: "ecommerce-shopping-experience",
    alt: "Shopping bags and a smartphone arranged for an online retail experience",
    position: "50% 70%",
  },
  "digital-marketing": {
    key: "digital-marketing-campaign-analysis",
    alt: "Marketing colleagues reviewing charts on a laptop and tablet",
  },
  "ui-ux-design": {
    key: "ui-ux-digital-design-workspace",
    alt: "Designer reviewing visual layouts on a laptop in a creative workspace",
  },
  "branding-logo-design": {
    key: "brand-design-color-study",
    alt: "Designer using a pen tablet to select colors in design software",
  },
  "cloud-api-integration": {
    key: "cloud-api-network-infrastructure",
    alt: "Network cables and server racks inside a real data center",
  },
};

// Only replace known concept artwork. Preserve owner-supplied project photography.
export function photographForProject(project: ContentRecord) {
  return project.is_concept &&
    /^\/images\/(?:concepts\/[^/]+|dashboard|ai|mobile|engineering|cloud)\.svg$/.test(
      project.image || "",
    )
    ? projectPhotography[project.slug]
    : undefined;
}

export function Photography({
  photo,
  className = "",
  sizes,
  eager = false,
}: {
  photo: Photograph;
  className?: string;
  sizes: string;
  eager?: boolean;
}) {
  const path = `/images/photography/${photo.key}`;
  return (
    <img
      className={`editorial-photo ${photo.position === "50% 70%" ? "photo-focus-lower" : ""} ${className}`}
      src={`${path}-960.webp`}
      srcSet={`${path}-320.webp 320w, ${path}-640.webp 640w, ${path}-960.webp 960w`}
      sizes={sizes}
      width={960}
      height={640}
      alt={`${photo.alt}. Illustrative stock photography; not a CodesBoxs client screenshot.`}
      title="Illustrative stock photography — not a client screenshot or delivered system"
      loading={eager ? "eager" : "lazy"}
      decoding="async"
    />
  );
}
