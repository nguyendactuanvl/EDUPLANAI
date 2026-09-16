import React from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import { TikzRenderer } from './TikzRenderer';

export const MarkdownRenderer = ({ content }: { content: string }) => {
  let processedContent = content || '';
  
  // 0. Unwrap any existing code blocks around SVG
  processedContent = processedContent.replace(/```[a-z]*\s*(<svg[\s\S]*?<\/svg>)\s*```/g, '$1');
  
  // Wrap SVGs in a container to prevent Markdown from messing them up and to style them
  processedContent = processedContent.replace(/(<svg[\s\S]*?<\/svg>)/g, (match) => {
    try {
      const base64 = typeof btoa !== 'undefined' ? btoa(encodeURIComponent(match)) : Buffer.from(encodeURIComponent(match)).toString('base64');
      return `\n\n<svg-wrapper data-svg="${base64}"></svg-wrapper>\n\n`;
    } catch (e) {
      return match;
    }
  });
  
  // 1. Unwrap any existing code blocks around TikZ to normalize
  processedContent = processedContent.replace(/```[a-z]*\s*(\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\})\s*```/g, '$1');
  
  // 2. Base64 encode TikZ blocks to prevent Markdown/KaTeX interference
  processedContent = processedContent.replace(/(\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\})/g, (match) => {
    try {
      const base64 = typeof btoa !== 'undefined' ? btoa(encodeURIComponent(match)) : Buffer.from(encodeURIComponent(match)).toString('base64');
      return `\n\n<tikz-diagram data-tikz="${base64}"></tikz-diagram>\n\n`;
    } catch (e) {
      return match;
    }
  });

  return (
    <div className="markdown-body prose prose-slate max-w-none prose-headings:text-slate-800 prose-h2:text-2xl prose-h2:border-b prose-h2:pb-2 prose-h3:text-xl prose-a:text-emerald-600 prose-table:border-collapse prose-th:border prose-th:bg-slate-50 prose-td:border prose-td:p-2">
      <Markdown 
        remarkPlugins={[remarkMath, remarkGfm]} 
        rehypePlugins={[rehypeRaw, [rehypeKatex, { strict: false, throwOnError: false }]]}
        components={{
          // @ts-ignore
          'svg-wrapper': ({node}: any) => {
            try {
              const base64 = node.properties?.dataSvg || node.properties?.['data-svg'];
              if (!base64) return null;
              const decoded = decodeURIComponent(typeof atob !== 'undefined' ? atob(base64) : Buffer.from(base64, 'base64').toString('utf8'));
              return (
                <div className="flex justify-center my-6 overflow-x-auto bg-white p-4 rounded-xl border border-slate-200" dangerouslySetInnerHTML={{__html: decoded}}>
                </div>
              );
            } catch(e) {
              return <div className="text-red-500">Lỗi hiển thị hình ảnh SVG</div>;
            }
          },
          'tikz-diagram': ({node}: any) => {
            try {
              const base64 = node.properties?.dataTikz || node.properties?.['data-tikz'];
              if (!base64) return null;
              const decoded = decodeURIComponent(typeof atob !== 'undefined' ? atob(base64) : Buffer.from(base64, 'base64').toString('utf8'));
              return (
                <div className="flex justify-center my-6 overflow-x-auto bg-white p-4 rounded-xl border border-slate-200">
                  <TikzRenderer content={decoded} />
                </div>
              );
            } catch(e) {
              return <div className="text-red-500">Lỗi hiển thị hình ảnh TikZ</div>;
            }
          },
          code({node, inline, className, children, ...props}: any) {
            return <code className={className} {...props}>{children}</code>;
          }
        }}
      >
        {processedContent}
      </Markdown>
    </div>
  );
};
