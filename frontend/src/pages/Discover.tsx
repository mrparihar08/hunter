import React, { useState, useEffect } from 'react';
import { Compass, ExternalLink, Plus, Search, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { DeepLinkQuery } from '../types';
import { searchService, leadService } from '../services/api';

export const Discover: React.FC = () => {
  const [queries, setQueries] = useState<DeepLinkQuery[]>([]);
  const [loading, setLoading] = useState(true);

  // Custom link state
  const [customPlatform, setCustomPlatform] = useState('linkedin');
  const [customKeywords, setCustomKeywords] = useState('');

  // Quick Ingest Modal
  const [showIngestModal, setShowIngestModal] = useState(false);
  const [ingestForm, setIngestForm] = useState({
    business_or_title: '',
    lead_type: 'LOCAL_BUSINESS',
    source_platform: 'LINKEDIN',
    source_url: '',
    canonical_domain: '',
    normalized_phone: '',
    city: '',
    notes: '',
  });
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadDeepLinks();
  }, []);

  const loadDeepLinks = async () => {
    try {
      setLoading(true);
      const data = await searchService.getCuratedDeepLinks();
      setQueries(data);
    } catch (err) {
      console.error('Failed to load curated queries', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCustom = async () => {
    if (!customKeywords.trim()) return;
    try {
      const res = await searchService.getCustomLink(customPlatform, customKeywords);
      window.open(res.generated_url, '_blank');
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus(null);
    try {
      await leadService.create({
        business_or_title: ingestForm.business_or_title,
        lead_type: ingestForm.lead_type,
        source_platform: ingestForm.source_platform,
        source_url: ingestForm.source_url,
        canonical_domain: ingestForm.canonical_domain || undefined,
        normalized_phone: ingestForm.normalized_phone || undefined,
        city: ingestForm.city || undefined,
        source_payload: ingestForm.notes ? { notes: ingestForm.notes } : {},
      });
      setSaveStatus({ type: 'success', message: 'Opportunity saved and checked for duplicates!' });
      setIngestForm({
        business_or_title: '',
        lead_type: 'LOCAL_BUSINESS',
        source_platform: 'LINKEDIN',
        source_url: '',
        canonical_domain: '',
        normalized_phone: '',
        city: '',
        notes: '',
      });
      setTimeout(() => setShowIngestModal(false), 1200);
    } catch (err: any) {
      const detail = err.response?.data?.detail || 'Failed to save lead';
      setSaveStatus({ type: 'error', message: detail });
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-800 border border-slate-700/60 shadow-xl">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Compass className="w-6 h-6 text-sky-400" />
            Assisted Lead Discovery Hub
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            TOS-compliant, zero-cost targeted search queries across LinkedIn, X, Upwork, and Facebook.
            Spot opportunities and import them with 1-click deduplication.
          </p>
        </div>
        <button
          onClick={() => setShowIngestModal(true)}
          className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold shadow-lg shadow-sky-500/25 transition-all text-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Quick Ingest Lead</span>
        </button>
      </div>

      {/* Custom Query Generator */}
      <div className="p-6 rounded-xl bg-slate-800/40 border border-slate-700/60">
        <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
          <Search className="w-4 h-4 text-sky-400" />
          Custom Platform Deep Search
        </h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={customPlatform}
            onChange={(e) => setCustomPlatform(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500"
          >
            <option value="linkedin">LinkedIn Content</option>
            <option value="twitter">X (Twitter Live)</option>
            <option value="upwork">Upwork Recent Jobs</option>
            <option value="facebook">Facebook Public Posts</option>
            <option value="instagram">Instagram Tag</option>
          </select>
          <input
            type="text"
            placeholder="e.g., website redesign Bangalore, React developer needed, clinic website..."
            value={customKeywords}
            onChange={(e) => setCustomKeywords(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
          <button
            onClick={handleGenerateCustom}
            className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <span>Open Search</span>
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Curated Deep Links Grid */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          High-Yield Query Channels (English, Hindi, Hinglish)
        </h2>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-40 rounded-xl bg-slate-800/40 animate-pulse border border-slate-800" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {queries.map((q, idx) => (
              <div
                key={idx}
                className="p-5 rounded-xl bg-slate-800/50 border border-slate-700/60 hover:border-sky-500/50 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                      {q.platform}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">{q.target_category}</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-200 line-clamp-2 mt-1">
                    {q.description}
                  </p>
                  <div className="mt-3 p-2 rounded bg-slate-900/80 border border-slate-800 text-xs font-mono text-slate-400 truncate">
                    {q.query_text}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-700/40 flex items-center justify-between">
                  <a
                    href={q.generated_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-400 hover:text-sky-300 transition-colors"
                  >
                    <span>Launch Live Search</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={() => {
                      setIngestForm((prev) => ({ ...prev, source_platform: q.platform.toUpperCase() }));
                      setShowIngestModal(true);
                    }}
                    className="text-xs text-slate-400 hover:text-slate-200 font-medium"
                  >
                    + Import Found Lead
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Ingest Modal */}
      {showIngestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <h3 className="text-lg font-bold text-white mb-1">Quick Ingest Lead</h3>
            <p className="text-xs text-slate-400 mb-4">
              Enter discovered opportunity details. The system automatically normalizes domains and identifies existing leads.
            </p>

            {saveStatus && (
              <div
                className={`p-3 rounded-lg text-xs font-medium mb-4 flex items-center gap-2 ${
                  saveStatus.type === 'success'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                }`}
              >
                {saveStatus.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{saveStatus.message}</span>
              </div>
            )}

            <form onSubmit={handleSaveLead} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Business Name or Project Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Health Clinic / Agency Website Redesign"
                  value={ingestForm.business_or_title}
                  onChange={(e) => setIngestForm({ ...ingestForm, business_or_title: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Lead Type</label>
                  <select
                    value={ingestForm.lead_type}
                    onChange={(e) => setIngestForm({ ...ingestForm, lead_type: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                  >
                    <option value="LOCAL_BUSINESS">Local Business</option>
                    <option value="FREELANCE_PROJECT">Freelance Project</option>
                    <option value="SOCIAL_OPPORTUNITY">Social Opportunity</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Source Platform</label>
                  <select
                    value={ingestForm.source_platform}
                    onChange={(e) => setIngestForm({ ...ingestForm, source_platform: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                  >
                    <option value="LINKEDIN">LinkedIn</option>
                    <option value="TWITTER">X (Twitter)</option>
                    <option value="UPWORK">Upwork</option>
                    <option value="GOOGLE_PLACES">Google Places</option>
                    <option value="FACEBOOK">Facebook</option>
                    <option value="INSTAGRAM">Instagram</option>
                    <option value="MANUAL">Manual / Direct Referral</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Source URL *</label>
                <input
                  type="url"
                  required
                  placeholder="https://linkedin.com/posts/... or https://twitter.com/..."
                  value={ingestForm.source_url}
                  onChange={(e) => setIngestForm({ ...ingestForm, source_url: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Website URL (for Audit)
                  </label>
                  <input
                    type="text"
                    placeholder="example.com"
                    value={ingestForm.canonical_domain}
                    onChange={(e) => setIngestForm({ ...ingestForm, canonical_domain: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Phone / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="+91 98110..."
                    value={ingestForm.normalized_phone}
                    onChange={(e) => setIngestForm({ ...ingestForm, normalized_phone: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowIngestModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-sm font-semibold shadow-lg shadow-sky-500/20"
                >
                  Save to Pipeline
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
