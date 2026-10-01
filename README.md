# 銅爵科技顧問官網（tongjuetech.com）

Astro 靜態網站。版面來自 claude.ai 上的設計稿「銅爵官網改版設計稿」，由 `tools/import_design.py` 匯入。

## 常用指令

```sh
npm install          # 第一次
npm run dev          # 本機預覽 http://localhost:4321
npm run build        # 產出 dist/（部署用；含字型裁切，見下方「字型」）
npm run preview      # 預覽 build 後的結果
```

## 改完之後的檢查

```sh
python tools/check.py --build                      # build 後檢查全部頁面（桌機＋手機，約 15 秒）
python tools/check.py --shot home --find 某段文字   # 捲到那段文字，截桌機＋手機圖到 .check/
python tools/check.py --shot yujen --full          # 整頁長截圖
```

檢查項目：頁面程式有沒有啟動（dc-ready）、有沒有殘留 `{{ }}`、JS 錯誤、手機版左右溢出。需要 `pip install playwright`（使用電腦上的 Chrome）。

## 新增文章

1. 建資料夾 `src/content/posts/<英文網址代稱>/`，放 `index.mdx`（網址會是 `/insights/<代稱>/`）
2. 開頭寫 frontmatter：
   ```yaml
   ---
   title: 文章標題
   description: 列表卡片與搜尋結果的摘要，約 40–60 字
   date: 2026-09-14          # 顯示的發表日期，可以填過去；填未來的日期不會上架，直到那天之後重新部署
   tags: ['AI 導入', '碳規劃']  # 只能用：AI 導入、知識管理、碳規劃、中小企業、隨筆
   services: ['ai', 'netzero'] # 選填，文末相關服務：ai / kb / netzero；沒填就依標籤推斷
   draft: true               # 選填，true = 不上網站
   ---
   ```
3. 內文用 Markdown。互動圖表寫成同資料夾的 `.astro` 元件，在 MDX 裡 `import X from './X.astro'` 後用 `<X />` 放進文中（範例：`ai-data-audit/`）
4. 封面圖放 `public/insights/<代稱>/cover.jpg`（沒有就用灰色預設底）。照片以全彩顯示，白字後面會自動加一層深色漸層；遇到白色元素多、字看不清楚的照片，在 frontmatter 加 `coverDark: true`（漸層加深），或用 `coverPosition: 'center 30%'` 調整取景，讓較深的部分落在字後面
5. `python tools/check.py --build` 檢查，`--shot insights/<代稱> --full` 看整篇

文章頁版型取自設計稿「中小企業 AI 導入指南」頁，觀點列表、首頁與個人頁的「最新觀點」卡片都會自動更新；接法在 `src/lib/posts.ts`。

## 資料夾

| 路徑 | 內容 |
|---|---|
| `src/design/` | 從設計稿匯入的每頁素材：`<頁名>.body.html`（版面）、`.css`（樣式）、`.logic.js`（互動程式）；`pages.json` 是網址／標題／描述設定 |
| `src/layouts/DesignPage.astro` | 共用外框：SEO meta、結構化資料、載入頁面程式 |
| `src/pages/[...path].astro` | 依 `pages.json` 產生每一頁 |
| `src/pages/404.astro` | 找不到頁面 |
| `public/js/dc-lite.js` | 設計稿元件的極簡執行環境（取代 claude.ai 畫布的 DC runtime） |
| `public/assets/` | 圖檔（檔名是設計稿素材庫的 id） |
| `public/_redirects` | 舊 WordPress 網址的 301 轉址（Cloudflare Pages 格式） |
| `tools/import_design.py` | 設計稿 → 網站的匯入工具 |
| `tools/check.py` | 檢查與截圖工具 |
| `tools/subset-fonts.mjs`、`tools/fonts/` | 字型裁切腳本與原始字型（見下方「字型」） |
| `tools/og/` | 分享預覽圖來源（`og-default.html`），`python tools/og/render.py` 輸出成 `public/og-default.png`；文章頁改用各自的封面 |
| `src/content/posts/` | 文章（每篇一個資料夾） |
| `src/lib/posts.ts` | 文章接到設計稿頁面的規則 |

## 在另一台電腦接手

GitHub（`Azenlin/tongjue-website`）是正本；任何一台電腦上的資料夾都只是工作副本，Google Drive 的 `00_銅爵科技顧問\00_個人網站` 則是唯讀備份。

第一次設定：

