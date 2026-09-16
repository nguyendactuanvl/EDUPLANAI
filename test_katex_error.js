import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex';
import rehypeStringify from 'rehype-stringify';

const markdown = `$$
\\begin{tikzpicture}
\\end{tikzpicture}
$$`;

unified()
  .use(remarkParse)
  .use(remarkMath)
  .use(remarkRehype)
  .use(rehypeKatex)
  .use(rehypeStringify)
  .process(markdown).then((file) => {
    console.log(String(file));
  }).catch(e => {
    console.log("Error:", e.message);
  });
