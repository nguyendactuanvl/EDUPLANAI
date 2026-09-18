const HTMLtoDOCX = require('html-to-docx');
const fs = require('fs');
async function test() {
    const htmlString = "<h1>Hello</h1><p>World</p>";
    const fileBuffer = await HTMLtoDOCX(htmlString, null, {
        table: { row: { cantSplit: true } },
        footer: true,
        pageNumber: true,
    });
    fs.writeFileSync('test.docx', fileBuffer);
    console.log('Saved test.docx');
}
test();
