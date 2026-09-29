const fs = require('fs');
let content = fs.readFileSync('api/index.ts', 'utf8');

content = content.replace(
  'const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-flash-8b"];',
  'const models = ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-1.5-flash-8b"];'
);

// Also let's make the catch block more robust to continue on 400 if it says 'is not found'
content = content.replace(
  'if (errorMsg.includes("not found") || status === 404) {',
  'if (errorMsg.includes("not found") || status === 404 || errorMsg.includes("is not found") || errorMsg.includes("not exist") || status === 400) {'
);

fs.writeFileSync('api/index.ts', content);
console.log("Updated fallback models to realistic ones");
