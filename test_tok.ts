import {
  stripInternalTags,
  tokenizeTextAndMath,
  tokensToRuns
} from './src/lib/exportUtils';

const sample = `Định nghĩa tiệm cận ngang: Đường thẳng $y = y_0$ là tiệm cận ngang của đồ thị hàm số $y = f(x)$ nếu $\\lim_{x \\to +\\infty} f(x) = y_0$ hoặc $\\lim_{x \\to -\\infty} f(x) = y_0$.`;

console.log("Tokens for sample with $:");
const tokens = tokenizeTextAndMath(sample);
console.log(JSON.stringify(tokens, null, 2));

const sampleNaked = `Định nghĩa tiệm cận ngang: Đường thẳng y = y_0 là tiệm cận ngang của đồ thị hàm số y = f(x) nếu lim_{x \\to +\\infty}f(x) = y_0 hoặc lim_{x \\to -\\infty}f(x) = y_0.`;
console.log("Tokens for sample naked:");
const tokensNaked = tokenizeTextAndMath(sampleNaked);
console.log(JSON.stringify(tokensNaked, null, 2));
