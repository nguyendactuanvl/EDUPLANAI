const fs = require('fs');
let code = fs.readFileSync('src/lib/utils.ts', 'utf8');

code = code.replace(
    "if (!text) return '';",
    "if (!text) return '';\n    if (typeof text !== 'string') text = String(text);"
);

fs.writeFileSync('src/lib/utils.ts', code);
