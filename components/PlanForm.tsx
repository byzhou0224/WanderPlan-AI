import React, { useState, useRef } from 'react';
import { ChillLevel, TripRequest } from '../types';
import { Loader2, Sparkles, MapPin, ImagePlus, X } from 'lucide-react';
import AutocompleteInput from './AutocompleteInput';
import CalendarInput from './CalendarInput';

interface PlanFormProps {
  onGenerate: (request: TripRequest) => void;
  isLoading: boolean;
}

const PlanForm: React.FC<PlanFormProps> = ({ onGenerate, isLoading }) => {
  const [destination, setDestination] = useState('');
  const [days, setDays] = useState(3);
  const [chillLevel, setChillLevel] = useState<ChillLevel>(ChillLevel.BALANCED);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [images, setImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination) return;
    onGenerate({
      destination,
      days,
      chillLevel,
      startDate,
      images
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newImages: string[] = [];
      const files = Array.from(e.target.files);
      let processedCount = 0;

      files.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            newImages.push(reader.result);
          }
          processedCount++;
          if (processedCount === files.length) {
            setImages(prev => [...prev, ...newImages]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  return (
    <div className="w-full">
      <div className="flex flex-col items-center mb-4">
       
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-xs font-bold text-[#1F363D] uppercase tracking-widest mb-2 ml-1">Destination</label>
          <div className="relative">
             <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A29E] pointer-events-none z-10">
               <MapPin size={20} />
             </div>
             {/* AutocompleteInput has internal z-3000, so it will sit above the calendar if they overlap */}
             <AutocompleteInput
              value={destination}
              onChange={setDestination}
              onSelect={(s) => setDestination(s.name)}
              placeholder="Where do you dream of going?"
              required
              onlyCities={true}
              className="w-full pl-4 pr-4 py-3 h-12 rounded-xl border border-[#E6E2DD] bg-white focus:ring-1 focus:ring-[#81B29A] focus:border-[#81B29A] outline-none transition-all text-[#1F363D] placeholder-[#D6D3D1] font-serif text-base"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 md:gap-6">
          {/* Lower z-index than Autocomplete (3000) but higher than subsequent elements */}
          <div className="relative z-[2000]">
            <CalendarInput 
              label="Start Date"
              value={startDate} 
              onChange={setStartDate} 
              required
              minDate={new Date().toISOString().split('T')[0]}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#1F363D] uppercase tracking-widest mb-2 ml-1">Duration</label>
            <div className="relative">
               <input
                type="number"
                min={1}
                max={14}
                required
                placeholder="Days"
                className="w-full px-4 py-3 h-12 rounded-xl border border-[#E6E2DD] bg-white focus:ring-1 focus:ring-[#81B29A] focus:border-[#81B29A] outline-none transition-all text-[#1F363D] font-sans text-base [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                value={days}
                onChange={(e) => setDays(parseInt(e.target.value))}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[#A8A29E] font-bold uppercase pointer-events-none">Days</span>
            </div>
          </div>
        </div>

        <div className="relative z-10">
          <label className="block text-xs font-bold text-[#1F363D] uppercase tracking-widest mb-2 ml-1">Vibe</label>
          <select
            className="w-full px-4 py-3 h-12 rounded-xl border border-[#E6E2DD] bg-white focus:ring-1 focus:ring-[#81B29A] focus:border-[#81B29A] outline-none transition-all text-[#1F363D] font-serif text-base cursor-pointer appearance-none"
            value={chillLevel}
            onChange={(e) => setChillLevel(e.target.value as ChillLevel)}
            style={{ backgroundImage: 'none' }} 
          >
            {Object.values(ChillLevel).map((level) => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>
        </div>

        {/* Image Upload for Context */}
        <div className="relative z-0">
           <label className="block text-xs font-bold text-[#1F363D] uppercase tracking-widest mb-2 ml-1">Inspiration</label>
           <div className="border border-dashed border-[#81B29A]/50 rounded-xl p-3 bg-[#F0F5F2]/30">
              <div className="flex flex-wrap gap-3">
                {images.map((img, idx) => (
                  <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden shadow-sm group">
                    <img src={img} alt="preview" className="w-full h-full object-cover" />
                    <button 
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
                    >
                      <X size={20} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-16 h-16 rounded-lg border border-dashed border-[#81B29A] flex items-center justify-center text-[#81B29A] hover:bg-[#81B29A]/10 transition-colors"
                  title="Upload screenshot or photo"
                >
                  <ImagePlus size={24} />
                </button>
              </div>
              <p className="text-[10px] text-[#81B29A] mt-2 font-medium">
                Turn screenshots into an itinerary.
              </p>
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

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-[#1F363D] hover:bg-[#81B29A] text-white text-sm font-bold uppercase tracking-widest py-4 h-14 rounded-full transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed mt-6 shadow-xl relative z-0"
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              Curating...
            </>
          ) : (
            <>
              <Sparkles size={20} />
              Create My Journey
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default PlanForm;