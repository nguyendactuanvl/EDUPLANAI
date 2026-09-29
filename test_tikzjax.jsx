import React from 'react';
import { renderToString } from 'react-dom/server';
import TikzJax from 'react-tikzjax';

const html = renderToString(<TikzJax content="\\begin{tikzpicture}\\end{tikzpicture}" />);
console.log(html);
