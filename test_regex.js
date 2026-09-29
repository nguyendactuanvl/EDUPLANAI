const t1 = `\\begin{array}{|c|c|}\nx & 1 \\\\\nf'(x) & 2 \\\\\nf(x) & 3\n\\end{array}`;
const t2 = `\\begin{array}{|c|c|}\nx & 1 \\\\ \\hline\nf'(x) & 2 \\\\ \\hline\nf(x) & 3\n\\end{array}`;

function fixBBT(t) {
    if (t.includes('\\begin{array}') && (t.includes("f'(x)") || t.includes("y'"))) {
        t = t.replace(/\\\\(\s*)(f'\\s*\\(\\s*x\\s*\\)|y')/g, (match, p1, p2) => {
            return `\\\\ \\hline\n${p2}`;
        });
        t = t.replace(/\\\\(\s*)(f\\s*\\(\\s*x\\s*\\)|y)(\\s*&)/g, (match, p1, p2, p3) => {
            return `\\\\ \\hline\n${p2}${p3}`;
        });
    }
    return t;
}

console.log("t1:", fixBBT(t1));
console.log("t2:", fixBBT(t2));
