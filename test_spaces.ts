import * as utils from './src/lib/utils';

const text3 = `lim_{x \\to 1^+} \\frac{x+2}{x-1} = +\\infty (vì x - 1 > 0 khi x \\to 1^+)`;

console.log("1. cleanMath:", utils.cleanMath(text3));
console.log("2. normalizeMathLatex:", utils.normalizeMathLatex(text3));
console.log("3. sanitizeMathBeforeRender:", utils.sanitizeMathBeforeRender(text3));
console.log("4. fixMath:", utils.fixMath(text3));
