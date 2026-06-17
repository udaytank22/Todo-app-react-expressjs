import React from 'react';

const Card = ({
  children,
  className = '',
  hoverEffect = false,
  onClick,
  ...props
}) => {
  const isClickable = !!onClick;
  
  const hoverStyles = hoverEffect
    ? 'hover:border-sky-500/30 hover:shadow-lg hover:shadow-sky-500/5 transition-all duration-300'
    : '';

  const clickableStyles = isClickable
    ? 'cursor-pointer hover:scale-[1.005] active:scale-[0.995]'
    : '';

  return (
    <div
      onClick={onClick}
      className={`glass-panel rounded-2xl p-6 ${hoverStyles} ${clickableStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
