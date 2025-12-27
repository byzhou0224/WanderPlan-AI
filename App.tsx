import React, { useState, useEffect } from 'react';
import { Coordinates, Spot, SpotType, TripRequest, GeneratedTrip, Trip } from './types';
import MapComponent from './components/MapComponent';
import PlanForm from './components/PlanForm';
import SpotCard from './components/SpotCard';
import AutocompleteInput from './components/AutocompleteInput';
import CalendarInput from './components/CalendarInput';
import ImageLightbox from './components/ImageLightbox';
import { generateTripItinerary } from './services/gemini';
import { MapPin, Plus, List, Loader2, AlertCircle, Briefcase, ChevronRight, X, Save, ArrowLeft, Clock, Calendar, Search, Footprints, BedDouble, Map as MapIcon, Home, Bookmark } from 'lucide-react';

const generateId = () => Math.random().toString(36).substr(2, 9);

// Haversine formula to calculate distance between two points in km
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in km
};

const backgroundImages = [
  "https://images.unsplash.com/photo-1551918120-9739cb430c6d?q=80&w=987&auto=format&fit=crop", // woman-on-body-of-water-during-daytime
  "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?q=80&w=3274&auto=format&fit=crop", // sunloungers-fronting-buildings-near-mountain
  "https://images.unsplash.com/photo-1516466723877-e4ec1d736c8a?q=80&w=3034&auto=format&fit=crop", // norway
  "https://images.unsplash.com/photo-1533654655195-905c71b17211?q=80&w=2497&auto=format&fit=crop", // Faroe Islands
  "https://images.unsplash.com/photo-1579408795979-966a21467a34?q=80&w=2070&auto=format&fit=crop", // Sedona
  "https://images.unsplash.com/photo-1652842183703-47c2f7bb8c3c?q=80&w=3132&auto=format&fit=crop", // Bora Bora
  "https://images.unsplash.com/photo-1591873270557-1d6430331644?q=80&w=2663&auto=format&fit=crop", // a-tall-pagoda-with-a-mountain-in-the-background
  "https://images.unsplash.com/photo-1450380412196-4e27fb7d2270?q=80&w=2076&auto=format&fit=crop", // Mountain Sea
  "https://images.unsplash.com/photo-1702593496618-68fa8af7b5e1?q=80&w=2071&auto=format&fit=crop", // Los Cabos Boats
  "https://images.unsplash.com/photo-1621582968567-b10725dc1fa3?q=80&w=2071&auto=format&fit=crop", // Azores
  "https://images.unsplash.com/photo-1594325865031-724f97b191ee?q=80&w=3269&auto=format&fit=crop", // Los Cabos Plants
];

