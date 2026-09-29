import * as utils from './src/lib/utils';

const s = `Định nghĩa tiệm cận ngang: Đường thẳng y = y_0 là tiệm cận ngang của đồ thị hàm số y = f(x) nếu lim_{x \\to +\\infty}f(x) = y_0 hoặc lim_{x \\to -\\infty}f(x) = y_0.`;

console.log("0. INIT:", s);
console.log("1. sanitizeMathBeforeRender:", utils.sanitizeMathBeforeRender(s));
console.log("2. normalizeMathLatex:", utils.normalizeMathLatex(s));
console.log("3. wrapAllNakedMath:", utils.wrapAllNakedMath(s));
console.log("4. fixMath:", utils.fixMath(s));
console.log("5. preProcessMathContent:", utils.preProcessMathContent(s));
