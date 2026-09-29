const fs = require('fs');
let config = fs.readFileSync('vite.config.ts', 'utf8');
config = config.replace(/define: \{\n\s*'process\.versions\.node': 'false',\n\s*\},\n\s*/, '');
fs.writeFileSync('vite.config.ts', config);
console.log("Reverted vite.config.ts");
