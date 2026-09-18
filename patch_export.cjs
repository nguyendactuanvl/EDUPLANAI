const fs = require('fs');
let code = fs.readFileSync('src/lib/exportUtils.ts', 'utf8');

const target = `    // Extract MathML from KaTeX for native Word Equation support`;

const replacement = `    // Extract TikZ Jax SVG and convert to Data URL so it renders in Word
    const svgWrappers = Array.from(clone.querySelectorAll('.tikz-wrapper svg'));
    
    // We must process SVGs by converting them to base64 images so MS Word can render them
    svgWrappers.forEach((svg) => {
        try {
            // Get original dimensions if present, else fallback
            let width = svg.getAttribute('width');
            let height = svg.getAttribute('height');
            
            // Add xml namespace if missing
            if (!svg.getAttribute('xmlns')) {
                svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            }
            
            // Serialize SVG
            const serializer = new XMLSerializer();
            let svgStr = serializer.serializeToString(svg);
            
            // Encode to base64
            const encodedData = window.btoa(unescape(encodeURIComponent(svgStr)));
            const src = 'data:image/svg+xml;base64,' + encodedData;
            
            // Note: MS Word sometimes struggles with raw SVG data URIs, 
            // but modern Word supports it. A safer bet is rasterizing to canvas if this fails, 
            // but doing it synchronously inside this function is tricky. 
            // SVG base64 is the best synchronous approach we can do right here.
            
            const img = document.createElement('img');
            img.src = src;
            if (width) img.style.width = width;
            if (height) img.style.height = height;
            
            // Replace the entire wrapper to avoid keeping the SVG DOM
            const wrapper = svg.closest('.tikz-wrapper') || svg.parentElement;
            if (wrapper && wrapper.parentNode) {
                wrapper.parentNode.replaceChild(img, wrapper);
            }
        } catch (e) {
            console.error("Error converting SVG for Word export", e);
        }
    });

    // Extract MathML from KaTeX for native Word Equation support`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('src/lib/exportUtils.ts', code);
    console.log("Patched SVG export successfully");
} else {
    console.log("Could not find target line in exportUtils.ts");
}
