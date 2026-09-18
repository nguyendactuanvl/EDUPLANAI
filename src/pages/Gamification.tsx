import { apiFetch } from '../lib/apiFetch';
import { useState, useEffect, useRef } from "react";
import { Trophy, Star, MinusCircle, Play, Users, Medal, Crown, Filter, History, Loader2, Upload, Plus, Trash2, Edit2, FolderOpen, MessageSquare, X, Send } from "lucide-react";
import { Student } from "../types";
import { parseApiResponse } from "../lib/utils";
import confetti from "canvas-confetti";

interface ScoreRecord {
  id: string;
  studentId: string;
  timestamp: number;
  points: number;
  reason: string;
}

export function Gamification() {
  const [activeTab, setActiveTab] = useState<"picker" | "points" | "ranking">("picker");
  const [students, setStudents] = useState<Student[]>([]);
  const [scores, setScores] = useState<ScoreRecord[]>([]);
  
  // Picker state
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [spinIndex, setSpinIndex] = useState(-1);
  const spinInterval = useRef<NodeJS.Timeout | null>(null);

  // Ranking state
  const [timeFilter, setTimeFilter] = useState<"day" | "week" | "month" | "year">("week");

  const [classes, setClasses] = useState<{id: string, name: string}[]>([{ id: "homeroom", name: "Lớp Chủ nhiệm" }]);
  const [selectedClassId, setSelectedClassId] = useState<string>("homeroom");
  const [isExtractingSt, setIsExtractingSt] = useState(false);
  
  const [manualName, setManualName] = useState("");
  
  // Dialog state
  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    type: 'alert' | 'confirm' | 'prompt' | 'confirm_upload';
    title: string;
    message: string;
    defaultValue?: string;
    onConfirm?: (val?: string) => void;
    onCancel?: () => void;
  } | null>(null);

  const showDialog = (type: 'alert'|'confirm'|'prompt'|'confirm_upload', message: string, onConfirm?: (val?: string) => void, onCancel?: () => void, defaultValue = "") => {
    setDialog({
      isOpen: true,
      type,
      title: "EduPlan AI cho biết:",
      message,
      defaultValue,
      onConfirm,
      onCancel
    });
  };

  // AI Modal state
  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiQuery, setAiQuery] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);



  // Load data
  useEffect(() => {
    // Load classes list
    const savedClasses = localStorage.getItem("gvbm_classes");
    if (savedClasses) {
      try {
        setClasses(JSON.parse(savedClasses));
      } catch(e) {}
    }
  }, []);

  // Load students and scores when class changes
  useEffect(() => {
    const stKey = selectedClassId === "homeroom" ? "homeroom_students" : `gvbm_students_${selectedClassId}`;
    const scKey = `gvbm_scores_${selectedClassId}`;
    
    const savedSt = localStorage.getItem(stKey);
    if (savedSt) {
      try { setStudents(JSON.parse(savedSt)); } catch(e) { setStudents([]); }
    } else { setStudents([]); }

    const savedScores = localStorage.getItem(scKey);
    if (savedScores) {
      try { setScores(JSON.parse(savedScores)); } catch(e) { setScores([]); }
    } else { setScores([]); }
  }, [selectedClassId]);

  
  const clearAllStudents = () => { setIsConfirmClearOpen(true); };
  const executeClearAllStudents = () => {
    saveStudents([]);
    saveScores(scores.filter(s => !students.some(st => st.id === s.studentId)));
    setIsConfirmClearOpen(false);
  };

  const saveStudents = (newSt: Student[]) => {
    setStudents(newSt);
    const stKey = selectedClassId === "homeroom" ? "homeroom_students" : `gvbm_students_${selectedClassId}`;
    localStorage.setItem(stKey, JSON.stringify(newSt));
  };

  const saveScores = (newScores: ScoreRecord[]) => {
    setScores(newScores);
    localStorage.setItem(`gvbm_scores_${selectedClassId}`, JSON.stringify(newScores));
  };
  
  const addClass = () => {
    showDialog('prompt', 'Nhập tên lớp (VD: 10A1, 10A2...):', (name) => {
      if (!name) return;
      const newClass = { id: `cls_${Date.now()}`, name };
      const newClasses = [...classes, newClass];
      setClasses(newClasses);
      localStorage.setItem("gvbm_classes", JSON.stringify(newClasses));
      setSelectedClassId(newClass.id);
    });
  };
  
  const removeClass = (id: string) => {
    if (id === "homeroom") {
      showDialog('alert', "Không thể xóa Lớp Chủ nhiệm mặc định");
      return;
    }
    showDialog('confirm', "Bạn có chắc chắn muốn xóa lớp này và toàn bộ điểm số của học sinh lớp này?", () => {
      const newClasses = classes.filter(c => c.id !== id);
      setClasses(newClasses);
      localStorage.setItem("gvbm_classes", JSON.stringify(newClasses));
      localStorage.removeItem(`gvbm_students_${id}`);
      localStorage.removeItem(`gvbm_scores_${id}`);
      if (selectedClassId === id) setSelectedClassId("homeroom");
    });
  };

  const addManualStudent = () => {
    if (!manualName.trim()) return;
    const newSt = { id: `hs_${Date.now()}`, name: manualName.trim(), role: "", isFixed: false };
    saveStudents([...students, newSt]);
    setManualName("");
  };

  const removeStudent = (id: string) => {
    if (confirm("Xác nhận xóa học sinh này?")) {
      saveStudents(students.filter(s => s.id !== id));
    }
  };

  const handleStUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setIsExtractingSt(true);
      try {
        const key = localStorage.getItem("eduplan_gemini_api_key_v2") || "";
        const res = await apiFetch("/api/extract-data", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            
          },
          body: JSON.stringify({ file: base64, type: "students" })
        });
        const text = await res.text();
        const data = parseApiResponse<any>(text);
        
        if (data.students && Array.isArray(data.students)) {
          const newStudents = data.students.map((name: string, i: number) => ({
            id: `hs_${Date.now()}_${i}`,
            name, role: "", isFixed: false
          }));
          
          if (students.length > 0) {
            showDialog('confirm_upload', "Lớp này đã có danh sách. Ghi đè (Xóa cũ) hay Thêm nối tiếp?", 
              () => {
                 saveStudents(newStudents);
                 showDialog('alert', `Trích xuất thành công ${data.students.length} học sinh!`);
              }, 
              () => {
                 saveStudents([...students, ...newStudents]);
                 showDialog('alert', `Trích xuất thành công ${data.students.length} học sinh!`);
              }
            );
          } else {
             saveStudents(newStudents);
             showDialog('alert', `Trích xuất thành công ${data.students.length} học sinh!`);
          }
        } else {
          showDialog('alert', "Lỗi: Không tìm thấy tên học sinh");
        }
      } catch (err) {
        console.error(err);
        showDialog('alert', "Lỗi: " + (err.message || "Có lỗi xảy ra khi trích xuất. Vui lòng kiểm tra API Key."));
      } finally {
        setIsExtractingSt(false);
        e.target.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const addScore = (studentId: string, points: number, reason: string) => {
    const newRecord: ScoreRecord = {
      id: `sc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      studentId,
      timestamp: Date.now(),
      points,
      reason
    };
    saveScores([newRecord, ...scores]);
  };

  const removeScore = (id: string) => {
    saveScores(scores.filter(s => s.id !== id));
  };

  // --- PICKER LOGIC ---
  const startSpin = () => {
    if (students.length === 0) {
      showDialog('alert', 'Danh sách lớp hiện tại đang trống. Vui lòng chuyển sang tab "Chấm điểm nhanh" để thêm học sinh hoặc tải lên danh sách trước khi quay!');
      return;
    }
    setIsSpinning(true);
    setSelectedStudent(null);
    let speed = 50;
    let iterations = 0;
    const maxIterations = 40 + Math.floor(Math.random() * 20); // Random duration

    const spin = () => {
      setSpinIndex(Math.floor(Math.random() * students.length));
      iterations++;

      if (iterations > maxIterations) {
        // Stop spinning
        setIsSpinning(false);
        const finalIdx = Math.floor(Math.random() * students.length);
        setSpinIndex(finalIdx);
        setSelectedStudent(students[finalIdx]);
        fireConfetti();
      } else {
        // Ease out (slow down)
        if (iterations > maxIterations * 0.7) {
          speed += 20;
        }
        spinInterval.current = setTimeout(spin, speed);
      }
    };

    spin();
  };

  const fireConfetti = () => {
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#34d399', '#fbbf24', '#f87171']
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#34d399', '#fbbf24', '#f87171']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  };

   
    
  const askAi = async () => {
    if (!aiQuery.trim()) return;
    setIsAiLoading(true);
    setAiResponse("");
    try {
      const rankedData = calculateRanking().map((rs, i) => ({
        rank: i + 1,
        name: rs.student.name,
        score: rs.total
      })).slice(0, 15);

      const res = await apiFetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json",  },
        body: JSON.stringify({ prompt: aiQuery, context: rankedData })
      });
      const text = await res.text();
      const data = parseApiResponse<any>(text);
      if (res.ok) {
        setAiResponse(data.text);
      } else {
        setAiResponse("Lỗi: " + (data.error || "Không thể kết nối AI"));
      }
    } catch (e) {
      setAiResponse("Lỗi kết nối.");
    } finally {
      setIsAiLoading(false);
    }
  };



  // --- RANKING LOGIC ---
  const getFilteredScores = () => {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    
    let cutoff = 0;
    if (timeFilter === "day") cutoff = now - day;
    else if (timeFilter === "week") cutoff = now - day * 7;
    else if (timeFilter === "month") cutoff = now - day * 30;
    // year = all time for simplicity
    
    return scores.filter(s => s.timestamp >= cutoff);
  };

  const calculateRanking = () => {
    const validScores = getFilteredScores();
    const totals: Record<string, number> = {};
    
    students.forEach(s => { totals[s.id] = 0; });
    validScores.forEach(s => {
      if (totals[s.studentId] !== undefined) {
        totals[s.studentId] += s.points;
      }
    });

    const ranked = students
      .map(s => ({ student: s, total: totals[s.id] }))
      .sort((a, b) => b.total - a.total);
      
    return ranked;
  };

  const rankedStudents = calculateRanking();

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto h-full flex flex-col">
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Thi đua & Gọi tên (GVBM)</h2>
          <p className="text-slate-500">Tổ chức trò chơi gọi tên và quản lý điểm số tích lũy của học sinh</p>
        </div>
        
        <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
          <FolderOpen className="w-5 h-5 text-slate-400 ml-1" />
          <select 
            value={selectedClassId} 
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="px-2 py-1.5 border-none bg-transparent font-semibold text-emerald-700 focus:ring-0 outline-none w-48"
          >
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <div className="w-px h-6 bg-slate-200 mx-1"></div>
          <button onClick={addClass} title="Thêm Lớp mới" className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md">
            <Plus className="w-5 h-5" />
          </button>
          <button onClick={() => removeClass(selectedClassId)} title="Xóa Lớp này" className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md">
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex gap-4 mb-6 border-b border-slate-200">
        <button 
          onClick={() => setActiveTab("picker")}
          className={`pb-3 px-2 border-b-2 font-medium text-sm transition-colors ${activeTab === "picker" ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <div className="flex items-center gap-2"><Play className="w-4 h-4" /> Vòng quay gọi tên</div>
        </button>
        <button 
          onClick={() => setActiveTab("points")}
          className={`pb-3 px-2 border-b-2 font-medium text-sm transition-colors ${activeTab === "points" ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <div className="flex items-center gap-2"><Star className="w-4 h-4" /> Chấm điểm nhanh</div>
        </button>
        <button 
          onClick={() => setActiveTab("ranking")}
          className={`pb-3 px-2 border-b-2 font-medium text-sm transition-colors ${activeTab === "ranking" ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <div className="flex items-center gap-2"><Trophy className="w-4 h-4" /> Bảng xếp hạng</div>
        </button>
      </div>

      {/* TAB 1: RANDOM PICKER */}
      {activeTab === "picker" && (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[500px] bg-slate-900 rounded-3xl p-8 relative overflow-hidden shadow-2xl border-4 border-slate-800">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-500 via-slate-900 to-slate-900"></div>
          
          {!selectedStudent && !isSpinning && (
            <div className="text-center z-10 mb-12">
              <h3 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-cyan-300 mb-4 drop-shadow-lg">
                ĐI TÌM NGƯỜI MAY MẮN
              </h3>
              <p className="text-slate-400 text-lg">Hôm nay ai sẽ là người tỏa sáng?</p>
            </div>
          )}

          {/* Display Area */}
          <div className="z-10 w-full max-w-2xl">
            {(isSpinning || selectedStudent) ? (
              <div className={`text-center p-12 rounded-3xl border-4 transition-all duration-300 ${selectedStudent ? 'bg-gradient-to-br from-emerald-500 to-teal-600 border-emerald-300 scale-105 shadow-[0_0_50px_rgba(16,185,129,0.5)]' : 'bg-slate-800 border-slate-700 shadow-2xl'}`}>
                <div className="text-sm font-bold tracking-widest text-emerald-100/70 uppercase mb-4">
                  {selectedStudent ? "CHÚC MỪNG" : "ĐANG TÌM KIẾM..."}
                </div>
                <div className={`text-5xl md:text-7xl font-extrabold text-white break-words leading-tight ${isSpinning ? 'animate-pulse blur-[1px]' : ''}`}>
                  {isSpinning && spinIndex >= 0 ? students[spinIndex]?.name : selectedStudent?.name}
                </div>
              </div>
            ) : null}
          </div>

          {/* Controls */}
          <div className="z-10 mt-12 flex flex-col items-center gap-6">
            {!isSpinning && !selectedStudent && (
              <button 
                onClick={startSpin}
                className="group relative px-12 py-5 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold text-2xl rounded-full shadow-[0_0_40px_rgba(16,185,129,0.4)] hover:shadow-[0_0_60px_rgba(16,185,129,0.6)] hover:scale-105 transition-all active:scale-95"
              >
                <span className="flex items-center gap-3">
                  <Play className="w-8 h-8 fill-current" /> BẮT ĐẦU QUAY
                </span>
              </button>
            )}

            {selectedStudent && !isSpinning && (
              <div className="flex flex-col items-center gap-6 animate-in slide-in-from-bottom-8 duration-500 fade-in">
                <div className="flex gap-4">
                  <button 
                    onClick={() => {
                      addScore(selectedStudent.id, 1, "Phát biểu xuất sắc");
                      setSelectedStudent(null);
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl shadow-lg hover:-translate-y-1 transition-all"
                  >
                    <Star className="w-5 h-5 fill-current" /> +1 Điểm Tốt
                  </button>
                  <button 
                    onClick={() => {
                      addScore(selectedStudent.id, -1, "Không tập trung");
                      setSelectedStudent(null);
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-400 text-white font-bold rounded-xl shadow-lg hover:-translate-y-1 transition-all"
                  >
                    <MinusCircle className="w-5 h-5" /> Trừ 1 Điểm
                  </button>
                </div>
                <button 
                  onClick={startSpin}
                  className="text-slate-400 hover:text-white underline underline-offset-4 transition-colors"
                >
                  Quay lại lần nữa
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: POINTS MANAGEMENT */}
      {activeTab === "points" && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col flex-1 min-h-0">
          <div className="grid grid-cols-1 md:grid-cols-3 h-full divide-y md:divide-y-0 md:divide-x divide-slate-200">
            {/* Student List */}
            <div className="md:col-span-2 flex flex-col h-[500px] md:h-auto">
              <div className="p-3 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-slate-800 shrink-0 mr-auto">Danh sách lớp ({students.length})</h3>
                
                <div className="flex items-center gap-1 w-full sm:w-auto">
                  <input 
                    type="text" 
                    placeholder="Nhập thủ công..." 
                    value={manualName}
                    onChange={e => setManualName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addManualStudent()}
                    className="flex-1 sm:w-32 px-2 py-1.5 border border-slate-300 rounded-l-md text-sm focus:ring-emerald-500" 
                  />
                  <button onClick={addManualStudent} className="px-2 py-1.5 bg-emerald-600 text-white rounded-r-md hover:bg-emerald-700">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                
                <label className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md shadow-sm border cursor-pointer transition-colors ${isExtractingSt ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50'}`}>
                  {isExtractingSt ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  <span className="hidden sm:inline">{isExtractingSt ? "Đang quét AI..." : "Tải Danh sách (Ảnh/PDF)"}</span>
                  <input type="file" className="hidden" accept="image/*,.pdf,.doc,.docx" onChange={handleStUpload} disabled={isExtractingSt} />
                </label>

              <div className="flex w-full mt-2 sm:mt-0 gap-2 flex-wrap">
                <button onClick={() => setIsAiModalOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-sm font-medium rounded-md shadow-sm hover:opacity-90 transition-opacity whitespace-nowrap">
                  <MessageSquare className="w-4 h-4" /> AI Thi đua
                </button>
                <button onClick={(e) => { e.preventDefault(); clearAllStudents(); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 text-sm font-medium rounded-md hover:bg-red-100 transition-colors whitespace-nowrap">
                  <Trash2 className="w-4 h-4" /> Xóa DS
                </button>
              </div>
              </div>
              <div className="flex-1 overflow-auto p-4 bg-slate-50/50">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {students.map(st => {
                    const stTotal = getFilteredScores().filter(s => s.studentId === st.id).reduce((sum, s) => sum + s.points, 0);
                    
                    return (
                      <div key={st.id} className="flex flex-col gap-2 p-3 border border-slate-200 rounded-lg hover:border-emerald-300 hover:shadow-md transition-all bg-white group relative">
                        <button onClick={() => removeStudent(st.id)} className="absolute top-1 right-1 p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity rounded-full hover:bg-red-50">
                           <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <div className="flex justify-between items-start pr-6">
                          <span className="font-medium text-slate-800 truncate" title={st.name}>{st.name}</span>
                          <span className={`font-bold shrink-0 ml-2 ${stTotal > 0 ? 'text-emerald-600' : stTotal < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                            {stTotal > 0 ? '+' : ''}{stTotal}
                          </span>
                        </div>
                        <div className="flex gap-2 mt-1">
                          <button onClick={() => addScore(st.id, 1, "Cộng điểm")} className="flex-1 py-1.5 bg-emerald-50 text-emerald-700 rounded border border-emerald-200 hover:bg-emerald-500 hover:text-white font-medium text-sm flex items-center justify-center gap-1 transition-colors">
                            <Star className="w-3.5 h-3.5" /> +1
                          </button>
                          <button onClick={() => addScore(st.id, -1, "Trừ điểm")} className="flex-1 py-1.5 bg-red-50 text-red-700 rounded border border-red-200 hover:bg-red-500 hover:text-white font-medium text-sm flex items-center justify-center gap-1 transition-colors">
                            <MinusCircle className="w-3.5 h-3.5" /> -1
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            
            {/* Recent History */}
            <div className="md:col-span-1 flex flex-col h-[400px] md:h-auto bg-slate-50">
              <div className="p-4 border-b border-slate-200 flex items-center gap-2">
                <History className="w-4 h-4 text-slate-500" />
                <h3 className="font-semibold text-slate-800">Lịch sử gần đây</h3>
              </div>
              <div className="flex-1 overflow-auto p-4 space-y-3">
                {scores.slice(0, 20).map(score => {
                  const student = students.find(s => s.id === score.studentId);
                  return (
                    <div key={score.id} className="flex justify-between items-start p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                      <div>
                        <div className="font-medium text-slate-800 text-sm">{student?.name || 'HS đã xóa'}</div>
                        <div className="text-xs text-slate-500 mt-1">{new Date(score.timestamp).toLocaleString('vi-VN')}</div>
                        <div className="text-xs text-slate-600 mt-1 italic">"{score.reason}"</div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`font-bold text-sm px-2 py-0.5 rounded-full ${score.points > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {score.points > 0 ? '+' : ''}{score.points}
                        </span>
                        <button onClick={() => removeScore(score.id)} className="text-xs text-slate-400 hover:text-red-500 underline">Xóa</button>
                      </div>
                    </div>
                  );
                })}
                {scores.length === 0 && (
                  <div className="text-center text-slate-500 text-sm py-8">Chưa có bản ghi nào.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: LEADERBOARD */}
      {activeTab === "ranking" && (
        <div className="flex-1 min-h-0 flex flex-col gap-6">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 text-slate-700 font-medium">
              <Filter className="w-4 h-4" /> Thời gian xếp hạng:
            </div>
            <div className="flex bg-slate-100 p-1 rounded-lg">
              {[
                { id: "day", label: "Hôm nay" },
                { id: "week", label: "Tuần này" },
                { id: "month", label: "Tháng này" },
                { id: "year", label: "Cả năm" }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setTimeFilter(t.id as any)}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${timeFilter === t.id ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Top 3 Podium */}
            <div className="md:col-span-1 bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl p-6 shadow-xl flex flex-col items-center justify-center min-h-[400px] border border-slate-700 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <Crown className="w-32 h-32 text-yellow-400" />
              </div>
              
              <h3 className="text-white font-bold text-xl mb-12 z-10 flex items-center gap-2">
                <Crown className="w-5 h-5 text-yellow-400" /> TOP XUẤT SẮC
              </h3>

              <div className="flex items-end justify-center gap-2 z-10 w-full h-48">
                {/* 2nd Place */}
                {rankedStudents[1] && rankedStudents[1].total > 0 && (
                  <div className="flex flex-col items-center w-1/3">
                    <div className="text-slate-300 text-sm font-medium mb-2 text-center w-full truncate px-1">{rankedStudents[1].student.name.split(' ').pop()}</div>
                    <div className="w-full bg-gradient-to-t from-slate-400 to-slate-300 h-24 rounded-t-lg flex flex-col items-center justify-start pt-2 border-t-2 border-slate-100 shadow-lg relative">
                      <div className="absolute -top-5 bg-slate-800 border-2 border-slate-300 text-slate-200 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-md">2</div>
                      <span className="font-bold text-slate-800 mt-4">{rankedStudents[1].total}</span>
                    </div>
                  </div>
                )}
                
                {/* 1st Place */}
                {rankedStudents[0] && rankedStudents[0].total > 0 && (
                  <div className="flex flex-col items-center w-1/3 -mt-8">
                    <Crown className="w-8 h-8 text-yellow-400 mb-1 drop-shadow-md animate-bounce" />
                    <div className="text-yellow-400 text-sm font-bold mb-2 text-center w-full truncate px-1">{rankedStudents[0].student.name.split(' ').pop()}</div>
                    <div className="w-full bg-gradient-to-t from-yellow-500 to-yellow-300 h-32 rounded-t-lg flex flex-col items-center justify-start pt-2 border-t-2 border-yellow-100 shadow-[0_0_20px_rgba(234,179,8,0.3)] relative z-10">
                      <div className="absolute -top-5 bg-slate-800 border-2 border-yellow-400 text-yellow-400 w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-sm shadow-md">1</div>
                      <span className="font-bold text-yellow-900 mt-6 text-lg">{rankedStudents[0].total}</span>
                    </div>
                  </div>
                )}
                
                {/* 3rd Place */}
                {rankedStudents[2] && rankedStudents[2].total > 0 && (
                  <div className="flex flex-col items-center w-1/3">
                    <div className="text-amber-600 text-sm font-medium mb-2 text-center w-full truncate px-1">{rankedStudents[2].student.name.split(' ').pop()}</div>
                    <div className="w-full bg-gradient-to-t from-amber-700 to-amber-600 h-20 rounded-t-lg flex flex-col items-center justify-start pt-2 border-t-2 border-amber-400 shadow-lg relative">
                      <div className="absolute -top-5 bg-slate-800 border-2 border-amber-600 text-amber-500 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-md">3</div>
                      <span className="font-bold text-amber-100 mt-4">{rankedStudents[2].total}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Full List */}
            <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
                <Medal className="w-5 h-5 text-emerald-600" />
                <h3 className="font-semibold text-slate-800">Bảng Tổng Sắp</h3>
              </div>
              <div className="flex-1 overflow-auto p-0">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-white sticky top-0 shadow-sm z-10">
                    <tr>
                      <th className="px-6 py-3 text-xs font-semibold text-slate-500 w-16 text-center">Hạng</th>
                      <th className="px-6 py-3 text-xs font-semibold text-slate-500">Học sinh</th>
                      <th className="px-6 py-3 text-xs font-semibold text-slate-500 w-32 text-center">Tổng điểm</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rankedStudents.map((rs, idx) => {
                      if (rs.total === 0) return null; // Only show students with points
                      return (
                        <tr key={rs.student.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 text-center">
                            {idx === 0 ? <Crown className="w-5 h-5 text-yellow-500 mx-auto" /> : 
                             idx === 1 ? <Medal className="w-5 h-5 text-slate-400 mx-auto" /> :
                             idx === 2 ? <Medal className="w-5 h-5 text-amber-600 mx-auto" /> :
                             <span className="text-slate-500 font-medium font-mono">{idx + 1}</span>}
                          </td>
                          <td className="px-6 py-4 font-medium text-slate-800">{rs.student.name}</td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${rs.total > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                              {rs.total}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {rankedStudents.every(rs => rs.total === 0) && (
                      <tr>
                        <td colSpan={3} className="px-6 py-12 text-center text-slate-500">
                          Chưa có học sinh nào đạt điểm trong thời gian này.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Assistant Modal */}
      {isAiModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col h-[80vh] max-h-[800px]">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-indigo-50/50">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-indigo-600" /> Trợ lý AI Thi đua
              </h3>
              <button onClick={() => setIsAiModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-6 bg-slate-50 flex flex-col gap-4">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 text-slate-700 text-sm">
                👋 Chào thầy/cô! Tôi có thể giúp phân tích tình hình thi đua hiện tại, đưa ra các hình thức khen thưởng/kỷ luật sáng tạo, hoặc các trò chơi tương tác phù hợp với lớp.
              </div>
              
              {aiResponse && (
                <div className="bg-indigo-50 p-4 rounded-xl shadow-sm border border-indigo-100 text-slate-800 text-sm prose prose-sm max-w-none">
                  <div dangerouslySetInnerHTML={{ __html: aiResponse.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                </div>
              )}
              {isAiLoading && (
                <div className="flex items-center gap-2 text-indigo-600 text-sm font-medium p-4">
                  <Loader2 className="w-4 h-4 animate-spin" /> AI đang suy nghĩ...
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-slate-200 bg-white">
               <div className="flex gap-2">
                 <input
                   type="text"
                   className="flex-1 border border-slate-300 rounded-lg px-4 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                   placeholder="VD: Gợi ý cách thưởng cho 3 bạn đứng đầu tuần này..."
                   value={aiQuery}
                   onChange={e => setAiQuery(e.target.value)}
                   onKeyDown={e => {
                     if (e.key === 'Enter') {
                       e.preventDefault();
                       askAi();
                     }
                   }}
                 />
                 <button onClick={askAi} disabled={isAiLoading || !aiQuery.trim()} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 font-medium">
                   <Send className="w-4 h-4" /> Gửi
                 </button>
               </div>
               <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                 <button onClick={() => { setAiQuery("Gợi ý 3 hình thức khen thưởng độc đáo cho Top 1"); setTimeout(() => askAi(), 100); }} className="whitespace-nowrap px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-full text-xs text-slate-600 transition-colors border border-slate-200">Khen thưởng Top 1</button>
                 <button onClick={() => { setAiQuery("Cách xử lý khéo léo học sinh hay bị điểm trừ nhiều nhất"); setTimeout(() => askAi(), 100); }} className="whitespace-nowrap px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-full text-xs text-slate-600 transition-colors border border-slate-200">Xử lý học sinh vi phạm</button>
                 <button onClick={() => { setAiQuery("Đề xuất 1 trò chơi 5 phút đầu giờ để khuấy động không khí lớp"); setTimeout(() => askAi(), 100); }} className="whitespace-nowrap px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-full text-xs text-slate-600 transition-colors border border-slate-200">Trò chơi đầu giờ</button>
               </div>
            </div>
          </div>
        </div>
      )}



      {/* Custom Dialog */}
      {dialog?.isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-2">{dialog.title}</h3>
              <p className="text-slate-600 text-sm mb-4">{dialog.message}</p>
              {dialog.type === 'prompt' && (
                <input
                  type="text"
                  autoFocus
                  className="w-full border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  defaultValue={dialog.defaultValue}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      dialog.onConfirm?.((e.target as HTMLInputElement).value);
                      setDialog(null);
                    }
                  }}
                  id="dialog-prompt-input"
                />
              )}
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              {(dialog.type === 'confirm' || dialog.type === 'prompt' || dialog.type === 'confirm_upload') && (
                <button
                  onClick={() => {
                    dialog.onCancel?.();
                    setDialog(null);
                  }}
                  className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors"
                >
                  {dialog.type === 'confirm_upload' ? 'Thêm nối tiếp' : 'Hủy bỏ'}
                </button>
              )}
              <button
                onClick={() => {
                  if (dialog.type === 'prompt') {
                    const val = (document.getElementById('dialog-prompt-input') as HTMLInputElement)?.value;
                    dialog.onConfirm?.(val);
                  } else {
                    dialog.onConfirm?.();
                  }
                  setDialog(null);
                }}
                className={`px-4 py-2 font-medium rounded-lg transition-colors ${dialog.type === 'confirm_upload' ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
              >
                {dialog.type === 'confirm_upload' ? 'Ghi đè (Xóa cũ)' : 'Đồng ý'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Clear Modal */}
      {isConfirmClearOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-2">Cảnh báo xóa dữ liệu</h3>
              <p className="text-slate-600 text-sm">
                Bạn có chắc chắn muốn xóa TOÀN BỘ danh sách học sinh của lớp này không? Hành động này không thể hoàn tác.
              </p>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setIsConfirmClearOpen(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors">
                Hủy bỏ
              </button>
              <button onClick={executeClearAllStudents} className="px-4 py-2 bg-red-600 text-white font-medium hover:bg-red-700 rounded-lg transition-colors">
                Xóa toàn bộ
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
