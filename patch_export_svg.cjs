const fs = require('fs');

let code = fs.readFileSync('src/lib/exportUtils.ts', 'utf8');

const targetLoop = `        for (let i = 0; i < originalElements.length; i++) {
            const orig = originalElements[i] as HTMLElement;
            const cloned = clonedElements[i] as HTMLElement;
            
            if (!orig || !cloned || orig.offsetParent === null) continue;
            
            if (orig.classList.contains('katex') && orig.parentElement?.closest('.katex-display')) {
                continue;
            }
            
            try {
                const canvas = await html2canvas(orig, {
                    scale: 2,
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
        }`;

const newLoop = `        for (let i = 0; i < originalElements.length; i++) {
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
                        const base64Svg = "data:image/svg+xml;base64," + window.btoa(unescape(encodeURIComponent(svgHtml)));
                        
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
        }`;

code = code.replace(targetLoop, newLoop);
fs.writeFileSync('src/lib/exportUtils.ts', code);
console.log("Updated SVG/PNG handling logic");
