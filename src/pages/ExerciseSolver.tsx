import { apiFetch } from '../lib/apiFetch';
import { exportHtmlToWord } from '../lib/exportUtils';
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Copy, Save, Upload, X, Sparkles, Loader2, Download, Presentation, ChevronLeft, ChevronRight, Maximize2, FileText, BookmarkPlus, Camera, Image as ImageIcon, Send, ArrowLeft } from 'lucide-react';

import { MarkdownRenderer } from "../components/MarkdownRenderer";
import { ErrorBoundary } from "../components/ErrorBoundary";
import TikzJax from 'react-tikzjax';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';

import mammoth from 'mammoth';
import { printElement } from '../lib/print';
import { saveToHistory, getHistory } from '../lib/history';
import { HistoryItem } from '../types';

// Utility to convert file to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
  });
};

export function ExerciseSolver() {
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingSimilar, setIsGeneratingSimilar] = useState(false);
  const [solution, setSolution] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  
  useEffect(() => {
    setHistoryItems(getHistory().filter(item => item.type === 'GBT'));
  }, []);
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  
  const exportRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  
  const startCamera = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error("Camera error:", err);
      setError("Không thể truy cập camera. Vui lòng kiểm tra quyền hoặc kết nối.");
      setIsCameraActive(false);
    }
  };

  const stopCamera = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setIsCameraActive(false);
  };

  const capturePhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
            setSelectedFile(file);
            stopCamera();
          }
        }, 'image/jpeg', 0.9);
      }
    }
  };


  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
    }
  };

  const processDocx = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = function(event) {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        mammoth.extractRawText({arrayBuffer: arrayBuffer})
          .then(function(result){
            resolve(result.value);
          })
          .catch(function(err) {
            reject(err);
          });
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  
  const handleGenerateSimilar = async () => {
    if (!selectedFile) {
      setError('Vui lòng chọn file bài tập trước.');
      return;
    }

    setIsGeneratingSimilar(true);
    setError(null);

    try {
      let fileData = '';
      let mimeType = selectedFile.type;

      if (selectedFile.name.endsWith('.docx')) {
        const text = await processDocx(selectedFile);
        fileData = btoa(unescape(encodeURIComponent(text)));
        mimeType = 'text/plain';
      } else {
        fileData = await fileToBase64(selectedFile);
      }

      const response = await apiFetch('/api/generate-similar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: [{ data: fileData, type: mimeType }]
        })
      });

      const text = await response.text();
      let data;
      try { data = JSON.parse(text); } catch(e) { throw new Error(`Lỗi phản hồi từ máy chủ (không phải JSON). Chi tiết: ${text ? text.substring(0, 150) : ""}`); }
      if (!response.ok) throw new Error(data.error || 'Failed to generate similar exercise');
      
      setSolution(typeof data.result === 'string' ? data.result : (data.result?.candidates?.[0]?.content?.parts?.[0]?.text || JSON.stringify(data.result)));
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Đã xảy ra lỗi khi tạo bài tập tương tự. Vui lòng thử lại.');
    } finally {
      setIsGeneratingSimilar(false);
    }
  };
  
