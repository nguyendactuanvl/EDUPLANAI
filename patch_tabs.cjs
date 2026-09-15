const fs = require('fs');
let content = fs.readFileSync('src/pages/ExamGenerator.tsx', 'utf8');

const oldTabs = `            <button 
              onClick={() => setActiveTab("banks")}
              className={\`px-6 py-3 font-medium text-sm whitespace-nowrap \${activeTab === 'banks' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-500 hover:text-slate-700'}\`}
            >
              Ngân hàng câu hỏi
            </button>
          </div>`;

const newTabs = `            <button 
              onClick={() => setActiveTab("banks")}
              className={\`px-6 py-3 font-medium text-sm whitespace-nowrap \${activeTab === 'banks' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-500 hover:text-slate-700'}\`}
            >
              Ngân hàng câu hỏi
            </button>
            <button 
              onClick={() => setShowBubbleSheetModal(true)}
              className="px-6 py-3 font-bold text-sm whitespace-nowrap text-blue-600 hover:text-blue-800 flex items-center gap-2"
            >
              <FileText className="w-4 h-4" /> Tải Phiếu Tô 2025
            </button>
          </div>`;

content = content.replace(oldTabs, newTabs);
fs.writeFileSync('src/pages/ExamGenerator.tsx', content);
console.log("Updated Tabs");
