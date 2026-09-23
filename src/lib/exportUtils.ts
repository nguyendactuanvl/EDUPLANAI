import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';
import katex from 'katex';
import { mml2omml } from 'mathml2omml-plus';
import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  convertMillimetersToTwip,
  Packer,
  ImportedXmlComponent,
  ImageRun,
  type ParagraphChild,
  type FileChild,
} from 'docx';
import { fixInlineOptionText, sanitizeMathBeforeRender } from './utils';

interface RunStyle {
  bold?: boolean;
  italics?: boolean;
  color?: string;
  size?: number;
  font?: string;
  superScript?: boolean;
  subScript?: boolean;
}

interface ExportOptions {
  mathFormat: 'omml' | 'latex' | 'image';
}

/**
 * Converts a LaTeX formula into a native Word OMML equation component.
 * Uses KaTeX (generating MathML) + mathml2omml-plus (generating OMML <m:oMath>)
 * + docx ImportedXmlComponent to embed a real Word Equation.
 */
function latexToOmmlComponent(rawTex: string, isBlock: boolean = false): any {
  if (!rawTex || !rawTex.trim()) {
    return new TextRun({ text: '' });
  }

  const cleanTex = rawTex.trim()
    .replace(/^\\\[|\\\]$/g, '')
    .replace(/^\\\(|\\\)$/g, '')
    .replace(/\\dotfill\b/g, '')
    .trim();

  try {
    const mathmlHtml = katex.renderToString(cleanTex, {
      displayMode: isBlock,
      output: 'mathml',
      throwOnError: false,
    });

    const match = mathmlHtml.match(/<math[\s\S]*?<\/math>/i);
    if (match) {
      const convertFn = typeof mml2omml === 'function' ? mml2omml : ((mml2omml as any)?.mml2omml || (mml2omml as any)?.default || mml2omml);
      const omml = convertFn(match[0]);
      if (omml && omml.includes('m:oMath')) {
        const comp = ImportedXmlComponent.fromXmlString(omml);
        const root = comp && (comp as any).root && (comp as any).root[0] ? (comp as any).root[0] : comp;
        return root;
      }
    }
  } catch (err) {
    console.warn('OMML equation conversion error for LaTeX:', rawTex, err);
  }

  // Fallback: styled italic text in Cambria Math (native Word mathematical typography)
  return new TextRun({
    text: cleanTex,
    italics: true,
    font: 'Cambria Math',
    size: 24,
  });
}

/**
 * Converts an SVG element (e.g. from TikZ / geometry diagram) into a high-res PNG data URL.
 */
async function svgToPngDataUrl(svgNode: SVGSVGElement): Promise<string> {
  try {
    const svgClone = svgNode.cloneNode(true) as SVGSVGElement;
    if (!svgClone.getAttribute('xmlns')) {
      svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    }
    const rect = svgNode.getBoundingClientRect();
    const width = Math.max(Math.round(rect.width), parseInt(svgNode.getAttribute('width') || '400', 10) || 400);
    const height = Math.max(Math.round(rect.height), parseInt(svgNode.getAttribute('height') || '300', 10) || 300);

    svgClone.setAttribute('width', String(width));
    svgClone.setAttribute('height', String(height));

    const svgHtml = new XMLSerializer().serializeToString(svgClone);
    const svgBlob = new Blob([svgHtml], { type: 'image/svg+xml;charset=utf-8' });
    const blobUrl = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.crossOrigin = 'anonymous';

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = (e) => reject(e);
      img.src = blobUrl;
    });

    const canvas = document.createElement('canvas');
    const scale = 2;
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No canvas context');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(blobUrl);
    return canvas.toDataURL('image/png');
  } catch (err) {
    console.warn('Direct SVG to PNG failed, falling back to html2canvas:', err);
    const canvas = await html2canvas(svgNode.parentElement || (svgNode as any), {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true,
    });
    return canvas.toDataURL('image/png');
  }
}

/**
 * Converts a base64 / data URL string to a Uint8Array buffer for docx ImageRun.
 */
function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const parts = dataUrl.split(',');
  const b64 = parts.length > 1 ? parts[1] : parts[0];
  const binaryString = atob(b64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Extracts plain text from a node, preserving LaTeX formulas.
 */
function getNodeLatexOrText(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent || '';
  }
  if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as HTMLElement;
    const tagName = el.tagName.toUpperCase();

    // Check for preprocessed OMML math token
    if (el.classList.contains('omml-math-node')) {
      const tex = decodeURIComponent(el.getAttribute('data-latex') || '');
      return `$${tex}$`;
    }

    // Check for KaTeX element
    if (el.classList.contains('katex') || el.classList.contains('katex-display')) {
      const ann = el.querySelector("annotation[encoding='application/x-tex']") || el.querySelector("annotation");
      if (ann && ann.textContent) {
        return `$${ann.textContent.trim()}$`;
      }
      const texAttr = el.getAttribute('data-tex') || el.getAttribute('data-latex');
      if (texAttr) return `$${texAttr}$`;
    }

    // Guard: ignore internal KaTeX structures so they never leak raw text
    if (
      el.classList.contains('katex-mathml') ||
      el.classList.contains('katex-html') ||
      tagName === 'MATH' ||
      tagName === 'ANNOTATION' ||
      tagName === 'SEMANTICS'
    ) {
      return '';
    }

    let text = '';
    for (let i = 0; i < el.childNodes.length; i++) {
      text += getNodeLatexOrText(el.childNodes[i]);
    }
    return text;
  }
  return '';
}

/**
 * Strips internal system type tags like (Loại tf), (Loại mcq), [Loại: tf], (Loại Đúng/Sai), etc.
 */
