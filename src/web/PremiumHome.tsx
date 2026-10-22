import {
  ArrowRight,
  Check,
  Code2,
  Cpu,
  Cloud,
  Smartphone,
  Mic,
  Workflow,
  ShieldCheck,
  Layers,
  ShoppingBag,
  Palette,
  TrendingUp,
  PenTool,
  Globe,
} from "lucide-react";
import { business, services, type SiteData } from "../shared/content";
import { BusinessDetails } from "./BusinessDetails";
import { Button, Section } from "./components";
import { Newsletter } from "./forms";
import { formatMinorAmount } from "../shared/pricing";

export const featuredServices = [
  [
    "web-development",
    "Website Development",
    "Fast, responsive websites built for your business.",
    Code2,
  ],
  [
    "mobile-app-development",
    "Mobile App Development",
    "Purposeful iOS and Android experiences.",
    Smartphone,
  ],
  [
    "ai-agents-automation",
    "AI Agent Development",
    "Intelligent agents with clear guardrails.",
    Cpu,
  ],
  [
    "custom-software",
    "Custom Software",
    "Tailored systems for your unique workflows.",
    Layers,
  ],
  [
    "saas-development",
    "SaaS Development",
    "Scalable platforms, from idea to product.",
    Globe,
  ],
  [
    "ecommerce-development",
    "E-commerce Development",
    "Considered storefronts and shopping journeys.",
    ShoppingBag,
  ],
  [
    "digital-marketing",
    "Digital Marketing",
    "SEO, campaigns and conversion foundations.",
    TrendingUp,
  ],
  [
    "ui-ux-design",
    "UI/UX Design",
    "Beautiful interfaces. Intuitive experiences.",
    Palette,
  ],
  [
    "branding-logo-design",
    "Branding & Logo Design",
    "A distinctive identity with a coherent system.",
    PenTool,
  ],
  [
    "cloud-api-integration",
    "Cloud & API Integration",
    "Connected infrastructure, data and tools.",
    Cloud,
  ],
] as const;

