export async function exportHtmlToWord(element: HTMLElement, filename: string, mathFormat: 'omml' | 'mathml' | 'latex' | boolean = 'omml') {
    if (mathFormat === true) mathFormat = 'latex';
    if (mathFormat === false) mathFormat = 'omml';

    const clone = element.cloneNode(true) as HTMLElement;
    
    // Convert SVGs to PNG for MS Word compatibility
    const cloneSvgs = Array.from(clone.querySelectorAll('svg'));
    const realSvgs = Array.from(element.querySelectorAll('svg'));
    for (let i = 0; i < cloneSvgs.length; i++) {
        const svg = cloneSvgs[i];
        const realSvg = realSvgs[i];
        try {
            const rect = realSvg ? realSvg.getBoundingClientRect() : null;
            const w = svg.getAttribute('width') || (rect && rect.width > 0 ? rect.width : 300);
            const h = svg.getAttribute('height') || (rect && rect.height > 0 ? rect.height : 150);
            svg.setAttribute('width', w.toString());
            svg.setAttribute('height', h.toString());
            
            const svgData = new XMLSerializer().serializeToString(svg);
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            if (!ctx) continue;
            
            const img = new Image();
            img.crossOrigin = "Anonymous";
            
            const base64Data = await new Promise<string>((resolve, reject) => {
                const svgBlob = new Blob([svgData], {type: "image/svg+xml;charset=utf-8"});
                const DOMURL = window.URL || (window as any).webkitURL || window;
                const url = (DOMURL as any).createObjectURL(svgBlob);
                img.onload = () => {
                    canvas.width = img.width || parseInt(w.toString(), 10);
                    canvas.height = img.height || parseInt(h.toString(), 10);
                    ctx.fillStyle = "#ffffff";
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0);
                    (DOMURL as any).revokeObjectURL(url);
                    resolve(canvas.toDataURL("image/png"));
                };
                img.onerror = () => {
                    (DOMURL as any).revokeObjectURL(url);
                    reject(new Error("Failed to load SVG"));
                };
                img.src = url;
            }).catch(err => {
                return "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
            });
            
            const newImg = document.createElement('img');
            newImg.src = base64Data;
            newImg.style.maxWidth = '100%';
            newImg.style.height = 'auto';
            newImg.style.display = 'block';
            newImg.style.margin = '10px auto';
            
            const wrapper = svg.closest('.flex.justify-center') || svg.parentElement;
            if (wrapper && wrapper.tagName !== 'TD' && wrapper.tagName !== 'TR' && wrapper.parentNode) {
                wrapper.parentNode.replaceChild(newImg, wrapper);
            } else if (svg.parentNode) {
                svg.parentNode.replaceChild(newImg, svg);
            }
        } catch (e) {
            console.error("SVG export error:", e);
        }
    }
    
    // Transform grid into tables for MS Word
    const grids = clone.querySelectorAll('.grid, [style*="display: grid"], .options, .answers-grid');
    
    // Process regular images to Base64
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
            td.setAttribute('style', `width: ${100/cols}%; border: none; padding: 4pt; vertical-align: top;`);
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
    
    // Transform options flex containers to tables
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

    // Extract MathML from KaTeX for native Word Equation support
    const katexElements = Array.from(clone.querySelectorAll(".katex"));
    for (const el of katexElements) {
      const annotationNode = el.querySelector("annotation[encoding='application/x-tex']");
      const texString = annotationNode ? annotationNode.textContent || "" : "";
      
      if (!texString) continue;
      
      const isBlock = el.parentElement?.classList.contains("katex-display") || el.classList.contains("katex-display");
      
      if ((mathFormat as any) === 'latex') {
          if (el.parentNode) {
              const delimiter = isBlock ? "$$" : "$$"; 
              const textNode = document.createTextNode(isBlock ? `$$\n${texString}\n$$` : `$${texString}$`);
              el.parentNode.replaceChild(textNode, el);
          }
          continue;
      }
      
      const mathNode = el.querySelector(".katex-mathml math");
      if (mathNode && el.parentNode) {
        
        // Helper to clone and prefix MathML nodes with mml:
        function prefixNode(node: Node): Node {
            if (node.nodeType === 1) { // Element
                const element = node as Element;
                const tagName = element.tagName.toLowerCase();
                const newName = 'mml:' + tagName;
                const newNode = document.createElement(newName);
                
                // Copy attributes
                Array.from(element.attributes).forEach(attr => {
                    if (attr.name !== 'xmlns') {
                        newNode.setAttribute(attr.name, attr.value);
                    }
                });
                
                // Recursively process children
                Array.from(element.childNodes).forEach(child => {
                    newNode.appendChild(prefixNode(child));
                });
                return newNode;
            }
            return node.cloneNode(true); // Text nodes etc.
        }
        
        // Clean up semantics/annotation before prefixing
        const cleanMathNode = mathNode.cloneNode(true) as Element;
        const annotations = cleanMathNode.querySelectorAll("annotation");
        annotations.forEach(a => a.remove());
        const semantics = cleanMathNode.querySelector("semantics");
        if (semantics) {
           while (semantics.firstChild) {
               cleanMathNode.insertBefore(semantics.firstChild, semantics);
           }
           semantics.remove();
        }
        
        // Generate the mml: prefixed node
        const mmlNode = prefixNode(cleanMathNode) as Element;
        mmlNode.setAttribute("xmlns:mml", "http://www.w3.org/1998/Math/MathML");
        
        el.parentNode.replaceChild(mmlNode, el);
      }
    }

    let contentHtml = clone.innerHTML;
    
    // Global Document Sanitization Layer for DOCX Character Encoding & Spacing
    // 1. Strip problematic zero-width characters that break Word text flow
    contentHtml = contentHtml.replace(/[\u200B-\u200D\uFEFF]/g, "");
    // 2. Prevent text collisions between consecutive formatted elements
    contentHtml = contentHtml.replace(/<\/strong>\s*<strong>/g, "</strong> <strong>");
    contentHtml = contentHtml.replace(/<\/em>\s*<em>/g, "</em> <em>");
    
    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns:m='http://schemas.microsoft.com/office/2004/12/omml' xmlns:mml='http://www.w3.org/1998/Math/MathML' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Document</title><style>@page Section1 { size: 8.27in 11.69in; margin: 0.8in 0.8in 0.8in 0.8in; mso-header-margin: .5in; mso-footer-margin: .5in; mso-paper-source: 0; }div.Section1 { page: Section1; }body { font-family: 'Times New Roman', Times, serif; font-size: 13pt; line-height: 1.5; }table { border-collapse: collapse; width: 100%; margin: 10pt 0; }th, td { border: 1px solid black; padding: 6pt; }table[style*="border: none"] th, table[style*="border: none"] td { border: none !important; }img { max-width: 100%; height: auto; display: block; margin: 15pt auto; text-align: center; }h1 { font-size: 18pt; text-align: center; margin-bottom: 20px; font-weight: bold; }h2 { font-size: 16pt; margin-top: 15pt; margin-bottom: 5pt; font-weight: bold; }h3 { font-size: 14pt; margin-top: 15px; font-weight: bold; }p { margin: 0 0 6pt 0; }.katex-html { display: none; }.katex-mathml { display: inline; }math { }</style></head><body><div class="Section1">`;
    const footer = "</div></body></html>";
    const sourceHTML = header + contentHtml + footer;
    
    const blob = new Blob(['\ufeff', sourceHTML], { type: 'application/msword' });
    const source = URL.createObjectURL(blob);
    const fileDownload = document.createElement("a");
    document.body.appendChild(fileDownload);
    fileDownload.href = source;
    fileDownload.target = "_blank";
    fileDownload.download = filename.endsWith('.doc') ? filename : filename + '.doc';
    fileDownload.click();
    document.body.removeChild(fileDownload);
}
