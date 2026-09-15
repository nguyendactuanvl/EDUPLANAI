const fs = require('fs');
let content = fs.readFileSync('src/pages/ExerciseSolver.tsx', 'utf8');

// 1. Add import
if (!content.includes("import TikzJax")) {
  content = content.replace("import Markdown from 'react-markdown';", "import Markdown from 'react-markdown';\nimport TikzJax from 'react-tikzjax';");
}

// 2. Replace <Markdown ...> with the updated one for the solution
const markdownOld = `<Markdown 
                  remarkPlugins={[remarkMath, remarkGfm]} 
                  rehypePlugins={[rehypeRaw, rehypeKatex]}
                >
                  {solution}
                </Markdown>`;
const markdownNew = `<Markdown 
                  remarkPlugins={[remarkMath, remarkGfm]} 
                  rehypePlugins={[rehypeRaw, rehypeKatex]}
                  components={{
                    code({node, inline, className, children, ...props}: any) {
                      const match = /language-(\w+)/.exec(className || '')
                      if (!inline && match && match[1] === 'tikz') {
                        return (
                          <div className="flex justify-center my-6 overflow-x-auto">
                            <TikzJax content={String(children).replace(/\\n$/, '')} />
                          </div>
                        )
                      }
                      return <code className={className} {...props}>{children}</code>
                    }
                  }}
                >
                  {solution}
                </Markdown>`;

content = content.replace(markdownOld, markdownNew);

// 3. Do the same for presentation mode
const presentationOld = `<Markdown 
                remarkPlugins={[remarkMath, remarkGfm]} 
                rehypePlugins={[rehypeRaw, rehypeKatex]}
              >
                {presentationSlides[currentSlide]}
              </Markdown>`;
const presentationNew = `<Markdown 
                remarkPlugins={[remarkMath, remarkGfm]} 
                rehypePlugins={[rehypeRaw, rehypeKatex]}
                components={{
                    code({node, inline, className, children, ...props}: any) {
                      const match = /language-(\w+)/.exec(className || '')
                      if (!inline && match && match[1] === 'tikz') {
                        return (
                          <div className="flex justify-center my-6 overflow-x-auto bg-white p-4 rounded-xl">
                            <TikzJax content={String(children).replace(/\\n$/, '')} />
                          </div>
                        )
                      }
                      return <code className={className} {...props}>{children}</code>
                    }
                  }}
              >
                {presentationSlides[currentSlide]}
              </Markdown>`;

content = content.replace(presentationOld, presentationNew);

fs.writeFileSync('src/pages/ExerciseSolver.tsx', content);
console.log("Updated ExerciseSolver.tsx");
