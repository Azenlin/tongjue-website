/**
 * 銅爵官網「預約諮詢」表單的收件程式（Google Apps Script）
 *
 * 放在 Google 試算表「銅爵官網諮詢表單」的 擴充功能 → Apps Script 裡，部署成「網頁應用程式」。
 * 官網表單送出時會把資料 POST 到這裡，程式會：
 *   1. 在試算表新增一列
 *   2. 寄一封通知信給阿任
 *   3. 把整張表匯出成 CSV，放在試算表所在的 Google Drive 資料夾（Claude 讀得到 CSV，讀不到 .gsheet）
 *
 * 部署網址填在官網 repo 的 src/site.json 的 formEndpoint。
 * 修改程式後要「管理部署作業 → 編輯 → 版本選新版本」重新部署，網址不會變。
 */

const NOTIFY_TO = 'azen741027@gmail.com';
const SHEET_NAME = '諮詢表單';
const CSV_NAME = '官網諮詢表單.csv';
const HEADERS = ['時間', '公司名稱', '稱呼', '聯絡方式', '想談的主題', '現在遇到的狀況', '來源頁面'];

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const d = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const clean = (v, n) => String(v || '').slice(0, n || 2000);
    // 基本防護：必填欄位缺漏或像機器人（填了隱藏欄位）就不收
    if (!clean(d.name) || !clean(d.contact) || d.website) return json({ ok: false });

    const sheet = getSheet();
    const row = [new Date(), clean(d.company, 200), clean(d.name, 100), clean(d.contact, 200),
                 clean(d.topic, 100), clean(d.note, 3000), clean(d.page, 300)];
    sheet.appendRow(row);

    MailApp.sendEmail({
      to: NOTIFY_TO,
      subject: '【官網諮詢】' + row[2] + (row[1] ? '（' + row[1] + '）' : '') + '｜' + row[4],
      body: HEADERS.slice(1).map((h, i) => h + '：' + (row[i + 1] || '—')).join('\n') +
            '\n\n試算表：' + SpreadsheetApp.getActiveSpreadsheet().getUrl(),
    });

    exportCsv();
    return json({ ok: true });
  } finally {
    lock.releaseLock();
  }
}

// 用瀏覽器直接打開部署網址時顯示的訊息（確認部署成功用）
function doGet() {
  return ContentService.createTextOutput('銅爵官網表單收件程式運作中');
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function exportCsv() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const values = getSheet().getDataRange().getDisplayValues();
  const csv = values.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\r\n');
  const folder = DriveApp.getFileById(ss.getId()).getParents().next();
  const files = folder.getFilesByName(CSV_NAME);
  const blob = Utilities.newBlob('﻿' + csv, 'text/csv', CSV_NAME);
  if (files.hasNext()) files.next().setContent(blob.getDataAsString());
  else folder.createFile(blob);
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// 在 Apps Script 編輯器裡手動執行一次，用來觸發授權並確認寄信、寫表、匯出都正常
function testSubmit() {
  doPost({ postData: { contents: JSON.stringify({
    company: '測試公司', name: '測試', contact: 'test@example.com', topic: '還不確定，想先聊聊', note: '這是測試', page: 'manual test',
  }) } });
}
