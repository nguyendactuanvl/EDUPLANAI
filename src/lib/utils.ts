import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Làm sạch chuỗi JSON bên trong chuỗi string, tự động sửa các lỗi:
 * - Ký tự backslash không hợp lệ trong LaTeX (\frac, \alpha, \le, \vec, \Omega, ...)
 * - Unicode escape không hợp lệ (\upsilon, \underline, ...)
 * - Xuống dòng hoặc tab chưa được escape trong chuỗi string
 * - Dấu phẩy thừa cuối mảng/object (, } hoặc , ])
 */
export function sanitizeJsonString(str: string): string {
  let result = "";
  let inString = false;
  let i = 0;
  const len = str.length;

  while (i < len) {
    const ch = str[i];

    if (!inString) {
      if (ch === "\"") {
        inString = true;
        result += ch;
        i++;
      } else {
        result += ch;
        i++;
      }
    } else {
      if (ch === "\"") {
        inString = false;
        result += ch;
        i++;
      } else if (ch === "\\") {
        if (i + 1 >= len) {
          result += "\\\\";
          i++;
        } else {
          const next = str[i + 1];
          if (next === "\"" || next === "\\") {
            result += "\\" + next;
            i += 2;
          } else if (next === "/") {
            result += "/";
            i += 2;
          } else if (next === "b" || next === "f" || next === "n" || next === "r" || next === "t") {
            const charAfter = (i + 2 < len) ? str[i + 2] : "";
            if (charAfter && /[a-zA-Z]/.test(charAfter)) {
              result += "\\\\" + next;
              i += 2;
            } else {
              result += "\\" + next;
              i += 2;
            }
          } else if (next === "u") {
            const hex = str.slice(i + 2, i + 6);
            if (/^[0-9a-fA-F]{4}$/.test(hex)) {
              result += "\\u" + hex;
              i += 6;
            } else {
              result += "\\\\u";
              i += 2;
            }
          } else {
            result += "\\\\" + next;
            i += 2;
          }
        }
      } else if (ch === "\n") {
        result += "\\n";
        i++;
      } else if (ch === "\r") {
        result += "\\r";
        i++;
      } else if (ch === "\t") {
        result += "\\t";
        i++;
      } else {
        result += ch;
        i++;
      }
    }
  }

  return result.replace(/,\s*([\}\]])/g, "$1");
}

export function repairTruncatedJson(str: string): string {
  let inString = false;
  let escaped = false;
  const stack: string[] = [];

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === "\"") {
        inString = false;
      }
    } else {
      if (ch === "\"") {
        inString = true;
      } else if (ch === "{" || ch === "[") {
        stack.push(ch);
      } else if (ch === "}" && stack[stack.length - 1] === "{") {
        stack.pop();
      } else if (ch === "]" && stack[stack.length - 1] === "[") {
        stack.pop();
      }
    }
  }

  let repaired = str;
  if (inString) {
    repaired += "\"";
  }
  repaired = repaired.replace(/,\s*$/, "");
  while (stack.length > 0) {
    const top = stack.pop();
    if (top === "{") repaired += "}";
    if (top === "[") repaired += "]";
  }
  return repaired;
}

/**
 * An toàn phân tích chuỗi JSON trả về từ AI, xử lý triệt để lỗi "Bad escaped character in JSON"
 * do công thức toán học LaTeX chứa các ký tự \ chưa được escape hợp lệ (như \frac, \le, \Omega, \alpha, ...)
 */
