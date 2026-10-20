
(function () {
  'use strict';

  /* ---------- 小工具 ---------- */
  const $  = (sel, r = document) => r.querySelector(sel);
  const $$ = (sel, r = document) => Array.from(r.querySelectorAll(sel));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = n => '$' + Number(n).toLocaleString();
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 複製：優先用 Clipboard API，不支援（例如部分 file:// 環境）時改用舊方法
  function legacyCopy(text) {
    const prev = document.activeElement;
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
    document.body.appendChild(ta); ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) {}
    ta.remove();
    if (prev && prev.focus) prev.focus({ preventScroll: true });
    return ok;
  }
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(() => true, () => legacyCopy(text));
    }
    return Promise.resolve(legacyCopy(text));
  }
  const timers = new WeakMap();
  function flash(el, msg, isErr) {
    if (!el) return;
    el.textContent = msg;
    el.classList.toggle('is-err', !!isErr);
    clearTimeout(timers.get(el));
    timers.set(el, setTimeout(() => { el.textContent = ''; el.classList.remove('is-err'); }, 2600));
  }
  function copyWithStatus(text, statusEl, okMsg) {
    copyText(text).then(ok => {
      const short = text.length > 18 ? text.slice(0, 18) + '…' : text;
      flash(statusEl, ok ? (okMsg || `✅ 已成功複製：${short}`) : '❌ 複製失敗，請手動複製', !ok);
    });
  }

  /* ---------- 版面骨架 ---------- */
  const TABS = [
    { id: 'treat', label: '醫療 /me' },
    { id: 'soap',  label: 'SOAP 病例' },
    { id: 'drug',  label: '藥物指南' },
    { id: 'fee',   label: '醫藥費計價' }
  ];

  const ICON_PULSE = '<svg class="i-pulse" viewBox="0 0 32 32" aria-hidden="true"><path d="M3 17h7l3-7 5 13 3-6h8" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const ICON_CLOSE = '<svg class="i-close" viewBox="0 0 32 32" aria-hidden="true"><path d="M8 8l16 16M24 8L8 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>';

  const paneTreat = () => `
    <div class="ems-pane ems-pane--fill" id="emsPane-treat" role="tabpanel" aria-labelledby="emsTab-treat">
      <div class="ems-split">
        <aside class="ems-side">
          <input class="ems-input" id="emsSearch" type="search" placeholder="搜尋傷勢…（快捷鍵 F）" autocomplete="off" aria-label="搜尋傷勢">
          <div class="ems-list" id="emsInjuries"></div>
        </aside>
        <div class="ems-main" id="emsSteps"></div>
      </div>
      <div class="ems-status" id="emsStatus-treat" role="status" aria-live="polite"></div>
      <p class="ems-hint"><kbd>F</kbd> 聚焦搜尋框　<kbd>↑</kbd><kbd>↓</kbd> 在搜尋框內切換傷勢　<kbd>Enter</kbd> 複製下一步（亮色框），複製完切回遊戲貼上　<kbd>Esc</kbd> 關閉工具</p>
    </div>`;

  const paneSoap = () => {
    const partOptions = '<option value="">-- 無 --</option>' +
      Object.keys(MEDICAL_DATA.pLibrary).map(k => `<option value="${esc(k)}">${esc(k)}</option>`).join('');
    return `
    <div class="ems-pane" id="emsPane-soap" role="tabpanel" aria-labelledby="emsTab-soap">
      <div class="ems-grid2">
        <div class="ems-card ems-stack">
          <label class="ems-field"><span>S（傷患主訴）</span>
            <input class="ems-input" id="emsS" type="text" placeholder="例如：胸口中彈、意識不清" autocomplete="off"></label>
          <label class="ems-field"><span>受傷原因 / 環境</span>
            <select class="ems-input" id="emsReason"><option value="">-- 請選擇受傷環境 --</option>
              ${SOAP_REASONS.map(g => `<optgroup label="${esc(g.group)}">${g.items.map(i => `<option value="${esc(i)}">${esc(i)}</option>`).join('')}</optgroup>`).join('')}
            </select></label>
          <fieldset class="ems-fieldset"><legend>額外處置 / 疫苗項目</legend>
            <div class="ems-chips">${SOAP_EXTRA.map(x => `<label class="ems-chip"><input type="checkbox" name="emsExtra" value="${esc(x.value)}"><span>${esc(x.label)}</span></label>`).join('')}</div>
          </fieldset>
        </div>
        <div class="ems-card">
          <div class="ems-card-title">A（傷勢細節設定）</div>
          <div class="ems-parts">${SOAP_PARTS.map(p => `<label class="ems-part"><span>${esc(p)}</span><select class="ems-input" name="emsPart" data-part="${esc(p)}">${partOptions}</select></label>`).join('')}</div>
        </div>
      </div>
      <div class="ems-actions">
        <button class="ems-btn ems-btn--primary" type="button" id="emsGen">生成醫療報告</button>
        <button class="ems-btn" type="button" id="emsReset">重設</button>
      </div>
      <div class="ems-status" id="emsStatus-soap" role="status" aria-live="polite"></div>
      <div class="ems-result" id="emsResult" hidden>
        <div class="ems-result-head"><span>診斷完成</span><button class="ems-btn ems-btn--sm ems-btn--primary" type="button" id="emsCopyReport">複製報告</button></div>
        <pre class="ems-term ems-out" id="emsOut"></pre>
        <p class="ems-fine">* 此報告僅供 Roleplay 醫療用途使用</p>
      </div>
    </div>`;
  };

  const paneDrug = () => `
    <div class="ems-pane ems-pane--fill" id="emsPane-drug" role="tabpanel" aria-labelledby="emsTab-drug">
      <div class="ems-split">
        <aside class="ems-side">
          <div class="ems-side-title">藥物主要分類</div>
          <div class="ems-list" id="emsCats"></div>
        </aside>
        <div class="ems-main ems-main--table">
          <table class="ems-table">
            <thead><tr><th>藥物名稱</th><th>主要效果／適應症</th><th>點擊複製處置 (/me)</th></tr></thead>
            <tbody id="emsDrugBody"></tbody>
          </table>
        </div>
      </div>
      <div class="ems-status" id="emsStatus-drug" role="status" aria-live="polite"></div>
      <p class="ems-hint">先在左側選 <kbd>藥物大類</kbd>，再點右側 <kbd>整列藥物</kbd>，即可複製對應的 <code>/me</code> 遊戲指令。</p>
    </div>`;

  const paneFee = () => {
    const F = FEE_CONFIG;
    return `
    <div class="ems-pane" id="emsPane-fee" role="tabpanel" aria-labelledby="emsTab-fee">
      <p class="ems-sub">依據 2026 最新醫療服務價目表自動動態結算</p>
      <div class="ems-grid2">
        <div class="ems-card ems-stack">
          <fieldset class="ems-fieldset"><legend>1. 掛號與診察費用（必選）</legend>
            ${F.base.map((b, i) => `<div class="ems-row"><label class="ems-row-l"><input type="radio" name="emsBase" value="${b.price}" data-name="${esc(b.name)}"${i === 0 ? ' checked' : ''}><span>${esc(b.label)}</span></label><span class="ems-mono">${money(b.price)}</span></div>`).join('')}
          </fieldset>
          <fieldset class="ems-fieldset"><legend>2. 住院服務（選擇病房與天數）</legend>
            <div class="ems-inline">
              <select class="ems-input" id="emsStayType" aria-label="病房類型">
                ${F.stay.map(s => `<option value="${s.price}" data-name="${esc(s.invoiceName)}">${esc(s.price ? `${s.label} (${money(s.price)}/天)` : s.label)}</option>`).join('')}
              </select>
              <span class="ems-qty"><input class="ems-input ems-input--num" type="number" id="emsStayDays" value="0" min="0" aria-label="住院天數">天</span>
            </div>
            <div class="ems-stay-txt" id="emsStayTxt" data-on="0">未啟用住院</div>
          </fieldset>
        </div>
        <div class="ems-card ems-stack">
          <fieldset class="ems-fieldset"><legend>3. 手術與健康檢查項目</legend>
            <div class="ems-row"><label class="ems-row-l"><input type="checkbox" id="emsSurgeryCb"><span>${esc(F.surgery.name)}（最低 ${money(F.surgery.min)}）</span></label>
              <span class="ems-qty">$<input class="ems-input ems-input--num" type="number" id="emsSurgeryVal" value="${F.surgery.min}" min="${F.surgery.min}" step="${F.surgery.step}" aria-label="手術費用"></span></div>
            ${F.checks.map(c => `<div class="ems-row"><label class="ems-row-l"><input type="checkbox" data-check="${c.id}"><span>${esc(c.name)}</span></label><span class="ems-mono">${money(c.price)}</span></div>`).join('')}
          </fieldset>
          <fieldset class="ems-fieldset"><legend>4. 其他醫療服務</legend>
            ${F.services.map(v => `<div class="ems-row"><label class="ems-row-l"><input type="checkbox" data-service="${v.id}"><span>${esc(v.name)} (${money(v.price)}/${esc(v.unit)})</span></label><span class="ems-qty"><input class="ems-input ems-input--num" type="number" value="1" min="1" data-qty="${v.id}" aria-label="${esc(v.name)}數量">${esc(v.unit)}</span></div>`).join('')}
          </fieldset>
          <div class="ems-term ems-invoice" id="emsInvoice" aria-live="polite"></div>
          <button class="ems-total" type="button" id="emsTotal" title="點擊直接複製結帳金額"></button>
          <div class="ems-status" id="emsStatus-fee" role="status" aria-live="polite"></div>
        </div>
      </div>
    </div>`;
  };

  const root = document.createElement('div');
  root.className = 'ems';
  root.id = 'ems';
  root.innerHTML = `
    <section class="ems-panel" id="emsPanel" role="dialog" aria-label="SpotLight EMS 醫療工具" tabindex="-1">
      <header class="ems-head">
        <div><h2>SpotLight EMS</h2><p>RP 醫療輔助工具</p></div>
        <button class="ems-x" type="button" id="emsClose" aria-label="關閉工具">✕</button>
      </header>
      <div class="ems-tabs" role="tablist" aria-label="工具分頁">
        ${TABS.map(t => `<button class="ems-tab" type="button" role="tab" id="emsTab-${t.id}" data-tab="${t.id}" aria-controls="emsPane-${t.id}" aria-selected="false" tabindex="-1">${t.label}</button>`).join('')}
      </div>
      <div class="ems-body">${paneTreat()}${paneSoap()}${paneDrug()}${paneFee()}</div>
      <footer class="ems-foot">
        <span>【免責聲明】本站所載之醫學術語、處置與手術流程均為虛擬 RP 娛樂用途，不具備任何現實醫療指導價值。</span>
        <span>© 2026 暈船仔丨小翔丨. All rights reserved.</span>
      </footer>
    </section>
    <button class="ems-fab" id="emsFab" type="button" aria-expanded="false" aria-controls="emsPanel" aria-label="開啟 EMS 醫療工具" title="EMS 醫療工具">${ICON_PULSE}${ICON_CLOSE}</button>`;
  document.body.appendChild(root);

  const fab = $('#emsFab'), panel = $('#emsPanel');
  let isOpen = false, activeTab = 'treat';

  /* ---------- 開關與分頁 ---------- */
  function openPanel() {
    isOpen = true;
    panel.classList.add('is-open');
    fab.setAttribute('aria-expanded', 'true');
    fab.setAttribute('aria-label', '關閉 EMS 醫療工具');
    panel.focus({ preventScroll: true });
    renderSteps();
  }
  function closePanel() {
    const hadFocus = panel.contains(document.activeElement);
    isOpen = false;
    panel.classList.remove('is-open');
    fab.setAttribute('aria-expanded', 'false');
    fab.setAttribute('aria-label', '開啟 EMS 醫療工具');
    if (hadFocus) fab.focus({ preventScroll: true });
  }
  fab.addEventListener('click', () => (isOpen ? closePanel() : openPanel()));
  $('#emsClose').addEventListener('click', closePanel);

  function setTab(id, focusTab) {
    activeTab = id;
    $$('.ems-tab').forEach(b => {
      const on = b.dataset.tab === id;
      b.setAttribute('aria-selected', on);
      b.tabIndex = on ? 0 : -1;
      if (on && focusTab) b.focus();
    });
    $$('.ems-pane').forEach(p => p.classList.toggle('is-active', p.id === 'emsPane-' + id));
    if (id === 'treat') renderSteps();
  }
  $('.ems-tabs').addEventListener('click', e => {
    const b = e.target.closest('.ems-tab'); if (b) setTab(b.dataset.tab);
  });
  $('.ems-tabs').addEventListener('keydown', e => {
    const ids = TABS.map(t => t.id), i = ids.indexOf(activeTab);
    let n = null;
    if (e.key === 'ArrowRight') n = (i + 1) % ids.length;
    else if (e.key === 'ArrowLeft') n = (i - 1 + ids.length) % ids.length;
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = ids.length - 1;
    if (n === null) return;
    e.preventDefault(); setTab(ids[n], true);
  });

  /* =====================================================
     1. 醫療 /me 主控台
     ===================================================== */
  const search = $('#emsSearch'), injuryBox = $('#emsInjuries'), stepBox = $('#emsSteps'), statusTreat = $('#emsStatus-treat');
  let currentInjuryKey = 'fracture_surgery';
  let currentStepIndex = 0;
  let filteredKeys = Object.keys(treatmentMessages);

  const isDivider = t => t.startsWith('----');
  function skipDivider() {
    const steps = (treatmentMessages[currentInjuryKey] || {}).steps || [];
    if (steps[currentStepIndex] && isDivider(steps[currentStepIndex])) currentStepIndex++;
  }

  function renderInjuries() {
    injuryBox.innerHTML = '';
    if (!filteredKeys.length) { injuryBox.innerHTML = '<div class="ems-empty">找不到符合的傷勢。</div>'; return; }
    filteredKeys.forEach(key => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'ems-item';
      b.textContent = treatmentMessages[key].name;
      if (key === currentInjuryKey) b.setAttribute('aria-current', 'true');
      b.addEventListener('click', () => selectInjury(key));
      injuryBox.appendChild(b);
    });
  }
  function selectInjury(key) {
    currentInjuryKey = key; currentStepIndex = 0;
    renderInjuries(); skipDivider(); renderSteps();
  }
  function renderSteps() {
    stepBox.innerHTML = '';
    const data = treatmentMessages[currentInjuryKey];
    if (!data) return;
    let nextEl = null;

    data.steps.forEach((text, index) => {
      if (isDivider(text)) {
        const d = document.createElement('div');
        d.className = 'ems-divider';
        d.textContent = text.replace(/^-+\s*|\s*-+$/g, '');
        stepBox.appendChild(d);
        return;
      }
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'ems-step';
      if (index === currentStepIndex) { b.classList.add('is-next'); nextEl = b; }
      if (index < currentStepIndex) b.classList.add('is-done');
      const label = document.createElement('span'); label.textContent = text;
      const badge = document.createElement('span'); badge.className = 'ems-badge';
      badge.textContent = index === currentStepIndex ? 'ENTER 複製' : (index < currentStepIndex ? '已複製' : '點擊複製');
      b.append(label, badge);
      b.addEventListener('click', () => {
        copyWithStatus(text, statusTreat);
        currentStepIndex = index + 1; skipDivider(); renderSteps();
      });
      stepBox.appendChild(b);
    });

    if (data.note) {
      const d = document.createElement('div');
      d.className = 'ems-divider ems-divider--note';
      d.textContent = '醫囑與注意事項（純口述內容）';
      const n = document.createElement('div');
      n.className = 'ems-note';
      n.textContent = '💡 ' + data.note;
      stepBox.append(d, n);
    }
    if (nextEl && isOpen && activeTab === 'treat') nextEl.scrollIntoView({ block: 'nearest' });
  }

  search.addEventListener('input', () => {
    const q = search.value.toLowerCase().trim();
    filteredKeys = Object.keys(treatmentMessages).filter(k => treatmentMessages[k].name.toLowerCase().includes(q) || k.includes(q));
    renderInjuries();
    if (filteredKeys.length && !filteredKeys.includes(currentInjuryKey)) selectInjury(filteredKeys[0]);
  });

  /* ---------- 鍵盤快捷鍵（只在工具開著時啟用）---------- */
  let busyEnter = false;
  document.addEventListener('keydown', e => {
    if (!isOpen) return;
    if (e.key === 'Escape') { closePanel(); return; }
    if (activeTab !== 'treat' || e.ctrlKey || e.metaKey || e.altKey) return;

    const a = document.activeElement;
    if (a !== document.body && !panel.contains(a)) return;   // 焦點在別處就不攔截

    if (a === search) {
      const i = filteredKeys.indexOf(currentInjuryKey);
      if (!filteredKeys.length) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); selectInjury(filteredKeys[(i + 1) % filteredKeys.length]); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); selectInjury(filteredKeys[(i - 1 + filteredKeys.length) % filteredKeys.length]); }
      else if (e.key === 'Enter') { e.preventDefault(); search.blur(); }
      return;
    }
    const typing = a && (/^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName) || a.isContentEditable);
    if (typing) return;

    if (e.key.toLowerCase() === 'f') { e.preventDefault(); search.focus(); search.select(); return; }

    // Enter：複製下一步。焦點在按鈕/連結時，讓 Enter 維持原本的「按下按鈕」行為
    if (e.key === 'Enter' && !e.shiftKey && !(a && /^(BUTTON|A)$/.test(a.tagName))) {
      e.preventDefault();
      if (busyEnter) return;
      const data = treatmentMessages[currentInjuryKey];
      if (!data) return;
      busyEnter = true;
      if (currentStepIndex < data.steps.length) {
        copyWithStatus(data.steps[currentStepIndex], statusTreat);
        currentStepIndex++; skipDivider(); renderSteps();
      } else {
        flash(statusTreat, '✨ 本輪處置與醫囑已全部完成！按 F 搜尋下一單。');
      }
      setTimeout(() => { busyEnter = false; }, 200);
    }
  });

  /* =====================================================
     2. SOAP 病例小助手
     ===================================================== */
  const soapStatus = $('#emsStatus-soap'), resultBox = $('#emsResult'), outEl = $('#emsOut');

  function generateReport() {
    const sVal = $('#emsS').value.trim() || '患處疼痛';
    const reason = $('#emsReason').value;
    const raw = $$('select[name="emsPart"]').filter(s => s.value !== '').map(s => ({ part: s.dataset.part, type: s.value }));
    if (!raw.length) { flash(soapStatus, '❌ 請至少選擇一個受傷部位的傷勢！', true); return; }

    const extraTreats = $$('input[name="emsExtra"]:checked').map(cb => cb.value);

    // 同類型傷勢自動歸納合併
    const grouped = {};
    raw.forEach(inj => { (grouped[inj.type] = grouped[inj.type] || []).push(inj.part); });

    const aTexts = [], oTexts = [], pSteps = new Set(), eduSet = new Set();
    for (const type in grouped) {
      const parts = grouped[type].join('、');
      aTexts.push(`${parts}${type}`);
      oTexts.push(getClinicalSign(parts, type));
      (MEDICAL_DATA.pLibrary[type] || []).forEach(s => pSteps.add(s));
      if (MEDICAL_DATA.eLibrary && MEDICAL_DATA.eLibrary[type]) eduSet.add(`【${parts}${type}】${MEDICAL_DATA.eLibrary[type]}`);
    }
    extraTreats.forEach(t => pSteps.add(t));
    if (extraTreats.length) eduSet.add('請留意疫苗接種處有無紅腫熱痛，如有過敏反應請立即回診。');

    const edu = eduSet.size ? Array.from(eduSet).join('；') : '請遵照醫囑休息，如有不適隨時回診。';
    const action = Array.from(pSteps).join(' → ');
    const reasonText = reason ? ` (原因：${reason})` : '';
    outEl.textContent = `S：主訴${sVal}\nO：檢查發現${oTexts.join('；')}\nA：${aTexts.join(' 合併 ')}${reasonText}\nP：${action}\n(衛教：${edu})`;

    resultBox.hidden = false;
    resultBox.classList.remove('slide-in'); void resultBox.offsetWidth; resultBox.classList.add('slide-in');
    resultBox.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' });
  }
  function resetReport() {
    $('#emsS').value = ''; $('#emsReason').selectedIndex = 0;
    $$('select[name="emsPart"]').forEach(s => { s.selectedIndex = 0; });
    $$('input[name="emsExtra"]').forEach(cb => { cb.checked = false; });
    resultBox.hidden = true; outEl.textContent = ''; soapStatus.textContent = '';
  }
  $('#emsGen').addEventListener('click', generateReport);
  $('#emsReset').addEventListener('click', resetReport);
  $('#emsCopyReport').addEventListener('click', () => copyWithStatus(outEl.textContent, soapStatus, '📋 SOAP 醫療報告已成功複製，快回遊戲貼上吧！'));

  /* =====================================================
     3. 常用藥物指南
     ===================================================== */
  const catBox = $('#emsCats'), drugBody = $('#emsDrugBody'), drugStatus = $('#emsStatus-drug');
  let currentCat = DRUG_CATS[0].id;

  function renderCats() {
    catBox.innerHTML = '';
    DRUG_CATS.forEach(c => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'ems-item ems-cat'; b.dataset.cat = c.id;
      b.setAttribute('aria-pressed', c.id === currentCat);
      b.textContent = c.label;
      b.addEventListener('click', () => { currentCat = c.id; renderCats(); renderDrugs(); });
      catBox.appendChild(b);
    });
  }
  function renderDrugs() {
    drugBody.innerHTML = '';
    drugList.filter(d => d.type === currentCat).forEach(d => {
      const tr = document.createElement('tr');
      tr.tabIndex = 0;
      tr.innerHTML = `<td class="ems-drug-name">${esc(d.name)}</td><td>${esc(d.effect)}</td><td><div class="ems-term ems-me" title="${esc(d.me)}">${esc(d.me)}</div></td>`;
      const go = () => copyWithStatus(d.me, drugStatus);
      tr.addEventListener('click', go);
      tr.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
      drugBody.appendChild(tr);
    });
  }

  /* =====================================================
     4. 醫藥費計價器
     ===================================================== */
  const feePane = $('#emsPane-fee'), feeStatus = $('#emsStatus-fee');
  let feeTotal = 0;

  function calcFee() {
    const F = FEE_CONFIG;
    let total = 0;
    const rows = [];

    // 1. 掛號 / 運送
    const base = $('input[name="emsBase"]:checked', feePane);
    if (base) { const p = parseInt(base.value, 10) || 0; total += p; rows.push([base.dataset.name, p]); }

    // 2. 住院
    const sel = $('#emsStayType'), days = parseInt($('#emsStayDays').value, 10) || 0;
    const per = parseInt(sel.value, 10) || 0, sname = sel.selectedOptions[0].dataset.name;
    const stayTxt = $('#emsStayTxt');
    if (per > 0 && days > 0) {
      const cost = per * days; total += cost;
      rows.push([`${sname} (${days}天)`, cost]);
      stayTxt.textContent = `${sname} × ${days}天 (+${money(cost)})`; stayTxt.dataset.on = '1';
    } else { stayTxt.textContent = '未啟用住院'; stayTxt.dataset.on = '0'; }

    // 3. 手術（不可低於最低價）
    if ($('#emsSurgeryCb').checked) {
      let v = parseInt($('#emsSurgeryVal').value, 10) || F.surgery.min;
      if (v < F.surgery.min) v = F.surgery.min;
      total += v; rows.push([F.surgery.invoiceName, v]);
    }

    // 4. 健康檢查
    F.checks.forEach(c => {
      const cb = $(`input[data-check="${c.id}"]`, feePane);
      if (cb && cb.checked) { total += c.price; rows.push([c.invoiceName, c.price]); }
    });

    // 5. 其他服務（可自訂數量）
    F.services.forEach(v => {
      const cb = $(`input[data-service="${v.id}"]`, feePane);
      if (cb && cb.checked) {
        let qty = parseInt($(`input[data-qty="${v.id}"]`, feePane).value, 10) || 1;
        if (qty < 1) qty = 1;
        const sub = v.price * qty; total += sub;
        rows.push([`${v.invoiceName} (×${qty})`, sub]);
      }
    });

    $('#emsInvoice').innerHTML =
      '<div class="ems-inv-title">🧾 MedLink 費用動態清單</div>' +
      rows.map(([n, a]) => `<div class="ems-inv-row"><span>• ${esc(n)}</span><span>${money(a)}</span></div>`).join('') +
      `<div class="ems-inv-total">應付總計：${money(total)}</div>`;
    $('#emsTotal').textContent = `總計醫藥費：${money(total)}（點擊直接複製金額）`;
    feeTotal = total;
  }
  feePane.addEventListener('input', calcFee);
  feePane.addEventListener('change', calcFee);
  $('#emsTotal').addEventListener('click', () => {
    copyText(String(feeTotal)).then(ok => flash(feeStatus, ok ? `📋 已成功複製金額：${money(feeTotal)}！` : '❌ 複製失敗，請手動複製', !ok));
  });

  /* ---------- 初始化 ---------- */
  renderInjuries(); skipDivider(); renderSteps();
  renderCats(); renderDrugs();
  calcFee();
  setTab('treat');
})();
