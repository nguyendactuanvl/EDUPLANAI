const fs = require('fs');
let content = fs.readFileSync('src/data/mockData.ts', 'utf8');

// For existing ones, add subject: "Toán"
content = content.replace(/grade: 10, stt:/g, 'subject: "Toán", grade: 10, stt:');
content = content.replace(/grade: 11, stt:/g, 'subject: "Toán", grade: 11, stt:');
content = content.replace(/grade: 12, stt:/g, 'subject: "Toán", grade: 12, stt:');

const newData = `
  // NGỮ VĂN 10
  {
    id: "nv10-1", subject: "Ngữ văn", grade: 10, stt: 1,
    lesson: "Bài 1: Sức hấp dẫn của truyện kể", periods: 9,
    requirement: "Nhận biết và phân tích được một số yếu tố của truyện kể: cốt truyện, người kể chuyện, điểm nhìn, lời người kể chuyện, lời nhân vật.",
    digitalComp: "2.1.NC1a: Tìm kiếm tài liệu số về tác phẩm.",
    aiComp: "10.C2.1: Dùng AI tóm tắt tác phẩm, phân tích nhân vật cơ bản.",
    stem: "Không", note: ""
  },
  {
    id: "nv10-2", subject: "Ngữ văn", grade: 10, stt: 2,
    lesson: "Bài 2: Vẻ đẹp của thơ ca", periods: 8,
    requirement: "Nhận biết và phân tích được vai trò của yếu tố tượng trưng trong thơ, đánh giá giá trị thẩm mỹ của ngôn từ.",
    digitalComp: "3.1.NC1a: Dùng công cụ tạo sơ đồ tư duy phân tích hình ảnh thơ.",
    aiComp: "10.A1.1: Gợi ý các cách hiểu đa chiều về hình tượng thơ bằng AI.",
    stem: "Không", note: ""
  },
  // VẬT LÍ 10
  {
    id: "vl10-1", subject: "Vật lí", grade: 10, stt: 1,
    lesson: "Bài 1: Làm quen với Vật lí", periods: 2,
    requirement: "Nêu được đối tượng nghiên cứu, phương pháp nghiên cứu của Vật lí.",
    digitalComp: "1.1.NC1a: Khai thác thông tin trên Internet về lịch sử Vật lí.",
    aiComp: "Không yêu cầu",
    stem: "Không", note: ""
  },
  {
    id: "vl10-2", subject: "Vật lí", grade: 10, stt: 2,
    lesson: "Bài 2: Các quy tắc an toàn trong phòng thực hành Vật lí", periods: 1,
    requirement: "Nhận biết biển cảnh báo, thực hiện quy tắc an toàn.",
    digitalComp: "Không yêu cầu",
    aiComp: "Không yêu cầu",
    stem: "Không", note: ""
  },
  {
    id: "vl10-3", subject: "Vật lí", grade: 10, stt: 3,
    lesson: "Bài 3: Thực hành tính sai số trong phép đo", periods: 2,
    requirement: "Biết cách tính sai số, ghi kết quả đo.",
    digitalComp: "3.2.NC1a: Dùng Excel xử lý số liệu đo đạc.",
    aiComp: "10.D2.1: Phân tích số liệu và sai số bằng công cụ AI.",
    stem: "Có", note: ""
  },
  // TIN HỌC 10
  {
    id: "th10-1", subject: "Tin học", grade: 10, stt: 1,
    lesson: "Bài 1: Thông tin và xử lí thông tin", periods: 2,
    requirement: "Phân biệt được thông tin và dữ liệu, biết quá trình xử lí thông tin.",
    digitalComp: "1.1.NC1a: Phân biệt dạng thông tin số.",
    aiComp: "10.A1.1: Trải nghiệm công cụ AI xử lí ngôn ngữ tự nhiên.",
    stem: "Không", note: ""
  },
  // LỊCH SỬ 10
  {
    id: "ls10-1", subject: "Lịch sử", grade: 10, stt: 1,
    lesson: "Bài 1: Hiện thực lịch sử và nhận thức lịch sử", periods: 2,
    requirement: "Trình bày được khái niệm lịch sử, phân biệt hiện thực và nhận thức lịch sử.",
    digitalComp: "2.1.NC1a: Tra cứu tư liệu số lịch sử.",
    aiComp: "10.C2.1: Phân tích sự khác biệt góc nhìn qua AI.",
    stem: "Không", note: ""
  },
`;

content = content.replace('// LỚP 10', newData + '\n  // LỚP 10');

fs.writeFileSync('src/data/mockData.ts', content);
