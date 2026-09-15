const { GoogleGenAI } = require("@google/genai");

async function test() {
  const key = process.env.GEMINI_API_KEY;
  if(!key) return console.log("no key");
  const ai = new GoogleGenAI({ apiKey: key });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Hello"
    });
    console.log("Success 2.5 flash");
  } catch(e) {}
  
  try {
    const models = await ai.models.list();
    for (const m of models) {
        console.log(m.name);
    }
  } catch (e) {
    console.log("Error status:", e.status);
    console.log("Error message:", e.message);
  }
}
test();
