const fs = require('fs');

let code = fs.readFileSync('src/lib/exportUtils.ts', 'utf8');

const gridLogicOld = `const grids = clone.querySelectorAll('.grid-cols-1.sm\\\\:grid-cols-2, .grid');
    grids.forEach(grid => {
        if (grid.children.length === 0) return;
        const children = Array.from(grid.children);
        const table = document.createElement('table');
        table.setAttribute('style', 'width: 100%; border: none; margin-bottom: 10pt; table-layout: fixed;');
        
        let tr: HTMLTableRowElement | null = null;
        children.forEach((child, index) => {
            if (index % 2 === 0) {
                tr = document.createElement('tr');
                tr.setAttribute('style', 'border: none;');
                table.appendChild(tr);
            }
            const td = document.createElement('td');
            td.setAttribute('style', 'width: 50%; border: none; padding: 4pt; vertical-align: top;');
            td.innerHTML = child.innerHTML;
            if (tr) tr.appendChild(td);
        });
        
        if (grid.parentNode) {
            grid.parentNode.replaceChild(table, grid);
        }
    });`;

const gridLogicNew = `const grids = clone.querySelectorAll('.grid, [style*="display: grid"], .options, .answers-grid');
    grids.forEach(grid => {
        if (grid.children.length === 0 || grid.tagName === 'TABLE') return;
        
        let cols = 1;
        const className = grid.className || '';
        const style = grid.getAttribute('style') || '';
        
        // Detect columns from Tailwind classes or inline styles
        if (className.includes('grid-cols-2') || className.includes('sm:grid-cols-2') || className.includes('md:grid-cols-2') || style.includes('1fr 1fr') || className.includes('options')) {
            cols = 2;
        } else if (className.includes('grid-cols-3') || className.includes('md:grid-cols-3')) {
            cols = 3;
        } else if (className.includes('grid-cols-4') || className.includes('md:grid-cols-4') || className.includes('lg:grid-cols-4')) {
            cols = 4;
        } else if (className.includes('grid-cols-5') || style.includes('repeat(5')) {
            cols = 5;
        } else if (className.includes('grid-cols-12')) {
            cols = 12;
        }
        
        // If we can't reliably determine columns, and it's not a known class, leave it as div
        // (Word will stack divs vertically, which is often safe)
        
        const children = Array.from(grid.children);
        const table = document.createElement('table');
        table.setAttribute('style', 'width: 100%; border: none; margin-bottom: 10pt; table-layout: fixed; border-collapse: collapse;');
        
        let tr: HTMLTableRowElement | null = null;
        children.forEach((child, index) => {
            if (index % cols === 0) {
                tr = document.createElement('tr');
                tr.setAttribute('style', 'border: none;');
                table.appendChild(tr);
            }
            const td = document.createElement('td');
            td.setAttribute('style', \`width: \${100/cols}%; border: none; padding: 4pt; vertical-align: top;\`);
            td.innerHTML = child.innerHTML;
            if (tr) tr.appendChild(td);
        });
        
        // Fill remaining empty cells in the last row
        if (tr && children.length % cols !== 0) {
            const remaining = cols - (children.length % cols);
            for (let i = 0; i < remaining; i++) {
                const td = document.createElement('td');
                td.setAttribute('style', 'border: none; padding: 4pt;');
                tr.appendChild(td);
            }
        }
        
        if (grid.parentNode) {
            grid.parentNode.replaceChild(table, grid);
        }
    });`;

if (code.includes(gridLogicOld.substring(0, 50))) {
    // We need to do a regex or indexOf replace
    const start = code.indexOf("const grids = clone.querySelectorAll('.grid-cols-1.sm\\\\:grid-cols-2, .grid');");
    const endStr = "grid.parentNode.replaceChild(table, grid);\n        }\n    });";
    const end = code.indexOf(endStr) + endStr.length;
    
    if (start !== -1 && end !== -1) {
        code = code.substring(0, start) + gridLogicNew + code.substring(end);
        fs.writeFileSync('src/lib/exportUtils.ts', code);
        console.log("Replaced grid logic");
    } else {
        console.log("Could not find end string");
    }
} else {
    console.log("Could not find grid logic");
}
