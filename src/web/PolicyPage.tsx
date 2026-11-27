import { policyEffectiveDate, policySections } from "../shared/policies";
import { Section } from "./components";
import { BusinessDetails } from "./BusinessDetails";

export function PolicyPage({ path }: { path: string }) {
  const sections = policySections[path];
  return (
    <Section className="policy-layout">
      <aside className="policy-index">
        <p className="eyebrow">POLICY</p>
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
        <p className="muted">Effective date: {policyEffectiveDate}</p>
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
