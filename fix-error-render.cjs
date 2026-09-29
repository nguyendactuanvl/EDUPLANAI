const fs = require('fs');
let content = fs.readFileSync('src/pages/ExamGenerator.tsx', 'utf8');

// Find the button and add the error message below it
content = content.replace(
  '<button onClick={() => {\n                       setQCounts({ mc: 20, tf: 0, sa: 0, essay: 0 });',
  '{error && <div className="mt-4 p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg">{error}</div>}\n                     <button onClick={() => {\n                       setQCounts({ mc: 20, tf: 0, sa: 0, essay: 0 });'
);

fs.writeFileSync('src/pages/ExamGenerator.tsx', content);
