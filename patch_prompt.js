const fs = require('fs');

let code = fs.readFileSync('api/index.ts', 'utf8');

const targetRuleStr = "không bị đường kẻ cắt ngang chữ.`;";
const newRule = `không bị đường kẻ cắt ngang chữ.
8. [CỰC KỲ QUAN TRỌNG] VẼ MIỀN NGHIỆM BẤT PHƯƠNG TRÌNH (BPT) VÀ HỆ BPT BẬC NHẤT HAI ẨN (Chuẩn GDPT 2018):
   - Đặt code vào khối markdown \\\`\\\`\\\`tikz ... \\\`\\\`\\\` và bao bọc bởi \\begin{tikzpicture} và \\end{tikzpicture}.
   - Dùng thư viện \\usetikzlibrary{patterns}. KHÔNG dùng package khác.
   - QUY ƯỚC ĐƯỜNG BIÊN:
     + Dấu bằng (>= hoặc <=): Đường thẳng biên vẽ NÉT LIỀN (thick, solid).
     + Dấu ngặt (> hoặc <): Đường thẳng biên vẽ NÉT ĐỨT (dashed, thick).
     + Phải đặt nhãn tên đường thẳng ($d_1, d_2,...$) ở đầu mút.
   - MIỀN NGHIỆM VÀ PHẦN GẠCH BỎ:
     + Phần KHÔNG thuộc miền nghiệm: Dùng nét gạch sọc (pattern=north east lines hoặc north west lines, pattern color=gray!50). Bắt buộc lồng trong môi trường \\begin{scope} \\clip ... \\end{scope} giới hạn trong khung hình để nét gạch không bị lem ra ngoài trục tọa độ.
     + Phần THUỘC miền nghiệm: Giữ trắng hoặc tô màu nền sáng (cyan!15 hoặc yellow!15).
     + Đối với Hệ BPT: Vẽ viền đậm quanh đa giác miền nghiệm (tuân thủ nét liền/đứt theo viền BPT) và đánh dấu rõ các đỉnh kèm tọa độ chính xác.
   - Trục tọa độ Oxy có mũi tên (>=stealth), đánh dấu đầy đủ gốc O và các giao điểm trên trục Ox, Oy bằng nét đứt gióng tọa độ. Che nền text (fill=white, inner sep=1pt) để đường gạch/trục không đè lên chữ.\`;`;

code = code.replace(targetRuleStr, newRule);
fs.writeFileSync('api/index.ts', code);
console.log("Patched api/index.ts successfully");
