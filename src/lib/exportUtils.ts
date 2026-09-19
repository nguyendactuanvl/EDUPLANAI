import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';
import katex from 'katex';
import { mml2omml } from 'mathml2omml-plus';

function convertLatexToOmml(tex: string, isDisplay: boolean = false): string {
    try {
        const mathmlHtml = katex.renderToString(tex, {
            displayMode: isDisplay,
            output: 'mathml',
            throwOnError: false
        });
        const match = mathmlHtml.match(/<math[\s\S]*?<\/math>/i);
        if (match) {
            return mml2omml(match[0]);
        }
    } catch (e) {
        console.warn('OMML conversion error for:', tex, e);
    }
    // Fallback if OMML conversion fails
    return isDisplay ? `<p align="center" style="margin: 6pt 0;"><b>$${tex}$</b></p>` : ` <b>$${tex}$</b> `;
}

async function svgToPngDataUrl(svgNode: SVGSVGElement): Promise<string> {
    try {
        const svgClone = svgNode.cloneNode(true) as SVGSVGElement;
        if (!svgClone.getAttribute('xmlns')) {
            svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        }
        const rect = svgNode.getBoundingClientRect();
        const width = Math.max(Math.round(rect.width), parseInt(svgNode.getAttribute('width') || '400', 10) || 400);
        const height = Math.max(Math.round(rect.height), parseInt(svgNode.getAttribute('height') || '300', 10) || 300);
        
        svgClone.setAttribute('width', String(width));
        svgClone.setAttribute('height', String(height));
        
        const svgHtml = new XMLSerializer().serializeToString(svgClone);
        const svgBlob = new Blob([svgHtml], { type: 'image/svg+xml;charset=utf-8' });
        const blobUrl = URL.createObjectURL(svgBlob);
        
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = (e) => reject(e);
            img.src = blobUrl;
        });
        
        const canvas = document.createElement('canvas');
        const scale = 2;
        canvas.width = width * scale;
        canvas.height = height * scale;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('No canvas context');
        
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(blobUrl);
        return canvas.toDataURL('image/png');
    } catch (err) {
        console.warn('Direct SVG to PNG failed, falling back to html2canvas:', err);
        const canvas = await html2canvas(svgNode.parentElement || (svgNode as any), {
            scale: 2,
            backgroundColor: '#ffffff',
            logging: false,
            useCORS: true
        });
        return canvas.toDataURL('image/png');
    }
}

