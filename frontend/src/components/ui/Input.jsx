import React from 'react';

const Input = React.forwardRef(({
 label,
 type = 'text',
 error,
 icon = null,
 className = '',
 id,
 ...props
}, ref) => {
 const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

 return (
 <div className={`flex flex-col gap-1.5 w-full ${className}`}>
 {label && (
 <label 
 htmlFor={inputId} 
 className="text-xs font-semibold text-slate-600 light:text-slate-500 tracking-wide ml-1"
 >
 {label}
 </label>
 )}
 
 <div className="relative flex items-center">
 {icon && (
 <span className="absolute left-4 text-slate-500 flex items-center pointer-events-none">
 {icon}
 </span>
 )}
 
 <input
 id={inputId}
 type={type}
 ref={ref}
 className={`glass-input w-full ${icon ? 'pl-10' : 'pl-4'} ${
 error 
 ? 'border-rose-500/50 focus:border-rose-500 focus:ring-rose-500/20' 
 : ''
 }`}
 {...props}
 />
 </div>

 {error && (
 <span className="text-xs text-rose-500 tracking-wide ml-1 mt-0.5 animate-pulse">
 {error}
 </span>
 )}
 </div>
 );
});

Input.displayName = 'Input';

export default Input;
