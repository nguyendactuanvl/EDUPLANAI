const fs = require('fs');
const files = ['src/pages/LessonPlan.tsx', 'src/pages/Worksheets.tsx', 'src/pages/ExerciseSolver.tsx', 'src/pages/PdfToWord.tsx'];
for (const file of files) {
  if (fs.existsSync(file)) {
    let code = fs.readFileSync(file, 'utf8');
    // I need to change disabled={!exportRef.current} to disabled={!suggestion} or whatever it was
    // For PdfToWord, it might be disabled={!result}
    code = code.replace(/disabled=\{\!exportRef\.current\}/g, file.includes('PdfToWord') ? "disabled={!result}" : "disabled={!suggestion}");
    fs.writeFileSync(file, code);
  }
}
console.log("Fixed disabled state");
