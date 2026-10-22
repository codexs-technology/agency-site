import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import {
  contactSchema,
  projectSchema,
  newsletterSchema,
  type ContactInput,
} from "../shared/validation";
import { services, type SiteData } from "../shared/content";
import { Turnstile } from "./components";

const inquiryKeys = new Map<string, string>();

export async function request(
  url: string,
  body?: unknown,
  method = "POST",
  csrf?: string,
) {
  try {
    let idempotencyKey: string | undefined;
    if (
      /^\/api\/(contact|consultations\/inquiry|projects\/inquiry)$/.test(url) &&
      body &&
      typeof body === "object"
    ) {
      const stable = {
        ...(body as Record<string, unknown>),
        turnstileToken: undefined,
      };
      const hash = Array.from(
        new Uint8Array(
          await crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode(url + JSON.stringify(stable)),
          ),
        ),
        (byte) => byte.toString(16).padStart(2, "0"),
      ).join("");
      idempotencyKey = inquiryKeys.get(hash) || crypto.randomUUID();
      if (inquiryKeys.size >= 20 && !inquiryKeys.has(hash))
        inquiryKeys.delete(inquiryKeys.keys().next().value!);
      inquiryKeys.set(hash, idempotencyKey);
    }
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(csrf ? { "X-CSRF-Token": csrf } : {}),
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    let data: Record<string, unknown>;
    try {
      const parsed: unknown = await response.json();
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
        throw new Error("Invalid response object");
      data = parsed as Record<string, unknown>;
    } catch {
      throw new Error(
        "The service returned an unexpected response. Receipt is not confirmed; contact support before resubmitting.",
      );
    }
    if (!response.ok)
      throw new Error(
        typeof data.error === "string"
          ? data.error
          : "The request could not be completed. Please try again.",
      );
    const publicSubmission =
      /^\/api\/(contact|consultations\/inquiry|projects\/inquiry|newsletter\/subscribe|jobs\/[^/]+\/apply)$/.test(
        url,
      );
    if (
      publicSubmission &&
      (data.stored !== true ||
        (!/^\/api\/jobs\//.test(url) &&
          (typeof data.message !== "string" || !data.message.trim())) ||
        (url !== "/api/newsletter/subscribe" &&
          (typeof data.id !== "string" || !/^[a-f0-9]{64}$/.test(data.id))))
    )
      throw new Error(
        "Receipt is not confirmed. Contact support before resubmitting; do not assume your submission was saved.",
      );
    return data;
  } finally {
    if (
      typeof document !== "undefined" &&
      /^\/api\/(contact|consultations\/inquiry|projects\/inquiry|newsletter\/subscribe|jobs\/[^/]+\/apply)$/.test(
        url,
      )
    ) {
      document
        .querySelectorAll("form")
        .forEach((form) => form.dispatchEvent(new Event("security-reset")));
    }
  }
}
export function ContactForm({ data }: { data: SiteData }) {
  const [token, setToken] = useState("");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      company: "",
      phone: "",
      budget: "",
      turnstileToken: "",
      website: "",
    },
  });
  const field = (
    name: keyof ContactInput,
    label: string,
    type = "text",
    required = false,
  ) => (
    <label className="field" key={name}>
      {label}
      {required ? " *" : ""}
      <input
        {...register(name)}
        type={type}
        autoComplete={
          name === "name"
            ? "name"
            : name === "email"
              ? "email"
              : name === "phone"
                ? "tel"
                : name === "company"
                  ? "organization"
                  : "off"
        }
        aria-invalid={!!errors[name]}
        aria-describedby={errors[name] ? `error-${name}` : undefined}
      />
      {errors[name] && (
        <span className="field-error" id={`error-${name}`}>
          {errors[name]?.message}
        </span>
      )}
    </label>
  );
  if (result)
    return (
      <div className="success-panel" role="status">
        <CheckCircle2 size={38} />
        <h2>Inquiry saved.</h2>
        <p>{result}</p>
        <p>
          Email notifications are queued or blocked depending on provider
          configuration; delivery has not been confirmed.
        </p>
      </div>
    );
  return (
    <form
      className="form-panel"
      onSubmit={handleSubmit(async (values) => {
        setError("");
        try {
          const response = await request("/api/contact", {
            ...values,
            turnstileToken: token,
          });
          setResult(
            `Reference: ${response.id}. Your information is stored securely for review.`,
          );
        } catch (e) {
          setError((e as Error).message);
        }
      })}
      noValidate
    >
      <h2>Tell us about your project</h2>
      <p className="muted">
        Required fields are marked *. Please don’t include passwords or
        sensitive personal records.
      </p>
      <div className="form-grid">
        {field("name", "Full name", "text", true)}
        {field("email", "Email address", "email", true)}
        {field("company", "Company")}
        {field("phone", "Phone (optional)", "tel")}
        <label className="field">
          Service interested in *
          <select {...register("service")} aria-invalid={!!errors.service}>
            <option value="">Select a service</option>
            {services.map((s) => (
              <option key={s.slug} value={s.title}>
                {s.title}
              </option>
            ))}
          </select>
          {errors.service && (
            <span className="field-error">Choose a service.</span>
          )}
        </label>
        <label className="field">
          Budget range (optional)
          <select {...register("budget")}>
            <option value="">Prefer to discuss</option>
            {[
              "Under USD 5,000",
              "USD 5,000–15,000",
              "USD 15,000–50,000",
              "USD 50,000+",
            ].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label className="field full-width">
          Project timeline *
          <select {...register("timeline")}>
            <option value="">Select a timeframe</option>
            {[
              "As soon as practical",
              "Within 1–3 months",
              "Within 3–6 months",
              "Exploring options",
            ].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
          {errors.timeline && (
            <span className="field-error">Choose a timeframe.</span>
          )}
        </label>
        <label className="field full-width">
          Project description *
          <textarea
            rows={6}
            {...register("description")}
            aria-invalid={!!errors.description}
          />
          {errors.description && (
            <span className="field-error">
              Use between 30 and 10,000 characters.
            </span>
          )}
        </label>
      </div>
      <label className="honeypot" aria-hidden="true">
        Website
        <input {...register("website")} tabIndex={-1} autoComplete="off" />
      </label>
      <label className="checkbox">
        <input type="checkbox" {...register("consent")} />I agree to the
        processing of my inquiry information as described in the{" "}
        <a href="/privacy-policy">privacy draft</a>.
      </label>
      {errors.consent && <p className="field-error">Consent is required.</p>}
      <Turnstile data={data} onToken={setToken} />
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      <button
        className="button"
        disabled={isSubmitting || (!data.localTestMode && !token)}
      >
        {isSubmitting ? "Saving inquiry…" : "Send Project Inquiry"}
        <ArrowRight size={17} />
      </button>
    </form>
  );
}
export function ProjectForm({ data }: { data: SiteData }) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState({
    services: [] as string[],
    description: "",
    budget: "",
    timeline: "",
    name: "",
    email: "",
    company: "",
    phone: "",
    consent: false,
    website: "",
  });
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");
  const names = [
    "Services",
    "Requirements",
    "Budget & timing",
    "Your details",
    "Review",
  ];
  const update = (key: string, value: string | boolean) =>
    setValues((v) => ({ ...v, [key]: value }));
  const next = () => {
    const parsed = projectSchema.safeParse({
      ...values,
      turnstileToken: token,
    });
    const relevant = [
      ["services"],
      ["description"],
      ["timeline"],
      ["name", "email", "consent"],
      [],
    ][step];
    const issues = parsed.success
      ? []
      : parsed.error.issues.filter((i) => relevant.includes(String(i.path[0])));
    if (issues.length) {
      setError(
        issues.map((i) => `${String(i.path[0])}: ${i.message}`).join(" "),
      );
      return;
    }
    setError("");
    setStep((s) => Math.min(4, s + 1));
  };
  if (result)
    return (
      <div className="success-panel" role="status">
        <CheckCircle2 size={40} />
        <h2>Project brief saved.</h2>
        <p>Reference: {result}</p>
        <p>Notification delivery is separate and remains unconfirmed.</p>
        <a href="/services">Explore our capabilities</a>
      </div>
    );
  return (
    <div className="project-form form-panel">
      <ol className="stepper">
        {names.map((name, i) => (
          <li
            key={name}
            aria-current={i === step ? "step" : undefined}
            className={i <= step ? "active" : ""}
          >
            <span>{i + 1}</span>
            {name}
          </li>
        ))}
      </ol>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (step < 4) {
            next();
            return;
          }
          setBusy(true);
          setError("");
          try {
            const parsed = projectSchema.parse({
              ...values,
              turnstileToken: token,
            });
            const response = await request("/api/projects/inquiry", parsed);
            setResult(String(response.id));
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="step-content" key={step}>
          <p className="eyebrow">STEP {step + 1} OF 5</p>
          <h2>{names[step]}</h2>
          {step === 0 && (
            <>
              <p>Select one or more capabilities.</p>
              <div className="selection-grid">
                {services.map((s) => (
                  <label
                    className={
                      values.services.includes(s.title) ? "selected" : ""
                    }
                    key={s.slug}
                  >
                    <input
                      type="checkbox"
                      checked={values.services.includes(s.title)}
                      onChange={(e) =>
                        setValues((v) => ({
                          ...v,
                          services: e.target.checked
                            ? [...v.services, s.title]
                            : v.services.filter((item) => item !== s.title),
                        }))
                      }
                    />
                    {s.title}
                  </label>
                ))}
              </div>
            </>
          )}
          {step === 1 && (
            <label className="field">
              What are you hoping to build or improve? *
              <textarea
                rows={8}
                value={values.description}
                onChange={(e) => update("description", e.target.value)}
                minLength={30}
                maxLength={10000}
              />
              <span className="muted">
                At least 30 characters. Include goals, users and existing
                systems; avoid sensitive data.
              </span>
            </label>
          )}
          {step === 2 && (
            <div className="form-grid">
              <label className="field">
                Budget range (optional)
                <select
                  value={values.budget}
                  onChange={(e) => update("budget", e.target.value)}
                >
                  <option value="">Prefer to discuss</option>
                  {[
                    "Under USD 5,000",
                    "USD 5,000–15,000",
                    "USD 15,000–50,000",
                    "USD 50,000+",
                  ].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                Timeline *
                <select
                  value={values.timeline}
                  onChange={(e) => update("timeline", e.target.value)}
                >
                  <option value="">Select timeframe</option>
                  {[
                    "As soon as practical",
                    "Within 1–3 months",
                    "Within 3–6 months",
                    "Exploring options",
                  ].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
            </div>
          )}
          {step === 3 && (
            <>
              <div className="form-grid">
                {[
                  ["name", "Full name *"],
                  ["email", "Email address *"],
                  ["company", "Company"],
                  ["phone", "Phone (optional)"],
                ].map(([key, label]) => (
                  <label className="field" key={key}>
                    {label}
                    <input
                      type={
                        key === "email"
                          ? "email"
                          : key === "phone"
                            ? "tel"
                            : "text"
                      }
                      value={
                        values[key as "name" | "email" | "company" | "phone"]
                      }
                      onChange={(e) => update(key, e.target.value)}
                      autoComplete={
                        key === "company"
                          ? "organization"
                          : key === "phone"
                            ? "tel"
                            : key
                      }
                    />
                  </label>
                ))}
              </div>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={values.consent}
                  onChange={(e) => update("consent", e.target.checked)}
                />
                I consent to processing this inquiry.{" "}
                <a href="/privacy-policy">Read the privacy draft</a>.
              </label>
            </>
          )}
          {step === 4 && (
            <>
              <dl className="review-list">
                {Object.entries(values)
                  .filter(([key]) => !["website", "consent"].includes(key))
                  .map(([key, value]) => (
                    <div key={key}>
                      <dt>{key}</dt>
                      <dd>
                        {Array.isArray(value)
                          ? value.join(", ")
                          : String(value || "Not specified")}
                      </dd>
                    </div>
                  ))}
              </dl>
              <Turnstile data={data} onToken={setToken} />
            </>
          )}
        </div>
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
        <div className="form-navigation">
          {step > 0 && (
            <button
              type="button"
              className="button button-secondary"
              onClick={() => {
                setStep(step - 1);
                setError("");
              }}
            >
              Back
            </button>
          )}
          <button
            className="button"
            disabled={busy || (step === 4 && !data.localTestMode && !token)}
          >
            {busy
              ? "Saving brief…"
              : step < 4
                ? "Continue"
                : "Submit Project Brief"}
            <ArrowRight size={16} />
          </button>
        </div>
      </form>
    </div>
  );
}
export function Newsletter({ data }: { data: SiteData }) {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="newsletter"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          const parsed = newsletterSchema.safeParse({
            email,
            consent,
            turnstileToken: token,
          });
          if (!parsed.success)
            throw new Error("Enter a valid email and consent to subscription.");
          const result = await request(
            "/api/newsletter/subscribe",
            parsed.data,
          );
          setMessage(String(result.message));
        } catch (err) {
          setMessage((err as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3>Useful ideas. No noise.</h3>
      <p>Subscribe for occasional software and AI perspectives.</p>
      <label className="field">
        Email address
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
      </label>
      <label className="checkbox">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />
        I consent to newsletter updates.{" "}
        <a href="/privacy-policy">Privacy draft</a>
      </label>
      <Turnstile data={data} onToken={setToken} />
      <button
        className="button"
        disabled={busy || (!data.localTestMode && !token)}
      >
        {busy ? "Subscribing…" : "Subscribe"}
      </button>
      <p role="status">{message}</p>
    </form>
  );
}
