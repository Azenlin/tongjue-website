import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const blog = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    coverImage: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

const services = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/services" }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    order: z.number().default(0),
    icon: z.string().optional(),
  }),
});

const portfolio = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/portfolio" }),
  schema: z.object({
    title: z.string(),
    client: z.string(),
    summary: z.string(),
    coverImage: z.string().optional(),
    order: z.number().default(0),
  }),
});

const courses = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/courses" }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    startDate: z.coerce.date().optional(),
    registrationUrl: z.string().optional(),
    status: z.enum(["open", "upcoming", "closed"]).default("upcoming"),
  }),
});

export const collections = { blog, services, portfolio, courses };