export function safeJsonParse<T = any>(text: string, fallback?: T): T {
  if (!text || typeof text !== 'string') return (text as any) || (fallback as T);
  let cleaned = text
    .replace(/^```json\s*/gi, '')
    .replace(/^```\s*/gi, '')
    .replace(/```\s*$/gi, '')
    .replace(/```/g, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (e1) {
    try {
      const sanitized = sanitizeJsonString(cleaned);
      return JSON.parse(sanitized);
    } catch (e2) {
      const match = cleaned.match(/(\{|\[)[\s\S]*(\}|\])/);
      if (match) {
        try {
          return JSON.parse(sanitizeJsonString(match[0]));
        } catch (e3) {}
      }

      try {
        const repaired = repairTruncatedJson(cleaned);
        return JSON.parse(sanitizeJsonString(repaired));
      } catch (e4) {}

      if (fallback !== undefined && fallback !== null) {
        return fallback;
      }
      throw e1;
    }
  }
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
      const parsed = safeJsonParse(rawError);
      if (parsed?.error?.message) errorMsg = parsed.error.message;
      else if (parsed?.message) errorMsg = parsed.message;
    } catch (e) {
      const jsonMatch = rawError.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = safeJsonParse(jsonMatch[0]);
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
    return safeJsonParse<T>(clean);
  } catch (e) {
    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return safeJsonParse<T>(jsonMatch[0]);
      } catch (inner) {
        // Try salvaging valid question objects if JSON was truncated
        const questionsMatch = jsonMatch[0].match(/"questions"\s*:\s*\[([\s\S]*)/);
        if (questionsMatch) {
          const salvagedQuestions: any[] = [];
          const questionRegex = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
          let qm: RegExpExecArray | null;
          while ((qm = questionRegex.exec(questionsMatch[1])) !== null) {
            try {
              const qObj = safeJsonParse(qm[0]);
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

/**
 * Xóa bỏ các ký tự $ mồ côi (trailing dollar sign) ở cuối văn bản hoặc nằm sau dấu chấm câu (ví dụ: ".$" hay ". $" -> ".")
 */
export function cleanMath(text: string): string {
  if (!text) return '';
  let s = String(text);
  // Xóa bỏ các ký tự $ mồ côi nằm sau dấu chấm câu (., ;, :)
  s = s.replace(/([\.\;\,])\s*\$+$/g, '$1');
  s = s.replace(/([\.\;\,])\s*\$+(\s)/g, '$1$2');

  // Nếu chuỗi kết thúc bằng dấu $ nhưng tổng số lượng dấu $ là số lẻ (dấu $ mồ côi chưa đóng) -> cắt bỏ dấu $ thừa
  const dollarCount = (s.match(/(?<!\\)\$/g) || []).length;
  if (dollarCount % 2 !== 0 && s.trimEnd().endsWith('$')) {
    s = s.replace(/\s*\$+$/, '');
  }
  return s;
}

/**
 * Giải cứu văn bản tiếng Việt bị lỡ bọc nhầm vào bên trong môi trường toán $...$ hoặc $$...$$
 * (Ví dụ: "$.Xét tính đúng sai của các khẳng định sau?$" -> ". Xét tính đúng sai của các khẳng định sau?")
 */
export function rescueVietnameseFromMath(text: string): string {
  if (!text) return '';
  let s = text;
  s = s.replace(/(?<!\$)\$(?!\$)([\s\S]+?)(?<!\$)\$(?!\$)/g, (match, formula) => {
    if (formula.includes('$$')) return match;
    const cleanFormula = formula.replace(/\\text\{[^{}]*\}/g, '');
    const isVietnamese = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(cleanFormula) ||
      /\b(Xét\s+tính\s+đúng\s+sai|khẳng\s+định|mệnh\s+đề|đúng\s+sai|Cho\s+hàm\s+số|tập\s+hợp)\b/i.test(cleanFormula);
    if (isVietnamese) {
      return ` ${formula.trim()} `;
    }
    return match;
  });
  return s;
}

/**
 * Chuẩn hóa thân môi trường cases (\begin{cases} ... \end{cases}):
 * 1. Sửa lỗi dính dòng giữa các bất phương trình: ví dụ \ge 1002x hoặc \ge 80x -> 100 \\ 2x, 80 \\ x
 * 2. Phân tách nếu hai điều kiện cách nhau bởi dấu phẩy (như x \ge 0, y \ge 0)
 * 3. Thay thế các ký tự gãy dòng `\ ` thành `\\ `
 * 4. Nếu giữa các phương trình xuống hàng mà thiếu `\\`, tự động bổ sung `\\`
 * 5. Đảm bảo mọi dòng luôn được phân tách bằng double backslash `\\`
 */
export function normalizeCasesBody(body: string): string {
  if (!body) return '';
  let s = body;

  // 1. Phân tách nếu hai điều kiện cách nhau bởi dấu phẩy (như x \ge 0, y \ge 0 hoặc x > 0, y > 0)
  s = s.replace(/([<>=]|\\ge|\\le|\\leq|\\geq|\\neq)\s*(-?\d+)\s*,\s*([a-zA-Z\d\\]+[\s\S]*?(?:[<>=]|\\ge|\\le|\\leq|\\geq|\\neq))/g, '$1 $2 \\\\ $3');

  // 2. Nếu gãy dòng bởi dấu gạch chéo đơn `\ ` trước biến hoặc số -> chuyển thành `\\ `
  s = s.replace(/(?<!\\)\\\s+([a-zA-Z0-9\-\+\{\(])/g, '\\\\ $1');

  // 3. Nếu giữa các dòng xuống hàng thực sự mà thiếu `\\` -> bổ sung `\\`
  s = s.replace(/([^\\])\n\s*([a-zA-Z0-9\-\+\{\(\\])/g, '$1 \\\\\n $2');

  // 4. Sửa lỗi dính dòng giữa các bất phương trình/phương trình (như \ge 1002x hoặc \ge 80x):
  // CHỈ tách nếu vế sau có chứa thêm toán tử bất phương trình/phương trình tiếp theo
  // Tránh tách nhầm các biểu thức hợp lệ như `x \ge 2x - 1`
  s = s.replace(/([<>=]|\\ge|\\le|\\leq|\\geq|\\neq)\s*(\d+)\s*([a-zA-Z\d][^\\\n]*?(?:[<>=]|\\ge|\\le|\\leq|\\geq|\\neq))/g, (_m, op, num, rest) => {
    const subMatch = num.match(/^(\d+?0+)([1-9][a-zA-Z].*)$/);
    if (subMatch) {
      return `${op} ${subMatch[1]} \\\\ ${subMatch[2]} ${rest}`;
    }
    return `${op} ${num} \\\\ ${rest}`;
  });

  // 5. Chuẩn hóa tất cả các dấu \\ bên trong cases: đảm bảo luôn là double backslash `\\` kèm ngắt dòng đẹp
  s = s.replace(/(?<!\\)\\\\(?!\\)\s*/g, ' \\\\\n');

  return s.trim();
}

/**
 * Định dạng thân aligned cho họ nghiệm phương trình lượng giác:
 * Mỗi phương trình trên một dòng, nếu có dấu '=' thì căn chỉnh bằng '&='
 */
export function formatAlignedTrigBody(body: string): string {
  if (!body) return '';
  const normalized = normalizeCasesBody(body);
  const rawLines = normalized.split('\\\\');
  const formattedLines = rawLines.map(rawLine => {
    let line = rawLine.trim();
    if (!line) return '';
    // Nếu dòng có '=' và chưa có '&' đứng trước '=', thêm '&' để căn chỉnh dấu bằng đẹp trong aligned
    if (line.includes('=') && !line.includes('&=')) {
      line = line.replace(/=\s*/, '&= ');
    }
    return line;
  }).filter(Boolean);

  return formattedLines.join(' \\\\\n');
}

/**
 * Chuẩn hóa biểu diễn họ nghiệm phương trình lượng giác:
 * - Khi biểu diễn họ nghiệm tuyển của phương trình lượng giác (\sin, \cos, \tan, \cot...):
 *   + BẮT BUỘC sử dụng dấu móc vuông \left[ thay vì dấu móc nhọn \begin{cases}.
 *   + Cú pháp chuẩn KaTeX:
 *     $$\left[\begin{aligned} x &= \alpha + k2\pi \\ x &= \pi - \alpha + k2\pi \end{aligned}\right. \quad (k \in \mathbb{Z})$$
 *   + Giữ nguyên dấu móc nhọn \begin{cases} ... \end{cases} cho hệ phương trình / hệ bất phương trình.
 */
export function normalizeTrigSolutions(text: string): string {
  if (!text) return '';
  let s = text;

  // 1. Chuyển \left[\begin{cases} ... \end{cases}\right. hoặc \left[\begin{matrix} ... \end{matrix}\right. hoặc \left[\begin{array} ... \end{array}\right.
  //    thành \left[\begin{aligned} ... \end{aligned}\right.
  s = s.replace(/\\left\s*\[\s*\\begin\s*\{(?:cases|matrix|array)\*?\}([\s\S]*?)\\end\s*\{(?:cases|matrix|array)\*?\}\s*\\right\.?/g, (_m, body) => {
    return `\\left[\\begin{aligned}\n${formatAlignedTrigBody(body)}\n\\end{aligned}\\right.`;
  });

  // 2. Chuyển \begin{cases} ... \end{cases} chứa nghiệm lượng giác (k2\pi, 2k\pi, k\pi, k \in \mathbb{Z}, ...)
  //    thành dấu móc vuông chuẩn KaTeX: \left[\begin{aligned} ... \end{aligned}\right.
  s = s.replace(/\\begin\s*\{cases\*?\}([\s\S]*?)\\end\s*\{cases\*?\}/g, (match, body) => {
    // Nhận diện họ nghiệm lượng giác:
    // Chứa tham số chu kỳ góc lượng giác: k2\pi, 2k\pi, k\pi, k \in \mathbb{Z}, k \in Z, hoặc \pi / ... + k
    const isTrigSolution = /(?:k\s*2\s*\\pi|2\s*k\s*\\pi|k\s*\\pi|\b\d*k\pi\b|k\s*\\in\s*(?:\\mathbb\{Z\}|Z)|[+\-]\s*k\s*\\pi|[+\-]\s*k2\\pi)/i.test(body);
    if (!isTrigSolution) {
      // GIỮ NGUYÊN \begin{cases} cho hệ phương trình / hệ bất phương trình
      return match;
    }
    return `\\left[\\begin{aligned}\n${formatAlignedTrigBody(body)}\n\\end{aligned}\\right.`;
  });

  return s;
}

/**
 * Kiểm tra xem tại vị trí pos trong chuỗi text có đang nằm trong môi trường toán ($...$ hoặc $$...$$) hay không
 */
export function isInsideMath(text: string, pos: number): boolean {
  const before = text.slice(0, pos);
  let inInline = false;
  let inDisplay = false;
  let i = 0;
  while (i < before.length) {
    if (before[i] === '\\' && i + 1 < before.length && before[i+1] === '$') {
      i += 2;
      continue;
    }
    if (before.slice(i, i + 2) === '$$') {
      inDisplay = !inDisplay;
      i += 2;
      continue;
    }
    if (before[i] === '$') {
      inInline = !inInline;
      i += 1;
      continue;
    }
    i++;
  }
  return inInline || inDisplay;
}

/**
 * Làm sạch và chuẩn hóa chuỗi công thức LaTeX:
 * 1. Chuẩn hóa ký hiệu Hy Lạp viết thiếu backslash: thay thế các từ độc lập như \bDelta\b thành \Delta, \bpi\b thành \pi (nếu chưa có \)
 * 2. Sửa lỗi escape đơn vị đo:
 *    - Thay thế các dạng (\d+)\s*text\s*([a-zA-Z]+) hoặc (\d+)\s*\\text\s*([a-zA-Z]+) thành $1\\text{ $2} (ví dụ: 6textcm -> 6\text{ cm})
 *    - Đảm bảo đơn vị hiển thị thẳng đứng và có khoảng cách hợp lý
 * 3. Sửa lỗi cú pháp số mũ / ký hiệu độ:
 *    - Thay thế \^\\+\s*circ hoặc \^\{\\+\s*circ\} thành ^\circ (xóa triệt để các dấu backslash dư thừa \\)
 * 4. Không can thiệp vào các chuỗi LaTeX đã chuẩn sẵn để tránh làm hỏng các công thức bình thường.
 */
export function sanitizeLatexString(text: string): string {
  if (!text) return '';
  let s = text.replace(/\\dfrac\b/g, '\\frac');

  // 1. Chuẩn hóa ký hiệu Hy Lạp viết thiếu backslash:
  // Thay thế từ độc lập Delta thành \Delta (nếu chưa có dấu \)
  s = s.replace(/(?<!\\)\bDelta\b/g, '\\Delta');

  // Chuẩn hóa pi: thay thế 2pi, k2pi, hoặc \bpi\b đứng độc lập thành \pi
  // Bảo vệ không đụng vào từ tiếng Anh thông thường (pin, topic, spin, opinion, v.v.)
  s = s.replace(/(\d+)\s*pi\b/g, '$1\\pi');
  s = s.replace(/(?<![\\a-zA-Z])\bpi\b(?![a-zA-Z])/g, '\\pi');

  // 2. Sửa lỗi escape đơn vị đo:
  // Thay thế 6textcm, 4textm, 10textcm, 6\textcm, 6\text{cm} thành $1\text{ $2}
  s = s.replace(/(\d+)\s*\\*text\s*\{?\s*([a-zA-Z]+)\s*\}?/g, '$1\\text{ $2}');

  // 3. Sửa lỗi cú pháp số mũ / ký hiệu độ:
  // Thay thế 50^\ circ, 50^\\ circ, 50^{\ circ}, 50^{\\ circ}, 50^circ thành 50^\circ
  s = s.replace(/\^\{\s*\\+\s*circ\s*\}/g, '^\\circ');
  s = s.replace(/\^\{\s*circ\s*\}/g, '^\\circ');
  s = s.replace(/\^\s*\\+\s*circ\b/g, '^\\circ');
  s = s.replace(/(?<=\d)\s*\^\s*circ\b/g, '^\\circ');

  return s;
}

/**
 * Tự động bọc $$...$$ cho các môi trường toán trần (naked LaTeX environments) khi chưa có $ hoặc $$ bao bọc:
 * - \left[\begin{aligned}...\end{aligned}\right. (kèm tham số họ nghiệm lượng giác \quad (k \in \mathbb{Z}))
 * - \left[\begin{array}...\end{array}\right. hoặc \left[...\right.
 * - \begin{cases}...\end{cases} (hệ phương trình / hệ BPT)
 * - Các môi trường khác: matrix, pmatrix, bmatrix, vmatrix, array, align, gather...
 */
export function wrapNakedMathEnvironments(text: string): string {
  if (!text) return '';
  let s = text;

  // 1. Tự động bọc naked \left[ ... \right. (bao gồm có hoặc không có aligned/array bên trong)
  s = s.replace(/(\\left\s*\[[\s\S]*?\\right\.?(?:\s*\\quad\s*\([^\)]+\))?)/g, (match, env, offset) => {
    if (isInsideMath(s, offset)) return match;
    let safeEnv = env.trim();
    // Tự động bổ sung \right. nếu thiếu
    if (!/\\right\s*[.\]\)\}]/.test(safeEnv)) {
      safeEnv = safeEnv + ' \\right.';
    }
    const isBlock = safeEnv.includes('\n') || safeEnv.length > 35;
    return isBlock ? `\n\n$$\n${safeEnv}\n$$\n\n` : ` $${safeEnv}$ `;
  });

  // 1.5 Tự động chuẩn hóa và bọc \left\{ ... \\ ... \right. thành \begin{cases}...\end{cases}
  s = s.replace(/\\left\s*\\\{([\s\S]*?)\\right\.?/g, (match, body, offset) => {
    if (!body.includes('\\\\') && !body.includes('\n')) return match;
    const safeBody = normalizeCasesBody(body);
    if (isInsideMath(s, offset)) {
      return `\\begin{cases}\n${safeBody}\n\\end{cases}`;
    }
    return `\n\n$$\n\\begin{cases}\n${safeBody}\n\\end{cases}\n$$\n\n`;
  });

  // 2. Tự động bọc các môi trường trần khác: cases, aligned, array, matrix... (trừ khi nằm sau \left[ hoặc đã nằm trong math)
  s = s.replace(/(\\begin\s*\{(?:cases|aligned|array|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|split|gather|align)\*?\}[\s\S]*?\\end\s*\{(?:cases|aligned|array|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|split|gather|align)\*?\})/g, (match, env, offset) => {
    const before = s.slice(Math.max(0, offset - 25), offset);
    if (/\\left\s*[\(\[\{\.]$/.test(before.trim()) || isInsideMath(s, offset)) return match;
    const isBlock = env.includes('\n') || env.length > 35;
    return isBlock ? `\n\n$$\n${env.trim()}\n$$\n\n` : ` $${env.trim()}$ `;
  });

  return s;
}

/**
 * Tiền xử lý nội dung toán tổng thể trước khi xuất Word (.docx) hoặc xuất HTML In
 */
export function preProcessMathContent(content: string): string {
  if (!content) return '';
  let res = sanitizeLatexString(content);
  res = wrapNakedMathEnvironments(res);
  return res;
}

/**
 * Chuyển đổi mã OMML (Office Math Markup Language) từ Word Equation sang LaTeX
 */
export const convertOmmlToLatex = (content: string): string => {
  if (!content || !content.includes('<m:')) return content;

  const ommlNodeToLatex = (nodeXml: string): string => {
    if (!nodeXml) return '';
    let xml = nodeXml.trim();

    // Phân số: <m:f><m:num>...</m:num><m:den>...</m:den></m:f>
    xml = xml.replace(/<m:f[\s\S]*?>[\s\S]*?<m:num>([\s\S]*?)<\/m:num>[\s\S]*?<m:den>([\s\S]*?)<\/m:den>[\s\S]*?<\/m:f>/gi, (_m, num, den) => {
      return `\\frac{${ommlNodeToLatex(num)}}{${ommlNodeToLatex(den)}}`;
    });

    // Căn thức: <m:rad>
    xml = xml.replace(/<m:rad[\s\S]*?>([\s\S]*?)<\/m:rad>/gi, (_m, inner) => {
      const degMatch = inner.match(/<m:deg>([\s\S]*?)<\/m:deg>/i);
      const eMatch = inner.match(/<m:e>([\s\S]*?)<\/m:e>/i);
      const deg = degMatch ? ommlNodeToLatex(degMatch[1]).trim() : '';
      const e = eMatch ? ommlNodeToLatex(eMatch[1]).trim() : '';
      return deg ? `\\sqrt[${deg}]{${e}}` : `\\sqrt{${e}}`;
    });

    // Chỉ số trên / dưới: sSubSup, sSub, sSup
    xml = xml.replace(/<m:sSubSup[\s\S]*?>[\s\S]*?<m:e>([\s\S]*?)<\/m:e>[\s\S]*?<m:sub>([\s\S]*?)<\/m:sub>[\s\S]*?<m:sup>([\s\S]*?)<\/m:sup>[\s\S]*?<\/m:sSubSup>/gi, (_m, b, sub, sup) => {
      return `{${ommlNodeToLatex(b)}}_{${ommlNodeToLatex(sub)}}^{${ommlNodeToLatex(sup)}}`;
    });
    xml = xml.replace(/<m:sSub[\s\S]*?>[\s\S]*?<m:e>([\s\S]*?)<\/m:e>[\s\S]*?<m:sub>([\s\S]*?)<\/m:sub>[\s\S]*?<\/m:sSub>/gi, (_m, b, sub) => {
      return `{${ommlNodeToLatex(b)}}_{${ommlNodeToLatex(sub)}}`;
    });
    xml = xml.replace(/<m:sSup[\s\S]*?>[\s\S]*?<m:e>([\s\S]*?)<\/m:e>[\s\S]*?<m:sup>([\s\S]*?)<\/m:sup>[\s\S]*?<\/m:sSup>/gi, (_m, b, sup) => {
      return `{${ommlNodeToLatex(b)}}^{${ommlNodeToLatex(sup)}}`;
    });

    // Dấu ngoặc và hệ phương trình: <m:d>
    xml = xml.replace(/<m:d[\s\S]*?>([\s\S]*?)<\/m:d>/gi, (_m, inner) => {
      const begChrMatch = inner.match(/<m:begChr\s+m:val="([^"]*)"/i);
      const endChrMatch = inner.match(/<m:endChr\s+m:val="([^"]*)"/i);
      const begChr = begChrMatch ? begChrMatch[1] : '(';
      const endChr = endChrMatch ? endChrMatch[1] : ')';

      const eqArrMatch = inner.match(/<m:eqArr[\s\S]*?>([\s\S]*?)<\/m:eqArr>/i);
      if (eqArrMatch) {
        const rows: string[] = [];
        const eMatches = eqArrMatch[1].matchAll(/<m:e[\s\S]*?>([\s\S]*?)<\/m:e>/gi);
        for (const em of eMatches) {
          const rowContent = ommlNodeToLatex(em[1]).trim();
          if (rowContent) rows.push(rowContent);
        }
        if (begChr === '{' && (!endChr || endChr === '')) {
          return `\\begin{cases} ${rows.join(' \\\\ ')} \\end{cases}`;
        }
        if (begChr === '[' && (!endChr || endChr === '')) {
          return `\\left[ \\begin{array}{l} ${rows.join(' \\\\ ')} \\end{array} \\right.`;
        }
        return `\\left${begChr === '{' ? '\\{' : (begChr || '.')} \\begin{aligned} ${rows.join(' \\\\ ')} \\end{aligned} \\right${endChr === '}' ? '\\}' : (endChr || '.')}`;
      }

      const eMatch = inner.match(/<m:e[\s\S]*?>([\s\S]*?)<\/m:e>/i);
      const content = eMatch ? ommlNodeToLatex(eMatch[1]).trim() : '';
      const leftBracket = begChr === '{' ? '\\{' : (begChr || '.');
      const rightBracket = endChr === '}' ? '\\}' : (endChr || '.');
      return `\\left${leftBracket} ${content} \\right${rightBracket}`;
    });

    // Trích xuất văn bản trong <m:t>
    xml = xml.replace(/<m:t[\s\S]*?>([\s\S]*?)<\/m:t>/gi, (_m, t) => t);

    // Dọn các thẻ rác còn lại
    return xml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  };

  let text = content;

  // Xử lý container <m:oMathPara>
  text = text.replace(/<m:oMathPara[\s\S]*?>[\s\S]*?<\/m:oMathPara>/gi, (match) => {
    const math = ommlNodeToLatex(match);
    return math ? `$$${math}$$` : '';
  });

  // Xử lý container <m:oMath>
  text = text.replace(/<m:oMath[\s\S]*?>[\s\S]*?<\/m:oMath>/gi, (match) => {
    const math = ommlNodeToLatex(match);
    return math ? `$${math}$` : '';
  });

  // Xử lý khối <m:d> độc lập
  text = text.replace(/<m:d[\s\S]*?>[\s\S]*?<\/m:d>/gi, (match) => {
    const math = ommlNodeToLatex(match);
    return math ? `$$${math}$$` : '';
  });

  return text;
};

/**
 * Chuẩn hóa dấu tiếng Việt (Unicode NFD -> NFC) và triệt tiêu dấu thanh bị gãy rụng:
 */
export const cleanVietnameseUnicode = (str: string): string => {
  if (!str) return '';
  let res = str;

  // 1. Chuẩn hóa sang Unicode Dựng Sẵn (NFC)
  res = res.normalize('NFC');

  // 2. Triệt tiêu các ký tự dấu thanh bị gãy rụng đứng cạnh chữ cái
  res = res
    .replace(/PHÂ\s*[`']\s*N/gi, 'PHẦN')
    .replace(/THỐ\s*[´']\s*NG/gi, 'THỐNG')
    .replace(/TRĂ\s*[´']\s*C/gi, 'TRẮC')
    .replace(/NHIÊ\s*[`']\s*U/gi, 'NHIỀU')
    .replace(/nhấ\s*[´']\s*t/gi, 'nhất')
    .replace(/viế\s*[´']\s*t/gi, 'viết')
    .replace(/biế\s*[´']\s*n/gi, 'biến')
    .replace(/Số\s*[´']/gi, 'Số')
    .replace(/đề\s*[`']/gi, 'đề')
    .replace(/tố\s*[´']/gi, 'tố')
    .replace(/Â[`']/g, 'Ầ')
    .replace(/Â´/g, 'Ấ')
    .replace(/Ă´/g, 'Ắ')
    .replace(/Ă[`']/g, 'Ằ')
    .replace(/ô´/g, 'ố')
    .replace(/ô[`']/g, 'ồ')
    .replace(/ê´/g, 'ế')
    .replace(/ê[`']/g, 'ề')
    .replace(/ề[`']/g, 'ề')
    .replace(/ế´/g, 'ế')
    .replace(/ố´/g, 'ố')
    .replace(/ố[`']/g, 'ồ')
    .replace(/([a-zA-Z\u00C0-\u1EF9])[\s]*[`´'](?=[a-zA-Z\u00C0-\u1EF9\s]|$)/g, '$1');

  // 3. Xử lý thiếu gạch đầu mệnh đề phủ định (\overline{P}, \overline{Q}, ...)
  res = res
    .replace(/([PQAB])[\u0304\u0305]/g, '$\\overline{$1}$')
    .replace(/\\bar\{([A-Za-z])\}/g, '\\overline{$1}')
    .replace(/(?<!\\)\b(bar|overline)\s*\{([A-Za-z])\}/g, '\\overline{$2}');

  return res;
};

/**
 * Chuẩn hóa văn bản & công thức toán trước khi render:
 * 1. Sửa lỗi chính tả văn bản thông dụng (ví dụ: "và o các khoảng trống" -> "vào các khoảng trống")
 * 2. Tự động tách liên từ "và", "hoặc", "với" bị dính giữa 2 công thức (vd: )vàB =, ]vàB =)
 * 3. Tách cặp $ nếu liên từ "và", "hoặc", "hay", "với" bị bao bọc bên trong công thức math
 * 4. Tự động bao bọc các biểu thức tập hợp trần A = [a; b) vào cặp dấu $...$
 * 5. Định dạng typography dòng "Đáp số: ........" cho đồng đều và đẹp mắt
 */
export const polishMathText = (content: string): string => {
  if (!content) return '';
  let text = cleanVietnameseUnicode(content);

  // 1. Sửa lỗi chính tả văn bản thông dụng
  text = text.replace(/và\s+o\s+các\s+khoảng\s+trống/gi, 'vào các khoảng trống');
  text = text.replace(/và\s+o\s+(?:các\s+)?(?:khoảng|chỗ)\s+trống/gi, 'vào các khoảng trống');

  // 2. Tự động tách liên từ "và", "hoặc", "với" bị dính giữa 2 công thức (vd: )vàB =, ]vàB =)
  // Trường hợp nằm ngoài hoặc trong dấu $, bảo vệ không phá vỡ từ tiếng Việt (vào, vàng, vài)
  text = text
    .replace(/\b1vàm\b/gi, '1 và m')
    .replace(/\bvàtìm\b/gi, 'và tìm')
    .replace(/([\)\]\}0-9a-zA-Z])(?<!\s)và(?!(?:o|i|ng|c|t)\b)([a-zA-Z0-9\$\\])/g, '$1 và $2')
    .replace(/([\)\]\}0-9a-zA-Z])(?<!\s)hoặc(?=[a-zA-Z0-9\$\\])/g, '$1 hoặc $2')
    .replace(/([\)\]\}0-9a-zA-Z])(?<!\s)với(?=[a-zA-Z0-9\$\\])/g, '$1 với $2')
    .replace(/([\)\]\}0-9a-zA-Z])\s*và\s*([A-Z])/g, '$1 và $2')
    .replace(/([\)\]\}0-9a-zA-Z])\s*hoặc\s*([A-Z])/g, '$1 hoặc $2')
    .replace(/([\)\]\}0-9a-zA-Z])\s*với\s*([A-Z])/g, '$1 với $2');

  // Bảo vệ tạm thời các khối \text{...} để không vô tình xé rách văn bản đã được bọc chuẩn
  const textTokens: string[] = [];
  text = text.replace(/\\text\{[^{}]*\}/g, (match) => {
    textTokens.push(match);
    return `___POLISH_TEXT_${textTokens.length - 1}___`;
  });

  // 3. Tách cặp $ nếu liên từ "và", "hoặc", "hay", "với" bị bao bọc bên trong công thức math
  // Ví dụ: $A = [-4; 5) và B = (-2; 7]$ -> $A = [-4; 5)$ và $B = (-2; 7]$
  // Đảm bảo p1 và p2 không phải chỉ toàn khoảng trắng hoặc rỗng (tránh match nhầm $ và $)
  let prev = '';
  let iter = 0;
  while (prev !== text && iter < 4) {
    prev = text;
    iter++;
    text = text.replace(/\$([^\$\s][^\$]*?)\s+(và|hoặc|hay|với)\s+([^\$]*?[^\$\s])\$/g, (_match, p1, conj, p2) => {
      return `$${p1.trim()}$ ${conj} $${p2.trim()}$`;
    });
    // Xử lý trường hợp không có khoảng trắng: $A = [-4; 5)vàB = (-2; 7]$
    text = text.replace(/\$([^\$\s][^\$]*?)(và|hoặc|hay|với)([^\$]*?[^\$\s])\$/g, (_match, p1, conj, p2) => {
      return `$${p1.trim()}$ ${conj} $${p2.trim()}$`;
    });
  }

  // Khôi phục các khối \text{...}
  text = text.replace(/___POLISH_TEXT_(\d+)___/g, (_m, idx) => textTokens[Number(idx)] || '');

  // 4. Bọc các biểu thức tập hợp đứng trần như B \setminus A = [5; 7), A \cap B = [2; 5], hoặc A = [-4; 5) thành $...$
  text = text.replace(/(?<![a-zA-Z0-9\$\\])\b([A-Z]\s*(?:\\(?:setminus|cap|cup|subset|supset|subseteq|supseteq)\s*[A-Z]\s*)+=\s*[\[\(]\s*[^;,\]\)\n]+\s*[;,]\s*[^;,\]\)\n]+\s*[\]\)])(?![a-zA-Z0-9\$\\])/g, (_m, g1) => `$${g1}$`);
  text = text.replace(/(?<![a-zA-Z0-9\$\\]|\\(?:setminus|cap|cup)\s*)\b([A-Z]\s*=\s*[\[\(]\s*[^;,\]\)\n]+\s*[;,]\s*[^;,\]\)\n]+\s*[\]\)])(?![a-zA-Z0-9\$\\])/g, (_m, g1) => `$${g1}$`);

  // 5. Định dạng dòng "Đáp số: ........" cho đồng đều và đẹp mắt
  text = text.replace(/(?:\*?Đáp số:\*?\s*)[\.]{3,}/gi, '*Đáp số:* ................................................................');

  return text;
};

export const sanitizeAndFormatMath = polishMathText;

/**
 * Chuẩn hóa các toán tử so sánh bị thiếu dấu gạch chéo ngược hoặc dính liền ký tự (vd: -2leqx -> -2 \le x, |x|leq3 -> |x| \le 3)
 */
export const fixNakedLeqGeq = (str: string): string => {
  if (!str) return "";
  let s = str;
  // Sửa leq, geq, neq dính liền chữ số hoặc ký tự: -2leqx -> -2 \le x, |x|leq3 -> |x| \le 3
  s = s.replace(/([0-9a-zA-Z\$\(\]\}|\_])\s*(?:\\)?(leq|geq|neq)\s*([0-9a-zA-Z\$\(\]\}|\_])/gi, (_m, a, op, b) => {
    const latexOp = op.toLowerCase() === "leq" ? "\\le" : op.toLowerCase() === "geq" ? "\\ge" : "\\neq";
    return `${a} ${latexOp} ${b}`;
  });
  s = s.replace(/(?<=[0-9a-zA-Z\$\(\]\}|\_])\s*(?:\\)?(leq|geq|neq)\s*(?=[0-9a-zA-Z\$\(\]\}|\_]|\-)/gi, (_m, op) => {
    return op.toLowerCase() === "leq" ? " \\le " : op.toLowerCase() === "geq" ? " \\ge " : " \\neq ";
  });
  s = s.replace(/(?<!\\)\b(leq|geq)\b/gi, (_m, op) => op.toLowerCase() === "leq" ? "\\le" : "\\ge");
  s = s.replace(/(?<!\\)\b(neq)\b/gi, "\\neq");
  s = s.replace(/\\leq\b/g, "\\le");
  s = s.replace(/\\geq\b/g, "\\ge");
  return s;
};

