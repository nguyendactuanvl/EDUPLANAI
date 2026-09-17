import { exportHtmlToWord } from '../lib/exportUtils';
import { useState, useEffect, useRef } from "react";
import { getHistory, deleteFromHistory, clearHistory } from "../lib/history";
import { HistoryItem } from "../types";
import { Trash2, Download, Eye, Clock, BookOpen } from "lucide-react";
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { cn } from "../lib/utils";
import { printElement } from '../lib/print';


export function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<number | 'all'>('all');
  const [viewingItem, setViewingItem] = useState<HistoryItem | null>(null);
  
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Bạn có chắc chắn muốn xóa bản ghi này?")) {
      deleteFromHistory(id);
      setHistory(getHistory());
      if (viewingItem?.id === id) {
        setViewingItem(null);
      }
    }
  };

  const handleClearAll = () => {
    if (confirm("Bạn có chắc chắn muốn xóa TẤT CẢ lịch sử? Hành động này không thể hoàn tác.")) {
      clearHistory();
      setHistory([]);
      setViewingItem(null);
    }
  };

  
  const handleExportPDF = () => {
    printElement(exportRef.current, "Lich_su");
  };

  const handleExportWord = (item: HistoryItem) => {
        const clone = exportRef.current.cloneNode(true) as HTMLElement;
    
    // Extract MathML from KaTeX for native Word Equation support
    const katexElements = clone.querySelectorAll('.katex');
    katexElements.forEach(el => {
      const mathNode = el.querySelector('.katex-mathml math');
      if (mathNode) {
        const mathClone = mathNode.cloneNode(true) as Element;
        
        // Remove annotation tags completely
        const annotations = mathClone.querySelectorAll('annotation');
        annotations.forEach(a => a.remove());
        
        // Remove semantics tag but keep its children to avoid Word confusion
        const semantics = mathClone.querySelector('semantics');
        if (semantics) {
           while (semantics.firstChild) {
               mathClone.insertBefore(semantics.firstChild, semantics);
           }
           semantics.remove();
        }
        
        el.parentNode?.replaceChild(mathClone, el);
      }
    });
    
    const htmlToExport = clone.innerHTML;
    if (!exportRef.current) return;
    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>Export HTML To Doc</title></head><body>
      \${viewingItem?.id === item.id && exportRef.current ? htmlToExport : "Vui lòng 'Xem chi tiết' trước khi tải xuống để đảm bảo định dạng."}
      </body></html>
    `;
    
    const blob = new Blob(['\ufeff', htmlContent], {
      type: 'application/msword'
    });
    
    const url = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(htmlContent);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    
    const downloadName = `Giao_an_${item.lessonName ? item.lessonName.substring(0,30) : 'bai_hoc'}.doc`;
    link.download = downloadName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredHistory = history.filter(item => 
    selectedGrade === 'all' ? true : item.grade === selectedGrade
  );

  return (
    <div className="flex flex-col lg:flex-row min-h-full bg-slate-50 lg:overflow-hidden">
      {/* Sidebar / List */}
      <div className="w-full lg:w-1/3 lg:border-r border-b lg:border-b-0 border-slate-200 bg-white flex flex-col h-auto lg:h-full shrink-0">
        <div className="p-4 border-b border-slate-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-600" />
              Lịch sử đã tạo
            </h2>
            {history.length > 0 && (
              <button 
                onClick={handleClearAll}
                className="text-red-500 hover:text-red-700 text-sm font-medium"
              >
                Xóa tất cả
              </button>
            )}
          </div>
          
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setSelectedGrade('all')}
              className={cn(
                "flex-1 py-1.5 text-sm font-medium rounded-md transition-colors",
                selectedGrade === 'all' ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              Tất cả
            </button>
            {[10, 11, 12].map(grade => (
              <button
                key={grade}
                onClick={() => setSelectedGrade(grade)}
                className={cn(
                  "flex-1 py-1.5 text-sm font-medium rounded-md transition-colors",
                  selectedGrade === grade ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Khối {grade}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2">
          {filteredHistory.length === 0 ? (
            <div className="text-center p-8 text-slate-400">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>Chưa có lịch sử nào cho lựa chọn này.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredHistory.map((item) => (
                <div 
                  key={item.id}
                  onClick={() => setViewingItem(item)}
                  className={cn(
                    "p-3 rounded-lg border cursor-pointer transition-colors group",
                    viewingItem?.id === item.id 
                      ? "bg-emerald-50 border-emerald-200" 
                      : "bg-white border-slate-200 hover:border-emerald-300 hover:bg-slate-50"
                  )}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {item.type === "GBT" ? "Giải bài tập" : item.type === "PHT" ? "Phiếu bài tập" : (item.grade === 0 ? "Khác" : `Lớp ${item.grade}`)} • {item.subject}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                  <h3 className="font-medium text-slate-800 text-sm line-clamp-2 mt-1">
                    {item.lessonName || "Bài học không tên"}
                  </h3>
                  
                  <div className="flex justify-end gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => handleDelete(item.id, e)}
                      className="p-1.5 text-slate-400 hover:text-red-500 rounded bg-white border border-slate-200 hover:border-red-200 shadow-sm"
                      title="Xóa"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content Viewer */}
      <div className="w-full lg:w-2/3 bg-slate-50 p-6 flex flex-col min-h-screen lg:min-h-0 lg:overflow-hidden">
        {viewingItem ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full lg:overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="font-bold text-lg text-slate-800">{viewingItem.lessonName}</h3>
                <p className="text-sm text-slate-500">Môn: {viewingItem.subject} {viewingItem.grade !== 0 && `• Lớp ${viewingItem.grade}`}</p>
              </div>
              <button 
                onClick={() => handleExportWord(viewingItem)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>Tải Word (.doc)</span>
              </button>
              <button 
                onClick={() => handleExportPDF()}
                className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors shadow-sm"
              >
                <span className="text-xs font-bold border-2 border-current px-1 rounded">PDF</span>
                <span>Tải PDF</span>
              </button>
            </div>
            <div className="p-8 overflow-y-auto flex-1">
              <div ref={exportRef} className="markdown-body prose prose-slate max-w-none prose-headings:text-slate-800 prose-h2:text-2xl prose-h2:border-b prose-h2:pb-2 prose-h3:text-xl prose-a:text-emerald-600 prose-table:border-collapse prose-th:border prose-th:bg-slate-50 prose-td:border prose-td:p-2">
                <Markdown 
                  remarkPlugins={[remarkMath, remarkGfm]} 
                  rehypePlugins={[rehypeRaw, [rehypeKatex, { strict: false, throwOnError: false }]]}
                >
                  {viewingItem.content}
                </Markdown>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <BookOpen className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg font-medium">Chọn một giáo án từ danh sách để xem chi tiết</p>
          </div>
        )}
      </div>
    </div>
  );
}
