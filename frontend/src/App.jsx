import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import io from 'socket.io-client';
import axios from 'axios';
import { encrypt, decrypt } from './utils/encryption';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import { Suspense, lazy } from 'react';
import { Mail, X, Bell, MessageSquare, Loader } from 'lucide-react';

const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Kanban = lazy(() => import('./pages/Kanban'));
const List = lazy(() => import('./pages/List'));
const InquiryDetails = lazy(() => import('./pages/InquiryDetails'));
const Notifications = lazy(() => import('./pages/Notifications'));
const CustomerAssignments = lazy(() => import('./pages/CustomerAssignments'));
const UnassignedNotes = lazy(() => import('./pages/UnassignedNotes'));
const Groups = lazy(() => import('./pages/Groups'));
import { useDispatch } from 'react-redux';
import { fetchTasks, addInquiryLocal, updateStatusLocal, updateTaskLocal, removeTaskLocal, addCommentLocal } from './store/tasksSlice';
import { fetchNotifications, addNotificationLocal } from './store/notificationsSlice';

const MainLayout = ({ socket, onSyncSuccess, searchVal, onSearchChange, isMailConnected, isDemoMode }) => {
    return (
        <div className="flex h-screen w-screen overflow-hidden text-slate-900 transition-colors duration-300 bg-cover bg-center bg-no-repeat bg-fixed" style={{ backgroundImage: "url('/bg-light.png')" }}>
            {/* Sidebar Navigation */}
            <Sidebar isMailConnected={isMailConnected} isDemoMode={isDemoMode} />

            {/* Primary Workspace Panel */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Top Navbar */}
                <Navbar
                    socket={socket}
                    isMailConnected={isMailConnected}
                    isDemoMode={isDemoMode}
                    onSyncSuccess={onSyncSuccess}
                    searchVal={searchVal}
                    onSearchChange={onSearchChange}
                />

                {/* Content Area */}
                <main className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-50/20">
                    <Suspense fallback={
                        <div className="flex h-full w-full items-center justify-center">
                            <Loader className="h-8 w-8 text-indigo-500 animate-spin" />
                        </div>
                    }>
                        <Outlet />
                    </Suspense>
                </main>
            </div>
        </div>
    );
};