export async function exportHtmlToWord(element: HTMLElement, filename: string, mathFormat: 'omml' | 'mathml' | 'latex' | 'image' | boolean = 'omml') {
    if (mathFormat === true) mathFormat = 'latex';
    if (mathFormat === false) mathFormat = 'omml';
    
    let loadingOverlay = document.getElementById('word-export-loading');
    if (!loadingOverlay) {
        loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'word-export-loading';
        loadingOverlay.style.position = 'fixed';
        loadingOverlay.style.top = '0';
        loadingOverlay.style.left = '0';
        loadingOverlay.style.width = '100vw';
        loadingOverlay.style.height = '100vh';
        loadingOverlay.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
        loadingOverlay.style.zIndex = '999999';
        loadingOverlay.style.display = 'flex';
        loadingOverlay.style.flexDirection = 'column';
        loadingOverlay.style.alignItems = 'center';
        loadingOverlay.style.justifyContent = 'center';
        loadingOverlay.innerHTML = `
            <div style="width: 50px; height: 50px; border: 4px solid #10b981; border-bottom-color: transparent; border-radius: 50%; display: inline-block; box-sizing: border-box; animation: rotation 1s linear infinite;"></div>
            <style>@keyframes rotation { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
            <h2 style="margin-top: 20px; color: #0f172a; font-family: sans-serif;">Đang xử lý xuất file Word...</h2>
            <p style="color: #64748b; font-family: sans-serif; margin-top: 8px;">Đang chuẩn bị nội dung và hình vẽ...</p>
        `;
        document.body.appendChild(loadingOverlay);
    } else {
        loadingOverlay.style.display = 'flex';
    }

    try {
        const clone = element.cloneNode(true) as HTMLElement;
        
        // 0. Unwrap markdown-body and child paragraphs so inline content does not break onto separate lines in Word
        const markdownBodies = Array.from(clone.querySelectorAll('.markdown-body'));
        markdownBodies.forEach(mb => {
            const paragraphs = Array.from(mb.querySelectorAll('p'));
            paragraphs.forEach(p => {
                const span = document.createElement('span');
                span.innerHTML = p.innerHTML;
                p.parentNode?.replaceChild(span, p);
            });
            // If inside table cell or preceded by a label (like Câu 1: or A.), unwrap container to span
            const parent = mb.parentElement;
            if (mb.classList.contains('inline-block') || parent?.tagName === 'TD' || mb.previousElementSibling?.tagName === 'STRONG' || mb.previousElementSibling?.tagName === 'B') {
                const span = document.createElement('span');
                span.innerHTML = mb.innerHTML;
                mb.parentNode?.replaceChild(span, mb);
            }
        });

        // 1. Handle TikZ SVG wrappers - convert to high-res PNG
        const origTikzWrappers = Array.from(element.querySelectorAll(".tikz-wrapper")) as HTMLElement[];
        const clonedTikzWrappers = Array.from(clone.querySelectorAll(".tikz-wrapper")) as HTMLElement[];
        
        for (let i = 0; i < origTikzWrappers.length; i++) {
            const orig = origTikzWrappers[i];
            const cloned = clonedTikzWrappers[i];
            if (!orig || !cloned) continue;
            
            const svgNode = orig.querySelector('svg');
            if (svgNode) {
                try {
                    const pngDataUrl = await svgToPngDataUrl(svgNode);
                    const img = document.createElement("img");
                    img.src = pngDataUrl;
                    img.className = "diagram";
                    img.style.maxWidth = "400px";
                    img.style.height = "auto";
                    img.style.display = "block";
                    img.style.margin = "12pt auto";
                    cloned.parentNode?.replaceChild(img, cloned);
                } catch (e) {
                    console.error("TikZ conversion error:", e);
                }
            }
        }

        // 2. Process Math Formulas based on mathFormat
        const ommlReplacements: Map<string, string> = new Map();
        let ommlCounter = 0;

        if (mathFormat === 'latex') {
            // Convert to $ ... $ for MathType (Toggle TeX)
            const katexElements = Array.from(clone.querySelectorAll(".katex"));
            for (const el of katexElements) {
                const annotationNode = el.querySelector("annotation[encoding='application/x-tex']");
                const texString = annotationNode ? annotationNode.textContent || "" : "";
                if (!texString) continue;
                
                const isBlock = el.parentElement?.classList.contains("katex-display") || el.classList.contains("katex-display");
                if (el.parentNode) {
                    const textNode = document.createTextNode(isBlock ? "$$\n" + texString + "\n$$" : " $" + texString + "$ ");
                    el.parentNode.replaceChild(textNode, el);
                }
            }
        } else if (mathFormat === 'omml') {
            // NATIVE WORD EQUATION (OMML): Preserves vectors \vec, fractions, square roots, etc.
            const katexElements = Array.from(clone.querySelectorAll(".katex-display, .katex")) as HTMLElement[];
            // Filter out nested katex elements so we only process top-level formulas
            const rootKatex = katexElements.filter(el => {
                const parentKatex = el.parentElement?.closest('.katex') || (el.classList.contains('katex') && el.parentElement?.closest('.katex-display'));
                return !parentKatex;
            });

            for (const el of rootKatex) {
                const annotationNode = el.querySelector("annotation[encoding='application/x-tex']");
                const texString = annotationNode ? annotationNode.textContent || "" : "";
                if (!texString) continue;

                const isBlock = el.classList.contains("katex-display") || el.parentElement?.classList.contains("katex-display");
                const ommlXml = convertLatexToOmml(texString, isBlock);

                // Use placeholder token so the browser DOM serializer does NOT lowercase XML tag names (<m:oMath>, <m:accPr>, <m:chr>)
                const token = `___OMML_MATH_TOKEN_${ommlCounter++}___`;
                ommlReplacements.set(token, ommlXml);

                const span = document.createElement(isBlock ? 'div' : 'span');
                if (isBlock) {
                    span.setAttribute('style', 'text-align: center; margin: 6pt 0;');
                }
                span.textContent = token;
                el.parentNode?.replaceChild(span, el);
            }
        } else if (mathFormat === 'image') {
            // Legacy/image fallback with html2canvas
            const allOrigKatex = Array.from(element.querySelectorAll(".katex-display, .katex")) as HTMLElement[];
            const allClonedKatex = Array.from(clone.querySelectorAll(".katex-display, .katex")) as HTMLElement[];
            
            const rootPairs: { orig: HTMLElement; cloned: HTMLElement; isBlock: boolean }[] = [];
            allOrigKatex.forEach((orig, idx) => {
                const cloned = allClonedKatex[idx];
                if (!orig || !cloned) return;
                const isNested = orig.parentElement?.closest('.katex') || (orig.classList.contains('katex') && orig.parentElement?.closest('.katex-display'));
                if (!isNested) {
                    const isBlock = orig.classList.contains("katex-display") || orig.parentElement?.classList.contains("katex-display") || false;
                    rootPairs.push({ orig, cloned, isBlock });
                }
            });
            
            const batchSize = 6;
            for (let i = 0; i < rootPairs.length; i += batchSize) {
                const batch = rootPairs.slice(i, i + batchSize);
                await Promise.all(batch.map(async ({ orig, cloned, isBlock }) => {
                    try {
                        const canvas = await html2canvas(orig, {
                            scale: 2.0,
                            logging: false,
                            useCORS: true,
                            backgroundColor: null
                        });
                        const dataUrl = canvas.toDataURL("image/png");
                        const img = document.createElement("img");
                        img.src = dataUrl;
                        img.className = "inline-math";
                        if (isBlock) {
                            img.style.display = "block";
                            img.style.margin = "8pt auto";
                        } else {
                            img.style.display = "inline-block";
                            img.style.verticalAlign = "middle";
                            img.style.margin = "0 2px";
                        }
                        cloned.parentNode?.replaceChild(img, cloned);
                    } catch (e) {
                        console.error("KaTeX rasterize error:", e);
                    }
                }));
            }
        }

        const grids = clone.querySelectorAll('.grid, [style*="display: grid"], .options, .answers-grid');
        grids.forEach(grid => {
            if (grid.children.length === 0 || grid.tagName === 'TABLE') return;
            
            let cols = 1;
            const className = grid.className || '';
            const style = grid.getAttribute('style') || '';
            
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
                td.setAttribute('style', "width: " + (100/cols) + "%; border: none; padding: 4pt; vertical-align: top;");
                td.innerHTML = child.innerHTML;
                if (tr) tr.appendChild(td);
            });
            
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
        });
        
        const flexOpts = clone.querySelectorAll('.flex.items-start.gap-1');
        flexOpts.forEach(flex => {
            if (flex.children.length >= 2 && flex.children[0].tagName === 'SPAN' && flex.children[1].classList.contains('markdown-body')) {
                const table = document.createElement('table');
                table.setAttribute('style', 'width: 100%; border: none; border-collapse: collapse; margin: 0; padding: 0;');
                const tr = document.createElement('tr');
                tr.setAttribute('style', 'border: none;');
                
                const td1 = document.createElement('td');
                td1.setAttribute('style', 'width: 25px; border: none; padding: 0; vertical-align: top; font-weight: bold;');
                td1.innerHTML = flex.children[0].innerHTML;
                
                const td2 = document.createElement('td');
                td2.setAttribute('style', 'border: none; padding: 0; vertical-align: top;');
                td2.innerHTML = flex.children[1].innerHTML;
                
                tr.appendChild(td1);
                tr.appendChild(td2);
                table.appendChild(tr);
                
                if (flex.parentNode) {
                    flex.parentNode.replaceChild(table, flex);
                }
            }
        });

        const standardImgs = Array.from(clone.querySelectorAll('img'));
        for (let i = 0; i < standardImgs.length; i++) {
            const img = standardImgs[i];
            if (img.src.startsWith('data:')) continue;
            
            try {
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");
                if (!ctx) continue;
                
                const originalImg = new Image();
                originalImg.crossOrigin = "Anonymous";
                
                const base64Data = await new Promise<string>((resolve, reject) => {
                    originalImg.onload = () => {
                        canvas.width = originalImg.naturalWidth || originalImg.width || 300;
                        canvas.height = originalImg.naturalHeight || originalImg.height || 150;
                        ctx.drawImage(originalImg, 0, 0);
                        resolve(canvas.toDataURL("image/png"));
                    };
                    originalImg.onerror = () => reject(new Error("Failed to load image"));
                    originalImg.src = img.src;
                });
                
                img.src = base64Data;
            } catch (e) {
                console.error("Image export error:", e);
            }
        }

        
        // Polish styling and borders
        const allTables = clone.querySelectorAll('table');
        allTables.forEach(t => {
            const style = t.getAttribute('style') || '';
            const className = t.className || '';
            const isBorderless = style.includes('border: none') || className.includes('borderless') || className.includes('options-table');
            if (isBorderless) {
                t.removeAttribute('border');
                t.style.borderCollapse = 'collapse';
                t.style.width = '100%';
                t.style.border = 'none';
                const cells = t.querySelectorAll('th, td');
                cells.forEach(c => {
                    const el = c as HTMLElement;
                    const cStyle = el.getAttribute('style') || '';
                    if (!cStyle.includes('border:') || cStyle.includes('border: none')) {
                        el.style.border = 'none';
                    }
                    el.style.padding = '2pt 4pt';
                });
            } else {
                t.setAttribute('border', '1');
                t.style.borderCollapse = 'collapse';
                t.style.width = '100%';
                t.style.marginBottom = '8pt';
                const cells = t.querySelectorAll('th, td');
                cells.forEach(c => {
                    (c as HTMLElement).style.border = '1px solid black';
                    (c as HTMLElement).style.padding = '4pt 6pt';
                });
            }
        });

        let contentHtml = clone.innerHTML;
        contentHtml = contentHtml.replace(/[\u200B-\u200D\uFEFF]/g, "");
        contentHtml = contentHtml.replace(/<\/strong>\s*<strong>/g, "</strong> <strong>");
        contentHtml = contentHtml.replace(/<\/em>\s*<em>/g, "</em> <em>");
        
        // Restore exact case-sensitive OMML XML
        if (ommlReplacements.size > 0) {
            ommlReplacements.forEach((ommlXml, token) => {
                contentHtml = contentHtml.replace(token, ommlXml);
            });
        }
        
        const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office'
