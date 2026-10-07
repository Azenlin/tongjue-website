/**
 * 電子報訂閱表單（深紅底區塊用）：樣式沿用設計稿，送出邏輯在 public/js/subscribe.js，
 * 後端是 functions/api/subscribe.js（轉給 Kit）。
 * 在這裡處理而不改 src/design，重新匯入設計稿也不會被蓋掉。
 */
export const SUBSCRIBE_FORM = `<form data-subscribe novalidate style="display: flex; flex-direction: column; gap: 10px;">
<label for="sub-email" style="font-size: 15px; line-height: 22px; color: #ffffff;">Email</label>
<div style="display: flex; gap: 12px;">
<input id="sub-email" name="email" type="email" autocomplete="email" placeholder="you@company.com" style="flex-grow: 1; min-width: 0; height: 52px; box-sizing: border-box; padding: 0 16px; border: 1px solid #ffffff; border-radius: 7px; font-size: 17px; font-family: 'Noto Sans TC', sans-serif; color: #1a1a1a; background: #ffffff;">
<button type="submit" style="height: 52px; padding: 0 24px; border: 0; border-radius: 7px; background: #ffffff; color: #8d1d22; font-size: 18px; font-weight: 600; font-family: 'Noto Sans TC', sans-serif; cursor: pointer; white-space: nowrap;">訂閱</button>
</div>
<input name="website" type="text" tabindex="-1" autocomplete="off" aria-hidden="true" style="position: absolute; left: -9999px; width: 1px; height: 1px; opacity: 0;">
<p data-subscribe-msg role="status" style="margin: 0; min-height: 22px; font-size: 15px; line-height: 22px; color: #ffffff;"></p>
</form>`;

/** 把設計稿裡指向 Substack 的「到 Substack 訂閱 →」按鈕換成真正的表單 */
export function swapSubstackButton(html: string): string {
  const re = /<a href="https:\/\/azenlin\.substack\.com\/"[^>]*>到 Substack 訂閱 →<\/a>/;
  if (!re.test(html)) throw new Error('找不到「到 Substack 訂閱」按鈕，設計稿可能改版了');
  return html.replace(re, SUBSCRIBE_FORM);
}

/** 頁尾的 Substack 圖示不再顯示（電子報已改用 Kit）。在版面共用外框統一拿掉，重新匯入設計稿也不會被蓋回來 */
export function stripSubstackIcon(html: string): string {
  return html.replace(/<a class="foot-icon" href="https:\/\/substack\.com\/@azenlin"[^>]*>[\s\S]*?<\/a>/g, '');
}
