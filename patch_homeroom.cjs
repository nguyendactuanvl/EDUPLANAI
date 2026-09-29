const fs = require('fs');
let code = fs.readFileSync('/app/applet/src/pages/HomeroomManagement.tsx', 'utf8');

const target1 = `  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {`;
const replacement1 = `  const handleRuleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('image/') || file.name.endsWith('.pdf') || file.name.endsWith('.doc') || file.name.endsWith('.docx')) {
       const reader = new FileReader();
       reader.onload = async (event) => {
         const base64 = event.target?.result as string;
         setIsExtracting(true);
         try {
           const res = await apiFetch("/api/extract-data", {
             method: "POST",
             headers: {
               "Content-Type": "application/json",
             },
             body: JSON.stringify({ file: base64, type: "raw_text" })
           });
           
           const textRes = await res.text();
           let data;
           try { data = JSON.parse(textRes); } catch(e) { throw new Error(\`Lỗi phản hồi từ máy chủ: \${textRes.substring(0, 50)}...\`); }
           
           if (!res.ok) throw new Error(data.error || "Không thể phân tích dữ liệu");
           
           if (data.text) {
             setCompetitionRules(data.text);
           }
         } catch (error: any) {
           alert("Lỗi: " + error.message);
         } finally {
           setIsExtracting(false);
           // Reset input
           e.target.value = '';
         }
       };
       reader.readAsDataURL(file);
    } else {
      alert("Vui lòng tải lên file ảnh, PDF hoặc Word.");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {`;

const target2 = `<Upload className="w-4 h-4" /> Tải lên File quy định (PDF/Word)
                <input type="file" className="hidden" />`;
const replacement2 = `<Upload className="w-4 h-4" /> Tải lên File quy định (PDF/Word)
                <input type="file" className="hidden" accept="image/*,.pdf,.doc,.docx" onChange={handleRuleFileUpload} />`;

let hasError = false;

if (code.includes(target1)) {
    code = code.replace(target1, replacement1);
} else {
    console.log("Target 1 not found");
    hasError = true;
}

if (code.includes(target2)) {
    code = code.replace(target2, replacement2);
} else {
    console.log("Target 2 not found");
    hasError = true;
}

if (!hasError) {
    fs.writeFileSync('/app/applet/src/pages/HomeroomManagement.tsx', code);
    console.log("Patched HomeroomManagement.tsx successfully");
}
