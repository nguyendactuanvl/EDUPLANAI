import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseApiResponse<T = any>(text: string): T {
  if (!text || !text.trim()) {
    throw new Error("Máy chủ phản hồi rỗng (kết nối bị gián đoạn hoặc hết thời gian chờ). Vui lòng thử lại.");
  }
  const clean = text.trim();
  if (clean.includes("SERVER_ERROR:")) {
    const rawError = clean.substring(clean.indexOf("SERVER_ERROR:") + 13).trim();
    let errorMsg = rawError;
    try {
      const parsed = JSON.parse(rawError);
      if (parsed?.error?.message) errorMsg = parsed.error.message;
      else if (parsed?.message) errorMsg = parsed.message;
    } catch (e) {
      const jsonMatch = rawError.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed?.error?.message) errorMsg = parsed.error.message;
          else if (parsed?.message) errorMsg = parsed.message;
        } catch (e2) {}
      }
    }
    // Clean up single braces or broken fragments
    errorMsg = errorMsg.replace(/^["'\s]+|["'\s]+$/g, '').trim();
    if (errorMsg === "{" || errorMsg === "}" || !errorMsg) {
      errorMsg = "Hệ thống AI xử lý quá thời gian chờ hoặc tạm thời quá tải. Vui lòng bấm tạo lại hoặc giảm bớt số lượng câu hỏi.";
    }
    throw new Error(errorMsg);
  }
  try {
    return JSON.parse(clean);
  } catch (e) {
    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (inner) {
        // Try salvaging valid question objects if JSON was truncated
        const questionsMatch = jsonMatch[0].match(/"questions"\s*:\s*\[([\s\S]*)/);
        if (questionsMatch) {
          const salvagedQuestions: any[] = [];
          const questionRegex = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
          let qm: RegExpExecArray | null;
          while ((qm = questionRegex.exec(questionsMatch[1])) !== null) {
            try {
              const qObj = JSON.parse(qm[0]);
              if (qObj.content && (qObj.options || qObj.tfStatements || qObj.correctAnswer)) {
                salvagedQuestions.push(qObj);
              }
            } catch (ignore) {}
          }
          if (salvagedQuestions.length > 0) {
            return {
              examName: "Đề kiểm tra",
              questions: salvagedQuestions
            } as unknown as T;
          }
        }
      }
    }
    throw new Error("Phản hồi từ máy chủ không đúng định dạng. Vui lòng bấm tạo lại.");
  }
}

export function normalizeInfinity(text: any): string {
  if (!text && text !== 0) return '';
  let s = String(text);

  // 1. Normalize OCR / font ligature splits: "in fty", "in  fty", "in\tfty"
  s = s.replace(/\bin\s+fty\b/gi, '\\infty');
  s = s.replace(/([+\-±])\s*in\s*fty\b/gi, '$1\\infty');

  // 2. Normalize "infty" not preceded by backslash: e.g. "-infty", "+infty", "infty"
  s = s.replace(/(?<!\\)\binfty\b/g, '\\infty');

  // 3. Normalize spaces between sign and \infty: e.g. "- \infty" -> "-\infty", "+ \infty" -> "+\infty"
  s = s.replace(/([+\-±])\s+\\infty\b/g, '$1\\infty');

  // 4. Normalize informal "oo" used as infinity in intervals, limits, or signs:
  // e.g. "(-oo; -1)", "(1; +oo)", "[-oo; +oo]", "x \to +oo"
  s = s.replace(/([\(\[\{;,]\s*)([+\-±]?)\s*oo\b/gi, '$1$2\\infty');
  s = s.replace(/\b([+\-±])\s*oo\b/gi, '$1\\infty');
  s = s.replace(/\\to\s*([+\-±]?)\s*oo\b/gi, '\\to $1\\infty');
  s = s.replace(/\b([+\-±]?)\s*oo(\s*[\)\]\};,])/gi, '$1\\infty$2');

  // 5. Normalize intervals where \infty had stray internal dollars:
  // e.g. "(-$\infty$; -1)" -> "(-\infty; -1)", "(-1; +$\infty$)" -> "(-1; +\infty)"
  s = s.replace(/([\[\(])\s*([+\-±]?)\s*\$\\infty\$\s*([;,])/g, '$1$2\\infty$3');
  s = s.replace(/([;,]\s*)([+\-±]?)\s*\$\\infty\$\s*([\]\)])/g, '$1$2\\infty$3');

  return s;
}

