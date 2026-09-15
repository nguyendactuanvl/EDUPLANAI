const fs = require('fs');
let content = fs.readFileSync('src/pages/ExamGenerator.tsx', 'utf8');

// Add X icon
content = content.replace(
  'import { FileCheck, Sparkles, Shuffle, Download, Share2, Plus, Trash2, Printer, UploadCloud, FileSpreadsheet, FileText } from "lucide-react";',
  'import { FileCheck, Sparkles, Shuffle, Download, Share2, Plus, Trash2, Printer, UploadCloud, FileSpreadsheet, FileText, X, ExternalLink } from "lucide-react";'
);

// Add state for modal
content = content.replace(
  'const [shareLink, setShareLink] = useState("");',
  'const [shareLink, setShareLink] = useState("");\n  const [showBubbleSheetModal, setShowBubbleSheetModal] = useState(false);'
);

// Change button text
content = content.replace(
  '<span className="hidden sm:inline">Tải Excel (CSV)</span>',
  '<span className="hidden sm:inline">Excel Đáp Án (TNMaker)</span>'
);

// Change print button to open modal
content = content.replace(
  'onClick={handlePrintBubbleSheet}',
  'onClick={() => setShowBubbleSheetModal(true)}'
);

// Add modal JSX at the very end of the component, just before final </div></div>
const modalJsx = `
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
                 <p className="font-semibold text-slate-700 mb-2">1. Mẫu hệ thống (In trực tiếp)</p>
                 <button onClick={handlePrintBubbleSheet} className="w-full text-left px-4 py-3 border border-slate-200 rounded-lg hover:bg-emerald-50 hover:border-emerald-200 flex items-center justify-between group transition-colors">
                   <div>
                     <p className="font-medium text-slate-800 group-hover:text-emerald-700">Phiếu tô 40 câu (Khuyên dùng)</p>
                     <p className="text-sm text-slate-500">Mẫu cơ bản, in trực tiếp từ trình duyệt</p>
                   </div>
                   <Printer className="w-5 h-5 text-slate-400 group-hover:text-emerald-600" />
                 </button>
              </div>
              
              <div>
                 <p className="font-semibold text-slate-700 mb-2">2. Mẫu chuẩn TNMaker (PDF)</p>
                 <a href="https://tnmaker.net/phieu-trac-nghiem/" target="_blank" rel="noreferrer" className="w-full text-left px-4 py-3 border border-slate-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 flex items-center justify-between group mb-2 transition-colors">
                   <div>
                     <p className="font-medium text-slate-800 group-hover:text-blue-700">Tải bộ Phiếu TNMaker 2025</p>
                     <p className="text-sm text-slate-500">Gồm mẫu 40, 50, 120 câu chuẩn BGD</p>
                   </div>
                   <ExternalLink className="w-5 h-5 text-slate-400 group-hover:text-blue-600" />
                 </a>
                 <a href="https://tnmaker.net/wp-content/uploads/2023/12/Phieu-TLTN-50-cau-2025.pdf" target="_blank" rel="noreferrer" className="w-full text-left px-4 py-3 border border-slate-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 flex items-center justify-between group transition-colors">
                   <div>
                     <p className="font-medium text-slate-800 group-hover:text-blue-700">Tải Phiếu TNMaker 50 Câu (Trực tiếp)</p>
                     <p className="text-sm text-slate-500">File PDF tải ngay về máy</p>
                   </div>
                   <Download className="w-5 h-5 text-slate-400 group-hover:text-blue-600" />
                 </a>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button onClick={() => setShowBubbleSheetModal(false)} className="px-4 py-2 bg-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-300 transition-colors">Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}`;

content = content.replace(/<\/div>\s*<\/div>\s*\);\s*\}\s*$/, modalJsx + '\n}\n');

fs.writeFileSync('src/pages/ExamGenerator.tsx', content);
console.log("Patched ExamGenerator TNMaker Modal");
