import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Navbar } from './components/Navbar';
import { Discover } from './pages/Discover';
import { Pipeline } from './pages/Pipeline';
import { FollowUps } from './pages/FollowUps';
import { Dashboard } from './pages/Dashboard';

const queryClient = new QueryClient();

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState('discover');

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
        <Navbar currentTab={currentTab} onTabChange={setCurrentTab} />

        <main className="flex-1 pb-16">
          {currentTab === 'discover' && <Discover />}
          {currentTab === 'pipeline' && <Pipeline />}
          {currentTab === 'followups' && <FollowUps />}
          {currentTab === 'dashboard' && <Dashboard onNavigate={setCurrentTab} />}
        </main>
      </div>
    </QueryClientProvider>
  );
};

export default App;
