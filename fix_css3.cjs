const fs = require('fs');

let css = fs.readFileSync('src/index.css', 'utf8');

// Replace .katex .hline with .katex .katex-hline
css = css.replace(/\.katex \.hline/g, '.katex .katex-hline');

fs.writeFileSync('src/index.css', css);
console.log("Updated CSS");
