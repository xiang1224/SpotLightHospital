/* 守門員：放在受保護頁面的 <head>，沒登入就導向登入頁。 */
if (!Auth.current()) location.replace('login.html');
