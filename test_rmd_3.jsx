import React from 'react';
import { renderToString } from 'react-dom/server';
import Markdown from 'react-markdown';
import TikzJax from 'react-tikzjax';

const code = ({node, inline, className, children, ...props}) => {
  return <div className="TIKZ"></div>;
};

const html = renderToString(
  <Markdown components={{ code }}>
    {`Câu 2: Cho hàm số
    

\`\`\`tikz
\\begin{tikzpicture}
\\end{tikzpicture}
\`\`\`
`}
  </Markdown>
);
console.log(html);
