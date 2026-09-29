function autoFixMath(text) {
  if (!text) return '';
  let t = String(text).trim();
  // 1. Unescape escaped dollar signs
  t = t.replace(/\\(\$)/g, '$1');
  
  // 2. Convert \( ... \) and \[ ... \]
  t = t.replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$');
  t = t.replace(/\\\[([\s\S]*?)\\\]/g, '$$$$$1$$$$');

  // 3. If there are no $ at all, but it contains LaTeX commands or intervals with \infty or \frac
  // E.g. "(-\infty; -1) và (0; 1)"
  // or "(-1; 0) và (1; +\infty)"
  // or "y = 2x + 1"
  if (!t.includes('$')) {
    // If it contains backslash commands like \infty, \frac, \sqrt, etc.
    // Replace interval patterns like (-\infty; -1) or (+ \infty) with $(...)$
    t = t.replace(/(\([^\)]*\\(?:infty|frac|sqrt|pm|cdot)[^\)]*\))/g, '$$$1$$');
    t = t.replace(/(\[[^\]]*\\(?:infty|frac|sqrt|pm|cdot)[^\]]*\])/g, '$$$1$$');
    
    // Also if there are remaining standalone LaTeX commands not inside $
    // E.g. \infty, \pm, \sqrt{...}
    if (!t.includes('$') && /\\(?:infty|frac|sqrt|pm|cdot|alpha|beta|pi|times|div|le|ge|ne|in|subset|cap|cup)/.test(t)) {
      t = `$${t}$`;
    }
  }

  return t;
}

console.log("Test 1:", autoFixMath("(-\\infty; -1) và (0; 1)"));
console.log("Test 2:", autoFixMath("(-1; 0) và (1; +\\infty)"));
console.log("Test 3:", autoFixMath("\\$(-\\infty; -1)\\$ và \\$(0; 1)\\$"));
console.log("Test 4:", autoFixMath("A. \\$(-\\infty; -1)\\$"));
console.log("Test 5:", autoFixMath("\\frac{a}{b}"));
