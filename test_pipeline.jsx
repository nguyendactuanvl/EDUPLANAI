import React from 'react';
import { renderToString } from 'react-dom/server';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';

const code = ({node, inline, className, children, ...props}) => {
  console.log("Called code with className:", className, "children length:", String(children).length);
  return <div className="TIKZJAX-PLACEHOLDER">{children}</div>;
};

const html = renderToString(
  <Markdown 
    remarkPlugins={[remarkMath, remarkGfm]}
    rehypePlugins={[rehypeRaw, rehypeKatex]}
    components={{ code }}
  >
    {`
Câu 2:
\`\`\`tikz
\\begin{tikzpicture}
\\end{tikzpicture}
\`\`\`
    `}
  </Markdown>
);
console.log("HTML:", html);
