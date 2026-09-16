const fs = require('fs');

const fixFile = (file) => {
  if (!fs.existsSync(file)) return;
  let code = fs.readFileSync(file, 'utf8');
  code = code.replace(/\`\$\{(GiaoAn_\$\{.*?\}|PhieuHocTap_\$\{.*?\}|LoiGiai_\$\{.*?\}|TaiLieu_DaChuyenDoi_\$\{.*?\})\}_/g, '`$1_');
  fs.writeFileSync(file, code);
};

fixFile('src/pages/LessonPlan.tsx');
fixFile('src/pages/Worksheets.tsx');
fixFile('src/pages/ExerciseSolver.tsx');
fixFile('src/pages/PdfToWord.tsx');
console.log("Syntax fixed");
