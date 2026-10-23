import { z } from "zod";
import { displayCurrencies } from "./currency";

export const selectionSchema = z
  .array(
    z
      .object({
        service: z.string().regex(/^[a-z0-9-]{2,100}$/),
        packageId: z
          .string()
          .regex(/^[a-zA-Z0-9_-]{1,100}$/)
          .optional(),
        quantity: z.number().int().min(1).max(10),
      })
      .strict(),
  )
  .min(1)
  .max(10);
export type Selection = z.infer<typeof selectionSchema>;
export type CartItem = {
  service: string;
  packageId?: string;
  quantity: number;
  title: string;
  amountMinor: number | null;
  currency: string;
  billing: string;
  delivery: string;
  exclusions: string;
};
export const guestRequestSchema = z
  .object({
    cartId: z.string().regex(/^[a-f0-9]{64}$/),
    cartKey: z.string().regex(/^[a-f0-9]{64}$/),
    name: z.string().trim().min(2).max(100),
    email: z
      .email()
      .max(254)
      .transform((s) => s.toLowerCase()),
    country: z.string().regex(/^[A-Z]{2}$/),
    company: z.string().trim().max(150).default(""),
    notes: z.string().trim().max(4000).default(""),
    requestType: z.enum(["quote", "invoice"]),
    currency: z.enum(displayCurrencies),
    consent: z.literal(true),
    turnstileToken: z.string().max(2048),
    website: z.string().max(200).default(""),
  })
  .strict();

export function transitionPayment(
  current: string,
  event: "paid" | "failed" | "cancelled" | "refunded" | "partially_refunded",
  expected: { amountMinor: number; currency: string },
  actual: { amountMinor: number; currency: string },
): string {
  if (
    !Number.isSafeInteger(actual.amountMinor) ||
    actual.amountMinor < 0 ||
    expected.currency !== actual.currency ||
    expected.amountMinor !== actual.amountMinor
  )
    throw new Error("Payment amount or currency mismatch");
  const allowed: Record<string, string[]> = {
    pending: ["paid", "failed", "cancelled"],
    checkout_created: ["paid", "failed", "cancelled"],
    paid: ["partially_refunded", "refunded"],
    partially_refunded: ["partially_refunded", "refunded"],
    failed: [],
    cancelled: [],
    refunded: [],
  };
  if (current === event) return current;
  if (!allowed[current]?.includes(event))
    throw new Error("Invalid payment transition");
  return event;
}
