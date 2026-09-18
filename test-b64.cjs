const HTMLtoDOCX = require('html-to-docx');
const fs = require('fs');

async function test() {
    // 1x1 transparent png
    const b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
    const html = `<p>Test image: <img src="data:image/png;base64,${b64}" /></p>`;
    
    try {
        const buffer = await HTMLtoDOCX(html, null, { orientation: 'portrait' });
        console.log("Success! buffer size:", buffer.length);
    } catch(e) {
        console.error("Error:", e);
    }
}
test();
