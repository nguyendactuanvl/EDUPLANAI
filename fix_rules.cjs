const fs = require('fs');
let code = fs.readFileSync('api/index.ts', 'utf8');

const correctRules = `QUY TẮC ĐỊNH DẠNG TOÁN HỌC VÀ VĂN BẢN (BẮT BUỘC TUÂN THỦ NGHIÊM NGẶT):
1. Mọi công thức Toán bắt buộc viết bằng cú pháp chuẩn LaTeX (tuyệt đối không dùng ký tự Unicode như √, ∫).
2. Công thức nằm cùng dòng văn bản: Luôn kẹp trong cặp dấu $...$ (ví dụ: $y = \\dfrac{ax+b}{cx+d}$, $x \\in [1; 5]$). LUÔN CÓ KHOẢNG TRẮNG trước và sau dấu $ để không bị dính chữ.
3. Công thức nằm riêng một dòng độc lập: Luôn kẹp trong cặp dấu $...$.
4. Ký hiệu bắt buộc: Phân số dùng \\dfrac{a}{b}, hệ phương trình dùng \\begin{cases} ... \\end{cases}.
5. Bố cục văn bản dùng định dạng Markdown rõ ràng.
6. [CỰC KỲ QUAN TRỌNG] VỀ BẢNG BIẾN THIÊN (BBT):
   - Với **Bảng biến thiên**, HÃY dùng môi trường LaTeX dạng ma trận \\begin{array} kẹp trong khối $...$.
   - [QUAN TRỌNG] BẮT BUỘC PHẢI DÙNG lệnh \\hline giữa tất cả các dòng của BBT để tạo đường kẻ ngang (y' và y). Không được thiếu \\hline ở bất kỳ dòng nào.
   - TUYỆT ĐỐI KHÔNG DÙNG cú pháp nhân bản cột (như *{3}{c|}). Bạn PHẢI viết rõ từng cột (ví dụ: {|c|c|c|c|c|}).
   - Nếu có điểm mà y và y' không xác định, BẮT BUỘC tạo 2 vạch đứng liên tục. Cách tốt nhất trong KaTeX là gộp 2 vạch đứng ở khai báo cột (ví dụ: {|c|c||c|}) tại vị trí không xác định.
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
   $$
7. HÌNH VẼ VÀ ĐỒ THỊ BẰNG TIKZ:
   - BẮT BUỘC sử dụng TikZ nếu bài toán cần hình vẽ.
   - BẮT BUỘC phải bao bọc mã bên trong \\begin{tikzpicture} và \\end{tikzpicture}.
   - Mã TikZ phải được bọc trong khối markdown \`\`\`tikz ... \`\`\`.
   - LƯU Ý: Chỉ dùng các lệnh vẽ cơ bản (\\draw, \\node, \\fill). TUYỆT ĐỐI KHÔNG dùng pgfplots (không dùng \\begin{axis}). Không dùng \\usepackage.`;

code = code.replace(/QUY TẮC ĐỊNH DẠNG TOÁN HỌC VÀ VĂN BẢN[\s\S]*?Không dùng \\usepackage\./m, correctRules);
fs.writeFileSync('api/index.ts', code);
console.log('done');
