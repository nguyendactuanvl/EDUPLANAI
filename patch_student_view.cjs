const fs = require('fs');
let code = fs.readFileSync('src/pages/StudentExamView.tsx', 'utf8');

code = code.replace(/rehypePlugins=\{\[rehypeKatex\]\}/g, "rehypePlugins={[[rehypeKatex, { strict: false, throwOnError: false }]]}");
fs.writeFileSync('src/pages/StudentExamView.tsx', code);
console.log("Patched StudentExamView.tsx");
