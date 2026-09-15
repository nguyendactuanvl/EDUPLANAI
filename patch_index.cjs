const fs = require('fs');
let content = fs.readFileSync('index.html', 'utf8');
content = content.replace(
  '</head>',
  '    <link rel="stylesheet" type="text/css" href="https://tikzjax.com/v1/fonts.css">\n    <script src="https://tikzjax.com/v1/tikzjax.js" defer></script>\n  </head>'
);
fs.writeFileSync('index.html', content);
console.log("Updated index.html");
