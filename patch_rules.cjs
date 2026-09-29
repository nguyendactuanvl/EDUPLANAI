const fs = require('fs');
let code = fs.readFileSync('api/index.ts', 'utf8');

const targetRuleStart = "const MATH_FORMATTING_RULES = `";
const targetRuleEnd = "`;";

const startIndex = code.indexOf(targetRuleStart);
if (startIndex !== -1) {
    const endIndex = code.indexOf(targetRuleEnd, startIndex + targetRuleStart.length);
    if (endIndex !== -1) {
        const oldRule = code.substring(startIndex, endIndex + targetRuleEnd.length);
        
        const newRule = `const MATH_FORMATTING_RULES = \`QUY TẮC ĐỊNH DẠNG TOÁN HỌC VÀ VĂN BẢN (BẮT BUỘC TUÂN THỦ NGHIÊM NGẶT):
1. Mọi công thức Toán bắt buộc viết bằng cú pháp chuẩn LaTeX (tuyệt đối không dùng ký tự Unicode như √, ∫).
2. Công thức nằm cùng dòng văn bản: Luôn kẹp trong cặp dấu $...$ (ví dụ: $y = \\dfrac{ax+b}{cx+d}$, $x \\in [1; 5]$). LUÔN CÓ KHOẢNG TRẮNG trước và sau dấu $ để không bị dính chữ.
3. Công thức nằm riêng một dòng độc lập: Luôn kẹp trong cặp dấu $$...$$.
4. Ký hiệu bắt buộc: Phân số dùng \\dfrac{a}{b}, hệ phương trình dùng \\begin{cases} ... \\end{cases}.
5. Bố cục văn bản dùng định dạng Markdown rõ ràng.
6. [CỰC KỲ QUAN TRỌNG] BẢNG BIẾN THIÊN VÀ ĐỒ THỊ BẰNG TIKZ:
   - BẮT BUỘC đặt toàn bộ code vẽ bảng biến thiên hoặc đồ thị vào trong khối markdown \\\`\\\`\\\`tikz ... \\\`\\\`\\\`. 
   - BẮT BUỘC phải bao bọc mã bên trong \\begin{tikzpicture} và \\end{tikzpicture}. KHÔNG DÙNG pgfplots (axis).
   - VỚI BẢNG BIẾN THIÊN: Dùng gói tkz-tab chuẩn mực. KHÔNG dùng môi trường ma trận array.
     + Cấu hình bắt buộc: \\tkzTabInit[lgt=1.5, espcl=3]...
     + Điểm gián đoạn (không xác định) bắt buộc dùng 2 vạch song song: ký hiệu d, -d/, +d/ trong tkz-tab.
     + Ký hiệu tổng quát: x_1, x_2, y_{CĐ}, y_{CT}, -\\infty, +\\infty.
   - VỚI ĐỒ THỊ: 
     + Tuyệt đối KHÔNG dùng đường cong Bezier (.. controls ..) kéo tự do làm sai tiếp tuyến đồ thị hàm số.
     + Phải dùng hàm giải tích chuẩn (ví dụ: \\draw[domain=..., samples=100] plot (\\x, {hàm_số})).
     + Điểm cực trị phải có tiếp tuyến ngang chính xác. 
     + Đường tiệm cận đứng, ngang, xiên phải vẽ nét đứt (dashed).
     + Phải gióng tọa độ đầy đủ nhãn tổng quát. Ký hiệu hệ trục Oxy (có mũi tên, nhãn x, y, O).\`;`;
        
        code = code.replace(oldRule, newRule);
        fs.writeFileSync('api/index.ts', code);
        console.log("Replaced MATH_FORMATTING_RULES successfully");
    } else {
        console.log("Could not find end of MATH_FORMATTING_RULES");
    }
} else {
    console.log("Could not find start of MATH_FORMATTING_RULES");
}
