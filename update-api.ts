import fs from 'fs';

let content = fs.readFileSync('api/index.ts', 'utf8');

const imports = `
import mammoth from 'mammoth';
import WordExtractor from 'word-extractor';

`;
content = content.replace('import { GoogleGenAI, Type } from "@google/genai";', 'import { GoogleGenAI, Type } from "@google/genai";' + imports);

const parseFunc = `
async function processFilesForAI(files: any[]) {
  const processedFiles = [];
  for (const f of files) {
    if (!f.data) continue;
    try {
      let isDoc = f.type === 'application/msword' || f.name?.endsWith('.doc');
      let isDocx = f.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || f.name?.endsWith('.docx');
      
      // Fallback identification based on data signature if type/name is missing
      if (!isDoc && !isDocx && f.data.startsWith('0M8R4KGxGuE')) {
         isDoc = true; // OLE format
      }
      if (!isDoc && !isDocx && f.data.startsWith('UEsDBBQ')) {
         isDocx = true; // ZIP format
      }

      if (isDocx) {
        const buffer = Buffer.from(f.data, 'base64');
        const result = await mammoth.convertToHtml({ buffer });
        processedFiles.push({
          inlineData: {
            data: Buffer.from(result.value).toString('base64'),
            mimeType: 'text/html'
          }
        });
      } else if (isDoc) {
        const buffer = Buffer.from(f.data, 'base64');
        const extractor = new WordExtractor();
        const extracted = await extractor.extract(buffer);
        processedFiles.push({
          inlineData: {
            data: Buffer.from(extracted.getBody()).toString('base64'),
            mimeType: 'text/plain'
          }
        });
      } else {
        processedFiles.push({
          inlineData: {
            data: f.data,
            mimeType: f.type || 'text/plain'
          }
        });
      }
    } catch (e) {
      console.error("Error processing file:", e);
      processedFiles.push({
        inlineData: {
          data: f.data,
          mimeType: f.type || 'text/plain'
        }
      });
    }
  }
  return processedFiles;
}
`;

content = content.replace('function resolveFiles(reqBody: any) {', parseFunc + '\nfunction resolveFiles(reqBody: any) {');

fs.writeFileSync('api/index.ts', content);
