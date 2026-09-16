const fs = require('fs');

const files = [
  { path: 'src/pages/Worksheets.tsx', 
    oldRegex: /const blob = await pres\.write\(\{ outputType: "blob" \}\);[\s\S]*?window\.URL\.revokeObjectURL\(url\);/, 
    newStr: 'const base64 = await pres.write({ outputType: "base64" });\n      const url = "data:application/vnd.openxmlformats-officedocument.presentationml.presentation;base64," + base64;\n      const a = document.createElement("a");\n      a.href = url;\n      a.download = safeFileName;\n      document.body.appendChild(a);\n      a.click();\n      document.body.removeChild(a);' 
  },
  { path: 'src/pages/ExerciseSolver.tsx', 
    oldRegex: /const blob = await pres\.write\(\{ outputType: "blob" \}\);[\s\S]*?window\.URL\.revokeObjectURL\(url\);/, 
    newStr: 'const base64 = await pres.write({ outputType: "base64" });\n      const url = "data:application/vnd.openxmlformats-officedocument.presentationml.presentation;base64," + base64;\n      const a = document.createElement("a");\n      a.href = url;\n      a.download = `LoiGiai_${new Date().getTime()}.pptx`;\n      document.body.appendChild(a);\n      a.click();\n      document.body.removeChild(a);' 
  }
];

for (const file of files) {
  let content = fs.readFileSync(file.path, 'utf8');
  content = content.replace(file.oldRegex, file.newStr);
  fs.writeFileSync(file.path, content);
}
console.log("Patched PPTX download to base64");
