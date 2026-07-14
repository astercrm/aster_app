import React, { useState } from 'react';
import { Mail, Lock, Loader2, Sparkles, User } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';

interface SignupProps {
  onSignup: (user: any) => void;
  onToggleView: () => void;
}

export default function Signup({ onSignup, onToggleView }: SignupProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const user = await api.signup({ name, email: email.trim(), password });
      onSignup(user);
    } catch (err: any) {
      setError(err.message || 'Signup failed. Email may already be in use.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-slate-950 flex flex-col justify-center p-4 font-sans relative overflow-x-hidden overflow-y-auto">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px]"></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md mx-auto bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl shadow-primary/5 border border-gray-100 dark:border-slate-800 p-8 md:p-12 relative z-10"
      >
        <div className="text-center mb-10">
          <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center shadow-xl border border-gray-100 dark:border-slate-800 mx-auto mb-6 overflow-hidden">
            <img
              src="/_png.png"
              alt="Aster Logo"
              className="w-full h-full object-contain p-2"
              onError={(e) => {
                e.currentTarget.src = 'https://ui-avatars.com/api/?name=Aster&background=051733&color=fff';
              }}
            />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">ASTER</h1>
          <p className="text-gray-500 dark:text-slate-400 mt-2">Create your account to get started</p>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider ml-1">Full Name</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:ring-2 focus:ring-primary/20 focus:bg-white dark:focus:bg-slate-800 transition-all outline-none dark:text-white"
                placeholder="John Doe"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider ml-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:ring-2 focus:ring-primary/20 focus:bg-white dark:focus:bg-slate-800 transition-all outline-none dark:text-white"
                placeholder="name@company.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:ring-2 focus:ring-primary/20 focus:bg-white dark:focus:bg-slate-800 transition-all outline-none dark:text-white"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary text-white py-4 rounded-2xl font-bold hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2 group disabled:opacity-70 mt-2"
          >
            {isLoading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                Create Account <Sparkles size={18} className="transition-transform group-hover:scale-110" />
              </>
            )}
          </button>
        </form>

        <div className="mt-10 pt-8 border-t border-gray-100 dark:border-slate-800 text-center">
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-primary hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}