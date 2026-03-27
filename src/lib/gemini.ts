import { GoogleGenAI } from "@google/genai";

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function generateContent(prompt: string, retries = 0): Promise<string> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text || "No response generated.";
  } catch (error: any) {
    console.error("Error generating content:", error);
    
    const isRateLimit = error?.status === 429 || 
                        error?.message?.includes('429') || 
                        error?.message?.includes('RESOURCE_EXHAUSTED');
                        
    if (isRateLimit && retries < MAX_RETRIES) {
      const delay = INITIAL_RETRY_DELAY * Math.pow(2, retries);
      console.log(`Rate limited. Retrying in ${delay}ms...`);
      await sleep(delay);
      return generateContent(prompt, retries + 1);
    }
    
    if (isRateLimit) {
      throw new Error("API rate limit exceeded. Please wait a moment and try again.");
    }
    
    throw new Error("Failed to generate content. Please try again.");
  }
}

export async function generateJsonContent(prompt: string, retries = 0): Promise<any> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });
    const text = response.text || "[]";
    let parsed = JSON.parse(text);
    
    // If the model returned an object with a single array property, extract it
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const values = Object.values(parsed);
      const arrayValue = values.find(val => Array.isArray(val));
      if (arrayValue) {
        parsed = arrayValue;
      }
    }
    
    return parsed;
  } catch (error: any) {
    console.error("Error generating JSON content:", error);
    
    const isRateLimit = error?.status === 429 || 
                        error?.message?.includes('429') || 
                        error?.message?.includes('RESOURCE_EXHAUSTED');
                        
    if (isRateLimit && retries < MAX_RETRIES) {
      const delay = INITIAL_RETRY_DELAY * Math.pow(2, retries);
      console.log(`Rate limited. Retrying in ${delay}ms...`);
      await sleep(delay);
      return generateJsonContent(prompt, retries + 1);
    }
    
    if (isRateLimit) {
      throw new Error("API rate limit exceeded. Please wait a moment and try again.");
    }
    
    throw new Error("Failed to generate content. Please try again.");
  }
}
