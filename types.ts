export enum SpotType {
  VISITED = 'VISITED',
  WANT_TO_VISIT = 'WANT_TO_VISIT',
  ITINERARY = 'ITINERARY',
  ACCOMMODATION = 'ACCOMMODATION',
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Spot {
  id: string;
  tripId?: string; // Optional: if belongs to a specific trip
  name: string;
  description?: string;
  type: SpotType;
  coordinates: Coordinates;
  visitedDate?: string; // ISO string
  itineraryTime?: string; // ISO string for planned visit
  website?: string;
  photos?: string[]; // Base64 strings of uploaded photos
  isCheckIn?: boolean; // Specific for accommodation
}

export interface Trip {
  id: string;
  destination: string;
  startDate: string;
  days: number;
  chillLevel: ChillLevel;
}

export enum ChillLevel {
  RELAXED = 'Relaxed (Resort/Beach/Chill)',
  BALANCED = 'Balanced (Sightseeing + Rest)',
  ACTIVE = 'Active (Hiking/Adventure/Full Day)',
  CULTURE = 'Cultural (Museums/History/Food)',
  PARTY = 'Nightlife & Social',
}

export interface TripRequest {
  destination: string;
  days: number;
  chillLevel: ChillLevel;
  startDate: string;
  images?: string[]; // Array of Base64 strings for multimodal input
}

export interface GeneratedActivity {
  time: string; // e.g., "09:00"
  name: string; // Activity Name / Title
  notes: string; // Description/Notes
  location_name: string; // Specific Place Name
  energy_score: number; // 1-10
  duration_min: number;
  coordinates: Coordinates;
  website?: string;
}

export interface GeneratedAccommodation {
  name: string;
  description: string;
  coordinates: Coordinates;
  is_check_in: boolean;
  reason: string; // Why this location was chosen
}

export interface GeneratedDay {
  day: number;
  morning_cluster: string; // Main zone/cluster
  accommodation: GeneratedAccommodation;
  activities: GeneratedActivity[];
}

export interface GeneratedTrip {
  summary: string;
  days: GeneratedDay[];
}