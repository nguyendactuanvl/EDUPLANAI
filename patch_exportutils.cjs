const fs = require('fs');
let code = fs.readFileSync('src/lib/exportUtils.ts', 'utf8');

// Replace the html-docx-js-typescript import and docx generation logic
code = code.replace(/import \{ asBlob \} from 'html-docx-js-typescript';\n/, '');

const oldGenerationLogic = `        // Use html-docx-js-typescript to generate a real .docx file
        const docxBlob = await asBlob(sourceHTML, { orientation: 'portrait', margins: { top: 720, right: 720, bottom: 720, left: 720 } });
        const finalFilename = filename.replace(/\\.doc$/, '') + '.docx';
        saveAs(docxBlob as Blob, finalFilename);`;

const newGenerationLogic = `        // Use the backend to generate a real native .docx file
        const response = await fetch('/api/export-docx', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ html: contentHtml })
        });
        
        if (!response.ok) {
            throw new Error('Failed to generate DOCX from server');
        }
        
        const docxBlob = await response.blob();
        const finalFilename = filename.replace(/\\.doc$/, '') + '.docx';
        saveAs(docxBlob, finalFilename);`;

code = code.replace(oldGenerationLogic, newGenerationLogic);

fs.writeFileSync('src/lib/exportUtils.ts', code);
console.log('Patched exportUtils.ts');
