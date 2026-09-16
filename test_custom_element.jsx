import React from 'react';
import { renderToString } from 'react-dom/server';
import Markdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';

const html = renderToString(
  <Markdown 
    rehypePlugins={[rehypeRaw]}
    components={{
      'tikz-diagram': ({children}) => {
        return <div className="TIKZJAX">{children}</div>;
      }
    }}
  >
    {`
Câu 2:
<tikz-diagram>
\\begin{tikzpicture}
\\end{tikzpicture}
</tikz-diagram>
    `}
  </Markdown>
);
console.log(html);