export function cleanOptionText(opt: any): string {
  if (!opt && opt !== 0) return '';
  let text = String(opt).trim();
  
  // 1. Remove leading option prefixes like "A.", "A)", "A:", "a.", "a)"
  text = text.replace(/^[A-Da-d][\.\:\)]\s*/, '').trim();

  // 2. Remove redundant outer $ or $$ wrapping the entire option (especially if multiline or with spaces)
  // e.g. "$\n\begin{cases}...\end{cases}\n$" or "$ \begin{cases}... $" or "$$ ... $$"
  text = text.replace(/^\s*\${1,2}\s*([\s\S]*?)\s*\${1,2}\s*$/, '$1').trim();

  // 3. If there are still stray leading/trailing dollars or newlines around it
  text = text.replace(/^\s*\$+\s*/, '').replace(/\s*\$+\s*$/, '').trim();

  // 4. Normalize infinity in all forms
  text = normalizeInfinity(text);

  // 5. If it contains a LaTeX block environment (cases, array, matrix, aligned, etc.)
  // Wrap it tightly as inline math $...$ so it renders right next to "A." without stray dollars or newlines
  if (/\\begin\s*\{(?:cases|aligned|array|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|split|gather|align)\*?\}/.test(text)) {
    return `$${text.trim()}$`;
  }

  // 6. If it is a mathematical interval or set: e.g. "(-1; 1)", "(0; 1)", "(-\infty; -1)", "(-1; +\infty)", "[0; 5]", "{1; 2}"
  if (/^[\[\(]\s*[^;,\n]+?[;,]\s*[^;,\n]+?[\]\)]$/.test(text) || /^\{[^}\n]+\}$/.test(text)) {
    return `$${text}$`;
  }

  // 7. If it contains standard math symbols (\frac, \sqrt, ^, _, =, <, >, etc.), wrap tightly in $...$
  if (/(?:[\\^_=><\+\-\*\/]|\d+[a-zA-Z]|[a-zA-Z]\d+)/.test(text) && !/^(đúng|sai|có|không|luôn|tất cả|cả|đáp án|phương án)\b/i.test(text)) {
    if (!text.startsWith('$') && !text.endsWith('$')) {
      return `$${text}$`;
    }
  }

  return text;
}

export function getPublicAppUrl(): string {
  if (typeof window === 'undefined') return '';
  const custom = localStorage.getItem('custom_public_app_url');
  if (custom && custom.trim().startsWith('http')) {
    return custom.trim().replace(/\/+$/, '');
  }
  let origin = window.location.origin;
  const mode = localStorage.getItem('ai_studio_url_mode');
  // Only convert to ais-pre- if user explicitly configured 'pre' mode after clicking Share in AI Studio
  if (mode === 'pre' && origin.includes("ais-dev-")) {
    origin = origin.replace("ais-dev-", "ais-pre-");
  }
  return origin;
}

