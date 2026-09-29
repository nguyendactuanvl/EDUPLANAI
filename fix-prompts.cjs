const fs = require('fs');
let content = fs.readFileSync('api/index.ts', 'utf8');

content = content.replace(
  '3. GIỮ NGUYÊN BẢNG BIỂU: Dùng cú pháp Markdown table để tạo lại chính xác các bảng biểu trong tài liệu.',
  '3. GIỮ NGUYÊN BẢNG BIỂU: Dùng cú pháp Markdown table để tạo lại chính xác các bảng biểu thông thường. ĐỐI VỚI BẢNG BIẾN THIÊN HOẶC BẢNG XÉT DẤU TOÁN HỌC, TUYỆT ĐỐI KHÔNG DÙNG Markdown Table, HÃY DÙNG CÚ PHÁP LaTeX `array` (như đã quy định ở trên).'
);

fs.writeFileSync('api/index.ts', content);
console.log("Updated pdf-to-word prompt");
