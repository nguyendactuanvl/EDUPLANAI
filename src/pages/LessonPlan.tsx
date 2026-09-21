import { apiFetch } from '../lib/apiFetch';
import { GDPT_2018_SUBJECTS } from '../lib/subjects';
import { exportHtmlToWord } from '../lib/exportUtils';
import { useState, useEffect, useMemo, useRef } from "react";
import { Sparkles, Save, BookOpen, Download, AlertCircle, Upload, Edit3, Eye, Presentation } from "lucide-react";
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
import { parseApiResponse } from '../lib/utils';


export function LessonPlan() {
  const [activeTab, setActiveTab] = useState<"system" | "upload" | "upgrade">("system");
  const [selectedGrade, setSelectedGrade] = useState<number>(10);
  const [selectedLessonId, setSelectedLessonId] = useState<string>("");
  
  const [customLessonName, setCustomLessonName] = useState("");
  const [customPeriods, setCustomPeriods] = useState<number>(2);
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

  // Find the fully selected lesson object with fallback to first available lesson
  const selectedLesson = useMemo(() => {
    if (!selectedLessonId) {
      return availableLessons.length > 0 ? availableLessons[0] : null;
    }
    return availableLessons.find(p => p.id === selectedLessonId) || (availableLessons.length > 0 ? availableLessons[0] : null);
  }, [selectedLessonId, availableLessons]);

  // Set the first lesson as default when changing grades or subjects
  useEffect(() => {
    if (availableLessons.length > 0) {
      if (!selectedLessonId || !availableLessons.some(l => l.id === selectedLessonId)) {
        setSelectedLessonId(availableLessons[0].id);
      }
    } else {
      setSelectedLessonId("");
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

  const executePlanGeneration = async (payload: any, endpoint = '/api/generate-lesson-plan', lessonDisplayName = "") => {
    setIsLoading(true);
    setError(null);
    setSuggestion("");
    
    try {
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
        } catch (e) {}
        throw new Error(errorMsg);
      }

      const text = await response.text();
      const data = parseApiResponse<{ result: string }>(text);
      setSuggestion(data.result);
      
      // Save to history
      try {
        saveToHistory({
          type: "KHBD",
          grade: payload.grade || selectedGrade,
          subject: payload.subject || subject,
          lessonName: lessonDisplayName || payload.lesson || "Kế hoạch bài dạy",
          content: data.result
        });
      } catch (saveErr) {
        console.warn("Could not save to history:", saveErr);
      }
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

  const generateLessonPlan = async () => {
    let endpoint = '/api/generate-lesson-plan';
    let payload: any = {};
    let displayName = "";

    if (activeTab === "system") {
      if (selectedLesson) {
        displayName = selectedLesson.lesson;
        payload = {
          lesson: selectedLesson.lesson,
          requirement: selectedLesson.requirement,
          digitalComp: selectedLesson.digitalComp,
          aiComp: selectedLesson.aiComp,
          stem: selectedLesson.stem,
          grade: selectedLesson.grade || selectedGrade,
          periods: selectedLesson.periods || customPeriods || 2,
          subject: subject,
          textbook: selectedTextbook?.name || "Kết nối tri thức với cuộc sống"
        };
      } else if (customLessonName.trim()) {
        displayName = customLessonName.trim();
        payload = {
          lesson: customLessonName.trim(),
          requirement: "",
          digitalComp: "Ứng dụng phần mềm và học liệu số tương tác",
          aiComp: "Sử dụng AI hỗ trợ học sinh phân tích, phản biện",
          stem: "Gắn liền thực tiễn và định hướng STEM",
          grade: selectedGrade,
          periods: customPeriods || 2,
          subject: subject,
          textbook: selectedTextbook?.name || "Kết nối tri thức với cuộc sống"
        };
      } else {
        setError("Vui lòng chọn bài học từ danh sách hoặc nhập tên bài học cần soạn.");
        return;
      }
    } else if (activeTab === "upload") {
      if (!customLessonName.trim() && uploadedFiles.length === 0) {
        setError("Vui lòng nhập tên bài học hoặc tải lên tệp Kế hoạch giáo dục để AI soạn bài.");
        return;
      }
      endpoint = '/api/generate-lesson-plan-file';
      displayName = customLessonName.trim() || (uploadedFiles[0]?.name?.replace(/\.[^/.]+$/, "") || "Bài học");
      payload = {
        lesson: displayName,
        subject: subject,
        grade: selectedGrade,
        periods: customPeriods || 2,
        textbook: selectedTextbook?.name || "Kết nối tri thức với cuộc sống",
        files: uploadedFiles
      };
    } else if (activeTab === "upgrade") {
      if (!customLessonName.trim() && uploadedFiles.length === 0) {
        setError("Vui lòng nhập tên bài học hoặc tải lên file Giáo án cũ cần nâng cấp.");
        return;
      }
      endpoint = '/api/upgrade-lesson-plan';
      displayName = customLessonName.trim() || (uploadedFiles[0]?.name?.replace(/\.[^/.]+$/, "") || "Bài học");
      payload = {
        lesson: displayName,
        subject: subject,
        grade: selectedGrade,
        periods: customPeriods || 2,
        files: uploadedFiles
      };
    }

    await executePlanGeneration(payload, endpoint, displayName);
  };

  const handleDemoClick = () => {
    setSubject("Toán");
    setSelectedGrade(10);
    setActiveTab("system");
    executePlanGeneration({
      lesson: "Hệ bất phương trình bậc nhất hai ẩn",
      grade: 10,
      periods: 2,
      subject: "Toán",
      requirement: "Nhận biết bất phương trình và hệ bất phương trình bậc nhất hai ẩn; Biểu diễn miền nghiệm của hệ bất phương trình bậc nhất hai ẩn trên mặt phẳng toạ độ; Vận dụng giải quyết một số bài toán thực tế.",
      digitalComp: "Sử dụng GeoGebra biểu diễn miền nghiệm của hệ bất phương trình",
      aiComp: "Sử dụng AI (ChatGPT/Gemini) gợi ý các tình huống thực tế tối ưu hóa kinh tế",
      stem: "Bài toán thực tiễn lập kế hoạch sản xuất kinh doanh đạt lợi nhuận cao nhất",
      textbook: selectedTextbook?.name || "Kết nối tri thức với cuộc sống"
    }, '/api/generate-lesson-plan', "Hệ bất phương trình bậc nhất hai ẩn");
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
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {availableLessons.length > 0 ? "Chọn Bài học từ Kế hoạch" : "Nhập tên Bài học cần soạn"}
              </label>
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
                <div className="space-y-3">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg">
                    Chương trình mẫu chưa có sẵn bài học cho môn <b>{subject}</b> (Lớp {selectedGrade}). Thầy/Cô hãy nhập tên bài học bên dưới để AI tự động soạn giáo án chi tiết chuẩn CV 5512:
                  </div>
                  <input 
                    type="text" 
                    placeholder="VD: Bài 1: Mệnh đề / Khái niệm về hàm số..."
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white text-sm"
                    value={customLessonName}
                    onChange={(e) => setCustomLessonName(e.target.value)}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Số tiết</label>
                      <input 
                        type="number" 
                        min={1}
                        max={10}
                        value={customPeriods}
                        onChange={(e) => setCustomPeriods(Number(e.target.value) || 2)}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Tích hợp STEM</label>
                      <select 
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white text-sm"
                        defaultValue="Tích hợp STEM thực tiễn"
                      >
                        <option value="Tích hợp STEM thực tiễn">Có STEM</option>
                        <option value="Không">Không</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {selectedLesson && availableLessons.length > 0 && (
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
          onClick={handleDemoClick}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors mt-2 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Sparkles className="h-5 w-5" />
          Demo Soạn Giáo án BPT/HPT
        </button>
        <button 
          onClick={generateLessonPlan}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed mt-2 shadow-sm cursor-pointer"
        >
          <Sparkles className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
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
