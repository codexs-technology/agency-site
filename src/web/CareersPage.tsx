import { useState } from "react";
import type { SiteData } from "../shared/content";
import { Button, Section, Turnstile } from "./components";

async function careerRequest(
  path: string,
  body: FormData | Record<string, string>,
) {
  let response: Response;
  try {
    response = await fetch(`/api/recruitment/${path}`, {
      method: "POST",
      headers:
        body instanceof FormData ? {} : { "Content-Type": "application/json" },
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  } catch {
    throw new Error(
      "Connection interrupted. Receipt is not confirmed. Contact careers before submitting again.",
    );
  }
  let result: Record<string, unknown>;
  try {
    result = (await response.json()) as Record<string, unknown>;
  } catch {
    throw new Error("Unexpected response. Your request is not confirmed.");
  }
  if (!result || !response.ok)
    throw new Error(
      typeof result?.error === "string"
        ? result.error
        : "Request failed. Please contact careers.",
    );
  return result;
}

export function CareersPage({ data }: { data: SiteData }) {
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [receipt, setReceipt] = useState<{
    reference: string;
    key: string;
  } | null>(null);
  const [status, setStatus] = useState<Record<string, unknown> | null>(null);
  const [credentials, setCredentials] = useState<{
    reference: string;
    accessKey: string;
  } | null>(null);
  if (data.path === "/careers/application-status")
    return (
      <Section>
        <div className="form-panel application-form">
          <h2>Private application lookup</h2>
          <p>
            Your reference alone cannot open a record. Enter the separate access
            key shown after submission. Never share these credentials in public
            or place them in a URL. If lost, contact codexstechnology@gmail.com;
            recovery requires manual identity review.
          </p>
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              setBusy(true);
              setMessage("");
              setStatus(null);
              const form = new FormData(event.currentTarget);
              const access = {
                reference: String(form.get("reference") || "").trim(),
                accessKey: String(form.get("accessKey") || "").trim(),
              };
              try {
                const result = await careerRequest("status", access);
                setStatus(result);
                setCredentials(access);
              } catch (error) {
                setMessage((error as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label className="field">
              Application reference
              <input
                name="reference"
                required
                minLength={64}
                maxLength={64}
                autoComplete="off"
                spellCheck={false}
              />
            </label>
            <label className="field">
              Private access key
              <input
                name="accessKey"
                type="password"
                required
                minLength={64}
                maxLength={64}
                autoComplete="off"
              />
            </label>
            <button className="button" disabled={busy}>
              {busy ? "Checking…" : "Check Application Status"}
            </button>
          </form>
          {message && <p role="alert">{message}</p>}
          {status && (
            <div role="status">
              <h3>{String(status.position)}</h3>
              <p>Status: {String(status.status)}</p>
              <p>Received: {String(status.receivedAt)}</p>
              {status.status !== "Withdrawn" && (
                <button
                  className="button button-secondary"
                  disabled={busy}
                  onClick={async () => {
                    if (
                      !credentials ||
                      !window.confirm(
                        "Withdraw this application? Contact careers if you later want to reapply.",
                      )
                    )
                      return;
                    setBusy(true);
                    setMessage("");
                    try {
                      setStatus(await careerRequest("withdraw", credentials));
                    } catch (error) {
                      setMessage((error as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Withdraw Application
                </button>
              )}
            </div>
          )}
        </div>
      </Section>
    );

  if (data.path === "/careers/apply")
    return (
      <Section>
        {receipt ? (
          <div className="form-panel applicant-receipt" role="status">
            <h2>Application saved</h2>
            <p>{message}</p>
            <p>
              Application reference: <code>{receipt.reference}</code>
            </p>
            <p>
              Private status access key (shown once): <code>{receipt.key}</code>
            </p>
            <p>
              Store both securely. The access key is not included in
              confirmation email and cannot be recovered from its stored hash.
            </p>
            <Button href="/careers/application-status">
              Check Application Status
            </Button>
          </div>
        ) : !data.jobs.length ? (
          <div className="empty-state">
            <h2>No published positions are open.</h2>
            <p>
              Applications and resume uploads are closed. We are not collecting
              general-interest applications without owner authorization.
            </p>
            <a href="mailto:codexstechnology@gmail.com">
              Ask a careers question
            </a>
          </div>
        ) : (
          <>
            {!data.applicationUploadsReady && (
              <p className="notice" role="status">
                Private document storage is not configured and approved.
                Applications cannot be submitted here yet. Contact
                codexstechnology@gmail.com; do not email sensitive documents
                unless requested through an approved process.
              </p>
            )}
            <form
              className="form-panel application-form"
              encType="multipart/form-data"
              onSubmit={async (event) => {
                event.preventDefault();
                const formElement = event.currentTarget;
                const form = new FormData(formElement);
                form.set(
                  "consent",
                  form.get("consent") === "on" ? "true" : "false",
                );
                form.set("turnstileToken", token);
                setBusy(true);
                setMessage("");
                try {
                  const result = await careerRequest("submit", form);
                  if (
                    result.stored !== true ||
                    !/^[a-f0-9]{64}$/.test(String(result.id)) ||
                    !/^[a-f0-9]{64}$/.test(String(result.accessKey))
                  )
                    throw new Error(
                      "Receipt is not confirmed. Contact careers before submitting again.",
                    );
                  setReceipt({
                    reference: String(result.id),
                    key: String(result.accessKey),
                  });
                  setMessage(String(result.message));
                } catch (error) {
                  setMessage((error as Error).message);
                } finally {
                  setBusy(false);
                  formElement.dispatchEvent(new Event("security-reset"));
                }
              }}
            >
              <h2>Your application</h2>
              <p>
                Apply only for a published position. Do not upload identity
                documents, payment data, passwords or confidential client
                material. Each document must be a PDF or DOCX of at most 5 MB.
              </p>
              <div className="two-grid">
                {[
                  ["name", "Full name", "text", 100],
                  ["email", "Email address", "email", 254],
                  ["phone", "Contact number", "tel", 40],
                  ["country", "Country", "text", 100],
                  ["applicant_location", "City / location", "text", 150],
                ].map(([name, label, type, max]) => (
                  <label className="field" key={String(name)}>
                    {label}
                    <input
                      name={String(name)}
                      type={String(type)}
                      maxLength={Number(max)}
                      required
                    />
                  </label>
                ))}
              </div>
              <label className="field">
                Job position
                <select name="job_id" required defaultValue="">
                  <option value="" disabled>
                    Select a published role
                  </option>
                  {data.jobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Relevant experience
                <textarea
                  name="experience"
                  minLength={10}
                  maxLength={4000}
                  required
                  rows={4}
                />
              </label>
              <label className="field">
                Skills
                <textarea
                  name="skills"
                  minLength={2}
                  maxLength={2000}
                  required
                  rows={3}
                />
              </label>
              <label className="field">
                Portfolio URL (optional, HTTPS)
                <input
                  name="portfolio_url"
                  type="url"
                  pattern="https://.*"
                  maxLength={500}
                />
              </label>
              <label className="field">
                LinkedIn / GitHub URL (optional, HTTPS)
                <input
                  name="professional_url"
                  type="url"
                  pattern="https://.*"
                  maxLength={500}
                />
              </label>
              <label className="field">
                Resume (PDF or DOCX, at most 5 MB)
                <input
                  name="resume"
                  type="file"
                  required
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                />
              </label>
              <label className="field">
                Cover letter
                <textarea
                  name="cover_letter"
                  minLength={30}
                  maxLength={10000}
                  required
                  rows={6}
                />
              </label>
              <label className="field">
                Cover-letter file (optional PDF or DOCX, at most 5 MB)
                <input name="cover_file" type="file" accept=".pdf,.docx" />
              </label>
              <div className="honeypot" aria-hidden="true">
                <label>
                  Leave this empty
                  <input name="website" tabIndex={-1} autoComplete="off" />
                </label>
              </div>
              <label className="checkbox">
                <input type="checkbox" name="consent" required />I consent to
                processing this application and documents for the published
                role. <a href="/privacy-policy">Read the privacy draft</a>.
              </label>
              <Turnstile data={data} onToken={setToken} />
              <button
                className="button"
                disabled={
                  busy ||
                  !data.applicationUploadsReady ||
                  (!data.localTestMode && !token)
                }
              >
                {busy ? "Saving application…" : "Submit Application"}
              </button>
              {message && <p role="alert">{message}</p>}
            </form>
          </>
        )}
      </Section>
    );

  return (
    <>
      <Section title="Build useful things. Work thoughtfully.">
        <div className="two-grid">
          <div>
            <p className="large-copy">
              Good engineering brings clarity to difficult problems.
            </p>
            <p>
              Explore our working principles and any owner-published
              opportunities. We value clear decisions, maintainable software and
              constructive review. These describe our approach—not unverified
              employee benefits or staffing claims.
            </p>
            <div className="button-row">
              <Button href="/careers/apply">Apply for a Job</Button>
              <Button secondary href="/careers/application-status">
                Application Status
              </Button>
            </div>
          </div>
          <figure>
            <img
              className="art"
              src="/images/workspace.webp"
              alt="Illustrative stock technology workspace with monitors and collaborative desks; not the CodesBoxs office"
              width={1200}
              height={800}
              loading="lazy"
              decoding="async"
            />
            <figcaption className="image-disclosure">
              Illustrative stock workspace, not our office or employees.
            </figcaption>
          </figure>
        </div>
      </Section>
      <Section title="How we approach the work.">
        <div className="three-grid">
          {[
            [
              "Write things down",
              "Document decisions, dependencies and operating instructions so others can maintain the result.",
            ],
            [
              "Stay curious",
              "Question assumptions and choose tools deliberately. Review ideas through concrete tasks rather than technology fashion.",
            ],
            [
              "Own the quality",
              "Test critical journeys, communicate limitations and make the next person's work easier.",
            ],
          ].map(([title, text]) => (
            <div className="panel" key={title}>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </Section>
      <Section title="A clear hiring conversation">
        <ol>
          {[
            "Review the published role and its requirements.",
            "Submit your application when secure document collection is configured.",
            "Authorized staff review relevant experience and work samples.",
            "If selected, discuss the role and any relevant assessment with the hiring contact.",
            "Any offer, compensation, location and benefits require written confirmation.",
          ].map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <p>
          No compensation, remote-work arrangement or benefits are promised
          unless confirmed in a genuine published role and written offer.
        </p>
      </Section>
      <Section title="Published opportunities">
        {data.jobs.length ? (
          <div className="three-grid">
            {data.jobs.map((job) => (
              <article className="panel" key={job.id}>
                <h3>{job.title}</h3>
                <p>{job.summary}</p>
                <p>
                  {job.location} · {job.employment_type}
                </p>
                <Button href="/careers/apply">Apply for a Job</Button>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h3>No open positions are currently published.</h3>
            <p>
              We do not invent vacancies or collect speculative applications.
              Check back for owner-published roles.
            </p>
          </div>
        )}
        <p>
          Careers questions:{" "}
          <a href="mailto:codexstechnology@gmail.com">
            codexstechnology@gmail.com
          </a>
          . Please do not send sensitive documents through a general inquiry.
        </p>
      </Section>
    </>
  );
}
