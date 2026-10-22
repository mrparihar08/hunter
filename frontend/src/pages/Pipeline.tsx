import React, { useState, useEffect } from 'react';
import {
  KanBan,
  ShieldAlert,
  Sparkles,
  Mail,
  Calendar,
  ExternalLink,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Copy,
} from 'lucide-react';
import { LeadRecord, LeadStatus, OutreachDraft, WebsiteAudit } from '../types';
import { leadService, auditService, aiService, followUpService } from '../services/api';

const STAGES: { id: string; label: string }[] = [
  { id: 'ALL', label: 'All Leads' },
  { id: 'NEW', label: 'New' },
  { id: 'QUALIFIED', label: 'Qualified' },
  { id: 'CONTACTED', label: 'Contacted' },
  { id: 'REPLIED', label: 'Replied' },
  { id: 'WON', label: 'Won Deal' },
];

export const Pipeline: React.FC = () => {
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [selectedStage, setSelectedStage] = useState('ALL');
  const [loading, setLoading] = useState(true);

  // Active Lead Modal / Drawer
  const [activeLead, setActiveLead] = useState<LeadRecord | null>(null);
  const [activeAudit, setActiveAudit] = useState<WebsiteAudit | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [qualifyLoading, setQualifyLoading] = useState(false);

  // Pitch generation
  const [pitchDraft, setPitchDraft] = useState<OutreachDraft | null>(null);
  const [pitchLoading, setPitchLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Follow-up scheduling
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpNote, setFollowUpNote] = useState('');
  const [followUpSaved, setFollowUpSaved] = useState(false);

  useEffect(() => {
    loadLeads();
  }, [selectedStage]);

  const loadLeads = async () => {
    try {
      setLoading(true);
      const params = selectedStage !== 'ALL' ? { current_status: selectedStage } : {};
      const res = await leadService.list(params);
      setLeads(res.items);
    } catch (err) {
      console.error('Error fetching leads:', err);
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
    } catch (err) {
      console.error(err);
    }
  };

  const handleRunAudit = async (lead: LeadRecord) => {
    setAuditLoading(true);
    try {
      const audit = await auditService.triggerAudit(lead.id);
      setActiveAudit(audit);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Audit failed');
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
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Qualification failed');
    } finally {
      setQualifyLoading(false);
    }
  };

  const handleGeneratePitch = async (lead: LeadRecord, channel: string) => {
    setPitchLoading(true);
    try {
      const draft = await aiService.generateOutreach(lead.id, channel);
      setPitchDraft(draft);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Pitch generation failed');
    } finally {
      setPitchLoading(false);
    }
  };

  const handleScheduleFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLead || !followUpDate) return;
    try {
      await followUpService.create(activeLead.id, followUpDate, followUpNote || 'Follow up with client');
      setFollowUpSaved(true);
      setTimeout(() => setFollowUpSaved(false), 2000);
      setFollowUpDate('');
      setFollowUpNote('');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to schedule follow-up');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header & Stage Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <KanBan className="w-6 h-6 text-sky-400" />
            Lead Pipeline Management
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Track active opportunities, run technical health checks, and generate contextual pitches.
          </p>
        </div>
      </div>

      {/* Stage Selector */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-3 overflow-x-auto">
        {STAGES.map((s) => (
          <button
            key={s.id}
            onClick={() => setSelectedStage(s.id)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedStage === s.id
                ? 'bg-sky-500 text-slate-950 font-bold'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Leads Table / Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin text-sky-400 mr-2" />
          <span>Loading pipeline...</span>
        </div>
      ) : leads.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-850/40 border border-slate-800">
          <p className="text-slate-400 text-sm">No leads found in this stage.</p>
          <p className="text-xs text-slate-500 mt-1">
            Use the Discover tab to search and import opportunities.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {leads.map((lead) => (
            <div
              key={lead.id}
              className="p-5 rounded-xl bg-slate-800/50 border border-slate-700/60 hover:border-slate-600 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                    {lead.sources[0]?.platform || 'OPPORTUNITY'}
                  </span>
                  {lead.ai_fit_score !== undefined && lead.ai_fit_score !== null ? (
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded border ${
                        lead.ai_fit_score >= 70
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : lead.ai_fit_score >= 40
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      Fit: {lead.ai_fit_score}/100
                    </span>
                  ) : null}
                </div>

                <h3 className="font-bold text-base text-white line-clamp-1">{lead.business_or_title}</h3>

                <div className="mt-2 space-y-1 text-xs text-slate-400">
                  {lead.canonical_domain && (
                    <p className="truncate font-mono text-sky-400">🌐 {lead.canonical_domain}</p>
                  )}
                  {lead.normalized_phone && <p>📞 {lead.normalized_phone}</p>}
                  {lead.city && <p>📍 {lead.city}</p>}
                </div>

                {lead.ai_qualification_reason && (
                  <p className="mt-3 p-2 rounded bg-slate-900/60 border border-slate-800/80 text-xs text-slate-300 line-clamp-2 italic">
                    "{lead.ai_qualification_reason}"
                  </p>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-700/40 flex items-center justify-between">
                <select
                  value={lead.current_status}
                  onChange={(e) => handleStatusChange(lead.id, e.target.value as LeadStatus)}
                  className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 font-medium"
                >
                  <option value="NEW">New</option>
                  <option value="QUALIFIED">Qualified</option>
                  <option value="CONTACTED">Contacted</option>
                  <option value="REPLIED">Replied</option>
                  <option value="MEETING_SCHEDULED">Meeting</option>
                  <option value="PROPOSAL_SENT">Proposal</option>
                  <option value="WON">Won Deal</option>
                  <option value="LOST">Lost</option>
                </select>

                <button
                  onClick={() => {
                    setActiveLead(lead);
                    setActiveAudit(null);
                    setPitchDraft(null);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-sky-400 hover:text-sky-300"
                >
                  <span>Open Hub</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Active Lead Detail Modal / Workspace */}
      {activeLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-6">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 font-semibold">
                  {activeLead.lead_type}
                </span>
                <h2 className="text-xl font-bold text-white mt-1">{activeLead.business_or_title}</h2>
                {activeLead.canonical_domain && (
                  <a
                    href={`https://${activeLead.canonical_domain}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-sky-400 hover:underline inline-flex items-center gap-1 mt-0.5"
                  >
                    <span>{activeLead.canonical_domain}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <button
                onClick={() => setActiveLead(null)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* AI Actions Row */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleRunAudit(activeLead)}
                disabled={auditLoading || !activeLead.canonical_domain}
                className="p-3 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-left transition-colors disabled:opacity-50"
              >
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Technical Website Audit</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {auditLoading ? 'Running SSRF-safe scan...' : 'Check SSL, mobile layout & performance'}
                </p>
              </button>

              <button
                onClick={() => handleAIQualify(activeLead)}
                disabled={qualifyLoading}
                className="p-3 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-left transition-colors disabled:opacity-50"
              >
                <div className="flex items-center gap-2 text-xs font-semibold text-sky-400">
                  <Sparkles className="w-4 h-4" />
                  <span>Gemini Fit Score</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {qualifyLoading ? 'Scoring...' : 'Evaluate explicit need vs inferred opportunity'}
                </p>
              </button>
            </div>

            {/* Audit Results Card */}
            {activeAudit && (
              <div className="p-4 rounded-xl bg-slate-850 border border-slate-750 space-y-3">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  Audit Findings for {activeAudit.target_url}
                </h4>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-400">SSL Encryption</span>
                    <p className={`font-bold ${activeAudit.is_https ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {activeAudit.is_https ? 'Secure (HTTPS)' : 'Insecure (HTTP)'}
                    </p>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-400">Mobile Layout</span>
                    <p className={`font-bold ${activeAudit.has_mobile_viewport ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {activeAudit.has_mobile_viewport ? 'Configured' : 'Missing Viewport'}
                    </p>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-400">Page Load</span>
                    <p className="font-bold text-slate-200">{activeAudit.page_load_ms || 0} ms</p>
                  </div>
                </div>

                {activeAudit.identified_issues.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-rose-400">Issues to highlight in pitch:</span>
                    <ul className="text-xs text-slate-300 space-y-1 pl-4 list-disc">
                      {activeAudit.identified_issues.map((issue, idx) => (
                        <li key={idx}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Outreach Pitch Generator */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Mail className="w-4 h-4 text-sky-400" />
                  Contextual Cold Pitch Draft
                </h4>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleGeneratePitch(activeLead, 'EMAIL')}
                    disabled={pitchLoading}
                    className="px-3 py-1 text-xs font-semibold rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 hover:bg-sky-500/30"
                  >
                    Draft Email
                  </button>
                  <button
                    onClick={() => handleGeneratePitch(activeLead, 'LINKEDIN')}
                    disabled={pitchLoading}
                    className="px-3 py-1 text-xs font-semibold rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30"
                  >
                    Draft LinkedIn
                  </button>
                </div>
              </div>

              {pitchLoading && (
                <div className="flex items-center text-xs text-slate-400 py-3">
                  <Loader2 className="w-4 h-4 animate-spin mr-2 text-sky-400" />
                  Generating personalized message with Gemini...
                </div>
              )}

              {pitchDraft && (
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-700/80 space-y-2">
                  {pitchDraft.subject_line && (
                    <div className="text-xs">
                      <span className="text-slate-400 font-semibold">Subject: </span>
                      <span className="text-slate-200">{pitchDraft.subject_line}</span>
                    </div>
                  )}
                  <div className="p-3 rounded bg-slate-950 font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {pitchDraft.body_text}
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => copyToClipboard(pitchDraft.body_text)}
                      className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1.5"
                    >
                      {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied' : 'Copy Pitch'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Schedule Follow-up */}
            <form onSubmit={handleScheduleFollowUp} className="pt-2 border-t border-slate-800 space-y-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-400" />
                Schedule Follow-up Task
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date"
                  required
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200"
                />
                <input
                  type="text"
                  placeholder="Task note (e.g. Check for reply, send portfolio...)"
                  value={followUpNote}
                  onChange={(e) => setFollowUpNote(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200"
                />
              </div>
              <div className="flex justify-between items-center">
                {followUpSaved && <span className="text-xs text-emerald-400">Follow-up reminder set!</span>}
                <button
                  type="submit"
                  className="ml-auto px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                >
                  Save Reminder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
