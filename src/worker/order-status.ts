import { digest } from "./security";

const labels: Record<string, string> = {
  pending:
    "Awaiting verified payment. Browser redirects never confirm payment.",
  checkout_created:
    "Awaiting verified payment. Browser redirects never confirm payment.",
  paid: "Paid — Onboarding",
  partially_refunded: "Partially refunded — under review",
  refunded: "Refunded",
  failed: "Payment failed. No verified payment was recorded.",
  cancelled: "Checkout expired or cancelled. No payment was recorded.",
};

/**
 * Customer view of an online order, authorized only by the private access key
 * (stored hashed). Status comes from the verified ledger-driven order record.
 */
export async function onlineOrderStatus(
  db: D1Database,
  id: string,
  accessKey: string,
) {
  const row = await db
    .prepare(
      "SELECT o.id,o.status,o.created_at,o.purpose,f.state AS fulfillment FROM orders o LEFT JOIN service_fulfillments f ON f.order_id=o.id WHERE o.id=? AND o.access_hash=?",
    )
    .bind(id, await digest(accessKey))
    .first<{
      id: string;
      status: string;
      created_at: string;
      purpose: string;
      fulfillment: string | null;
    }>();
  if (!row) return null;
  const paid = ["paid", "partially_refunded", "refunded"].includes(row.status);
  return {
    id: row.id,
    status: row.status,
    request_type:
      row.purpose === "verification"
        ? "payment_verification"
        : "online_payment",
    created_at: row.created_at,
    paid,
    fulfillment: row.fulfillment,
    message:
      row.purpose === "verification" && row.status === "paid"
        ? "Paid — verification order (no service delivery)"
        : row.status === "paid" && row.fulfillment !== "onboarding"
          ? "Paid — under review"
          : labels[row.status] || "Status unavailable",
  };
}
