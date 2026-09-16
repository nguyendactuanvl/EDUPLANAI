const fs = require('fs');

function fixExerciseSolver() {
    let content = fs.readFileSync('src/pages/ExerciseSolver.tsx', 'utf8');
    
    // We already have a MarkdownRenderer in ExerciseSolver?
    // Oh, ExerciseSolver still uses <Markdown> directly inside!
    // Let's replace the direct Markdown with MarkdownRenderer, or just make sure it passes the content.
    
    const blockToReplace = `<Markdown 
                  remarkPlugins={[remarkMath, remarkGfm]} 
                  rehypePlugins={[rehypeRaw, rehypeKatex]}
                  components={{
                    code({node, inline, className, children, ...props}: any) {
                      const match = /language-(w+)/.exec(className || '')
                      if (!inline && match && match[1] === 'tikz') {
                        return (
                          <div className="flex justify-center my-6 overflow-x-auto">
                            <TikzJax content={String(children).replace(/\n$/, '')} />
                          </div>
                        )
                      }
                      return <code className={className} {...props}>{children}</code>
                    }
                  }}
                >
                  {solution}
                </Markdown>`;
                
    const newBlock = `<MarkdownRenderer content={solution} />`;
    
    // Actually regex is safer because of indentation and typos.
    const regex = /<Markdown[\s\S]*?\{solution\}\s*<\/Markdown>/;
    content = content.replace(regex, newBlock);
    
    const regex2 = /<Markdown[\s\S]*?\{presentationSlides\[currentSlide\]\}\s*<\/Markdown>/;
    content = content.replace(regex2, `<MarkdownRenderer content={presentationSlides[currentSlide]} />`);

    fs.writeFileSync('src/pages/ExerciseSolver.tsx', content);
}

fixExerciseSolver();
