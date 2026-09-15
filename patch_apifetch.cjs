const fs = require('fs');
let content = fs.readFileSync('src/lib/apiFetch.ts', 'utf8');
content = content.replace(
  'if (customKeyUsed) {\n        console.warn(`[apiFetch] Custom API key rate limited. Switching to system key...`);\n        skipCustomKey = true;\n        continue;\n      }',
  'if (customKeyUsed) {\n        if (attempt < maxRetries) {\n          console.warn(`[apiFetch] Custom API key rate limited (429/503). Retrying... (Attempt ${attempt + 1} of ${maxRetries})`);\n          window.dispatchEvent(new CustomEvent(\'api-retry-status\', { detail: { attempt: attempt + 1, maxRetries, message: "API Key cá nhân đang quá tải (429). Đang thử lại..." } }));\n          await delay(15000);\n          continue;\n        } else {\n          throw new Error("API Key cá nhân của bạn hiện đang quá tải do nhận quá nhiều yêu cầu (Lỗi 429/503). Vui lòng đợi 1-2 phút rồi thử lại.");\n        }\n      }'
);
fs.writeFileSync('src/lib/apiFetch.ts', content);
