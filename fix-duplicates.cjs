const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/**/*.tsx');
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let lines = content.split('\n');
  let newLines = [];
  let gfmCount = 0;
  for (let line of lines) {
    if (line.includes("import remarkGfm from 'remark-gfm'") || line.includes('import remarkGfm from "remark-gfm"')) {
      if (gfmCount === 0) {
        newLines.push(line);
        gfmCount++;
      }
    } else {
      newLines.push(line);
    }
  }
  fs.writeFileSync(file, newLines.join('\n'));
});
