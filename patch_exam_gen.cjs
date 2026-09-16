const fs = require('fs');
let code = fs.readFileSync('src/pages/ExamGenerator.tsx', 'utf8');

// Replace all `<Markdown ... >` with `<MarkdownRenderer content={...} />` ?
// First let's just fix the rehypeKatex crash.
code = code.replace(/rehypePlugins=\{\[rehypeKatex\]\}/g, "rehypePlugins={[[rehypeKatex, { strict: false, throwOnError: false }]]}");
fs.writeFileSync('src/pages/ExamGenerator.tsx', code);
console.log("Patched ExamGenerator.tsx");
