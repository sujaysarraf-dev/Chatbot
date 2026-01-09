
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Role, QuizData } from "../types";

// Fallback to OpenRouter when Gemini fails
const fallbackToOpenRouter = async (message: string, history: any[]) => {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  if (!openRouterKey) {
    return {
      text: "I encountered a technical hiccup. Please try again!",
      suggestions: ["Try again"],
      sources: []
    };
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openRouterKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": window.location.origin,
        "X-Title": "Suji Learning AI"
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3.2-3b-instruct",
        messages: [
          { 
            role: "system", 
            content: "You are Suji, a simple-learning tutor. Use bullet points (-), ALL CAPS for key terms, and **bold** for emphasis. Keep it energetic!" 
          },
          ...history.slice(-10).map((m: any) => ({ 
            role: m.role === Role.USER ? "user" : "assistant", 
            content: typeof m.text === 'string' ? m.text : JSON.stringify(m.text)
          })),
          { role: "user", content: message }
        ]
      })
    });

    const data = await response.json();
    
    if (data.error) {
      // If it's a data policy error, provide helpful message
      if (data.error.message?.includes('data policy') || data.error.message?.includes('privacy')) {
        throw new Error("OpenRouter data policy not configured. Please visit https://openrouter.ai/settings/privacy to enable free model usage.");
      }
      throw new Error(data.error.message || "OpenRouter Error");
    }
    
    const content = data.choices?.[0]?.message?.content;
    const text = content || "I'm sorry, I couldn't get a response right now.";

    return {
      text,
      suggestions: ["Explain more", "Give example", "Test my knowledge!"],
      sources: []
    };
  } catch (e: any) {
    console.error("OpenRouter fallback also failed:", e);
    const errorMsg = e?.message || "Unknown error";
    return {
      text: errorMsg.includes('data policy') 
        ? "OpenRouter needs privacy settings configured. Please visit https://openrouter.ai/settings/privacy and enable 'Free model publication'."
        : "I encountered a technical hiccup. Please try again!",
      suggestions: ["Try again"],
      sources: []
    };
  }
};

const decodeBase64 = (base64: string) => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

