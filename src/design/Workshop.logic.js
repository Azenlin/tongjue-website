class Component extends DCLogic {
setupCatBottom() {
  const fab = document.querySelector('.line-fab');
  if (!fab) return;
  // 以整站停留時間計算（sessionStorage，換頁不歸零）：累積 3 秒探頭一次，整個造訪期間只出現這一次
  const K = 'tjCat';
  const load = () => { try { return JSON.parse(sessionStorage.getItem(K)) || { ms: 0, n: 0, end: false }; } catch (e) { return { ms: 0, n: 0, end: false }; } };
  const save = (st) => { try { sessionStorage.setItem(K, JSON.stringify(st)); } catch (e) {} };
  const peek = (cls) => {
    fab.classList.remove('cat-t', 'cat-bottom');
    void fab.offsetWidth;
    fab.classList.add(cls);
    clearTimeout(this._catOff);
    this._catOff = setTimeout(() => fab.classList.remove(cls), 3200);
  };
  const AT = [3000];
  let last = Date.now();
  this._catTimer = setInterval(() => {
    const now = Date.now();
    const st = load();
    if (document.visibilityState === 'visible') st.ms += Math.min(now - last, 2000);
    last = now;
    if (st.n < AT.length && st.ms >= AT[st.n]) { st.n += 1; peek('cat-t'); }
    save(st);
    if (st.n >= AT.length) { clearInterval(this._catTimer); this._catTimer = null; }
  }, 500);
}
componentDidMount() {
  this.setupCatBottom();
}
componentWillUnmount() {
  if (this._catBottom) window.removeEventListener('scroll', this._catBottom);
  clearInterval(this._catTimer);
  clearTimeout(this._catOff);
}
renderVals() {
return {};
}
}
