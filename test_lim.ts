import { preProcessMathContent, fixMath } from './src/lib/utils';

// Image 2 text:
const img2 = `b) Nội dung: Tìm hiểu định nghĩa tiệm cận ngang SGK, xét ví dụ hàm số y = \\frac{2x+1}{x-1} và tính các giới hạn lim_{x \\to +\\infty}y, lim_{x \\to -\\infty}y.
• Định nghĩa tiệm cận ngang: Đường thẳng y = y_0 là tiệm cận ngang của đồ thị hàm số y = f(x) nếu lim_{x \\to +\\infty}f(x) = y_0 hoặc lim_{x \\to -\\infty}f(x) = y_0.
• Lời giải ví dụ: lim_{x \\to +\\infty} \\frac{2x+1}{x-1} = lim_{x \\to +\\infty} \\frac{2+\\frac{1}{x}}{1-\\frac{1}{x}} = 2 lim_{x \\to -\\infty} \\frac{2x+1}{x-1} = 2`;

// Image 3 text:
const img3 = `• Định nghĩa tiệm cận đứng: Đường thẳng x = x_0 là tiệm cận đứng của đồ thị hàm số y = f(x) nếu ít nhất một trong các giới hạn sau thỏa mãn:
\\lim_{x \\to x_0^+} f(x) = +\\infty, \\quad \\lim_{x \\to x_0^+} f(x) = -\\infty, \\quad \\lim_{x \\to x_0^-} f(x) = +\\infty, \\quad \\lim_{x \\to x_0^-} f(x) = -\\infty - Lời giải ví dụ: lim_{x \\to 1^+} \\frac{x+2}{x-1} = +\\infty (vì x - 1 > 0 khi x \\to 1^+) Vậy đường thẳng x = 1 là tiệm cận đứng của đồ thị hàm số.`;

console.log("=== IMG 2 THROUGH PREPROCESS ===");
console.log(preProcessMathContent(img2));

console.log("=== IMG 3 THROUGH PREPROCESS ===");
console.log(preProcessMathContent(img3));
