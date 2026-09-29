const fs = require('fs');

let code = fs.readFileSync('src/lib/exportUtils.ts', 'utf8');

if (!code.includes("html-docx-js-typescript")) {
    code = "import { asBlob } from 'html-docx-js-typescript';\nimport { saveAs } from 'file-saver';\n" + code;
}

const targetStr = `        const footer = "</div></body></html>";
        const sourceHTML = header + contentHtml + footer;
        
        const blob = new Blob(['\\ufeff', sourceHTML], { type: 'application/msword' });
        const source = URL.createObjectURL(blob);
        const fileDownload = document.createElement("a");
        document.body.appendChild(fileDownload);
        fileDownload.href = source;
        fileDownload.target = "_blank";
        fileDownload.download = filename.endsWith('.doc') ? filename : filename + '.doc';
        fileDownload.click();
        document.body.removeChild(fileDownload);`;

const replacement = `        const footer = "</div></body></html>";
        const sourceHTML = header + contentHtml + footer;
        
        // Use html-docx-js-typescript to generate a real .docx file
        const docxBlob = await asBlob(sourceHTML, { orientation: 'portrait', margins: { top: 720, right: 720, bottom: 720, left: 720 } });
        const finalFilename = filename.replace(/\\.doc$/, '') + '.docx';
        saveAs(docxBlob as Blob, finalFilename);`;

code = code.replace(targetStr, replacement);
fs.writeFileSync('src/lib/exportUtils.ts', code);
console.log("Patched exportUtils.ts");