export default function App() {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

  // Track the actively clicked spot to sync list and map
  const [activeSpotId, setActiveSpotId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'plan' | 'mytrip' | 'saved'>('plan');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number] | undefined>(undefined);

  // --- Mobile View State ---
  const [showMobileMap, setShowMobileMap] = useState(false);

  // --- Background Slider State ---
  const [currentBgIndex, setCurrentBgIndex] = useState(0);

  // --- Manual Add Spot State ---
  const [isAddingSpot, setIsAddingSpot] = useState(false);
  const [newSpotName, setNewSpotName] = useState('');
  const [newSpotCoords, setNewSpotCoords] = useState<{lat: number, lng: number} | null>(null);

  // --- Add Activity State ---
  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const [activityType, setActivityType] = useState<SpotType>(SpotType.ITINERARY);
  const [activityName, setActivityName] = useState('');
  const [activityCoords, setActivityCoords] = useState<{lat: number, lng: number} | null>(null);
  const [activityDate, setActivityDate] = useState('');
  const [activityTime, setActivityTime] = useState('09:00');

  // --- Global Lightbox State ---
  const [lightboxPhotos, setLightboxPhotos] = useState<string[] | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    if (!process.env.API_KEY) {
      setError("Please set your Gemini API_KEY in the environment variables to use AI features.");
    }
  }, []);

  // Background Slider Effect
  useEffect(() => {
    if (activeTab === 'plan') {
      const interval = setInterval(() => {
        setCurrentBgIndex((prev) => (prev + 1) % backgroundImages.length);
      }, 10000); // Change every 10 seconds
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  const handleGenerateTrip = async (request: TripRequest) => {
    setIsGenerating(true);
    setError(null);
    try {
      const result: GeneratedTrip = await generateTripItinerary(request);
      
      const newTripId = generateId();
      const newTrip: Trip = {
        id: newTripId,
        destination: request.destination,
        startDate: request.startDate,
        days: request.days,
        chillLevel: request.chillLevel
      };

      setTrips([...trips, newTrip]);

      const newSpots: Spot[] = [];
      const startDate = new Date(request.startDate);

      result.days.forEach((day) => {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + day.day - 1);

        if (day.accommodation) {
           const accomDate = new Date(currentDate);
           accomDate.setHours(7, 0); 

           newSpots.push({
             id: generateId(),
             tripId: newTripId,
             name: day.accommodation.name,
             description: `[Base Camp] ${day.accommodation.reason}. ${day.accommodation.description}`,
             type: SpotType.ACCOMMODATION,
             coordinates: day.accommodation.coordinates,
             itineraryTime: accomDate.toISOString(),
             isCheckIn: day.accommodation.is_check_in
           });
        }

        day.activities.forEach((activity) => {
          const [hours, minutes] = activity.time.split(':').map(Number);
          const activityDate = new Date(currentDate);
          activityDate.setHours(hours, minutes);

          const energyIcon = activity.energy_score && activity.energy_score > 7 ? '⚡' : activity.energy_score && activity.energy_score < 4 ? '☕' : '✨';
          const logisticsInfo = day.morning_cluster 
            ? `[${day.morning_cluster} • ${energyIcon} Battery: ${activity.energy_score}/10] ` 
            : '';

          newSpots.push({
            id: generateId(),
            tripId: newTripId,
            name: activity.name,
            description: `${logisticsInfo}${activity.location_name}: ${activity.notes}`,
            type: SpotType.ITINERARY,
            coordinates: activity.coordinates,
            itineraryTime: activityDate.toISOString(),
            website: activity.website
          });
        });
      });

      setSpots(prev => [...prev, ...newSpots]);
      setSelectedTripId(newTripId);
      setActiveTab('mytrip');
      setShowMobileMap(false); // Reset to list view on mobile
      
      if (newSpots.length > 0) {
        setMapCenter([newSpots[0].coordinates.lat, newSpots[0].coordinates.lng]);
      }

    } catch (e: any) {
      setError(e.message || "Failed to generate itinerary. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddSpot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSpotName || !newSpotCoords) {
      alert("Please select a location.");
      return;
    }

    const spot: Spot = {
      id: generateId(),
      name: newSpotName,
      type: SpotType.WANT_TO_VISIT,
      coordinates: newSpotCoords,
      description: "Saved place",
    };

    setSpots([...spots, spot]);
    setMapCenter([spot.coordinates.lat, spot.coordinates.lng]);
    resetAddSpotForm();
  };

  const resetAddSpotForm = () => {
    setIsAddingSpot(false);
    setNewSpotName('');
    setNewSpotCoords(null);
  };

  const openActivityModal = () => {
    const currentTrip = trips.find(t => t.id === selectedTripId);
    if (currentTrip) {
      setActivityDate(currentTrip.startDate);
    }
    setActivityType(SpotType.ITINERARY);
    setIsAddingActivity(true);
  };

  const handleAddActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityName || !activityCoords || !selectedTripId) return;

    let isoDateTime = undefined;
    if (activityDate && activityTime) {
      const d = new Date(`${activityDate}T${activityTime}`);
      isoDateTime = d.toISOString();
    }

    const spot: Spot = {
      id: generateId(),
      name: activityName,
      type: activityType,
      tripId: selectedTripId,
      coordinates: activityCoords,
      description: activityType === SpotType.ACCOMMODATION ? "Manual Base Camp" : "User added activity",
      itineraryTime: isoDateTime,
      isCheckIn: activityType === SpotType.ACCOMMODATION ? true : undefined
    };

    setSpots([...spots, spot]);
    setMapCenter([spot.coordinates.lat, spot.coordinates.lng]);
    resetActivityForm();
  };

  const resetActivityForm = () => {
    setIsAddingActivity(false);
    setActivityType(SpotType.ITINERARY);
    setActivityName('');
    setActivityCoords(null);
    setActivityTime('09:00');
  };

  const handleDeleteSpot = (id: string) => {
    setSpots(spots.filter(s => s.id !== id));
    if (activeSpotId === id) setActiveSpotId(null);
  };

  const handleUpdateSpot = (id: string, updates: Partial<Spot>) => {
    setSpots(spots.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const handleSpotClick = (spot: Spot) => {
    setMapCenter([spot.coordinates.lat, spot.coordinates.lng]);
    setActiveSpotId(spot.id);
  };

  const handleSaveTrip = () => {
    setSelectedTripId(null);
    setActiveSpotId(null);
  };

  const handleViewPhotos = (photos: string[], index: number) => {
    setLightboxPhotos(photos);
    setLightboxIndex(index);
  };
  
  const getTripProgress = (trip: Trip) => {
    const start = new Date(trip.startDate).getTime();
    const end = start + (trip.days * 24 * 60 * 60 * 1000);
    const now = Date.now();
    
    if (now < start) return 0;
    if (now > end) return 100;
    return Math.round(((now - start) / (end - start)) * 100);
  };
  
  const handleSpotSelect = (suggestion: { name: string, lat: number, lng: number }) => {
    setNewSpotName(suggestion.name);
    setNewSpotCoords({ lat: suggestion.lat, lng: suggestion.lng });
  };

  const handleActivitySelect = (suggestion: { name: string, lat: number, lng: number }) => {
    setActivityName(suggestion.name);
    setActivityCoords({ lat: suggestion.lat, lng: suggestion.lng });
  };

  const currentTrip = trips.find(t => t.id === selectedTripId);
  const tripSpots = spots.filter(s => s.tripId === selectedTripId).sort((a, b) => 
    (a.itineraryTime || '').localeCompare(b.itineraryTime || '')
  );
  const savedSpots = spots.filter(s => !s.tripId && s.type !== SpotType.ITINERARY);

  const groupedTripSpots: { [date: string]: Spot[] } = {};
  tripSpots.forEach(spot => {
    if (spot.itineraryTime) {
      const dateKey = new Date(spot.itineraryTime).toDateString();
      if (!groupedTripSpots[dateKey]) groupedTripSpots[dateKey] = [];
      groupedTripSpots[dateKey].push(spot);
    } else {
      if (!groupedTripSpots['Unscheduled']) groupedTripSpots['Unscheduled'] = [];
      groupedTripSpots['Unscheduled'].push(spot);
    }
  });

  return (
    <div className="h-screen w-screen flex flex-col bg-[#FDFCF8] text-[#1F363D] font-sans overflow-hidden">
      
      {/* Background for Plan Mode */}
      {activeTab === 'plan' && (
        <div className="absolute inset-0 z-0 bg-[#E6E2DD]">
          {backgroundImages.map((img, index) => (
            <img 
              key={img}
              src={img}
              alt="Background"
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[3000ms] ease-in-out
                ${index === currentBgIndex ? 'opacity-100' : 'opacity-0'}`}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/20 to-black/60" />
        </div>
      )}

      {/* Desktop Header */}
      <header className={`hidden md:flex px-8 py-5 items-center justify-between z-10 transition-colors duration-300 ${activeTab === 'plan' ? 'bg-transparent text-white' : 'bg-[#FDFCF8] border-b border-[#E6E2DD] text-[#1F363D]'}`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${activeTab === 'plan' ? 'bg-white/20 backdrop-blur-md' : 'bg-[#1F363D] text-[#FDFCF8]'}`}>
            <MapPin size={22} className={activeTab === 'plan' ? 'text-white' : ''} />
          </div>
          <h1 className="text-2xl font-serif font-bold tracking-wide italic">WanderPlan</h1>
        </div>
        
        {/* Navigation Links for Desktop */}
        <div className={`flex items-center gap-8 text-sm font-bold tracking-widest uppercase ${activeTab === 'plan' ? 'text-white' : 'text-[#81B29A]'}`}>
           <button 
             onClick={() => setActiveTab('mytrip')}
             className={`hover:opacity-70 transition-opacity ${activeTab === 'mytrip' ? 'underline underline-offset-4' : ''}`}
           >
             All Trips
           </button>
           <button 
             onClick={() => setActiveTab('saved')}
             className={`hover:opacity-70 transition-opacity ${activeTab === 'saved' ? 'underline underline-offset-4' : ''}`}
           >
             Saved Gems
           </button>
           {activeTab !== 'plan' && (
             <button 
               onClick={() => setActiveTab('plan')}
               className="px-4 py-2 bg-[#1F363D] text-[#FDFCF8] rounded-full hover:bg-[#81B29A] transition-colors ml-2"
             >
               New Plan
             </button>
           )}
        </div>
      </header>

      {/* Mobile Header (Minimal) */}
      <header className={`md:hidden p-4 flex items-center justify-between z-10 absolute top-0 left-0 right-0 ${activeTab === 'plan' ? 'text-white' : 'bg-[#FDFCF8]/90 backdrop-blur-md border-b border-[#E6E2DD] text-[#1F363D]'}`}>
         <div className="flex items-center gap-2">
            <MapPin size={18} className={activeTab === 'plan' ? 'text-white' : 'text-[#1F363D]'} />
            <h1 className="text-xl font-serif font-bold italic">WanderPlan</h1>
         </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative z-0 mt-14 md:mt-0 mb-16 md:mb-0">
        
        {/* PLAN MODE */}
        {activeTab === 'plan' ? (
           <div className="flex-1 overflow-y-auto w-full custom-scrollbar">
            <div className="min-h-full flex flex-col items-center justify-center p-6 py-12">
              <div className="w-full max-w-xl fade-in-up">
                <div className="text-center mb-8 md:mb-10 text-white drop-shadow-md">
                  <h2 className="text-4xl md:text-6xl font-serif italic mb-2 md:mb-4">Time for a Break</h2>
                  <p className="text-lg md:text-xl font-light opacity-90 tracking-wide">Curate your perfect escape.</p>
                </div>
                
                <div className="relative bg-[#FDFCF8]/85 backdrop-blur-md p-6 md:p-8 rounded-[2rem] shadow-2xl border border-white/50">
                  {error && (
                    <div className="mb-6 p-4 bg-[#F9EAEA] text-[#81B29A] rounded-xl text-sm flex gap-3 items-center border border-[#EAC4C4]">
                      <AlertCircle size={18} />
                      {error}
                    </div>
                  )}
                  <PlanForm onGenerate={handleGenerateTrip} isLoading={isGenerating} />
                </div>
              </div>
            </div>
          </div>
        ) : (
          // DASHBOARD MODE (Split View)
          <>
            {/* List / Sidebar Container */}
            <div className={`
              flex flex-col z-20 bg-[#F9F8F6] border-r border-[#E6E2DD] shadow-xl overflow-hidden
              w-full md:w-[400px] lg:w-[450px] shrink-0
              ${showMobileMap ? 'hidden md:flex' : 'flex'}
            `}>
               {/* Desktop Sidebar Tabs */}
               <div className="hidden md:flex border-b border-[#E6E2DD] bg-[#FDFCF8]">
                <button
                  onClick={() => setActiveTab('mytrip')}
                  className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all border-r border-[#E6E2DD]
                    ${activeTab === 'mytrip' ? 'bg-[#F9F8F6] text-[#81B29A] shadow-inner' : 'text-[#A8A29E] hover:text-[#81B29A] hover:bg-[#F9F8F6]'}`}
                >
                  Itinerary
                </button>
                <button
                  onClick={() => setActiveTab('saved')}
                  className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all
                    ${activeTab === 'saved' ? 'bg-[#F9F8F6] text-[#81B29A] shadow-inner' : 'text-[#A8A29E] hover:text-[#81B29A] hover:bg-[#F9F8F6]'}`}
                >
                  Saved
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar relative">
                {/* LIST CONTENT */}
                {activeTab === 'mytrip' && (
                  <div className="space-y-6 pb-20 md:pb-0">
                    {!selectedTripId ? (
                      <div className="space-y-4 fade-in-up">
                        <h3 className="text-xl font-serif italic text-[#1F363D]">Your Trips</h3>
                        {trips.length === 0 ? (
                          <div className="text-center py-12 text-[#A8A29E] border border-dashed border-[#D6D3D1] rounded-2xl bg-[#FDFCF8]">
                            <Briefcase size={32} className="mx-auto mb-3 opacity-30" />
                            <p className="font-serif italic">No journeys planned yet.</p>
                          </div>
                        ) : (
                          trips.map(trip => (
                            <div 
                              key={trip.id}
                              onClick={() => setSelectedTripId(trip.id)}
                              className="group p-5 rounded-xl bg-white border border-[#E6E2DD] shadow-sm hover:shadow-md cursor-pointer transition-all hover:border-[#81B29A]/30 min-h-[80px]"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-serif text-lg text-[#1F363D] group-hover:text-[#81B29A] transition-colors">{trip.destination}</h4>
                                  <p className="text-xs font-sans uppercase tracking-wider text-[#81B29A] mt-1">{trip.startDate} • {trip.days} Days</p>
                                </div>
                                <ChevronRight size={18} className="text-[#D6D3D1] group-hover:text-[#81B29A]" />
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    ) : (
                      <div className="space-y-6 fade-in-up">
                         {/* Trip Header Controls */}
                        <div className="flex items-center justify-between">
                           <button 
                            onClick={() => setSelectedTripId(null)}
                            className="p-2 -ml-2 text-xs font-bold uppercase tracking-widest text-[#A8A29E] hover:text-[#1F363D] flex items-center gap-1 transition-colors rounded-lg hover:bg-black/5"
                          >
                            <ArrowLeft size={16} />
                            Back
                          </button>
                          
                          <button 
                            onClick={handleSaveTrip}
                            className="p-2 text-xs font-bold uppercase tracking-widest text-[#81B29A] hover:text-[#5B8C5A] flex items-center gap-1 transition-colors rounded-lg hover:bg-[#81B29A]/10"
                          >
                            <Save size={16} />
                            Save
                          </button>
                        </div>
                        
                        <div className="bg-white p-6 rounded-xl border border-[#E6E2DD] shadow-sm">
                           <div className="mb-4">
                             <h3 className="font-serif text-2xl italic text-[#1F363D] mb-1">{currentTrip?.destination}</h3>
                             <p className="text-xs font-sans uppercase tracking-widest text-[#A8A29E]">{currentTrip?.days} Days • {currentTrip?.chillLevel}</p>
                           </div>
                           
                           {currentTrip && (
                             <div className="space-y-2">
                               <div className="flex justify-between items-end">
                                 <span className="text-xs font-serif italic text-[#81B29A]">Trip Status</span>
                                 <span className="text-xs font-bold text-[#81B29A]">{getTripProgress(currentTrip)}% Completed</span>
                               </div>
                               <div className="h-1 w-full bg-[#E6E2DD] rounded-full overflow-hidden">
                                 <div 
                                   className="h-full bg-[#81B29A] transition-all duration-700 ease-in-out" 
                                   style={{ width: `${currentTrip ? getTripProgress(currentTrip) : 0}%` }}
                                 ></div>
                               </div>
                             </div>
                           )}
                        </div>

                        <button
                          onClick={openActivityModal}
                          className="w-full h-12 border border-dashed border-[#81B29A]/40 rounded-xl text-[#81B29A] text-sm font-bold uppercase tracking-widest hover:bg-[#81B29A]/5 transition-all flex items-center justify-center gap-2"
                        >
                          <Plus size={18} />
                          Add Event
                        </button>

                        <div className="space-y-8">
                          {Object.entries(groupedTripSpots).map(([date, groupSpots]) => (
                            <div key={date}>
                              <h4 className="text-sm font-serif italic text-[#1F363D] mb-4 sticky top-0 bg-[#F9F8F6]/95 backdrop-blur-sm py-3 z-10 border-b border-[#E6E2DD]">
                                {date === 'Unscheduled' ? 'To Be Decided' : new Date(date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                              </h4>
                              <div className="space-y-4 relative border-l border-[#E6E2DD] ml-3 pl-6">
                                {groupSpots.map((spot, idx) => {
                                  const prevSpot = groupSpots[idx - 1];
                                  let dist = null;
                                  if (prevSpot && spot.coordinates && prevSpot.coordinates) {
                                    dist = calculateDistance(
                                      prevSpot.coordinates.lat, prevSpot.coordinates.lng,
                                      spot.coordinates.lat, spot.coordinates.lng
                                    );
                                  }

                                  return (
                                    <div key={spot.id} className="relative">
                                      {dist !== null && spot.type !== SpotType.ACCOMMODATION && prevSpot.type !== SpotType.ACCOMMODATION && (
                                        <div className="absolute -left-[30px] -top-5 bottom-auto h-8 w-px bg-transparent flex flex-col items-center justify-center z-0">
                                          <div className="pl-6 text-[10px] text-[#81B29A] font-bold flex items-center gap-1 whitespace-nowrap bg-[#F9F8F6] py-0.5">
                                            <Footprints size={10} />
                                            {dist < 1 
                                              ? `${Math.round(dist * 1000)}m` 
                                              : `${dist.toFixed(1)}km`
                                            }
                                          </div>
                                        </div>
                                      )}

                                      <div className={`absolute -left-[31px] top-4 w-2.5 h-2.5 rounded-full bg-[#FDFCF8] border-2 z-10 
                                        ${spot.type === SpotType.ACCOMMODATION ? 'border-[#6D597A] w-3 h-3 -left-[32px]' : 'border-[#81B29A]'}`}>
                                      </div>
                                      <SpotCard 
                                        spot={spot} 
                                        isActive={spot.id === activeSpotId}
                                        onDelete={handleDeleteSpot} 
                                        onClick={handleSpotClick} 
                                        onUpdate={handleUpdateSpot}
                                        onViewPhotos={handleViewPhotos}
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                          {tripSpots.length === 0 && (
                            <p className="text-sm font-serif italic text-[#A8A29E] text-center py-4">Your journal is empty.</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* SAVED CONTENT */}
                {activeTab === 'saved' && (
                  <div className="space-y-6 fade-in-up pb-20 md:pb-0">
                     <button
                       onClick={() => setIsAddingSpot(true)}
                       className="w-full h-12 border border-dashed border-[#81B29A]/50 rounded-xl text-[#81B29A] text-sm font-bold uppercase tracking-widest hover:bg-[#81B29A]/10 transition-all flex items-center justify-center gap-2"
                     >
                       <Plus size={18} />
                       Save New Gem
                     </button>

                     {savedSpots.length > 0 ? (
                       <div className="space-y-4">
                         {savedSpots.map((spot) => (
                           <SpotCard 
                             key={spot.id} 
                             spot={spot} 
                             isActive={spot.id === activeSpotId}
                             onDelete={handleDeleteSpot} 
                             onClick={handleSpotClick}
                             onViewPhotos={handleViewPhotos}
                            />
                         ))}
                       </div>
                     ) : (
                       <div className="text-center py-12 text-[#A8A29E]">
                         <MapPin size={32} className="mx-auto mb-3 opacity-30" />
                         <p className="font-serif italic">No saved places yet.</p>
                       </div>
                     )}
                  </div>
                )}
              </div>
            </div>

            {/* Map Container */}
            <div className={`
              flex-1 relative bg-[#E6E2DD] z-10
              ${showMobileMap ? 'block absolute inset-0 md:static' : 'hidden md:block'}
            `}>
              <MapComponent 
                spots={spots} 
                center={mapCenter} 
                activeSpotId={activeSpotId}
                onViewPhotos={handleViewPhotos} 
              />
              
              {/* Mobile Close Map Button */}
              {showMobileMap && (
                 <button 
                  onClick={() => setShowMobileMap(false)}
                  className="md:hidden absolute top-4 left-4 bg-white text-[#1F363D] p-3 rounded-full shadow-lg z-[1000] border border-[#E6E2DD]"
                 >
                   <ArrowLeft size={20} />
                 </button>
              )}

              {/* Saved Place Modal */}
              {isAddingSpot && (
                 <div className="absolute top-6 right-6 bg-[#FDFCF8] p-6 rounded-xl shadow-xl border border-[#E6E2DD] z-[2000] w-80 fade-in-up">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="font-serif italic text-xl text-[#1F363D]">New Discovery</h3>
                      <button onClick={resetAddSpotForm} className="text-[#A8A29E] hover:text-[#81B29A] transition-colors"><X size={18}/></button>
                    </div>
                    
                    <form onSubmit={handleAddSpot} className="space-y-5">
                      <div>
                         <label className="block text-xs font-bold text-[#81B29A] uppercase tracking-widest mb-2">Location</label>
                         <AutocompleteInput 
                           value={newSpotName}
                           onChange={setNewSpotName}
                           onSelect={handleSpotSelect}
                           placeholder="Search..."
                           className="w-full text-sm border-b border-[#E6E2DD] bg-transparent py-2 focus:border-[#81B29A] outline-none text-[#1F363D] placeholder-[#D6D3D1]"
                           required
                           biasLat={mapCenter?.[0]}
                           biasLng={mapCenter?.[1]}
                         />
                      </div>
                      <button 
                       type="submit"
                       disabled={!newSpotCoords}
                       className="w-full h-12 text-xs bg-[#1F363D] text-[#FDFCF8] rounded-full uppercase tracking-widest hover:bg-[#81B29A] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                      >
                       Add to Collection
                      </button>
                    </form>
                 </div>
              )}
            </div>
            
            {/* Mobile Map Toggle FAB */}
            {!showMobileMap && (
              <button
                onClick={() => setShowMobileMap(true)}
                className="md:hidden absolute bottom-20 right-6 bg-[#1F363D] text-white p-4 rounded-full shadow-2xl z-30 flex items-center justify-center hover:scale-105 transition-transform"
              >
                <MapIcon size={24} />
              </button>
            )}
          </>
        )}
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#FDFCF8] border-t border-[#E6E2DD] h-16 flex items-center justify-around z-40 pb-safe">
        <button 
          onClick={() => setActiveTab('plan')}
          className={`flex flex-col items-center justify-center w-full h-full ${activeTab === 'plan' ? 'text-[#1F363D]' : 'text-[#A8A29E]'}`}
        >
          <Home size={20} className={activeTab === 'plan' ? 'fill-current' : ''} />
          <span className="text-[10px] font-bold uppercase tracking-widest mt-1">Plan</span>
        </button>
        <button 
          onClick={() => { setActiveTab('mytrip'); setShowMobileMap(false); }}
          className={`flex flex-col items-center justify-center w-full h-full ${activeTab === 'mytrip' ? 'text-[#81B29A]' : 'text-[#A8A29E]'}`}
        >
          <Briefcase size={20} className={activeTab === 'mytrip' ? 'fill-current' : ''} />
          <span className="text-[10px] font-bold uppercase tracking-widest mt-1">Trips</span>
        </button>
        <button 
          onClick={() => { setActiveTab('saved'); setShowMobileMap(false); }}
          className={`flex flex-col items-center justify-center w-full h-full ${activeTab === 'saved' ? 'text-[#81B29A]' : 'text-[#A8A29E]'}`}
        >
          <Bookmark size={20} className={activeTab === 'saved' ? 'fill-current' : ''} />
          <span className="text-[10px] font-bold uppercase tracking-widest mt-1">Saved</span>
        </button>
      </nav>

      {/* Centered Activity Modal (Global) */}
      {isAddingActivity && (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-[#1F363D]/40 backdrop-blur-sm p-4">
          <div className="bg-[#FDFCF8] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden fade-in-up">
            <div className="px-8 py-6 border-b border-[#E6E2DD] flex justify-between items-center bg-[#F9F8F6]">
              <h3 className="text-xl font-serif italic text-[#1F363D]">Add Event</h3>
              <button onClick={resetActivityForm} className="text-[#A8A29E] hover:text-[#81B29A] transition-colors"><X size={24}/></button>
            </div>
            
            <form onSubmit={handleAddActivity} className="p-8 space-y-6">
              {/* Type Selector */}
              <div className="flex p-1 bg-[#F9F8F6] rounded-lg border border-[#E6E2DD]">
                <button
                  type="button"
                  onClick={() => setActivityType(SpotType.ITINERARY)}
                  className={`flex-1 h-10 text-xs font-bold uppercase tracking-widest rounded-md transition-all ${
                    activityType === SpotType.ITINERARY 
                      ? 'bg-white text-[#1F363D] shadow-sm ring-1 ring-[#E6E2DD]' 
                      : 'text-[#A8A29E] hover:text-[#81B29A]'
                  }`}
                >
                  Activity
                </button>
                <button
                  type="button"
                  onClick={() => setActivityType(SpotType.ACCOMMODATION)}
                  className={`flex-1 h-10 text-xs font-bold uppercase tracking-widest rounded-md transition-all flex items-center justify-center gap-2 ${
                    activityType === SpotType.ACCOMMODATION 
                      ? 'bg-white text-[#6D597A] shadow-sm ring-1 ring-[#E6E2DD]' 
                      : 'text-[#A8A29E] hover:text-[#6D597A]'
                  }`}
                >
                  <BedDouble size={14} /> Base Camp
                </button>
              </div>

              <div>
                 <label className="block text-xs font-bold text-[#81B29A] uppercase tracking-widest mb-2">
                   {activityType === SpotType.ACCOMMODATION ? "Hotel / Place" : "Experience"}
                 </label>
                 <AutocompleteInput 
                   value={activityName}
                   onChange={setActivityName}
                   onSelect={handleActivitySelect}
                   placeholder={activityType === SpotType.ACCOMMODATION ? "Grand Hotel..." : "Museum, Restaurant..."}
                   className="w-full text-base border border-[#E6E2DD] p-3 h-12 rounded-lg focus:border-[#81B29A] outline-none bg-white text-[#1F363D]"
                   required
                   biasLat={mapCenter?.[0]}
                   biasLng={mapCenter?.[1]}
                 />
                 {!activityCoords && activityName.length > 2 && (
                    <p className="text-[10px] text-[#81B29A] mt-2 flex items-center gap-1">
                      <AlertCircle size={10} /> Select from list to locate
                    </p>
                 )}
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="relative z-[2000]">
                  <CalendarInput 
                    label="Date"
                    value={activityDate} 
                    onChange={setActivityDate} 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#81B29A] uppercase tracking-widest mb-2 flex items-center gap-1">
                    <Clock size={12} /> {activityType === SpotType.ACCOMMODATION ? "Check-in Time" : "Time"}
                  </label>
                  <input 
                    type="time"
                    required
                    className="w-full text-sm border border-[#E6E2DD] p-2.5 h-12 rounded-lg focus:border-[#81B29A] outline-none text-[#1F363D] bg-white font-sans"
                    value={activityTime}
                    onChange={e => setActivityTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-4">
                <button 
                  type="submit"
                  disabled={!activityCoords}
                  className={`w-full h-14 text-sm font-bold text-white rounded-full uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg
                    ${activityType === SpotType.ACCOMMODATION 
                      ? 'bg-[#6D597A] hover:bg-[#584863] shadow-[#6D597A]/20' 
                      : 'bg-[#81B29A] hover:bg-[#A63D42] shadow-[#81B29A]/20'
                    }`}
                 >
                  {activityType === SpotType.ACCOMMODATION ? "Set Base Camp" : "Confirm Activity"}
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global Image Lightbox */}
      {lightboxPhotos && (
        <ImageLightbox 
          images={lightboxPhotos} 
          initialIndex={lightboxIndex} 
          onClose={() => setLightboxPhotos(null)} 
        />
      )}
    </div>
  );
}