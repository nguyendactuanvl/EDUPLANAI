const fs = require('fs');
let content = fs.readFileSync('src/types.ts', 'utf8');

// Add tfStatements to Question interface if not present
if (!content.includes('tfStatements?: {')) {
  content = content.replace(
    /correctOptionIndex\?:\s*number;/,
    "correctOptionIndex?: number;\n  tfStatements?: { statement: string; correct: boolean }[];"
  );
}

fs.writeFileSync('src/types.ts', content);
console.log("Patched src/types.ts");
