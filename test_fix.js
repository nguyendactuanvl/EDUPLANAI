const fixMath = (text) => {
    if (!text) return '';
    let t = text.trim();
    if ((t.match(/\$/g) || []).length % 2 !== 0) {
        if (t.endsWith('$')) t = '$' + t;
        else if (t.startsWith('$')) t = t + '$';
    }
    return t;
};
console.log(fixMath("C_{\\mathbb{R}}A = (-\\infty; -2) \\cup [3; +\\infty)$"));
console.log(fixMath("$C_{\\mathbb{R}}A = (-\\infty; -2) \\cup [3; +\\infty)"));
