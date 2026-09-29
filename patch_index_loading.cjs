const fs = require('fs');

let indexHtml = fs.readFileSync('index.html', 'utf8');

const loadingHtml = `
      <div id="initial-loader" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; width: 100vw; background-color: #f8fafc; font-family: system-ui, -apple-system, sans-serif;">
        <div style="width: 50px; height: 50px; border: 4px solid #e2e8f0; border-top: 4px solid #059669; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 20px;"></div>
        <h2 style="color: #1e293b; margin: 0 0 8px 0; font-size: 1.25rem; font-weight: 600;">Đang tải ứng dụng...</h2>
        <p style="color: #64748b; margin: 0; font-size: 0.875rem;">Vui lòng đợi trong giây lát</p>
        <style>
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          body { margin: 0; padding: 0; }
        </style>
      </div>
`;

indexHtml = indexHtml.replace('<div id="root"></div>', `<div id="root">${loadingHtml}</div>`);

fs.writeFileSync('index.html', indexHtml);
console.log("Patched index.html with loading spinner");
