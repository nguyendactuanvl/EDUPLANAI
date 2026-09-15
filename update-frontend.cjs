const fs = require('fs');

function updateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace validTypes
  content = content.replace(/const validTypes = \['application\/pdf', 'text\/plain', 'text\/csv', 'text\/html'\];/g, "const validTypes = ['application/pdf', 'text/plain', 'text/csv', 'text/html', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];");
  
  // Replace the regex match
  content = content.replace(/!\(validTypes\.includes\(fileType\)\) && !file\.name\.match\(\/\\\.\(pdf\|txt\|csv\|html\)\$\/i\)/g, "!validTypes.includes(fileType) && !file.name.match(/\\.(pdf|txt|csv|html|doc|docx)$/i)");
  content = content.replace(/!validTypes\.includes\(fileType\) && !file\.name\.match\(\/\\\.\(pdf\|txt\|csv\|html\)\$\/i\)/g, "!validTypes.includes(fileType) && !file.name.match(/\\.(pdf|txt|csv|html|doc|docx)$/i)");
  
  // Replace the alert message
  content = content.replace(/alert\(`File "\$\{file\.name\}" không được hỗ trợ.*?PDF trước khi tải lên\.`\);/g, "alert(`File \"${file.name}\" không được hỗ trợ. Trí tuệ nhân tạo (AI) hiện tại chỉ đọc được định dạng PDF, TXT, CSV, HTML, DOC, DOCX.`);");
  
  // Replace the input accept attribute for LessonPlan
  content = content.replace(/accept="\.pdf,\.txt,\.csv,\.html"/g, 'accept=".pdf,.txt,.csv,.html,.doc,.docx"');

  fs.writeFileSync(filePath, content);
}

updateFile('src/pages/LessonPlan.tsx');
updateFile('src/pages/EducationalPlan.tsx');
