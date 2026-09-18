const fs = require('fs');

let code = fs.readFileSync('src/pages/ExerciseSolver.tsx', 'utf8');

const targetButtons = `<button 
                      className="px-6 py-2.5 bg-emerald-600 text-white font-medium rounded-lg flex items-center gap-2 hover:bg-emerald-700 transition-colors shadow-sm"
                      onClick={startCamera}
                    >
                      <Camera className="w-4 h-4" /> Chụp Ảnh
                    </button>`;

const replacementButtons = targetButtons + `
                    <button 
                      className="px-6 py-2.5 bg-purple-600 text-white font-medium rounded-lg flex items-center gap-2 hover:bg-purple-700 transition-colors shadow-sm mt-2 md:mt-0"
                      onClick={(e) => { 
                        e.stopPropagation();
                        // Create a dummy text file with an inequality problem
                        const problemText = "Vẽ miền nghiệm của hệ bất phương trình sau và tìm giá trị lớn nhất của biểu thức F(x,y) = 2x + 1.5y trên miền nghiệm đó:\\n1. x + y <= 4\\n2. x > 0\\n3. y >= 0";
                        const blob = new Blob([problemText], { type: 'text/plain' });
                        const file = new File([blob], "He_Bat_Phuong_Trinh.txt", { type: 'text/plain' });
                        setSelectedFile(file);
                        setError(null);
                      }}
                    >
                      <Sparkles className="w-4 h-4" /> Demo Hệ BPT
                    </button>`;

code = code.replace(targetButtons, replacementButtons);
fs.writeFileSync('src/pages/ExerciseSolver.tsx', code);
console.log("Patched ExerciseSolver.tsx successfully");
