import React from 'react';

const Badge = ({
  value,
  variant = 'priority', // 'priority' | 'status' | 'custom'
  className = '',
  customColor = '',
}) => {
  if (!value) return null;

  const getPriorityStyle = (priority) => {
    const p = priority.toUpperCase();
    if (p === 'URGENT') {
      return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    }
    if (p === 'HIGH') {
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    }
    if (p === 'MEDIUM') {
      return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
    }
    return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
  };

  const getStatusStyle = (status) => {
    const s = status.toUpperCase().replace(/\s+/g, '_');
    
    switch (s) {
      case 'NEW_EMAIL':
      case 'NEW':
        return 'bg-violet-500/10 text-violet-400 border-violet-500/20';
      case 'PENDING_REVIEW':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'IN_PROGRESS':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
      case 'WAITING_FOR_CLIENT':
        return 'bg-pink-500/10 text-pink-400 border-pink-500/20';
      case 'COMPLETED':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'CANCELLED':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const getStatusLabel = (status) => {
    const s = status.toUpperCase().replace(/\s+/g, '_');
    switch (s) {
      case 'NEW_EMAIL':
        return 'New Email';
      case 'PENDING_REVIEW':
        return 'Pending Review';
      case 'IN_PROGRESS':
        return 'In Progress';
      case 'WAITING_FOR_CLIENT':
        return 'Waiting for Client';
      case 'COMPLETED':
        return 'Completed';
      case 'CANCELLED':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const badgeStyle = variant === 'priority'
    ? getPriorityStyle(value)
    : variant === 'status'
      ? getStatusStyle(value)
      : customColor || 'bg-slate-800 text-slate-300 border-slate-700';

  const label = variant === 'status' ? getStatusLabel(value) : value;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide border uppercase ${badgeStyle} ${className}`}>
      {label}
    </span>
  );
};

export default Badge;
