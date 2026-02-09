import { GoogleGenAI, type GenerateContentResponse } from "@google/genai";

type GetTranslationFn = (key: string, fallback?: string) => string;

let ai: GoogleGenAI | null = null;

const apiKey = process.env.API_KEY;

if (apiKey && apiKey !== "YOUR_API_KEY_HERE" && apiKey !== "") {
  try {
    ai = new GoogleGenAI({ apiKey: apiKey });
    console.log("GoogleGenAI initialized successfully with provided API Key.");
  } catch (e) {
    console.error("Failed to initialize GoogleGenAI:", e);
    ai = null;
  }
} else {
  if (!apiKey || apiKey === "") {
    console.warn("Gemini API Key is not set. Using simulated responses.");
  } else if (apiKey === "YOUR_API_KEY_HERE") {
    console.warn("Gemini API Key is a placeholder. Using simulated responses.");
  }
  ai = null;
}

export const callGeminiAPI = async (prompt: string, lang: string, getTranslation: GetTranslationFn): Promise<string> => {
  await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));

  if (!ai) {
    console.log(`Simulating Gemini API call for lang: ${lang}, prompt: "${prompt.substring(0, 50)}..."`);
    const lowerPrompt = prompt.toLowerCase();
    if (lowerPrompt.includes("filosofía dracma") || (lowerPrompt.includes("philosophy") && lowerPrompt.includes("dracma"))) {
      return getTranslation('simulatedResponsePhilosophy');
    } else if (lowerPrompt.includes("analizar inversión") || (lowerPrompt.includes("analyze investment") && lowerPrompt.includes("dracma"))) {
      return getTranslation('simulatedResponseInvestment');
    } else if (lowerPrompt.includes("ecosistema dracma") || lowerPrompt.includes("tokenized real world assets") || lowerPrompt.includes("artificial intelligence (ai)") || lowerPrompt.includes("blockchain infrastructure") || (lowerPrompt.includes("explain") && lowerPrompt.includes("dracma ecosystem"))) {
      return getTranslation('simulatedResponseEcosystemDetail');
    } else if (lowerPrompt.includes("impacto del roadmap") || (lowerPrompt.includes("roadmap impact") && lowerPrompt.includes("dracma"))) {
      return getTranslation('simulatedResponseRoadmapOutlook');
    } else if (lowerPrompt.includes("confirmando la recepción") || lowerPrompt.includes("contactar a dracma") || (lowerPrompt.includes("contact form") && lowerPrompt.includes("dracma"))) {
      return getTranslation('simulatedResponseContact');
    } else if (lowerPrompt.includes("crowdfunding p2p de dracma") || (lowerPrompt.includes("p2p crowdfunding") && lowerPrompt.includes("dracma"))) {
      return getTranslation('simulatedResponseCrowdfunding');
    } else if (lowerPrompt.includes("proyecto de crowdfunding") || (lowerPrompt.includes("crowdfunding project") && lowerPrompt.includes("dracma"))) {
      return getTranslation('simulatedResponseCrowdfunding', `Detalles sobre este proyecto: DRACMA IA está procesando.`);
    }
    console.warn(`No specific simulation for prompt: "${prompt.substring(0,50)}...". Using generic response.`);
    return getTranslation('simulatedResponseGeneric', `DRACMA AI is processing your request. This is a simulation.`);
  }

  try {
    console.log(`Calling actual Gemini API for prompt: "${prompt.substring(0, 50)}..."`);
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-04-17',
      contents: prompt,
    });

    const textResponse = response.text;
    if (!textResponse || textResponse.trim() === "") {
      console.warn("Gemini API returned empty response.");
      return getTranslation('simulatedResponseGeneric', 'AI response was empty.');
    }
    return textResponse;
  } catch (error: any) {
    console.error("Gemini API Call Error:", error);
    let errorMessage = getTranslation('aiModalError', 'Error al contactar la IA.');
    if (error && typeof error.message === 'string') {
      if (error.message.includes("API key not valid") || (error.status && error.status === 403)) {
        errorMessage = getTranslation('aiModalError', 'Error de API: La clave no es válida.');
      } else if (error.message.toLowerCase().includes("quota") || (error.status && error.status === 429)) {
        errorMessage = getTranslation('aiModalError', 'Se ha excedido la cuota de la API.');
      }
    }
    console.warn("Falling back to simulation due to API error.");
    return `${errorMessage} ${getTranslation('simulatedResponseGeneric', 'Respuesta simulada.')}`;
  }
};
