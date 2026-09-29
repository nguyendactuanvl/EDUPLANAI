const fs = require('fs');
const file = 'src/components/TikzRenderer.tsx';
let code = fs.readFileSync(file, 'utf8');

// Replace the endless polling with a timeout
code = code.replace(
  /if \(typeof \(window as any\)\.process_tikz !== "function"\) \{\s*timeoutId = setTimeout\(renderTikz, 100\); \/\/ Poll every 100ms\s*return;\s*\}/,
  `if (typeof (window as any).process_tikz !== "function") {
        if (!isMounted) return;
        const timeElapsed = Date.now() - startTime;
        if (timeElapsed > 10000) {
            setIsLoading(false);
            setError("Không thể tải thư viện vẽ hình TikZ. Máy chủ TikzJax có thể đang phản hồi chậm hoặc bị chặn.");
            return;
        }
        timeoutId = setTimeout(renderTikz, 200); // Poll every 200ms
        return;
      }`
);

// We need to add startTime
code = code.replace(
  /let isMounted = true;/,
  `let isMounted = true;\n    const startTime = Date.now();`
);

fs.writeFileSync(file, code);
console.log("Updated TikzRenderer");
