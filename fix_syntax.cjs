const fs = require('fs');
let code = fs.readFileSync('api/index.ts', 'utf8');

const oldLine = "+ Phải dùng hàm giải tích chuẩn (ví dụ: \\draw[domain=..., samples=100] plot (\\x, {hàm_số})).";
const newLine = "+ Phải dùng hàm giải tích chuẩn (ví dụ: \\draw[domain=..., samples=100] plot (\\x, \\{hàm_số\\})).";

code = code.replace(oldLine, newLine);
fs.writeFileSync('api/index.ts', code);
console.log("Fixed syntax");
