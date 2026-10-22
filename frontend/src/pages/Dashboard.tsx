import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, Flame, Award, Clock, ArrowUpRight } from 'lucide-react';
import { analyticsService } from '../services/api';

export const Dashboard: React.FC<{ onNavigate: (tab: string) => void }> = ({ onNavigate }) => {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const res = await analyticsService.getOverview();
      setData(res);
    } catch (err) {
      console.error(err);
    }
  };

  const totalLeads = data?.total_active_leads || 0;
  const pipeline = data?.pipeline_counts || {};
  const followupsDue = data?.followups_due_today || 0;
  const wonDeals = pipeline['WON'] || 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <LayoutDashboard className="w-6 h-6 text-sky-400" />
          Workspace Analytics & Conversion Health
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          High-level overview of discovered leads, conversion stages, and follow-ups.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Leads</span>
            <p className="text-3xl font-extrabold text-white mt-1">{totalLeads}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Qualified Leads</span>
            <p className="text-3xl font-extrabold text-emerald-400 mt-1">{pipeline['QUALIFIED'] || 0}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Flame className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Follow-ups Due</span>
            <p className="text-3xl font-extrabold text-amber-400 mt-1">{followupsDue}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Won Projects</span>
            <p className="text-3xl font-extrabold text-indigo-400 mt-1">{wonDeals}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Award className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Quick Launch Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          onClick={() => onNavigate('discover')}
          className="p-6 rounded-2xl bg-gradient-to-br from-slate-850 to-slate-800 border border-slate-750 hover:border-sky-500/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg text-white">Find New Opportunities</h3>
            <ArrowUpRight className="w-5 h-5 text-sky-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Launch pre-filtered deep queries for LinkedIn, Twitter, and Upwork to uncover business owners seeking developers.
          </p>
        </div>

        <div
          onClick={() => onNavigate('pipeline')}
          className="p-6 rounded-2xl bg-gradient-to-br from-slate-850 to-slate-800 border border-slate-750 hover:border-emerald-500/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg text-white">Review Lead Pipeline</h3>
            <ArrowUpRight className="w-5 h-5 text-emerald-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Run technical website audits, generate AI cold pitch drafts, and move qualified deals towards won contracts.
          </p>
        </div>
      </div>
    </div>
  );
};
