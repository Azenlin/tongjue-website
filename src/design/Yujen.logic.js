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
placeGlide() {
  // 時間軸：紅圈、底框、進度線是固定元素，量出目前那一站的位置後滑過去（列表本身每次會重畫，做不了過場）
  const track = document.querySelector('.tl-track');
  if (!track) return;
  const on = track.querySelector('.tl-stop.is-on');
  const dot = on && on.querySelector('.tl-dot');
  const label = on && on.querySelector('.tl-label');
  const glide = track.querySelector('.tl-glide');
  const pill = track.querySelector('.tl-pill');
  const fill = track.querySelector('.tl-fill');
  if (!dot || !label || !glide || !pill || !fill) return;
  const t = track.getBoundingClientRect();
  const d = dot.getBoundingClientRect();
  const l = label.getBoundingClientRect();
  glide.style.transform = 'translate(' + (d.left - t.left) + 'px,' + (d.top - t.top) + 'px)';
  pill.style.transform = 'translate(' + (l.left - t.left) + 'px,' + (l.top - t.top) + 'px)';
  pill.style.width = l.width + 'px';
  pill.style.height = l.height + 'px';
  fill.style.width = Math.max(0, d.left + d.width / 2 - t.left - t.width * 0.1) + 'px';
  if (!track.classList.contains('has-glide')) {
    track.classList.add('has-glide');
    requestAnimationFrame(() => requestAnimationFrame(() => track.classList.add('tl-anim')));
  }
}
setupGlide() {
  this.placeGlide();
  this._glideResize = () => {
    const track = document.querySelector('.tl-track');
    if (track) track.classList.remove('tl-anim');
    this.placeGlide();
    clearTimeout(this._glideT);
    this._glideT = setTimeout(() => { if (track) track.classList.add('tl-anim'); }, 100);
  };
  window.addEventListener('resize', this._glideResize);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => this.placeGlide());
}
setupSwipe() {
  // 手機：在說明卡上左右滑動切換時期（左滑下一站、右滑上一站）
  this._ts = (e) => {
    const card = e.target.closest && e.target.closest('.tl-card');
    if (!card || !e.touches || !e.touches[0]) { this._sw = false; return; }
    this._sw = true;
    this._sx = e.touches[0].clientX;
    this._sy = e.touches[0].clientY;
  };
  this._te = (e) => {
    if (!this._sw) return;
    this._sw = false;
    const t = e.changedTouches && e.changedTouches[0];
    if (!t) return;
    const dx = t.clientX - this._sx;
    const dy = t.clientY - this._sy;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    const i = this.state.tl;
    const k = dx < 0 ? Math.min(this._tlMax, i + 1) : Math.max(0, i - 1);
    if (k !== i) this.setState({ tl: k, dir: k > i ? 'next' : 'prev', n: this.state.n + 1 });
  };
  document.addEventListener('touchstart', this._ts, { passive: true });
  document.addEventListener('touchend', this._te, { passive: true });
}
setupMobileBits() {
  // 手機：證照預設收合
  const isMobile = !!(window.matchMedia && window.matchMedia('(max-width: 760px)').matches);
  document.querySelectorAll('details.yj-cert').forEach((d) => { d.open = !isMobile; });
  // 手機：幾件小事左右滑動，小點跟著捲動位置
  const box = document.querySelector('.yj-facts');
  const dots = document.querySelectorAll('.yj-facts-dots span');
  if (!box || !dots.length) return;
  const prev = document.querySelector('.yj-facts-prev');
  const next = document.querySelector('.yj-facts-next');
  const step = () => { const c = box.children[0]; return c ? c.offsetWidth + 12 : 1; };
  this._factsScroll = () => {
    const k = Math.max(0, Math.min(dots.length - 1, Math.round(box.scrollLeft / step())));
    dots.forEach((d, n) => d.classList.toggle('is-on', n === k));
    if (prev) prev.classList.toggle('is-off', k === 0);
    if (next) next.classList.toggle('is-off', k === dots.length - 1);
  };
  box.addEventListener('scroll', this._factsScroll, { passive: true });
  dots.forEach((d, n) => d.addEventListener('click', () => box.scrollTo({ left: n * step(), behavior: 'smooth' })));
  const cur = () => Math.round(box.scrollLeft / step());
  if (prev) prev.addEventListener('click', () => box.scrollTo({ left: Math.max(0, cur() - 1) * step(), behavior: 'smooth' }));
  if (next) next.addEventListener('click', () => box.scrollTo({ left: Math.min(dots.length - 1, cur() + 1) * step(), behavior: 'smooth' }));
  this._factsBox = box;
}
componentDidMount() {
  this.setupMobileBits();
  this.setupSwipe();
  this.setupGlide();
  this.setupCatBottom();
}
componentWillUnmount() {
  if (this._factsBox) this._factsBox.removeEventListener('scroll', this._factsScroll);
  if (this._ts) { document.removeEventListener('touchstart', this._ts); document.removeEventListener('touchend', this._te); }
  if (this._catBottom) window.removeEventListener('scroll', this._catBottom);
  clearInterval(this._catTimer);
  clearTimeout(this._catOff);
  if (this._glideResize) window.removeEventListener('resize', this._glideResize);
  clearTimeout(this._glideT);
}
constructor(props) {
  super(props);
  this.state = { tl: 4, dir: '', n: 0 };
}
renderVals() {
  // 經歷時間軸：點圓點切換上方說明卡；detail 為詳細說明，待阿任提供
  const stages = [
    {
      "year": "2004–2010",
      "title": "清大化工系、化工所",
      "text": "input = output + accumulation",
      "href": "",
      "linkText": "",
      "detail": "這是我在大一「質能均衡」課學到的第一個公式：簡單說就是**物質不滅、能量守恆**，進入系統的東西，不會莫名其妙不見，不是變成產出，就是留在系統裡。\n老實說，熱力學、流體力學的公式我大多還給老師了，但這條一直留著。它教會我一種習慣：數字對不起來的時候，一定有東西漏掉了，要追到它為止；這個觀念奠定了我往後數據分析能力的基礎。"
    },
    {
      "year": "2010–2018",
      "title": "製程工程師",
      "text": "在無塵室與機台之間穿梭的福爾摩斯",
      "href": "",
      "linkText": "",
      "detail": "機台不會說話，但每一片產品經過，都會留下數據。製程工程師的工作，就是像偵探一樣，在這些海量資料裡找出蛛絲馬跡：哪一個參數偏了？良率為什麼掉？怎麼改才會更好？\n這段日子讓我學到**數據分析**的重要。從 Excel 的 VLOOKUP 開始，一路學到 VBA、Python 的 pandas 和 numpy，工具一直在換，目的沒變過：從數據裡找出一般人看不到的東西。"
    },
    {
      "year": "2018–2026",
      "title": "政府能源顧問",
      "text": "從工廠走進城市",
      "href": "",
      "linkText": "",
      "detail": "2018 年起，我開始協助高雄、屏東、臺東等地方政府規劃能源政策：從城市用電分析、再生能源調查，到施政藍圖與推廣活動。\n我手裡仍在做數據分析，只是尺度從一台機台放大到一座城市，工作中打交道的人也從工程師變成公務員、企業主、NGO 和社區居民。我在這段期間，學會跨界溝通、帶領團隊、管理專案，也學會**把分析變成別人願意執行的計畫**。"
    },
    {
      "year": "中間有一段",
      "title": "圖文作家「阿任叔叔」",
      "text": "學會把複雜的東西講到別人願意看完",
      "href": "https://www.instagram.com/azen.comix",
      "linkText": "看阿任叔叔的圖文 →",
      "detail": "我求知慾旺盛，不論是天文、生物、歷史、心理，我都來者不拒，我在 IG 上將我學習到的知識轉化為一則則的有趣圖文，我的畫功也許不如專科生，但我把知識拆解、重塑、轉化成一般人看得懂的能力，一定不輸任何人。"
    },
    {
      "year": "2026",
      "title": "創立銅爵",
      "text": "AI 讓一個人撐起一家顧問公司。",
      "detail": "「銅爵」傳說是秦始皇七匹名馬之一，會幫公司取這個名字，是因為我認為一個好的顧問，就像是一匹良駒；馬跑得再快，方向終究是君王定的；馬的價值不在自己跑多遠，而是在於讓騎它的人，到得了原本到不了的地方。**你要往哪裡去，最終是你的決定，我不會、也不該替你決定；我負責的是，讓你那段路走得快一點、穩一點、少繞一點。**",
      "href": "",
      "linkText": ""
    }
  ];
  const i = this.state.tl;
  this._tlMax = stages.length - 1;
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => this.placeGlide());
  const go = (k) => { if (k !== i) this.setState({ tl: k, dir: k > i ? 'next' : 'prev', n: this.state.n + 1 }); };
  const dt = (stages[i].detail || '[這個階段的詳細說明待補]').split('**');
  const cur = Object.assign({}, stages[i], { d1: dt[0] || '', d2: dt[1] || '', d3: dt.slice(2).join('') , detailCls: stages[i].detail ? 'tl-detail is-real' : 'tl-detail', hasLink: !!stages[i].href, anim: this.state.dir ? 'tl-in-' + this.state.dir + '-' + (this.state.n % 2) : '', imgCls: 'tl-img-' + i, imgAlt: ['實驗室裡用滴管操作試管', '無塵室裡操作精密機台的工程師', '黃昏時的高雄港灣城市景色', '阿任叔叔的宇宙系列圖文：海王星說「永遠不要讓別人定義你的價值」', '夕陽下在草原上揚起前蹄的黑色駿馬'][i] });
  const stops = stages.map((st, k) => ({
    year: st.year,
    title: st.title,
    cls: k === i ? 'is-on' : '',
    current: k === i ? 'step' : 'false',
    pick: () => go(k)
  }));
  return {
    cur,
    stops,
    prevCls: i === 0 ? 'is-off' : '',
    nextCls: i === stages.length - 1 ? 'is-off' : '',
    prev: () => go(Math.max(0, i - 1)),
    next: () => go(Math.min(stages.length - 1, i + 1))
  };
}
}
