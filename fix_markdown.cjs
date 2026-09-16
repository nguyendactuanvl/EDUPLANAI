const fs = require('fs');
let code = fs.readFileSync('src/components/MarkdownRenderer.tsx', 'utf8');

code = code.replace(
  /\/\/ 1\. Unwrap any existing code blocks around TikZ to normalize/,
  `// 0. Unwrap any existing code blocks around SVG
  processedContent = processedContent.replace(/\`\`\`[a-z]*\\s*(<svg[\\s\\S]*?<\\/svg>)\\s*\`\`\`/g, '$1');
  
  // 1. Unwrap any existing code blocks around TikZ to normalize`
);

fs.writeFileSync('src/components/MarkdownRenderer.tsx', code);
console.log("Updated MarkdownRenderer.tsx");
