/* 主程式（Vue 3）：輪播、公告、成員篩選、回憶區頁簽與燈箱。
   一般情況下不需要修改，內容請到 data.js。 */

const { createApp } = Vue;
createApp({
  data(){
    return {
      slides: SLIDES.map(s => ({ ...s, src: s.src || ph(s.title.slice(0,18), s.hue) })),
      cur: 0, paused: false, interval: 6000, timer: null, touchX: 0,
      reduce: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      notices: NOTICES, openId: 1,
      members: MEMBERS, spec: '全部',
      stories: STORIES, tab: STORIES.length - 1, lb: null,
      user: Auth.current()
    };
  },
  computed:{
    sortedNotices(){ return [...this.notices].sort((a,b) => (b.pin - a.pin) || b.date.localeCompare(a.date)); },
    specs(){ return ['全部', ...new Set(this.members.flatMap(m => m.specs))]; },
    filtered(){ return this.spec === '全部' ? this.members : this.members.filter(m => m.specs.includes(this.spec)); },
    groups(){
      return TIERS.map(t => ({ ...t, list: this.filtered.filter(m => t.roles.includes(m.role)) })).filter(g => g.list.length);
    },
    story(){ return this.stories[this.tab]; }
  },
  watch:{
    cur(){ this.restart(); },
    paused(){ this.restart(); },
    tab(){ this.lb = null; }
  },
  mounted(){
    this.restart();
    window.addEventListener('keydown', e => {
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
    tabKey(e){
      const n = this.stories.length;
      if (['ArrowDown','ArrowRight'].includes(e.key)) this.tab = (this.tab + 1) % n;
      else if (['ArrowUp','ArrowLeft'].includes(e.key)) this.tab = (this.tab - 1 + n) % n;
      else return;
      e.preventDefault();
      this.$nextTick(() => document.getElementById('tab-' + this.story.id)?.focus());
    },
    logout(){ Auth.logout(); },
    openLb(i){ this.lb = i; },
    lbStep(d){
      const n = this.story.images.length;
      this.lb = (this.lb + d + n) % n;
    }
  }
}).mount('#app');
