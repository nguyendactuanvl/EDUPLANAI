const fs = require('fs');
let code = fs.readFileSync('api/index.ts', 'utf8');

// The replacement was too aggressive earlier or failed, let's just make it exact
code = code.replace(/\\\\\\usetikzlibrary/g, '\\\\usetikzlibrary');
code = code.replace(/\\\\usetikzlibrary/g, '\\\\\\\\usetikzlibrary'); // JSON string escaping needs \\ to output \ in the template literal, but it's a template literal so \\ is enough. Wait, it's a template string `...`. So to get \u, we need \\u to not escape u.

code = code.replace(/\\usetikzlibrary/g, '\\\\usetikzlibrary');
fs.writeFileSync('api/index.ts', code);
