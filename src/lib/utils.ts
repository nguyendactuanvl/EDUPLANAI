import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const fixMath = (text: any) => {
    if (!text) return '';
    if (typeof text !== 'string') text = String(text);
    let t = text.trim();
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