export function cleanQuestionStem(content: any, options?: any[], tfStatements?: any[]): string {
  if (!content) return '';
  let text = String(content).trim();
  
  // Strip any leaked preamble packages
  text = text.replace(/\\(usetikzlibrary|usepackage)\s*\{[^}]*\}\s*/gi, '');

  // Strip system prefixes like (Loại tf), (Loại mcq), [Loại: tf], (Loại Đúng/Sai), etc.
  text = text
    .replace(/(Câu\s*\d+)\s*[:\.]?\s*[\(\[]\s*Loại(?:\s*trắc\s*nghiệm|\s*đúng\s*sai|\s*trả\s*lời\s*ngắn|\s*tự\s*luận|[:\s]+[a-z0-9_\-]+)?\s*[\)\]]\s*[:\.]?/gi, '$1:')
    .replace(/[\(\[]\s*Loại(?:\s*trắc\s*nghiệm|\s*đúng\s*sai|\s*trả\s*lời\s*ngắn|\s*tự\s*luận|[:\s]+[a-z0-9_\-]+)?\s*[\)\]]\s*:?/gi, '')
    .replace(/(Câu\s*\d+[:\.])\s*/gi, '$1 ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // If the question has separate options array
  if (options && options.length >= 2) {
    // 1. Remove HTML grid of options if present
    text = text.replace(/<div\s+class=["']grid[\s\S]*?<\/div>\s*<\/div>/gi, '');
    text = text.replace(/<div\s+class=["']grid[\s\S]*?<\/div>/gi, '');
    
    // 2. Remove "Câu 1: A. ... B. ... C. ... D. ...", "- **A.** ...", or "A. ... B. ... C. ... D. ..." at the end
    text = text.replace(/(?:\r?\n|\s)*(?:Câu\s*\d*[:\.]?\s*)?(?:[-*]\s*)?(?:\*{0,2})A[\.:\)]\s+[\s\S]*$/i, '');
    
    // 3. Remove trailing "Câu X:" if left
    text = text.replace(/(?:\r?\n|\s)*Câu\s*\d*[:\.]?\s*$/i, '');
  }

  // If the question has separate tfStatements array (True/False question)
  if (tfStatements && tfStatements.length >= 2) {
    // Remove duplicate trailing sub-statements: a) ... b) ... c) ... d) ... from stem
    text = text.replace(/(?:\r?\n|\s)*(?:[-*]\s*)?(?:\*{0,2})a[\.:\)]\s+[\s\S]*$/i, '');
  }
  
  return text.trim();
}

export const wrapAllNakedMath = (str: string): string => {
  if (!str) return "";
  let s = normalizeInfinity(str);

  const mathCmds = [
    "dfrac", "frac", "sqrt", "vec", "overrightarrow", "int", "iint", "iiint", "oint", 
    "lim", "sum", "prod", "log", "ln", "sin", "cos", "tan", "cot", "arcsin", "arccos", "arctan",
    "alpha", "beta", "gamma", "delta", "Delta", "pi", "theta", "Theta", "lambda", "Lambda",
    "mu", "sigma", "Sigma", "omega", "Omega", "phi", "Phi", "in", "notin", "subset", "supset", "subseteq", "supseteq",
    "cup", "cap", "setminus", "emptyset", "forall", "exists", "infty", "pm", "mp", "times", "div",
    "le", "ge", "leq", "geq", "neq", "approx", "equiv", "sim", "cong", "parallel", "perp", "angle", "circ", "partial", "nabla",
    "mathbb", "mathbf", "mathrm", "mathcal", "text", "to", "rightarrow", "Rightarrow", "leftarrow", "Leftarrow", "leftrightarrow", "Leftrightarrow",
    "cdots", "ldots", "cdot"
  ].join("|");

  const stopWords = /^(và|hoặc|với|khi|thì|là|bằng|thuộc|trên|trong|tại|sao\s+cho|đồng\s+biến|nghịch\s+biến|liên\s+tục|có|tìm|tính|chứng\s+minh|xét|giải|cho|gọi|biết|nếu|suy\s+ra|tương\s+đương|kết\s+luận|hãy|để|đáp\s+án|phương\s+trình|hệ\s+phương\s+trình|bất\s+phương\s+trình|hàm\s+số|đồ\s+thị|vectơ|vecto|tọa\s+độ|mặt\s+phẳng|đường\s+thẳng|điểm|khoảng|đoạn|nửa\s+khoảng)\b/i;

  const findStartWithPrefix = (text: string, cmdIndex: number): number => {
    const before = text.slice(0, cmdIndex);
    const prefixMatch = before.match(/(?:^|[\s\(\[\{;])([a-zA-Z](?:_\{?[0-9a-zA-Z]+\}?)?(?:\([a-zA-Z0-9,\s]*\))?\s*(?:[=><\le\ge\approx\neq]|>=|<=|==|!=|\\le|\\ge|\\approx|\\neq|\\sim)?\s*)$/);
    if (prefixMatch && prefixMatch[1]) {
      return cmdIndex - prefixMatch[1].length;
    }
    return cmdIndex;
  };

  const findMathSpan = (s: string, startIdx: number): { endIndex: number; formula: string } => {
    let i = startIdx;
    const len = s.length;
    let braceDepth = 0;
    let bracketDepth = 0;
    let parenDepth = 0;
    let lastValidEnd = startIdx;

    while (i < len) {
      const ch = s[i];

      if (ch === "\\") {
        const restCmd = s.slice(i).match(/^\\[a-zA-Z]+/);
        if (restCmd) {
          i += restCmd[0].length;
          lastValidEnd = i;
          continue;
        } else {
          i += 2;
          lastValidEnd = i;
          continue;
        }
      }

      if (ch === "{") {
        braceDepth++;
      } else if (ch === "}") {
        braceDepth--;
        if (braceDepth < 0) break;
        if (braceDepth === 0 && bracketDepth === 0 && parenDepth === 0) {
          lastValidEnd = i + 1;
        }
      } else if (ch === "[") {
        bracketDepth++;
      } else if (ch === "]") {
        bracketDepth--;
        if (bracketDepth < 0) {
          // Support mixed intervals like (a; b]
          if (parenDepth > 0) {
            parenDepth--;
            bracketDepth = 0;
            if (braceDepth === 0 && bracketDepth === 0 && parenDepth === 0) {
              lastValidEnd = i + 1;
            }
          } else {
            break;
          }
        } else if (braceDepth === 0 && bracketDepth === 0 && parenDepth === 0) {
          lastValidEnd = i + 1;
        }
      } else if (ch === "(") {
        parenDepth++;
      } else if (ch === ")") {
        parenDepth--;
        if (parenDepth < 0) {
          // Support mixed intervals like [a; b)
          if (bracketDepth > 0) {
            bracketDepth--;
            parenDepth = 0;
            if (braceDepth === 0 && bracketDepth === 0 && parenDepth === 0) {
              lastValidEnd = i + 1;
            }
          } else {
            break;
          }
        } else if (braceDepth === 0 && bracketDepth === 0 && parenDepth === 0) {
          lastValidEnd = i + 1;
        }
      } else if (braceDepth === 0 && bracketDepth === 0 && parenDepth === 0) {
        if (/^[.,:;?!](\s|$)/.test(s.slice(i))) {
          break;
        }

        if (/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(ch)) {
          break;
        }

        if (/[\s\n\r]/.test(ch)) {
          const afterSpace = s.slice(i).trimStart();
          if (!afterSpace) break;

          if (stopWords.test(afterSpace) || /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(afterSpace.charAt(0))) {
            break;
          }

          if (/^([+\-*\/=<>]|\\|\d+|[a-zA-Z]{1,4}\b|\(|\)|\[|\]|\{|\})/.test(afterSpace)) {
            i += (s.slice(i).length - afterSpace.length);
            lastValidEnd = i;
            continue;
          } else {
            break;
          }
        }

        lastValidEnd = i + 1;
      }
      i++;
    }

    return { endIndex: lastValidEnd, formula: s.slice(startIdx, lastValidEnd).trim() };
  };

  let result = "";
  let idx = 0;
  const cmdRegex = new RegExp(`\\\\(?:${mathCmds})(?=[^a-zA-Z]|$)`, "g");

  while (idx < s.length) {
    cmdRegex.lastIndex = idx;
    const match = cmdRegex.exec(s);
    if (!match) {
      result += s.slice(idx);
      break;
    }

    const startWithPrefix = findStartWithPrefix(s, match.index);
    result += s.slice(idx, startWithPrefix);
    const span = findMathSpan(s, startWithPrefix);
    result += `$${span.formula}$`;
    idx = span.endIndex;
  }

  // Auto-wrap remaining standalone naked intervals like (-\infty; -1), (-1; +\infty), [0; 1), [-2; 3]
  result = result.replace(/(?<![\\$a-zA-Z0-9])([\[\(]\s*(?:[+\-±]?\\infty|-?\d+(?:\.\d+)?(?:\\frac\{[^{}]*\}\{[^{}]*\}|\/[0-9]+)?)\s*[;,]\s*(?:[+\-±]?\\infty|-?\d+(?:\.\d+)?(?:\\frac\{[^{}]*\}\{[^{}]*\}|\/[0-9]+)?)\s*[\]\)])(?![\\$a-zA-Z0-9])/g, '$$$1$$');

  return result;
};

export const fixMath = (text: any) => {
    if (!text || text === 'undefined') return '';
    if (typeof text !== 'string') text = String(text);
    let t = text.trim();
    
    // 0. Remove stray preamble packages that might be generated in math or TikZ
    t = t.replace(/\\(usetikzlibrary|usepackage)\s*\{[^}]*\}\s*/gi, '');

    // 0.1. Normalize infinity in all variations (in fty, infty without backslash, etc.)
    t = normalizeInfinity(t);

    // 1. Unescape escaped dollar signs (\$)
    t = t.replace(/\\(\$)/g, '$1');

    // 2. Convert standard LaTeX bracket delimiters \(...\) to $...$ and \[...\] to $$...$$
    t = t.replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$');
    t = t.replace(/\\\[([\s\S]*?)\\\]/g, '$$$$$1$$$$');

    // 2.1. Normalize informal not-equal signs (/ =, /=, !=, =/=) to standard LaTeX \neq
    t = t.replace(/=\/=/g, ' \\neq ');
    t = t.replace(/!\s*=\s*/g, ' \\neq ');
    t = t.replace(/(?<!\/)\/\s*=\s*/g, ' \\neq ');

    // 2.15. Preserve Markdown table integrity:
    // Markdown table rows start and end with '|'. They must NEVER contain raw newlines or unescaped pipe symbols inside math.
    const rawLines = t.split('\n');
    for (let i = 0; i < rawLines.length; i++) {
        let line = rawLines[i].trim();
        if (line.startsWith('|') && line.endsWith('|')) {
            // This is a Markdown table row
            // 1. Convert any $$...$$ inside table row to single $...$
            line = line.replace(/\$\$\s*([\s\S]*?)\s*\$\$/g, '$$$1$$');
            // 2. Replace any raw pipe '|' inside $...$ in table cell with \vert to prevent column splitting
            line = line.replace(/(?<!\$)\$(?!\$)([^\$\n]+?)(?<!\$)\$(?!\$)/g, (m, f) => {
                const safeFormula = f.replace(/(?<!\\)\|/g, '\\vert ');
                return `$${safeFormula}$`;
            });
            rawLines[i] = line;
        }
    }
    t = rawLines.join('\n');

    // 2.2. Normalize options formatted with environments or multiline expressions:
    // e.g. "A. $\n\begin{cases}...\end{cases}\n$" or "A. $ \begin{cases}...\end{cases} $" or "<div><strong>A.</strong> $\begin{cases}...</div>"
    t = t.replace(/(^|\n|<div[^>]*>)\s*([A-D][\.\:\)]|<strong>[A-D][\.\:\)]<\/strong>)\s*\${0,2}\s*(\\begin\s*\{(?:cases|aligned|array|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|split|gather|align)\*?\}[\s\S]*?\\end\s*\{(?:cases|aligned|array|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|split|gather|align)\*?\})\s*\${0,2}\s*(<\/div>|$|\n)/g, (m, prefix, label, env, suffix) => {
        return `${prefix}${label} $${env.trim()}$ ${suffix}`;
    });

    // 2.25. Normalize list items formatted with environments (e.g. "- a) $\begin{cases}...", "a) $\begin{cases}...")
    // Keep them inline so the list item numbering/lettering is not broken by display block newlines
    t = t.replace(/(^|\n)\s*([-\*]\s+|(?:\d+|[a-d])[\.\:\)]\s+)\${0,2}\s*(\\begin\s*\{(?:cases|aligned|array|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|split|gather|align)\*?\}[\s\S]*?\\end\s*\{(?:cases|aligned|array|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|split|gather|align)\*?\})\s*\${0,2}\s*($|\n)/g, (m, prefix, bullet, env, suffix) => {
        return `${prefix}${bullet}$${env.trim()}$${suffix}`;
    });

    // 2.3. Normalize options with multiline expressions e.g. "A. $\n x = 1 \n$" -> "A. $x = 1$"
    t = t.replace(/(^|\n|<div[^>]*>)\s*([A-D][\.\:\)]|<strong>[A-D][\.\:\)]<\/strong>)\s*\$\s*\n+([\s\S]*?)\n+\s*\$\s*(<\/div>|$|\n)/g, (m, prefix, label, expr, suffix) => {
        return `${prefix}${label} $${expr.trim()}$ ${suffix}`;
    });

    // 2.4. Normalize options with simple inline math with extra spaces e.g. "A. $ x = 1 $" -> "A. $x = 1$"
    t = t.replace(/(^|\n|<div[^>]*>)\s*([A-D][\.\:\)]|<strong>[A-D][\.\:\)]<\/strong>)\s*\$\s*([^\$\n]+?)\s*\$\s*(<\/div>|$|\n)/g, (m, prefix, label, expr, suffix) => {
        return `${prefix}${label} $${expr.trim()}$ ${suffix}`;
    });

    // 2.5. Standalone environments or BBT wrapped in single/double dollars:
    // Convert to \n\n$$\n...\n$$\n\n ONLY when NOT inside table row '|', list bullet, or option label
    t = t.replace(/(^|\n)(?!\s*\||\s*[-\*]|\s*[A-D][\.\:\)]|\s*[a-d][\.\:\)])\s*\${1,2}\s*(\\begin\s*\{(?:cases|aligned|array|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|split|gather|align)\*?\}[\s\S]*?\\end\s*\{(?:cases|aligned|array|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|split|gather|align)\*?\})\s*\${1,2}\s*($|\n)/g, '$1\n\n$$\n$2\n$$\n\n$3');

    // 2.6. Standalone naked LaTeX environments (cases, aligned, array, matrix, etc.) if not already in $$...$$ or $...$
    t = t.replace(/(^|\n)(?!\s*\||\s*[-\*]|\s*[A-D][\.\:\)]|\s*[a-d][\.\:\)])\s*(\\begin\s*\{(?:cases|aligned|array|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|split|gather|align)\*?\}[\s\S]*?\\end\s*\{(?:cases|aligned|array|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|split|gather|align)\*?\})\s*($|\n)/g, '$1\n\n$$\n$2\n$$\n\n$3');

    // 2.7. Clean stray single $ lines before or after $$...$$
    t = t.replace(/(^|\n)\s*\$\s*\n+(\$\$[\s\S]*?\$\$)/g, '$1$2');
    t = t.replace(/(\$\$[\s\S]*?\$\$)\n+\s*\$\s*($|\n)/g, '$1$2');
    t = t.replace(/(?<!\$)\$\s*(\$\$[\s\S]*?\$\$)\s*\$(?!\$)/g, '$1');

    // 2.75. Convert $$...$$ inside parentheses or parenthetical explanations (e.g. "(Vì $$...$$)") to single $...$
    t = t.replace(/\(([^()\n]*?)\$\$([\s\S]*?)\$\$([^()\n]*?)\)/g, (match, before, math, after) => {
        const cleanMath = math.replace(/[\r\n]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
        return `(${before}$${cleanMath}$${after})`;
    });

    // Convert $$...$$ in True/False statements or explanation lines (e.g. "c) Đúng (Vì $$...$$)" or "- a) Đúng ...")
    t = t.replace(/(^|\n)\s*([-\*]\s+|(?:\d+|[a-d])[\.\:\)]\s+)([\s\S]*?)($|\n)/g, (match, prefix, bullet, content, suffix) => {
        const cleaned = content.replace(/\$\$\s*([\s\S]*?)\s*\$\$/g, (m, math) => {
            return `$${math.replace(/[\r\n]+/g, ' ').replace(/\s{2,}/g, ' ').trim()}$`;
        });
        return `${prefix}${bullet}${cleaned}${suffix}`;
    });

    // 2.8. Normalize spaces, trailing punctuation, infinity, and strip newlines inside inline $ ... $ so remark-math and KaTeX recognize them
    t = t.replace(/(?<!\$)\$(?!\$)([\s\S]+?)(?<!\$)\$(?!\$)/g, (match, formula) => {
        if (formula.includes('$$')) return match;
        let trimmed = formula.replace(/[\r\n]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
        if (!trimmed) return match;
        
        // Ensure infinity & not-equal normalization inside math block as well
        trimmed = normalizeInfinity(trimmed);
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

    // 2.81. Normalize infinity inside $$ ... $$ blocks as well
    t = t.replace(/\$\$\s*([\s\S]*?)\s*\$\$/g, (match, formula) => {
        return `$$\n${normalizeInfinity(formula.trim())}\n$$`;
    });

    // 2.9. Protect existing math blocks, code blocks, TikZ, and SVGs while wrapping naked math commands
    const tokenRegex = /(```[\s\S]*?```|<svg[\s\S]*?<\/svg>|<tikz-diagram[\s\S]*?<\/tikz-diagram>|<svg-wrapper[\s\S]*?<\/svg-wrapper>|\\begin\s*\{tikzpicture\}[\s\S]*?\\end\s*\{tikzpicture\}|\$\$[\s\S]*?\$\$|\$(?:\\\$|[^\$])+?\$)/gi;
    const parts: { isProtected: boolean; text: string }[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = tokenRegex.exec(t)) !== null) {
        if (match.index > lastIndex) {
            parts.push({ isProtected: false, text: t.substring(lastIndex, match.index) });
        }
        parts.push({ isProtected: true, text: match[0] });
        lastIndex = tokenRegex.lastIndex;
    }
    if (lastIndex < t.length) {
        parts.push({ isProtected: false, text: t.substring(lastIndex) });
    }

    t = parts.map(p => p.isProtected ? p.text : wrapAllNakedMath(p.text)).join('');

    // 3. Fix BBT missing hlines and vertical lines
    if (t.includes('\\begin{array}')) {
        // fix vertical lines: keep only one after first column (only if it's a BBT)
        if (t.includes("f'(x)") || t.includes("y'") || (t.includes("x") && (t.includes("f(x)") || t.includes(" y &")))) {
            t = t.replace(/\\begin\s*\{array\}\s*\{([^}]+)\}/g, (match, formatString) => {
                let cols = formatString.replace(/[^a-zA-Z]/g, ''); // keep only c, l, r
                if (cols.length > 0) {
                   cols = cols.charAt(0) + '|' + cols.slice(1);
                }
                return `\\begin{array}{${cols}}`;
            });
        }
        
        let lines = t.split('\\n');
        // fallback if it doesn't have \\n but actual newlines
        if (lines.length === 1) lines = t.split('\n');
        
        let newLines = [];
        for (let line of lines) {
            let isDerivativeRow = line.includes("f'(x)") || line.includes("y'");
            let isFunctionRow = (line.includes("f(x)") || line.match(/^y\s*&/) || line.includes(" y &")) && !line.includes("f'(x)");
            
            if (isDerivativeRow || isFunctionRow) {
                 let prevIdx = newLines.length - 1;
                 while (prevIdx >= 0 && newLines[prevIdx].trim() === '') prevIdx--;
                 if (prevIdx >= 0) {
                     let prev = newLines[prevIdx];
                     if (prev.includes('\\\\') && !prev.includes('\\hline')) {
                         newLines[prevIdx] = prev.replace(/\\\\(\s*)$/, '\\\\ \\hline$1');
                         if (newLines[prevIdx] === prev) {
                             newLines[prevIdx] = prev + ' \\hline';
                         }
                     } else if (!prev.includes('\\\\') && !prev.includes('\\hline') && !prev.includes('\\begin')) {
                         newLines[prevIdx] = prev + ' \\\\ \\hline';
                     }
                 }
            }
            newLines.push(line);
        }
        t = newLines.join('\n');
        t = t.replace(/\|\|/g, '\\parallel');
    }

    // 4. Auto-wrap math intervals or expressions that are missing $ delimiters
    // Especially for options like "(-\infty; -1) và (0; 1)" or "(-1; 1)" or "y = 2x + 1"
    if (!t.includes('$') && !t.includes('\\begin{')) {
        if (/\s+(?:và|hoặc)\s+/i.test(t)) {
            const parts = t.split(/(\s+(?:và|hoặc)\s+)/i);
            t = parts.map(p => {
                if (/^\s*(?:và|hoặc)\s*$/i.test(p)) return p;
                let sub = p.trim();
                if (/^[\[\(].+[\]\)]$/.test(sub) || /[\^_\\]/.test(sub) || /^[a-zA-Z0-9\+\-\*\/\=><\s,;]+$/.test(sub)) {
                    return `$${sub}$`;
                }
                return p;
            }).join('');
        } else {
            if (/^[\[\(].+[\]\)]$/.test(t) || /[\^_\\]/.test(t) || /^[a-zA-Z]\s*[=><\le\ge]/.test(t)) {
                t = `$${t}$`;
            }
        }
    }

    // 5. Clean stray single $ on isolated lines
    t = t.replace(/^\s*\$\s*$/gm, '');

    // 6. Format multiple choice options into standard CSS Grid layout and ensure spacing between questions
    t = formatMultipleChoiceInMarkdown(t);

    return t;
};

