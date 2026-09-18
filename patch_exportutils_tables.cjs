const fs = require('fs');
let code = fs.readFileSync('src/lib/exportUtils.ts', 'utf8');

const tableStylingLogic = `
        // Add borders to regular markdown tables
        const allTables = clone.querySelectorAll('table');
        allTables.forEach(t => {
            if (!t.getAttribute('style') || !t.getAttribute('style')?.includes('border: none')) {
                t.setAttribute('border', '1');
                t.style.borderCollapse = 'collapse';
                t.style.width = '100%';
                t.style.marginBottom = '10pt';
                
                const cells = t.querySelectorAll('th, td');
                cells.forEach(c => {
                    (c as HTMLElement).style.border = '1px solid black';
                    (c as HTMLElement).style.padding = '6pt';
                });
            }
        });
`;

if (!code.includes('const allTables = clone.querySelectorAll')) {
    code = code.replace('let contentHtml = clone.innerHTML;', tableStylingLogic + '\n        let contentHtml = clone.innerHTML;');
    fs.writeFileSync('src/lib/exportUtils.ts', code);
    console.log('Patched exportUtils.ts for tables');
}
