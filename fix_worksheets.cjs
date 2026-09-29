const fs = require('fs');

function updateFile(filePath, varName) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if we need to remove the old <Markdown> imports since we replaced it with MarkdownRenderer but left the code
    
    const blockToReplace = `<div ref={exportRef} className="markdown-body prose prose-slate max-w-none prose-headings:text-slate-800 prose-h2:text-2xl prose-h2:border-b prose-h2:pb-2 prose-h3:text-xl prose-a:text-emerald-600 prose-table:border-collapse prose-th:border prose-th:bg-slate-50 prose-td:border prose-td:p-2">
                      <Markdown 
                        remarkPlugins={[remarkMath, remarkGfm]} 
                        rehypePlugins={[rehypeRaw, rehypeKatex]}
                      >
                        {${varName}}
                      </Markdown>
                    </div>`;
                    
    const newBlock = `<div ref={exportRef}>
                      <MarkdownRenderer content={${varName}} />
                    </div>`;
                    
    if (content.includes(blockToReplace)) {
        content = content.replace(blockToReplace, newBlock);
    }
    
    fs.writeFileSync(filePath, content);
}

updateFile('src/pages/Worksheets.tsx', 'suggestion');
updateFile('src/pages/LessonPlan.tsx', 'suggestion');
updateFile('src/pages/ExerciseSolver.tsx', 'result');