export function DeviceStudio({
  compact = false,
  variant = 0,
}: {
  compact?: boolean;
  variant?: number;
}) {
  return (
    <div
      className={`device-studio ${compact ? "studio-compact" : ""} variant-${variant % 5}`}
      role="img"
      aria-label={
        compact
          ? "Original illustrative product interface"
          : "Original laptop dashboard, AI agent and smartphone concept illustration"
      }
    >
      <div className="studio-orbit" />
      <div className="studio-grid" />
      <div className="laptop">
        <div className="laptop-screen">
          <div className="mock-sidebar">
            <span className="mock-logo">C.</span>
            {[0, 1, 2, 3, 4].map((n) => (
              <span key={n} className={n === variant % 5 ? "selected" : ""} />
            ))}
          </div>
          <div className="mock-dashboard">
            <div className="mock-topbar">
              <span>WORKSPACE / OVERVIEW</span>
              <span className="mock-avatar">C</span>
            </div>
            <div className="mock-title">
              Turn ideas
              <br />
              into possibility<span>.</span>
            </div>
            <div className="mock-metrics">
              <div>
                <small>PRODUCT</small>
                <strong>Connected</strong>
              </div>
              <div>
                <small>WORKFLOW</small>
                <strong>Designed</strong>
              </div>
              <div>
                <small>EXPERIENCE</small>
                <strong>Human</strong>
              </div>
            </div>
            <div className="mock-chart">
              <span>Activity overview · illustrative data</span>
              <svg viewBox="0 0 400 100" aria-hidden="true">
                <defs>
                  <linearGradient
                    id={`chart-${compact}-${variant}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop stopColor="#FFAE45" stopOpacity=".3" />
                    <stop offset="1" stopColor="#FFAE45" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0 85 L30 70 L65 78 L95 50 L130 60 L165 30 L200 45 L240 25 L270 40 L310 15 L350 30 L400 5 V100 H0Z"
                  fill={`url(#chart-${compact}-${variant})`}
                />
                <path
                  d="M0 85 L30 70 L65 78 L95 50 L130 60 L165 30 L200 45 L240 25 L270 40 L310 15 L350 30 L400 5"
                  fill="none"
                  stroke="#FFAE45"
                  strokeWidth="3"
                />
              </svg>
            </div>
            <div className="mock-bottom">
              <span>Design system</span>
              <span>API integration</span>
              <span>Automation</span>
            </div>
          </div>
        </div>
        <div className="laptop-base" />
      </div>
      <div className="floating-agent">
        <Cpu size={28} />
        <span>
          AI Agent<small>Human-guided intelligence</small>
        </span>
        <div className="waveform">▂▅▃▇▅▂▆▃▅▇▃▂</div>
      </div>
      <div className="phone">
        <span className="phone-notch" />
        <span className="phone-brand">CodesBoxs / MOBILE</span>
        <div className="phone-orb" />
        <strong>
          Smarter
          <br />
          business.
          <br />
          <em>By design.</em>
        </strong>
        <span className="phone-pill">Ideas → experiences</span>
      </div>
      {!compact && (
        <span className="studio-caption">
          ORIGINAL INTERFACE CONCEPT · NOT A LIVE PRODUCT
        </span>
      )}
    </div>
  );
}

export function PremiumServiceGrid() {
  return (
    <div className="premium-service-grid">
      {featuredServices.map(([slug, title, copy, Icon], i) => (
        <a
          className={`premium-service service-art-${i}`}
          key={slug}
          href={`/services/${slug}`}
        >
          <div className="service-visual">
            <div className="mini-window">
              <div className="mini-toolbar">
                <i />
                <i />
                <i />
              </div>
              <div className="mini-content">
                <Icon size={42} />
                <div className="mini-bars">
                  <i />
                  <i />
                  <i />
                </div>
              </div>
            </div>
            <span className="service-icon-float">
              <Icon size={28} />
            </span>
          </div>
          <h3>{title}</h3>
          <p>{copy}</p>
          <span className="circle-arrow">
            <ArrowRight size={16} />
          </span>
        </a>
      ))}
    </div>
  );
}

const packages = [
  {
    slug: "starter",
    name: "Website Development",
    copy: "For small businesses and starter projects.",
    features: [
      "Basic website or landing page",
      "Responsive design",
      "Contact form",
      "Basic SEO setup",
      "Revision scope agreed in writing",
    ],
  },
  {
    slug: "business",
    name: "Business Applications",
    copy: "For growing businesses.",
    features: [
      "Advanced website or web application",
      "Custom UI/UX design",
      "SEO optimization",
      "CMS integration where applicable",
      "Revision scope agreed in writing",
    ],
  },
  {
    slug: "enterprise",
    name: "AI Automation Solutions",
    copy: "For connected workflows and human-supervised automation.",
    features: [
      "Custom software or SaaS consultation",
      "AI integration options",
      "Advanced functionality",
      "Dedicated project planning",
      "Scope-based revisions",
    ],
  },
];
export function PricingCards({
  records = [],
}: {
  records?: Record<string, unknown>[];
}) {
  return (
    <div className="premium-pricing-grid">
      {packages.map((fallback, i) => {
        const record = records.find((r) => r.slug === fallback.slug);
        const p = record
          ? {
              ...fallback,
              name: String(record.title),
              copy: String(record.description),
              features: JSON.parse(String(record.features_json)) as string[],
            }
          : fallback;
        const price =
          record && record.amount_minor !== null && record.billing !== "quote"
            ? formatMinorAmount(
                Number(record.amount_minor),
                String(record.currency),
              )
            : "Custom Quote";
        return (
          <article
            className={`premium-price ${i === 1 ? "price-featured" : ""}`}
            key={p.slug}
          >
            <div className="package-label">
              <Layers size={28} />
              <div>
                <h3>{p.name}</h3>
                <p>{p.copy}</p>
              </div>
            </div>
            <strong className="package-price">{price}</strong>
            <p className="price-note">
              {record
                ? `${record.billing === "recurring" ? "Recurring engagement — billing interval agreed in quote." : record.billing === "one_time" ? "One-time engagement." : "Scope and fees agreed before work begins."} ${String(record.disclosures)}`
                : "Scope and fees agreed before work begins."}
            </p>
            <ul>
              {p.features.map((f) => (
                <li key={f}>
                  <Check size={14} />
                  {f}
                </li>
              ))}
            </ul>
            <dl className="package-terms">
              <div>
                <dt>Timeline</dt>
                <dd>
                  {record
                    ? String(record.delivery)
                    : "Estimated after discovery; confirmed in your quote."}
                </dd>
              </div>
              <div>
                <dt>Revisions</dt>
                <dd>
                  {record
                    ? String(record.revisions)
                    : "Rounds and acceptance criteria agreed before work."}
                </dd>
              </div>
              <div>
                <dt>Support</dt>
                <dd>
                  Coverage and duration quoted separately unless included in
                  writing.
                </dd>
              </div>
            </dl>
            <Button secondary={i !== 1} href={`/pricing/${p.slug}`}>
              {i === 2 ? "Contact Sales" : "Get Started"}
            </Button>
          </article>
        );
      })}
    </div>
  );
}

export function PackagePage({
  slug,
  records = [],
}: {
  slug: string;
  records?: Record<string, unknown>[];
}) {
  const fallback = packages.find((item) => item.slug === slug);
  const record = records.find((item) => item.slug === slug);
  const p =
    fallback && record
      ? {
          ...fallback,
          name: String(record.title),
          copy: String(record.description),
          features: JSON.parse(String(record.features_json)) as string[],
        }
      : fallback;
  return (
    <Section className="package-detail">
      <h1>
        {p
          ? `${p.name} — scoped around your needs.`
          : "Simple Pricing for Every Need."}
      </h1>
      {p ? (
        <>
          <p>{p.copy} This is an engagement inquiry, not a checkout.</p>
          <ul>
            {p.features.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
          {records
            .filter((r) => r.slug === slug)
            .map((r) => (
              <div key={String(r.id)} className="panel">
                <h2>Approved package details</h2>
                <p>
                  Price:{" "}
                  {r.amount_minor !== null && r.billing !== "quote"
                    ? formatMinorAmount(
                        Number(r.amount_minor),
                        String(r.currency),
                      )
                    : "Custom Quote"}{" "}
                  · {String(r.billing).replaceAll("_", " ")}
                </p>
                <p>Delivery: {String(r.delivery)}</p>
                <p>Revisions: {String(r.revisions)}</p>
                <p>Exclusions: {String(r.exclusions)}</p>
                <p>Fees and disclosures: {String(r.disclosures)}</p>
              </div>
            ))}
          <div className="two-grid">
            <div className="panel">
              <h2>What your quote covers</h2>
              <p>
                Deliverables, delivery milestones, revision limits and
                acceptance criteria will be agreed in writing. Delivery starts
                only after the project agreement and any required deposit.
              </p>
            </div>
            <div className="panel">
              <h2>Clear boundaries</h2>
              <p>
                Hosting, third-party subscriptions, advertising spend, taxes and
                ongoing maintenance are excluded unless expressly included in
                the signed quote. Currency, billing frequency, cancellation and
                refund conditions must be confirmed before acceptance.
              </p>
            </div>
          </div>
          <Button href="/start-project">Request a {p.name} quote</Button>
        </>
      ) : (
        <>
          <p>
            Choose a starting point. No online payment is collected; all
            engagements require an approved written scope and quote.
          </p>
          <div>
            <h2 className="pricing-options-title">Choose your project focus</h2>
            <PricingCards records={records} />
          </div>
          <div className="panel billing-summary">
            <h2>From inquiry to digital delivery</h2>
            <p>
              Discuss your requirements, review a written scope and quote, then
              approve the agreement before work begins. One-time project fees
              and milestone amounts are specified in that agreement. Recurring
              support requires a separate, explicit billing schedule; it is not
              automatically included.
            </p>
            <p>
              Delivery is digital: agreed source files, access, documentation or
              deployment handover. Third-party costs, taxes, revisions and
              acceptance requirements must be itemized before you accept.
            </p>
            <a href="/service-delivery-policy">
              Delivery policy — review draft
            </a>
            {" · "}
            <a href="/refund-policy">Refund & cancellation — review draft</a>
          </div>
        </>
      )}
    </Section>
  );
}

export function PremiumHome({ data }: { data: SiteData }) {
  return (
    <>
      <section className="premium-hero">
        <div className="hero-copy">
          <p className="eyebrow">DIGITAL ENGINEERING STUDIO</p>
          <h1>
            Engineering
            <br />
            <span>
              Intelligent Digital
              <br />
              Experiences.
            </span>
          </h1>
          <p>
            CodesBoxs creates high-performance websites, custom software,
            AI-powered automation, and innovative digital solutions for
            businesses worldwide.
          </p>
          <div className="button-row">
            <Button href="/services">Explore Services</Button>
            <Button secondary href="/start-project">
              Start a Project
            </Button>
          </div>
          <div className="premium-trust">
            <span>
              <Code2 size={19} />
              React & TypeScript
            </span>
            <span>
              <Cloud size={19} />
              Cloudflare architecture
            </span>
            <span>
              <ShieldCheck size={19} />
              Thoughtful engineering
            </span>
          </div>
        </div>
        <DeviceStudio />
      </section>
      <div className="premium-tech">
        <span>
          Technology options
          <br />
          for modern products
        </span>
        {[
          "React",
          "Next.js",
          "Node.js",
          "Python",
          "AWS",
          "OpenAI",
          "n8n",
          "Docker",
          "Firebase",
        ].map((t) => (
          <a href="/technologies" key={t}>
            {t}
          </a>
        ))}
      </div>
      <Section
        className="premium-light premium-services"
        eyebrow="OUR SERVICES"
      >
        <div className="premium-section-heading">
          <h2>
            Complete Digital Solutions
            <br />
            for <span>Modern Businesses.</span>
          </h2>
          <p>
            From idea to deployment, connected technology solutions to help your
            business grow, automate and succeed in the digital world.
          </p>
          <a className="outline-link" href="/services">
            View All Services <ArrowRight size={15} />
          </a>
        </div>
        <PremiumServiceGrid />
      </Section>
      <Section className="premium-ai" eyebrow="AI & AUTOMATION">
        <div className="ai-copy">
          <h2>
            Intelligence <span>Built</span>
            <br />
            Into Every <span>Workflow.</span>
          </h2>
          <p>
            From AI voice agents to workflow automation, we help businesses work
            smarter, serve better, and grow faster with intelligent technology.
          </p>
          <Button href="/solutions">Explore AI Solutions</Button>
        </div>
        <div className="automation-demo">
          <div className="automation-list">
            <Workflow size={25} />
            <h3>
              Automate
              <br />
              your business
            </h3>
            {[
              "Lead qualification",
              "Customer support",
              "Data processing",
              "CRM integrations",
            ].map((t) => (
              <span key={t}>
                <Check size={13} />
                {t}
              </span>
            ))}
          </div>
          <div className="voice-demo">
            <small>ILLUSTRATIVE INTERFACE</small>
            <h3>AI Voice Agent</h3>
            <div className="mic-orb">
              <Mic size={44} />
            </div>
            <strong>Designed to listen.</strong>
            <div className="waveform">▂▅▃▇▅▂▆▃▅▇▃▂▆▂▅▃</div>
            <p>Human handoff · Bounded actions</p>
          </div>
          <div className="workflow-demo">
            {["Trigger", "Qualify", "Review", "Connect"].map((t, i) => (
              <div key={t}>
                <span>{i + 1}</span>
                {t}
                {i < 3 && <i />}
              </div>
            ))}
          </div>
        </div>
      </Section>
      <Section className="premium-light premium-projects" eyebrow="OUR WORK">
        <div className="premium-section-heading">
          <h2>
            Featured Projects
            <br />& <span>Case Studies.</span>
          </h2>
          <p>
            Explore published work and clearly labeled original concept studies.
            No unverified client projects or results.
          </p>
          <a href="/portfolio" className="outline-link">
            View All Projects <ArrowRight size={15} />
          </a>
        </div>
        {data.projects.length ? (
          <div className="premium-project-grid">
            {data.projects.slice(0, 6).map((p, i) => (
              <a
                key={p.id}
                href={`/portfolio/${p.slug}`}
                className="premium-project"
              >
                <DeviceStudio compact variant={i + 1} />
                <div>
                  <small>
                    {p.is_concept
                      ? "ORIGINAL CONCEPT · NOT CLIENT WORK"
                      : p.category}
                  </small>
                  <h3>{p.title}</h3>
                  <p>{p.summary}</p>
                  <span className="circle-arrow">
                    <ArrowRight size={15} />
                  </span>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="portfolio-empty">
            <Layers size={32} />
            <h3>Your next idea belongs here.</h3>
            <p>
              Client case studies will appear after scope, ownership, assets and
              publication permission are verified.
            </p>
            <a href="/start-project" className="text-link">
              Discuss your project <ArrowRight size={16} />
            </a>
          </div>
        )}
      </Section>
      <Section className="premium-pricing" eyebrow="PRICING PLANS">
        <div className="pricing-layout">
          <div>
            <h2>
              Simple Pricing
              <br />
              for <span>Every Need.</span>
            </h2>
            <p>
              Choose a starting point that fits your goals, or request a custom
              quote for a larger project.
            </p>
            <Button href="/start-project">Get a Custom Quote</Button>
            <p className="pricing-disclosure">
              Package outlines are subject to an agreed scope. No unapproved
              fixed prices or live checkout.
            </p>
          </div>
          <PricingCards records={data.pricing} />
        </div>
      </Section>
      {!!data.testimonials?.length && (
        <Section
          className="premium-light"
          eyebrow="CLIENT FEEDBACK"
          title="What Our Clients Say."
        >
          <div className="three-grid">
            {data.testimonials.map((t) => (
              <figure key={String(t.id)}>
                <blockquote>{String(t.review)}</blockquote>
                <figcaption>
                  <strong>{String(t.name)}</strong>
                  <br />
                  {String(t.role)} {String(t.company)}
                </figcaption>
              </figure>
            ))}
          </div>
        </Section>
      )}
      <Section className="premium-closing">
        <div>
          <p className="eyebrow">LET’S WORK TOGETHER</p>
          <h2>
            Ready to Build Something
            <br />
            <span>Extraordinary?</span>
          </h2>
        </div>
        <div>
          <p>
            Turn your ideas into powerful digital solutions. Let's discuss your
            project and create something amazing together.
          </p>
          <div className="button-row">
            <Button href="/start-project">Start Your Project</Button>
            <Button secondary href="/contact">
              Schedule a Call
            </Button>
          </div>
        </div>
      </Section>
    </>
  );
}

export function PremiumFooter({ data }: { data: SiteData }) {
  const groups = {
    Services: featuredServices
      .slice(0, 3)
      .map(([slug, title]) => [title, `/services/${slug}`]),
    Company: [
      ["About Us", "/about"],
      ["Our Work", "/portfolio"],
      ["Pricing", "/pricing"],
      ["Blog", "/blog"],
      ["Careers", "/careers"],
      ["Contact Us", "/contact"],
    ],
    Legal: [
      ["Terms & Conditions", "/terms-of-service"],
      ["Privacy Policy", "/privacy-policy"],
      ["Refund & Cancellation", "/refund-policy"],
      ["Service Delivery Policy", "/service-delivery-policy"],
      ["Cookie Policy", "/cookie-policy"],
    ],
  };
  return (
    <footer className="premium-footer">
      <div className="premium-footer-grid">
        <div>
          <a href="/" className="brand">
            <span className="premium-logo">⬡</span>CodesBoxs
          </a>
          <p>
            We create innovative digital solutions, intelligent automation, and
            scalable products for businesses worldwide.
          </p>
          <BusinessDetails />
          <nav className="social-links" aria-label="Official social media">
            {business.socials.map((social) => (
              <a
                key={social.name}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${social.name} (opens in a new tab)`}
              >
                <Globe size={18} aria-hidden="true" />
                <span>{social.name}</span>
              </a>
            ))}
          </nav>
        </div>
        {Object.entries(groups).map(([title, links]) => (
          <div key={title}>
            <h3>{title}</h3>
            {links.map(([label, href]) => (
              <a key={href} href={href}>
                {label}
              </a>
            ))}
          </div>
        ))}
        <div className="footer-newsletter">
          <h3>Newsletter</h3>
          <p>Product updates and engineering insights, with your consent.</p>
          <Newsletter data={data} />
        </div>
      </div>
      <div className="premium-footer-bottom">
        <span>
          © {new Date().getUTCFullYear()} {business.name}. All rights reserved.
        </span>
        <a href="/privacy-policy">Privacy & data choices</a>
        <a href="#main">Back to top ↑</a>
      </div>
    </footer>
  );
}

// These safeguards are tested independently of provider configuration.
export const premiumServiceSlugs = featuredServices.map(([slug]) => slug);
export const availableServiceSlugs = services.map((s) => s.slug);
