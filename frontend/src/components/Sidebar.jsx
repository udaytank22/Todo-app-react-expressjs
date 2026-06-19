import React from 'react';
import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Trello,
  ListTodo,
  LogOut,
  Shield,
  User as UserIcon,
  Bell,
  Workflow
} from 'lucide-react';

const Sidebar = ({ isMailConnected, isDemoMode }) => {
  const { user, logout } = useAuth();
  const notifications = useSelector((state) => state.notifications?.notifications || []);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <aside className="w-16 hover:w-64 min-w-16 hover:min-w-64 h-screen glass-panel flex flex-col border-y-0 border-l-0 border-r border-white/5 light:border-slate-200/50 transition-all duration-300 overflow-hidden group shadow-2xl z-40">
      {/* Brand Header */}
      <div className="px-2.5 group-hover:px-3 py-3 border-b border-white/5 light:border-slate-200/50 flex items-center justify-center group-hover:justify-start gap-3 overflow-hidden h-16 min-h-16">
        <div className="bg-sky-500/10 p-2.5 rounded-xl border border-sky-500/20 text-sky-400 flex items-center justify-center flex-shrink-0">
          <Trello className="h-5 w-5 animate-pulse" />
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap hidden group-hover:block">
          <h1 className="text-xs font-bold text-slate-100 light:text-slate-800 tracking-wider uppercase">
            InquiryAI
          </h1>
          <p className="text-[9px] text-slate-500 tracking-widest uppercase font-semibold">
            Task Manager
          </p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-2.5 py-6 space-y-2 overflow-y-auto overflow-x-hidden">
        <NavLink to="/" className="sidebar-link flex items-center justify-center group-hover:justify-start gap-3 px-0 group-hover:px-4 py-3 overflow-hidden">
          <div className="flex items-center justify-center min-w-[24px] h-5">
            <LayoutDashboard className="h-5 w-5 flex-shrink-0" />
          </div>
          <span className="opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap hidden group-hover:inline">Dashboard</span>
        </NavLink>

        <NavLink to="/kanban" className="sidebar-link flex items-center justify-center group-hover:justify-start gap-3 px-0 group-hover:px-4 py-3 overflow-hidden">
          <div className="flex items-center justify-center min-w-[24px] h-5">
            <Trello className="h-5 w-5 flex-shrink-0" />
          </div>
          <span className="opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap hidden group-hover:inline">Kanban Board</span>
        </NavLink>

        <NavLink to="/list" className="sidebar-link flex items-center justify-center group-hover:justify-start gap-3 px-0 group-hover:px-4 py-3 overflow-hidden">
          <div className="flex items-center justify-center min-w-[24px] h-5">
            <ListTodo className="h-5 w-5 flex-shrink-0" />
          </div>
          <span className="opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap hidden group-hover:inline">Task Grid List</span>
        </NavLink>

        {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
          <NavLink to="/assignments" className="sidebar-link flex items-center justify-center group-hover:justify-start gap-3 px-0 group-hover:px-4 py-3 overflow-hidden">
            <div className="flex items-center justify-center min-w-[24px] h-5">
              <Workflow className="h-5 w-5 flex-shrink-0" />
            </div>
            <span className="opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap hidden group-hover:inline">Auto Assignments</span>
          </NavLink>
        )}

        <NavLink to="/notifications" className="sidebar-link flex items-center justify-center group-hover:justify-start gap-3 px-0 group-hover:px-4 py-3 overflow-hidden relative">
          <div className="flex items-center justify-center min-w-[24px] h-5 relative">
            <Bell className="h-5 w-5 flex-shrink-0" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-sky-500 text-[8px] font-bold text-white ring-2 ring-slate-950">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
          <span className="opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap hidden group-hover:flex items-center justify-between flex-1">
            <span>Notifications</span>
            {unreadCount > 0 && (
              <span className="ml-2 px-2 py-0.5 text-[9px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-full">
                {unreadCount} new
              </span>
            )}
          </span>
        </NavLink>
      </nav>

      {/* User Info & Footer */}
      {user && (
        <div className="p-2.5 border-t border-white/5 light:border-slate-200/50 flex flex-col gap-3 overflow-hidden">
          <div className="flex items-center justify-center group-hover:justify-start gap-3">
            <div className="bg-slate-800 light:bg-slate-200 p-2.5 rounded-xl border border-white/5 text-slate-300 light:text-slate-600 flex items-center justify-center flex-shrink-0">
              <UserIcon className="h-5 w-5" />
            </div>
            <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap overflow-hidden hidden group-hover:block">
              <h4 className="text-xs font-bold text-slate-200 light:text-slate-800 truncate">
                {user.name}
              </h4>
              <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 uppercase mt-0.5 tracking-wider">
                <Shield className="h-2.5 w-2.5 text-sky-400" />
                <span>{user.role}</span>
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full sidebar-link flex items-center justify-center group-hover:justify-start gap-3 px-0 group-hover:px-4 py-3 overflow-hidden text-rose-500 hover:text-rose-400 hover:bg-rose-500/5 border border-transparent hover:border-rose-500/10"
          >
            <div className="flex items-center justify-center min-w-[24px]">
              <LogOut className="h-5 w-5 flex-shrink-0" />
            </div>
            <span className="opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap hidden group-hover:inline">Sign Out</span>
          </button>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
