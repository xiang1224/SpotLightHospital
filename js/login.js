/* 登入頁互動 */
(function () {
  // 已登入就直接進官網
  if (Auth.current()) { location.replace('index.html'); return; }

  const $ = id => document.getElementById(id);
  const form = $('form'), codeEl = $('code'), pwEl = $('pw'), errEl = $('err');
  const loginView = $('loginView'), okView = $('okView');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  $('onlineCode').textContent = AUTH.ONLINE_CODE;
  codeEl.focus();

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const r = Auth.login(codeEl.value, pwEl.value);

    if (!r.ok) {
      errEl.textContent = r.error;
      pwEl.value = '';
      loginView.classList.remove('shake');
      void loginView.offsetWidth;          // 重新觸發動畫
      loginView.classList.add('shake');
      return;
    }

    $('okCode').textContent = r.user.code;
    $('okName').textContent = r.user.name;
    $('okRole').textContent = r.user.role + (r.user.spec && r.user.spec.length ? '｜' + r.user.spec.join('・') : '');
    loginView.hidden = true;
    okView.hidden = false;
    $('enter').focus();
    setTimeout(() => location.replace('index.html'), reduce ? 1200 : 2800);
  });

  [codeEl, pwEl].forEach(el => el.addEventListener('input', () => { errEl.textContent = ''; }));
})();