/**
 * Chuẩn hóa các ký hiệu Logic mệnh đề & Lý thuyết tập hợp (Chương trình Toán THPT):
 * 1. Khôi phục ký hiệu với mọi (\forall) và tồn tại (\exists) bị mất dấu gạch chéo hoặc dính chữ (forallx -> \forall x, existsx -> \exists x)
 * 2. Khôi phục phép hiệu tập hợp (\setminus) bị dính chữ hoặc mất gạch chéo (BsetminusA -> B \setminus A, \setminus)
 * 3. Khôi phục tập rỗng (\emptyset / \varnothing) bị mất gạch chéo (A \cap B = emptyset -> A \cap B = \emptyset)
 * 4. Khôi phục phép giao (\cap), phép hợp (\cup), tập con (\subset, \supset, \subseteq, \supseteq) bị dính chữ (AcapB -> A \cap B)
 * 5. Khôi phục quan hệ thuộc (\in, \notin) và tập số thực/nguyên (\mathbb{R}, \mathbb{Z}, \mathbb{N}, \mathbb{Q})
 * 6. Xử lý dấu ngoặc kép dạng ”\forall...” hoặc "\exists..." bọc gọn vào khối math hoặc dùng \text{...} chuẩn KaTeX
 */
export const normalizeLogicAndSetSymbols = (text: string): string => {
  if (!text) return "";
  let s = text;

  // 1. Phục hồi ký hiệu phổ dụng (\forall) và tồn tại (\exists):
  s = s.replace(/(?<!\\)\bforall\s*([a-zA-Z])/g, '\\forall $1');
  s = s.replace(/(?<!\\)\bforall\b/g, '\\forall');
  s = s.replace(/\\forall([a-zA-Z])/g, '\\forall $1');

  s = s.replace(/(?<!\\)\bexists\s*([a-zA-Z])/g, '\\exists $1');
  s = s.replace(/(?<!\\)\bexists\b/g, '\\exists');
  s = s.replace(/\\exists([a-zA-Z])/g, '\\exists $1');

  // 2. Phục hồi phép hiệu tập hợp (\setminus):
  s = s.replace(/([A-Za-z0-9\)])\s*(?<!\\)setminus\s*([A-Za-z0-9\(])/g, '$1 \\setminus $2');
  s = s.replace(/([A-Za-z0-9\)])\s*\\setminus([A-Za-z0-9\(])/g, '$1 \\setminus $2');
  s = s.replace(/(?<!\\)\bsetminus\b/g, '\\setminus');

  // 3. Phục hồi tập rỗng (\emptyset):
  s = s.replace(/(?<!\\)\b(emptyset|varnothing)\b/g, '\\emptyset');
  s = s.replace(/(?<=[=\s])emptyset(?=[\s\?,;\.\)]|$)/g, '\\emptyset');

  // 4. Phục hồi phép giao (\cap) và phép hợp (\cup) khi bị dính chữ:
  s = s.replace(/([A-Z0-9\)])\s*(?<!\\)cap\s*([A-Z0-9\(])/g, '$1 \\cap $2');
  s = s.replace(/([A-Z0-9\)])\s*(?<!\\)cup\s*([A-Z0-9\(])/g, '$1 \\cup $2');
  s = s.replace(/([A-Z0-9\)])\s*\\cap([A-Z0-9\(])/g, '$1 \\cap $2');
  s = s.replace(/([A-Z0-9\)])\s*\\cup([A-Z0-9\(])/g, '$1 \\cup $2');

  // Phục hồi tập con \subset, \supset, \subseteq, \supseteq bị dính chữ:
  s = s.replace(/([A-Z0-9\)])\s*(?<!\\)(subset|supset|subseteq|supseteq)\s*([A-Z0-9\(])/g, '$1 \\$2 $3');
  s = s.replace(/([A-Z0-9\)])\s*\\(subset|supset|subseteq|supseteq)([A-Z0-9\(])/g, '$1 \\$2 $3');

  // 5. Phục hồi ký hiệu thuộc (\in, \notin) và tập hợp số:
  s = s.replace(/([a-zA-Z0-9])in(mathbb[A-Z]|[A-Z])/g, '$1 \\in \\$2');
  s = s.replace(/([a-zA-Z0-9])\\in(mathbb[A-Z]|[A-Z])/g, '$1 \\in \\$2');
  s = s.replace(/\\mathbb([A-Z])/g, '\\mathbb{$1}');
  s = s.replace(/(?<!\\)\bnotin\b/g, '\\notin');

  // Phục hồi mệnh đề phủ định \overline{P}, \bar{P}
  s = s.replace(/(?<!\\)\b(overline|bar)\{([A-Za-z])\}/g, '\\overline{$2}');
  s = s.replace(/\\bar\{([A-Za-z])\}/g, '\\overline{$1}');

  // 6. Xử lý tên mệnh đề như P : ”... hoặc Q : ”...
  s = s.replace(/(^|[\s\n])([PQABCDEF])\s*:\s*([“"”])/g, '$1$$$2$$ : $3');

  // 7. Xử lý dấu ngoặc kép trong hoặc quanh mệnh đề toán:
  // Nếu là dạng ”\forall ...” hoặc "\forall ..." bên ngoài math, bọc math vào bên trong ngoặc kép: ”$\forall ...$”
  s = s.replace(/([“"”])\s*(\\forall|\\exists)([\s\S]*?)([”"“])/g, (_m, q1, op, rest, q2) => {
    return `${q1}$${op}${rest}$${q2}`;
  });

  // Nếu là dấu ngoặc kép bên trong $...$, đổi thành \text{”} để KaTeX render chuẩn font
  s = s.replace(/(?<!\$)\$(?!\$)([^\$\n]+?)(?<!\$)\$(?!\$)/g, (_m, formula) => {
    let f = formula.replace(/([“"”])/g, '\\text{$1}');
    return `$${f}$`;
  });

  return s;
};

/**
 * Chuẩn hóa toàn diện ký hiệu tập hợp chứa dấu ngoặc nhọn { } (đặc trưng tập hợp, liệt kê phần tử):
 * 1. Thoát dấu \{ và \} chuẩn LaTeX để KaTeX không nuốt mất dấu ngoặc nhọn
 * 2. Tách các khối math bị dính liên từ (vd: $A = ... và B = ...$) thành $A = ...$ và $B = ...$
 * 3. Tự động bọc $...$ cho các tập hợp trần trụi ngoài math (A = {x \in ...} hoặc {x \in ...} hoặc A = {1; 2; 3})
 * 4. Tự động phục hồi cặp dấu ngoặc nhọn nếu đề bài bị thiếu (vd: A = x \in Z \mid ... -> A = \{x \in Z \mid ...\})
 */
export const normalizeSetNotation = (text: string): string => {
  if (!text) return "";
  let s = normalizeLogicAndSetSymbols(fixNakedLeqGeq(text));

  // Tách khối math nếu lỡ bọc nhầm liên từ tiếng Việt nối giữa 2 tập hợp:
  // Ví dụ: $A = x \in \mathbb{R} \mid ... và B = x \in \mathbb{R} \mid ...$ -> $A = ...$ và $B = ...$
  s = s.replace(/(?<!\$)\$(?!\$)([^\$\n]+?)(?<!\$)\$(?!\$)/g, (wholeMath, inner) => {
    if (/\s+(?:và|hoặc|hay)\s+[A-Z]\s*=/i.test(inner)) {
      return `$${inner.replace(/\s+(và|hoặc|hay)\s+([A-Z]\s*=)/gi, (_m, conj, name) => `$ ${conj} $${name}`)}$`;
    }
    return wholeMath;
  });

  // 1. Chuẩn hóa tập hợp bên trong các khối math đã có ($...$ hoặc $$...$$)
  s = s.replace(/(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)/g, (mathMatch) => {
    const isDouble = mathMatch.startsWith("$$");
    let inner = isDouble ? mathMatch.slice(2, -2) : mathMatch.slice(1, -1);

    // Thoát dấu ngoặc nhọn trần thành \{ và \}
    let result = "";
    let i = 0;
    while (i < inner.length) {
      const match = inner.slice(i).match(/(?:([A-Za-z]\s*=\s*))?(\{)/);
      if (!match || match.index === undefined) {
        result += inner.slice(i);
        break;
      }
      const startIdx = i + match.index;
      const name = match[1] || "";
      const braceStart = startIdx + name.length;

      const before = inner.slice(0, braceStart);
      if (/\\[a-zA-Z]+$/.test(before) && !/\\[a-zA-Z]+$/.test(before.replace(/\\(setminus|cup|cap|subset|supset|subseteq|supseteq|in|notin)$/, ""))) {
        result += inner.slice(i, braceStart + 1);
        i = braceStart + 1;
        continue;
      }

      // Đếm ngoặc nhọn cân bằng
      let depth = 0;
      let endIdx = -1;
      let j = braceStart;
      while (j < inner.length) {
        const ch = inner[j];
        if (ch === "\\") {
          j += 2;
          continue;
        }
        if (ch === "{") depth++;
        else if (ch === "}") {
          depth--;
          if (depth === 0) {
            endIdx = j + 1;
            break;
          }
        }
        j++;
      }

      if (endIdx !== -1) {
        let setBody = inner.slice(braceStart + 1, endIdx - 1).trim();
        const isSet = !!name || /\\in|\\mid|[;]|\b[a-zA-Z]\s*(=|<|>|\\le|\\ge)|\\emptyset|\b\d+\s*,\s*\d+\b/.test(setBody);
        if (isSet) {
          // Chuẩn hóa dấu phân cách | thành \mid sau miền xác định (không chạm vào trị tuyệt đối |x|)
          setBody = setBody.replace(/(?<=\\in\s*(?:\\mathbb\{[A-Z]\}|[A-Z]))\s*\|\s*/g, " \\mid ");
          result += inner.slice(i, startIdx);
          result += `${name}\\{${setBody}\\}`;
          i = endIdx;
          continue;
        }
      }

      result += inner.slice(i, braceStart + 1);
      i = braceStart + 1;
    }

    // Tự động phục hồi ngoặc nhọn nếu đề bài bị thiếu (A = x \in Z \mid ... -> A = \{x \in Z \mid ...\})
    result = result.replace(/(^|[^\\{])\b([A-Z]\s*=\s*)([a-zA-Z]\s*\\in\s*(?:\\mathbb\{[A-Z]\}|[A-Z])\s*(?:\\mid|\|)\s*[^$}]+)/g, (_m, pre, n, body) => {
      const cleanBody = body.replace(/(?<=\\in\s*(?:\\mathbb\{[A-Z]\}|[A-Z]))\s*\|\s*/g, " \\mid ").trim();
      return `${pre}${n}\\{${cleanBody}\\}`;
    });

    return isDouble ? `$$${result}$$` : `$${result}$`;
  });

  // 2. Bọc các tập hợp trần trụi nằm ngoài khối math
  const mathTokens: string[] = [];
  s = s.replace(/(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)/g, (match) => {
    mathTokens.push(match);
    return `___SET_MATH_TOKEN_${mathTokens.length - 1}___`;
  });

  let result = "";
  let i = 0;
  while (i < s.length) {
    const match = s.slice(i).match(/(?:(?<![a-zA-Z0-9\$\\\_\^])([A-Z]\s*=\s*))?(\\?\{)/);
    if (!match || match.index === undefined) {
      result += s.slice(i);
      break;
    }
    const startIdx = i + match.index;
    const name = match[1] || "";
    const openBrace = match[2];
    const braceStart = startIdx + name.length;

    const before = s.slice(0, braceStart);
    if (/\\[a-zA-Z]+$/.test(before) && !/\\[a-zA-Z]+$/.test(before.replace(/\\(setminus|cup|cap|subset|supset|subseteq|supseteq|in|notin)$/, ""))) {
      result += s.slice(i, braceStart + openBrace.length);
      i = braceStart + openBrace.length;
      continue;
    }

    let depth = 0;
    let endIdx = -1;
    let j = braceStart;
    while (j < s.length) {
      const ch = s[j];
      if (ch === "\\") {
        if (j + 1 < s.length && (s[j + 1] === "{" || s[j + 1] === "}")) {
          if (s[j + 1] === "{") depth++;
          else if (s[j + 1] === "}") {
            depth--;
            if (depth === 0) {
              endIdx = j + 2;
              break;
            }
          }
          j += 2;
          continue;
        }
        j += 2;
        continue;
      }
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) {
          endIdx = j + 1;
          break;
        }
      }
      j++;
    }

    if (endIdx !== -1) {
      let setBody = s.slice(braceStart, endIdx);
      setBody = setBody.replace(/^\\?\{/, "").replace(/\\?\}$/, "").trim();
      setBody = setBody.replace(/\$/g, "");

      const isSet = !!name || /\\in|\\mid|[;]|\b[a-zA-Z]\s*(=|<|>|\\le|\\ge)|\\emptyset|\b\d+\s*,\s*\d+\b/.test(setBody);
      if (isSet) {
        setBody = setBody.replace(/(?<=\\in\s*(?:\\mathbb\{[A-Z]\}|[A-Z]))\s*\|\s*/g, " \\mid ");
        result += s.slice(i, startIdx);
        result += `$${name}\\{${setBody}\\}$`;
        i = endIdx;
        continue;
      }
    }

    result += s.slice(i, braceStart + openBrace.length);
    i = braceStart + openBrace.length;
  }

  // Tự động bọc tập hợp trần trụi không có ngoặc nhọn ngoài math: A = x \in Z \mid ...
  result = result.replace(/(?<![a-zA-Z0-9\$\\])\b([A-Z]\s*=\s*)([a-zA-Z]\s*\\in\s*(?:\\mathbb\{[A-Z]\}|[A-Z])\s*(?:\\mid|\|)\s*[^,$\.\n]+)/g, (_m, n, body) => {
    const cleanBody = body.replace(/(?<=\\in\s*(?:\\mathbb\{[A-Z]\}|[A-Z]))\s*\|\s*/g, " \\mid ").trim();
    return `$${n}\\{${cleanBody}\\}$`;
  });

  result = result.replace(/___SET_MATH_TOKEN_(\d+)___/g, (_m, idx) => mathTokens[Number(idx)] || "");
  return result;
};

/**
 * XỬ LÝ TỔNG QUÁT & TRIỆT ĐỂ 100% LỖI DÍNH CHỮ TIẾNG VIỆT IN NGHIÊNG VÀ LỘ LỆNH LATEX TRÊN TRANG LÀM BÀI ONLINE
 * Tokenizer & Sanitizer bảo vệ tiếng Việt cho đề thi toán
 */
export const sanitizeExamQuestion = (rawContent: string): string => {
  if (!rawContent) return '';
  let content = sanitizeLatexString(rawContent.trim());
  content = normalizeSetNotation(content);

  const hasVietnameseWords = (str: string): boolean => {
    const withoutText = str.replace(/\\text\{[^{}]*\}/g, '');
    return /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(withoutText) ||
      /\b(tập\s+hợp|trên\s+trục\s+số|biểu\s+diễn|xác\s+định|tìm|giá\s+trị|khoảng|đoạn|với\s+m|tham\s+số|mệnh\s+đề|đúng|sai)\b/i.test(withoutText);
  };

  // BƯỚC 1: GIẢI CỨU CHUỖI NẾU BỊ BỌC NHẦM CẢ CÂU TRONG DẤU $ HOẶC $$
  // Nếu chuỗi bắt đầu và kết thúc bằng $ hoặc $$ nhưng bên trong có nhiều từ tiếng Việt
  if ((content.startsWith('$$') && content.endsWith('$$') && content.length > 4) ||
      (content.startsWith('$') && content.endsWith('$') && content.length > 2)) {
    const isDouble = content.startsWith('$$');
    const inner = isDouble ? content.slice(2, -2).trim() : content.slice(1, -1).trim();
    // Nếu có chứa tiếng Việt có dấu -> tháo bỏ cặp $ hoặc $$ ngoài cùng
    if (hasVietnameseWords(inner)) {
      content = inner;
    }
  }

  // BƯỚC 2: BẢO VỆ CÁC KHỐI MÔI TRƯỜNG TOÁN HỌC VÀ MATH HỢP LỆ TRƯỚC HẾT
  const envTokens: string[] = [];
  content = content.replace(/(```[\s\S]*?```|<svg[\s\S]*?<\/svg>|<tikz-diagram[\s\S]*?<\/tikz-diagram>|<svg-wrapper[\s\S]*?<\/svg-wrapper>|\\begin\s*\{tikzpicture\}[\s\S]*?\\end\s*\{tikzpicture\}|\\left\s*\[\s*\\begin\s*\{aligned\*?\}[\s\S]*?\\end\s*\{aligned\*?\}\s*\\right\.?|\\begin\s*\{(?:cases|aligned|array|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|split|gather|align)\*?\}[\s\S]*?\\end\s*\{(?:cases|aligned|array|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|split|gather|align)\*?\})/gi, (match) => {
    envTokens.push(match);
    return `___ENV_BLOCK_${envTokens.length - 1}___`;
  });

  const mathTokens: string[] = [];

  // 2.1 Bảo vệ $$...$$
  content = content.replace(/\$\$([\s\S]*?)\$\$/g, (match, inner) => {
    // Nếu khối $$ lỡ bao trùm cả câu tiếng Việt dài mà không có \text
    if (hasVietnameseWords(inner)) {
      return inner;
    }
    mathTokens.push(match);
    return `___MATH_BLOCK_${mathTokens.length - 1}___`;
  });

  // 2.2 Bảo vệ $...$
  content = content.replace(/(?<!\$)\$(?!\$)([^\$\n]+?)(?<!\$)\$(?!\$)/g, (match, inner) => {
    // Nếu khối $ lỡ bọc nhầm cả câu tiếng Việt (ví dụ: "$Cho hai tập hợp A = [1; 4]$")
    if (hasVietnameseWords(inner)) {
      return inner;
    }
    mathTokens.push(match);
    return `___MATH_BLOCK_${mathTokens.length - 1}___`;
  });

  // BƯỚC 3: XỬ LÝ VĂN BẢN NGOÀI KHỐI MATH (BẢO ĐẢM KHÔNG ẢNH HƯỞNG CÔNG THỨC TOÁN ĐÃ CÓ)
  // Sửa lỗi dính chữ tiếng Việt thông dụng
  content = content
    .replace(/Chohaitậphợp\s*([A-Za-z])/gi, 'Cho hai tập hợp $1')
    .replace(/Chohaitậphợp/gi, 'Cho hai tập hợp ')
    .replace(/Cho\s*tậphợp\s*([A-Za-z])/gi, 'Cho tập hợp $1')
    .replace(/Cho\s*tậphợp/gi, 'Cho tập hợp ')
    .replace(/\bBiết\s*([A-Za-z])(?![a-zà-ỹ])/gi, 'Biết $1')
    .replace(/Tì\s*m\s*giá\s*trị\s*nguyên\s*lớn\s*nhất\s*của/gi, 'Tìm giá trị nguyên lớn nhất của ')
    .replace(/Tì\s*m\s*giá\s*trị\s*nguyên\s*lớn\s*nhất/gi, 'Tìm giá trị nguyên lớn nhất ')
    .replace(/Tìmgiátrịcủa/gi, 'Tính giá trị của ')
    .replace(/Tìmgiátrị/gi, 'Tìm giá trị ')
    .replace(/Tínhgiátrịcủa/gi, 'Tính giá trị của ')
    .replace(/Tínhgiátrị/gi, 'Tính giá trị ')
    .replace(/Hãyliệtkêcácphầntửcủatậphợp/gi, 'Hãy liệt kê các phần tử của tập hợp ')
    .replace(/Hãyliệtkê/gi, 'Hãy liệt kê ')
    .replace(/Hãyxácđịnhcáctậphợp/gi, 'Hãy xác định các tập hợp ')
    .replace(/cáctậphợp/gi, 'các tập hợp ')
    .replace(/tậphợp/gi, 'tập hợp ')
    .replace(/vàtìm/gi, ' và tìm ')
    .replace(/trêntrụcsố/gi, ' trên trục số')
    .replace(/độdài/gi, ' độ dài ')
    .replace(/thỏamãnđiềukiện/gi, ' thỏa mãn điều kiện ')
    .replace(/nguyênlớnnhấtcủa/gi, ' nguyên lớn nhất của ')
    .replace(/là\s*một\s*đoạn/gi, ' là một đoạn ')
    .replace(/\bm\s*để/gi, '$m$ để ')
    .replace(/mđể/gi, '$m$ để ')
    .replace(/vàtính/gi, ' và tính ');

  // Tách dính liên từ: )vàB, ]vàB, }vàB (không match chữ cái tiếng Việt như "Thay")
  content = content
    .replace(/([\)\]\}\$0-9])\s*(và|hoặc|hay)\s*([A-Za-z\$])/g, '$1 $2 $3')
    .replace(/([\)\]\}\$0-9])(và|hoặc|hay)/g, '$1 $2')
    .replace(/(và|hoặc|hay)([A-Z])(?![a-zà-ỹ])/g, '$1 $2');

  // Sửa lỗi cú pháp LaTeX dính chữ:
  content = content
    .replace(/\\\\\s*cup/gi, ' \\cup ')
    .replace(/(?<!\\)\b(emptyset|varnothing)\b/g, '\\emptyset')
    .replace(/(?<!\\)\bforall\s*([a-zA-Z])/g, '\\forall $1')
    .replace(/(?<!\\)\bexists\s*([a-zA-Z])/g, '\\exists $1')
    .replace(/([A-Za-z0-9\)])\s*(?<!\\)setminus\s*([A-Za-z0-9\(])/g, '$1 \\setminus $2')
    .replace(/(?<!\\)\bsetminus\b/g, '\\setminus')
    .replace(/=\s*emptyset/gi, '= \\emptyset')
    .replace(/leq(\d+)\s*và\s*([A-Za-z])/gi, '\\le $1 và $2')
    .replace(/leq(\d+)/gi, '\\le $1 ')
    .replace(/geq(\d+)/gi, '\\ge $1 ')
    .replace(/(?<=[0-9a-zA-Z\$\(\]\}])\s*leq(\d+)/gi, ' \\le $1 ')
    .replace(/(?<=[0-9a-zA-Z\$\(\]\}])\s*geq(\d+)/gi, ' \\ge $1 ')
    .replace(/([A-Z]\s*=\s*[\[\(][^\]\)]+[\]\)])\s*\$\$\.?\s*Gọi/gi, '$1. Gọi');

  // Dọn dẹp dấu $$ bị rách dán sát trước toán tử (vd: [-3; 2)$$\cap hoặc (-2; 3)$$\Rightarrow)
  content = content.replace(/([\)\]\}0-9a-zA-Z])\s*\$\$\s*(?=(\\(?:cap|cup|setminus|Rightarrow|Leftrightarrow|in|notin|subset|supset|subseteq|supseteq|approx|neq|le|ge|leq|geq)|[=+\-*\/]))/gi, '$1 ');

  // Bọc các lệnh toán học trần trụi ngoài math:
  content = content.replace(/\b([a-zA-Z0-9]+)\s*\\(in|notin|subset|subseteq)\s*([a-zA-Z0-9]+)\b/g, (_m, a, op, b) => `$${a} \\${op} ${b}$`);
  // Bọc phương trình tập rỗng: A \cap B = \emptyset, A = \emptyset
  content = content.replace(/(?<![a-zA-Z0-9\$\\])\b([A-Z]\s*(?:\\(?:cap|cup|setminus)\s*[A-Z]\s*)*=\s*\\(?:emptyset|varnothing))\b/g, (_m, a) => `$${a}$`);
  content = content.replace(/(?<![\$\\])\\(emptyset|varnothing)\b(?!\$)/g, (_m, a) => `$\\${a}$`);
  // Không match nhầm \left và \right bằng cách thêm negative lookahead (?![a-zA-Z])
  content = content.replace(/(?<![a-zA-Z0-9\$\\])\b([a-zA-Z0-9_]+)\s*\\(le|ge|leq|geq|ne|neq)(?![a-zA-Z])\s*([a-zA-Z0-9_\-]+)\b(?![a-zA-Z0-9\$\\])/g, (_m, a, op, b) => `$${a} \\${op} ${b}$`);

  // Bọc phép toán tập hợp trần trụi: B \setminus A = [5; 7), A \cap B = [2; 5], hoặc A = [-4; 5) thành $...$
  content = content.replace(/(?<![a-zA-Z0-9\$\\])\b([A-Z]\s*(?:\\(?:setminus|cap|cup|subset|supset|subseteq|supseteq)\s*[A-Z]\s*)+=\s*[\[\(]\s*[^;,\]\)\n]+\s*[;,]\s*[^;,\]\)\n]+\s*[\]\)])(?![a-zA-Z0-9\$\\])/g, (_m, a) => `$${a}$`);
  content = content.replace(/(?<![a-zA-Z0-9\$\\]|\\(?:setminus|cap|cup)\s*)\b([A-Z]\s*=\s*[\[\(]\s*[^;,\]\)\n]+\s*[;,]\s*[^;,\]\)\n]+\s*[\]\)])(?![a-zA-Z0-9\$\\])/g, (_m, a) => `$${a}$`);

  // BƯỚC 4: KHÔI PHỤC CÁC KHỐI MATH VÀ ENV ĐÃ BẢO VỆ
  content = content.replace(/___MATH_BLOCK_(\d+)___/g, (_m, idx) => mathTokens[Number(idx)] || '');
  content = content.replace(/___ENV_BLOCK_(\d+)___/g, (_m, idx) => envTokens[Number(idx)] || '');

  // Dọn dẹp khoảng trắng ngang và dòng trống dư thừa (BẢO VỆ DÒNG MỚI \n CỦA MARKDOWN)
  content = content
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return content;
};

