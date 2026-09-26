import { normalizeLogicAndSetSymbols, normalizeInfinity } from './src/lib/utils';

export function testWrapAllNakedMath(str: string): string {
  if (!str) return "";
  let s = str;

  // 0. Clean mark tags
  s = s.replace(/<mark\s+style=[^>]*>([\s\S]*?)<\/mark>/gi, (_m, c) => `**${c.trim()}**`);
  s = s.replace(/<mark[^>]*>([\s\S]*?)<\/mark>/gi, (_m, c) => `**${c.trim()}**`);
  s = s.replace(/<\/?\s*["']?\/?["']?\s*mark[^>]*>/gi, '');

  // 0.1 Normalize naked lim, sin, cos, tan, cot, log, ln
  s = s.replace(/(?<![\\a-zA-Z])lim(?=\s*[_^({]|\s+[a-zA-Z0-9\\])/g, '\\lim');
  s = s.replace(/(?<![\\a-zA-Z])(sin|cos|tan|cot|log|ln)(?=\s*[_^({]|\s+[a-zA-Z0-9\\])/g, '\\$1');

  s = normalizeLogicAndSetSymbols(normalizeInfinity(s));

  const mathCmds = [
    "dfrac", "frac", "sqrt", "vec", "overrightarrow", "int", "iint", "iiint", "oint", 
    "lim", "sum", "prod", "log", "ln", "sin", "cos", "tan", "cot", "arcsin", "arccos", "arctan",
    "alpha", "beta", "gamma", "delta", "Delta", "pi", "theta", "Theta", "lambda", "Lambda",
    "mu", "sigma", "Sigma", "omega", "Omega", "phi", "Phi", "in", "notin", "subset", "supset", "subseteq", "supseteq",
    "cup", "cap", "setminus", "emptyset", "forall", "exists", "infty", "pm", "mp", "times", "div",
    "le", "ge", "leq", "geq", "neq", "approx", "equiv", "sim", "cong", "parallel", "perp", "angle", "circ", "partial", "nabla",
    "mathbb", "mathbf", "mathrm", "mathcal", "text", "to", "rightarrow", "Rightarrow", "leftarrow", "Leftarrow", "leftrightarrow", "Leftrightarrow",
    "cdots", "ldots", "cdot", "left", "right", "quad", "qquad"
  ].join("|");

  const stopWords = /^(và|hoặc|với|khi|thì|là|bằng|thuộc|trên|trong|tại|sao\s+cho|đồng\s+biến|nghịch\s+biến|liên\s+tục|có|tìm|tính|chứng\s+minh|xét|giải|cho|gọi|biết|nếu|suy\s+ra|tương\s+đương|kết\s+luận|hãy|để|đáp\s+án|phương\s+trình|hệ\s+phương\s+trình|bất\s+phương\s+trình|hàm\s+số|đồ\s+thị|vectơ|vecto|tọa\s+độ|mặt\s+phẳng|đường\s+thẳng|điểm|khoảng|đoạn|nửa\s+khoảng|ví\s+dụ|lời\s+giải)(?![a-zA-Z0-9_\u00C0-\u1EF9])/i;

  const findStartWithPrefix = (text: string, cmdIndex: number): number => {
    const before = text.slice(0, cmdIndex);
    const prefixMatch = before.match(/(?:^|[\s\(\[\{;,])((?:-?\d+(?:\.\d+)?\s*|\+?\d+(?:\.\d+)?\s*|C_\{?|[a-zA-Z](?:_\{?[0-9a-zA-Z\+\-]+\}?)?)(?:\([a-zA-Z0-9,\s]*\))?(?:\s*(?:[=><\le\ge\approx\neq]|>=|<=|==|!=|\\le|\\ge|\\approx|\\neq|\\sim)\s*(?:-?\d+(?:\.\d+)?\s*)?)?\s*)$/);
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
      }

      if (braceDepth === 0 && bracketDepth === 0 && parenDepth === 0) {
        if (/[\.,:;!?]/.test(ch)) {
          const afterPunct = s.slice(i + 1).trimStart();
          if (/^(\\(?:left|right|Leftrightarrow|Rightarrow|sqrt|frac|begin|lim)|[=+\-*\/<>]|\d+|[a-zA-Z]\s*[=+\-*\/<>])/.test(afterPunct)) {
             i += (s.slice(i).length - afterPunct.length);
             lastValidEnd = i;
             continue;
          }
          break;
        }

        if (/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(ch)) {
          break;
        }

        if (/[\s\n\r]/.test(ch)) {
          const afterSpace = s.slice(i).trimStart();
          if (!afterSpace) break;

          // Stop if encountering bullet or text separator like " - Lời giải" or " - Ví dụ"
          if (/^-\s+[A-ZÀ-Ỹa-zà-ỹ]/.test(afterSpace)) {
            break;
          }

          // Stop if encountering a Vietnamese word or capitalized sentence starter
          if (stopWords.test(afterSpace) || /^(?:Vậy|Lời|Nếu|Hoặc|Và|Với|Khi|Do|Suy\s+ra|Ta\s+có|Định\s+nghĩa)\b/i.test(afterSpace) || /^[A-ZÀ-Ỹ][a-zà-ỹ]{1,}/.test(afterSpace)) {
            break;
          }

          if (/^([+\-*\/=<>\|]|\\|\d+|[a-zA-Z]{1,4}\b|\(|\)|\[|\]|\{|\})/.test(afterSpace)) {
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

  return result;
}

const img2 = `b) Nội dung: Tìm hiểu định nghĩa tiệm cận ngang SGK, xét ví dụ hàm số y = \\frac{2x+1}{x-1} và tính các giới hạn lim_{x \\to +\\infty}y, lim_{x \\to -\\infty}y.
• Định nghĩa tiệm cận ngang: Đường thẳng y = y_0 là tiệm cận ngang của đồ thị hàm số y = f(x) nếu lim_{x \\to +\\infty}f(x) = y_0 hoặc lim_{x \\to -\\infty}f(x) = y_0.
• Lời giải ví dụ: lim_{x \\to +\\infty} \\frac{2x+1}{x-1} = lim_{x \\to +\\infty} \\frac{2+\\frac{1}{x}}{1-\\frac{1}{x}} = 2 lim_{x \\to -\\infty} \\frac{2x+1}{x-1} = 2 Vậy`;

const img3 = `• Định nghĩa tiệm cận đứng: Đường thẳng x = x_0 là tiệm cận đứng của đồ thị hàm số y = f(x) nếu ít nhất một trong các giới hạn sau thỏa mãn:
\\lim_{x \\to x_0^+} f(x) = +\\infty, \\quad \\lim_{x \\to x_0^+} f(x) = -\\infty, \\quad \\lim_{x \\to x_0^-} f(x) = +\\infty, \\quad \\lim_{x \\to x_0^-} f(x) = -\\infty - Lời giải ví dụ: lim_{x \\to 1^+} \\frac{x+2}{x-1} = +\\infty (vì x - 1 > 0 khi x \\to 1^+) Vậy đường thẳng x = 1 là tiệm cận đứng của đồ thị hàm số.`;

console.log("=== IMG 2 ===");
console.log(testWrapAllNakedMath(img2));

console.log("=== IMG 3 ===");
console.log(testWrapAllNakedMath(img3));
