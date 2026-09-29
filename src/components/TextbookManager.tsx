import React, { useState, useEffect, useRef } from 'react';
import { Book, Upload, Trash2, Plus, X, Save } from 'lucide-react';
import { Textbook, getTextbooks, saveCustomTextbook, deleteCustomTextbook } from '../lib/textbooks';

interface TextbookManagerProps {
  onSelect: (textbook: Textbook) => void;
  selectedId: string;
}

export function TextbookManager({ onSelect, selectedId }: TextbookManagerProps) {
  const [textbooks, setTextbooks] = useState<Textbook[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newBookName, setNewBookName] = useState('');
  const [newBookFiles, setNewBookFiles] = useState<{name: string, data: string, type: string}[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = async () => {
    const books = await getTextbooks();
    setTextbooks(books);
    // If none selected, select the first one
    if (!selectedId && books.length > 0) {
      onSelect(books[0]);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      const parsedFiles: {name: string, data: string, type: string}[] = [];
      
      let processed = 0;
      filesArray.forEach(file => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64 = event.target?.result?.toString().split(',')[1];
          if (base64) {
            parsedFiles.push({
              name: file.name,
              data: base64,
              type: file.type || 'application/pdf'
            });
          }
          processed++;
          if (processed === filesArray.length) {
            setNewBookFiles(prev => [...prev, ...parsedFiles]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleSaveCustom = async () => {
    if (!newBookName.trim()) return;
    
    const newBook: Textbook = {
      id: 'custom-' + Date.now(),
      name: newBookName,
      isCustom: true,
      files: newBookFiles.length > 0 ? newBookFiles : undefined
    };
    
    await saveCustomTextbook(newBook);
    setNewBookName('');
    setNewBookFiles([]);
    setIsAdding(false);
    
    const books = await getTextbooks();
    setTextbooks(books);
    onSelect(newBook);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteCustomTextbook(id);
    const books = await getTextbooks();
    setTextbooks(books);
    if (selectedId === id) {
      onSelect(books[0] || null);
    }
  };

  return (
    <div className="bg-white border rounded-xl p-4 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <Book className="w-5 h-5 text-blue-600" />
          Danh mục Sách giáo khoa
        </h3>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="text-sm flex items-center gap-1 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
        >
          {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {isAdding ? 'Hủy' : 'Thêm sách mới'}
        </button>
      </div>

      {isAdding && (
        <div className="bg-slate-50 p-4 rounded-lg border border-blue-100 mb-4 animate-in fade-in slide-in-from-top-2">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tên bộ sách / Tài liệu</label>
              <input 
                type="text" 
                value={newBookName}
                onChange={(e) => setNewBookName(e.target.value)}
                placeholder="VD: Toán 10 - Cánh diều (Bản PDF)"
                className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tải lên tệp đính kèm (Tùy chọn, PDF/Word)</label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-600">Click để chọn file từ máy tính</p>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                  multiple
                  accept=".pdf,.doc,.docx,.txt"
                />
              </div>
              
              {newBookFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {newBookFiles.map((f, i) => (
                    <span key={i} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full flex items-center gap-1">
                      {f.name}
                      <button onClick={() => setNewBookFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-blue-500 hover:text-blue-700 ml-1">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            
            <button 
              onClick={handleSaveCustom}
              disabled={!newBookName.trim()}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              Lưu vào danh mục
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {textbooks.map(book => (
          <div 
            key={book.id}
            onClick={() => onSelect(book)}
            className={`border rounded-xl p-3 cursor-pointer transition-all ${
              selectedId === book.id 
                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' 
                : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className={`font-medium text-sm ${selectedId === book.id ? 'text-blue-700' : 'text-slate-700'}`}>
                  {book.name}
                </h4>
                <div className="flex gap-2 mt-1.5">
                  {book.isCustom ? (
                    <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">Sách tự tải lên</span>
                  ) : (
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">Sách hệ thống</span>
                  )}
                  {book.files && book.files.length > 0 && (
                    <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">
                      {book.files.length} tệp đính kèm
                    </span>
                  )}
                </div>
              </div>
              
              {book.isCustom && (
                <button 
                  onClick={(e) => handleDelete(book.id, e)}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-2"
                  title="Xóa sách"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
