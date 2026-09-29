const fs = require('fs');

const files = [
  'src/pages/LessonPlan.tsx',
  'src/pages/Worksheets.tsx',
  'src/pages/ExerciseSolver.tsx',
  'src/lib/exportUtils.ts'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/a\.download =/g, 'a.target = "_blank";\n      a.download =');
  content = content.replace(/fileDownload\.download =/g, 'fileDownload.target = "_blank";\n    fileDownload.download =');
  fs.writeFileSync(file, content);
}
console.log("Added target='_blank' to all downloads");
