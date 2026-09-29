const fs = require('fs');
let content = fs.readFileSync('api/index.ts', 'utf8');
content = content.replace("````;", "\\`\\`\\``;");
content = content.replace("```tikz", "\\`\\`\\`tikz");
content = content.replace("\\begin{tikzpicture}\\n...\\n\\end{tikzpicture}", "\\\\begin{tikzpicture}\\n...\\n\\\\end{tikzpicture}");
fs.writeFileSync('api/index.ts', content);
