const { GoogleGenAI, Type } = require("@google/genai");

async function test() {
  const key = process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({ apiKey: key });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { text: "hello, extract something" }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            students: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          }
        }
      }
    });
    console.log(response.text);
  } catch (e) {
    console.log("Error:", e.status, e.message);
  }
}
test();
