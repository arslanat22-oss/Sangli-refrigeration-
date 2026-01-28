
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeProductImage = async (base64Image: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          parts: [
            { inlineData: { data: base64Image, mimeType: 'image/jpeg' } },
            { text: "Identify this refrigeration or washing machine spare part. Provide the probable Part Type and Brand. Respond in JSON format." }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            partType: { type: Type.STRING },
            brand: { type: Type.STRING },
            confidence: { type: Type.NUMBER }
          },
          required: ["partType", "brand"]
        }
      }
    });
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini Image Analysis Error:", error);
    return null;
  }
};

export const interpretVoiceSearch = async (query: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `The user said: "${query}". This is a spare parts shop (AC, Fridge, WM). 
      Extract the Machine Type, Brand, and Part from this query. 
      Query might be in Hinglish (e.g. "LG Fridge ka relay"). 
      Respond in JSON format.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            machineType: { type: Type.STRING },
            brand: { type: Type.STRING },
            part: { type: Type.STRING }
          }
        }
      }
    });
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini Voice Interpretation Error:", error);
    return null;
  }
};
