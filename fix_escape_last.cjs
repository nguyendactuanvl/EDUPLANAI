const fs = require('fs');
let code = fs.readFileSync('api/index.ts', 'utf8');
code = code.replace(/\\\\\\\\\\usetikzlibrary/g, '\\\\usetikzlibrary');
code = code.replace(/\\\\\\usetikzlibrary/g, '\\\\usetikzlibrary');
code = code.replace(/\\\\usetikzlibrary/g, '\\\\usetikzlibrary'); // Ensure it's strictly \usetikzlibrary in the string, which is \\usetikzlibrary in JS string
code = code.replace(/\\usetikzlibrary/g, '\\\\usetikzlibrary');
fs.writeFileSync('api/index.ts', code);
