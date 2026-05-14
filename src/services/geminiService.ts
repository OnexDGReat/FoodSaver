import { GoogleGenAI, Type } from "@google/genai";
import { Listing, User } from "../types";

export interface AIRecommendationResponse {
  recommendedListingIds: string[];
  reason: string;
}

export const getAIRecommendations = async (
  user: User,
  listings: Listing[]
): Promise<AIRecommendationResponse> => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API key is missing. Please ensure GEMINI_API_KEY is set in your env.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const model = "gemini-2.0-flash";
  
  const listingsContext = listings.map(l => ({
    id: l.id,
    name: l.name,
    restaurant: l.restaurantName,
    description: l.description,
    price: l.rescuePrice,
    category: l.category
  }));

  const systemInstruction = `
    You are a helpful food assistant for a food rescue app. 
    Your goal is to suggest the best meals to rescue based on user preferences and available listings.
    
    User Preferences: ${JSON.stringify(user.preferences)}
    
    Available Listings: ${JSON.stringify(listingsContext)}
    
    Recommend exactly 3 listings that best match the user's dietary preferences or would be an interesting choice for them.
    Provide a friendly, short reason for why you chose these.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text: "Please recommend 3 meals for me." }] }],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recommendedListingIds: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Array of exactly 3 listing IDs from the provided context."
            },
            reason: {
              type: Type.STRING,
              description: "A short, engaging explanation for the recommendations."
            }
          },
          required: ["recommendedListingIds", "reason"]
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
