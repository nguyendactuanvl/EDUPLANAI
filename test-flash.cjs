const { GoogleGenAI } = require("@google/genai");

async function test() {
  const key = process.env.GEMINI_API_KEY;
  if(!key) return console.log("no key");
  const ai = new GoogleGenAI({ apiKey: key });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: "hello"
    });
    console.log("Success:", response.text);
  } catch (e) {
    console.log("Error status:", e.status);
    console.log("Error message:", e.message);
  }
}
test();
