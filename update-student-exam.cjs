const fs = require('fs');
let content = fs.readFileSync('src/pages/StudentExamView.tsx', 'utf8');
content = content.replace('useState<Record<number, number>>({})', 'useState<Record<number, any>>({})');
fs.writeFileSync('src/pages/StudentExamView.tsx', content);
