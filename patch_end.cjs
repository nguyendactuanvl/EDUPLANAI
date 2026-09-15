const fs = require('fs');
let content = fs.readFileSync('src/pages/ExamGenerator.tsx', 'utf8');
content += '\n}';
fs.writeFileSync('src/pages/ExamGenerator.tsx', content);
