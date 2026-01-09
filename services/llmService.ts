
import { GoogleGenAI, Type } from "@google/genai";
import { Role, Message } from "../types";

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || "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";
const FREE_MODEL = "meta-llama/llama-3.2-3b-instruct";

/**
 * Ensures the input is always a string.
 * This prevents [object Object] from being rendered if the LLM returns structured data unexpectedly.
 */
const ensureString = (val: any): string => {
  if (typeof val === 'string') return val;
  if (val === null || val === undefined) return "";
  try {
    return JSON.stringify(val);
  } catch {
    return String(val);
  }
};

export const callLLM = async (
  prompt: string,
  history: Message[],
  imageData?: string
) => {
  // ROUTING LOGIC: 
  // 1. If image is present -> Gemini
  // 2. If prompt mentions complex tasks -> Gemini
  // 3. Otherwise -> OpenRouter (Free)
  const isComplex = /quiz|test|draw|visualize|complex|analyze|diagram|research|deep/i.test(prompt);
  
  if (imageData || isComplex) {
    return callGemini(prompt, history, imageData);
  } else {
    return callOpenRouter(prompt, history);
  }
};

const callOpenRouter = async (prompt: string, history: Message[]) => {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": window.location.origin,
        "X-Title": "Suji Learning AI"
      },
      body: JSON.stringify({
        model: FREE_MODEL,
        messages: [
          { 
            role: "system", 
            content: "You are Suji, a simple-learning tutor. Use bullet points (-), ALL CAPS for key terms, and **bold** for emphasis. Keep it energetic!" 
          },
          ...history.slice(-10).map(m => ({ 
            role: m.role === Role.USER ? "user" : "assistant", 
            content: ensureString(m.text) 
          })),
          { role: "user", content: prompt }
        ]
      })
    });

    const data = await response.json();
    
    if (data.error) throw new Error(data.error.message || "OpenRouter Error");
    
    const content = data.choices?.[0]?.message?.content;
    const text = ensureString(content || "I'm sorry, I couldn't get a response right now.");

    return {
      text,
      suggestions: ["Explain more", "Give example", "Test my knowledge!"],
      sources: []
    };
  } catch (e) {
    console.error("OpenRouter failed, falling back to Gemini", e);
    return callGemini(prompt, history);
  }
};

const callGemini = async (prompt: string, history: Message[], imageData?: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const parts: any[] = [];
  
  if (imageData) {
    parts.push({ 
      inlineData: { 
        mimeType: "image/jpeg", 
        data: imageData.includes(',') ? imageData.split(',')[1] : imageData 
      } 
    });
  }
  parts.push({ text: prompt.trim() || "Explain this clearly." });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts },
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: "You are Suji. Explain things simply. Use bullet points (-), ALL CAPS for key terms, and **bold** for emphasis.",
      },
    });

    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
      title: chunk.web?.title || "Source",
      uri: chunk.web?.uri || ""
    })).filter((s: any) => s.uri) || [];

    return {
      text: ensureString(response.text || "I couldn't generate a response."),
      suggestions: ["How does this work?", "Practical example", "Test my knowledge!"],
      sources
    };
  } catch (e) {
    console.error("Gemini failed", e);
    return {
      text: "I encountered a technical hiccup. Please try again!",
      suggestions: ["Try again"],
      sources: []
    };
  }
};
