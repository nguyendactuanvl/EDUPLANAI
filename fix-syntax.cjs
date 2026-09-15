const fs = require('fs');
let content = fs.readFileSync('api/index.ts', 'utf8');

content = content.replace(
  'CÚ PHÁP LaTeX `array`',
  'CÚ PHÁP LaTeX array'
);

fs.writeFileSync('api/index.ts', content);
console.log("Fixed syntax error");
