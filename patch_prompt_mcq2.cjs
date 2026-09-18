const fs = require('fs');
let code = fs.readFileSync('api/index.ts', 'utf8');

const targetStr = '+ Đối với Hệ BPT: Vẽ viền đậm quanh đa giác miền nghiệm (tuân thủ nét liền/đứt tương ứng) và đánh dấu rõ các đỉnh kèm tọa độ chính xác.';

const additionalRule = `
9. [CỰC KỲ QUAN TRỌNG] TRÌNH BÀY ĐÁP ÁN TRẮC NGHIỆM:
   - TUYỆT ĐỐI KHÔNG viết các đáp án A, B, C, D dính liền nhau trên cùng một dòng.
   - BẮT BUỘC mỗi đáp án phải nằm trên một dòng riêng biệt.
   - Khuyến khích sử dụng HTML Grid để trình bày đáp án thẳng hàng đẹp mắt (đặc biệt khi xuất Word sẽ rất chuẩn). BẮT BUỘC dùng cấu trúc:
     <div class="grid grid-cols-2 gap-4">
       <div><strong>A.</strong> $đáp_án_A$</div>
       <div><strong>B.</strong> $đáp_án_B$</div>
       <div><strong>C.</strong> $đáp_án_C$</div>
       <div><strong>D.</strong> $đáp_án_D$</div>
     </div>
   - CHÚ Ý: Nếu đáp án là CÔNG THỨC TOÁN DÀI (ví dụ: Hệ bất phương trình, ma trận, tích phân lớn), BẮT BUỘC dùng grid-cols-1 để mỗi đáp án chiếm trọn 1 dòng rộng rãi:
     <div class="grid grid-cols-1 gap-4">
       <div><strong>A.</strong> $\\begin{cases} ... \\end{cases}$</div>
       ...
     </div>`;

if (code.includes(targetStr) && !code.includes('TRÌNH BÀY ĐÁP ÁN TRẮC NGHIỆM')) {
    code = code.replace(targetStr, targetStr + '\n' + additionalRule);
    fs.writeFileSync('api/index.ts', code);
    console.log('Patched MATH_FORMATTING_RULES successfully.');
} else {
    console.log('Already patched or target string not found.');
}
