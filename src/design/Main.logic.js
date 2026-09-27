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
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const el = document.querySelector('.case-grid');
  if (reduce || !el || !('IntersectionObserver' in window)) return;
  this.setState({ caseOn: false, caseP: 0 });
  this._io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      this._io.disconnect();
      this._io = null;
      this.playCases();
    }
  }, { threshold: 0.35 });
  this._io.observe(el);
}
componentWillUnmount() {
  if (this._catBottom) window.removeEventListener('scroll', this._catBottom);
  clearInterval(this._catTimer);
  clearTimeout(this._catOff);
  if (this._io) this._io.disconnect();
  if (this._raf) cancelAnimationFrame(this._raf);
}
playCases() {
  this.setState({ caseOn: true });
  const t0 = performance.now();
  const dur = 2400;
  const step = (t) => {
    const x = Math.min(1, (t - t0) / dur);
    this.setState({ caseP: x });
    if (x < 1) this._raf = requestAnimationFrame(step);
  };
  this._raf = requestAnimationFrame(step);
}
renderVals() {
  const st = this.state || {};
  const on = st.caseOn !== false;
  const p = st.caseP == null ? 1 : st.caseP;
  const e = 1 - Math.pow(1 - p, 3);
  const n = (v) => Math.round(v * e);
  return {
    caseCls: on ? 'is-on' : '',
    c: { a: n(10), b1: n(2), b2: n(3), d: n(3), e: n(1), f1: n(30), f2: n(60) }
  };
}
}
