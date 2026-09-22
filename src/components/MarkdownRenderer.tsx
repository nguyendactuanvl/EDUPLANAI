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
import { fixMath, formatMathContent } from '../lib/utils';

export const cleanMathText = (content: string): string => {
  if (!content) return '';
  return content
    // 1. Chuẩn hóa không thuộc về \notin (xử lý cả LaTeX và ký tự thường/Unicode)
    .replace(/\\in\s*\//g, ' \\notin ')
    .replace(/∈\s*\//g, ' \\notin ')
    .replace(/∉/g, ' \\notin ')
    .replace(/(?<=\s)in\s*\/(?=\s)/g, ' \\notin ')
    .replace(/\\not\s*\\in/g, ' \\notin ')
    .replace(/\\not\s+in(?![a-zA-Z])/g, ' \\notin ')
    
    // 2. Chuẩn hóa phần bù C_E A hoặc C_A B (tránh dính chữ CAB)
    .replace(/C([A-Z])([A-Z])/g, 'C_{$1}$2')
    .replace(/C_([A-Z])\s*([A-Z])/g, 'C_{$1}$2')
    
    // 3. Chuẩn hóa không phải tập con
    .replace(/\\subset(eq)?\s*\//g, ' \\not\\subset ')
    .replace(/⊂\s*\//g, ' \\not\\subset ')
    .replace(/⊄/g, ' \\not\\subset ')
    
    // 4. Chuẩn hóa dấu khác
    .replace(/=\s*\//g, ' \\ne ')
    .replace(/\/\s*=/g, ' \\ne ')
    .replace(/≠/g, ' \\ne ');
};

export const masterSanitizeLatex = (rawText: string): string => {
  if (!rawText) return '';
  let text = rawText;

  // --- 1. SỬA LỖI BẺ ĐÔI TỪ TIẾNG VIỆT DO NHẬN NHẦM NHÃN a., a) ---
  // Đảm bảo không bẻ từ "trà sữa" hay các từ có chữ "a" đứng sau dấu cách
  text = text
    .replace(/trà\s+sữ\s*\n*\s*a\./gi, 'trà sữa. ')
    .replace(/trà\s+sữ\s*\n*\s*a\)/gi, 'trà sữa) ')
    .replace(/sữ\s*\n+\s*a\./gi, 'sữa. ');

  // --- 2. TÁCH DÒNG CÁC CÂU HỎI BỊ DÍNH CHÙM (19., 20., 21...) ---
  text = text.replace(/([.!?])\s*(1[89]\.|2[0-9]\.|Câu\s+\d+:)/g, '$1\n\n$2');
  text = text.replace(/([.!?])\s*(20\.|21\.|22\.|Câu\s+\d+:)/g, '$1\n\n$2');

  // --- 3. PHỤC HỒI DẤU BACKSLASH CHO CÁC PHÉP TOÁN TẬP HỢP & QUAN HỆ ---
  text = text
    // Tập rỗng và phép giao, hợp, hiệu
    .replace(/(?<!\\)\b(emptyset)\b/g, '\\emptyset')
    .replace(/(?<!\\)\b([A-Z])cap([A-Z])\b/g, '$1 \\cap $2')
    .replace(/(?<!\\)\b([A-Z])cup([A-Z])\b/g, '$1 \\cup $2')
    .replace(/(?<!\\)\b([A-Z])setminus([A-Z])\b/g, '$1 \\setminus $2')
    .replace(/(?<!\\)\b(cap|cup|setminus)\b/g, '\\$1')
    // Tập số và tính chất đặc trưng
    .replace(/([a-zA-Z])inmathbb([A-Z])mid/g, '$1 \\in \\mathbb{$2} \\mid ')
    .replace(/(?<!\\)\b([a-zA-Z])\s*=\s*xinmathbb([A-Z])mid/g, '$1 = \\{x \\in \\mathbb{$2} \\mid ')
    .replace(/(?<!\\)\b([a-zA-Z])\s*=\s*\\?\{?\s*x\s*in\s*mathbb\s*([A-Z])\s*\\?mid/g, '$1 = \\{x \\in \\mathbb{$2} \\mid ')
    .replace(/(?<!\\)\b(mathbb)([RZQCND])\b/g, '\\$1{$2}')
    .replace(/(?<!\\)\b(mid)\b/g, '\\mid ')
    // Khắc phục thiếu ngoặc nhọn đóng ở cuối điều kiện tập hợp
    .replace(/([A-Z]\s*=\s*\\\{[^}]+=\s*0)(?!\})/g, '$1\\}')
    .replace(/([A-Z]\s*=\s*\\\{[^}]+<\s*\d+)(?!\})/g, '$1\\}')
    .replace(/([A-Z]\s*=\s*\\\{[^}]+>\s*\d+)(?!\})/g, '$1\\}')
    .replace(/([A-Z]\s*=\s*\\\{[^}]+(?:<=|>=|\\le|\\ge)\s*\d+)(?!\})/g, '$1\\}')
    // Căn thức, phân số, phép nhân
    .replace(/(\d+)?sqrt(\d+)/g, '$1\\sqrt{$2}')
    .replace(/frac7sqrt33/g, '\\frac{7\\sqrt{3}}{3}')
    .replace(/dcdottanalpha/g, 'd \\cdot \\tan\\alpha')
    .replace(/(?<!\\)\b(cdot)\b/g, '\\cdot')
    // Góc độ: 60^\\circ, 60^\circ, 60^circ -> 60^{\circ}
    .replace(/\^\\\\+circ|\^\\circ|\^circ/g, '^{\\circ}')
    .replace(/(\d+)\s*\^\{\\circ\}/g, '$1^{\\circ}');

  // Đảm bảo góc độ nằm trong môi trường toán $ nếu đứng độc lập
  text = text.replace(/(?<![\$a-zA-Z0-9])(\d+\^\{\\circ\})(?![\$a-zA-Z0-9])/g, '$$$1$$');

  // Đảm bảo căn bậc 2 standalone nằm trong $ nếu chưa có $
  text = text.replace(/(?<![\$a-zA-Z0-9])((\d+)?\\sqrt\{\d+\})(?![\$a-zA-Z0-9])/g, '$$$1$$');

  // --- 4. KHẮC PHỤC DẤU PHỦ ĐỊNH VÀ KÝ HIỆU BỊ LỆCH GẠCH CHÉO ---
  text = text
    .replace(/\\in\s*\//g, ' \\notin ')
    .replace(/∈\s*\//g, ' \\notin ')
    .replace(/∉/g, ' \\notin ')
    .replace(/(?<=\s)in\s*\/(?=\s)/g, ' \\notin ')
    .replace(/\\not\s*\\in/g, ' \\notin ')
    .replace(/\\not\s+in(?![a-zA-Z])/g, ' \\notin ')
    .replace(/=\s*\//g, ' \\ne ')
    .replace(/\/\s*=/g, ' \\ne ')
    .replace(/≠/g, ' \\ne ')
    .replace(/\\not\s*=/g, ' \\ne ')
    .replace(/\\subset(eq)?\s*\//g, ' \\not\\subset ')
    .replace(/⊂\s*\//g, ' \\not\\subset ')
    .replace(/⊄/g, ' \\not\\subset ');

  // --- 5. HÀN GẮN KHỐI PHÉP HIỆU & PHẦN BÙ BỊ VỠ TRONG BẢNG ---
  text = text.replace(
    /\\?\{?\s*x\s*\\?mid\s*x\s*\\?in\s*A\s*(\\text\{\s*và\s*\}|và)\s*\$?x\s*\\notin\s*B\$?\s*\\?\}?/g,
    '$$\\{x \\mid x \\in A \\text{ và } x \\notin B\\}$$'
  );
  text = text.replace(
    /\{x\s*\|\s*x\s*\\in\s*A\s+và\s+x\s*\\notin\s*B\}/g,
    '$$\\{x \\mid x \\in A \\text{ và } x \\notin B\\}$$'
  );
  text = text
    .replace(/\bC_([A-Z])([A-Z])\b/g, 'C_{$1}$2')
    .replace(/\bC([A-Z])([A-Z])\b/g, 'C_{$1}$2')
    .replace(/C_\{([A-Z])\}\s*([A-Z])/g, '\\mathrm{C}_{$1}$2');
  text = text.replace(/(?<![\$a-zA-Z0-9\\])\\mathrm\{C\}_\{([A-Z])\}\s*([A-Z])(?![a-zA-Z0-9\$])/g, '$\\mathrm{C}_{$1}$2$');

  // --- 6. XỬ LÝ KHỐI \begin{cases} LỒNG DẤU $ ---
  text = text.replace(/\$([^$]*?)\\begin\{cases\}([\s\S]*?)\\end\{cases\}([^$]*?)\$/g, 
    (_match, before, casesContent, after) => {
      const cleanBefore = before.trim() ? `$${before.trim()}$` : '';
      const cleanCases = `$$\\begin{cases}${casesContent}\\end{cases}$$`;
      const cleanAfter = after.trim() ? `$${after.trim()}$` : '';
      return `${cleanBefore}\n${cleanCases}\n${cleanAfter}`.trim();
    }
  );

  // --- 7. TỰ ĐỘNG BỌC NGOẶC NHỌN { } CHO CÁC PHƯƠNG ÁN TẬP HỢP ---
  text = text.replace(/\b([A-Z])\s*=\s*(-?\d+(?:\s*;\s*-?\d+)*)\b/g, '$1 = \\{$2\\}');
  // Tự động bọc từng biểu thức tập hợp độc lập trong $...$ nếu chưa có $ bao quanh
  text = text.replace(/(?<![\$a-zA-Z0-9])([A-Z]\s*=\s*\\\{[^$\n]+?\\\\})(?![\$a-zA-Z0-9])/g, '$$$1$$');
  // Tự động bọc biểu thức phép toán tập hợp độc lập A \cap B, A \cup B, A \setminus B
  text = text.replace(/(?<![\$a-zA-Z0-9])([A-Z]\s*\\(?:cap|cup|setminus)\s*[A-Z])(?![\$a-zA-Z0-9])/g, '$$$1$$');

  // --- 8. PHỤC HỒI MÔI TRƯỜNG CHO KÝ HIỆU TOÁN TRÔI NỔI NGOÀI DẤU $ ---
  const floatSymbols = ['Leftrightarrow', 'Leftarrow', 'Rightarrow', 'notin', 'in', 'cap', 'cup', 'setminus', 'emptyset', 'neq', 'subset', 'supset'];
  text = text.replace(new RegExp(`(?<![\\$a-zA-Z])\\\\(${floatSymbols.join('|')})(?![a-zA-Z])`, 'g'), (m, sym, offset, fullStr) => {
    const before = fullStr.slice(0, offset);
    const dollarsBefore = (before.match(/(?<!\\)\$/g) || []).length;
    if (dollarsBefore % 2 === 0) {
      return ` $\\${sym}$ `;
    }
    return m;
  });

  // Tự động khôi phục các cụm từ tập hợp/khoảng bị rụng dấu $ ở cuối câu (ví dụ: m \in [3; 6] hoặc A = [-2; 2])
  text = text.replace(/(?<!\$)(m\s*\\in\s*\[\s*-?\d+\s*;\s*-?\d+\s*\])(?!\$)/g, '$$$1$$');
  text = text.replace(/(?<!\$)([a-zA-Z]\s*\\in\s*[\(\[]\s*-?\d+\s*;\s*-?\d+\s*[\)\]])(?!\$)/g, '$$$1$$');
  text = text.replace(/(?<!\$)([A-Z]\s*=\s*[\(\[]\s*-?\d+\s*;\s*-?\d+\s*[\)\]])(?!\$)/g, '$$$1$$');

  // Đảm bảo bọc $...$ nếu chuỗi phương án/chuỗi ngắn chưa có dấu $
  if (text.includes('\\{') && !text.includes('$') && !/[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(text)) {
    text = `$${text}$`;
  }

  return text;
};

export const masterSanitizeMath = masterSanitizeLatex;
export const repairSetTheorySyntax = masterSanitizeLatex;

export const normalizeMathLatex = (rawText: string): string => {
  if (!rawText) return '';
  let text = masterSanitizeMath(rawText);
  text = cleanMathText(text);

  // BƯỚC 1: Xử lý các biến thể ký hiệu gạch chéo bị lệch sang phải hoặc tách rời
  text = text
    // Dấu không thuộc: \in/, \in /, \not\in, \not \in, ∈/, ∈ /
    .replace(/\\in\s*\//g, ' \\notin ')
    .replace(/∈\s*\//g, ' \\notin ')
    .replace(/∉/g, ' \\notin ')
    .replace(/(?<=\s)in\s*\/(?=\s)/g, ' \\notin ')
    .replace(/\\not\s*\\in/g, ' \\notin ')
    .replace(/\\not\s+in(?![a-zA-Z])/g, ' \\notin ')
    // Dấu không phải tập con: \subset/, \subset /, \not\subset, ⊂/, ⊄
    .replace(/\\subset(eq)?\s*\//g, ' \\not\\subset ')
    .replace(/\\not\s*\\subset(eq)?(?![a-zA-Z])/g, ' \\not\\subset ')
    .replace(/⊂\s*\//g, ' \\not\\subset ')
    .replace(/⊄/g, ' \\not\\subset ')
    // Dấu khác: =/, = /, /=, \not=, ≠
    .replace(/=\s*\//g, ' \\ne ')
    .replace(/\/\s*=/g, ' \\ne ')
    .replace(/\\not\s*=/g, ' \\ne ')
    .replace(/\\not\s*\\equiv/g, ' \\not\\equiv ')
    .replace(/≠/g, ' \\ne ');

  // BƯỚC 2: Tự động khôi phục dấu backslash (\) bị mất bên trong công thức
  // Áp dụng cho nội dung nằm trong cặp dấu $...$ hoặc các cụm từ khóa toán học đặc trưng
  text = text.replace(/\$([^\$]+)\$/g, (match, formula) => {
    let fixed = formula
      // Khôi phục các toán tử tập hợp & quan hệ
      .replace(/(?<!\\)\b(cap|cup|in|notin|subset|supset|subseteq|supseteq)\b/g, '\\$1')
      .replace(/(?<!\\)\b(mathbb|mathbf|mathcal)\b/g, '\\$1')
      .replace(/(?<!\\)\b(mid)\b/g, '\\mid ')
      // Khôi phục lượng giác & hàm số
      .replace(/(?<!\\)\b(sin|cos|tan|cot|lim)\b/g, '\\$1')
      // Khôi phục ký hiệu phép toán & so sánh
      .replace(/(?<!\\)\b(sqrt|frac|left|right|le|ge|ne|times|pm|cdot)\b/g, '\\$1');
    return `$${fixed}$`;
  });

  // BƯỚC 3: Xử lý trường hợp chuỗi toán không bọc dấu $ nhưng bị dính chữ (ví dụ: xinmathbbZmid)
  text = text
    .replace(/(?<!\\)\b([a-zA-Z])inmathbb([A-Z])mid/g, '$1 \\in \\mathbb{$2} \\mid ')
    .replace(/(?<!\\)\b([A-Z])cap([A-Z])\b/g, '$1 \\cap $2')
    .replace(/(?<!\\)\b([A-Z])cup([A-Z])\b/g, '$1 \\cup $2')
    // Tự động bọc naked C_{A}B hoặc C_A B
    .replace(/(?<![\$a-zA-Z0-9\\])\bC_\{([A-Z])\}\s*([A-Z])\b(?![a-zA-Z0-9\$])/g, '$C_{$1}$2$')
    .replace(/(?<![\$a-zA-Z0-9\\])\bC_([A-Z])\s+([A-Z])\b(?![a-zA-Z0-9\$])/g, '$C_{$1}$2$')
    // Tự động bọc naked x \notin B
    .replace(/(?<![\$a-zA-Z0-9\\])\b([a-zA-Z0-9]+)\s*\\notin\s*([a-zA-Z0-9]+)\b(?![a-zA-Z0-9\$])/g, '$$$1 \\notin $2$$');

  // BƯỚC 4: Tự động bọc $$ cho hệ phương trình \begin{cases} nếu thiếu
  text = text
    .replace(/(?<!\$)\\begin\{cases\}([\s\S]*?)\\end\{cases\}(?!\$)/g, '$$\\begin{cases}$1\\end{cases}$$')
    // Chuẩn hóa dấu ngắt dòng cho cases
    .replace(/\\\\(?=[a-zA-Z0-9])/g, '\\\\ ');

  return text;
};

export { formatMathContent };

export const MarkdownRenderer = ({ content, className }: { content: string, className?: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  let processedContent = masterSanitizeMath(content || '');
  processedContent = normalizeMathLatex(processedContent);
  processedContent = formatMathContent(processedContent);
  processedContent = fixMath(processedContent);
  processedContent = normalizeMathLatex(processedContent);
  processedContent = masterSanitizeMath(processedContent);

  // 0. Unescape escaped dollar signs so KaTeX/remark-math parses them as math delimiters
  processedContent = processedContent.replace(/\\(\$)/g, '$1');

  // Convert standard LaTeX \( ... \) to $ ... $
  processedContent = processedContent.replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$');
  // Inside parentheses or explanation sentences, \[ ... \] must be converted to $ ... $ (Inline Math)
  processedContent = processedContent.replace(/\(([^()\n]*?)\\\[([\s\S]*?)\\\]([^()\n]*?)\)/g, (m, b, f, a) => {
    return `(${b}$${f.replace(/[\r\n]+/g, ' ').replace(/\s{2,}/g, ' ').trim()}$${a})`;
  });
  // Also convert any $$ ... $$ inside parentheses to $ ... $ (Inline Math)
  processedContent = processedContent.replace(/\(([^()\n]*?)\$\$([\s\S]*?)\$\$([^()\n]*?)\)/g, (m, b, f, a) => {
    return `(${b}$${f.replace(/[\r\n]+/g, ' ').replace(/\s{2,}/g, ' ').trim()}$${a})`;
  });
  // Convert remaining standalone \[ ... \] to $$ ... $$
  processedContent = processedContent.replace(/\\\[([\s\S]*?)\\\]/g, '$$$$$1$$$$');

  // Auto-wrap naked \begin{cases}...\end{cases} or math environments if not wrapped in $ or $$
  // Also normalize line breaks inside cases so equations don't merge (e.g. \ x - y -> \\ x - y)
  processedContent = formatMathContent(processedContent);

  // Normalize spaces inside inline $ ... $ so remark-math recognizes them (e.g. "$ 1 $" -> "$1$", "$ x = 2 $" -> "$x = 2$")
  // Strip any newlines \n and excess spaces inside $ ... $, and pull trailing punctuation OUT of the inline math block ($0.$ -> $0$.)
  processedContent = processedContent.replace(/(?<!\$)\$(?!\$)([\s\S]+?)(?<!\$)\$(?!\$)/g, (match, formula) => {
    if (formula.includes('$$')) return match;
    let trimmed = formula.replace(/[\r\n]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
    if (!trimmed) return match;

    // Normalize pseudo not-equal symbols inside math block
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

  // 0.1 Unwrap any existing code blocks around SVG
  processedContent = processedContent.replace(/```[a-z]*\s*(<svg[\s\S]*?<\/svg>)\s*```/gi, '$1');
  
  // Wrap SVGs in a container to prevent Markdown from messing them up and to style them
  processedContent = processedContent.replace(/(<svg[\s\S]*?<\/svg>)/gi, (match) => {
    try {
      const base64 = typeof btoa !== 'undefined' ? btoa(encodeURIComponent(match)) : Buffer.from(encodeURIComponent(match)).toString('base64');
      return `\n\n<svg-wrapper data-svg="${base64}"></svg-wrapper>\n\n`;
    } catch (e) {
      return match;
    }
  });
  
  // 1. Remove stray preamble packages that might be generated (e.g. \usetikzlibrary{...})
  processedContent = processedContent.replace(/\\(usetikzlibrary|usepackage)\s*\{[^}]*\}\s*/gi, '');

  // 1.1 Unwrap any existing code blocks around TikZ to normalize
  processedContent = processedContent.replace(/```[a-z]*\s*([\s\S]*?\\begin\s*\{tikzpicture\}[\s\S]*?\\end\s*\{tikzpicture\})\s*```/gi, (match, inner) => {
    return inner.replace(/\\(usetikzlibrary|usepackage)\s*\{[^}]*\}\s*/gi, '');
  });
  
  // 1.5 Wrap loose tikz code blocks that don't have begin/end environment
  processedContent = processedContent.replace(/```tikz\s*([\s\S]*?)```/gi, (match, inner) => {
    let cleaned = inner.replace(/\\(usetikzlibrary|usepackage)\s*\{[^}]*\}\s*/gi, '').trim();
    if (!cleaned.includes('\\begin{tikzpicture}')) {
       return `\\begin{tikzpicture}\n${cleaned}\n\\end{tikzpicture}`;
    }
    return cleaned;
  });
  
  // 1.55 Handle \dotfill: replace with clean academic dotted line
  processedContent = processedContent.replace(/\\dotfill\b/g, '. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .');

  // 1.5 Clean up any previously injected HTML choice containers to standard Markdown list
  processedContent = processedContent.replace(/<div\s+class=["']question-choices[^"']*["']>([\s\S]*?)<\/div>/gi, '$1');
  processedContent = processedContent.replace(/<div\s+class=["']choice-item[^"']*["']>([\s\S]*?)<\/div>/gi, (m, inner) => {
    const labelMatch = inner.match(/<span\s+class=["']choice-label[^"']*["']>([\s\S]*?)<\/span>/i);
    const textMatch = inner.match(/<span\s+class=["']choice-text[^"']*["']>([\s\S]*?)<\/span>/i);
    const label = labelMatch ? labelMatch[1].replace(/<[^>]+>/g, '').trim() : '';
    const text = textMatch ? textMatch[1].replace(/<[^>]+>/g, '').trim() : inner.replace(/<[^>]+>/g, '').trim();
    return `\n- **${label}** ${text}\n`;
  });

  // 2. Base64 encode TikZ blocks to prevent Markdown/KaTeX interference
  // If instant SVG can be generated (e.g. tkz-tab variation tables, function plots, geometry),
  // convert directly to svg-wrapper so it loads in 0.001s without any delay or spinning!
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

  // 3. Pre-render LaTeX inside raw HTML tags (e.g. <table>, <td>, <div>)
  // Because remark-math ignores LaTeX inside raw HTML elements
  if (/<(table|td|th|div|span|p)[^>]*>/i.test(processedContent)) {
    processedContent = processedContent.replace(/(<(table|tr|td|th|div|span|p)[^>]*>[\s\S]*?<\/\2>)/gi, (htmlBlock) => {
      // Replace $$...$$ in HTML
      let rendered = htmlBlock.replace(/\$\$([\s\S]*?)\$\$/g, (m, tex) => {
        try {
          return katex.renderToString(tex.trim(), { displayMode: true, throwOnError: false, errorColor: 'inherit', strict: false });
        } catch (e) {
          return m;
        }
      });
      // Replace $...$ in HTML
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

  // 4. Auto-scanner effect: whenever content updates or AI streams in new text,
  // scan the rendered DOM container with katex auto-render to catch any unparsed formula delimiters
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
            let cleanSrc = src || '';
            // Auto convert Google Drive preview/view links to direct streaming image links
            if (cleanSrc.includes('drive.google.com/file/d/')) {
              const fileId = cleanSrc.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1];
              if (fileId) {
                cleanSrc = `https://drive.google.com/uc?export=view&id=${fileId}`;
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
                  (e.target as HTMLElement).setAttribute('data-error', 'true');
                }}
                {...props}
              />
            );
          },
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
            // Check if items are multiple choice options (- **A.** ...)
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


