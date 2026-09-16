const fs = require('fs');

let content = fs.readFileSync('src/components/MarkdownRenderer.tsx', 'utf8');

// Replace the export line
const oldExportLine = `export const MarkdownRenderer = ({ content }: { content: string }) => {`;
const newExportLine = `export const MarkdownRenderer = ({ content }: { content: string }) => {
  // Pre-process content to ensure all TikZ blocks are wrapped in code blocks
  let processedContent = content || '';
  
  // 1. Unwrap any existing code blocks around TikZ to normalize
  processedContent = processedContent.replace(/\`\`\`[a-z]*\\s*(\\\\begin\\{tikzpicture\\}[\\s\\S]*?\\\\end\\{tikzpicture\\})\\s*\`\`\`/g, '$1');
  
  // 2. Wrap all TikZ blocks in standard \`\`\`tikz ... \`\`\` code blocks
  processedContent = processedContent.replace(/(\\\\begin\\{tikzpicture\\}[\\s\\S]*?\\\\end\\{tikzpicture\\})/g, '\\n\\n\`\`\`tikz\\n$1\\n\`\`\`\\n\\n');
`;

content = content.replace(oldExportLine, newExportLine);
content = content.replace(
  '{content}', 
  '{processedContent}'
);

fs.writeFileSync('src/components/MarkdownRenderer.tsx', content);
console.log("Updated MarkdownRenderer");
