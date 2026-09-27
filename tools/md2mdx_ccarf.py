"""把 vault 定稿的 CCAR-F 心得 MD 轉成網站 MDX（占位說明換成互動元件）"""
import re, sys
sys.stdout.reconfigure(encoding='utf-8')
MD = r'G:\我的雲端硬碟\AI Knowledge OS v1\07-Outputs\CCAR-F考試心得文章.md'
MDX = r'C:\Users\User\dev\tongjue-website\src\content\posts\ccar-f-exam\index.mdx'

s = open(MD, encoding='utf-8').read()
title = re.search(r'^\*\*標題\*\*：(.+)$', s, re.M).group(1).strip()
desc = re.search(r'^\*\*摘要\*\*：(.+)$', s, re.M).group(1).strip()
body = s[s.index('## 內文 / 素材'):s.index('## 引用的知識來源')]
body = body.split('\n---\n', 1)[1].strip()

# 四張證照：占位＋表格 → 卡片元件
body, n = re.subn(r'`［網站版：四張卡片並排[^`]*`\n\n(\|.*\|\n)+', '<CertCards />\n', body)
assert n == 1
# 報名流程：占位＋編號清單 → 流程圖元件
body, n = re.subn(r'`［網站版：四步驟流程圖[^`]*`\n\n(\d\. .*\n)+', '<ExamFlow />\n', body)
assert n == 1
body, n = re.subn(r'`［網站版：五大範疇占比甜甜圈圖[^`]*`', '<DomainPie />', body); assert n == 1
body, n = re.subn(r'`［網站版：模擬考 911 vs 正式考 827[^`]*`', '<ScoreCompare />', body); assert n == 1
# 情境表格：包一層可橫向捲動的容器（手機版）
body, n = re.subn(r'((?:^\|.*\|\n)+)', lambda m: '<div class="table-wrap stack stack-scenarios">\n\n' + m.group(1) + '\n</div>\n', body, flags=re.M)
assert n == 1, n
assert '［網站版' not in body and '［待' not in body
# 證照代碼（CCAR-F 等）不要在連字號處斷行；網址裡的不動
body = re.sub(r'(?<![/\w-])(CC[A-Z]{1,2}-[A-Z])(?![\w-])', r'<span class="nowrap">\1</span>', body)
# 標題層級：MD 稿 ### → 網站 ##，#### → ###
body = re.sub(r'^### ', '## ', re.sub(r'^#### ', '@@@ ', body, flags=re.M), flags=re.M)
body = re.sub(r'^@@@ ', '### ', body, flags=re.M)

old = open(MDX, encoding='utf-8').read()
front = old.split('---', 2)[1]
front = re.sub(r'^title: .*$', 'title: ' + title, front, flags=re.M)
front = re.sub(r'^description: .*$', 'description: ' + desc, front, flags=re.M)
imports = ("import CertCards from './CertCards.astro';\n"
           "import ExamFlow from './ExamFlow.astro';\n"
           "import DomainPie from './DomainPie.astro';\n"
           "import ScoreCompare from './ScoreCompare.astro';\n")
out = '---' + front + '---\n' + imports + '\n' + body + '\n'
# MDX 粗體收尾在全形標點後面、緊接文字時不會生效：把標點移到粗體外
out = re.sub(r'\*\*([^*\n]+?)([。，；：！？])\*\*(?=\S)', r'**\1**\2', out)
open(MDX, 'w', encoding='utf-8').write(out)
print(title)
print(desc)
print(len(out), 'chars')
