import { GoogleGenAI, Type } from "@google/genai";

const getAI = () => {
  const key = process.env.API_KEY;
  if (!key) {
    console.warn("API Key not found. Mocking responses.");
    return null;
  }
  return new GoogleGenAI({ apiKey: key });
};

export const validateWordsWithGemini = async (words: string[]): Promise<{ valid: boolean; invalidWords: string[] }> => {
  const ai = getAI();
  if (!ai) {
    // Fallback for development without key
    return { valid: true, invalidWords: [] };
  }

  // Simple list check is better for 2.5-flash
  const prompt = `You are a Scrabble referee. Check if the following words are valid English Scrabble words (using official scrabble dictionary rules).
  
  Words to check: ${JSON.stringify(words)}
  
  Return a JSON object with two properties:
  1. "valid": boolean (true if ALL words are valid)
  2. "invalidWords": array of strings (list the invalid words found, if any)
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            valid: { type: Type.BOOLEAN },
            invalidWords: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING } 
            }
          }
        }
      }
    });
    
    if (response.text) {
      return JSON.parse(response.text);
    }
    return { valid: false, invalidWords: ["Error parsing response"] };

  } catch (e) {
    console.error("Gemini Validation Error:", e);
    // Fail open or closed? Let's fail closed for safety but warn user.
    return { valid: false, invalidWords: ["API Error"] };
  }
};
