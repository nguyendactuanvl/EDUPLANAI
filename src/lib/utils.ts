import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const fixMath = (text: any) => {
    if (!text) return '';
    if (typeof text !== 'string') text = String(text);
    let t = text.trim();
    
    // Fix BBT missing hlines and vertical lines
    if (t.includes('\\begin{array}')) {
        // fix vertical lines: keep only one after first column (only if it's a BBT)
        if (t.includes("f'(x)") || t.includes("y'") || (t.includes("x") && (t.includes("f(x)") || t.includes(" y &")))) {
            t = t.replace(/\\begin\s*\{array\}\s*\{([^}]+)\}/g, (match, formatString) => {
                let cols = formatString.replace(/[^a-zA-Z]/g, ''); // keep only c, l, r
                if (cols.length > 0) {
                   cols = cols.charAt(0) + '|' + cols.slice(1);
                }
                return `\\begin{array}{${cols}}`;
            });
        }
        
        let lines = t.split('\\n');
        // fallback if it doesn't have \\n but actual newlines
        if (lines.length === 1) lines = t.split('\n');
        
        let newLines = [];
        for (let line of lines) {
            let isDerivativeRow = line.includes("f'(x)") || line.includes("y'");
            let isFunctionRow = (line.includes("f(x)") || line.match(/^y\s*&/) || line.includes(" y &")) && !line.includes("f'(x)");
            
            if (isDerivativeRow || isFunctionRow) {
                 let prevIdx = newLines.length - 1;
                 while (prevIdx >= 0 && newLines[prevIdx].trim() === '') prevIdx--;
                 if (prevIdx >= 0) {
                     let prev = newLines[prevIdx];
                     if (prev.includes('\\\\') && !prev.includes('\\hline')) {
                         newLines[prevIdx] = prev.replace(/\\\\(\s*)$/, '\\\\ \\hline$1');
                         if (newLines[prevIdx] === prev) {
                             newLines[prevIdx] = prev + ' \\hline';
                         }
                     } else if (!prev.includes('\\\\') && !prev.includes('\\hline') && !prev.includes('\\begin')) {
                         newLines[prevIdx] = prev + ' \\\\ \\hline';
                     }
                 }
            }
            newLines.push(line);
        }
        t = newLines.join('\n');
        t = t.replace(/\|\|/g, '\\parallel');
    }

    if ((t.match(/\$/g) || []).length % 2 !== 0) {
        if (t.endsWith('$')) t = '$' + t;
        else if (t.startsWith('$')) t = t + '$';
    }
    // Handle the case where no $ exists but there are math symbols typically used in sets/logic
    if (!t.includes('$') && (t.includes('\\cup') || t.includes('\\cap') || t.includes('\\infty') || t.includes('\\setminus') || t.includes('\\mathbb') || t.includes('\\in') || t.includes('\\subset'))) {
        t = '$' + t + '$';
    }
    return t;
};
