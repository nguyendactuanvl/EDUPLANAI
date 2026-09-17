import { apiFetch } from '../lib/apiFetch';
import { GDPT_2018_SUBJECTS } from '../lib/subjects';
import LZString from 'lz-string';
import { exportHtmlToWord } from "../lib/exportUtils";
import { useState, useRef, useEffect } from "react";
import { Sparkles, Save, BookOpen, Download, AlertCircle, Edit3, Eye, Printer, Share2, Copy } from "lucide-react";
import { MarkdownRenderer } from "../components/MarkdownRenderer";
import { ErrorBoundary } from "../components/ErrorBoundary";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import { saveToHistory, getHistory } from '../lib/history';
import { HistoryItem } from '../types';
import { cn } from "../lib/utils";
import { Presentation } from "lucide-react";
import { printElement } from '../lib/print';


export function Worksheets() {
  const [selectedGrade, setSelectedGrade] = useState<number>(10);
  const [customLessonName, setCustomLessonName] = useState("");
  const [subject, setSubject] = useState("Toán");
  const [worksheetType, setWorksheetType] = useState("Kết hợp trắc nghiệm và tự luận");
  
  const [suggestion, setSuggestion] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  
  useEffect(() => {
    setHistoryItems(getHistory().filter(item => item.type === 'PHT'));
  }, []);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingInteractive, setIsGeneratingInteractive] = useState(false);
  const [shareLink, setShareLink] = useState("");
  const [error, setError] = useState<string | null>(null);
  
  const exportRef = useRef<HTMLDivElement>(null);

  const subjects = GDPT_2018_SUBJECTS;
  const worksheetTypes = [
    "Đề 3 phần (12 câu TN nhiều lựa chọn; 4 câu Đ/S; 6 câu TL ngắn)",
    "Đề 4 phần (12 câu TN; 2 câu Đ/S; 4 câu TL ngắn; 3 câu Tự luận)",
    "Kết hợp trắc nghiệm và tự luận",
    "Chỉ trắc nghiệm khách quan",
    "Chỉ tự luận",
    "Bài tập thực hành / Dự án nhỏ"
  ];

  
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
          examName: examData.examName || `Phiếu bài tập: ${customLessonName}`,
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
      
      // 3. Share it via URL encoded data
      const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(payload));
      const url = `${window.location.origin}/?examData=${compressed}`;
      setShareLink(url);
      
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Không thể tạo phiếu bài tập tương tác lúc này.");
    } finally {
      setIsGeneratingInteractive(false);
    }
  };


  const handleGenerate = async () => {
    if (!customLessonName) {
      setError("Vui lòng nhập tên bài học hoặc chủ đề.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setSuggestion("");
    
    try {
      const response = await apiFetch('/api/generate-worksheet', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          
        },
        body: JSON.stringify({
          lesson: customLessonName,
          subject: subject,
          grade: selectedGrade,
          type: worksheetType
        })
      });

      if (!response.ok) {
        let errorMsg = "Lỗi khi kết nối với AI (API trả về lỗi).";
        try {
          const text = await response.text();
          try {
             const errorData = JSON.parse(text);
             errorMsg = errorData.error || errorMsg;
          } catch(e) {
             if (response.status === 503 || response.status === 504 || response.status === 502) {
                errorMsg = "Hệ thống đang quá tải hoặc hết thời gian chờ. Vui lòng thử lại sau.";
             } else {
                errorMsg = `Lỗi hệ thống (${response.status}): Không thể kết nối với máy chủ.`;
             }
          }
        } catch (e) {
          // ignore
        }
        throw new Error(errorMsg);
      }

      const text = await response.text();
      let data;
      try { 
        data = JSON.parse(text); 
      } catch(e) { 
        if (text.includes("SERVER_ERROR:")) {
            const match = text.match(/SERVER_ERROR: (.*)"/);
            throw new Error(match ? match[1] : "Lỗi từ máy chủ AI.");
        }
        throw new Error(`Lỗi phản hồi từ máy chủ (không phải JSON). Chi tiết: ${text ? text.substring(0, 150) : ""}`); 
      }
      setSuggestion(data.result);
      
      // Save to history
      saveToHistory({
        type: "PHT",
        grade: selectedGrade,
        subject: subject,
        lessonName: customLessonName,
        content: data.result
      });
      setHistoryItems(getHistory().filter(item => item.type === 'PHT'));
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Không thể tạo phiếu học tập lúc này. Vui lòng thử lại sau.");
    } finally {
      setIsLoading(false);
    }
  };

  
  

  
  const handleExportPDF = () => {
    printElement(exportRef.current, "Tai_lieu");
  };

  const handleExportWord = () => {
    if (isEditing) {
      if (window.confirm("Bạn đang ở chế độ chỉnh sửa (hiển thị mã Markdown). Bạn có muốn chuyển sang chế độ Xem trước để xuất file đẹp hơn không?")) {
        setIsEditing(false);
        setTimeout(() => {
          if (exportRef.current) {
            exportHtmlToWord(exportRef.current, `PhieuHocTap_${customLessonName.replace(/\s+/g, '_')}.doc`);
          }
        }, 500);
      } else {
        alert("Vui lòng chuyển sang chế độ 'Xem trước' (con mắt) trước khi tải xuống.");
      }
      return;
    }

    if (exportRef.current) {
      exportHtmlToWord(exportRef.current, `PhieuHocTap_${customLessonName.replace(/\s+/g, '_')}.doc`);
    }
  };

  const handleExportWordLatex = () => {
    if (isEditing) {
      alert("Vui lòng chuyển sang chế độ 'Xem trước' (con mắt) trước khi tải xuống.");
      return;
    }
    if (exportRef.current) {
      exportHtmlToWord(exportRef.current, `PhieuHocTap_${customLessonName.replace(/\s+/g, '_')}_LaTeX.doc`, true);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-full bg-slate-50 overflow-hidden">
      {/* Left Sidebar - Settings */}
      <div className="w-full lg:w-[400px] lg:border-r border-b lg:border-b-0 border-slate-200 bg-white flex flex-col h-[50vh] lg:h-full overflow-hidden shrink-0">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-600" />
            Phiếu học tập
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Tạo phiếu bài tập, tóm tắt kiến thức cho học sinh
          </p>
        </div>

        {historyItems.length > 0 && (
          <div className="p-4 border-b border-slate-200 bg-white">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Lịch sử đã tạo
            </label>
            <select
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              onChange={(e) => {
                if (e.target.value) {
                  const item = historyItems.find(h => h.id === e.target.value);
                  if (item) {
                    setSuggestion(item.content);
                    setCustomLessonName(item.lessonName);
                    if (item.subject) setSubject(item.subject);
                    if (item.grade) setSelectedGrade(item.grade);
                  }
                }
              }}
            >
              <option value="">-- Chọn phiếu học tập đã tạo --</option>
              {historyItems.map(item => (
                <option key={item.id} value={item.id}>
                  {new Date(item.createdAt).toLocaleDateString('vi-VN')} - {item.lessonName}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Môn học
              </label>
              <select
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              >
                {subjects.map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Khối lớp
              </label>
              <select 
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(Number(e.target.value))}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(g => (
                  <option key={g} value={g}>Lớp {g}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Bài học / Chủ đề
              </label>
              <input
                type="text"
                placeholder="Nhập tên bài hoặc chủ đề..."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                value={customLessonName}
                onChange={(e) => setCustomLessonName(e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Hình thức bài tập
              </label>
              <select
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                value={worksheetType}
                onChange={(e) => setWorksheetType(e.target.value)}
              >
                {worksheetTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50">
          
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

          {error && (
            <div className="mt-3 p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>

      {/* Right Content - Preview */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-200 bg-white flex justify-between items-center shrink-0 h-[73px]">
          <h2 className="text-lg font-bold text-slate-800">
            Kết quả hiển thị
          </h2>
          <div className="flex gap-2">
            {suggestion && (
              <>
                <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 mr-2">
                  <button
                    onClick={() => setIsEditing(false)}
                    className={cn(
                      "px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5",
                      !isEditing ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    <Eye className="w-4 h-4" /> Xem trước
                  </button>
                  <button
                    onClick={() => setIsEditing(true)}
                    className={cn(
                      "px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5",
                      isEditing ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    <Edit3 className="w-4 h-4" /> Chỉnh sửa
                  </button>
                </div>
                <button
                  onClick={handleExportWord}
                  className={cn(
                    "px-4 py-2 text-white font-medium rounded-lg flex items-center gap-2 shadow-sm transition-colors",
                    isEditing ? "bg-slate-400 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700"
                  )}
                  title={isEditing ? "Chuyển sang chế độ xem trước để tải xuống" : ""}
                >
                  <Download className="w-4 h-4" /> Xuất Word
                </button>
                <button
                  onClick={handleExportWordLatex}
                  className={cn(
                    "px-4 py-2 text-white font-medium rounded-lg flex items-center gap-2 shadow-sm transition-colors",
                    isEditing ? "bg-slate-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                  )}
                  title={isEditing ? "Chuyển sang chế độ xem trước để tải xuống" : "Xuất Word giữ nguyên mã LaTeX để dùng chức năng Toggle TeX của MathType"}
                >
                  <Download className="w-4 h-4" /> Xuất Word (LaTeX)
                </button>
                

              </>
            )}
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto bg-slate-100 p-8">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-emerald-700 font-medium">Đang tạo nội dung...</p>
              <p className="text-slate-500 text-sm max-w-sm text-center">
                AI đang xử lý yêu cầu. Thời gian có thể mất khoảng 10-30 giây tùy thuộc vào độ phức tạp của bài học.
              </p>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto">
              {suggestion ? (
                isEditing ? (
                  <textarea
                    className="w-full h-[70vh] min-h-[500px] p-6 border border-slate-300 rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none font-mono text-sm bg-white"
                    value={suggestion}
                    onChange={(e) => setSuggestion(e.target.value)}
                  />
                ) : (
                  <div className="bg-white p-8 md:p-12 shadow-sm border border-slate-200 rounded-xl min-h-[500px]">
                    <div ref={exportRef}>
                      <ErrorBoundary><MarkdownRenderer content={suggestion} /></ErrorBoundary>
                    </div>
                  </div>
                )
              ) : (
                <div className="h-full min-h-[500px] flex flex-col items-center justify-center text-slate-400 bg-white/50 rounded-xl border border-dashed border-slate-300">
                  <BookOpen className="w-16 h-16 mb-4 opacity-20" />
                  <p className="text-lg font-medium">Kết quả sẽ hiển thị ở đây</p>
                  <p className="text-sm mt-2 text-slate-500">Điền thông tin và nhấn "Tạo phiếu học tập" để bắt đầu</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
