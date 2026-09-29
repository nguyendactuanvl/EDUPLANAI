import { fixMath, cleanOptionText } from './src/lib/utils';

function normalizeInfinity(text: string): string {
  if (!text) return '';
  let s = text;
  
  // 1. Corrupted OCR / font ligatures: "in fty", "in  fty", "in\tfty"
  s = s.replace(/\bin\s+fty\b/gi, '\\infty');
  
  // 2. Corrupted with signs: "-in fty", "+in fty", "±in fty"
  s = s.replace(/([+\-±])\s*in\s*fty\b/gi, '$1\\infty');
  
  // 3. Any "infty" not preceded by backslash: e.g. "-infty", "+infty", "infty"
  s = s.replace(/(?<!\\)\binfty\b/g, '\\infty');
  
  // 4. Naked minus or plus before \infty with spaces: "- \infty" -> "-\infty", "+ \infty" -> "+\infty"
  s = s.replace(/([+\-±])\s+\\infty\b/g, '$1\\infty');
  
  // 5. Teachers writing "-oo" or "+oo" or "oo" in intervals: e.g. "(-oo; -1)", "(1; +oo)", "[-oo; +oo]"
  s = s.replace(/([\(\[\{;,]\s*)([+\-±]?)\s*oo\b/gi, '$1$2\\infty');
  s = s.replace(/\b([+\-±])\s*oo\b/gi, '$1\\infty');
  s = s.replace(/\\to\s*([+\-±]?)\s*oo\b/gi, '\\to $1\\infty');
  s = s.replace(/\b([+\-±]?)\s*oo(\s*[\)\]\};,])/gi, '$1\\infty$2');
  
  // 6. Fix intervals like "(- \infty; -1)" or "(-$\infty$; -1)" or "($-\infty$; -1)"
  s = s.replace(/\(\s*-\s*\\infty\s*;\s*([^\)]+?)\s*\)/g, '(-\\infty; $1)');
  s = s.replace(/\(\s*([^\(]+?)\s*;\s*\+\s*\\infty\s*\)/g, '($1; +\\infty)');
  s = s.replace(/\(\s*-\s*\$\\infty\$\s*;\s*([^\)]+?)\s*\)/g, '(-\\infty; $1)');
  s = s.replace(/\(\s*([^\(]+?)\s*;\s*\+\s*\$\\infty\$\s*\)/g, '($1; +\\infty)');

  return s;
}

const tests = [
  '(-in fty; -1)',
  '(-1; +in fty)',
  '(-infty; -1)',
  '(-1; +infty)',
  '(-\\infty; -1)',
  '(-1; +\\infty)',
  '(-oo; -1)',
  '(1; +oo)',
  '$(-in fty; -1)$',
  '$(-infty; -1)$',
  '(-$\\infty$; -1)'
];

for (const t of tests) {
  console.log(t, '===>', normalizeInfinity(t));
}

