import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import rehypeStringify from 'rehype-stringify';

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
    console.log("With rehypeRaw -> rehypeKatex:");
    console.log(String(file).substring(0, 500));
  });
