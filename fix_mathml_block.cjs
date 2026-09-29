const fs = require('fs');
let code = fs.readFileSync('src/lib/exportUtils.ts', 'utf8');

code = code.replace(
  /if \(mathFormat === 'mathml' && texString\) \{[\s\S]*?const newMathNode = tempDiv\.querySelector\('math'\);/,
  `if (mathFormat === 'mathml' && texString) {
          try {
              const isBlock = el.parentElement?.classList.contains("katex-display") || el.classList.contains("katex-display");
              const mathmlHtml = temml.renderToString(texString, { displayMode: isBlock });
              const tempDiv = document.createElement('div');
              tempDiv.innerHTML = mathmlHtml;
              const newMathNode = tempDiv.firstChild as Element;`
);

fs.writeFileSync('src/lib/exportUtils.ts', code);
console.log("Fixed mathml block");
