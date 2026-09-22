import { MarkdownRenderer } from "../components/MarkdownRenderer";
import React, { useState, useEffect } from 'react';
import { Loader2, FileText, Trophy, CheckCircle2, XCircle, Clock, Copy, Camera, X, Image as ImageIcon } from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { apiFetch } from '../lib/apiFetch';
import LZString from 'lz-string';
import { fixMath, cleanMath, cleanQuestionStem, cleanOptionText, formatMathContent, sanitizeShortAnswerInput, validateShortAnswer, compareShortAnswers } from "../lib/utils";
import { fetchExamFromCloud, SYSTEM_EXAM_WEBHOOK } from "../lib/cloudExamStore";

export function StudentExamView({ examId, examRawData }: { examId?: string, examRawData?: string }) {
  const [loading, setLoading] = useState(Boolean(examId || examRawData));
  const [error, setError] = useState<string | null>(null);
  const [examData, setExamData] = useState<any>(null);
  const [inputPin, setInputPin] = useState(examId || '');
  
  const [isStarted, setIsStarted] = useState(false);
  const [studentInfo, setStudentInfo] = useState({ name: '', class: '' });
  
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [essayImages, setEssayImages] = useState<Record<number, string[]>>({});
  const [previewingImage, setPreviewingImage] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [timeSpent, setTimeSpent] = useState<number>(0);

  const fetchExamById = async (id: string) => {
    const cleanId = id.trim();
    if (!cleanId) return;
    setLoading(true);
    setError(null);
    
    try {
      const data = await fetchExamFromCloud(cleanId);

      if (!data) {
        throw new Error(`Không tìm thấy bài thi với mã "${cleanId}". Vui lòng kiểm tra lại mã PIN hoặc yêu cầu thầy/cô gửi lại link.`);
      }

      setExamData(data);
      if (data.codes && data.codes.length > 0) {
        const randomCode = data.codes[Math.floor(Math.random() * data.codes.length)].code;
        setSelectedCode(randomCode);
      } else {
        setSelectedCode("101");
      }
    } catch (err: any) {
      setError(err.message || "Lỗi kết nối đến phòng thi.");
    } finally {
      setLoading(false);
    }
  };

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
          } else {
            setSelectedCode("101");
          }
          setLoading(false);
          return;
        } else {
          throw new Error("Dữ liệu đề thi không hợp lệ.");
        }
      } catch (e: any) {
        setError("Lỗi tải đề thi: " + (e.message || ""));
        setLoading(false);
        return;
      }
    }
    
    if (examId) {
      fetchExamById(examId);
    } else {
      setLoading(false);
    }
  }, [examId, examRawData]);

  useEffect(() => {
    let timer: any;
    if (isStarted && !isSubmitted) {
      timer = setInterval(() => {
        setTimeSpent(prev => prev + 1);
        if (timeLeft !== null) {
          setTimeLeft(prev => {
            if (prev !== null && prev > 1) {
              return prev - 1;
            } else if (prev !== null && prev <= 1) {
              return 0;
            }
            return prev;
          });
        }
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isStarted, isSubmitted, timeLeft]);

  useEffect(() => {
    if (isStarted && !isSubmitted && timeLeft === 0) {
      handleSubmit();
      alert("Đã hết thời gian làm bài! Hệ thống tự động nộp bài.");
    }
  }, [timeLeft, isStarted, isSubmitted]);

  const examTitle = examData?.examData?.examName || examData?.examName || "Đề kiểm tra trực tuyến";
  const examType = examData?.examData?.examType || examData?.examType || "";
  const startTimeStr = examData?.examData?.startTime || examData?.startTime || null;
  const endTimeStr = examData?.examData?.endTime || examData?.endTime || null;
  const rawDuration = examData?.examData?.examDuration ?? examData?.examData?.duration ?? examData?.examDuration ?? examData?.duration;
  const isUnlimited = examData?.examData?.isUnlimitedTime || examData?.isUnlimitedTime || rawDuration === 0 || rawDuration === '0';
  const examDuration = isUnlimited ? 0 : (Number(rawDuration) || 45);

  const nowTimestamp = Date.now();
  const isBeforeStart = startTimeStr ? nowTimestamp < new Date(startTimeStr).getTime() : false;
  const isAfterEnd = endTimeStr ? nowTimestamp > new Date(endTimeStr).getTime() : false;

  const currentExam = React.useMemo(() => {
    if (!examData) return null;
    if (Array.isArray(examData.codes) && examData.codes.length > 0) {
      return examData.codes.find((c: any) => c.code === selectedCode) || examData.codes[0];
    }
    if (Array.isArray(examData.questions) && examData.questions.length > 0) {
      return { code: selectedCode || "101", questions: examData.questions };
    }
    return null;
  }, [examData, selectedCode]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
        <p className="text-slate-600 text-sm font-medium">Đang tải đề thi...</p>
      </div>
    );
  }

  if (!examData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 max-w-md w-full">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
              <FileText className="w-8 h-8 text-emerald-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-center text-slate-800 mb-2">Vào Phòng Thi Online</h1>
          <p className="text-center text-slate-500 mb-6 text-sm">Nhập mã đề thi do giáo viên cung cấp để bắt đầu làm bài</p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              <p className="font-semibold mb-1">Thông báo:</p>
              <p>{error}</p>
            </div>
          )}

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Mã đề / Mã phòng thi</label>
              <input 
                type="text" 
                value={inputPin} 
                onChange={e => setInputPin(e.target.value.toUpperCase())} 
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono text-center text-xl font-bold tracking-widest uppercase outline-none" 
                placeholder="VD: K8F3KD" 
                autoFocus
              />
            </div>
            <button 
              disabled={!inputPin.trim()}
              onClick={() => fetchExamById(inputPin.trim())}
              className="w-full py-3.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Vào Phòng Thi
            </button>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs space-y-2">
            <p className="font-bold flex items-center gap-1.5">
              <span>💡</span> Lưu ý nếu mở qua Zalo:
            </p>
            <p>Nếu gặp thông báo link bị chặn hoặc không mở được, em hãy bấm vào biểu tượng <strong>dấu 3 chấm (···)</strong> ở góc trên bên phải màn hình Zalo, rồi chọn <strong>"Mở bằng trình duyệt"</strong> (Chrome hoặc Safari).</p>
          </div>
        </div>
      </div>
    );
  }

  const handleImageUpload = (qIdx: number, files: FileList | null) => {
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        if (base64) {
          setEssayImages(prev => ({
            ...prev,
            [qIdx]: [...(prev[qIdx] || []), base64]
          }));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeEssayImage = (qIdx: number, imgIdx: number) => {
    setEssayImages(prev => {
      const list = [...(prev[qIdx] || [])];
      list.splice(imgIdx, 1);
      return { ...prev, [qIdx]: list };
    });
  };

  const handleSubmit = () => {
    if (!currentExam || !currentExam.questions) return;
    
    // Check if fully answered
    let answeredCount = 0;
    currentExam.questions.forEach((q: any, idx: number) => {
      const ans = answers[idx];
      const qType = String(q.type || '').toUpperCase();
      if (q.type === 'mc' || qType === 'MULTIPLE_CHOICE' || (!q.type && q.options)) {
        if (ans !== undefined) answeredCount++;
      } else if (q.type === 'tf' || qType === 'TRUE_FALSE') {
        if (ans && Object.keys(ans).length === 4) answeredCount++; // Vietnam standard TF has 4 statements
        else if (ans !== undefined) answeredCount++; // Or single TF
      } else if (q.type === 'sa' || qType === 'SHORT_ANSWER') {
        if (ans && String(ans).trim().length > 0) answeredCount++;
      } else if (q.type === 'essay' || qType === 'ESSAY') {
        const hasText = ans && String(ans).trim().length > 0;
        const hasImgs = essayImages[idx] && essayImages[idx].length > 0;
        if (hasText || hasImgs) answeredCount++;
      }
    });

    if (answeredCount < currentExam.questions.length) {
      if (!confirm("Bạn chưa làm hết các câu hỏi. Bạn có chắc chắn muốn nộp bài?")) return;
    }
    
    let totalScore = 0;
    let fullCorrectCount = 0;
    let wrongCount = 0;
    
    const objectiveQuestions = currentExam.questions.filter((q: any) => {
      const qType = String(q.type || '').toUpperCase();
      return q.type !== 'essay' && qType !== 'ESSAY';
    });

    const detailedAnswers: Array<{
      questionNumber: number;
      studentChoice: string;
      correctChoice: string;
      isCorrect: boolean;
      type: string;
      hasAnswered: boolean;
      questionContent?: string;
      options?: string[];
      tfDetails?: Array<{
        sub: string;
        statement: string;
        studentChoice: string;
        correctChoice: string;
        isCorrect: boolean;
        hasAnswered: boolean;
      }>;
      explanation?: string;
      essayText?: string;
      essayImages?: string[];
    }> = [];

    currentExam.questions.forEach((q: any, idx: number) => {
      const ans = answers[idx];
      let isCorrect = false;
      let isWrong = false;
      const qType = String(q.type || '').toUpperCase();
      const qNum = idx + 1;
      const content = q.content || q.question || q.text || '';
      const explanation = q.explanation || '';
      
      if (q.type === 'essay' || qType === 'ESSAY') {
        const textAns = String(answers[idx] || '').trim();
        const imgs = essayImages[idx] || [];
        const hasAns = textAns.length > 0 || imgs.length > 0;
        detailedAnswers.push({
          questionNumber: qNum,
          studentChoice: textAns || (imgs.length > 0 ? `[Đã đính kèm ${imgs.length} ảnh]` : 'Chưa làm'),
          correctChoice: q.correctAnswer || q.explanation || 'Tự luận (GV chấm)',
          isCorrect: false,
          type: 'essay',
          hasAnswered: hasAns,
          questionContent: content,
          explanation,
          essayText: textAns,
          essayImages: imgs
        });
      } else if (q.type === 'mc' || qType === 'MULTIPLE_CHOICE' || (!q.type && q.options)) {
        if (ans === q.correctOptionIndex) { totalScore += 1; isCorrect = true; }
        else if (ans !== undefined) { isWrong = true; }

        const optLetter = (ans !== undefined && ans >= 0 && ans <= 3) ? String.fromCharCode(65 + ans) : '';
        const corrLetter = (q.correctOptionIndex !== undefined && q.correctOptionIndex >= 0 && q.correctOptionIndex <= 3) 
          ? String.fromCharCode(65 + q.correctOptionIndex) 
          : (String(q.correctAnswer || 'A').toUpperCase().charAt(0));

        detailedAnswers.push({
          questionNumber: qNum,
          studentChoice: optLetter || 'Chưa làm',
          correctChoice: corrLetter,
          isCorrect,
          type: 'mc',
          hasAnswered: ans !== undefined,
          questionContent: content,
          options: q.options || [],
          explanation
        });
      } else if (q.type === 'tf' || qType === 'TRUE_FALSE') {
        if (q.tfStatements && q.tfStatements.length > 0) {
           let correctCount = 0;
           let answered = false;
           const tfDetails = q.tfStatements.map((stmt: any, sIdx: number) => {
             const sub = String.fromCharCode(97 + sIdx);
             const studentAns = ans ? ans[sIdx] : undefined;
             if (studentAns !== undefined) answered = true;
             const isTrue = stmt.correct === true || String(stmt.correct).toLowerCase() === 'true';
             const isSubOk = studentAns !== undefined && studentAns === isTrue;
             if (isSubOk) correctCount++;
             return {
               sub,
               statement: stmt.statement || stmt.text || '',
               studentChoice: studentAns === true ? 'Đúng' : studentAns === false ? 'Sai' : 'Chưa chọn',
               correctChoice: isTrue ? 'Đúng' : 'Sai',
               isCorrect: isSubOk,
               hasAnswered: studentAns !== undefined
             };
           });

           if (correctCount === 1) totalScore += 0.1;
           else if (correctCount === 2) totalScore += 0.25;
           else if (correctCount === 3) totalScore += 0.5;
           else if (correctCount === 4) { totalScore += 1.0; isCorrect = true; }
           
           if (answered && correctCount < 4) isWrong = true;

           const studentChoiceStr = tfDetails.map(t => `${t.sub}:${t.studentChoice === 'Đúng' ? 'Đ' : t.studentChoice === 'Sai' ? 'S' : '-'}`).join(' ');
           const correctChoiceStr = tfDetails.map(t => `${t.sub}:${t.correctChoice === 'Đúng' ? 'Đ' : 'S'}`).join(' ');

           detailedAnswers.push({
             questionNumber: qNum,
             studentChoice: answered ? studentChoiceStr : 'Chưa làm',
             correctChoice: correctChoiceStr,
             isCorrect,
             type: 'tf',
             hasAnswered: answered,
             questionContent: content,
             tfDetails,
             explanation
           });
        } else {
           const isTrue = q.correct === true || String(q.correct).toLowerCase() === 'true' || String(q.correctAnswer).toLowerCase().includes('đúng');
           if (ans === isTrue) { totalScore += 1; isCorrect = true; }
           else if (ans !== undefined) { isWrong = true; }

           detailedAnswers.push({
             questionNumber: qNum,
             studentChoice: ans === true ? 'Đúng' : ans === false ? 'Sai' : 'Chưa làm',
             correctChoice: isTrue ? 'Đúng' : 'Sai',
             isCorrect,
             type: 'tf',
             hasAnswered: ans !== undefined,
             questionContent: content,
             explanation
           });
        }
      } else if (q.type === 'sa' || qType === 'SHORT_ANSWER') {
         const correctAns = String(q.correctAnswer || q.correct || '').trim();
         const studentAns = String(ans || '').trim();
         if (correctAns && compareShortAnswers(studentAns, correctAns)) { totalScore += 1; isCorrect = true; }
         else if (ans !== undefined && studentAns !== '') { isWrong = true; }

         detailedAnswers.push({
           questionNumber: qNum,
           studentChoice: studentAns || 'Chưa làm',
           correctChoice: correctAns,
           isCorrect,
           type: 'sa',
           hasAnswered: studentAns.length > 0,
           questionContent: content,
           explanation
         });
      }
      
      if (isCorrect) fullCorrectCount++;
      if (isWrong) wrongCount++;
    });
    
    const finalScore = objectiveQuestions.length > 0 ? (totalScore / objectiveQuestions.length) * 10 : 0;
    setScore(finalScore);
    setIsSubmitted(true);
    
    // Save result to localStorage
    const hasEssayQuestions = Boolean(currentExam?.questions?.some((q: any) => {
      const qType = String(q.type || '').toUpperCase();
      return q.type === 'essay' || qType === 'ESSAY';
    }));

    const resultToSave = {
      id: Date.now().toString(),
      examId: currentExam?.code || examId || 'online_exam',
      examName: examData.examName || examTitle || 'Phiếu bài tập',
      examType: examType || '',
      duration: isUnlimited ? 'Không giới hạn' : examDuration,
      studentName: studentInfo.name || 'Học sinh ẩn danh',
      studentClass: studentInfo.class || '',
      score: Number(finalScore.toFixed(2)),
      correct: fullCorrectCount,
      incorrect: wrongCount,
      unanswered: objectiveQuestions.length - fullCorrectCount - wrongCount,
      totalQuestions: currentExam.questions.length,
      hasEssay: hasEssayQuestions,
      detailedAnswers: detailedAnswers,
      essaySubmissions: currentExam.questions.map((q: any, idx: number) => {
        const qType = String(q.type || '').toUpperCase();
        if (q.type === 'essay' || qType === 'ESSAY') {
          return {
            questionIndex: idx + 1,
            questionContent: q.content || q.question || q.text || '',
            imageUrl: q.imageUrl || '',
            textAnswer: answers[idx] || '',
            images: essayImages[idx] || []
          };
        }
        return null;
      }).filter(Boolean),
      questionsSnapshot: currentExam.questions.map((q: any, idx: number) => {
        const qType = String(q.type || '').toUpperCase();
        return {
          index: idx + 1,
          type: q.type || qType,
          content: q.content || q.question || q.text || '',
          options: q.options,
          tfStatements: q.tfStatements,
          correctOptionIndex: q.correctOptionIndex,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          imageUrl: q.imageUrl,
          studentAnswer: answers[idx],
          studentImages: essayImages[idx] || []
        };
      }),
      answers: answers,
      timeSpent: timeSpent, // in seconds
      submittedAt: new Date().toISOString()
    };
    
    try {
      const existingResults = JSON.parse(localStorage.getItem('eduplan_exam_results') || '[]');
      existingResults.push(resultToSave);
      localStorage.setItem('eduplan_exam_results', JSON.stringify(existingResults));
    } catch(e) {
      console.error("Lỗi lưu kết quả:", e);
    }

    // Tự động gửi điểm qua Webhook trung tâm
    try {
      const formattedTimeSpent = `${Math.floor(timeSpent / 60)} phút ${timeSpent % 60} giây`;
      fetch(SYSTEM_EXAM_WEBHOOK, {
        method: 'POST',
        mode: 'no-cors', // Tránh chặn CORS trên trình duyệt
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId: currentExam.id || currentExam.code || examId || 'online_exam',
          examName: examTitle,
          examType: examType || 'Đề kiểm tra',
          duration: isUnlimited ? 'Không giới hạn' : `${examDuration} phút`,
          studentName: studentInfo.name,
          className: studentInfo.class,
          score: Number(finalScore.toFixed(2)),
          correctCount: fullCorrectCount,
          totalQuestions: objectiveQuestions.length,
          timeSpent: formattedTimeSpent,
          detailedAnswers: detailedAnswers
        })
      }).catch(err => {
        console.warn("Lỗi gửi Webhook điểm thi:", err);
      });
    } catch (err) {
      console.warn("Lỗi gọi fetch Webhook:", err);
    }
  };

  if (!isStarted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 max-w-md w-full text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
              <FileText className="w-8 h-8 text-emerald-600" />
            </div>
          </div>

          {examType && (
            <div className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold mb-2">
              {examType}
            </div>
          )}

          <h1 className="text-2xl font-bold text-slate-800 mb-2">{examTitle}</h1>
          <p className="text-slate-500 mb-5 text-sm">
            Thời lượng: <strong className="text-emerald-700 font-semibold">{isUnlimited ? "Không giới hạn thời gian" : `${examDuration} phút`}</strong>
          </p>

          {/* Schedule Warnings */}
          {isBeforeStart && startTimeStr && (
            <div className="mb-5 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs text-left space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-amber-900">
                <span>🕒</span> Phòng thi chưa đến giờ mở đề!
              </p>
              <p>Thời gian bắt đầu làm bài: <strong>{new Date(startTimeStr).toLocaleString('vi-VN')}</strong>. Vui lòng quay lại vào đúng khung giờ trên.</p>
            </div>
          )}

          {isAfterEnd && endTimeStr && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs text-left space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-rose-900">
                <span>⛔</span> Đã hết thời hạn làm bài!
              </p>
              <p>Phòng thi đã đóng lúc: <strong>{new Date(endTimeStr).toLocaleString('vi-VN')}</strong>. Hệ thống không còn nhận bài làm mới.</p>
            </div>
          )}
          
          <div className="space-y-4 mb-6 text-left">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Họ và tên học sinh</label>
              <input 
                type="text" 
                value={studentInfo.name} 
                onChange={e => setStudentInfo({...studentInfo, name: e.target.value})} 
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" 
                placeholder="Ví dụ: Nguyễn Văn A" 
                disabled={isBeforeStart || isAfterEnd}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Lớp</label>
              <input 
                type="text" 
                value={studentInfo.class} 
                onChange={e => setStudentInfo({...studentInfo, class: e.target.value})} 
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" 
                placeholder="Ví dụ: 12A1" 
                disabled={isBeforeStart || isAfterEnd}
              />
            </div>
          </div>
          
          <button 
            disabled={!studentInfo.name.trim() || !studentInfo.class.trim() || isBeforeStart || isAfterEnd}
            onClick={() => {
              const currentNow = Date.now();
              if (startTimeStr && currentNow < new Date(startTimeStr).getTime()) {
                alert(`Phòng thi chưa đến giờ mở đề! Giờ mở đề: ${new Date(startTimeStr).toLocaleString('vi-VN')}`);
                return;
              }
              if (endTimeStr && currentNow > new Date(endTimeStr).getTime()) {
                alert(`Đã hết thời hạn làm bài thi! Phòng thi đã đóng lúc ${new Date(endTimeStr).toLocaleString('vi-VN')}`);
                return;
              }

              setIsStarted(true);
              const mins = parseInt(String(examDuration), 10);
              if (!isUnlimited && !isNaN(mins) && mins > 0) {
                let totalSecs = mins * 60;
                if (endTimeStr) {
                  const secsUntilEnd = Math.floor((new Date(endTimeStr).getTime() - currentNow) / 1000);
                  if (secsUntilEnd > 0 && secsUntilEnd < totalSecs) {
                    totalSecs = secsUntilEnd;
                  }
                }
                setTimeLeft(totalSecs);
              } else {
                setTimeLeft(null);
              }
            }}
            className="w-full py-3.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {isBeforeStart 
              ? "Chưa đến giờ mở đề" 
              : isAfterEnd 
              ? "Phòng thi đã đóng" 
              : `Bắt đầu làm bài ${isUnlimited ? "(Không giới hạn thời gian)" : `(${examDuration} phút)`}`}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-slate-800 truncate max-w-md">{examTitle}</h1>
              {examType && (
                <span className="hidden sm:inline-block px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded text-[11px] font-semibold">
                  {examType}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">Học sinh: {studentInfo.name} - Lớp: {studentInfo.class} (Mã đề: {currentExam?.code || selectedCode || "101"})</p>
          </div>
          {isStarted && !isSubmitted && (
            timeLeft !== null ? (
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold border text-sm ${
                timeLeft <= 300 
                  ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse' 
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                <Clock className="w-4 h-4" />
                <span>{Math.floor(timeLeft / 60).toString().padStart(2, '0')}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg font-semibold border border-emerald-200 text-xs sm:text-sm">
                <Clock className="w-4 h-4" />
                <span>Không giới hạn</span>
              </div>
            )
          )}
          {!isSubmitted && (
            <button onClick={handleSubmit} className="px-5 py-2 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 text-sm shadow-sm">
              Nộp Bài
            </button>
          )}
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Zalo browser recommendation banner */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900 flex items-center justify-between">
          <span>💡 <strong>Mẹo làm bài trên Zalo:</strong> Để công thức hiển thị mượt mà nhất, bạn có thể bấm <strong>(···)</strong> góc trên và chọn <em>"Mở bằng trình duyệt"</em>.</span>
        </div>

        {isSubmitted && (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-emerald-200 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500"></div>
            <Trophy className="w-16 h-16 mx-auto text-yellow-500 mb-4" />
            <h2 className="text-3xl font-bold text-slate-800 mb-2">
              {currentExam?.questions?.some((q: any) => q.type === 'essay' || String(q.type || '').toUpperCase() === 'ESSAY')
                ? `Điểm trắc nghiệm: ${score.toFixed(1)}/10`
                : `Điểm của bạn: ${score.toFixed(1)}/10`}
            </h2>
            {currentExam?.questions?.some((q: any) => q.type === 'essay' || String(q.type || '').toUpperCase() === 'ESSAY') ? (
              <div className="mb-4 inline-block bg-purple-50 border border-purple-200 text-purple-900 px-4 py-2.5 rounded-xl text-sm font-semibold shadow-2xs">
                Đã ghi nhận điểm trắc nghiệm {score.toFixed(1)} điểm. Bài tự luận đã được nộp để giáo viên chấm điểm.
              </div>
            ) : (
              <p className="text-slate-600 mb-4">Bạn đã hoàn thành bài kiểm tra. Xem chi tiết đáp án bên dưới.</p>
            )}
            <div>
              <button onClick={() => {
                const essaySubmissions = currentExam.questions.map((q: any, idx: number) => {
                  const qType = String(q.type || '').toUpperCase();
                  if (q.type === 'essay' || qType === 'ESSAY') {
                    const imgCount = essayImages[idx]?.length || 0;
                    return `Câu ${idx + 1}: ${answers[idx] ? `Có gõ bài làm` : `Đã nộp`}${imgCount > 0 ? ` + ${imgCount} ảnh bài giải` : ''}`;
                  }
                  return null;
                }).filter(Boolean);

                const essayNote = essaySubmissions.length > 0 
                  ? `\nPhần tự luận: Đã nộp ${essaySubmissions.length} câu để GV chấm (${essaySubmissions.join('; ')})` 
                  : '';
                const txt = `Học sinh: ${studentInfo.name} - Lớp: ${studentInfo.class}\nĐã hoàn thành Đề: ${examTitle}\nMã đề: ${currentExam?.code || selectedCode || "101"}\nĐiểm trắc nghiệm: ${score.toFixed(1)}/10${essayNote}\nThời gian làm bài: ${Math.floor(timeSpent/60)} phút ${timeSpent%60} giây`;
                navigator.clipboard.writeText(txt);
                alert("Đã sao chép kết quả! Bạn có thể gửi cho Giáo viên qua Zalo.");
              }} className="px-6 py-2.5 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-700 inline-flex items-center gap-2 text-sm shadow-xs transition-colors">
                <Copy className="w-4 h-4" /> Sao chép Kết quả gửi GV
              </button>
            </div>
          </div>
        )}
        
        {currentExam.questions.map((q: any, idx: number) => {
          
          let isCorrectQuestion = false;
          let showRedBorder = false;
          
          if (isSubmitted) {
            const ans = answers[idx];
            const qType = String(q.type || '').toUpperCase();
            if (q.type === 'mc' || qType === 'MULTIPLE_CHOICE' || (!q.type && q.options)) {
              isCorrectQuestion = ans === q.correctOptionIndex;
              showRedBorder = !isCorrectQuestion;
            } else if (q.type === 'tf' || qType === 'TRUE_FALSE') {
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
            } else if (q.type === 'sa' || qType === 'SHORT_ANSWER') {
               const correctAns = String(q.correctAnswer || q.correct || '').trim();
               const studentAns = String(ans || '').trim();
               isCorrectQuestion = !!(correctAns && compareShortAnswers(studentAns, correctAns));
               showRedBorder = !isCorrectQuestion;
            } else {
               showRedBorder = false;
               isCorrectQuestion = true;
            }
          }

          const qType = String(q.type || '').toUpperCase();
          const isMC = q.type === 'mc' || qType === 'MULTIPLE_CHOICE' || (!q.type && q.options);
          const isTF = q.type === 'tf' || qType === 'TRUE_FALSE';
          const isSA = q.type === 'sa' || qType === 'SHORT_ANSWER';
          const isEssay = q.type === 'essay' || qType === 'ESSAY';
          const question = q;

          const rawStem = (question.question && String(question.question).trim())
            ? String(question.question).trim()
            : (question.content && String(question.content).trim())
            ? String(question.content).trim()
            : (question.text || '');

          const stemWithoutOptions = (isMC || isTF)
            ? (cleanQuestionStem(rawStem, question.options, question.tfStatements) || rawStem)
            : rawStem;

          const trimmedStem = stemWithoutOptions.replace(/^(?:Câu|Bài)\s*\d+[\s\.\:\-–—\(\)\[\]A-Za-zÀ-ỹ]*[:\.]\s*/i, '').trim();
          const questionContent = trimmedStem || stemWithoutOptions || question.question || question.content || '';

          return (
            <div key={idx} className={`bg-white p-6 rounded-xl shadow-sm border ${isSubmitted && showRedBorder ? 'border-red-200' : isSubmitted ? 'border-emerald-200' : 'border-slate-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="font-bold text-slate-900 text-lg">Câu {idx + 1}:</span>
                {isEssay && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-purple-100 text-purple-700">Tự luận</span>
                )}
                {isSA && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-indigo-100 text-indigo-700">Trả lời ngắn</span>
                )}
                {isTF && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-700">Đúng / Sai</span>
                )}
                {isMC && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-blue-100 text-blue-700">Trắc nghiệm</span>
                )}
              </div>

              <div className="text-gray-800 text-base mb-4">
                <MarkdownRenderer content={questionContent} />
              </div>

              {/* Question Image (if any) */}
              {question.imageUrl && (
                <div className="flex flex-col items-center justify-center my-4 p-2 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <img
                    src={question.imageUrl}
                    alt={`Hình minh họa câu ${idx + 1}`}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="max-h-80 max-w-full object-contain rounded-lg border border-slate-200 bg-white"
                  />
                  <span className="text-xs text-slate-500 mt-1 italic">Hình minh họa / Đồ thị câu {idx + 1}</span>
                </div>
              )}
              
              <div className="space-y-3">
                {/* MULTIPLE CHOICE */}
                {isMC && q.options?.map((opt: string, oIdx: number) => {
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
                      <span className="flex-1"><MarkdownRenderer className="markdown-body inline-block" content={fixMath(cleanOptionText(opt))} /></span>
                      {isSubmitted && isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                      {isSubmitted && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-red-600" />}
                    </button>
                  );
                })}

                {/* TRUE / FALSE (4 Statements format - GDPT 2018) */}
                {isTF && q.tfStatements && q.tfStatements.length > 0 && (
                  <div className="space-y-4">
                    {q.tfStatements.map((stmt: any, sIdx: number) => {
                      const ansMap = answers[idx] || {};
                      const studentAns = ansMap[sIdx];
                      const isTrue = stmt.correct === true || String(stmt.correct).toLowerCase() === 'true';
                      const subLabel = ['a)', 'b)', 'c)', 'd)'][sIdx] || `${String.fromCharCode(97 + sIdx)})`;
                      let cleanStmt = (stmt.statement || '').trim();
                      cleanStmt = cleanStmt.replace(/^[a-d][\.\:\)]\s*/i, '');
                      
                      return (
                        <div key={sIdx} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50">
                          <div className="flex-1 flex items-start gap-2.5">
                            <span className="font-bold text-emerald-800 shrink-0 mt-0.5">{subLabel}</span>
                            <div className="flex-1">
                              <MarkdownRenderer className="markdown-body inline-block" content={fixMath(cleanStmt)} />
                            </div>
                          </div>
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
                      );
                    })}
                  </div>
                )}
                
                {/* TRUE / FALSE (Single statement) */}
                {isTF && (!q.tfStatements || q.tfStatements.length === 0) && (
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
                {isSA && (
                  <div className="space-y-3">
                    {/* Quy chuẩn & Mô phỏng 4 ô vuông phiếu trả lời trắc nghiệm giấy */}
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                          Nhập kết quả số (Tối đa 4 ký tự - Chuẩn GDPT 2018):
                        </label>
                        <span className="text-xs text-slate-500 font-mono">
                          Đã nhập: <strong className={(answers[idx] || '').length === 4 ? 'text-amber-600' : 'text-indigo-600'}>{(answers[idx] || '').length}/4</strong>
                        </span>
                      </div>

                      {/* 1 ô input duy nhất với giới hạn 4 ký tự và mô phỏng 4 ô vuông phiếu tô */}
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <input 
                            type="text" 
                            disabled={isSubmitted}
                            maxLength={4}
                            value={answers[idx] || ''}
                            onChange={(e) => {
                              const sanitized = sanitizeShortAnswerInput(e.target.value);
                              setAnswers({...answers, [idx]: sanitized});
                            }}
                            placeholder="vd: 22"
                            className={`w-36 text-center text-xl font-mono font-bold tracking-[0.45em] px-3 py-2.5 rounded-lg border-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all ${
                              isSubmitted && isCorrectQuestion 
                                ? 'border-emerald-500 bg-emerald-50 text-emerald-900' 
                                : isSubmitted && !isCorrectQuestion 
                                ? 'border-red-500 bg-red-50 text-red-900' 
                                : 'border-indigo-400 bg-white text-indigo-950 focus:border-indigo-600'
                            }`}
                          />
                        </div>

                        {/* Mô phỏng trực quan 4 ô vuông như trên phiếu tô trắc nghiệm giấy */}
                        <div className="flex items-center gap-1" title="Mô phỏng 4 ô vuông trên phiếu thi trắc nghiệm">
                          {[0, 1, 2, 3].map((slotIdx) => {
                            const char = (answers[idx] || '')[slotIdx];
                            return (
                              <div
                                key={slotIdx}
                                className={`w-8 h-10 border-2 rounded flex items-center justify-center font-mono font-bold text-base transition-colors ${
                                  char
                                    ? 'border-indigo-600 bg-indigo-50 text-indigo-800 shadow-2xs'
                                    : 'border-dashed border-slate-300 bg-white text-slate-300'
                                }`}
                              >
                                {char || '•'}
                              </div>
                            );
                          })}
                        </div>

                        <div className="hidden sm:block text-[11px] text-slate-500 leading-tight">
                          <div>Chỉ chấp nhận: chữ số (0-9), dấu (-) và (, hoặc .)</div>
                          <div className="text-slate-400 italic">Ví dụ hợp lệ: 13, -3.5, 102, 0.5</div>
                        </div>
                      </div>

                      {/* Cảnh báo validation nếu có ký tự lạ hoặc nhập sai */}
                      {(() => {
                        const curAns = answers[idx];
                        if (!curAns || isSubmitted) return null;
                        const validation = validateShortAnswer(curAns);
                        if (!validation.isValid && validation.warning) {
                          return (
                            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 flex items-center gap-1.5">
                              <span>⚠️</span>
                              <span>{validation.warning}</span>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>

                    {isSubmitted && (
                      <div className="mt-2 text-sm flex items-center gap-2 flex-wrap p-3 rounded-lg bg-emerald-50/70 border border-emerald-200">
                        <span className="text-emerald-900 font-bold">Đáp án chuẩn:</span>
                        <div className="font-mono font-bold text-base text-emerald-700 bg-white px-3 py-1 rounded border border-emerald-300">
                          <MarkdownRenderer content={formatMathContent(q.correctAnswer || q.correct || '')} />
                        </div>
                        {isCorrectQuestion ? (
                          <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" /> Chính xác
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-red-600 flex items-center gap-1">
                            <XCircle className="w-4 h-4" /> Chưa chính xác
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* ESSAY */}
                {isEssay && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                        <span>Nhập bài giải trực tiếp (nếu gõ phím):</span>
                        <span className="text-slate-400 font-normal">Hỗ trợ gõ text / ký hiệu toán</span>
                      </label>
                      <textarea 
                        disabled={isSubmitted}
                        value={answers[idx] || ''}
                        onChange={(e) => setAnswers({...answers, [idx]: e.target.value})}
                        placeholder="Em có thể gõ các bước giải tự luận tại đây..."
                        className="w-full p-4 rounded-xl border border-slate-300 bg-white text-slate-800 min-h-[140px] focus:ring-2 focus:ring-emerald-500 outline-none font-sans text-sm"
                      />
                    </div>

                    {/* Camera / Upload photos of paper work */}
                    <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-xl space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <Camera className="w-4 h-4 text-emerald-600" />
                            Chụp ảnh bài làm trên giấy:
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Khuyến khích học sinh chụp rõ chữ, có thể chụp nhiều trang/ảnh
                          </p>
                        </div>
                        {!isSubmitted && (
                          <label className="cursor-pointer px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors">
                            <Camera className="w-3.5 h-3.5" />
                            <span>📷 Chụp / Tải ảnh bài làm</span>
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              className="hidden"
                              onChange={(e) => handleImageUpload(idx, e.target.files)}
                            />
                          </label>
                        )}
                      </div>

                      {/* Preview Thumbnail Grid */}
                      {essayImages[idx] && essayImages[idx].length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                          {essayImages[idx].map((imgUrl, imgIdx) => (
                            <div key={imgIdx} className="relative group border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs aspect-3/4 flex items-center justify-center">
                              <img
                                src={imgUrl}
                                alt={`Ảnh bài làm trang ${imgIdx + 1}`}
                                className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                                onClick={() => setPreviewingImage(imgUrl)}
                              />
                              <div className="absolute top-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">
                                Ảnh {imgIdx + 1}
                              </div>
                              {!isSubmitted && (
                                <button
                                  type="button"
                                  onClick={() => removeEssayImage(idx, imgIdx)}
                                  className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 shadow hover:bg-red-700 transition-colors"
                                  title="Xóa ảnh này để chụp lại nếu bị mờ"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {isSubmitted && (
                      <div className="mt-4 p-4 bg-purple-50/80 rounded-xl border border-purple-200 space-y-2">
                        <span className="text-purple-900 font-bold block text-sm flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-purple-600" />
                          Hướng dẫn chấm / Đáp án chuẩn tự luận:
                        </span>
                        <div className="text-slate-800 text-sm">
                          <MarkdownRenderer className="markdown-body inline-block" content={fixMath(cleanMath(q.correctAnswer || q.explanation || q.correct || ''))} />
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* EXPLANATION */}
                {isSubmitted && q.explanation && !isEssay && (
                   <div className="mt-4 p-4 bg-slate-100 rounded-lg border border-slate-200">
                     <span className="text-slate-500 font-semibold block mb-2">Giải thích:</span>
                     <MarkdownRenderer className="markdown-body inline-block" content={fixMath(q.explanation || '')} />
                   </div>
                )}
              </div>
            </div>
          );
        })}
      </main>

      {/* Image Preview Lightbox Modal */}
      {previewingImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setPreviewingImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl p-2 overflow-hidden shadow-2xl flex flex-col items-center">
            <button 
              onClick={() => setPreviewingImage(null)}
              className="absolute top-3 right-3 z-10 p-2 bg-slate-800/80 hover:bg-slate-900 text-white rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
            <img 
              src={previewingImage} 
              alt="Xem trước bài làm" 
              className="max-h-[85vh] max-w-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}

