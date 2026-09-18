function fixOptionMath(text) {
  if (!text) return '';
  let t = String(text).trim();
  t = t.replace(/^[A-D][\.\:\)]\s*/i, '');
  t = t.replace(/\\(\$)/g, '$1');
  t = t.replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$');
  t = t.replace(/\\\[([\s\S]*?)\\\]/g, '$$$$$1$$$$');

  if (!t.includes('$')) {
    // If it contains " và " or " hoặc "
    if (t.includes(' và ') || t.includes(' hoặc ')) {
      const parts = t.split(/(\s+(?:và|hoặc)\s+)/i);
      t = parts.map(p => {
        if (/^\s*(?:và|hoặc)\s*$/i.test(p)) return p;
        let sub = p.trim();
        // If sub is an interval like (-1; 0) or (-\infty; -1) or [0; 1) or formula
        if (/^[\[\(].+[\]\)]$/.test(sub) || /[\^_\\]/.test(sub) || /^[a-zA-Z0-9\+\-\*\/\=><\s,;]+$/.test(sub)) {
          return `$${sub}$`;
        }
        return p;
      }).join('');
    } else {
      // Single expression/interval or formula without $
      // E.g. (-1; 1) or [0; 2] or y = 3x - 1 or m > 2 or \frac{1}{2}
      if (/^[\[\(].+[\]\)]$/.test(t) || /[\^_\\]/.test(t) || /^[a-zA-Z]\s*[=><\le\ge]/.test(t)) {
        t = `$${t}$`;
      }
    }
  }

  return t;
}

console.log("Opt A:", fixOptionMath("(-\\infty; -1) và (0; 1)"));
console.log("Opt B:", fixOptionMath("(-1; 0) và (1; +\\infty)"));
console.log("Opt C:", fixOptionMath("(-1; 1)"));
console.log("Opt D:", fixOptionMath("(-\\infty; 0) và (1; +\\infty)"));
console.log("Formula:", fixOptionMath("y = 2x^2 + 1"));
console.log("Already has $:", fixOptionMath("$x > 0$ và $y < 1$"));
console.log("Escaped $:", fixOptionMath("\\$(-1; 1)\\$"));
