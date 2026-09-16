import React from 'react';
import { renderToString } from 'react-dom/server';
import Markdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

try {
  renderToString(
    <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
      {`$$ \\frac{1}{2 $$`}
    </Markdown>
  );
  console.log("No crash!");
} catch (e) {
  console.log("CRASHED:", e.message);
}
