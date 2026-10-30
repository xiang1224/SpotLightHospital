/* 登入頁互動 */
(function () {
  // 已登入就直接進官網
  if (Auth.current()) { location.replace('index.html'); return; }

  const $ = id => document.getElementById(id);
  const form = $('form'), codeEl = $('code'), pwEl = $('pw'), errEl = $('err');
  const loginView = $('loginView'), okView = $('okView');
  const hintBtn = $('hintBtn'), hintBox = $('hintBox'), hint1 = $('hint1'), hint2 = $('hint2'), hint2Row = $('hint2Row');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  $('onlineCode').textContent = AUTH.ONLINE_CODE;

  // 帳號選單：醫編・名字
  AUTH.ROSTER.forEach(r => {
    const o = document.createElement('option');
    o.value = r.code;
    o.textContent = r.code + '・' + r.name;
    codeEl.appendChild(o);
  });
  codeEl.focus();

  // 提示：依目前選到的編號與錯誤次數顯示
  let hintOpen = false;
  function renderHint() {
    hintBtn.setAttribute('aria-expanded', hintOpen);
    hintBox.hidden = !hintOpen;
    if (!hintOpen) return;
    const code = codeEl.value;
    if (!code) {
      hint1.textContent = '請先選擇你的醫護編碼。';
      hint2Row.hidden = true;
      return;
    }
    const h = Auth.hintsFor(code);
    if (!h.has) {
      hint1.textContent = '這個編號沒有提示。';
      hint2Row.hidden = true;
      return;
    }
    hint1.textContent = h.first;
    hint2Row.hidden = !h.hasSecond;
    hint2Row.classList.toggle('locked', h.locked);
    hint2.textContent = h.locked
      ? '🔒 第一階段提示還是看不懂的話，再輸入錯誤 ' + h.left + ' 次就會解鎖'
      : h.second;
  }

  hintBtn.addEventListener('click', () => { hintOpen = !hintOpen; renderHint(); });
  codeEl.addEventListener('change', () => { errEl.textContent = ''; renderHint(); });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const r = Auth.login(codeEl.value, pwEl.value);

    if (!r.ok) {
      errEl.textContent = r.error;
      pwEl.value = '';
      loginView.classList.remove('shake');
      void loginView.offsetWidth;          // 重新觸發動畫
      loginView.classList.add('shake');
      renderHint();                        // 錯誤次數變多，可能解鎖第二階段提示
      return;
    }

    $('okCode').textContent = r.user.code;
    $('okName').textContent = r.user.name;
    $('okRole').textContent = (r.user.org ? r.user.org + '・' : '') + r.user.role + (r.user.spec && r.user.spec.length ? '｜' + r.user.spec.join('・') : '');
    loginView.hidden = true;
    okView.hidden = false;
    $('enter').focus();
    setTimeout(() => location.replace('index.html'), reduce ? 1200 : 2800);
  });

  pwEl.addEventListener('input', () => { errEl.textContent = ''; });
})();