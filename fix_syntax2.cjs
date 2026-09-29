const fs = require('fs');
let code = fs.readFileSync('api/index.ts', 'utf8');

code = code.replace(/\\x, \\{hàm_số\\}/g, "\\\\x, \\{hàm_số\\}");
code = code.replace(/\\x, {hàm_số}/g, "\\\\x, \\{hàm_số\\}");

fs.writeFileSync('api/index.ts', code);
console.log("Fixed syntax 2");
