import { test, expect } from "@playwright/test";

test("request boundaries, honeypot and persisted rate limiting", async ({
  request,
}) => {
  const origin = "http://localhost:8787";
  const unsubscribe = await request.post("/api/newsletter/unsubscribe", {
    headers: { Origin: origin },
    data: { token: "a".repeat(64) },
  });
  expect(unsubscribe.status()).toBe(404);
  const body = {
    name: "Security Example",
    email: "security@example.com",
    service: "Web Development",
    timeline: "Exploring options",
    description:
      "A sufficiently detailed inquiry for exercising server-side security boundary checks.",
    consent: true,
  };
  const foreign = await request.post("/api/contact", {
    headers: { Origin: "https://untrusted.example" },
    data: body,
  });
  expect(foreign.status()).toBe(403);
  const invalid = await request.post("/api/contact", {
    headers: { Origin: origin, "CF-Connecting-IP": "192.0.2.50" },
    data: { ...body, email: "invalid" },
  });
  expect(invalid.status()).toBe(400);
  const bot = await request.post("/api/contact", {
    headers: { Origin: origin, "CF-Connecting-IP": "192.0.2.51" },
    data: { ...body, website: "spam" },
  });
  expect(bot.status()).toBe(422);
  const oversized = await request.post("/api/contact", {
    headers: { Origin: origin },
    data: { ...body, description: "x".repeat(70000) },
  });
  expect(oversized.status()).toBe(413);
  for (let i = 0; i < 6; i++) {
    const response = await request.post("/api/newsletter/subscribe", {
      headers: { Origin: origin, "CF-Connecting-IP": "192.0.2.52" },
      data: { email: "bad", consent: false },
    });
    expect(response.status()).toBe(i < 5 ? 400 : 429);
  }
  const application = await request.post("/api/jobs/nonexistent/apply", {
    headers: { Origin: origin },
    data: {
      name: "Applicant Example",
      email: "applicant@example.com",
      cover_letter:
        "A cover letter for a nonexistent position must not create an application.",
      consent: true,
    },
  });
  expect(application.status()).toBe(404);
});