function stripInternalTags(text: string): string {
  if (!text) return '';
  return text
    .replace(/(Câu\s*\d+)\s*[:\.]?\s*[\(\[]\s*Loại(?:\s*trắc\s*nghiệm|\s*đúng\s*sai|\s*trả\s*lời\s*ngắn|\s*tự\s*luận|[:\s]+[a-z0-9_\-]+)?\s*[\)\]]\s*[:\.]?/gi, '$1:')
    .replace(/[\(\[]\s*Loại(?:\s*trắc\s*nghiệm|\s*đúng\s*sai|\s*trả\s*lời\s*ngắn|\s*tự\s*luận|[:\s]+[a-z0-9_\-]+)?\s*[\)\]]\s*:?/gi, '')
    .replace(/(Câu\s*\d+[:\.])\s*/gi, '$1 ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

interface TextOrMathToken {
  type: 'text' | 'math';
  content: string;
  isBlock?: boolean;
}

/**
 * Robust tokenizer that splits a string into alternating plain text and LaTeX math tokens.
 * Accurately parses $...$, $$...$$, \(...\), \[...\] without stripping or losing any math content or punctuation.
 */
function tokenizeTextAndMath(rawText: string): TextOrMathToken[] {
  if (!rawText) return [];
  const tokens: TextOrMathToken[] = [];
  const mathRegex = /(\$\$[\s\S]*?\$\$|\$(?!\$)(?:[^\$\n]+|\\begin\{[a-zA-Z*]+\}[\s\S]*?\\end\{[a-zA-Z*]+\})(?<!\$)\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\))/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = mathRegex.exec(rawText)) !== null) {
    if (match.index > lastIdx) {
      const textPart = rawText.slice(lastIdx, match.index);
      if (textPart) {
        tokens.push({ type: 'text', content: textPart });
      }
    }

    const fullMath = match[0];
    let isBlock = false;
    let cleanMath = fullMath;

    if (fullMath.startsWith('$$') && fullMath.endsWith('$$')) {
      cleanMath = fullMath.slice(2, -2).trim();
      isBlock = true;
    } else if (fullMath.startsWith('$') && fullMath.endsWith('$')) {
      cleanMath = fullMath.slice(1, -1).trim();
    } else if (fullMath.startsWith('\\[') && fullMath.endsWith('\\]')) {
      cleanMath = fullMath.slice(2, -2).trim();
      isBlock = true;
    } else if (fullMath.startsWith('\\(') && fullMath.endsWith('\\)')) {
      cleanMath = fullMath.slice(2, -2).trim();
    }

    tokens.push({
      type: 'math',
      content: cleanMath,
      isBlock,
    });

    lastIdx = match.index + fullMath.length;
  }

  if (lastIdx < rawText.length) {
    const trailingPart = rawText.slice(lastIdx);
    if (trailingPart) {
      tokens.push({ type: 'text', content: trailingPart });
    }
  }

  return tokens;
}

/**
 * Converts an array of TextOrMathTokens into Word ParagraphChild runs (TextRun and OMML equations).
 */
function tokensToRuns(
  tokens: TextOrMathToken[],
  style: RunStyle = {},
  options: ExportOptions
): ParagraphChild[] {
  const runs: ParagraphChild[] = [];

  for (const token of tokens) {
    if (token.type === 'text') {
      const qMatch = token.content.match(/^(\s*(?:\*\*)?(?:Câu|Bài)\s*\d+[:\.]?(?:\*\*)?)([\s\S]*)$/i);
      if (qMatch && !style.bold) {
        const cleanLabel = qMatch[1].replace(/\*\*/g, '').trim();
        runs.push(
          new TextRun({
            text: `${cleanLabel} `,
            bold: true,
            font: style.font || 'Times New Roman',
            size: style.size || 24,
          })
        );
        const rest = qMatch[2].replace(/^\s+/, '');
        if (rest) {
          runs.push(
            new TextRun({
              text: rest,
              font: style.font || 'Times New Roman',
              size: style.size || 24,
              bold: style.bold,
              italics: style.italics,
              superScript: style.superScript,
              subScript: style.subScript,
            })
          );
        }
      } else {
        runs.push(
          new TextRun({
            text: token.content,
            font: style.font || 'Times New Roman',
            size: style.size || 24,
            bold: style.bold,
            italics: style.italics,
            superScript: style.superScript,
            subScript: style.subScript,
          })
        );
      }
    } else {
      // Math token
      if (options.mathFormat === 'latex') {
        runs.push(
          new TextRun({
            text: token.isBlock ? `\n$$${token.content}$$\n` : ` $${token.content}$ `,
            italics: true,
            font: 'Times New Roman',
            size: style.size || 24,
          })
        );
      } else {
        runs.push(latexToOmmlComponent(token.content, token.isBlock));
      }
    }
  }

  return runs;
}

/**
 * Parses plain text that may contain $...$, $$...$$, \(...\), \[...\] into TextRuns and OMML math components.
 */
function parseTextWithMath(
  text: string,
  style: RunStyle,
  options: ExportOptions
): ParagraphChild[] {
  if (!text) return [];
  // Clean \dotfill in raw text
  let safeText = text.replace(/\\dotfill\b/g, '. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .');
  safeText = stripInternalTags(safeText);

  const tokens = tokenizeTextAndMath(safeText);
  return tokensToRuns(tokens, style, options);
}

/**
 * Parses inline HTML nodes (spans, bold, italic, katex, img, breaks) into ParagraphChild items.
 */
