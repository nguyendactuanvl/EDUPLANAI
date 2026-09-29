const { GoogleGenAI } = require("@google/genai");

async function test() {
  const key = process.env.GEMINI_API_KEY; // or try some mock
  const ai = new GoogleGenAI({ apiKey: key });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: "hello"
    });
    console.log(response.text);
  } catch (e) {
    console.log("Error:", e.status, e.message);
  }
}
test();
