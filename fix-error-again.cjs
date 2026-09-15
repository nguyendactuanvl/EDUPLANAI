const fs = require('fs');
let content = fs.readFileSync('src/pages/ExamGenerator.tsx', 'utf8');

content = content.replace(
  '<div className="mt-8 flex flex-col gap-4">\n                     <div className="flex gap-4">\n                     <button onClick={handleGenerate}',
  '<div className="mt-8 flex flex-col gap-4">\n                     {error && <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg">{error}</div>}\n                     <div className="flex gap-4">\n                     <button onClick={handleGenerate}'
);

fs.writeFileSync('src/pages/ExamGenerator.tsx', content);
