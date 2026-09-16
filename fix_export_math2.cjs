const fs = require('fs');
let code = fs.readFileSync('src/lib/exportUtils.ts', 'utf8');

code = code.replace(
  /const newMathNode = tempDiv\.querySelector\('math'\); \/\/ It will be mml:math/,
  "const newMathNode = tempDiv.firstChild as Element;"
);

fs.writeFileSync('src/lib/exportUtils.ts', code);
console.log("Fixed exportUtils.ts");
