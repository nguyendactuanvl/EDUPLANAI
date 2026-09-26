import { Document, Paragraph, Packer } from 'docx';
// Let's import or inspect tokenizeTextAndMath from exportUtils
import * as utils from './src/lib/utils';

// Image 2 text:
const img2 = `b) Nội dung: Tìm hiểu định nghĩa tiệm cận ngang SGK, xét ví dụ hàm số y = \\frac{2x+1}{x-1} và tính các giới hạn lim_{x \\to +\\infty}y, lim_{x \\to -\\infty}y.
• Định nghĩa tiệm cận ngang: Đường thẳng y = y_0 là tiệm cận ngang của đồ thị hàm số y = f(x) nếu lim_{x \\to +\\infty}f(x) = y_0 hoặc lim_{x \\to -\\infty}f(x) = y_0.
• Lời giải ví dụ: lim_{x \\to +\\infty} \\frac{2x+1}{x-1} = lim_{x \\to +\\infty} \\frac{2+\\frac{1}{x}}{1-\\frac{1}{x}} = 2 lim_{x \\to -\\infty} \\frac{2x+1}{x-1} = 2 Vậy`;

console.log("=== WRAP NAKED MATH ON IMG2 ===");
console.log(utils.wrapAllNakedMath(img2));
