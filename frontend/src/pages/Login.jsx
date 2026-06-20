import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Dropdown from '../components/ui/Dropdown';
import { Mail, Lock, User, ShieldCheck } from 'lucide-react';

const Login = () => {
 const [isLogin, setIsLogin] = useState(true);
 const [email, setEmail] = useState('');
 const [password, setPassword] = useState('');
 const [name, setName] = useState('');
 const [role, setRole] = useState('STAFF');
 const [error, setError] = useState('');
 const [success, setSuccess] = useState('');
 const [isSubmitting, setIsSubmitting] = useState(false);

 const { login, register, token } = useAuth();
 const navigate = useNavigate();

 // If user is already authenticated, redirect to home
 useEffect(() => {
 if (token) {
 navigate('/');
 }
 }, [token, navigate]);

 const handleSubmit = async (e) => {
 e.preventDefault();
 setError('');
 setSuccess('');
 setIsSubmitting(true);

 if (isLogin) {
 const result = await login(email, password);
 if (result.success) {
 navigate('/');
 } else {
 setError(result.error);
 setIsSubmitting(false);
 }
 } else {
 const result = await register(name, email, password, role);
 if (result.success) {
 setSuccess('Account registered successfully! Please sign in using your credentials.');
 setIsLogin(true);
 // Clear fields
 setName('');
 setEmail('');
 setPassword('');
 setIsSubmitting(false);
 } else {
 setError(result.error);
 setIsSubmitting(false);
 }
 }
 };

 return (
 <div className="relative min-h-screen bg-slate-50 flex items-center justify-center p-4 overflow-hidden font-sans">
 {/* Background Neon Glowing Orbs */}
 <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl animate-pulse" />
 <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" />

 {/* Main Glass Panel Card */}
 <div className="w-full max-w-md glass-panel rounded-2xl p-8 border border-black/5 relative z-10 shadow-2xl backdrop-blur-glass">
 {/* Header Title */}
 <div className="text-center mb-8">
 <div className="bg-sky-500/10 h-12 w-12 rounded-xl flex items-center justify-center text-sky-400 mx-auto mb-3 border border-sky-500/20">
 <ShieldCheck className="h-6 w-6" />
 </div>
 <h2 className="text-2xl font-bold tracking-wide text-slate-900">
 {isLogin ? 'Welcome Back' : 'Create Account'}
 </h2>
 <p className="text-slate-600 text-xs mt-1">
 {isLogin
 ? 'Sign in to access your task & inquiry manager'
 : 'Register a handler profile to assign/review inquiries'
 }
 </p>
 </div>

 {/* Global Error and Success Alerts */}
 {error && (
 <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs text-center font-medium animate-shake">
 {error}
 </div>
 )}

 {success && (
 <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs text-center font-medium">
 {success}
 </div>
 )}

 {/* Form Inputs */}
 <form onSubmit={handleSubmit} className="space-y-5">
 {!isLogin && (
 <Input
 label="Full Name"
 placeholder="e.g. John Doe"
 value={name}
 onChange={(e) => setName(e.target.value)}
 icon={<User className="h-4 w-4" />}
 required
 />
 )}

 <Input
 label="Email Address"
 type="email"
 placeholder="e.g. admin@manager.com"
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 icon={<Mail className="h-4 w-4" />}
 required
 />

 <Input
 label="Password"
 type="password"
 placeholder="••••••••"
 value={password}
 onChange={(e) => setPassword(e.target.value)}
 icon={<Lock className="h-4 w-4" />}
 required
 />

 {!isLogin && (
 <Dropdown
 label="Assigned System Role"
 value={role}
 onChange={(e) => setRole(e.target.value)}
 options={[
 { value: 'ADMIN', label: 'Admin (Full Privileges)' },
 { value: 'MANAGER', label: 'Manager (Review & Assign)' },
 { value: 'STAFF', label: 'Staff (Standard Handler)' }
 ]}
 />
 )}

 <Button
 type="submit"
 variant="primary"
 className="w-full py-3"
 isLoading={isSubmitting}
 >
 {isLogin ? 'Sign In' : 'Create Account'}
 </Button>
 </form>

 {/* Footnote Tab Switcher */}
 {/* <div className="mt-8 pt-6 border-t border-black/5 text-center text-xs">
 <p className="text-slate-600">
 {isLogin ? "Don't have an account yet?" : 'Already registered?'}
 <button
 onClick={() => {
 setIsLogin(!isLogin);
 setError('');
 setSuccess('');
 }}
 className="text-sky-400 hover:text-sky-300 font-bold ml-1.5 focus:outline-none"
 >
 {isLogin ? 'Create one now' : 'Sign in here'}
 </button>
 </p>
 </div> */}
 </div>
 </div>
 );
};

export default Login;
