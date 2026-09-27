# CLAUDE.md — 銅爵官網

使用者是林昱任（阿任），回覆一律用繁體中文。完整說明見 [README.md](README.md)，以下是最容易出錯的幾件事：

- **開工先 `git pull`**：阿任可能在多台電腦輪流維護，GitHub `Azenlin/tongjue-website` 才是正本。push 到 `master` 會直接上線（Cloudflare Pages）。
- **版面改動先改設計稿**：版面來自 claude.ai 設計稿（連結在 README），改好再用 `tools/import_design.py` 匯入；不要只改 `src/design/` 裡的檔案，下次匯入會被蓋掉。
- **不要在 Google Drive 裡開發**：`G:\我的雲端硬碟\00_銅爵科技顧問\00_個人網站` 是唯讀備份，改完在本機 repo 用 README 裡的 robocopy 指令同步過去（要排除 `官網表單`）。
- **push 前先 `npm run build`** 確認沒壞；改到互動程式要確認頁面有 `dc-ready`、沒有殘留 `{{ }}`。
