const fs = require('fs');
let code = fs.readFileSync('api/index.ts', 'utf8');

const systemInstructionStr = `systemInstruction: "Tất cả biến số, ký hiệu toán và công thức BẮT BUỘC đặt trong cặp dấu $...$ (nội dòng) hoặc $$...$$ (khối dòng) theo cú pháp LaTeX chuẩn, tuyệt đối không xuất text thuần, giữ nguyên tiếng Việt UTF-8",`;

// We inject it into the generateWithFallback function directly, or into all calls.
// The easiest is inside generateWithFallback:

code = code.replace(
  'return await client.models.generateContent({ ...payloadOptions, model });',
  `
        const config = payloadOptions.config || {};
        const updatedPayload = { 
          ...payloadOptions, 
          model,
          config: {
            ...config,
            systemInstruction: config.systemInstruction || "Tất cả biến số, ký hiệu toán và công thức BẮT BUỘC đặt trong cặp dấu $...$ (nội dòng) hoặc $$...$$ (khối dòng) theo cú pháp LaTeX chuẩn, tuyệt đối không xuất text thuần, giữ nguyên tiếng Việt UTF-8."
          } 
        };
        return await client.models.generateContent(updatedPayload);
  `
);

fs.writeFileSync('api/index.ts', code);
console.log("Updated api/index.ts for system instruction");
