const fs = require('fs');
let content = fs.readFileSync('src/pages/ExamGenerator.tsx', 'utf8');
content = content.substring(0, content.lastIndexOf('    </div>\n  );\n}')) + '    </div>\n  );\n}';
fs.writeFileSync('src/pages/ExamGenerator.tsx', content);
