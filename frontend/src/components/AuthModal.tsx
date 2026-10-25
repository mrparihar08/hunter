import React, { useState, useEffect } from 'react';
import { User, Lock, Mail, ShieldCheck, AlertCircle, UserPlus, LogIn, X, Sparkles } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from './Toast';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [isRegisterMode, setIsRegisterMode] = useState<boolean>(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      checkSetupStatus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const checkSetupStatus = async () => {
    try {
      const res = await api.get('/auth/setup-status');
      const initialized = res.data?.is_initialized;
      if (!initialized) {
        setIsRegisterMode(true);
      }
    } catch {
      // offline / mock fallback
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegisterMode) {
        // Bootstrap Initial Owner
        const res = await api.post('/auth/bootstrap-owner', {
          email: email.trim().toLowerCase(),
          password,
          full_name: fullName.trim() || 'Workspace Owner',
          role: 'OWNER_ADMIN',
        });
        localStorage.setItem('hunter_token', res.data.access_token);
        localStorage.setItem('hunter_user', JSON.stringify(res.data.user));
        toast('Workspace Owner created successfully!', 'success', 'Welcome');
        onSuccess();
        onClose();
      } else {
        // Normal OAuth2 form login
        const formData = new FormData();
        formData.append('username', email.trim().toLowerCase());
        formData.append('password', password);

        const res = await api.post('/auth/login', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        localStorage.setItem('hunter_token', res.data.access_token);
        localStorage.setItem('hunter_user', JSON.stringify(res.data.user));
        toast(`Signed in as ${res.data.user?.full_name || 'Admin'}`, 'success', 'Session Active');
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Authentication failed. Please verify credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div 
        className="glass-panel border border-white/[0.1] rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-5 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow ambient accent */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-24 bg-sky-500/20 blur-3xl rounded-full pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500/20 to-indigo-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center font-bold shadow-glow-sky">
              <ShieldCheck className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
                {isRegisterMode ? 'Setup Workspace Owner' : 'Sign In to Workspace'}
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              </h3>
              <p className="text-xs text-slate-400">
                {isRegisterMode
                  ? 'First-time setup: initialize secure admin credentials'
                  : 'Enter credentials to access saved leads & pipeline'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex rounded-xl bg-slate-950/70 p-1 border border-white/[0.06]">
          <button
            type="button"
            onClick={() => {
              setIsRegisterMode(false);
              setError(null);
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              !isRegisterMode
                ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-md shadow-sky-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsRegisterMode(true);
              setError(null);
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              isRegisterMode
                ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-md shadow-sky-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Setup Owner</span>
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl text-xs font-medium bg-rose-500/10 text-rose-300 border border-rose-500/30 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {isRegisterMode && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name *</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Preet (Owner)"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-900/90 border border-white/[0.08] focus:border-sky-500 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 transition-colors focus:outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address *</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                placeholder="admin@hunter.io"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-900/90 border border-white/[0.08] focus:border-sky-500 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 transition-colors focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Password *</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900/90 border border-white/[0.08] focus:border-sky-500 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 transition-colors focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Processing...</span>
                </>
              ) : isRegisterMode ? (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Create Owner Account</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Sign In to Workspace</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
