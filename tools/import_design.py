"""
把 claude.ai 設計稿（銅爵官網改版設計稿）的 .dc.html 匯入成 Astro 網站的頁面素材。

用法（在 repo 根目錄）：
    python tools/import_design.py <設計稿 project 資料夾> <素材資料夾>

    <設計稿 project 資料夾>：放 Main.dc.html、Services.dc.html…的資料夾
    <素材資料夾>：放 /_blob/<id>.<副檔名> 圖檔的資料夾（從設計稿素材庫下載）

每一頁會產生三個檔案到 src/design/：
    <Name>.body.html   版面 HTML（連結、圖檔路徑、按鈕元件已轉換）
    <Name>.css         該頁的樣式
    <Name>.logic.js    該頁的元件程式（class Component extends DCLogic）
圖檔複製到 public/assets/。頁面網址、標題、描述在下面的 PAGES 設定。
設計稿之後再修改時，重新下載 .dc.html 後重跑這支程式即可同步。
"""
import io, json, os, re, shutil, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 設計稿檔名 → 網址、標題、描述（標題與描述取自「銅爵官網改版架構與文案_v1.0」的 SEO 設定）
PAGES = {
    'Main': ('/', '銅爵科技顧問｜企業 AI 導入與淨零碳顧問',
             '16 年製造業與政府能源顧問經驗的顧問。協助中小企業建置 AI 知識庫、規劃 AI 導入與數位轉型，以及溫室氣體盤查與淨零策略。一人公司，談的人就是做事的人。'),
    'Services': ('/services/', '顧問服務｜銅爵科技顧問',
                 'AI 知識庫建置、AI 導入與數位轉型、淨零碳與 ESG 三條服務線。按你的處境分類，不是能力清單。第一次諮詢不收費。'),
    'KnowledgeBase': ('/services/knowledge-base/', 'AI 知識庫建置服務｜把公司經驗變成查得到的資產',
                      '檔案數位化不等於查得到。從資料盤點、結構設計、轉換建置到維運交接，把散落在各部門與老師傅腦中的經驗，整理成 AI 問得到的知識庫。'),
    'Workshop': ('/services/knowledge-base/workshop/', 'AIOS 企業導入實戰工作坊｜銅爵科技顧問',
                 '這不是坊間的 AI 工具教學。12 小時、5 個模組，帶著你的團隊用 Claude Code，親手把公司知識建成 AI 看得懂、找得到、用得動的系統。'),
    'AITransform': ('/services/ai-transformation/', 'AI 導入與數位轉型顧問｜從流程瓶頸開始，不從工具開始',
                    '多數 AI 導入失敗是因為順序反了。半天的 AI 機會快篩，盤出你公司最值得動手的三到五個環節。不賣軟體、不抽佣金。'),
    'NetZero': ('/services/net-zero/', '溫室氣體盤查與淨零顧問｜ISO 14064-1 主任查證員',
                '組織型盤查、產品碳足跡、淨零路徑規劃。先問清楚你為什麼需要這個數字，再決定該做多大範圍。'),
    'Blog': ('/insights/', '銅爵觀點｜AI 導入與淨零碳規劃文章',
             'AI 導入、淨零碳規劃，以及昱任顧問的隨筆。每週一篇，把事情講清楚。'),
    'PillarAI': ('/insights/ai-adoption/', '中小企業 AI 導入指南｜銅爵觀點',
                 '從該不該做、從哪開始、怎麼避開常見失敗，到知識庫實際怎麼建。中小企業 AI 導入的完整地圖。'),
    'Cases': ('/cases/', '服務案例｜銅爵科技顧問',
              '職業工會、旅宿、太陽光電業的實際案件：會費對帳、碳盤查、申設公文，重複的行政工作怎麼交給 AI。客戶資訊均經匿名處理。'),
    'Yujen': ('/yujen/', '林昱任｜AI 導入與淨零碳顧問・銅爵科技顧問創辦人',
              '清大化工、16 年製造業與政府能源顧問經驗、前圖文作家「阿任叔叔」。AI 與淨零雙領域證照，企業內訓講師。我的經歷、文章與工作方式。'),
    'Contact': ('/contact/', '預約諮詢｜銅爵科技顧問',
                '第一次對話不收費，也不需要先準備資料。填表或加 LINE，我會親自回覆，跟你約時間。'),
    'ComingSoon': ('/coming-soon/', '此頁設計中｜銅爵科技顧問', '這一頁還在設計中，歡迎先看看其他內容。'),
}


