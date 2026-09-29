const fs = require('fs');
let code = fs.readFileSync('src/lib/exportUtils.ts', 'utf8');

code = code.replace(
  /export function exportHtmlToWord\(element: HTMLElement, filename: string, keepLatex: boolean = true\) {/,
  "export function exportHtmlToWord(element: HTMLElement, filename: string, mathFormat: 'omml' | 'mathml' | 'latex' = 'omml') {"
);

code = code.replace(/if \(keepLatex\)/g, "if (mathFormat === 'latex')");

fs.writeFileSync('src/lib/exportUtils.ts', code);
console.log("Finished updating exportUtils.ts");
