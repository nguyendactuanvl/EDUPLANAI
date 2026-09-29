const { unified } = require('unified');
const remarkParse = require('remark-parse');
const remarkMath = require('remark-math');
const remarkRehype = require('remark-rehype');
const rehypeKatex = require('rehype-katex');
const rehypeRaw = require('rehype-raw');
const rehypeStringify = require('rehype-stringify');

const markdown = `
$$
\\begin{array}{|c|lccccr|}
\\hline
x & -\\infty & & 1 & & 3 & & +\\infty \\\\
\\hline
y' & & + & 0 & - & 0 & + & \\\\
\\hline
y & & \\nearrow & 5 & & & & \\\\
& -\\infty & & & & \\searrow & -2 & \\nearrow +\\infty \\\\
\\hline
\\end{array}
$$
`;

unified()
  .use(remarkParse)
  .use(remarkMath)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw)
  .use(rehypeKatex)
  .use(rehypeStringify)
  .process(markdown).then((file) => {
    console.log("With rehypeRaw THEN rehypeKatex:");
    console.log(String(file).substring(0, 500));
  });
