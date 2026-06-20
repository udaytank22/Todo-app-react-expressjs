import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

const Dropdown = ({
 label,
 options = [], // Can be [{ value, label }] or simple strings
 value,
 onChange,
 error,
 placeholder,
 className = '',
 id,
 disabled,
 placement = 'down',
 ...props
}) => {
 const [isOpen, setIsOpen] = useState(false);
 const dropdownRef = useRef(null);
 const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;

 // Normalize options to [{ value, label }]
 const normalizedOptions = options.map((opt) => {
  if (typeof opt === 'object' && opt !== null) {
   return opt;
  }
  return { value: opt, label: opt };
 });

 const selectedOption = normalizedOptions.find(opt => String(opt.value) === String(value));
 const displayLabel = selectedOption ? selectedOption.label : (placeholder || 'Select...');

 useEffect(() => {
  const handleClickOutside = (event) => {
   if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
    setIsOpen(false);
   }
  };
  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
 }, []);

 const handleSelect = (optValue) => {
  if (disabled) return;
  if (onChange) {
   // Provide a mock event object for compatibility with code that expects e.target.value
   onChange({ target: { value: optValue, name: props.name } });
  }
  setIsOpen(false);
 };

 return (
  <div className={`flex flex-col gap-1.5 w-full ${className}`} ref={dropdownRef}>
   {label && (
    <label 
     htmlFor={selectId} 
     className="text-xs font-semibold text-slate-600 light:text-slate-500 tracking-wide ml-1"
    >
     {label}
    </label>
   )}

   <div className="relative flex items-center">
    <button
     type="button"
     id={selectId}
     disabled={disabled}
     onClick={() => !disabled && setIsOpen(!isOpen)}
     className={`glass-input w-full text-left pr-10 flex items-center justify-between transition-colors ${
      disabled ? 'opacity-60 cursor-not-allowed bg-slate-50 text-slate-500' : 'cursor-pointer hover:bg-slate-50/50'
     } ${
      error 
      ? 'border-rose-500/50 focus:border-rose-500 focus:ring-rose-500/20' 
      : 'focus:border-sky-500/50 focus:ring-sky-500/20'
     }`}
     {...props}
    >
     <span className={`block truncate ${!selectedOption && !value ? 'text-slate-400' : 'text-slate-800'}`}>
      {displayLabel}
     </span>
     <ChevronDown className={`absolute right-4 h-4 w-4 text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
    </button>
    
    {isOpen && (
     <div className={`absolute left-0 w-full bg-white/95 backdrop-blur-md border border-slate-200/60 rounded-xl shadow-xl z-50 py-1 max-h-60 overflow-y-auto overflow-x-hidden ${
      placement === 'up' ? 'bottom-full mb-1' : 'top-full mt-1'
     }`}>
      {placeholder && (
       <button
        type="button"
        onClick={() => handleSelect('')}
        className="w-full text-left px-4 py-2 text-sm text-slate-500 hover:bg-slate-50 transition-colors"
       >
        {placeholder}
       </button>
      )}
      {normalizedOptions.map((opt) => (
       <button
        type="button"
        key={opt.value}
        onClick={() => handleSelect(opt.value)}
        className={`w-full text-left px-4 py-2 text-sm transition-colors ${
         String(value) === String(opt.value) 
         ? 'bg-sky-50 text-sky-600 font-medium' 
         : 'text-slate-700 hover:bg-slate-50'
        }`}
       >
        {opt.label}
       </button>
      ))}
     </div>
    )}
   </div>

   {error && (
    <span className="text-xs text-rose-500 tracking-wide ml-1 mt-0.5 animate-pulse">
     {error}
    </span>
   )}
  </div>
 );
};

export default Dropdown;
