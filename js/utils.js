/* 小工具：產生佔位圖與頭像。圖片欄位留空時會自動呼叫這裡。 */

// 產生佔位圖（心電圖風格）
function ph(label, hue){
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 675'>
  <defs>
    <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='hsl(${hue} 45% 24%)'/><stop offset='1' stop-color='hsl(${(hue+45)%360} 55% 9%)'/></linearGradient>
    <radialGradient id='l' cx='72%' cy='24%' r='55%'><stop offset='0' stop-color='hsl(${hue} 85% 72%)' stop-opacity='.38'/><stop offset='1' stop-color='hsl(${hue} 85% 72%)' stop-opacity='0'/></radialGradient>
  </defs>
  <rect width='1200' height='675' fill='url(#g)'/><rect width='1200' height='675' fill='url(#l)'/>
  <path d='M0 470 H360 L400 390 L450 560 L505 430 L545 470 H1200' fill='none' stroke='hsl(${hue} 70% 78%)' stroke-opacity='.3' stroke-width='4' stroke-linejoin='round'/>
  <text x='60' y='620' fill='#ffffff' fill-opacity='.85' font-size='42' font-family='sans-serif'>${label}</text></svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}
// 產生頭像（取名字第一個字）
function avatar(name, hue){
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='hsl(${hue} 45% 34%)'/><text x='50' y='66' text-anchor='middle' font-size='46' fill='#fff' font-family='serif' font-weight='700'>${name[0]}</text></svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}
