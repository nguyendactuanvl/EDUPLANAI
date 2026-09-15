const fs = require('fs');
let content = fs.readFileSync('src/pages/ExamGenerator.tsx', 'utf8');
content = content.replace('  1421\t      )}\n  1422\t    </div>\n  1423\t  );\n  1424\t}', ''); // oops I can't do this easily. I'll just remove the last `}`.
content = content.substring(0, content.lastIndexOf('}'));
fs.writeFileSync('src/pages/ExamGenerator.tsx', content);
