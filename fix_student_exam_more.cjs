const fs = require('fs');
let code = fs.readFileSync('src/pages/StudentExamView.tsx', 'utf8');

code = code.replaceAll(
    "{q.correctAnswer || q.explanation || q.correct || ''}", 
    "{fixMath(q.correctAnswer || q.explanation || q.correct || '')}"
);
code = code.replaceAll(
    "{q.explanation || ''}", 
    "{fixMath(q.explanation || '')}"
);

fs.writeFileSync('src/pages/StudentExamView.tsx', code);
