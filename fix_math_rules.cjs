const fs = require('fs');

let content = fs.readFileSync('api/index.ts', 'utf8');

const str = "- KHÔNG dùng thẻ \\\\text{} bên trong array nếu không cần thiết.";
const replaceStr = "- KHÔNG dùng thẻ \\\\text{} bên trong array nếu không cần thiết.\n   - BẮT BUỘC sử dụng \\\\hline để kẻ đường ngang giữa các hàng (hàng x, y', y phải được phân cách bằng \\\\hline).";

if (content.includes(str)) {
    content = content.replace(str, replaceStr);
    fs.writeFileSync('api/index.ts', content);
    console.log("Updated rules");
}
