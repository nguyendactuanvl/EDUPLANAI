import { apiFetch } from '../lib/apiFetch';
import { GDPT_2018_SUBJECTS } from '../lib/subjects';
import LZString from 'lz-string';
import { exportHtmlToWord, exportElementToImage } from "../lib/exportUtils";
import React, { useState, useRef, useEffect } from "react";
import { 
  BookOpen, Download, AlertCircle, Edit3, Eye, Printer, Share2, Copy, CheckCircle2, 
  ExternalLink, Upload, FileText, Palette, LayoutTemplate, GitFork, Sparkles, Zap, Image as ImageIcon, Sliders, Check
} from "lucide-react";
import { MarkdownRenderer } from "../components/MarkdownRenderer";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { UploadTeacherExamModal } from "../components/UploadTeacherExamModal";
import { saveToHistory, getHistory } from '../lib/history';
import { HistoryItem } from '../types';
import { cn, parseApiResponse, preProcessMathContent, sanitizeLatexString, fixMath, cleanQuestionStem, cleanOptionText } from "../lib/utils";
import { parseRawExamText } from '../lib/examParser';
import { printElement, ensureMathRendered } from '../lib/print';
import { saveExamToCloud, saveExamToWebhook } from '../lib/cloudExamStore';

export type LayoutStyle = 'a4_print' | 'infographic' | 'poster' | 'mindmap';

interface LayoutStyleOption {
  id: LayoutStyle;
  title: string;
  shortTitle: string;
  badge: string;
  desc: string;
  icon: any;
  activeColor: string;
  badgeBg: string;
}

const LAYOUT_STYLE_OPTIONS: LayoutStyleOption[] = [
  {
    id: 'a4_print',
    title: 'A4 Chuẩn in ấn',
    shortTitle: 'A4 In ấn',
    badge: 'Đen trắng / Tiết kiệm mực',
    desc: 'Bố cục truyền thống, bảng thông tin học sinh, kẻ khung sắc nét, tối ưu trang in giấy học sinh.',
    icon: FileText,
    activeColor: 'border-slate-800 ring-2 ring-slate-800/10 bg-slate-50/80 text-slate-900',
    badgeBg: 'bg-slate-200 text-slate-800'
  },
  {
    id: 'infographic',
    title: 'Infographic / Photographic',
    shortTitle: 'Infographic',
    badge: 'Hình ảnh & Màu sắc hiện đại',
    desc: 'Bố cục dạng thẻ (Card UI), màu sắc trực quan, gợi ý khung hình vẽ thực tế và biểu đồ sinh động.',
    icon: Palette,
    activeColor: 'border-indigo-600 ring-2 ring-indigo-600/15 bg-indigo-50/70 text-indigo-950',
    badgeBg: 'bg-indigo-100 text-indigo-700'
  },
  {
    id: 'poster',
    title: 'Poster tóm tắt tư duy',
    shortTitle: 'Poster tư duy',
    badge: 'Cheat Sheet / Hero Boxes',
    desc: 'Bố cục 1 trang tinh gọn, toàn bộ công thức đóng khung nổi bật, sơ đồ hóa các bước giải toán.',
    icon: LayoutTemplate,
    activeColor: 'border-blue-600 ring-2 ring-blue-600/15 bg-blue-50/70 text-blue-950',
    badgeBg: 'bg-blue-100 text-blue-700'
  },
  {
    id: 'mindmap',
    title: 'Mindmap / Sơ đồ nhánh',
    shortTitle: 'Sơ đồ nhánh',
    badge: 'Cấu trúc cây đa cấp',
    desc: 'Kiến thức phân cấp từ chủ đề trung tâm tỏa ra các nhánh lý thuyết, dạng bài và ví dụ điển hình.',
    icon: GitFork,
    activeColor: 'border-emerald-600 ring-2 ring-emerald-600/15 bg-emerald-50/70 text-emerald-950',
    badgeBg: 'bg-emerald-100 text-emerald-700'
  }
];