function parseInlineContent(
  node: Node,
  style: RunStyle = {},
  options: ExportOptions
): ParagraphChild[] {
  const runs: ParagraphChild[] = [];

  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || '';
    return parseTextWithMath(text, style, options);
  }

  if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as HTMLElement;
    const tagName = el.tagName.toUpperCase();

    // Check if it's an OMML math token (preprocessed KaTeX)
    if (el.classList.contains('omml-math-node')) {
      const tex = decodeURIComponent(el.getAttribute('data-latex') || '');
      const isBlock = el.getAttribute('data-block') === '1';

      if (options.mathFormat === 'latex') {
        return [
          new TextRun({
            text: isBlock ? `\n$$${tex}$$\n` : ` $${tex}$ `,
            italics: true,
            font: 'Times New Roman',
            size: style.size || 24,
          }),
        ];
      }
      return [latexToOmmlComponent(tex, isBlock)];
    }

    // Check if it's a KaTeX math element directly
    if (el.classList.contains('katex') || el.classList.contains('katex-display')) {
      const ann = el.querySelector("annotation[encoding='application/x-tex']") || el.querySelector("annotation");
      const tex = ann ? ann.textContent || '' : el.getAttribute('data-tex') || el.getAttribute('data-latex') || '';
      const isBlock = el.classList.contains('katex-display') || !!el.closest('.katex-display');

      if (options.mathFormat === 'latex') {
        return [
          new TextRun({
            text: isBlock ? `\n$$${tex}$$\n` : ` $${tex}$ `,
            italics: true,
            font: 'Times New Roman',
            size: style.size || 24,
          }),
        ];
      }
      return [latexToOmmlComponent(tex, isBlock)];
    }

    // Guard: ignore internal KaTeX structures so they never leak raw text
    if (
      el.classList.contains('katex-mathml') ||
      el.classList.contains('katex-html') ||
      tagName === 'MATH' ||
      tagName === 'ANNOTATION' ||
      tagName === 'SEMANTICS'
    ) {
      return [];
    }

    if (tagName === 'STRONG' || tagName === 'B') {
      for (let i = 0; i < el.childNodes.length; i++) {
        runs.push(...parseInlineContent(el.childNodes[i], { ...style, bold: true }, options));
      }
      return runs;
    }

    if (tagName === 'EM' || tagName === 'I') {
      for (let i = 0; i < el.childNodes.length; i++) {
        runs.push(...parseInlineContent(el.childNodes[i], { ...style, italics: true }, options));
      }
      return runs;
    }

    if (tagName === 'SUP') {
      for (let i = 0; i < el.childNodes.length; i++) {
        runs.push(...parseInlineContent(el.childNodes[i], { ...style, superScript: true }, options));
      }
      return runs;
    }

    if (tagName === 'SUB') {
      for (let i = 0; i < el.childNodes.length; i++) {
        runs.push(...parseInlineContent(el.childNodes[i], { ...style, subScript: true }, options));
      }
      return runs;
    }

    if (tagName === 'BR') {
      return [new TextRun({ break: 1 })];
    }

    if (tagName === 'IMG') {
      const img = el as HTMLImageElement;
      if (img.src && img.src.startsWith('data:image/')) {
        try {
          const bytes = dataUrlToUint8Array(img.src);
          const origW = img.naturalWidth || parseInt(img.getAttribute('width') || '360', 10) || 360;
          const origH = img.naturalHeight || parseInt(img.getAttribute('height') || '240', 10) || 240;
          const maxW = 460;
          const scale = origW > maxW ? maxW / origW : 1;
          const finalW = Math.round(origW * scale);
          const finalH = Math.round(origH * scale);

          return [
            new ImageRun({
              type: 'png',
              data: bytes,
              transformation: {
                width: finalW,
                height: finalH,
              },
            }),
          ];
        } catch (e) {
          console.warn('Failed to embed image in run:', e);
        }
      }
      return [];
    }

    // Default container (SPAN, DIV, etc.)
    for (let i = 0; i < el.childNodes.length; i++) {
      runs.push(...parseInlineContent(el.childNodes[i], style, options));
    }
  }

  return runs;
}

/**
 * Strips leading choice letters (A., B., C., D., A), B), C), D)) so labels are not duplicated.
 */
function cleanOptionText(text: string): string {
  const stripped = text
    .replace(/^\s*(?:[-*]\s*)?(?:\*{0,2})[A-D][\.\:\)]?(?:\*{0,2})[\.\:\)]?\s*/i, '')
    .replace(/^[\s\.\:\)]+/, '')
    .trim();
  const sanitized = sanitizeMathBeforeRender(stripped);
  return fixInlineOptionText(sanitized);
}

/**
 * Strips leading true/false statement letters (a), b), c), d)) so labels are not duplicated.
 */
function cleanTfText(text: string): string {
  return text
    .replace(/^\s*(?:[-*]\s*)?(?:\*{0,2})[a-d][\.\:\)]?(?:\*{0,2})[\.\:\)]?\s*/i, '')
    .replace(/^[\s\.\:\)]+/, '')
    .trim();
}

const INVISIBLE_BORDER = {
  top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
  left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
  right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
};

/**
 * Builds a borderless Word Table for 4 multiple choice options.
 * Rule: 1 row x 4 cols (25% width each) if short, or 2 rows x 2 cols (50% width each) if long.
 */