export const rescueAccidentalFullMathBlock = sanitizeExamQuestion;

/**
 * Tiền xử lý kết hợp cứu hộ câu hỏi và chuẩn hóa công thức toán
 */
export const sanitizeAndPolishMath = (content: string): string => {
  if (!content) return '';
  let text = sanitizeExamQuestion(content);
  text = cleanVietnameseUnicode(text);
  text = normalizeLogicAndSetSymbols(text);
  text = polishMathText(text);
  text = sanitizeMathBeforeRender(text);
  text = normalizeLogicAndSetSymbols(text);
  text = sanitizeExamQuestion(text);
  return text;
};

/**
 * Chuẩn hóa và khắc phục triệt để lỗi vỡ công thức:
 * 1. Dấu khác bị tách: / =, /=, \not= -> \ne
 * 2. Dấu không thuộc: ∈/, ∈ /, \in/, \in /, \not\in -> \notin
 * 3. Dấu không phải tập con: ⊂/, \subset/, \not\subset -> \not\subset
 * 4. Hàn gắn khối Phép Hiệu {x | x ∈ A và x ∉ B} bị vỡ hoặc rách dấu $$
 * 5. Dọn dẹp dấu $ thừa hoặc cọc cạch
 * 6. Tự động chuyển đổi các thẻ OMML Word Math sang LaTeX KaTeX
 * 7. Tách bạch liên từ và, hoặc, với giữa các công thức math
 */
