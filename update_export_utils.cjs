const fs = require('fs');
let code = fs.readFileSync('src/lib/exportUtils.ts', 'utf8');

// Replace the function signature
code = code.replace(
  /export function exportHtmlToWord\(element: HTMLElement, filename: string, keepLatex: boolean = true\) {/,
  "export function exportHtmlToWord(element: HTMLElement, filename: string, mathFormat: 'omml' | 'mathml' | 'latex' = 'omml') {"
);

// We need to replace `keepLatex` inside the function with `mathFormat === 'latex'`
code = code.replace(/if \(keepLatex\)/g, "if (mathFormat === 'latex')");

// We should also look for the place where we convert KaTeX.
const searchBlock = `
      if (mathFormat === 'latex') {
          const annotationNode = el.querySelector("annotation[encoding='application/x-tex']");
          if (annotationNode && el.parentNode) {
              const texString = annotationNode.textContent || "";
              const isBlock = el.parentElement?.classList.contains("katex-display") || el.classList.contains("katex-display");
              const delimiter = isBlock ? "$$" : "$";
              const textNode = document.createTextNode(\`\${delimiter}\${texString}\${delimiter}\`);
              el.parentNode.replaceChild(textNode, el);
              return;
          }
      }
`;

// It seems my previous replace logic added `const katexElements = clone.querySelectorAll(".katex"); ...` 
// Let's check what's actually there.
