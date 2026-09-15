const fs = require('fs');
let content = fs.readFileSync('src/pages/ExamGenerator.tsx', 'utf8');

// 1. Add icons
content = content.replace(
  'import { FileCheck, Sparkles, Shuffle, Download, Share2, Plus, Trash2, Printer, UploadCloud } from "lucide-react";',
  'import { FileCheck, Sparkles, Shuffle, Download, Share2, Plus, Trash2, Printer, UploadCloud, FileSpreadsheet, FileText } from "lucide-react";'
);

// 2. Add handler functions
const handlerFunctions = `
  const handleExportCSV = () => {
    if (shuffledExams.length === 0) return;
    let csvContent = "\\uFEFF"; // BOM for UTF-8
    csvContent += "Câu," + shuffledExams.map(e => e.code).join(",") + "\\n";
    const numQuestions = shuffledExams[0].questions.length;
    for (let i = 0; i < numQuestions; i++) {
        const row = [i + 1];
        for (const exam of shuffledExams) {
            const q = exam.questions[i];
            let ans = "";
            if (q.type === 'mc') {
                ans = String.fromCharCode(65 + (q.correctOptionIndex || 0));
            } else if (q.type === 'tf' && q.tfStatements) {
                ans = q.tfStatements.map(s => s.correct ? 'D' : 'S').join('');
            } else {
                ans = (q.correctAnswer || '').replace(/<[^>]*>?/gm, '').substring(0, 10);
            }
            row.push(ans);
        }
        csvContent += row.join(",") + "\\n";
    }
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", \`Dap_An_\${examName.replace(/\\s+/g, '_')}.csv\`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintBubbleSheet = () => {
    const windowPrint = window.open('', '', 'width=900,height=650');
    if (!windowPrint) return;
    let gridHtml = '';
    for (let col = 0; col < 4; col++) {
      gridHtml += '<div style="flex: 1; min-width: 150px;">';
      for (let row = 1; row <= 10; row++) {
        const num = col * 10 + row;
        gridHtml += \`
          <div style="display: flex; align-items: center; margin-bottom: 15px;">
            <span style="width: 35px; font-weight: bold; font-size: 14px;">\${num.toString().padStart(2, '0')}.</span>
            \${['A', 'B', 'C', 'D'].map(letter => \`
              <div style="width: 26px; height: 26px; border-radius: 50%; border: 1px solid #000; display: flex; align-items: center; justify-content: center; margin: 0 4px; font-size: 12px; font-weight: bold;">
                \${letter}
              </div>
            \`).join('')}
          </div>
        \`;
      }
      gridHtml += '</div>';
    }
    
    windowPrint.document.write(\`
      <html>
        <head>
          <title>Phiếu Tô Trắc Nghiệm</title>
          <style>
            body { font-family: "Times New Roman", Times, serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .title { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
            .info-grid { display: flex; justify-content: space-between; margin-bottom: 40px; border: 1px solid #000; padding: 15px; border-radius: 8px; }
            .info-col { flex: 1; }
            .info-line { border-bottom: 1px dotted #000; display: inline-block; min-width: 200px; margin-left: 5px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">PHIẾU TRẢ LỜI TRẮC NGHIỆM</div>
            <div>Dành cho bài thi trắc nghiệm (Tối đa 40 câu)</div>
          </div>
          <div class="info-grid">
            <div class="info-col">
              <p style="margin: 10px 0;"><strong>Họ và tên:</strong> <span class="info-line" style="min-width: 250px;"></span></p>
              <p style="margin: 10px 0;"><strong>Lớp:</strong> <span class="info-line"></span></p>
            </div>
            <div class="info-col">
              <p style="margin: 10px 0;"><strong>Môn thi:</strong> <span class="info-line"></span></p>
              <p style="margin: 10px 0;"><strong>Mã đề:</strong> <span class="info-line" style="min-width: 100px;"></span></p>
            </div>
          </div>
          <div style="display: flex; gap: 20px; justify-content: space-between;">
            \${gridHtml}
          </div>
        </body>
      </html>
    \`);
    windowPrint.document.close();
    windowPrint.focus();
    setTimeout(() => {
      windowPrint.print();
      windowPrint.close();
    }, 250);
  };
\n  return (`;
content = content.replace('  return (', handlerFunctions);

// 3. Add buttons
const shareButtons = `
                    <div className="flex flex-wrap gap-2 sm:gap-3">
                      <button onClick={handleShare} className="px-3 sm:px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 flex items-center gap-2">
                        <Share2 className="w-4 h-4" /> <span className="hidden sm:inline">Chia sẻ Online</span>
                      </button>
                      <button onClick={handleExportCSV} className="px-3 sm:px-4 py-2 bg-white border border-emerald-600 text-emerald-700 font-medium rounded-lg hover:bg-emerald-50 flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4" /> <span className="hidden sm:inline">Tải Excel (CSV)</span>
                      </button>
                      <button onClick={handlePrintBubbleSheet} className="px-3 sm:px-4 py-2 bg-white border border-emerald-600 text-emerald-700 font-medium rounded-lg hover:bg-emerald-50 flex items-center gap-2">
                        <FileText className="w-4 h-4" /> <span className="hidden sm:inline">In Phiếu Tô</span>
                      </button>
                    </div>`;
                    
content = content.replace(/<div className="flex gap-3">\s*<button onClick=\{handleShare\}[\s\S]*?<\/div>/, shareButtons);

fs.writeFileSync('src/pages/ExamGenerator.tsx', content);
console.log("Patched ExamGenerator functions and buttons");
