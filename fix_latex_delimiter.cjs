const fs = require('fs');
let code = fs.readFileSync('src/lib/exportUtils.ts', 'utf8');

code = code.replace(
  /const delimiter = isBlock \? "\$" : "\$";/g,
  'const delimiter = isBlock ? "$$" : "$";'
);

fs.writeFileSync('src/lib/exportUtils.ts', code);
console.log("Fixed delimiter");
