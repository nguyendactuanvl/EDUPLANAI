const fs = require('fs');
let code = fs.readFileSync('src/pages/ExamGenerator.tsx', 'utf8');

// Add import if not present
if (!code.includes('import { fixMath }')) {
    code = code.replace("import { exportHtmlToWord } from '../lib/exportUtils';", "import { exportHtmlToWord } from '../lib/exportUtils';\nimport { fixMath } from '../lib/utils';");
}

code = code.replaceAll(
    "{stmt.statement || ''}", 
    "{fixMath(stmt.statement || '')}"
);
code = code.replaceAll(
    "{q.content || ''}", 
    "{fixMath(q.content || '')}"
);
code = code.replaceAll(
    "{(opt || '').replace(/^[A-D][\\.\\:\\)]\\s*/i, '')}", 
    "{fixMath((opt || '').replace(/^[A-D][\\.\\:\\)]\\s*/i, ''))}"
);
fs.writeFileSync('src/pages/ExamGenerator.tsx', code);
