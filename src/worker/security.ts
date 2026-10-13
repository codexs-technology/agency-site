import type { Context } from "hono";
import type { AppEnv, Env } from "./types";
import { pbkdf2Async } from "@noble/hashes/pbkdf2.js";
import { sha256 } from "@noble/hashes/sha2.js";

const encoder = new TextEncoder();
const hex = (bytes: ArrayBuffer | Uint8Array) =>
  [...new Uint8Array(bytes)]
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
export const randomToken = () =>
  hex(crypto.getRandomValues(new Uint8Array(32)));
export async function digest(value: string) {
  return hex(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
}
export function equal(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
// Multiple bounded native PBKDF2 blocks avoid the Workers per-call iteration limit.
// Total work: 600,000 HMAC-SHA256 iterations; format versioned for future migration.
async function derive(password: string, salt: string) {
  let value = encoder.encode(password);
  for (let block = 0; block < 6; block++) {
    const key = await crypto.subtle.importKey("raw", value, "PBKDF2", false, [
      "deriveBits",
    ]);
    value = new Uint8Array(
      await crypto.subtle.deriveBits(
        {
          name: "PBKDF2",
          hash: "SHA-256",
          salt: encoder.encode(`${salt}:${block}`),
          iterations: 100000,
        },
        key,
        256,
      ),
    );
  }
  return hex(value);
}
export async function hashPassword(password: string) {
  const salt = randomToken();
  const hash = hex(
    await pbkdf2Async(sha256, password, salt, { c: 600000, dkLen: 32 }),
  );
  return `pbkdf2-sha256-v2$${salt}$${hash}`;
}
export async function verifyPassword(password: string, stored: string) {
  const [version, salt, hash] = stored.split("$");
  if (!salt || !hash) return false;
  if (version === "pbkdf2-chain-v1")
    return equal(await derive(password, salt), hash);
  if (version !== "pbkdf2-sha256-v2") return false;
  return equal(
    hex(await pbkdf2Async(sha256, password, salt, { c: 600000, dkLen: 32 })),
    hash,
  );
}
export function isLocal(env: Env, url: string) {
  const host = new URL(url).hostname;
  return (
    env.ENVIRONMENT === "development" &&
    env.LOCAL_TEST_MODE === "true" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(host)
  );
}
export async function rateLimit(
  c: Context<AppEnv>,
  bucket: string,
  limit: number,
  seconds: number,
) {
  const now = Math.floor(Date.now() / 1000);
  const ip = c.req.header("CF-Connecting-IP") || "local";
  const key = await digest(`${bucket}:${ip}`);
  const row = await c.env.DB.prepare(
    `INSERT INTO rate_limits(key,count,expires_at) VALUES(?,1,?)
    ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires_at<=? THEN 1 ELSE count+1 END,
    expires_at=CASE WHEN expires_at<=? THEN ? ELSE expires_at END RETURNING count`,
  )
    .bind(key, now + seconds, now, now, now + seconds)
    .first<{ count: number }>();
  return !!row && row.count <= limit;
}
export async function verifyTurnstile(
  c: Context<AppEnv>,
  token: string,
  honeypot: string,
) {
  if (honeypot) return false;
  if (isLocal(c.env, c.req.url)) return true;
  if (!c.env.TURNSTILE_SECRET_KEY || !token) return false;
  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: c.env.TURNSTILE_SECRET_KEY,
        response: token,
        remoteip: c.req.header("CF-Connecting-IP"),
      }),
      signal: AbortSignal.timeout(8000),
    },
  );
  const result = (await response.json()) as {
    success: boolean;
    hostname?: string;
  };
  return (
    response.ok &&
    result.success &&
    result.hostname === new URL(c.req.url).hostname
  );
}
