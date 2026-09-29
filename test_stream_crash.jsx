import React from 'react';
import { renderToString } from 'react-dom/server';
import { MarkdownRenderer } from './src/components/MarkdownRenderer.tsx';

const content = `
Câu 1:
\\begin{tikzpicture}
\\end{tikzpicture}
`;

try {
  renderToString(<MarkdownRenderer content={content} />);
  console.log("Rendered successfully");
} catch (e) {
  console.error("Crash!", e);
}
