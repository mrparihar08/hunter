import React, { useState, useEffect } from 'react';
import {
  Kanban,
  ShieldAlert,
  Sparkles,
  Mail,
  Calendar,
  ExternalLink,
  ChevronRight,
  Loader2,
  Copy,
  ThumbsUp,
  ThumbsDown,
  Check,
  ArrowUpDown,
  Search,
  Globe,
  Phone,
  MapPin,
  X,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { LeadRecord, LeadStatus, OutreachDraft, WebsiteAudit } from '../types';
import { leadService, auditService, aiService, followUpService } from '../services/api';
import { useToast } from '../components/Toast';

const STAGES: { id: string; label: string }[] = [
  { id: 'ALL', label: 'All Opportunities' },
  { id: 'NEW', label: 'New' },
  { id: 'NEEDS_REVIEW', label: 'Needs Review' },
  { id: 'QUALIFIED', label: 'Qualified' },
  { id: 'CONTACTED', label: 'Contacted' },
  { id: 'REPLIED', label: 'Replied' },
  { id: 'WON', label: 'Won Deal' },
];

const INTENT_FILTERS: { id: string; label: string }[] = [
  { id: 'ALL', label: 'All Intent Types' },
  { id: 'ACTIVE_BUYER', label: 'Active Buyers' },
  { id: 'PROJECT_REQUEST', label: 'Project RFPs' },
  { id: 'BUSINESS_OPPORTUNITY', label: 'Indirect Opps' },
  { id: 'DEVELOPER_PROMOTION', label: 'Dev Promo (Spam)' },
  { id: 'GENERAL_DISCUSSION', label: 'General Discussions' },
];

export const Pipeline: React.FC = () => {
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [selectedStage, setSelectedStage] = useState('ALL');
  const [selectedIntent, setSelectedIntent] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortByScore, setSortByScore] = useState(false);
  const [loading, setLoading] = useState(true);

  // Active Lead Modal / Drawer
  const [activeLead, setActiveLead] = useState<LeadRecord | null>(null);
  const [activeAudit, setActiveAudit] = useState<WebsiteAudit | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [qualifyLoading, setQualifyLoading] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState<string | null>(null);
  const [modalTab, setModalTab] = useState<'intel' | 'audit' | 'pitch' | 'followup'>('intel');

  // Pitch generation
  const [pitchDraft, setPitchDraft] = useState<OutreachDraft | null>(null);
  const [pitchLoading, setPitchLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Follow-up scheduling
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpNote, setFollowUpNote] = useState('');
  const [followUpSaved, setFollowUpSaved] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    loadLeads();
  }, [selectedStage, selectedIntent]);

  const loadLeads = async () => {
    try {
      setLoading(true);
      const params: Record<string, any> = {};
      if (selectedStage !== 'ALL') {
        params.current_status = selectedStage;
      }
      if (selectedIntent !== 'ALL') {
        params.intent_category = selectedIntent;
      }
      const res = await leadService.list(params);
      setLeads(res.items);
    } catch (err) {
      console.error('Error fetching leads:', err);
      toast('Failed to load leads from database', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (leadId: string, newStatus: LeadStatus) => {
    try {
      const updated = await leadService.update(leadId, { current_status: newStatus });
      setLeads((prev) => prev.map((l) => (l.id === leadId ? updated : l)));
      if (activeLead && activeLead.id === leadId) {
        setActiveLead(updated);
      }
      toast(`Status updated to ${newStatus.replace('_', ' ')}`, 'success');
    } catch (err) {
      console.error(err);
      toast('Failed to update lead status', 'error');
    }
  };

  const handleFeedback = async (leadId: string, feedback: 'REAL_BUYER' | 'DEVELOPER_PROMOTION' | 'NOT_RELEVANT') => {
    setFeedbackLoading(leadId);
    try {
      const updated = await leadService.submitFeedback(leadId, feedback);
      setLeads((prev) => prev.map((l) => (l.id === leadId ? updated : l)));
      if (activeLead && activeLead.id === leadId) {
        setActiveLead(updated);
      }
      const labelText =
        feedback === 'REAL_BUYER'
          ? 'Confirmed as Real Buyer'
          : feedback === 'DEVELOPER_PROMOTION'
          ? 'Flagged as Developer Promotion'
          : 'Marked as Not Relevant';
      toast(labelText, 'info', 'Feedback Saved');
    } catch (err: any) {
      toast(err.response?.data?.detail || 'Failed to submit feedback', 'error');
    } finally {
      setFeedbackLoading(null);
    }
  };

  const handleRunAudit = async (lead: LeadRecord) => {
    setAuditLoading(true);
    try {
      const audit = await auditService.triggerAudit(lead.id);
      setActiveAudit(audit);
      setModalTab('audit');
      toast('Website audit completed successfully!', 'success');
    } catch (err: any) {
      toast(err.response?.data?.detail || 'Audit failed', 'error');
    } finally {
      setAuditLoading(false);
    }
  };

  const handleAIQualify = async (lead: LeadRecord) => {
    setQualifyLoading(true);
    try {
      const updated = await aiService.qualify(lead.id);
      setActiveLead(updated);
      setLeads((prev) => prev.map((l) => (l.id === lead.id ? updated : l)));
      toast('Lead intent re-evaluated with Gemini AI', 'success');
    } catch (err: any) {
      toast(err.response?.data?.detail || 'AI qualification failed', 'error');
    } finally {
      setQualifyLoading(false);
    }
  };

  const handleGeneratePitch = async (lead: LeadRecord, channel: string) => {
    setPitchLoading(true);
    try {
      const draft = await aiService.generateOutreach(lead.id, channel);
      setPitchDraft(draft);
      setModalTab('pitch');
      toast(`Outreach draft tailored for ${channel} created!`, 'success');
    } catch (err: any) {
      toast(err.response?.data?.detail || 'Pitch generation failed', 'error');
    } finally {
      setPitchLoading(false);
    }
  };

  const handleScheduleFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLead || !followUpDate) return;
    try {
      await followUpService.create(activeLead.id, followUpDate, followUpNote || 'Follow up with prospective client');
      setFollowUpSaved(true);
      toast('CRM follow-up reminder scheduled!', 'success');
      setTimeout(() => setFollowUpSaved(false), 2000);
      setFollowUpDate('');
      setFollowUpNote('');
    } catch (err: any) {
      toast(err.response?.data?.detail || 'Failed to schedule follow-up', 'error');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast('Pitch copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  // Filter & sorting
  const filteredLeads = leads.filter((lead) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      lead.business_or_title.toLowerCase().includes(term) ||
      (lead.canonical_domain && lead.canonical_domain.toLowerCase().includes(term)) ||
      (lead.city && lead.city.toLowerCase().includes(term))
    );
  });

  const displayLeads = sortByScore
    ? [...filteredLeads].sort((a, b) => (b.lead_score ?? b.ai_fit_score ?? 0) - (a.lead_score ?? a.ai_fit_score ?? 0))
    : filteredLeads;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl glass-panel relative overflow-hidden">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <Kanban className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Lead Intelligence & CRM Pipeline
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            Explainable buyer-intent scoring (0–100), automated anti-freelancer spam filtering, SSRF-safe technical audits, and 1-click relevance feedback.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setSortByScore(!sortByScore)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer ${
              sortByScore
                ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white border-sky-400 shadow-glow-sky'
                : 'bg-slate-800/80 text-slate-300 border-white/[0.08] hover:bg-slate-800 hover:text-white'
            }`}
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>{sortByScore ? 'Sorted: Highest Fit' : 'Sort by Fit Score'}</span>
          </button>
        </div>

        <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-sky-500/10 blur-3xl rounded-full pointer-events-none" />
      </div>

      {/* Search & Filter Bar */}
      <div className="space-y-3.5 glass-panel p-4 rounded-2xl">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search leads by title, domain, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900/90 border border-white/[0.08] focus:border-sky-500 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none"
            />
          </div>

          <div className="text-xs text-slate-400 flex items-center gap-1.5 px-2">
            <span>Showing</span>
            <span className="font-bold text-slate-200">{displayLeads.length}</span>
            <span>of {leads.length} leads</span>
          </div>
        </div>

        {/* Stage Filter Selector */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
          {STAGES.map((s) => {
            const count =
              s.id === 'ALL'
                ? leads.length
                : leads.filter((l) => l.current_status === s.id).length;
            const isSelected = selectedStage === s.id;

            return (
              <button
                key={s.id}
                onClick={() => setSelectedStage(s.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-md shadow-sky-500/20'
                    : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-white/[0.05]'
                }`}
              >
                <span>{s.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Intent Selector Filter */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pt-1 scrollbar-none border-t border-white/[0.05]">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Intent:</span>
          {INTENT_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setSelectedIntent(f.id)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-all cursor-pointer ${
                selectedIntent === f.id
                  ? 'bg-slate-800 text-sky-400 font-bold border border-sky-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Leads Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400 glass-panel rounded-2xl">
          <Loader2 className="w-8 h-8 animate-spin text-sky-400 mb-3" />
          <span className="text-sm font-medium">Evaluating pipeline opportunities with Intent Matrix...</span>
        </div>
      ) : displayLeads.length === 0 ? (
        <div className="p-16 text-center rounded-2xl glass-panel space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center mx-auto shadow-glow-sky">
            <Kanban className="w-6 h-6" />
          </div>
          <p className="text-slate-200 font-bold text-base">No matching leads found</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            Try adjusting your stage or intent filters, or head over to the <strong>Discover Leads</strong> tab to run new high-intent queries across LinkedIn, X, and Reddit.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayLeads.map((lead) => {
            const score = lead.lead_score ?? lead.ai_fit_score;
            const intent = lead.intent_category || (lead.ai_qualification_category as any);
            const isIndirect = intent === 'BUSINESS_OPPORTUNITY';
            const isDevPromo = intent === 'DEVELOPER_PROMOTION';

            return (
              <div
                key={lead.id}
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between glass-card relative group ${
                  isDevPromo
                    ? 'border-rose-500/40 bg-rose-950/10 hover:border-rose-500/60'
                    : isIndirect
                    ? 'border-amber-500/30 hover:border-amber-500/50'
                    : 'border-white/[0.08] hover:border-sky-500/40'
                }`}
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-white/[0.06] uppercase tracking-wider">
                      {lead.sources[0]?.platform || 'RADAR'}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {/* Intent Category Badge */}
                      {intent ? (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            intent === 'ACTIVE_BUYER'
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                              : intent === 'PROJECT_REQUEST'
                              ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                              : intent === 'BUSINESS_OPPORTUNITY'
                              ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                              : intent === 'DEVELOPER_PROMOTION'
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/35'
                              : 'bg-slate-800 text-slate-300 border-white/[0.06]'
                          }`}
                        >
                          {intent === 'ACTIVE_BUYER'
                            ? 'Active Buyer'
                            : intent === 'PROJECT_REQUEST'
                            ? 'Project RFP'
                            : intent === 'BUSINESS_OPPORTUNITY'
                            ? 'Indirect Opportunity'
                            : intent === 'DEVELOPER_PROMOTION'
                            ? 'Dev Promo (Spam)'
                            : intent}
                        </span>
                      ) : null}

                      {/* Score Badge */}
                      {score !== undefined && score !== null ? (
                        <span
                          className={`text-[11px] font-extrabold px-2 py-0.5 rounded-md border ${
                            score >= 80
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 shadow-glow-emerald'
                              : score >= 50
                              ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                              : 'bg-slate-800 text-slate-400 border-white/[0.06]'
                          }`}
                        >
                          {score}/100
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <h3 className="font-bold text-sm sm:text-base text-white line-clamp-2 leading-snug group-hover:text-sky-300 transition-colors">
                    {lead.business_or_title}
                  </h3>

                  <div className="mt-2.5 space-y-1 text-xs text-slate-400">
                    {lead.canonical_domain && (
                      <p className="truncate font-mono text-sky-400 flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 shrink-0" />
                        <span>{lead.canonical_domain}</span>
                      </p>
                    )}
                    {lead.normalized_phone && (
                      <p className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                        <span>{lead.normalized_phone}</span>
                      </p>
                    )}
                    {lead.city && (
                      <p className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                        <span>{lead.city}</span>
                      </p>
                    )}
                  </div>

                  {/* Indirect Notice */}
                  {isIndirect && (
                    <div className="mt-2.5 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 font-medium flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Indirect lead: Cold pitch based on audit flaws.</span>
                    </div>
                  )}

                  {/* Explanation Snippet */}
                  {(lead.explanation || lead.ai_qualification_reason) && (
                    <p className="mt-2.5 p-2.5 rounded-xl bg-slate-900/80 border border-white/[0.05] text-[11px] text-slate-300 line-clamp-2 italic leading-relaxed">
                      "{lead.explanation || lead.ai_qualification_reason}"
                    </p>
                  )}

                  {/* Evidence pills preview */}
                  {lead.positive_evidence && lead.positive_evidence.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {lead.positive_evidence.slice(0, 2).map((ev, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center gap-1 truncate max-w-[200px]"
                        >
                          <Check className="w-2.5 h-2.5 shrink-0" />
                          <span className="truncate">{ev}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bottom Actions & Feedback */}
                <div className="mt-4 pt-3 border-t border-white/[0.06] space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <select
                      value={lead.current_status}
                      onChange={(e) => handleStatusChange(lead.id, e.target.value as LeadStatus)}
                      className="bg-slate-900 border border-white/[0.08] rounded-lg px-2.5 py-1 text-xs text-slate-200 font-medium focus:outline-none focus:border-sky-500"
                    >
                      <option value="NEW">New</option>
                      <option value="NEEDS_REVIEW">Needs Review</option>
                      <option value="QUALIFIED">Qualified</option>
                      <option value="CONTACTED">Contacted</option>
                      <option value="REPLIED">Replied</option>
                      <option value="MEETING_SCHEDULED">Meeting</option>
                      <option value="PROPOSAL_SENT">Proposal</option>
                      <option value="WON">Won Deal</option>
                      <option value="LOST">Lost</option>
                      <option value="NOT_RELEVANT">Not Relevant</option>
                    </select>

                    <button
                      onClick={() => {
                        setActiveLead(lead);
                        setActiveAudit(null);
                        setPitchDraft(null);
                        setModalTab('intel');
                      }}
                      className="inline-flex items-center gap-1 text-xs font-bold text-sky-400 hover:text-sky-300 px-2.5 py-1 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 transition-all cursor-pointer"
                    >
                      <span>Open Hub</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Feedback Bar */}
                  <div className="flex items-center justify-between gap-1 pt-1 border-t border-white/[0.04]">
                    <span className="text-[10px] text-slate-500 font-medium">Relevance:</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleFeedback(lead.id, 'REAL_BUYER')}
                        disabled={feedbackLoading === lead.id}
                        title="Mark as Real Buyer"
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-all flex items-center gap-0.5 cursor-pointer ${
                          lead.feedback_label === 'REAL_BUYER'
                            ? 'bg-emerald-500/25 text-emerald-300 border-emerald-500/50'
                            : 'bg-slate-900 text-slate-400 border-white/[0.06] hover:text-emerald-400 hover:border-emerald-500/30'
                        }`}
                      >
                        <ThumbsUp className="w-2.5 h-2.5" />
                        <span>Buyer</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleFeedback(lead.id, 'DEVELOPER_PROMOTION')}
                        disabled={feedbackLoading === lead.id}
                        title="Mark as Developer Promotion"
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-all flex items-center gap-0.5 cursor-pointer ${
                          lead.feedback_label === 'DEVELOPER_PROMOTION'
                            ? 'bg-rose-500/25 text-rose-300 border-rose-500/50'
                            : 'bg-slate-900 text-slate-400 border-white/[0.06] hover:text-rose-400 hover:border-rose-500/30'
                        }`}
                      >
                        <ThumbsDown className="w-2.5 h-2.5" />
                        <span>Promo</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleFeedback(lead.id, 'NOT_RELEVANT')}
                        disabled={feedbackLoading === lead.id}
                        title="Mark as Not Relevant"
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-all cursor-pointer ${
                          lead.feedback_label === 'NOT_RELEVANT'
                            ? 'bg-slate-800 text-slate-300 border-slate-600'
                            : 'bg-slate-900 text-slate-500 border-white/[0.06] hover:text-slate-300'
                        }`}
                      >
                        Irrelevant
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Active Lead Intelligence Hub Modal */}
      {activeLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="glass-panel border border-white/[0.1] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-5 animate-scale-in relative">
            {/* Ambient accent */}
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-64 h-32 bg-sky-500/20 blur-3xl rounded-full pointer-events-none" />

            {/* Header */}
            <div className="flex items-start justify-between border-b border-white/[0.08] pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-400 border border-sky-500/20 font-bold uppercase tracking-wider">
                    {activeLead.lead_type}
                  </span>
                  {activeLead.intent_category && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold">
                      {activeLead.intent_category}
                    </span>
                  )}
                  {(activeLead.lead_score !== undefined || activeLead.ai_fit_score !== undefined) && (
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 border border-white/[0.08] font-extrabold">
                      Score: {activeLead.lead_score ?? activeLead.ai_fit_score}/100
                    </span>
                  )}
                </div>

                <h2 className="text-xl font-black text-white tracking-tight">{activeLead.business_or_title}</h2>
                {activeLead.canonical_domain && (
                  <a
                    href={`https://${activeLead.canonical_domain}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-sky-400 hover:text-sky-300 inline-flex items-center gap-1 mt-1 font-mono hover:underline"
                  >
                    <span>{activeLead.canonical_domain}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              <button
                onClick={() => setActiveLead(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Internal Navigation */}
            <div className="flex rounded-xl bg-slate-950/70 p-1 border border-white/[0.06] overflow-x-auto">
              {[
                { id: 'intel', label: 'Intent Intel', icon: Sparkles },
                { id: 'audit', label: 'Site Audit', icon: ShieldAlert },
                { id: 'pitch', label: 'AI Pitch Draft', icon: Mail },
                { id: 'followup', label: 'CRM Task', icon: Calendar },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = modalTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setModalTab(tab.id as any)}
                    className={`flex-1 min-w-[100px] py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      isActive
                        ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-md shadow-sky-500/20'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab 1: Intent Intel & Evidence */}
            {modalTab === 'intel' && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-900/80 border border-white/[0.06] space-y-3">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Explainable Evaluation Model</span>
                  </h4>

                  <p className="text-xs text-slate-200 leading-relaxed italic bg-slate-950/60 p-3 rounded-lg border border-white/[0.04]">
                    "{activeLead.explanation || activeLead.ai_qualification_reason || 'Evaluated via lead classification heuristics.'}"
                  </p>

                  {activeLead.positive_evidence && activeLead.positive_evidence.length > 0 && (
                    <div className="pt-2 border-t border-white/[0.06]">
                      <span className="text-[11px] font-bold text-emerald-400 block mb-1.5">
                        Positive Buying Signals Detected:
                      </span>
                      <ul className="text-xs text-slate-300 space-y-1.5 list-none">
                        {activeLead.positive_evidence.map((ev, idx) => (
                          <li key={idx} className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            <span>{ev}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {activeLead.negative_evidence && activeLead.negative_evidence.length > 0 && (
                    <div className="pt-2 border-t border-white/[0.06]">
                      <span className="text-[11px] font-bold text-rose-400 block mb-1.5">
                        Negative Exclusions Checked:
                      </span>
                      <ul className="text-xs text-slate-300 space-y-1.5 list-none">
                        {activeLead.negative_evidence.map((ev, idx) => (
                          <li key={idx} className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                            <span>{ev}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleAIQualify(activeLead)}
                    disabled={qualifyLoading}
                    className="flex-1 py-2 px-3 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                    <span>{qualifyLoading ? 'Re-scoring with Gemini...' : 'Re-Evaluate with Gemini AI'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Tab 2: Website Audit */}
            {modalTab === 'audit' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-medium">SSRF-Safe Automated Web Scan</span>
                  <button
                    onClick={() => handleRunAudit(activeLead)}
                    disabled={auditLoading || !activeLead.canonical_domain}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs disabled:opacity-50 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>{auditLoading ? 'Running Scan...' : 'Trigger New Scan'}</span>
                  </button>
                </div>

                {activeAudit ? (
                  <div className="p-4 rounded-xl bg-slate-900/80 border border-white/[0.06] space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="p-3 rounded-lg bg-slate-950 border border-white/[0.06]">
                        <span className="text-slate-400 text-[10px] block mb-0.5">SSL Protocol</span>
                        <p className={`font-bold ${activeAudit.is_https ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {activeAudit.is_https ? 'Secure (HTTPS)' : 'Insecure (HTTP)'}
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-950 border border-white/[0.06]">
                        <span className="text-slate-400 text-[10px] block mb-0.5">Mobile Viewport</span>
                        <p className={`font-bold ${activeAudit.has_mobile_viewport ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {activeAudit.has_mobile_viewport ? 'Responsive' : 'Missing'}
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-950 border border-white/[0.06]">
                        <span className="text-slate-400 text-[10px] block mb-0.5">Response Time</span>
                        <p className="font-bold text-slate-200">{activeAudit.page_load_ms || 0} ms</p>
                      </div>
                    </div>

                    {activeAudit.identified_issues.length > 0 && (
                      <div className="space-y-1.5 pt-2">
                        <span className="text-xs font-bold text-rose-400">Issues detected to cite in outreach:</span>
                        <ul className="text-xs text-slate-300 space-y-1 pl-4 list-disc">
                          {activeAudit.identified_issues.map((issue, idx) => (
                            <li key={idx}>{issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-8 text-center rounded-xl bg-slate-900/50 border border-white/[0.06]">
                    <ShieldAlert className="w-8 h-8 text-amber-400 mx-auto mb-2 opacity-80" />
                    <p className="text-xs text-slate-300 font-semibold">No audit cached for this lead</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {activeLead.canonical_domain
                        ? 'Click "Trigger New Scan" above to run an instant automated health audit.'
                        : 'No canonical domain registered on this lead.'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: AI Outreach Pitch Generator */}
            {modalTab === 'pitch' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Select target pitch channel:</span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleGeneratePitch(activeLead, 'EMAIL')}
                      disabled={pitchLoading}
                      className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      Email Pitch
                    </button>
                    <button
                      onClick={() => handleGeneratePitch(activeLead, 'LINKEDIN')}
                      disabled={pitchLoading}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      LinkedIn InMail
                    </button>
                  </div>
                </div>

                {pitchLoading && (
                  <div className="p-8 text-center text-slate-400 text-xs bg-slate-900/60 rounded-xl">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-sky-400 mb-2" />
                    <span>Synthesizing cold pitch addressing verified technical audit flaws...</span>
                  </div>
                )}

                {pitchDraft && (
                  <div className="p-4 rounded-xl bg-slate-900/80 border border-white/[0.06] space-y-3">
                    {pitchDraft.subject_line && (
                      <div className="p-2.5 rounded-lg bg-slate-950 border border-white/[0.06] font-semibold text-xs text-amber-400">
                        Subject: {pitchDraft.subject_line}
                      </div>
                    )}
                    <div className="p-3.5 rounded-lg bg-slate-950 border border-white/[0.06] font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed select-all">
                      {pitchDraft.body_text}
                    </div>
                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => copyToClipboard(pitchDraft.body_text)}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-bold flex items-center gap-1.5 border border-white/[0.08] transition-colors cursor-pointer"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copied ? 'Copied to Clipboard' : 'Copy Pitch'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 4: CRM Follow-Up Task Scheduler */}
            {modalTab === 'followup' && (
              <div className="space-y-4">
                <form onSubmit={handleScheduleFollowUp} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Due Date *</label>
                    <input
                      type="date"
                      required
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                      className="w-full bg-slate-900 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Follow-up Note *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Check if client viewed audit teardown; offer quick wireframe call..."
                      value={followUpNote}
                      onChange={(e) => setFollowUpNote(e.target.value)}
                      className="w-full bg-slate-900 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                  >
                    Schedule Follow-up Reminder
                  </button>
                </form>

                {followUpSaved && (
                  <p className="text-xs text-emerald-400 font-semibold text-center flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Follow-up scheduled! View in Follow-ups tab.</span>
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
