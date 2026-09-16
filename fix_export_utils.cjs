const fs = require('fs');
let code = fs.readFileSync('src/lib/exportUtils.ts', 'utf8');

if (!code.includes("import temml from 'temml';")) {
  code = "import temml from 'temml';\n" + code;
}

code = code.replace(
  /export function exportHtmlToWord\s*\(\s*element:\s*HTMLElement,\s*filename:\s*string,\s*keepLatex:\s*boolean\s*=\s*false\s*\)\s*\{/,
  "export function exportHtmlToWord(element: HTMLElement, filename: string, keepLatex: boolean = false, mathFormat: 'omml' | 'mathml' = 'mathml') {"
);

const katexLogic = `
    const katexElements = clone.querySelectorAll(".katex");
    katexElements.forEach(el => {
      const annotationNode = el.querySelector("annotation[encoding='application/x-tex']");
      const texString = annotationNode ? annotationNode.textContent || "" : "";
      
      if (keepLatex) {
          if (texString && el.parentNode) {
              const isBlock = el.parentElement?.classList.contains("katex-display") || el.classList.contains("katex-display");
              const delimiter = isBlock ? "$$" : "$";
              const textNode = document.createTextNode(\`\${delimiter}\${texString}\${delimiter}\`);
              el.parentNode.replaceChild(textNode, el);
              return;
          }
      }
      
      if (mathFormat === 'omml' && texString) {
          try {
              const isBlock = el.parentElement?.classList.contains("katex-display") || el.classList.contains("katex-display");
              const mathmlHtml = temml.renderToString(texString, { displayMode: isBlock });
              const tempDiv = document.createElement('div');
              tempDiv.innerHTML = mathmlHtml;
              const newMathNode = tempDiv.querySelector('math');
              if (newMathNode) {
                  newMathNode.setAttribute("xmlns", "http://www.w3.org/1998/Math/MathML");
                  if (el.parentNode) el.parentNode.replaceChild(newMathNode, el);
                  return;
              }
          } catch(e) {
              console.warn("Temml conversion error", e);
          }
      }

      const mathNode = el.querySelector(".katex-mathml math");
      if (mathNode) {
`;

code = code.replace(/const katexElements = clone\.querySelectorAll\("\.katex"\);[\s\S]*?const mathNode = el\.querySelector\("\.katex-mathml math"\);\s*if \(mathNode\) \{/, katexLogic);

fs.writeFileSync('src/lib/exportUtils.ts', code);
console.log("Updated exportUtils.ts");