export const sanitizeMathBeforeRender = (content: string): string => {
  if (!content) return '';
  let text = sanitizeLatexString(content);
  text = normalizeLogicAndSetSymbols(polishMathText(text));

  // BƯỚC 0: Tự động chuyển đổi XML OMML Word Equation nếu có
  text = convertOmmlToLatex(text);

  // BƯỚC 1: Xử lý dứt điểm dấu "khác" (/ =, /=, \not=, =)
  text = text
    .replace(/\/\s*=\s*/g, ' \\ne ')
    .replace(/=\s*\/\s*/g, ' \\ne ')
    .replace(/\\not\s*=\s*/g, ' \\ne ');

  // BƯỚC 1.5: Xử lý mệnh đề phủ định \overline{P}, \overline{Q}, ...
  text = text
    .replace(/\\bar\{([A-Za-z])\}/g, '\\overline{$1}')
    .replace(/(?<!\\)\b(overline|bar)\{([A-Za-z])\}/g, '\\overline{$2}')
    .replace(/([PQAB])[\u0304\u0305]/g, '$\\overline{$1}$');

  // BƯỚC 2: Xử lý dứt điểm dấu "không thuộc" (∈/, ∈ /, \in/, \in /, \not\in)
  text = text
    .replace(/(?:\\in|∈)\s*\/\s*/g, ' \\notin ')
    .replace(/\\not\s*\\in\s*/g, ' \\notin ')
    .replace(/\\not\s+in(?![a-zA-Z])/g, ' \\notin ');

  // BƯỚC 3: Xử lý dấu "không phải tập con" (⊂/, \subset/, \not\subset)
  text = text
    .replace(/(?:\\subset|⊂)(?:eq)?\s*\/\s*/g, ' \\not\\subset ')
    .replace(/\\not\s*\\subset(?:eq)?(?![a-zA-Z])/g, ' \\not\\subset ');

  // BƯỚC 4: Hàn gắn khối Phép Hiệu {x | x ∈ A và x ∉ B}
  // Bắt mọi trường hợp vỡ khối kể cả khi có \mid, |, chữ "và", "hoặc"
  text = text.replace(
    /A\s*\\setminus\s*B\s*=\s*\{?\s*x\s*(?:\\mid|\|)\s*x\s*(?:\\in|∈)\s*A\s*(?:\\text\{\s*và\s*\}|và)\s*x\s*(?:\\notin|\\in\s*\/|∈\s*\/)\s*B\s*\}?\s*\${0,2}/gi,
    '$$A \\setminus B = \\{x \\mid x \\in A \\text{ và } x \\notin B\\}$$'
  );

  // Bắt các khối tổng quát dạng {x \mid ... và ...} bị rách dấu $$
  text = text.replace(/\{\s*x\s*\\mid\s*x\s*\\in\s*([A-Z])\s*và\s*x\s*\\notin\s*([A-Z])\s*\}\${1,2}/gi, 
    '$$\\{x \\mid x \\in $1 \\text{ và } x \\notin $2\\}$$'
  );

  // Bắt các trường hợp tổng quát X \setminus Y
  text = text.replace(
    /(?<!\\text\{\s*)([A-Z])\s*\\setminus\s*([A-Z])\s*=\s*\{?\s*x\s*(?:\\mid|\|)\s*x\s*(?:\\in|∈)\s*\1\s*(?<!\\text\{\s*)và\s*x\s*(?:\\notin|\\in\s*\/|∈\s*\/)\s*\2\s*\}?\s*\${0,2}/gi,
    (_m, p1, p2) => `$$${p1} \\setminus ${p2} = \\{x \\mid x \\in ${p1} \\text{ và } x \\notin ${p2}\\}$$`
  );

  // BƯỚC 5: Dọn dẹp các dấu $ thừa hoặc cọc cạch
  text = text
    .replace(/\${3,}/g, '$$')
    .replace(/([a-zA-Z0-9\emptyset\\])\s*\/\s*=\s*([a-zA-Z0-9\emptyset\\])/g, '$1 \\ne $2');

  return text;
};

export const normalizeMathContent = sanitizeMathBeforeRender;

/**
 * Chuẩn hóa toàn cục công thức toán LaTeX (Khóa vĩnh viễn bộ lọc chuẩn hóa):
 * 1. Khắc phục dấu phủ định bị tách rời trên Web KaTeX (\not =, \not \in, \not \subset, ...)
 * 2. Tự động bọc ngoặc nhọn cases nếu thiếu cặp $$
 * 3. Chuẩn hóa dấu ngắt dòng cho cases
 */
export const normalizeMathLatex = (rawText: string): string => {
  if (!rawText) return '';
  let text = normalizeLogicAndSetSymbols(sanitizeMathBeforeRender(rawText)).replace(/\\dfrac\b/g, '\\frac');

  // BƯỚC 0: Tách rời các từ nối tiếng Việt bị dính liền với ký tự toán và sửa rách dấu $$ (vd: 3hoặcm -> 3 hoặc m, $$hoặc$$ -> hoặc)
  text = text
    .replace(/\b([a-z])(hoặc|hay)\b/gi, (match, letter, conj) => {
      if (/^(thay|chay)$/i.test(match)) return match;
      return `${letter} ${conj}`;
    })
    .replace(/([0-9\$\)\]\}])(?<!\s)(hoặc|hay)(?=[a-zA-Z0-9\$\\])/gi, '$1 $2 ')
    .replace(/([0-9\$\)\]\}])(?<!\s)và(?!(?:o|i|ng|c|t)\b)(?=[a-zA-Z0-9\$\\])/gi, '$1 và ')
    .replace(/(?<=[0-9\$\)\]\}])(hoặc|hay)/gi, ' $1')
    .replace(/(?<=[0-9\$\)\]\}])và(?!(?:o|i|ng|c|t)\b)/gi, ' và')
    .replace(/(?<!\$)\$(?!\$)\s*(hoặc|và|hay|với)\s*(?<!\$)\$(?!\$)/gi, '$$ $1 $$')
    .replace(/\$\$\s*(hoặc|và|hay|với)\s*\$\$/gi, '$$ $1 $$');

  // BƯỚC 1: Xử lý các biến thể ký hiệu gạch chéo bị lệch sang phải hoặc tách rời
  text = text
    // Dấu không thuộc: \in/, \in /, \not\in, \not \in
    .replace(/\\in\s*\//g, ' \\notin ')
    .replace(/\\not\s*\\in/g, ' \\notin ')
    .replace(/\\not\s+in(?![a-zA-Z])/g, ' \\notin ')
    // Dấu không phải tập con: \subset/, \subset /, \not\subset
    .replace(/\\subset(eq)?\s*\//g, ' \\not\\subset ')
    .replace(/\\not\s*\\subset(eq)?(?![a-zA-Z])/g, ' \\not\\subset ')
    // Dấu khác: =/, = /, /=, \not=
    .replace(/=\s*\//g, ' \\ne ')
    .replace(/\/\s*=/g, ' \\ne ')
    .replace(/\\not\s*=/g, ' \\ne ')
    .replace(/\\not\s*\\equiv/g, ' \\not\\equiv ');

  // BƯỚC 2: Tự động khôi phục dấu backslash (\) bị mất bên trong công thức
  // Áp dụng cho nội dung nằm trong cặp dấu $...$ hoặc các cụm từ khóa toán học đặc trưng
  text = text.replace(/\$([^\$]+)\$/g, (match, formula) => {
    let fixed = formula
      // Khôi phục các toán tử tập hợp & quan hệ
      .replace(/(?<!\\)\b(cap|cup|in|notin|subset|supset|subseteq|supseteq|setminus|emptyset|varnothing|forall|exists)\b/g, '\\$1')
      .replace(/(?<!\\)\b(mathbb|mathbf|mathcal)\b/g, '\\$1')
      .replace(/(?<!\\)\b(mid)\b/g, '\\mid ')
      // Khôi phục lượng giác & hàm số
      .replace(/(?<!\\)\b(sin|cos|tan|cot|lim)\b/g, '\\$1')
      // Khôi phục ký hiệu phép toán & so sánh
      .replace(/(?<!\\)\b(sqrt|frac|left|right|le|ge|ne|times|pm|cdot)\b/g, '\\$1');
    return `$${fixed}$`;
  });

  // BƯỚC 3: Xử lý trường hợp chuỗi toán không bọc dấu $ nhưng bị dính chữ (ví dụ: xinmathbbZmid, BsetminusA, forallx)
  text = normalizeLogicAndSetSymbols(text);

  // BƯỚC 4: Tự động bọc an toàn cho các môi trường toán trần (nếu chưa nằm trong $ hoặc $$)
  text = wrapNakedMathEnvironments(text);
  text = text.replace(/\\\\(?=[a-zA-Z0-9])/g, '\\\\ ');

  return text;
};

/**
 * Khắc phục triệt để lỗi rách dấu $$ và dính chữ tiếng Việt ("hoặc", "và", "hay") trong 4 phương án trắc nghiệm:
 * 1. Tách rời các từ nối tiếng Việt bị dính liền với số/ký tự (vd: 3hoặcm -> 3 hoặc m, avàa -> a và a)
 * 2. Sửa lỗi đóng/mở $$ bị rách giữa biểu thức (vd: \ge 3$$ hoặc $$m \le -1)
 * 3. Tách từ nối ra ngoài dấu $ và tự động bọc $ cho các vế công thức
 */
export const fixInlineOptionText = (text: string): string => {
  if (!text) return '';
  let res = text;

  // Giữ lại nhãn phương án nếu có (vd: A., B., C., D. hoặc **A.**, - A.)
  let prefix = '';
  const prefixMatch = res.match(/^(\s*(?:[-*]\s*)?(?:\*{0,2})[A-Da-d][\.\:\)](?:\*{0,2})\s*)/);
  if (prefixMatch) {
    prefix = prefixMatch[1];
    res = res.slice(prefix.length);
  }

  // Bảo vệ tạm thời các khối \text{...} để không bị bóc tách nhầm các từ hoặc, và, hay bên trong \text{}
  const textTokens: string[] = [];
  res = res.replace(/\\text\{[^{}]*\}/g, (match) => {
    textTokens.push(match);
    return `___TEXT_TOKEN_${textTokens.length - 1}___`;
  });

  // Bước 1: Tách rời các từ nối tiếng Việt bị dính liền với số/ký tự (vd: 3hoặcm -> 3 hoặc m, avàa -> a và a)
  res = res
    .replace(/([0-9a-zA-Z\$\\])(?<!\s)(hoặc|hay)(?=[a-zA-Z0-9\$\\])/gi, '$1 $2 ')
    .replace(/([0-9a-zA-Z\$\\])(?<!\s)và(?!(?:o|i|ng|c|t)\b)(?=[a-zA-Z0-9\$\\])/gi, '$1 và ')
    .replace(/(hoặc|hay)(?=[a-zA-Z0-9])/gi, '$1 ')
    .replace(/và(?!(?:o|i|ng|c|t)\b)(?=[a-zA-Z0-9])/gi, 'và ')
    .replace(/(?<=[a-zA-Z0-9\$\\])(hoặc|hay)/gi, ' $1')
    .replace(/(?<=[a-zA-Z0-9\$\\])và(?!(?:o|i|ng|c|t)\b)/gi, ' và');

  // Bước 2: Sửa lỗi đóng/mở $$ bị rách giữa biểu thức (vd: \ge 3$$ hoặc $$m \le -1)
  res = res
    .replace(/\$\$\s*(hoặc|và|hay)\s*\$\$/gi, ' $1 ')
    .replace(/\$\$\s*(hoặc|và|hay)\s*/gi, '$ $1 ')
    .replace(/\s*(hoặc|và|hay)\s*\$\$/gi, ' $1 $')
    .replace(/\$\s*(hoặc|và|hay)\s*\$/gi, ' $1 ');

  // Bước 3: Nếu một phương án chứa công thức nhưng thiếu cặp dấu $ ở đầu/cuối:
  // Ví dụ: `m \ge 3 hoặc m+2 \le 1` -> `$m \ge 3$ hoặc $m+2 \le 1$`
  const parts = res.split(/\s+(hoặc|và|hay)\s+/gi);
  if (parts.length > 1) {
    res = parts.map(part => {
      const trimmed = part.trim();
      if (['hoặc', 'và', 'hay'].includes(trimmed.toLowerCase())) {
        return trimmed;
      }
      // Nếu vế có chứa ký hiệu toán (\ge, \le, <, >, +, -, =, v.v.) mà chưa bọc đủ dấu $
      if (/[\\<>=+\-\^_\/]/.test(trimmed) || /\b\d+[a-zA-Z]\b/.test(trimmed)) {
        const cleanPart = trimmed.replace(/\$/g, '').trim();
        return `$${cleanPart}$`;
      }
      return trimmed;
    }).join(' ');
  } else {
    // Nếu không có từ nối nhưng có lệnh LaTeX trần trụi thiếu $ (vd: b \le a)
    if (/[\\<>=]/.test(res) && !res.includes('$')) {
      res = `$${res}$`;
    }
  }

  // Khôi phục lại các khối \text{...}
  res = res.replace(/___TEXT_TOKEN_(\d+)___/g, (_m, idx) => textTokens[Number(idx)] || '');

  // Dọn dẹp khoảng trắng và dấu $ thừa
  return (prefix + res.replace(/\${3,}/g, '$$')).trim();
};

/**
 * Chuẩn hóa công thức toán trước khi truyền vào MarkdownRenderer:
 * 1. Tự động phát hiện và chuẩn hóa họ nghiệm phương trình lượng giác sang móc vuông KaTeX: \left[\begin{aligned} ... \end{aligned}\right.
 * 2. Tự động phát hiện và chuẩn hóa môi trường \begin{cases} ... \end{cases} (cho hệ PT/BPT):
 *    - Phân tách dính dòng (1002x -> 100 \\ 2x, 80x -> 80 \\ x, v.v.)
 *    - Chuyển \ thành \\
 *    - Đảm bảo mỗi dòng có \\ ngắt dòng chuẩn xác
 * 3. Tự động bọc $$\begin{cases} ... \end{cases}$$ hoặc $$\left[\begin{aligned}...\end{aligned}\right.$$ nếu chưa có $$ hoặc $ bao bọc
 * 4. Nếu cases bị bọc trong single $...$, nâng cấp lên display block $$...$$ để KaTeX hiển thị ngoặc nhọn lớn và ngắt dòng riêng biệt
 */
export function formatMathContent(raw?: string | null): string {
  if (!raw && raw !== '') return '';
  let str = normalizeMathLatex(String(raw));

  // 1. Chuẩn hóa họ nghiệm lượng giác (đổi \begin{cases} có chứa k2\pi, k\pi, k \in \mathbb{Z}... sang \left[\begin{aligned}...\end{aligned}\right.)
  str = normalizeTrigSolutions(str);

  // 2. Chuẩn hóa \left\{ \begin{aligned} ... \end{aligned} \right. hoặc \left\{ \begin{array} ... \end{array} \right. sang \begin{cases} ... \end{cases}
  str = str.replace(/\\left\s*\\\{\s*\\begin\s*\{(?:aligned|array|matrix)\*?\}([\s\S]*?)\\end\s*\{(?:aligned|array|matrix)\*?\}\s*\\right\.?/g, (_m, body) => {
    return `\\begin{cases}\n${normalizeCasesBody(body)}\n\\end{cases}`;
  });
  str = str.replace(/\\left\s*\\\{\s*\\begin\s*\{cases\*?\}([\s\S]*?)\\end\s*\{cases\*?\}\s*\\right\.?/g, (_m, body) => {
    return `\\begin{cases}\n${normalizeCasesBody(body)}\n\\end{cases}`;
  });

  // 3. Chuẩn hóa thân môi trường cases còn lại (hệ phương trình / hệ bất phương trình)
  str = str.replace(/\\begin\s*\{cases\*?\}([\s\S]*?)\\end\s*\{cases\*?\}/g, (_match, inner) => {
    const fixedInner = normalizeCasesBody(inner);
    return `\\begin{cases}\n${fixedInner}\n\\end{cases}`;
  });

  // 4. Tự động bọc naked math environments (bao gồm \left[\begin{aligned}...\end{aligned}\right. và \begin{cases})
  str = wrapNakedMathEnvironments(str);

  // 5. Nếu cases bị bọc trong single $...$ ngoài danh sách phương án A-D hoặc bảng, nâng cấp lên display block $$...$$
  str = str.replace(/(^|\n)(?!\s*\||\s*[-\*]\s*\*{0,2}[A-D][\.\:\)])\s*(?<!\$)\$\s*(\\begin\s*\{cases\*?\}[\s\S]*?\\end\s*\{cases\*?\})\s*\$(?!\$)/g, '$1\n\n$$\n$2\n$$\n\n');

  // 6. Dọn dẹp rách/thừa dấu $ (vd: $$$ -> $, $$$$ -> $$)
  str = str.replace(/\${3,}/g, (m) => m.length % 2 === 1 ? '$' : '$$');

  return str;
}

/**
 * Chuẩn hóa bọc công thức toán LaTeX:
 * Tuyệt đối KHÔNG tự động gắn thêm dấu $ vào cuối chuỗi nếu chuỗi đã có cặp dấu $...$ hoàn chỉnh.
 */
export function wrapLatex(text: string): string {
  if (!text) return '';
  let s = cleanMath(text.trim());
  // Kiểm tra nếu đã có cặp dấu $...$ hoàn chỉnh hoặc số lượng dấu $ chẵn >= 2
  const hasMatchedDollars = /(?<!\\)\$[^$\n]+?(?<!\\)\$/.test(s);
  const dollarCount = (s.match(/(?<!\\)\$/g) || []).length;
  if (hasMatchedDollars || (dollarCount >= 2 && dollarCount % 2 === 0)) {
    return cleanMath(s);
  }
  if (!s.startsWith('$') && !s.endsWith('$')) {
    return `$${s}$`;
  }
  return cleanMath(s);
}

export function cleanOptionText(opt: any): string {
  if (!opt && opt !== 0) return '';
  let text = sanitizeLatexString(String(opt).trim());
  
  // 0. Chuẩn hóa dấu tiếng Việt (Unicode NFD -> NFC) và loại bỏ thẻ <br> gây rớt dòng chữ lẻ loi
  text = cleanVietnameseUnicode(text);
  text = normalizeLogicAndSetSymbols(text);
  text = text.replace(/<br\s*\/?>/gi, ' ').replace(/\s{2,}/g, ' ');

  // Tiền xử lý dứt điểm các lỗi vỡ công thức phép hiệu và tách dấu khác
  text = sanitizeMathBeforeRender(text);

  // Tách rời chữ tiếng Việt bị dính vào công thức và sửa rách dấu $$
  text = fixInlineOptionText(text);

  // 1. Remove leading option prefixes like "A.", "A)", "A:", "a.", "a)", "**A.**", "<b>A.</b>", "- A."
  // Triệt tiêu hoàn toàn nguy cơ lặp lại nhãn phương án làm nhảy chữ C xuống dòng dưới
  text = text
    .replace(/^(?:[-*]\s*)?(?:<b>|\*{1,2})?\s*[A-Da-d][\.\:\)]\s*(?:<\/b>|\*{1,2})?\s*/, '')
    .replace(/^\([A-Da-d]\)\s*/, '')
    .trim();

  // 2. Remove trailing orphan dollar signs after punctuation (e.g. ". $", ".$", ";$", ",$")
  text = text.replace(/([\.\;\,])\s*\$+$/g, '$1').trim();
  text = text.replace(/([\.\;\,])\s*\$+(\s)/g, '$1$2').trim();

  // 3. Remove redundant outer $ or $$ wrapping the entire option (chỉ khi là một công thức đơn lẻ, không bóc nhầm các biểu thức nối bởi hoặc/và/hay)
  const dollarCount = (text.match(/(?<!\\)\$/g) || []).length;
  const hasConjunction = /\b(hoặc|và|hay)\b/i.test(text);
  if (!hasConjunction && (dollarCount === 2 || (dollarCount === 4 && text.startsWith('$$') && text.endsWith('$$')))) {
    text = text.replace(/^\s*\${1,2}\s*([\s\S]*?)\s*\${1,2}\s*$/, '$1').trim();
  }

  // 4. Remove trailing orphan dollar signs after punctuation again
  text = text.replace(/([\.\;\,])\s*\$+$/g, '$1').trim();

  // 5. If there is an odd number of dollar signs and the string ends with a dollar sign, remove the trailing orphan dollar
  let currentDollars = (text.match(/(?<!\\)\$/g) || []).length;
  if (currentDollars % 2 !== 0 && text.endsWith('$')) {
    text = text.replace(/\s*\$+$/, '').trim();
  }

  // 6. Normalize infinity in all forms
  text = normalizeInfinity(text);

  // 7. If it contains a LaTeX block environment (cases, array, matrix, aligned, etc.)
  // Wrap it tightly as inline math $...$ so it renders right next to "A." without stray dollars or newlines
  if (/\\begin\s*\{cases\*?\}/.test(text)) {
    text = text.replace(/\\begin\s*\{cases\*?\}([\s\S]*?)\\end\s*\{cases\*?\}/g, (_m, b) => `\\begin{cases}\n${normalizeCasesBody(b)}\n\\end{cases}`);
  }
  if (/\\begin\s*\{(?:cases|aligned|array|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|split|gather|align)\*?\}/.test(text)) {
    const unwrapped = text.replace(/^\s*\${1,4}\s*([\s\S]*?)\s*\${1,4}\s*$/, '$1').trim();
    return `$${unwrapped}$`;
  }

  // 8. If it is a mathematical interval or set: e.g. "(-1; 1)", "(0; 1)", "(-\infty; -1)", "(-1; +\infty)", "[0; 5]", "{1; 2}"
  if (/^[\[\(]\s*[^;,\n]+?[;,]\s*[^;,\n]+?[\]\)]$/.test(text) || /^\{[^}\n]+\}$/.test(text)) {
    if (!text.startsWith('$') && !text.endsWith('$')) {
      return `$${text}$`;
    }
    return text;
  }

  // 9. Check if text already has complete $...$ pairs
  const hasMatchedDollars = /(?<!\\)\$[^$\n]+?(?<!\\)\$/.test(text);
  currentDollars = (text.match(/(?<!\\)\$/g) || []).length;

  // TUYỆT ĐỐI không tự động gắn thêm dấu $ vào cuối chuỗi nếu chuỗi đã có cặp dấu $...$ hoàn chỉnh!
  if (!hasMatchedDollars && currentDollars === 0) {
    const hasVietnameseWords = /[a-zA-Zàáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]{2,}\s+[a-zA-Zàáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]{2,}/i.test(text);
    if (!hasVietnameseWords && /(?:[\\^_=><\+\-\*\/]|\d+[a-zA-Z]|[a-zA-Z]\d+)/.test(text) && !/^(đúng|sai|có|không|luôn|tất cả|cả|đáp án|phương án|với|hàm số|điểm)\b/i.test(text)) {
      if (!text.startsWith('$') && !text.endsWith('$')) {
        text = `$${text}$`;
      }
    }
  }

  // Đảm bảo bóc tách từ nối và chuẩn hóa lại lần cuối
  text = sanitizeMathBeforeRender(text);
  text = fixInlineOptionText(text);

  // Final cleanup of any trailing orphan dollar or trailing dollar after punctuation
  text = text.replace(/([\.\;\,])\s*\$+$/g, '$1').trim();
  const finalDollars = (text.match(/(?<!\\)\$/g) || []).length;
  if (finalDollars % 2 !== 0 && text.endsWith('$')) {
    text = text.replace(/\s*\$+$/, '').trim();
  }

  return sanitizeExamQuestion(text);
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
  let text = sanitizeLatexString(String(content).trim());
  
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
  
  return sanitizeExamQuestion(text.trim());
}

