// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// 頁面內容來自 src/design/（由 tools/import_design.py 從設計稿匯入），網址設定在 src/design/pages.json
export default defineConfig({
  site: 'https://tongjuetech.com',
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [
    sitemap({ filter: (page) => !page.includes('/coming-soon/') }),
  ],
});
