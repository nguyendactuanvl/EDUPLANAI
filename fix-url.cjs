const fs = require('fs');
let content = fs.readFileSync('src/pages/ExamGenerator.tsx', 'utf8');

content = content.replace(
  "const url = \\`\\${window.location.origin}/?examData=\\${compressed}\\`;",
  "const url = `${window.location.origin}/?examData=${compressed}`;"
);

fs.writeFileSync('src/pages/ExamGenerator.tsx', content);
console.log("Fixed url in ExamGenerator.tsx");
