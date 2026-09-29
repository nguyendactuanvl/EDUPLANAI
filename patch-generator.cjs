const fs = require('fs');
let content = fs.readFileSync('src/pages/ExamGenerator.tsx', 'utf8');

const startIdx = content.indexOf('const handleShare = async () => {');
const endIdx = content.indexOf('  };', startIdx) + 4;

const newShare = `const handleShare = async () => {
    try {
      const dataToShare = { 
        examData: { examName, duration },
        codes: shuffledExams 
      };
      const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(dataToShare));
      const url = \\\`\\\${window.location.origin}/?examData=\\\${compressed}\\\`;
      setShareLink(url);
      setActiveTab("shuffle");
    } catch (err: any) {
      alert("Lỗi tạo link: " + err.message);
    }
  };`;

content = content.substring(0, startIdx) + newShare + content.substring(endIdx);
fs.writeFileSync('src/pages/ExamGenerator.tsx', content);
console.log("Patched src/pages/ExamGenerator.tsx");
