const fixMath = (text) => {
  if (!text || text === 'undefined') return '';
  if (typeof text !== 'string') text = String(text);
  let t = text.trim();

  // 1. Unescape escaped dollar signs (\$)
  t = t.replace(/\\(\$)/g, '$1');

  // 2. Convert standard LaTeX bracket delimiters \(...\) to $...$ and \[...\] to $$...$$
  t = t.replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$');
  t = t.replace(/\\\[([\s\S]*?)\\\]/g, '$$$$$1$$$$');

  // 4. Auto-wrap math intervals or expressions that are missing $ delimiters
  if (!t.includes('$') && !t.includes('\\begin{')) {
    if (/\s+(?:và|hoặc)\s+/i.test(t)) {
      const parts = t.split(/(\s+(?:và|hoặc)\s+)/i);
      t = parts.map(p => {
        if (/^\s*(?:và|hoặc)\s*$/i.test(p)) return p;
        let sub = p.trim();
        if (/^[\[\(].+[\]\)]$/.test(sub) || /[\^_\\]/.test(sub) || /^[a-zA-Z0-9\+\-\*\/\=><\s,;]+$/.test(sub)) {
          return `$${sub}$`;
        }
        return p;
      }).join('');
    } else {
      if (/^[\[\(].+[\]\)]$/.test(t) || /[\^_\\]/.test(t) || /^[a-zA-Z]\s*[=><\le\ge]/.test(t)) {
        t = `$${t}$`;
      }
    }
  }

  if ((t.match(/\$/g) || []).length % 2 !== 0) {
    if (t.endsWith('$')) t = '$' + t;
    else if (t.startsWith('$')) t = t + '$';
  }

  return t;
};

console.log("1:", fixMath("(-\\infty; -1) và (0; 1)"));
console.log("2:", fixMath("(-1; 0) và (1; +\\infty)"));
console.log("3:", fixMath("(-1; 1)"));
console.log("4:", fixMath("Câu 1: A. \\$(-\\infty; -1)\\$ và \\$(0; 1)\\$"));
console.log("5:", fixMath("y = -x^4 + 2x^2 + 1"));
console.log("6:", fixMath("$y = -x^4 + 2x^2 + 1$"));
console.log("7:", fixMath("y = \\frac{2x+1}{x-1}"));
console.log("8:", fixMath("Đồng biến trên khoảng (0; 2)"));
