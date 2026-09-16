const fs = require('fs');
let code = fs.readFileSync('src/lib/utils.ts', 'utf8');

code = code.replace(
    "export const fixMath = (text: string) => {",
    "export const fixMath = (text: any) => {"
);

fs.writeFileSync('src/lib/utils.ts', code);
