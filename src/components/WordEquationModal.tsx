import React, { useState } from 'react';
import katex from 'katex';
import { Copy, Check, X, FileCode, Sparkles, BookOpen } from 'lucide-react';
import { latexToWordAltEqual, latexToMathML, latexToOMML, copyFormulaForWord } from '../lib/wordEquationConverter';

interface WordEquationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialLatex?: string;
}

export const WordEquationModal: React.FC<WordEquationModalProps> = ({
  isOpen,
  onClose,
  initialLatex = '',
}) => {
  const [latexInput, setLatexInput] = useState(initialLatex);
  const [activeTab, setActiveTab] = useState<'alt_equal' | 'mathml' | 'omml'>('alt_equal');
  const [copiedType, setCopiedType] = useState<string | null>(null);

  // Update input if initialLatex changes
  React.useEffect(() => {
    if (initialLatex) {
      setLatexInput(initialLatex);
    }
  }, [initialLatex]);

  if (!isOpen) return null;

  const cleanLatex = latexToWordAltEqual(latexInput || '\\frac{-b \\pm \\sqrt{\\Delta}}{2a}');
  const mathmlCode = latexToMathML(cleanLatex, true);
  const ommlCode = latexToOMML(cleanLatex, true);

  let renderedHtml = '';
  try {
    renderedHtml = katex.renderToString(cleanLatex, {
      displayMode: true,
      throwOnError: false,
    });
  } catch (e) {
    renderedHtml = '<span class="text-red-500">Lỗi hiển thị công thức</span>';
  }

  const handleCopy = async (type: 'direct' | 'alt_equal' | 'mathml' | 'omml') => {
    let success = false;
    if (type === 'direct') {
      success = await copyFormulaForWord(cleanLatex);
    } else if (type === 'alt_equal') {
      await navigator.clipboard.writeText(cleanLatex);
      success = true;
    } else if (type === 'mathml') {
      await navigator.clipboard.writeText(mathmlCode);
      success = true;
    } else if (type === 'omml') {
      await navigator.clipboard.writeText(ommlCode);
      success = true;
    }

    if (success) {
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/15 rounded-xl backdrop-blur-md">
              <FileCode className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg">Chuyển Đổi Mã Word Equation (Alt + =)</h3>
              <p className="text-xs text-emerald-100">Định dạng tương thích Microsoft Word, MathML và Office Math OMML</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Formula preview */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Công thức xem trước:</span>
              <button
                type="button"
                onClick={() => handleCopy('direct')}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-md border border-emerald-200 flex items-center gap-1 cursor-pointer transition-colors"
              >
                {copiedType === 'direct' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Đã sao chép!</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Sao chép nhanh cho Word</span>
                  </>
                )}
              </button>
            </label>
            <div 
              className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center overflow-x-auto min-h-[60px] flex items-center justify-center"
              dangerouslySetInnerHTML={{ __html: renderedHtml }}
            />
          </div>

          {/* Input edit field if needed */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Chỉnh sửa mã LaTeX (nếu muốn):
            </label>
            <input
              type="text"
              value={latexInput}
              onChange={(e) => setLatexInput(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              placeholder="Nhập mã LaTeX, ví dụ: \frac{a}{b} hoặc \sqrt{x^2+1}..."
            />
          </div>

          {/* Format Tabs */}
          <div>
            <div className="flex border-b border-slate-200 gap-2 mb-3">
              <button
                type="button"
                onClick={() => setActiveTab('alt_equal')}
                className={`pb-2.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
                  activeTab === 'alt_equal'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                1. Word Alt + = (LaTeX)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('mathml')}
                className={`pb-2.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
                  activeTab === 'mathml'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                2. MathML (W3C)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('omml')}
                className={`pb-2.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
                  activeTab === 'omml'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                3. OMML (Word XML)
              </button>
            </div>

            {/* Tab 1: Word Alt + = */}
            {activeTab === 'alt_equal' && (
              <div className="space-y-3">
                <div className="relative">
                  <pre className="p-3.5 bg-slate-900 text-emerald-300 rounded-xl text-xs sm:text-sm font-mono overflow-x-auto whitespace-pre-wrap break-all">
                    {cleanLatex}
                  </pre>
                  <button
                    type="button"
                    onClick={() => handleCopy('alt_equal')}
                    className="absolute top-2.5 right-2.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                  >
                    {copiedType === 'alt_equal' ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Đã chép</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Sao chép</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed flex items-start gap-2">
                  <BookOpen className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Cách chèn vào Microsoft Word với phím tắt Alt + =:</span>
                    <ol className="list-decimal pl-4 mt-1 space-y-0.5">
                      <li>Trong tài liệu Word, nhấn tổ hợp phím <strong>Alt + =</strong> (mở khung chèn công thức Equation).</li>
                      <li>Dán mã trên vào (nhấn <strong>Ctrl + V</strong>).</li>
                      <li>Nhấn phím <strong>Enter</strong> hoặc phím <strong>Space (Dấu cách)</strong>, Word sẽ tự động biến thành công thức toán chuẩn tuyệt đẹp!</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: MathML */}
            {activeTab === 'mathml' && (
              <div className="space-y-3">
                <div className="relative">
                  <pre className="p-3.5 bg-slate-900 text-sky-300 rounded-xl text-xs font-mono overflow-x-auto max-h-48 whitespace-pre-wrap break-all">
                    {mathmlCode || 'Không tạo được MathML'}
                  </pre>
                  <button
                    type="button"
                    onClick={() => handleCopy('mathml')}
                    className="absolute top-2.5 right-2.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                  >
                    {copiedType === 'mathml' ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Đã chép</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Sao chép MathML</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-900 leading-relaxed">
                  <span className="font-bold">Cách dùng MathML trong Word:</span>
                  <p className="mt-1">
                    Sao chép mã MathML này, sau đó mở Word và dán (<strong>Ctrl + V</strong>). Microsoft Word (từ bản 2013, 2016, 2019, 2021, 365) sẽ tự động nhận diện MathML và hiển thị thành Equation chuẩn.
                  </p>
                </div>
              </div>
            )}

            {/* Tab 3: OMML */}
            {activeTab === 'omml' && (
              <div className="space-y-3">
                <div className="relative">
                  <pre className="p-3.5 bg-slate-900 text-purple-300 rounded-xl text-xs font-mono overflow-x-auto max-h-48 whitespace-pre-wrap break-all">
                    {ommlCode || 'Không tạo được OMML XML'}
                  </pre>
                  <button
                    type="button"
                    onClick={() => handleCopy('omml')}
                    className="absolute top-2.5 right-2.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                  >
                    {copiedType === 'omml' ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Đã chép</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Sao chép OMML</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900 leading-relaxed">
                  <span className="font-bold">OMML (Office Math Markup Language):</span>
                  <p className="mt-1">
                    Đây là định dạng gốc bên trong cấu trúc XML của file .docx. Dành cho các công cụ xuất file Word tự động hoặc chèn trực tiếp vào OpenXML.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500">
            Mẹo: Nút "Sao chép nhanh cho Word" hỗ trợ cả MathML và Word Alt +=.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