export const wrapAllNakedMath = (str: string): string => {
  if (!str) return "";
  let s = normalizeLogicAndSetSymbols(normalizeInfinity(str));

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

  const stopWords = /^(và|hoặc|với|khi|thì|là|bằng|thuộc|trên|trong|tại|sao\s+cho|đồng\s+biến|nghịch\s+biến|liên\s+tục|có|tìm|tính|chứng\s+minh|xét|giải|cho|gọi|biết|nếu|suy\s+ra|tương\s+đương|kết\s+luận|hãy|để|đáp\s+án|phương\s+trình|hệ\s+phương\s+trình|bất\s+phương\s+trình|hàm\s+số|đồ\s+thị|vectơ|vecto|tọa\s+độ|mặt\s+phẳng|đường\s+thẳng|điểm|khoảng|đoạn|nửa\s+khoảng)(?![a-zA-Z0-9_\u00C0-\u1EF9])/i;

  const findStartWithPrefix = (text: string, cmdIndex: number): number => {
    const before = text.slice(0, cmdIndex);
    const prefixMatch = before.match(/(?:^|[\s\(\[\{;,])((?:C_\{?|[a-zA-Z](?:_\{?[0-9a-zA-Z]+\}?)?)(?:\([a-zA-Z0-9,\s]*\))?(?:\s*(?:[=><\le\ge\approx\neq]|>=|<=|==|!=|\\le|\\ge|\\approx|\\neq|\\sim)\s*-?\d+(?:\.\d+)?)?\s*)$/);
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
  result = result.replace(/(?<![\\$a-zA-Z0-9])([\[\(]\s*(?:[+\-±]?\\infty|-?\d+(?:\.\d+)?(?:\\frac\{[^{}]*\}\{[^{}]*\}|\/[0-9]+)?)\s*[;,]\s*(?:[+\-±]?\\infty|-?\d+(?:\.\d+)?(?:\\frac\{[^{}]*\}\{[^{}]*\}|\/[0-9]+)?)\s*[\]\)])(?![\\$a-zA-Z0-9])/g, (m, g1, offset) => {
    if (isInsideMath(result, offset)) return m;
    return `$${g1}$`;
  });

  return result;
};

export const fixMath = (text: any) => {
    if (!text || text === 'undefined') return '';
    if (typeof text !== 'string') text = String(text);
    let t = sanitizeLatexString(text.trim());
    t = normalizeLogicAndSetSymbols(normalizeMathLatex(t));
    
    // 0. Remove stray preamble packages that might be generated in math or TikZ
    t = t.replace(/\\(usetikzlibrary|usepackage)\s*\{[^}]*\}\s*/gi, '');

    // 0.1. Normalize infinity in all variations (in fty, infty without backslash, etc.)
    t = normalizeInfinity(t);

    // 1. Unescape escaped dollar signs (\$)
    t = t.replace(/\\(\$)/g, '$1');

    // 2. Convert standard LaTeX bracket delimiters \(...\) to $...$ and \[...\] to $$...$$
    t = t.replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$');
    t = t.replace(/\\\[([\s\S]*?)\\\]/g, '$$$$$1$$$$');

    // 2.01. Normalize trig solutions: convert \begin{cases} with k2\pi, k\pi, k \in \mathbb{Z} to \left[\begin{aligned}...\end{aligned}\right.
    // while strictly keeping \begin{cases} for systems of equations/inequalities
    t = normalizeTrigSolutions(t);

    // 2.02. Normalize newlines inside \begin{cases}...\end{cases}:
    // Ensure equations in cases are separated by LaTeX double-backslash \\ and no merged text
    t = t.replace(/\\begin\s*\{cases\*?\}([\s\S]*?)\\end\s*\{cases\*?\}/g, (_match, body) => {
        const fixedBody = normalizeCasesBody(body);
        return `\\begin{cases}\n${fixedBody}\n\\end{cases}`;
    });

    // 2.05 Auto-wrap naked math environments (\left[\begin{aligned}...\end{aligned}\right. or \begin{cases}...\end{cases}, etc.)
    // Safely checks isInsideMath so already-wrapped math environments are never duplicated
    t = wrapNakedMathEnvironments(t);

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
    t = t.replace(/(^|\n|<div[^>]*>)\s*([A-D][\.\:\)]|<strong>[A-D][\.\:\)]<\/strong>)\s*\${0,2}\s*(\\left\s*\[\s*\\begin\s*\{aligned\*?\}[\s\S]*?\\end\s*\{aligned\*?\}\s*\\right\.?(?:\s*\\quad\s*\([^\)]+\))?)\s*\${0,2}\s*(<\/div>|$|\n)/g, (m, prefix, label, env, suffix) => {
        return `${prefix}${label} $${env.trim()}$ ${suffix}`;
    });
    t = t.replace(/(^|\n|<div[^>]*>)\s*([A-D][\.\:\)]|<strong>[A-D][\.\:\)]<\/strong>)\s*\${0,2}\s*(\\begin\s*\{(?:cases|aligned|array|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|split|gather|align)\*?\}[\s\S]*?\\end\s*\{(?:cases|aligned|array|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|split|gather|align)\*?\})\s*\${0,2}\s*(<\/div>|$|\n)/g, (m, prefix, label, env, suffix) => {
        return `${prefix}${label} $${env.trim()}$ ${suffix}`;
    });

    // 2.25. Normalize list items formatted with environments (e.g. "- a) $\begin{cases}...", "a) $\begin{cases}...")
    // Keep them inline so the list item numbering/lettering is not broken by display block newlines
    t = t.replace(/(^|\n)\s*([-\*]\s+|(?:\d+|[a-d])[\.\:\)]\s+)\${0,2}\s*(\\left\s*\[\s*\\begin\s*\{aligned\*?\}[\s\S]*?\\end\s*\{aligned\*?\}\s*\\right\.?(?:\s*\\quad\s*\([^\)]+\))?)\s*\${0,2}\s*($|\n)/g, (m, prefix, bullet, env, suffix) => {
        return `${prefix}${bullet}$${env.trim()}$${suffix}`;
    });
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

    // 2.5. If wrapped in single $...$, upgrade to display block $$...$$ for aligned and cases when NOT inside table row '|', list bullet, or option label
    t = t.replace(/(^|\n)(?!\s*\||\s*[-\*]|\s*[A-D][\.\:\)]|\s*[a-d][\.\:\)])\s*(?<!\$)\$\s*(\\left\s*\[\s*\\begin\s*\{aligned\*?\}[\s\S]*?\\end\s*\{aligned\*?\}\s*\\right\.?(?:\s*\\quad\s*\([^\)]+\))?)\s*\$(?!\$)\s*($|\n)/g, (_m, p1, p2, p3) => `${p1}\n\n$$\n${p2.trim()}\n$$\n\n${p3}`);
    t = t.replace(/(^|\n)(?!\s*\||\s*[-\*]|\s*[A-D][\.\:\)]|\s*[a-d][\.\:\)])\s*(?<!\$)\$\s*(\\begin\s*\{cases\*?\}[\s\S]*?\\end\s*\{cases\*?\})\s*\$(?!\$)\s*($|\n)/g, (_m, p1, p2, p3) => `${p1}\n\n$$\n${p2.trim()}\n$$\n\n${p3}`);
    // Đảm bảo trong hướng dẫn giải / lời giải: các câu dẫn như "Ta có hệ phương trình: $\begin{cases}..." được nâng cấp lên display block $$...$$
    t = t.replace(/((?:Ta có|Xét|Giải|Do đó|Suy ra|Từ đó)\s+hệ(?:\s+phương\s+trình|\s+bất\s+phương\s+trình)?[:\.]?\s*)\${1,2}\s*(\\begin\s*\{cases\*?\}[\s\S]*?\\end\s*\{cases\*?\})\s*\${1,2}/gi, '$1\n\n$$\n$2\n$$\n\n');

    // 2.7. Clean stray single $ lines before or after $$...$$
    t = t.replace(/(^|\n)\s*\$\s*\n+(\$\$[\s\S]*?\$\$)/g, '$1$2');
    t = t.replace(/(\$\$[\s\S]*?\$\$)\n+\s*\$\s*($|\n)/g, '$1$2');
    t = t.replace(/(?<!\$)\$\s*(\$\$[\s\S]*?\$\$)\s*\$(?!\$)/g, '$1');

    // 2.72. Rescue any Vietnamese text accidentally wrapped inside math mode
    t = rescueVietnameseFromMath(t);

    // 2.73. Clean redundant/excessive dollar signs (e.g. $$$ -> $, $$$$ -> $$)
    t = t.replace(/\${3,}/g, (m) => m.length % 2 === 1 ? '$' : '$$');

    // 2.74. Clean orphan dots right after display math blocks (e.g. "$$ ... $$ . Xét..." -> "$$ ... $$\n\nXét...")
    t = t.replace(/(\$\$[\s\S]*?\$\$)\s*\.\s*(?=[A-ZÀ-Ỹ])/g, '$1\n\n');

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
    const tokenRegex = /(```[\s\S]*?```|<svg[\s\S]*?<\/svg>|<tikz-diagram[\s\S]*?<\/tikz-diagram>|<svg-wrapper[\s\S]*?<\/svg-wrapper>|\\begin\s*\{tikzpicture\}[\s\S]*?\\end\s*\{tikzpicture\}|\\begin\s*\{(?:cases|aligned|array|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|split|gather|align)\*?\}[\s\S]*?\\end\s*\{(?:cases|aligned|array|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|split|gather|align)\*?\}|\$\$[\s\S]*?\$\$|\$(?:\\\$|[^\$])+?\$)/gi;
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

    // Clean stray accidental $$ before operators or between math fragments (vd: [-3; 2)$$\cap or (-2; 3)$$\Rightarrow)
    t = t.replace(/([\)\]\}0-9a-zA-Z])\s*\$\$\s*(?=(\\(?:cap|cup|setminus|Rightarrow|Leftrightarrow|in|notin|subset|supset|subseteq|supseteq|approx|neq|le|ge|leq|geq)|[=+\-*\/]))/gi, '$1 ');
    t = t.replace(/(?<!\$)\$(?!\$)\s*(?<!\$)\$(?!\$)/g, ' ');

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
    // ONLY for short option items like "(-\infty; -1) và (0; 1)" or "(-1; 1)" or "y = 2x + 1"
    // NEVER wrap full Vietnamese sentences, question stems, or text with words!
    const hasVietnamese = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(t);
    const isSentential = t.length > 50 || t.split(/\s+/).length > 6;
    if (!hasVietnamese && !isSentential && !t.includes('$') && !t.includes('\\begin{')) {
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

    // 4.1. Cứu hộ câu hỏi bị lỡ bọc $ trọn vẹn cả câu hoặc dính chữ
    t = rescueAccidentalFullMathBlock(t);

    // 5. Clean stray single $ on isolated lines, rescue Vietnamese text, and clean excess dollars
    t = t.replace(/^\s*\$\s*$/gm, '');
    t = rescueVietnameseFromMath(t);
    t = t.replace(/\${3,}/g, (m) => m.length % 2 === 1 ? '$' : '$$');

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
  // Lưu ý: Không khớp nhầm nếu c) nằm trong cụm ngoặc tròn như (c) hoặc công thức toán
  text = text.replace(/([^\n])\s*(?:\r?\n)?(?<![\(\$a-zA-Z0-9])([a-d]\))\s+(?=[A-ZÀ-Ỹ\$])/g, '$1\n\n$2 ');
  text = text.replace(/([^\n])\s*(?:\r?\n)?(?<![\(\$a-zA-Z0-9])([a-d]\.)\s+(?=[A-ZÀ-Ỹ\$])/g, '$1\n\n$2 ');

  // 3. TÁCH DÒNG ĐỀ BÀI VÀ 4 PHƯƠNG ÁN LỰA CHỌN (PHẦN I):
  // Tuyệt đối KHÔNG để phương án A. dính liền ngay sau câu hỏi.
  // Đảm bảo chỉ bắt A. B. C. D. in HOA, không trùng với tiêu đề phần "A. Trắc nghiệm..."
  // và TUYỆT ĐỐI KHÔNG bắt nhầm ký hiệu đồ thị (C), mặt cầu (S), hay biến c trong toán
  text = text.replace(/([^\n])\s+((?:[\*\-]\s*)?(?:\*{0,2})A[\.\)](?:\*{0,2})\s+(?!Trắc nghiệm|Tự luận|Khẳng định|Mệnh đề)[\s\S]*?(?:[\*\-]\s*)?(?:\*{0,2})B[\.\)](?:\*{0,2})\s+[\s\S]*?(?:[\*\-]\s*)?(?:\*{0,2})(?<!\()C[\.\)](?:\*{0,2})\s+[\s\S]*?(?:[\*\-]\s*)?(?:\*{0,2})(?<!\()D[\.\)](?:\*{0,2})\s+)/g, '$1\n\n$2');

  // 4. CHUẨN HÓA 4 ĐÁP ÁN (PHẦN I) SANG CÚ PHÁP DANH SÁCH MARKDOWN:
  // TUYỆT ĐỐI KHÔNG sinh chuỗi HTML <div class="choice-item"> vào text.
  // Chuẩn hóa thành danh sách Markdown thuần túy:
  // - **A.** [Phương án A]
  // - **B.** [Phương án B]
  // - **C.** [Phương án C]
  // - **D.** [Phương án D]
  const choicePattern = /(?:(?:\r?\n)+\s*|^\s*)((?:[\*\-]\s*)?(?:\*{0,2})A[\.\)](?:\*{0,2})\s+(?!Trắc nghiệm|Tự luận|Khẳng định|Mệnh đề)[\s\S]*?)(?:(?:\r?\n)+\s*|\s{2,}|\t)(?:[\*\-]\s*)?(?:\*{0,2})B[\.\)](?:\*{0,2})\s+([\s\S]*?)(?:(?:\r?\n)+\s*|\s{2,}|\t)(?:[\*\-]\s*)?(?:\*{0,2})(?<!\()C[\.\)](?:\*{0,2})\s+([\s\S]*?)(?:(?:\r?\n)+\s*|\s{2,}|\t)(?:[\*\-]\s*)?(?:\*{0,2})(?<!\()D[\.\)](?:\*{0,2})\s+([\s\S]*?)(?=(?:\r?\n\s*(?:(?:###?\s*|\*\*)?(?:Câu\s*\d+|Bài\s*\d+|\d+\.)|Lời giải|Hướng dẫn|Đáp án|\*\*Lời giải|\*\*Hướng dẫn|\*\*Đáp án|---)|(?:\r?\n){2,}|$))/g;

  text = text.replace(choicePattern, (match, rawA, rawB, rawC, rawD) => {
    let optA = rawA.replace(/^(?:[\*\-]\s*)?(?:\*{0,2})A[\.\)](?:\*{0,2})\s*/, '').trim();
    let optB = rawB.replace(/^(?:[\*\-]\s*)?(?:\*{0,2})B[\.\)](?:\*{0,2})\s*/, '').trim();
    let optC = rawC.replace(/^(?:[\*\-]\s*)?(?:\*{0,2})C[\.\)](?:\*{0,2})\s*/, '').trim();
    let optD = rawD.replace(/^(?:[\*\-]\s*)?(?:\*{0,2})D[\.\)](?:\*{0,2})\s*/, '').trim();

    const cleanOption = (s: string) => {
      let trimmed = s.replace(/[;,]+$/, '').trim();
      trimmed = cleanMath(trimmed);
      // Chuẩn hóa $$ thành $ nếu nội dòng
      trimmed = trimmed.replace(/^\s*\$\$\s*([\s\S]*?)\s*\$\$\s*$/, '$$$1$$').trim();
      return cleanMath(trimmed);
    };

    optA = cleanOption(optA);
    optB = cleanOption(optB);
    optC = cleanOption(optC);
    optD = cleanOption(optD);

    return `\n\n- **A.** ${optA}\n- **B.** ${optB}\n- **C.** ${optC}\n- **D.** ${optD}\n\n`;
  });

  return text;
}