function buildInvisibleChoiceTable(
  optionsList: { label: string; node?: Node; text?: string }[],
  options: ExportOptions
): Table {
  // Ensure we have up to 4 options
  const cleanOpts = optionsList.slice(0, 4);

  // Measure content lengths
  const texts = cleanOpts.map((opt) => {
    if (opt.text) return cleanOptionText(opt.text);
    if (opt.node) return cleanOptionText(getNodeLatexOrText(opt.node));
    return '';
  });

  const maxLen = Math.max(...texts.map((t) => t.length), 0);
  const use4Cols = maxLen <= 32;

  const createCell = (opt: { label: string; node?: Node; text?: string }, colPct: number) => {
    let childRuns: ParagraphChild[] = [];

    if (opt.node) {
      const hasImg = opt.node instanceof HTMLElement && !!opt.node.querySelector('img');
      if (hasImg) {
        const cloned = opt.node.cloneNode(true) as HTMLElement;
        const bolds = Array.from(cloned.querySelectorAll('b, strong'));
        for (const b of bolds) {
          if (/^\s*(?:[-*]\s*)?(?:\*{0,2})[A-D][\.\:\)]?(?:\*{0,2})\s*$/i.test(b.textContent || '')) {
            b.remove();
          }
        }
        childRuns = parseInlineContent(cloned, {}, options);
      } else {
        const rawContent = getNodeLatexOrText(opt.node);
        childRuns = parseTextWithMath(cleanOptionText(rawContent), {}, options);
      }
    } else if (opt.text) {
      childRuns = parseTextWithMath(cleanOptionText(opt.text), {}, options);
    }

    return new TableCell({
      width: { size: colPct, type: WidthType.PERCENTAGE },
      borders: INVISIBLE_BORDER,
      margins: { top: 60, bottom: 60, left: 80, right: 80 },
      children: [
        new Paragraph({
          spacing: { line: 288, after: 40 },
          children: [
            new TextRun({
              text: `${opt.label} `,
              bold: true,
              font: 'Times New Roman',
              size: 24,
            }),
            ...childRuns,
          ],
        }),
      ],
    });
  };

  const rows: TableRow[] = [];

  if (use4Cols) {
    const cells = cleanOpts.map((opt) => createCell(opt, 25));
    // Pad to 4 cells if needed
    while (cells.length < 4) {
      cells.push(
        new TableCell({
          width: { size: 25, type: WidthType.PERCENTAGE },
          borders: INVISIBLE_BORDER,
          children: [new Paragraph({ children: [] })],
        })
      );
    }
    rows.push(new TableRow({ children: cells }));
  } else {
    // 2 rows x 2 cols
    const cellA = cleanOpts[0] ? createCell(cleanOpts[0], 50) : new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, borders: INVISIBLE_BORDER, children: [new Paragraph({})] });
    const cellB = cleanOpts[1] ? createCell(cleanOpts[1], 50) : new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, borders: INVISIBLE_BORDER, children: [new Paragraph({})] });
    const cellC = cleanOpts[2] ? createCell(cleanOpts[2], 50) : new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, borders: INVISIBLE_BORDER, children: [new Paragraph({})] });
    const cellD = cleanOpts[3] ? createCell(cleanOpts[3], 50) : new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, borders: INVISIBLE_BORDER, children: [new Paragraph({})] });

    rows.push(new TableRow({ children: [cellA, cellB] }));
    rows.push(new TableRow({ children: [cellC, cellD] }));
  }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: use4Cols ? [2338, 2339, 2339, 2339] : [4677, 4678],
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    },
    rows,
  });
}

/**
 * Parses a single statement line text into ParagraphChild items (TextRuns and OMML math components),
 * guaranteeing that 100% of formulas inside $...$ or $$...$$ are preserved with no lost characters,
 * and trailing punctuation (e.g. ".") is never truncated.
 * Sử dụng trực tiếp hàm parseTextWithMath của hệ thống để xử lý nguyên vẹn toàn bộ chuỗi.
 */
function parseStatementRuns(
  statementText: string,
  options: ExportOptions
): ParagraphChild[] {
  let cleanText = (statementText || '').trim();
  // Xóa bỏ nhãn tiền tố của ý (a), b), c), d) nếu có ở đầu chuỗi)
  cleanText = cleanText.replace(/^\s*(?:[-*]\s*)?(?:\*{0,2})\(?[a-d]\)?[\.\:\)]?(?:\*{0,2})[\.\:\)]?\s*/i, '').trim();

  if (!cleanText) {
    return [];
  }

  // Tận dụng chính hàm bóc tách văn bản kèm công thức đang dùng cho đề bài (parseTextWithMath)
  // để xử lý NGUYÊN VẸN toàn bộ chuỗi của từng ý a), b), c), d), bảo toàn công thức toán và dấu chấm kết thúc.
  return parseTextWithMath(cleanText, {}, options);
}

/**
 * Builds separate Paragraphs for True/False statements a), b), c), d) indented by 0.5 cm.
 * Guarantees that every statement has its label, text, and formula seamlessly rendered in a single paragraph.
 * Ghép toàn bộ nhãn a), phần chữ, phần công thức toán (MathRun/OMML) và dấu chấm kết thúc vào CÙNG MỘT ĐỐI TƯỢNG new Paragraph.
 * Tuyệt đối không tạo Paragraph riêng cho dấu chấm . hay ký tự rác.
 */
function buildTrueFalseParagraphs(
  statements: { label: string; node?: Node; text?: string }[],
  options: ExportOptions
): Paragraph[] {
  return statements.map((stmt) => {
    let childRuns: ParagraphChild[] = [];

    if (stmt.node) {
      // Check if node contains an image (e.g. geometric figure)
      const hasImg = stmt.node instanceof HTMLElement && !!stmt.node.querySelector('img');
      if (hasImg) {
        const cloned = stmt.node.cloneNode(true) as HTMLElement;
        const bolds = Array.from(cloned.querySelectorAll('b, strong'));
        for (const b of bolds) {
          if (/^\s*(?:[-*]\s*)?(?:\*{0,2})\(?[a-d]\)?[\.\:\)]?(?:\*{0,2})\s*$/i.test(b.textContent || '')) {
            b.remove();
          }
        }
        childRuns = parseInlineContent(cloned, {}, options);
      } else {
        // Extract complete text + math intact, preserving every formula and trailing punctuation
        const fullContent = getNodeLatexOrText(stmt.node);
        childRuns = parseStatementRuns(fullContent, options);
      }
    } else if (stmt.text) {
      childRuns = parseStatementRuns(stmt.text, options);
    }

    // Ghép toàn bộ nhãn a), phần chữ, phần công thức toán (MathRun/OMML) và dấu chấm kết thúc vào CÙNG MỘT ĐỐI TƯỢNG new Paragraph
    return new Paragraph({
      indent: { left: convertMillimetersToTwip(5) }, // 0.5 cm
      spacing: { line: 288, after: 80 }, // 1.2 lines, 4pt after
      children: [
        new TextRun({
          text: `${stmt.label} `,
          bold: true,
          font: 'Times New Roman',
          size: 24,
        }),
        ...childRuns,
      ],
    });
  });
}

/**
 * Recursively converts a DOM node or tree into an array of docx FileChild (Paragraph | Table).
 */
