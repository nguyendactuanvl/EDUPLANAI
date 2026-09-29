const fs = require('fs');
let code = fs.readFileSync('api/index.ts', 'utf8');

code = code.replace(/```xml/g, '\\`\\`\\`xml');
code = code.replace(/```svg/g, '\\`\\`\\`svg');

fs.writeFileSync('api/index.ts', code);
console.log("Fixed API system instruction escapes");
