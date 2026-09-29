const fs = require('fs');

let content = fs.readFileSync('api/index.ts', 'utf8');

// 1. Refine /api/generate-lesson-plan prompt (from System)
content = content.replace(
`III. TIẾN TRÌNH DẠY HỌC (4 HOẠT ĐỘNG CHUẨN)
Trình bày chi tiết từng hoạt động (Khởi động, Hình thành kiến thức mới, Luyện tập, Vận dụng). Mỗi hoạt động phải trình bày bằng BẢNG (sử dụng chuẩn Markdown table) gồm:
- Mục tiêu
- Nội dung
- Sản phẩm
- Tổ chức thực hiện: 4 bước rõ ràng (Chuyển giao nhiệm vụ -> Thực hiện nhiệm vụ -> Báo cáo, thảo luận -> Kết luận, nhận định).`,
`III. TIẾN TRÌNH DẠY HỌC (4 HOẠT ĐỘNG CHUẨN)
Trình bày chi tiết từng hoạt động (Hoạt động 1: Khởi động/Xác định vấn đề; Hoạt động 2: Hình thành kiến thức mới; Hoạt động 3: Luyện tập; Hoạt động 4: Vận dụng). Mỗi hoạt động phải trình bày bằng BẢNG (sử dụng chuẩn Markdown table) gồm 4 cột:
- Mục tiêu
- Nội dung (Các câu hỏi, bài tập, tình huống cụ thể)
- Sản phẩm (Câu trả lời, kết quả mong đợi thật chi tiết)
- Tổ chức thực hiện (Bao gồm 4 bước rõ ràng: Bước 1: Chuyển giao nhiệm vụ -> Bước 2: Thực hiện nhiệm vụ -> Bước 3: Báo cáo, thảo luận -> Bước 4: Kết luận, nhận định). Trong đó nêu rõ hoạt động của GV và HS, có phân bổ thời gian dự kiến cụ thể (ví dụ: 10 phút, 15 phút...).`);

// 2. Refine /api/generate-lesson-plan-file prompt (from File)
content = content.replace(
`Mỗi hoạt động phải trình bày rõ ràng bằng BẢNG (Mục tiêu, Nội dung, Sản phẩm, Tổ chức thực hiện). Đặc biệt, lồng ghép khéo léo việc sử dụng phần mềm, kỹ năng số, hoặc ứng dụng AI vào phần "Tổ chức thực hiện".`,
`Mỗi hoạt động phải trình bày rõ ràng bằng BẢNG 4 cột: Mục tiêu | Nội dung | Sản phẩm (cụ thể) | Tổ chức thực hiện (gồm 4 bước: Chuyển giao, Thực hiện, Báo cáo, Kết luận). Kèm thời gian dự kiến (phút). Đặc biệt, lồng ghép khéo léo việc sử dụng phần mềm, kỹ năng số, hoặc ứng dụng AI vào phần "Tổ chức thực hiện". Tránh nói chung chung.`);

// 3. Refine /api/upgrade-lesson-plan prompt (Upgrade)
content = content.replace(
`3. **Phần Tiến trình dạy học**: Với mỗi hoạt động (Khởi động, Hình thành kiến thức, Luyện tập, Vận dụng), hãy khéo léo lồng ghép việc giáo viên hoặc học sinh sử dụng thiết bị số, phần mềm dạy học, công cụ trí tuệ nhân tạo (AI) vào mục "Tổ chức thực hiện" hoặc "Sản phẩm". Không được làm thay đổi quá nhiều bản chất bài cũ, chỉ làm cho nó "số hóa" và "thông minh" hơn.`,
`3. **Phần Tiến trình dạy học**: 
   - Với mỗi hoạt động (Khởi động, Hình thành kiến thức, Luyện tập, Vận dụng), hãy khéo léo lồng ghép việc giáo viên hoặc học sinh sử dụng thiết bị số, phần mềm dạy học, công cụ trí tuệ nhân tạo (AI) vào mục "Tổ chức thực hiện" hoặc "Sản phẩm".
   - GIỮ NGUYÊN hoặc làm chi tiết thêm nội dung chuyên môn, câu hỏi, bài tập của bài cũ, tuyệt đối không được viết chung chung, sơ sài đi so với bản gốc. Phải thể hiện 4 bước rõ ràng (Chuyển giao, Thực hiện, Báo cáo, Kết luận).`);

fs.writeFileSync('api/index.ts', content);
