const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');
content = content.replace(
  '<p className="font-semibold">Hệ thống AI đang bận (Lỗi quá tải - 429)</p>',
  '<p className="font-semibold">{retryStatus.message || "Hệ thống AI đang bận (Lỗi quá tải - 429)"}</p>'
);
fs.writeFileSync('src/App.tsx', content);
