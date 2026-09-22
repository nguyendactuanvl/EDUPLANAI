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
  // Khi một số tận cùng là 0 dính vào hệ số/biến của phương trình kế tiếp (ví dụ 1002x -> 100 \\ 2x, 80x -> 80 \\ x)
  s = s.replace(/([<>=]|\\ge|\\le|\\leq|\\geq|\\neq)\s*(\d*0+)([1-9][a-zA-Z])/g, '$1 $2 \\\\ $3');
  s = s.replace(/([<>=]|\\ge|\\le|\\leq|\\geq|\\neq)\s*(\d+)([a-zA-Z])/g, '$1 $2 \\\\ $3');
  s = s.replace(/([<>=]|\\ge|\\le|\\leq|\\geq|\\neq)\s*(\d+)\s*([+-]\s*\d*[a-zA-Z])/g, '$1 $2 \\\\ $3');

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
 * Tự động bọc $$...$$ cho các môi trường toán trần (naked LaTeX environments) khi chưa có $ hoặc $$ bao bọc:
 * - \left[\begin{aligned}...\end{aligned}\right. (kèm tham số họ nghiệm lượng giác \quad (k \in \mathbb{Z}))
 * - \begin{cases}...\end{cases} (hệ phương trình / hệ BPT)
 * - Các môi trường khác: matrix, pmatrix, bmatrix, vmatrix, array, align, gather...
 */
export function wrapNakedMathEnvironments(text: string): string {
  if (!text) return '';
  let s = text;

  // 1. Tự động bọc naked \left[\begin{aligned}...\end{aligned}\right.
  s = s.replace(/(\\left\s*\[\s*\\begin\s*\{aligned\*?\}[\s\S]*?\\end\s*\{aligned\*?\}\s*\\right\.?(?:\s*\\quad\s*\([^\)]+\))?)/g, (match, env, offset) => {
    if (isInsideMath(s, offset)) return match;
    return `\n\n$$\n${env.trim()}\n$$\n\n`;
  });

  // 2. Tự động bọc các môi trường trần khác: cases, matrix, array... (trừ khi nằm sau \left[ hoặc đã nằm trong math)
  s = s.replace(/(\\begin\s*\{(?:cases|aligned|array|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|split|gather|align)\*?\}[\s\S]*?\\end\s*\{(?:cases|aligned|array|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|split|gather|align)\*?\})/g, (match, env, offset) => {
    const before = s.slice(Math.max(0, offset - 15), offset);
    if (/\\left\s*[\(\[\{]$/.test(before) || isInsideMath(s, offset)) return match;
    return `\n\n$$\n${env.trim()}\n$$\n\n`;
  });

  return s;
}

/**
 * Chuẩn hóa ký hiệu toán học cả Unicode và LaTeX (không thuộc, phần bù, tập con, khác...)
 */
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

export const sanitizeAndFormatMath = (rawText: string): string => {
  if (!rawText) return '';
  let text = rawText;

  // Sửa lỗi bẻ đôi từ tiếng Việt do nhận nhầm nhãn a., a)
  text = text
    .replace(/trà\s+sữ\s*\n*\s*a\./gi, 'trà sữa. ')
    .replace(/trà\s+sữ\s*\n*\s*a\)/gi, 'trà sữa) ')
    .replace(/sữ\s*\n+\s*a\./gi, 'sữa. ');

  // Tách dòng các câu hỏi bị dính chùm
  text = text.replace(/([.!?])\s*(1[89]\.|2[0-9]\.|Câu\s+\d+:)/g, '$1\n\n$2');
  text = text.replace(/([.!?])\s*(20\.|21\.|22\.|Câu\s+\d+:)/g, '$1\n\n$2');

  // 1. TỰ ĐỘNG SỬA HỆ PHƯƠNG TRÌNH / BẤT PHƯƠNG TRÌNH (\begin{cases})
  // Trường hợp có \end{cases} nhưng thiếu \begin{cases}:
  text = text.replace(/(?<!\\begin\{cases\})\s*([\s\S]*?)\\end\{cases\}/g, (match, body) => {
    // Nếu trong body chưa có \begin{cases}, tự động bổ sung
    if (!body.includes('\\begin{cases}')) {
      const lines = body.split(/\n\s*\n/);
      if (lines.length > 1) {
        const preamble = lines.slice(0, -1).join('\n\n');
        const caseBody = lines[lines.length - 1];
        return `${preamble}\n\n$$\\begin{cases} ${caseBody.trim()} \\end{cases}$$`;
      }
      return `$$\\begin{cases} ${body.trim()} \\end{cases}$$`;
    }
    return match;
  });

  // Đảm bảo khối \begin{cases}...\end{cases} luôn được bọc trong cặp $$
  text = text.replace(/(?<!\$)\\begin\{cases\}([\s\S]*?)\\end\{cases\}(?!\$)/g, '$$\\begin{cases}$1\\end{cases}$$');
  // Chuẩn hóa dấu ngắt dòng cho cases (tránh dính dòng như 1002x)
  text = text.replace(/\\\\(?=[a-zA-Z0-9])/g, '\\\\ ');

  // Xử lý khối \begin{cases} lồng trong dấu single $
  text = text.replace(/\$([^$]*?)\\begin\{cases\}([\s\S]*?)\\end\{cases\}([^$]*?)\$/g, 
    (_match, before, casesContent, after) => {
      const cleanBefore = before.trim() ? `$${before.trim()}$` : '';
      const cleanCases = `$$\\begin{cases}${casesContent}\\end{cases}$$`;
      const cleanAfter = after.trim() ? `$${after.trim()}$` : '';
      return `${cleanBefore}\n${cleanCases}\n${cleanAfter}`.trim();
    }
  );

  // 2. CHUẨN HÓA CÁC KÝ HIỆU PHỦ ĐỊNH & GẠCH CHÉO BỊ TÁCH
  text = text
    // Dấu không thuộc: \in/, \in /, \not\in, \not \in, ∈/ -> \notin
    .replace(/\\in\s*\//g, ' \\notin ')
    .replace(/∈\s*\//g, ' \\notin ')
    .replace(/∉/g, ' \\notin ')
    .replace(/(?<=\s)in\s*\/(?=\s)/g, ' \\notin ')
    .replace(/\\not\s*\\in/g, ' \\notin ')
    .replace(/\\not\s+in(?![a-zA-Z])/g, ' \\notin ')
    // Dấu không phải tập con: \subset/, \subset /, \not\subset -> \not\subset
    .replace(/\\subset(eq)?\s*\//g, ' \\not\\subset ')
    .replace(/⊂\s*\//g, ' \\not\\subset ')
    .replace(/⊄/g, ' \\not\\subset ')
    .replace(/\\not\s*\\subset(eq)?(?![a-zA-Z])/g, ' \\not\\subset ')
    // Dấu khác: =/, / =, \not= -> \ne
    .replace(/=\s*\//g, ' \\ne ')
    .replace(/\/\s*=/g, ' \\ne ')
    .replace(/\\not\s*=/g, ' \\ne ')
    .replace(/\\not\s*\\equiv/g, ' \\not\\equiv ')
    .replace(/≠/g, ' \\ne ');

  // 3. HÀN GẮN ĐỊNH NGHĨA PHÉP HIỆU & PHẦN BÙ
  // Hàn gắn khối phép hiệu bị vỡ: {x \mid x \in A và x \notin B}
  text = text.replace(
    /\\?\{?\s*x\s*\\?mid\s*x\s*\\?in\s*A\s*(\\text\{\s*và\s*\}|và)\s*\$?x\s*\\notin\s*B\$?\s*\\?\}?/g,
    '$$\\{x \\mid x \\in A \\text{ và } x \\notin B\\}$$'
  );
  text = text.replace(
    /\{x\s*\|\s*x\s*\\in\s*A\s+và\s+x\s*\\notin\s*B\}/g,
    '$$\\{x \\mid x \\in A \\text{ và } x \\notin B\\}$$'
  );
  // Chuẩn hóa ký hiệu phần bù C_A B hoặc C_E A
  text = text
    .replace(/\bC_([A-Z])([A-Z])\b/g, 'C_{$1}$2')
    .replace(/\bC([A-Z])([A-Z])\b/g, 'C_{$1}$2')
    .replace(/C_\{([A-Z])\}\s*([A-Z])/g, '\\mathrm{C}_{$1}$2');
  text = text.replace(/(?<![\$a-zA-Z0-9\\])\\mathrm\{C\}_\{([A-Z])\}\s*([A-Z])(?![a-zA-Z0-9\$])/g, '$\\mathrm{C}_{$1}$2$');

  // 4. PHỤC HỒI DẤU GẠCH CHÉO NGƯỢC (\) BỊ RỤNG
  // Trong cặp dấu $...$
  text = text.replace(/\$([^\$]+)\$/g, (match, formula) => {
    let fixed = formula
      .replace(/(?<!\\)\b(cap|cup|in|notin|subset|supset|subseteq|supseteq)\b/g, '\\$1')
      .replace(/(?<!\\)\b(mathbb|mathbf|mathcal)\b/g, '\\$1')
      .replace(/(?<!\\)\b(mid)\b/g, '\\mid ')
      .replace(/(?<!\\)\b(sin|cos|tan|cot|lim)\b/g, '\\$1')
      .replace(/(?<!\\)\b(sqrt|frac|left|right|le|ge|ne|times|pm|cdot)\b/g, '\\$1');
    return `$${fixed}$`;
  });
  // Các từ dính ngoài cặp dấu $
  text = text
    .replace(/(?<!\\)\b([a-zA-Z])inmathbb([A-Z])mid/g, '$1 \\in \\mathbb{$2} \\mid ')
    .replace(/(?<!\\)\b([a-zA-Z])\s*=\s*xinmathbb([A-Z])mid/g, '$1 = \\{x \\in \\mathbb{$2} \\mid ')
    .replace(/(?<!\\)\b([a-zA-Z])\s*=\s*\\?\{?\s*x\s*in\s*mathbb\s*([A-Z])\s*\\?mid/g, '$1 = \\{x \\in \\mathbb{$2} \\mid ')
    .replace(/(?<!\\)\b([A-Z])cap([A-Z])\b/g, '$1 \\ cap $2')
    .replace(/(?<!\\)\b([A-Z])cup([A-Z])\b/g, '$1 \\cup $2')
    .replace(/(?<!\\)\b([A-Z])setminus([A-Z])\b/g, '$1 \\setminus $2')
    .replace(/(?<!\\)\b(emptyset)\b/g, '\\emptyset')
    .replace(/(?<!\\)\b(cap|cup|setminus)\b/g, '\\$1')
    .replace(/(?<!\\)\b(mathbb)([RZQCND])\b/g, '\\$1{$2}')
    .replace(/(?<!\\)\b(mid)\b/g, '\\mid ')
    .replace(/(\d+)?sqrt(\d+)/g, '$1\\sqrt{$2}')
    .replace(/frac7sqrt33/g, '\\frac{7\\sqrt{3}}{3}')
    .replace(/dcdottanalpha/g, 'd \\cdot \\tan\\alpha')
    .replace(/(?<!\\)\b(cdot)\b/g, '\\cdot')
    .replace(/\^\\\\+circ|\^\\circ|\^circ/g, '^{\\circ}')
    .replace(/(\d+)\s*\^\{\\circ\}/g, '$1^{\\circ}');

  text = text.replace(/(?<![\$a-zA-Z0-9])(\d+\^\{\\circ\})(?![\$a-zA-Z0-9])/g, '$$$1$$');
  text = text.replace(/(?<![\$a-zA-Z0-9])((\d+)?\\sqrt\{\d+\})(?![\$a-zA-Z0-9])/g, '$$$1$$');

  // Khắc phục thiếu ngoặc nhọn đóng ở cuối điều kiện tập hợp
  text = text.replace(/([A-Z]\s*=\s*\\\{[^}]+=\s*0)(?!\})/g, '$1\\}');
  text = text.replace(/([A-Z]\s*=\s*\\\{[^}]+<\s*\d+)(?!\})/g, '$1\\}');
  text = text.replace(/([A-Z]\s*=\s*\\\{[^}]+>\s*\d+)(?!\})/g, '$1\\}');
  text = text.replace(/([A-Z]\s*=\s*\\\{[^}]+(?:<=|>=|\\le|\\ge)\s*\d+)(?!\})/g, '$1\\}');

  // 5. CÔNG THỨC NGHIỆM LƯỢNG GIÁC DẤU MÓC VUÔNG
  // Nếu có dạng họ nghiệm sin/cos tuyển, ưu tiên dùng \left[ ... \right.
  text = text.replace(/\\begin\s*\{cases\*?\}([\s\S]*?)\\end\s*\{cases\*?\}/g, (match, body) => {
    const isTrig = /(?:k\s*2\s*\\pi|2\s*k\s*\\pi|k\s*\\pi|\b\d*k\pi\b|k\s*\\in\s*(?:\\mathbb\{Z\}|Z)|[+\-]\s*k\s*\\pi|[+\-]\s*k2\\pi)/i.test(body);
    if (isTrig) {
      let formattedBody = body.trim();
      formattedBody = formattedBody.replace(/\\\\(?=[a-zA-Z0-9])/g, '\\\\ ');
      return `\\left[\\begin{aligned} ${formattedBody} \\end{aligned}\\right.`;
    }
    return match;
  });

  // Tự động bọc ngoặc nhọn { } cho các phương án tập hợp
  text = text.replace(/\b([A-Z])\s*=\s*(-?\d+(?:\s*;\s*-?\d+)*)\b/g, '$1 = \\{$2\\}');
  text = text.replace(/(?<![\$a-zA-Z0-9])([A-Z]\s*=\s*\\\{[^$\n]+?\\\\})(?![\$a-zA-Z0-9])/g, '$$$1$$');
  text = text.replace(/(?<![\$a-zA-Z0-9])([A-Z]\s*\\(?:cap|cup|setminus)\s*[A-Z])(?![\$a-zA-Z0-9])/g, '$$$1$$');

  // Phục hồi môi trường cho ký hiệu toán trôi nổi ngoài dấu $
  const floatSymbols = ['Leftrightarrow', 'Leftarrow', 'Rightarrow', 'notin', 'in', 'cap', 'cup', 'setminus', 'emptyset', 'neq', 'subset', 'supset'];
  text = text.replace(new RegExp(`(?<![\\$a-zA-Z])\\\\(${floatSymbols.join('|')})(?![a-zA-Z])`, 'g'), (m, sym, offset, fullStr) => {
    const before = fullStr.slice(0, offset);
    const dollarsBefore = (before.match(/(?<!\\)\$/g) || []).length;
    if (dollarsBefore % 2 === 0) {
      return ` $\\${sym}$ `;
    }
    return m;
  });

  text = text.replace(/(?<!\$)(m\s*\\in\s*\[\s*-?\d+\s*;\s*-?\d+\s*\])(?!\$)/g, '$$$1$$');
  text = text.replace(/(?<!\$)([a-zA-Z]\s*\\in\s*[\(\[]\s*-?\d+\s*;\s*-?\d+\s*[\)\]])(?!\$)/g, '$$$1$$');
  text = text.replace(/(?<!\$)([A-Z]\s*=\s*[\(\[]\s*-?\d+\s*;\s*-?\d+\s*[\)\]])(?!\$)/g, '$$$1$$');

  if (text.includes('\\{') && !text.includes('$') && !/[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(text)) {
    text = `$${text}$`;
  }

  return text;
};

export const masterSanitizeLatex = sanitizeAndFormatMath;
export const masterSanitizeMath = sanitizeAndFormatMath;
export const repairSetTheorySyntax = sanitizeAndFormatMath;

/**
 * Chuẩn hóa toàn cục công thức toán LaTeX (Khóa vĩnh viễn bộ lọc chuẩn hóa):
 * 1. Khắc phục dấu phủ định bị tách rời trên Web KaTeX (\not =, \not \in, \not \subset, ...)
 * 2. Tự động bọc ngoặc nhọn cases nếu thiếu cặp $$
 * 3. Chuẩn hóa dấu ngắt dòng cho cases
 */
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

  // 2. Chuẩn hóa thân môi trường cases còn lại (hệ phương trình / hệ bất phương trình)
  str = str.replace(/\\begin\s*\{cases\*?\}([\s\S]*?)\\end\s*\{cases\*?\}/g, (_match, inner) => {
    const fixedInner = normalizeCasesBody(inner);
    return `\\begin{cases}\n${fixedInner}\n\\end{cases}`;
  });

  // 3. Nếu cases bị bọc trong single $...$ thì chuyển thành $$...$$ để KaTeX ngắt dòng và ngoặc nhọn chuẩn đẹp
  str = str.replace(/(?<!\$)\$\s*(\\begin\s*\{cases\*?\}[\s\S]*?\\end\s*\{cases\*?\})\s*\$(?!\$)/g, (_match, env) => {
    return `\n\n$$\n${env.trim()}\n$$\n\n`;
  });

  // 4. Tự động bọc naked math environments (bao gồm \left[\begin{aligned}...\end{aligned}\right. và \begin{cases})
  str = wrapNakedMathEnvironments(str);

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
  let text = String(opt).trim();
  
  // 1. Remove leading option prefixes like "A.", "A)", "A:", "a.", "a)"
  text = text.replace(/^[A-Da-d][\.\:\)]\s*/, '').trim();

  // 2. Remove trailing orphan dollar signs after punctuation (e.g. ". $", ".$", ";$", ",$")
  text = text.replace(/([\.\;\,])\s*\$+$/g, '$1').trim();
  text = text.replace(/([\.\;\,])\s*\$+(\s)/g, '$1$2').trim();

  // 3. Remove redundant outer $ or $$ wrapping the entire option (especially if multiline or with spaces)
  // e.g. "$\n\begin{cases}...\end{cases}\n$" or "$ \begin{cases}... $" or "$$ ... $$"
  text = text.replace(/^\s*\${1,2}\s*([\s\S]*?)\s*\${1,2}\s*$/, '$1').trim();

  // 4. Remove trailing orphan dollar signs after punctuation again
  text = text.replace(/([\.\;\,])\s*\$+$/g, '$1').trim();

  // 5. If there is an odd number of dollar signs and the string ends with a dollar sign, remove the trailing orphan dollar
  let dollarCount = (text.match(/(?<!\\)\$/g) || []).length;
  if (dollarCount % 2 !== 0 && text.endsWith('$')) {
    text = text.replace(/\s*\$+$/, '').trim();
  }

  // 6. Normalize infinity in all forms
  text = normalizeInfinity(text);

  // 6.5. Tự động khôi phục cấu trúc tập hợp cho phương án trắc nghiệm (A = 1; 2 -> A = {1; 2})
  text = repairSetTheorySyntax(text);

  // 7. If it contains a LaTeX block environment (cases, array, matrix, aligned, etc.)
  // Wrap it tightly as inline math $...$ so it renders right next to "A." without stray dollars or newlines
  if (/\\begin\s*\{cases\*?\}/.test(text)) {
    text = text.replace(/\\begin\s*\{cases\*?\}([\s\S]*?)\\end\s*\{cases\*?\}/g, (_m, b) => `\\begin{cases}\n${normalizeCasesBody(b)}\n\\end{cases}`);
  }
  if (/\\begin\s*\{(?:cases|aligned|array|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|split|gather|align)\*?\}/.test(text)) {
    if (!text.startsWith('$') && !text.endsWith('$')) {
      return `$${text.trim()}$`;
    }
    return text.trim();
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
  dollarCount = (text.match(/(?<!\\)\$/g) || []).length;

  // TUYỆT ĐỐI không tự động gắn thêm dấu $ vào cuối chuỗi nếu chuỗi đã có cặp dấu $...$ hoàn chỉnh!
  if (!hasMatchedDollars && dollarCount === 0) {
    const hasVietnameseWords = /[a-zA-Zàáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]{2,}\s+[a-zA-Zàáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]{2,}/i.test(text);
    if (!hasVietnameseWords && /(?:[\\^_=><\+\-\*\/]|\d+[a-zA-Z]|[a-zA-Z]\d+)/.test(text) && !/^(đúng|sai|có|không|luôn|tất cả|cả|đáp án|phương án|với|hàm số|điểm)\b/i.test(text)) {
      if (!text.startsWith('$') && !text.endsWith('$')) {
        text = `$${text}$`;
      }
    }
  }

  // Final cleanup of any trailing orphan dollar or trailing dollar after punctuation
  text = text.replace(/([\.\;\,])\s*\$+$/g, '$1').trim();
  const finalDollars = (text.match(/(?<!\\)\$/g) || []).length;
  if (finalDollars % 2 !== 0 && text.endsWith('$')) {
    text = text.replace(/\s*\$+$/, '').trim();
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

  // Sửa lỗi bẻ đôi từ tiếng Việt như "trà sữa" trước khi xử lý nhãn
  text = text
    .replace(/trà\s+sữ\s*\n*\s*a\./gi, 'trà sữa. ')
    .replace(/trà\s+sữ\s*\n*\s*a\)/gi, 'trà sữa) ')
    .replace(/sữ\s*\n+\s*a\./gi, 'sữa. ');

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
    // Chỉ cắt khi nhãn a), a. đứng đầu dòng mới hoặc sau dấu chấm/dấu hai chấm ngắt câu rõ ràng
    text = text.replace(/(?:\r?\n)+(?:[-*]\s*)?(?:\*{0,2})a[\.:\)]\s+[\s\S]*$/i, '');
    text = text.replace(/(?:[\.:]\s+)(?:[-*]\s*)?(?:\*{0,2})a\)\s+[\s\S]*$/i, '.');
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
    let t = normalizeMathLatex(text.trim());
    
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

    // 2.5. If wrapped in single $...$, upgrade to display block $$...$$ ONLY when NOT inside table row '|', list bullet, or option label
    t = t.replace(/(^|\n)(?!\s*\||\s*[-\*]|\s*[A-D][\.\:\)]|\s*[a-d][\.\:\)])\s*(?<!\$)\$\s*(\\left\s*\[\s*\\begin\s*\{aligned\*?\}[\s\S]*?\\end\s*\{aligned\*?\}\s*\\right\.?(?:\s*\\quad\s*\([^\)]+\))?)\s*\$(?!\$)\s*($|\n)/g, (_m, p1, p2, p3) => `${p1}\n\n$$\n${p2.trim()}\n$$\n\n${p3}`);
    t = t.replace(/(^|\n)(?!\s*\||\s*[-\*]|\s*[A-D][\.\:\)]|\s*[a-d][\.\:\)])\s*(?<!\$)\$\s*(\\begin\s*\{(?:cases|array|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|split|gather|align)\*?\}[\s\S]*?\\end\s*\{(?:cases|array|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|split|gather|align)\*?\})\s*\$(?!\$)\s*($|\n)/g, (_m, p1, p2, p3) => `${p1}\n\n$$\n${p2.trim()}\n$$\n\n${p3}`);

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


