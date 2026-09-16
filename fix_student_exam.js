const fs = require('fs');
let code = fs.readFileSync('src/pages/StudentExamView.tsx', 'utf8');

code = code.replace(
    "{stmt.statement || ''}", 
    "{fixMath(stmt.statement || '')}"
);
code = code.replace(
    "{q.content || ''}", 
    "{fixMath(q.content || '')}"
);
code = code.replace(
    "{(opt || '').replace(/^[A-D][\\.\\:\\)]\\s*/i, '')}", 
    "{fixMath((opt || '').replace(/^[A-D][\\.\\:\\)]\\s*/i, ''))}"
);
fs.writeFileSync('src/pages/StudentExamView.tsx', code);
