const fs = require('fs');
let content = fs.readFileSync('api/index.ts', 'utf8');

const endpoints = [
  '/api/generate-plan',
  '/api/generate-similar',
  '/api/generate-worksheet',
  '/api/pdf-to-word',
  '/api/solve-exercise',
  '/api/extract-data',
  '/api/generate-lesson-plan-file',
  '/api/upgrade-lesson-plan',
  '/api/circulars',
  '/api/exams/share'
];

for (const ep of endpoints) {
  const search1 = `app.all("${ep}", async (req, res) => {`;
  const search2 = `app.all("${ep}", (req, res) => {`;
  
  const replaceWith = `
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-gemini-api-key');

  if (req.method === 'OPTIONS') return res.status(200).end();
`;

  if (content.includes(search1)) {
    content = content.replace(search1, search1 + replaceWith);
  } else if (content.includes(search2)) {
    content = content.replace(search2, search2 + replaceWith);
  }
}

fs.writeFileSync('api/index.ts', content);
