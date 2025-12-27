import { GoogleGenAI, Type } from "@google/genai";
import { TripRequest, GeneratedTrip, ChillLevel } from "../types";

// Helper to validate environment variable
const getApiKey = (): string => {
  const key = process.env.API_KEY;
  if (!key) {
    console.error("API_KEY is missing from environment variables.");
    return "";
  }
  return key;
};

export const generateTripItinerary = async (request: TripRequest): Promise<GeneratedTrip> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key not found");

  const ai = new GoogleGenAI({ apiKey });

  // Adjust daily energy cap based on user preference
  let dailyEnergyCap = 20;
  if (request.chillLevel === ChillLevel.RELAXED) dailyEnergyCap = 12;
  if (request.chillLevel === ChillLevel.ACTIVE) dailyEnergyCap = 28;

  const basePrompt = `
    Role: You are an expert Travel Logistics Planner. You do not just list places; you solve for optimal human energy levels, geographic efficiency, and accommodation logistics.

    Task: Create a ${request.days}-day trip to ${request.destination} starting on ${request.startDate}.
    User Vibe: ${request.chillLevel}.

    Objective: Create a travel itinerary adhering to the following strict constraints:

    Constraint 1: The "Base Camp" Strategy (Accommodation)
    - You MUST recommend specific hotels ("Base Camps") for the user.
    - Switching Limit: Minimize packing/unpacking.
      * If Trip <= 4 days: Max 2 unique hotels.
      * If Trip <= 7 days: Max 3 unique hotels.
      * If Trip > 7 days: Switch hotels maximum once every 3 days.
    - Location Logic: The recommended hotel MUST be geographically central to the activities scheduled for the days the user stays there.
    - Check-In Awareness: Clearly mark days where the user switches hotels (is_check_in = true).

    Constraint 2: Geographic Clustering (The "Hub" Rule)
    - Group activities by neighborhood or zone.
    - The first activity of the day must be within 30 minutes of the current "Base Camp".
    - Do NOT schedule activities on opposite ends of the city on the same day.
    - Logic: If Activity A is > 45 mins travel from Activity B, they belong on different days.

    Constraint 3: Energy Management (The "Battery" Rule)
    - Assign every activity an "Energy Score" from 1 (Low/Resting) to 10 (Exhausting/Hiking).
    - Daily Cap: Total Energy Score per day must not exceed ${dailyEnergyCap} (Adjusted for user's vibe).
    - Sequence Rule: Never schedule two High Energy activities (Score > 7) back-to-back. Always buffer them with a Low Energy activity (Cafe, Park, Transit).

    Constraint 4: Time Feasibility & Buffers
    - The "Recovery" Rule: If an activity takes > 4 hours, the next activity MUST be located within 15 mins and be purely for resting/eating (Energy Score < 3).
    - Buffer Rule: Always add a 30-minute "transition buffer" logic when calculating start times (included in your output time).

    Content Source:
    - Use "RedNote" (Xiaohongshu) and "TripAdvisor" style logic: look for photogenic spots, highly rated local gems, and authentic experiences.

    IMPORTANT: 
    1. You must estimate specific Latitude and Longitude coordinates for each location (Activity AND Accommodation).
    2. Try to provide a real website URL for the place if known.
  `;

  const multimodalNote = request.images && request.images.length > 0 
    ? `\n\nUSER PROVIDED IMAGE CONTEXT:
    The user has uploaded images/screenshots for context. 
    - If they contain text (e.g. screenshots of reservations, social media posts about places, restaurant lists), YOU MUST prioritize extracting these locations and including them in the itinerary.
    - If they are vibe/landscape photos, match the itinerary style to them.` 
    : "";

  const finalPrompt = basePrompt + multimodalNote;

  // Define the schema for the structured output based on user's requested format
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      summary: {
        type: Type.STRING,
        description: "A brief enthusiastic summary of the trip vibe.",
      },
      days: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            day: { type: Type.INTEGER },
            morning_cluster: { type: Type.STRING, description: "The main zone or neighborhood for the day" },
            accommodation: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING, description: "Name of the hotel/hostel" },
                description: { type: Type.STRING, description: "Brief desc of the hotel vibe" },
                reason: { type: Type.STRING, description: "Why this location is strategic for today's activities" },
                is_check_in: { type: Type.BOOLEAN, description: "Is this the first night at this hotel?" },
                coordinates: {
                  type: Type.OBJECT,
                  properties: {
                    lat: { type: Type.NUMBER },
                    lng: { type: Type.NUMBER },
                  },
                  required: ["lat", "lng"],
                },
              },
              required: ["name", "description", "reason", "is_check_in", "coordinates"]
            },
            activities: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  time: { type: Type.STRING, description: "Time of day in 24h format, e.g. 09:00" },
                  name: { type: Type.STRING, description: "The title of the activity" },
                  notes: { type: Type.STRING, description: "Description and logistics notes" },
                  location_name: { type: Type.STRING, description: "Name of the specific place/venue" },
                  energy_score: { type: Type.INTEGER, description: "Energy cost 1-10" },
                  duration_min: { type: Type.INTEGER, description: "Estimated duration in minutes" },
                  website: { type: Type.STRING, description: "Official website URL if available" },
                  coordinates: {
                    type: Type.OBJECT,
                    properties: {
                      lat: { type: Type.NUMBER },
                      lng: { type: Type.NUMBER },
                    },
                    required: ["lat", "lng"],
                  },
                },
                required: ["time", "name", "notes", "location_name", "coordinates", "energy_score", "duration_min"],
              },
            },
          },
          required: ["day", "morning_cluster", "activities", "accommodation"],
        },
      },
    },
    required: ["summary", "days"],
  };

  const parts: any[] = [];
  
  // Add images to payload if they exist
  if (request.images && request.images.length > 0) {
    request.images.forEach(imgBase64 => {
      // Extract matches: [full, mimeType, base64Data]
      const match = imgBase64.match(/^data:(.+);base64,(.+)$/);
      if (match) {
        parts.push({
          inlineData: {
            mimeType: match[1],
            data: match[2],
          },
        });
      }
    });
  }

  // Add the prompt
  parts.push({ text: finalPrompt });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts: parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.4, 
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as GeneratedTrip;
    } else {
      throw new Error("No response text generated");
    }
  } catch (error) {
    console.error("Error generating trip:", error);
    throw error;
  }
};