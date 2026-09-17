const fs = require('fs');
let code = fs.readFileSync('api/index.ts', 'utf8');

// We will add a wrapper function
const wrapperCode = `
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

async function keepAliveExecute(req: any, res: any, fn: () => Promise<any>) {
  let headersSent = false;
  const keepAlive = setInterval(() => {
    if (!headersSent) {
      res.setHeader('Content-Type', 'application/json');
      res.status(200);
      headersSent = true;
    }
    res.write(' ');
  }, 15000);

  try {
    const result = await fn();
    clearInterval(keepAlive);
    if (!headersSent) {
      res.json(result);
    } else {
      res.write(JSON.stringify(result));
      res.end();
    }
  } catch (error: any) {
    clearInterval(keepAlive);
    if (!headersSent) {
      return handleAiError(error, req, res);
    } else {
      res.write(\`\n\n"SERVER_ERROR: \${error.message}"\`);
      res.end();
    }
  }
}
`;

// Insert the wrapper code before generateWithFallback
code = code.replace('const delay = (ms: number) => new Promise(res => setTimeout(res, ms));', wrapperCode);

// Let's replace the try-catch blocks in generate-worksheet, generate-lesson-plan, generate-plan, generate-exam, etc.

const endpoints = [
  'generate-worksheet',
  'pdf-to-word',
  'solve-exercise',
  'generate-exam',
  'generate-lesson-plan-file',
  'generate-lesson-plan',
  'generate-plan',
  'generate-similar',
  'generate-interactive-worksheet'
];

for (const ep of endpoints) {
  const regex = new RegExp(`app\\.all\\("/api/${ep}", async \\(req, res\\) => \\{[\\s\\S]*?if \\(req\\.method !== 'POST'\\) \\{[\\s\\S]*?\\}\\s+try \\{([\\s\\S]*?)\\} catch \\(error: any\\) \\{[\\s\\S]*?\\}\\s*\\}\\);`);
  
  code = code.replace(regex, (match, p1) => {
    // p1 is the body of the try block
    let newBody = p1;
    // Replace res.json(...) with return ...
    newBody = newBody.replace(/res\.json\((.*?)\);/g, 'return $1;');
    
    return match.replace(/try \{[\s\S]*?\} catch \(error: any\) \{[\s\S]*?\}/, `return keepAliveExecute(req, res, async () => {\n${newBody}\n    });`);
  });
}

fs.writeFileSync('api/index.ts', code);
console.log('done');