async function parseDomToDocxChildren(
  root: HTMLElement,
  options: ExportOptions
): Promise<FileChild[]> {
  const result: FileChild[] = [];

  // Helper to process child nodes of an element
  async function processNode(node: Node): Promise<void> {
    if (node.nodeType === Node.TEXT_NODE) {
      const txt = (node.textContent || '').trim();
      // Không tạo Paragraph riêng cho dấu chấm . hay ký tự rác
      if (txt && !/^[.,:;?!]+$/.test(txt)) {
        result.push(
          new Paragraph({
            spacing: { line: 288, after: 80 },
            children: parseTextWithMath(txt, {}, options),
          })
        );
      }
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const el = node as HTMLElement;
    const tagName = el.tagName.toUpperCase();

    // 1. Headings
    if (/^H[1-6]$/.test(tagName)) {
      const level = parseInt(tagName[1], 10);
      const isH1 = level === 1;
      const isH2 = level === 2;
      const size = isH1 ? 28 : isH2 ? 26 : 24;
      const runs = parseInlineContent(el, { bold: true, size }, options);

      result.push(
        new Paragraph({
          spacing: { line: 288, before: isH1 ? 180 : 120, after: 80 },
          alignment: isH1 ? AlignmentType.CENTER : AlignmentType.LEFT,
          children: runs,
        })
      );
      return;
    }

    // 2. Question blocks (.question-block)
    if (el.classList.contains('question-block')) {
      // Find question prompt and any options/tf inside
      const children = Array.from(el.children);
      for (const child of children) {
        await processNode(child);
      }
      return;
    }

    // 3. Tables
    if (tagName === 'TABLE') {
      const className = el.className || '';
      const style = el.getAttribute('style') || '';

      // Check if it's an options table
      if (className.includes('options-table')) {
        const cells = Array.from(el.querySelectorAll('td'));
        if (cells.length >= 2) {
          const optsList = cells.map((td, idx) => {
            const label = ['A.', 'B.', 'C.', 'D.'][idx] || `${String.fromCharCode(65 + idx)}.`;
            return { label, node: td };
          });
          result.push(buildInvisibleChoiceTable(optsList, options));
          return;
        }
      }

      // Check if it's a True/False table
      if (className.includes('tf-table')) {
        const rows = Array.from(el.querySelectorAll('tr'));
        const stmts: { label: string; node?: Node }[] = [];
        rows.forEach((tr, idx) => {
          const tds = Array.from(tr.querySelectorAll('td'));
          const label = ['a)', 'b)', 'c)', 'd)'][idx] || `${String.fromCharCode(97 + idx)})`;
          if (tds.length >= 2) {
            stmts.push({ label, node: tds[1] });
          } else if (tds.length === 1) {
            stmts.push({ label, node: tds[0] });
          }
        });
        if (stmts.length > 0) {
          result.push(...buildTrueFalseParagraphs(stmts, options));
          return;
        }
      }

      // General Tables (Header table, Matrix, Candidate box, etc.)
      const isBorderless =
        className.includes('borderless') ||
        style.includes('border: none') ||
        style.includes('border:none');

      const borderConfig = isBorderless
        ? INVISIBLE_BORDER
        : {
            top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
            bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
            left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
            right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
          };

      const rows: TableRow[] = [];
      const trElements = Array.from(el.querySelectorAll('tr'));

      for (const tr of trElements) {
        const cellElements = Array.from(tr.querySelectorAll('th, td'));
        const rowCells: TableCell[] = [];

        for (const cell of cellElements) {
          const cellEl = cell as HTMLElement;
          const cellStyle = cellEl.getAttribute('style') || '';
          const widthMatch = cellStyle.match(/width:\s*([0-9.]+)%/);
          const widthPct = widthMatch
            ? Math.round(parseFloat(widthMatch[1]))
            : Math.round(100 / Math.max(1, cellElements.length));

          // Cell content paragraphs
          const cellParagraphs: Paragraph[] = [];
          const cellChildren = Array.from(cellEl.children);

          if (cellChildren.length > 0 && cellChildren.some((c) => /^(DIV|P|H[1-6])$/.test(c.tagName))) {
            for (const child of cellChildren) {
              const runs = parseInlineContent(child, {}, options);
              cellParagraphs.push(
                new Paragraph({
                  spacing: { line: 288, after: 40 },
                  alignment: cellStyle.includes('text-align: center')
                    ? AlignmentType.CENTER
                    : AlignmentType.LEFT,
                  children: runs,
                })
              );
            }
          } else {
            const runs = parseInlineContent(cellEl, {}, options);
            cellParagraphs.push(
              new Paragraph({
                spacing: { line: 288, after: 40 },
                alignment: cellStyle.includes('text-align: center')
                  ? AlignmentType.CENTER
                  : AlignmentType.LEFT,
                children: runs,
              })
            );
          }

          rowCells.push(
            new TableCell({
              width: { size: widthPct, type: WidthType.PERCENTAGE },
              borders: borderConfig,
              margins: { top: 80, bottom: 80, left: 100, right: 100 },
              children: cellParagraphs.length > 0 ? cellParagraphs : [new Paragraph({})],
            })
          );
        }

        if (rowCells.length > 0) {
          rows.push(new TableRow({ children: rowCells }));
        }
      }

      if (rows.length > 0) {
        result.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: isBorderless
              ? {
                  top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
                  bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
                  left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
                  right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
                  insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'auto' },
                  insideVertical: { style: BorderStyle.NONE, size: 0, color: 'auto' },
                }
              : {
                  top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                  bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                  left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                  right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                  insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                  insideVertical: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                },
            rows,
          })
        );
      }
      return;
    }

    // 4. Lists (UL / OL)
    if (tagName === 'UL' || tagName === 'OL') {
      const items = Array.from(el.querySelectorAll(':scope > li'));
      const itemTexts = items.map((li) => (li.textContent || '').trim());

      // Check if this UL represents multiple choice options A, B, C, D
      const isChoiceList =
        items.length >= 2 &&
        items.length <= 4 &&
        itemTexts.every((t) => /^\s*(?:\*\*)?[A-D][\.\)]/i.test(t));

      if (isChoiceList) {
        const optsList = items.map((li, idx) => {
          const label = ['A.', 'B.', 'C.', 'D.'][idx] || `${String.fromCharCode(65 + idx)}.`;
          return { label, node: li };
        });
        result.push(buildInvisibleChoiceTable(optsList, options));
        return;
      }

      // Check if this UL represents True/False statements a), b), c), d)
      const isTfList =
        items.length >= 2 &&
        items.length <= 4 &&
        itemTexts.every((t) => /^\s*(?:\*\*)?[a-d][\.\)]/i.test(t));

      if (isTfList) {
        const stmts = items.map((li, idx) => {
          const label = ['a)', 'b)', 'c)', 'd)'][idx] || `${String.fromCharCode(97 + idx)})`;
          return { label, node: li };
        });
        result.push(...buildTrueFalseParagraphs(stmts, options));
        return;
      }

      // Standard list items
      for (const li of items) {
        const runs = parseInlineContent(li, {}, options);
        result.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { line: 288, after: 60 },
            children: runs,
          })
        );
      }
      return;
    }

    // 5. Paragraphs (<P>) or Question stem containers
    if (tagName === 'P' || (tagName === 'DIV' && el.querySelector('strong, b') && !el.querySelector('table, ul, ol'))) {
      const rawText = stripInternalTags(getNodeLatexOrText(el));

      // Check if paragraph contains embedded multiple choice options A. ... B. ... C. ... D. ...
      const mcRegex = /^(.*?)\s*(?:[-*]\s*)?(?:\*{0,2})A[\.\)](?:\*{0,2})\s+([\s\S]*?)(?:[-*]\s*)?(?:\*{0,2})B[\.\)](?:\*{0,2})\s+([\s\S]*?)(?:[-*]\s*)?(?:\*{0,2})C[\.\)](?:\*{0,2})\s+([\s\S]*?)(?:[-*]\s*)?(?:\*{0,2})D[\.\)](?:\*{0,2})\s+([\s\S]*)$/i;
      const mcMatch = rawText.match(mcRegex);

      if (mcMatch) {
        const stemText = stripInternalTags(mcMatch[1].trim());
        const optA = mcMatch[2].trim();
        const optB = mcMatch[3].trim();
        const optC = mcMatch[4].trim();
        const optD = mcMatch[5].trim();

        if (stemText) {
          result.push(
            new Paragraph({
              spacing: { line: 288, after: 80 },
              children: parseTextWithMath(stemText, {}, options),
            })
          );
        }

        // Check if next sibling is already a choice container (to prevent duplicate table)
        let nextSib = el.nextElementSibling;
        while (nextSib && nextSib.tagName === 'P' && !nextSib.textContent?.trim()) {
          nextSib = nextSib.nextElementSibling;
        }
        const nextIsChoiceContainer =
          nextSib &&
          (nextSib.tagName === 'UL' ||
            nextSib.tagName === 'OL' ||
            nextSib.classList.contains('question-choices') ||
            nextSib.classList.contains('choices-grid') ||
            nextSib.classList.contains('options-table'));

        if (!nextIsChoiceContainer) {
          result.push(
            buildInvisibleChoiceTable(
              [
                { label: 'A.', text: optA },
                { label: 'B.', text: optB },
                { label: 'C.', text: optC },
                { label: 'D.', text: optD },
              ],
              options
            )
          );
        }
        return;
      }

      // Check if paragraph contains embedded True/False statements a) ... b) ... c) ... d) ...
      const tfRegex = /^(.*?)\s*(?:[-*]\s*)?(?:\*{0,2})a[\.\)](?:\*{0,2})\s+([\s\S]*?)(?:[-*]\s*)?(?:\*{0,2})b[\.\)](?:\*{0,2})\s+([\s\S]*?)(?:[-*]\s*)?(?:\*{0,2})c[\.\)](?:\*{0,2})\s+([\s\S]*?)(?:[-*]\s*)?(?:\*{0,2})d[\.\)](?:\*{0,2})\s+([\s\S]*)$/i;
      const tfMatch = rawText.match(tfRegex);

      if (tfMatch) {
        const stemText = stripInternalTags(tfMatch[1].trim());
        const stmtA = tfMatch[2].trim();
        const stmtB = tfMatch[3].trim();
        const stmtC = tfMatch[4].trim();
        const stmtD = tfMatch[5].trim();

        if (stemText) {
          result.push(
            new Paragraph({
              spacing: { line: 288, after: 80 },
              children: parseTextWithMath(stemText, {}, options),
            })
          );
        }

        let nextSib = el.nextElementSibling;
        while (nextSib && nextSib.tagName === 'P' && !nextSib.textContent?.trim()) {
          nextSib = nextSib.nextElementSibling;
        }
        const nextIsTfContainer =
          nextSib &&
          (nextSib.tagName === 'UL' ||
            nextSib.tagName === 'OL' ||
            nextSib.classList.contains('tf-statements') ||
            nextSib.classList.contains('tf-container') ||
            nextSib.classList.contains('tf-table'));

        if (!nextIsTfContainer) {
          result.push(
            ...buildTrueFalseParagraphs(
              [
                { label: 'a)', text: stmtA },
                { label: 'b)', text: stmtB },
                { label: 'c)', text: stmtC },
                { label: 'd)', text: stmtD },
              ],
              options
            )
          );
        }
        return;
      }

      // Check if paragraph is an individual True/False statement (starts with a), b), c), d))
      const singleTfMatch = rawText.match(/^\s*(?:\*\*)?([a-d])[\.\)](?:\*\*)?\s*([\s\S]*)$/i);
      if (singleTfMatch) {
        const label = `${singleTfMatch[1].toLowerCase()})`;
        const stmtText = singleTfMatch[2];
        result.push(
          ...buildTrueFalseParagraphs([{ label, node: el, text: stmtText }], options)
        );
        return;
      }

      // Question stem or standard paragraph without images:
      // Parse directly from rawText to group ALL runs (lead text and formulas) into ONE single Paragraph.
      if (!el.querySelector('img')) {
        const runs = parseTextWithMath(rawText, {}, options);
        if (runs.length > 0) {
          result.push(
            new Paragraph({
              spacing: { line: 288, after: 80 },
              children: runs,
            })
          );
        }
        return;
      }

      // Standard Paragraph with embedded images
      const runs = parseInlineContent(el, {}, options);
      if (runs.length > 0) {
        result.push(
          new Paragraph({
            spacing: { line: 288, after: 80 },
            children: runs,
          })
        );
      }
      return;
    }

    // 6. Diagrams / Images
    if (tagName === 'IMG') {
      const runs = parseInlineContent(el, {}, options);
      if (runs.length > 0) {
        result.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { line: 288, before: 120, after: 120 },
            children: runs,
          })
        );
      }
      return;
    }

    // 7. General DIV or CONTAINER
    // If the element contains no block-level children, treat it as a single paragraph block
    const hasBlockChildren = Array.from(el.children).some((c) =>
      /^(DIV|P|TABLE|UL|OL|H[1-6]|HR)$/i.test(c.tagName)
    );

    if (!hasBlockChildren) {
      const rawText = stripInternalTags(getNodeLatexOrText(el)).trim();
      if (rawText && !/^[.,:;?!]+$/.test(rawText)) {
        // Check if container is an individual True/False statement
        const singleTfMatch = rawText.match(/^\s*(?:\*\*)?([a-d])[\.\)](?:\*\*)?\s*([\s\S]*)$/i);
        if (singleTfMatch) {
          const label = `${singleTfMatch[1].toLowerCase()})`;
          const stmtText = singleTfMatch[2];
          result.push(
            ...buildTrueFalseParagraphs([{ label, node: el, text: stmtText }], options)
          );
          return;
        }

        if (!el.querySelector('img')) {
          const runs = parseTextWithMath(rawText, {}, options);
          if (runs.length > 0) {
            result.push(
              new Paragraph({
                spacing: { line: 288, after: 80 },
                children: runs,
              })
            );
          }
          return;
        } else {
          const runs = parseInlineContent(el, {}, options);
          if (runs.length > 0) {
            result.push(
              new Paragraph({
                spacing: { line: 288, after: 80 },
                children: runs,
              })
            );
          }
          return;
        }
      }
      return;
    }

    const childNodes = Array.from(el.childNodes);
    for (const child of childNodes) {
      await processNode(child);
    }
  }

  for (const child of Array.from(root.childNodes)) {
    await processNode(child);
  }

  return result;
}

