const fs = require('fs');
let content = fs.readFileSync('api/index.ts', 'utf8');

content = content.replace(
  'const models = ["gemini-1.5-flash", "gemini-1.5-flash-8b", "gemini-1.5-pro"];',
  'const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-pro", "gemini-flash"];'
);

fs.writeFileSync('api/index.ts', content);
console.log("Updated model order with 2026 models");
