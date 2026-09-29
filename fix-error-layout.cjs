const fs = require('fs');
let content = fs.readFileSync('src/pages/ExamGenerator.tsx', 'utf8');

// The layout was:
// <div className="mt-8 flex gap-4">
//   <button ...
//   {error && <div...
//   <button Làm mới...
// </div>

content = content.replace(
  '<div className="mt-8 flex gap-4">\n                     <button onClick={handleGenerate}',
  '<div className="mt-8 flex flex-col gap-4">\n                     {error && <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg">{error}</div>}\n                     <div className="flex gap-4">\n                     <button onClick={handleGenerate}'
);

content = content.replace(
  '{error && <div className="mt-4 p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg">{error}</div>}\n                     <button onClick={() => {\n                       setQCounts({ mc: 20, tf: 0, sa: 0, essay: 0 });',
  '<button onClick={() => {\n                       setQCounts({ mc: 20, tf: 0, sa: 0, essay: 0 });'
);

content = content.replace(
  'Làm mới\n                     </button>\n                  </div>\n                </div>',
  'Làm mới\n                     </button>\n                     </div>\n                  </div>\n                </div>'
);

fs.writeFileSync('src/pages/ExamGenerator.tsx', content);
