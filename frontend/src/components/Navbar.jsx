import React, { useState, useEffect, useRef } from 'react';
import { authService } from '../services/authService';
import { chatService } from '../services/chatService';
import { searchService } from '../services/searchService';
import { useAuth } from '../context/AuthContext';
import { MessageSquare, X, Send, ChevronLeft, Loader2, Grid } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Navbar = ({ socket, isMailConnected, isDemoMode, searchVal, onSearchChange }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [unreadCounts, setUnreadCounts] = useState({});

  const popoverRef = useRef(null);
  const messagesEndRef = useRef(null);
  const searchRef = useRef(null);

  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

  const handleConnectMail = () => {
    window.open('/api/emails/connect', '_blank');
  };

  const fetchUsers = async () => {
    try {
      const data = await authService.getUsers();
      setUsers(data.filter((u) => u.id !== user?.id));
    } catch (err) {
      console.error('Failed to load users for chat:', err);
    }
  };

  const fetchHistory = async (userId) => {
    try {
      const data = await chatService.getChatHistory(userId);
      setMessages(data);
    } catch (err) {
      console.error('Failed to load chat history:', err);
    }
  };

  const selectUser = (otherUser) => {
    setSelectedUser(otherUser);
    setUnreadCounts((prev) => ({
      ...prev,
      [otherUser.id]: 0,
    }));
  };

  useEffect(() => {
    if (isChatOpen) {
      fetchUsers();
    }
  }, [isChatOpen]);

  useEffect(() => {
    if (selectedUser) {
      fetchHistory(selectedUser.id);
    }
  }, [selectedUser]);

  useEffect(() => {
    if (!socket) return;

    const handleIncomingMessage = (message) => {
      // If we are actively chatting with the sender or we sent it
      if (
        selectedUser &&
        (message.senderId === selectedUser.id || message.receiverId === selectedUser.id)
      ) {
        setMessages((prev) => [...prev, message]);
      } else {
        // Increment unread count for the sender
        if (message.senderId !== user?.id) {
          setUnreadCounts((prev) => ({
            ...prev,
            [message.senderId]: (prev[message.senderId] || 0) + 1,
          }));
        }
      }
    };

    socket.on('receive_direct_message', handleIncomingMessage);

    return () => {
      socket.off('receive_direct_message', handleIncomingMessage);
    };
  }, [socket, selectedUser, user?.id]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setIsChatOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!globalSearchQuery || globalSearchQuery.trim().length === 0) {
      setSearchResults([]);
      setIsSearchOpen(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const data = await searchService.searchInquiries(globalSearchQuery);
        setSearchResults(data);
        setIsSearchOpen(true);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [globalSearchQuery]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedUser || !socket) return;

    socket.emit('send_direct_message', {
      receiverId: selectedUser.id,
      content: messageInput.trim(),
    });
    setMessageInput('');
  };

  return (
    <header className="h-10 min-h-14 px-5 glass-panel border-x-0 border-t-0 border-b border-black/5 flex items-center justify-between transition-all duration-300 relative z-30">
      <div className="w-96">
        <div className="relative" ref={searchRef}>
          <input
            type="text"
            placeholder="Search inquiries, customer, subject..."
            value={globalSearchQuery}
            onChange={(e) => setGlobalSearchQuery(e.target.value)}
            onFocus={() => { if (globalSearchQuery && globalSearchQuery.trim().length > 0) setIsSearchOpen(true); }}
            className="w-full bg-white/50 border border-black/5 rounded-xl px-2 py-1.5 text-sm outline-none transition-all focus:border-sky-500/30 focus:ring-2 focus:ring-sky-500/10 placeholder-slate-500 text-slate-800"
          />
          {isSearchOpen && (
            <div className="absolute top-full left-0 w-full mt-1 bg-white border border-black/10 rounded-xl shadow-xl overflow-hidden z-50">
              {isSearching ? (
                <div className="p-4 flex justify-center text-slate-400">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : searchResults.length > 0 ? (
                <div className="max-h-64 overflow-y-auto">
                  {searchResults.map((result) => (
                    <div
                      key={result.id}
                      onClick={() => {
                        setIsSearchOpen(false);
                        navigate(`/inquiry/${result.id}`);
                      }}
                      className="p-3 hover:bg-slate-50 cursor-pointer border-b border-black/5 last:border-0"
                    >
                      <div className="text-sm font-semibold text-slate-800 truncate">{result.subject}</div>
                      <div className="text-xs text-slate-500 flex justify-between mt-1">
                        <span className="truncate max-w-[70%]">{result.customerName}</span>
                        <span className="uppercase text-[9px] font-bold text-sky-500 bg-sky-50 px-1.5 py-0.5 rounded">{result.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-sm text-slate-500 text-center">No matching inquiries found.</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-4 relative" ref={popoverRef}>
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

        {/* Chat Toggle Button */}
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="p-2 rounded-xl bg-white/50 border border-black/5 hover:bg-white/80 transition-all text-slate-600 hover:text-slate-900 cursor-pointer relative"
          title="Direct Messages"
        >
          <MessageSquare className="h-4 w-4" />
          {totalUnread > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full text-[9px] font-bold w-[18px] h-[18px] flex items-center justify-center animate-bounce shadow-md">
              {totalUnread}
            </span>
          )}
        </button>

        {/* More Options Button */}
        {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
          <button
            onClick={() => navigate('/assignments')}
            className="p-2 rounded-xl bg-white/50 border border-black/5 hover:bg-white/80 transition-all text-slate-600 hover:text-slate-900 cursor-pointer"
            title="Settings & Reports"
          >
            <Grid className="h-4 w-4" />
          </button>
        )}

        {/* Direct Messages Drawer Modal */}
        {isChatOpen && (
          <>
            {/* Dark Backdrop overlay */}
            <div
              className="fixed inset-0 bg-black/15 backdrop-blur-[2px] z-40 transition-opacity animate-in fade-in duration-200"
              onClick={() => setIsChatOpen(false)}
            />
            {/* Drawer Container Panel */}
            <div className="fixed right-0 top-0 bottom-0 h-screen w-96 bg-white border-l border-slate-200 shadow-2xl flex flex-col overflow-hidden z-50 animate-in slide-in-from-right duration-300">
              {selectedUser ? (
                /* Chat Message Feed View */
                <div className="flex flex-col h-full">
                  {/* Chat Header */}
                  <div className="px-4 py-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                    <button
                      onClick={() => setSelectedUser(null)}
                      className="p-1.5 rounded-lg hover:bg-slate-200/60 text-slate-600 transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-slate-800 truncate">
                        {selectedUser.name}
                      </h4>
                      <span className="text-[10px] uppercase tracking-wider font-extrabold text-sky-500">
                        {selectedUser.role}
                      </span>
                    </div>
                    <button
                      onClick={() => setIsChatOpen(false)}
                      className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Chat Messages Body */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/40">
                    {messages.map((msg) => {
                      const isSelf = msg.senderId === user?.id;
                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}
                        >
                          <div
                            className={`px-3 py-1.5 text-xs max-w-[85%] rounded-2xl break-words leading-relaxed font-sans shadow-sm ${isSelf
                                ? 'bg-blue-600 text-white rounded-tr-none'
                                : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'
                              }`}
                          >
                            {msg.content}
                          </div>
                          <span className="text-[8px] text-slate-400 font-sans mt-0.5 px-1">
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Chat Footer Input */}
                  <form
                    onSubmit={handleSendMessage}
                    className="p-4 border-t border-slate-100 bg-white flex gap-2 items-center"
                  >
                    <input
                      type="text"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs outline-none focus:border-sky-500/50 text-slate-800 placeholder-slate-400"
                    />
                    <button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                      disabled={!messageInput.trim()}
                    >
                      <Send className="h-3 w-3" />
                    </button>
                  </form>
                </div>
              ) : (
                /* User Chat List View */
                <div className="flex flex-col h-full">
                  {/* List Header */}
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <h3 className="text-sm font-bold text-slate-800">
                      Internal Chat Messages
                    </h3>
                    <button
                      onClick={() => setIsChatOpen(false)}
                      className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* List Body */}
                  <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                    {users.map((otherUser) => {
                      const unread = unreadCounts[otherUser.id] || 0;
                      return (
                        <button
                          key={otherUser.id}
                          onClick={() => selectUser(otherUser)}
                          className="w-full flex items-center gap-3.5 px-5 py-4 hover:bg-slate-50 text-left transition-colors cursor-pointer group"
                        >
                          <div className="bg-sky-500/10 p-2.5 rounded-xl text-sky-500 border border-sky-500/20 text-xs font-bold font-sans uppercase">
                            {otherUser.name.substring(0, 2)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-bold text-slate-800 group-hover:text-slate-900 truncate">
                                {otherUser.name}
                              </h4>
                              {unread > 0 && (
                                <span className="bg-red-500 text-white rounded-full text-[9px] font-bold px-2 py-0.5 flex items-center justify-center">
                                  {unread}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 group-hover:text-sky-500 transition-colors">
                              {otherUser.role}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                    {users.length === 0 && (
                      <div className="p-10 text-center text-xs text-slate-400">
                        No other system users found.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </header>
  );
};

export default Navbar;
