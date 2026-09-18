const fs = require('fs');
let code = fs.readFileSync('api/index.ts', 'utf8');

// Target the exact line
code = code.replace(/- Dùng thư viện \\\\\\\\usetikzlibrary/g, '- Dùng thư viện \\\\usetikzlibrary');
code = code.replace(/- Dùng thư viện \\\\\\usetikzlibrary/g, '- Dùng thư viện \\\\usetikzlibrary');
code = code.replace(/- Dùng thư viện \\\\usetikzlibrary/g, '- Dùng thư viện \\\\usetikzlibrary');

// Check if it's currently \usetikzlibrary and replace with \\usetikzlibrary
if (code.includes('- Dùng thư viện \\usetikzlibrary')) {
    code = code.replace(/- Dùng thư viện \\usetikzlibrary/g, '- Dùng thư viện \\\\usetikzlibrary');
}
fs.writeFileSync('api/index.ts', code);
