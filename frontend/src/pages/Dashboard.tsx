import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  Flame,
  Award,
  Clock,
  ArrowUpRight,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Target,
  Zap,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { analyticsService } from '../services/api';
import { useToast } from '../components/Toast';

export const Dashboard: React.FC<{ onNavigate: (tab: string) => void }> = ({ onNavigate }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const { toast } = useToast();

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const res = await analyticsService.getOverview();
      setData(res);
    } catch (err) {
      console.error(err);
      toast('Failed to refresh dashboard analytics', 'error');
    } finally {
      setLoading(false);
    }
  };

  const totalLeads = data?.total_active_leads || 0;
  const pipeline = data?.pipeline_counts || {};
  const followupsDue = data?.followups_due_today || 0;
  const wonDeals = pipeline['WON'] || 0;
  const qualifiedDeals = pipeline['QUALIFIED'] || 0;
  const contactedDeals = (pipeline['CONTACTED'] || 0) + (pipeline['REPLIED'] || 0);

  // Conversion rate calculation
  const qualificationRate = totalLeads > 0 ? Math.round((qualifiedDeals / totalLeads) * 100) : 0;
  const winRate = totalLeads > 0 ? Math.round((wonDeals / totalLeads) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl glass-panel relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <LayoutDashboard className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Workspace Analytics & Pipeline Health
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
            Real-time telemetry tracking buyer discovery volume, automated AI intent qualification, follow-up cadence, and deal win rates.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <button
            onClick={loadStats}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white border border-white/[0.08] text-xs font-semibold transition-all cursor-pointer"
            title="Refresh statistics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-sky-400' : ''}`} />
            <span>{loading ? 'Refreshing...' : 'Refresh Data'}</span>
          </button>
        </div>

        {/* Ambient background decoration */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-sky-500/10 blur-3xl rounded-full pointer-events-none" />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Leads */}
        <div className="p-5 rounded-2xl glass-card relative group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Discovered Leads
            </span>
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 group-hover:scale-105 transition-transform shadow-glow-sky">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <p className="text-3xl font-black text-white tracking-tight">{totalLeads}</p>
            <span className="text-xs font-semibold text-slate-400">active items</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-sky-400 font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Across 34 monitored channels</span>
          </div>
        </div>

        {/* Qualified Leads */}
        <div className="p-5 rounded-2xl glass-card relative group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              High-Intent Leads
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform shadow-glow-emerald">
              <Flame className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <p className="text-3xl font-black text-emerald-400 tracking-tight">{qualifiedDeals}</p>
            <span className="text-xs font-semibold text-emerald-500/80">{qualificationRate}% qualification</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Passed AI buyer intent screening</span>
          </div>
        </div>

        {/* Follow-ups Due */}
        <div className="p-5 rounded-2xl glass-card relative group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Follow-ups Due Today
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <p className="text-3xl font-black text-amber-400 tracking-tight">{followupsDue}</p>
            <span className="text-xs font-semibold text-slate-400">pending tasks</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-amber-400 font-medium">
            <Target className="w-3.5 h-3.5" />
            <span>{followupsDue > 0 ? 'Requires client outreach' : 'Schedule reminders in Pipeline'}</span>
          </div>
        </div>

        {/* Won Projects */}
        <div className="p-5 rounded-2xl glass-card relative group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Won Contracts
            </span>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform shadow-glow-indigo">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <p className="text-3xl font-black text-indigo-400 tracking-tight">{wonDeals}</p>
            <span className="text-xs font-semibold text-indigo-300">{winRate}% conversion</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-indigo-300 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Closed client engagements</span>
          </div>
        </div>
      </div>

      {/* Pipeline Funnel & Distribution */}
      <div className="p-6 rounded-2xl glass-panel space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-sky-400" />
              <span>Conversion Funnel & Pipeline Distribution</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Breakdown of opportunities by lifecycle stage in your private database.
            </p>
          </div>
          <button
            onClick={() => onNavigate('pipeline')}
            className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 font-semibold"
          >
            <span>Open Pipeline</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
          {[
            { label: 'New Discovered', count: pipeline['NEW'] || 0, color: 'bg-sky-500', text: 'text-sky-400' },
            { label: 'Qualified', count: qualifiedDeals, color: 'bg-emerald-500', text: 'text-emerald-400' },
            { label: 'Contacted / Pitch Sent', count: contactedDeals, color: 'bg-indigo-500', text: 'text-indigo-400' },
            { label: 'Deals Won', count: wonDeals, color: 'bg-purple-500', text: 'text-purple-400' },
          ].map((stage, idx) => {
            const percent = totalLeads > 0 ? Math.round((stage.count / totalLeads) * 100) : 0;
            return (
              <div key={idx} className="p-4 rounded-xl bg-slate-900/80 border border-white/[0.06] space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-400">{stage.label}</span>
                  <span className={`${stage.text} font-bold`}>{stage.count}</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full ${stage.color} rounded-full transition-all duration-500`}
                    style={{ width: `${Math.min(100, Math.max(8, percent))}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-500 text-right">
                  {percent}% of active leads
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Launch Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          onClick={() => onNavigate('discover')}
          className="p-6 rounded-2xl glass-panel hover:border-sky-500/40 transition-all cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                <Target className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-white">Find New Client Opportunities</h3>
            </div>
            <ArrowUpRight className="w-5 h-5 text-sky-400 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          </div>
          <p className="text-xs text-slate-400 mt-3 leading-relaxed">
            Execute targeted queries across X (Twitter), LinkedIn, Reddit, Upwork, and Hacker News with zero-spam negative keyword filters.
          </p>
        </div>

        <div
          onClick={() => onNavigate('pipeline')}
          className="p-6 rounded-2xl glass-panel hover:border-emerald-500/40 transition-all cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                <Flame className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-white">Manage & Qualify Leads</h3>
            </div>
            <ArrowUpRight className="w-5 h-5 text-emerald-400 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          </div>
          <p className="text-xs text-slate-400 mt-3 leading-relaxed">
            Run automated site audits, generate AI cold outreach pitches, manage deal stages, and submit buyer feedback to train the intelligence engine.
          </p>
        </div>
      </div>

      {/* Pro Tips Callout */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-sky-950/40 via-indigo-950/30 to-slate-900 border border-sky-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 shrink-0 mt-0.5">
            <Sparkles className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Outreach Best Practice</h4>
            <p className="text-xs text-slate-300 mt-0.5">
              Deals in <strong>Group C (Existing Website Problems)</strong> convert 3x higher when pitch emails reference concrete mobile or load-speed issues uncovered in the Website Audit tab.
            </p>
          </div>
        </div>
        <button
          onClick={() => onNavigate('discover')}
          className="shrink-0 px-3 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/30 text-xs font-bold transition-colors cursor-pointer"
        >
          Explore Group C
        </button>
      </div>
    </div>
  );
};
