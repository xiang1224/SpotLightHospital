
// 產生佔位圖（心電圖風格）
function ph(label, hue) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 675'>
  <defs>
    <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='hsl(${hue} 45% 24%)'/><stop offset='1' stop-color='hsl(${(hue + 45) % 360} 55% 9%)'/></linearGradient>
    <radialGradient id='l' cx='72%' cy='24%' r='55%'><stop offset='0' stop-color='hsl(${hue} 85% 72%)' stop-opacity='.38'/><stop offset='1' stop-color='hsl(${hue} 85% 72%)' stop-opacity='0'/></radialGradient>
  </defs>
  <rect width='1200' height='675' fill='url(#g)'/><rect width='1200' height='675' fill='url(#l)'/>
  <path d='M0 470 H360 L400 390 L450 560 L505 430 L545 470 H1200' fill='none' stroke='hsl(${hue} 70% 78%)' stroke-opacity='.3' stroke-width='4' stroke-linejoin='round'/>
  <text x='60' y='620' fill='#ffffff' fill-opacity='.85' font-size='42' font-family='sans-serif'>${label}</text></svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}
// 產生頭像（取名字第一個字）
function avatar(name, hue) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='hsl(${hue} 45% 34%)'/><text x='50' y='66' text-anchor='middle' font-size='46' fill='#fff' font-family='serif' font-weight='700'>${name[0]}</text></svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

// 產生識別證佔位圖（找不到識別證圖片時顯示；side = 'front' 正面 / 'back' 背面）
function badgePh(m, side) {
  const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const svg = side === 'back'
    ? `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 2000 1256'>
  <defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#f4f7fb'/><stop offset='1' stop-color='#dfe8f2'/></linearGradient></defs>
  <rect width='2000' height='1256' fill='url(#g)'/><rect x='30' y='30' width='1940' height='1196' fill='none' stroke='#27527a' stroke-width='14'/>
  <circle cx='1000' cy='560' r='300' fill='none' stroke='#16304d' stroke-width='14'/>
  <path d='M1000 330 L1030 530 L1230 560 L1030 590 L1000 790 L970 590 L770 560 L970 530 Z' fill='#16304d'/>
  <text x='1000' y='1000' text-anchor='middle' font-size='96' font-weight='700' fill='#16304d' font-family='serif'>聚光燈醫院</text>
  <text x='1000' y='1080' text-anchor='middle' font-size='48' letter-spacing='12' fill='#16304d' font-family='sans-serif'>SPOTLIGHT HOSPITAL</text></svg>`
    : `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 2000 1256'>
  <defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#0d2a52'/><stop offset='1' stop-color='#1d5a9b'/></linearGradient></defs>
  <rect width='2000' height='1256' fill='url(#g)'/><rect x='90' y='90' width='1820' height='1076' rx='40' fill='#f4f8fd'/>
  <rect x='130' y='130' width='620' height='996' rx='24' fill='#c9d9ec'/>
  <text x='440' y='700' text-anchor='middle' font-size='320' font-weight='700' fill='#27527a' font-family='serif'>${esc(m.name[0])}</text>
  <text x='830' y='260' font-size='110' font-weight='700' fill='#10213b' font-family='serif'>聚光燈醫院</text>
  <text x='830' y='330' font-size='44' letter-spacing='10' fill='#27527a' font-family='sans-serif'>SPOTLIGHT HOSPITAL</text>
  <text x='830' y='560' font-size='170' font-weight='900' fill='#10213b' font-family='serif'>${esc(m.name)}</text>
  <text x='830' y='720' font-size='84' fill='#27527a' font-family='sans-serif'>${esc(m.role)}${m.org ? '・' + esc(m.org) : ''}</text>
  <text x='830' y='900' font-size='60' letter-spacing='6' fill='#27527a' font-family='sans-serif'>醫編 STAFF ID</text>
  <text x='830' y='1060' font-size='170' font-weight='900' fill='#10213b' font-family='sans-serif'>${esc(m.code)}</text></svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}