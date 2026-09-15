const fs = require('fs');
let content = fs.readFileSync('api/index.ts', 'utf8');

content = content.replace(
  'function resolveFiles(reqBody: any) {\n  let files = reqBody.files || [];\n  files = files.map(f => {\n    if (f.data && f.data.startsWith("data:")) {\n      const matches = f.data.match(/^data:(.*?);base64,(.*)$/);\n      if (matches) {\n        return { ...f, type: matches[1], data: matches[2] };\n      }\n    }\n    return f;\n  });\n  const fileIds = reqBody.fileIds || [];',
  'function resolveFiles(reqBody: any) {\n  let files = reqBody.files || [];\n  files = files.map(f => {\n    if (f.data && typeof f.data === "string" && f.data.startsWith("data:")) {\n      const matches = f.data.match(/^data:(.*?);base64,(.*)$/);\n      if (matches) {\n        return { ...f, type: matches[1], data: matches[2] };\n      }\n    }\n    return f;\n  });\n  const fileIds = reqBody.fileIds || [];'
);

fs.writeFileSync('api/index.ts', content);
console.log("Fixed base64 issue part 2");
