import { defineCollection, z } from 'astro:content';

const posts = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    keywords: z.array(z.string()),
    date: z.coerce.date(),
    author: z.string().default('AI Author'),
    tags: z.array(z.string()),
    seoScore: z.number().min(0).max(100).optional(),
    featured: z.boolean().default(false),
  }),
});

export const collections = { posts };
