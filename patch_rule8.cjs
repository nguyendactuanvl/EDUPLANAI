const fs = require('fs');
let code = fs.readFileSync('api/index.ts', 'utf8');

const targetStr = '+ Đối với Hệ BPT: Vẽ viền đậm quanh đa giác miền nghiệm (tuân thủ nét liền/đứt tương ứng) và đánh dấu rõ các đỉnh kèm tọa độ chính xác.';
const newRule = `   - NGUYÊN TẮC GIẢI TÍCH (CẤM VẼ TỰ DO / CẤM ĐOÁN TỌA ĐỘ):
     + Trước khi vẽ bất kỳ đường thẳng ax + by = c nào, BẮT BUỘC phải tính chính xác: Giao điểm với Ox (Cho y = 0 -> x = c/a) và Giao điểm với Oy (Cho x = 0 -> y = c/b).
     + Tọa độ các đỉnh đa giác miền nghiệm phải là nghiệm giải tích thực sự của hệ 2 phương trình đường thẳng giao nhau (Ví dụ: x + y = 4 và y = 3 thì giao điểm BẮT BUỘC là (1; 3), không được vẽ giao điểm nằm ngoài đường thẳng).
   - KỸ THUẬT VẼ TRÊN TIKZ:
     + Miền nghiệm đa giác: Định nghĩa các đỉnh bằng \\coordinate chuẩn số liệu giải tích, tô màu bằng \\fill[màu] (A) -- (B) -- (C) -- cycle.
     + Lệnh vẽ đường thẳng: Dùng đúng hàm plot (\\x, {(-a*\\x + c)/b}) với domain rộng hơn miền nghiệm một chút để thấy rõ giao cắt.
     + Không để xảy ra lỗi sai trực quan (như đường x+y=4 mà lại cắt Oy tại 3, hoặc điểm thuộc đường thẳng mà lại vẽ lệch ra ngoài).`;

if (code.includes(targetStr) && !code.includes('NGUYÊN TẮC GIẢI TÍCH')) {
    code = code.replace(targetStr, targetStr + '\n' + newRule);
    fs.writeFileSync('api/index.ts', code);
    console.log('Patched MATH_FORMATTING_RULES successfully.');
} else {
    console.log('Already patched or target string not found.');
}
