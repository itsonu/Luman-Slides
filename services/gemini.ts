import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Slide, SlideLayout, MediaType } from "../types";

// Helper to initialize Gemini Client
const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment variables.");
  }
  return new GoogleGenAI({ apiKey });
};

export const generatePresentationStructure = async (topic: string, rawText: string): Promise<Slide[]> => {
  const ai = getAiClient();
  
  const prompt = `
    You are a world-class presentation designer. 
    Create a professional presentation structure based on the user's topic and raw notes.
    
    Topic: ${topic}
    Raw Context: ${rawText}

    Requirements:
    1. Create between 5 to 8 slides.
    2. The first slide must be a 'title' layout.
    3. The last slide must be a 'conclusion' layout.
    4. Use varied layouts (split-left, split-right, image-heavy, data) for the middle slides to keep it engaging.
    5. 'content' should be an array of bullet points (keep them punchy and short).
    6. 'imagePrompt' should be a HIGHLY detailed, artistic, and photorealistic description suitable for an AI image generator (Imagen 3/4). Describe lighting, style, mood, and subject clearly. Do NOT include text in the image description.
    7. Ensure the flow is logical.
  `;

  const slideSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      layout: { type: Type.STRING, enum: Object.values(SlideLayout) },
      title: { type: Type.STRING },
      subtitle: { type: Type.STRING },
      content: { type: Type.ARRAY, items: { type: Type.STRING } },
      imagePrompt: { type: Type.STRING },
      notes: { type: Type.STRING, description: "Speaker notes for this slide" }
    },
    required: ["layout", "title", "content", "imagePrompt"]
  };

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: slideSchema
      }
    }
  });

  const rawSlides = JSON.parse(response.text || "[]");
  
  // Hydrate with IDs and defaults
  return rawSlides.map((s: any, index: number) => ({
    ...s,
    id: `slide-${Date.now()}-${index}`,
    mediaType: MediaType.None,
    isLoadingMedia: false
  }));
};

export const refineImagePrompt = async (originalPrompt: string, slideTitle: string): Promise<string> => {
  const ai = getAiClient();
  
  // If prompt is already quite detailed (long), skip refinement to save time/tokens, 
  // unless it's very generic despite length (hard to detect easily without AI).
  if (originalPrompt.length > 150) {
      return originalPrompt;
  }

  const prompt = `
    You are a presentation design assistant.
    The user needs a background image for a slide titled: "${slideTitle}".
    The current image prompt is: "${originalPrompt}".
    
    Rewrite this prompt to be more specific, visual, and high-quality for an AI image generator (Imagen). 
    Focus on lighting, composition, and mood. 
    Do not add any text overlay instructions. 
    Keep it under 60 words.
    
    Output ONLY the new prompt.
  `;

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
    });
    return response.text?.trim() || originalPrompt;
  } catch (error) {
    console.error("Prompt refinement failed:", error);
    return originalPrompt;
  }
};

export const generateSlideImage = async (prompt: string): Promise<string | null> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: prompt + " , photorealistic, cinematic lighting, 8k, high quality, professional photography, no text, no words",
      config: {
        numberOfImages: 1,
        aspectRatio: '16:9',
        outputMimeType: 'image/jpeg'
      }
    });

    const base64 = response.generatedImages?.[0]?.image?.imageBytes;
    if (base64) {
      return `data:image/jpeg;base64,${base64}`;
    }
    return null;
  } catch (error) {
    console.error("Image generation failed:", error);
    return null;
  }
};

export const generateSlideVideo = async (prompt: string): Promise<string | null> => {
  const ai = getAiClient();
  try {
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt + ", cinematic, smooth motion, high quality, 4k",
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '16:9'
      }
    });

    // Polling for completion
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Check every 5s
      operation = await ai.operations.getVideosOperation({ operation });
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (videoUri) {
        const apiKey = process.env.API_KEY;
        const fetchUrl = `${videoUri}&key=${apiKey}`;
        
        // Retry mechanism for fetching the video blob, as 404s can happen if accessed too quickly
        for (let i = 0; i < 3; i++) {
            try {
                const res = await fetch(fetchUrl);
                if (res.ok) {
                    const blob = await res.blob();
                    return URL.createObjectURL(blob);
                }
                if (res.status === 404) {
                    console.warn(`Attempt ${i+1}: Video resource not found yet, retrying...`);
                    await new Promise(r => setTimeout(r, 2000)); // Wait 2s before retry
                    continue;
                }
                throw new Error(`Failed to fetch video: ${res.statusText}`);
            } catch (e) {
                console.error("Error fetching video blob:", e);
                if (i === 2) throw e; // Throw on last attempt
                await new Promise(r => setTimeout(r, 2000));
            }
        }
    }
    return null;
  } catch (error) {
    console.error("Video generation failed:", error);
    return null;
  }
};