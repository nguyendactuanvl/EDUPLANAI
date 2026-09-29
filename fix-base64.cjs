const fs = require('fs');
let content = fs.readFileSync('api/index.ts', 'utf8');

// The issue is f.data might include "data:image/jpeg;base64," prefix.
// We need to strip it out if it exists.
content = content.replace(
  'function resolveFiles(reqBody: any) {\n  const files = reqBody.files || [];',
  'function resolveFiles(reqBody: any) {\n  let files = reqBody.files || [];\n  files = files.map(f => {\n    if (f.data && f.data.startsWith("data:")) {\n      const matches = f.data.match(/^data:(.*?);base64,(.*)$/);\n      if (matches) {\n        return { ...f, type: matches[1], data: matches[2] };\n      }\n    }\n    return f;\n  });'
);

fs.writeFileSync('api/index.ts', content);
console.log("Fixed base64 issue");
