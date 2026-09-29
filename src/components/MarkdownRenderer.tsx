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
  let res = text.normalize('NFC');

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

  res = res.replace(/\$\$([,;])/g, '$$ $1 ').replace(/([,;])\$\$/g, ' $1 $$');

  res = res
    .replace(/\b([a-z])(hoặc|hay|với|khi)\b/gi, (match, letter, conj) => {
      if (/^(thay|chay)$/i.test(match)) return match;
      return `${letter}${conj}`;
    })
    .replace(/([0-9\$\)\]\}])(?<!\s)(hoặc|hay|với|khi)(?=[a-zA-Z0-9\$\\])/gi, '$1 $2 ')
    .replace(/([0-9\$\)\]\}])(?<!\s)và(?!(?:o|i|ng|c|t)\b)(?=[a-zA-Z0-9\$\\])/gi, '$1 và ')
    .replace(/(?<=[0-9\$\)\]\}])(hoặc|hay|với|khi)/gi, ' $1')
    .replace(/(?<=[0-9\$\)\]\}])và(?!(?:o|i|ng|c|t)\b)/gi, ' và');

  res = res
    .replace(/(?<!\$)\$(?!\$)\s*(hoặc|và|hay|với|khi)\s*(?<!\$)\$(?!\$)/gi, '$$ $1 $$')
    .replace(/\$\$\s*(hoặc|và|hay|với|khi)\s*\$\$/gi, '$$ $1 $$');

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

  return (prefix + res.replace(/\${3,}/g, '$$')).trim().normalize('NFC');
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
  // 1. Chuẩn hóa Unicode NFC và hàn gắn các dấu thanh bị tách rời
  let processedContent = (content || '')
    .normalize('NFC')
    .replace(/([a-zA-Zà-ỹÀ-Ỹ])[\u0300\u0301\u0303\u0309\u0323]/g, (m) => m.normalize('NFC'))
    .replace(/([a-zA-Zà-ỹÀ-Ỹ])\s*([´`^~?])/g, '$1$2')
    .normalize('NFC');

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

  processedContent = processedContent.replace(/