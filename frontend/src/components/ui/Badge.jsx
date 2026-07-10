import React from 'react';
import { STATUS_COLORS, PRIORITY_COLORS } from '../../utils/statusColors';

const Badge = ({
  value,
  variant = 'priority', // 'priority' | 'status' | 'custom'
  className = '',
  customColor = '',
}) => {
  if (!value) return null;

  const getPriorityStyle = (priority) => {
    const p = priority.toUpperCase();
    return PRIORITY_COLORS[p]?.badge || 'bg-slate-500/10 text-slate-600 border-slate-500/20';
  };

  const getStatusStyle = (status) => {
    const s = status.toUpperCase().replace(/\s+/g, '_');
    return STATUS_COLORS[s]?.badge || 'bg-slate-500/10 text-slate-600 border-slate-500/20';
  };

  const getStatusLabel = (status) => {
    const s = status.toUpperCase().replace(/\s+/g, '_');
    switch (s) {
      case 'PENDING':
        return 'Pending';
      case 'IN_PROGRESS':
        return 'In Progress';
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
      : customColor || 'bg-slate-100 text-slate-700 border-slate-700';

  const label = variant === 'status' ? getStatusLabel(value) : value;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold tracking-wide border uppercase ${badgeStyle} ${className}`}>
      {label}
    </span>
  );
};

export default Badge;
