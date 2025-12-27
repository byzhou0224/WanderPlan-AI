import React, { useState, useRef } from 'react';
import { Spot, SpotType } from '../types';
import { MapPin, Calendar, Clock, CheckCircle2, CircleDashed, Edit2, Save, X, ExternalLink, Camera, Image as ImageIcon, Trash2, Plus, BedDouble } from 'lucide-react';

interface SpotCardProps {
  spot: Spot;
  isActive?: boolean;
  onDelete?: (id: string) => void;
  onClick?: (spot: Spot) => void;
  onUpdate?: (id: string, updates: Partial<Spot>) => void;
  onViewPhotos?: (photos: string[], index: number) => void;
}

const SpotCard: React.FC<SpotCardProps> = ({ spot, isActive, onDelete, onClick, onUpdate, onViewPhotos }) => {
  const isVisited = spot.type === SpotType.VISITED;
  const isItinerary = spot.type === SpotType.ITINERARY;
  const isAccommodation = spot.type === SpotType.ACCOMMODATION;
  
  const [isEditing, setIsEditing] = useState(false);
  const [editDate, setEditDate] = useState(spot.itineraryTime ? spot.itineraryTime.slice(0, 16) : '');
  const [editDesc, setEditDesc] = useState(spot.description || '');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onUpdate) {
      onUpdate(spot.id, {
        description: editDesc,
        itineraryTime: editDate ? new Date(editDate).toISOString() : undefined
      });
    }
    setIsEditing(false);
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(false);
    setEditDate(spot.itineraryTime ? spot.itineraryTime.slice(0, 16) : '');
    setEditDesc(spot.description || '');
  };

  const handleVisitWebsite = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = spot.website || `https://www.google.com/search?q=${encodeURIComponent(spot.name + ' ' + (spot.description || ''))}`;
    window.open(url, '_blank');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && onUpdate) {
      const newPhotos: string[] = [];
      const files = Array.from(e.target.files);
      let processedCount = 0;

      files.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            newPhotos.push(reader.result);
          }
          processedCount++;
          if (processedCount === files.length) {
            // All processed, update state
            onUpdate(spot.id, {
              photos: [...(spot.photos || []), ...newPhotos]
            });
          }
        };
        reader.readAsDataURL(file);
      });
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDeletePhoto = (e: React.MouseEvent, indexToRemove: number) => {
    e.stopPropagation();
    if (onUpdate && spot.photos) {
      const updatedPhotos = spot.photos.filter((_, idx) => idx !== indexToRemove);
      onUpdate(spot.id, { photos: updatedPhotos });
    }
  };

  const handleImageClick = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    if (onViewPhotos && spot.photos) {
      onViewPhotos(spot.photos, index);
    }
  };

  // Styling helpers based on type
  const getCardStyle = () => {
    let base = "bg-white border-[#E6E2DD]";
    if (isVisited) base = "bg-[#F0F5F2] border-[#81B29A]/30"; // Soft Sage
    
    // Highlight if active
    if (isActive) {
      if (isAccommodation) {
        base += " ring-2 ring-[#6D597A] border-[#6D597A] shadow-md scale-[1.01]";
      } else {
        base += " ring-2 ring-[#BC4B51] border-[#BC4B51] shadow-md scale-[1.01]";
      }
    } else if (isAccommodation) {
        base = "bg-[#FAF9FC] border-[#6D597A]/20"; // Very light purple bg
    }
    
    return base;
  };

  const getIcon = () => {
    if (isVisited) return <CheckCircle2 size={18} className="text-[#81B29A]" />;
    if (isItinerary) return <Clock size={18} className="text-[#BC4B51]" />;
    if (isAccommodation) return <BedDouble size={18} className="text-[#6D597A]" />;
    return <CircleDashed size={18} className="text-[#1F363D]" />;
  };

  // Editing Mode
  if (isEditing) {
    return (
      <div className="p-5 rounded-xl border border-[#BC4B51]/30 bg-[#FDFCF8] shadow-lg cursor-default font-sans w-full">
         <div className="space-y-4">
            <h4 className="font-serif italic font-semibold text-[#1F363D] text-lg">{spot.name}</h4>
            
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#81B29A] uppercase tracking-widest">Time</label>
              <input 
                type="datetime-local" 
                className="w-full text-base p-3 border border-[#E6E2DD] rounded-lg bg-white text-[#1F363D] outline-none focus:border-[#BC4B51] h-12"
                value={editDate}
                onChange={e => setEditDate(e.target.value)}
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#81B29A] uppercase tracking-widest">Notes</label>
              <textarea 
                className="w-full text-base p-3 border border-[#E6E2DD] rounded-lg bg-white text-[#1F363D] outline-none focus:border-[#BC4B51]"
                rows={3}
                value={editDesc}
                onChange={e => setEditDesc(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
               <button onClick={handleCancel} className="p-2 text-[#A8A29E] hover:text-[#1F363D] transition-colors">
                 <X size={24} />
               </button>
               <button onClick={handleSave} className="p-2 text-[#BC4B51] hover:text-[#A63D42] transition-colors">
                 <Save size={24} />
               </button>
            </div>
         </div>
      </div>
    );
  }

  return (
    <>
      <div 
        className={`group relative p-5 rounded-xl border transition-all hover:shadow-lg cursor-pointer duration-300 w-full
          ${getCardStyle()}`}
        onClick={() => onClick && onClick(spot)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 pr-8 w-full">
            <div className="flex items-center gap-3 mb-2">
              {getIcon()}
              <h4 className={`font-serif text-lg leading-snug ${isAccommodation ? 'text-[#6D597A] font-bold' : 'text-[#1F363D]'}`}>
                {spot.name}
              </h4>
            </div>
            
            {/* Description - Expands when active */}
            <div className={`text-sm md:text-base text-[#78716C] font-sans leading-relaxed mb-3 transition-all duration-300 ${isActive ? '' : 'line-clamp-2'}`}>
              {spot.description || "No description provided."}
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
              {spot.itineraryTime && (
                <span className={`inline-flex items-center text-xs font-bold uppercase tracking-wider px-2 py-1 rounded
                   ${isAccommodation ? 'text-[#6D597A] bg-[#6D597A]/5' : 'text-[#BC4B51] bg-[#BC4B51]/5'}`}>
                  <Calendar size={12} className="mr-1.5" />
                  {new Date(spot.itineraryTime).toLocaleDateString(undefined, {weekday: 'short', month: 'short', day:'numeric'})}
                  {!isAccommodation && (
                    <>
                      <span className="mx-1">•</span>
                      {new Date(spot.itineraryTime).toLocaleTimeString(undefined, {hour: '2-digit', minute:'2-digit'})}
                    </>
                  )}
                </span>
              )}
              {spot.visitedDate && (
                <span className="inline-flex items-center text-xs text-[#5B8C5A] font-bold uppercase tracking-wider bg-[#5B8C5A]/10 px-2 py-1 rounded">
                  <CheckCircle2 size={12} className="mr-1.5" />
                  Visited {new Date(spot.visitedDate).toLocaleDateString()}
                </span>
              )}
              {isAccommodation && (
                <span className="inline-flex items-center text-xs text-[#6D597A] font-bold uppercase tracking-wider bg-[#6D597A]/5 px-2 py-1 rounded border border-[#6D597A]/20">
                   Base Camp
                </span>
              )}
            </div>
            
            {/* Expanded Content: Photos & Actions */}
            {isActive && (
              <div className="mt-4 pt-4 border-t border-[#E6E2DD] animate-in fade-in slide-in-from-top-2 duration-300">
                {/* Photo Grid */}
                {spot.photos && spot.photos.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    {spot.photos.map((photo, idx) => (
                      <div 
                        key={idx} 
                        className="relative aspect-square rounded-lg overflow-hidden group/photo cursor-zoom-in"
                        onClick={(e) => handleImageClick(e, idx)}
                      >
                        <img src={photo} alt={`Memory ${idx}`} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/0 group-hover/photo:bg-black/20 transition-colors" />
                        <button 
                          onClick={(e) => handleDeletePhoto(e, idx)}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover/photo:opacity-100 transition-opacity transform scale-75"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-6 mt-4">
                   <button 
                    onClick={handleVisitWebsite}
                    className="p-2 text-xs font-bold uppercase tracking-widest text-[#1F363D] hover:text-[#BC4B51] flex items-center gap-2 transition-colors border border-[#E6E2DD] rounded-lg"
                  >
                    <ExternalLink size={16} />
                    Search
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="p-2 text-xs font-bold uppercase tracking-widest text-[#1F363D] hover:text-[#BC4B51] flex items-center gap-2 transition-colors border border-[#E6E2DD] rounded-lg"
                  >
                    <Camera size={16} />
                    Add Photo
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    multiple 
                    onChange={handleFileSelect}
                  />
                </div>
              </div>
            )}
            
            {!isActive && (
               <button 
                onClick={handleVisitWebsite}
                className="text-xs font-bold uppercase tracking-widest text-[#1F363D] hover:text-[#BC4B51] flex items-center gap-1 transition-colors border-b border-transparent hover:border-[#BC4B51] pb-0.5 w-fit mt-2"
              >
                <ExternalLink size={12} />
                Search
              </button>
            )}
          </div>
        </div>
        
        {/* Top Right Action Buttons */}
        <div className={`absolute top-3 right-3 flex gap-1 transition-opacity ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          {(isItinerary || isAccommodation) && onUpdate && (
            <button 
              onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
              className="p-2 text-[#A8A29E] hover:text-[#1F363D] rounded-full hover:bg-black/5"
              title="Edit"
            >
              <Edit2 size={18} />
            </button>
          )}
          {onDelete && (
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(spot.id); }}
              className="p-2 text-[#A8A29E] hover:text-[#BC4B51] rounded-full hover:bg-black/5"
              title="Delete"
            >
              &times;
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default SpotCard;