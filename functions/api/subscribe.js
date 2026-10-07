/**
 * 電子報訂閱：官網表單 POST 到這裡，再轉給 Kit（ConvertKit）API 把人加進表單。
 *
 * Cloudflare Pages Function，網址是 /api/subscribe。
 * API key 存在 Cloudflare Pages 的環境變數 KIT_API_KEY（Secret），不放在程式碼或前端。
 */

const KIT_FORM_ID = '10012322'; // Kit 表單「官網電子報」
const KIT_API = 'https://api.kit.com/v4';

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });

export async function onRequestPost({ request, env }) {
  if (!env.KIT_API_KEY) return json({ ok: false, error: 'not_configured' }, 500);

  let d;
  try { d = await request.json(); } catch { return json({ ok: false, error: 'bad_request' }, 400); }

  // 基本防護：填了隱藏欄位的是機器人，假裝成功就好
  if (d.website) return json({ ok: true });

  const email = String(d.email || '').trim().toLowerCase().slice(0, 254);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return json({ ok: false, error: 'invalid_email' }, 400);

  const headers = { 'Content-Type': 'application/json', 'X-Kit-Api-Key': env.KIT_API_KEY };
  try {
    // 1. 建立訂閱者（已存在會直接回傳既有的）
    const created = await fetch(`${KIT_API}/subscribers`, { method: 'POST', headers, body: JSON.stringify({ email_address: email }) });
    if (!created.ok) return json({ ok: false, error: 'kit_create_failed' }, 502);
    const id = (await created.json())?.subscriber?.id;
    if (!id) return json({ ok: false, error: 'kit_no_id' }, 502);

    // 2. 加進表單
    const referrer = String(d.page || 'https://tongjuetech.com/').slice(0, 300);
    const added = await fetch(`${KIT_API}/forms/${KIT_FORM_ID}/subscribers/${id}`, { method: 'POST', headers, body: JSON.stringify({ referrer }) });
    if (!added.ok) return json({ ok: false, error: 'kit_add_failed' }, 502);
  } catch {
    return json({ ok: false, error: 'network' }, 502);
  }
  return json({ ok: true });
}

export const onRequest = () => json({ ok: false, error: 'method_not_allowed' }, 405);
