/* 電子報訂閱表單：攔截 form[data-subscribe] 的送出，POST 到 /api/subscribe（見 functions/api/subscribe.js） */
(function () {
  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (!form || !form.hasAttribute || !form.hasAttribute('data-subscribe')) return;
    e.preventDefault();
    var input = form.querySelector('input[name="email"]');
    var btn = form.querySelector('button[type="submit"]');
    var msg = form.querySelector('[data-subscribe-msg]');
    var honey = form.querySelector('input[name="website"]');
    var say = function (t, bad) { if (msg) { msg.textContent = t; msg.style.opacity = bad ? '1' : '0.9'; } };
    var email = (input.value || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { say('請輸入正確的 Email。', true); input.focus(); return; }
    var label = btn.textContent;
    btn.disabled = true; btn.textContent = '送出中…'; say('');
    fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, website: honey ? honey.value : '', page: location.href })
    }).then(function (r) { return r.json().catch(function () { return {}; }); }).then(function (res) {
      if (res.ok) {
        form.reset();
        btn.textContent = '已送出 ✓';
        say('訂閱成功！下一封信會寄到你的信箱。');
      } else {
        btn.disabled = false; btn.textContent = label;
        say(res.error === 'invalid_email' ? '請輸入正確的 Email。' : '送出失敗，請稍後再試。', true);
      }
    }).catch(function () {
      btn.disabled = false; btn.textContent = label;
      say('網路連線有問題，請稍後再試。', true);
    });
  });
})();
