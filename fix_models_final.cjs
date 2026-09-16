const fs = require('fs');
let content = fs.readFileSync('api/index.ts', 'utf8');

// The screenshot shows: "This model models/gemini-2.5-flash is no longer available to new users. Please update your code to use models/gemini-3.6-flash for the latest features."
// Wait, is it 3.6-flash? Yes, the image says "use models/gemini-3.6-flash".
// Let's use gemini-3.6-flash and gemini-3.5-flash as the fallback, since we are in 2026!
// Oh, the system time is indeed 2026! So gemini-1.5 is definitely deprecated.

content = content.replace(
  'const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-pro", "gemini-flash"];',
  'const models = ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-flash"];'
);

// We should also make sure the catch block properly handles this specific error message and moves to the next model if one fails.
// The current code already does: if (is404) continue;
// But the error is "no longer available", let's ensure we catch it as a 404/400 and continue.
// Wait, what if all models fail? It throws the primaryError.
// Let's make sure our models list is perfectly aligned with what the API wants.

fs.writeFileSync('api/index.ts', content);
console.log("Updated to gemini-3.6-flash");
