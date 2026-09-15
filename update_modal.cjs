const fs = require('fs');
let content = fs.readFileSync('src/pages/ExamGenerator.tsx', 'utf8');

const oldModal = /<div className="grid grid-cols-2 gap-2">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">/;

const newModalSection = `<div className="grid grid-cols-2 gap-2">
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

              <div>
                 <p className="font-semibold text-slate-700 mb-2">3. Mẫu phần mềm chấm thi QM 2025</p>
                 <a href="https://qmapp.vn/phieu-mau/" target="_blank" rel="noreferrer" className="w-full text-left px-4 py-3 border border-slate-200 rounded-lg hover:bg-orange-50 hover:border-orange-200 flex items-center justify-between group mb-2 transition-colors">
                   <div>
                     <p className="font-medium text-slate-800 group-hover:text-orange-700">Xem toàn bộ Kho Phiếu QM</p>
                     <p className="text-sm text-slate-500">Mẫu quét cực nhạy cho Toán/Văn/Anh 2025</p>
                   </div>
                   <ExternalLink className="w-5 h-5 text-slate-400 group-hover:text-orange-600" />
                 </a>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">`;

content = content.replace(oldModal, newModalSection);
fs.writeFileSync('src/pages/ExamGenerator.tsx', content);
console.log("Updated modal UI with QM app");
