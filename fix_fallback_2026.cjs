const fs = require('fs');
let content = fs.readFileSync('api/index.ts', 'utf8');

const oldCatch = `        const is404 = lowerMsg.includes("not found") || status === 404 || lowerMsg.includes("is not found") || lowerMsg.includes("not exist") || status === 400;`;
const newCatch = `        const is404 = lowerMsg.includes("not found") || status === 404 || lowerMsg.includes("is not found") || lowerMsg.includes("not exist") || lowerMsg.includes("no longer available") || status === 400;`;

if (content.includes(oldCatch)) {
  content = content.replace(oldCatch, newCatch);
}

fs.writeFileSync('api/index.ts', content);
console.log("Updated error parsing");
