const fs = require('fs');
let content = fs.readFileSync('src/types.ts', 'utf8');
content = content.replace('grade: number;', 'grade: number;\n  subject?: string;');
fs.writeFileSync('src/types.ts', content);
