import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex';
import rehypeStringify from 'rehype-stringify';

const processor = unified()
  .use(remarkParse)
  .use(remarkMath)
  .use(remarkRehype)
  .use(rehypeKatex)
  .use(rehypeStringify);

const text = 'Câu 1: A. \\$(-\\infty; -1)\\$ và \\$(0; 1)\\$';
const res = await processor.process(text);
console.log('Result with \\$:\n', String(res));
