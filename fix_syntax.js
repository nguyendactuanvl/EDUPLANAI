const fs = require('fs');
let code = fs.readFileSync('api/index.ts', 'utf8');

// Fix 1: around line 530
code = code.replace(/return \{ result: response\.text \};\s*\}\);\s*\);\s*\}\s*return handleAiError\(error, req, res\);\s*\}/g, 'return { result: response.text };\n    });');

// Fix 2: around line 970
code = code.replace(/return \{ result: response\.text \};\s*\}\);\s*\);\s*\}\s*\}/g, 'return { result: response.text };\n    });');

fs.writeFileSync('api/index.ts', code);
