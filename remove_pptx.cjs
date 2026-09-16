const fs = require('fs');

function removeFunction(code, funcName) {
  const funcStartStr = `const ${funcName} = async () => {`;
  const startIndex = code.indexOf(funcStartStr);
  if (startIndex === -1) return code;
  
  let braceCount = 0;
  let endIndex = -1;
  let started = false;
  
  for (let i = startIndex; i < code.length; i++) {
    if (code[i] === '{') {
      braceCount++;
      started = true;
    } else if (code[i] === '}') {
      braceCount--;
    }
    
    if (started && braceCount === 0) {
      endIndex = i;
      break;
    }
  }
  
  if (endIndex !== -1) {
    // Remove the function and any trailing spaces/semicolons
    let removeEnd = endIndex + 1;
    if (code[removeEnd] === ';') removeEnd++;
    code = code.slice(0, startIndex) + code.slice(removeEnd);
  }
  return code;
}

const files = [
  'src/pages/LessonPlan.tsx',
  'src/pages/Worksheets.tsx',
  'src/pages/ExerciseSolver.tsx'
];

for (const file of files) {
  let code = fs.readFileSync(file, 'utf8');
  
  // Remove import
  code = code.replace(/import pptxgen from ["']pptxgenjs["'];?\n/g, '');
  
  // Remove function
  code = removeFunction(code, 'handleExportPPTX');
  
  // Remove button in LessonPlan
  code = code.replace(/<button[^>]*?onClick=\{handleExportPPTX\}[^>]*?>[\s\S]*?<\/button>/g, '');
  
  fs.writeFileSync(file, code);
  console.log(`Cleaned ${file}`);
}
