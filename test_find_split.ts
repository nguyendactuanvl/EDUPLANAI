import { normalizeLogicAndSetSymbols, normalizeMathLatex, sanitizeLatexString, normalizeInfinity, normalizeTrigSolutions, normalizeCasesBody, wrapNakedMathEnvironments } from './src/lib/utils';

let t = `b) $\\sqrt{x^2 - 6x + 9} = 5 \\Leftrightarrow \\sqrt{(x - 3)^2} = 5 \\Leftrightarrow |x - 3| = 5. \\left[\\begin{aligned} x - 3 &= 5 \\\\ x - 3 &= -5 \\end{aligned}\\right. \\Leftrightarrow \\left[\\begin{aligned} x &= 8 \\\\ x &= -2 \\end{aligned}\\right..$`;

console.log('init:', t);
t = sanitizeLatexString(t.trim());
console.log('after sanitize:', t);
t = normalizeLogicAndSetSymbols(normalizeMathLatex(t));
console.log('after norm:', t);
t = normalizeInfinity(t);
console.log('after inf:', t);
t = t.replace(/\\(\$)/g, '$1');
console.log('after unescape:', t);
t = normalizeTrigSolutions(t);
console.log('after trig:', t);
t = wrapNakedMathEnvironments(t);
console.log('after env:', t);
