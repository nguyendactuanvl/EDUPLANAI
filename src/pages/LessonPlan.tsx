import { apiFetch } from '../lib/apiFetch';
import { GDPT_2018_SUBJECTS } from '../lib/subjects';
import { exportHtmlToWord } from '../lib/exportUtils';
import { useState, useEffect, useMemo, useRef } from "react";
import { Sparkles, Save, BookOpen, Download, AlertCircle, Upload, Edit3, Eye, Presentation } from "lucide-react";
import pptxgen from "pptxgenjs";
import { fullPlan } from "../data/mockData";
import { MarkdownRenderer } from "../components/MarkdownRenderer";
import { ErrorBoundary } from "../components/ErrorBoundary";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import { saveToHistory } from '../lib/history';
import { TextbookManager } from '../components/TextbookManager';
import { Textbook } from '../lib/textbooks';
import { printElement } from '../lib/print';


export function LessonPlan() {
  const [activeTab, setActiveTab] = useState<"system" | "upload" | "upgrade">("system");
  const [selectedGrade, setSelectedGrade] = useState<number>(10);
  const [selectedLessonId, setSelectedLessonId] = useState<string>("");
  
  const [customLessonName, setCustomLessonName] = useState("");
  const [subject, setSubject] = useState("Toán");
  const [uploadedFiles, setUploadedFiles] = useState<{data: string, type: string, name: string}[]>([]);
  
  
  const [suggestion, setSuggestion] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTextbook, setSelectedTextbook] = useState<Textbook | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  // Filter lessons by selected grade
  const availableLessons = useMemo(() => {
    return fullPlan.filter(plan => plan.grade === selectedGrade && (plan.subject === subject || (!plan.subject && subject === "Toán")));
  }, [selectedGrade, subject]);

  // Find the fully selected lesson object
  const selectedLesson = useMemo(() => {
    if (!selectedLessonId) return null;
    return availableLessons.find(p => p.id === selectedLessonId) || null;
  }, [selectedLessonId, availableLessons]);

  // Set the first lesson as default when changing grades
  useEffect(() => {
    if (availableLessons.length > 0 && (!selectedLessonId || !availableLessons.find(l => l.id === selectedLessonId))) {
      setSelectedLessonId(availableLessons[0].id);
    }
  }, [availableLessons, selectedLessonId]);
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setError(null);
      const filesArray = Array.from(e.target.files);
      filesArray.forEach(file => {
        const fileType = file.type || '';
        const validTypes = ['application/pdf', 'text/plain', 'text/csv', 'text/html', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (!validTypes.includes(fileType) && !file.name.match(/\.(pdf|txt|csv|html|doc|docx)$/i)) {
          alert(`File "${file.name}" không được hỗ trợ. Trí tuệ nhân tạo (AI) hiện tại chỉ đọc được định dạng PDF, TXT, CSV, HTML, DOC, DOCX.`);
          return;
        }
        let mimeType = fileType;
        if (!mimeType) {
          if (file.name.toLowerCase().endsWith('.pdf')) mimeType = 'application/pdf';
          else mimeType = 'text/plain';
        }
        
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64 = event.target?.result?.toString().split(',')[1];
          if (base64) {
            setUploadedFiles(prev => [...prev, {
              data: base64,
              type: mimeType,
              name: file.name
            }]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const generateLessonPlan = async () => {
    if (activeTab === "system" && !selectedLesson) return;
    if (activeTab === "upload" && (!customLessonName.trim())) {
      setError("Vui lòng nhập tên bài học và tải lên file Kế hoạch giáo dục.");
      return;
    }
    if (activeTab === "upgrade" && (!customLessonName.trim() || uploadedFiles.length === 0)) {
      setError("Vui lòng nhập tên bài học và tải lên file Giáo án cũ cần nâng cấp.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setSuggestion("");
    
    try {
      let endpoint = '/api/generate-lesson-plan';
      let payload: any = {};
      
      if (activeTab === "system") {
        payload = {
          lesson: selectedLesson!.lesson,
          requirement: selectedLesson!.requirement,
          digitalComp: selectedLesson!.digitalComp,
          aiComp: selectedLesson!.aiComp,
          stem: selectedLesson!.stem,
          grade: selectedLesson!.grade,
          periods: selectedLesson!.periods,
          subject: subject,
          textbook: selectedTextbook?.name || "Kết nối tri thức với cuộc sống"
        };
      } else if (activeTab === "upload") {
        endpoint = '/api/generate-lesson-plan-file';
        payload = {
          lesson: customLessonName,
          subject: subject,
          files: uploadedFiles
        };
      } else if (activeTab === "upgrade") {
        endpoint = '/api/upgrade-lesson-plan';
        payload = {
          lesson: customLessonName,
          subject: subject,
          files: uploadedFiles
        };
      }
      
      const response = await apiFetch(endpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          
        },
        body: JSON.stringify(payload)
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
      try { data = JSON.parse(text); } catch(e) { throw new Error(`Lỗi phản hồi từ máy chủ (không phải JSON). Chi tiết: ${text ? text.substring(0, 150) : ""}`); }
      setSuggestion(data.result);
      
      // Save to history
      saveToHistory({
        type: "KHBD",
        grade: activeTab === "system" && selectedLesson ? selectedLesson.grade : 0,
        subject: subject,
        lessonName: activeTab === "system" && selectedLesson ? selectedLesson.lesson : customLessonName,
        content: data.result
      });
    } catch (err: any) {
      console.error(err);
      let errorMsg = err.message || "";
      if (errorMsg.includes("429") || errorMsg.includes("quota") || errorMsg.includes("RESOURCE_EXHAUSTED")) {
        errorMsg = "Hệ thống đang quá tải hoặc tạm thời không khả dụng do nhu cầu cao. Vui lòng thử lại sau ít phút hoặc sử dụng API Key cá nhân.";
      } else if (errorMsg.includes('{"error":')) {
        try {
          const parsed = JSON.parse(errorMsg);
          errorMsg = parsed.error?.message || "Có lỗi xảy ra khi xử lý file";
        } catch {
          errorMsg = "Có lỗi xảy ra trong quá trình tạo tài liệu. Vui lòng thử lại.";
        }
      }
      setError(errorMsg || "Không thể soạn giáo án lúc này. Vui lòng thử lại sau.");
    } finally {
      setIsLoading(false);
    }
  };

  
  const handleExportPPTX = async () => {
    if (!suggestion) return;
    
    setIsLoading(true);
    try {
      const pres = new pptxgen();
      const sections = suggestion.split(/\n(?=##? )/g);
      
      const coverSlide = pres.addSlide();
      coverSlide.addText(customLessonName || selectedLesson?.lesson || "Bài giảng", { x: 1, y: 2, w: 8, h: 1, fontSize: 36, bold: true, align: 'center', color: '059669' });
      coverSlide.addText("Môn: " + subject, { x: 1, y: 3, w: 8, h: 1, fontSize: 24, align: 'center', color: '475569' });
      
      for (const section of sections) {
        if (!section.trim()) continue;
        const lines = section.split('\n');
        let title = "";
        let bullets = [];
        let currentText = "";
        
        for (const line of lines) {
          if (line.startsWith('#')) {
            if (currentText) bullets.push(currentText);
            currentText = "";
            title = line.replace(/^#+\s*/, '').replace(/\*\*/g, '');
          } else if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
            if (currentText) bullets.push(currentText);
            currentText = line.replace(/^[\-\*]\s*/, '').replace(/\*\*/g, '');
          } else if (line.trim()) {
            let cleanLine = line.replace(/\*\*/g, '').replace(/\|/g, '').trim();
            if (cleanLine && !cleanLine.startsWith(':---')) {
               currentText += (currentText ? "\n" : "") + cleanLine;
            }
          }
        }
        if (currentText) bullets.push(currentText);
        
        const chunkSize = 5;
        for (let i = 0; i < bullets.length; i += chunkSize) {
            const slideBullets = bullets.slice(i, i + chunkSize);
            const slide = pres.addSlide();
            const cleanTitle = title.replace(/\$/g, '');
            slide.addText(cleanTitle || "Nội dung", { x: 0.5, y: 0.5, w: 9, h: 0.8, fontSize: 28, bold: true, color: '0f172a' });
            
            const bulletItems = slideBullets.map(b => ({
              text: b.replace(/\$[^\$]+\$/g, '(Công thức)').substring(0, 300) + (b.length > 300 ? '...' : ''), 
              options: { bullet: true, fontSize: 18, color: '334155' }
            }));
            
            if (bulletItems.length > 0) {
              slide.addText(bulletItems, { x: 0.5, y: 1.5, w: 9, h: 3.5, valign: 'top' });
            }
        }
      }
      
      const fileName = customLessonName || selectedLesson?.lesson || "BaiGiang";
      await pres.writeFile({ fileName: `BaiGiang_${fileName.replace(/\s+/g, '_')}.pptx` });
    } catch (error) {
      console.error("Export PPTX error", error);
      alert("Có lỗi xảy ra khi xuất file PowerPoint");
    } finally {
      setIsLoading(false);
    }
  };

  
  const handleExportPDF = () => {
    printElement(exportRef.current, "Tai_lieu");
  };

  const handleExportWord = () => {
    if (!suggestion || !exportRef.current) {
      if (isEditing) {
        alert("Vui lòng tắt chế độ chỉnh sửa (ấn biểu tượng Con mắt) để lưu tệp Word có định dạng đầy đủ.");
      }
      return;
    }
    exportHtmlToWord(exportRef.current, `GiaoAn_${(activeTab === 'system' && selectedLesson ? selectedLesson.lesson : customLessonName).replace(/\s+/g, '_')}.doc`);
  };

  const handleExportWordLatex = () => {
    if (!suggestion || !exportRef.current) {
      if (isEditing) {
        alert("Vui lòng tắt chế độ chỉnh sửa (ấn biểu tượng Con mắt) để lưu tệp Word có định dạng đầy đủ.");
      }
      return;
    }
    exportHtmlToWord(exportRef.current, `GiaoAn_${(activeTab === 'system' && selectedLesson ? selectedLesson.lesson : customLessonName).replace(/\s+/g, '_')}_LaTeX.doc`, true);
  };

  return (
    <div className="flex-1 bg-slate-50 min-h-screen p-4 lg:p-8 flex flex-col lg:flex-row gap-4 lg:gap-8 overflow-y-auto">
      <div className="w-full lg:w-1/3 bg-white p-4 lg:p-6 rounded-xl border border-slate-200 shadow-sm self-start flex flex-col gap-6 shrink-0">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-emerald-600" />
          Soạn Kế hoạch Bài dạy
        </h2>
        
        <TextbookManager onSelect={setSelectedTextbook} selectedId={selectedTextbook?.id || ""} />

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Môn học</label>
          <select 
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none mb-4 bg-white"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          >
            {GDPT_2018_SUBJECTS.map(sub => (<option key={sub} value={sub}>{sub}</option>))}
          </select>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button 
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'system' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
            onClick={() => setActiveTab('system')}
          >
            Hệ thống
          </button>
          <button 
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'upload' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
            onClick={() => setActiveTab('upload')}
          >
            Tải Kế hoạch
          </button>
          <button 
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'upgrade' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
            onClick={() => setActiveTab('upgrade')}
          >
            Nâng cấp Giáo án
          </button>
        </div>

        {activeTab === 'system' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cấp học</label>
              <select 
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(Number(e.target.value))}
              >
                <option value={1}>Lớp 1</option>
                <option value={2}>Lớp 2</option>
                <option value={3}>Lớp 3</option>
                <option value={4}>Lớp 4</option>
                <option value={5}>Lớp 5</option>
                <option value={6}>Lớp 6</option>
                <option value={7}>Lớp 7</option>
                <option value={8}>Lớp 8</option>
                <option value={9}>Lớp 9</option>
                <option value={10}>Lớp 10</option>
                <option value={11}>Lớp 11</option>
                <option value={12}>Lớp 12</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Chọn Bài học từ Kế hoạch</label>
              {availableLessons.length > 0 ? (
                <select 
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                  value={selectedLessonId}
                  onChange={(e) => setSelectedLessonId(e.target.value)}
                >
                  {availableLessons.map(lesson => (
                    <option key={lesson.id} value={lesson.id}>
                      Bài {lesson.stt}: {lesson.lesson.length > 50 ? lesson.lesson.substring(0, 50) + '...' : lesson.lesson}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-lg">
                  Hệ thống hiện tại chỉ tích hợp sẵn Kế hoạch mẫu cho một số môn học phổ biến. 
                  <br/>Với các lớp/môn khác, vui lòng chuyển sang tab <b>"Từ tệp tải lên"</b> để AI đọc bài từ file Kế hoạch dạy học của bạn hoặc gõ thủ công.
                </div>
              )}
            </div>

            {selectedLesson && (
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 text-sm space-y-3">
                <h3 className="font-semibold text-slate-800 border-b border-slate-200 pb-2">Thông tin bài học:</h3>
                <p><span className="font-medium text-slate-700">Tên bài:</span> <span className="text-slate-800">{selectedLesson.lesson}</span></p>
                <p><span className="font-medium text-slate-700">Số tiết:</span> <span className="text-slate-800">{selectedLesson.periods}</span></p>
                <p><span className="font-medium text-slate-700">Yêu cầu cần đạt:</span> <span className="text-slate-600">{selectedLesson.requirement}</span></p>
                
                <div className="pt-2">
                  <span className="font-medium text-blue-700 block mb-1">Năng lực số:</span> 
                  <span className="text-slate-600">{selectedLesson.digitalComp || "Không có"}</span>
                </div>
                
                <div>
                  <span className="font-medium text-purple-700 block mb-1">Năng lực AI:</span> 
                  <span className="text-slate-600">{selectedLesson.aiComp || "Không có"}</span>
                </div>
                
                <div>
                  <span className="font-medium text-emerald-700 block mb-1">Tích hợp STEM/STEAM:</span> 
                  <span className="text-slate-600">{selectedLesson.stem || "Không có"}</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Môn học</label>
              <select 
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none mb-4 bg-white"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              >
                {GDPT_2018_SUBJECTS.map(sub => (<option key={sub} value={sub}>{sub}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{activeTab === 'upgrade' ? 'Tên bài học cần nâng cấp' : 'Tên bài học cần soạn'}</label>
              <input 
                type="text" 
                placeholder="VD: Bài 1: Mệnh đề..."
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                value={customLessonName}
                onChange={(e) => setCustomLessonName(e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{activeTab === 'upgrade' ? 'Tải lên giáo án cũ cần nâng cấp' : 'Tải lên tệp Kế hoạch giáo dục'}</label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 rounded-lg p-6 flex flex-col items-center justify-center text-slate-500 hover:bg-slate-50 hover:border-emerald-400 hover:text-emerald-600 transition-colors cursor-pointer"
              >
                <Upload className="w-8 h-8 mb-2" />
                <span className="text-sm font-medium text-center">
                  Nhấn để tải lên tài liệu {activeTab === 'upgrade' ? 'Giáo án cũ' : 'tham khảo (Sách, Văn bản...)'} <br/> ({uploadedFiles.length} tệp đã chọn)
                </span>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={handleFileUpload}
                  accept=".pdf,.txt,.csv,.html,.doc,.docx"
                  multiple
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {activeTab === 'upgrade' 
                  ? 'Hệ thống AI sẽ tự động đọc giáo án cũ của bạn và viết lại, bổ sung chi tiết việc ứng dụng công nghệ, năng lực số, và AI vào các hoạt động.'
                  : 'Hệ thống AI sẽ tự động đọc tệp để tìm kiếm các yêu cầu cần đạt, năng lực số, năng lực AI và STEM của bài học bạn yêu cầu.'}
              </p>
              {uploadedFiles.length > 0 && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  {uploadedFiles.map((f, i) => (
                    <span key={i} className="text-xs bg-slate-200 text-slate-700 px-2 py-1 rounded-full flex items-center gap-1">
                      {f.name}
                      <button onClick={(e) => { e.stopPropagation(); setUploadedFiles(prev => prev.filter((_, idx) => idx !== i)); }} className="text-red-500 font-bold ml-1 hover:text-red-700">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        
        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <button 
          onClick={generateLessonPlan}
          disabled={isLoading || (activeTab === "system" ? !selectedLesson : false)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed mt-2 shadow-sm"
        >
          <Sparkles className="h-5 w-5" />
          {isLoading ? (activeTab === 'upgrade' ? "Đang nâng cấp..." : "AI đang soạn bài...") : (activeTab === 'upgrade' ? "Nâng cấp Giáo án (Thêm NLS & AI)" : "Soạn Giáo án chuẩn công văn 5512")}
        </button>
      </div>

      <div className="flex-1 bg-white p-8 rounded-xl border border-slate-200 shadow-sm relative flex flex-col h-[calc(100vh-4rem)]">
        <div className="absolute top-4 right-4 flex gap-2 z-10 bg-white shadow-sm border border-slate-100 rounded-lg p-1">
          {suggestion && (
            <button 
              className={`p-2 rounded-md transition-colors ${isEditing ? 'text-blue-600 bg-blue-50' : 'text-slate-500 hover:text-blue-600 hover:bg-blue-50'}`}
              title={isEditing ? "Xem trước" : "Chỉnh sửa"}
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? <Eye className="h-5 w-5" /> : <Edit3 className="h-5 w-5" />}
            </button>
          )}
          <button 
            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
            title="Lưu trữ"
          >
            <Save className="h-5 w-5" />
          </button>
          <button 
            className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors flex items-center gap-1"
            title="Tải Word (Chuẩn OMML - Word máy tính)"
            onClick={() => { if(exportRef.current) exportHtmlToWord(exportRef.current, `GiaoAn_${(activeTab === 'system' && selectedLesson ? selectedLesson.lesson : customLessonName).replace(/\s+/g, '_')}_OMML.doc`, 'omml'); }}
            disabled={!suggestion}
          >
            <Download className="h-5 w-5" />
            <span className="text-xs font-medium">OMML</span>
          </button>
          <button 
            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors flex items-center gap-1"
            title="Tải Word (Chuẩn MathML - Word Online/Linh hoạt)"
            onClick={() => { if(exportRef.current) exportHtmlToWord(exportRef.current, `GiaoAn_${(activeTab === 'system' && selectedLesson ? selectedLesson.lesson : customLessonName).replace(/\s+/g, '_')}_MathML.doc`, 'mathml'); }}
            disabled={!suggestion}
          >
            <Download className="h-5 w-5" />
            <span className="text-xs font-medium">MathML</span>
          </button>
          <button 
            className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
            title="Xuất PDF"
            onClick={() => handleExportPDF()}
            disabled={!suggestion}
          >
            <span className="text-sm font-bold border-2 border-current px-1 rounded">PDF</span>
          </button>
          <button
            title="Xuất bài giảng PowerPoint"
            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors disabled:opacity-50 flex items-center gap-2"
            onClick={handleExportPPTX}
            disabled={!suggestion}
          >
            <Presentation className="h-5 w-5" /> <span className="text-sm font-medium pr-1">PPTX</span>
          </button>

        </div>
        
        <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar mt-8">
          {suggestion ? (
            isEditing ? (
              <textarea
                className="w-full h-full min-h-[500px] p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none font-mono text-sm"
                value={suggestion}
                onChange={(e) => setSuggestion(e.target.value)}
              />
            ) : (
              <div ref={exportRef} className="markdown-body prose prose-slate max-w-none pb-12 pt-4 prose-headings:text-slate-800 prose-h2:text-2xl prose-h2:border-b prose-h2:pb-2 prose-h3:text-xl prose-a:text-emerald-600 prose-table:border-collapse prose-th:border prose-th:bg-slate-50 prose-td:border prose-td:p-2">
                <ErrorBoundary><MarkdownRenderer content={suggestion} /></ErrorBoundary>
              </div>
            )
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent mb-4"></div>
                  <p className="text-emerald-600 font-medium">Hệ thống AI đang đọc Kế hoạch giáo dục và soạn bài...</p>
                  <p className="text-sm mt-2 text-slate-400">Quá trình này có thể mất 15-20 giây.</p>
                </>
              ) : (
                <>
                  <Sparkles className="h-16 w-16 mb-4 text-slate-200" />
                  <p className="text-lg font-medium text-slate-500">Giáo án AI (Chuẩn CV 5512)</p>
                  <p className="mt-2 text-center max-w-md">Chọn bài học từ danh sách bên trái hoặc tải lên tệp Kế hoạch giáo dục của bạn và nhấn nút Soạn Giáo án để AI tự động tạo kế hoạch bài dạy bám sát các yêu cầu Năng lực số, AI và STEM.</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
