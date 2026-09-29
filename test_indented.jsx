import React from 'react';
import { renderToString } from 'react-dom/server';
import Markdown from 'react-markdown';

const code = ({node, inline, className, children, ...props}) => {
  console.log("className:", className, "inline:", inline, "children:", children);
  return <code className={className} {...props}>{children}</code>;
};

const html = renderToString(
  <Markdown components={{ code }}>
    {`
    \\begin{tikzpicture}
    \\end{tikzpicture}
    `}
  </Markdown>
);
console.log(html);
