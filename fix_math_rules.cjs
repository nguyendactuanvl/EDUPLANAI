const fs = require('fs');
let code = fs.readFileSync('api/index.ts', 'utf8');

code = code.replace(
  '- Với **Bảng biến thiên**, HÃY dùng môi trường LaTeX dạng ma trận \\begin{array} kẹp trong khối $$...$$.',
  '- Với **Bảng biến thiên**, HÃY dùng môi trường LaTeX dạng ma trận \\begin{array} kẹp trong khối $$...$$.\n   - [QUAN TRỌNG] BẮT BUỘC PHẢI DÙNG lệnh \\hline giữa tất cả các dòng của Bảng biến thiên để tạo đường kẻ ngang. (nhiều AI hay quên cái này, bạn phải nhớ ghi \\hline).'
);

fs.writeFileSync('api/index.ts', code);
console.log("Updated api/index.ts");
