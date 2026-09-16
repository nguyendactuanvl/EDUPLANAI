const fs = require('fs');

let css = fs.readFileSync('src/index.css', 'utf8');

// Replace the previous append with a better one
css = css.replace(/\/\* Protect KaTeX borders[\s\S]*?\*\//g, '');
css = css.replace(/\.katex \* \{[\s\S]*?\}/g, '');
css = css.replace(/\.katex \.array \{[\s\S]*?\}/g, '');
css = css.replace(/\.katex \.hline \{[\s\S]*?\}/g, '');
css = css.replace(/\.katex \.vline \{[\s\S]*?\}/g, '');
css = css.replace(/\.katex \.vertical-separator \{[\s\S]*?\}/g, '');
css = css.replace(/\.katex td \{[\s\S]*?\}/g, '');

const newCss = `
/* Protect KaTeX borders from Tailwind's reset */
.katex, .katex * {
  border-color: currentColor !important;
}
/* Ensure hline and vline are visible */
.katex .hline {
  border-bottom: 1px solid currentColor !important;
  background-color: currentColor !important;
}
.katex .vertical-separator {
  border-right: 1px solid currentColor !important;
  background-color: currentColor !important;
}
.katex .array {
  border-collapse: collapse;
}
`;

fs.writeFileSync('src/index.css', css + newCss);
console.log("Updated CSS");
