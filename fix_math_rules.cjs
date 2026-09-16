const fs = require('fs');

let content = fs.readFileSync('api/index.ts', 'utf8');

content = content.replace("TUYỆT ĐỐI KHÔNG dùng pgfplots (không dùng \\begin{axis}). Không dùng \\usepackage.`;", "TUYỆT ĐỐI KHÔNG dùng pgfplots (không dùng \\\\begin{axis}). Không dùng \\\\usepackage.`;");
content = content.replace(" Chỉ dùng các lệnh vẽ cơ bản (\\draw, \\node, \\fill).", " Chỉ dùng các lệnh vẽ cơ bản (\\\\draw, \\\\node, \\\\fill).");

fs.writeFileSync('api/index.ts', content);
