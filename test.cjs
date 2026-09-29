const fs = require('fs');
const content = fs.readFileSync('src/lib/exportUtils.ts', 'utf8');
if (content.includes('tikz-wrapper') || content.includes('svg-wrapper') || content.includes('data-tikz') || content.includes('tikzjax-instance')) {
    console.log("Supports tikz wrapper extraction for export!");
} else {
    console.log("No specific support for tikz SVGs in export.");
}
