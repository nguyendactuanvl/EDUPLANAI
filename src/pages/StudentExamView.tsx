import React, { useState, useEffect } from 'react';
import { Loader2, FileText, Trophy, CheckCircle2, XCircle } from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { apiFetch } from '../lib/apiFetch';
import LZString from 'lz-string';
import { Clock, Copy } from 'lucide-react';

export function StudentExamView({ examId, examRawData }: { examId?: string, examRawData?: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [examData, setExamData] = useState<any>(null);
  
  const [isStarted, setIsStarted] = useState(false);
  const [studentInfo, setStudentInfo] = useState({ name: '', class: '' });
  
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [timeSpent, setTimeSpent] = useState<number>(0);

  useEffect(() => {
    if (examRawData) {
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
      apiFetch(`/api/exams/${examId}`)
      .then(res => {
        if (!res.ok) throw new Error("Không tìm thấy đề thi. Có thể link đã hết hạn.");
        return res.json();
      })
      .then(data => {
        setExamData(data);
        if (data.codes && data.codes.length > 0) {
          const randomCode = data.codes[Math.floor(Math.random() * data.codes.length)].code;
          setSelectedCode(randomCode);
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
    }
  }, [examId, examRawData]);

  useEffect(() => {
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

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-10 h-10 animate-spin text-emerald-600" /></div>;
  if (error) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="bg-red-50 text-red-700 p-6 rounded-xl max-w-md text-center">{error}</div></div>;
  if (!examData) return null;

  const currentExam = examData.codes.find((c: any) => c.code === selectedCode);

  const handleSubmit = () => {
    if (!currentExam) return;
    
    // Check if fully answered
    let answeredCount = 0;
    currentExam.questions.forEach((q: any, idx: number) => {
      const ans = answers[idx];
      if (q.type === 'mc' || (!q.type && q.options)) {
        if (ans !== undefined) answeredCount++;
      } else if (q.type === 'tf') {
        if (ans && Object.keys(ans).length === 4) answeredCount++; // Vietnam standard TF has 4 statements
        else if (ans !== undefined) answeredCount++; // Or single TF
      } else if (q.type === 'sa' || q.type === 'essay') {
        if (ans && ans.trim().length > 0) answeredCount++;
      }
    });

    if (answeredCount < currentExam.questions.length) {
      if (!confirm("Bạn chưa làm hết các câu hỏi. Bạn có chắc chắn muốn nộp bài?")) return;
    }
    
    let totalScore = 0;
    
    currentExam.questions.forEach((q: any, idx: number) => {
      const ans = answers[idx];
      if (q.type === 'mc' || (!q.type && q.options)) {
        if (ans === q.correctOptionIndex) totalScore += 1;
      } else if (q.type === 'tf') {
        if (q.tfStatements && q.tfStatements.length > 0) {
           let correctCount = 0;
           q.tfStatements.forEach((stmt: any, sIdx: number) => {
             const studentAns = ans ? ans[sIdx] : undefined;
             const isTrue = stmt.correct === true || String(stmt.correct).toLowerCase() === 'true';
             if (studentAns === isTrue) correctCount++;
           });
           if (correctCount === 1) totalScore += 0.1;
           else if (correctCount === 2) totalScore += 0.25;
           else if (correctCount === 3) totalScore += 0.5;
           else if (correctCount === 4) totalScore += 1.0;
        } else {
           const isTrue = q.correct === true || String(q.correct).toLowerCase() === 'true' || String(q.correctAnswer).toLowerCase().includes('đúng');
           if (ans === isTrue) totalScore += 1;
        }
      } else if (q.type === 'sa') {
         const correctAns = String(q.correctAnswer || q.correct || '').trim().toLowerCase();
         const studentAns = String(ans || '').trim().toLowerCase();
         if (correctAns && studentAns === correctAns) totalScore += 1;
      }
      // essay logic requires manual grading, so 0 point auto
    });
    
    const finalScore = currentExam.questions.length > 0 ? (totalScore / currentExam.questions.length) * 10 : 0;
    setScore(finalScore);
    setIsSubmitted(true);
  };

  if (!isStarted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 max-w-md w-full">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
              <FileText className="w-8 h-8 text-emerald-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-center text-slate-800 mb-2">{examData.examData.examName}</h1>
          <p className="text-center text-slate-500 mb-8">Vui lòng điền thông tin để bắt đầu làm bài</p>
          
          <div className="space-y-4 mb-8">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Họ và tên</label>
              <input type="text" value={studentInfo.name} onChange={e => setStudentInfo({...studentInfo, name: e.target.value})} className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Nhập họ và tên..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Lớp</label>
              <input type="text" value={studentInfo.class} onChange={e => setStudentInfo({...studentInfo, class: e.target.value})} className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Nhập tên lớp..." />
            </div>
          </div>
          
          <button 
            disabled={!studentInfo.name || !studentInfo.class}
            onClick={() => {
              setIsStarted(true);
              if (examData?.examData?.duration) {
                const mins = parseInt(examData.examData.duration);
                if (!isNaN(mins)) setTimeLeft(mins * 60);
              }
            }}
            className="w-full py-3.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Bắt đầu làm bài
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="font-bold text-slate-800 truncate">{examData.examData.examName}</h1>
            <p className="text-xs text-slate-500">Học sinh: {studentInfo.name} - Lớp: {studentInfo.class}</p>
          </div>
          {isStarted && !isSubmitted && timeLeft !== null && (
            <div className="flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-lg font-bold border border-amber-200">
              <Clock className="w-5 h-5" />
              <span>{Math.floor(timeLeft / 60).toString().padStart(2, '0')}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
            </div>
          )}
          {!isSubmitted && (
            <button onClick={handleSubmit} className="px-6 py-2 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700">
              Nộp Bài
            </button>
          )}
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {isSubmitted && (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-emerald-200 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500"></div>
            <Trophy className="w-16 h-16 mx-auto text-yellow-500 mb-4" />
            <h2 className="text-3xl font-bold text-slate-800 mb-2">Điểm của bạn: {score.toFixed(1)}/10</h2>
            <p className="text-slate-600 mb-4">Bạn đã hoàn thành bài kiểm tra. Xem chi tiết đáp án bên dưới.</p>
            <button onClick={() => {
              const txt = `Học sinh: ${studentInfo.name} - Lớp: ${studentInfo.class}\nĐã hoàn thành Đề: ${examData.examData.examName}\nMã đề: ${currentExam.code}\nĐiểm số: ${score.toFixed(1)}/10\nThời gian làm bài: ${Math.floor(timeSpent/60)} phút ${timeSpent%60} giây`;
              navigator.clipboard.writeText(txt);
              alert("Đã sao chép kết quả! Bạn có thể gửi cho Giáo viên qua Zalo.");
            }} className="px-6 py-2 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-700 inline-flex items-center gap-2">
               <Copy className="w-4 h-4" /> Sao chép Kết quả gửi GV
            </button>
          </div>
        )}
        
        {currentExam.questions.map((q: any, idx: number) => {
          
          let isCorrectQuestion = false;
          let showRedBorder = false;
          
          if (isSubmitted) {
            const ans = answers[idx];
            if (q.type === 'mc' || (!q.type && q.options)) {
              isCorrectQuestion = ans === q.correctOptionIndex;
              showRedBorder = !isCorrectQuestion;
            } else if (q.type === 'tf') {
              if (q.tfStatements && q.tfStatements.length > 0) {
                 let correctCount = 0;
                 q.tfStatements.forEach((stmt: any, sIdx: number) => {
                   const studentAns = ans ? ans[sIdx] : undefined;
                   const isTrue = stmt.correct === true || String(stmt.correct).toLowerCase() === 'true';
                   if (studentAns === isTrue) correctCount++;
                 });
                 isCorrectQuestion = correctCount === q.tfStatements.length;
                 showRedBorder = correctCount < q.tfStatements.length;
              } else {
                 const isTrue = q.correct === true || String(q.correct).toLowerCase() === 'true' || String(q.correctAnswer).toLowerCase().includes('đúng');
                 isCorrectQuestion = ans === isTrue;
                 showRedBorder = !isCorrectQuestion;
              }
            } else if (q.type === 'sa') {
               const correctAns = String(q.correctAnswer || q.correct || '').trim().toLowerCase();
               const studentAns = String(ans || '').trim().toLowerCase();
               isCorrectQuestion = !!(correctAns && studentAns === correctAns);
               showRedBorder = !isCorrectQuestion;
            } else {
               showRedBorder = false;
               isCorrectQuestion = true;
            }
          }

          return (
            <div key={idx} className={`bg-white p-6 rounded-xl shadow-sm border ${isSubmitted && showRedBorder ? 'border-red-200' : isSubmitted ? 'border-emerald-200' : 'border-slate-200'}`}>
              <h3 className="font-medium text-slate-800 mb-4 leading-relaxed">
                <span className="font-bold">Câu {idx + 1}:</span> <div className="markdown-body inline-block"><Markdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]} >{q.content}</Markdown></div>
              </h3>
              
              <div className="space-y-3">
                {/* MULTIPLE CHOICE */}
                {(q.type === 'mc' || (!q.type && q.options)) && q.options?.map((opt: string, oIdx: number) => {
                  const isSelected = answers[idx] === oIdx;
                  const isCorrect = oIdx === q.correctOptionIndex;
                  
                  let btnClass = "w-full text-left p-4 rounded-xl border transition-colors flex items-center gap-3 ";
                  if (!isSubmitted) {
                    btnClass += isSelected ? "bg-emerald-50 border-emerald-500 text-emerald-900" : "bg-white border-slate-200 hover:border-emerald-300 hover:bg-slate-50 text-slate-700";
                  } else {
                    if (isCorrect) btnClass += "bg-emerald-50 border-emerald-500 text-emerald-900";
                    else if (isSelected && !isCorrect) btnClass += "bg-red-50 border-red-500 text-red-900";
                    else btnClass += "bg-white border-slate-200 text-slate-500 opacity-60";
                  }
                  
                  return (
                    <button 
                      key={oIdx} 
                      onClick={() => !isSubmitted && setAnswers({...answers, [idx]: oIdx})}
                      disabled={isSubmitted}
                      className={btnClass}
                    >
                      <div className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 ${isSelected && !isSubmitted ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300'}`}>
                        {String.fromCharCode(65 + oIdx)}
                      </div>
                      <span className="flex-1"><div className="markdown-body inline-block"><Markdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]} >{opt.replace(/^[A-D][\.\:\)]\s*/i, '')}</Markdown></div></span>
                      {isSubmitted && isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                      {isSubmitted && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-red-600" />}
                    </button>
                  );
                })}

                {/* TRUE / FALSE (4 Statements format) */}
                {q.type === 'tf' && q.tfStatements && q.tfStatements.length > 0 && (
                  <div className="space-y-4">
                    {q.tfStatements.map((stmt: any, sIdx: number) => {
                      const ansMap = answers[idx] || {};
                      const studentAns = ansMap[sIdx];
                      const isTrue = stmt.correct === true || String(stmt.correct).toLowerCase() === 'true';
                      
                      return (
                        <div key={sIdx} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50">
                          <div className="flex-1"><div className="markdown-body inline-block"><Markdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]} >{stmt.statement}</Markdown></div></div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button 
                              disabled={isSubmitted}
                              onClick={() => !isSubmitted && setAnswers({...answers, [idx]: {...ansMap, [sIdx]: true}})}
                              className={`px-4 py-2 rounded-lg border font-medium text-sm transition-colors ${studentAns === true ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'} ${(isSubmitted && isTrue) ? 'ring-2 ring-emerald-500' : ''}`}
                            >
                              Đúng
                            </button>
                            <button 
                              disabled={isSubmitted}
                              onClick={() => !isSubmitted && setAnswers({...answers, [idx]: {...ansMap, [sIdx]: false}})}
                              className={`px-4 py-2 rounded-lg border font-medium text-sm transition-colors ${studentAns === false ? 'bg-red-600 text-white border-red-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'} ${(isSubmitted && !isTrue) ? 'ring-2 ring-emerald-500' : ''}`}
                            >
                              Sai
                            </button>
                            {isSubmitted && studentAns === isTrue && <CheckCircle2 className="w-5 h-5 text-emerald-600 ml-2" />}
                            {isSubmitted && studentAns !== undefined && studentAns !== isTrue && <XCircle className="w-5 h-5 text-red-600 ml-2" />}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
                
                {/* TRUE / FALSE (Single statement) */}
                {q.type === 'tf' && (!q.tfStatements || q.tfStatements.length === 0) && (
                   <div className="flex items-center gap-3">
                     <button 
                        disabled={isSubmitted}
                        onClick={() => !isSubmitted && setAnswers({...answers, [idx]: true})}
                        className={`flex-1 py-4 rounded-xl border font-bold transition-colors ${answers[idx] === true ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
                      >
                        Đúng
                      </button>
                      <button 
                        disabled={isSubmitted}
                        onClick={() => !isSubmitted && setAnswers({...answers, [idx]: false})}
                        className={`flex-1 py-4 rounded-xl border font-bold transition-colors ${answers[idx] === false ? 'bg-red-600 text-white border-red-600' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
                      >
                        Sai
                      </button>
                   </div>
                )}

                {/* SHORT ANSWER */}
                {q.type === 'sa' && (
                  <div className="space-y-2">
                    <input 
                      type="text" 
                      disabled={isSubmitted}
                      value={answers[idx] || ''}
                      onChange={(e) => setAnswers({...answers, [idx]: e.target.value})}
                      placeholder="Nhập câu trả lời ngắn của bạn..."
                      className={`w-full p-4 rounded-xl border focus:ring-2 focus:ring-emerald-500 outline-none ${isSubmitted && isCorrectQuestion ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : isSubmitted && !isCorrectQuestion ? 'border-red-500 bg-red-50 text-red-900' : 'border-slate-300 bg-white text-slate-800'}`}
                    />
                    {isSubmitted && (
                      <div className="mt-2 text-sm">
                        <span className="text-slate-500">Đáp án chuẩn: </span>
                        <span className="font-semibold text-emerald-600">{q.correctAnswer || q.correct}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* ESSAY */}
                {q.type === 'essay' && (
                  <div className="space-y-2">
                    <textarea 
                      disabled={isSubmitted}
                      value={answers[idx] || ''}
                      onChange={(e) => setAnswers({...answers, [idx]: e.target.value})}
                      placeholder="Nhập câu trả lời tự luận..."
                      className="w-full p-4 rounded-xl border border-slate-300 bg-white text-slate-800 min-h-[150px] focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                    {isSubmitted && (
                      <div className="mt-4 p-4 bg-slate-100 rounded-lg border border-slate-200">
                        <span className="text-slate-500 font-semibold block mb-2">Gợi ý chấm / Đáp án chuẩn:</span>
                        <div className="markdown-body text-sm"><Markdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]} >{q.correctAnswer || q.explanation || q.correct || ''}</Markdown></div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* EXPLANATION */}
                {isSubmitted && q.explanation && q.type !== 'essay' && (
                   <div className="mt-4 p-4 bg-slate-100 rounded-lg border border-slate-200">
                     <span className="text-slate-500 font-semibold block mb-2">Giải thích:</span>
                     <div className="markdown-body text-sm"><Markdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]} >{q.explanation}</Markdown></div>
                   </div>
                )}
              </div>
            </div>
          );
        })}
      </main>
    </div>
  );
}
