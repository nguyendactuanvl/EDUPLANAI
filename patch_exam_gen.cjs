const fs = require('fs');
let code = fs.readFileSync('src/pages/ExamGenerator.tsx', 'utf8');

code = code.replace(/q\.content \|\| q\.question \|\| q\.text/g, "q.content || (q as any).question || (q as any).text");

fs.writeFileSync('src/pages/ExamGenerator.tsx', code);
