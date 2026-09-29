const fs = require('fs');

let code = fs.readFileSync('src/pages/ExamGenerator.tsx', 'utf8');

// Find the functions
const startFunc1 = code.indexOf('const handleExportCSV = () => {');
const endFunc1Str = '  };';
let endFunc1 = code.indexOf(endFunc1Str, startFunc1 + 50) + endFunc1Str.length;
// Actually find the end of handlePrintBubbleSheet
const startFunc2 = code.indexOf('const handlePrintBubbleSheet = () => {');
const endFunc2Str = '  };\n';
let endFunc2 = code.indexOf(endFunc2Str, startFunc2) + endFunc2Str.length;

const functionsCode = code.substring(startFunc1, endFunc2);

// Remove the functions from their current place
code = code.substring(0, startFunc1) + code.substring(endFunc2);

// Insert them into ExamGenerator
const target = 'export function ExamGenerator() {\n';
code = code.replace(target, target + functionsCode);

fs.writeFileSync('src/pages/ExamGenerator.tsx', code);
console.log("Fixed ExamGenerator.tsx");