/**
 * Tách dòng đề bài và chuẩn hóa định dạng trắc nghiệm sang Markdown thuần túy (không inject HTML)
 */
export function formatMultipleChoiceInMarkdown(content: string): string {
  if (!content) return '';
  let text = String(content);

  // 1. TÁCH BIỆT GIỮA CÁC CÂU HỎI (Spacing):
  // Đảm bảo giữa mỗi câu (từ Câu 1 đến Câu 12, Bài 1...) có khoảng cách rõ ràng (\n\n),
  // không để câu sau bị dính chữ số vào đuôi của câu trước.
  text = text.replace(/([^\n])\s*(?:\r?\n)?(\*{0,2}(?:Câu|Bài)\s*\d+[:\.]?\*{0,2})/gi, '$1\n\n$2');

  // 2. QUY TẮC HIỂN THỊ PHẦN ĐÚNG/SAI (PHẦN II):
  // - KHÔNG biến đổi phần này thành các lựa chọn trắc nghiệm A, B, C, D.
  // - Giữ nguyên định dạng văn bản thuần Markdown: khi gặp các ký hiệu ý a), b), c), d),
  //   chèn 2 dấu ngắt dòng \n\n phía trước để mỗi ý tự động rớt xuống 1 hàng riêng:
  //   a) [Mệnh đề 1]
  //   b) [Mệnh đề 2]
  //   c) [Mệnh đề 3]
  //   d) [Mệnh đề 4]
  text = text.replace(/([^\n])\s*(?:\r?\n)?(?:\b|\s)([a-d]\))\s+/g, '$1\n\n$2 ');
  text = text.replace(/([^\n])\s*(?:\r?\n)?(?:\b|\s)([a-d]\.)\s+(?=[A-ZÀ-Ỹ\$])/g, '$1\n\n$2 ');

  // 3. TÁCH DÒNG ĐỀ BÀI VÀ 4 PHƯƠNG ÁN LỰA CHỌN (PHẦN I):
  // Tuyệt đối KHÔNG để phương án A. dính liền ngay sau câu hỏi.
  // Đảm bảo chỉ bắt A. B. C. D. in HOA, không trùng với tiêu đề phần "A. Trắc nghiệm..."
  text = text.replace(/([^\n])\s+((?:[\*\-]\s*)?(?:\*{0,2})A[\.\)](?:\*{0,2})\s+(?!Trắc nghiệm|Tự luận|Khẳng định|Mệnh đề)[\s\S]*?(?:[\*\-]\s*)?(?:\*{0,2})B[\.\)](?:\*{0,2})\s+[\s\S]*?(?:[\*\-]\s*)?(?:\*{0,2})C[\.\)](?:\*{0,2})\s+[\s\S]*?(?:[\*\-]\s*)?(?:\*{0,2})D[\.\)](?:\*{0,2})\s+)/g, '$1\n\n$2');

  // 4. CHUẨN HÓA 4 ĐÁP ÁN (PHẦN I) SANG CÚ PHÁP DANH SÁCH MARKDOWN:
  // TUYỆT ĐỐI KHÔNG sinh chuỗi HTML <div class="choice-item"> vào text.
  // Chuẩn hóa thành danh sách Markdown thuần túy:
  // - **A.** [Phương án A]
  // - **B.** [Phương án B]
  // - **C.** [Phương án C]
  // - **D.** [Phương án D]
  const choicePattern = /(?:(?:\r?\n)+\s*|^\s*)((?:[\*\-]\s*)?(?:\*{0,2})A[\.\)](?:\*{0,2})\s+(?!Trắc nghiệm|Tự luận|Khẳng định|Mệnh đề)[\s\S]*?)(?:[\*\-]\s*)?(?:\*{0,2})B[\.\)](?:\*{0,2})\s+([\s\S]*?)(?:[\*\-]\s*)?(?:\*{0,2})C[\.\)](?:\*{0,2})\s+([\s\S]*?)(?:[\*\-]\s*)?(?:\*{0,2})D[\.\)](?:\*{0,2})\s+([\s\S]*?)(?=(?:\r?\n\s*(?:(?:###?\s*|\*\*)?(?:Câu\s*\d+|Bài\s*\d+|\d+\.)|Lời giải|Hướng dẫn|Đáp án|\*\*Lời giải|\*\*Hướng dẫn|\*\*Đáp án|---)|(?:\r?\n){2,}|$))/g;

  text = text.replace(choicePattern, (match, rawA, rawB, rawC, rawD) => {
    let optA = rawA.replace(/^(?:[\*\-]\s*)?(?:\*{0,2})A[\.\)](?:\*{0,2})\s*/, '').trim();
    let optB = rawB.replace(/^(?:[\*\-]\s*)?(?:\*{0,2})B[\.\)](?:\*{0,2})\s*/, '').trim();
    let optC = rawC.replace(/^(?:[\*\-]\s*)?(?:\*{0,2})C[\.\)](?:\*{0,2})\s*/, '').trim();
    let optD = rawD.replace(/^(?:[\*\-]\s*)?(?:\*{0,2})D[\.\)](?:\*{0,2})\s*/, '').trim();

    const cleanOption = (s: string) => {
      let trimmed = s.replace(/[;,]+$/, '').trim();
      // Chuẩn hóa $$ thành $ nếu nội dòng
      trimmed = trimmed.replace(/^\s*\$\$\s*([\s\S]*?)\s*\$\$\s*$/, '$$$1$$').trim();
      return trimmed;
    };

    optA = cleanOption(optA);
    optB = cleanOption(optB);
    optC = cleanOption(optC);
    optD = cleanOption(optD);

    return `\n\n- **A.** ${optA}\n- **B.** ${optB}\n- **C.** ${optC}\n- **D.** ${optD}\n\n`;
  });

  return text;
}
