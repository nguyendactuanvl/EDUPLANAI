const fs = require('fs');
let content = fs.readFileSync('api/index.ts', 'utf8');

// We need to carefully handle the catch block.
const oldCatch = `      } catch (e: any) {
        const errorMsg = e?.message || "";
        const status = e?.status;
        
        const lowerMsg = (e?.message || "").toLowerCase();
        if (
          lowerMsg.includes("429") || status === 429 || lowerMsg.includes("resource_exhausted") || lowerMsg.includes("quota") ||
          lowerMsg.includes("503") || status === 503 || lowerMsg.includes("unavailable") || lowerMsg.includes("overloaded")
        ) {
          if (!primaryError) primaryError = e;
          continue; 
        }
        if (errorMsg.includes("not found") || status === 404 || errorMsg.includes("is not found") || errorMsg.includes("not exist") || status === 400) {
          continue;
        }
        throw e; // Non-retryable
      }`;

const newCatch = `      } catch (e: any) {
        const errorMsg = e?.message || "";
        const status = e?.status;
        
        const lowerMsg = (e?.message || "").toLowerCase();
        
        // Immediately throw if it's an invalid API key to notify user
        if (lowerMsg.includes("api_key_invalid") || lowerMsg.includes("api key not valid")) {
          throw e;
        }
        
        if (
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
        }
        throw e; // Non-retryable
      }`;

if (content.includes(oldCatch)) {
  content = content.replace(oldCatch, newCatch);
} else {
  console.log("Could not find old catch block");
}

fs.writeFileSync('api/index.ts', content);
console.log("Updated fallback logic");
