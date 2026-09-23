/**
 * Tiện ích định dạng phương trình và biểu thức toán học chuẩn LaTeX
 * Tự động rút gọn hệ số:
 * - Hệ số 1 -> "x" thay vì "1x"
 * - Hệ số -1 -> "-x" thay vì "-1x"
 * - Hệ số 0 -> triệt tiêu
 * - Xử lý dấu cộng/trừ đẹp mắt, tránh " + -4" -> " - 4"
 */

export function formatLinearEquation(a: number, b: number, c: number): string {
  // Phương trình ax + by + c = 0
  const terms: string[] = [];

  // Hệ số x
  if (Math.abs(a) > 1e-7) {
    if (a === 1) terms.push("x");
    else if (a === -1) terms.push("-x");
    else terms.push(`${a}x`);
  }

  // Hệ số y
  if (Math.abs(b) > 1e-7) {
    if (terms.length === 0) {
      if (b === 1) terms.push("y");
      else if (b === -1) terms.push("-y");
      else terms.push(`${b}y`);
    } else {
      if (b === 1) terms.push("+ y");
      else if (b === -1) terms.push("- y");
      else if (b > 0) terms.push(`+ ${b}y`);
      else terms.push(`- ${Math.abs(b)}y`);
    }
  }

  // Hằng số c
  if (Math.abs(c) > 1e-7) {
    if (terms.length === 0) {
      terms.push(`${c}`);
    } else {
      if (c > 0) terms.push(`+ ${c}`);
      else terms.push(`- ${Math.abs(c)}`);
    }
  }

  if (terms.length === 0) return "0 = 0";
  return `${terms.join(" ")} = 0`;
}

export function formatLinearInequality(
  a: number,
  b: number,
  c: number,
  op: "<=" | ">=" | "<" | ">"
): string {
  const terms: string[] = [];

  if (Math.abs(a) > 1e-7) {
    if (a === 1) terms.push("x");
    else if (a === -1) terms.push("-x");
    else terms.push(`${a}x`);
  }

  if (Math.abs(b) > 1e-7) {
    if (terms.length === 0) {
      if (b === 1) terms.push("y");
      else if (b === -1) terms.push("-y");
      else terms.push(`${b}y`);
    } else {
      if (b === 1) terms.push("+ y");
      else if (b === -1) terms.push("- y");
      else if (b > 0) terms.push(`+ ${b}y`);
      else terms.push(`- ${Math.abs(b)}y`);
    }
  }

  if (Math.abs(c) > 1e-7) {
    if (terms.length === 0) {
      terms.push(`${c}`);
    } else {
      if (c > 0) terms.push(`+ ${c}`);
      else terms.push(`- ${Math.abs(c)}`);
    }
  }

  const opLatex = op === "<=" ? "\\le" : op === ">=" ? "\\ge" : op;
  const left = terms.length === 0 ? "0" : terms.join(" ");
  return `${left} ${opLatex} 0`;
}

export function formatQuadratic(a: number, b: number, c: number): string {
  const terms: string[] = [];

  if (Math.abs(a) > 1e-7) {
    if (a === 1) terms.push("x^2");
    else if (a === -1) terms.push("-x^2");
    else terms.push(`${a}x^2`);
  }

  if (Math.abs(b) > 1e-7) {
    if (terms.length === 0) {
      if (b === 1) terms.push("x");
      else if (b === -1) terms.push("-x");
      else terms.push(`${b}x`);
    } else {
      if (b === 1) terms.push("+ x");
      else if (b === -1) terms.push("- x");
      else if (b > 0) terms.push(`+ ${b}x`);
      else terms.push(`- ${Math.abs(b)}x`);
    }
  }

  if (Math.abs(c) > 1e-7) {
    if (terms.length === 0) {
      terms.push(`${c}`);
    } else {
      if (c > 0) terms.push(`+ ${c}`);
      else terms.push(`- ${Math.abs(c)}`);
    }
  }

  if (terms.length === 0) return "0";
  return terms.join(" ");
}

export function formatCubic(a: number, b: number, c: number, d: number): string {
  const terms: string[] = [];

  if (Math.abs(a) > 1e-7) {
    if (a === 1) terms.push("x^3");
    else if (a === -1) terms.push("-x^3");
    else terms.push(`${a}x^3`);
  }

  if (Math.abs(b) > 1e-7) {
    if (terms.length === 0) {
      if (b === 1) terms.push("x^2");
      else if (b === -1) terms.push("-x^2");
      else terms.push(`${b}x^2`);
    } else {
      if (b === 1) terms.push("+ x^2");
      else if (b === -1) terms.push("- x^2");
      else if (b > 0) terms.push(`+ ${b}x^2`);
      else terms.push(`- ${Math.abs(b)}x^2`);
    }
  }

  if (Math.abs(c) > 1e-7) {
    if (terms.length === 0) {
      if (c === 1) terms.push("x");
      else if (c === -1) terms.push("-x");
      else terms.push(`${c}x`);
    } else {
      if (c === 1) terms.push("+ x");
      else if (c === -1) terms.push("- x");
      else if (c > 0) terms.push(`+ ${c}x`);
      else terms.push(`- ${Math.abs(c)}x`);
    }
  }

  if (Math.abs(d) > 1e-7) {
    if (terms.length === 0) {
      terms.push(`${d}`);
    } else {
      if (d > 0) terms.push(`+ ${d}`);
      else terms.push(`- ${Math.abs(d)}`);
    }
  }

  if (terms.length === 0) return "0";
  return terms.join(" ");
}
