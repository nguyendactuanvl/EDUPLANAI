const fs = require('fs');
let content = fs.readFileSync('api/index.ts', 'utf8');

// Fix 1: Add tfStatements mapping
content = content.replace(
  'correctOptionIndex: correctOptionIndex,',
  'correctOptionIndex: correctOptionIndex,\n        tfStatements: q.tfStatements || [],'
);

fs.writeFileSync('api/index.ts', content);
console.log("Patched api/index.ts");
