const fs = require('fs');
let code = fs.readFileSync('src/pages/LessonPlan.tsx', 'utf8');

// Replace <Markdown ...> {suggestion} </Markdown> with <MarkdownRenderer content={suggestion} />
code = code.replace(/<Markdown\s+remarkPlugins=\{\[remarkMath,\s*remarkGfm\]\}\s+rehypePlugins=\{\[rehypeRaw,\s*rehypeKatex\]\}\s*>\s*\{suggestion\}\s*<\/Markdown>/g, '<MarkdownRenderer content={suggestion} />');

// Add ErrorBoundary import if not there
if (!code.includes('ErrorBoundary')) {
  code = code.replace('import { MarkdownRenderer } from "../components/MarkdownRenderer";', 'import { MarkdownRenderer } from "../components/MarkdownRenderer";\nimport { ErrorBoundary } from "../components/ErrorBoundary";');
  
  // Wrap MarkdownRenderer with ErrorBoundary
  code = code.replace('<MarkdownRenderer content={suggestion} />', '<ErrorBoundary><MarkdownRenderer content={suggestion} /></ErrorBoundary>');
}

fs.writeFileSync('src/pages/LessonPlan.tsx', code);
console.log("Updated LessonPlan.tsx");
