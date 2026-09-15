const fs = require('fs');
let lesson = fs.readFileSync('src/pages/LessonPlan.tsx', 'utf8');

// The original lines were probably:
// 94: if (activeTab === "upgrade" ...
// 126: } else if (activeTab === "upgrade") {
// 337-338: className={activeTab === 'upgrade'... onClick={() => setActiveTab('upgrade')}
// 427, 438, 445, 457, 488: activeTab === 'upgrade'

// Let's just fix the type definition and then replace the ones that were changed.
lesson = lesson.replace(
  'useState<"system" | "upload">("system");',
  'useState<"system" | "upload" | "upgrade">("system");'
);

// line 94
lesson = lesson.replace(
  'if (activeTab === "upload" && (!customLessonName.trim() || uploadedFiles.length === 0)) {',
  'if (activeTab === "upgrade" && (!customLessonName.trim() || uploadedFiles.length === 0)) {'
);

// line 126
lesson = lesson.replace(
  '} else if (activeTab === "upload") {\n        endpoint = \'/api/upgrade-lesson-plan\';',
  '} else if (activeTab === "upgrade") {\n        endpoint = \'/api/upgrade-lesson-plan\';'
);

// line 337
lesson = lesson.replace(
  '<button \n            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === \'upload\' ? \'bg-white shadow-sm text-slate-800\' : \'text-slate-500 hover:text-slate-700\'}`}\n            onClick={() => setActiveTab(\'upload\')}\n          >\n            Nâng cấp Giáo án\n          </button>',
  '<button \n            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === \'upgrade\' ? \'bg-white shadow-sm text-slate-800\' : \'text-slate-500 hover:text-slate-700\'}`}\n            onClick={() => setActiveTab(\'upgrade\')}\n          >\n            Nâng cấp Giáo án\n          </button>'
);

// The activeTab === 'upload' ? 'Giáo án cũ' was originally activeTab === 'upgrade' ? 'Giáo án cũ'
lesson = lesson.replace(
  "{activeTab === 'upload' ? 'Giáo án cũ' : 'tham khảo (Sách, Văn bản...)'}",
  "{activeTab === 'upgrade' ? 'Giáo án cũ' : 'tham khảo (Sách, Văn bản...)'}"
);

lesson = lesson.replace(
  "Tải lên file Giáo án cũ (.docx)",
  "Tải lên file Giáo án cũ (.docx)"
); // nothing to do

fs.writeFileSync('src/pages/LessonPlan.tsx', lesson);
console.log("Fixed LessonPlan.tsx");
