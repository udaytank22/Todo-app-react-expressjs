import React from 'react';

const Button = ({
  children,
  onClick,
  type = 'button',
  variant = 'primary', // 'primary' | 'secondary' | 'success' | 'danger' | 'ghost' | 'glass'
  size = 'md', // 'sm' | 'md' | 'lg'
  isLoading = false,
  disabled = false,
  icon = null,
  className = '',
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]';
  
  const sizes = {
    sm: 'px-3.5 py-1.5 text-xs gap-1.5',
    md: 'px-5 py-2.5 text-sm gap-2',
    lg: 'px-6 py-3.5 text-base gap-2.5',
  };

  const variants = {
    primary: 'bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-white shadow-lg shadow-sky-500/10 focus:ring-sky-500/20 border border-sky-400/20',
    secondary: 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700/50 focus:ring-slate-700/20',
    success: 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-lg shadow-emerald-500/10 focus:ring-emerald-500/20 border border-emerald-400/20',
    danger: 'bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 text-white shadow-lg shadow-rose-500/10 focus:ring-rose-500/20 border border-rose-400/20',
    ghost: 'hover:bg-slate-800/40 text-slate-400 hover:text-slate-100 focus:ring-slate-800/10',
    glass: 'glass-panel hover:bg-slate-800/30 text-slate-100 border border-white/5 focus:ring-white/10',
  };

  // Adjust for light mode overrides where appropriate
  const lightVariants = {
    secondary: 'light:bg-slate-100 light:hover:bg-slate-200 light:text-slate-800 light:border-slate-200',
    ghost: 'light:hover:bg-slate-100/60 light:text-slate-500 light:hover:text-slate-800',
    glass: 'light:glass-panel light:hover:bg-slate-50/50 light:text-slate-800 light:border-slate-200/50',
  };

  const currentVariant = `${variants[variant] || variants.primary} ${lightVariants[variant] || ''}`;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`${baseStyles} ${sizes[size]} ${currentVariant} ${className}`}
      {...props}
    >
      {isLoading ? (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        icon && <span className="flex items-center">{icon}</span>
      )}
      <span>{children}</span>
    </button>
  );
};

export default Button;
