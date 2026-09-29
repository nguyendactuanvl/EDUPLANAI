import React, { useEffect, useRef } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import katex from 'katex';
// @ts-ignore
import renderMathInElement from 'katex/dist/contrib/auto-render.js';
import { TikzRenderer, getTikzSvg } from './TikzRenderer';
import { convertBbtTableToSvg } from '../lib/bbtRenderer';
import { 
  fixMath, 
  formatMathContent, 
  convertOmmlToLatex, 
  polishMathText, 
  sanitizeAndFormatMath, 
  cleanVietnameseUnicode, 
  rescueAccidentalFullMathBlock, 
  sanitizeAndPolishMath, 
  sanitizeExamQuestion,
  sanitizeMathBeforeRender,
  normalizeMathLatex,
  normalizeMathContent,
  normalizeSetNotation,
  fixNakedLeqGeq,
  rescueVietnameseFromMath,
  normalizeLogicAndSetSymbols,
  sanitizeLatexString,
  preProcessMathContent,
  rescueCodeAndNestedText,
  normalizePropositionQuotes
} from '../lib/utils';

export { 
  polishMathText, 
  sanitizeAndFormatMath, 
  cleanVietnameseUnicode, 
  rescueAccidentalFullMathBlock, 
  sanitizeAndPolishMath, 
  sanitizeExamQuestion, 
  sanitizeMathBeforeRender, 
  normalizeMathLatex, 
  normalizeMathContent,
  normalizeSetNotation,
  fixNakedLeqGeq,
  rescueVietnameseFromMath,
  normalizeLogicAndSetSymbols,
  sanitizeLatexString,
  preProcessMathContent,
  rescueCodeAndNestedText,
  normalizePropositionQuotes
};

/**
 * Khắc phục triệt để lỗi rách dấu $$ và dính chữ tiếng Việt ("hoặc", "và", "hay", "với", "khi", "điều kiện") trong 4 phương án trắc nghiệm:
 * 1. Sửa lỗi đóng/mở $$ bị rách dính dấu phẩy (vd: 0^\circ$$,180^\circ -> $0^\circ$, $180^\circ$)
 * 2. Tách rời các từ nối tiếng Việt bị dính liền với số/ký tự (vd: 3hoặcm -> 3 hoặc m, avàa -> a và a)
 * 3. Tách từ nối ra ngoài dấu $ và tự động bọc $ chuẩn xác cho từng vế công thức
 */
