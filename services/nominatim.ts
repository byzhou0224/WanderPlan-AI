interface PhotonFeature {
  geometry: {
    coordinates: [number, number];
    type: string;
  };
  properties: {
    name?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
    street?: string;
    housenumber?: string;
    postcode?: string;
    osm_key?: string;
    osm_value?: string; // e.g. "restaurant", "hotel", "city"
  };
}

interface PhotonResponse {
  features: PhotonFeature[];
}

export const searchPlaces = async (
  query: string, 
  lat?: number, 
  lng?: number,
  options?: { onlyCities?: boolean }
): Promise<{ name: string; title: string; subtitle: string; lat: number; lng: number }[]> => {
  if (!query || query.length < 3) return [];

  try {
    // Using Photon API (Komoot). 
    // We increase limit to 15 to allow for client-side filtering of non-places while keeping relevant results.
    let url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=15&lang=en`;
    
    if (lat !== undefined && lng !== undefined) {
      url += `&lat=${lat}&lon=${lng}`;
    }

    // REMOVED: strict osm_tag URL filtering (e.g. &osm_tag=place:city) 
    // because it causes major cities (like Tokyo) to be excluded depending on OSM tagging quirks.
    // Instead, we fetch broad results and filter client-side below.
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Network response was not ok');
    
    const data: PhotonResponse = await response.json();
    
    const filteredFeatures = data.features.filter(item => {
      if (!options?.onlyCities) return true;
      const p = item.properties;
      
      // Allow if it's explicitly a place or boundary
      if (p.osm_key === 'place' || p.osm_key === 'boundary') return true;
      
      // Allow specific values that represent cities/regions
      const validValues = ['city', 'town', 'village', 'hamlet', 'suburb', 'borough', 'county', 'state', 'country'];
      if (validValues.includes(p.osm_value || '')) return true;

      // Reject common non-place types if onlyCities is true
      const invalidKeys = ['highway', 'amenity', 'shop', 'tourism', 'leisure', 'building'];
      if (invalidKeys.includes(p.osm_key || '')) return false;

      // Default: if we are strictly looking for cities and it's not clearly a place, strictly speaking we might want to exclude it,
      // but to be safe and avoid empty lists, we might be permissive unless it's clearly an object/POI.
      // For now, let's assume if it passed the invalidKeys check, it might be relevant (like natural features).
      return true;
    });
    
    return filteredFeatures.slice(0, 10).map(item => { // Limit back to 10 after filtering
      const p = item.properties;
      
      // Determine Title
      // Use name, or fallbacks if name is missing
      const title = p.name || p.city || p.town || p.village || p.state || "Unknown Location";
      
      // Determine Subtitle parts
      const subParts = [];
      
      if (!options?.onlyCities && p.street) {
        subParts.push(`${p.street} ${p.housenumber || ''}`.trim());
      }
      
      // Avoid duplicating the title in the subtitle if it's the exact same string
      if (p.city && p.city !== title) subParts.push(p.city);
      else if (p.town && p.town !== title) subParts.push(p.town);
      else if (p.village && p.village !== title) subParts.push(p.village);
      
      // Always add state and country if they exist and aren't the title
      if (p.state && p.state !== title) subParts.push(p.state);
      if (p.country && p.country !== title) subParts.push(p.country);

      // Filter out empty strings and join
      const subtitle = subParts.filter(Boolean).join(', ');

      // Full name for the input value
      const displayName = subtitle ? `${title}, ${subtitle}` : title;

      return {
        name: displayName,
        title: title,
        subtitle: subtitle,
        lat: item.geometry.coordinates[1], // GeoJSON is [lng, lat]
        lng: item.geometry.coordinates[0]
      };
    });
  } catch (error) {
    console.error("Error fetching places:", error);
    return [];
  }
};