import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md', // 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
  className = '',
  bodyClassName = '',
  hideHeader = false,
  closeOnBackdropClick = true,
}) => {
  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-6xl',
    full: 'max-w-none w-screen h-screen rounded-none border-none shadow-none',
  };

  const isFull = size === 'full';

  return ReactDOM.createPortal(
    <div className={`fixed inset-0 z-[100] flex items-center justify-center ${isFull ? 'p-0' : 'p-4'} overflow-y-auto`}>
      {/* Backdrop with Blur */}
      <div 
        className="fixed inset-0 bg-slate-50/60 backdrop-blur-sm transition-opacity duration-300 animate-fadeIn"
        onClick={closeOnBackdropClick ? onClose : undefined}
      />

      {/* Modal Dialog Window */}
      <div className={`glass-panel w-full ${sizes[size] || sizes.md} rounded-2xl relative shadow-2xl overflow-hidden animate-scaleIn z-10 ${isFull ? 'h-screen flex flex-col' : ''} ${className}`}>
        {/* Header */}
        {!hideHeader && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 flex-shrink-0">
            {title && (
              <h3 className="text-sm font-bold font-sans tracking-wide text-slate-900 ">
                {title}
              </h3>
            )}
            
            <button
              onClick={onClose}
              className="text-slate-600 hover:text-slate-800 p-1.5 rounded-lg hover:bg-white/5 transition-all outline-none"
              aria-label="Close modal"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className={`overflow-y-auto text-slate-700 ${isFull ? 'flex-1 p-0 max-h-none' : 'p-6 max-h-[calc(100vh-12rem)]'} ${footer && !isFull ? 'pb-4' : ''} ${bodyClassName}`}>
          {children}
        </div>

        {/* Footer */}
        {footer && !isFull && (
          <div className="px-6 py-4 border-t border-black/5 bg-slate-50/50 rounded-b-2xl flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default Modal;
