const fs = require('fs');

let code = fs.readFileSync('api/index.ts', 'utf8');
code = code.replace(/\\usetikzlibrary/g, '\\\\usetikzlibrary');
code = code.replace(/\\begin\{/g, '\\\\begin{');
code = code.replace(/\\end\{/g, '\\\\end{');
code = code.replace(/\\clip/g, '\\\\clip');
fs.writeFileSync('api/index.ts', code);
console.log("Patched api/index.ts escaping");
