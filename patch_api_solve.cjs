const fs = require('fs');
let content = fs.readFileSync('api/index.ts', 'utf8');

const oldPrompt = `4. Định dạng đầu ra thành 2 phần rõ rệt (dùng tiêu đề H2):
## Đề bài
[Nội dung đề]

## Lời giải chi tiết
[Các bước giải chi tiết]

\${MATH_FORMATTING_RULES}
5. BẮT BUỘC kiểm tra và SỬA LỖI CHÍNH TẢ tiếng Việt thật cẩn thận trước khi trả kết quả.\`;`;

const newPrompt = `4. Định dạng đầu ra thành 2 phần rõ rệt (dùng tiêu đề H2):
## Đề bài
[Nội dung đề]

## Lời giải chi tiết
[Các bước giải chi tiết]

\${MATH_FORMATTING_RULES}
5. BẮT BUỘC kiểm tra và SỬA LỖI CHÍNH TẢ tiếng Việt thật cẩn thận trước khi trả kết quả.
6. [QUAN TRỌNG] BẮT BUỘC vẽ bảng biến thiên (BBT), đồ thị hàm số, hoặc hình học (nếu có yêu cầu hoặc cần thiết cho bài toán) bằng code TikZ. Đặt toàn bộ code TikZ (bắt đầu bằng \\begin{tikzpicture} và kết thúc bằng \\end{tikzpicture}) vào trong một block markdown có định dạng:
\`\`\`tikz
\\begin{tikzpicture}
...
\\end{tikzpicture}
\`\`\`\`;`;

content = content.replace(oldPrompt, newPrompt);
fs.writeFileSync('api/index.ts', content);
console.log("Updated api/index.ts");
