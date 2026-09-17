const fs = require('fs');
let code = fs.readFileSync('api/index.ts', 'utf8');

const newRules = `7. HÌNH VẼ VÀ ĐỒ THỊ BẰNG TIKZ:
   - BẮT BUỘC sử dụng TikZ nếu bài toán cần hình vẽ.
   - BẮT BUỘC phải bao bọc mã bên trong \\begin{tikzpicture} và \\end{tikzpicture}.
   - Mã TikZ phải được bọc trong khối markdown \`\`\`tikz ... \`\`\`.
   - LƯU Ý: Chỉ dùng các lệnh vẽ cơ bản (\\draw, \\node, \\fill). TUYỆT ĐỐI KHÔNG dùng pgfplots (không dùng \\begin{axis}). Không dùng \\usepackage.`;

code = code.replace(/7\. HÌNH VẼ VÀ ĐỒ THỊ BẰNG TIKZ:[\s\S]*?Không dùng \\usepackage\./m, newRules);

fs.writeFileSync('api/index.ts', code);
console.log('done');
