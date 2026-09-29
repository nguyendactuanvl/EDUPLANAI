const fs = require('fs');
let code = fs.readFileSync('src/pages/ExamGenerator.tsx', 'utf8');

code = code.replaceAll(
    "{q.correctAnswer || ''}", 
    "{fixMath(q.correctAnswer || '')}"
);

fs.writeFileSync('src/pages/ExamGenerator.tsx', code);
