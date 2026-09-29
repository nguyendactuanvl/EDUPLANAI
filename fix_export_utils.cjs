const fs = require('fs');

let code = fs.readFileSync('src/lib/exportUtils.ts', 'utf8');

// Replace sync signature with async
code = code.replace(
  "export function exportHtmlToWord", 
  "import { latexToOMML } from 'latex-to-omml';\nexport async function exportHtmlToWord"
);

// We need to replace the temml logic with latex-to-omml
// Let's find the loop over katexElements
// wait, since we need to await inside forEach, we must use a for...of loop!
const katexLoopStart = code.indexOf('const katexElements = clone.querySelectorAll(".katex");');
const katexLoopEnd = code.indexOf('let contentHtml = clone.innerHTML;');

if (katexLoopStart !== -1 && katexLoopEnd !== -1) {
    const originalLoop = code.substring(katexLoopStart, katexLoopEnd);
    
    let newLoop = `const katexElements = Array.from(clone.querySelectorAll(".katex"));
    for (const el of katexElements) {
      const annotationNode = el.querySelector("annotation[encoding='application/x-tex']");
      const texString = annotationNode ? annotationNode.textContent || "" : "";
      
      if (!texString) continue;
      
      const isBlock = el.parentElement?.classList.contains("katex-display") || el.classList.contains("katex-display");
      
      if (mathFormat === 'latex') {
          if (el.parentNode) {
              const delimiter = isBlock ? "$$" : "$$"; // LaTeX users prefer $$ for block, wait, let's just use $ for inline and $$ for block
              const textNode = document.createTextNode(isBlock ? \`$$\\n\${texString}\\n$$\` : \`$\${texString}$\`);
              el.parentNode.replaceChild(textNode, el);
          }
          continue;
      }
      
      if (mathFormat === 'omml') {
          try {
              const ommlString = await latexToOMML(texString, { displayMode: isBlock });
              const tempDiv = document.createElement('div');
              tempDiv.innerHTML = ommlString;
              const newMathNode = tempDiv.firstChild;
              if (newMathNode && el.parentNode) {
                  el.parentNode.replaceChild(newMathNode, el);
                  continue;
              }
          } catch(e) {
              console.warn("latexToOMML conversion error", e);
          }
      }
      
      if (mathFormat === 'mathml') {
          try {
              const mathmlHtml = temml.renderToString(texString, { displayMode: isBlock });
              const tempDiv = document.createElement('div');
              tempDiv.innerHTML = mathmlHtml;
              const newMathNode = tempDiv.firstChild;
              if (newMathNode && el.parentNode) {
                  newMathNode.setAttribute("xmlns", "http://www.w3.org/1998/Math/MathML");
                  el.parentNode.replaceChild(newMathNode, el);
                  continue;
              }
          } catch(e) {
              console.warn("Temml conversion error", e);
          }
      }
      
      // Fallback: use KaTeX's own MathML
      const mathNode = el.querySelector(".katex-mathml math");
      if (mathNode && el.parentNode) {
        const mathClone = mathNode.cloneNode(true);
        mathClone.setAttribute("xmlns", "http://www.w3.org/1998/Math/MathML");
        
        const annotations = mathClone.querySelectorAll("annotation");
        annotations.forEach(a => a.remove());
        
        const semantics = mathClone.querySelector("semantics");
        if (semantics) {
           while (semantics.firstChild) {
               mathClone.insertBefore(semantics.firstChild, semantics);
           }
           semantics.remove();
        }
        
        el.parentNode.replaceChild(mathClone, el);
      }
    }
    `;
    code = code.substring(0, katexLoopStart) + newLoop + code.substring(katexLoopEnd);
}

fs.writeFileSync('src/lib/exportUtils.ts', code);
