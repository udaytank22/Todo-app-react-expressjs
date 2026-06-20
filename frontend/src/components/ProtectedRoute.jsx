import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
 const { user, token, isLoading } = useAuth();

 if (isLoading) {
 return (
 <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-900">
 <div className="relative w-16 h-16">
 <div className="absolute inset-0 rounded-full border-4 border-sky-500/10 border-t-sky-500 animate-spin" />
 </div>
 <p className="mt-4 text-sm font-medium text-slate-600 tracking-wider animate-pulse">
 Loading user profile...
 </p>
 </div>
 );
 }

 // Redirect to login if user or token is missing
 if (!token || !user) {
 return <Navigate to="/login" replace />;
 }

 // Check role eligibility if restriction is specified
 if (allowedRoles && allowedRoles.length > 0) {
 const userRole = user.role.toUpperCase();
 const normalizedAllowed = allowedRoles.map(r => r.toUpperCase());
 
 if (!normalizedAllowed.includes(userRole)) {
 // User does not have authorization
 return (
 <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-slate-50 text-slate-900">
 <div className="glass-panel p-8 rounded-2xl max-w-md text-center border-rose-500/20">
 <svg 
 className="h-16 w-16 text-rose-500 mx-auto mb-4 animate-bounce" 
 fill="none" 
 stroke="currentColor" 
 viewBox="0 0 24 24" 
 xmlns="http://www.w3.org/2000/svg"
 >
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
 </svg>
 <h2 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h2>
 <p className="text-slate-600 text-sm mb-6">
 Your profile role ({user.role}) is not authorized to access this section of the system.
 </p>
 <a 
 href="/" 
 className="inline-block bg-slate-100 hover:bg-slate-700 text-slate-800 px-5 py-2.5 rounded-xl border border-slate-700 transition-all text-sm font-medium"
 >
 Return to Dashboard
 </a>
 </div>
 </div>
 );
 }
 }

 return children;
};

export default ProtectedRoute;
