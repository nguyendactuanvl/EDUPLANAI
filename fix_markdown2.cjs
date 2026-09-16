const fs = require('fs');
const file = 'src/components/MarkdownRenderer.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /'tikz-diagram': \(\{node\}: any\) => \{/,
  `'svg-wrapper': ({node}: any) => {
            try {
              const base64 = node.properties?.dataSvg || node.properties?.['data-svg'];
              if (!base64) return null;
              const decoded = decodeURIComponent(typeof atob !== 'undefined' ? atob(base64) : Buffer.from(base64, 'base64').toString('utf8'));
              return (
                <div className="flex justify-center my-6 overflow-x-auto bg-white p-4 rounded-xl border border-slate-200" dangerouslySetInnerHTML={{__html: decoded}}>
                </div>
              );
            } catch(e) {
              return <div className="text-red-500">Lỗi hiển thị hình ảnh SVG</div>;
            }
          },
          'tikz-diagram': ({node}: any) => {`
);

// Note: I also noticed the unwrap logic for SVG is AFTER the encode logic for SVG, so it won't work correctly if there is ```html <svg>...```. Let's fix that order.
code = code.replace(
    /\/\/ Wrap SVGs[\s\S]*?return match;\s*\}\s*\}\);\s*\/\/ 0\. Unwrap any existing code blocks around SVG\s*processedContent = processedContent\.replace\(\/```\[a-z\]\*\\s\*\(\<svg\[\\s\\S\]\*\?<\\\/svg\>\)\\s\*```\/g, '\$1'\);/,
    `// 0. Unwrap any existing code blocks around SVG
  processedContent = processedContent.replace(/\`\`\`[a-z]*\\s*(<svg[\\s\\S]*?<\\/svg>)\\s*\`\`\`/g, '$1');
  
  // Wrap SVGs in a container to prevent Markdown from messing them up and to style them
  processedContent = processedContent.replace(/(<svg[\\s\\S]*?<\\/svg>)/g, (match) => {
    try {
      const base64 = typeof btoa !== 'undefined' ? btoa(encodeURIComponent(match)) : Buffer.from(encodeURIComponent(match)).toString('base64');
      return \`\\n\\n<svg-wrapper data-svg="\${base64}"></svg-wrapper>\\n\\n\`;
    } catch (e) {
      return match;
    }
  });`
);

fs.writeFileSync(file, code);
console.log("Updated MarkdownRenderer.tsx");
