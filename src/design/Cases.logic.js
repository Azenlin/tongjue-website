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
  if (!reduce) this.setupParallax();
  const els = Array.prototype.slice.call(document.querySelectorAll('.case-chart'));
  if (reduce || !els.length || !('IntersectionObserver' in window)) return;
  this._raf = {};
  this.setState({ on1: false, p1: 0, on2: false, p2: 0 });
  this._io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      this._io.unobserve(e.target);
      this.playChart(e.target.getAttribute('data-chart'));
    });
  }, { threshold: 0.35 });
  els.forEach((el) => this._io.observe(el));
}
componentWillUnmount() {
  if (this._catBottom) window.removeEventListener('scroll', this._catBottom);
  clearInterval(this._catTimer);
  clearTimeout(this._catOff);
  if (this._onScroll) { window.removeEventListener('scroll', this._onScroll); window.removeEventListener('resize', this._onScroll); }
  if (this._io) this._io.disconnect();
  if (this._raf) Object.keys(this._raf).forEach((k) => cancelAnimationFrame(this._raf[k]));
}
setupParallax() {
  const bg = document.querySelector('.hero-bg');
  if (!bg) return;
  let ticking = false;
  const update = () => {
    ticking = false;
    const r = bg.parentElement.getBoundingClientRect();
    if (r.bottom < 0) return;
    const y = Math.max(-60, Math.min(220, -r.top * 0.35));
    bg.style.transform = 'translate3d(0,' + y.toFixed(1) + 'px,0)';
  };
  this._onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  window.addEventListener('scroll', this._onScroll, { passive: true });
  window.addEventListener('resize', this._onScroll);
  update();
}
playChart(k) {
  this.setState({ ['on' + k]: true });
  const t0 = performance.now();
  const dur = 2400;
  const step = (t) => {
    const x = Math.min(1, (t - t0) / dur);
    this.setState({ ['p' + k]: x });
    if (x < 1) this._raf[k] = requestAnimationFrame(step);
  };
  this._raf[k] = requestAnimationFrame(step);
}
renderVals() {
  const st = this.state || {};
  const chart = (k) => {
    const on = st['on' + k] !== false;
    const p = st['p' + k] == null ? 1 : st['p' + k];
    const e = 1 - Math.pow(1 - p, 3);
    return { cls: on ? 'is-on' : '', n: (v) => Math.round(v * e) };
  };
  const c1 = chart('1');
  const c2 = chart('2');
  return {
    k1: { cls: c1.cls, a: c1.n(10), b1: c1.n(2), b2: c1.n(3) },
    k2: { cls: c2.cls, a: c2.n(3), b: c2.n(1) }
  };
}
}
