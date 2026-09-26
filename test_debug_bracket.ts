import { fixMath, wrapNakedMathLines, wrapNakedMathEnvironments, sanitizeLatexString } from './src/lib/utils';

const img1 = `b) \\sqrt{x^2 - 6x + 9} = 5 \\Leftrightarrow \\sqrt{(x - 3)^2} = 5 \\Leftrightarrow |x - 3| = 5. \\left[\\begin{aligned} x - 3 &= 5 \\\\ x - 3 &= -5 \\end{aligned}\\right. \\Leftrightarrow \\left[\\begin{aligned} x &= 8 \\\\ x &= -2 \\end{aligned}\\right..`;

console.log('1. wrapNakedMathLines:');
let s1 = wrapNakedMathLines(img1);
console.log(s1);

console.log('2. sanitizeLatexString:');
let s2 = sanitizeLatexString(s1);
console.log(s2);

console.log('3. wrapNakedMathEnvironments:');
let s3 = wrapNakedMathEnvironments(s2);
console.log(s3);

console.log('4. fixMath:');
let s4 = fixMath(img1);
console.log(s4);
