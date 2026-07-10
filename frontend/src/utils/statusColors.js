export const STATUS_COLORS = {
  PENDING: {
    badge: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    dot: 'bg-slate-300',
    navbar: 'text-sky-500 bg-sky-50',
  },
  IN_PROGRESS: {
    badge: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    dot: 'bg-amber-400',
    navbar: 'text-sky-500 bg-sky-50',
  },
  COMPLETED: {
    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    dot: 'bg-emerald-400',
    navbar: 'text-sky-500 bg-sky-50',
  },
  CANCELLED: {
    badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    dot: 'bg-slate-300',
    navbar: 'text-sky-500 bg-sky-50',
  },
};

export const PRIORITY_COLORS = {
  URGENT: {
    badge: 'bg-red-500/10 text-red-500 border-red-500/20',
  },
  HIGH: {
    badge: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  },
  MEDIUM: {
    badge: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  },
  LOW: {
    badge: 'bg-green-500/10 text-green-500 border-green-500/20',
  },
};
