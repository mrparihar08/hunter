import React from 'react';
import { Compass, Kanban, CalendarCheck2, LayoutDashboard, ShieldCheck, LogIn, LogOut, Radio } from 'lucide-react';

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
    { id: 'discover', label: 'Discover Leads', icon: Compass, badgeText: 'Live' },
    { id: 'pipeline', label: 'Lead Pipeline', icon: Kanban },
    { id: 'followups', label: 'Follow-ups', icon: CalendarCheck2, count: dueTasksCount },
    { id: 'dashboard', label: 'Analytics', icon: LayoutDashboard },
  ];

  return (
    <header className="border-b border-white/[0.08] bg-slate-900/80 backdrop-blur-xl sticky top-0 z-40 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16 gap-4">
        {/* Logo and Workspace Label */}
        <div className="flex items-center space-x-3 shrink-0">
          <div className="relative group cursor-pointer" onClick={() => onTabChange('discover')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 via-indigo-600 to-sky-400 p-[1px] shadow-lg shadow-sky-500/20 group-hover:shadow-sky-500/35 transition-all">
              <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center">
                <span className="font-black text-transparent bg-clip-text bg-gradient-to-tr from-sky-400 to-indigo-200 text-lg">
                  H
                </span>
              </div>
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900 animate-pulse" />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg text-white tracking-tight leading-none">Hunter</span>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Radio className="w-2.5 h-2.5 animate-pulse text-sky-400" />
                Live Radar
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">B2B Web Dev Discovery</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center space-x-1 sm:space-x-1.5 p-1 rounded-xl bg-slate-950/60 border border-white/[0.06] overflow-x-auto scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex items-center space-x-2 px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap relative ${
                  isActive
                    ? 'bg-gradient-to-r from-sky-500/20 via-sky-500/15 to-indigo-500/20 text-sky-300 border border-sky-500/40 shadow-sm shadow-sky-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-sky-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
                {item.count && item.count > 0 ? (
                  <span className="ml-1 px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {item.count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        {/* User Account Controls */}
        <div className="flex items-center space-x-3 text-xs shrink-0">
          {user ? (
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-white/[0.08] shadow-sm">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-sky-500 text-white font-bold flex items-center justify-center text-[10px]">
                  {(user.full_name || user.email || 'U')[0].toUpperCase()}
                </div>
                <div className="hidden md:flex flex-col text-left">
                  <span className="text-slate-200 font-semibold leading-tight line-clamp-1 max-w-[120px]">
                    {user.full_name || user.email}
                  </span>
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium">
                    <ShieldCheck className="w-2.5 h-2.5" />
                    Verified
                  </span>
                </div>
              </div>

              <button
                onClick={onLogout}
                title="Sign out"
                className="p-2 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-rose-400 border border-white/[0.06] transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-sky-500/25 transition-all transform active:scale-95"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In / Admin</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
