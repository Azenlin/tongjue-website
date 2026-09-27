"""把 tools/og/og-default.html 輸出成分享預覽圖 public/og-default.png（1200×630）

    python tools/og/render.py
"""
import os, sys
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
SRC = os.path.join(HERE, 'og-default.html')
OUT = os.path.join(ROOT, 'public', 'og-default.png')

with sync_playwright() as p:
    try:
        b = p.chromium.launch(channel='chrome')
    except Exception:
        b = p.chromium.launch()
    page = b.new_page(viewport={'width': 1200, 'height': 630}, device_scale_factor=1)
    page.goto('file:///' + SRC.replace(os.sep, '/'), wait_until='networkidle')
    page.evaluate('document.fonts.ready')
    page.wait_for_timeout(300)
    page.screenshot(path=OUT)
    b.close()
sys.stdout.reconfigure(encoding='utf-8')
print(OUT)
