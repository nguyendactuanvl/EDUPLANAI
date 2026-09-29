// @ts-ignore
import html2pdf from 'html2pdf.js';
// @ts-ignore
import renderMathInElement from 'katex/dist/contrib/auto-render.js';
import { preProcessMathContent } from './utils';

const colorCache = new Map<string, string>();

const getRgbaFromColor = (colorStr: string) => {
  if (colorCache.has(colorStr)) return colorCache.get(colorStr)!;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return colorStr;
    ctx.fillStyle = colorStr;
    ctx.fillRect(0, 0, 1, 1);
    const data = ctx.getImageData(0, 0, 1, 1).data;
    const rgba = `rgba(${data[0]}, ${data[1]}, ${data[2]}, ${data[3] / 255})`;
    colorCache.set(colorStr, rgba);
    return rgba;
  } catch (e) {
    return colorStr;
  }
};

/**
 * Đảm bảo toàn bộ công thức toán học (bao gồm hệ phương trình \begin{cases}, \begin{aligned}, \left[...\right.)
 * đã được biên dịch hoàn chỉnh bằng KaTeX/MathJax trước khi in hoặc xuất PDF
 */
export async function ensureMathRendered(element: HTMLElement): Promise<void> {
  if (!element) return;

  // 1. Tiền xử lý các node text chứa môi trường toán chưa bọc dấu $ hoặc $$
  const walkTextNodes = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      if (/(\\left\s*\[|\\begin\s*\{(?:aligned|cases|array|matrix)\*?\})/i.test(text)) {
        const parent = node.parentNode;
        if (parent && !['SCRIPT', 'STYLE', 'CODE', 'PRE'].includes(parent.nodeName)) {
          const safe = preProcessMathContent(text);
          if (safe !== text) {
            node.textContent = safe;
          }
        }
      }
      return;
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      if (el.classList.contains('katex') || el.classList.contains('omml-math-node')) return;
      Array.from(node.childNodes).forEach(walkTextNodes);
    }
  };
  walkTextNodes(element);

  // 2. Nếu có MathJax trên trang (global window.MathJax), gọi typesetPromise
  if (typeof (window as any).MathJax?.typesetPromise === 'function') {
    try {
      await (window as any).MathJax.typesetPromise([element]);
    } catch (e) {
      console.warn('MathJax typesetting error:', e);
    }
  }

  // 3. Render toàn bộ công thức toán còn lại bằng KaTeX auto-render
  try {
    if (typeof renderMathInElement === 'function') {
      renderMathInElement(element, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '\\[', right: '\\]', display: true },
          { left: '\\(', right: '\\)', display: false },
          { left: '$', right: '$', display: false },
        ],
        ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'],
        throwOnError: false,
        errorColor: 'inherit',
      });
    }
  } catch (e) {
    console.warn('KaTeX auto-render error:', e);
  }

  // Chờ một khoảng microtask ngắn để DOM và font KaTeX hoàn tất áp dụng
  await new Promise((resolve) => setTimeout(resolve, 60));
}

export const printElement = async (element: HTMLElement | null, title: string = "Tai_lieu") => {
  if (!element) return;
  
  const clone = element.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('.no-print, button, input, select, textarea').forEach(el => el.remove());
  
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  container.style.width = '800px';
  container.style.background = 'white';
  
  container.appendChild(clone);
  document.body.appendChild(container);

  // Đảm bảo KaTeX / MathJax đã render đầy đủ trên DOM trước khi in hoặc xuất PDF
  await ensureMathRendered(clone);

  const cleanOklch = (el: HTMLElement) => {
    if (el.nodeType !== Node.ELEMENT_NODE) return;
    
    const computed = window.getComputedStyle(el);
    const props = [
      'color', 'backgroundColor', 'borderColor', 
      'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor',
      'textDecorationColor', 'outlineColor', 'fill', 'stroke'
    ];
    
    props.forEach(prop => {
      const val = computed[prop as any];
      if (val && (val.includes('oklch') || val.includes('oklab') || val.includes('color('))) {
        el.style[prop as any] = getRgbaFromColor(val);
      }
    });

    Array.from(el.children).forEach(child => cleanOklch(child as HTMLElement));
  };

  try {
    cleanOklch(clone);
  } catch (e) {
    console.error("Error cleaning colors:", e);
  }
  
  const opt = {
    margin:       10,
    filename:     `${title}.pdf`,
    image:        { type: 'jpeg' as const, quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true, logging: false },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' as 'portrait' as 'portrait' }
  };
  
  html2pdf().set(opt).from(clone).save().then(() => {
    document.body.removeChild(container);
  }).catch((err: any) => {
    console.error("PDF generation failed:", err);
    document.body.removeChild(container);
  });
};

