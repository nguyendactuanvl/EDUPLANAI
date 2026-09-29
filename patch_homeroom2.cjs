const fs = require('fs');
let code = fs.readFileSync('/app/applet/src/pages/HomeroomManagement.tsx', 'utf8');

const target = `<Upload className="w-4 h-4" /> Tải lên File quy định (PDF/Word)
                <input type="file" className="hidden" accept="image/*,.pdf,.doc,.docx" onChange={handleRuleFileUpload} />`;
const replacement = `{isExtracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} {isExtracting ? 'Đang trích xuất AI...' : 'Tải lên File quy định (PDF/Word)'}
                <input type="file" className="hidden" accept="image/*,.pdf,.doc,.docx" onChange={handleRuleFileUpload} disabled={isExtracting} />`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('/app/applet/src/pages/HomeroomManagement.tsx', code);
    console.log("Patched 2 successfully");
} else {
    console.log("Target not found");
}
