export async function exportHtmlToWord(element: HTMLElement, filename: string, mathFormat: 'omml' | 'mathml' | 'latex' | boolean = 'omml') {
    if (mathFormat === true) mathFormat = 'latex';
    if (mathFormat === false) mathFormat = 'omml';

    const clone = element.cloneNode(true) as HTMLElement;
    
    // Transform grid into tables for MS Word
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
      
      if (mathFormat === 'latex' || mathFormat === true) {
          if (el.parentNode) {
              const delimiter = isBlock ? "$$" : "$$"; 
              const textNode = document.createTextNode(isBlock ? `$$\n${texString}\n$$` : `$${texString}$`);
              el.parentNode.replaceChild(textNode, el);
          }
          continue;
      }
      
      const mathNode = el.querySelector(".katex-mathml math");
      if (mathNode && el.parentNode) {
        const mathClone = mathNode.cloneNode(true) as Element;
        // IMPORTANT: Add MathML namespace for MS Word
        mathClone.setAttribute("xmlns", "http://www.w3.org/1998/Math/MathML");
        
        // Remove annotation tags completely
        const annotations = mathClone.querySelectorAll("annotation");
        annotations.forEach(a => a.remove());
        
        // Remove semantics tag but keep its children to avoid Word confusion
        const semantics = mathClone.querySelector("semantics");
        if (semantics) {
           while (semantics.firstChild) {
               mathClone.insertBefore(semantics.firstChild, semantics);
           }
           semantics.remove();
        }
        
        // Convert MathML exponents and subscripts to standard HTML for MS Word
        // MS Word ignores MathML in .doc HTML format, but respects standard HTML tags
        const msups = mathClone.querySelectorAll("msup");
        msups.forEach(msup => {
            if (msup.children.length >= 2) {
                const base = msup.children[0];
                const exp = msup.children[1];
                const htmlSup = document.createElement("sup");
                htmlSup.innerHTML = exp.innerHTML;
                
                const fragment = document.createDocumentFragment();
                fragment.appendChild(base.cloneNode(true));
                fragment.appendChild(htmlSup);
                
                if (msup.parentNode) msup.parentNode.replaceChild(fragment, msup);
            }
        });
        
        const msubs = mathClone.querySelectorAll("msub");
        msubs.forEach(msub => {
            if (msub.children.length >= 2) {
                const base = msub.children[0];
                const sub = msub.children[1];
                const htmlSub = document.createElement("sub");
                htmlSub.innerHTML = sub.innerHTML;
                
                const fragment = document.createDocumentFragment();
                fragment.appendChild(base.cloneNode(true));
                fragment.appendChild(htmlSub);
                
                if (msub.parentNode) msub.parentNode.replaceChild(fragment, msub);
            }
        });
        
        const msubsups = mathClone.querySelectorAll("msubsup");
        msubsups.forEach(msubsup => {
            if (msubsup.children.length >= 3) {
                const base = msubsup.children[0];
                const sub = msubsup.children[1];
                const exp = msubsup.children[2];
                const htmlSub = document.createElement("sub");
                htmlSub.innerHTML = sub.innerHTML;
                const htmlSup = document.createElement("sup");
                htmlSup.innerHTML = exp.innerHTML;
                
                const fragment = document.createDocumentFragment();
                fragment.appendChild(base.cloneNode(true));
                fragment.appendChild(htmlSub);
                fragment.appendChild(htmlSup);
                
                if (msubsup.parentNode) msubsup.parentNode.replaceChild(fragment, msubsup);
            }
        });

        el.parentNode.replaceChild(mathClone, el);
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
