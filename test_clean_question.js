function cleanQuestionStem(content, options) {
  if (!content) return '';
  let text = String(content).trim();
  
  // If the question has separate options array
  if (options && options.length >= 2) {
    // 1. Remove HTML grid of options if present
    text = text.replace(/<div\s+class=["']grid[\s\S]*?<\/div>\s*<\/div>/gi, '');
    text = text.replace(/<div\s+class=["']grid[\s\S]*?<\/div>/gi, '');
    
    // 2. Remove "Câu 1: A. ... B. ... C. ... D. ..." or "A. ... B. ... C. ... D. ..." at the end
    // Match lines starting with "Câu \d*:?\s*A\." or just "A\."
    text = text.replace(/(?:\r?\n|\s)*(?:Câu\s*\d*[:\.]?\s*)?A[\.:\)]\s+[\s\S]*$/i, '');
    
    // 3. Remove trailing "Câu X:" if left
    text = text.replace(/(?:\r?\n|\s)*Câu\s*\d*[:\.]?\s*$/i, '');
  }
  
  return text.trim();
}

const sample1 = `Tìm tất cả các khoảng đồng biến của hàm số trùng phương $y = -x^4 + 2x^2 + 1$.\nCâu 1: A. $(-\\infty; -1)$ và $(0; 1)$   B. $(-1; 0)$ và $(1; +\\infty)$   C. $(-1; 1)$   D. $(-\\infty; 0)$ và $(1; +\\infty)$`;
const opts = ["A", "B", "C", "D"];

console.log("Cleaned sample 1:\n", cleanQuestionStem(sample1, opts));

const sample2 = `Cho hàm số $y=f(x)$ liên tục trên $\\mathbb{R}$.\nA. $x > 0$\nB. $x < 0$\nC. $x = 0$\nD. $x \\ne 0$`;
console.log("Cleaned sample 2:\n", cleanQuestionStem(sample2, opts));
