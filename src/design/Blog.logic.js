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
  constructor(props) {
    super(props);
    this.state = { cat: '全部' };
  }
  renderVals() {
    const all = [
      { pinned: true, imgClass: 'post-img-pillar-ai', date: '[日期]', read: '約 15 分鐘閱讀', title: '中小企業 AI 導入指南', excerpt: '從該不該做、從哪開始、怎麼避開常見失敗，到知識庫實際怎麼建。一張完整的地圖。', tags: ['AI 導入', '知識管理', '中小企業', '入門指南'], href: '/insights/ai-adoption/' },
      { pinned: false, imgClass: 'post-img-ph', date: '[日期]', read: '約 6 分鐘閱讀', title: '[文章標題]', excerpt: '[一句話摘要，約 40–60 字]', tags: ['AI 導入', '中小企業'], href: '/coming-soon/' },
      { pinned: false, imgClass: 'post-img-ph', date: '[日期]', read: '約 8 分鐘閱讀', title: '[文章標題]', excerpt: '[一句話摘要，約 40–60 字]', tags: ['碳規劃'], href: '/coming-soon/' },
      { pinned: false, imgClass: 'post-img-ph', date: '[日期]', read: '約 5 分鐘閱讀', title: '[文章標題]', excerpt: '[一句話摘要，約 40–60 字]', tags: ['AI 導入', '知識管理'], href: '/coming-soon/' },
      { pinned: false, imgClass: 'post-img-ph', date: '[日期]', read: '約 4 分鐘閱讀', title: '[文章標題]', excerpt: '[一句話摘要，約 40–60 字]', tags: ['隨筆'], href: '/coming-soon/' },
      { pinned: false, imgClass: 'post-img-ph', date: '[日期]', read: '約 7 分鐘閱讀', title: '[文章標題]', excerpt: '[一句話摘要，約 40–60 字]', tags: ['碳規劃', '中小企業'], href: '/coming-soon/' }
    ];
    const cur = this.state.cat;
    const cats = ['全部', 'AI 導入', '知識管理', '碳規劃', '中小企業', '隨筆'].map((label) => ({
      label: label === '全部' ? label : '#' + label,
      cls: label === cur ? 'is-on' : '',
      pressed: label === cur ? 'true' : 'false',
      pick: () => this.setState({ cat: label })
    }));
    const posts = (cur === '全部' ? all : all.filter((p) => p.tags.indexOf(cur) !== -1)).map((p) => Object.assign({}, p, { tagList: p.tags }));
    return { cats, posts, empty: posts.length === 0 };
  }
}
