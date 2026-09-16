const fs = require('fs');

const files = ['src/pages/Worksheets.tsx', 'src/pages/ExerciseSolver.tsx'];
for (const file of files) {
  let code = fs.readFileSync(file, 'utf8');
  if (!code.includes('ErrorBoundary')) {
    code = code.replace('import { MarkdownRenderer } from "../components/MarkdownRenderer";', 'import { MarkdownRenderer } from "../components/MarkdownRenderer";\nimport { ErrorBoundary } from "../components/ErrorBoundary";');
    code = code.replace(/<MarkdownRenderer\s+content=\{([^}]+)\}\s*\/>/g, '<ErrorBoundary><MarkdownRenderer content={$1} /></ErrorBoundary>');
    fs.writeFileSync(file, code);
    console.log("Updated", file);
  }
}
