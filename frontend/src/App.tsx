import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { Discover } from './pages/Discover';
import { Pipeline } from './pages/Pipeline';
import { FollowUps } from './pages/FollowUps';
import { Dashboard } from './pages/Dashboard';
import { ToastProvider } from './components/Toast';

const queryClient = new QueryClient();

export const AppContent: React.FC = () => {
  const [currentTab, setCurrentTab] = useState('discover');
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const stored = localStorage.getItem('hunter_user');
    if (stored) {
      try {
        setCurrentUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem('hunter_user');
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('hunter_token');
    localStorage.removeItem('hunter_user');
    setCurrentUser(null);
  };

  const handleAuthSuccess = () => {
    const stored = localStorage.getItem('hunter_user');
    if (stored) {
      try {
        setCurrentUser(JSON.parse(stored));
      } catch {}
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans relative selection:bg-sky-500/30 selection:text-sky-200 bg-ambient-mesh">
      {/* Decorative top ambient glow line */}
      <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-sky-500/60 to-transparent opacity-80" />

      <Navbar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        user={currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
      />

      <main className="flex-1 pb-16">
        {currentTab === 'discover' && <Discover />}
        {currentTab === 'pipeline' && <Pipeline />}
        {currentTab === 'followups' && <FollowUps />}
        {currentTab === 'dashboard' && <Dashboard onNavigate={setCurrentTab} />}
      </main>

      {/* Modern micro footer */}
      <footer className="border-t border-white/[0.05] py-4 px-6 text-center text-xs text-slate-500 bg-slate-950/60 backdrop-blur">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-400 font-medium">Hunter B2B Engine v2.4</span>
            <span className="text-slate-600">|</span>
            <span>Real-Time Buyer Intent Radar</span>
          </div>
          <div className="text-slate-500 text-[11px]">
            Private Workspace &bull; Encrypted Storage &bull; Anti-Spam Filtering
          </div>
        </div>
      </footer>

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </QueryClientProvider>
  );
};

export default App;
