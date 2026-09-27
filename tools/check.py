"""
網站檢查工具：改完網站、push 之前跑一次。

    python tools/check.py                         # 檢查全部頁面（桌機＋手機）
    python tools/check.py --build                 # 先 npm run build 再檢查
    python tools/check.py --shot home             # 首頁截圖（桌機 1440、手機 390，畫面最上方）
    python tools/check.py --shot home --find 檔案超級多   # 捲到含這段文字的地方截圖
    python tools/check.py --shot yujen --full     # 整頁長截圖（網址寫 yujen 或 /yujen/ 都可以）

檢查項目：頁面有沒有正常啟動（dc-ready）、有沒有殘留 {{ }}、JS 錯誤、手機版有沒有左右溢出。
截圖存在 .check/（不進 git）。檢查的是 dist/，所以改完要先 build（或加 --build）。

需要：pip install playwright（用電腦上的 Chrome；沒有 Chrome 就先跑 python -m playwright install chromium）
"""
import argparse, functools, http.server, json, os, re, subprocess, sys, threading

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, 'dist')
OUT = os.path.join(ROOT, '.check')
VIEWPORTS = {'desktop': (1440, 900), 'mobile': (390, 844)}


def serve_dist():
    """在隨機 port 開一個靜態伺服器提供 dist/，不用另外開 astro preview。"""
    handler = functools.partial(QuietHandler, directory=DIST)
    httpd = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return 'http://127.0.0.1:%d' % httpd.server_address[1]


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def launch(p):
    try:
        return p.chromium.launch(channel='chrome')
    except Exception:
        return p.chromium.launch()


def open_page(browser, base, route, vp, dynamic, quick=False):
    w, h = VIEWPORTS[vp]
    page = browser.new_page(viewport={'width': w, 'height': h}, device_scale_factor=1)
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('console', lambda m: m.type == 'error' and 'Failed to load resource' not in m.text and errors.append(m.text))
    page.goto(base + route, wait_until='domcontentloaded' if quick else 'load')
    ready = True
    if dynamic:
        try:
            page.wait_for_selector('#dc-root.dc-ready', timeout=5000)
        except Exception:
            ready = False
    page.wait_for_timeout(100 if quick else 300)
    return page, errors, ready


HOLES_JS = """() => {
  const root = document.getElementById('dc-root') || document.body;
  const found = [];
  const re = /\\{\\{[^}]*\\}\\}/;
  if (re.test(root.innerText)) found.push('text');
  root.querySelectorAll('*').forEach(el => {
    for (const a of el.attributes) if (re.test(a.value)) found.push(el.tagName.toLowerCase() + '[' + a.name + ']');
  });
  return found.slice(0, 5);
}"""


def check_all(browser, base, pages):
    problems = 0
    for name, info in pages.items():
        for vp in VIEWPORTS:
            page, errors, ready = open_page(browser, base, info['route'], vp, info.get('dynamic'), quick=True)
            holes = page.evaluate(HOLES_JS)
            overflow = page.evaluate('() => document.documentElement.scrollWidth - window.innerWidth')
            page.close()
            issues = []
            if not ready: issues.append('沒有 dc-ready（程式沒啟動）')
            if holes: issues.append('殘留 {{ }}：' + ', '.join(holes))
            if errors: issues.append('JS 錯誤：' + ' | '.join(e[:160] for e in errors[:3]))
            if overflow > 1: issues.append('左右溢出 %dpx' % overflow)
            mark = 'OK ' if not issues else 'NG '
            print('%s %-38s %-7s %s' % (mark, info['route'], vp, '；'.join(issues)))
            problems += bool(issues)
    print('\n全部正常' if not problems else '\n有 %d 項需要處理' % problems)
    return problems


def shoot(browser, base, route, find, full, dynamic):
    os.makedirs(OUT, exist_ok=True)
    slug = re.sub(r'[^\w-]+', '_', route.strip('/')) or 'home'
    for vp in VIEWPORTS:
        page, errors, ready = open_page(browser, base, route, vp, dynamic)
        if find:
            loc = page.get_by_text(find).filter(visible=True).first
            try:
                loc.evaluate("e => e.scrollIntoView({block: 'center'})", timeout=3000)
            except Exception:
                print('找不到文字：%s（%s）' % (find, vp)); page.close(); continue
            page.wait_for_timeout(700)  # 等捲動觸發的淡入動畫
        path = os.path.join(OUT, '%s_%s.png' % (slug, vp))
        page.screenshot(path=path, full_page=full)
        page.close()
        print(path)


def norm_route(route):
    """接受 /yujen/、yujen、home；也修正 Git Bash 把 / 轉成 C:/Program Files/Git/ 的情況。"""
    m = re.search(r'Git(/.*)$', route.replace('\\', '/'))
    if m:
        route = m.group(1)
    route = route.strip().strip('/')
    return '/' if route in ('', 'home') else '/' + route + '/'


def main():
    ap = argparse.ArgumentParser(description='銅爵官網檢查工具')
    ap.add_argument('--build', action='store_true', help='先執行 npm run build')
    ap.add_argument('--shot', metavar='ROUTE', help='截圖某一頁，例如 / 或 /yujen/')
    ap.add_argument('--find', metavar='TEXT', help='搭配 --shot：捲到含這段文字的位置')
    ap.add_argument('--full', action='store_true', help='搭配 --shot：整頁長截圖')
    args = ap.parse_args()

    if args.build:
        r = subprocess.run('npm run build', cwd=ROOT, shell=True, capture_output=True, text=True, encoding='utf-8', errors='replace')
        if r.returncode:
            print(r.stdout[-2000:], r.stderr[-2000:]); sys.exit('build 失敗')
        print('build 完成')
    if not os.path.isdir(DIST):
        sys.exit('找不到 dist/，請先 npm run build 或加 --build')

    with open(os.path.join(ROOT, 'src', 'design', 'pages.json'), encoding='utf-8') as f:
        pages = json.load(f)
    from playwright.sync_api import sync_playwright
    base = serve_dist()
    with sync_playwright() as p:
        browser = launch(p)
        if args.shot:
            args.shot = norm_route(args.shot)
            dynamic = any(i['route'] == args.shot and i.get('dynamic') for i in pages.values())
            shoot(browser, base, args.shot, args.find, args.full, dynamic)
            code = 0
        else:
            code = 1 if check_all(browser, base, pages) else 0
        browser.close()
    sys.exit(code)


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main()
