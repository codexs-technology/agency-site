import { policySections } from "../shared/policies";
import { Section } from "./components";
import { BusinessDetails } from "./BusinessDetails";

export function PolicyPage({ path }: { path: string }) {
  const sections = policySections[path];
  return (
    <Section className="policy-layout">
      <aside className="policy-index">
        <p className="eyebrow">POLICY GUIDE</p>
        <nav aria-label="Policy sections">
          {sections.map(([title], i) => (
            <a key={title} href={`#policy-${i}`}>
              {title}
            </a>
          ))}
        </nav>
        <a href="/contact">Ask a question →</a>
      </aside>
      <div>
        <div className="notice">
          <strong>OWNER / LEGAL REVIEW REQUIRED.</strong> Review draft, not an
          approved commercial policy or legal advice. Online payments remain
          disabled. Address verification and the unresolved commercial terms
          must be completed before production publication or merchant
          submission.
        </div>
        <article className="prose">
          {sections.map(([title, text], i) => (
            <section id={`policy-${i}`} key={title}>
              <h2>{title}</h2>
              <p>{text}</p>
            </section>
          ))}
        </article>
        <BusinessDetails />
      </div>
    </Section>
  );
}
