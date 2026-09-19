import { MarkdownRenderer } from "../components/MarkdownRenderer";
import { apiFetch } from '../lib/apiFetch';

import { fullPlan } from "../data/mockData";
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import LZString from 'lz-string';
import { Link } from 'lucide-react';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { exportHtmlToWord } from '../lib/exportUtils';
import { fixMath, cleanQuestionStem, parseApiResponse, cleanOptionText, getPublicAppUrl } from '../lib/utils';
import { SAMPLE_MATH_QUESTIONS, SAMPLE_MATH_EXAM_NAME, SAMPLE_MATH_DURATION } from '../data/sampleMathExam';
import { parseRawExamText } from '../lib/examParser';
import { useState, useRef, useEffect } from "react";
import { FileCheck, Sparkles, Shuffle, Download, Share2, Plus, Trash2, Printer, UploadCloud, FileSpreadsheet, FileText, X, ExternalLink, Smartphone, Copy, Check, Edit3, ListPlus } from "lucide-react";

interface Question {
  type?: "mc" | "tf" | "sa" | "essay";
  explanation?: string;
  id: number;
  content: string;
  options?: string[];
  correctOptionIndex?: number;
  correctAnswer?: string;
  tfStatements?: { statement: string; correct: boolean }[];
  level: string;
  topic?: string;
  subtopic?: string;
}

interface MatrixConfig {
  id: string;
  name: string;
  schoolLevel: string;
  subject: string;
  grade: string;
  duration: number;
  examType: string;
  numCodes: number;
  qCounts: any;
  qPoints: any;
  qEnabled: any;
  levels: any;
  outputConfig: any;
  matrix: string;
  customPrompt: string;
  timestamp: number;
}


const MultiPointInput = ({ count, value, onChange, disabled }: { count: number, value: string, onChange: (val: string) => void, disabled: boolean }) => {
  const points = value.split(',').map(s => s.trim()).filter(s => s !== '');
  if (points.length === 0) points.push("1");
  
  // Create an array of length `count`
  const currentPoints = [];
  for (let i = 0; i < count; i++) {
    currentPoints.push(points[i] !== undefined ? points[i] : (points[points.length - 1] || "1"));
  }

  if (count > 0 && count <= 6) {
  
  
  return (
      <div className="flex flex-wrap gap-1 justify-center">
        {currentPoints.map((pt, i) => (
          <input 
            key={i}
            type="text"
            className="w-10 text-center border border-slate-300 rounded py-1 text-xs focus:ring-1 focus:ring-blue-500"
            value={pt}
            disabled={disabled}
            onChange={e => {
              const newPoints = [...currentPoints];
              newPoints[i] = e.target.value;
              onChange(newPoints.join(', '));
            }}
            title={`Điểm câu ${i+1}`}
          />
        ))}
      </div>
    );
  }

  return (
    <input type="text" value={value} onChange={e=>onChange(e.target.value)} disabled={disabled} className="w-full text-center border border-slate-300 rounded py-1.5 text-sm" placeholder="VD: 0.5 hoặc 0.75, 1.0" title="Nhập điểm số (vd: 0.5) hoặc chuỗi (vd: 0.75, 1.0) cho các câu hỏi" />
  );
};

