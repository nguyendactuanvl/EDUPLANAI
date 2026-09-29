const { GoogleGenAI } = require("@google/genai");

async function test() {
  const ai = new GoogleGenAI({ apiKey: "AIzaSyFakeKeyThisIsDefinitelyNotValid123" });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: "hello"
    });
    console.log(response.text);
  } catch (e) {
    console.log("Error status:", e.status);
    console.log("Error message:", e.message);
    console.log("Error stack:", e.stack);
  }
}
test();
