import { GoogleGenAI } from "@google/genai";

async function test() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  try {
    const res = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: 'Hello'
    });
    console.log("Success:", res.text);
  } catch (e) {
    console.log("Status:", e.status);
    console.log("Message:", e.message);
  }
}
test();
