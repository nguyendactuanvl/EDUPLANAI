import React from 'react';
import { renderToString } from 'react-dom/server';
import Markdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';

let content = `
Câu 2:
<tikz-diagram data-tikz="base64"></tikz-diagram>
`;

const html = renderToString(
  <Markdown 
    rehypePlugins={[rehypeRaw]}
    components={{
      'tikz-diagram': ({node, ...props}) => {
        console.log(node.properties);
        return <div className="TIKZJAX">test</div>;
      }
    }}
  >
    {content}
  </Markdown>
);
console.log(html);
