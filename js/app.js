
const { createApp } = Vue;


const PERSON_ARCS = ['人物故事', '長篇故事', '半年守護'];
const MEM_KINDS = [
  { id: 'person', label: '人物故事' },
  { id: 'fragment', label: '劇情碎片' }
];

const PERSON_ALIAS = { '哈特': '哈特沃爾特' };
const personName = c => { const n = String(c).split('（')[0].trim(); return PERSON_ALIAS[n] || n; };
const kindOf = s => s.kind || (PERSON_ARCS.includes(s.arc) ? 'person' : 'fragment');
createApp({
  data() {
    return {
      slides: SLIDES.map(s => ({ ...s, src: s.src || ph(s.title.slice(0, 18), s.hue) })),
      cur: 0, paused: false, interval: 6000, timer: null, touchX: 0,
      reduce: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      notices: NOTICES,
      openId: NOTICES.slice().sort((a, b) => (b.pin - a.pin) || b.date.localeCompare(a.date))[0].id,
      members: MEMBERS, spec: '全部',
      stories: STORIES, tab: Math.max(0, STORIES.findIndex(s => s.id === DEFAULT_STORY)), lb: null, albumFilter: 'all',
      kinds: MEM_KINDS, memKind: kindOf(STORIES[Math.max(0, STORIES.findIndex(s => s.id === DEFAULT_STORY))]),
      lastTab: {},   // 每個頁籤各自記得上次看到哪一篇
      user: Auth.current(),
      // 風格：'day' 日常 / 'apoc' 末日（記在這台裝置的瀏覽器裡）
      world: document.documentElement.dataset.world === 'apoc' ? 'apoc' : 'day',
      letterFor: null, toast: '', toastTimer: null,
      coverLb: false,                 // 封面照放大
      badgeFor: null, badgeBack: false // 識別證檢視（醫編、是否翻到背面）
    };
  },
  computed: {
    sortedNotices() { return [...this.notices].sort((a, b) => (b.pin - a.pin) || b.date.localeCompare(a.date)); },
    specs() { return ['全部', ...new Set(this.members.flatMap(m => m.specs))]; },
    filtered() { return this.spec === '全部' ? this.members : this.members.filter(m => m.specs.includes(this.spec)); },
    groups() {
      return TIERS.map(t => ({ ...t, list: this.filtered.filter(m => t.external ? !!m.org : (!m.org && t.roles.includes(m.role))) })).filter(g => g.list.length);
    },
    story() { return this.stories[this.tab]; },
    // 目前頁籤裡的故事（存放它們在 stories 裡的位置）
    kindIdx() { return this.stories.map((s, i) => i).filter(i => kindOf(this.stories[i]) === this.memKind); },
    kindCount() { const c = {}; this.stories.forEach(s => { const k = kindOf(s); c[k] = (c[k] || 0) + 1; }); return c; },
    // 劇情相簿：把所有故事的照片集中起來（沒放真照片、只有佔位圖的不顯示）
    albumAll() {
      return ALBUM.map(g => {
        const st = g.story && this.stories.find(x => x.id === g.story);
        const tags = g.tags || [];
        return { ...g, tags, storyTitle: st ? st.title : '', arc: st ? st.arc : '', people: [...new Set(tags.map(personName))] };
      });
    },
    // 篩選用的人員清單：名冊裡的成員照名冊順序在前，其他人（路人、對手等）在後
    albumPeople() {
      const cnt = {};
      this.albumAll.forEach(g => g.people.forEach(n => { cnt[n] = (cnt[n] || 0) + 1; }));
      const roster = this.members.map(m => m.name).filter(n => cnt[n]);
      const others = Object.keys(cnt).filter(n => !roster.includes(n)).sort((a, b) => cnt[b] - cnt[a]);
      return [...roster, ...others].map(name => ({ name, n: cnt[name] }));
    },
    albumList() { return this.albumFilter === 'all' ? this.albumAll : this.albumAll.filter(g => g.people.includes(this.albumFilter)); },
    curPhoto() { return this.lb === null ? null : (this.albumList[this.lb] || null); },
    apoc() { return this.world === 'apoc'; },
    myCode() { return this.user ? this.user.code : ''; },
    me() { return this.members.find(m => m.code === this.myCode) || null; },
    myLetter() { return this.me ? this.letterText(this.me) : null; },
    // 目前打開的識別證（沒有就是 null）
    badge() { return this.badgeFor ? (this.members.find(m => m.code === this.badgeFor) || null) : null; },
    // 目前打開的那封信（沒有就是 null）
    letter() {
      const to = this.letterFor && this.members.find(m => m.code === this.letterFor);
      const paragraphs = to && this.letterText(to);
      if (!paragraphs) return null;
      return { to, paragraphs, from: LETTER_FROM, date: LETTER_DATE };
    }
  },
  watch: {
    cur() { this.restart(); },
    paused() { this.restart(); },
    albumFilter() { this.lb = null; },
    tab() {
      this.coverLb = false;
      this.lockGrid();   // 切換前先鎖住回憶區高度，避免短篇故事讓頁面瞬間縮短、捲軸被推到奇怪的位置
      const k = kindOf(this.stories[this.tab]);
      if (k !== this.memKind) this.memKind = k;
      this.lastTab[k] = this.tab;
      this.$nextTick(this.showActiveTab);
    }
  },
  mounted() {
    this.lastTab[this.memKind] = this.tab;
    this.restart();
    this.showActiveTab();
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.letterFor) { this.closeLetter(); return; }
      if (e.key === 'Escape' && this.badgeFor) { this.closeBadge(); return; }
      if (e.key === 'Escape' && this.coverLb) { this.coverLb = false; return; }
      if (this.badgeFor && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { this.badgeBack = !this.badgeBack; return; }
      if (this.lb === null) return;
      if (e.key === 'Escape') this.lb = null;
      if (e.key === 'ArrowLeft') this.lbStep(-1);
      if (e.key === 'ArrowRight') this.lbStep(1);
    });
  },
  methods: {
    restart() {
      clearInterval(this.timer);
      if (this.paused || this.reduce) return;
      this.timer = setInterval(() => this.next(), this.interval);
    },
    next() { this.cur = (this.cur + 1) % this.slides.length; },
    prev() { this.cur = (this.cur - 1 + this.slides.length) % this.slides.length; },
    go(i) { this.cur = i; },
    moveLight(e) {
      const r = e.currentTarget.getBoundingClientRect();
      e.currentTarget.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      e.currentTarget.style.setProperty('--my', (e.clientY - r.top) + 'px');
    },
    tStart(e) { this.touchX = e.changedTouches[0].clientX; },
    tEnd(e) {
      const dx = e.changedTouches[0].clientX - this.touchX;
      if (Math.abs(dx) > 50) dx < 0 ? this.next() : this.prev();
    },
    // 切換「人物故事／劇情碎片」：回到該頁籤上次看的那一篇，沒看過就從第一篇開始
    setKind(k) {
      if (k === this.memKind) return;
      this.memKind = k;
      const idx = this.stories.map((s, i) => i).filter(i => kindOf(this.stories[i]) === k);
      if (!idx.length) return;
      this.tab = idx.includes(this.lastTab[k]) ? this.lastTab[k] : idx[0];
    },
    kindKey(e) {
      const ids = this.kinds.map(k => k.id);
      let i = ids.indexOf(this.memKind);
      if (['ArrowRight', 'ArrowDown'].includes(e.key)) i = (i + 1) % ids.length;
      else if (['ArrowLeft', 'ArrowUp'].includes(e.key)) i = (i - 1 + ids.length) % ids.length;
      else return;
      e.preventDefault();
      this.setKind(ids[i]);
      this.$nextTick(() => document.getElementById('kind-' + ids[i])?.focus());
    },
    tabKey(e) {
      const list = this.kindIdx, n = list.length, pos = list.indexOf(this.tab);
      if (['ArrowDown', 'ArrowRight'].includes(e.key)) this.tab = list[(pos + 1) % n];
      else if (['ArrowUp', 'ArrowLeft'].includes(e.key)) this.tab = list[(pos - 1 + n) % n];
      else return;
      e.preventDefault();
      this.$nextTick(() => document.getElementById('tab-' + this.story.id)?.focus());
    },
    logout() { Auth.logout(); },
    // ── 風格切換 ──
    toggleWorld() {
      this.setWorld(this.apoc ? 'day' : 'apoc');
      const root = document.documentElement;
      root.classList.remove('flick'); void root.offsetWidth; root.classList.add('flick');
      setTimeout(() => root.classList.remove('flick'), 900);
    },
    setWorld(w) {
      this.world = w;
      if (w === 'apoc') document.documentElement.dataset.world = 'apoc';
      else delete document.documentElement.dataset.world;
      this.letterFor = null;   // 換風格時收起已打開的信（兩種風格的信不一樣）
      try { w === 'apoc' ? localStorage.setItem('spotlight_world', 'apoc') : localStorage.removeItem('spotlight_world'); } catch (e) { }
    },
    // ── 院長的信 ──
    // 回傳這個人的信（段落陣列，已把 {name} 換成名字）；沒有信就回傳 null
    letterText(m) {
      if (!m || m.code === LETTER_FROM.code) return null;
      // 日常風格與末日風格各有一套信（letters.js）
      const set = this.apoc ? LETTERS : LETTERS_DAY, def = this.apoc ? LETTER_DEFAULT : LETTER_DEFAULT_DAY;
      const own = set[m.code];
      if (own === null) return null;
      const src = (own && own.length) ? own : (m.org ? null : def);
      return src ? src.map(t => t.replace(/\{name\}/g, m.name)) : null;
    },
    hasLetter(m) { return !!this.letterText(m); },
    canOpen(m) { return LETTERS_OPEN_TO_ALL || m.code === this.myCode; },
    openLetter(m) {
      if (!this.hasLetter(m)) return;
      if (!this.canOpen(m)) { this.say('這封信已經封緘，只有收信人本人能拆開。'); return; }
      this.letterFor = m.code;
      this.$nextTick(() => this.$refs.letterBox && this.$refs.letterBox.focus());
    },
    closeLetter() { this.letterFor = null; },
    say(msg) {
      this.toast = msg; clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => { this.toast = ''; }, 2600);
    },
    // ── 識別證 ──
    // 圖片放在 images/badges/：正面「醫編.png」（例如 920.png），背面「醫編-back.png」或所有人共用的「back.png」。
    // 副檔名 png / jpg / webp 都可以；也可以在 roster.js 那個人加 badgeFront: '路徑'、badgeBack: '路徑' 指定。
    // 找不到圖片時，依序往下試，最後顯示自動產生的佔位識別證。
    badgeList(m, side) {
      const exts = ['png', 'jpg', 'webp'];
      const names = side === 'front' ? [m.code, m.code + '-front'] : [m.code + '-back', 'back'];
      const list = [];
      const own = side === 'front' ? m.badgeFront : m.badgeBack;
      if (own) list.push(own);
      names.forEach(n => exts.forEach(x => list.push('images/badges/' + n + '.' + x)));
      list.push(badgePh(m, side));
      return list;
    },
    badgeSrc(m, side) { return this.badgeList(m, side)[0]; },
    badgeErr(e, m, side) {
      const img = e.target, list = this.badgeList(m, side);
      const i = (parseInt(img.dataset.i || '0', 10) || 0) + 1;
      if (i >= list.length) return;
      img.dataset.i = i;
      img.src = list[i];
    },
    openBadge(m) {
      this.badgeFor = m.code; this.badgeBack = false;
      this.$nextTick(() => this.$refs.badgeX && this.$refs.badgeX.focus());
    },
    closeBadge() { this.badgeFor = null; this.badgeBack = false; },
    photoFail(m) { if (m.photo !== m.avatar) m.photo = m.avatar; },
    // 切換故事時（transition 是 out-in：舊內容先消失、新內容才進來），中間內容區會短暫是空的，
    // 整個網頁變矮，瀏覽器就會把捲動位置往上拉。這裡先把區塊高度鎖住，新內容進場完成後再放開。
    lockGrid() {
      const g = document.querySelector('#memory .mem-grid');
      if (g) g.style.minHeight = g.offsetHeight + 'px';
    },
    unlockGrid() {
      const g = document.querySelector('#memory .mem-grid');
      if (g) g.style.minHeight = '';
    },
    // ── 人物故事封面照 ──
    // 人物故事一律有封面區塊；封面照預設讀 images/covers/故事id.jpg（例如 images/covers/kelly.jpg），
    // 也可以在 data.js 那一篇用 cover: '路徑' 指定。找不到圖片時顯示佔位圖。
    showCover(s) { return !!s.cover || kindOf(s) === 'person'; },
    coverSrc(s) { return s.cover || 'images/covers/' + s.id + '.jpg'; },
    coverFail(e, s) {
      const img = e.target;
      if (img.dataset.fallback) return;
      img.dataset.fallback = '1';
      img.src = ph(s.title.slice(0, 18), s.hue);
    },
    // 手機版頁簽列是橫向捲動的：讓目前選中的那一篇捲到看得見的位置（只動頁簽列，不會讓整個網頁跳動）
    showActiveTab() {
      const box = document.querySelector('#memory .tabs');
      const el = box && box.children[this.kindIdx.indexOf(this.tab)];
      if (!box || !el) return;
      // 桌機版：清單是直向捲動，把選中的那一篇捲進可視範圍
      if (box.scrollHeight > box.clientHeight && box.scrollWidth <= box.clientWidth) {
        const top = el.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop;
        box.scrollTop = top - (box.clientHeight - el.clientHeight) / 2;
        return;
      }
      if (box.scrollWidth <= box.clientWidth) return;
      const left = el.getBoundingClientRect().left - box.getBoundingClientRect().left + box.scrollLeft;
      box.scrollLeft = left - (box.clientWidth - el.clientWidth) / 2;
    },
    // 一篇故事可以有「背景檔案(profile)」和「分析(analysis)」兩個可展開區塊
    profileGroups(story) {
      return [
        { title: story.profileTitle || '背景檔案', list: story.profile },
        { title: story.analysisTitle || '心理分析', list: story.analysis, intro: story.analysisIntro }
      ].filter(g => g.list && g.list.length);
    },
    // 只展開／收合「按鈕所在的那一個區塊」
    toggleProfile(e, open) {
      const wrap = e.currentTarget.closest('.pf-wrap');
      (wrap || document).querySelectorAll('.pf').forEach(d => { d.open = open; });
    },
    openLb(i) { this.lb = i; },
    lbStep(d) {
      const n = this.albumList.length;
      if (!n) return;
      this.lb = (this.lb + d + n) % n;
    }
  }
}).mount('#app');