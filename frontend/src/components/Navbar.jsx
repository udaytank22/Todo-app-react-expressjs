import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, RotateCw, RefreshCw, Mail } from 'lucide-react';
import Button from './ui/Button';

const Navbar = ({ isMailConnected, isDemoMode, onSyncSuccess, searchVal, onSearchChange }) => {
  const { isDark, toggleTheme } = useTheme();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncMail = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch('/api/emails/fetch', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();

      if (response.ok) {
        // Trigger page alert or toast notification summary
        onSyncSuccess(data);
      } else {
        alert(data.error || 'Failed to sync emails.');
      }
    } catch (error) {
      console.error('Email syncing failed:', error);
      alert('Email syncing connection failed.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleConnectMail = () => {
    // Redirect to Microsoft OAuth auth url
    window.open('/api/emails/connect', '_blank');
  };

  return (
    <header className="h-16 min-h-16 px-6 glass-panel border-x-0 border-t-0 border-b border-white/5 light:border-slate-200/50 flex items-center justify-between transition-all duration-300">
      {/* Search Input */}
      <div className="w-96">
        {onSearchChange && (
          <div className="relative">
            <input
              type="text"
              placeholder="Search inquiries, customer, subject..."
              value={searchVal || ''}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-slate-900/50 light:bg-slate-50/80 border border-white/5 light:border-slate-200/50 rounded-xl px-4 py-2 text-sm outline-none transition-all focus:border-sky-500/30 focus:ring-2 focus:ring-sky-500/10 placeholder-slate-500 text-slate-200 light:text-slate-800"
            />
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-4">
        {/* Connection status indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/50 light:bg-slate-50/70 border border-white/5 light:border-slate-200/50 text-[10px]">
          <span className="text-slate-500 font-semibold uppercase tracking-wider">
            Outlook Mailbox:
          </span>
          {isDemoMode ? (
            <span className="text-amber-400 font-bold flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse"></span>
              Simulated
            </span>
          ) : isMailConnected ? (
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Connected
            </span>
          ) : (
            <span className="text-rose-400 font-bold flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
              Offline
            </span>
          )}
        </div>

        {/* Theme Toggle 
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-xl border border-white/5 hover:bg-slate-800/40 text-slate-400 hover:text-slate-100 transition-all outline-none"
          aria-label="Toggle visual theme"
        >
          {isDark ? (
            <Sun className="h-4 w-4 text-sky-400" />
          ) : (
            <Moon className="h-4 w-4 text-sky-600" />
          )}
        </button>
        */}
      </div>
    </header>
  );
};

export default Navbar;
