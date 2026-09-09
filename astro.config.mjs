// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import react from '@astrojs/react';

// GH_PAGES 只在 GitHub Actions 部署預覽時設定，正式上線到 tongjuetech.com 用根目錄，不受影響
const isGhPagesPreview = process.env.GH_PAGES === "true";

// https://astro.build/config
export default defineConfig({
  site: isGhPagesPreview ? "https://azenlin.github.io" : undefined,
  base: isGhPagesPreview ? "/tongjue-website" : "/",

  vite: {
    plugins: [tailwindcss()]
  },

  integrations: [react()]
});