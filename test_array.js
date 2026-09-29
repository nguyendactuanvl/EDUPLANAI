const t1 = `\\begin{array}{|c|c|c|c|}
x & 1 & 2 & 3 \\\\
f'(x) & + & 0 & - \\\\
f(x) & 1 & 2 & 3
\\end{array}`;

function fixBBT(t) {
    if (t.includes('\\begin{array}')) {
        // fix vertical lines
        t = t.replace(/\\begin\{array\}\{([^}]+)\}/g, (match, formatString) => {
            let cols = formatString.replace(/\|/g, ''); // remove all |
            if (cols.length > 0) {
               cols = cols.charAt(0) + '|' + cols.slice(1);
            }
            return `\\begin{array}{${cols}}`;
        });
        
        // fix horizontal lines
        let lines = t.split('\n');
        let newLines = [];
        for (let line of lines) {
            let isDerivativeRow = line.includes("f'(x)") || line.includes("y'");
            if (isDerivativeRow || (line.includes("f(x)") && !line.includes("f'(x)")) || line.includes("y ") || line.match(/^y\s*&/)) {
                 let prev = newLines[newLines.length - 1];
                 if (prev && prev.trim().endsWith('\\\\') && !prev.includes('\\hline')) {
                     newLines[newLines.length - 1] = prev.trim() + ' \\hline';
                 }
            }
            newLines.push(line);
        }
        t = newLines.join('\n');
    }
    return t;
}

console.log(fixBBT(t1));
