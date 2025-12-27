import React, { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  minDate?: string;
  required?: boolean;
  className?: string;
}

const CalendarInput: React.FC<CalendarInputProps> = ({ 
  value, 
  onChange, 
  label, 
  minDate,
  required,
  className 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  // Parse initial value or default to today
  const initialDate = value ? new Date(value) : new Date();
  const [viewDate, setViewDate] = useState(initialDate);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update view when value changes externally
  useEffect(() => {
    if (value) {
      setViewDate(new Date(value));
    }
  }, [value]);

  const daysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const firstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleDateSelect = (day: number) => {
    // Create date string in YYYY-MM-DD format explicitly using local time
    const selected = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    const year = selected.getFullYear();
    const month = String(selected.getMonth() + 1).padStart(2, '0');
    const dayStr = String(selected.getDate()).padStart(2, '0');
    
    onChange(`${year}-${month}-${dayStr}`);
    setIsOpen(false);
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      viewDate.getMonth() === today.getMonth() &&
      viewDate.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (day: number) => {
    if (!value) return false;
    const selected = new Date(value);
    // Handle potential timezone offset issues by comparing parts
    const currentViewYear = viewDate.getFullYear();
    const currentViewMonth = viewDate.getMonth();
    
    // We parse the value string (YYYY-MM-DD) manually to avoid timezone shifts
    const [valYear, valMonth, valDay] = value.split('-').map(Number);
    
    return (
      day === valDay &&
      currentViewMonth === (valMonth - 1) &&
      currentViewYear === valYear
    );
  };

  const isDisabled = (day: number) => {
    if (!minDate) return false;
    const dateToCheck = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    const min = new Date(minDate);
    // Reset hours to compare just dates
    dateToCheck.setHours(0,0,0,0);
    min.setHours(0,0,0,0);
    return dateToCheck < min;
  };

  const renderDays = () => {
    const totalDays = daysInMonth(viewDate);
    const startDay = firstDayOfMonth(viewDate);
    const days = [];

    // Empty cells for previous month
    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-8 w-8" />);
    }

    // Days of current month
    for (let day = 1; day <= totalDays; day++) {
      const disabled = isDisabled(day);
      const selected = isSelected(day);
      const today = isToday(day);

      days.push(
        <button
          key={day}
          onClick={(e) => {
            e.preventDefault();
            if (!disabled) handleDateSelect(day);
          }}
          disabled={disabled}
          className={`
            h-9 w-9 rounded-full flex items-center justify-center text-sm font-medium transition-all
            ${selected 
              ? 'bg-[#81B29A] text-white shadow-md' 
              : disabled 
                ? 'text-gray-300 cursor-not-allowed' 
                : 'text-[#1F363D] hover:bg-[#E6E2DD]'
            }
            ${today && !selected ? 'border border-[#81B29A] text-[#81B29A]' : ''}
          `}
        >
          {day}
        </button>
      );
    }

    return days;
  };

  const displayDate = value 
    ? new Date(value).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
    : '';

  return (
    <div className="relative w-full" ref={containerRef}>
      {label && (
        <label className="block text-xs font-bold text-[#1F363D] uppercase tracking-widest mb-2 ml-1">
          {label}
        </label>
      )}
      
      <div 
        className="relative cursor-pointer group"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className={`
          w-full px-4 py-3 rounded-xl border bg-white flex items-center justify-between
          transition-all duration-200 outline-none
          ${isOpen ? 'border-[#81B29A] ring-1 ring-[#81B29A]' : 'border-[#E6E2DD] group-hover:border-[#81B29A]'}
          ${className}
        `}>
          <span className={`font-sans text-sm ${value ? 'text-[#1F363D]' : 'text-[#D6D3D1]'}`}>
            {displayDate || 'Select Date'}
          </span>
          <CalendarIcon size={18} className="text-[#A8A29E] group-hover:text-[#81B29A] transition-colors" />
        </div>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 p-4 bg-[#FDFCF8] rounded-2xl shadow-xl border border-[#E6E2DD] z-50 w-72 animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <button 
              onClick={handlePrevMonth}
              className="p-1 hover:bg-[#E6E2DD] rounded-full text-[#1F363D] transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="font-serif font-bold text-[#1F363D]">
              {viewDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </span>
            <button 
              onClick={handleNextMonth}
              className="p-1 hover:bg-[#E6E2DD] rounded-full text-[#1F363D] transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 mb-2">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
              <div key={d} className="h-8 flex items-center justify-center text-[10px] font-bold text-[#81B29A] uppercase tracking-wider">
                {d}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {renderDays()}
          </div>
        </div>
      )}
      
      {/* Hidden input for HTML5 validation if needed */}
      <input 
        type="date" 
        value={value} 
        onChange={() => {}} 
        required={required} 
        className="absolute opacity-0 pointer-events-none bottom-0 left-0 h-0 w-0"
        tabIndex={-1}
      />
    </div>
  );
};

export default CalendarInput;