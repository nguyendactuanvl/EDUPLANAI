const fetch = require('node-fetch'); // we might need to use dynamic import if it's ESM, or just use native fetch if Node 18+

async function test() {
    const res = await fetch('http://localhost:3000/api/export-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: '<h1>Test</h1>' })
    });
    console.log(res.status);
}
test();
