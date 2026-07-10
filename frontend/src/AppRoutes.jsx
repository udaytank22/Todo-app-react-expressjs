import React, { Suspense, lazy } from 'react';
import { Routes, Route, Outlet, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import { Loader } from 'lucide-react';

const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Kanban = lazy(() => import('./pages/Kanban'));
const List = lazy(() => import('./pages/List'));
const InquiryDetails = lazy(() => import('./pages/InquiryDetails'));
const Notifications = lazy(() => import('./pages/Notifications'));
const CustomerAssignments = lazy(() => import('./pages/CustomerAssignments'));
const UnassignedNotes = lazy(() => import('./pages/UnassignedNotes'));
const Groups = lazy(() => import('./pages/Groups'));

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

const AppRoutes = ({ socket, isMailConnected, isDemoMode, onSyncSuccess, searchVal, onSearchChange }) => {
    return (
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
                                onSyncSuccess={onSyncSuccess}
                                searchVal={searchVal}
                                onSearchChange={onSearchChange}
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
    );
};

export default AppRoutes;
