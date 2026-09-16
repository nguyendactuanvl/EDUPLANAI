const fs = require('fs');
let code = fs.readFileSync('src/components/MarkdownRenderer.tsx', 'utf8');

code = code.replace("import TikzJax from 'react-tikzjax';", "import { TikzRenderer } from './TikzRenderer';");
code = code.replace("<TikzJax content={decoded} />", "<TikzRenderer content={decoded} />");

fs.writeFileSync('src/components/MarkdownRenderer.tsx', code);
console.log("Updated MarkdownRenderer.tsx");
