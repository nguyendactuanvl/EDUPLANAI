import fs from 'fs';
let code = fs.readFileSync('src/lib/exportUtils.ts', 'utf8');
const search = "const clone = element.cloneNode(true) as HTMLElement;";
const replace = `const clone = element.cloneNode(true) as HTMLElement;
    
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
                const DOMURL = window.URL || window.webkitURL || window;
                const url = DOMURL.createObjectURL(svgBlob);
                img.onload = () => {
                    canvas.width = img.width || parseInt(w.toString(), 10);
                    canvas.height = img.height || parseInt(h.toString(), 10);
                    ctx.fillStyle = "#ffffff";
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0);
                    DOMURL.revokeObjectURL(url);
                    resolve(canvas.toDataURL("image/png"));
                };
                img.onerror = () => {
                    DOMURL.revokeObjectURL(url);
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
    }`;
if (!code.includes("Convert SVGs to PNG for MS Word compatibility")) {
    fs.writeFileSync('src/lib/exportUtils.ts', code.replace(search, replace));
    console.log("Patched exportUtils.ts");
} else {
    console.log("Already patched");
}
