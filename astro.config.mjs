// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import { unified } from '@astrojs/markdown-remark';

/** 文章內文裡連到其他網站的連結一律開新分頁；站內連結（/ 開頭或 tongjuetech.com）維持原分頁 */
function externalLinksNewTab() {
  const isExternal = (href) => /^https?:\/\//.test(href) && !/^https?:\/\/(www\.)?tongjuetech\.com(\/|$)/.test(href);
  const walk = (node) => {
    if (node.type === 'element' && node.tagName === 'a' && typeof node.properties?.href === 'string' && isExternal(node.properties.href)) {
      node.properties.target = '_blank';
      node.properties.rel = ['noopener'];
    }
    (node.children || []).forEach(walk);
  };
  return (tree) => walk(tree);
}

// 頁面內容來自 src/design/（由 tools/import_design.py 從設計稿匯入），網址設定在 src/design/pages.json
export default defineConfig({
  site: 'https://tongjuetech.com',
  trailingSlash: 'always',
  build: { format: 'directory' },
  // Astro 7 預設的 Markdown 處理器（Sätteri）不支援 rehype 外掛，文章改用 unified 處理器；MDX 會沿用
  markdown: { processor: unified({ rehypePlugins: [externalLinksNewTab] }) },
  integrations: [
    mdx(),
    sitemap({ filter: (page) => !page.includes('/coming-soon/') }),
  ],
});
