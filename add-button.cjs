const fs = require('fs');
let content = fs.readFileSync('src/pages/Worksheets.tsx', 'utf8');

// Add the state for share link and new loading state
content = content.replace(
  'const [isLoading, setIsLoading] = useState(false);',
  'const [isLoading, setIsLoading] = useState(false);\n  const [isGeneratingInteractive, setIsGeneratingInteractive] = useState(false);\n  const [shareLink, setShareLink] = useState("");'
);

// Add the import for apiFetch if not already imported (wait it is imported at the top)
// But we need the lucide-react icons, let's see if Share2, Link are available
content = content.replace(
  'import { FileText, Sparkles, Printer, Eye, Edit3, AlertCircle } from "lucide-react";',
  'import { FileText, Sparkles, Printer, Eye, Edit3, AlertCircle, Share2, Copy } from "lucide-react";'
);

// Add the handleGenerateInteractive function
const interactiveFunc = `
  const handleGenerateInteractive = async () => {
    if (!customLessonName) {
      setError("Vui lòng nhập tên bài học / chủ đề.");
      return;
    }
    
    setIsGeneratingInteractive(true);
    setError(null);
    setShareLink("");
    
    try {
      // 1. Generate Interactive Worksheet JSON
      const response = await apiFetch('/api/generate-interactive-worksheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lesson: customLessonName,
          subject: subject,
          grade: selectedGrade,
          type: worksheetType
        })
      });

      if (!response.ok) {
        throw new Error("Lỗi khi tạo phiếu bài tập tương tác.");
      }

      const examData = await response.json();
      
      // 2. Wrap it for the StudentExamView
      const payload = {
        examData: {
          examName: examData.examName || \`Phiếu bài tập: \${customLessonName}\`,
          subject: subject,
          grade: selectedGrade,
        },
        codes: [
          {
            code: "PHT_01",
            questions: examData.questions
          }
        ]
      };
      
      // 3. Share it
      const shareRes = await apiFetch('/api/exams/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!shareRes.ok) throw new Error("Lỗi khi tạo link chia sẻ.");
      const shareData = await shareRes.json();
      
      const url = new URL(window.location.href);
      url.pathname = \`/student-exam/\${shareData.examId}\`;
      url.search = ''; // clear query params
      setShareLink(url.toString());
      
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Không thể tạo phiếu bài tập tương tác lúc này.");
    } finally {
      setIsGeneratingInteractive(false);
    }
  };
`;

content = content.replace(
  'const handleGenerate = async () => {',
  interactiveFunc + '\n\n  const handleGenerate = async () => {'
);

// Add the button to UI
const buttonsUI = `
          <div className="flex gap-2">
            <button
              onClick={handleGenerate}
              disabled={isLoading || isGeneratingInteractive || !customLessonName}
              className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-lg shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Đang tạo bản In...</span>
                </>
              ) : (
                <>
                  <Printer className="w-5 h-5" />
                  <span>Tạo bản Word/In</span>
                </>
              )}
            </button>

            <button
              onClick={handleGenerateInteractive}
              disabled={isLoading || isGeneratingInteractive || !customLessonName}
              className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
            >
              {isGeneratingInteractive ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <Share2 className="w-5 h-5" />
                  <span>Tạo Link Làm Online</span>
                </>
              )}
            </button>
          </div>
          
          {shareLink && (
            <div className="mt-4 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
              <p className="text-sm font-medium text-emerald-800 mb-2">Đã tạo link làm bài online thành công!</p>
              <div className="flex gap-2">
                <input type="text" readOnly value={shareLink} className="flex-1 bg-white border border-emerald-200 rounded-md px-3 py-2 text-sm text-emerald-700 font-medium" />
                <button onClick={() => {navigator.clipboard.writeText(shareLink); alert('Đã copy!');}} className="px-3 py-2 bg-emerald-600 text-white text-sm rounded-md hover:bg-emerald-700 shrink-0">
                  <Copy className="w-4 h-4" />
                </button>
                <a href={shareLink} target="_blank" rel="noreferrer" className="px-3 py-2 bg-slate-800 text-white text-sm rounded-md hover:bg-slate-700 shrink-0 flex items-center">
                  Mở
                </a>
              </div>
            </div>
          )}
`;

// Replace the old button block
content = content.replace(
  /<button[\s\S]*?onClick=\{handleGenerate\}[\s\S]*?<\/button>/,
  buttonsUI
);

fs.writeFileSync('src/pages/Worksheets.tsx', content);