/**
 * Nhận diện câu hỏi có ngữ cảnh bối cảnh thực tế đời sống (Chuẩn GDPT 2018)
 */
export function isRealWorldQuestion(q?: any): boolean {
  if (!q) return false;
  if (q.isRealWorld === true || q.isRealWorld === 'true') return true;
  
  const content = String(q.content || q.question || q.text || '');
  const explanation = String(q.explanation || '');
  const combined = content + ' ' + explanation;
  if (!combined.trim()) return false;

  const realWorldRegex = /(thực tế|thực tiễn|đời sống|ứng dụng thực|bác\s+[A-ZÀ-Ỹ]|chú\s+[A-ZÀ-Ỹ]|cô\s+[A-ZÀ-Ỹ]|anh\s+[A-ZÀ-Ỹ]|chị\s+[A-ZÀ-Ỹ]|ông\s+[A-ZÀ-Ỹ]|bà\s+[A-ZÀ-Ỹ]|doanh nghiệp|công ty|nhà máy|phân xưởng|cửa hàng|tiệm|chủ tiệm|sản xuất|lợi nhuận|doanh thu|chi phí|kinh doanh|vốn đầu tư|nghìn đồng|triệu đồng|tỷ đồng|tiền lãi|lãi suất|tiền gửi|ngân hàng|mua bán|tiêu thụ|sản phẩm|ngọn hải đăng|hải đăng|chiều cao của tháp|bóng của tháp|chiều rộng khúc sông|hai bờ sông|hàng hải|tàu thủy|thuyền buồm|ca nô|xuồng|chiếc thuyền|khinh khí cầu|máy bay|bãi đỗ xe|thửa ruộng|khu đất|mảnh đất|mảnh vườn|bể bơi|hồ bơi|hồ nước|thùng chứa|bình chứa|bồn nước|hộp sữa|lon sữa|lon nước|hàng rào|rào chắn|xạ thủ|bắn bia|đo khoảng cách|góc nâng|góc hạ|giác kế|áp suất|nhiệt độ|quãng đường|vận tốc của xe|tiêu thụ nhiên liệu)/i;

  return realWorldRegex.test(combined);
}

