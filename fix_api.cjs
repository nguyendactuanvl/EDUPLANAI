const fs = require('fs');
let content = fs.readFileSync('api/index.ts', 'utf8');

// find the exact block and replace
content = content.replace(
  "```tikz\\n\\begin{tikzpicture}\\n...\\n\\end{tikzpicture}\\n````;",
  "```tikz\\n\\\\begin{tikzpicture}\\n...\\n\\\\end{tikzpicture}\\n````;"
);
content = content.replace(
  "bắt đầu bằng \\begin{tikzpicture} và kết thúc bằng \\end{tikzpicture}",
  "bắt đầu bằng \\\\begin{tikzpicture} và kết thúc bằng \\\\end{tikzpicture}"
);
fs.writeFileSync('api/index.ts', content);
console.log("Fixed");