export const fixInlineOptionText = (text: string): string => {
  if (!text) return '';
  let res = text;

  let prefix = '';
  const prefixMatch = res.match(/^(\s*(?:[-*]\s*)?(?:\*{0,2})[A-Da-d][\.\:\)](?:\*{0,2})\s*(?!=\s*))/);
  if (prefixMatch) {
    prefix = prefixMatch[1];
    res = res.slice(prefix.length);
  }

  const textTokens: string[] = [];
  res = res.replace(/\\text\{[^{}]*\}/g, (match) => {
    textTokens.push(match);
    return `___TEXT_TOKEN_${textTokens.length - 1}___`;
  });

  res = res.replace(/\$\$([,;])/g, '$$ $1 ').replace(/([,;])\$\$/g, ' $1$$');

  res = res
    .replace(/\b([a-z])(hoặc|hay|với|khi)\b/gi, (match, letter, conj) => {
      if (/^(thay|chay)$/i.test(match)) return match;
      return `${letter} ${conj}`;
    })
    .replace(/([0-9\$\)\]\}])(?<!\s)(hoặc|hay|với|khi)(?=[a-zA-Z0-9\$\\])/gi, '$1 $2 ')
    .replace(/([0-9\$\)\]\}])(?<!\s)và(?!(?:o|i|ng|c|t)\b)(?=[a-zA-Z0-9\$\\])/gi, '$1 và ')
    .replace(/(?<=[0-9\$\)\]\}])(hoặc|hay|với|khi)/gi, ' $1')
    .replace(/(?<=[0-9\$\)\]\}])và(?!(?:o|i|ng|c|t)\b)/gi, ' và');

  res = res
    .replace(/(?<!\$)\$(?!\$)\s*(hoặc|và|hay|với|khi)\s*(?<!\$)\$(?!\$)/gi, '$$ $1 $$')     .replace(/\$\$\s*(hoặc\vert{}và\vert{}hay\vert{}với\vert{}khi)\s*\$\$/gi, '$$ $1$$');

  const parts = res.split(/\s+(hoặc|và|hay|với|khi|điều kiện(?:\s+là)?)\s+/gi);
  if (parts.length > 1) {
    res = parts.map(part => {
      const trimmed = part.trim();
      if (['hoặc', 'và', 'hay', 'với', 'khi'].includes(trimmed.toLowerCase()) || /^điều kiện/i.test(trimmed)) {
        return trimmed;
      }
      if (/[\\<>=+\-\^_\/]/.test(trimmed) || /\b\d+[a-zA-Z]\b/.test(trimmed)) {
        if (/^[“"”]|:\s*[“"”]/.test(trimmed)) {
          return trimmed;
        }
        const cleanPart = trimmed.replace(/\$/g, '').trim();
        return cleanPart ? `$${cleanPart}$` : '';
      }
      return trimmed;
    }).join(' ');
  } else {
    if (/[\\<>=]/.test(res) && !res.includes('$')) {
      res = `$${res}$`;
    }
  }

  res = res.replace(/___TEXT_TOKEN_(\d+)___/g, (_m, idx) => textTokens[Number(idx)] || '');

  return (prefix + res.replace(/\${3,}/g, '$$')).trim();
};

export { formatMathContent };

