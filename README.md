# 銅爵科技顧問官網（tongjuetech.com）

Astro 靜態網站。版面來自 claude.ai 上的設計稿「銅爵官網改版設計稿」，由 `tools/import_design.py` 匯入。

## 常用指令

```sh
npm install          # 第一次
npm run dev          # 本機預覽 http://localhost:4321
npm run build        # 產出 dist/（部署用）
npm run preview      # 預覽 build 後的結果
```

## 資料夾

| 路徑 | 內容 |
|---|---|
| `src/design/` | 從設計稿匯入的每頁素材：`<頁名>.body.html`（版面）、`.css`（樣式）、`.logic.js`（互動程式）；`pages.json` 是網址／標題／描述設定 |
| `src/layouts/DesignPage.astro` | 共用外框：SEO meta、字型、結構化資料、載入頁面程式 |
| `src/pages/[...path].astro` | 依 `pages.json` 產生每一頁 |
| `src/pages/404.astro` | 找不到頁面 |
| `public/js/dc-lite.js` | 設計稿元件的極簡執行環境（取代 claude.ai 畫布的 DC runtime） |
| `public/assets/` | 圖檔（檔名是設計稿素材庫的 id） |
| `public/_redirects` | 舊 WordPress 網址的 301 轉址（Cloudflare Pages 格式） |
| `tools/import_design.py` | 設計稿 → 網站的匯入工具 |

## 設計稿改了之後怎麼同步

1. 從設計稿下載最新的 `project/*.dc.html` 與用到的素材圖檔
2. `python tools/import_design.py <dc.html 所在資料夾> <圖檔資料夾>`
3. `npm run build` 檢查，commit、push

新頁面：在設計稿加頁後，到 `tools/import_design.py` 的 `PAGES` 加一行（網址、標題、描述）再重跑。

## 部署

Cloudflare Pages 連接這個 GitHub repo，push 到 `master` 自動部署。
Build command：`npm run build`，Output：`dist`。

## 注意

- 設計稿的網址互連（`Xxx.dc.html`）在匯入時自動換成正式網址，對照表就是 `PAGES`。
- 不要在 Google Drive 的鏡像資料夾裡跑 `npm install`（見 `開發說明.md`）。
