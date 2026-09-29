const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const dom = new JSDOM(`<!DOCTYPE html><html><head></head><body><script src="https://tikzjax.com/v1/tikzjax.js"></script></body></html>`, { runScripts: "dangerously", resources: "usable" });
dom.window.addEventListener('load', () => {
    console.log("type of process_tikz:", typeof dom.window.process_tikz);
});
