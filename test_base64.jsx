import React from 'react';
import { renderToString } from 'react-dom/server';
import Markdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';

let content = `
Câu 2:
\\begin{tikzpicture}
\\draw[->] (-3,0) -- (3,0) node[right] {$x$};
\\end{tikzpicture}
`;

content = content.replace(/(\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\})/g, (match) => {
  return `<tikz-diagram data-tikz="${Buffer.from(match).toString('base64')}"></tikz-diagram>`;
});

const html = renderToString(
  <Markdown 
    rehypePlugins={[rehypeRaw]}
    components={{
      'tikz-diagram': ({node, ...props}) => {
        const base64 = node.properties['data-tikz'];
        const decoded = Buffer.from(base64, 'base64').toString('utf8');
        return <div className="TIKZJAX">{decoded}</div>;
      }
    }}
  >
    {content}
  </Markdown>
);
console.log(html);
