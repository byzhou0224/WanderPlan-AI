import React, { useState, useEffect, useRef } from 'react';
import { searchPlaces } from '../services/nominatim';
import { MapPin, Loader2 } from 'lucide-react';

interface Suggestion {
  name: string;
  title: string;
  subtitle: string;
  lat: number;
  lng: number;
}

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (suggestion: Suggestion) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  biasLat?: number;
  biasLng?: number;
  onlyCities?: boolean;
}

const AutocompleteInput: React.FC<AutocompleteInputProps> = ({ 
  value, 
  onChange, 
  onSelect, 
  placeholder, 
  className,
  required,
  biasLat,
  biasLng,
  onlyCities
}) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);

    if (newValue.length >= 2) {
      setLoading(true);
      debounceTimeout.current = setTimeout(async () => {
        const results = await searchPlaces(newValue, biasLat, biasLng, { onlyCities });
        setSuggestions(results);
        setLoading(false);
        setShowSuggestions(true);
      }, 400);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelect = (suggestion: Suggestion) => {
    onChange(suggestion.name);
    onSelect(suggestion);
    setShowSuggestions(false);
  };

  return (
    <div ref={wrapperRef} className="relative w-full z-[3000]">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          className={`${className} shadow-sm`}
          required={required}
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="animate-spin text-[#A8A29E]" size={16} />
          </div>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute z-[9999] w-full mt-2 bg-[#FDFCF8] border border-[#E6E2DD] rounded-xl shadow-xl max-h-80 overflow-y-auto left-0 top-full overflow-hidden">
          {suggestions.map((s, index) => (
            <li
              key={index}
              onClick={() => handleSelect(s)}
              className="px-5 py-4 hover:bg-[#F9F8F6] cursor-pointer flex items-start gap-4 border-b border-[#E6E2DD] last:border-0 transition-colors group"
            >
              <div className="bg-[#E6E2DD]/50 p-2 rounded-full shrink-0 mt-0.5 group-hover:bg-[#E6E2DD] transition-colors">
                <MapPin size={16} className="text-[#1F363D]" />
              </div>
              <div className="flex flex-col text-left">
                <span className="font-serif text-[#1F363D] text-base leading-tight">
                  {s.title}
                </span>
                {s.subtitle && (
                  <span className="text-xs text-[#A8A29E] mt-1 font-sans uppercase tracking-wide">
                    {s.subtitle}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AutocompleteInput;