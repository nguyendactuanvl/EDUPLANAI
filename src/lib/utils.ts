import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const fixMath = (text: any) => {
    if (!text) return '';
    if (typeof text !== 'string') text = String(text);
    let t = text.trim();
    
    // Fix BBT missing hlines
    if (t.includes('\\begin{array}')) {
        let lines = t.split('\\n');
        // fallback if it doesn't have \n but actual newlines
        if (lines.length === 1) lines = t.split('\n');
        
        let newLines = [];
        for (let line of lines) {
            let isDerivativeRow = line.includes("f'(x)") || line.includes("y'");
            if (isDerivativeRow || (line.includes("f(x)") && !line.includes("f'(x)"))) {
                 let prev = newLines[newLines.length - 1];
                 if (prev && prev.trim().endsWith('\\\\') && !prev.includes('\\hline')) {
                     newLines[newLines.length - 1] = prev.trim() + ' \\hline';
                 }
            }
            newLines.push(line);
        }
        t = newLines.join('\n');
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
