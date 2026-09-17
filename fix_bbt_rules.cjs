const fs = require('fs');
let code = fs.readFileSync('api/index.ts', 'utf8');

const newRules = `6. [CỰC KỲ QUAN TRỌNG] VỀ BẢNG BIẾN THIÊN (BBT):
   - Với **Bảng biến thiên**, HÃY dùng môi trường LaTeX dạng ma trận \\begin{array} kẹp trong khối $...$.
   - [QUAN TRỌNG] BẮT BUỘC PHẢI DÙNG lệnh \\hline giữa tất cả các dòng của BBT để tạo đường kẻ ngang (y' và y). Không được thiếu \\hline ở bất kỳ dòng nào.
   - TUYỆT ĐỐI KHÔNG DÙNG cú pháp nhân bản cột (như *{3}{c|}). Bạn PHẢI viết rõ từng cột (ví dụ: {|c|c|c|c|c|}).
   - Nếu có điểm mà y và y' không xác định, BẮT BUỘC tạo 2 vạch đứng liên tục. Cách tốt nhất trong KaTeX là gộp 2 vạch đứng ở khai báo cột (ví dụ: {|c|c||c|}) tại vị trí không xác định, hoặc điền dấu || trực tiếp vào ô tương ứng ở cả dòng y' và y.
   Ví dụ Bảng biến thiên hợp lệ (CÓ đường kẻ ngang và vạch đôi):
   $$
   \\begin{array}{|c|lccc||ccc|}
   \\hline
   x & -\\infty & & -1 & & 2 & & +\\infty \\\\
   \\hline
   y' & & + & 0 & - & || & + & \\\\
   \\hline
   y & & \\nearrow & 5 & \\searrow & || & \\nearrow & +\\infty \\\\
   \\hline
   \\end{array}
   $$`;

code = code.replace(/6\. \[CỰC KỲ QUAN TRỌNG\] VỀ BẢNG BIẾN THIÊN VÀ ĐỒ THỊ:[\s\S]*?\$\$/m, newRules);

fs.writeFileSync('api/index.ts', code);
console.log('done');
