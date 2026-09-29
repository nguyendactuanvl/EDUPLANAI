const fs = require('fs');
let content = fs.readFileSync('src/pages/ExamGenerator.tsx', 'utf8');
content = content.replace(/<\/div>\s*<\/div>\s*\)\s*\}\s*<\/div>\s*\);\s*\}\s*$/m, '</div></div>)}</div>);}\n');
fs.writeFileSync('src/pages/ExamGenerator.tsx', content);
