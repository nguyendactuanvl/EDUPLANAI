const fs = require('fs');

const files = [
  { path: 'src/pages/LessonPlan.tsx', oldStr: 'await pres.writeFile({ fileName: `BaiGiang_${fileName.replace(/\\s+/g, \'_\')}.pptx` });', newStr: 'const blob = await pres.write({ outputType: "blob" });\n      const url = window.URL.createObjectURL(blob as Blob);\n      const a = document.createElement("a");\n      a.href = url;\n      a.download = `BaiGiang_${fileName.replace(/\\s+/g, \'_\')}.pptx`;\n      document.body.appendChild(a);\n      a.click();\n      document.body.removeChild(a);\n      window.URL.revokeObjectURL(url);' },
  { path: 'src/pages/Worksheets.tsx', oldStr: 'await pres.writeFile({ fileName: safeFileName });', newStr: 'const blob = await pres.write({ outputType: "blob" });\n      const url = window.URL.createObjectURL(blob as Blob);\n      const a = document.createElement("a");\n      a.href = url;\n      a.download = safeFileName;\n      document.body.appendChild(a);\n      a.click();\n      document.body.removeChild(a);\n      window.URL.revokeObjectURL(url);' },
  { path: 'src/pages/ExerciseSolver.tsx', oldStr: 'await pres.writeFile({ fileName: `LoiGiai_${new Date().getTime()}.pptx` });', newStr: 'const blob = await pres.write({ outputType: "blob" });\n      const url = window.URL.createObjectURL(blob as Blob);\n      const a = document.createElement("a");\n      a.href = url;\n      a.download = `LoiGiai_${new Date().getTime()}.pptx`;\n      document.body.appendChild(a);\n      a.click();\n      document.body.removeChild(a);\n      window.URL.revokeObjectURL(url);' }
];

for (const file of files) {
  let content = fs.readFileSync(file.path, 'utf8');
  content = content.replace(file.oldStr, file.newStr);
  fs.writeFileSync(file.path, content);
}
console.log("Patched PPTX download");
