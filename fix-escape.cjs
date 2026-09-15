const fs = require('fs');
let content = fs.readFileSync('api/index.ts', 'utf8');

// replace \${MATH_FORMATTING_RULES} with ${MATH_FORMATTING_RULES}
content = content.replace(/\\\$\{MATH_FORMATTING_RULES\}/g, '${MATH_FORMATTING_RULES}');

fs.writeFileSync('api/index.ts', content);
console.log("Fixed escapes");
