const fs = require('fs');
let content = fs.readFileSync('api/index.ts', 'utf8');

content = content.replace(
  'const models = ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-1.5-flash-8b"];',
  'const models = ["gemini-1.5-flash", "gemini-1.5-flash-8b", "gemini-1.5-pro"];'
);

// We should also make sure that 429 errors take priority as primaryError over 404/400 errors.
// Because if flash gives 429, and then 8b gives 429, and then pro gives 404, we want to bubble up the 429!
const oldCatch = `        if (
          lowerMsg.includes("429") || status === 429 || lowerMsg.includes("resource_exhausted") || lowerMsg.includes("quota") ||
          lowerMsg.includes("503") || status === 503 || lowerMsg.includes("unavailable") || lowerMsg.includes("overloaded")
        ) {
          if (!primaryError) primaryError = e;
          continue; 
        }
        if (lowerMsg.includes("not found") || status === 404 || lowerMsg.includes("is not found") || lowerMsg.includes("not exist") || status === 400) {
          // It's likely a model availability issue or a bad request for this specific model, so we can try the next model.
          if (!primaryError) primaryError = e;
          continue;
        }`;

const newCatch = `        const is429 = lowerMsg.includes("429") || status === 429 || lowerMsg.includes("resource_exhausted") || lowerMsg.includes("quota") || lowerMsg.includes("503") || status === 503 || lowerMsg.includes("unavailable") || lowerMsg.includes("overloaded");
        const is404 = lowerMsg.includes("not found") || status === 404 || lowerMsg.includes("is not found") || lowerMsg.includes("not exist") || status === 400;
        
        if (is429) {
          // Always overwrite primary error with 429, as it's the most actionable rate-limit error.
          primaryError = e;
          continue; 
        }
        if (is404) {
          // Only set primary error to 404 if we don't already have one (like a 429).
          if (!primaryError) primaryError = e;
          continue;
        }`;

if (content.includes(oldCatch)) {
  content = content.replace(oldCatch, newCatch);
}

fs.writeFileSync('api/index.ts', content);
console.log("Updated model order and error priority");
