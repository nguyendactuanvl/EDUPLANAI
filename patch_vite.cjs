const fs = require('fs');
let config = fs.readFileSync('vite.config.ts', 'utf8');

// Add define block if it doesn't exist
if (!config.includes('define:')) {
    config = config.replace(/server: {/, `define: {\n      'process.versions.node': 'false',\n    },\n    server: {`);
    fs.writeFileSync('vite.config.ts', config);
    console.log("Patched vite.config.ts");
}
