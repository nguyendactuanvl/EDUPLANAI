const fs = require('fs');
let code = fs.readFileSync('src/lib/exportUtils.ts', 'utf8');

code = code.replace('"data:image/svg+xml;base64,"', '"data:image/svg;base64,"');

fs.writeFileSync('src/lib/exportUtils.ts', code);
console.log("Patched exportUtils.ts for SVG MIME type");
