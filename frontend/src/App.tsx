import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { Discover } from './pages/Discover';
import { Pipeline } from './pages/Pipeline';
import { FollowUps } from './pages/FollowUps';
import { Dashboard } from './pages/Dashboard';

const queryClient = new QueryClient();

export const App: React.FC = () => {
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
      setCurrentUser(JSON.parse(stored));
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
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

        <AuthModal
          isOpen={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
          onSuccess={handleAuthSuccess}
        />
      </div>
    </QueryClientProvider>
  );
};

export default App;