1. 安裝 Git 與 Node.js 22.12 以上
2. clone 到本機硬碟（**不要放在 Google Drive 裡**，串流模式跑 `npm install` 會壞）：
   ```sh
   git clone https://github.com/Azenlin/tongjue-website.git C:/Users/<名字>/dev/tongjue-website
   cd C:/Users/<名字>/dev/tongjue-website
   npm install
   ```
3. `npm run dev` 確認能開

之後每次開工前先 `git pull`，改完 `git push`（push 到 `master` 就會自動上線）。兩台電腦輪流用時，忘了 pull 會造成衝突。

設計稿不在 repo 裡，在 claude.ai 上（見下一節），換電腦一樣打得開。

## 設計稿改了之後怎麼同步

設計稿：claude.ai Artifact「銅爵官網改版設計稿」https://claude.ai/artifact/4ZmRb7UvCXT1EmC4EzhiCf
（設計系統：「銅爵科技顧問」https://claude.ai/artifact/SY4aQLNDVXwyJaz2g7Vq1o）

1. 從設計稿下載最新的 `project/*.dc.html` 與用到的素材圖檔（Claude Code 可用 Artifact read 取得，存到暫存資料夾）
2. `python tools/import_design.py <dc.html 所在資料夾> <圖檔資料夾>`
3. `python tools/check.py --build` 檢查（需要看版面時加 `--shot`），commit、push

新頁面：在設計稿加頁後，到 `tools/import_design.py` 的 `PAGES` 加一行（網址、標題、描述）再重跑。

## 字型

思源黑體（Noto Sans TC 400／600）與思源宋體（Noto Serif TC 700）自架，不用 Google Fonts。`npm run build` 在 `astro build` 之後會跑 `tools/subset-fonts.mjs`：掃描 `dist/` 所有頁面用到的字，從 `tools/fonts/` 的原始字型裁出只含這些字的 woff2（輸出到 `dist/fonts/`，檔名帶雜湊），再把 `@font-face` 內嵌進每頁 `<head>`。新文章的字會在下次 build 自動收進去，不用手動處理。

- `npm run dev` 不會跑這一步，開發模式暫時改用 Google Fonts 顯示。
- 要新增字重或字型：改 `subset-fonts.mjs` 的 `FONTS`，原始字型（Google Fonts GitHub `ofl/` 目錄的 `[wght].ttf`）放進 `tools/fonts/`。
- 不要在 `DesignPage.astro` 或 `public/ds/bundle.css` 加回 `fonts.googleapis.com`（設計系統重新匯出 `bundle.css` 時，開頭的 `@import` 要刪掉）；`subset-fonts.mjs` 發現會讓 build 失敗。
- 2026-10-01 改用這個做法前，Google Fonts 光字型 CSS 就約 100 KB，而且會擋住畫面，文章頁 Lighthouse 手機效能只有 58 分。

## 部署

Cloudflare Pages 連接這個 GitHub repo，push 到 `master` 自動部署。
Build command：`npm run build`，Output：`dist`，環境變數 `NODE_VERSION=22.12.0`。
測試網址：https://tongjue-website.pages.dev

流量統計：Cloudflare Web Analytics（Pages 專案 → 指標），部署時自動注入，程式碼裡沒有。

## 預約表單

- 表單送到 Google Apps Script 網頁應用程式，網址設定在 `src/site.json` 的 `formEndpoint`
- Apps Script 原始碼：`tools/contact-form.gs`（實際跑的那份在 Google 試算表「銅爵官網諮詢表單」→ 擴充功能 → Apps Script，改了 repo 這份要手動貼過去並重新部署新版本）
- 收件：寫入試算表、寄通知信到 azen741027@gmail.com、匯出 CSV
- 試算表與 CSV 在 Google Drive `00_銅爵科技顧問\官網表單\`（刻意放在網站備份資料夾外面，備份同步會清掉非原始碼的檔案）

## 注意

- 設計稿的網址互連（`Xxx.dc.html`）在匯入時自動換成正式網址，對照表就是 `PAGES`。
- 不要在 Google Drive 的鏡像資料夾裡跑 `npm install`（見 `開發說明.md`）。
- 更新 Drive 備份：
  ```powershell
  robocopy "<本機 repo>" "G:\我的雲端硬碟\00_銅爵科技顧問\00_個人網站" /MIR /XD node_modules dist .astro .git .check 官網表單 /XF package-lock.json
  ```
