const fs = require('fs');
let code = fs.readFileSync('src/lib/exportUtils.ts', 'utf8');

code = code.replace(/const DOMURL = window\.URL \|\| window\.webkitURL;/g, "const DOMURL = window.URL || (window as any).webkitURL || window;");
code = code.replace(/DOMURL\.createObjectURL/g, "(DOMURL as any).createObjectURL");
code = code.replace(/DOMURL\.revokeObjectURL/g, "(DOMURL as any).revokeObjectURL");

// And ensure that mathFormat checking is correct without type errors
code = code.replace(/if \(mathFormat === 'latex'\)/g, "if ((mathFormat as any) === 'latex')");

fs.writeFileSync('src/lib/exportUtils.ts', code);