const handleSolve = async () => {
    if (!selectedFile) {
      setError('Vui lòng chọn file bài tập trước.');
      return;
    }

    setIsUploading(true);
    setError(null);
    setSolution('');

    try {
      let fileData = '';
      let mimeType = selectedFile.type;

      if (selectedFile.name.endsWith('.docx')) {
        const text = await processDocx(selectedFile);
        fileData = btoa(unescape(encodeURIComponent(text)));
        mimeType = 'text/plain';
      } else {
        fileData = await fileToBase64(selectedFile);
      }

      const response = await apiFetch('/api/solve-exercise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: [{ data: fileData, type: mimeType }]
        })
      });

      if (!response.ok) {
        const text = await response.text();
      let data;
      try { data = JSON.parse(text); } catch(e) { throw new Error(`Lỗi phản hồi từ máy chủ (không phải JSON). Chi tiết: ${text ? text.substring(0, 150) : ""}`); }
        throw new Error(data.error || 'Có lỗi xảy ra khi xử lý file');
      }

      const text = await response.text();
      let data;
      try { data = JSON.parse(text); } catch(e) { throw new Error(`Lỗi phản hồi từ máy chủ (không phải JSON). Chi tiết: ${text ? text.substring(0, 150) : ""}`); }
      const newSolution = typeof data.result === 'string' ? data.result : (data.result?.candidates?.[0]?.content?.parts?.[0]?.text || JSON.stringify(data.result));
      setSolution(newSolution);
      saveToHistory({
        type: "GBT",
        grade: 0,
        subject: "Chung",
        lessonName: selectedFile ? "Giải bài tập: " + selectedFile.name : "Giải bài tập mới",
        content: newSolution
      });
      setHistoryItems(getHistory().filter(item => item.type === 'GBT'));
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Lỗi kết nối. Vui lòng thử lại sau.');
    } finally {
      setIsUploading(false);
    }
  };

  
  const handleSave = () => {
    if (!solution) return;
    saveToHistory({
      type: "GBT",
      grade: 0,
      subject: "Chung",
      lessonName: selectedFile ? "Giải bài tập: " + selectedFile.name : "Giải bài tập",
      content: solution
    });
    alert("Đã lưu vào thư viện lịch sử thành công!");
  };

  const handleExportPDF = () => {
    printElement(exportRef.current, "LoiGiai_ChiTiet");
  };

  const handleExportWord = (keepLatex: boolean = false) => {
    if (!solution || !exportRef.current) return;
    exportHtmlToWord(exportRef.current, `LoiGiai_${new Date().getTime()}${keepLatex ? '_LaTeX' : ''}.doc`, keepLatex);
  };

  

  // Presentation slides logic
  const presentationSlides = useMemo(() => {
    if (!solution) return [];
    // Split by Markdown H2 or H3
    const parts = String(solution).split(/(?=\n##\s)/g).filter(p => p.trim());
    return parts;
  }, [solution]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4 lg:p-8">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 lg:p-8">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">Trợ lý Giải Bài Tập Thông Minh</h2>
        
        {historyItems.length > 0 && (
          <div className="max-w-2xl mx-auto mb-6 p-4 bg-indigo-50/50 rounded-xl border border-indigo-100">
            <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
              <BookmarkPlus className="w-4 h-4 text-indigo-600" /> Lịch sử đã giải
            </label>
            <select
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              onChange={(e) => {
                if (e.target.value) {
                  const item = historyItems.find(h => h.id === e.target.value);
                  if (item) {
                    setSolution(item.content);
                  }
                }
              }}
            >
              <option value="">-- Chọn bài tập đã giải trong lịch sử --</option>
              {historyItems.map(item => (
                <option key={item.id} value={item.id}>
                  {new Date(item.createdAt).toLocaleDateString('vi-VN')} - {item.lessonName}
                </option>
              ))}
            </select>
          </div>
        )}
        
        {!solution && (
          <div className="max-w-2xl mx-auto">
            <div 
              className="border-2 border-dashed border-slate-300 rounded-xl p-6 lg:p-12 text-center hover:bg-slate-50 transition-colors cursor-pointer flex flex-col items-center justify-center min-h-[300px]"
              onClick={() => { if (!isCameraActive) fileInputRef.current?.click() }}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".pdf,.docx,.doc,.txt,image/*" 
                onChange={handleFileSelect} 
              />
              
              {isCameraActive ? (
                <div className="w-full flex flex-col items-center">
                   <div className="relative w-full max-w-md bg-black rounded-lg overflow-hidden mb-4">
                     <video ref={videoRef} className="w-full h-auto" playsInline autoPlay></video>
                     <canvas ref={canvasRef} className="hidden"></canvas>
                   </div>
                   <div className="flex gap-4">
                     <button onClick={stopCamera} className="px-4 py-2 bg-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-300 transition-colors">
                       Hủy
                     </button>
                     <button onClick={capturePhoto} className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors">
                       <Camera className="w-5 h-5" /> Chụp Ảnh
                     </button>
                   </div>
                </div>
              ) : !selectedFile ? (
                <>
                  <div className="bg-blue-100 p-4 rounded-full mb-4">
                    <Upload className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-700 mb-2">Tải lên hoặc chụp ảnh đề bài</h3>
                  <p className="text-slate-500 mb-6 text-sm">Hỗ trợ file ảnh, PDF, Word (.docx), hoặc file text</p>
                  <div className="flex flex-wrap justify-center gap-3">
                    <button className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-sm">
                      <Upload className="w-4 h-4" /> Chọn File
                    </button>
                    <button 
                      className="px-6 py-2.5 bg-emerald-600 text-white font-medium rounded-lg flex items-center gap-2 hover:bg-emerald-700 transition-colors shadow-sm"
                      onClick={startCamera}
                    >
                      <Camera className="w-4 h-4" /> Chụp Ảnh
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center w-full">
                  <div className="bg-emerald-100 p-4 rounded-full mb-4 mx-auto w-16 h-16 flex items-center justify-center">
                    <FileText className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-emerald-700 mb-2 truncate px-4">{selectedFile.name}</h3>
                  <p className="text-slate-500 mb-6 text-sm">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  
                  <div className="flex justify-center gap-3">
                    <button 
                      className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-100 flex items-center gap-2 transition-colors"
                      onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                    >
                      <X className="w-4 h-4" /> Hủy
                    </button>
                    <button 
                      className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors shadow-sm"
                      onClick={(e) => { e.stopPropagation(); handleSolve(); }}
                      disabled={isUploading}
                    >
                      {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      Giải Bài Tập
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {error && (
              <div className="mt-4 p-4 bg-rose-50 text-rose-700 rounded-lg text-sm text-center border border-rose-200">
                {error}
              </div>
            )}
          </div>
        )}

        {solution && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                Lời giải chi tiết
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                <button 
                  onClick={() => {}}
                  disabled={false}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm text-sm font-medium"
                >
                  {false ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookmarkPlus className="w-4 h-4" />}
                  Lưu thư viện
                </button>
                <button 
                  onClick={handleGenerateSimilar}
                  disabled={isGeneratingSimilar}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-sm text-sm font-medium"
                >
                  {isGeneratingSimilar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
                  Tạo bài tương tự
                </button>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleExportWord(false)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm"
                  >
                    <Download className="w-4 h-4" /> Word
                  </button>
                  <button 
                    onClick={() => handleExportWord(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm text-sm"
                    title="Giữ nguyên mã LaTeX để dùng MathType"
                  >
                    LaTeX
                  </button>
                </div>
                <button 
                  onClick={() => handleExportPDF()}
                  className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors shadow-sm"
                >
                  <span className="text-xs font-bold border-2 border-current px-1 rounded">PDF</span> Xuất PDF
                </button>
                
                <button 
                  onClick={() => { setIsPresentationMode(true); setCurrentSlide(0); }}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm font-medium"
                >
                  <Maximize2 className="w-4 h-4" /> Trình chiếu
                </button>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-8 border border-slate-200">
              <div ref={exportRef} className="markdown-body prose prose-slate max-w-none prose-headings:text-slate-800 prose-h2:text-2xl prose-h2:text-blue-700 prose-h2:border-b prose-h2:pb-2 prose-h3:text-xl prose-a:text-emerald-600">
                <ErrorBoundary><MarkdownRenderer content={solution} /></ErrorBoundary>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Presentation Mode Modal */}
      {isPresentationMode && presentationSlides.length > 0 && (
        <div className="fixed inset-0 z-50 bg-slate-900 text-white flex flex-col">
          <div className="flex items-center justify-between p-4 bg-slate-800 border-b border-slate-700">
            <h3 className="font-semibold text-lg flex items-center gap-2"><Presentation className="w-5 h-5 text-blue-400" /> Trình chiếu Bài giải</h3>
            <button 
              onClick={() => setIsPresentationMode(false)}
              className="p-2 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="flex-1 overflow-auto p-12 md:p-24 flex items-center justify-center">
            <div className="max-w-5xl w-full mx-auto markdown-body prose prose-invert prose-2xl prose-headings:text-white prose-p:text-slate-200 prose-li:text-slate-200 custom-presentation">
              <style>{`
                .custom-presentation { font-size: 1.5rem !important; line-height: 1.8 !important; }
                .custom-presentation h2 { font-size: 2.5rem !important; color: #60a5fa !important; margin-bottom: 2rem !important; border-bottom: 2px solid #334155; padding-bottom: 1rem; }
                .custom-presentation h3 { font-size: 2rem !important; color: #a7f3d0 !important; }
                .custom-presentation .katex { font-size: 1.8rem !important; }
                .custom-presentation .katex-display { margin: 2rem 0 !important; }
              `}</style>
              <ErrorBoundary><MarkdownRenderer content={presentationSlides[currentSlide]} /></ErrorBoundary>
            </div>
          </div>
          
          <div className="bg-slate-800 p-6 flex items-center justify-center gap-8 border-t border-slate-700">
            <button 
              onClick={() => setCurrentSlide(prev => Math.max(0, prev - 1))}
              disabled={currentSlide === 0}
              className="p-4 rounded-full bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
            <div className="flex gap-2">
              {presentationSlides.map((_, idx) => (
                <button 
                  key={idx}
                  onClick={() => setCurrentSlide(idx)}
                  className={`w-3 h-3 rounded-full transition-colors ${idx === currentSlide ? 'bg-blue-400' : 'bg-slate-600 hover:bg-slate-500'}`}
                  title={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
            <button 
              onClick={() => setCurrentSlide(prev => Math.min(presentationSlides.length - 1, prev + 1))}
              disabled={currentSlide === presentationSlides.length - 1}
              className="p-4 rounded-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
