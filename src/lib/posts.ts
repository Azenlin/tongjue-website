/**
 * 文章系統：把 src/content/posts/ 的文章接到設計稿的頁面上。
 *
 * 設計稿裡的文章卡片、文章頁都是寫死的示意內容，這裡在 build 時把它們換成真正的文章：
 *   - 觀點列表（Blog）：logic 裡的假資料換成 window.TJ_POSTS
 *   - 首頁、個人頁的「最新觀點」：三張卡片換成置頂指南＋最新兩篇
 *   - 文章頁：以設計稿「中小企業 AI 導入指南」（PillarAI）為版型，換掉標題、標籤、日期、內文、相關服務
 * 每個替換都會檢查設計稿裡找得到對應的片段，找不到就讓 build 失敗，避免設計稿改版後默默壞掉。
 */
import { getCollection, type CollectionEntry } from 'astro:content';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

export type Post = CollectionEntry<'posts'>;
const SITE = 'https://tongjuetech.com';

export async function getPosts(): Promise<Post[]> {
  const now = Date.now();
  const all = await getCollection('posts', (p) => !p.data.draft && p.data.date.getTime() <= now);
  // 置頂文章排最前面，其餘依日期新到舊
  return all.sort((a, b) => Number(!!b.data.pinned) - Number(!!a.data.pinned) || b.data.date.getTime() - a.data.date.getTime());
}

export const postRoute = (p: Post) => `/insights/${p.id}/`;

export function formatDate(d: Date) {
  // 以台灣時間顯示
  const t = new Date(d.getTime() + 8 * 3600 * 1000);
  return `${t.getUTCFullYear()} 年 ${t.getUTCMonth() + 1} 月 ${t.getUTCDate()} 日`;
}

