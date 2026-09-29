const fs = require('fs');
let code = fs.readFileSync('src/pages/LessonPlan.tsx', 'utf8');

code = code.replace(
  /const blob = await pres\.write\(\{ outputType: "blob" \}\);\s*const url = window\.URL\.createObjectURL\(blob as Blob\);\s*const a = document\.createElement\("a"\);\s*a\.href = url;\s*a\.download = `BaiGiang_\$\{fileName\.replace\(\/\\s\+\/g, '_'\)\}\.pptx`;\s*document\.body\.appendChild\(a\);\s*a\.click\(\);\s*document\.body\.removeChild\(a\);\s*window\.URL\.revokeObjectURL\(url\);/g,
  `const base64 = await pres.write({ outputType: "base64" });
      const url = "data:application/vnd.openxmlformats-officedocument.presentationml.presentation;base64," + base64;
      const a = document.createElement("a");
      a.href = url;
      a.download = \`BaiGiang_\${fileName.replace(/\\s+/g, '_')}.pptx\`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);`
);

fs.writeFileSync('src/pages/LessonPlan.tsx', code);
console.log("Updated LessonPlan");
