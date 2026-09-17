const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const dom = new JSDOM(`<!DOCTYPE html><html><head><script src="https://tikzjax.com/v1/tikzjax.js"></script></head><body></body></html>`, { runScripts: "dangerously", resources: "usable" });

dom.window.addEventListener('load', () => {
    setTimeout(async () => {
        const s = dom.window.document.createElement('script');
        s.type = 'text/tikz';
        s.textContent = '\\begin{tikzpicture}\\draw (0,0) -- (1,1);\\end{tikzpicture}';
        dom.window.document.body.appendChild(s);
        
        console.log("Onload is function?", typeof dom.window.onload);
        // It's not a true test if we don't mock fetch.
    }, 1000);
});
