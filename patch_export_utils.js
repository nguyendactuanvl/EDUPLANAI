const fs = require('fs');
let code = fs.readFileSync('src/lib/exportUtils.ts', 'utf8');

code = code.replace(/const DOMURL = window\.URL \|\| window\.webkitURL \|\| window;/g, "const DOMURL = window.URL || window.webkitURL;");
code = code.replace(/if \(mathFormat === 'latex' \|\| mathFormat === true\)/g, "if (mathFormat === 'latex')");

fs.writeFileSync('src/lib/exportUtils.ts', code);
