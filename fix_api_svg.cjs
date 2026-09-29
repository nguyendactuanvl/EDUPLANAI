const fs = require('fs');
let code = fs.readFileSync('api/index.ts', 'utf8');

const newRules = `- Khi tính toán tọa độ vẽ hình SVG, BẮT BUỘC TÍNH CHÍNH XÁC tọa độ hình học thực tế. Ví dụ: Đường trung tuyến từ B đến AC thì điểm M phải nằm chính giữa đoạn AC (tọa độ M = trung bình cộng tọa độ A và C).
- Gắn nhãn các điểm (text) phải lệch ra ngoài hình một chút (khoảng 10-15px) so với tọa độ đỉnh để không bị đường thẳng đè lên.`;

code = code.replace(
    /- Kích thước khung vẽ gọn gàng/,
    `${newRules}\n- Kích thước khung vẽ gọn gàng`
);

fs.writeFileSync('api/index.ts', code);
console.log("Updated SVG geometry rules");
