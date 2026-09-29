const fs = require('fs');
let code = fs.readFileSync('src/pages/LessonPlan.tsx', 'utf8');

const targetButtons = `
        <div className="absolute top-4 left-4 z-10 flex gap-2">
            <button 
                className="px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors shadow-sm flex items-center gap-2"
                onClick={() => { 
                    setSubject("Toán");
                    setSelectedGrade(10);
                    setCustomLessonName("Hệ bất phương trình bậc nhất hai ẩn");
                    setActiveTab("upload");
                    // Focus logic here would be to trigger generation but we let user click
                }}
            >
                <Sparkles className="w-4 h-4" /> BPT/HPT Bậc nhất
            </button>
        </div>
        `;

code = code.replace(targetButtons, "");
fs.writeFileSync('src/pages/LessonPlan.tsx', code);
console.log("Cleaned up top button");
