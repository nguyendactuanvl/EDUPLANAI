import React from 'react';
import { renderToString } from 'react-dom/server';
import Markdown from 'react-markdown';

const html = renderToString(
  <Markdown>
    {`
 \`\`\`tikz
 \\begin{tikzpicture}
 \\end{tikzpicture}
 \`\`\`
    `}
  </Markdown>
);
console.log(html);
