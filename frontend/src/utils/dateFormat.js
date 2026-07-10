export const formatDateDisplay = (dateString) => {
  if (!dateString) return 'Select Date';
  const [year, month, day] = dateString.split('-');
  return `${day}-${month}-${year}`;
};

export const formatTimeAgo = (dateString) => {
  const now = new Date();
  const past = new Date(dateString);
  const diffMs = now - past;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffSec < 10) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDays === 1) return 'Yesterday';
  return past.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

export const formatDateTime = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleString();
};

export const formatDate = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString();
};

export const formatTime = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const formatDateTimeFull = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  });
};
