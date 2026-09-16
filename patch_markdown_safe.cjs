const fs = require('fs');

function patchFile(file) {
  let code = fs.readFileSync(file, 'utf8');
  code = code.replace(/>\{q\.content\}<\/Markdown>/g, ">{q.content || ''}</Markdown>");
  code = code.replace(/>\{stmt\.statement\}<\/Markdown>/g, ">{stmt.statement || ''}</Markdown>");
  code = code.replace(/>\{q\.correctAnswer\}<\/Markdown>/g, ">{q.correctAnswer || ''}</Markdown>");
  // opt is string, but just in case
  code = code.replace(/>\{opt\.replace\((.*?)\)\}<\/Markdown>/g, ">{(opt || '').replace($1)}</Markdown>");
  fs.writeFileSync(file, code);
}

['src/pages/ExamGenerator.tsx', 'src/pages/StudentExamView.tsx'].forEach(patchFile);
console.log("Patched safety fallbacks");
