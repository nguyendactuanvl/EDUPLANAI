const fs = require('fs');
let code = fs.readFileSync('src/pages/LessonPlan.tsx', 'utf8');

const targetButtons = `<div className="flex-1 overflow-auto">`;

const replacementButtons = `
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
        ` + targetButtons;

// Actually the best place is near the generate button
const targetGenerate = `<button 
          onClick={generateLessonPlan}`;
          
const replaceGenerate = `<button 
          onClick={() => {
            setSubject("Toán");
            setSelectedGrade(10);
            setCustomLessonName("Hệ bất phương trình bậc nhất hai ẩn");
            setActiveTab("upload");
            setTimeout(generateLessonPlan, 100);
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors mt-2 shadow-sm"
        >
          <Sparkles className="h-5 w-5" />
          Demo Soạn Giáo án BPT/HPT
        </button>
        ` + targetGenerate;

if (!code.includes("Demo Soạn Giáo án BPT/HPT")) {
  code = code.replace(targetGenerate, replaceGenerate);
  fs.writeFileSync('src/pages/LessonPlan.tsx', code);
  console.log("Patched LessonPlan.tsx successfully");
} else {
  console.log("Already patched.");
}
