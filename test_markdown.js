import React from 'react';
import { renderToString } from 'react-dom/server';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';

const content = `
Bảng biến thiên:
$$
\\begin{array}{|c|lcccr|}
\\hline
x & -\\infty & & 1 & & +\\infty \\\\
\\hline
y' & & + & 0 & - & \\\\
\\hline
\\end{array}
$$
`;

const html = renderToString(
    React.createElement(Markdown, {
        remarkPlugins: [remarkMath, remarkGfm],
        rehypePlugins: [rehypeRaw, rehypeKatex]
    }, content)
);

console.log(html);
