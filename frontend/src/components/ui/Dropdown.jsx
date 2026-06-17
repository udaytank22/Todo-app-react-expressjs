import React from 'react';

const Dropdown = ({
  label,
  options = [], // Can be [{ value, label }] or simple strings
  value,
  onChange,
  error,
  placeholder,
  className = '',
  id,
  ...props
}) => {
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;

  // Normalize options to [{ value, label }]
  const normalizedOptions = options.map((opt) => {
    if (typeof opt === 'object' && opt !== null) {
      return opt;
    }
    return { value: opt, label: opt };
  });

  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`}>
      {label && (
        <label 
          htmlFor={selectId} 
          className="text-xs font-semibold text-slate-400 light:text-slate-500 tracking-wide ml-1"
        >
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        <select
          id={selectId}
          value={value || ''}
          onChange={onChange}
          className={`glass-input w-full appearance-none pr-10 cursor-pointer ${
            error 
              ? 'border-rose-500/50 focus:border-rose-500 focus:ring-rose-500/20' 
              : ''
          }`}
          {...props}
        >
          {placeholder && (
            <option value="" disabled className="bg-slate-900 text-slate-400">
              {placeholder}
            </option>
          )}
          {normalizedOptions.map((opt) => (
            <option 
              key={opt.value} 
              value={opt.value}
              className="bg-slate-900 text-slate-200 hover:bg-slate-800"
            >
              {opt.label}
            </option>
          ))}
        </select>
        
        {/* Custom Chevron Icon */}
        <div className="absolute right-4 pointer-events-none text-slate-400 flex items-center">
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
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
