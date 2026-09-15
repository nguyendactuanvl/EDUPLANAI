const fs = require('fs');
let content = fs.readFileSync('api/index.ts', 'utf8');

const newEndpoint = `
app.all("/api/generate-interactive-worksheet", async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-gemini-api-key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
    
  try {
    const { lesson, subject, grade, type } = req.body;
       
    const promptText = \`Bạn là một giáo viên xuất sắc môn \${subject || "chung"}. Hãy tạo một Phiếu bài tập (Worksheet) tương tác thật chuyên nghiệp cho học sinh lớp \${grade}, bài học/chủ đề: "\${lesson}". Hình thức: \${type || "Kết hợp trắc nghiệm, đúng/sai, trả lời ngắn, tự luận"}.
       
    YÊU CẦU:
    1. Đưa ra khoảng 5-10 câu hỏi phân hóa từ cơ bản đến vận dụng.
    2. Các câu hỏi có thể thuộc 4 loại hình:
       - mc: Trắc nghiệm nhiều lựa chọn (4 đáp án)
       - tf: Trắc nghiệm Đúng/Sai (Mỗi câu gồm 4 ý a, b, c, d - học sinh phải chọn Đúng hoặc Sai cho TỪNG ý)
       - sa: Trả lời ngắn (kết quả là 1 số hoặc 1 từ/cụm từ ngắn gọn)
       - essay: Tự luận
    \${MATH_FORMATTING_RULES}
    3. BẮT BUỘC SỬA LỖI CHÍNH TẢ tiếng Việt thật cẩn thận.
    4. BẮT BUỘC TRẢ VỀ DUY NHẤT MỘT ĐỐI TƯỢNG JSON VỚI CẤU TRÚC SAU:
    {
      "examName": "Phiếu bài tập: \${lesson}",
      "questions": [
        {
          "type": "mc",
          "content": "Nội dung câu hỏi...",
          "options": ["Đáp án 1", "Đáp án 2", "Đáp án 3", "Đáp án 4"],
          "correctOptionIndex": 0, // Vị trí đáp án đúng (0, 1, 2, 3)
          "explanation": "Giải thích..."
        },
        {
          "type": "tf",
          "content": "Nội dung câu hỏi Đúng/Sai...",
          "tfStatements": [
            { "statement": "Ý a...", "correct": true },
            { "statement": "Ý b...", "correct": false },
            { "statement": "Ý c...", "correct": true },
            { "statement": "Ý d...", "correct": false }
          ],
          "explanation": "Giải thích..."
        },
        {
          "type": "sa",
          "content": "Nội dung câu trả lời ngắn...",
          "correctAnswer": "Giá trị/Từ khóa đúng (ngắn gọn)",
          "explanation": "Giải thích..."
        },
        {
          "type": "essay",
          "content": "Nội dung tự luận...",
          "correctAnswer": "Hướng dẫn chấm/Đáp án gợi ý chi tiết"
        }
      ]
    }
    \`;

    const response = await generateWithFallback(req, {
      contents: promptText,
      config: {
        responseMimeType: "application/json"
      }
    });

    let rawOutput = response.text || '';
    let parsedData: any = {};
    try {
      parsedData = JSON.parse(rawOutput);
    } catch {
      const cleanJson = rawOutput.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
      parsedData = JSON.parse(cleanJson);
    }
    
    // Process questions
    const formattedQuestions = (parsedData.questions || []).map((q: any, idx: number) => {
       return {
         ...q,
         id: idx + 1,
         number: idx + 1
       };
    });

    res.json({
       ...parsedData,
       questions: formattedQuestions
    });
  } catch (error: any) {
    return handleAiError(error, req, res);
  }
});
`;

content = content.replace('app.all("/api/generate-worksheet"', newEndpoint + '\napp.all("/api/generate-worksheet"');
fs.writeFileSync('api/index.ts', content);
