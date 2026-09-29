const fs = require('fs');
let content = fs.readFileSync('src/pages/StudentExamView.tsx', 'utf8');

// Imports
content = content.replace(
  "import { apiFetch } from '../lib/apiFetch';",
  "import { apiFetch } from '../lib/apiFetch';\nimport LZString from 'lz-string';\nimport { Clock, Copy } from 'lucide-react';"
);

// Props
content = content.replace(
  "export function StudentExamView({ examId }: { examId: string }) {",
  "export function StudentExamView({ examId, examRawData }: { examId?: string, examRawData?: string }) {"
);

// State for timer
content = content.replace(
  "const [score, setScore] = useState(0);",
  "const [score, setScore] = useState(0);\n  const [timeLeft, setTimeLeft] = useState<number | null>(null);\n  const [timeSpent, setTimeSpent] = useState<number>(0);"
);

// Fetching Logic
content = content.replace(
  "apiFetch(`/api/exams/${examId}`)",
  `if (examRawData) {
      try {
        const decompressed = LZString.decompressFromEncodedURIComponent(examRawData);
        if (decompressed) {
          const data = JSON.parse(decompressed);
          setExamData(data);
          if (data.codes && data.codes.length > 0) {
            const randomCode = data.codes[Math.floor(Math.random() * data.codes.length)].code;
            setSelectedCode(randomCode);
          }
          setLoading(false);
          return;
        } else {
          throw new Error("Dữ liệu đề thi không hợp lệ.");
        }
      } catch (e) {
        setError("Lỗi tải đề thi: " + e.message);
        setLoading(false);
        return;
      }
    }
    
    if (examId) {
      apiFetch(\`/api/exams/\${examId}\`)`
);

content = content.replace(
  ".finally(() => setLoading(false));\n  }, [examId]);",
  ".finally(() => setLoading(false));\n    }\n  }, [examId, examRawData]);"
);

// Timer effect
content = content.replace(
  "if (loading) return",
  `useEffect(() => {
    let timer: any;
    if (isStarted && !isSubmitted && timeLeft !== null && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => (prev !== null && prev > 0) ? prev - 1 : 0);
        setTimeSpent(prev => prev + 1);
      }, 1000);
    } else if (timeLeft === 0 && !isSubmitted) {
      handleSubmit();
      alert("Đã hết thời gian làm bài! Hệ thống tự động nộp bài.");
    }
    return () => clearInterval(timer);
  }, [isStarted, isSubmitted, timeLeft]);

  if (loading) return`
);

// Start Exam - initialize timer
content = content.replace(
  "onClick={() => setIsStarted(true)}",
  `onClick={() => {
              setIsStarted(true);
              if (examData?.examData?.duration) {
                const mins = parseInt(examData.examData.duration);
                if (!isNaN(mins)) setTimeLeft(mins * 60);
              }
            }}`
);

// Timer UI in Header
content = content.replace(
  "</div>\n          {!isSubmitted && (",
  `</div>
          {isStarted && !isSubmitted && timeLeft !== null && (
            <div className="flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-lg font-bold border border-amber-200">
              <Clock className="w-5 h-5" />
              <span>{Math.floor(timeLeft / 60).toString().padStart(2, '0')}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
            </div>
          )}
          {!isSubmitted && (`
);

// Copy result button
content = content.replace(
  "<p className=\"text-slate-600\">Bạn đã hoàn thành bài kiểm tra. Xem chi tiết đáp án bên dưới.</p>",
  `<p className="text-slate-600 mb-4">Bạn đã hoàn thành bài kiểm tra. Xem chi tiết đáp án bên dưới.</p>
            <button onClick={() => {
              const txt = \`Học sinh: \${studentInfo.name} - Lớp: \${studentInfo.class}\\nĐã hoàn thành Đề: \${examData.examData.examName}\\nMã đề: \${currentExam.code}\\nĐiểm số: \${score.toFixed(1)}/10\\nThời gian làm bài: \${Math.floor(timeSpent/60)} phút \${timeSpent%60} giây\`;
              navigator.clipboard.writeText(txt);
              alert("Đã sao chép kết quả! Bạn có thể gửi cho Giáo viên qua Zalo.");
            }} className="px-6 py-2 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-700 inline-flex items-center gap-2">
               <Copy className="w-4 h-4" /> Sao chép Kết quả gửi GV
            </button>`
);

fs.writeFileSync('src/pages/StudentExamView.tsx', content);
console.log("Patched src/pages/StudentExamView.tsx");