const AppContent = () => {
    const { token, user } = useAuth();
    const dispatch = useDispatch();
    const [socket, setSocket] = useState(null);

    // Real-time toast alert state
    const [toasts, setToasts] = useState([]);

    // Outlook connection status
    const [isMailConnected, setIsMailConnected] = useState(false);
    const [isDemoMode, setIsDemoMode] = useState(true);

    // Global search input state
    const [searchVal, setSearchVal] = useState('');

    // Fetch connection status on login/mount
    const fetchMailStatus = async () => {
        if (!token) return;
        try {
            const response = await axios.get('/api/emails/status', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setIsMailConnected(response.data.connected);
            setIsDemoMode(response.data.demoMode);
        } catch (error) {
            console.error('Failed to fetch Outlook sync status:', error.message);
        }
    };

    useEffect(() => {
        fetchMailStatus();
        if (token) {
            dispatch(fetchTasks());
            dispatch(fetchNotifications());
        }
    }, [token, dispatch]);

    // Connect to Socket.IO when token is available
    useEffect(() => {
        if (!token) {
            if (socket) {
                socket.disconnect();
                setSocket(null);
            }
            return;
        }

        // Connect socket (Vite proxies this to backend)
        // Phase 1: Pass JWT token in auth so the backend socket middleware can
        // verify the connection before admitting the client.
        const newSocket = io(window.location.origin, {
            transports: ['websocket'],
            auth: { token, device: 'mobile' },
        });

        // Patch socket.emit for outgoing encryption
        const originalEmit = newSocket.emit;
        newSocket.emit = function(eventName, data, ...args) {
            if (data && typeof data === 'object' && !data.encryptedData) {
                const encData = { encryptedData: encrypt(JSON.stringify(data)) };
                return originalEmit.call(this, eventName, encData, ...args);
            }
            return originalEmit.call(this, eventName, data, ...args);
        };

        // Patch socket.on for incoming decryption
        const originalOn = newSocket.on;
        newSocket.on = function(eventName, callback) {
            return originalOn.call(this, eventName, (data, ...args) => {
                if (data && data.encryptedData) {
                    const decryptedStr = decrypt(data.encryptedData);
                    if (decryptedStr) {
                        try {
                            data = JSON.parse(decryptedStr);
                        } catch (e) {
                            data = decryptedStr;
                        }
                    }
                }
                return callback(data, ...args);
            });
        };

        newSocket.on('connect', () => {
            console.log('[Socket] Connected to server web socket');
            // Explicit join is no longer needed; backend auto-joins based on JWT token.
        });

        // Listen for real-time app notifications
        newSocket.on('new_notification', (notification) => {
            console.log('[Socket] New notification received:', notification);
            dispatch(addNotificationLocal(notification));

            // Push toast alert
            const id = Date.now();
            setToasts((prev) => [
                ...prev,
                {
                    id,
                    type: 'notification',
                    title: notification.title || 'New Notification',
                    message: notification.message,
                    dbId: notification.relatedId || notification.id
                }
            ]);

            setTimeout(() => {
                setToasts((prev) => prev.filter(t => t.id !== id));
            }, 6000);
        });

        // Listen for new inquiries processed
        newSocket.on('new_inquiry', (inquiry) => {
            console.log('[Socket] New inquiry received:', inquiry);

            // If user is a STAFF member, only process if the inquiry is assigned to them
            if (user && user.role === 'STAFF') {
                if (inquiry.assignedUserId !== user.id) {
                    return;
                }
            }

            dispatch(addInquiryLocal(inquiry));

            // Push toast alert
            const id = Date.now();
            setToasts((prev) => [
                ...prev,
                {
                    id,
                    inquiryId: inquiry.inquiryId,
                    senderName: inquiry.customerName,
                    subject: inquiry.subject,
                    dbId: inquiry.id
                }
            ]);

            // Auto close after 6 seconds
            setTimeout(() => {
                setToasts((prev) => prev.filter(t => t.id !== id));
            }, 6000);
        });

        // Listen for task assignment changes
        newSocket.on('task_assigned', (data) => {
            console.log('[Socket] Task assignment updated:', data);
            if (data && data.task) {
                if (user && user.role === 'STAFF') {
                    if (data.assignedUserId === user.id) {
                        // Task has been assigned to this staff user
                        dispatch(addInquiryLocal(data.task));

                        // Push toast alert
                        const id = Date.now();
                        setToasts((prev) => [
                            ...prev,
                            {
                                id,
                                inquiryId: data.task.inquiryId,
                                senderName: data.task.customerName,
                                subject: `You have been assigned a task: ${data.task.subject}`,
                                dbId: data.task.id
                            }
                        ]);
                        setTimeout(() => {
                            setToasts((prev) => prev.filter(t => t.id !== id));
                        }, 6000);
                    } else {
                        // Task was assigned to someone else, remove it from store if present
                        dispatch(removeTaskLocal(data.taskId));
                    }
                } else {
                    // Admin/Manager: update task in store
                    dispatch(updateTaskLocal(data.task));
                }
            }
        });

        // Listen for real-time status updates from staff/Kanban actions
        newSocket.on('task_status_updated', (data) => {
            console.log('[Socket] Task status updated:', data);
            if (data && data.taskId && data.toStatus) {
                dispatch(updateStatusLocal({ id: data.taskId, status: data.toStatus }));
            }
        });

        // Listen for real-time comments added by managers/staff
        newSocket.on('new_comment', (data) => {
            console.log('[Socket] New comment received:', data);
            if (data && data.taskId && data.comment) {
                // If user is a STAFF member, only process if the task is assigned to them
                if (user && user.role === 'STAFF') {
                    if (data.assignedUserId !== user.id) {
                        return;
                    }
                }

                dispatch(addCommentLocal(data));

                // Show toast alert if comment is from another user
                if (user && data.comment.userId !== user.id) {
                    const id = Date.now();
                    setToasts((prev) => [
                        ...prev,
                        {
                            id,
                            isComment: true,
                            senderName: data.comment.user?.name || 'Someone',
                            content: data.comment.content,
                            dbId: data.taskId,
                            inquiryId: data.inquiryId,
                            subject: data.subject
                        }
                    ]);

                    setTimeout(() => {
                        setToasts((prev) => prev.filter(t => t.id !== id));
                    }, 6000);
                }
            }
        });

        setSocket(newSocket);

        // Listen for direct messages to show a popup toast
        newSocket.on('receive_direct_message', (message) => {
            if (user && message.senderId !== user.id) {
                const id = Date.now();
                setToasts((prev) => [
                    ...prev,
                    {
                        id,
                        isDirectMessage: true,
                        senderName: message.sender?.name || 'Someone',
                        content: message.content,
                    }
                ]);

                setTimeout(() => {
                    setToasts((prev) => prev.filter(t => t.id !== id));
                }, 6000);
            }
        });

        return () => {
            newSocket.disconnect();
        };
    }, [token, dispatch, user]);

    // Callback when user manually triggers email fetch in navbar
    const handleSyncSuccess = (data) => {
        fetchMailStatus();
        dispatch(fetchTasks(true)); // Force refresh task cache

        // Push a success status alert
        const id = Date.now();
        setToasts((prev) => [
            ...prev,
            {
                id,
                isSystem: true,
                message: `Sync complete: Imported ${data.imported} new task(s), skipped ${data.duplicates} duplicate(s).`
            }
        ]);

        setTimeout(() => {
            setToasts((prev) => prev.filter(t => t.id !== id));
        }, 5000);
    };

    const removeToast = (id) => {
        setToasts((prev) => prev.filter(t => t.id !== id));
    };

    return (
        <Router>
            <Suspense fallback={
                <div className="flex h-screen w-screen items-center justify-center bg-slate-50 text-slate-900">
                    <Loader className="h-10 w-10 text-indigo-500 animate-spin" />
                </div>
            }>
                <Routes>
                    {/* Public login page */}
                    <Route path="/login" element={<Login />} />

                    {/* Protected app workspace routes */}
                    <Route
                        element={
                            <ProtectedRoute>
                                <MainLayout
                                    socket={socket}
                                    isMailConnected={isMailConnected}
                                    isDemoMode={isDemoMode}
                                    onSyncSuccess={handleSyncSuccess}
                                    searchVal={searchVal}
                                    onSearchChange={setSearchVal}
                                />
                            </ProtectedRoute>
                        }
                    >
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/kanban" element={<Kanban socket={socket} searchVal={searchVal} />} />
                        <Route path="/list" element={<List socket={socket} searchVal={searchVal} />} />
                        <Route path="/groups" element={<Groups />} />
                        <Route path="/inquiry/:id" element={<InquiryDetails />} />
                        <Route path="/notifications" element={<Notifications />} />
                        <Route path="/assignments" element={<CustomerAssignments />} />
                        <Route path="/unassigned-notes" element={<UnassignedNotes />} />
                    </Route>

                    {/* Fallback redirects */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Suspense>

            {/* Floating Toast Notification Center */}
            <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3.5 w-96 max-w-[calc(100vw-3rem)]">
                {toasts.map((toast) => {
                    if (toast.isSystem) {
                        return (
                            <div
                                key={toast.id}
                                className="glass-panel p-4 rounded-xl flex items-center justify-between border-sky-500/20 shadow-2xl animate-slideIn"
                            >
                                <div className="flex items-center gap-3">
                                    <Bell className="h-5 w-5 text-sky-400 animate-bounce" />
                                    <p className="text-xs font-semibold text-slate-900 font-sans leading-snug">
                                        {toast.message}
                                    </p>
                                </div>
                                <button
                                    onClick={() => removeToast(toast.id)}
                                    className="text-slate-500 hover:text-slate-700 transition-colors p-1"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        );
                    }

                    if (toast.isAppNotification) {
                        return (
                            <div
                                key={toast.id}
                                className="glass-panel p-4 rounded-2xl flex gap-3 border-sky-500/20 shadow-2xl animate-slideIn hover:border-sky-500/35 transition-all group"
                            >
                                <div className="bg-sky-500/10 p-2.5 rounded-xl text-sky-400 border border-sky-500/25 flex items-center justify-center self-start">
                                    <Bell className="h-4 w-4 text-sky-400 animate-bounce" />
                                </div>

                                <div className="flex-1 overflow-hidden space-y-1">
                                    <div className="flex items-center justify-between text-[10px]">
                                        <span className="font-extrabold text-sky-400 font-sans tracking-wide uppercase">
                                            {toast.type ? toast.type.replace('_', ' ') : 'NOTIFICATION'}
                                        </span>
                                        <span className="text-sky-400 font-bold tracking-wider uppercase">
                                            Alert
                                        </span>
                                    </div>
                                    <h4 className="text-xs font-bold text-slate-900 truncate">
                                        {toast.title}
                                    </h4>
                                    <p className="text-[10px] text-slate-600 leading-normal">
                                        {toast.message}
                                    </p>

                                    <div className="pt-1.5 flex justify-end">
                                        <a
                                            href={`/inquiry/${toast.relatedId}`}
                                            className="text-[10px] font-extrabold text-sky-400 hover:text-sky-300 uppercase tracking-widest flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform"
                                            onClick={() => removeToast(toast.id)}
                                        >
                                            <span>View details</span>
                                            <span>&rarr;</span>
                                        </a>
                                    </div>
                                </div>

                                <button
                                    onClick={() => removeToast(toast.id)}
                                    className="text-slate-500 hover:text-slate-700 self-start p-1 transition-colors"
                                    aria-label="Close toast alert"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        );
                    }

                    if (toast.isComment) {
                        return (
                            <div
                                key={toast.id}
                                className="glass-panel p-4 rounded-2xl flex gap-3 border-sky-500/20 shadow-2xl animate-slideIn hover:border-sky-500/35 transition-all group"
                            >
                                <div className="bg-sky-500/10 p-2.5 rounded-xl text-sky-400 border border-sky-500/25 flex items-center justify-center self-start">
                                    <MessageSquare className="h-4 w-4 animate-bounce" />
                                </div>

                                <div className="flex-1 overflow-hidden space-y-1">
                                    <div className="flex items-center justify-between text-[10px]">
                                        <span className="font-extrabold text-sky-400 font-sans tracking-wide">
                                            {toast.inquiryId || 'Internal Update'}
                                        </span>
                                        <span className="text-sky-400 font-bold tracking-wider uppercase">
                                            New Note
                                        </span>
                                    </div>
                                    <h4 className="text-xs font-bold text-slate-900 truncate">
                                        {toast.subject || 'New Comment'}
                                    </h4>
                                    <p className="text-[10px] text-slate-600 truncate">
                                        From: <span className="font-semibold text-slate-700">{toast.senderName}</span>
                                    </p>
                                    <p className="text-[10px] text-slate-600 truncate leading-relaxed">
                                        "{toast.content}"
                                    </p>

                                    {/* Click details redirect */}
                                    <div className="pt-1.5 flex justify-end">
                                        <a
                                            href={`/inquiry/${toast.dbId}`}
                                            className="text-[10px] font-extrabold text-sky-400 hover:text-sky-300 uppercase tracking-widest flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform"
                                            onClick={() => removeToast(toast.id)}
                                        >
                                            <span>View Chat</span>
                                            <span>&rarr;</span>
                                        </a>
                                    </div>
                                </div>

                                <button
                                    onClick={() => removeToast(toast.id)}
                                    className="text-slate-500 hover:text-slate-700 self-start p-1 transition-colors"
                                    aria-label="Close toast alert"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        );
                    }

                    if (toast.type === 'notification') {
                        return (
                            <div
                                key={toast.id}
                                className="glass-panel p-4 rounded-2xl flex gap-3 border-emerald-500/20 shadow-2xl animate-slideIn hover:border-emerald-500/35 transition-all group"
                            >
                                <div className="bg-emerald-500/10 p-2.5 rounded-xl text-emerald-400 border border-emerald-500/25 flex items-center justify-center self-start">
                                    <Bell className="h-4 w-4 animate-pulse" />
                                </div>

                                <div className="flex-1 overflow-hidden space-y-1">
                                    <div className="flex items-center justify-between text-[10px]">
                                        <span className="font-extrabold text-emerald-400 font-sans tracking-wide">
                                            NOTIFICATION
                                        </span>
                                        <span className="text-emerald-400 font-bold tracking-wider uppercase truncate max-w-[150px]">
                                            {toast.title}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-slate-600 truncate leading-relaxed">
                                        {toast.message}
                                    </p>

                                    {toast.dbId && (
                                        <div className="pt-1.5 flex justify-end">
                                            <a
                                                href={`/inquiry/${toast.dbId}`}
                                                className="text-[10px] font-extrabold text-emerald-400 hover:text-emerald-300 uppercase tracking-widest flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform"
                                                onClick={() => removeToast(toast.id)}
                                            >
                                                <span>View details</span>
                                                <span>&rarr;</span>
                                            </a>
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={() => removeToast(toast.id)}
                                    className="text-slate-500 hover:text-slate-700 self-start p-1 transition-colors"
                                    aria-label="Close toast alert"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        );
                    }

                    if (toast.isDirectMessage) {
                        return (
                            <div
                                key={toast.id}
                                className="glass-panel p-4 rounded-2xl flex gap-3 border-sky-500/20 shadow-2xl animate-slideIn hover:border-sky-500/35 transition-all group"
                            >
                                <div className="bg-sky-500/10 p-2.5 rounded-xl text-sky-400 border border-sky-500/25 flex items-center justify-center self-start">
                                    <MessageSquare className="h-4 w-4 animate-bounce" />
                                </div>

                                <div className="flex-1 overflow-hidden space-y-1">
                                    <div className="flex items-center justify-between text-[10px]">
                                        <span className="font-extrabold text-sky-400 font-sans tracking-wide">
                                            CHAT
                                        </span>
                                        <span className="text-sky-400 font-bold tracking-wider uppercase">
                                            New Message
                                        </span>
                                    </div>
                                    <h4 className="text-xs font-bold text-slate-900 truncate">
                                        From: {toast.senderName}
                                    </h4>
                                    <p className="text-[10px] text-slate-600 truncate leading-relaxed">
                                        "{toast.content}"
                                    </p>

                                    <div className="pt-1.5 flex justify-end">
                                        <button
                                            className="text-[10px] font-extrabold text-sky-400 hover:text-sky-300 uppercase tracking-widest flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform"
                                            onClick={() => removeToast(toast.id)}
                                        >
                                            <span>Dismiss</span>
                                            <span>&rarr;</span>
                                        </button>
                                    </div>
                                </div>

                                <button
                                    onClick={() => removeToast(toast.id)}
                                    className="text-slate-500 hover:text-slate-700 self-start p-1 transition-colors"
                                    aria-label="Close toast alert"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        );
                    }

                    return (
                        <div
                            key={toast.id}
                            className="glass-panel p-4 rounded-2xl flex gap-3 border-emerald-500/20 shadow-2xl animate-slideIn hover:border-emerald-500/35 transition-all group"
                        >
                            <div className="bg-emerald-500/10 p-2.5 rounded-xl text-emerald-400 border border-emerald-500/25 flex items-center justify-center self-start">
                                <Mail className="h-4 w-4 animate-pulse" />
                            </div>

                            <div className="flex-1 overflow-hidden space-y-1">
                                <div className="flex items-center justify-between text-[10px]">
                                    <span className="font-extrabold text-sky-400 font-sans tracking-wide">
                                        {toast.inquiryId}
                                    </span>
                                    <span className="text-emerald-400 font-bold tracking-wider uppercase">
                                        New inquiry
                                    </span>
                                </div>
                                <h4 className="text-xs font-bold text-slate-900 truncate">
                                    {toast.subject}
                                </h4>
                                <p className="text-[10px] text-slate-600 truncate">
                                    Sender: <span className="font-semibold text-slate-700">{toast.senderName}</span>
                                </p>

                                {/* Click details redirect */}
                                <div className="pt-1.5 flex justify-end">
                                    <a
                                        href={`/inquiry/${toast.dbId}`}
                                        className="text-[10px] font-extrabold text-sky-400 hover:text-sky-300 uppercase tracking-widest flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform"
                                        onClick={() => removeToast(toast.id)}
                                    >
                                        <span>View inquiry</span>
                                        <span>&rarr;</span>
                                    </a>
                                </div>
                            </div>

                            <button
                                onClick={() => removeToast(toast.id)}
                                className="text-slate-500 hover:text-slate-700 self-start p-1 transition-colors"
                                aria-label="Close toast alert"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    );
                })}
            </div>
        </Router>
    );
};

const App = () => {
    return (
        <ThemeProvider>
            <AuthProvider>
                <AppContent />
            </AuthProvider>
        </ThemeProvider>
    );
};

export default App;
