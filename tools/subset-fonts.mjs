// 建置後處理：自架字型並只保留全站實際用到的字（npm run build 會在 astro build 之後自動執行）
//
// 為什麼：原本用 Google Fonts，中文字型的 CSS 本身就約 100 KB 且會擋住畫面，
// Lighthouse 手機效能只有 58 分（2026-10-01）。改成建置時掃描 dist/ 裡所有用到的字，
// 從 tools/fonts/ 的原始字型裁出小檔，@font-face 直接內嵌在每頁 <head>，不再多一個擋畫面的請求。
//
// 要新增字重或字型：改下面的 FONTS，原始字型放 tools/fonts/（Google Fonts GitHub 的 ofl/ 目錄可下載）。
// 不要在 DesignPage.astro 或 bundle.css 加回 fonts.googleapis.com，本腳本發現會直接讓建置失敗。

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import subsetFont from 'subset-font';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIST = path.join(ROOT, 'dist');
const SRC = path.join(ROOT, 'tools', 'fonts');

const FONTS = [
  { family: 'Noto Sans TC', weight: 400, file: 'NotoSansTC[wght].ttf', out: 'noto-sans-tc-400' },
  { family: 'Noto Sans TC', weight: 600, file: 'NotoSansTC[wght].ttf', out: 'noto-sans-tc-600' },
  { family: 'Noto Serif TC', weight: 700, file: 'NotoSerifTC[wght].ttf', out: 'noto-serif-tc-700' },
];

// 頁面上沒出現、但訪客可能在表單輸入的字：英數符號與常用全形標點
const BASELINE = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join('')
  + '，。、；：？！「」『』（）《》〈〉—…‧·～％＋－＝／＠＃＄＆＊';

function walk(dir, exts, files = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, exts, files);
    else if (exts.includes(path.extname(e.name))) files.push(p);
  }
  return files;
}

const htmlFiles = walk(DIST, ['.html']);
const chars = new Set(BASELINE);
for (const f of [...htmlFiles, ...walk(DIST, ['.js'])]) {
  for (const c of fs.readFileSync(f, 'utf8')) chars.add(c);
}
const text = [...chars].join('');

fs.mkdirSync(path.join(DIST, 'fonts'), { recursive: true });
const faces = [];
for (const font of FONTS) {
  const buf = await subsetFont(fs.readFileSync(path.join(SRC, font.file)), text, {
    targetFormat: 'woff2',
    variationAxes: { wght: font.weight },
  });
  // 檔名帶內容雜湊：字有變才換網址，瀏覽器可以放心長期快取
  const hash = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 8);
  const name = `${font.out}.${hash}.woff2`;
  fs.writeFileSync(path.join(DIST, 'fonts', name), buf);
  faces.push(`@font-face{font-family:"${font.family}";font-style:normal;font-weight:${font.weight};font-display:swap;src:url(/fonts/${name}) format("woff2")}`);
  console.log(`[subset-fonts] ${name}  ${(buf.length / 1024).toFixed(0)} KB`);
}

const style = `<style>${faces.join('')}</style>`;
const googleFonts = /fonts\.(googleapis|gstatic)\.com/;
for (const f of htmlFiles) {
  const html = fs.readFileSync(f, 'utf8');
  if (googleFonts.test(html)) throw new Error(`[subset-fonts] ${path.relative(DIST, f)} 還在載入 Google Fonts，請移除`);
  if (!html.includes('</head>')) continue;
  fs.writeFileSync(f, html.replace('</head>', `${style}</head>`));
}
for (const f of walk(DIST, ['.css'])) {
  if (googleFonts.test(fs.readFileSync(f, 'utf8'))) throw new Error(`[subset-fonts] ${path.relative(DIST, f)} 還在載入 Google Fonts，請移除`);
}

console.log(`[subset-fonts] ${chars.size} 個字元，已寫入 ${htmlFiles.length} 個頁面`);