export function ExamGenerator() {
const handleExportCSV = () => {
    if (shuffledExams.length === 0) return;
    let csvContent = "\uFEFF"; // BOM for UTF-8
    csvContent += "Câu," + shuffledExams.map(e => e.code).join(",") + "\n";
    const numQuestions = shuffledExams[0].questions.length;
    for (let i = 0; i < numQuestions; i++) {
        const row: any[] = [i + 1];
        for (const exam of shuffledExams) {
            const q = exam.questions[i];
            let ans = "";
            if (q.type === 'mc') {
                ans = String.fromCharCode(65 + (q.correctOptionIndex || 0));
            } else if (q.type === 'tf' && q.tfStatements) {
                ans = q.tfStatements.map(s => s.correct ? 'D' : 'S').join('');
            } else {
                ans = (q.correctAnswer || '').replace(/<[^>]*>?/gm, '').substring(0, 10);
            }
            row.push(ans);
        }
        csvContent += row.join(",") + "\n";
    }
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Dap_An_${examName.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintBubbleSheet = () => {
    const windowPrint = window.open('', '', 'width=900,height=650');
    if (!windowPrint) return;
    let gridHtml = '';
    for (let col = 0; col < 4; col++) {
      gridHtml += '<div style="flex: 1; min-width: 150px;">';
      for (let row = 1; row <= 10; row++) {
        const num = col * 10 + row;
        gridHtml += `
          <div style="display: flex; align-items: center; margin-bottom: 15px;">
            <span style="width: 35px; font-weight: bold; font-size: 14px;">${num.toString().padStart(2, '0')}.</span>
            ${['A', 'B', 'C', 'D'].map(letter => `
              <div style="width: 26px; height: 26px; border-radius: 50%; border: 1px solid #000; display: flex; align-items: center; justify-content: center; margin: 0 4px; font-size: 12px; font-weight: bold;">
                ${letter}
              </div>
            `).join('')}
          </div>
        `;
      }
      gridHtml += '</div>';
    }
    
    windowPrint.document.write(`
      <html>
        <head>
          <title>Phiếu Tô Trắc Nghiệm</title>
          <style>
            body { font-family: "Times New Roman", Times, serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .title { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
            .info-grid { display: flex; justify-content: space-between; margin-bottom: 40px; border: 1px solid #000; padding: 15px; border-radius: 8px; }
            .info-col { flex: 1; }
            .info-line { border-bottom: 1px dotted #000; display: inline-block; min-width: 200px; margin-left: 5px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">PHIẾU TRẢ LỜI TRẮC NGHIỆM</div>
            <div>Dành cho bài thi trắc nghiệm (Tối đa 40 câu)</div>
          </div>
          <div class="info-grid">
            <div class="info-col">
              <p style="margin: 10px 0;"><strong>Họ và tên:</strong> <span class="info-line" style="min-width: 250px;"></span></p>
              <p style="margin: 10px 0;"><strong>Lớp:</strong> <span class="info-line"></span></p>
            </div>
            <div class="info-col">
              <p style="margin: 10px 0;"><strong>Môn thi:</strong> <span class="info-line"></span></p>
              <p style="margin: 10px 0;"><strong>Mã đề:</strong> <span class="info-line" style="min-width: 100px;"></span></p>
            </div>
          </div>
          <div style="display: flex; gap: 20px; justify-content: space-between;">
            ${gridHtml}
          </div>
        </body>
      </html>
    `);
    windowPrint.document.close();
    windowPrint.focus();
    setTimeout(() => {
      windowPrint.print();
      windowPrint.close();
    }, 250);
  };
  const [activeTab, setActiveTab] = useState<"matrix" | "exam" | "shuffle" | "banks" | "results">("matrix");
  const [examResults, setExamResults] = useState<any[]>([]);

  useEffect(() => {
    if (activeTab === 'results') {
      try {
        const results = JSON.parse(localStorage.getItem('eduplan_exam_results') || '[]');
        // sort by newest first
        results.sort((a: any, b: any) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
        setExamResults(results);
      } catch (e) {
        console.error(e);
      }
    }
  }, [activeTab]);
  const [subject, setSubject] = useState("Toán");
  const [grade, setGrade] = useState("9");
  const [totalQuestions, setTotalQuestions] = useState(20);
  const [matrix, setMatrix] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  
  const [duration, setDuration] = useState(45);
  const [examType, setExamType] = useState("15p"); // 15p, mid, final
  const [qCounts, setQCounts] = useState({ mc: 20, tf: 0, sa: 0, essay: 0 });
  const [schoolLevel, setSchoolLevel] = useState("THCS");
  const [generateMode, setGenerateMode] = useState<"auto" | "from_matrix_file">("auto");
  const [autoDetectStructure, setAutoDetectStructure] = useState(false);
  const [bankQuestions, setBankQuestions] = useState<Question[]>(() => {
    try {
      const saved = localStorage.getItem('question_banks');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  
  const saveToBank = (q: Question) => {
    const updated = [...bankQuestions, {...q, id: Date.now()}];
    setBankQuestions(updated);
    localStorage.setItem('question_banks', JSON.stringify(updated));
    alert("Đã lưu vào ngân hàng câu hỏi!");
  };
  
  const deleteFromBank = (id: number) => {
    const updated = bankQuestions.filter(q => q.id !== id);
    setBankQuestions(updated);
    localStorage.setItem('question_banks', JSON.stringify(updated));
  };
  
  const [bankFilterTopic, setBankFilterTopic] = useState("");
  const [bankFilterLevel, setBankFilterLevel] = useState("");

  const [qPoints, setQPoints] = useState({ mc: "0.25", tf: "0.5", sa: "0.5", essay: "2" });

  const calculatePoints = (ptStr: string | number, count: number) => {
    const str = String(ptStr).trim();
    if (!str.includes(',')) {
      const val = Number(str) || 0;
      return { total: val * count, average: val };
    }
    const parts = str.split(',').map(s => Number(s.trim()) || 0);
    let total = 0;
    for (let i = 0; i < count; i++) {
        total += parts[i] !== undefined ? parts[i] : (parts[parts.length-1] || 0);
    }
    return { total, average: count > 0 ? total / count : 0 };
  };
  const [qEnabled, setQEnabled] = useState({ mc: true, tf: true, sa: true, essay: true });
  const [levels, setLevels] = useState({ nb: 40, th: 30, vd: 20, vdc: 10 });
  const [outputConfig, setOutputConfig] = useState({ answers: true, matrix: true, spec: true, shuffleQuestions: true, shuffleOptions: true, detailedSolution: true });
  
  const [savedConfigs, setSavedConfigs] = useState<MatrixConfig[]>(() => {
    try {
      const saved = localStorage.getItem('matrix_configs');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const saveCurrentConfig = () => {
    const name = prompt("Nhập tên để lưu cấu hình ma trận này (ví dụ: Giữa kì 1 Toán 9):");
    if (!name) return;
    const newConfig: MatrixConfig = {
      id: Date.now().toString(),
      name,
      schoolLevel, subject, grade, duration, examType, numCodes,
      qCounts, qPoints, qEnabled, levels, outputConfig, matrix, customPrompt,
      timestamp: Date.now()
    };
    const updated = [...savedConfigs, newConfig];
    setSavedConfigs(updated);
    localStorage.setItem('matrix_configs', JSON.stringify(updated));
    alert("Đã lưu cấu hình ma trận!");
  };

  const loadConfig = (id: string) => {
    if (!id) return;
    const conf = savedConfigs.find(c => c.id === id);
    if (conf) {
      setSchoolLevel(conf.schoolLevel);
      setSubject(conf.subject);
      setGrade(conf.grade);
      setDuration(conf.duration);
      setExamType(conf.examType);
      setNumCodes(conf.numCodes);
      setQCounts(conf.qCounts);
      setQPoints(conf.qPoints);
      setQEnabled(conf.qEnabled);
      setLevels(conf.levels);
      setOutputConfig(conf.outputConfig);
      setMatrix(conf.matrix);
      setCustomPrompt(conf.customPrompt);
    }
  };

  const deleteConfig = (id: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa cấu hình này?")) {
      const updated = savedConfigs.filter(c => c.id !== id);
      setSavedConfigs(updated);
      localStorage.setItem('matrix_configs', JSON.stringify(updated));
    }
  };

  
  const totalQuestionsCalc = (qEnabled.mc ? qCounts.mc : 0) + (qEnabled.tf ? qCounts.tf : 0) + (qEnabled.sa ? qCounts.sa : 0) + (qEnabled.essay ? qCounts.essay : 0);
  const ptMC = calculatePoints(qPoints.mc, qCounts.mc);
  const ptTF = calculatePoints(qPoints.tf, qCounts.tf);
  const ptSA = calculatePoints(qPoints.sa, qCounts.sa);
  const ptES = calculatePoints(qPoints.essay, qCounts.essay);
  const totalPointsCalc = (qEnabled.mc ? ptMC.total : 0) + (qEnabled.tf ? ptTF.total : 0) + (qEnabled.sa ? ptSA.total : 0) + (qEnabled.essay ? ptES.total : 0);

  const [matrixFile, setMatrixFile] = useState<File | null>(null);
  const [matrixBase64, setMatrixBase64] = useState<string | null>(null);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMatrixFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setMatrixBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const availableTopics = subject.toLowerCase().includes("toán") ? fullPlan.filter(p => p.grade.toString() === grade).map(p => p.lesson) : [];

const [examName, setExamName] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [matrixStructure, setMatrixStructure] = useState<{topic: string, subtopics: string[]}[]>([]);
  const [draggedTopicIdx, setDraggedTopicIdx] = useState<number | null>(null);
  const [draggedSubtopic, setDraggedSubtopic] = useState<{tIdx: number, sIdx: number} | null>(null);

  useEffect(() => {
     const structure: {topic: string, subtopics: string[]}[] = [];
     const topics = Array.from(new Set(questions.map(q => q.topic || 'Chung')));
     for (const t of topics) {
         const subs = Array.from(new Set(questions.filter(q => (q.topic || 'Chung') === t).map(q => q.subtopic || 'Chung')));
         structure.push({ topic: t, subtopics: subs });
     }
     setMatrixStructure(structure);
  }, [questions]);
  const [shuffledExams, setShuffledExams] = useState<{code: string, questions: Question[]}[]>([]);
  const [numCodes, setNumCodes] = useState(4);
  const [shareLink, setShareLink] = useState("");
  const [sharePin, setSharePin] = useState("");
  const [showBubbleSheetModal, setShowBubbleSheetModal] = useState(false);
  const [showAddQuestionModal, setShowAddQuestionModal] = useState(false);
  const [showImportTextModal, setShowImportTextModal] = useState(false);
  const [importRawText, setImportRawText] = useState("");
  const [copiedZalo, setCopiedZalo] = useState(false);
  const [newQuestionType, setNewQuestionType] = useState<"mc" | "tf" | "sa" | "essay">("mc");
  const [newQuestionContent, setNewQuestionContent] = useState("");
  const [newQuestionOptions, setNewQuestionOptions] = useState<string[]>(["", "", "", ""]);
  const [newQuestionCorrectIndex, setNewQuestionCorrectIndex] = useState(0);
  const [newQuestionAnswer, setNewQuestionAnswer] = useState("");
  const [newQuestionExplanation, setNewQuestionExplanation] = useState("");
  const [newQuestionLevel, setNewQuestionLevel] = useState("Nhận biết");
  const [newQuestionTopic, setNewQuestionTopic] = useState("");

  const handleLoadSampleExam = () => {
    setQuestions(SAMPLE_MATH_QUESTIONS as Question[]);
    setExamName(SAMPLE_MATH_EXAM_NAME);
    setDuration(SAMPLE_MATH_DURATION);
    setActiveTab("exam");
  };

  const handleImportText = () => {
    if (!importRawText.trim()) return;
    const parsed = parseRawExamText(importRawText);
    if (parsed.length === 0) {
      alert("Không tìm thấy câu hỏi hợp lệ trong đoạn văn bản. Vui lòng định dạng theo mẫu: Câu 1: ... A. ... B. ... C. ... D. ...");
      return;
    }
    const currentMaxId = questions.reduce((max, q) => Math.max(max, q.id || 0), 0);
    const reindexed = parsed.map((q, idx) => ({ ...q, id: currentMaxId + idx + 1 }));
    setQuestions(prev => [...prev, ...reindexed]);
    setShowImportTextModal(false);
    setImportRawText("");
    setActiveTab("exam");
    alert(`Đã nhập thành công ${parsed.length} câu hỏi vào Đề Gốc!`);
  };

  const handleSaveManualQuestion = () => {
    if (!newQuestionContent.trim()) {
      alert("Vui lòng nhập nội dung câu hỏi.");
      return;
    }

    const maxId = questions.reduce((max, q) => Math.max(max, q.id || 0), 0);
    let createdQ: Question;

    if (newQuestionType === "mc") {
      createdQ = {
        id: maxId + 1,
        type: "mc",
        level: newQuestionLevel,
        topic: newQuestionTopic || "Chung",
        content: fixMath(newQuestionContent),
        options: newQuestionOptions.map(opt => fixMath(cleanOptionText(opt))),
        correctOptionIndex: newQuestionCorrectIndex,
        explanation: newQuestionExplanation ? fixMath(newQuestionExplanation) : undefined
      };
    } else if (newQuestionType === "tf") {
      createdQ = {
        id: maxId + 1,
        type: "tf",
        level: newQuestionLevel,
        topic: newQuestionTopic || "Chung",
        content: fixMath(newQuestionContent),
        tfStatements: [
          { statement: fixMath(newQuestionOptions[0] || "Ý a"), correct: true },
          { statement: fixMath(newQuestionOptions[1] || "Ý b"), correct: false },
          { statement: fixMath(newQuestionOptions[2] || "Ý c"), correct: true },
          { statement: fixMath(newQuestionOptions[3] || "Ý d"), correct: false },
        ],
        explanation: newQuestionExplanation ? fixMath(newQuestionExplanation) : undefined
      };
    } else {
      createdQ = {
        id: maxId + 1,
        type: newQuestionType,
        level: newQuestionLevel,
        topic: newQuestionTopic || "Chung",
        content: fixMath(newQuestionContent),
        correctAnswer: fixMath(newQuestionAnswer),
        explanation: newQuestionExplanation ? fixMath(newQuestionExplanation) : undefined
      };
    }

    setQuestions(prev => [...prev, createdQ]);
    setShowAddQuestionModal(false);
    setNewQuestionContent("");
    setNewQuestionOptions(["", "", "", ""]);
    setNewQuestionAnswer("");
    setNewQuestionExplanation("");
    setActiveTab("exam");
  };

  const getZaloShareMessage = (url: string, pin: string, title?: string) => {
    const publicBase = getPublicAppUrl() || window.location.origin;
    return `📢 THÔNG BÁO BÀI THI ONLINE: ${title || examName}
👉 Link làm bài trực tiếp: ${url}
${pin ? `🔑 Hoặc vào trang: ${publicBase} và nhập Mã phòng thi: ${pin}\n` : ''}
📌 LƯU Ý KHI MỞ TRÊN ZALO (Nếu bị màn hình trắng, báo lỗi hoặc bị chặn):
1. Bấm vào biểu tượng 3 chấm (···) ở góc trên bên phải màn hình Zalo.
2. Chọn "Mở bằng trình duyệt" (Chrome trên Android hoặc Safari trên iPhone).
3. Hoặc mở trực tiếp trình duyệt Chrome/Safari, truy cập ${publicBase} và nhập Mã phòng thi: ${pin || 'đã cấp'} để vào thi ngay!`;
  };

  const applyPresetBGD3Phan = () => {
    setQEnabled({ mc: true, tf: true, sa: true, essay: false });
    setQCounts({ mc: 12, tf: 4, sa: 6, essay: 0 });
    setQPoints({ mc: "0.25", tf: "1", sa: "0.5", essay: "2" });
  };

  
  const applyPresetNguVan = () => {
    setQEnabled({ mc: false, tf: false, sa: true, essay: true });
    setQCounts({ mc: 0, tf: 0, sa: 4, essay: 2 });
    setQPoints({ mc: "0.25", tf: "0.5", sa: "0.75", essay: "2, 5" });
    setSubject("Ngữ Văn");
  };

  const applyPreset4Phan = () => {
    setQEnabled({ mc: true, tf: true, sa: true, essay: true });
    setQCounts({ mc: 12, tf: 2, sa: 4, essay: 3 });
    setQPoints({ mc: "0.25", tf: "1", sa: "0.5", essay: "1" });
  };

  const handleGenerate = async () => {
    if (generateMode === "from_matrix_file" && !matrixBase64) {
      alert("Bạn đã chọn 'Bám sát Ma trận đính kèm' nhưng chưa tải file lên. Vui lòng tải file ma trận lên trước.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    try {
      const activeQCounts = {
        mc: qEnabled.mc ? qCounts.mc : 0,
        tf: qEnabled.tf ? qCounts.tf : 0,
        sa: qEnabled.sa ? qCounts.sa : 0,
        essay: qEnabled.essay ? qCounts.essay : 0
      };

      const advancedPrompt = `
Thang điểm yêu cầu:
${qEnabled.mc ? `- Trắc nghiệm lựa chọn: ${qPoints.mc} điểm/câu` : ""}
${qEnabled.tf ? `- Đúng/Sai: ${qPoints.tf} điểm/câu` : ""}
${qEnabled.sa ? `- Trả lời ngắn: ${qPoints.sa} điểm/câu (nếu nhiều mức điểm thì lấy tuần tự)` : ""}
${qEnabled.essay ? `- Tự luận: ${qPoints.essay} điểm/câu (nếu nhiều mức điểm thì lấy tuần tự)` : ""}

Mức độ nhận thức yêu cầu:
- Nhận biết: ${levels.nb}%
- Thông hiểu: ${levels.th}%
- Vận dụng: ${levels.vd}%
- Vận dụng cao: ${levels.vdc}%

Yêu cầu xuất ra:
${outputConfig.answers ? "- Có đáp án chi tiết." : ""}
${outputConfig.spec ? "- Kèm theo bảng đặc tả." : ""}
${outputConfig.matrix ? "- Kèm theo ma trận đề." : ""}

${customPrompt}
`.trim();

      let finalPrompt = advancedPrompt;
      if (generateMode === "from_matrix_file") {
        finalPrompt += "\n\nYÊU CẦU QUAN TRỌNG: Hãy sử dụng file đính kèm làm ma trận đề. Soạn các câu hỏi bám sát theo cấu trúc, số lượng câu, mức độ và nội dung được quy định trong file ma trận tải lên này.";
      }

      const response = await apiFetch("/api/generate-exam", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          subject, grade, duration, examType, matrix, customPrompt: finalPrompt,
          qCounts: activeQCounts,
          matrixFile: matrixBase64,
          selectedTopics
        })
      });

      if (!response.ok) {
        const text = await response.text();
        let errorMsg = "Có lỗi xảy ra khi tạo đề.";
        try {
          const err = parseApiResponse(text);
          errorMsg = err.error || errorMsg;
        } catch(e: any) {
          errorMsg = e.message || errorMsg;
        }
        if (errorMsg.includes("UNAUTHENTICATED") || errorMsg.includes("Nhập mã API key") || response.status === 401) {
          window.dispatchEvent(new CustomEvent('show-api-key-modal'));
        }
        throw new Error(errorMsg);
      }

      const text = await response.text();
      const data = parseApiResponse<any>(text);
      if (data && Array.isArray(data.questions) && data.questions.length > 0) {
        setExamName(data.examName || "Đề kiểm tra");
        setQuestions(data.questions);
        setActiveTab("exam");
      } else {
        throw new Error("Không tìm thấy danh sách câu hỏi trong phản hồi của AI. Thầy cô có thể bấm nút Tải đề mẫu hoặc thêm câu hỏi thủ công.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShuffle = () => {
    if (questions.length === 0) return;
    const newExams = [];
    for (let i = 0; i < Math.min(numCodes, 24); i++) {
      const code = (101 + i).toString();
      const shuffledQ = [...questions].sort(() => Math.random() - 0.5).map((q, index) => {
        if (q.type === 'mc' && q.options) {
          const optionObjects = q.options.map((opt, i) => ({ text: cleanOptionText(opt), isCorrect: i === q.correctOptionIndex }));
          const shuffledOptions = optionObjects.sort(() => Math.random() - 0.5);
          return {
            ...q,
            id: index + 1,
            options: shuffledOptions.map(o => o.text),
            correctOptionIndex: shuffledOptions.findIndex(o => o.isCorrect)
          };
        }
        return {
          ...q,
          id: index + 1
        };
      });
      newExams.push({ code, questions: shuffledQ });
    }
    setShuffledExams(newExams);
    setActiveTab("shuffle");
  };

  
  const handleExportWord = (contentId: string, code: string) => {
    const printContent = document.getElementById(contentId);
    if (!printContent) return;
    exportHtmlToWord(printContent, `De_kiem_tra_Ma_${code}.doc`);
  };

  const handleExportWordLatex = (contentId: string, code: string) => {
    const printContent = document.getElementById(contentId);
    if (!printContent) return;
    exportHtmlToWord(printContent, `De_kiem_tra_Ma_${code}_LaTeX.doc`, true);
  };

  const handlePrint = (contentId: string) => {
    const printContent = document.getElementById(contentId);
    if (!printContent) return;
    const windowPrint = window.open('', '', 'left=0,top=0,width=800,height=900,toolbar=0,scrollbars=0,status=0');
    windowPrint?.document.write(`
      <html>
        <head>
          <title>In Đề Kiểm Tra</title>
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
          <style>
            body { font-family: "Times New Roman", Times, serif; line-height: 1.5; padding: 20px; }
            h2 { text-align: center; }
            .question { margin-bottom: 15px; }
            .options { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-top: 5px; }
            .option { padding-left: 10px; }
            .answers-title { margin-top: 30px; font-weight: bold; }
            .answers-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-top: 10px; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    windowPrint?.document.close();
    windowPrint?.focus();
    setTimeout(() => {
      windowPrint?.print();
      windowPrint?.close();
    }, 250);
  };

  const handleShare = async () => {
    try {
      const dataToShare = { 
        examData: { examName, duration },
        codes: shuffledExams 
      };

      setShareLink("Đang tạo link rút gọn...");
      setActiveTab("shuffle");

      let examId = '';
      try {
        const shareRes = await apiFetch('/api/exams/share', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataToShare)
        });
        if (shareRes.ok) {
          const shareJson = await shareRes.json();
          if (shareJson.examId) examId = shareJson.examId;
        }
      } catch (e) {}

      setSharePin(examId);

      const publicBase = getPublicAppUrl() || window.location.origin;
      const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(dataToShare));
      const fullUrl = `${publicBase}/?examData=${compressed}`;
      const baseShortUrl = examId ? `${publicBase}/?examId=${examId}` : fullUrl;
      
      try {
        const res = await apiFetch('/api/shorten', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: baseShortUrl })
        });
        if (res.ok) {
            const data = await res.json();
            setShareLink(data.shortUrl || baseShortUrl);
        } else {
            setShareLink(baseShortUrl);
        }
      } catch (e) {
          setShareLink(baseShortUrl);
      }
    } catch (err: any) {
      alert("Lỗi tạo link: " + err.message);
    }
  };

  return (
    <div className="flex-1 bg-slate-50 min-h-screen p-4 lg:p-8 overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 lg:p-8">
          <div className="flex items-center gap-3 mb-6">
            <FileCheck className="w-8 h-8 text-emerald-600" />
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Tạo & Trộn Đề Kiểm Tra</h2>
              <p className="text-slate-500 text-sm mt-1">Tạo ma trận, sinh câu hỏi tự động và đảo mã đề lên đến 24 đề</p>
            </div>
          </div>

          <div className="flex border-b border-slate-200 mb-6 overflow-x-auto">
            <button 
              onClick={() => setActiveTab("matrix")}
              className={`px-6 py-3 font-medium text-sm whitespace-nowrap ${activeTab === 'matrix' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              1. Tạo Ma Trận & Đề
            </button>
            <button 
              onClick={() => setActiveTab("exam")}
              className={`px-6 py-3 font-medium text-sm whitespace-nowrap ${activeTab === 'exam' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              2. Đề Gốc
            </button>
            <button 
              onClick={() => setActiveTab("shuffle")}
              className={`px-6 py-3 font-medium text-sm whitespace-nowrap ${activeTab === 'shuffle' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              3. Trộn Đề & Xuất Bản
            </button>
            <button 
              onClick={() => setActiveTab("banks")}
              className={`px-6 py-3 font-medium text-sm whitespace-nowrap ${activeTab === 'banks' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Ngân hàng câu hỏi
            </button>
            <button 
              onClick={() => setActiveTab("results")}
              className={`px-6 py-3 font-medium text-sm whitespace-nowrap ${activeTab === 'results' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Kết Quả Thi
            </button>
            <button 
              onClick={() => setShowBubbleSheetModal(true)}
              className="px-6 py-3 font-bold text-sm whitespace-nowrap text-blue-600 hover:text-blue-800 flex items-center gap-2"
            >
              <FileText className="w-4 h-4" /> Tải Phiếu Tô 2025
            </button>
          </div>

                    {activeTab === "matrix" && (
            <div className="flex flex-col lg:flex-row gap-6 items-start">
              <div className="flex-1 space-y-6 w-full">
              
                <div className="flex flex-col md:flex-row md:items-center justify-between bg-blue-50/50 p-4 rounded-xl border border-blue-100 gap-4">
                   <div className="flex-1">
                      <label className="block text-xs font-medium text-blue-800 mb-1">Mở cấu hình ma trận đã lưu</label>
                      <div className="flex gap-2">
                         <select onChange={e => loadConfig(e.target.value)} defaultValue="" className="flex-1 px-3 py-2 border border-blue-200 rounded-md text-sm bg-white focus:ring-blue-500">
                            <option value="" disabled>-- Chọn cấu hình đã lưu --</option>
                            {savedConfigs.map(c => (
                               <option key={c.id} value={c.id}>{c.name} ({new Date(c.timestamp).toLocaleDateString()})</option>
                            ))}
                         </select>
                         <button onClick={() => {
                            const sel = document.querySelector('select') as HTMLSelectElement;
                            if(sel && sel.value) deleteConfig(sel.value);
                         }} className="px-3 py-2 bg-red-50 text-red-600 rounded-md border border-red-200 hover:bg-red-100 transition" title="Xóa cấu hình đang chọn"><Trash2 className="w-4 h-4" /></button>
                      </div>
                   </div>
                   <button onClick={saveCurrentConfig} className="px-4 py-2 bg-white text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition text-sm font-medium whitespace-nowrap">
                      + Lưu cấu hình hiện tại
                   </button>
                </div>

                {/* 1. THÔNG TIN ĐỀ */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm">1</span> THÔNG TIN ĐỀ
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Cấp học</label>
                      <select value={schoolLevel} onChange={e=>setSchoolLevel(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm">
                        <option value="Tiểu học">Tiểu học</option>
                        <option value="THCS">THCS</option>
                        <option value="THPT">THPT</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Lớp</label>
                      <input type="text" value={grade} onChange={e=>setGrade(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Môn học</label>
                      <input type="text" value={subject} onChange={e=>setSubject(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Loại đề</label>
                      <select value={examType} onChange={e=>setExamType(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm">
                        <option value="15p">Kiểm tra 15 phút</option>
                        <option value="45p">Kiểm tra 1 tiết / 45 phút</option>
                        <option value="mid">Kiểm tra Giữa kỳ</option>
                        <option value="final">Kiểm tra Cuối kỳ</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Thời gian (phút)</label>
                      <input type="number" value={duration} onChange={e=>setDuration(Number(e.target.value))} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Số mã đề</label>
                      <input type="number" value={numCodes} onChange={e=>setNumCodes(Number(e.target.value))} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm" />
                    </div>
                  </div>
                  <div className="mb-4">
                      <label className="block text-xs font-medium text-slate-500 mb-1">Tên bài / chủ đề / phạm vi kiến thức</label>
                      <input type="text" value={matrix} onChange={e=>setMatrix(e.target.value)} placeholder="Ví dụ: Bài 2 - Phương trình bậc nhất hai ẩn..." className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm" />
                  </div>
                  <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Yêu cầu riêng của giáo viên</label>
                      <textarea value={customPrompt} onChange={e=>setCustomPrompt(e.target.value)} placeholder="Nhập yêu cầu bổ sung..." className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm" rows={2}></textarea>
                  </div>
                </div>

                {/* 2. TÀI LIỆU GỐC & CHẾ ĐỘ TẠO */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm">2</span> TÀI LIỆU GỐC & CHẾ ĐỘ TẠO
                  </h3>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Chế độ tạo đề:</label>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <label className="flex items-center gap-2 cursor-pointer p-3 border rounded-lg hover:bg-slate-50 flex-1 border-slate-200">
                        <input type="radio" name="generateMode" value="auto" checked={generateMode === "auto"} onChange={() => setGenerateMode("auto")} className="text-blue-600 focus:ring-blue-500 w-4 h-4" />
                        <span className="text-sm font-medium text-slate-700">Tạo tự động (Dựa vào AI)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer p-3 border rounded-lg hover:bg-slate-50 flex-1 border-slate-200">
                        <input type="radio" name="generateMode" value="from_matrix_file" checked={generateMode === "from_matrix_file"} onChange={() => setGenerateMode("from_matrix_file")} className="text-blue-600 focus:ring-blue-500 w-4 h-4" />
                        <span className="text-sm font-medium text-slate-700">Bám sát Ma trận đính kèm</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">File đính kèm (SGK / Ma trận / Học liệu):</label>
                    
                    <div className={`w-full px-4 py-3 border rounded-lg h-24 flex items-center justify-center bg-slate-50 border-dashed relative hover:bg-slate-100 transition-colors cursor-pointer mb-2 ${generateMode === 'from_matrix_file' && !matrixFile ? 'border-red-400 bg-red-50' : 'border-slate-300'}`}>
                      <input type="file" accept="image/*,.pdf" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                      <div className="flex flex-col items-center gap-1 text-slate-500">
                        <UploadCloud className="w-6 h-6 text-slate-400" />
                        <span className="text-sm font-medium">{matrixFile ? matrixFile.name : "Tải lên tệp ảnh/PDF ma trận"}</span>
                      </div>
                    </div>
                    {generateMode === 'from_matrix_file' && (
                       <label className="flex items-center gap-2 mt-2 cursor-pointer text-sm text-blue-700 bg-blue-50 p-2 rounded border border-blue-200">
                          <input type="checkbox" checked={autoDetectStructure} onChange={e => setAutoDetectStructure(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
                          Tự động làm đúng số câu theo ma trận tải lên (Bỏ qua cấu trúc bên dưới)
                       </label>
                    )}
                    <p className="text-xs text-slate-400 mt-2">Hỗ trợ PDF, Word, Excel, Ảnh (JPG, PNG). Tối đa 50MB.</p>
                  </div>
                </div>

                {/* 3. CẤU TRÚC ĐỀ */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <h3 className="font-bold text-slate-800 flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm">3</span> CẤU TRÚC ĐỀ
                    </div>
                  </h3>
                  <div className="flex flex-wrap gap-2 mb-4">
                     <span className="text-xs font-medium text-slate-500 flex items-center mr-1">Gợi ý nhanh:</span>
                     <button onClick={applyPresetBGD3Phan} className="px-3 py-1 bg-blue-50 text-blue-600 border border-blue-200 rounded-md text-sm hover:bg-blue-100 transition-colors">Chuẩn BGD 3 phần (12 TN, 4 ĐS, 6 TLN)</button>
                     <button onClick={applyPreset4Phan} className="px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-md text-sm hover:bg-emerald-100 transition-colors">Đề 4 phần (có Tự luận)</button>
                     <button onClick={applyPresetNguVan} className="px-3 py-1 bg-amber-50 text-amber-600 border border-amber-200 rounded-md text-sm hover:bg-amber-100 transition-colors">Đề Ngữ Văn (Đọc hiểu & Làm văn)</button>
                  </div>
                  <div className="space-y-3">
                    <div className="grid grid-cols-12 gap-2 text-xs font-medium text-slate-500 items-center">
                      <div className="col-span-5 text-left pl-2">Đang cấu hình</div>
                      <div className="col-span-2 text-center">Số câu</div>
                      <div className="col-span-2 text-center">Điểm/câu</div>
                      <div className="col-span-2 text-center">Tổng</div>
                      <div className="col-span-1 text-center">Dùng</div>
                    </div>

                    <div className={`grid grid-cols-12 gap-2 items-center p-2 rounded-lg ${qEnabled.mc ? 'bg-slate-50 border border-slate-200' : 'opacity-50'}`}>
                      <div className="col-span-5 flex flex-col">
                         <span className="font-medium text-sm text-slate-700">Trắc nghiệm lựa chọn</span>
                         <span className="text-xs text-slate-400">4 lựa chọn</span>
                      </div>
                      <div className="col-span-2">
                         <input type="number" value={qCounts.mc} onChange={e=>setQCounts({...qCounts, mc: Number(e.target.value)})} disabled={!qEnabled.mc} className="w-full text-center border border-slate-300 rounded py-1.5 text-sm" />
                      </div>
                      <div className="col-span-2">
                         <input type="text" value={qPoints.mc} onChange={e=>setQPoints({...qPoints, mc: e.target.value})} disabled={!qEnabled.mc} className="w-full text-center border border-slate-300 rounded py-1.5 text-sm" placeholder="VD: 0.25" title="Nhập điểm số (vd: 0.25) hoặc chuỗi (vd: 0.75, 1.0) cho các câu hỏi" />
                      </div>
                      <div className="col-span-2 text-center text-sm font-medium text-slate-700">
                         {qEnabled.mc ? ptMC.total : 0}
                      </div>
                      <div className="col-span-1 flex justify-center">
                         <input type="checkbox" checked={qEnabled.mc} onChange={e=>setQEnabled({...qEnabled, mc: e.target.checked})} className="w-4 h-4 text-blue-600 rounded" />
                      </div>
                    </div>

                    <div className={`grid grid-cols-12 gap-2 items-center p-2 rounded-lg ${qEnabled.tf ? 'bg-slate-50 border border-slate-200' : 'opacity-50'}`}>
                      <div className="col-span-5 flex flex-col">
                         <span className="font-medium text-sm text-slate-700">Đúng / Sai</span>
                      </div>
                      <div className="col-span-2">
                         <input type="number" value={qCounts.tf} onChange={e=>setQCounts({...qCounts, tf: Number(e.target.value)})} disabled={!qEnabled.tf} className="w-full text-center border border-slate-300 rounded py-1.5 text-sm" />
                      </div>
                      <div className="col-span-2">
                         <input type="text" value={qPoints.tf} onChange={e=>setQPoints({...qPoints, tf: e.target.value})} disabled={!qEnabled.tf} className="w-full text-center border border-slate-300 rounded py-1.5 text-sm" placeholder="VD: 0.5" title="Nhập điểm số (vd: 0.5) hoặc chuỗi (vd: 0.75, 1.0) cho các câu hỏi" />
                      </div>
                      <div className="col-span-2 text-center text-sm font-medium text-slate-700">
                         {qEnabled.tf ? ptTF.total : 0}
                      </div>
                      <div className="col-span-1 flex justify-center">
                         <input type="checkbox" checked={qEnabled.tf} onChange={e=>setQEnabled({...qEnabled, tf: e.target.checked})} className="w-4 h-4 text-blue-600 rounded" />
                      </div>
                    </div>

                    <div className={`grid grid-cols-12 gap-2 items-center p-2 rounded-lg ${qEnabled.sa ? 'bg-slate-50 border border-slate-200' : 'opacity-50'}`}>
                      <div className="col-span-5 flex flex-col">
                         <span className="font-medium text-sm text-slate-700">{subject.toLowerCase().includes("văn") ? "Đọc hiểu (Trả lời ngắn)" : "Trả lời ngắn"}</span>
                      </div>
                      <div className="col-span-2">
                         <input type="number" value={qCounts.sa} onChange={e=>setQCounts({...qCounts, sa: Number(e.target.value)})} disabled={!qEnabled.sa} className="w-full text-center border border-slate-300 rounded py-1.5 text-sm" />
                      </div>
                      <div className="col-span-2">
                         <MultiPointInput count={qCounts.sa} value={qPoints.sa} onChange={(val) => setQPoints({...qPoints, sa: val})} disabled={!qEnabled.sa} />
                      </div>
                      <div className="col-span-2 text-center text-sm font-medium text-slate-700">
                         {qEnabled.sa ? ptSA.total : 0}
                      </div>
                      <div className="col-span-1 flex justify-center">
                         <input type="checkbox" checked={qEnabled.sa} onChange={e=>setQEnabled({...qEnabled, sa: e.target.checked})} className="w-4 h-4 text-blue-600 rounded" />
                      </div>
                    </div>

                    <div className={`grid grid-cols-12 gap-2 items-center p-2 rounded-lg ${qEnabled.essay ? 'bg-slate-50 border border-slate-200' : 'opacity-50'}`}>
                      <div className="col-span-5 flex flex-col">
                         <span className="font-medium text-sm text-slate-700">{subject.toLowerCase().includes("văn") ? "Làm văn (Tự luận)" : "Tự luận"}</span>
                      </div>
                      <div className="col-span-2">
                         <input type="number" value={qCounts.essay} onChange={e=>setQCounts({...qCounts, essay: Number(e.target.value)})} disabled={!qEnabled.essay} className="w-full text-center border border-slate-300 rounded py-1.5 text-sm" />
                      </div>
                      <div className="col-span-2">
                         <MultiPointInput count={qCounts.essay} value={qPoints.essay} onChange={(val) => setQPoints({...qPoints, essay: val})} disabled={!qEnabled.essay} />
                      </div>
                      <div className="col-span-2 text-center text-sm font-medium text-slate-700">
                         {qEnabled.essay ? ptES.total : 0}
                      </div>
                      <div className="col-span-1 flex justify-center">
                         <input type="checkbox" checked={qEnabled.essay} onChange={e=>setQEnabled({...qEnabled, essay: e.target.checked})} className="w-4 h-4 text-blue-600 rounded" />
                      </div>
                    </div>

                    <div className="border-t border-slate-200 pt-3 mt-3 flex justify-between items-center bg-blue-50/50 p-3 rounded-lg">
                       <span className="font-medium text-slate-600 text-sm flex items-center gap-1"><FileCheck className="w-4 h-4" /> Tổng Điểm = {totalPointsCalc}</span>
                       <span className="text-xs text-slate-400">Tự động tính</span>
                    </div>
                  </div>
                </div>

                {/* 4. MỨC ĐỘ NHẬN THỨC */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm">4</span> MỨC ĐỘ NHẬN THỨC <span className="font-normal text-xs text-slate-400">(TỔNG: {levels.nb + levels.th + levels.vd + levels.vdc}%)</span>
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                     <div className="flex flex-col gap-2">
                        <div className="font-medium text-slate-700">Nhận biết (%)</div>
                        <input type="number" min="0" max="100" className="border border-slate-300 rounded p-2 text-center" value={levels.nb} onChange={e=>setLevels({...levels, nb: Number(e.target.value)})} />
                     </div>
                     <div className="flex flex-col gap-2">
                        <div className="font-medium text-slate-700">Thông hiểu (%)</div>
                        <input type="number" min="0" max="100" className="border border-slate-300 rounded p-2 text-center" value={levels.th} onChange={e=>setLevels({...levels, th: Number(e.target.value)})} />
                     </div>
                     <div className="flex flex-col gap-2">
                        <div className="font-medium text-slate-700">Vận dụng (%)</div>
                        <input type="number" min="0" max="100" className="border border-slate-300 rounded p-2 text-center" value={levels.vd} onChange={e=>setLevels({...levels, vd: Number(e.target.value)})} />
                     </div>
                     <div className="flex flex-col gap-2">
                        <div className="font-medium text-slate-700">Vận dụng cao (%)</div>
                        <input type="number" min="0" max="100" className="border border-slate-300 rounded p-2 text-center" value={levels.vdc} onChange={e=>setLevels({...levels, vdc: Number(e.target.value)})} />
                     </div>
                  </div>
                  {(levels.nb + levels.th + levels.vd + levels.vdc) !== 100 && (
                     <div className="mt-4 text-xs text-amber-600 bg-amber-50 p-2 rounded flex items-start gap-1">
                        <Sparkles className="w-4 h-4 shrink-0" /> Lưu ý: Tổng tỉ lệ hiện tại là {levels.nb + levels.th + levels.vd + levels.vdc}%. Vui lòng điều chỉnh để tổng bằng đúng 100%.
                     </div>
                  )}
                </div>

                {/* 5. THÀNH PHẦN ĐẦU RA */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-12">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm">5</span> THÀNH PHẦN ĐẦU RA
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-slate-700">
                     <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={outputConfig.answers} onChange={e=>setOutputConfig({...outputConfig, answers: e.target.checked})} className="w-4 h-4 text-blue-600 rounded border-slate-300" /> Đáp án và thang điểm</label>
                     <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={outputConfig.matrix} onChange={e=>setOutputConfig({...outputConfig, matrix: e.target.checked})} className="w-4 h-4 text-blue-600 rounded border-slate-300" /> Ma trận đề kiểm tra</label>
                     <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={outputConfig.spec} onChange={e=>setOutputConfig({...outputConfig, spec: e.target.checked})} className="w-4 h-4 text-blue-600 rounded border-slate-300" /> Bản đặc tả đề kiểm tra</label>
                     <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={outputConfig.shuffleOptions} onChange={e=>setOutputConfig({...outputConfig, shuffleOptions: e.target.checked})} className="w-4 h-4 text-blue-600 rounded border-slate-300" /> Trộn thứ tự phương án trắc nghiệm</label>
                     <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={outputConfig.shuffleQuestions} onChange={e=>setOutputConfig({...outputConfig, shuffleQuestions: e.target.checked})} className="w-4 h-4 text-blue-600 rounded border-slate-300" /> Trộn thứ tự câu giữa các mã đề</label>
                     <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={outputConfig.detailedSolution} onChange={e=>setOutputConfig({...outputConfig, detailedSolution: e.target.checked})} className="w-4 h-4 text-blue-600 rounded border-slate-300" /> Lời giải chi tiết</label>
                  </div>
                  <div className="mt-8 flex flex-col gap-4">
                     {error && <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg">{error}</div>}
                     <div className="flex gap-4">
                     <button onClick={handleGenerate} disabled={isGenerating} className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg flex items-center gap-2 transition-colors disabled:opacity-70 shadow-sm">
                        {isGenerating ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Sparkles className="w-5 h-5" />} 
                        {isGenerating ? "ĐANG TẠO ĐỀ..." : "+ TẠO ĐỀ BẰNG AI"}
                     </button>
                     <button onClick={() => {
                       setQCounts({ mc: 20, tf: 0, sa: 0, essay: 0 });
                       setMatrix(""); setCustomPrompt(""); setMatrixFile(null); setMatrixBase64(null);
                     }} className="px-6 py-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded-lg transition-colors">
                        Làm mới
                     </button>
                     </div>
                  </div>
                </div>
              </div>

              {/* RIGHT SIDEBAR - TÓM TẮT */}
              <div className="w-full lg:w-80 shrink-0 sticky top-6">
                 <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="bg-blue-50 border-b border-slate-200 p-4">
                       <h3 className="font-bold text-slate-800 text-sm">TÓM TẮT CẤU HÌNH</h3>
                    </div>
                    <div className="p-4 space-y-4">
                       <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                          <span className="text-sm text-slate-600">Tổng số câu</span>
                          <span className="font-bold text-slate-800">{totalQuestionsCalc}</span>
                       </div>
                       <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                          <span className="text-sm text-slate-600">Tổng điểm</span>
                          <span className="font-bold text-slate-800">{totalPointsCalc}</span>
                       </div>
                       <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                          <span className="text-sm text-slate-600">Thời lượng ước tính</span>
                          <span className="font-bold text-slate-800">{duration}'</span>
                       </div>
                       <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                          <span className="text-sm text-slate-600">Thời gian đề</span>
                          <span className="font-bold text-slate-800">{duration}'</span>
                       </div>
                       <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                          <span className="text-sm text-slate-600">Số mã đề</span>
                          <span className="font-bold text-slate-800">{numCodes}</span>
                       </div>
                       <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                          <span className="text-sm text-slate-600">Học liệu</span>
                          <span className="font-bold text-slate-800">{matrixFile ? '1 tệp' : '0'}</span>
                       </div>
                       <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-600">Model</span>
                          <span className="font-bold text-slate-800">gemini-3.5-flash</span>
                       </div>
                    </div>
                 </div>
              </div>
            </div>
          )}


          {activeTab === "exam" && (
            <div className="space-y-6">
              {questions.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-emerald-200 rounded-2xl p-8 lg:p-12 text-center max-w-3xl mx-auto shadow-sm">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">Chưa Có Đề Gốc Nào</h3>
                  <p className="text-slate-600 mb-8 max-w-xl mx-auto text-sm leading-relaxed">
                    Thầy cô có thể tạo đề tự động bằng AI, nạp ngay bộ đề mẫu chuẩn khung 2025, hoặc tự nhập đề thủ công/dán từ Word vào đây để chỉnh sửa và trộn mã đề.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                    <button
                      onClick={handleLoadSampleExam}
                      className="p-5 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl hover:shadow-md transition-all group"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-emerald-600 text-white rounded-lg">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <h4 className="font-bold text-emerald-900 group-hover:text-emerald-700">⚡ Nạp Đề Mẫu Chuẩn 2025</h4>
                      </div>
                      <p className="text-xs text-slate-600 leading-normal">
                        Nạp sẵn bộ đề chuẩn Toán học 2025 gồm 20 câu chuẩn 4 phần (Trắc nghiệm, Đúng/Sai, Trả lời ngắn, Tự luận) đầy đủ công thức LaTeX.
                      </p>
                    </button>

                    <button
                      onClick={() => setShowImportTextModal(true)}
                      className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl hover:shadow-md transition-all group"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-600 text-white rounded-lg">
                          <ListPlus className="w-5 h-5" />
                        </div>
                        <h4 className="font-bold text-blue-900 group-hover:text-blue-700">📋 Dán Đề Từ Văn Bản (Word)</h4>
                      </div>
                      <p className="text-xs text-slate-600 leading-normal">
                        Sao chép và dán nhanh văn bản câu hỏi từ Word/PDF vào hệ thống tự động bóc tách thành các câu trắc nghiệm.
                      </p>
                    </button>

                    <button
                      onClick={() => setShowAddQuestionModal(true)}
                      className="p-5 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl hover:shadow-md transition-all group"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-amber-600 text-white rounded-lg">
                          <Plus className="w-5 h-5" />
                        </div>
                        <h4 className="font-bold text-amber-900 group-hover:text-amber-700">➕ Tự Soạn Câu Hỏi Thủ Công</h4>
                      </div>
                      <p className="text-xs text-slate-600 leading-normal">
                        Thêm từng câu hỏi theo ý muốn, tùy chọn loại câu: Trắc nghiệm 4 lựa chọn, Đúng/Sai 4 ý, Trả lời ngắn hoặc Tự luận.
                      </p>
                    </button>

                    <button
                      onClick={() => setActiveTab("matrix")}
                      className="p-5 bg-gradient-to-br from-purple-50 to-fuchsia-50 border border-purple-200 rounded-xl hover:shadow-md transition-all group"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-purple-600 text-white rounded-lg">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <h4 className="font-bold text-purple-900 group-hover:text-purple-700">🚀 Tạo Tự Động Bằng AI</h4>
                      </div>
                      <p className="text-xs text-slate-600 leading-normal">
                        Quay lại Bước 1 để thiết lập ma trận đề, chương trình học và bấm nút tạo đề thông minh bằng Gemini AI.
                      </p>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="bg-slate-100 p-4 rounded-xl border border-slate-200 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div className="flex-1 w-full lg:w-auto">
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Tên Đề Gốc:</label>
                        <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-800 font-semibold rounded-full">
                          {questions.length} câu hỏi
                        </span>
                      </div>
                      <input
                        type="text"
                        value={examName}
                        onChange={e => setExamName(e.target.value)}
                        className="mt-1 w-full text-lg font-bold text-slate-800 bg-white border border-slate-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-emerald-500"
                        placeholder="Nhập tên đề kiểm tra..."
                      />
                    </div>

                    <div className="flex flex-wrap gap-2 items-center w-full lg:w-auto justify-end">
                      <button
                        onClick={() => setShowAddQuestionModal(true)}
                        className="px-3 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 flex items-center gap-1.5 shadow-sm"
                        title="Thêm câu hỏi mới vào đề"
                      >
                        <Plus className="w-4 h-4 text-emerald-600" /> Thêm câu hỏi
                      </button>

                      <button
                        onClick={() => setShowImportTextModal(true)}
                        className="px-3 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 flex items-center gap-1.5 shadow-sm"
                        title="Dán nhanh câu hỏi từ Word"
                      >
                        <ListPlus className="w-4 h-4 text-blue-600" /> Nhập từ Word
                      </button>

                      <button
                        onClick={handleLoadSampleExam}
                        className="px-3 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 flex items-center gap-1.5 shadow-sm"
                        title="Nạp đề kiểm tra mẫu chuẩn 2025"
                      >
                        <Sparkles className="w-4 h-4 text-amber-500" /> Mẫu 2025
                      </button>

                      <button
                        onClick={() => {
                          if (confirm("Thầy cô có chắc muốn xóa toàn bộ câu hỏi trong đề gốc để làm lại?")) {
                            setQuestions([]);
                          }
                        }}
                        className="px-3 py-2 bg-white border border-red-200 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 flex items-center gap-1.5 shadow-sm"
                        title="Xóa hết câu hỏi"
                      >
                        <Trash2 className="w-4 h-4" /> Xóa
                      </button>

                      <div className="h-6 w-[1px] bg-slate-300 mx-1 hidden sm:block"></div>

                      <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-300">
                        <label className="text-xs font-semibold text-slate-600">Số mã đề:</label>
                        <input
                          type="number"
                          min="1"
                          max="24"
                          value={numCodes}
                          onChange={e => setNumCodes(Number(e.target.value))}
                          className="w-14 px-2 py-0.5 text-center font-bold border border-slate-300 rounded text-slate-800"
                        />
                      </div>

                      <button
                        onClick={handleShuffle}
                        className="px-4 py-2 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 flex items-center gap-2 shadow-sm transition-all"
                      >
                        <Shuffle className="w-4 h-4" /> Trộn Đề (Bước 3)
                      </button>
                    </div>
                  </div>
                  
                  
                  {/* MA TRẬN */}
                  {outputConfig.matrix && (
                    <div className="border border-slate-200 rounded-lg p-6 space-y-6 bg-white overflow-x-auto printable-matrix" id="matrix-container">
                      <div className="flex justify-between items-center mb-4 no-print">
                        <div className="flex-1 text-center">
                          <h2 className="text-xl font-bold">MA TRẬN ĐỀ KIỂM TRA</h2>
                          <p className="text-sm text-slate-500 font-normal no-print italic mt-1">💡 Mẹo: Bấm giữ và kéo thả các hàng (chủ đề hoặc nội dung) để sắp xếp lại thứ tự</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => {
                                const wrap = document.getElementById('matrix-table-wrap');
                                if (!wrap) return;
                                exportHtmlToWord(wrap, 'Ma_Tran_De_Kiem_Tra.doc');
                            }} className="px-3 py-1.5 bg-blue-50 text-blue-600 font-medium rounded hover:bg-blue-100 flex items-center gap-2 text-sm border border-blue-200 no-print">
                              Xuất Word
                            </button>
                            <button onClick={() => window.print()} className="px-3 py-1.5 bg-slate-50 text-slate-600 font-medium rounded hover:bg-slate-200 flex items-center gap-2 text-sm border border-slate-300 no-print">
                              <Printer className="w-4 h-4" /> In PDF
                            </button>
                        </div>
                      </div>
                      <div id="matrix-table-wrap">
                          <table className="w-full border-collapse border border-black text-[13px] min-w-[1000px] font-serif text-black" style={{fontFamily: '"Times New Roman", Times, serif'}}>
                            <thead>
                              <tr>
                                <th className="border border-black p-1 text-center font-bold" rowSpan={4}>TT</th>
                                <th className="border border-black p-1 text-center font-bold" rowSpan={4}>Chủ đề/Chương</th>
                                <th className="border border-black p-1 text-center font-bold" rowSpan={4}>Nội dung/đơn vị kiến thức</th>
                                <th className="border border-black p-1 text-center font-bold" colSpan={16}>Mức độ đánh giá</th>
                                <th className="border border-black p-1 text-center font-bold" colSpan={4} rowSpan={3}>Tổng</th>
                                <th className="border border-black p-1 text-center font-bold" rowSpan={4}>Tỉ lệ %<br/>điểm</th>
                              </tr>
                              <tr>
                                <th className="border border-black p-1 text-center font-bold" colSpan={8}>TNKQ</th>
                                <th className="border border-black p-1 text-center font-bold" colSpan={4} rowSpan={2}>Trả lời ngắn</th>
                                <th className="border border-black p-1 text-center font-bold" colSpan={4} rowSpan={2}>Tự luận</th>
                              </tr>
                              <tr>
                                <th className="border border-black p-1 text-center font-bold" colSpan={4}>Nhiều lựa chọn</th>
                                <th className="border border-black p-1 text-center font-bold" colSpan={4}>"Đúng - Sai"</th>
                              </tr>
                              <tr>
                                {Array.from({length: 4}).map((_, i) => (
                                    <td key={`sub-${i}`} className="p-0 border-0">
                                      <table className="w-full h-full border-collapse"><tbody><tr>
                                        <th className="border-r border-black p-1 text-center font-bold w-1/4">Biết</th>
                                        <th className="border-r border-black p-1 text-center font-bold w-1/4">Hiểu</th>
                                        <th className="border-r border-black p-1 text-center font-bold w-1/4">VD</th>
                                        <th className="border-0 p-1 text-center font-bold w-1/4">VDC</th>
                                      </tr></tbody></table>
                                    </td>
                                ))}
                                <th className="border border-black p-1 text-center font-bold">Biết</th>
                                <th className="border border-black p-1 text-center font-bold">Hiểu</th>
                                <th className="border border-black p-1 text-center font-bold">VD</th>
                                <th className="border border-black p-1 text-center font-bold">VDC</th>
                              </tr>
                            </thead>
                            
                              {matrixStructure.map((topicObj, tIdx) => {
                                 const topic = topicObj.topic;
                                 const topicQs = questions.filter(q => (q.topic || 'Chung') === topic);
                                 
                                 return (
                                   <tbody 
                                      key={`topic-${tIdx}`}
                                      draggable
                                      onDragStart={(e) => { 
                                          setDraggedTopicIdx(tIdx); 
                                      }}
                                      onDragOver={(e) => { 
                                          e.preventDefault(); 
                                      }}
                                      onDrop={(e) => {
                                         if (draggedTopicIdx !== null && draggedTopicIdx !== tIdx) {
                                             const newStruct = [...matrixStructure];
                                             const [moved] = newStruct.splice(draggedTopicIdx, 1);
                                             newStruct.splice(tIdx, 0, moved);
                                             setMatrixStructure(newStruct);
                                         }
                                         setDraggedTopicIdx(null);
                                      }}
                                      onDragEnd={() => setDraggedTopicIdx(null)}
                                      className={draggedTopicIdx === tIdx ? 'opacity-30 bg-slate-100' : 'hover:bg-slate-50 transition-colors'}
                                      title="💡 Kéo thả mảng chủ đề này để đổi vị trí"
                                   >
                                     {topicObj.subtopics.map((sub, sIdx) => {
                                        const subQs = topicQs.filter(q => (q.subtopic || 'Chung') === sub);
                                        
                                        const getLevelCount = (type: string, lvl: string) => {
                                            return subQs.filter(q => {
                                                if (q.type !== type) return false;
                                                const l = (q.level || '').toLowerCase();
                                                if (lvl === 'nb') return l.includes('biết');
                                                if (lvl === 'th') return l.includes('hiểu');
                                                if (lvl === 'vdc') return l.includes('cao');
                                                if (lvl === 'vd') return l.includes('dụng') && !l.includes('cao');
                                                return false;
                                            }).length;
                                        };

                                        const rowData = {
                                            mc: { nb: getLevelCount('mc','nb'), th: getLevelCount('mc','th'), vd: getLevelCount('mc','vd'), vdc: getLevelCount('mc','vdc') },
                                            tf: { nb: getLevelCount('tf','nb'), th: getLevelCount('tf','th'), vd: getLevelCount('tf','vd'), vdc: getLevelCount('tf','vdc') },
                                            sa: { nb: getLevelCount('sa','nb'), th: getLevelCount('sa','th'), vd: getLevelCount('sa','vd'), vdc: getLevelCount('sa','vdc') },
                                            es: { nb: getLevelCount('essay','nb'), th: getLevelCount('essay','th'), vd: getLevelCount('essay','vd'), vdc: getLevelCount('essay','vdc') }
                                        };
                                        
                                        const totalNB = rowData.mc.nb + rowData.tf.nb + rowData.sa.nb + rowData.es.nb;
                                        const totalTH = rowData.mc.th + rowData.tf.th + rowData.sa.th + rowData.es.th;
                                        const totalVD = rowData.mc.vd + rowData.tf.vd + rowData.sa.vd + rowData.es.vd;
                                        const totalVDC = rowData.mc.vdc + rowData.tf.vdc + rowData.sa.vdc + rowData.es.vdc;
                                        
                                        const rowPoints = 
                                            (rowData.mc.nb + rowData.mc.th + rowData.mc.vd + rowData.mc.vdc) * ptMC.average +
                                            (rowData.tf.nb + rowData.tf.th + rowData.tf.vd + rowData.tf.vdc) * ptTF.average +
                                            (rowData.sa.nb + rowData.sa.th + rowData.sa.vd + rowData.sa.vdc) * ptSA.average +
                                            (rowData.es.nb + rowData.es.th + rowData.es.vd + rowData.es.vdc) * ptES.average;
                                        const rowPercent = totalPointsCalc > 0 ? Math.round((rowPoints / totalPointsCalc) * 100) : 0;

                                        return (
                                          <tr 
                                            key={`sub-${tIdx}-${sIdx}`}
                                            draggable
                                            onDragStart={(e) => { 
                                                e.stopPropagation(); 
                                                setDraggedSubtopic({ tIdx, sIdx }); 
                                            }}
                                            onDragOver={(e) => { 
                                                e.preventDefault(); 
                                                e.stopPropagation(); 
                                            }}
                                            onDrop={(e) => {
                                                e.stopPropagation();
                                                if (draggedSubtopic && draggedSubtopic.tIdx === tIdx && draggedSubtopic.sIdx !== sIdx) {
                                                    const newStruct = [...matrixStructure];
                                                    const subs = [...newStruct[tIdx].subtopics];
                                                    const [moved] = subs.splice(draggedSubtopic.sIdx, 1);
                                                    subs.splice(sIdx, 0, moved);
                                                    newStruct[tIdx].subtopics = subs;
                                                    setMatrixStructure(newStruct);
                                                }
                                                setDraggedSubtopic(null);
                                            }}
                                            onDragEnd={(e) => { 
                                                e.stopPropagation(); 
                                                setDraggedSubtopic(null); 
                                            }}
                                            className={draggedSubtopic?.tIdx === tIdx && draggedSubtopic?.sIdx === sIdx ? 'opacity-30 bg-blue-100' : 'cursor-move'}
                                            title="💡 Kéo thả hàng này để đổi vị trí nội dung kiến thức"
                                          >
                                            {sIdx === 0 && <td className="border border-black p-1 text-center" rowSpan={topicObj.subtopics.length}>{tIdx + 1}</td>}
                                            {sIdx === 0 && <td className="border border-black p-1" rowSpan={topicObj.subtopics.length}>{topic}</td>}
                                            <td className="border border-black p-1">{sub}</td>
                                            
                                            {/* Nhiều lựa chọn */}
                                            <td className="border border-black p-1 text-center">{rowData.mc.nb || ''}</td>
                                            <td className="border border-black p-1 text-center">{rowData.mc.th || ''}</td>
                                            <td className="border border-black p-1 text-center">{rowData.mc.vd || ''}</td>
                                            <td className="border border-black p-1 text-center">{rowData.mc.vdc || ''}</td>
                                            
                                            {/* Đúng sai */}
                                            <td className="border border-black p-1 text-center">{rowData.tf.nb || ''}</td>
                                            <td className="border border-black p-1 text-center">{rowData.tf.th || ''}</td>
                                            <td className="border border-black p-1 text-center">{rowData.tf.vd || ''}</td>
                                            <td className="border border-black p-1 text-center">{rowData.tf.vdc || ''}</td>
                                            
                                            {/* Trả lời ngắn */}
                                            <td className="border border-black p-1 text-center">{rowData.sa.nb || ''}</td>
                                            <td className="border border-black p-1 text-center">{rowData.sa.th || ''}</td>
                                            <td className="border border-black p-1 text-center">{rowData.sa.vd || ''}</td>
                                            <td className="border border-black p-1 text-center">{rowData.sa.vdc || ''}</td>
                                            
                                            {/* Tự luận */}
                                            <td className="border border-black p-1 text-center">{rowData.es.nb || ''}</td>
                                            <td className="border border-black p-1 text-center">{rowData.es.th || ''}</td>
                                            <td className="border border-black p-1 text-center">{rowData.es.vd || ''}</td>
                                            <td className="border border-black p-1 text-center">{rowData.es.vdc || ''}</td>
                                            
                                            {/* Tổng */}
                                            <td className="border border-black p-1 text-center font-bold">{totalNB || ''}</td>
                                            <td className="border border-black p-1 text-center font-bold">{totalTH || ''}</td>
                                            <td className="border border-black p-1 text-center font-bold">{totalVD || ''}</td>
                                            <td className="border border-black p-1 text-center font-bold">{totalVDC || ''}</td>
                                            
                                            <td className="border border-black p-1 text-center">{rowPercent > 0 ? rowPercent + '%' : ''}</td>
                                          </tr>
                                        );
                                     })}
                                   </tbody>
                                 );
                              })}
                              
                              {/* Dòng TỔNG CỘNG */}
                              <tbody className="no-drag">
                                {(() => {
                                    const getGlobalCount = (type: string, lvl: string) => {
                                          return questions.filter(q => {
                                              if (q.type !== type) return false;
                                              const l = (q.level || '').toLowerCase();
                                              if (lvl === 'nb') return l.includes('biết');
                                              if (lvl === 'th') return l.includes('hiểu');
                                              if (lvl === 'vdc') return l.includes('cao');
                                              if (lvl === 'vd') return l.includes('dụng') && !l.includes('cao');
                                              return false;
                                          }).length;
                                    };
                                    const totals = {
                                        mc: { nb: getGlobalCount('mc','nb'), th: getGlobalCount('mc','th'), vd: getGlobalCount('mc','vd'), vdc: getGlobalCount('mc','vdc') },
                                        tf: { nb: getGlobalCount('tf','nb'), th: getGlobalCount('tf','th'), vd: getGlobalCount('tf','vd'), vdc: getGlobalCount('tf','vdc') },
                                        sa: { nb: getGlobalCount('sa','nb'), th: getGlobalCount('sa','th'), vd: getGlobalCount('sa','vd'), vdc: getGlobalCount('sa','vdc') },
                                        es: { nb: getGlobalCount('essay','nb'), th: getGlobalCount('essay','th'), vd: getGlobalCount('essay','vd'), vdc: getGlobalCount('essay','vdc') }
                                    };
                                    const gNB = totals.mc.nb + totals.tf.nb + totals.sa.nb + totals.es.nb;
                                    const gTH = totals.mc.th + totals.tf.th + totals.sa.th + totals.es.th;
                                    const gVD = totals.mc.vd + totals.tf.vd + totals.sa.vd + totals.es.vd;
                                    const gVDC = totals.mc.vdc + totals.tf.vdc + totals.sa.vdc + totals.es.vdc;
                                    
                                    const pts = {
                                        mc: totals.mc.nb*ptMC.average + totals.mc.th*ptMC.average + totals.mc.vd*ptMC.average + totals.mc.vdc*ptMC.average,
                                        tf: totals.tf.nb*ptTF.average + totals.tf.th*ptTF.average + totals.tf.vd*ptTF.average + totals.tf.vdc*ptTF.average,
                                        sa: totals.sa.nb*ptSA.average + totals.sa.th*ptSA.average + totals.sa.vd*ptSA.average + totals.sa.vdc*ptSA.average,
                                        es: totals.es.nb*ptES.average + totals.es.th*ptES.average + totals.es.vd*ptES.average + totals.es.vdc*ptES.average
                                    };
                                    const globalTotalPts = pts.mc + pts.tf + pts.sa + pts.es;
                                    
                                    return (
                                      <>
                                          <tr className="font-bold bg-slate-50">
                                              <td className="border border-black p-1 text-center" colSpan={3}>Tổng số câu</td>
                                              <td className="border border-black p-1 text-center">{totals.mc.nb || ''}</td>
                                              <td className="border border-black p-1 text-center">{totals.mc.th || ''}</td>
                                              <td className="border border-black p-1 text-center">{totals.mc.vd || ''}</td>
                                              <td className="border border-black p-1 text-center">{totals.mc.vdc || ''}</td>
                                              
                                              <td className="border border-black p-1 text-center">{totals.tf.nb || ''}</td>
                                              <td className="border border-black p-1 text-center">{totals.tf.th || ''}</td>
                                              <td className="border border-black p-1 text-center">{totals.tf.vd || ''}</td>
                                              <td className="border border-black p-1 text-center">{totals.tf.vdc || ''}</td>
                                              
                                              <td className="border border-black p-1 text-center">{totals.sa.nb || ''}</td>
                                              <td className="border border-black p-1 text-center">{totals.sa.th || ''}</td>
                                              <td className="border border-black p-1 text-center">{totals.sa.vd || ''}</td>
                                              <td className="border border-black p-1 text-center">{totals.sa.vdc || ''}</td>
                                              
                                              <td className="border border-black p-1 text-center">{totals.es.nb || ''}</td>
                                              <td className="border border-black p-1 text-center">{totals.es.th || ''}</td>
                                              <td className="border border-black p-1 text-center">{totals.es.vd || ''}</td>
                                              <td className="border border-black p-1 text-center">{totals.es.vdc || ''}</td>
                                              
                                              <td className="border border-black p-1 text-center">{gNB || ''}</td>
                                              <td className="border border-black p-1 text-center">{gTH || ''}</td>
                                              <td className="border border-black p-1 text-center">{gVD || ''}</td>
                                              <td className="border border-black p-1 text-center">{gVDC || ''}</td>
                                              <td className="border border-black p-1 text-center">{gNB+gTH+gVD+gVDC}</td>
                                          </tr>
                                          <tr className="font-bold bg-slate-50">
                                              <td className="border border-black p-1 text-center" colSpan={3}>Tổng số điểm</td>
                                              <td className="border border-black p-1 text-center" colSpan={4}>{pts.mc > 0 ? pts.mc : ''}</td>
                                              <td className="border border-black p-1 text-center" colSpan={4}>{pts.tf > 0 ? pts.tf : ''}</td>
                                              <td className="border border-black p-1 text-center" colSpan={4}>{pts.sa > 0 ? pts.sa : ''}</td>
                                              <td className="border border-black p-1 text-center" colSpan={4}>{pts.es > 0 ? pts.es : ''}</td>
                                              <td className="border border-black p-1 text-center" colSpan={4}>{globalTotalPts > 0 ? globalTotalPts : ''}</td>
                                              <td className="border border-black p-1 text-center">10.0</td>
                                          </tr>
                                          <tr className="font-bold bg-slate-50">
                                              <td className="border border-black p-1 text-center" colSpan={3}>Tỉ lệ %</td>
                                              <td className="border border-black p-1 text-center" colSpan={4}>{globalTotalPts > 0 ? Math.round(pts.mc/globalTotalPts*100) + '%' : ''}</td>
                                              <td className="border border-black p-1 text-center" colSpan={4}>{globalTotalPts > 0 ? Math.round(pts.tf/globalTotalPts*100) + '%' : ''}</td>
                                              <td className="border border-black p-1 text-center" colSpan={4}>{globalTotalPts > 0 ? Math.round(pts.sa/globalTotalPts*100) + '%' : ''}</td>
                                              <td className="border border-black p-1 text-center" colSpan={4}>{globalTotalPts > 0 ? Math.round(pts.es/globalTotalPts*100) + '%' : ''}</td>
                                              <td className="border border-black p-1 text-center" colSpan={5}>100%</td>
                                          </tr>
                                      </>
                                    );
                                })()}
                              </tbody>

                          </table>
                      </div>
                    </div>
                  )}

                  <div className="border border-slate-200 rounded-lg p-6 space-y-6 bg-white" id="original-exam">

                    <h2 className="text-xl font-bold text-center mb-6">{examName}</h2>
                    {questions.map((q, idx) => (
                      <div key={idx} className="pb-4 border-b border-slate-100 last:border-0">
                        <div className="font-medium text-slate-800 mb-3 flex items-start gap-2">
                          <span className="font-bold whitespace-nowrap mt-1">Câu {idx + 1}:</span> 
                          <MarkdownRenderer className="markdown-body inline-block" content={fixMath(cleanQuestionStem(q.content || (q as any).question || (q as any).text || '', q.options))} /> 
                          <span className="text-xs text-emerald-600 font-normal mt-1 shrink-0">[{q.level}]</span>
                          <button onClick={() => saveToBank(q)} className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded border border-blue-200 hover:bg-blue-100 shrink-0 no-print" title="Lưu vào Ngân hàng CH">+ Lưu NH</button>
                          <button onClick={() => {
                            if (confirm("Xóa câu hỏi này khỏi đề?")) {
                               const updated = questions.filter(item => item.id !== q.id);
                               setQuestions(updated);
                            }
                          }} className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded border border-red-200 hover:bg-red-100 shrink-0 no-print" title="Xóa khỏi đề">Xóa</button>
                        </div>
                        
                        {q.type === 'tf' && q.tfStatements && (
                          <div className="flex flex-col gap-3 pl-4">
                            {q.tfStatements.map((stmt, sIdx) => (
                              <div key={sIdx} className="flex items-start gap-1 p-2 rounded-md border border-transparent">
                                <span className="shrink-0 font-medium">{['a)', 'b)', 'c)', 'd)'][sIdx] || String.fromCharCode(97 + sIdx) + ')'}</span>
                                <MarkdownRenderer className="markdown-body inline-block" content={fixMath(stmt.statement || '')} />
                                <span className={`shrink-0 font-bold px-2 rounded ${stmt.correct ? 'text-emerald-700 bg-emerald-100' : 'text-red-700 bg-red-100'}`}>
                                  {stmt.correct ? 'Đ' : 'S'}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                        {q.type === 'mc' && q.options && (
                          <div className="flex flex-col gap-3 pl-4">
                            {q.options.map((opt, oIdx) => (
                              <div key={oIdx} className={`flex items-start gap-1 p-2 rounded-md border ${oIdx === q.correctOptionIndex ? 'bg-emerald-50 border-emerald-200 font-medium' : 'border-transparent'}`}>
                                <span className="shrink-0 font-medium">{String.fromCharCode(65 + oIdx)}.</span>
                                <MarkdownRenderer className="markdown-body inline-block" content={fixMath(cleanOptionText(opt))} />
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {q.type !== 'mc' && q.correctAnswer && (
                          <div className="mt-2 pl-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                            <span className="font-semibold text-emerald-800">Đáp án:</span> <MarkdownRenderer className="markdown-body inline-block" content={fixMath(q.correctAnswer || '')} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === "shuffle" && (
            <div className="space-y-6">
              {shuffledExams.length === 0 ? (
                <div className="text-center py-12 text-slate-500">Chưa có mã đề nào được trộn.</div>
              ) : (
                <>
                  <div className="flex flex-wrap gap-4 items-center justify-between bg-emerald-50 border border-emerald-100 p-4 rounded-lg">
                    <div>
                      <h3 className="font-bold text-emerald-800">Đã trộn thành công {shuffledExams.length} mã đề</h3>
                      <p className="text-sm text-emerald-600 mt-1">Sẵn sàng in ấn, xuất file hoặc chia sẻ cho học sinh làm bài Online.</p>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 sm:gap-3">
                      <button onClick={handleShare} className="px-3 sm:px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 flex items-center gap-2">
                        <Share2 className="w-4 h-4" /> <span className="hidden sm:inline">Chia sẻ Online</span>
                      </button>
                      <button onClick={handleExportCSV} className="px-3 sm:px-4 py-2 bg-white border border-emerald-600 text-emerald-700 font-medium rounded-lg hover:bg-emerald-50 flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4" /> <span className="hidden sm:inline">Excel Đáp Án (TNMaker)</span>
                      </button>
                      <button onClick={() => setShowBubbleSheetModal(true)} className="px-3 sm:px-4 py-2 bg-white border border-emerald-600 text-emerald-700 font-medium rounded-lg hover:bg-emerald-50 flex items-center gap-2">
                        <FileText className="w-4 h-4" /> <span className="hidden sm:inline">In Phiếu Tô</span>
                      </button>
                    </div>
                  </div>

                  {shareLink && (
                    <div className="p-5 bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 rounded-xl border border-emerald-200 shadow-sm space-y-4">
                      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="flex-1 w-full">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Link bài thi trực tuyến</span>
                            {sharePin && (
                              <span className="text-xs bg-emerald-600 text-white px-2 py-0.5 rounded font-mono font-bold">
                                Mã PIN: {sharePin}
                              </span>
                            )}
                          </div>
                          <input
                            type="text"
                            readOnly
                            value={shareLink}
                            className="w-full bg-white border border-emerald-300 rounded-lg px-3 py-2 text-sm text-blue-600 font-semibold focus:outline-none"
                          />
                        </div>

                        <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(shareLink);
                              alert('Đã copy link bài thi vào clipboard!');
                            }}
                            className="px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 flex items-center gap-1.5 shadow-sm"
                          >
                            <Copy className="w-4 h-4" /> Copy Link
                          </button>

                          <button
                            onClick={() => {
                              const zaloMsg = getZaloShareMessage(shareLink, sharePin);
                              navigator.clipboard.writeText(zaloMsg);
                              setCopiedZalo(true);
                              setTimeout(() => setCopiedZalo(false), 3000);
                              alert('Đã copy tin nhắn gửi Zalo kèm Mã PIN & Hướng dẫn mở trình duyệt!\nThầy cô chỉ cần mở Zalo và dán vào nhóm lớp.');
                            }}
                            className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 flex items-center gap-1.5 shadow-sm"
                          >
                            <Smartphone className="w-4 h-4" /> {copiedZalo ? "✓ Đã copy Zalo!" : "📱 Copy Tin Nhắn Gửi Zalo"}
                          </button>
                        </div>
                      </div>

                      <div className="bg-white/80 p-3 rounded-lg border border-emerald-100 text-xs text-slate-700 space-y-1">
                        <p className="font-bold text-emerald-900 flex items-center gap-1">
                          💡 Hướng dẫn gửi cho học sinh qua Zalo (Tránh bị chặn / Trắng màn hình):
                        </p>
                        <p>
                          1. Hãy dùng nút <strong>"📱 Copy Tin Nhắn Gửi Zalo"</strong> ở trên để gửi tin nhắn có sẵn mã PIN và hướng dẫn.
                        </p>
                        <p>
                          2. Nếu học sinh bấm link trên Zalo mà bị lỗi "Bài thi không tồn tại" hoặc bị chặn: Nhắc học sinh bấm <strong>dấu 3 chấm (···)</strong> ở góc trên bên phải Zalo ➔ chọn <strong>"Mở bằng trình duyệt"</strong> (Chrome/Safari), hoặc mở trình duyệt nhập trực tiếp mã PIN <strong>{sharePin || "phòng thi"}</strong>.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-8">
                    {shuffledExams.map((exam, index) => (
                      <div key={index} className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
                        <div className="bg-slate-100 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200">
                          <h4 className="font-bold text-lg text-slate-800">Mã đề: {exam.code}</h4>
                          <div className="flex flex-wrap gap-2">
                            <button onClick={async () => {
                                const singleData = {
                                    examData: { examName, duration },
                                    codes: [
                                        {
                                            code: exam.code,
                                            questions: exam.questions.map((q: any) => ({
                                                type: q.type,
                                                content: q.content,
                                                options: q.options,
                                                correctOptionIndex: q.correctOptionIndex,
                                                correct: q.correct,
                                                correctAnswer: q.correctAnswer,
                                                tfStatements: q.tfStatements?.map((tf: any) => ({ statement: tf.statement, correct: tf.correct }))
                                            }))
                                        }
                                    ]
                                };
                                const publicBase = getPublicAppUrl() || window.location.origin;
                                const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(singleData));
                                const url = `${publicBase}/?examData=${compressed}`;
                                
                                try {
                                    const btn = document.getElementById(`share-btn-${exam.code}`);
                                    if (btn) btn.innerHTML = '<span class="animate-spin mr-1">⌛</span> Đang tạo link...';
                                    
                                    let examId = "";
                                    try {
                                        const shareRes = await apiFetch("/api/exams/share", {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify(singleData)
                                        });
                                        if (shareRes.ok) {
                                            const sData = await shareRes.json();
                                            if (sData.examId) examId = sData.examId;
                                        }
                                    } catch (e) {}

                                    const baseShortUrl = examId ? `${publicBase}/?examId=${examId}` : url;
                                    let finalUrl = baseShortUrl;

                                    try {
                                        const res = await apiFetch("/api/shorten", {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({ url: baseShortUrl })
                                        });
                                        if (res.ok) {
                                            const data = await res.json();
                                            if (data.shortUrl) finalUrl = data.shortUrl;
                                        }
                                    } catch (e) {}

                                    await navigator.clipboard.writeText(finalUrl);
                                    alert(`Đã copy link thi rút gọn cho Mã đề ${exam.code}!\n${finalUrl}`);
                                    if (btn) btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-share-2 w-4 h-4"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg> Copy Link Thi';
                                } catch (e) {
                                    navigator.clipboard.writeText(url);
                                    alert(`Đã copy link thi gốc cho Mã đề ${exam.code}.`);
                                    const btn = document.getElementById(`share-btn-${exam.code}`);
                                    if (btn) btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-share-2 w-4 h-4"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg> Copy Link Thi';
                                }
                            }} id={`share-btn-${exam.code}`} className="px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-sm font-medium rounded hover:bg-blue-100 flex items-center gap-2">
                              <Share2 className="w-4 h-4" /> Copy Link Thi
                            </button>

                            <button onClick={async () => {
                                const singleData = {
                                    examData: { examName, duration },
                                    codes: [
                                        {
                                            code: exam.code,
                                            questions: exam.questions.map((q: any) => ({
                                                type: q.type,
                                                content: q.content,
                                                options: q.options,
                                                correctOptionIndex: q.correctOptionIndex,
                                                correct: q.correct,
                                                correctAnswer: q.correctAnswer,
                                                tfStatements: q.tfStatements?.map((tf: any) => ({ statement: tf.statement, correct: tf.correct }))
                                            }))
                                        }
                                    ]
                                };
                                const publicBase = getPublicAppUrl() || window.location.origin;
                                const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(singleData));
                                const url = `${publicBase}/?examData=${compressed}`;
                                
                                let examId = "";
                                try {
                                    const shareRes = await apiFetch("/api/exams/share", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify(singleData)
                                    });
                                    if (shareRes.ok) {
                                        const sData = await shareRes.json();
                                        if (sData.examId) examId = sData.examId;
                                    }
                                } catch (e) {}

                                const baseShortUrl = examId ? `${publicBase}/?examId=${examId}` : url;
                                let finalUrl = baseShortUrl;
                                try {
                                    const res = await apiFetch("/api/shorten", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ url: baseShortUrl })
                                    });
                                    if (res.ok) {
                                        const data = await res.json();
                                        if (data.shortUrl) finalUrl = data.shortUrl;
                                    }
                                } catch (e) {}

                                const zaloMsg = getZaloShareMessage(finalUrl, examId, `${examName} (Mã đề ${exam.code})`);
                                await navigator.clipboard.writeText(zaloMsg);
                                alert(`Đã copy tin nhắn Zalo kèm Mã PIN & Hướng dẫn cho Mã đề ${exam.code}!`);
                            }} className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium rounded hover:bg-emerald-100 flex items-center gap-2">
                              <Smartphone className="w-4 h-4" /> Gửi Zalo
                            </button>
                            <button onClick={() => handlePrint(`print-exam-${exam.code}`)} className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded hover:bg-slate-50 flex items-center gap-2">

                              <Printer className="w-4 h-4" /> In / PDF
                            </button>
                            <button onClick={() => handleExportWord(`print-exam-${exam.code}`, exam.code)} className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded hover:bg-slate-50 flex items-center gap-2">
                              <Download className="w-4 h-4" /> Xuất Word
                            </button>
                            <button onClick={() => handleExportWordLatex(`print-exam-${exam.code}`, exam.code)} className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded hover:bg-slate-50 flex items-center gap-2" title="Xuất Word giữ nguyên mã LaTeX để dùng chức năng Toggle TeX của MathType">
                              <Download className="w-4 h-4" /> Xuất Word (LaTeX)
                            </button>
                          </div>
                        </div>
                        <div className="p-6">
                          <div id={`print-exam-${exam.code}`}>
                            <h2 style={{textAlign:'center', fontSize: '18px', fontWeight: 'bold'}}>{examName}</h2>
                            <h3 style={{textAlign:'center', fontSize: '16px', marginBottom: '5px'}}>Thời gian làm bài: {duration} phút</h3>
                            <h3 style={{textAlign:'center', fontSize: '16px', marginBottom: '20px'}}>Mã đề: {exam.code}</h3>
                            {exam.questions.map((q, idx) => (
                              <div key={idx} className="question" style={{marginBottom: '15px'}}>
                                <div><strong>Câu {idx + 1}:</strong> <MarkdownRenderer className="markdown-body inline-block" content={fixMath(cleanQuestionStem(q.content || (q as any).question || (q as any).text || '', q.options))} /></div>
                                {q.type === 'mc' && q.options && (
                                  <div className="options" style={{display: 'grid', gridTemplateColumns: '1fr 1fr', marginTop: '5px'}}>
                                    {q.options.map((opt, oIdx) => (
                                      <div key={oIdx} className="option" style={{paddingLeft: '10px', display: 'flex', gap: '4px', alignItems: 'flex-start'}}>
                                        <span style={{fontWeight: 'bold', flexShrink: 0}}>{String.fromCharCode(65 + oIdx)}.</span>
                                        <MarkdownRenderer className="markdown-body inline-block" content={fixMath(cleanOptionText(opt))} />
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {q.type === 'tf' && q.tfStatements && (
                                  <div className="options" style={{display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '5px'}}>
                                    {q.tfStatements.map((stmt, sIdx) => (
                                      <div key={sIdx} className="option" style={{paddingLeft: '10px', display: 'flex', gap: '4px', alignItems: 'flex-start'}}>
                                        <span style={{fontWeight: 'bold', flexShrink: 0}}>{['a)', 'b)', 'c)', 'd)'][sIdx] || String.fromCharCode(97 + sIdx) + ')'}</span>
                                        <MarkdownRenderer className="markdown-body inline-block" content={fixMath(stmt.statement || '')} />
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {q.type !== 'mc' && q.type !== 'tf' && (
                                  <div style={{marginTop: '15px', marginBottom: '30px'}}>
                                    <em>(Học sinh làm bài vào giấy thi)</em>
                                  </div>
                                )}
                              </div>
                            ))}
                            <div style={{pageBreakBefore: 'always'}}></div>
                            
                            <div className="answers-title text-center uppercase mt-8 mb-4">BẢNG ĐÁP ÁN (Mã đề {exam.code})</div>
                            <table className="w-full border-collapse border border-black mt-2 text-center text-sm" style={{fontFamily: '"Times New Roman", Times, serif'}}>
                              <tbody>
                                {Array.from({ length: Math.ceil(exam.questions.length / 10) }).map((_, rowIndex) => (
                                  <tr key={rowIndex}>
                                    {exam.questions.slice(rowIndex * 10, rowIndex * 10 + 10).map((q, colIndex) => {
                                      const ansIndex = rowIndex * 10 + colIndex;
                                      let ans = "";
                                      if (q.type === 'mc') {
                                        ans = String.fromCharCode(65 + (q.correctOptionIndex || 0));
                                      } else if (q.type === 'tf' && q.tfStatements) {
                                        ans = q.tfStatements.map(s => s.correct ? 'Đ' : 'S').join('');
                                      }
                                      return (
                                        <td key={colIndex} className="border border-black p-1">
                                          <strong>{ansIndex + 1}.</strong> {q.type !== 'mc' && q.type !== 'tf' ? (
                                            <MarkdownRenderer className="markdown-body inline-block" content={fixMath(q.correctAnswer || '')} />
                                          ) : ans}
                                        </td>
                                      )
                                    })}
                                    {/* Fill empty cells if the last row has less than 10 columns */}
                                    {Array.from({ length: 10 - exam.questions.slice(rowIndex * 10, rowIndex * 10 + 10).length }).map((_, emptyColIndex) => (
                                      <td key={'empty-' + emptyColIndex} className="border border-black p-1"></td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

        </div>
        
        {activeTab === "results" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-lg text-slate-800">Thống Kê Kết Quả Làm Bài (Online)</h3>
              <button 
                onClick={() => {
                  if (confirm("Bạn có chắc muốn xóa toàn bộ lịch sử kết quả thi trên thiết bị này?")) {
                    localStorage.removeItem('eduplan_exam_results');
                    setExamResults([]);
                  }
                }}
                className="px-4 py-2 bg-red-50 text-red-600 rounded hover:bg-red-100 flex items-center gap-2 text-sm font-medium"
              >
                <Trash2 className="w-4 h-4" /> Xóa lịch sử
              </button>
            </div>
            
            {examResults.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                <p className="text-slate-500">Chưa có kết quả làm bài nào được ghi nhận trên thiết bị này.</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-sm">
                        <th className="p-4 font-semibold text-slate-700">Thời gian nộp</th>
                        <th className="p-4 font-semibold text-slate-700">Đề thi</th>
                        <th className="p-4 font-semibold text-slate-700">Học sinh</th>
                        <th className="p-4 font-semibold text-slate-700">Lớp</th>
                        <th className="p-4 font-semibold text-slate-700">Điểm số</th>
                        <th className="p-4 font-semibold text-slate-700 text-center">Chi tiết</th>
                        <th className="p-4 font-semibold text-slate-700">Thời gian làm</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {examResults.map((result: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-4 text-sm text-slate-600">
                            {new Date(result.submittedAt).toLocaleString('vi-VN')}
                          </td>
                          <td className="p-4 text-sm font-medium text-slate-800">
                            {result.examName}
                          </td>
                          <td className="p-4 text-sm font-medium text-blue-700">
                            {result.studentName}
                          </td>
                          <td className="p-4 text-sm text-slate-600">
                            {result.studentClass || '-'}
                          </td>
                          <td className="p-4 font-bold text-emerald-600">
                            {result.score} / 10
                          </td>
                          <td className="p-4 text-sm">
                            <div className="flex gap-2 justify-center text-xs font-medium">
                              <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded" title="Đúng">✓ {result.correct || 0}</span>
                              <span className="text-red-600 bg-red-50 px-2 py-1 rounded" title="Sai">✗ {result.incorrect || 0}</span>
                              {(result.unanswered > 0) && (
                                <span className="text-slate-500 bg-slate-100 px-2 py-1 rounded" title="Bỏ qua">- {result.unanswered}</span>
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-sm text-slate-500 whitespace-nowrap">
                            {Math.floor((result.timeSpent || 0) / 60)} phút {(result.timeSpent || 0) % 60} giây
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      
      {showBubbleSheetModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">Tải/In Phiếu Tô Trắc Nghiệm</h3>
              <button onClick={() => setShowBubbleSheetModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                 <p className="font-semibold text-slate-700 mb-2">1. Mẫu hệ thống (In trực tiếp - Trắc nghiệm 4 đáp án)</p>
                 <button onClick={handlePrintBubbleSheet} className="w-full text-left px-4 py-3 border border-slate-200 rounded-lg hover:bg-emerald-50 hover:border-emerald-200 flex items-center justify-between group transition-colors">
                   <div>
                     <p className="font-medium text-slate-800 group-hover:text-emerald-700">Phiếu tô 40 câu cơ bản</p>
                     <p className="text-sm text-slate-500">In siêu tốc trực tiếp từ trình duyệt</p>
                   </div>
                   <Printer className="w-5 h-5 text-slate-400 group-hover:text-emerald-600" />
                 </button>
              </div>
              
              <div>
                 <p className="font-semibold text-slate-700 mb-2">2. Mẫu chuẩn Bộ GD&ĐT 2025 (TNMaker)</p>
                 <a href="https://tnmaker.net/phieu-tltn-2025-bgd/" target="_blank" rel="noreferrer" className="w-full text-left px-4 py-3 border border-slate-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 flex items-center justify-between group mb-2 transition-colors">
                   <div>
                     <p className="font-medium text-slate-800 group-hover:text-blue-700">Xem toàn bộ Kho Phiếu BGD 2025</p>
                     <p className="text-sm text-slate-500">Gồm Trắc nghiệm, Đúng/Sai, Trả lời ngắn</p>
                   </div>
                   <ExternalLink className="w-5 h-5 text-slate-400 group-hover:text-blue-600" />
                 </a>
                 <div className="grid grid-cols-2 gap-2">
                   <a href="https://tnmaker.net/wp-content/uploads/2023/12/Phieu-TLTN-50-cau-2025.pdf" target="_blank" rel="noreferrer" className="px-3 py-2 border border-slate-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 flex items-center justify-between group transition-colors">
                     <span className="text-sm font-medium text-slate-700 group-hover:text-blue-700">Mẫu 50 Câu</span>
                     <Download className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
                   </a>
                   <a href="https://tnmaker.net/wp-content/uploads/2023/12/Phieu-TLTN-40-cau-2025.pdf" target="_blank" rel="noreferrer" className="px-3 py-2 border border-slate-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 flex items-center justify-between group transition-colors">
                     <span className="text-sm font-medium text-slate-700 group-hover:text-blue-700">Mẫu 40 Câu</span>
                     <Download className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
                   </a>
                 </div>
              </div>

              <div>
                 <p className="font-semibold text-slate-700 mb-2">3. Mẫu phần mềm chấm thi QM 2025</p>
                 <a href="https://qmapp.vn/phieu-mau/" target="_blank" rel="noreferrer" className="w-full text-left px-4 py-3 border border-slate-200 rounded-lg hover:bg-orange-50 hover:border-orange-200 flex items-center justify-between group mb-2 transition-colors">
                   <div>
                     <p className="font-medium text-slate-800 group-hover:text-orange-700">Xem toàn bộ Kho Phiếu QM</p>
                     <p className="text-sm text-slate-500">Mẫu quét cực nhạy cho Toán/Văn/Anh 2025</p>
                   </div>
                   <ExternalLink className="w-5 h-5 text-slate-400 group-hover:text-orange-600" />
                 </a>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button onClick={() => setShowBubbleSheetModal(false)} className="px-4 py-2 bg-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-300 transition-colors">Đóng</button>
            </div>
          </div>
        </div>
      )}
      {/* Modal Thêm Câu Hỏi Thủ Công */}
      {showAddQuestionModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full my-8 overflow-hidden border border-slate-200">
            <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-600" /> Thêm Câu Hỏi Mới Vào Đề Gốc
              </h3>
              <button onClick={() => setShowAddQuestionModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Dạng câu hỏi</label>
                  <select
                    value={newQuestionType}
                    onChange={(e: any) => setNewQuestionType(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white font-medium"
                  >
                    <option value="mc">Trắc nghiệm 4 lựa chọn</option>
                    <option value="tf">Đúng / Sai (4 ý a,b,c,d)</option>
                    <option value="sa">Trả lời ngắn</option>
                    <option value="essay">Tự luận</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Mức độ</label>
                  <select
                    value={newQuestionLevel}
                    onChange={e => setNewQuestionLevel(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white font-medium"
                  >
                    <option value="Nhận biết">Nhận biết</option>
                    <option value="Thông hiểu">Thông hiểu</option>
                    <option value="Vận dụng">Vận dụng</option>
                    <option value="Vận dụng cao">Vận dụng cao</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Chủ đề (Topic)</label>
                  <input
                    type="text"
                    value={newQuestionTopic}
                    onChange={e => setNewQuestionTopic(e.target.value)}
                    placeholder="VD: Hàm số, Tích phân..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Nội dung câu hỏi <span className="text-slate-400 font-normal normal-case">(hỗ trợ LaTeX kẹp trong $...$)</span>
                </label>
                <textarea
                  rows={3}
                  value={newQuestionContent}
                  onChange={e => setNewQuestionContent(e.target.value)}
                  placeholder="Nhập nội dung câu hỏi... Ví dụ: Cho hàm số $y = f(x)$ liên tục trên $\mathbb{R}$..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-sans focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {newQuestionType === "mc" && (
                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <label className="block text-xs font-bold text-slate-700 uppercase">4 Phương án & Chọn đáp án đúng</label>
                  {["A", "B", "C", "D"].map((lbl, idx) => (
                    <div key={lbl} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="correct-opt"
                        checked={newQuestionCorrectIndex === idx}
                        onChange={() => setNewQuestionCorrectIndex(idx)}
                        className="w-4 h-4 text-emerald-600"
                        title={`Chọn ${lbl} là đáp án đúng`}
                      />
                      <span className="font-bold text-sm text-slate-700 w-6">{lbl}.</span>
                      <input
                        type="text"
                        value={newQuestionOptions[idx]}
                        onChange={e => {
                          const updated = [...newQuestionOptions];
                          updated[idx] = e.target.value;
                          setNewQuestionOptions(updated);
                        }}
                        placeholder={`Nội dung phương án ${lbl}...`}
                        className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white"
                      />
                    </div>
                  ))}
                </div>
              )}

              {newQuestionType === "tf" && (
                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <label className="block text-xs font-bold text-slate-700 uppercase">Nội dung 4 mệnh đề (a, b, c, d)</label>
                  {["a", "b", "c", "d"].map((lbl, idx) => (
                    <div key={lbl} className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-700 w-6">{lbl})</span>
                      <input
                        type="text"
                        value={newQuestionOptions[idx]}
                        onChange={e => {
                          const updated = [...newQuestionOptions];
                          updated[idx] = e.target.value;
                          setNewQuestionOptions(updated);
                        }}
                        placeholder={`Mệnh đề ${lbl}...`}
                        className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white"
                      />
                    </div>
                  ))}
                </div>
              )}

              {(newQuestionType === "sa" || newQuestionType === "essay") && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    {newQuestionType === "sa" ? "Đáp án số / ngắn gọn" : "Lời giải vắn tắt / Thang điểm"}
                  </label>
                  <input
                    type="text"
                    value={newQuestionAnswer}
                    onChange={e => setNewQuestionAnswer(e.target.value)}
                    placeholder={newQuestionType === "sa" ? "Ví dụ: 2 hoặc -0.5" : "Đáp số và barem điểm..."}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Lời giải chi tiết <span className="text-slate-400 font-normal normal-case">(Tùy chọn)</span>
                </label>
                <textarea
                  rows={2}
                  value={newQuestionExplanation}
                  onChange={e => setNewQuestionExplanation(e.target.value)}
                  placeholder="Nhập lời giải hoặc hướng dẫn làm bài..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setShowAddQuestionModal(false)}
                className="px-4 py-2 bg-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-300 text-sm"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveManualQuestion}
                className="px-5 py-2 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 text-sm flex items-center gap-1.5 shadow-sm"
              >
                <Check className="w-4 h-4" /> Lưu Câu Hỏi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nhập Nhanh Từ Văn Bản (Word / Text) */}
      {showImportTextModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full my-8 overflow-hidden border border-slate-200">
            <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                  <ListPlus className="w-5 h-5 text-blue-600" /> Nhập Nhanh Câu Hỏi Từ Văn Bản / Word
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Hệ thống tự động nhận diện dạng trắc nghiệm A/B/C/D hoặc Đúng/Sai a/b/c/d</p>
              </div>
              <button onClick={() => setShowImportTextModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-xs text-blue-800 space-y-1">
                <p className="font-bold">Định dạng hỗ trợ:</p>
                <p>• Câu 1: Cho hàm số... A. ... B. ... C. ... D. ... Đáp án: A</p>
                <p>• Câu 2: Trong không gian Oxyz... a) ... b) ... c) ... d) ...</p>
                <p>• Có thể dán trực tiếp nhiều câu cùng lúc từ file Word.</p>
              </div>

              <textarea
                rows={12}
                value={importRawText}
                onChange={e => setImportRawText(e.target.value)}
                placeholder="Dán nội dung các câu hỏi tại đây...&#10;&#10;Câu 1: Tập xác định của hàm số $y = \log_2(x-1)$ là:&#10;A. $(1; +\infty)$&#10;B. $[1; +\infty)$&#10;C. $(-\infty; 1)$&#10;D. $\mathbb{R} \setminus \{1\}$&#10;Đáp án: A&#10;Lời giải: Điều kiện $x - 1 > 0 \Leftrightarrow x > 1$."
                className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500"
              />

              <div className="flex justify-between items-center">
                <button
                  onClick={() => {
                    setImportRawText(`Câu 1: Đạo hàm của hàm số $y = x^3 - 3x + 1$ là:
A. $y' = 3x^2 - 3$
B. $y' = 3x^2 + 3$
C. $y' = x^2 - 3$
D. $y' = 3x^2$
Đáp án: A
Lời giải: Áp dụng công thức $(x^n)' = n x^{n-1}$.

Câu 2: Cho hàm số $y = \frac{x+1}{x-1}$. Xét tính đúng sai của các khẳng định sau:
a) Tập xác định của hàm số là $D = \mathbb{R} \setminus \{1\}$.
b) Đồ thị hàm số có tiệm cận đứng là $x = 1$.
c) Đồ thị hàm số có tiệm cận ngang là $y = 2$.
d) Hàm số nghịch biến trên từng khoảng xác định.
Lời giải: Tiệm cận ngang là $y = 1$ nên ý c sai.`);
                  }}
                  className="text-xs text-blue-600 hover:underline font-medium"
                >
                  ⚡ Điền văn bản mẫu thử nghiệm
                </button>
                <span className="text-xs text-slate-500 font-medium">
                  {importRawText.split(/\n/).length} dòng
                </span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setShowImportTextModal(false)}
                className="px-4 py-2 bg-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-300 text-sm"
              >
                Hủy
              </button>
              <button
                onClick={handleImportText}
                className="px-5 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 text-sm flex items-center gap-1.5 shadow-sm"
              >
                <Sparkles className="w-4 h-4" /> Bóc Tách & Nạp Vào Đề Gốc
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
