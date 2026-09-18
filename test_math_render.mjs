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

const text1 = 'A. $(-\\infty; -1)$ và $(0; 1)$';
const res1 = await processor.process(text1);
console.log('Result 1:\n', String(res1));

const text2 = '(-\\infty; -1) và (0; 1)';
const res2 = await processor.process(text2);
console.log('Result 2:\n', String(res2));