/**
 * Main export function for converting rendered DOM content to high-fidelity Word .docx files.
 */
export async function exportHtmlToWord(
  element: HTMLElement,
  filename: string,
  mathFormat: 'omml' | 'mathml' | 'latex' | 'image' | boolean = 'omml'
) {
  let resolvedMathFormat: 'omml' | 'latex' | 'image' = 'omml';
  if (mathFormat === true || mathFormat === 'latex') resolvedMathFormat = 'latex';
  else if (mathFormat === 'image') resolvedMathFormat = 'image';

  let loadingOverlay = document.getElementById('word-export-loading');
  if (!loadingOverlay) {
    loadingOverlay = document.createElement('div');
    loadingOverlay.id = 'word-export-loading';
    loadingOverlay.style.position = 'fixed';
    loadingOverlay.style.top = '0';
    loadingOverlay.style.left = '0';
    loadingOverlay.style.width = '100vw';
    loadingOverlay.style.height = '100vh';
    loadingOverlay.style.backgroundColor = 'rgba(255, 255, 255, 0.85)';
    loadingOverlay.style.zIndex = '999999';
    loadingOverlay.style.display = 'flex';
    loadingOverlay.style.flexDirection = 'column';
    loadingOverlay.style.alignItems = 'center';
    loadingOverlay.style.justifyContent = 'center';
    loadingOverlay.innerHTML = `
      <div style="width: 52px; height: 52px; border: 4px solid #10b981; border-bottom-color: transparent; border-radius: 50%; display: inline-block; box-sizing: border-box; animation: rotation 1s linear infinite;"></div>
      <style>@keyframes rotation { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
      <h2 style="margin-top: 20px; color: #0f172a; font-family: 'Times New Roman', serif; font-size: 18px; font-weight: bold;">Đang xử lý xuất file Word (.docx)...</h2>
      <p style="color: #475569; font-family: sans-serif; font-size: 14px; margin-top: 6px;">Đang biên dịch công thức toán sang chuẩn Equation (OMML) và dàn trang...</p>
    `;
    document.body.appendChild(loadingOverlay);
  } else {
    loadingOverlay.style.display = 'flex';
  }

  try {
    const clone = element.cloneNode(true) as HTMLElement;

    // 1. Pre-process TikZ SVGs into high-res PNGs
    const origTikzWrappers = Array.from(element.querySelectorAll('.tikz-wrapper, .svg-wrapper, svg')) as HTMLElement[];
    const clonedTikzWrappers = Array.from(clone.querySelectorAll('.tikz-wrapper, .svg-wrapper, svg')) as HTMLElement[];

    for (let i = 0; i < origTikzWrappers.length; i++) {
      const orig = origTikzWrappers[i];
      const cloned = clonedTikzWrappers[i];
      if (!orig || !cloned) continue;

      const svgNode = orig.tagName.toUpperCase() === 'SVG' ? (orig as unknown as SVGSVGElement) : orig.querySelector('svg');
      if (svgNode) {
        try {
          const pngDataUrl = await svgToPngDataUrl(svgNode);
          const img = document.createElement('img');
          img.src = pngDataUrl;
          img.className = 'diagram';
          img.style.maxWidth = '420px';
          img.style.height = 'auto';
          cloned.parentNode?.replaceChild(img, cloned);
        } catch (e) {
          console.error('TikZ SVG to PNG conversion error:', e);
        }
      }
    }

    // 2. Pre-process standard remote/relative images to data URLs
    const standardImgs = Array.from(clone.querySelectorAll('img'));
    for (let i = 0; i < standardImgs.length; i++) {
      const img = standardImgs[i];
      if (img.src.startsWith('data:')) continue;

      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;

        const originalImg = new Image();
        originalImg.crossOrigin = 'Anonymous';

        const base64Data = await new Promise<string>((resolve, reject) => {
          originalImg.onload = () => {
            canvas.width = originalImg.naturalWidth || originalImg.width || 300;
            canvas.height = originalImg.naturalHeight || originalImg.height || 150;
            ctx.drawImage(originalImg, 0, 0);
            resolve(canvas.toDataURL('image/png'));
          };
          originalImg.onerror = () => reject(new Error('Failed to load image'));
          originalImg.src = img.src;
        });

        img.src = base64Data;
      } catch (e) {
        console.error('Image rasterization error:', e);
      }
    }

    // 2.5 Pre-process KaTeX elements in clone into lightweight OMML tokens
    // This extracts the TeX annotation and replaces the rendered KaTeX HTML/MathML tree
    // with a single <span class="omml-math-node" data-latex="..." data-block="...">
    // so no fallback text or duplicated formulas can EVER be generated!
    const katexNodes = Array.from(clone.querySelectorAll('.katex, .katex-display'));
    for (const kn of katexNodes) {
      const ann = kn.querySelector("annotation[encoding='application/x-tex']") || kn.querySelector("annotation");
      let latex = ann?.textContent || kn.getAttribute('data-tex') || kn.getAttribute('data-latex') || '';
      if (!latex) {
        const mathEl = kn.querySelector('math');
        if (mathEl) {
          const subAnn = mathEl.querySelector('annotation');
          if (subAnn?.textContent) latex = subAnn.textContent;
        }
      }
      if (!latex) continue;

      const isBlock = kn.classList.contains('katex-display') || !!kn.closest('.katex-display');

      const token = document.createElement('span');
      token.className = 'omml-math-node';
      token.setAttribute('data-latex', encodeURIComponent(latex));
      token.setAttribute('data-block', isBlock ? '1' : '0');

      kn.parentNode?.replaceChild(token, kn);
    }

    // Also strip any residual MathML / KaTeX artifacts
    const strayKatex = Array.from(clone.querySelectorAll('.katex-mathml, .katex-html, math, semantics'));
    for (const sk of strayKatex) {
      sk.remove();
    }

    // 3. Build docx children from the DOM tree
    const docxChildren = await parseDomToDocxChildren(clone, { mathFormat: resolvedMathFormat });

    // 4. Create Word Document with exact A4 page layout & typography specs
    const doc = new Document({
      styles: {
        default: {
          document: {
            run: {
              font: 'Times New Roman',
              size: 24, // 12pt
              color: '000000',
            },
            paragraph: {
              spacing: {
                line: 288, // 1.2 lines
                after: 80, // 4pt
              },
            },
          },
        },
      },
      sections: [
        {
          properties: {
            page: {
              size: {
                width: 11906, // A4 width 210mm
                height: 16838, // A4 height 297mm
              },
              margin: {
                top: convertMillimetersToTwip(20), // 2cm
                bottom: convertMillimetersToTwip(20), // 2cm
                left: convertMillimetersToTwip(25), // 2.5cm
                right: convertMillimetersToTwip(20), // 2cm
              },
            },
          },
          children: docxChildren.length > 0 ? docxChildren : [new Paragraph({ text: '' })],
        },
      ],
    });

    // 5. Generate and download genuine .docx file
    const docBlob = await Packer.toBlob(doc);
    const finalFilename = filename.replace(/\.doc$/i, '') + '.docx';
    saveAs(docBlob, finalFilename);
  } catch (err) {
    console.error('DOCX Export failed:', err);
    alert('Có lỗi xảy ra khi tạo file Word .docx. Vui lòng thử lại.');
  } finally {
    if (loadingOverlay) {
      loadingOverlay.style.display = 'none';
    }
  }
}

