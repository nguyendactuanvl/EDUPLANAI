const fs = require('fs');
let code = fs.readFileSync('src/components/TikzRenderer.tsx', 'utf8');

code = code.replace(/if \(typeof \(window as any\)\.process_tikz !== "function"\) {/g, 
`let processFn = (window as any).process_tikz || (window as any).onload;
      if (typeof processFn !== "function") {`);

code = code.replace(/\(window as any\)\.process_tikz\(script\);/g, 
`try {
              if (typeof (window as any).process_tikz === "function") {
                  (window as any).process_tikz(script);
              } else if (typeof (window as any).onload === "function") {
                  (window as any).onload();
              }
          } catch (e) {
              console.error(e);
          }`);

fs.writeFileSync('src/components/TikzRenderer.tsx', code);
console.log('done');
