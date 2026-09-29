const fs = require('fs');
let code = fs.readFileSync('src/lib/exportUtils.ts', 'utf8');

// Change default to keepLatex = true
code = code.replace(
  'export function exportHtmlToWord(element: HTMLElement, filename: string, keepLatex: boolean = false) {',
  'export function exportHtmlToWord(element: HTMLElement, filename: string, keepLatex: boolean = true) {'
);

fs.writeFileSync('src/lib/exportUtils.ts', code);
console.log("Updated exportUtils.ts");
