const fs = require('fs');
let content = fs.readFileSync('api/index.ts', 'utf8');

content = content.replace(
  'const models = ["gemini-2.5-flash", "gemini-1.5-flash"];',
  'const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-flash-8b"];'
);

fs.writeFileSync('api/index.ts', content);
console.log("Updated fallback models");
