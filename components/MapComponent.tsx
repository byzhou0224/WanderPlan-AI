import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Spot, SpotType } from '../types';
import { X } from 'lucide-react';

interface MapComponentProps {
  spots: Spot[];
  center?: [number, number];
  activeSpotId?: string | null;
  onViewPhotos?: (photos: string[], index: number) => void;
}

const RecenterMap: React.FC<{ center?: [number, number]; spots: Spot[] }> = ({ center, spots }) => {
  const map = useMap();

  useEffect(() => {
    if (center) {
      map.setView(center, 13, { animate: true });
    } else if (spots.length > 0) {
      const bounds = L.latLngBounds(spots.map(s => [s.coordinates.lat, s.coordinates.lng]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [center, spots, map]);

  return null;
};

const createCustomIcon = (type: SpotType) => {
  // New Color Palette
  // ITINERARY: Terracotta #BC4B51
  // VISITED: Sage Green #81B29A 
  // WANT_TO_VISIT: Deep Blue #1F363D
  // ACCOMMODATION: Indigo/Lavender #6D597A

  let color = '#1F363D'; 
  if (type === SpotType.VISITED) color = '#5B8C5A'; 
  if (type === SpotType.ITINERARY) color = '#BC4B51';
  if (type === SpotType.ACCOMMODATION) color = '#6D597A';

  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: ${color}; width: 24px; height: 24px;" class="custom-marker"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
  });
};

const MapComponent: React.FC<MapComponentProps> = ({ spots, center, activeSpotId, onViewPhotos }) => {
  const defaultCenter: [number, number] = [43.7696, 11.2558]; // Default to Florence, Italy for the vibe
  const markerRefs = useRef<{[key: string]: L.Marker | null}>({});

  // Effect to handle opening the popup when activeSpotId changes
  useEffect(() => {
    if (activeSpotId && markerRefs.current[activeSpotId]) {
      markerRefs.current[activeSpotId]?.openPopup();
    }
  }, [activeSpotId]);

  return (
    <div className="h-full w-full rounded-none overflow-hidden shadow-inner border-l border-[#E6E2DD] relative">
      <MapContainer
        center={defaultCenter}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <RecenterMap center={center} spots={spots} />

        {spots.map((spot) => (
          <Marker
            key={spot.id}
            position={[spot.coordinates.lat, spot.coordinates.lng]}
            icon={createCustomIcon(spot.type)}
            ref={element => {
              if (element) {
                markerRefs.current[spot.id] = element;
              }
            }}
          >
            <Popup>
              <div className="p-2 font-sans min-w-[200px]">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded text-white mb-2 inline-block uppercase tracking-wider
                  ${spot.type === SpotType.VISITED ? 'bg-[#5B8C5A]' : 
                    spot.type === SpotType.ITINERARY ? 'bg-[#BC4B51]' : 
                    spot.type === SpotType.ACCOMMODATION ? 'bg-[#6D597A]' : 'bg-[#1F363D]'}`}
                >
                  {spot.type === SpotType.VISITED ? 'Visited' : 
                   spot.type === SpotType.ITINERARY ? 'Planned' : 
                   spot.type === SpotType.ACCOMMODATION ? 'Base Camp' : 'Wishlist'}
                </span>
                <h3 className="font-serif font-bold text-[#1F363D] text-lg leading-tight">{spot.name}</h3>
                <p className="text-sm text-[#78716C] my-1 leading-snug">{spot.description}</p>
                {spot.itineraryTime && spot.type !== SpotType.ACCOMMODATION && (
                  <p className="text-xs text-[#BC4B51] font-bold mt-2 border-t border-[#E6E2DD] pt-1">
                    {new Date(spot.itineraryTime).toLocaleString(undefined, {
                      weekday: 'short', hour: 'numeric', minute: '2-digit'
                    })}
                  </p>
                )}

                {/* Photo Preview in Popup */}
                {spot.photos && spot.photos.length > 0 && (
                  <div 
                    className="mt-3 relative group cursor-pointer overflow-hidden rounded-lg border border-[#E6E2DD] shadow-sm"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent map click through
                      if (onViewPhotos) onViewPhotos(spot.photos!, 0);
                    }}
                  >
                    <div className="aspect-video w-full bg-gray-100">
                      <img 
                        src={spot.photos[0]} 
                        alt="Spot preview" 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                    
                    {spot.photos.length > 1 && (
                      <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm">
                        +{spot.photos.length - 1} more
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default MapComponent;