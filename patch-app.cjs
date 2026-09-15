const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  "const studentExamId = urlParams.get('examId');",
  "const studentExamId = urlParams.get('examId');\n  const studentExamData = urlParams.get('examData');"
);

content = content.replace(
  "if (studentExamId) {\n    return <StudentExamView examId={studentExamId} />;\n  }",
  "if (studentExamId) {\n    return <StudentExamView examId={studentExamId} />;\n  }\n  if (studentExamData) {\n    return <StudentExamView examRawData={studentExamData} />;\n  }"
);

fs.writeFileSync('src/App.tsx', content);
console.log("Patched src/App.tsx");
