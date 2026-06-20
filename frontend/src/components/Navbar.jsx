

const Navbar = ({ isMailConnected, isDemoMode, searchVal, onSearchChange }) => {


  const handleConnectMail = () => {
    // Redirect to Microsoft OAuth auth url
    window.open('/api/emails/connect', '_blank');
  };

  return (
    <header className="h-10 min-h-14 px-5 glass-panel border-x-0 border-t-0 border-b border-black/5 flex items-center justify-between transition-all duration-300">
      {/* Search Input */}
      <div className="w-96">
        {onSearchChange && (
          <div className="relative">
            <input
              type="text"
              placeholder="Search inquiries, customer, subject..."
              value={searchVal || ''}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-white/50 border border-black/5 rounded-xl px-2 py-1.5 text-sm outline-none transition-all focus:border-sky-500/30 focus:ring-2 focus:ring-sky-500/10 placeholder-slate-500 text-slate-800 "
            />
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-4">
        {/* Connection status indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/50 border border-black/5 text-[10px]">
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
            <div className="flex items-center gap-2">
              <span className="text-rose-400 font-bold flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
                Offline
              </span>
              <button
                onClick={handleConnectMail}
                className="bg-blue-600 hover:bg-blue-500 text-white px-2 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider transition-colors shadow-sm cursor-pointer"
              >
                Reconnect Microsoft
              </button>
            </div>
          )}
        </div>

        {/* Theme Toggle 
 <button
 onClick={toggleTheme}
 className="p-2.5 rounded-xl border border-black/5 hover:bg-slate-100/40 text-slate-600 hover:text-slate-900 transition-all outline-none"
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
