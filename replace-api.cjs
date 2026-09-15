const fs = require('fs');

let content = fs.readFileSync('api/index.ts', 'utf8');

content = content.replace(/\.\.\.\(files \|\| \[\]\)\.map\(\(f: any\) => \(\{\s*inlineData: \{\s*data: f\.data,\s*mimeType: f\.type \|\| 'text\/plain'\s*\}\s*\}\)\)/g, '...(await processFilesForAI(files || []))');
content = content.replace(/\.\.\.files\.map\(\(f: any\) => \(\{\s*inlineData: \{\s*data: f\.data,\s*mimeType: f\.type \|\| 'text\/plain'\s*\}\s*\}\)\)/g, '...(await processFilesForAI(files))');

fs.writeFileSync('api/index.ts', content);
