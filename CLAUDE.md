# CLAUDE.md — 銅爵官網

使用者是林昱任（阿任），回覆一律用繁體中文。完整說明見 [README.md](README.md)，以下是最容易出錯的幾件事：

- **開工先 `git pull`**：阿任可能在多台電腦輪流維護，GitHub `Azenlin/tongjue-website` 才是正本。push 到 `master` 會直接上線（Cloudflare Pages）。
- **版面改動先改設計稿**：版面來自 claude.ai 設計稿（連結在 README），改好再用 `tools/import_design.py` 匯入；不要只改 `src/design/` 裡的檔案，下次匯入會被蓋掉。
- **不要在 Google Drive 裡開發**：`G:\我的雲端硬碟\00_銅爵科技顧問\00_個人網站` 是唯讀備份，改完在本機 repo 用 README 裡的 robocopy 指令同步過去（要排除 `官網表單`）。
- **push 前跑 `python tools/check.py --build`**（全站檢查約 15 秒）；要看版面用 `--shot <頁面> --find <文字>` 截桌機＋手機圖，不要另外手寫截圖程式。
- **新增文章不用動設計稿**：在 `src/content/posts/<代稱>/index.mdx` 新增即可（格式見 README「新增文章」）；文字以 vault `07-Outputs` 的定稿為準，定稿後不要再自行改寫（口述素材在草稿階段要修飾成書面語，見 vault 記憶）。
- **字型是自架並在 build 時自動裁切**（`tools/subset-fonts.mjs`，說明見 README「字型」）：不要加回 Google Fonts 連結，要加字重就改腳本的 `FONTS`。
- **新文章 push 上線後**：回覆收尾時提醒阿任到 Search Console「要求建立索引」，並附上完整文章網址（`https://tongjuetech.com/insights/<代稱>/`），見 README「新增文章」第 6 步。
