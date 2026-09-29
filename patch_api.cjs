const fs = require('fs');
let code = fs.readFileSync('/app/applet/api/index.ts', 'utf8');

const target = `      } else if (type === "students") {
        promptText = "Trích xuất danh sách họ và tên học sinh từ tài liệu đính kèm. Bỏ qua các tiêu đề, STT, cột điểm, chỉ lấy họ và tên.";
        responseSchema = {
          type: Type.OBJECT,
          properties: {
            students: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["students"]
        };
      } else {
        throw new Error("Invalid extract type");
      }`;

const replacement = `      } else if (type === "students") {
        promptText = "Trích xuất danh sách họ và tên học sinh từ tài liệu đính kèm. Bỏ qua các tiêu đề, STT, cột điểm, chỉ lấy họ và tên.";
        responseSchema = {
          type: Type.OBJECT,
          properties: {
            students: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["students"]
        };
      } else if (type === "raw_text") {
        promptText = "Trích xuất toàn bộ nội dung văn bản từ tài liệu đính kèm. Hãy giữ nguyên định dạng ngắt dòng. Trả về toàn bộ dưới dạng chuỗi trong trường text.";
        responseSchema = {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING }
          },
          required: ["text"]
        };
      } else {
        throw new Error("Invalid extract type");
      }`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('/app/applet/api/index.ts', code);
    console.log("Patched successfully");
} else {
    console.log("Target string not found in api/index.ts");
}
