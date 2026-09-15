const fs = require('fs');
let exportUtils = fs.readFileSync('src/lib/exportUtils.ts', 'utf8');

exportUtils = exportUtils.replace(
  'const mathClone = mathNode.cloneNode(true);',
  'const mathClone = mathNode.cloneNode(true) as Element;'
);

fs.writeFileSync('src/lib/exportUtils.ts', exportUtils);
console.log("Fixed exportUtils.ts");
