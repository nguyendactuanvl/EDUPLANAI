import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';

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
            <p style="color: #64748b; font-family: sans-serif; margin-top: 8px;">Đang rasterize công thức và hình vẽ (có thể mất vài giây)</p>
        `;
        document.body.appendChild(loadingOverlay);
    } else {
        loadingOverlay.style.display = 'flex';
    }

    try {
        const clone = element.cloneNode(true) as HTMLElement;
        
        const complexSelectors = mathFormat === 'latex' ? ['.tikz-wrapper'] : ['.tikz-wrapper', '.katex-display', '.katex'];
        
        if (mathFormat === 'latex') {
            const katexElements = Array.from(clone.querySelectorAll(".katex"));
            for (const el of katexElements) {
                const annotationNode = el.querySelector("annotation[encoding='application/x-tex']");
                const texString = annotationNode ? annotationNode.textContent || "" : "";
                if (!texString) continue;
                
                const isBlock = el.parentElement?.classList.contains("katex-display") || el.classList.contains("katex-display");
                if (el.parentNode) {
                    const textNode = document.createTextNode(isBlock ? "$$\n" + texString + "\n$$" : "$" + texString + "$");
                    el.parentNode.replaceChild(textNode, el);
                }
            }
        }
        
        const originalElements = Array.from(element.querySelectorAll(complexSelectors.join(', ')));
        const clonedElements = Array.from(clone.querySelectorAll(complexSelectors.join(', ')));
        
        for (let i = 0; i < originalElements.length; i++) {
            const orig = originalElements[i] as HTMLElement;
            const cloned = clonedElements[i] as HTMLElement;
            
            if (!orig || !cloned || orig.offsetParent === null) continue;
            
            if (orig.classList.contains('katex') && orig.parentElement?.closest('.katex-display')) {
                continue;
            }
            
            try {
                // For TikZ wrappers, extracting the pure SVG natively is much sharper for MS Word
                if (orig.classList.contains("tikz-wrapper")) {
                    const svgNode = orig.querySelector('svg');
                    if (svgNode) {
                        const svgClone = svgNode.cloneNode(true) as SVGSVGElement;
                        if (!svgClone.getAttribute('xmlns')) {
                            svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
                        }
                        const svgHtml = svgClone.outerHTML;
                        const base64Svg = "data:image/svg;base64," + window.btoa(unescape(encodeURIComponent(svgHtml)));
                        
                        const img = document.createElement("img");
                        img.src = base64Svg;
                        img.style.maxWidth = "100%";
                        img.style.height = "auto";
                        img.style.display = "block";
                        img.style.margin = "15px auto";
                        
                        cloned.parentNode?.replaceChild(img, cloned);
                        continue; // Skip html2canvas for this element
                    }
                }
                
                // Fallback to html2canvas for KaTeX or if SVG extraction fails
                const canvas = await html2canvas(orig, {
                    scale: 3, // Increased scale for sharper KaTeX equations
                    logging: false,
                    useCORS: true,
                    backgroundColor: null
                });
                
                const dataUrl = canvas.toDataURL("image/png");
                const img = document.createElement("img");
                img.src = dataUrl;
                img.style.maxWidth = "100%";
                img.style.height = "auto";
                
                if (orig.classList.contains("katex-display") || orig.classList.contains("tikz-wrapper")) {
                    img.style.display = "block";
                    img.style.margin = "10px auto";
                } else {
                    img.style.display = "inline-block";
                    img.style.verticalAlign = "middle";
                    img.style.margin = "0 2px";
                }
                
                cloned.parentNode?.replaceChild(img, cloned);
            } catch (e) {
                console.error("html2canvas error on element:", orig, e);
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

        let contentHtml = clone.innerHTML;
        
        contentHtml = contentHtml.replace(/[\u200B-\u200D\uFEFF]/g, "");
        contentHtml = contentHtml.replace(/<\/strong>\s*<strong>/g, "</strong> <strong>");
        contentHtml = contentHtml.replace(/<\/em>\s*<em>/g, "</em> <em>");
        
        const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns:m='http://schemas.microsoft.com/office/2004/12/omml' xmlns:mml='http://www.w3.org/1998/Math/MathML' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Document</title><style>@page Section1 { size: 8.27in 11.69in; margin: 0.8in 0.8in 0.8in 0.8in; mso-header-margin: .5in; mso-footer-margin: .5in; mso-paper-source: 0; }div.Section1 { page: Section1; }body { font-family: 'Times New Roman', Times, serif; font-size: 13pt; line-height: 1.5; }table { border-collapse: collapse; width: 100%; margin: 10pt 0; }th, td { border: 1px solid black; padding: 6pt; }table[style*="border: none"] th, table[style*="border: none"] td { border: none !important; }img { max-width: 100%; height: auto; display: block; margin: 15pt auto; text-align: center; }h1 { font-size: 18pt; text-align: center; margin-bottom: 20px; font-weight: bold; }h2 { font-size: 16pt; margin-top: 15pt; margin-bottom: 5pt; font-weight: bold; }h3 { font-size: 14pt; margin-top: 15px; font-weight: bold; }p { margin: 0 0 6pt 0; }.katex-html { display: none; }.katex-mathml { display: inline; }math { }</style></head><body><div class="Section1">`;
        const footer = "</div></body></html>";
        const sourceHTML = header + contentHtml + footer;
        
        // Use the backend to generate a real native .docx file
        const response = await fetch('/api/export-docx', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ html: contentHtml })
        });
        
        if (!response.ok) {
            throw new Error('Failed to generate DOCX from server');
        }
        
        const docxBlob = await response.blob();
        const finalFilename = filename.replace(/\.doc$/, '') + '.docx';
        saveAs(docxBlob, finalFilename);
    } catch (err) {
        console.error("Export failed:", err);
        alert("Có lỗi xảy ra khi xuất file Word.");
    } finally {
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }
}
