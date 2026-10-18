import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { engagementModels, stages } from "../shared/content";
import { Section } from "./components";

const workflow = [
  [
    "01",
    "Source",
    "A fictional onboarding guide",
    "Workspace setup → invitation → access review. Only this sample source is available to the demonstration.",
  ],
  [
    "02",
    "Retrieve",
    "Find the relevant passage",
    "Sample query: ‘Who approves access?’ The access-review passage is selected; unrelated material is excluded.",
  ],
  [
    "03",
    "Evaluate",
    "Check the boundary",
    "The source contains no named approver. The system must not invent an identity or change account permissions.",
  ],
  [
    "04",
    "Review",
    "Keep people in control",
    "Sample result: ask the workspace owner to confirm the approver. A human reviews the response before any action.",
  ],
];

export function SignatureWorkflow() {
  const [active, setActive] = useState(0);
  return (
    <div className="signature-workflow">
      <div className="workflow-heading">
        <span>ARCHITECTURE STUDY / 001</span>
        <span>FICTIONAL DATA · NO LIVE MODEL</span>
      </div>
      <div className="workflow-nodes" aria-label="Sample AI architecture">
        {workflow.map(([number, title], i) => (
          <button
            key={title}
            aria-pressed={active === i}
            onClick={() => setActive(i)}
          >
            <span>{number}</span>
            <strong>{title}</strong>
            <ArrowUpRight size={18} />
          </button>
        ))}
      </div>
      <div className="workflow-reading" aria-live="polite">
        <span className="eyebrow">
          {workflow[active][0]} / INSIDE THE SYSTEM
        </span>
        <h3>{workflow[active][2]}</h3>
        <p>{workflow[active][3]}</p>
      </div>
    </div>
  );
}

const drawings = [
  "Define the question",
  "Map the dependencies",
  "Prototype the interaction",
  "Connect the components",
  "Test the boundaries",
  "Release deliberately",
  "Observe and improve",
];
export function SignatureProcess() {
  const [active, setActive] = useState(0);
  return (
    <div className="signature-process">
      <div
        className="timeline-controls"
        role="tablist"
        aria-label="Development timeline"
      >
        {stages.map(([title], i) => (
          <button
            key={title}
            id={`stage-${i}`}
            role="tab"
            aria-selected={active === i}
            aria-controls="signature-stage-panel"
            tabIndex={active === i ? 0 : -1}
            onKeyDown={(event) => {
              if (
                ![
                  "ArrowRight",
                  "ArrowDown",
                  "ArrowLeft",
                  "ArrowUp",
                  "Home",
                  "End",
                ].includes(event.key)
              )
                return;
              event.preventDefault();
              const next =
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? stages.length - 1
                    : (active +
                        (["ArrowRight", "ArrowDown"].includes(event.key)
                          ? 1
                          : stages.length - 1)) %
                      stages.length;
              setActive(next);
              document.getElementById(`stage-${next}`)?.focus();
            }}
            onClick={() => setActive(i)}
          >
            <span>0{i + 1}</span>
            {title}
            <ArrowUpRight size={16} />
          </button>
        ))}
      </div>
      <div
        className="timeline-detail"
        id="signature-stage-panel"
        role="tabpanel"
        aria-labelledby={`stage-${active}`}
        tabIndex={0}
        aria-live="polite"
      >
        <svg viewBox="0 0 600 260" role="img" aria-label={drawings[active]}>
          <defs>
            <pattern
              id="drawing-grid"
              width="30"
              height="30"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M30 0H0V30"
                fill="none"
                stroke="currentColor"
                strokeOpacity=".12"
              />
            </pattern>
          </defs>
          <rect width="600" height="260" fill="url(#drawing-grid)" />
          {Array.from({ length: active + 2 }, (_, i) => (
            <g
              key={i}
              transform={`translate(${70 + i * 58} ${130 - (i % 2) * 35})`}
            >
              <path
                d="M0 0l40-23 40 23-40 23z M0 0v42l40 23 40-23V0 M40 23v42"
                fill="none"
                stroke="currentColor"
              />
              <circle r="3" fill="currentColor" />
            </g>
          ))}
          <text
            x="30"
            y="235"
            fill="currentColor"
            fontSize="11"
            letterSpacing="3"
          >
            FIG. 0{active + 1} / {drawings[active].toUpperCase()}
          </text>
        </svg>
        <p className="eyebrow">
          0{active + 1} / {stages[active][0]}
        </p>
        <h3>{stages[active][1]}</h3>
        <p>{stages[active][2]}</p>
      </div>
    </div>
  );
}

export function SignatureEngagements() {
  return (
    <Section
      className="signature-engagements"
      eyebrow="09 / WAYS TO WORK TOGETHER"
    >
      <div className="section-heading-row">
        <h2>
          The right shape.
          <br />
          <em>For your ambition.</em>
        </h2>
        <p>
          Scope, responsibilities and commercial terms agreed before work
          begins. No invented rates or guaranteed timelines.
        </p>
      </div>
      <div className="engagement-index">
        {engagementModels.map(([title, subtitle, copy], i) => (
          <a href="/start-project" key={title}>
            <span className="eyebrow">
              0{i + 1} / {subtitle}
            </span>
            <h3>{title}</h3>
            <p>{copy}</p>
            <span className="text-link">
              Discuss this model <ArrowUpRight size={17} />
            </span>
          </a>
        ))}
      </div>
    </Section>
  );
}
