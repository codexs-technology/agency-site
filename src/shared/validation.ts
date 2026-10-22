import { z } from "zod";

export const recruitmentStatuses = [
  "Received",
  "Under Review",
  "Shortlisted",
  "Interview",
  "Offer",
  "Rejected",
  "Withdrawn",
] as const;

export const leadStatuses = [
  "New",
  "Contacted",
  "Qualified",
  "Proposal Sent",
  "Won",
  "Lost",
] as const;
const text = (min: number, max: number) => z.string().trim().min(min).max(max);
export const email = z
  .email()
  .max(254)
  .transform((value) => value.toLowerCase());
const consent = z.literal(true, {
  error: "Please consent to processing your inquiry.",
});
export const contactSchema = z.object({
  name: text(2, 100),
  email,
  company: text(0, 150).default(""),
  phone: text(0, 40).default(""),
  service: text(2, 100),
  budget: text(0, 100).default(""),
  timeline: text(2, 100),
  description: text(30, 10000),
  consent,
  turnstileToken: text(0, 2048).default(""),
  website: text(0, 200).default(""),
});
export const projectSchema = contactSchema
  .omit({ service: true })
  .extend({ services: z.array(text(2, 100)).min(1).max(15) });
export const newsletterSchema = z.object({
  email,
  consent,
  turnstileToken: text(0, 2048).default(""),
  website: text(0, 200).default(""),
});
export const loginSchema = z.object({ email, password: text(1, 128) });
export const bootstrapSchema = loginSchema.extend({
  password: text(14, 128)
    .regex(/[a-z]/)
    .regex(/[A-Z]/)
    .regex(/[0-9]/)
    .regex(/[^a-zA-Z0-9]/),
});
export const applicationSchema = z.object({
  name: text(2, 100),
  email,
  cover_letter: text(30, 10000),
  portfolio_url: z
    .union([
      z.literal(""),
      z
        .url()
        .max(500)
        .refine((url) => url.startsWith("https://"), "Use HTTPS"),
    ])
    .default(""),
  consent,
  turnstileToken: text(0, 2048).default(""),
  website: text(0, 200).default(""),
});
export const recruitmentSchema = applicationSchema.extend({
  job_id: text(1, 100),
  phone: text(5, 40),
  country: text(2, 100),
  applicant_location: text(2, 150),
  experience: text(10, 4000),
  skills: text(2, 2000),
  professional_url: applicationSchema.shape.portfolio_url,
});
export const contentSchema = z.object({
  slug: text(2, 120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: text(3, 180),
  summary: text(20, 500),
  body: text(50, 50000),
  status: z.enum(["draft", "published"]),
  category: text(1, 80).default("Engineering"),
  author: text(2, 100).default("CodesBoxs Editorial"),
  image: z
    .enum([
      "/images/hero.svg",
      "/images/engineering.svg",
      "/images/ai.svg",
      "/images/cloud.svg",
      "/images/dashboard.svg",
      "/images/mobile.svg",
      "/images/security.svg",
      "/images/team.svg",
    ])
    .default("/images/engineering.svg"),
  technologies: text(0, 500).default(""),
  is_concept: z.literal(true).default(true),
  location: text(0, 150).default(""),
  employment_type: text(0, 100).default(""),
});
export const gallerySchema = z
  .array(
    z.object({
      url: contentSchema.shape.image.removeDefault(),
      alt: text(5, 240),
    }),
  )
  .max(8);
export type ContactInput = z.input<typeof contactSchema>;
export type ProjectInput = z.input<typeof projectSchema>;
