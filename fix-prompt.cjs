const fs = require('fs');
let content = fs.readFileSync('api/index.ts', 'utf8');

const oldRules = "6. LƯU Ý TỐI QUAN TRỌNG VỀ BẢNG BIẾN THIÊN VÀ ĐỒ THỊ:\\n    - Với **Bảng biến thiên**, KHÔNG DÙNG Markdown Table thông thường vì dễ vỡ. HÃY dùng môi trường LaTeX dạng ma trận `array` kẹp trong khối $$...$$.\\n      Ví dụ Bảng xét dấu hoặc Bảng biến thiên:\\n      $$\\n     \\begin{array}{|c|lcccr|}\\n     \\hline\\n     x & -\\infty & & 0 & & +\\infty \\\\\\\\\\n     \\hline\\n     f'(x) & & - & 0 & + & \\\\\\\\\\n     \\hline\\n     f(x) & +\\infty & \\searrow & 1 & \\nearrow & +\\infty \\\\\\\\\\n     \\hline\\n     \\end{array}\\n     $$\\n   - Với **Đồ thị**: Hãy miêu tả chi tiết bằng văn bản đặc điểm của đồ thị (ví dụ: \"Đồ thị hàm số là đường cong đi qua điểm (0; 1), có tiệm cận đứng x=0...\").";

const newRules = "6. LƯU Ý TỐI QUAN TRỌNG VỀ BẢNG BIẾN THIÊN VÀ ĐỒ THỊ:\\n    - **TUYỆT ĐỐI KHÔNG** tạo ra các câu hỏi yêu cầu học sinh phải quan sát đồ thị hoặc hình vẽ (bởi vì hình ảnh không thể render được trong text). Thay vào đó, hãy sử dụng Bảng biến thiên, Bảng xét dấu, hoặc dùng hoàn toàn bằng chữ và công thức Toán học để mô tả.\\n    - Với **Bảng biến thiên**, HÃY dùng môi trường LaTeX dạng ma trận `array` kẹp trong khối $$...$$ và **BẮT BUỘC** phải có các đường kẻ ngang dọc (`\\hline`, `|`) giống hệt sách giáo khoa.\\n      Ví dụ Bảng xét dấu hoặc Bảng biến thiên chuẩn:\\n      $$\\n      \\begin{array}{|c|lccccr|}\\n      \\hline\\n      x & -\\infty & & -1 & & 2 & & +\\infty \\\\\\\\\\n      \\hline\\n      y' & & + & 0 & - & 0 & + & \\\\\\\\\\n      \\hline\\n      y & & & 5 & & & & +\\infty \\\\\\\\\\n      & & \\nearrow & & \\searrow & & \\nearrow & \\\\\\\\\\n      & -\\infty & & & & -4 & & \\\\\\\\\\n      \\hline\\n      \\end{array}\\n      $$";

content = content.replace(oldRules, newRules);

fs.writeFileSync('api/index.ts', content);
console.log("Patched api/index.ts");
