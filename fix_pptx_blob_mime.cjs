const fs = require('fs');

const files = [
  { path: 'src/pages/LessonPlan.tsx', 
    oldRegex: /const base64 = await pres\.write\(\{ outputType: "base64" \}\);[\s\S]*?document\.body\.removeChild\(a\);/, 
    newStr: 'const rawBlob = await pres.write({ outputType: "blob" });\n      const blob = new Blob([rawBlob as Blob], { type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" });\n      const url = window.URL.createObjectURL(blob);\n      const a = document.createElement("a");\n      a.href = url;\n      a.download = `BaiGiang_${fileName.replace(/\\s+/g, \'_\')}.pptx`;\n      document.body.appendChild(a);\n      a.click();\n      document.body.removeChild(a);\n      window.URL.revokeObjectURL(url);' 
  },
  { path: 'src/pages/Worksheets.tsx', 
    oldRegex: /const base64 = await pres\.write\(\{ outputType: "base64" \}\);[\s\S]*?document\.body\.removeChild\(a\);/, 
    newStr: 'const rawBlob = await pres.write({ outputType: "blob" });\n      const blob = new Blob([rawBlob as Blob], { type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" });\n      const url = window.URL.createObjectURL(blob);\n      const a = document.createElement("a");\n      a.href = url;\n      a.download = safeFileName;\n      document.body.appendChild(a);\n      a.click();\n      document.body.removeChild(a);\n      window.URL.revokeObjectURL(url);' 
  },
  { path: 'src/pages/ExerciseSolver.tsx', 
    oldRegex: /const base64 = await pres\.write\(\{ outputType: "base64" \}\);[\s\S]*?document\.body\.removeChild\(a\);/, 
    newStr: 'const rawBlob = await pres.write({ outputType: "blob" });\n      const blob = new Blob([rawBlob as Blob], { type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" });\n      const url = window.URL.createObjectURL(blob);\n      const a = document.createElement("a");\n      a.href = url;\n      a.download = `LoiGiai_${new Date().getTime()}.pptx`;\n      document.body.appendChild(a);\n      a.click();\n      document.body.removeChild(a);\n      window.URL.revokeObjectURL(url);' 
  }
];

for (const file of files) {
  let content = fs.readFileSync(file.path, 'utf8');
  content = content.replace(file.oldRegex, file.newStr);
  fs.writeFileSync(file.path, content);
}
console.log("Patched PPTX download to Blob with correct MIME");