export function Worksheets() {
  const [selectedGrade, setSelectedGrade] = useState<number>(10);
  const [customLessonName, setCustomLessonName] = useState("");
  const [subject, setSubject] = useState("Toán");
  const [worksheetType, setWorksheetType] = useState("Kết hợp trắc nghiệm và tự luận");
  const [layoutStyle, setLayoutStyle] = useState<LayoutStyle>('a4_print');

  // Tùy chọn bài tập nâng cao
  const [numMC, setNumMC] = useState<string>("auto");
  const [numEssay, setNumEssay] = useState<string>("auto");
  const [includeRealWorld, setIncludeRealWorld] = useState<boolean>(true);
  const [answerMode, setAnswerMode] = useState<'full' | 'summary' | 'none'>('full');
  
  const [suggestion, setSuggestion] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  
  // Tùy chọn Lời giải chi tiết & Hiển thị
  const [includeDetailedSolution, setIncludeDetailedSolution] = useState<boolean>(true);
  const [showAllSolutions, setShowAllSolutions] = useState<boolean>(false);
  const [openSolutions, setOpenSolutions] = useState<Record<string | number, boolean>>({});
  const [worksheetQuestions, setWorksheetQuestions] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'document' | 'questions'>('document');

  const toggleSolution = (id: string | number) => {
    setOpenSolutions(prev => ({
      ...prev,
      [id]: !(prev[id] !== undefined ? prev[id] : showAllSolutions)
    }));
  };

  const toggleAllSolutions = () => {
    const nextState = !showAllSolutions;
    setShowAllSolutions(nextState);
    const updated: Record<string | number, boolean> = { 'doc-solution': nextState };
    if (worksheetQuestions && worksheetQuestions.length > 0) {
      worksheetQuestions.forEach((q, idx) => {
        updated[q.id || idx + 1] = nextState;
      });
    }
    setOpenSolutions(updated);
  };

  const isSolutionOpen = (id: string | number) => {
    return openSolutions[id] !== undefined ? openSolutions[id] : showAllSolutions;
  };
  
  useEffect(() => {
    setHistoryItems(getHistory().filter(item => item.type === 'PHT'));
  }, []);
  const [isLoading, setIsLoading] = useState(false);
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [isGeneratingInteractive, setIsGeneratingInteractive] = useState(false);
  const [shareLink, setShareLink] = useState("");
  const [isUploadExamModalOpen, setIsUploadExamModalOpen] = useState(false);
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
        headers: {
          'Content-Type': 'text/plain;charset=utf-8', // Dùng text/plain để tránh bị lỗi CORS preflight với Apps Script
        },
        body: JSON.stringify({
          lesson: customLessonName,
          subject: subject,
          grade: selectedGrade,
          type: worksheetType
        }),
        redirect: 'follow', // Bắt buộc để theo dõi chuyển hướng 302 từ Google Script sang Googleusercontent
      });

      if (!response.ok) {
        throw new Error("Lỗi khi tạo phiếu bài tập tương tác.");
      }

      const rawText = await response.text();
      
      // Kiểm tra xem dữ liệu trả về có bị dính HTML không
      if (rawText.trim().startsWith('<') || rawText.includes('<!DOCTYPE html>')) {
        console.error("Server trả về trang HTML thay vì JSON:", rawText);
        throw new Error("Dịch vụ tạo đề tạm thời gián đoạn hoặc API Key chưa được nạp đúng. Vui lòng kiểm tra lại cấu hình API.");
      }

      let examData: any;
      try {
        examData = JSON.parse(rawText);
      } catch (e) {
        console.error("Lỗi parse JSON:", rawText);
        try {
          examData = parseApiResponse(rawText);
        } catch (e2) {
          throw new Error("Phản hồi từ máy chủ không đúng định dạng dữ liệu.");
        }
      }
      
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
      
      // 3. Save to server to obtain short examId
      let examId = '';
      try {
        const shareRes = await apiFetch('/api/exams/share', {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload),
          redirect: 'follow',
        });
        if (shareRes.ok) {
          const shareRaw = await shareRes.text();
          if (!shareRaw.trim().startsWith('<') && !shareRaw.includes('<!DOCTYPE html>')) {
            try {
              const shareJson = JSON.parse(shareRaw);
              if (shareJson.examId) {
                examId = shareJson.examId;
              }
            } catch (e) {}
          }
        }
      } catch (e) {
        console.warn("Share to api failed:", e);
      }

      // Sync to cloud store & Webhook
      if (examId) {
        try {
          await saveExamToCloud(examId, payload);
        } catch (e) {}
      }
      try {
        await saveExamToWebhook({
          action: "saveExam",
          examId: examId || undefined,
          ...payload
        });
      } catch (e) {}

      // Standalone backup full URL with compressed payload
      const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(payload));
      const fullUrl = `${window.location.origin}/?examData=${compressed}`;
      
      // The short base link (around 45 chars)
      const baseShortUrl = examId ? `${window.location.origin}/?examId=${examId}` : fullUrl;

      // 4. Try shortening with URL shorteners (/api/shorten)
      let finalLink = '';
      try {
        const shortRes = await apiFetch('/api/shorten', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: baseShortUrl })
        });
        if (shortRes.ok) {
          const shortJson = await shortRes.json();
          if (shortJson.shortUrl && shortJson.shortUrl.startsWith('http')) {
            finalLink = shortJson.shortUrl;
          }
        }
      } catch (e) {
        console.warn("Shorten service error:", e);
      }

      // If URL shortener returned a link, use it; otherwise use baseShortUrl (examId link)
      if (!finalLink) {
        finalLink = baseShortUrl;
      }
      
      setShareLink(finalLink);
      
      // Cập nhật danh sách câu hỏi để giáo viên kiểm tra lời giải chi tiết trực quan
      const formattedQuestions = (examData.questions || []).map((q: any, idx: number) => ({
        ...q,
        id: q.id || idx + 1,
        solution: (q.solution || q.explanation || "").trim(),
        explanation: (q.explanation || q.solution || "").trim()
      }));
      setWorksheetQuestions(formattedQuestions);
      setViewMode('questions');
      
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
          'Content-Type': 'text/plain;charset=utf-8', // Dùng text/plain để tránh bị lỗi CORS preflight với Apps Script
        },
        body: JSON.stringify({
          lesson: customLessonName,
          subject: subject,
          grade: selectedGrade,
          type: worksheetType,
          layoutStyle: layoutStyle,
          numMC: numMC !== "auto" ? Number(numMC) : undefined,
          numEssay: numEssay !== "auto" ? Number(numEssay) : undefined,
          includeRealWorld: includeRealWorld,
          answerMode: answerMode
        }),
        redirect: 'follow', // Bắt buộc để theo dõi chuyển hướng 302 từ Google Script sang Googleusercontent
      });

      if (!response.ok) {
        let errorMsg = "Lỗi khi kết nối với AI (API trả về lỗi).";
        try {
          const errText = await response.text();
          if (errText.trim().startsWith('<') || errText.includes('<!DOCTYPE html>')) {
            throw new Error("Dịch vụ tạo đề tạm thời gián đoạn hoặc API Key chưa được nạp đúng. Vui lòng kiểm tra lại cấu hình API.");
          }
          try {
             const errorData = JSON.parse(errText);
             errorMsg = errorData.error || errorMsg;
          } catch(e) {
             if (response.status === 503 || response.status === 504 || response.status === 502) {
                errorMsg = "Hệ thống đang quá tải hoặc hết thời gian chờ. Vui lòng thử lại sau.";
             } else {
                errorMsg = `Lỗi hệ thống (${response.status}): Không thể kết nối với máy chủ.`;
             }
          }
        } catch (e: any) {
          if (e.message && e.message.includes("API Key")) throw e;
        }
        throw new Error(errorMsg);
      }

      const rawText = await response.text();
      
      // Kiểm tra xem dữ liệu trả về có bị dính HTML không
      if (rawText.trim().startsWith('<') || rawText.includes('<!DOCTYPE html>')) {
        console.error("Server trả về trang HTML thay vì JSON:", rawText);
        throw new Error("Dịch vụ tạo đề tạm thời gián đoạn hoặc API Key chưa được nạp đúng. Vui lòng kiểm tra lại cấu hình API.");
      }

      let data: any;
      try {
        data = JSON.parse(rawText);
      } catch (e) {
        try {
          data = parseApiResponse<{ result: string }>(rawText);
        } catch (e2) {
          console.error("Lỗi parse JSON:", rawText);
          throw new Error("Phản hồi từ máy chủ không đúng định dạng dữ liệu.");
        }
      }
      const processedResult = preProcessMathContent(data.result);
      setSuggestion(processedResult);
      setViewMode('document');

      // Tự động phân tích các câu hỏi để hiển thị accordion lời giải chi tiết
      try {
        const parsed = parseRawExamText(processedResult);
        if (parsed && parsed.length > 0) {
          setWorksheetQuestions(parsed);
        } else {
          setWorksheetQuestions([]);
        }
      } catch (e) {
        setWorksheetQuestions([]);
      }
      
      // Save to history
      saveToHistory({
        type: "PHT",
        grade: selectedGrade,
        subject: subject,
        lessonName: customLessonName,
        content: processedResult
      });
      setHistoryItems(getHistory().filter(item => item.type === 'PHT'));
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Không thể tạo phiếu học tập lúc này. Vui lòng thử lại sau.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportPNG = async () => {
    if (!exportRef.current) return;
    if (isEditing) {
      alert("Vui lòng chuyển sang chế độ 'Xem trước' (con mắt) trước khi tải ảnh Poster.");
      return;
    }
    setIsExportingImage(true);
    try {
      const cleanTitle = customLessonName ? customLessonName.replace(/\s+/g, '_') : 'PhieuHocTap';
      await exportElementToImage(exportRef.current, `Poster_${cleanTitle}_${layoutStyle}.png`);
    } catch (err) {
      console.error("Lỗi khi tải ảnh Poster:", err);
      alert("Không thể tải ảnh lúc này. Bạn có thể dùng nút 'In / Xuất PDF' để lưu tài liệu.");
    } finally {
      setIsExportingImage(false);
    }
  };

  const handleExportPDF = async () => {
    if (isEditing) {
      alert("Vui lòng chuyển sang chế độ 'Xem trước' (con mắt) trước khi in hoặc xuất PDF.");
      return;
    }
    const cleanTitle = customLessonName ? `PhieuHocTap_${customLessonName.replace(/\s+/g, '_')}` : "PhieuHocTap";
    if (exportRef.current) {
      await ensureMathRendered(exportRef.current);
    }
    printElement(exportRef.current, cleanTitle);
  };

  const handleExportWord = async () => {
    if (isEditing) {
      if (window.confirm("Bạn đang ở chế độ chỉnh sửa (hiển thị mã Markdown). Bạn có muốn chuyển sang chế độ Xem trước để xuất file đẹp hơn không?")) {
        setIsEditing(false);
        setTimeout(async () => {
          if (exportRef.current) {
            await ensureMathRendered(exportRef.current);
            exportHtmlToWord(exportRef.current, `PhieuHocTap_${customLessonName.replace(/\s+/g, '_')}.doc`);
          }
        }, 500);
      } else {
        alert("Vui lòng chuyển sang chế độ 'Xem trước' (con mắt) trước khi tải xuống.");
      }
      return;
    }

    if (exportRef.current) {
      await ensureMathRendered(exportRef.current);
      exportHtmlToWord(exportRef.current, `PhieuHocTap_${customLessonName.replace(/\s+/g, '_')}.doc`);
    }
  };

  const handleExportWordLatex = async () => {
    if (isEditing) {
      alert("Vui lòng chuyển sang chế độ 'Xem trước' (con mắt) trước khi tải xuống.");
      return;
    }
    if (exportRef.current) {
      await ensureMathRendered(exportRef.current);
      exportHtmlToWord(exportRef.current, `PhieuHocTap_${customLessonName.replace(/\s+/g, '_')}_LaTeX.doc`, true);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-full bg-slate-50 lg:overflow-hidden">
      {/* Left Sidebar - Settings */}
      <div className="w-full lg:w-[400px] lg:border-r border-b lg:border-b-0 border-slate-200 bg-white flex flex-col h-auto lg:h-full shrink-0">
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

            {/* Layout Style Selector */}
            <div className="pt-1">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-indigo-600" />
                  Phong cách trình bày (Layout Style)
                </label>
                <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full font-medium border border-indigo-200/60">
                  4 phong cách
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {LAYOUT_STYLE_OPTIONS.map((style) => {
                  const Icon = style.icon;
                  const isSelected = layoutStyle === style.id;
                  return (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => setLayoutStyle(style.id)}
                      className={cn(
                        "relative text-left p-3 rounded-xl border transition-all flex flex-col justify-between group",
                        isSelected
                          ? style.activeColor
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50 text-slate-700 shadow-2xs"
                      )}
                    >
                      <div className="flex items-start justify-between gap-1.5 mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                            isSelected ? "bg-white shadow-xs" : "bg-slate-100 group-hover:bg-white text-slate-600"
                          )}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-bold leading-tight line-clamp-1">
                            {style.title}
                          </span>
                        </div>
                        {isSelected && (
                          <div className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        )}
                      </div>

                      <div className="mt-1">
                        <span className={cn(
                          "inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md mb-1 border border-current/20",
                          style.badgeBg
                        )}>
                          {style.badge}
                        </span>
                        <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                          {style.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Advanced Exercise & Answer Settings */}
            <div className="pt-2 border-t border-slate-200/80">
              <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <Sliders className="w-3.5 h-3.5 text-slate-500" />
                  <span>Tùy biến câu hỏi & Đáp án</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Số câu trắc nghiệm
                    </label>
                    <select
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                      value={numMC}
                      onChange={(e) => setNumMC(e.target.value)}
                    >
                      <option value="auto">Tự động (Khuyên dùng)</option>
                      <option value="4">4 câu trắc nghiệm</option>
                      <option value="8">8 câu trắc nghiệm</option>
                      <option value="12">12 câu trắc nghiệm</option>
                      <option value="16">16 câu trắc nghiệm</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Số câu tự luận
                    </label>
                    <select
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                      value={numEssay}
                      onChange={(e) => setNumEssay(e.target.value)}
                    >
                      <option value="auto">Tự động</option>
                      <option value="0">0 câu (Không có)</option>
                      <option value="2">2 câu tự luận</option>
                      <option value="3">3 câu tự luận</option>
                      <option value="4">4 câu tự luận</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Chế độ đáp án
                  </label>
                  <select
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    value={answerMode}
                    onChange={(e) => setAnswerMode(e.target.value as any)}
                  >
                    <option value="full">Đầy đủ lời giải & hướng dẫn chấm chi tiết</option>
                    <option value="summary">Chỉ kèm bảng đáp án nhanh / kết số</option>
                    <option value="none">Không kèm đáp án (cho học sinh làm bài)</option>
                  </select>
                </div>

                <label className="flex items-center gap-2 cursor-pointer pt-0.5">
                  <input
                    type="checkbox"
                    checked={includeRealWorld}
                    onChange={(e) => setIncludeRealWorld(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                  />
                  <span className="text-xs text-slate-700 font-medium">
                    Ưu tiên bài toán liên hệ thực tế cuộc sống
                  </span>
                </label>
              </div>
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

          <div className="mt-2.5">
            <button
              onClick={() => setIsUploadExamModalOpen(true)}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all hover:shadow"
              title="Tải đề Word/PDF/Text của giáo viên lên để tạo link làm online kèm sửa lỗi"
            >
              <Upload className="w-4 h-4" />
              <span>Tải đề của tôi lên (Word/PDF/Text)</span>
            </button>
          </div>
          
          {shareLink && (
            <div className="mt-4 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  Link online cho học sinh (đã rút gọn):
                </span>
                <span className="text-xs text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-medium">
                  Gửi qua Zalo / Facebook
                </span>
              </div>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  readOnly 
                  value={shareLink} 
                  className="flex-1 bg-white border border-emerald-300 rounded-lg px-3 py-2 text-sm text-emerald-800 font-semibold shadow-inner focus:outline-none select-all" 
                />
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(shareLink); 
                    alert('Đã sao chép link!\nCô có thể dán trực tiếp vào nhóm Zalo/Facebook để học sinh làm bài ngay.');
                  }} 
                  className="px-3.5 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 shrink-0 flex items-center gap-1.5 transition-colors"
                >
                  <Copy className="w-4 h-4" /> Sao chép
                </button>
                <a 
                  href={shareLink} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="px-3.5 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 shrink-0 flex items-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" /> Mở thử
                </a>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                💡 Link ngắn gọn, học sinh mở trực tiếp trên điện thoại/máy tính mà không bị lỗi đứt link.
              </p>
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
      <div className="flex-1 flex flex-col min-h-screen lg:min-h-0 lg:overflow-hidden">
        <div className="p-3.5 sm:p-4 border-b border-slate-200 bg-white flex flex-wrap justify-between items-center gap-2.5 shrink-0 min-h-[73px]">
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-800">
              Kết quả hiển thị
            </h2>

            {/* Quick Layout Style Switcher Pills */}
            <div className="hidden sm:flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
              {LAYOUT_STYLE_OPTIONS.map((style) => (
                <button
                  key={style.id}
                  onClick={() => setLayoutStyle(style.id)}
                  className={cn(
                    "px-2.5 py-1 rounded-md font-medium transition-all",
                    layoutStyle === style.id
                      ? "bg-white text-slate-900 shadow-2xs font-bold"
                      : "text-slate-500 hover:text-slate-800"
                  )}
                  title={style.desc}
                >
                  {style.shortTitle}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(suggestion || worksheetQuestions.length > 0) && (
              <>
                {suggestion && worksheetQuestions.length > 0 && (
                  <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
                    <button
                      onClick={() => setViewMode('document')}
                      className={cn(
                        "px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1",
                        viewMode === 'document' ? "bg-white text-emerald-700 shadow-xs font-bold" : "text-slate-500 hover:text-slate-700"
                      )}
                    >
                      <FileText className="w-3.5 h-3.5" /> Bản in phiếu
                    </button>
                    <button
                      onClick={() => setViewMode('questions')}
                      className={cn(
                        "px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1",
                        viewMode === 'questions' ? "bg-white text-emerald-700 shadow-xs font-bold" : "text-slate-500 hover:text-slate-700"
                      )}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Chi tiết câu hỏi ({worksheetQuestions.length})
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={toggleAllSolutions}
                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                  title="Bật/Tắt hiển thị lời giải chi tiết cho tất cả câu hỏi"
                >
                  <span>{showAllSolutions ? "🙈 Ẩn tất cả lời giải" : "👁️ Hiện tất cả lời giải"}</span>
                </button>

                {viewMode === 'document' && suggestion && (
                  <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                    <button
                      onClick={() => setIsEditing(false)}
                      className={cn(
                        "px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors flex items-center gap-1.5",
                        !isEditing ? "bg-white text-emerald-700 shadow-xs" : "text-slate-500 hover:text-slate-700"
                      )}
                    >
                      <Eye className="w-4 h-4" /> Xem trước
                    </button>
                    <button
                      onClick={() => setIsEditing(true)}
                      className={cn(
                        "px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors flex items-center gap-1.5",
                        isEditing ? "bg-white text-emerald-700 shadow-xs" : "text-slate-500 hover:text-slate-700"
                      )}
                    >
                      <Edit3 className="w-4 h-4" /> Chỉnh sửa
                    </button>
                  </div>
                )}

                {/* Export Poster Image (PNG) */}
                <button
                  onClick={handleExportPNG}
                  disabled={isExportingImage}
                  className={cn(
                    "px-3.5 py-1.5 sm:py-2 text-white text-xs sm:text-sm font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors",
                    isEditing ? "bg-slate-400 cursor-not-allowed" : "bg-purple-600 hover:bg-purple-700 active:bg-purple-800"
                  )}
                  title="Tải ảnh Poster sắc nét (PNG) để chia sẻ Zalo/Facebook hoặc in màu"
                >
                  {isExportingImage ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Đang tạo ảnh...</span>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-4 h-4" />
                      <span>Tải ảnh Poster (PNG)</span>
                    </>
                  )}
                </button>

                {/* Export PDF / In */}
                <button
                  onClick={handleExportPDF}
                  className={cn(
                    "px-3.5 py-1.5 sm:py-2 text-white text-xs sm:text-sm font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors",
                    isEditing ? "bg-slate-400 cursor-not-allowed" : "bg-slate-700 hover:bg-slate-800"
                  )}
                  title="In trực tiếp hoặc Lưu file PDF chuẩn A4/A3"
                >
                  <Printer className="w-4 h-4" />
                  <span>In / PDF</span>
                </button>

                {/* Export Word */}
                <button
                  onClick={handleExportWord}
                  className={cn(
                    "px-3.5 py-1.5 sm:py-2 text-white text-xs sm:text-sm font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors",
                    isEditing ? "bg-slate-400 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700"
                  )}
                  title={isEditing ? "Chuyển sang chế độ xem trước để tải xuống" : "Xuất file Word .docx chuẩn font và bảng biểu"}
                >
                  <Download className="w-4 h-4" />
                  <span>Xuất Word</span>
                </button>

                <button
                  onClick={handleExportWordLatex}
                  className={cn(
                    "hidden xl:flex px-3.5 py-1.5 sm:py-2 text-white text-xs sm:text-sm font-semibold rounded-lg items-center gap-1.5 shadow-xs transition-colors",
                    isEditing ? "bg-slate-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                  )}
                  title={isEditing ? "Chuyển sang chế độ xem trước để tải xuống" : "Xuất Word giữ nguyên mã LaTeX để dùng chức năng Toggle TeX của MathType"}
                >
                  <Download className="w-4 h-4" />
                  <span>Word (LaTeX)</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Tùy chọn In & Xuất file: Kèm lời giải (Bản GV) vs Không kèm lời giải (Bản HS) */}
        {(suggestion || worksheetQuestions.length > 0) && (
          <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex flex-wrap items-center gap-4 text-xs shrink-0">
            <span className="font-bold text-slate-700 flex items-center gap-1">
              📄 Chế độ In & Xuất file:
            </span>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="worksheet-solution-mode"
                checked={includeDetailedSolution}
                onChange={() => setIncludeDetailedSolution(true)}
                className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="font-bold text-emerald-800">
                Kèm theo lời giải chi tiết (Bản dành cho Giáo viên)
              </span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="worksheet-solution-mode"
                checked={!includeDetailedSolution}
                onChange={() => setIncludeDetailedSolution(false)}
                className="w-4 h-4 text-slate-600 focus:ring-slate-500"
              />
              <span className="font-medium text-slate-600">
                Không kèm lời giải chi tiết (Bản dành cho Học sinh)
              </span>
            </label>
          </div>
        )}
        
        <div className="flex-1 overflow-y-auto bg-slate-100 p-4 sm:p-8">
          {isLoading ? (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-emerald-700 font-bold text-base">Đang khởi tạo phiếu học tập phong cách {LAYOUT_STYLE_OPTIONS.find(s => s.id === layoutStyle)?.title}...</p>
              <p className="text-slate-500 text-sm max-w-sm text-center">
                AI đang cấu trúc hóa kiến thức trọng tâm, bài toán thực tế và lời giải chi tiết. Vui lòng đợi trong giây lát...
              </p>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto">
              {(() => {
                const SOLUTION_DELIMITER_REGEX = /(?:\n\s*---+\s*(?:HƯỚNG DẪN CHẤM|ĐÁP ÁN CHI TIẾT|LỜI GIẢI CHI TIẾT|HƯỚNG DẪN GIẢI)[^\n]*---+\s*\n|\n\s*#{1,3}\s*(?:HƯỚNG DẪN CHẤM|ĐÁP ÁN CHI TIẾT|LỜI GIẢI CHI TIẾT|HƯỚNG DẪN GIẢI)\b[^\n]*\n)/i;
                const delimiterMatch = suggestion ? suggestion.match(SOLUTION_DELIMITER_REGEX) : null;
                const mainDocContent = delimiterMatch && delimiterMatch.index !== undefined ? suggestion.substring(0, delimiterMatch.index).trim() : suggestion;
                const solutionDocContent = delimiterMatch && delimiterMatch.index !== undefined ? suggestion.substring(delimiterMatch.index).trim() : "";

                if (viewMode === 'questions' && worksheetQuestions.length > 0) {
                  return (
                    <div 
                      ref={exportRef}
                      className="bg-white p-8 md:p-12 shadow-sm border border-slate-300 rounded-xl min-h-[500px] font-serif text-slate-900 max-w-[210mm] mx-auto space-y-6"
                    >
                      {/* School Exam Header for A4 Print */}
                      <div className="border border-slate-800 mb-6 p-4 bg-white text-xs sm:text-sm text-slate-800 leading-normal">
                        <div className="grid grid-cols-2 gap-4 pb-3 border-b border-dashed border-slate-400">
                          <div>
                            <p className="font-semibold uppercase tracking-wider text-[11px] sm:text-xs">TRƯỜNG THPT / THCS: ................................................</p>
                            <p className="mt-1 font-semibold">LỚP: ............................ KHỐI: {selectedGrade}</p>
                            <p className="mt-1 font-semibold">HỌ VÀ TÊN: ..............................................................</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold uppercase text-slate-900 tracking-wide">PHIẾU BÀI TẬP: {customLessonName || "BÀI HỌC"}</p>
                            <p className="mt-1 text-slate-700">Môn: {subject} | Lớp {selectedGrade}</p>
                            <p className="mt-1 text-slate-600">Ngày: ...... / ...... / 202...</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-12 gap-2 pt-2.5 items-center">
                          <div className="col-span-3 border border-slate-700 p-2 text-center rounded bg-slate-50">
                            <span className="font-bold block text-[11px] uppercase text-slate-700">ĐIỂM SỐ</span>
                            <span className="text-sm sm:text-base text-slate-400 italic">......... / 10</span>
                          </div>
                          <div className="col-span-9 pl-2">
                            <span className="font-semibold block text-slate-800">Lời phê & nhận xét của Thầy / Cô:</span>
                            <p className="border-b border-dotted border-slate-400 mt-2 h-4"></p>
                          </div>
                        </div>
                      </div>

                      {/* Questions List with Accordion Toggle for Detailed Solution */}
                      <div className="space-y-6">
                        {worksheetQuestions.map((q, idx) => (
                          <div key={idx} className="pb-4 border-b border-slate-200 last:border-0">
                            <div className="font-medium text-slate-800 mb-3 flex items-start gap-2">
                              <span className="font-bold whitespace-nowrap mt-1">Câu {idx + 1}:</span>
                              <MarkdownRenderer className="markdown-body inline-block" content={cleanQuestionStem(q.content || (q as any).question || '', q.options, q.tfStatements)} />
                              {q.level && <span className="text-xs text-emerald-600 font-normal mt-1 shrink-0">[{q.level}]</span>}
                            </div>

                            {/* TF */}
                            {q.type === 'tf' && q.tfStatements && (
                              <div className="flex flex-col gap-2 pl-4 mb-3">
                                {q.tfStatements.map((stmt: any, sIdx: number) => (
                                  <div key={sIdx} className="flex items-start gap-1 p-2 rounded-md bg-slate-50 border border-slate-200 text-sm">
                                    <span className="shrink-0 font-medium">{['a)', 'b)', 'c)', 'd)'][sIdx] || String.fromCharCode(97 + sIdx) + ')'}</span>
                                    <span className="flex-1"><MarkdownRenderer className="markdown-body inline-block" content={fixMath(stmt.statement || '')} /></span>
                                    {includeDetailedSolution && (
                                      <span className={`shrink-0 font-bold px-2 rounded text-xs ${stmt.correct ? 'text-emerald-700 bg-emerald-100' : 'text-red-700 bg-red-100'}`}>
                                        {stmt.correct ? 'Đ' : 'S'}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* MC */}
                            {q.type === 'mc' && q.options && (() => {
                              const cleanedOpts = q.options.map((opt: string) => cleanOptionText(opt));
                              return (
                                <div className="w-full space-y-2 pl-2 mt-2 mb-3">
                                  {cleanedOpts.map((opt: string, oIdx: number) => (
                                    <div key={oIdx} className={cn(
                                      "w-full min-h-[38px] flex items-center px-4 py-2 text-left rounded-lg border text-sm break-words overflow-hidden",
                                      includeDetailedSolution && oIdx === q.correctOptionIndex
                                        ? "bg-emerald-50 border-emerald-300 font-medium text-emerald-950"
                                        : "bg-slate-50/50 border-slate-200/80 text-slate-800"
                                    )}>
                                      <span className="shrink-0 font-semibold select-none min-w-[1.75rem]">{String.fromCharCode(65 + oIdx)}.</span>
                                      <span className="flex-1 break-words overflow-hidden"><MarkdownRenderer className="markdown-body inline-block" content={fixMath(opt)} /></span>
                                    </div>
                                  ))}
                                </div>
                              );
                            })()}

                            {/* Short Answer / Essay answer */}
                            {q.type !== 'mc' && q.type !== 'tf' && q.correctAnswer && includeDetailedSolution && (
                              <div className="mt-2 pl-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm">
                                <span className="font-semibold text-emerald-800">Đáp án:</span> <MarkdownRenderer className="markdown-body inline-block" content={fixMath(q.correctAnswer || '')} />
                              </div>
                            )}

                            {/* Lời giải chi tiết - Accordion toggle trên màn hình */}
                            <div className="mt-3 pl-2 no-print">
                              <button
                                type="button"
                                onClick={() => toggleSolution(q.id || idx + 1)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 transition-colors cursor-pointer"
                              >
                                <span>{isSolutionOpen(q.id || idx + 1) ? "🙈 Ẩn lời giải" : "💡 Xem lời giải chi tiết"}</span>
                              </button>

                              {isSolutionOpen(q.id || idx + 1) && (
                                <div 
                                  style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px', marginTop: '8px' }}
                                  className="text-slate-800 text-sm leading-relaxed"
                                >
                                  <div className="font-bold text-slate-900 mb-1.5 flex items-center gap-1.5">
                                    <span>💡 Lời giải chi tiết:</span>
                                  </div>
                                  <div className="text-slate-800">
                                    <MarkdownRenderer content={fixMath(q.solution || q.explanation || "Chưa có lời giải chi tiết cho câu hỏi này.")} />
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Lời giải chi tiết - Kèm theo khi In và Xuất Word (Bản Giáo viên) */}
                            {includeDetailedSolution && (q.solution || q.explanation) && (
                              <div 
                                className="only-print"
                                style={{ 
                                  backgroundColor: '#f8fafc', 
                                  border: '1px solid #cbd5e1', 
                                  borderRadius: '6px', 
                                  padding: '8pt 10pt', 
                                  marginTop: '6pt', 
                                  marginBottom: '8pt',
                                  pageBreakInside: 'avoid'
                                }}
                              >
                                <div style={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '3pt', fontSize: '11pt' }}>
                                  💡 Lời giải chi tiết:
                                </div>
                                <div style={{ fontSize: '11pt', color: '#1e293b' }}>
                                  <MarkdownRenderer className="markdown-body inline-block" content={fixMath(q.solution || q.explanation || '')} />
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }

                if (suggestion) {
                  return isEditing ? (
                    <textarea
                      className="w-full h-[70vh] min-h-[500px] p-6 border border-slate-300 rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none font-mono text-sm bg-white"
                      value={suggestion}
                      onChange={(e) => setSuggestion(e.target.value)}
                    />
                  ) : (
                    /* Preview Canvas Container Styled by LayoutStyle */
                    <div 
                      ref={exportRef}
                      className={cn(
                        "transition-all duration-300",
                        layoutStyle === 'a4_print' && "bg-white p-8 md:p-12 shadow-sm border border-slate-300 rounded-xl min-h-[500px] font-serif text-slate-900 max-w-[210mm] mx-auto",
                        layoutStyle === 'infographic' && "bg-gradient-to-b from-sky-50/40 via-white to-indigo-50/30 p-6 md:p-10 shadow-md border-2 border-indigo-200/80 rounded-2xl min-h-[500px]",
                        layoutStyle === 'poster' && "bg-white p-6 md:p-10 shadow-xl border-4 border-indigo-500/80 rounded-3xl min-h-[500px]",
                        layoutStyle === 'mindmap' && "bg-slate-50/80 p-6 md:p-10 shadow-md border-2 border-emerald-300/80 rounded-2xl min-h-[500px]"
                      )}
                    >
                      {/* 1. Header decor for A4 Chuẩn In Ấn */}
                      {layoutStyle === 'a4_print' && (
                        <div className="border border-slate-800 mb-8 p-4 bg-white text-xs sm:text-sm text-slate-800 leading-normal">
                          <div className="grid grid-cols-2 gap-4 pb-3 border-b border-dashed border-slate-400">
                            <div>
                              <p className="font-semibold uppercase tracking-wider text-[11px] sm:text-xs">TRƯỜNG THPT / THCS: ................................................</p>
                              <p className="mt-1 font-semibold">LỚP: ............................ KHỐI: {selectedGrade}</p>
                              <p className="mt-1 font-semibold">HỌ VÀ TÊN: ..............................................................</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold uppercase text-slate-900 tracking-wide">PHIẾU HỌC TẬP: {customLessonName || "BÀI HỌC"}</p>
                              <p className="mt-1 text-slate-700">Môn: {subject} | Lớp {selectedGrade}</p>
                              <p className="mt-1 text-slate-600">Ngày: ...... / ...... / 202...</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-12 gap-2 pt-2.5 items-center">
                            <div className="col-span-3 border border-slate-700 p-2 text-center rounded bg-slate-50">
                              <span className="font-bold block text-[11px] uppercase text-slate-700">ĐIỂM SỐ</span>
                              <span className="text-sm sm:text-base text-slate-400 italic">......... / 10</span>
                            </div>
                            <div className="col-span-9 pl-2">
                              <span className="font-semibold block text-slate-800">Lời phê & nhận xét của Thầy / Cô:</span>
                              <p className="border-b border-dotted border-slate-400 mt-2 h-4"></p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 2. Header decor for Infographic / Photographic */}
                      {layoutStyle === 'infographic' && (
                        <div className="mb-8">
                          <div className="bg-gradient-to-r from-sky-600 via-indigo-600 to-purple-600 text-white p-6 sm:p-7 rounded-2xl shadow-md relative overflow-hidden">
                            <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-44 h-44 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
                            <div className="flex flex-wrap items-center gap-2 mb-2.5">
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-white/20 backdrop-blur-md text-sky-100 border border-white/20">
                                {subject} • LỚP {selectedGrade}
                              </span>
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-400/20 text-emerald-200 border border-emerald-300/30 flex items-center gap-1">
                                <Sparkles className="w-3.5 h-3.5" /> Infographic Học Tập Trực Quan
                              </span>
                            </div>
                            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white mb-2">
                              {customLessonName || "PHIẾU HỌC TẬP TRỰC QUAN"}
                            </h1>
                            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-indigo-100 font-medium">
                              <span className="flex items-center gap-1 bg-white/15 px-2.5 py-1 rounded-lg backdrop-blur-xs">💡 Ghi nhớ nhanh</span>
                              <span className="flex items-center gap-1 bg-white/15 px-2.5 py-1 rounded-lg backdrop-blur-xs">⚡ Bí kíp thực chiến</span>
                              <span className="flex items-center gap-1 bg-white/15 px-2.5 py-1 rounded-lg backdrop-blur-xs">⚠️ Bẫy sai lầm</span>
                              <span className="flex items-center gap-1 bg-white/15 px-2.5 py-1 rounded-lg backdrop-blur-xs">🎯 Bài tập thực tế</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 3. Header decor for Poster tóm tắt tư duy */}
                      {layoutStyle === 'poster' && (
                        <div className="mb-8">
                          <div className="bg-gradient-to-br from-slate-950 via-indigo-950 to-blue-950 text-white p-7 sm:p-9 rounded-2xl shadow-xl border-2 border-indigo-400/40 relative overflow-hidden">
                            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-52 h-52 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
                            <div className="flex items-center justify-between gap-3 mb-3">
                              <div className="flex items-center gap-2">
                                <span className="px-3 py-1 rounded-full text-xs font-black tracking-widest uppercase bg-amber-400 text-slate-950 shadow-sm flex items-center gap-1">
                                  <Zap className="w-3.5 h-3.5 fill-current" /> CHEAT SHEET TƯ DUY
                                </span>
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-white/10 text-indigo-200 border border-indigo-400/30">
                                  {subject} {selectedGrade}
                                </span>
                              </div>
                              <span className="text-xs text-indigo-300 font-mono hidden sm:inline-block">BẢN TỔNG HỢP CỐT LÕI KHỔ LỚN</span>
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-2 uppercase">
                              {customLessonName || "TỔNG HỢP KIẾN THỨC CỐT LÕI"}
                            </h1>
                            <p className="text-xs sm:text-sm text-indigo-200/90 font-medium max-w-2xl leading-relaxed">
                              Toàn bộ công thức then chốt, quy trình các bước giải toán mẫu và mẹo thực chiến dán góc học tập hoặc lưu điện thoại.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* 4. Header decor for Mindmap / Sơ đồ nhánh */}
                      {layoutStyle === 'mindmap' && (
                        <div className="mb-8 text-center">
                          <div className="inline-flex flex-col items-center bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white px-8 py-5 rounded-2xl shadow-lg border-2 border-emerald-300 ring-4 ring-emerald-100 max-w-2xl mx-auto">
                            <span className="text-xs font-bold tracking-widest uppercase text-emerald-200 mb-1 flex items-center gap-1.5">
                              <GitFork className="w-4 h-4" /> BẢN ĐỒ TƯ DUY & PHÂN NHÁNH
                            </span>
                            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                              🌳 {customLessonName || "CHỦ ĐỀ TRUNG TÂM"}
                            </h1>
                            <span className="text-xs text-emerald-100 mt-1 font-medium">
                              Môn {subject} - Lớp {selectedGrade} • Chuẩn GDPT 2018
                            </span>
                          </div>
                          <div className="flex flex-wrap justify-center items-center gap-2 mt-4 text-xs font-semibold text-emerald-800">
                            <span className="bg-emerald-100/80 px-2.5 py-1 rounded-full border border-emerald-200">🌿 Khái niệm</span>
                            <span className="text-emerald-500">➔</span>
                            <span className="bg-teal-100/80 px-2.5 py-1 rounded-full border border-teal-200">⚡ Công thức</span>
                            <span className="text-emerald-500">➔</span>
                            <span className="bg-cyan-100/80 px-2.5 py-1 rounded-full border border-cyan-200">🎯 Dạng bài</span>
                            <span className="text-emerald-500">➔</span>
                            <span className="bg-amber-100/80 px-2.5 py-1 rounded-full border border-amber-200">⚠️ Bẫy sai lầm</span>
                          </div>
                        </div>
                      )}

                      {/* Content Renderer with Layout-specific typography */}
                      <div className={cn(
                        "prose max-w-none",
                        layoutStyle === 'a4_print' && "prose-slate font-serif [&_h1]:font-serif [&_h2]:font-serif [&_h3]:font-serif [&_table]:border-collapse [&_th]:border [&_th]:border-slate-800 [&_td]:border [&_td]:border-slate-800 leading-relaxed",
                        layoutStyle === 'infographic' && "prose-indigo [&_h2]:bg-indigo-50/80 [&_h2]:text-indigo-950 [&_h2]:p-3.5 [&_h2]:rounded-xl [&_h2]:border-l-4 [&_h2]:border-indigo-600 [&_h2]:shadow-2xs [&_blockquote]:bg-amber-50/80 [&_blockquote]:border-l-4 [&_blockquote]:border-amber-400 [&_blockquote]:p-4 [&_blockquote]:rounded-r-xl [&_blockquote]:text-amber-950 [&_blockquote]:font-medium",
                        layoutStyle === 'poster' && "prose-blue [&_h2]:bg-gradient-to-r [&_h2]:from-slate-900 [&_h2]:to-indigo-900 [&_h2]:text-white [&_h2]:p-3.5 [&_h2]:rounded-xl [&_h2]:font-black [&_blockquote]:bg-blue-50/80 [&_blockquote]:border-l-4 [&_blockquote]:border-blue-600 [&_blockquote]:p-4 [&_blockquote]:rounded-r-xl [&_blockquote]:shadow-2xs",
                        layoutStyle === 'mindmap' && "prose-emerald [&_h2]:bg-emerald-50 [&_h2]:text-emerald-950 [&_h2]:p-3.5 [&_h2]:rounded-xl [&_h2]:border-l-4 [&_h2]:border-emerald-600 [&_h2]:font-bold [&_blockquote]:bg-teal-50 [&_blockquote]:border-l-4 [&_blockquote]:border-teal-500 [&_blockquote]:p-4 [&_blockquote]:rounded-r-xl"
                      )}>
                        <ErrorBoundary>
                          <MarkdownRenderer content={includeDetailedSolution ? suggestion : mainDocContent} />
                        </ErrorBoundary>

                        {/* Document Solution Section Accordion Toggle on Screen */}
                        {includeDetailedSolution && solutionDocContent && (
                          <div className="mt-8 pt-6 border-t border-slate-200 no-print">
                            <button
                              type="button"
                              onClick={() => toggleSolution('doc-solution')}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 transition-colors cursor-pointer shadow-2xs"
                            >
                              <span>{isSolutionOpen('doc-solution') ? "🙈 Ẩn lời giải chi tiết" : "💡 Xem lời giải chi tiết"}</span>
                            </button>

                            {isSolutionOpen('doc-solution') && (
                              <div 
                                style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '16px', marginTop: '10px' }}
                                className="text-slate-800 text-sm leading-relaxed not-prose"
                              >
                                <div className="font-bold text-slate-900 mb-2 flex items-center gap-1.5 text-base">
                                  <span>💡 Lời giải chi tiết & Hướng dẫn chấm:</span>
                                </div>
                                <div className="text-slate-800">
                                  <MarkdownRenderer content={solutionDocContent} />
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="h-full min-h-[500px] flex flex-col items-center justify-center text-slate-400 bg-white/50 rounded-xl border border-dashed border-slate-300 p-8">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4 text-indigo-400">
                      <BookOpen className="w-8 h-8" />
                    </div>
                    <p className="text-lg font-bold text-slate-700">Phiếu học tập sẽ xuất hiện ở đây</p>
                    <p className="text-sm mt-1 text-slate-500 max-w-md text-center">
                      Chọn môn học, chủ đề và phong cách trình bày mong muốn (A4 in ấn, Infographic, Poster tư duy hoặc Sơ đồ nhánh) rồi nhấn "Tạo bản Word/In".
                    </p>
                    <div className="flex flex-wrap justify-center gap-2 mt-4">
                      {LAYOUT_STYLE_OPTIONS.map(s => (
                        <span key={s.id} className="text-xs bg-white px-2.5 py-1 rounded-full border border-slate-200 text-slate-600 font-medium">
                          {s.shortTitle}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Teacher Exam Upload & Edit Modal */}
      <UploadTeacherExamModal
        isOpen={isUploadExamModalOpen}
        onClose={() => setIsUploadExamModalOpen(false)}
        defaultSubject={subject}
        defaultGrade={selectedGrade}
      />
    </div>
  );
}

export default Worksheets;


