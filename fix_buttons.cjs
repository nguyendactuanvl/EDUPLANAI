const fs = require('fs');

const replaceInFile = (file, baseNameExpr) => {
  if (!fs.existsSync(file)) return;
  let code = fs.readFileSync(file, 'utf8');

  // Replace handlers
  const handlerBlock = `
  const handleExportWordOMML = () => {
    if (!exportRef.current) return;
    exportHtmlToWord(exportRef.current, \`${baseNameExpr}_OMML.doc\`, 'omml');
  };
  const handleExportWordMathML = () => {
    if (!exportRef.current) return;
    exportHtmlToWord(exportRef.current, \`${baseNameExpr}_MathML.doc\`, 'mathml');
  };
  `;

  // We need to inject this. It's easier to just find handleExportWord and replace it.
  // Actually, I can just do a regex replace for the buttons first.
  
  // Let's replace the button group
  code = code.replace(
    /<button[^>]*title="Tải xuống Word"[^>]*>[\s\S]*?<\/button>/,
    `<button 
            className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors flex items-center gap-1"
            title="Tải Word (Chuẩn OMML - Word máy tính)"
            onClick={() => { if(exportRef.current) exportHtmlToWord(exportRef.current, \`\${${baseNameExpr}}_OMML.doc\`, 'omml'); }}
            disabled={!exportRef.current}
          >
            <Download className="h-5 w-5" />
            <span className="text-xs font-medium">OMML</span>
          </button>`
  );

  code = code.replace(
    /<button[^>]*title="Tải xuống Word \(Giữ nguyên LaTeX cho MathType\)"[^>]*>[\s\S]*?<\/button>/,
    `<button 
            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors flex items-center gap-1"
            title="Tải Word (Chuẩn MathML - Word Online/Linh hoạt)"
            onClick={() => { if(exportRef.current) exportHtmlToWord(exportRef.current, \`\${${baseNameExpr}}_MathML.doc\`, 'mathml'); }}
            disabled={!exportRef.current}
          >
            <Download className="h-5 w-5" />
            <span className="text-xs font-medium">MathML</span>
          </button>`
  );

  fs.writeFileSync(file, code);
  console.log("Updated buttons in", file);
};

// LessonPlan.tsx
replaceInFile('src/pages/LessonPlan.tsx', `GiaoAn_\${(activeTab === 'system' && selectedLesson ? selectedLesson.lesson : customLessonName).replace(/\\s+/g, '_')}`);
replaceInFile('src/pages/Worksheets.tsx', `PhieuHocTap_\${customLessonName.replace(/\\s+/g, '_')}`);
replaceInFile('src/pages/ExerciseSolver.tsx', `LoiGiai_\${new Date().getTime()}`);
replaceInFile('src/pages/PdfToWord.tsx', `TaiLieu_DaChuyenDoi_\${new Date().getTime()}`);
// ExamGenerator might be different, let's leave it or fix it manually if needed.

