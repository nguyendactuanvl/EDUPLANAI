const fs = require('fs');

const css = `
/* Protect KaTeX borders from Tailwind's reset */
.katex * {
  border-color: currentColor;
}
.katex .array {
  border-collapse: collapse;
}
.katex .hline {
  border-bottom-width: 1px !important;
  border-bottom-style: solid !important;
}
.katex .vline {
  border-right-width: 1px !important;
  border-right-style: solid !important;
}
.katex .vertical-separator {
  border-right-width: 1px !important;
  border-right-style: solid !important;
}
.katex td {
  border-width: 0 !important; /* override default td border if any */
}
/* Wait, KaTeX arrays don't use td, they use spans! */
/* Let's just make sure border-width is not reset to 0 if KaTeX sets it */
`;

fs.appendFileSync('src/index.css', css);
