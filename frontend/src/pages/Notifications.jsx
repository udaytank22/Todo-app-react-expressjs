import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
    fetchNotifications,
    markNotificationRead,
    markAllNotificationsRead
} from '../store/notificationsSlice';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import {
    Bell,
    Check,
    CheckCheck,
    MessageSquare,
    UserCheck,
    RefreshCw,
    ArrowRight,
    Inbox,
    AlertCircle
} from 'lucide-react';

const Notifications = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { notifications, isLoading } = useSelector(state => state.notifications);
    const [activeFilter, setActiveFilter] = useState('ALL'); // 'ALL', 'UNREAD', 'READ'

    useEffect(() => {
        dispatch(fetchNotifications({ limit: 100 }));
    }, [dispatch]);

    const handleMarkRead = (e, id) => {
        e.stopPropagation(); // Prevent navigating when clicking mark read
        dispatch(markNotificationRead(id));
    };

    const handleMarkAllRead = () => {
        dispatch(markAllNotificationsRead());
    };

    const handleNotificationClick = (notification) => {
        if (!notification.isRead) {
            dispatch(markNotificationRead(notification.id));
        }
        if (notification.type !== 'DIRECT_MESSAGE') {
            navigate(`/inquiry/${notification.relatedId}`);
        }
    };

    // Filter notifications
    const filteredNotifications = notifications.filter(n => {
        if (activeFilter === 'UNREAD') return !n.isRead;
        if (activeFilter === 'READ') return n.isRead;
        return true;
    });

    const unreadCount = notifications.filter(n => !n.isRead).length;

    // Format timestamp helper
    const formatTimeAgo = (dateString) => {
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

    // Get icon for notification type
    const getIcon = (type) => {
        switch (type) {
            case 'ASSIGNMENT':
                return (
                    <div className="bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20 text-emerald-400">
                        <UserCheck className="h-5 w-5" />
                    </div>
                );
            case 'DIRECT_MESSAGE':
            case 'NEW_COMMENT':
                return (
                    <div className="bg-violet-500/10 p-2.5 rounded-xl border border-violet-500/20 text-violet-400">
                        <MessageSquare className="h-5 w-5" />
                    </div>
                );
            case 'STATUS_UPDATE':
                return (
                    <div className="bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20 text-amber-400">
                        <RefreshCw className="h-5 w-5 animate-spin-slow" />
                    </div>
                );
            case 'NEW_INQUIRY':
            default:
                return (
                    <div className="bg-sky-500/10 p-2.5 rounded-xl border border-sky-500/20 text-sky-400">
                        <Inbox className="h-5 w-5" />
                    </div>
                );
        }
    };

    if (isLoading && notifications.length === 0) {
        return (
            <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <div className="h-8 w-48 skeleton-loader rounded-lg" />
                    <div className="h-10 w-32 skeleton-loader rounded-lg" />
                </div>
                <div className="space-y-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-20 skeleton-loader rounded-2xl" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="p-3 space-y-3 font-sans h-[calc(100vh-4rem)] overflow-y-auto">
            {/* Title Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-xl font-extrabold tracking-wide text-slate-900 flex items-center gap-2">
                        <span>Notifications Feed</span>
                        {unreadCount > 0 && (
                            <span className="px-2 py-0.5 text-xs font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-full">
                                {unreadCount} unread
                            </span>
                        )}
                    </h2>
                    <p className="text-xs text-slate-600 light:text-slate-500 mt-1">
                        Stay up-to-date with inbox inquiries, comment exchanges, and task assignments.
                    </p>
                </div>

                {unreadCount > 0 && (
                    <Button
                        variant="ghost"
                        icon={<CheckCheck className="h-4 w-4" />}
                        onClick={handleMarkAllRead}
                        className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 bg-slate-100/50 hover:bg-sky-50 text-slate-600 hover:text-sky-600 border border-slate-200/60 rounded-lg shadow-sm transition-colors"
                    >
                        Mark all as read
                    </Button>
                )}
            </div>

            {/* Tabs Filter & List */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-black/5 pb-2">
                    {['ALL', 'UNREAD'].map((filter) => (
                        <button
                            key={filter}
                            onClick={() => setActiveFilter(filter)}
                            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all outline-none ${activeFilter === filter
                                ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20 font-bold'
                                : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100/20'
                                }`}
                        >
                            {filter.charAt(0) + filter.slice(1).toLowerCase()}
                            {filter === 'UNREAD' && ` (${unreadCount})`}
                        </button>
                    ))}
                </div>
                {filteredNotifications.length === 0 ? (
                    <Card className="p-16 text-center text-slate-500 border-black/5">
                        <Bell className="h-12 w-12 mx-auto mb-4 opacity-20 text-slate-600" />
                        <p className="text-sm font-semibold text-slate-700">
                            {activeFilter === 'UNREAD' ? 'No unread notifications' : 'Notifications Feed is empty'}
                        </p>
                        <p className="text-xs mt-1 text-slate-500">
                            Events will trigger notification updates here in real-time.
                        </p>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {filteredNotifications.map((notif) => (
                            <Card
                                key={notif.id}
                                onClick={() => handleNotificationClick(notif)}
                                className={`flex items-start justify-between p-5 transition-all duration-200 cursor-pointer relative group border ${notif.isRead
                                    ? 'hover:bg-slate-100/40 border-black/5'
                                    : 'bg-sky-500/[0.015] hover:bg-sky-500/[0.03] border-sky-500/20'
                                    }`}
                            >
                                <div className="flex gap-4 max-w-[80%]">
                                    {/* Icon */}
                                    <div className="flex-shrink-0 mt-0.5">
                                        {getIcon(notif.type)}
                                    </div>

                                    {/* Text */}
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2.5">
                                            <h4 className={`text-sm font-semibold text-slate-900 group-hover:text-sky-500 transition-colors ${!notif.isRead ? 'font-bold' : ''
                                                }`}>
                                                {notif.title}
                                            </h4>
                                            <span className="text-[10px] text-slate-500">
                                                &bull; {formatTimeAgo(notif.createdAt)}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-600 leading-relaxed">
                                            {notif.message}
                                        </p>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-3.5 mt-1 self-center">
                                    {!notif.isRead && (
                                        <button
                                            onClick={(e) => handleMarkRead(e, notif.id)}
                                            className="p-1.5 rounded-lg bg-white/50 hover:bg-sky-500/10 hover:text-sky-400 border border-black/5 text-slate-600 transition-all"
                                            title="Mark as read"
                                        >
                                            <Check className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                    <ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-sky-500 group-hover:translate-x-0.5 transition-all" />
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Notifications;
