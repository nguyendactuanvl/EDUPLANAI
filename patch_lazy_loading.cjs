const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

// Replace standard imports with React.lazy
const importsToReplace = [
  'EducationalPlan', 'LessonPlan', 'Circulars', 'HistoryPage', 'Worksheets', 
  'ExerciseSolver', 'PdfToWord', 'ExamGenerator', 'StudentExamView', 
  'ClassMap', 'HomeroomManagement', 'WeeklyTimetable', 'Gamification'
];

importsToReplace.forEach(component => {
  const regex = new RegExp(`import { ${component} } from "([^"]+)";`);
  if (code.match(regex)) {
    code = code.replace(regex, `const ${component} = React.lazy(() => import("$1").then(module => ({ default: module.${component} })));`);
  } else {
    const regex2 = new RegExp(`import { ${component} } from '([^']+)';`);
    if (code.match(regex2)) {
      code = code.replace(regex2, `const ${component} = React.lazy(() => import('$1').then(module => ({ default: module.${component} })));`);
    }
  }
});

// Add import React, { Suspense } if not exists
if (!code.includes('import React')) {
  code = code.replace('import { useState', 'import React, { useState, Suspense');
} else if (!code.includes('Suspense')) {
  code = code.replace('useState,', 'useState, Suspense,');
}

// Wrap the main routes with Suspense
code = code.replace('<div className="flex-1 overflow-y-auto relative w-full h-full">', '<div className="flex-1 overflow-y-auto relative w-full h-full">\n          <Suspense fallback={<div className="flex items-center justify-center h-full text-slate-500">Đang tải...</div>}>');

code = code.replace('</div>\n      </main>', '          </Suspense>\n        </div>\n      </main>');

// Wrap StudentExamView with Suspense as well since it's rendered early
code = code.replace('return <StudentExamView examId={studentExamId} />;', 'return <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-100">Đang tải đề thi...</div>}><StudentExamView examId={studentExamId} /></Suspense>;');
code = code.replace('return <StudentExamView examRawData={studentExamData} />;', 'return <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-100">Đang tải đề thi...</div>}><StudentExamView examRawData={studentExamData} /></Suspense>;');


fs.writeFileSync('src/App.tsx', code);
console.log("Patched App.tsx with lazy loading");