/**
 * Chuẩn hóa và làm sạch chuỗi nhập đáp án Phần III (Trắc nghiệm trả lời ngắn):
 * - Chỉ cho phép các ký tự: chữ số (0-9), dấu '-' (chỉ ở đầu) và dấu ',' hoặc '.'
 * - Tối đa 4 ký tự theo quy định phiếu thi GDPT 2018
 */
export function sanitizeShortAnswerInput(val: string): string {
  if (!val) return '';
  // Xóa khoảng trắng
  let s = val.trim();
  // Giữ lại chỉ 0-9, '-', ',', '.'
  let clean = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch >= '0' && ch <= '9') {
      clean += ch;
    } else if (ch === '-' && clean.length === 0) {
      // Dấu âm chỉ được ở đầu
      clean += ch;
    } else if ((ch === ',' || ch === '.') && !clean.includes('.') && !clean.includes(',')) {
      // Chỉ cho phép 1 dấu ngăn cách thập phân
      clean += ch;
    }
  }
  return clean.slice(0, 4);
}

/**
 * Kiểm tra tính hợp lệ của đáp án Phần III theo chuẩn GDPT 2018:
 * - Tối đa 4 ký tự
 * - Phải là một số (kể cả số âm hoặc số thập phân)
 * - Không chứa chữ cái, công thức hoặc ký tự lạ
 */
export function validateShortAnswer(ans: string): { isValid: boolean; warning?: string } {
  const trimmed = String(ans || '').trim();
  if (!trimmed) {
    return { isValid: false, warning: 'Chưa nhập đáp án.' };
  }
  if (trimmed.length > 4) {
    return { 
      isValid: false, 
      warning: `Đáp án vượt quá 4 ký tự (${trimmed.length}/4 ký tự). Chuẩn phiếu thi GDPT 2018 chỉ cho phép tối đa 4 ký tự.` 
    };
  }
  // Kiểm tra có ký tự chữ cái hay công thức LaTeX
  if (/[a-zA-Z\\$]/.test(trimmed)) {
    return { 
      isValid: false, 
      warning: 'Đáp án Phần III chỉ chấp nhận MỘT SỐ cụ thể (0-9, dấu "-" và ","/"."), không chứa chữ cái hoặc công thức.' 
    };
  }
  // Kiểm tra cấu trúc số hợp lệ: ví dụ "22", "-3.5", "-3,5", "102", "13"
  const validNumberRegex = /^-?\d+([.,]\d+)?$/;
  if (!validNumberRegex.test(trimmed)) {
    return { 
      isValid: false, 
      warning: 'Định dạng số không hợp lệ (chỉ chấp nhận số nguyên hoặc số thập phân tối đa 4 ký tự như: 22, -3.5, 102).' 
    };
  }
  return { isValid: true };
}

/**
 * So sánh 2 đáp án Phần III (chấp nhận đồng nhất giữa dấu '.' và dấu ','):
 */
export function compareShortAnswers(userAns: string, correctAns: string): boolean {
  if (!userAns || !correctAns) return false;
  const normUser = String(userAns).trim().toLowerCase().replace(',', '.');
  const normCorrect = String(correctAns).trim().toLowerCase().replace(',', '.');
  if (normUser === normCorrect) return true;
  // So sánh giá trị số float nếu cả hai parse được
  const numUser = parseFloat(normUser);
  const numCorrect = parseFloat(normCorrect);
  if (!isNaN(numUser) && !isNaN(numCorrect)) {
    return Math.abs(numUser - numCorrect) < 0.0001;
  }
  return false;
}




