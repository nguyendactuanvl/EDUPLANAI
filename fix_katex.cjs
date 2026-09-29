const fs = require('fs');
let code = fs.readFileSync('src/components/MarkdownRenderer.tsx', 'utf8');

code = code.replace(
  'rehypePlugins={[rehypeRaw, rehypeKatex]}',
  'rehypePlugins={[rehypeRaw, [rehypeKatex, { strict: false, throwOnError: false }]]}'
);

fs.writeFileSync('src/components/MarkdownRenderer.tsx', code);
console.log("Updated MarkdownRenderer.tsx");
