const fs = require('fs');
let content = fs.readFileSync('api/index.ts', 'utf8');

const replacement = `
BẮT BUỘC TRẢ VỀ DUY NHẤT MỘT ĐỐI TƯỢNG JSON VỚI CẤU TRÚC:
{
  "title": "ĐỀ KIỂM TRA MÔN \${subject.toUpperCase()} LỚP \${grade}",
  "duration": "\${duration}",
  "questions": [
    {
      "id": 1,
      "number": 1,
      "type": "mc", // "mc" (nhiều lựa chọn), "tf" (đúng sai), "sa" (trả lời ngắn), "essay" (tự luận)
      "content": "Nội dung câu hỏi...",
      "options": ["Đáp án 1", "Đáp án 2", "Đáp án 3", "Đáp án 4"], // CHỈ DÙNG CHO type="mc".
      "correct": "A", // Đáp án đúng cho "mc" (A/B/C/D)
      "tfStatements": [ // Dành RIÊNG cho type="tf". Gồm 4 ý a,b,c,d
        { "statement": "Ý a...", "correct": true },
        { "statement": "Ý b...", "correct": false },
        { "statement": "Ý c...", "correct": true },
        { "statement": "Ý d...", "correct": false }
      ],
      "correctAnswer": "Lời giải/Đáp án chi tiết hoặc đáp án đúng cho sa/essay",
      "explanation": "Lời giải chi tiết..."
    }
  ]
}`;

content = content.replace(
  /BẮT BUỘC TRẢ VỀ DUY NHẤT MỘT ĐỐI TƯỢNG JSON VỚI CẤU TRÚC:[\s\S]*?\]\n\}/,
  replacement
);

fs.writeFileSync('api/index.ts', content);
