import { apiFetch } from '../lib/apiFetch';
import { exportHtmlToWord } from '../lib/exportUtils';
import React, { useState, useRef } from 'react';
import { Upload, X, FileText, Loader2, Download, AlertCircle } from 'lucide-react';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { parseApiResponse } from '../lib/utils';
import mammoth from 'mammoth';

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
  });
};

export function PdfToWord() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [resultText, setResultText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  
  const exportRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };

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
        mammoth.convertToHtml({arrayBuffer: arrayBuffer})
          .then(function(result){ resolve(result.value); })
          .catch(function(err) { reject(err); });
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const handleConvert = async () => {
    if (!selectedFile) {
      setError('Vui lòng chọn file trước.');
      return;
    }

    setIsUploading(true);
    setError(null);
    setResultText('');

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

      const response = await apiFetch('/api/pdf-to-word', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: [{ data: fileData, type: mimeType }]
        })
      });

      if (!response.ok) {
        let errorData;
        let errText = await response.text();
        try {
           errorData = JSON.parse(errText);
        } catch {
           errorData = { error: errText };
        }
        
        let errorMsg = errorData.error || 'Có lỗi xảy ra khi xử lý file';
        if (typeof errorMsg === 'object') errorMsg = JSON.stringify(errorMsg);
        throw new Error(errorMsg);
      }

      const text = await response.text();
      const data = parseApiResponse<any>(text);
      setResultText(typeof data.result === 'string' ? data.result : (data.result?.candidates?.[0]?.content?.parts?.[0]?.text || JSON.stringify(data.result)));
    } catch (err: any) {
      console.error(err);
      const errorMsg = err.message || '';
      if (errorMsg.includes("429") || errorMsg.includes("quota") || errorMsg.includes("RESOURCE_EXHAUSTED")) {
        setError("Hệ thống đang quá tải hoặc tạm thời không khả dụng do nhu cầu cao. Vui lòng thử lại sau ít phút hoặc sử dụng API Key cá nhân.");
      } else if (errorMsg.includes('{"error":')) {
        try {
          const parsed = JSON.parse(errorMsg);
          setError(parsed.error?.message || "Có lỗi xảy ra khi xử lý file");
        } catch {
          setError("Có lỗi xảy ra trong quá trình số hóa tài liệu. Vui lòng thử lại.");
        }
      } else {
        setError(errorMsg || 'Lỗi kết nối. Vui lòng thử lại sau.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleExportWord = (keepLatex: boolean = false) => {
    if (!resultText || !exportRef.current) return;
    exportHtmlToWord(exportRef.current, `TaiLieu_DaChuyenDoi_${new Date().getTime()}${keepLatex ? '_LaTeX' : ''}.doc`, keepLatex);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4 lg:p-4 lg:p-8">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center justify-center gap-2 mb-2">
            <FileText className="w-8 h-8 text-blue-600" />
            Chuyển đổi tài liệu (PDF/Ảnh) sang Word
          </h2>
          <p className="text-slate-600">Công cụ số hóa tài liệu sử dụng AI, nhận dạng chính xác công thức Toán học chuẩn LaTeX.</p>
        </div>

        <div className="max-w-2xl mx-auto">
          {!selectedFile ? (
            <div 
              className="border-2 border-dashed border-slate-300 rounded-xl p-6 lg:p-12 text-center hover:bg-slate-50 transition-colors cursor-pointer"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg,.docx"
              />
              <div className="bg-blue-100 p-4 rounded-full w-16 h-16 mx-auto flex items-center justify-center mb-4">
                <Upload className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-700 mb-2">Kéo thả file hoặc nhấn để tải lên</h3>
              <p className="text-slate-500 mb-6 text-sm">Hỗ trợ file PDF, Ảnh (.png, .jpg), hoặc Word (.docx)</p>
              <button className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors">
                Chọn File
              </button>
            </div>
          ) : (
            <div className="text-center w-full border-2 border-slate-200 rounded-xl p-6 lg:p-12">
              <div className="bg-emerald-100 p-4 rounded-full mb-4 mx-auto w-16 h-16 flex items-center justify-center">
                <FileText className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold text-emerald-700 mb-2 truncate px-4">{selectedFile.name}</h3>
              <p className="text-slate-500 mb-6">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
              
              <div className="flex justify-center gap-3">
                <button 
                  className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-100 flex items-center gap-2"
                  onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                >
                  <X className="w-4 h-4" /> Hủy
                </button>
                <button 
                  className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  onClick={(e) => { e.stopPropagation(); handleConvert(); }}
                  disabled={isUploading}
                >
                  {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                  Số hóa sang Word
                </button>
              </div>
            </div>
          )}
        </div>
        
        <div className="max-w-2xl mx-auto mt-6">
          <div className="flex items-start gap-3 p-4 bg-amber-50 text-amber-800 rounded-lg text-sm border border-amber-200">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600" />
            <div>
              <p className="font-semibold mb-1 text-amber-900">Lưu ý về hình ảnh & hình vẽ:</p>
              <p>AI được tối ưu đặc biệt để nhận diện và gõ lại chuẩn 100% công thức Toán/Lý/Hóa. Với <b>file PDF/Ảnh</b>, do hạn chế kỹ thuật bóc tách ảnh tự động, AI sẽ để lại ghi chú vị trí của biểu đồ/hình vẽ (VD: <i>[Hình vẽ...]</i>) để thầy/cô tự copy ảnh gốc dán vào file Word sau. Với <b>file Word (.docx)</b>, hình ảnh sẽ được tự động giữ nguyên.</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="max-w-2xl mx-auto mt-4 p-4 bg-rose-50 text-rose-700 rounded-lg text-center">
            {error}
          </div>
        )}
      </div>

      {resultText && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
            <h3 className="text-xl font-bold text-slate-800">Tài liệu đã số hóa thành công!</h3>
            <div className="flex items-center gap-2 flex-wrap">
              <button 
                onClick={() => setResultText('')}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors mr-4"
              >
                Chuyển file khác
              </button>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleExportWord(false)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium text-sm"
                >
                  <Download className="w-4 h-4" /> Word (Chuẩn)
                </button>
                <button 
                  onClick={() => handleExportWord(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-medium text-sm"
                  title="Dành cho giáo viên dùng MathType"
                >
                  <Download className="w-4 h-4" /> Word (Mã LaTeX)
                </button>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-8 border border-slate-200">
            <div ref={exportRef}>
              <MarkdownRenderer content={resultText} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
