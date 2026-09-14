import { apiFetch } from '../lib/apiFetch';

import Markdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { useState, useEffect } from "react";
import { CheckCircle2, XCircle, Trophy, FileText, Loader2 } from "lucide-react";

export function StudentExamView({ examId }: { examId: string }) {
  const [examData, setExamData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studentInfo, setStudentInfo] = useState({ name: "", class: "" });
  const [isStarted, setIsStarted] = useState(false);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    apiFetch(`/api/exams/${examId}`)
      .then(res => {
        if (!res.ok) throw new Error("Không tìm thấy đề thi. Có thể link đã hết hạn.");
        return res.json();
      })
      .then(data => {
        setExamData(data);
        if (data.codes && data.codes.length > 0) {
          // randomly assign a code to student
          const randomCode = data.codes[Math.floor(Math.random() * data.codes.length)].code;
          setSelectedCode(randomCode);
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [examId]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-10 h-10 animate-spin text-emerald-600" /></div>;
  if (error) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="bg-red-50 text-red-700 p-6 rounded-xl max-w-md text-center">{error}</div></div>;
  if (!examData) return null;

  const currentExam = examData.codes.find((c: any) => c.code === selectedCode);

  const handleSubmit = () => {
    if (!currentExam) return;
    if (Object.keys(answers).length < currentExam.questions.length) {
      if (!confirm("Bạn chưa làm hết các câu hỏi. Bạn có chắc chắn muốn nộp bài?")) return;
    }
    
    let correct = 0;
    let totalMc = 0;
    currentExam.questions.forEach((q: any, idx: number) => {
      if (q.type === 'mc' || q.options) {
        totalMc++;
        if (answers[idx] === q.correctOptionIndex) correct++;
      }
    });
    
    setScore(totalMc > 0 ? (correct / totalMc) * 10 : 0);
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
            onClick={() => setIsStarted(true)}
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
            <p className="text-slate-600">Bạn đã hoàn thành bài kiểm tra. Xem chi tiết đáp án bên dưới.</p>
          </div>
        )}

        {currentExam.questions.map((q: any, idx: number) => (
          <div key={idx} className={`bg-white p-6 rounded-xl shadow-sm border ${isSubmitted && answers[idx] !== q.correctOptionIndex ? 'border-red-200' : isSubmitted ? 'border-emerald-200' : 'border-slate-200'}`}>
            <h3 className="font-medium text-slate-800 mb-4 leading-relaxed">
              <span className="font-bold">Câu {idx + 1}:</span> <div className="markdown-body"><Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]} >{q.content}</Markdown></div>
            </h3>
            <div className="space-y-3">
              {q.type !== 'mc' && !q.options ? (
                <div className="p-4 bg-amber-50 text-amber-700 rounded-lg text-sm border border-amber-200">
                  Phần mềm chấm điểm tự động hiện tại chỉ hỗ trợ trắc nghiệm. Vui lòng làm câu này ra giấy.
                </div>
              ) : q.options?.map((opt: string, oIdx: number) => {
                const isSelected = answers[idx] === oIdx;
                const isCorrect = oIdx === q.correctOptionIndex;
                
                let btnClass = "w-full text-left p-4 rounded-xl border transition-colors flex items-center gap-3 ";
                if (!isSubmitted) {
                  btnClass += isSelected ? "bg-emerald-50 border-emerald-500 text-emerald-900" : "bg-white border-slate-200 hover:border-emerald-300 hover:bg-slate-50 text-slate-700";
                } else {
                  if (isCorrect) {
                    btnClass += "bg-emerald-50 border-emerald-500 text-emerald-900";
                  } else if (isSelected && !isCorrect) {
                    btnClass += "bg-red-50 border-red-500 text-red-900";
                  } else {
                    btnClass += "bg-white border-slate-200 text-slate-500 opacity-60";
                  }
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
                    <span className="flex-1"><div className="markdown-body"><Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]} >{opt.replace(/^[A-D][\.\:\)]\s*/i, '')}</Markdown></div></span>
                    {isSubmitted && isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                    {isSubmitted && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-red-600" />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
