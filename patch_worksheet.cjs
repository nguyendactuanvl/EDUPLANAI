const fs = require('fs');
let code = fs.readFileSync('api/index.ts', 'utf8');

// Ensure worksheets enforce grid formatting.
code = code.replace(
  '- mc: Trắc nghiệm nhiều lựa chọn (4 đáp án)',
  '- mc: Trắc nghiệm nhiều lựa chọn (4 đáp án). BẮT BUỘC trình bày 4 đáp án trong thẻ <div class="grid grid-cols-2 gap-4"> hoặc <div class="grid grid-cols-1 gap-4"> (nếu công thức dài).'
);

code = code.replace(
  'A., B., C., D.',
  'A., B., C., D.'
);

fs.writeFileSync('api/index.ts', code);
