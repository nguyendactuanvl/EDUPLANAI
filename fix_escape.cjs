const fs = require('fs');
let code = fs.readFileSync('api/index.ts', 'utf8');

// Replace \x with \\x in that specific line, also \\fill, \\coordinate
code = code.replace(/\\coordinate/g, '\\\\coordinate');
code = code.replace(/\\fill/g, '\\\\fill');
code = code.replace(/plot \(\\x/g, 'plot (\\\\x');
code = code.replace(/-a\*\\x/g, '-a*\\\\x');

fs.writeFileSync('api/index.ts', code);
console.log('Fixed escapes in api/index.ts');
