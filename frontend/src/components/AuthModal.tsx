import React, { useState, useEffect } from 'react';
import { User, Lock, Mail, ShieldCheck, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [isInitialized, setIsInitialized] = useState<boolean>(true);
  const [isRegisterMode, setIsRegisterMode] = useState<boolean>(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      checkSetupStatus();
    }
  }, [isOpen]);

  const checkSetupStatus = async () => {
    try {
      const res = await api.get('/auth/setup-status');
      const initialized = res.data?.is_initialized;
      setIsInitialized(initialized);
      if (!initialized) {
        setIsRegisterMode(true);
      }
    } catch {
      // If db check fails, fallback to login
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!isInitialized || isRegisterMode) {
        // Bootstrap Initial Owner
        const res = await api.post('/auth/bootstrap-owner', {
          email,
          password,
          full_name: fullName || 'Workspace Owner',
          role: 'OWNER_ADMIN',
        });
        localStorage.setItem('hunter_token', res.data.access_token);
        localStorage.setItem('hunter_user', JSON.stringify(res.data.user));
        onSuccess();
        onClose();
      } else {
        // Normal OAuth2 form login
        const formData = new FormData();
        formData.append('username', email);
        formData.append('password', password);

        const res = await api.post('/auth/login', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        localStorage.setItem('hunter_token', res.data.access_token);
        localStorage.setItem('hunter_user', JSON.stringify(res.data.user));
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {!isInitialized ? 'Setup Workspace Owner' : 'Sign In to Workspace'}
              </h3>
              <p className="text-xs text-slate-400">
                {!isInitialized
                  ? 'First-time setup: create your owner account'
                  : 'Enter your credentials to access leads'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white font-bold">
            ✕
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg text-xs font-medium mb-4 bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {(!isInitialized || isRegisterMode) && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  placeholder="Your Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                placeholder="admin@hunter.local"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-sm transition-all disabled:opacity-50 shadow-lg shadow-sky-500/20"
            >
              {loading ? 'Please wait...' : !isInitialized ? 'Initialize Owner Account' : 'Sign In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
