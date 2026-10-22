import { useState } from "react";
import { Section } from "./components";
import { request } from "./forms";

export function NewsletterConfirm() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  return (
    <Section>
      <div className="form-panel">
        <h2>Confirm by choice</h2>
        <p>
          Click below only if you requested this newsletter. Visiting a link
          does not subscribe you automatically.
        </p>
        <button
          className="button"
          disabled={busy || confirmed}
          onClick={async () => {
            const token =
              new URLSearchParams(window.location.search).get("token") || "";
            setBusy(true);
            setMessage("");
            try {
              const result = await request("/api/newsletter/confirm", {
                token,
              });
              if (result.confirmed !== true)
                throw new Error(
                  "Confirmation was not acknowledged. Please contact us.",
                );
              setConfirmed(true);
              setMessage(String(result.message));
              window.history.replaceState(null, "", "/newsletter/confirm");
            } catch (error) {
              setMessage((error as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {confirmed
            ? "Subscription Confirmed"
            : busy
              ? "Confirming…"
              : "Confirm Subscription"}
        </button>
        <p role="status">{message}</p>
      </div>
    </Section>
  );
}
