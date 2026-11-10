// 建置前處理：替每篇文章的封面產生「卡片專用」的小尺寸 WebP（npm run build 會在 astro build 之前自動執行）
//
// 為什麼：首頁與觀點列表的文章卡片只有約 400px 寬，卻直接載入原始封面（最大 2000px、928 KB），
// 首頁總重量 3 MB，PageSpeed 手機 LCP 7.5 秒、建議「提升圖片傳送效能」可省 768 KB（2026-11-10）。
//
// 做法：public/insights/<id>/cover.jpg|png|webp → 同資料夾 cover-card.<原圖指紋>.webp（寬 800px、品質 80）。
//   - 原圖不動：文章頁標題區、社群分享預覽（og:image）繼續用原圖
//   - 檔名帶原圖內容指紋：換封面後舊的卡片圖自動作廢重產，src/lib/posts.ts 找不到對應指紋時退回原圖
//   - 產生的檔案要一起 commit（Cloudflare Pages 建置時也會再跑一次，已存在就跳過）

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIR = path.join(ROOT, 'public', 'insights');
const WIDTH = 800;
const QUALITY = 80;

let sharp;
try {
  sharp = (await import('sharp')).default;
} catch {
  console.warn('[card-covers] 找不到 sharp，略過（卡片會退回使用原始封面）');
  process.exit(0);
}

let made = 0, kept = 0;
for (const id of fs.readdirSync(DIR)) {
  const folder = path.join(DIR, id);
  if (!fs.statSync(folder).isDirectory()) continue;
  const src = ['jpg', 'jpeg', 'png', 'webp'].map((e) => path.join(folder, `cover.${e}`)).find((f) => fs.existsSync(f));
  if (!src) continue;

  const hash = crypto.createHash('md5').update(fs.readFileSync(src)).digest('hex').slice(0, 8);
  const out = path.join(folder, `cover-card.${hash}.webp`);

  // 清掉舊指紋的卡片圖（封面換過了）
  for (const f of fs.readdirSync(folder)) {
    if (/^cover-card\.[0-9a-f]{8}\.webp$/.test(f) && path.join(folder, f) !== out) fs.unlinkSync(path.join(folder, f));
  }
  if (fs.existsSync(out)) { kept++; continue; }

  await sharp(src).resize({ width: WIDTH, withoutEnlargement: true }).webp({ quality: QUALITY }).toFile(out);
  const kb = (n) => Math.round(n / 1024);
  console.log(`[card-covers] ${id}: ${kb(fs.statSync(src).size)} KB → ${kb(fs.statSync(out).size)} KB`);
  made++;
}
console.log(`[card-covers] 新產生 ${made} 張，沿用 ${kept} 張`);
