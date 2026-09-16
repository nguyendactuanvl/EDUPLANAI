const fs = require('fs');

function replaceMarkdown(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (content.includes('MarkdownRenderer')) return;
  
  // Add import
  content = content.replace(
    'import Markdown from "react-markdown";',
    'import { MarkdownRenderer } from "../components/MarkdownRenderer";'
  ).replace(
    "import Markdown from 'react-markdown';",
    'import { MarkdownRenderer } from "../components/MarkdownRenderer";'
  );
  
  // Replace <Markdown ...>...</Markdown> with <MarkdownRenderer content={...} />
  // We need to use regex to find the markdown wrapper and replace it.
  
  const regex = /<div [^>]*className="markdown-body[^>]*>[\s\S]*?<Markdown[\s\S]*?>([\s\S]*?)<\/Markdown>[\s\S]*?<\/div>/g;
  
  // Let's use string replace for specific files, regex can be tricky with nested divs.
  // We'll write a custom replacer for Worksheets.tsx
  
  fs.writeFileSync(filePath, content);
}

replaceMarkdown('src/pages/Worksheets.tsx');
replaceMarkdown('src/pages/LessonPlan.tsx');
replaceMarkdown('src/pages/ExerciseSolver.tsx');

