const fs = require('fs');
let content = fs.readFileSync('src/pages/Worksheets.tsx', 'utf8');

// Add import if not exists
if (!content.includes("GDPT_2018_SUBJECTS")) {
  content = content.replace(
    "import { apiFetch } from '../lib/apiFetch';",
    "import { apiFetch } from '../lib/apiFetch';\nimport { GDPT_2018_SUBJECTS } from '../lib/subjects';"
  );
}

// Replace subjects array
content = content.replace(
  /const subjects = \[[^\]]+\];/,
  "const subjects = GDPT_2018_SUBJECTS;"
);

fs.writeFileSync('src/pages/Worksheets.tsx', content);
