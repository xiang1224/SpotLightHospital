/* 主程式（Vue 3）：輪播、公告、成員篩選、回憶區頁簽與燈箱。
   一般情況下不需要修改，內容請到 data.js。 */

const { createApp } = Vue;

/* 回憶區分成兩個頁籤：「人物故事」與「劇情碎片」。
   每篇故事依 data.js 裡的 arc（頁簽小標）分類：arc 在下面這份清單裡的算「人物故事」，其餘都算「劇情碎片」。
   想強制指定某一篇，可在 data.js 那一篇加上  kind: 'person'（人物故事）或  kind: 'fragment'（劇情碎片）。 */
const PERSON_ARCS = ['人物故事', '長篇故事', '半年守護'];
const MEM_KINDS = [
  { id: 'person', label: '人物故事' },
  { id: 'fragment', label: '劇情碎片' }
];
const kindOf = s => s.kind || (PERSON_ARCS.includes(s.arc) ? 'person' : 'fragment');
createApp({
  data(){
    return {
      slides: SLIDES.map(s => ({ ...s, src: s.src || ph(s.title.slice(0,18), s.hue) })),
      cur: 0, paused: false, interval: 6000, timer: null, touchX: 0,
      reduce: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      notices: NOTICES,
      openId: NOTICES.slice().sort((a, b) => (b.pin - a.pin) || b.date.localeCompare(a.date))[0].id,
      members: MEMBERS, spec: '全部',
      stories: STORIES, tab: Math.max(0, STORIES.findIndex(s => s.id === DEFAULT_STORY)), lb: null,
      kinds: MEM_KINDS, memKind: kindOf(STORIES[Math.max(0, STORIES.findIndex(s => s.id === DEFAULT_STORY))]),
      lastTab: {},   // 每個頁籤各自記得上次看到哪一篇
      user: Auth.current(),
      // 風格：'day' 日常 / 'apoc' 末日（記在這台裝置的瀏覽器裡）
      world: document.documentElement.dataset.world === 'apoc' ? 'apoc' : 'day',
      letterFor: null, toast: '', toastTimer: null
    };
  },
  computed:{
    sortedNotices(){ return [...this.notices].sort((a,b) => (b.pin - a.pin) || b.date.localeCompare(a.date)); },
    specs(){ return ['全部', ...new Set(this.members.flatMap(m => m.specs))]; },
    filtered(){ return this.spec === '全部' ? this.members : this.members.filter(m => m.specs.includes(this.spec)); },
    groups(){
      return TIERS.map(t => ({ ...t, list: this.filtered.filter(m => t.external ? !!m.org : (!m.org && t.roles.includes(m.role))) })).filter(g => g.list.length);
    },
    story(){ return this.stories[this.tab]; },
    // 目前頁籤裡的故事（存放它們在 stories 裡的位置）
    kindIdx(){ return this.stories.map((s, i) => i).filter(i => kindOf(this.stories[i]) === this.memKind); },
    kindCount(){ const c = {}; this.stories.forEach(s => { const k = kindOf(s); c[k] = (c[k] || 0) + 1; }); return c; },
    apoc(){ return this.world === 'apoc'; },
    myCode(){ return this.user ? this.user.code : ''; },
    me(){ return this.members.find(m => m.code === this.myCode) || null; },
    myLetter(){ return this.me ? this.letterText(this.me) : null; },
    // 目前打開的那封信（沒有就是 null）
    letter(){
      const to = this.letterFor && this.members.find(m => m.code === this.letterFor);
      const paragraphs = to && this.letterText(to);
      if (!paragraphs) return null;
      return { to, paragraphs, from: LETTER_FROM, date: LETTER_DATE };
    }
  },
  watch:{
    cur(){ this.restart(); },
    paused(){ this.restart(); },
    tab(){
      this.lb = null;
      const k = kindOf(this.stories[this.tab]);
      if (k !== this.memKind) this.memKind = k;
      this.lastTab[k] = this.tab;
      this.$nextTick(this.showActiveTab);
    }
  },
  mounted(){
    this.lastTab[this.memKind] = this.tab;
    this.restart();
    this.showActiveTab();
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.letterFor) { this.closeLetter(); return; }
      if (this.lb === null) return;
      if (e.key === 'Escape') this.lb = null;
      if (e.key === 'ArrowLeft') this.lbStep(-1);
      if (e.key === 'ArrowRight') this.lbStep(1);
    });
  },
  methods:{
    restart(){
      clearInterval(this.timer);
      if (this.paused || this.reduce) return;
      this.timer = setInterval(() => this.next(), this.interval);
    },
    next(){ this.cur = (this.cur + 1) % this.slides.length; },
    prev(){ this.cur = (this.cur - 1 + this.slides.length) % this.slides.length; },
    go(i){ this.cur = i; },
    moveLight(e){
      const r = e.currentTarget.getBoundingClientRect();
      e.currentTarget.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      e.currentTarget.style.setProperty('--my', (e.clientY - r.top) + 'px');
    },
    tStart(e){ this.touchX = e.changedTouches[0].clientX; },
    tEnd(e){
      const dx = e.changedTouches[0].clientX - this.touchX;
      if (Math.abs(dx) > 50) dx < 0 ? this.next() : this.prev();
    },
    // 切換「人物故事／劇情碎片」：回到該頁籤上次看的那一篇，沒看過就從第一篇開始
    setKind(k){
      if (k === this.memKind) return;
      this.memKind = k;
      const idx = this.stories.map((s, i) => i).filter(i => kindOf(this.stories[i]) === k);
      if (!idx.length) return;
      this.tab = idx.includes(this.lastTab[k]) ? this.lastTab[k] : idx[0];
    },
    kindKey(e){
      const ids = this.kinds.map(k => k.id);
      let i = ids.indexOf(this.memKind);
      if (['ArrowRight','ArrowDown'].includes(e.key)) i = (i + 1) % ids.length;
      else if (['ArrowLeft','ArrowUp'].includes(e.key)) i = (i - 1 + ids.length) % ids.length;
      else return;
      e.preventDefault();
      this.setKind(ids[i]);
      this.$nextTick(() => document.getElementById('kind-' + ids[i])?.focus());
    },
    tabKey(e){
      const list = this.kindIdx, n = list.length, pos = list.indexOf(this.tab);
      if (['ArrowDown','ArrowRight'].includes(e.key)) this.tab = list[(pos + 1) % n];
      else if (['ArrowUp','ArrowLeft'].includes(e.key)) this.tab = list[(pos - 1 + n) % n];
      else return;
      e.preventDefault();
      this.$nextTick(() => document.getElementById('tab-' + this.story.id)?.focus());
    },
    logout(){ Auth.logout(); },
    // ── 風格切換 ──
    toggleWorld(){
      this.setWorld(this.apoc ? 'day' : 'apoc');
      const root = document.documentElement;
      root.classList.remove('flick'); void root.offsetWidth; root.classList.add('flick');
      setTimeout(() => root.classList.remove('flick'), 900);
    },
    setWorld(w){
      this.world = w;
      if (w === 'apoc') document.documentElement.dataset.world = 'apoc';
      else delete document.documentElement.dataset.world;
      if (w !== 'apoc') this.letterFor = null;
      try { w === 'apoc' ? localStorage.setItem('spotlight_world', 'apoc') : localStorage.removeItem('spotlight_world'); } catch (e) {}
    },
    // ── 院長的信 ──
    // 回傳這個人的信（段落陣列，已把 {name} 換成名字）；沒有信就回傳 null
    letterText(m){
      if (!m || m.code === LETTER_FROM.code) return null;
      const own = LETTERS[m.code];
      if (own === null) return null;
      const src = (own && own.length) ? own : (m.org ? null : LETTER_DEFAULT);
      return src ? src.map(t => t.replace(/\{name\}/g, m.name)) : null;
    },
    hasLetter(m){ return !!this.letterText(m); },
    canOpen(m){ return LETTERS_OPEN_TO_ALL || m.code === this.myCode; },
    openLetter(m){
      if (!this.apoc || !this.hasLetter(m)) return;
      if (!this.canOpen(m)) { this.say('這封信已經封緘，只有收信人本人能拆開。'); return; }
      this.letterFor = m.code;
      this.$nextTick(() => this.$refs.letterBox && this.$refs.letterBox.focus());
    },
    closeLetter(){ this.letterFor = null; },
    say(msg){
      this.toast = msg; clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => { this.toast = ''; }, 2600);
    },
    photoFail(m){ if (m.photo !== m.avatar) m.photo = m.avatar; },
    // 手機版頁簽列是橫向捲動的：讓目前選中的那一篇捲到看得見的位置（只動頁簽列，不會讓整個網頁跳動）
    showActiveTab(){
      const box = document.querySelector('#memory .tabs');
      const el = box && box.children[this.kindIdx.indexOf(this.tab)];
      if (!box || !el || box.scrollWidth <= box.clientWidth) return;
      const left = el.getBoundingClientRect().left - box.getBoundingClientRect().left + box.scrollLeft;
      box.scrollLeft = left - (box.clientWidth - el.clientWidth) / 2;
    },
    // 一篇故事可以有「背景檔案(profile)」和「分析(analysis)」兩個可展開區塊
    profileGroups(story){
      return [
        { title: story.profileTitle || '背景檔案', list: story.profile },
        { title: story.analysisTitle || '心理分析', list: story.analysis, intro: story.analysisIntro }
      ].filter(g => g.list && g.list.length);
    },
    // 只展開／收合「按鈕所在的那一個區塊」
    toggleProfile(e, open){
      const wrap = e.currentTarget.closest('.pf-wrap');
      (wrap || document).querySelectorAll('.pf').forEach(d => { d.open = open; });
    },
    openLb(i){ this.lb = i; },
    lbStep(d){
      const n = this.story.images.length;
      this.lb = (this.lb + d + n) % n;
    }
  }
}).mount('#app');
