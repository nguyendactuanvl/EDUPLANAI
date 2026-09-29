const katex = require('katex');

const html = katex.renderToString("\\begin{array}{|c|c|}\\hline a & b \\\\ \\hline \\end{array}", {
    throwOnError: false
});

console.log(html);