xmlns:w='urn:schemas-microsoft-com:office:word'
xmlns:m='http://schemas.openxmlformats.org/officeDocument/2006/math'
xmlns:mml='http://www.w3.org/1998/Math/MathML'
xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<meta charset='utf-8'>
<title>Đề thi</title>
<!--[if gte mso 9]>
<xml>
<w:WordDocument>
<w:View>Print</w:View>
<w:Zoom>100</w:Zoom>
<w:DoNotOptimizeForBrowser/>
</w:WordDocument>
</xml>
<![endif]-->
<style>
@page Section1 {
    size: 8.27in 11.69in; /* A4 */
    margin: 0.79in 0.79in 0.79in 0.79in; /* 2cm */
    mso-header-margin: .5in;
    mso-footer-margin: .5in;
    mso-paper-source: 0;
}
div.Section1 { page: Section1; }
body {
    font-family: 'Times New Roman', Times, serif;
    font-size: 12pt;
    line-height: 1.25;
    color: #000000;
}
p {
    margin: 0 0 3.5pt 0;
    line-height: 1.25;
}
h1, h2, h3, h4 {
    font-family: 'Times New Roman', Times, serif;
    color: #000000;
    margin-top: 8pt;
    margin-bottom: 4pt;
}
table {
    border-collapse: collapse;
    width: 100%;
    margin: 4pt 0;
    font-family: 'Times New Roman', Times, serif;
    font-size: 12pt;
}
table[border="1"] th, table[border="1"] td {
    border: 1px solid #000000;
    padding: 4pt 6pt;
}
img.diagram {
    max-width: 420px;
    height: auto;
    display: block;
    margin: 10pt auto;
    text-align: center;
}
img.inline-math {
    display: inline-block;
    vertical-align: middle;
    margin: 0 1px;
}
.page-break {
    page-break-before: always;
}
.question-block {
    page-break-inside: avoid;
    margin-bottom: 6pt;
}
</style>
</head>
<body>
<div class="Section1">`;
        const footer = "</div></body></html>";
        const sourceHTML = header + contentHtml + footer;
        
        let exported = false;

        // If mathFormat is 'image', we can try server-side .docx
        if (mathFormat === 'image') {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 8000);
                
                const response = await fetch('/api/export-docx', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ html: contentHtml }),
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                
                if (response.ok) {
                    const docxBlob = await response.blob();
                    const finalFilename = filename.replace(/\.doc$/, '') + '.docx';
                    saveAs(docxBlob, finalFilename);
                    exported = true;
                }
            } catch (docxErr) {
                console.warn("DOCX server generation unavailable, falling back to Word .doc format:", docxErr);
            }
        }
        
        if (!exported) {
            // For OMML and LaTeX: Save directly as Word .doc (Office HTML with OMML namespaces)
            // Microsoft Word parses OMML into 100% native, editable Word Equations
            const docBlob = new Blob(['\ufeff' + sourceHTML], { type: 'application/msword;charset=utf-8' });
            const finalFilename = filename.endsWith('.doc') ? filename : filename.replace(/\.docx$/, '') + '.doc';
            saveAs(docBlob, finalFilename);
        }
    } catch (err) {
        console.error("Export failed:", err);
        alert("Có lỗi xảy ra khi xuất file Word. Vui lòng thử lại.");
    } finally {
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }
}