export function readMinutes(p: Post) {
  if (p.data.readMinutes) return p.data.readMinutes;
  const text = (p.body || '').replace(/<[^>]+>|import .*|[#>*_`\-\[\]()!|]/g, '');
  const cjk = (text.match(/[㐀-鿿]/g) || []).length;
  const words = (text.replace(/[㐀-鿿]/g, ' ').match(/[A-Za-z0-9]+/g) || []).length;
  return Math.max(1, Math.round(cjk / 450 + words / 220));
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function must(s: string, find: string | RegExp, what: string) {
  const ok = typeof find === 'string' ? s.includes(find) : find.test(s);
  if (!ok) throw new Error(`[posts] 設計稿裡找不到「${what}」，可能是設計稿改版了，請更新 src/lib/posts.ts`);
}

// ---------- 封面圖 ----------

/**
 * 封面圖：public/insights/<id>/cover.jpg|png|webp，沒有就回傳 undefined。
 * 網址帶檔案內容的指紋（?v=…）：換封面時網址跟著變，瀏覽器不會繼續顯示快取裡的舊圖。
 */
export function coverOf(p: Post): string | undefined {
  for (const ext of ['jpg', 'jpeg', 'png', 'webp']) {
    const file = join(process.cwd(), 'public', 'insights', p.id, `cover.${ext}`);
    if (existsSync(file)) {
      const v = createHash('md5').update(readFileSync(file)).digest('hex').slice(0, 8);
      return `/insights/${p.id}/cover.${ext}?v=${v}`;
    }
  }
}

/**
 * 封面上的深色漸層（照片維持全彩，只在白字後面變暗；與設計稿同一組數值）：
 *   card：卡片，字在下半部，從底部往上淡到透明
 *   hero：文章頁標題區，字從上排到下，整張帶一點底色、下半部較深
 * frontmatter 的 coverDark: true 換成加深版（白色元素多的照片用）；coverPosition 調整取景位置。
 */
const SCRIM = {
  card: 'linear-gradient(to top,rgba(0,0,0,.72) 0%,rgba(0,0,0,.45) 40%,rgba(0,0,0,0) 75%)',
  hero: 'linear-gradient(to top,rgba(0,0,0,.72) 0%,rgba(0,0,0,.4) 50%,rgba(0,0,0,.25) 100%)',
};
const SCRIM_DARK = {
  card: 'linear-gradient(to top,rgba(0,0,0,.85) 0%,rgba(0,0,0,.6) 45%,rgba(0,0,0,.15) 85%)',
  hero: 'linear-gradient(to top,rgba(0,0,0,.85) 0%,rgba(0,0,0,.55) 50%,rgba(0,0,0,.4) 100%)',
};

/** 每篇文章的卡片／標題區底圖 class */
export function coverCss(posts: Post[], kind: 'card' | 'hero' = 'card', selector?: string) {
  return posts.map((p) => {
    const url = coverOf(p);
    const scrim = (p.data.coverDark ? SCRIM_DARK : SCRIM)[kind];
    const img = url ? `${scrim},url("${url}")` : `${scrim},linear-gradient(135deg,#9a9a9a,#c8c8c8)`;
    return `${selector ?? `.post-img-${p.id}`}{background-image:${img};background-size:cover;background-position:${p.data.coverPosition ?? 'center'}}`;
  }).join('\n');
}

// ---------- 置頂指南（設計稿裡的獨立頁） ----------

const PILLAR = {
  pinned: true, imgClass: 'post-img-pillar-ai', date: '持續更新', read: '約 15 分鐘閱讀',
  title: '中小企業 AI 導入指南', excerpt: '從該不該做、從哪開始、怎麼避開常見失敗，到知識庫實際怎麼建。一張完整的地圖。',
  tags: ['AI 導入', '知識管理', '中小企業'], href: '/insights/ai-adoption/',
};

// 卡片文字裡的證照代碼（CCAR-F 等）不要在連字號處斷行：連字號兩側加「不斷行」字元 U+2060
const noBreakCodes = (t: string) => t.replace(/(CC[A-Z]{1,2})-([A-Z])/g, '$1⁠-⁠$2');

const card = (p: Post) => ({
  pinned: !!p.data.pinned, imgClass: `post-img-${p.id}`, date: formatDate(p.data.date), read: `約 ${readMinutes(p)} 分鐘閱讀`,
  title: noBreakCodes(p.data.title), excerpt: noBreakCodes(p.data.description), tags: p.data.tags, href: postRoute(p),
});

// ---------- 觀點列表頁 ----------

export function blogLogic(logic: string, posts: Post[]) {
  must(logic, 'const all = [', '觀點列表的文章資料');
  // 置頂指南（PILLAR）2026-09-27 暫時下架，補完後再加回陣列最前面
  const data = JSON.stringify(posts.map(card));
  // 標籤篩選只列出目前有文章在用的標籤（依設計稿的順序）
  const used = new Set(posts.flatMap((p) => p.data.tags));
  const catRe = /\['全部', ([^\]]*)\]\.map/;
  must(logic, catRe, '標籤篩選清單');
  const cats = [...logic.match(catRe)![1].matchAll(/'([^']+)'/g)].map((m) => m[1]).filter((t) => used.has(t as any));
  const withCats = logic.replace(catRe, `[${['全部', ...cats].map((t) => `'${t}'`).join(', ')}].map`);
  return `window.TJ_POSTS = ${data};\n` + withCats.replace('const all = [', 'const all = window.TJ_POSTS || [');
}

// ---------- 首頁／個人頁的最新觀點 ----------

const PIN_RE = /<span class="pin"[^>]*>置頂<\/span>/;

/** 置頂卡片右上角的 pin icon（只用 CSS 加在卡片封面上，設計稿不用動） */
export const PIN_CSS = `
.post-head:has(.pin){position:relative}
.post-head:has(.pin)::after{content:'';position:absolute;top:28px;right:32px;width:26px;height:26px;background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white' stroke='white' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 17v5'/%3E%3Cpath d='M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z'/%3E%3C/svg%3E") center/contain no-repeat;transform:rotate(30deg);filter:drop-shadow(0 1px 3px rgba(0,0,0,.55))}
@media (max-width:760px){.post-head:has(.pin)::after{top:24px;right:24px}}
`;

const CARD_RE = /<a class="svc-card post-card" href="[^"]*"[\s\S]*?<\/a>\n?/g;

export function latestCards(body: string, posts: Post[]) {
  const grid = body.indexOf('<div class="post-grid"');
  must(body, '<div class="post-grid"', '最新觀點卡片區');
  const cards = body.slice(grid).match(CARD_RE) || [];
  if (cards.length < 2) throw new Error('[posts] 最新觀點卡片少於兩張');
  const [pillarCard, tpl] = cards;
  must(tpl, 'post-img-ph', '卡片底圖 class');
  must(tpl, '[文章標題]', '卡片標題');
  const tagRe = /(<span style="[^"]*">)#[^<]*<\/span>/;
  must(tpl, tagRe, '卡片標籤');
  const tagOpen = tpl.match(tagRe)![1];

  const build = (p: Post) => {
    const c = card(p);
    let s = tpl.replace(/href="[^"]*"/, `href="${c.href}"`)
      .replace('post-img-ph', c.imgClass)
      .replace('[文章標題]', esc(c.title))
      .replace(/\[日期\]・約 \d+ 分鐘閱讀/, `${c.date}・${c.read}`)
      .replace(/\[一句話摘要[^\]]*\]/, esc(c.excerpt));
    // 置頂：把空的標記列換成置頂指南卡片裡的「置頂」標籤
    if (c.pinned) {
      const pin = pillarCard.match(PIN_RE)?.[0];
      if (!pin) throw new Error('[posts] 設計稿裡找不到置頂標籤');
      s = s.replace(/<span style="display: flex; min-height: 26px;"><\/span>/, `<span style="display: flex; min-height: 26px;">${pin}</span>`);
    }
    // 標籤：整串換掉
    s = s.replace(/(<span style="[^"]*">#[^<]*<\/span>)+/, c.tags.map((t) => `${tagOpen}#${esc(t)}</span>`).join(''));
    return s;
  };
  // 置頂指南暫時下架：三張卡片都放最新文章（pillarCard 保留給之後恢復用）
  void pillarCard;
  const replacement = posts.slice(0, cards.length).map(build);
  // 文章不夠時保留設計稿的示意卡
  for (let i = replacement.length; i < cards.length; i++) replacement.push(cards[i]);
  let out = body.slice(0, grid);
  let rest = body.slice(grid);
  cards.forEach((c, i) => { rest = rest.replace(c, `\u0000${i}\u0000`); });
  rest = rest.replace(/\u0000(\d+)\u0000/g, (_, i) => replacement[+i]);
  return out + rest;
}

// ---------- 文章頁 ----------

const SERVICES = {
  ai: { name: 'AI 導入與數位轉型', text: '半天的 AI 機會快篩，盤出最值得動手的三到五個環節。', more: '了解 AI 導入 →', href: '/services/ai-transformation/' },
  kb: { name: 'AI 知識庫建置', text: '從盤點、結構設計、建置到維運交接，一到三個月。', more: '了解知識庫建置 →', href: '/services/knowledge-base/' },
  netzero: { name: '淨零碳與 ESG', text: '組織型盤查、產品碳足跡、淨零路徑規劃。先問清楚你為什麼需要這個數字。', more: '了解淨零服務 →', href: '/services/net-zero/' },
} as const;

function servicesFor(p: Post): (keyof typeof SERVICES)[] {
  if (p.data.services?.length) return p.data.services;
  const t = p.data.tags;
  const out: (keyof typeof SERVICES)[] = [];
  if (t.includes('碳規劃')) out.push('netzero');
  if (t.includes('AI 導入')) out.push('ai');
  if (t.includes('AI 導入') || t.includes('知識管理')) out.push('kb');
  return out.length ? out.slice(0, 2) : ['ai', 'kb'];
}

/** 回傳 [內文之前, 內文之後] 兩段 HTML，中間由頁面放入 MDX 內容 */
export function articleShell(pillarBody: string, p: Post) {
  let s = pillarBody;
  const url = SITE + postRoute(p);
  const tags = p.data.tags;

  // 標題區標籤
  const heroTagRe = /(<a class="post-tag" href="\/insights\/" style="[^"]*">)#[^<]*<\/a>/;
  must(s, heroTagRe, '標題區標籤');
  const heroOpen = s.match(heroTagRe)![1];
  s = s.replace(/(<a class="post-tag" href="\/insights\/" style="[^"]*">#[^<]*<\/a>)+/, tags.map((t) => `${heroOpen}#${esc(t)}</a>`).join(''));

  must(s, '>中小企業 AI 導入指南</h1>', '文章標題');
  s = s.replace('>中小企業 AI 導入指南</h1>', `>${esc(p.data.title)}</h1>`);
  must(s, '<span>最後更新 [日期]</span>', '文章日期');
  s = s.replace('<span>最後更新 [日期]</span>', `<span>${formatDate(p.data.date)}</span>`);
  s = s.replace('<span>約 15 分鐘閱讀</span>', `<span>約 ${readMinutes(p)} 分鐘閱讀</span>`);
  s = s.split(encodeURIComponent(SITE + '/insights/ai-adoption/')).join(encodeURIComponent(url));

  const lead = '從該不該做、從哪開始、怎麼避開常見失敗，到知識庫實際怎麼建。一張完整的地圖。</p>';
  must(s, lead, '文章導言');
  s = s.replace(lead, `${esc(p.data.description)}</p>`);

  // 章節地圖是指南專用，一般文章不放
  s = s.replace(/<section aria-label="本指南地圖"[\s\S]*?<\/section>\n*/, '');

  // 文末標籤
  const plainRe = /(<a class="post-tag-plain" href="\/insights\/" style="[^"]*">)#[^<]*<\/a>/;
  must(s, plainRe, '文末標籤');
  const plainOpen = s.match(plainRe)![1];
  s = s.replace(/(<a class="post-tag-plain" href="\/insights\/" style="[^"]*">#[^<]*<\/a>)+/, tags.map((t) => `${plainOpen}#${esc(t)}</a>`).join(''));

  // 相關服務卡片
  const svcRe = /<a href="\/coming-soon\/" (style="[^"]*")><span (style="[^"]*")>AI 導入與數位轉型<\/span><span (style="[^"]*")>[^<]*<\/span><span (style="[^"]*")>[^<]*<\/span><\/a>\n<a href="\/services\/knowledge-base\/"[\s\S]*?<\/a>/;
  must(s, svcRe, '相關服務卡片');
  s = s.replace(svcRe, (_m, a, n, t, m) => servicesFor(p).map((k) => {
    const v = SERVICES[k];
    return `<a href="${v.href}" ${a}><span ${n}>${v.name}</span><span ${t}>${v.text}</span><span ${m}>${v.more}</span></a>`;
  }).join('\n'));

  // 電子報：設計稿的訂閱表單還沒接後端，先改成連到 Substack
  const subRe = /<sc-if value="\{\{ notDone \}\}"[\s\S]*?<\/sc-if>\s*<sc-if value="\{\{ done \}\}"[\s\S]*?<\/sc-if>/;
  must(s, subRe, '訂閱表單');
  const btn = s.match(/<button type="button" onClick="\{\{ subscribe \}\}" style="([^"]*)"/);
  s = s.replace(subRe, `<a href="https://azenlin.substack.com/" target="_blank" rel="noopener" style="${btn ? btn[1] : ''}; display: inline-flex; align-items: center; justify-content: center; text-decoration: none; align-self: flex-start;">到 Substack 訂閱 →</a>`);

  // 內文：拆開 <article>，中間放 MDX
  const open = s.match(/<article style="[^"]*">/);
  must(s, /<article style="[^"]*">/, '文章內文區');
  const i = s.indexOf(open![0]) + open![0].length;
  const j = s.indexOf('</article>', i);
  const before = s.slice(0, i).replace(open![0], open![0].replace('<article ', '<article class="post-body" '));
  return [before, s.slice(j)];
}

export function articleJsonLd(p: Post) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: p.data.title,
    description: p.data.description,
    datePublished: p.data.date.toISOString(),
    url: SITE + postRoute(p),
    ...(coverOf(p) ? { image: SITE + coverOf(p) } : {}),
    author: { '@id': SITE + '/yujen/#person' },
    publisher: { '@id': SITE + '/#org' },
    keywords: p.data.tags.join(', '),
    inLanguage: 'zh-Hant-TW',
  };
}