/**
 * Chụp ảnh element hiển thị (Poster/Infographic/Worksheet) xuất ra file PNG chất lượng cao (2x scale)
 */
export async function exportElementToImage(
  element: HTMLElement | null,
  filename: string = "Poster_PhieuHocTap.png"
): Promise<void> {
  if (!element) return;

  const clone = element.cloneNode(true) as HTMLElement;
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  const naturalWidth = element.offsetWidth > 850 ? element.offsetWidth : 850;
  container.style.width = `${naturalWidth}px`;
  container.style.background = '#ffffff';

  container.appendChild(clone);
  document.body.appendChild(container);

  // Clean OKLCH and complex modern CSS colors so html2canvas renders without errors
  const cleanColors = (el: HTMLElement) => {
    if (el.nodeType !== Node.ELEMENT_NODE) return;
    const computed = window.getComputedStyle(el);
    const props = [
      'color', 'backgroundColor', 'borderColor', 
      'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor',
      'textDecorationColor', 'outlineColor', 'fill', 'stroke'
    ];
    props.forEach(prop => {
      const val = computed[prop as any];
      if (val && (val.includes('oklch') || val.includes('oklab') || val.includes('color('))) {
        try {
          const cvs = document.createElement('canvas');
          cvs.width = 1; cvs.height = 1;
          const ctx = cvs.getContext('2d');
          if (ctx) {
            ctx.fillStyle = val;
            ctx.fillRect(0, 0, 1, 1);
            const d = ctx.getImageData(0, 0, 1, 1).data;
            el.style[prop as any] = `rgba(${d[0]}, ${d[1]}, ${d[2]}, ${d[3] / 255})`;
          }
        } catch (e) {}
      }
    });
    Array.from(el.children).forEach(child => cleanColors(child as HTMLElement));
  };

  try {
    cleanColors(clone);
    const canvas = await html2canvas(clone, {
      scale: 2, // HiDPI 2x scale for sharp posters/text
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });
    
    canvas.toBlob((blob) => {
      if (blob) {
        const finalName = filename.endsWith('.png') ? filename : `${filename}.png`;
        saveAs(blob, finalName);
      }
    }, 'image/png');
  } catch (err) {
    console.error('Lỗi khi xuất ảnh Poster:', err);
    throw err;
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}


