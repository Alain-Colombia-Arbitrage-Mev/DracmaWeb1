
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Translations } from '../types';

// Helper to get translation within the service, passed from App.tsx
type GetTranslationFn = (key: string, fallback?: string) => string;

let ai: GoogleGenAI | null = null;

// Initialize GoogleGenAI if API_KEY is available and not a placeholder
const apiKey = process.env.API_KEY;

if (apiKey && apiKey !== "YOUR_API_KEY_HERE" && apiKey !== "") {
  try {
    ai = new GoogleGenAI({ apiKey: apiKey });
    console.log("GoogleGenAI initialized successfully with provided API Key.");
  } catch (e) {
    console.error("Failed to initialize GoogleGenAI. Ensure API_KEY is valid:", e);
    ai = null; // Ensure ai is null if initialization fails
  }
} else {
    if (!apiKey || apiKey === "") {
        console.warn("Gemini API Key (process.env.API_KEY) is not set or is empty. Using simulated responses.");
    } else if (apiKey === "YOUR_API_KEY_HERE") {
        console.warn("Gemini API Key is a placeholder (YOUR_API_KEY_HERE). Using simulated responses.");
    }
    ai = null; // Explicitly set to null if any condition for not initializing is met
}

export const callGeminiAPI = async (prompt: string, lang: string, getTranslation: GetTranslationFn): Promise<string> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));

  if (!ai) {
    // Fallback to simulation logic if 'ai' is not initialized
    console.log(`Simulating Gemini API call for lang: ${lang}, prompt: "${prompt.substring(0, 50)}..."`);
    const lowerPrompt = prompt.toLowerCase();
    // More specific keyword matching for simulation
    if (lowerPrompt.includes("filosofía dracma") || (lowerPrompt.includes("philosophy") && lowerPrompt.includes("dracma"))) {
      return getTranslation('simulatedResponsePhilosophy');
    } else if (lowerPrompt.includes("analizar inversión") || (lowerPrompt.includes("analyze investment") && lowerPrompt.includes("dracma"))) {
      return getTranslation('simulatedResponseInvestment');
    } else if (lowerPrompt.includes("pitch de embajador") || (lowerPrompt.includes("ambassador pitch") && lowerPrompt.includes("dracma"))) {
      return getTranslation('simulatedResponseAmbassador');
    } else if (lowerPrompt.includes("ecosistema dracma") || lowerPrompt.includes("tokenized real world assets") || lowerPrompt.includes("artificial intelligence (ai)") || lowerPrompt.includes("blockchain infrastructure") || (lowerPrompt.includes("explain") && lowerPrompt.includes("dracma ecosystem"))) {
       return getTranslation('simulatedResponseEcosystemDetail');
    } else if (lowerPrompt.includes("membresía me conviene") || (lowerPrompt.includes("membership suits me") && lowerPrompt.includes("dracma"))) {
      return getTranslation('simulatedResponseMembershipRec');
    } else if (lowerPrompt.includes("impacto del roadmap") || (lowerPrompt.includes("roadmap impact") && lowerPrompt.includes("dracma"))) {
      return getTranslation('simulatedResponseRoadmapOutlook');
    } else if (lowerPrompt.includes("confirmando la recepción") || lowerPrompt.includes("contactar a dracma") || (lowerPrompt.includes("contact form") && lowerPrompt.includes("dracma"))) {
      return getTranslation('simulatedResponseContact');
    } else if (lowerPrompt.includes("crowdfunding p2p de dracma") || (lowerPrompt.includes("p2p crowdfunding") && lowerPrompt.includes("dracma"))) {
      return getTranslation('simulatedResponseCrowdfunding');
    } else if (lowerPrompt.includes("proyecto de crowdfunding") || (lowerPrompt.includes("crowdfunding project") && lowerPrompt.includes("dracma"))) {
      // This is a generic catch for project details, might need more specific checks if project names vary widely
      return getTranslation('simulatedResponseCrowdfunding', `Detalles sobre este proyecto: DRACMA IA está procesando. En un entorno real, obtendrías información específica sobre ${prompt.substring(prompt.indexOf('"')+1, prompt.lastIndexOf('"'))}. Por ahora, esta es una respuesta simulada indicando que tu solicitud sobre el proyecto ha sido recibida.`);
    }
    console.warn(`No specific simulation for prompt: "${prompt.substring(0,50)}...". Using generic response.`);
    return getTranslation('simulatedResponseGeneric', `DRACMA AI is processing your request. In a real environment, you would receive a detailed response. This is a simulation indicating your prompt was received.`);
  }

  // Proceed with actual API call using the SDK
  try {
    console.log(`Calling actual Gemini API with model 'gemini-2.5-flash-preview-04-17' for prompt: "${prompt.substring(0, 50)}..."`);
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-04-17',
      contents: prompt,
      // Example of config:
      // config: {
      //   systemInstruction: `You are DRACMA AI, an expert assistant for the DRACMA project. Respond in ${lang}. Be concise and professional.`,
      //   temperature: 0.6,
      // }
    });

    const textResponse = response.text; // Correct way to extract text output
    
    if (!textResponse || textResponse.trim() === "") {
        console.warn("Gemini API returned an empty or whitespace-only response. Falling back to generic simulation.");
        return getTranslation('simulatedResponseGeneric', 'AI response was empty or contained only whitespace. Please try a different prompt.');
    }
    return textResponse;

  } catch (error: any) {
    console.error("Gemini API Call Error:", error);
    let errorMessage = getTranslation('aiModalError', 'Error al contactar la IA.');
    
    // More detailed error handling based on potential error structures from SDK
    if (error && typeof error.message === 'string') {
      if (error.message.includes("API key not valid") || error.message.includes("permission denied") || (error.status && error.status === 403)) {
        errorMessage = getTranslation('aiModalError', 'Error de API: La clave no es válida o no tiene permisos. Verifica la configuración.');
      } else if (error.message.toLowerCase().includes("quota") || (error.status && error.status === 429)) {
        errorMessage = getTranslation('aiModalError', 'Se ha excedido la cuota de la API. Inténtalo más tarde.');
      } else if (error.message.toLowerCase().includes("model not found") || (error.status && error.status === 404)) {
        errorMessage = getTranslation('aiModalError', 'Error de API: El modelo especificado no fue encontrado.');
      } else {
        errorMessage += ` (Detalle: ${error.message.substring(0, 100)}${error.message.length > 100 ? '...' : ''})`;
      }
    } else if (error && error.status) { // Check for errors with a status code but no message
         errorMessage += ` (Código de Error: ${error.status})`;
    }
    
    // Fallback to simulation if actual call fails, to maintain functionality for the user
    console.warn("Falling back to simulation due to API error.");
    // Provide a more user-friendly simulated error message
    return `${errorMessage} ${getTranslation('simulatedResponseGeneric', 'Respuesta simulada debido a un problema con la IA.')}`;
  }
};
