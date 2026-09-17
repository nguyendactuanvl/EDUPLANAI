const fs = require('fs');
let code = fs.readFileSync('src/components/MarkdownRenderer.tsx', 'utf8');

// Also process generic ```tikz ... ``` blocks that might miss \begin{tikzpicture}
code = code.replace(
  /processedContent = processedContent\.replace\(\/\(\\\\begin\\s\*\\\{tikzpicture\\\}\[\\\\s\\\\S\]\*\?\\\\end\\s\*\\\{tikzpicture\\\}\)\/gi, \(match\) => \{/,
  `// Wrap loose tikz code blocks that don't have begin/end environment
  processedContent = processedContent.replace(/\`\`\`tikz\\s*([\\s\\S]*?)\`\`\`/gi, (match, inner) => {
    if (!inner.includes('\\\\begin{tikzpicture}')) {
       inner = '\\\\begin{tikzpicture}\\n' + inner + '\\n\\\\end{tikzpicture}';
    }
    return inner;
  });
  
  processedContent = processedContent.replace(/(\\\\begin\\s*\\{tikzpicture\\}[\\s\\S]*?\\\\end\\s*\\{tikzpicture\\})/gi, (match) => {`
);

fs.writeFileSync('src/components/MarkdownRenderer.tsx', code);
console.log('done');
