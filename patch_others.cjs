const fs = require('fs');

function patchFile(file) {
  let code = fs.readFileSync(file, 'utf8');
  code = code.replace(/rehypePlugins=\{\[rehypeRaw, rehypeKatex\]\}/g, "rehypePlugins={[rehypeRaw, [rehypeKatex, { strict: false, throwOnError: false }]]}");
  fs.writeFileSync(file, code);
}

['src/pages/HistoryPage.tsx', 'src/pages/PdfToWord.tsx'].forEach(patchFile);
console.log("Patched HistoryPage and PdfToWord");
