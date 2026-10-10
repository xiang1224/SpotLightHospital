/* 登入邏輯：驗證、記錄登入狀態、登出。
   需要先載入 roster.js。 */
const Auth = {
  // 目前登入者（沒登入回傳 null）
  current() {
    try {
      const s = JSON.parse(sessionStorage.getItem(AUTH.STORAGE_KEY));
      if (s && s.code) return AUTH.ROSTER.find(r => r.code === s.code) || null;
    } catch (e) {}
    return null;
  },

  // 嘗試登入，回傳 { ok, user, error }
  login(code, password) {
    const c = String(code || '').trim();
    const user = AUTH.ROSTER.find(r => r.code === c);
    const right = user ? (user.password || AUTH.PASSWORD) : null;
    if (!user || password !== right) {
      return { ok: false, error: '醫護編碼或密碼錯誤，請再確認一次。' };
    }
    try {
      sessionStorage.setItem(AUTH.STORAGE_KEY, JSON.stringify({ code: user.code, t: Date.now() }));
    } catch (e) {
      return { ok: false, error: '瀏覽器擋住了登入紀錄，請關閉無痕模式後再試。' };
    }
    return { ok: true, user };
  },

  logout() {
    try { sessionStorage.removeItem(AUTH.STORAGE_KEY); } catch (e) {}
    location.replace('login.html');
  }
};
