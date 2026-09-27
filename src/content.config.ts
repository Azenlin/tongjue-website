/**
 * 文章（「我的觀點」）：每篇一個資料夾 src/content/posts/<網址代稱>/index.mdx，
 * 封面圖放 public/insights/<網址代稱>/cover.jpg（沒有就用灰色預設底）。
 */
import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const posts = defineCollection({
  loader: glob({ pattern: '*/index.{md,mdx}', base: './src/content/posts', generateId: ({ entry }) => entry.split('/')[0] }),
  schema: z.object({
    title: z.string(),
    description: z.string(),            // 列表卡片與搜尋結果摘要，約 40–60 字
    date: z.coerce.date(),              // 顯示的發表日期；日期在未來的文章不會出現（時間到了重新部署才上架）
    tags: z.array(z.enum(['AI 導入', '知識管理', '碳規劃', '中小企業', '隨筆'])).min(1),
    services: z.array(z.enum(['ai', 'kb', 'netzero'])).optional(), // 文末「相關服務」；沒填就依標籤推斷
    draft: z.boolean().default(false),  // true = 不上網站
    readMinutes: z.number().optional(), // 沒填就依字數估算
  }),
});

export const collections = { posts };
