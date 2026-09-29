import * as utils from './src/lib/utils';

const s = `tính các giới hạn lim_{x \\to +\\infty}y, lim_{x \\to -\\infty}y.`;

console.log("0 (RAW):", s);
let t = utils.wrapNakedMathLines(s);
console.log("1 (wrapNakedMathLines):", t);
t = utils.sanitizeLatexString(t);
console.log("2 (sanitizeLatexString):", t);
t = utils.wrapNakedMathEnvironments(t);
console.log("3 (wrapNakedMathEnvironments):", t);
t = utils.fixMath(t);
console.log("4 (fixMath):", t);
