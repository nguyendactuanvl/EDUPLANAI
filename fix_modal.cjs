const fs = require('fs');
let content = fs.readFileSync('src/pages/ExamGenerator.tsx', 'utf8');

const oldModal = /<div className="p-6 space-y-4">[\s\S]*?<\/div>\s*<div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">/;

const newModal = `<div className="p-6 space-y-4">
              <div>
                 <p className="font-semibold text-slate-700 mb-2">1. Mẫu hệ thống (In trực tiếp - Trắc nghiệm 4 đáp án)</p>
                 <button onClick={handlePrintBubbleSheet} className="w-full text-left px-4 py-3 border border-slate-200 rounded-lg hover:bg-emerald-50 hover:border-emerald-200 flex items-center justify-between group transition-colors">
                   <div>
                     <p className="font-medium text-slate-800 group-hover:text-emerald-700">Phiếu tô 40 câu cơ bản</p>
                     <p className="text-sm text-slate-500">In siêu tốc trực tiếp từ trình duyệt</p>
                   </div>
                   <Printer className="w-5 h-5 text-slate-400 group-hover:text-emerald-600" />
                 </button>
              </div>
              
              <div>
                 <p className="font-semibold text-slate-700 mb-2">2. Mẫu chuẩn Bộ GD&ĐT 2025 (TNMaker)</p>
                 <a href="https://tnmaker.net/phieu-tltn-2025-bgd/" target="_blank" rel="noreferrer" className="w-full text-left px-4 py-3 border border-slate-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 flex items-center justify-between group mb-2 transition-colors">
                   <div>
                     <p className="font-medium text-slate-800 group-hover:text-blue-700">Xem toàn bộ Kho Phiếu BGD 2025</p>
                     <p className="text-sm text-slate-500">Gồm Trắc nghiệm, Đúng/Sai, Trả lời ngắn</p>
                   </div>
                   <ExternalLink className="w-5 h-5 text-slate-400 group-hover:text-blue-600" />
                 </a>
                 <div className="grid grid-cols-2 gap-2">
                   <a href="https://tnmaker.net/wp-content/uploads/2023/12/Phieu-TLTN-50-cau-2025.pdf" target="_blank" rel="noreferrer" className="px-3 py-2 border border-slate-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 flex items-center justify-between group transition-colors">
                     <span className="text-sm font-medium text-slate-700 group-hover:text-blue-700">Mẫu 50 Câu</span>
                     <Download className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
                   </a>
                   <a href="https://tnmaker.net/wp-content/uploads/2023/12/Phieu-TLTN-40-cau-2025.pdf" target="_blank" rel="noreferrer" className="px-3 py-2 border border-slate-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 flex items-center justify-between group transition-colors">
                     <span className="text-sm font-medium text-slate-700 group-hover:text-blue-700">Mẫu 40 Câu</span>
                     <Download className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
                   </a>
                 </div>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">`;

content = content.replace(oldModal, newModal);
fs.writeFileSync('src/pages/ExamGenerator.tsx', content);
console.log("Updated modal UI");
