/**
 * 設計稿頁面的「預先產生」：build 時把 {{ }}、<sc-for>、<sc-if> 依初始資料展開成真正的 HTML。
 *
 * 為什麼需要：設計稿的動態頁（觀點列表、個人頁時間軸、案例圖表數字…）原本只有樣板，
 * 要等瀏覽器跑 dc-lite.js 才填進內容。Google 第一輪只讀原始 HTML、不執行 JS，
 * 會看到 href="{{p.href}}" 這種空格（還當成網址去爬，變成 404），也看不到文章連結與內文。
 *
 * 做法：用該頁的 logic（class Component）在 Node 裡算出 renderVals()，照 dc-lite 的規則展開樣板。
 * 頁面上放展開後的 HTML；原本的樣板放進 <template id="dc-tpl">，瀏覽器載入時換回樣板再交給 dc-lite，
 * 所以互動行為與原本完全相同（見 src/layouts/DesignPage.astro）。
 * 只呼叫 constructor 與 renderVals()，不呼叫 componentDidMount（那裡才會碰 document／window）。
 */

const HOLE = /\{\{\s*([^}]*?)\s*\}\}/g;
const BLOCK_OPEN = /<sc-(for|if)\b([^>]*)>/;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// 與 dc-lite.js 的 lookup 相同：a.b.c 路徑，true/false 字面值
function lookup(scope: any, path: string): any {
  path = path.trim();
  if (path === 'true') return true;
  if (path === 'false') return false;
  let v = scope;
  for (const k of path.split('.')) {
    if (v == null) return undefined;
    v = v[k];
  }
  return v;
}

const attr = (attrs: string, name: string) => {
  const m = new RegExp(`\\s${name}="([^"]*)"`).exec(attrs);
  return m ? m[1] : '';
};
const exprOf = (v: string) => (/\{\{\s*([^}]*?)\s*\}\}/.exec(v)?.[1] ?? v).trim();

/** 一般片段：去掉事件綁定與 hint-placeholder 屬性，其餘 {{ }} 換成值（跳脫 HTML） */
function fill(s: string, scope: any) {
  return s
    .replace(/\s(on[a-z]+)="\{\{[^"]*\}\}"/gi, '')
    .replace(/\s(hint-placeholder-[a-z-]+)="[^"]*"/gi, '')
    .replace(HOLE, (_m, p) => {
      const v = lookup(scope, p);
      return v == null || typeof v === 'function' ? '' : esc(String(v));
    });
}

/** 找到與開頭標籤配對的結尾標籤（同名區塊可巢狀） */
function closeOf(s: string, kind: string, from: number) {
  const re = new RegExp(`<sc-${kind}\\b[^>]*>|</sc-${kind}>`, 'g');
  re.lastIndex = from;
  let depth = 1;
  for (let m; (m = re.exec(s)); ) {
    depth += m[0][1] === '/' ? -1 : 1;
    if (depth === 0) return { start: m.index, end: re.lastIndex };
  }
  throw new Error(`[prerender] <sc-${kind}> 沒有對應的結尾標籤`);
}

function render(tpl: string, scope: any): string {
  let out = '';
  let rest = tpl;
  for (let m; (m = BLOCK_OPEN.exec(rest)); ) {
    out += fill(rest.slice(0, m.index), scope);
    const [kind, attrs] = [m[1], m[2]];
    const inner = m.index + m[0].length;
    const close = closeOf(rest, kind, inner);
    const content = rest.slice(inner, close.start);
    if (kind === 'if') {
      if (lookup(scope, exprOf(attr(attrs, 'value')))) out += render(content, scope);
    } else {
      const as = attr(attrs, 'as');
      for (const item of lookup(scope, exprOf(attr(attrs, 'list'))) || []) {
        const s = Object.create(scope);
        s[as] = item;
        out += render(content, s);
      }
    }
    rest = rest.slice(close.end);
  }
  return out + fill(rest, scope);
}

/** 只提供 constructor／setState／renderVals 會用到的最小 DCLogic */
class DCLogicStub {
  props: any;
  state: any = {};
  constructor(props?: any) { this.props = props || {}; }
  setState(patch: any) { this.state = Object.assign({}, this.state, typeof patch === 'function' ? patch(this.state, this.props) : patch); }
  renderVals() { return {}; }
}

export function prerender(body: string, logic: string, page: string) {
  let vals: any;
  try {
    const window: any = {};
    const Component = new Function('DCLogic', 'window', `${logic}\nreturn Component;`)(DCLogicStub, window);
    const inst = new Component({});
    vals = inst.renderVals() || {};
  } catch (e) {
    throw new Error(`[prerender] ${page} 的 renderVals() 無法在 build 時執行：${(e as Error).message}`);
  }
  const html = render(body, vals);
  if (/\{\{|<sc-(for|if)\b/.test(html)) throw new Error(`[prerender] ${page} 展開後仍有殘留的 {{ }} 或 <sc-…>`);
  return html;
}