export const MarkdownRenderer = ({ 
  content, 
  className, 
  inline = false 
}: { 
  content: string; 
  className?: string; 
  inline?: boolean; 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const codeTokens: string[] = [];
  let processedContent = content || '';
  processedContent = processedContent.replace(/(```[a-zA-Z0-9_\-]*\s*[\s\S]*?```|`[^`\n]+`)/g, (match) => {
    if (/```(?:tikz|latex)\b/i.test(match) || /\\begin\s*\{tikzpicture\}/i.test(match)) {
      return match;
    }
    const cleanedCode = rescueCodeAndNestedText(match);
    codeTokens.push(cleanedCode);
    return `___CODE_BLOCK_TOKEN_${codeTokens.length - 1}___`;
  });

  processedContent = rescueCodeAndNestedText(sanitizeLatexString(processedContent));
  processedContent = normalizePropositionQuotes(processedContent);
  processedContent = sanitizeExamQuestion(processedContent);
  processedContent = normalizeLogicAndSetSymbols(processedContent);
  processedContent = polishMathText(processedContent);
  processedContent = sanitizeMathBeforeRender(processedContent);
  processedContent = normalizeMathLatex(processedContent);
  processedContent = normalizeLogicAndSetSymbols(processedContent);

  if (/^\s*(?:[-*]\s*)?(?:\*{0,2})[A-Da-d][\.\:\)]/i.test(processedContent.trim())) {
    processedContent = fixInlineOptionText(processedContent);
  }
  processedContent = processedContent.replace(/(^|\n)(\s*(?:[-*]\s*)?(?:\*{0,2})[A-Da-d][\.\:\)](?:\*{0,2})\s*)([^\n]+)/g, (_m, lineStart, label, optText) => {
    return `${lineStart}${label}${fixInlineOptionText(optText)}`;
  });

  processedContent = normalizeSetNotation(processedContent);
  processedContent = formatMathContent(processedContent);
  processedContent = fixMath(processedContent);
  processedContent = normalizeMathLatex(processedContent);
  processedContent = normalizeSetNotation(processedContent);
  processedContent = rescueCodeAndNestedText(processedContent);

  processedContent = processedContent.replace(/___CODE_BLOCK_TOKEN_(\d+)___/g, (_m, idx) => codeTokens[Number(idx)] ?? '');
  processedContent = rescueCodeAndNestedText(processedContent);

  processedContent = processedContent.replace(/\\(\$)/g, '$1');
  processedContent = processedContent.replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$');
  processedContent = processedContent.replace(/\(([^()\n]*?)\\\[([\s\S]*?)\\\]([^()\n]*?)\)/g, (m, b, f, a) => {
    return `(${b}$${f.replace(/[\r\n]+/g, ' ').replace(/\s{2,}/g, ' ').trim()}$${a})`;
  });
  processedContent = processedContent.replace(/\(([^()\n]*?)\$\$([\s\S]*?)\$\$([^()\n]*?)\)/g, (m, b, f, a) => {
    return `(${b}$${f.replace(/[\r\n]+/g, ' ').replace(/\s{2,}/g, ' ').trim()}$${a})`;
  });
  processedContent = processedContent.replace(/\\\[([\s\S]*?)\\\]/g, '$$$$$1$$$$');    processedContent = formatMathContent(processedContent);    processedContent = processedContent.replace(/(?<!\$)\$(?!\$)([\s\S]+?)(?<!\$)\$(?!\$)/g, (match, formula) => {     if (formula.includes('$$')) return match;
    let trimmed = formula.replace(/[\r\n]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
    if (!trimmed) return match;

    trimmed = trimmed.replace(/=\/=/g, ' \\neq ')
                     .replace(/!\s*=\s*/g, ' \\neq ')
                     .replace(/(?<!\/)\/\s*=\s*/g, ' \\neq ')
                     .replace(/\s*\\neq\s*/g, ' \\neq ');

    let trailingPunct = "";
    const punctMatch = trimmed.match(/([.,;:!?]+)$/);
    if (punctMatch && !/[\\\}]/.test(punctMatch[1])) {
      trailingPunct = punctMatch[1];
      trimmed = trimmed.slice(0, -trailingPunct.length).trim();
    }
    return `$${trimmed}$${trailingPunct}`;
  });

  processedContent = processedContent.replace(/\${3,}/g, (m) => m.length % 2 === 1 ? '$' : '$$');

  processedContent = rescueVietnameseFromMath(processedContent);

  processedContent = processedContent.replace(/\$\$([\s\S]*?)\$\$/g, (_match, body) => {
    const trimmed = body.trim();
    if (!trimmed.includes('\n')) {
      return `$$${trimmed}$$`;
    }
    return `\n\n$$\n${trimmed}\n$$\n\n`;
  });

  processedContent = processedContent.replace(/(\$\$[\s\S]*?\$\$)\s*\.\s*(?=[A-ZÀ-Ỹ])/g, '$1\n\n');

  processedContent = processedContent.replace(/((?:^[ \t]*\|[^\n]+\|[ \t]*(?:\n|$))+)/gm, (match) => {
    try {
      const svg = convertBbtTableToSvg(match);
      if (svg) {
        const base64 = typeof btoa !== 'undefined' ? btoa(encodeURIComponent(svg)) : Buffer.from(encodeURIComponent(svg)).toString('base64');
        return `\n\n<svg-wrapper data-svg="${base64}"></svg-wrapper>\n\n`;
      }
    } catch (e) {}
    return match;
  });

  processedContent = processedContent.replace(/```[a-z]*\s*(<svg[\s\S]*?<\/svg>)\s*```/gi, '$1');
  
  processedContent = processedContent.replace(/(<svg[\s\S]*?<\/svg>)/gi, (match) => {
    try {
      const base64 = typeof btoa !== 'undefined' ? btoa(encodeURIComponent(match)) : Buffer.from(encodeURIComponent(match)).toString('base64');
      return `\n\n<svg-wrapper data-svg="${base64}"></svg-wrapper>\n\n`;
    } catch (e) {
      return match;
    }
  });
  
  processedContent = processedContent.replace(/\\(usetikzlibrary|usepackage)\s*\{[^}]*\}\s*/gi, '');

  processedContent = processedContent.replace(/```[a-z]*\s*([\s\S]*?\\begin\s*\{tikzpicture\}[\s\S]*?\\end\s*\{tikzpicture\})\s*```/gi, (match, inner) => {
    return inner.replace(/\\(usetikzlibrary|usepackage)\s*\{[^}]*\}\s*/gi, '');
  });
  
  processedContent = processedContent.replace(/```tikz\s*([\s\S]*?)```/gi, (match, inner) => {
    let cleaned = inner.replace(/\\(usetikzlibrary|usepackage)\s*\{[^}]*\}\s*/gi, '').trim();
    if (!cleaned.includes('\\begin{tikzpicture}')) {
       return `\\begin{tikzpicture}\n${cleaned}\n\\end{tikzpicture}`;
    }
    return cleaned;
  });
  
  processedContent = processedContent.replace(/\\dotfill\b/g, '. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .');

  processedContent = processedContent.replace(/<div\s+class=["']question-choices[^"']*["']>([\s\S]*?)<\/div>/gi, '$1');
  processedContent = processedContent.replace(/<div\s+class=["']choice-item[^"']*["']>([\s\S]*?)<\/div>/gi, (m, inner) => {
    const labelMatch = inner.match(/<span\s+class=["']choice-label[^"']*["']>([\s\S]*?)<\/span>/i);
    const textMatch = inner.match(/<span\s+class=["']choice-text[^"']*["']>([\s\S]*?)<\/span>/i);
    const label = labelMatch ? labelMatch[1].replace(/<[^>]+>/g, '').trim() : '';
    const text = textMatch ? textMatch[1].replace(/<[^>]+>/g, '').trim() : inner.replace(/<[^>]+>/g, '').trim();
    return `\n- **${label}** ${fixInlineOptionText(text)}\n`;
  });

  processedContent = processedContent.replace(/(\\begin\s*\{tikzpicture\}[\s\S]*?\\end\s*\{tikzpicture\})/gi, (match) => {
    try {
      const svg = getTikzSvg(match);
      if (svg) {
        const svgBase64 = typeof btoa !== 'undefined' ? btoa(encodeURIComponent(svg)) : Buffer.from(encodeURIComponent(svg)).toString('base64');
        return `\n\n<svg-wrapper data-svg="${svgBase64}"></svg-wrapper>\n\n`;
      }
      const base64 = typeof btoa !== 'undefined' ? btoa(encodeURIComponent(match)) : Buffer.from(encodeURIComponent(match)).toString('base64');
      return `\n\n<tikz-diagram data-tikz="${base64}"></tikz-diagram>\n\n`;
    } catch (e) {
      return match;
    }
  });

  if (/<(table|td|th|div|span|p)[^>]*>/i.test(processedContent)) {
    processedContent = processedContent.replace(/(<(table|tr|td|th|div|span|p)[^>]*>[\s\S]*?<\/\2>)/gi, (htmlBlock) => {
      let rendered = htmlBlock.replace(/\$\$([\s\S]*?)\$\$/g, (m, tex) => {
        try {
          return katex.renderToString(tex.trim(), { displayMode: true, throwOnError: false, errorColor: 'inherit', strict: false });
        } catch (e) {
          return m;
        }
      });
      rendered = rendered.replace(/(?<!\$)\$(?!\$)([^\$\n]+?)(?<!\$)\$(?!\$)/g, (m, tex) => {
        try {
          let trimmed = tex.trim();
          let trailingPunct = "";
          const punctMatch = trimmed.match(/([.,;:!?]+)$/);
          if (punctMatch && !/[\\\}]/.test(punctMatch[1])) {
            trailingPunct = punctMatch[1];
            trimmed = trimmed.slice(0, -trailingPunct.length).trim();
          }
          return katex.renderToString(trimmed, { displayMode: false, throwOnError: false, errorColor: 'inherit', strict: false }) + trailingPunct;
        } catch (e) {
          return m;
        }
      });
      return rendered;
    });
  }

  useEffect(() => {
    if (!containerRef.current) return;
    try {
      if (typeof renderMathInElement === 'function') {
        renderMathInElement(containerRef.current, {
          delimiters: [
            { left: "$$", right: "$$", display: true },
            { left: "$", right: "$", display: false },
            { left: "\\(", right: "\\)", display: false },
            { left: "\\[", right: "\\]", display: true }
          ],
          throwOnError: false,
          errorColor: 'inherit',
          strict: false,
          ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code"],
          ignoredClasses: ["katex", "katex-display", "katex-html", "katex-mathml"]
        });
      }
    } catch (err) {
      console.warn("KaTeX auto-render pass completed with warnings:", err);
    }
  }, [processedContent]);

  if (inline) {
    return (
      <span
        ref={containerRef as any}
        className={className || "inline-flex items-center gap-1 align-baseline"}
      >
        <Markdown
          remarkPlugins={[remarkMath, remarkGfm]}
          rehypePlugins={[rehypeRaw, [rehypeKatex, { strict: false, throwOnError: false, errorColor: 'inherit' }]]}
          components={{
            p: ({ node, children, ...props }: any) => (
              <span className="inline" {...props}>
                {children}
              </span>
            ),
            div: ({ node, children, ...props }: any) => (
              <span className="inline" {...props}>
                {children}
              </span>
            )
          }}
        >
          {processedContent}
        </Markdown>
      </span>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={className || "markdown-body prose prose-slate max-w-none prose-headings:text-slate-800 prose-h2:text-2xl prose-h2:border-b prose-h2:pb-2 prose-h3:text-xl prose-a:text-emerald-600 prose-table:border-collapse prose-th:border prose-th:bg-slate-50 prose-td:border prose-td:p-2"}
    >
      <Markdown 
        remarkPlugins={[remarkMath, remarkGfm]} 
        rehypePlugins={[rehypeRaw, [rehypeKatex, { strict: false, throwOnError: false, errorColor: 'inherit' }]]}
        components={{
          p: ({ node, children, ...props }: any) => {
            const firstChild = React.Children.toArray(children)[0];
            const isQuestion = typeof firstChild === 'string' && /^\s*(?:\*\*)?(?:Câu|Bài|\d+\.)\s*\d*/i.test(firstChild);
            return (
              <div className={`leading-relaxed ${isQuestion ? 'mt-6 mb-2 font-medium text-slate-900 text-base sm:text-lg' : 'my-3'}`} {...props}>
                {children}
              </div>
            );
          },
          // @ts-ignore
          'svg-wrapper': ({node}: any) => {
            try {
              const base64 = node.properties?.dataSvg || node.properties?.['data-svg'];
              if (!base64) return null;
              const decoded = decodeURIComponent(typeof atob !== 'undefined' ? atob(base64) : Buffer.from(base64, 'base64').toString('utf8'));
              return (
                <span className="flex justify-center my-6 overflow-x-auto bg-white p-4 rounded-xl border border-slate-200" dangerouslySetInnerHTML={{__html: decoded}} />
              );
            } catch(e) {
              return <span className="text-red-500">Lỗi hiển thị hình ảnh SVG</span>;
            }
          },
          'tikz-diagram': ({node}: any) => {
            try {
              const base64 = node.properties?.dataTikz || node.properties?.['data-tikz'];
              if (!base64) return null;
              const decoded = decodeURIComponent(typeof atob !== 'undefined' ? atob(base64) : Buffer.from(base64, 'base64').toString('utf8'));
              return (
                <span className="flex justify-center my-6 overflow-x-auto bg-white p-4 rounded-xl border border-slate-200">
                  <TikzRenderer content={decoded} />
                </span>
              );
            } catch(e) {
              return <span className="text-red-500">Lỗi hiển thị hình ảnh TikZ</span>;
            }
          },
          img: ({node, src, alt, ...props}: any) => {
            let cleanSrc = (src || '').trim();
            if (!cleanSrc || cleanSrc === '#' || cleanSrc === 'about:blank' || cleanSrc === '...' || cleanSrc === 'undefined') {
              return null;
            }
            if (cleanSrc.includes('[drive.google.com/file/d/](https://drive.google.com/file/d/)')) {
              const fileId = cleanSrc.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1];
              if (fileId) {
                cleanSrc = `[https://drive.google.com/uc?export=view&id=$](https://drive.google.com/uc?export=view&id=$){fileId}`;
              }
            }
            return (
              <img
                src={cleanSrc}
                alt={alt || 'Hình minh họa bài thi'}
                loading="eager"
                referrerPolicy="no-referrer"
                className="max-w-full h-auto rounded-lg mx-auto my-3 border border-slate-200 shadow-sm"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
                {...props}
              />
            );
          },
          table: ({ node, children, ...props }: any) => (
            <div className="overflow-x-auto my-4 max-w-full">
              <table className="min-w-fit mx-auto border-collapse border border-slate-300 text-sm text-center shadow-xs rounded-md overflow-hidden bg-white" {...props}>
                {children}
              </table>
            </div>
          ),
          th: ({ node, children, ...props }: any) => (
            <th className="border border-slate-300 bg-slate-100 px-3.5 py-2 font-semibold text-slate-800 text-center whitespace-nowrap" {...props}>
              {children}
            </th>
          ),
          td: ({ node, children, ...props }: any) => (
            <td className="border border-slate-300 px-3.5 py-2 text-slate-800 text-center whitespace-nowrap" {...props}>
              {children}
            </td>
          ),
          code({node, inline, className, children, ...props}: any) {
            return <code className={className} {...props}>{children}</code>;
          },
          pre({node, children, ...props}: any) {
            return (
              <pre className="bg-slate-50 border border-slate-200 text-slate-800 rounded-lg p-3 overflow-x-auto my-3 text-sm font-mono" {...props}>
                {children}
              </pre>
            );
          },
          ul: ({ node, children, ...props }: any) => {
            const getNodePlainText = (n: any): string => {
              if (!n) return '';
              if (typeof n === 'string' || typeof n === 'number') return String(n);
              if (Array.isArray(n)) return n.map(getNodePlainText).join(' ');
              if (React.isValidElement(n)) return getNodePlainText((n.props as any)?.children);
              return '';
            };

            const childArray = React.Children.toArray(children);
            const isChoiceList = childArray.length >= 2 && childArray.length <= 4 && childArray.some((child: any) => {
              const text = getNodePlainText(child?.props?.children);
              return /\b[A-D][\.\)]/.test(text);
            });

            if (isChoiceList) {
              const fullText = getNodePlainText(children);
              const isLong = fullText.length > 140;
              const gridCols = isLong ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2 lg:grid-cols-4";
              return (
                <ul className={`grid ${gridCols} gap-2.5 my-3 pl-0 list-none text-slate-800`} {...props}>
                  {children}
                </ul>
              );
            }
            return <ul className="my-3 pl-6 list-disc space-y-1 text-slate-800" {...props}>{children}</ul>;
          },
          li: ({ node, children, ...props }: any) => {
            const getNodePlainText = (n: any): string => {
              if (!n) return '';
              if (typeof n === 'string' || typeof n === 'number') return String(n);
              if (Array.isArray(n)) return n.map(getNodePlainText).join(' ');
              if (React.isValidElement(n)) return getNodePlainText((n.props as any)?.children);
              return '';
            };

            const text = getNodePlainText(children);
            const isChoice = /^\s*(?:\*\*)?[A-D][\.\)]/.test(text) || /\b[A-D][\.\)]/.test(text);
            if (isChoice) {
              return (
                <li className="flex items-baseline gap-2 py-1.5 px-3 rounded-lg bg-slate-50/70 border border-slate-200 text-slate-800 hover:bg-slate-100 transition-colors shadow-none list-none m-0" {...props}>
                  {children}
                </li>
              );
            }
            return <li className="my-1 leading-relaxed text-slate-800" {...props}>{children}</li>;
          }
        }}
      >
        {processedContent}
      </Markdown>
    </div>
  );
};

export const MathSpan: React.FC<{ content: string; className?: string }> = ({ content, className }) => {
  return <MarkdownRenderer content={content} inline className={className} />;
};