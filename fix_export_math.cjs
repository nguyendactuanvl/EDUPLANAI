const fs = require('fs');
let code = fs.readFileSync('src/lib/exportUtils.ts', 'utf8');

// The replacement logic:
const katexLogic = `
    const katexElements = clone.querySelectorAll(".katex");
    katexElements.forEach(el => {
      const annotationNode = el.querySelector("annotation[encoding='application/x-tex']");
      const texString = annotationNode ? annotationNode.textContent || "" : "";
      
      if (mathFormat === 'latex') {
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
              // Prefix with mml: for MS Word
              const prefixedMathml = mathmlHtml.replace(/<(\\/?)([a-z]+)/gi, '<$1mml:$2');
              const tempDiv = document.createElement('div');
              tempDiv.innerHTML = prefixedMathml;
              const newMathNode = tempDiv.querySelector('math'); // It will be mml:math
              
              if (newMathNode) {
                  newMathNode.setAttribute("xmlns:mml", "http://www.w3.org/1998/Math/MathML");
                  if (el.parentNode) el.parentNode.replaceChild(newMathNode, el);
                  return;
              }
          } catch(e) {
              console.warn("Temml conversion error", e);
          }
      }

      if (mathFormat === 'mathml' && texString) {
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

// Also we need to add xmlns:mml to the root html tag
code = code.replace(
  /<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns:m='http:\/\/schemas\.microsoft\.com\/office\/2004\/12\/omml' xmlns='http:\/\/www\.w3\.org\/TR\/REC-html40'>/,
  "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns:m='http://schemas.microsoft.com/office/2004/12/omml' xmlns:mml='http://www.w3.org/1998/Math/MathML' xmlns='http://www.w3.org/TR/REC-html40'>"
);

fs.writeFileSync('src/lib/exportUtils.ts', code);
console.log("Updated exportUtils.ts");
