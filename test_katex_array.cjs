const katex = require('katex');
const html = katex.renderToString(`
\\begin{array}{|c|c|}
\\hline
a & b \\\\
\\hline
c & d \\\\
\\hline
\\end{array}
`);
console.log(html);
