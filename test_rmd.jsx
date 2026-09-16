import React from 'react';
import { renderToString } from 'react-dom/server';
import Markdown from 'react-markdown';
import TikzJax from 'react-tikzjax';

const code = ({node, className, children, ...props}) => {
  console.log("className:", className);
  console.log("props:", Object.keys(props));
  return <code className={className} {...props}>{children}</code>;
};

const html = renderToString(
  <Markdown components={{ code }}>
    {`
\`\`\`tikz
\\begin{tikzpicture}
\\end{tikzpicture}
\`\`\`
    `}
  </Markdown>
);
console.log(html);
