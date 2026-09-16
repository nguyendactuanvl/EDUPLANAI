const fs = require('fs');
const file = 'src/components/MarkdownRenderer.tsx';
let code = fs.readFileSync(file, 'utf8');

// SVG blocks need to be rendered using a custom component so they aren't mangled by markdown parsing.
// Actually rehypeRaw handles raw HTML. But if there's markdown logic breaking <br><svg... it might be problematic.
// Let's replace <svg...>...</svg> with a custom component <svg-wrapper base64="...">

code = code.replace(
  /\/\/ 0\. Unwrap any existing code blocks around SVG/,
  `// Wrap SVGs in a container to prevent Markdown from messing them up and to style them
  processedContent = processedContent.replace(/(<svg[\\s\\S]*?<\\/svg>)/g, (match) => {
    try {
      const base64 = typeof btoa !== 'undefined' ? btoa(encodeURIComponent(match)) : Buffer.from(encodeURIComponent(match)).toString('base64');
      return \`\\n\\n<svg-wrapper data-svg="\${base64}"></svg-wrapper>\\n\\n\`;
    } catch (e) {
      return match;
    }
  });
  
  // 0. Unwrap any existing code blocks around SVG`
);

fs.writeFileSync(file, code);
console.log("Updated MarkdownRenderer.tsx");
