import React from 'react';
import { Compass, Kanban, CalendarCheck2, LayoutDashboard, ShieldCheck, LogIn, LogOut } from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  dueTasksCount?: number;
  user: any;
  onOpenAuth: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  dueTasksCount = 0,
  user,
  onOpenAuth,
  onLogout,
}) => {
  const navItems = [
    { id: 'discover', label: 'Discover Leads', icon: Compass },
    { id: 'pipeline', label: 'Lead Pipeline', icon: Kanban },
    { id: 'followups', label: 'Follow-ups', icon: CalendarCheck2, badge: dueTasksCount },
    { id: 'dashboard', label: 'Analytics', icon: LayoutDashboard },
  ];

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-sky-500/20">
            H
          </div>
          <div>
            <span className="font-bold text-lg text-white tracking-tight">Hunter</span>
            <span className="text-xs ml-2 px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
              Private Workspace
            </span>
          </div>
        </div>

        <nav className="flex items-center space-x-1 sm:space-x-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors relative ${
                  isActive
                    ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
                {item.badge && item.badge > 0 ? (
                  <span className="ml-1 px-1.5 py-0.5 text-xs font-semibold rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center space-x-3 text-xs text-slate-400">
          {user ? (
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-slate-200 font-medium">{user.full_name || user.email}</span>
              </div>
              <button
                onClick={onLogout}
                title="Sign out"
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold shadow-md shadow-sky-500/20 transition-all text-xs"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In / Setup</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
