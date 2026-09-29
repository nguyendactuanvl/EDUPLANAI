import React from 'react';
import { renderToString } from 'react-dom/server';
import { MarkdownRenderer } from './src/components/MarkdownRenderer.tsx';

const content = `
\`\`\`tikz
\\begin{tikzpicture}
\\draw[->] (-3,0) -- (3,0) node[right] {$x$};
\\end{tikzpicture}
\`\`\`
`;

try {
  const html = renderToString(<MarkdownRenderer content={content} />);
  console.log(html.includes('data-tikz'));
  console.log(html);
} catch(e) {
  console.error("ERROR", e);
}