def button(m):
    attrs = dict(re.findall(r'([\w-]+)="([^"]*)"', m.group(1)))
    assert attrs.get('component-from-global-scope', '').endswith('Button'), m.group(0)[:80]
    cls = 'tj-btn tj-btn-%s tj-btn-%s' % (attrs.get('variant', 'primary'), attrs.get('size', 'md'))
    extra = ''.join(' %s="%s"' % (k, v) for k, v in attrs.items()
                    if k not in ('component-from-global-scope', 'variant', 'size', 'href', 'class'))
    if 'href' in attrs:
        return '<a class="%s" href="%s"%s>%s</a>' % (cls, attrs['href'], extra, m.group(2))
    return '<button class="%s"%s>%s</button>' % (cls, extra, m.group(2))


def main(src, assets_src):
    out = os.path.join(ROOT, 'src', 'design')
    os.makedirs(out, exist_ok=True)
    pub_assets = os.path.join(ROOT, 'public', 'assets')
    os.makedirs(pub_assets, exist_ok=True)

    routes = {name + '.dc.html': meta[0] for name, meta in PAGES.items()}
    blob_files = {os.path.splitext(f)[0]: f for f in os.listdir(assets_src)}
    used = set()
    manifest = {}

    for name, (route, title, desc) in PAGES.items():
        s = io.open(os.path.join(src, name + '.dc.html'), encoding='utf-8').read()
        css = re.search(r'<helmet>.*?<style>(.*?)</style>.*?</helmet>', s, re.S).group(1)
        body = re.search(r'</helmet>(.*)</x-dc>', s, re.S).group(1).strip('\n')
        logic = re.search(r'<script type="text/x-dc" data-dc-script[^>]*>(.*?)</script>', s, re.S).group(1).strip('\n')

        body = re.sub(r'<x-import([^>]*)>(.*?)</x-import>', button, body, flags=re.S)
        assert '<x-import' not in body
        # 設計稿為了畫布預覽把 page-root 固定高度，網站上不需要
        body = re.sub(r'(class="page-root" style="[^"]*?)min-height: \d+px; ?', r'\1', body, count=1)

        def fix(text):
            # 頁面互連：XXX.dc.html(#hash) → 正式網址
            text = re.sub(r'\b(\w+)\.dc\.html', lambda m: routes[m.group(0)], text)

            def blob(m):
                f = blob_files[m.group(1)]
                used.add(f)
                return '/assets/' + f
            return re.sub(r'/_blob/([0-9a-f]{32})', blob, text)

        body, css, logic = fix(body), fix(css), fix(logic)
        dynamic = bool(re.search(r'\{\{|<sc-(if|for)', body))

        io.open(os.path.join(out, name + '.body.html'), 'w', encoding='utf-8', newline='\n').write(body + '\n')
        io.open(os.path.join(out, name + '.css'), 'w', encoding='utf-8', newline='\n').write(css.strip('\n') + '\n')
        io.open(os.path.join(out, name + '.logic.js'), 'w', encoding='utf-8', newline='\n').write(logic + '\n')
        manifest[name] = {'route': route, 'title': title, 'description': desc, 'dynamic': dynamic}

    for f in sorted(used):
        shutil.copyfile(os.path.join(assets_src, f), os.path.join(pub_assets, f))
    io.open(os.path.join(out, 'pages.json'), 'w', encoding='utf-8', newline='\n').write(
        json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    print('匯入 %d 頁、%d 個圖檔' % (len(manifest), len(used)))


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
