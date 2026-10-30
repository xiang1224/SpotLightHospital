/* 登入邏輯：驗證、記錄登入狀態、登出、錯誤次數與提示。
   需要先載入 roster.js。 */
const Auth = {
  FAIL_KEY: 'spotlight_fails',

  // 目前登入者（沒登入回傳 null）
  current() {
    try {
      const s = JSON.parse(sessionStorage.getItem(AUTH.STORAGE_KEY));
      if (s && s.code) return AUTH.ROSTER.find(r => r.code === s.code) || null;
    } catch (e) { }
    return null;
  },

  // ── 密碼輸入錯誤次數（依醫護編碼分開算；關閉分頁後歸零）──
  fails(code) {
    try { return (JSON.parse(sessionStorage.getItem(this.FAIL_KEY)) || {})[code] || 0; } catch (e) { return 0; }
  },
  addFail(code) {
    try {
      const all = JSON.parse(sessionStorage.getItem(this.FAIL_KEY)) || {};
      all[code] = (all[code] || 0) + 1;
      sessionStorage.setItem(this.FAIL_KEY, JSON.stringify(all));
      return all[code];
    } catch (e) { return 0; }
  },
  clearFails(code) {
    try {
      const all = JSON.parse(sessionStorage.getItem(this.FAIL_KEY)) || {};
      delete all[code];
      sessionStorage.setItem(this.FAIL_KEY, JSON.stringify(all));
    } catch (e) { }
  },

  // 這個人目前能看到的提示：{ has, first, second, locked, left }
  hintsFor(code) {
    const user = AUTH.ROSTER.find(r => r.code === code);
    const h = user && user.hints;
    if (!h || !h.length) return { has: false };
    const n = this.fails(code), need = AUTH.HINT2_AFTER;
    const unlocked = n > need;
    return {
      has: true,
      first: h[0] || '',
      second: unlocked ? (h[1] || '') : '',
      hasSecond: !!h[1],
      locked: !unlocked,
      left: Math.max(0, need + 1 - n)   // 還要再錯幾次才解鎖
    };
  },

  // 嘗試登入，回傳 { ok, user, error }（密碼不分大小寫、前後空白不計）
  login(code, password) {
    const c = String(code || '').trim();
    if (!c) return { ok: false, error: '請先選擇你的醫護編碼。' };
    const user = AUTH.ROSTER.find(r => r.code === c);
    const norm = s => String(s || '').trim().toLowerCase();
    const right = user ? (user.password || AUTH.PASSWORD) : null;
    if (!user || norm(password) !== norm(right)) {
      if (user) this.addFail(user.code);
      return { ok: false, error: '密碼錯誤，請再確認一次。可以按「查看提示」。' };
    }
    try {
      sessionStorage.setItem(AUTH.STORAGE_KEY, JSON.stringify({ code: user.code, t: Date.now() }));
    } catch (e) {
      return { ok: false, error: '瀏覽器擋住了登入紀錄，請關閉無痕模式後再試。' };
    }
    this.clearFails(user.code);
    return { ok: true, user };
  },

  logout() {
    try { sessionStorage.removeItem(AUTH.STORAGE_KEY); } catch (e) { }
    location.replace('login.html');
  }
};