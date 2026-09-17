const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const dom = new JSDOM(`<!DOCTYPE html><html><head><script src="https://tikzjax.com/v1/tikzjax.js"></script></head><body></body></html>`, { runScripts: "dangerously", resources: "usable" });

dom.window.addEventListener('load', () => {
    // tikzjax is loaded.
    setTimeout(async () => {
        // Add dynamic script
        const s = dom.window.document.createElement('script');
        s.type = 'text/tikz';
        s.textContent = '\\begin{tikzpicture}\\draw (0,0) -- (1,1);\\end{tikzpicture}';
        dom.window.document.body.appendChild(s);
        
        console.log("Before: ", dom.window.document.body.innerHTML);
        
        if (typeof dom.window.onload === 'function') {
            await dom.window.onload();
        } else {
            console.log("No onload");
        }
        
        console.log("After: ", dom.window.document.body.innerHTML);
    }, 1000);
});
