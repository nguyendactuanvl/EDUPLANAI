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
    const match = clean.match(/SERVER_ERROR:\s*([^"\n\r]+)/);
    throw new Error(match ? match[1].trim() : "Lỗi từ máy chủ AI.");
  }
  try {
    return JSON.parse(clean);
  } catch (e) {
    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (inner) {}
    }
    throw new Error("Phản hồi từ máy chủ không đúng định dạng. Vui lòng bấm tạo lại.");
  }
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

  // 4. If it contains a LaTeX block environment (cases, array, matrix, aligned, etc.)
  // Wrap it tightly as inline math $...$ so it renders right next to "A." without stray dollars or newlines
  if (/\\begin\s*\{(?:cases|aligned|array|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|split|gather|align)\*?\}/.test(text)) {
    return `$${text.trim()}$`;
  }

  // 5. If it contains standard math symbols (\frac, \sqrt, ^, _, =, <, >, etc.), wrap tightly in $...$
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

export function cleanQuestionStem(content: any, options?: any[]): string {
  if (!content) return '';
  let text = String(content).trim();
  
  // Strip any leaked preamble packages
  text = text.replace(/\\(usetikzlibrary|usepackage)\s*\{[^}]*\}\s*/gi, '');

  // If the question has separate options array
  if (options && options.length >= 2) {
    // 1. Remove HTML grid of options if present
    text = text.replace(/<div\s+class=["']grid[\s\S]*?<\/div>\s*<\/div>/gi, '');
    text = text.replace(/<div\s+class=["']grid[\s\S]*?<\/div>/gi, '');
    
    // 2. Remove "Câu 1: A. ... B. ... C. ... D. ..." or "A. ... B. ... C. ... D. ..." at the end
    text = text.replace(/(?:\r?\n|\s)*(?:Câu\s*\d*[:\.]?\s*)?A[\.:\)]\s+[\s\S]*$/i, '');
    
    // 3. Remove trailing "Câu X:" if left
    text = text.replace(/(?:\r?\n|\s)*Câu\s*\d*[:\.]?\s*$/i, '');
  }
  
  return text.trim();
}

export const wrapAllNakedMath = (str: string): string => {
  const mathCmds = [
    "dfrac", "frac", "sqrt", "vec", "overrightarrow", "int", "iint", "iiint", "oint", 
    "lim", "sum", "prod", "log", "ln", "sin", "cos", "tan", "cot", "arcsin", "arccos", "arctan",
    "alpha", "beta", "gamma", "delta", "Delta", "pi", "theta", "Theta", "lambda", "Lambda",
    "mu", "sigma", "Sigma", "omega", "Omega", "phi", "Phi", "in", "notin", "subset", "supset",
    "cup", "cap", "emptyset", "forall", "exists", "infty", "pm", "mp", "times", "div",
    "le", "ge", "leq", "geq", "neq", "approx", "equiv", "sim", "cong", "parallel", "perp", "angle", "circ", "partial", "nabla"
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
        if (bracketDepth < 0) break;
        if (braceDepth === 0 && bracketDepth === 0 && parenDepth === 0) {
          lastValidEnd = i + 1;
        }
      } else if (ch === "(") {
        parenDepth++;
      } else if (ch === ")") {
        parenDepth--;
        if (parenDepth < 0) break;
        if (braceDepth === 0 && bracketDepth === 0 && parenDepth === 0) {
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

  while (idx < str.length) {
    cmdRegex.lastIndex = idx;
    const match = cmdRegex.exec(str);
    if (!match) {
      result += str.slice(idx);
      break;
    }

    const startWithPrefix = findStartWithPrefix(str, match.index);
    result += str.slice(idx, startWithPrefix);
    const span = findMathSpan(str, startWithPrefix);
    result += `$${span.formula}$`;
    idx = span.endIndex;
  }

  return result;
};

export const fixMath = (text: any) => {
    if (!text || text === 'undefined') return '';
    if (typeof text !== 'string') text = String(text);
    let t = text.trim();
    
    // 0. Remove stray preamble packages that might be generated in math or TikZ
    t = t.replace(/\\(usetikzlibrary|usepackage)\s*\{[^}]*\}\s*/gi, '');

    // 1. Unescape escaped dollar signs (\$)
    t = t.replace(/\\(\$)/g, '$1');

    // 2. Convert standard LaTeX bracket delimiters \(...\) to $...$ and \[...\] to $$...$$
    t = t.replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$');
    t = t.replace(/\\\[([\s\S]*?)\\\]/g, '$$$$$1$$$$');

    // 2.1. Normalize informal not-equal signs (/ =, /=, !=, =/=) to standard LaTeX \neq
    t = t.replace(/=\/=/g, ' \\neq ');
    t = t.replace(/!\s*=\s*/g, ' \\neq ');
    t = t.replace(/(?<!\/)\/\s*=\s*/g, ' \\neq ');

    // 2.2. Normalize options formatted with environments or multiline expressions:
    // e.g. "A. $\n\begin{cases}...\end{cases}\n$" or "A. $ \begin{cases}...\end{cases} $" or "<div><strong>A.</strong> $\begin{cases}...</div>"
    t = t.replace(/(^|\n|<div[^>]*>)\s*([A-D][\.\:\)]|<strong>[A-D][\.\:\)]<\/strong>)\s*\${0,2}\s*(\\begin\s*\{(?:cases|aligned|array|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|split|gather|align)\*?\}[\s\S]*?\\end\s*\{(?:cases|aligned|array|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|split|gather|align)\*?\})\s*\${0,2}\s*(<\/div>|$|\n)/g, (m, prefix, label, env, suffix) => {
        return `${prefix}${label} $${env.trim()}$ ${suffix}`;
    });

    // 2.3. Normalize options with multiline expressions e.g. "A. $\n x = 1 \n$" -> "A. $x = 1$"
    t = t.replace(/(^|\n|<div[^>]*>)\s*([A-D][\.\:\)]|<strong>[A-D][\.\:\)]<\/strong>)\s*\$\s*\n+([\s\S]*?)\n+\s*\$\s*(<\/div>|$|\n)/g, (m, prefix, label, expr, suffix) => {
        return `${prefix}${label} $${expr.trim()}$ ${suffix}`;
    });

    // 2.4. Normalize options with simple inline math with extra spaces e.g. "A. $ x = 1 $" -> "A. $x = 1$"
    t = t.replace(/(^|\n|<div[^>]*>)\s*([A-D][\.\:\)]|<strong>[A-D][\.\:\)]<\/strong>)\s*\$\s*([^\$\n]+?)\s*\$\s*(<\/div>|$|\n)/g, (m, prefix, label, expr, suffix) => {
        return `${prefix}${label} $${expr.trim()}$ ${suffix}`;
    });

    // 2.5. Standalone multiline environments wrapped in single/double dollars:
    // e.g. "$\n\begin{cases}...\end{cases}\n$" -> "\n\n$$\n\begin{cases}...\end{cases}\n$$\n\n"
    t = t.replace(/(^|\n)\s*\${1,2}\s*(\\begin\s*\{(?:cases|aligned|array|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|split|gather|align)\*?\}[\s\S]*?\\end\s*\{(?:cases|aligned|array|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|split|gather|align)\*?\})\s*\${1,2}\s*($|\n)/g, '$1\n\n$$\n$2\n$$\n\n$3');

    // 2.6. Standalone naked LaTeX environments (cases, aligned, array, matrix, etc.) if not already in $$...$$ or $...$
    t = t.replace(/(?<!\$)\s*(\\begin\s*\{(?:cases|aligned|array|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|split|gather|align)\*?\}[\s\S]*?\\end\s*\{(?:cases|aligned|array|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|split|gather|align)\*?\})\s*(?!\$)/g, (match, env) => {
        return `\n\n$$\n${env.trim()}\n$$\n\n`;
    });

    // 2.7. Clean stray single $ lines before or after $$...$$
    t = t.replace(/(^|\n)\s*\$\s*\n+(\$\$[\s\S]*?\$\$)/g, '$1$2');
    t = t.replace(/(\$\$[\s\S]*?\$\$)\n+\s*\$\s*($|\n)/g, '$1$2');
    t = t.replace(/(?<!\$)\$\s*(\$\$[\s\S]*?\$\$)\s*\$(?!\$)/g, '$1');

    // 2.8. Normalize spaces and trailing punctuation inside inline $ ... $ so remark-math and KaTeX recognize them
    // (e.g. "$ 1 $" -> "$1$", "$-\pi < -2 \Leftrightarrow \pi^2 < 4.$" -> "$-\pi < -2 \Leftrightarrow \pi^2 < 4$.")
    t = t.replace(/(?<!\$)\$(?!\$)\s*([^\$\n]+?)\s*(?<!\$)\$(?!\$)/g, (match, formula) => {
        let trimmed = formula.trim();
        if (!trimmed) return match;
        
        // Ensure not-equal normalization inside math block as well
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

    // 2.9. Protect existing math blocks & code blocks while wrapping naked math commands
    const tokenRegex = /(```[\s\S]*?```|\$\$[\s\S]*?\$\$|\$(?:\\\$|[^\$\n])+?\$)/g;
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

    return t;
};
