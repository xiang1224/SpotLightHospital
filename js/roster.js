/* =====================================================
   ★ 登入設定：名單、密碼、提示都改這裡 ★
   ===================================================== */
const AUTH = {
  // 通用密碼：名冊裡沒有寫 password 的人，就用這個
  PASSWORD: '123',

  // 同一個編號密碼輸入錯誤「超過」幾次，才會出現第二階段提示
  // （3 = 錯到第 4 次起解鎖；想改成錯 3 次就解鎖，把這裡改成 2）
  HINT2_AFTER: 3,

  // 登入成功時顯示的無線電代碼
  ONLINE_CODE: '10-41',

  // 登入狀態存放的名稱（一般不用改）
  STORAGE_KEY: 'spotlight_session',

  // 醫護名冊（登入名單與「成員組成」頁共用，改這裡兩邊都會更新）
  //   code = 醫護編碼（填文字）、name = 名字、role = 職稱、spec = 專科（可多個，沒有就留空 []）
  //   photo = 自己的照片（選填）。沒填就自動用 images/members/醫編.jpg，找不到才顯示預設頭像
  //   password = 這個人的專屬密碼（不分大小寫）；沒寫就用上面的通用密碼
  //   hints = ['第一階段提示', '第二階段提示']；沒寫就不顯示提示
  ROSTER: [
    {
      code: '915', name: '溫書玥', role: '院長', spec: ['骨科'],
      password: 'eating', hints: ['做最慢的事情', '夏雨姍常常催促的事情']
    },
    {
      code: '955', name: '夏雨姍', role: '副院長', spec: ['急診外科', '胸腔外科'],
      password: 'umbrella', hints: ['下雨會用到的東西', '需要撐開']
    },
    {
      code: '911', name: '天逸', role: '主任', spec: ['神經外科', '心臟外科'],
      password: 'family', hints: ['想逃離也想證明的地方', '全家就是你家']
    },
    {
      code: '966', name: '高荸梓', role: '督導', spec: ['心理專科'],
      password: 'strawberry', hints: ['你的第一個醬', '可以在脖子上']
    },
    {
      code: '920', name: '黃曉翔', role: '督導', spec: ['胸腔外科'],
      password: 'tomato', hints: ['綽號的英文', '沾薯條']
    },
    {
      code: '942', name: '夏念', role: '專科醫師', spec: ['心理專科'],
      password: 'sunshine', hints: ['重要事物的名字', '娃娃的名字']
    },
    {
      code: '945', name: '哈特．沃爾特', role: '專科醫師', spec: ['法醫專科'],
      password: 'DID', hints: ['相伴一生的自己', '醫學簡寫']
    },
    {
      code: '919', name: '陶樂比', role: '專科醫師', spec: ['急診外科'],
      password: 'gunshot', hints: ['跟夏雨姍的起源', '你的第一個重傷']
    },
    {
      code: '964', name: '韓若言', role: '專科醫師', spec: ['毒物專科'],
      password: 'husky', hints: ['笨狗', '一種狗的品種']
    },
    {
      code: '905', name: '成恩熙', role: '主治醫師', spec: ['不分科'],
      password: 'overheat', hints: ['考試嗎', '腦袋常常?']
    },
    {
      code: '924', name: '白玄宇', role: '住院醫師', spec: ['不分科'],
      password: 'trainee', hints: ['還在菜', '你的職位']
    },
    // 合作單位人員：加上 org（所屬單位），會顯示在「合作單位」分組
    {
      code: '418', name: '凱莉．卡特', role: '一級警司', org: '高洛波塔分局', spec: [],
      password: 'ICU', hints: ['你第二個家', '你常躺的區域']
    },
    // 露娜：記事本沒有她的密碼，先用通用密碼、沒有提示。要加的話補上 password 和 hints 就好
    { code: '412', name: '露娜．羅西爾', role: '實習警員', org: '高洛波塔分局', spec: [] }
  ]
};