const decodeAudioData = async (
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> => {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
};

export const sendMessageToGemini = async (
  message: string, 
  history: any[],
  imageData?: string
) => {
  // ============================================
  // GEMINI TEMPORARILY DISABLED - UNCOMMENT BELOW TO RE-ENABLE
  // ============================================
  
  // Skip Gemini and use OpenRouter directly
  console.log("Gemini disabled - using OpenRouter fallback");
  return fallbackToOpenRouter(message, history);

  /* UNCOMMENT BELOW TO RE-ENABLE GEMINI:
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('Gemini API key is missing! Check .env.local file.');
    console.error('process.env.API_KEY:', process.env.API_KEY);
    console.error('process.env.GEMINI_API_KEY:', process.env.GEMINI_API_KEY);
    return {
      text: "API key not configured. Please check your .env.local file and restart the dev server.",
      suggestions: ["Check configuration"],
      sources: []
    };
  }
  console.log('Using Gemini API key (first 10 chars):', apiKey.substring(0, 10) + '...');
  const ai = new GoogleGenAI({ apiKey });
  const parts: any[] = [];
  
  if (imageData) {
    parts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: imageData.includes(',') ? imageData.split(',')[1] : imageData
      }
    });
  }

  parts.push({ text: message.trim() || "Explain this clearly and simply." });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts },
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: "You are Suji, a simple-learning tutor. MISSION: Explain topics simply. Use bullet points (-) for steps. Put ALL KEY TERMS in CAPITAL LETTERS. Use **bold** for emphasis. Keep it energetic!",
      },
    });

    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
      title: chunk.web?.title || "Source",
      uri: chunk.web?.uri || ""
    })).filter((s: any) => s.uri) || [];

    return {
      text: response.text || "I'm sorry, I couldn't generate an explanation right now.",
      suggestions: ["Give an example", "Imagine this", "Test my knowledge!"],
      sources
    };
  } catch (e) {
    console.error("Gemini call failed, falling back to OpenRouter:", e);
    // Fallback to OpenRouter if Gemini fails
    return fallbackToOpenRouter(message, history);
  }
  */
};

export const generateImage = async (prompt: string): Promise<string | null> => {
  // ============================================
  // GEMINI IMAGE GENERATION TEMPORARILY DISABLED - UNCOMMENT BELOW TO RE-ENABLE
  // ============================================
  
  const imagePrompt = `A vibrant, educational illustration of: ${prompt}. Clean style, white background.`;
  
  // Skip Gemini and go straight to Hugging Face fallback
  console.log("Gemini image generation disabled - using Hugging Face fallback");

  /* UNCOMMENT BELOW TO RE-ENABLE GEMINI IMAGE GENERATION:
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  
  // Try Gemini first if API key is available
  if (apiKey) {
    const ai = new GoogleGenAI({ apiKey });
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: imagePrompt }] },
        config: {
          imageConfig: { aspectRatio: "1:1" }
        },
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    } catch (e: any) {
      // Silently log for debugging, but don't show raw error to user
      if (e?.error?.code === 429 || e?.error?.status === 'RESOURCE_EXHAUSTED') {
        console.log("Gemini rate limit reached, trying fallback");
      } else {
        console.log("Gemini image generation failed, trying fallback");
      }
      // Fall through to fallback
    }
  }
  */

  // Fallback: Try Hugging Face Inference API via Netlify serverless function (bypasses CORS)
  const hfApiKey = process.env.HUGGINGFACE_API_KEY;
  console.log("Hugging Face API key available:", !!hfApiKey, hfApiKey ? `${hfApiKey.substring(0, 10)}...` : "not set");
  if (hfApiKey) {
    try {
      console.log("Trying Hugging Face for image generation");
      
      // Check if we're in local development (not production)
      const isLocalDev = typeof window !== 'undefined' && 
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      
      if (isLocalDev) {
        console.log("Local dev detected - Netlify functions not available. Image generation works in production on Netlify.");
        return null; // Skip in local dev, will work in production
      }
      
      // Use Netlify serverless function to proxy the request (solves CORS issue)
      // This only works in production on Netlify
      const proxyUrl = "/.netlify/functions/hf-image-proxy";
      
      console.log("Calling Netlify function:", proxyUrl);
      
      let response;
      try {
        response = await fetch(proxyUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ 
            prompt: imagePrompt,
            apiKey: hfApiKey 
          }),
        });
      } catch (fetchError: any) {
        // Handle network errors
        console.log("Netlify function not available:", fetchError.message);
        return null;
      }

      console.log("Netlify function response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("Response data keys:", Object.keys(data));
        if (data.image) {
          return data.image; // Already in base64 format
        } else {
          console.error("No image in response:", data);
        }
      } else if (response.status === 503) {
        // Model is loading, wait and retry once
        console.log("Hugging Face model loading, waiting...");
        await new Promise(resolve => setTimeout(resolve, 5000));
        const retryResponse = await fetch(proxyUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ 
            prompt: imagePrompt,
            apiKey: hfApiKey 
          }),
        });
        if (retryResponse.ok) {
          const retryData = await retryResponse.json();
          if (retryData.image) {
            return retryData.image;
          }
        }
      } else {
        const errorText = await response.text().catch(() => "Failed to read error");
        console.error("Hugging Face API error:", response.status, errorText);
        try {
          const errorData = JSON.parse(errorText);
          console.error("Error details:", errorData);
        } catch {
          console.error("Raw error:", errorText);
        }
      }
    } catch (e) {
      console.log("Hugging Face fallback failed:", e);
    }
  } else {
    console.log("Hugging Face API key not configured");
  }
  
  return null;
};

export const textToSpeech = async (text: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Say cheerfully: ${text.substring(0, 500)}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const audioBuffer = await decodeAudioData(decodeBase64(base64Audio), audioCtx, 24000, 1);
      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);
      source.start();
      return true;
    }
  } catch (e) {
    console.error("TTS failed:", e);
  }
  return false;
};

export const generateQuiz = async (topic: string): Promise<QuizData | null> => {
  // Use OpenRouter for quiz generation since Gemini is disabled
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  if (!openRouterKey) {
    console.error("OpenRouter API key not configured for quiz generation");
    return null;
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openRouterKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": window.location.origin,
        "X-Title": "Suji Learning AI"
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3.2-3b-instruct",
        messages: [
          {
            role: "system",
            content: "You are a quiz generator. Create fun, educational quizzes. Always respond with valid JSON only, no other text."
          },
          {
            role: "user",
            content: `Create a fun, educational 3-question MCQ quiz for a student about: "${topic}". 

Return ONLY valid JSON in this exact format:
{
  "title": "Quiz Title",
  "questions": [
    {
      "question": "Question text",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "correctAnswerIndex": 0,
      "explanation": "Short explanation"
    }
  ]
}`
          }
        ],
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json();
    
    if (data.error) {
      console.error("OpenRouter quiz generation error:", data.error);
      return null;
    }
    
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;
    
    try {
      const quizData = JSON.parse(content);
      // Validate quiz structure
      if (quizData.title && quizData.questions && Array.isArray(quizData.questions)) {
        return quizData as QuizData;
      }
    } catch (parseError) {
      console.error("Failed to parse quiz JSON:", parseError, content);
    }
  } catch (e) {
    console.error("Quiz generation failed:", e);
  }
  
  return null;
};
