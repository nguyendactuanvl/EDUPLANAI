const fs = require('fs');

let content = fs.readFileSync('src/components/MarkdownRenderer.tsx', 'utf8');

const newCodeComponent = `          code({node, inline, className, children, ...props}: any) {
            const match = /language-(\\w+)/.exec(className || '');
            const contentStr = String(children).replace(/\\n$/, '');
            const isTikz = (!inline && match && match[1] === 'tikz') || (!inline && contentStr.trim().startsWith('\\\\begin{tikzpicture}'));
            if (isTikz) {
              return (
                <div className="flex justify-center my-6 overflow-x-auto bg-white p-4 rounded-xl border border-slate-200">
                  <TikzJax content={contentStr} />
                </div>
              );
            }
            return <code className={className} {...props}>{children}</code>;
          }`;
          
content = content.replace(/code\(\{node, inline, className, children, \.\.\.props\}: any\) \{[\s\S]*?return <code className=\{className\} \{\.\.\.props\}>\{children\}<\/code>;\s*\}/, newCodeComponent);

fs.writeFileSync('src/components/MarkdownRenderer.tsx', content);
console.log("Updated MarkdownRenderer");
