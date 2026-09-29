import temml from 'temml';
const tex = "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}";
const mathmlHtml = temml.renderToString(tex, { displayMode: false });
console.log(mathmlHtml);
