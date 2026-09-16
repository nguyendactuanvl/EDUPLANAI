const fs = require('fs');

let content = fs.readFileSync('src/pages/ExerciseSolver.tsx', 'utf8');

// I can see the exact context now:
const badText = `            <div className="bg-slate-50 rounded-xl p-8 border border-slate-200">
              <div ref={exportRef} className="markdown-body prose prose-slate max-w-none prose-headings:text-slate-800 prose-h2:text-2xl prose-h2:text-blue-700 prose-h2:border-b prose-h2:pb-2 prose-h3:text-xl prose-a:text-emerald-600">
                <MarkdownRenderer content={presentationSlides[currentSlide]} />
            </div>
          </div>
          
          <div className="bg-slate-800 p-6 flex items-center justify-center gap-8 border-t border-slate-700">`;

const goodText = `            <div className="bg-slate-50 rounded-xl p-8 border border-slate-200">
              <div ref={exportRef} className="markdown-body prose prose-slate max-w-none prose-headings:text-slate-800 prose-h2:text-2xl prose-h2:text-blue-700 prose-h2:border-b prose-h2:pb-2 prose-h3:text-xl prose-a:text-emerald-600">
                <MarkdownRenderer content={solution} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Presentation Mode Modal */}
      {isPresentationMode && presentationSlides.length > 0 && (
        <div className="fixed inset-0 z-50 bg-slate-900 text-white flex flex-col">
          <div className="flex items-center justify-between p-4 bg-slate-800 border-b border-slate-700">
            <h3 className="font-semibold text-lg flex items-center gap-2"><Presentation className="w-5 h-5 text-blue-400" /> Trình chiếu Bài giải</h3>
            <button 
              onClick={() => setIsPresentationMode(false)}
              className="p-2 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="flex-1 overflow-auto p-12 md:p-24 flex items-center justify-center">
            <div className="max-w-5xl w-full mx-auto markdown-body prose prose-invert prose-2xl prose-headings:text-white prose-p:text-slate-200 prose-li:text-slate-200 custom-presentation">
              <style>{\`
                .custom-presentation { font-size: 1.5rem !important; line-height: 1.8 !important; }
                .custom-presentation h2 { font-size: 2.5rem !important; color: #60a5fa !important; margin-bottom: 2rem !important; border-bottom: 2px solid #334155; padding-bottom: 1rem; }
                .custom-presentation h3 { font-size: 2rem !important; color: #a7f3d0 !important; }
                .custom-presentation .katex { font-size: 1.8rem !important; }
                .custom-presentation .katex-display { margin: 2rem 0 !important; }
              \`}</style>
              <MarkdownRenderer content={presentationSlides[currentSlide]} />
            </div>
          </div>
          
          <div className="bg-slate-800 p-6 flex items-center justify-center gap-8 border-t border-slate-700">`;

content = content.replace(badText, goodText);
fs.writeFileSync('src/pages/ExerciseSolver.tsx', content);
