import { useEffect, useState } from "react";
import { services, type SiteData } from "../shared/content";
import { displayCurrencies, type DisplayCurrency } from "../shared/currency";
import {
  selectionSchema,
  type Selection,
  type CartItem,
} from "../shared/guest-commerce";
import { formatMinorAmount } from "../shared/pricing";
import { StartingPrice } from "./StartingPrice";
import { Section, Turnstile } from "./components";
import { request } from "./forms";
import { CurrencySelector, useDisplayCurrency } from "./DisplayCurrency";
import {
  servicePricing,
  serviceStartingPrice,
} from "../shared/service-pricing";

type Package = {
  id: string;
  title: string;
  service_slug: string;
  description: string;
  features_json: string;
  amount_minor: number | null;
  currency: string;
  displayMinor: number | null;
  displayCurrency: string;
  billing: string;
  billing_interval: string;
  delivery: string;
  exclusions: string;
};
type Catalog = {
  packages: Package[];
  rateUpdatedAt: number | null;
  rateStale: boolean;
  conversionAvailable: boolean;
  notice: string;
};
const storageKey = "codesboxs-service-selection-v1";
function readSelection(): Selection {
  try {
    const parsed = selectionSchema.safeParse(
      JSON.parse(sessionStorage.getItem(storageKey) || "[]"),
    );
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}
function writeSelection(value: Selection) {
  sessionStorage.setItem(storageKey, JSON.stringify(value));
}
function add(service: string, packageId?: string) {
  const current = readSelection();
  if (!current.some((s) => s.service === service && s.packageId === packageId))
    current.push({ service, packageId, quantity: 1 });
  writeSelection(current.slice(0, 10));
  window.location.assign("/cart");
}
export function ServicePurchase({ slug }: { slug: string }) {
  const terms = servicePricing[slug];
  return (
    <Section title="Scope, pricing and delivery">
      <div className="panel">
        <CurrencySelector />
        {serviceStartingPrice(slug) !== null && (
          <p className="service-price">
            <strong>
              Starting from{" "}
              <StartingPrice usdMinor={serviceStartingPrice(slug)!} />
            </strong>
          </p>
        )}
        <p>
          The final price for your scope, delivery estimate and revision rounds
          are confirmed in a written quote before any payment. Taxes and
          third-party costs (such as domains, hosting or licences) are itemized
          separately.
        </p>
        <p>Delivery estimate: {terms?.delivery}</p>
        <h3>Proposed deliverables for scope review</h3>
        <ul>
          {terms?.deliverables.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <div className="button-row">
          <button className="button" onClick={() => add(slug)}>
            Add to quote cart
          </button>
          <a className="button button-secondary" href="/pricing">
            Explore approved packages
          </a>
        </div>
        <p>
          <a href="/terms-of-service">Terms</a> ·{" "}
          <a href="/refund-policy">Refunds and cancellation</a> ·{" "}
          <a href="/service-delivery-policy">Digital delivery</a> ·{" "}
          <a href="/payment-policy">Payments</a>.
        </p>
      </div>
    </Section>
  );
}
export function GuestCatalog() {
  const [currency, setCurrency] = useDisplayCurrency();
  const [catalog, setCatalog] = useState<Catalog | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    request(`/api/guest/catalog?currency=${currency}`, undefined, "GET")
      .then((d) => {
        if (active) {
          setCatalog(d as unknown as Catalog);
          setError("");
        }
      })
      .catch(() => {
        if (active)
          setError(
            "Pricing or conversions are temporarily unavailable. Request a written quote.",
          );
      });
    return () => {
      active = false;
    };
  }, [currency]);
  return (
    <Section title="Service packages and display currency">
      <label className="field">
        Display currency
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value as DisplayCurrency)}
        >
          {displayCurrencies.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      {error && <p role="alert">{error}</p>}
      <p>
        {catalog?.notice ||
          "Quote-only services do not acquire a price through currency conversion."}
      </p>
      {catalog?.rateUpdatedAt && (
        <p>
          Rates updated: {new Date(catalog.rateUpdatedAt * 1000).toISOString()}
          {catalog.rateStale
            ? " — cached rates; refresh temporarily unavailable"
            : ""}
          .{" "}
          <a
            href="https://www.exchangerate-api.com"
            rel="noopener noreferrer"
            target="_blank"
          >
            Rates By ExchangeRate-API
          </a>
          .
        </p>
      )}
      {catalog && !catalog.conversionAvailable && (
        <p role="status">
          Live conversions unavailable. Base prices remain visible; no estimated
          rate is invented.
        </p>
      )}
      <div className="three-grid">
        {catalog?.packages.map((p) => (
          <article className="panel" key={p.id}>
            <h3>{p.title}</h3>
            <p>{p.description}</p>
            <strong>
              {p.amount_minor === null || p.billing === "quote"
                ? "Custom quotation"
                : p.displayMinor === null
                  ? formatMinorAmount(p.amount_minor, p.currency) +
                    " — conversion unavailable"
                  : formatMinorAmount(p.displayMinor, p.displayCurrency) +
                    " estimated display"}
            </strong>
            <p>
              {p.billing === "recurring"
                ? `Recurring: ${p.billing_interval}`
                : p.billing === "quote"
                  ? "Fees agreed in writing"
                  : "One-time"}
            </p>
            <ul>
              {(JSON.parse(p.features_json) as string[]).map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <p>Delivery: {p.delivery}</p>
            <p>Exclusions: {p.exclusions}</p>
            {p.service_slug && (
              <button
                className="button"
                onClick={() => add(p.service_slug, p.id)}
              >
                Select package for invoice review
              </button>
            )}
          </article>
        ))}
      </div>
      {!catalog?.packages.length && (
        <p>
          No owner-approved fixed packages are currently available. All services
          below support custom quotations; no draft price is published as an
          offer.
        </p>
      )}
      <div className="three-grid">
        {services.map((s) => (
          <article className="panel" key={s.slug}>
            <h3>
              <a href={`/services/${s.slug}`}>{s.title}</a>
            </h3>
            <p>{s.summary}</p>
            <p>Custom quotation · timeline confirmed after discovery.</p>
            <button
              className="button button-secondary"
              onClick={() => add(s.slug)}
            >
              Request quote
            </button>
          </article>
        ))}
      </div>
    </Section>
  );
}
export function GuestCommercePage({ data }: { data: SiteData }) {
  const [currency, setCurrency] = useDisplayCurrency();
  const [estimate, setEstimate] = useState<{
    currency: string;
    items: (CartItem & {
      displayMinor: number | null;
      displayLineMinor: number | null;
    })[];
    rateUpdatedAt: number | null;
    rateStale: boolean;
  } | null>(null);
  const [items, setItems] = useState<Selection>([]),
    [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [cart, setCart] = useState<{
      id: string;
      key: string;
      items: CartItem[];
    } | null>(null),
    [token, setToken] = useState("");
  const [receipt, setReceipt] = useState<{
      id: string;
      accessKey: string;
      message: string;
    } | null>(null),
    [status, setStatus] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setItems(readSelection());
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  const selectionKey = JSON.stringify(items);
  useEffect(() => {
    let active = true;
    if (JSON.parse(selectionKey).length)
      request(
        `/api/guest/estimate?currency=${currency}`,
        JSON.parse(selectionKey),
      )
        .then((result) => {
          if (active)
            setEstimate({ ...result, currency } as unknown as NonNullable<
              typeof estimate
            >);
        })
        .catch(() => {
          if (active) setEstimate(null);
        });
    return () => {
      active = false;
    };
  }, [currency, selectionKey]);
  const path = data.path;
  if (path === "/checkout/success" || path === "/checkout/cancel")
    return (
      <Section
        title={
          path.endsWith("success")
            ? "Verify your request status"
            : "Checkout cancelled"
        }
      >
        <p>
          No payment is confirmed by this page or its URL. No online provider is
          active.
        </p>
        <a href="/order-status">Check a private reference</a> ·{" "}
        <a href="/cart">Return to selection</a>
      </Section>
    );
  if (path === "/order-status")
    return (
      <Section title="Private request status">
        <form
          className="form-panel"
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            const f = new FormData(e.currentTarget);
            try {
              setStatus(
                await request("/api/guest/status", {
                  id: f.get("reference"),
                  accessKey: f.get("accessKey"),
                }),
              );
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          <label className="field">
            Request reference
            <input
              name="reference"
              required
              maxLength={64}
              autoComplete="off"
            />
          </label>
          <label className="field">
            Private access key
            <input
              name="accessKey"
              type="password"
              required
              maxLength={64}
              autoComplete="off"
            />
          </label>
          <button className="button">Check status</button>
        </form>
        {error && <p role="alert">{error}</p>}
        {status && (
          <div role="status">
            <p>Status: {String(status.status)}</p>
            <p>{String(status.message)}</p>
          </div>
        )}
      </Section>
    );
  if (receipt)
    return (
      <Section title="Request saved — no payment taken">
        <p>{receipt.message}</p>
        <p>
          Save these private details securely. The access key is not emailed or
          included in a URL.
        </p>
        <dl>
          <dt>Reference</dt>
          <dd>
            <code>{receipt.id}</code>
          </dd>
          <dt>Private access key</dt>
          <dd>
            <code>{receipt.accessKey}</code>
          </dd>
        </dl>
        <a href="/order-status">Check request status</a>
      </Section>
    );
  return (
    <Section
      title={
        path === "/cart"
          ? "Your service selection"
          : "Guest checkout — quote or invoice request"
      }
    >
      <p>
        No registration or login required. Online payment is pending provider
        approval; this flow stores a request, not a paid order.
      </p>
      {!ready ? (
        <p role="status">Loading your selection…</p>
      ) : !items.length ? (
        <p>
          Your cart is empty.{" "}
          <a href="/pricing">Explore services and packages</a>.
        </p>
      ) : (
        <>
          <CurrencySelector />
          <div aria-live="polite">
            <h3>Server-calculated estimate and order summary</h3>
            {estimate?.currency === currency ? (
              <>
                {estimate.items.map((item) => (
                  <p key={item.service + item.packageId}>
                    {item.title} × {item.quantity}:{" "}
                    {item.amountMinor === null
                      ? "Custom quotation"
                      : item.displayLineMinor === null
                        ? `${formatMinorAmount(item.amountMinor, item.currency)} base unit; conversion unavailable`
                        : `${formatMinorAmount(item.displayLineMinor, currency)} estimated line total`}{" "}
                    · {item.billing}
                  </p>
                ))}
                {estimate.rateUpdatedAt && (
                  <p>
                    Rates By ExchangeRate-API, updated{" "}
                    {new Date(estimate.rateUpdatedAt * 1000).toISOString()}
                    {estimate.rateStale ? " — stale cached estimate" : ""}.
                  </p>
                )}
                <p>
                  Not an amount due. Different billing intervals, taxes and
                  quote-only services are not combined into a payable total.
                </p>
              </>
            ) : (
              <p>
                Estimate unavailable or refreshing. No conversion or payable
                total is assumed.
              </p>
            )}
          </div>
          <ul className="check-list">
            {items.map((item, i) => (
              <li key={item.service + item.packageId}>
                <span>
                  {services.find((s) => s.slug === item.service)?.title ||
                    item.service}{" "}
                  × {item.quantity}
                </span>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => {
                    const next = items.filter((_, n) => n !== i);
                    setItems(next);
                    writeSelection(next);
                    setCart(null);
                  }}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <p>
            Final taxes, add-ons, billing intervals and settlement currency
            require a written agreement. Display currency is not an enabled
            settlement method.
          </p>
          {path === "/cart" ? (
            <a className="button" href="/checkout">
              Continue as guest
            </a>
          ) : (
            <>
              {!cart ? (
                <button
                  className="button"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    setError("");
                    try {
                      setCart(
                        (await request(
                          "/api/guest/carts",
                          items,
                        )) as unknown as typeof cart,
                      );
                    } catch (e) {
                      setError((e as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Review server-validated selection
                </button>
              ) : (
                <>
                  <div className="panel">
                    <h2>Server-validated summary</h2>
                    {cart.items.map((item, i) => (
                      <div key={i}>
                        <h3>{item.title}</h3>
                        <p>
                          {item.amountMinor === null
                            ? "Custom quotation"
                            : formatMinorAmount(
                                item.amountMinor,
                                item.currency,
                              )}{" "}
                          · quantity {item.quantity} · {item.billing}
                        </p>
                        <p>{item.delivery}</p>
                        <p>{item.exclusions}</p>
                      </div>
                    ))}
                  </div>
                  <form
                    className="form-panel"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setBusy(true);
                      setError("");
                      const f = new FormData(e.currentTarget);
                      try {
                        const r = await request("/api/guest/requests", {
                          cartId: cart.id,
                          cartKey: cart.key,
                          name: f.get("name"),
                          email: f.get("email"),
                          country: String(f.get("country")).toUpperCase(),
                          company: f.get("company"),
                          notes: f.get("notes"),
                          requestType: f.get("requestType"),
                          currency: f.get("currency"),
                          consent: f.get("consent") === "on",
                          turnstileToken: token,
                          website: f.get("website"),
                        });
                        setReceipt(r as unknown as typeof receipt);
                      } catch (e) {
                        setError((e as Error).message);
                      } finally {
                        setBusy(false);
                        setToken("");
                      }
                    }}
                  >
                    <label className="field">
                      Full name
                      <input
                        name="name"
                        required
                        minLength={2}
                        maxLength={100}
                        autoComplete="name"
                      />
                    </label>
                    <label className="field">
                      Email
                      <input
                        name="email"
                        type="email"
                        required
                        maxLength={254}
                        autoComplete="email"
                      />
                    </label>
                    <label className="field">
                      Country (two-letter code, for example PK)
                      <input
                        name="country"
                        required
                        pattern="[A-Za-z]{2}"
                        maxLength={2}
                        autoComplete="country"
                      />
                    </label>
                    <label className="field">
                      Company (optional)
                      <input
                        name="company"
                        maxLength={150}
                        autoComplete="organization"
                      />
                    </label>
                    <label className="field">
                      Request type
                      <select name="requestType">
                        <option value="quote">Request quotation</option>
                        <option value="invoice">Request invoice review</option>
                      </select>
                    </label>
                    <label className="field">
                      Preferred display currency
                      <select
                        name="currency"
                        value={currency}
                        onChange={(event) =>
                          setCurrency(event.target.value as DisplayCurrency)
                        }
                      >
                        {displayCurrencies.map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      Project or billing notes
                      <textarea name="notes" maxLength={4000} />
                    </label>
                    <label className="honeypot" aria-hidden="true">
                      Website
                      <input name="website" tabIndex={-1} autoComplete="off" />
                    </label>
                    <p>
                      <a href="/terms-of-service">Terms</a> ·{" "}
                      <a href="/privacy-policy">Privacy</a> ·{" "}
                      <a href="/refund-policy">Refunds</a> ·{" "}
                      <a href="/service-delivery-policy">Delivery</a> ·{" "}
                      <a href="/cookie-policy">Cookies</a>
                    </p>
                    <label>
                      <input name="consent" type="checkbox" required /> I
                      consent to processing this inquiry and agree to the linked
                      Terms, Privacy, Refund and Delivery policies.
                    </label>
                    <Turnstile data={data} onToken={setToken} />
                    <button
                      className="button"
                      disabled={busy || (!token && !data.localTestMode)}
                    >
                      {busy ? "Saving…" : "Submit request — no payment"}
                    </button>
                    {!data.turnstileSiteKey && !data.localTestMode && (
                      <p>
                        Secure submission is unavailable. Email{" "}
                        <a href="mailto:support@codesboxs.com">
                          support@codesboxs.com
                        </a>
                        .
                      </p>
                    )}
                  </form>
                </>
              )}
            </>
          )}
        </>
      )}
      {error && <p role="alert">{error}</p>}
      <p>
        <a href="/pricing">Add services</a> ·{" "}
        <a href="/order-status">Private status lookup</a> ·{" "}
        <a href="/contact">Contact support</a>
      </p>
    </Section>
  );
}
