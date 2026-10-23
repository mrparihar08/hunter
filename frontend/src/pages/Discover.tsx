import React, { useState, useEffect } from 'react';
import {
  Compass,
  ExternalLink,
  Plus,
  Search,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Filter,
  Copy,
  MapPin,
  Briefcase,
  MessageSquare,
  Globe,
  Trash2,
  Bookmark,
  Check,
  RotateCcw,
  CopyPlus,
  DollarSign,
  Clock,
  RefreshCw,
} from 'lucide-react';
import {
  DeepLinkQuery,
  DorkQuery,
  GeoLocationPreset,
  IndustryPreset,
  QueryPreset,
} from '../types';
import { searchService, leadService } from '../services/api';

export const Discover: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'builder' | 'curated' | 'dorks' | 'presets'>('builder');

  // Catalogs from backend
  const [niches, setNiches] = useState<IndustryPreset[]>([]);
  const [geoTargets, setGeoTargets] = useState<GeoLocationPreset[]>([]);
  const [curatedQueries, setCuratedQueries] = useState<DeepLinkQuery[]>([]);
  const [dorkQueries, setDorkQueries] = useState<DorkQuery[]>([]);
  const [userPresets, setUserPresets] = useState<QueryPreset[]>([]);

  // Query Builder State
  const [platform, setPlatform] = useState('twitter');
  const [selectedIndustry, setSelectedIndustry] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [recency, setRecency] = useState('all');
  const [requireBudget, setRequireBudget] = useState(false);
  const [language, setLanguage] = useState('en');
  const [positiveTags, setPositiveTags] = useState<string[]>([
    'need a website',
    'looking for a web developer',
  ]);
  const [negativeTags, setNegativeTags] = useState<string[]>([
    'I am a developer',
    'hire me',
    'my portfolio',
    'course',
  ]);
  const [newPositiveInput, setNewPositiveInput] = useState('');
  const [newNegativeInput, setNewNegativeInput] = useState('');

  // Live compiled query
  const [compiledResult, setCompiledResult] = useState<{
    raw_query: string;
    generated_url: string;
    operator_notes: string;
  } | null>(null);
  const [compileLoading, setCompileLoading] = useState(false);
  const [queryCopied, setQueryCopied] = useState(false);

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

  // Icebreaker Generator Modal
  const [showIcebreakerModal, setShowIcebreakerModal] = useState(false);
  const [icebreakerLeadTitle, setIcebreakerLeadTitle] = useState('');
  const [icebreakerPlatform, setIcebreakerPlatform] = useState('TWITTER');
  const [icebreakerTone, setIcebreakerTone] = useState('FRIENDLY');
  const [icebreakerLanguage, setIcebreakerLanguage] = useState('en');
  const [icebreakerPortfolio, setIcebreakerPortfolio] = useState('');
  const [icebreakerResult, setIcebreakerResult] = useState<string>('');
  const [icebreakerSubject, setIcebreakerSubject] = useState<string | null>(null);
  const [icebreakerLoading, setIcebreakerLoading] = useState(false);
  const [icebreakerCopied, setIcebreakerCopied] = useState(false);

  // Save Preset State
  const [presetNameInput, setPresetNameInput] = useState('');
  const [presetSavedStatus, setPresetSavedStatus] = useState<string | null>(null);

  useEffect(() => {
    loadCatalogs();
  }, []);

  useEffect(() => {
    handleCompile();
  }, [
    platform,
    selectedIndustry,
    selectedLocation,
    serviceType,
    recency,
    requireBudget,
    language,
    positiveTags,
    negativeTags,
  ]);

  const loadCatalogs = async () => {
    try {
      const [nList, gList, cList, dList] = await Promise.all([
        searchService.getNiches(),
        searchService.getGeoTargets(),
        searchService.getCuratedDeepLinks(),
        searchService.getDorks(),
      ]);
      setNiches(nList);
      setGeoTargets(gList);
      setCuratedQueries(cList);
      setDorkQueries(dList);

      try {
        const pList = await searchService.listPresets();
        setUserPresets(pList);
      } catch {
        // Ignored if unauthenticated
      }
    } catch (err) {
      console.error('Failed to load search catalogs', err);
    }
  };

  const handleCompile = async () => {
    setCompileLoading(true);
    try {
      const res = await searchService.compileQuery({
        platform,
        positive_keywords: positiveTags,
        negative_keywords: negativeTags,
        industry_id: selectedIndustry || undefined,
        location_target: selectedLocation || undefined,
        service_type: serviceType || undefined,
        recency: recency !== 'all' ? recency : undefined,
        require_budget_signals: requireBudget,
        language,
        intent_preset: 'HIGH',
      });
      setCompiledResult({
        raw_query: res.raw_query,
        generated_url: res.generated_url,
        operator_notes: res.operator_notes,
      });
    } catch (err) {
      console.error('Query compilation failed', err);
    } finally {
      setCompileLoading(false);
    }
  };

  const handleResetFilters = () => {
    setPlatform('twitter');
    setSelectedIndustry('');
    setSelectedLocation('');
    setServiceType('');
    setRecency('all');
    setRequireBudget(false);
    setLanguage('en');
    setPositiveTags(['need a website', 'looking for a web developer']);
    setNegativeTags(['I am a developer', 'hire me', 'my portfolio', 'course']);
  };

  const addPositiveTag = () => {
    if (newPositiveInput.trim() && !positiveTags.includes(newPositiveInput.trim())) {
      setPositiveTags([...positiveTags, newPositiveInput.trim()]);
      setNewPositiveInput('');
    }
  };

  const removePositiveTag = (tag: string) => {
    setPositiveTags(positiveTags.filter((t) => t !== tag));
  };

  const addNegativeTag = () => {
    if (newNegativeInput.trim() && !negativeTags.includes(newNegativeInput.trim())) {
      setNegativeTags([...negativeTags, newNegativeInput.trim()]);
      setNewNegativeInput('');
    }
  };

  const removeNegativeTag = (tag: string) => {
    setNegativeTags(negativeTags.filter((t) => t !== tag));
  };

  const handleIndustrySelect = (indId: string) => {
    setSelectedIndustry(indId);
    const ind = niches.find((n) => n.id === indId);
    if (ind) {
      const updated = Array.from(new Set([...positiveTags, ...ind.buying_intents.slice(0, 2)]));
      setPositiveTags(updated);
      const negUpdated = Array.from(new Set([...negativeTags, ...ind.recommended_negatives]));
      setNegativeTags(negUpdated);
    }
  };

  const handleSavePreset = async () => {
    if (!presetNameInput.trim()) return;
    try {
      const saved = await searchService.createPreset({
        preset_name: presetNameInput.trim(),
        platform,
        industry: selectedIndustry || undefined,
        location_target: selectedLocation || undefined,
        positive_keywords: positiveTags,
        negative_keywords: negativeTags,
        language,
        intent_level: 'HIGH',
      });
      setUserPresets([saved, ...userPresets]);
      setPresetSavedStatus('Preset saved successfully!');
      setPresetNameInput('');
      setTimeout(() => setPresetSavedStatus(null), 2500);
    } catch {
      alert('Please Sign In to save custom presets to your workspace.');
    }
  };

  const handleApplyPreset = (preset: QueryPreset) => {
    setPlatform(preset.platform);
    setSelectedIndustry(preset.industry || '');
    setSelectedLocation(preset.location_target || '');
    setPositiveTags(preset.positive_keywords || []);
    setNegativeTags(preset.negative_keywords || []);
    setLanguage(preset.language || 'en');
    setActiveTab('builder');
  };

  const handleDuplicatePreset = async (preset: QueryPreset) => {
    try {
      const copy = await searchService.createPreset({
        preset_name: `${preset.preset_name} (Copy)`,
        platform: preset.platform,
        industry: preset.industry,
        location_target: preset.location_target,
        positive_keywords: preset.positive_keywords,
        negative_keywords: preset.negative_keywords,
        language: preset.language,
        intent_level: preset.intent_level,
      });
      setUserPresets([copy, ...userPresets]);
    } catch {
      alert('Please Sign In to duplicate presets.');
    }
  };

  const handleDeletePreset = async (id: string) => {
    try {
      await searchService.deletePreset(id);
      setUserPresets(userPresets.filter((p) => p.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerateIcebreaker = async () => {
    if (!icebreakerLeadTitle.trim()) return;
    setIcebreakerLoading(true);
    setIcebreakerResult('');
    setIcebreakerSubject(null);
    try {
      const res = await searchService.generateIcebreaker({
        platform: icebreakerPlatform,
        lead_title: icebreakerLeadTitle,
        industry: selectedIndustry,
        tone: icebreakerTone,
        language: icebreakerLanguage,
        portfolio_url: icebreakerPortfolio || undefined,
      });
      setIcebreakerResult(res.message_body);
      setIcebreakerSubject(res.subject_line || null);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to generate icebreaker');
    } finally {
      setIcebreakerLoading(false);
    }
  };

  const copyText = (txt: string, isQuery: boolean = true) => {
    navigator.clipboard.writeText(txt);
    if (isQuery) {
      setQueryCopied(true);
      setTimeout(() => setQueryCopied(false), 2000);
    } else {
      setIcebreakerCopied(true);
      setTimeout(() => setIcebreakerCopied(false), 2000);
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
      setSaveStatus({ type: 'success', message: 'Lead saved and checked for duplicates!' });
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
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-800 border border-slate-700/60 shadow-xl">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Compass className="w-6 h-6 text-sky-400" />
            Client Discovery & Acquisition Engine
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            TOS-compliant Boolean query compiler, 12 industry buying niches, negative spam filters, and 1-click Icebreaker hooks.
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

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('builder')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
            activeTab === 'builder'
              ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Filter className="w-4 h-4" />
          <span>Live Query Builder</span>
        </button>

        <button
          onClick={() => setActiveTab('curated')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
            activeTab === 'curated'
              ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>High-Yield Channels</span>
        </button>

        <button
          onClick={() => setActiveTab('dorks')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
            activeTab === 'dorks'
              ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Globe className="w-4 h-4 text-emerald-400" />
          <span>Website Opportunity Finder (Google Dorks)</span>
        </button>

        <button
          onClick={() => setActiveTab('presets')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
            activeTab === 'presets'
              ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Bookmark className="w-4 h-4 text-indigo-400" />
          <span>Saved Presets ({userPresets.length})</span>
        </button>
      </div>

      {/* --- TAB 1: LIVE QUERY BUILDER --- */}
      {activeTab === 'builder' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls Column */}
          <div className="lg:col-span-2 space-y-5">
            <div className="p-6 rounded-2xl bg-slate-850/60 border border-slate-750 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Search className="w-4 h-4 text-sky-400" />
                  Targeting & Platform Parameters
                </h2>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-slate-200 text-xs font-medium border border-slate-700"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Filters</span>
                </button>
              </div>

              {/* Platform Selector */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Platform Channel</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'twitter', label: 'X (Twitter Live)' },
                    { id: 'linkedin', label: 'LinkedIn Posts' },
                    { id: 'reddit', label: 'Reddit [Hiring]' },
                    { id: 'upwork', label: 'Upwork Jobs' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPlatform(p.id)}
                      className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all text-center ${
                        platform === p.id
                          ? 'bg-sky-500 text-slate-950 border-sky-400 shadow-md shadow-sky-500/20'
                          : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Industry & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5 text-sky-400" />
                    <span>Industry Niche (12 Categories)</span>
                  </label>
                  <select
                    value={selectedIndustry}
                    onChange={(e) => handleIndustrySelect(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                  >
                    <option value="">-- All Industries / General Web Dev --</option>
                    {niches.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Location Qualifier</span>
                  </label>
                  <select
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                  >
                    <option value="">-- No Location Filter (Remote / Global) --</option>
                    <optgroup label="India Target Markets">
                      {geoTargets
                        .filter((g) => g.region === 'INDIA')
                        .map((g, idx) => (
                          <option key={idx} value={g.name}>
                            {g.name}
                          </option>
                        ))}
                    </optgroup>
                    <optgroup label="High-Ticket International">
                      {geoTargets
                        .filter((g) => g.region === 'INTERNATIONAL')
                        .map((g, idx) => (
                          <option key={idx} value={g.name}>
                            {g.name}
                          </option>
                        ))}
                    </optgroup>
                  </select>
                </div>
              </div>

              {/* Service Type & Commercial Intent Signals */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1">
                    <span>Specific Service Pitch</span>
                  </label>
                  <select
                    value={serviceType}
                    onChange={(e) => setServiceType(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                  >
                    <option value="">-- Any Web Development Service --</option>
                    <option value="redesign">Website Redesign & Modernization</option>
                    <option value="ecommerce">Shopify / E-Commerce Store</option>
                    <option value="mvp">Startup MVP / Web Application</option>
                    <option value="maintenance">Maintenance & Speed Optimization</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Post Recency Window</span>
                  </label>
                  <select
                    value={recency}
                    onChange={(e) => setRecency(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                  >
                    <option value="all">Any Time (Sorted by Recency)</option>
                    <option value="24h">Past 24 Hours / Live Feed</option>
                    <option value="week">Past Week</option>
                    <option value="month">Past Month</option>
                  </select>
                </div>
              </div>

              {/* Commercial Signals Toggle & Language */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="budgetToggle"
                    checked={requireBudget}
                    onChange={(e) => setRequireBudget(e.target.checked)}
                    className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-sky-500 focus:ring-0"
                  />
                  <label htmlFor="budgetToggle" className="text-xs text-slate-300 flex items-center gap-1 cursor-pointer">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Require Commercial Intent Tokens (e.g. "budget", "quote", "rate")</span>
                  </label>
                </div>

                <div className="flex gap-2">
                  {[
                    { id: 'en', label: 'English' },
                    { id: 'hinglish', label: 'Hindi / Hinglish' },
                    { id: 'all', label: 'Combined' },
                  ].map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => setLanguage(l.id)}
                      className={`py-1 px-2.5 rounded-lg text-xs font-medium border transition-colors ${
                        language === l.id
                          ? 'bg-slate-700 text-white border-slate-500 font-bold'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-300'
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Positive Keywords Manager */}
              <div className="pt-2 border-t border-slate-800">
                <label className="block text-xs font-semibold text-emerald-400 mb-1">
                  Buying Intent Keywords (Positive Matching)
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {positiveTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 text-xs font-medium"
                    >
                      <span>"{tag}"</span>
                      <button
                        onClick={() => removePositiveTag(tag)}
                        className="text-emerald-400 hover:text-rose-400 ml-1 font-bold"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add buying phrase (e.g. need a React dev, clinic website)..."
                    value={newPositiveInput}
                    onChange={(e) => setNewPositiveInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPositiveTag())}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={addPositiveTag}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg"
                  >
                    + Add
                  </button>
                </div>
              </div>

              {/* Negative Keywords Manager (Feature A) */}
              <div className="pt-2 border-t border-slate-800">
                <label className="block text-xs font-semibold text-rose-400 mb-1">
                  Negative Exclusions (Eliminate Freelancer & Course Seller Spam)
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {negativeTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/25 text-xs font-medium"
                    >
                      <span>-"{tag}"</span>
                      <button
                        onClick={() => removeNegativeTag(tag)}
                        className="text-rose-400 hover:text-white ml-1 font-bold"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add exclusion (e.g. hire me, my portfolio, course)..."
                    value={newNegativeInput}
                    onChange={(e) => setNewNegativeInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addNegativeTag())}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                  />
                  <button
                    type="button"
                    onClick={addNegativeTag}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg"
                  >
                    + Exclude
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Live Preview & Actions Column */}
          <div className="space-y-5">
            <div className="p-6 rounded-2xl bg-slate-850/80 border border-slate-700/80 space-y-4 sticky top-24 shadow-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Live Compiled Boolean Query
                </h3>
                <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-sky-500/15 text-sky-400 border border-sky-500/30 font-semibold">
                  {platform}
                </span>
              </div>

              {compileLoading ? (
                <div className="h-28 rounded-xl bg-slate-900 border border-slate-800 animate-pulse" />
              ) : compiledResult ? (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-200 break-words leading-relaxed max-h-48 overflow-y-auto select-all">
                    {compiledResult.raw_query}
                  </div>

                  <p className="text-xs text-slate-400 italic">
                    💡 {compiledResult.operator_notes}
                  </p>

                  <div className="flex flex-col gap-2 pt-2">
                    <a
                      href={compiledResult.generated_url}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-2.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 transition-all"
                    >
                      <span>Launch Live Search</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>

                    <button
                      type="button"
                      onClick={() => copyText(compiledResult.raw_query, true)}
                      className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 font-medium text-xs flex items-center justify-center gap-2 transition-colors border border-slate-700"
                    >
                      {queryCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{queryCopied ? 'Query Copied to Clipboard!' : 'Copy Query'}</span>
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Save Preset Form */}
              <div className="pt-4 border-t border-slate-800 space-y-2">
                <label className="block text-xs font-semibold text-slate-300">
                  Save Search Configuration as Preset
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Delhi Clinic Redesigns"
                    value={presetNameInput}
                    onChange={(e) => setPresetNameInput(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleSavePreset}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                  >
                    Save
                  </button>
                </div>
                {presetSavedStatus && (
                  <p className="text-xs text-emerald-400 font-medium">{presetSavedStatus}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 2: HIGH-YIELD CURATED CHANNELS --- */}
      {activeTab === 'curated' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Pre-Vetted Query Matrices across 5 Platforms
            </h2>
            <span className="text-xs text-slate-400">Sorted by Intent & Conversion</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {curatedQueries.map((q, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-slate-850/60 border border-slate-750 hover:border-sky-500/50 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                      {q.platform}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">{q.target_category}</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-200 line-clamp-2 mt-1">
                    {q.description}
                  </p>
                  <div className="mt-3 p-2.5 rounded-lg bg-slate-950 font-mono text-xs text-slate-400 truncate border border-slate-800">
                    {q.query_text}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                  <a
                    href={q.generated_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-400 hover:text-sky-300"
                  >
                    <span>Launch</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <button
                    onClick={() => {
                      setIcebreakerLeadTitle(q.target_category);
                      setIcebreakerPlatform(q.platform.toUpperCase());
                      setShowIcebreakerModal(true);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-medium text-amber-400 hover:text-amber-300 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20"
                  >
                    <MessageSquare className="w-3 h-3" />
                    <span>Icebreaker Hook</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- TAB 3: WEBSITE OPPORTUNITY FINDER (GOOGLE DORKS) --- */}
      {activeTab === 'dorks' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-850 border border-slate-750">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-400" />
              Website Opportunity Finder (Google Search Operators)
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Find publicly indexed businesses running outdated copyright notices, insecure HTTP endpoints, or legacy fixed layouts.
              Always run the technical audit before reaching out to verify claims.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dorkQueries.map((dork, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-slate-850/60 border border-slate-750 hover:border-emerald-500/40 transition-all flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      {dork.category}
                    </span>
                    <span className="text-xs text-slate-400">
                      {dork.target_industry} • {dork.target_location}
                    </span>
                  </div>

                  <div className="mt-3 p-3 rounded-xl bg-slate-950 font-mono text-xs text-slate-300 break-words border border-slate-800 select-all">
                    {dork.dork_syntax}
                  </div>

                  <p className="text-xs text-slate-400 mt-2">
                    <strong className="text-slate-300">Pitch Angle:</strong> {dork.verification_advice}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-amber-400/90 font-medium">
                    ⚠️ Verify via Technical Audit
                  </span>
                  <a
                    href={dork.generated_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                  >
                    <span>Run Google Search</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- TAB 4: SAVED PRESETS --- */}
      {activeTab === 'presets' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-indigo-400" />
              Your Saved Search Presets
            </h2>
          </div>

          {userPresets.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-slate-850/40 border border-slate-800">
              <p className="text-slate-300 font-medium">No saved presets yet.</p>
              <p className="text-xs text-slate-500 mt-1">
                Configure your favorite search filters in the Live Query Builder tab and click "Save Preset".
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userPresets.map((preset) => (
                <div
                  key={preset.id}
                  className="p-5 rounded-2xl bg-slate-850/60 border border-slate-750 flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 font-bold">
                        {preset.platform}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDuplicatePreset(preset)}
                          title="Duplicate Preset"
                          className="text-slate-400 hover:text-indigo-400 text-xs"
                        >
                          <CopyPlus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeletePreset(preset.id)}
                          title="Delete Preset"
                          className="text-slate-500 hover:text-rose-400 text-xs"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h4 className="font-bold text-white text-base mt-1.5">{preset.preset_name}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {preset.industry || 'All Industries'} • {preset.location_target || 'Global'}
                    </p>

                    <div className="mt-2 text-xs text-slate-400">
                      <span>Positive: {preset.positive_keywords?.length || 0} phrases</span>
                      <span className="ml-2">Negatives: {preset.negative_keywords?.length || 0}</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex justify-end">
                    <button
                      onClick={() => handleApplyPreset(preset)}
                      className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs"
                    >
                      Load into Builder
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- MODAL 1: 1-CLICK ICEBREAKER GENERATOR (FEATURE F) --- */}
      {showIcebreakerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-amber-400" />
                  1-Click Tailored Icebreaker Hook
                </h3>
                <p className="text-xs text-slate-400">
                  Generates natural, non-spammy outreach tailored to the channel and prospect.
                </p>
              </div>
              <button
                onClick={() => setShowIcebreakerModal(false)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Opportunity / Business Name *</label>
                <input
                  type="text"
                  value={icebreakerLeadTitle}
                  onChange={(e) => setIcebreakerLeadTitle(e.target.value)}
                  placeholder="e.g. Apex Clinic / Agency Redesign Post"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Platform Tone</label>
                  <select
                    value={icebreakerTone}
                    onChange={(e) => setIcebreakerTone(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200"
                  >
                    <option value="SHORT">Short & Conversational (&lt; 280 chars)</option>
                    <option value="FRIENDLY">Friendly & Casual</option>
                    <option value="PROFESSIONAL">Professional / B2B</option>
                    <option value="CONSULTATIVE">Consultative (Problem Solver)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Language Style</label>
                  <select
                    value={icebreakerLanguage}
                    onChange={(e) => setIcebreakerLanguage(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200"
                  >
                    <option value="en">English</option>
                    <option value="hinglish">Hinglish ("Bhai post dekha...")</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Optional Portfolio Link (Your Website or GitHub)
                </label>
                <input
                  type="url"
                  value={icebreakerPortfolio}
                  onChange={(e) => setIcebreakerPortfolio(e.target.value)}
                  placeholder="https://yourportfolio.dev"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleGenerateIcebreaker}
                  disabled={icebreakerLoading || !icebreakerLeadTitle.trim()}
                  className="flex-1 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {icebreakerLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>{icebreakerLoading ? 'Generating...' : icebreakerResult ? 'Regenerate Pitch' : 'Generate Icebreaker Message'}</span>
                </button>
              </div>

              {icebreakerResult && (
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 mt-2">
                  {icebreakerSubject && (
                    <div className="text-xs">
                      <span className="text-slate-400 font-semibold">Subject: </span>
                      <span className="text-slate-200">{icebreakerSubject}</span>
                    </div>
                  )}

                  {/* Editable textarea for final polish before sending */}
                  <div>
                    <label className="block text-slate-400 font-medium mb-1">
                      Message Body (Editable before copying):
                    </label>
                    <textarea
                      rows={4}
                      value={icebreakerResult}
                      onChange={(e) => setIcebreakerResult(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 font-mono text-xs text-slate-100 focus:outline-none focus:border-amber-500 leading-relaxed"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-400">
                      Length: <strong className="text-slate-200">{icebreakerResult.length}</strong> chars
                      {icebreakerPlatform === 'TWITTER' && (
                        <span className={`ml-1 ${icebreakerResult.length <= 280 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          ({icebreakerResult.length <= 280 ? 'Fits 280 char limit' : 'Exceeds 280 char limit'})
                        </span>
                      )}
                    </span>
                    <button
                      onClick={() => copyText(icebreakerResult, false)}
                      className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-750 text-xs font-semibold text-slate-200 flex items-center gap-1.5 border border-slate-700"
                    >
                      {icebreakerCopied ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{icebreakerCopied ? 'Copied!' : 'Copy Icebreaker'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 2: QUICK INGEST LEAD --- */}
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
                    <option value="REDDIT">Reddit</option>
                    <option value="UPWORK">Upwork</option>
                    <option value="GOOGLE_DORK">Google Dork Finding</option>
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
