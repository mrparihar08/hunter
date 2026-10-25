import React, { useState, useEffect } from 'react';
import {
  Compass,
  ExternalLink,
  Plus,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Copy,
  MapPin,
  Briefcase,
  MessageSquare,
  Globe,
  Trash2,
  Bookmark,
  Check,
  RotateCcw,
  DollarSign,
  Clock,
  RefreshCw,
  Layers,
  Search,
  CheckSquare,
  Square,
  Zap,
  X,
} from 'lucide-react';
import {
  DeepLinkQuery,
  DorkQuery,
  GeoLocationPreset,
  HackerNewsLeadItem,
  IndustryPreset,
  MultiQueryCompileResponse,
  QueryPreset,
  SearchGroupPreset,
  SourceRegistryItem,
  SubQueryItem,
} from '../types';
import { searchService, leadService } from '../services/api';
import { useToast } from '../components/Toast';

export const Discover: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'builder' | 'curated' | 'dorks' | 'presets'>('builder');
  const { toast } = useToast();

  // Catalogs from backend
  const [niches, setNiches] = useState<IndustryPreset[]>([]);
  const [geoTargets, setGeoTargets] = useState<GeoLocationPreset[]>([]);
  const [curatedQueries, setCuratedQueries] = useState<DeepLinkQuery[]>([]);
  const [dorkQueries, setDorkQueries] = useState<DorkQuery[]>([]);
  const [userPresets, setUserPresets] = useState<QueryPreset[]>([]);
  const [searchGroups, setSearchGroups] = useState<SearchGroupPreset[]>([]);
  const [registeredSources, setRegisteredSources] = useState<SourceRegistryItem[]>([]);

  // Source Browser & Multi-Source State
  const [showSourceBrowser, setShowSourceBrowser] = useState(false);
  const [sourceCategoryFilter, setSourceCategoryFilter] = useState<string>('all');
  const [sourceSearchTerm, setSourceSearchTerm] = useState<string>('');
  const [selectedMultiSources, setSelectedMultiSources] = useState<string[]>(['twitter', 'linkedin', 'reddit', 'upwork']);
  const [isMultiSourceMode, setIsMultiSourceMode] = useState<boolean>(false);
  const [multiCompiledResults, setMultiCompiledResults] = useState<MultiQueryCompileResponse | null>(null);
  const [multiLoading, setMultiLoading] = useState<boolean>(false);

  // Automated Hacker News Search State
  const [hnLiveResults, setHnLiveResults] = useState<HackerNewsLeadItem[]>([]);
  const [hnLoading, setHnLoading] = useState<boolean>(false);
  const [hnSavedMap, setHnSavedMap] = useState<Record<string, boolean>>({});

  // Query Builder State
  const [selectedGroup, setSelectedGroup] = useState<string>('GROUP_A');
  const [platform, setPlatform] = useState('twitter');
  const [selectedIndustry, setSelectedIndustry] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [recency, setRecency] = useState('all');
  const [requireBudget, setRequireBudget] = useState(false);
  const [language, setLanguage] = useState('en');
  const [positiveTags, setPositiveTags] = useState<string[]>([
    'looking for a web developer',
    'need a website developer',
  ]);
  const [negativeTags, setNegativeTags] = useState<string[]>([
    'I am a developer',
    'hire me',
    'my portfolio',
    'course',
  ]);
  const [newPositiveInput, setNewPositiveInput] = useState('');
  const [newNegativeInput, setNewNegativeInput] = useState('');

  // Live compiled query (Single-source)
  const [compiledResult, setCompiledResult] = useState<{
    raw_query: string;
    generated_url: string;
    operator_notes: string;
    search_group?: string;
    sub_queries?: SubQueryItem[];
  } | null>(null);
  const [compileLoading, setCompileLoading] = useState(false);
  const [queryCopiedIndex, setQueryCopiedIndex] = useState<number | null>(null);

  // Ingest Lead Modal State
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
    author_role: '',
    search_group: 'GROUP_A',
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
    if (isMultiSourceMode) {
      handleMultiCompile();
    } else {
      handleCompile();
    }
  }, [
    platform,
    selectedGroup,
    selectedIndustry,
    selectedLocation,
    serviceType,
    recency,
    requireBudget,
    language,
    positiveTags,
    negativeTags,
    isMultiSourceMode,
    selectedMultiSources,
  ]);

  const loadCatalogs = async () => {
    try {
      const [nList, gList, cList, dList, srcList] = await Promise.all([
        searchService.getNiches(),
        searchService.getGeoTargets(),
        searchService.getCuratedDeepLinks(),
        searchService.getDorks(),
        searchService.getSources(),
      ]);
      setNiches(nList);
      setGeoTargets(gList);
      setCuratedQueries(cList);
      setDorkQueries(dList);
      setRegisteredSources(srcList);

      try {
        const groups = await searchService.getSearchGroups();
        setSearchGroups(groups);
      } catch {
        setSearchGroups([
          {
            id: 'GROUP_A',
            name: 'Group A: Explicit Hiring Intent',
            description: 'Direct requests to hire a developer, agency, or get recommendations.',
            is_indirect: false,
            default_positive_keywords: ['looking for a web developer', 'need a website developer'],
            default_hinglish_keywords: ['website developer chahiye'],
            default_negative_exclusions: ['I am a developer', 'hire me'],
          },
          {
            id: 'GROUP_B',
            name: 'Group B: Project & Quotation Requests',
            description: 'Clients requesting proposals, quotes, RFPs, or specific redesign specs.',
            is_indirect: false,
            default_positive_keywords: ['website development project', 'need a quote for a website'],
            default_hinglish_keywords: ['website proposal chahiye'],
            default_negative_exclusions: ['I build websites', 'services'],
          },
          {
            id: 'GROUP_C',
            name: 'Group C: Existing Website Problems',
            description: 'Businesses reporting outdated, broken, or slow websites needing overhaul.',
            is_indirect: false,
            default_positive_keywords: ['our website needs a redesign', 'our website is not working'],
            default_hinglish_keywords: ['website rebuild karwani hai'],
            default_negative_exclusions: ['how to fix', 'tutorial'],
          },
          {
            id: 'GROUP_D',
            name: 'Group D: Business Opportunities (Indirect)',
            description: 'Businesses with legacy sites needing custom work (requires manual review).',
            is_indirect: true,
            default_positive_keywords: ['clinic without website', 'store needing website redesign'],
            default_hinglish_keywords: [],
            default_negative_exclusions: ['course', 'template free'],
          },
        ]);
      }

      try {
        const presets = await searchService.listPresets();
        setUserPresets(presets);
      } catch {
        // guest mode
      }
    } catch (err) {
      console.error('Failed to load discovery catalogs', err);
    }
  };

  const handleGroupSelect = (groupId: string) => {
    setSelectedGroup(groupId);
    const grp = searchGroups.find((g) => g.id === groupId);
    if (grp) {
      if (language === 'hinglish' && grp.default_hinglish_keywords.length > 0) {
        setPositiveTags([...grp.default_hinglish_keywords]);
      } else {
        setPositiveTags([...grp.default_positive_keywords]);
      }
      setNegativeTags([...grp.default_negative_exclusions]);
    }
  };

  const handleCompile = async () => {
    setCompileLoading(true);
    try {
      const res = await searchService.compileQuery({
        platform,
        search_group: selectedGroup,
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
        search_group: res.search_group,
        sub_queries: res.sub_queries,
      });
    } catch (err) {
      console.error('Query compilation failed', err);
    } finally {
      setCompileLoading(false);
    }
  };

  const handleMultiCompile = async (sourcesToCompile?: string[]) => {
    const list = sourcesToCompile || selectedMultiSources;
    if (list.length === 0) return;
    setMultiLoading(true);
    try {
      const res = await searchService.compileMulti({
        sources: list,
        search_group: selectedGroup,
        positive_keywords: positiveTags,
        negative_keywords: negativeTags,
        industry_id: selectedIndustry || undefined,
        location_target: selectedLocation || undefined,
        service_type: serviceType || undefined,
        recency: recency !== 'all' ? recency : undefined,
        require_budget_signals: requireBudget,
        language,
      });
      setMultiCompiledResults(res);
    } catch (err) {
      console.error('Multi query compile failed', err);
    } finally {
      setMultiLoading(false);
    }
  };

  const handleHnSearch = async () => {
    setHnLoading(true);
    try {
      const query = positiveTags[0] || 'web developer';
      const res = await searchService.searchHackerNews({ query, hits_per_page: 15 });
      setHnLiveResults(res.leads);
      toast(`Fetched ${res.leads.length} live discussions from Hacker News`, 'success');
    } catch (err) {
      console.error('Hacker news search failed', err);
      toast('Failed to query Hacker News Algolia API', 'error');
    } finally {
      setHnLoading(false);
    }
  };

  const handleSaveHnLead = async (lead: HackerNewsLeadItem) => {
    try {
      await leadService.create({
        business_or_title: lead.title,
        lead_type: 'SOCIAL_OPPORTUNITY',
        source_platform: 'HACKERNEWS',
        source_url: lead.url,
        author_role: lead.author,
        intent_category: lead.intent_category,
        lead_score: lead.lead_score,
        positive_evidence: lead.positive_evidence,
        negative_evidence: lead.negative_evidence,
        explanation: lead.explanation,
        search_group: selectedGroup,
      });
      setHnSavedMap((prev) => ({ ...prev, [lead.object_id]: true }));
      toast(`Lead "${lead.title.substring(0, 30)}..." saved to Pipeline!`, 'success');
    } catch (err) {
      console.error('Failed to save HN lead', err);
      toast('Failed to save lead to pipeline', 'error');
    }
  };

  const toggleMultiSource = (sourceId: string) => {
    if (selectedMultiSources.includes(sourceId)) {
      if (selectedMultiSources.length > 1) {
        setSelectedMultiSources(selectedMultiSources.filter((s) => s !== sourceId));
      }
    } else {
      setSelectedMultiSources([...selectedMultiSources, sourceId]);
    }
  };

  const handleResetFilters = () => {
    setSelectedGroup('GROUP_A');
    setPlatform('twitter');
    setSelectedIndustry('');
    setSelectedLocation('');
    setServiceType('');
    setRecency('all');
    setRequireBudget(false);
    setLanguage('en');
    setPositiveTags(['looking for a web developer', 'need a website developer']);
    setNegativeTags(['I am a developer', 'hire me', 'my portfolio', 'course']);
    toast('Filters restored to default baseline', 'info');
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
        intent_level: selectedGroup,
      });
      setUserPresets([saved, ...userPresets]);
      setPresetSavedStatus('Preset saved successfully!');
      setPresetNameInput('');
      toast('Custom query preset saved to workspace!', 'success');
      setTimeout(() => setPresetSavedStatus(null), 2500);
    } catch {
      toast('Please Sign In as Admin to save custom presets', 'error');
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
    toast(`Preset "${preset.preset_name}" loaded into Query Builder`, 'success');
  };

  const handleDeletePreset = async (presetId: string) => {
    try {
      await searchService.deletePreset(presetId);
      setUserPresets(userPresets.filter((p) => p.id !== presetId));
      toast('Preset deleted from workspace', 'info');
    } catch (err) {
      console.error('Failed to delete preset', err);
      toast('Failed to delete preset', 'error');
    }
  };

  const handleGenerateIcebreaker = async () => {
    if (!icebreakerLeadTitle.trim()) return;
    setIcebreakerLoading(true);
    setIcebreakerResult('');
    setIcebreakerSubject(null);
    try {
      const resp = await searchService.generateIcebreaker({
        business_or_title: icebreakerLeadTitle,
        platform: icebreakerPlatform,
        tone: icebreakerTone,
        language: icebreakerLanguage,
        portfolio_url: icebreakerPortfolio || undefined,
      });
      setIcebreakerResult(resp.hook_message);
      if (resp.subject_line) {
        setIcebreakerSubject(resp.subject_line);
      }
      toast('Contextual outreach hook generated!', 'success');
    } catch (err) {
      console.error('Failed to generate icebreaker', err);
      toast('Failed to generate icebreaker', 'error');
    } finally {
      setIcebreakerLoading(false);
    }
  };

  const copyText = (txt: string, index?: number) => {
    navigator.clipboard.writeText(txt);
    if (index !== undefined) {
      setQueryCopiedIndex(index);
      setTimeout(() => setQueryCopiedIndex(null), 2000);
    }
    toast('Search query copied to clipboard!', 'success');
  };

  const handleSaveLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus(null);
    try {
      await leadService.create({
        business_or_title: ingestForm.business_or_title,
        lead_type: ingestForm.lead_type as any,
        source_platform: ingestForm.source_platform,
        source_url: ingestForm.source_url,
        canonical_domain: ingestForm.canonical_domain || undefined,
        normalized_phone: ingestForm.normalized_phone || undefined,
        city: ingestForm.city || undefined,
        author_role: ingestForm.author_role || undefined,
        search_group: ingestForm.search_group,
        source_payload: ingestForm.notes ? { notes: ingestForm.notes } : {},
      });
      setSaveStatus({ type: 'success', message: 'Lead saved and automatically evaluated by Intent Intelligence!' });
      toast('Lead ingested and evaluated!', 'success');
      setIngestForm({
        business_or_title: '',
        lead_type: 'LOCAL_BUSINESS',
        source_platform: 'LINKEDIN',
        source_url: '',
        canonical_domain: '',
        normalized_phone: '',
        city: '',
        notes: '',
        author_role: '',
        search_group: 'GROUP_A',
      });
      setTimeout(() => setShowIngestModal(false), 1400);
    } catch (err: any) {
      const detail = err.response?.data?.detail || 'Failed to save lead';
      setSaveStatus({ type: 'error', message: detail });
      toast(detail, 'error');
    }
  };

  const filteredSources = registeredSources.filter((s) => {
    const matchesCat = sourceCategoryFilter === 'all' || s.category === sourceCategoryFilter;
    const matchesSearch =
      !sourceSearchTerm.trim() ||
      s.name.toLowerCase().includes(sourceSearchTerm.toLowerCase()) ||
      s.description.toLowerCase().includes(sourceSearchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl glass-panel relative overflow-hidden">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <Compass className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Hunter Multi-Source Discovery Engine
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
            Cross-platform discovery across 34 channels, intent-based classification matrices, Boolean query compilation, anti-freelancer spam exclusions, and explainable scoring.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setShowIngestModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-sky-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Quick Ingest Lead</span>
          </button>
        </div>

        <div className="absolute -right-12 -top-12 w-52 h-52 bg-sky-500/10 blur-3xl rounded-full pointer-events-none" />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/[0.08] space-x-6 overflow-x-auto scrollbar-none">
        {[
          { id: 'builder', label: 'Live Query Builder' },
          { id: 'curated', label: 'Curated Channels' },
          { id: 'dorks', label: 'Opportunity Finder' },
          { id: 'presets', label: `Saved Presets (${userPresets.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-3.5 px-1 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === tab.id
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* --- TAB 1: LIVE QUERY BUILDER --- */}
      {activeTab === 'builder' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Controls: 2 Columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* 1. INTENT-BASED SEARCH GROUPS */}
            <div className="p-6 rounded-2xl glass-panel space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-sky-400" />
                    <span>Search Group: Intent Classification Matrix</span>
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Select a dedicated search group with pre-configured buying tokens and anti-promotional negative filters.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-white/[0.08] transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset All</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  {
                    id: 'GROUP_A',
                    title: 'Group A: Explicit Hiring Intent',
                    badge: 'Confirmed Buyer',
                    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
                    desc: 'Searches for clients saying "looking for a web developer", "need someone to build our website".',
                  },
                  {
                    id: 'GROUP_B',
                    title: 'Group B: Project & Quotation Requests',
                    badge: 'Project RFP',
                    badgeClass: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
                    desc: 'Targets inquiries requesting quotes, redesign proposals, or specific Shopify store builds.',
                  },
                  {
                    id: 'GROUP_C',
                    title: 'Group C: Existing Website Problems',
                    badge: 'Pain Point',
                    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
                    desc: 'Targets businesses complaining about slow, broken, or outdated websites needing revamp.',
                  },
                  {
                    id: 'GROUP_D',
                    title: 'Group D: Business Opportunities',
                    badge: 'Indirect Opportunity',
                    badgeClass: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
                    desc: 'Businesses with legacy copyright or lacking mobile viewports (requires manual qualification).',
                  },
                ].map((grp) => (
                  <button
                    key={grp.id}
                    type="button"
                    onClick={() => handleGroupSelect(grp.id)}
                    className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                      selectedGroup === grp.id
                        ? 'bg-sky-500/15 border-sky-500 ring-1 ring-sky-500/40 shadow-glow-sky'
                        : 'bg-slate-900/70 border-white/[0.08] hover:bg-slate-800/80 hover:border-slate-600'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-white">{grp.title}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${grp.badgeClass}`}>
                          {grp.badge}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{grp.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. PLATFORM & TARGETING PARAMETERS */}
            <div className="p-6 rounded-2xl glass-panel space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-200">Target Discovery Platform</label>
                  <p className="text-[11px] text-slate-400">
                    Select a focus channel or activate multi-source search across {registeredSources.length || 34} channels.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsMultiSourceMode(!isMultiSourceMode)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                      isMultiSourceMode
                        ? 'bg-gradient-to-r from-indigo-500 to-sky-600 text-white border-indigo-400 shadow-glow-indigo'
                        : 'bg-slate-800 text-slate-400 border-white/[0.08] hover:text-white hover:bg-slate-750'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>{isMultiSourceMode ? 'Multi-Source Active' : 'Enable Multi-Source'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowSourceBrowser(true)}
                    className="px-3 py-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Browse All ({registeredSources.length || 34})</span>
                  </button>
                </div>
              </div>

              {/* Core Quick-Selection Platforms */}
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                {[
                  { id: 'twitter', label: 'X (Twitter)', mode: 'Live Stream' },
                  { id: 'linkedin', label: 'LinkedIn', mode: 'Posts Live' },
                  { id: 'reddit', label: 'Reddit', mode: '[Hiring] Live' },
                  { id: 'upwork', label: 'Upwork', mode: 'Jobs Feed' },
                  { id: 'hackernews', label: 'Hacker News', mode: 'API Algolia' },
                  { id: 'google_places', label: 'Google Places', mode: 'API Maps' },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setPlatform(p.id);
                      setIsMultiSourceMode(false);
                    }}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      platform === p.id && !isMultiSourceMode
                        ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white border-sky-400 shadow-glow-sky'
                        : 'bg-slate-900/80 text-slate-400 border-white/[0.06] hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <span>{p.label}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                        p.mode.includes('API')
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {p.mode}
                    </span>
                  </button>
                ))}
              </div>

              {/* Multi-Source Pills when Multi-Source is Enabled */}
              {isMultiSourceMode && (
                <div className="p-4 rounded-xl bg-slate-950/80 border border-indigo-500/30 space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-indigo-300">
                    <span className="font-bold flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      Cross-Platform Multi-Search Selection ({selectedMultiSources.length} sources)
                    </span>
                    <span className="text-[11px] text-slate-400">Compiles queries simultaneously</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {['twitter', 'linkedin', 'reddit', 'upwork', 'threads', 'bluesky', 'contra', 'hackernews', 'indiehackers'].map((sId) => {
                      const isSelected = selectedMultiSources.includes(sId);
                      return (
                        <button
                          key={sId}
                          type="button"
                          onClick={() => toggleMultiSource(sId)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                              : 'bg-slate-900 text-slate-400 border-white/[0.08] hover:text-slate-200'
                          }`}
                        >
                          {isSelected ? <CheckSquare className="w-3.5 h-3.5 text-sky-300" /> : <Square className="w-3.5 h-3.5" />}
                          <span className="capitalize">{sId}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Industry & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-sky-400" />
                    <span>Industry Niche (12 Categories)</span>
                  </label>
                  <select
                    value={selectedIndustry}
                    onChange={(e) => handleIndustrySelect(e.target.value)}
                    className="w-full bg-slate-900/90 border border-white/[0.08] focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
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
                  <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Location Qualifier</span>
                  </label>
                  <select
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    className="w-full bg-slate-900/90 border border-white/[0.08] focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
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

              {/* Service Type & Recency & Language */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Service Type</label>
                  <select
                    value={serviceType}
                    onChange={(e) => setServiceType(e.target.value)}
                    className="w-full bg-slate-900/90 border border-white/[0.08] focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="">Any Website Work</option>
                    <option value="new_site">New Website</option>
                    <option value="redesign">Website Redesign</option>
                    <option value="ecommerce">E-Commerce / Shopify</option>
                    <option value="mvp">MVP / Web App</option>
                    <option value="maintenance">Maintenance & Speed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-400" />
                    <span>Recency Filter</span>
                  </label>
                  <select
                    value={recency}
                    onChange={(e) => setRecency(e.target.value)}
                    className="w-full bg-slate-900/90 border border-white/[0.08] focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="all">Anytime (All)</option>
                    <option value="24h">Past 24 Hours</option>
                    <option value="week">Past Week</option>
                    <option value="month">Past Month</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                    <Globe className="w-3 h-3 text-sky-400" />
                    <span>Language / Tone</span>
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full bg-slate-900/90 border border-white/[0.08] focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="en">English Intent</option>
                    <option value="hinglish">Hinglish / Hindi Business</option>
                    <option value="all">All Languages</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="budgetToggle"
                  checked={requireBudget}
                  onChange={(e) => setRequireBudget(e.target.checked)}
                  className="rounded border-white/[0.1] text-sky-500 focus:ring-0 bg-slate-900 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="budgetToggle" className="text-xs text-slate-300 flex items-center gap-1.5 cursor-pointer">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Require explicit commercial budget signals (eliminates equity & non-paying requests)</span>
                </label>
              </div>
            </div>

            {/* 3. POSITIVE BUYING INTENTS & NEGATIVE EXCLUSIONS */}
            <div className="p-6 rounded-2xl glass-panel space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Buying-Intent Positive Phrases (OR Match)</span>
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {positiveTags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-1.5 font-mono shadow-sm"
                    >
                      <span>"{tag}"</span>
                      <button
                        onClick={() => removePositiveTag(tag)}
                        className="text-emerald-400 hover:text-white ml-0.5 font-bold cursor-pointer"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add buying phrase (e.g. need a website, looking for web developer)..."
                    value={newPositiveInput}
                    onChange={(e) => setNewPositiveInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPositiveTag())}
                    className="flex-1 bg-slate-900/90 border border-white/[0.08] focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={addPositiveTag}
                    className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-500/20 cursor-pointer"
                  >
                    + Add
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-white/[0.06]">
                <label className="block text-xs font-bold text-slate-200 mb-1.5 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                  <span>Developer Self-Promotion Exclusions (NOT Match - Anti-Spam)</span>
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {negativeTags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-1.5 font-mono shadow-sm"
                    >
                      <span>"{tag}"</span>
                      <button
                        onClick={() => removeNegativeTag(tag)}
                        className="text-rose-400 hover:text-white ml-0.5 font-bold cursor-pointer"
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
                    className="flex-1 bg-slate-900/90 border border-white/[0.08] focus:border-rose-500 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={addNegativeTag}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-md shadow-rose-500/20 cursor-pointer"
                  >
                    + Exclude
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Live Search Launcher & Query Preview */}
          <div className="space-y-5">
            {/* HACKER NEWS AUTOMATED DISCOVERY CARD */}
            {platform === 'hackernews' && (
              <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-slate-900/90 to-slate-900 border border-amber-500/30 space-y-3 shadow-xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-400" />
                    Automated Hacker News API
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold">
                    Official API
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Queries Hacker News Algolia live discussions and freelancer requests, automatically screening client buying intent.
                </p>
                <button
                  type="button"
                  onClick={handleHnSearch}
                  disabled={hnLoading}
                  className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {hnLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>{hnLoading ? 'Querying Algolia API...' : 'Fetch Live Hacker News Leads'}</span>
                </button>

                {hnLiveResults.length > 0 && (
                  <div className="space-y-2 mt-2 max-h-80 overflow-y-auto pr-1">
                    {hnLiveResults.map((lead) => (
                      <div
                        key={lead.object_id}
                        className="p-3.5 rounded-xl bg-slate-950 border border-white/[0.06] space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-white truncate">{lead.title}</span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                              lead.lead_score >= 80
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : lead.lead_score >= 50
                                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            }`}
                          >
                            Score: {lead.lead_score}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-2">{lead.explanation}</p>
                        <div className="flex items-center justify-between pt-1">
                          <a
                            href={lead.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sky-400 hover:underline text-[11px] inline-flex items-center gap-1 font-semibold"
                          >
                            <span>View Discussion</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                          <button
                            type="button"
                            onClick={() => handleSaveHnLead(lead)}
                            disabled={hnSavedMap[lead.object_id]}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                              hnSavedMap[lead.object_id]
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-sky-500 text-slate-950 hover:bg-sky-400 shadow-sm'
                            }`}
                          >
                            {hnSavedMap[lead.object_id] ? 'Saved to Pipeline' : '+ Ingest Lead'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* LIVE QUERY LAUNCHER */}
            <div className="p-6 rounded-2xl glass-panel space-y-4 sticky top-24 shadow-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>{isMultiSourceMode ? 'Multi-Source Queries' : 'Live Platform Query'}</span>
                </h3>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30 font-bold">
                  {isMultiSourceMode ? `${selectedMultiSources.length} Channels` : platform}
                </span>
              </div>

              {/* MULTI-SOURCE MODE DISPLAY */}
              {isMultiSourceMode ? (
                <div className="space-y-3">
                  {multiLoading ? (
                    <div className="h-40 rounded-xl bg-slate-950 border border-white/[0.06] animate-pulse flex items-center justify-center text-slate-500 text-xs">
                      Compiling multi-source query matrix...
                    </div>
                  ) : multiCompiledResults ? (
                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                      {multiCompiledResults.queries.map((q, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-xl bg-slate-950 border border-white/[0.06] space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold uppercase text-[11px] tracking-wide text-sky-400">
                              {q.platform}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {q.sub_queries?.length || 1} queries
                            </span>
                          </div>

                          <div className="font-mono text-slate-300 text-[11px] truncate p-2 bg-slate-900 rounded-lg border border-white/[0.04]">
                            {q.raw_query}
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            <a
                              href={q.generated_url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex-1 py-1.5 px-3 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1 shadow-md shadow-sky-500/20 transition-all"
                            >
                              <span>Launch Search</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                            <button
                              type="button"
                              onClick={() => copyText(q.raw_query, idx)}
                              className="py-1.5 px-3 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 border border-white/[0.08] transition-colors cursor-pointer"
                            >
                              {queryCopiedIndex === idx ? 'Copied' : 'Copy'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 text-center py-4">Click below to compile all queries</div>
                  )}

                  <button
                    type="button"
                    onClick={() => handleMultiCompile()}
                    disabled={multiLoading}
                    className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-indigo-500 to-sky-600 hover:from-indigo-400 hover:to-sky-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${multiLoading ? 'animate-spin' : ''}`} />
                    <span>Compile All {selectedMultiSources.length} Channels</span>
                  </button>
                </div>
              ) : (
                /* SINGLE-SOURCE MODE DISPLAY */
                <div>
                  {compileLoading ? (
                    <div className="h-28 rounded-xl bg-slate-950 border border-white/[0.06] animate-pulse" />
                  ) : compiledResult ? (
                    <div className="space-y-4">
                      {/* Multi-Query Split Indicator */}
                      {compiledResult.sub_queries && compiledResult.sub_queries.length > 1 ? (
                        <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/25 text-xs text-indigo-300 flex items-center justify-between">
                          <span className="font-semibold flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5" />
                            <span>Query Splitting: {compiledResult.sub_queries.length} Targeted Searches</span>
                          </span>
                          <span className="text-[10px] text-slate-400">Bypasses character caps</span>
                        </div>
                      ) : null}

                      {/* Render Sub-Queries */}
                      {compiledResult.sub_queries && compiledResult.sub_queries.length > 0 ? (
                        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                          {compiledResult.sub_queries.map((sub, idx) => (
                            <div
                              key={idx}
                              className="p-3.5 rounded-xl bg-slate-950 border border-white/[0.06] space-y-2.5 text-xs"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-300 text-[11px] truncate">
                                  {sub.label}
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono">#{idx + 1}</span>
                              </div>

                              <div className="font-mono text-slate-300 break-words select-all text-[11px] leading-relaxed p-2.5 bg-slate-900 rounded-lg border border-white/[0.04]">
                                {sub.raw_query}
                              </div>

                              <div className="flex items-center gap-2 pt-1">
                                <a
                                  href={sub.generated_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex-1 py-1.5 px-3 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-sky-500/20 transition-all cursor-pointer"
                                >
                                  <span>Launch</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>

                                <button
                                  type="button"
                                  onClick={() => copyText(sub.raw_query, idx)}
                                  className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs flex items-center gap-1 border border-white/[0.08] transition-colors cursor-pointer"
                                >
                                  {queryCopiedIndex === idx ? (
                                    <Check className="w-3 h-3 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                  <span>{queryCopiedIndex === idx ? 'Copied' : 'Copy'}</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="p-3.5 rounded-xl bg-slate-950 border border-white/[0.06] font-mono text-xs text-slate-200 break-words leading-relaxed select-all">
                            {compiledResult.raw_query}
                          </div>
                          <div className="flex gap-2">
                            <a
                              href={compiledResult.generated_url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 transition-all cursor-pointer"
                            >
                              <span>Launch Live Search</span>
                              <ExternalLink className="w-4 h-4" />
                            </a>
                            <button
                              type="button"
                              onClick={() => copyText(compiledResult.raw_query)}
                              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-white/[0.08] transition-colors cursor-pointer"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}

                      <p className="text-xs text-slate-400 italic">
                        💡 {compiledResult.operator_notes}
                      </p>
                    </div>
                  ) : null}
                </div>
              )}

              {/* Save Preset Section */}
              <div className="pt-4 border-t border-white/[0.08] space-y-2">
                <label className="block text-xs font-semibold text-slate-300">Save Search as Workspace Preset</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Clinic Redesign High Intent..."
                    value={presetNameInput}
                    onChange={(e) => setPresetNameInput(e.target.value)}
                    className="flex-1 bg-slate-900 border border-white/[0.08] focus:border-sky-500 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleSavePreset}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-white/[0.08] flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>Save</span>
                  </button>
                </div>
                {presetSavedStatus && (
                  <p className="text-xs text-emerald-400 font-semibold mt-1">{presetSavedStatus}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- SOURCE REGISTRY BROWSER MODAL (ALL 34 CHANNELS) --- */}
      {showSourceBrowser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="glass-panel border border-white/[0.1] rounded-2xl max-w-4xl w-full p-6 shadow-2xl relative max-h-[85vh] flex flex-col animate-scale-in">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 mb-4">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <Globe className="w-5 h-5 text-sky-400" />
                  Unified Multi-Source Registry ({registeredSources.length || 34} Platforms)
                </h3>
                <p className="text-xs text-slate-400">
                  Select any channel to load in the Live Builder or add to your multi-source search batch.
                </p>
              </div>
              <button
                onClick={() => setShowSourceBrowser(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Category Filters & Search Bar */}
            <div className="space-y-3 mb-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search by platform name or keyword..."
                    value={sourceSearchTerm}
                    onChange={(e) => setSourceSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-white/[0.08] focus:border-sky-500 rounded-xl text-xs text-slate-200 focus:outline-none"
                  />
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'all', label: 'All Sources' },
                    { id: 'social', label: 'Social' },
                    { id: 'freelance', label: 'Freelance & Gigs' },
                    { id: 'directory', label: 'Directories' },
                    { id: 'startup', label: 'Startups' },
                    { id: 'search_engine', label: 'Engines' },
                    { id: 'other', label: 'Contract' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSourceCategoryFilter(cat.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        sourceCategoryFilter === cat.id
                          ? 'bg-sky-500 text-slate-950 border-sky-400 shadow-sm'
                          : 'bg-slate-900 text-slate-400 border-white/[0.08] hover:text-white'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Sources Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 overflow-y-auto pr-1 flex-1">
              {filteredSources.map((s) => (
                <div
                  key={s.source_id}
                  className="p-4 rounded-xl glass-card flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-white text-xs">{s.name}</span>
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          s.source_mode === 'official_api'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : s.is_indirect
                            ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                            : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                        }`}
                      >
                        {s.source_mode === 'official_api'
                          ? 'Official API'
                          : s.is_indirect
                          ? 'Directory Opp'
                          : 'Live Search'}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 line-clamp-2 mb-2 leading-relaxed">{s.description}</p>
                  </div>

                  <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPlatform(s.source_id);
                        setIsMultiSourceMode(false);
                        setShowSourceBrowser(false);
                        toast(`Focused on ${s.name} in builder`, 'info');
                      }}
                      className="px-3 py-1 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs cursor-pointer shadow-sm"
                    >
                      Focus
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleMultiSource(s.source_id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1 cursor-pointer transition-all ${
                        selectedMultiSources.includes(s.source_id)
                          ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500'
                          : 'bg-slate-900 text-slate-400 border-white/[0.08] hover:text-white'
                      }`}
                    >
                      {selectedMultiSources.includes(s.source_id) ? (
                        <CheckSquare className="w-3.5 h-3.5 text-sky-400" />
                      ) : (
                        <Square className="w-3.5 h-3.5" />
                      )}
                      <span>Multi-Search</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 2: HIGH-YIELD CURATED CHANNELS --- */}
      {activeTab === 'curated' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Pre-Vetted Query Matrices across Core Platforms
            </h2>
            <span className="text-xs text-slate-400">Sorted by Intent & Conversion</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {curatedQueries.map((q, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl glass-card flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 uppercase tracking-wider">
                      {q.platform}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">{q.target_category}</span>
                  </div>
                  <p className="text-sm font-bold text-slate-200 line-clamp-2 mt-1 leading-snug">
                    {q.description}
                  </p>
                  <div className="mt-3 p-2.5 rounded-xl bg-slate-950 font-mono text-xs text-slate-400 truncate border border-white/[0.06]">
                    {q.query_text}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2">
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
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300 hover:text-amber-200 bg-amber-500/15 px-2.5 py-1 rounded-lg border border-amber-500/30 cursor-pointer"
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

      {/* --- TAB 3: GOOGLE DORKS (WEBSITE OPPORTUNITY FINDER) --- */}
      {activeTab === 'dorks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-400" />
              Website Opportunity Discovery Dorks
            </h2>
            <span className="text-xs text-slate-400">Targets Outdated, Insecure & Unoptimized Sites</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dorkQueries.map((d, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl glass-card space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      {d.category}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      {d.target_industry} • {d.target_location}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 font-mono text-xs text-slate-300 select-all border border-white/[0.06] break-all">
                    {d.dork_syntax}
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed mt-2.5">
                    <strong className="text-slate-200">Strategy:</strong> {d.verification_advice}
                  </p>
                </div>

                <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between">
                  <a
                    href={d.generated_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 cursor-pointer"
                  >
                    <span>Execute Dork on Google</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <button
                    onClick={() => copyText(d.dork_syntax)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-white/[0.08] cursor-pointer"
                  >
                    Copy Syntax
                  </button>
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
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-sky-400" />
              Saved Query Presets
            </h2>
            <span className="text-xs text-slate-400">Workspace Custom Searches</span>
          </div>

          {userPresets.length === 0 ? (
            <div className="p-16 text-center rounded-2xl glass-panel space-y-2">
              <Bookmark className="w-8 h-8 text-sky-400 mx-auto opacity-70 mb-2" />
              <p className="text-sm text-slate-200 font-bold">No saved presets yet</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Configure your search in the Live Query Builder and click "Save as Workspace Preset" to pin your favorite query parameters.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userPresets.map((preset) => (
                <div
                  key={preset.id}
                  className="p-5 rounded-2xl glass-card flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-white">{preset.preset_name}</span>
                      <span className="text-xs font-mono uppercase px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30 font-bold">
                        {preset.platform}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400">
                      {preset.industry || 'All Industries'} • {preset.location_target || 'Global'}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-1">
                      {preset.positive_keywords?.slice(0, 3).map((pk, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-slate-900 border border-white/[0.06] text-slate-300 text-[11px] font-medium"
                        >
                          "{pk}"
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between">
                    <button
                      onClick={() => handleApplyPreset(preset)}
                      className="px-3.5 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs cursor-pointer shadow-sm"
                    >
                      Load in Builder
                    </button>

                    <button
                      onClick={() => handleDeletePreset(preset.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                      title="Delete Preset"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- MODAL 1: QUICK INGEST LEAD --- */}
      {showIngestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="glass-panel border border-white/[0.1] rounded-2xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] mb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Plus className="w-4 h-4 text-sky-400" />
                  Quick Ingest Lead
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Enter opportunity details. The Lead Intelligence engine automatically classifies intent and evaluates client fit.
                </p>
              </div>
              <button
                onClick={() => setShowIngestModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {saveStatus && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold mb-4 flex items-center gap-2 ${
                  saveStatus.type === 'success'
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                }`}
              >
                {saveStatus.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                )}
                <span>{saveStatus.message}</span>
              </div>
            )}

            <form onSubmit={handleSaveLead} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Business Name or Project Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Health Clinic / Seeking Web Developer"
                  value={ingestForm.business_or_title}
                  onChange={(e) => setIngestForm({ ...ingestForm, business_or_title: e.target.value })}
                  className="w-full bg-slate-900 border border-white/[0.08] focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Author Role / Job Title (if available)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Clinic Owner, Marketing Director, Software Developer"
                  value={ingestForm.author_role}
                  onChange={(e) => setIngestForm({ ...ingestForm, author_role: e.target.value })}
                  className="w-full bg-slate-900 border border-white/[0.08] focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Lead Type</label>
                  <select
                    value={ingestForm.lead_type}
                    onChange={(e) => setIngestForm({ ...ingestForm, lead_type: e.target.value })}
                    className="w-full bg-slate-900 border border-white/[0.08] focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none"
                  >
                    <option value="LOCAL_BUSINESS">Local Business</option>
                    <option value="FREELANCE_PROJECT">Freelance Project</option>
                    <option value="SOCIAL_OPPORTUNITY">Social Opportunity</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Source Platform</label>
                  <select
                    value={ingestForm.source_platform}
                    onChange={(e) => setIngestForm({ ...ingestForm, source_platform: e.target.value })}
                    className="w-full bg-slate-900 border border-white/[0.08] focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none"
                  >
                    <option value="LINKEDIN">LinkedIn</option>
                    <option value="TWITTER">X (Twitter)</option>
                    <option value="REDDIT">Reddit</option>
                    <option value="UPWORK">Upwork</option>
                    <option value="HACKERNEWS">Hacker News</option>
                    <option value="THREADS">Threads</option>
                    <option value="BLUESKY">Bluesky</option>
                    <option value="CONTRA">Contra</option>
                    <option value="FREELANCER">Freelancer.com</option>
                    <option value="PEOPLEPERHOUR">PeoplePerHour</option>
                    <option value="JUSTDIAL">Justdial</option>
                    <option value="INDIAMART">IndiaMART</option>
                    <option value="YELP">Yelp</option>
                    <option value="GOOGLE_PLACES">Google Places</option>
                    <option value="GOOGLE_DORK">Google Dork Finding</option>
                    <option value="FACEBOOK">Facebook</option>
                    <option value="INSTAGRAM">Instagram</option>
                    <option value="MANUAL">Manual / Direct Referral</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Source URL *</label>
                <input
                  type="url"
                  required
                  placeholder="https://linkedin.com/posts/... or https://twitter.com/..."
                  value={ingestForm.source_url}
                  onChange={(e) => setIngestForm({ ...ingestForm, source_url: e.target.value })}
                  className="w-full bg-slate-900 border border-white/[0.08] focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Website (Optional)</label>
                  <input
                    type="text"
                    placeholder="clinic.com"
                    value={ingestForm.canonical_domain}
                    onChange={(e) => setIngestForm({ ...ingestForm, canonical_domain: e.target.value })}
                    className="w-full bg-slate-900 border border-white/[0.08] focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number (Optional)</label>
                  <input
                    type="text"
                    placeholder="+91 98765 43210"
                    value={ingestForm.normalized_phone}
                    onChange={(e) => setIngestForm({ ...ingestForm, normalized_phone: e.target.value })}
                    className="w-full bg-slate-900 border border-white/[0.08] focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Notes / Excerpt</label>
                <textarea
                  rows={2}
                  placeholder="Paste context, project description, or notes here..."
                  value={ingestForm.notes}
                  onChange={(e) => setIngestForm({ ...ingestForm, notes: e.target.value })}
                  className="w-full bg-slate-900 border border-white/[0.08] focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowIngestModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-sky-500/20 cursor-pointer"
                >
                  Save Lead to Pipeline
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: ICEBREAKER PITCH --- */}
      {showIcebreakerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="glass-panel border border-white/[0.1] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-amber-400" />
                <span>Contextual Outreach Pitch</span>
              </h3>
              <button
                onClick={() => setShowIcebreakerModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Target Lead / Project</label>
                <input
                  type="text"
                  value={icebreakerLeadTitle}
                  onChange={(e) => setIcebreakerLeadTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-white/[0.08] focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Tone</label>
                  <select
                    value={icebreakerTone}
                    onChange={(e) => setIcebreakerTone(e.target.value)}
                    className="w-full bg-slate-900 border border-white/[0.08] focus:border-amber-500 rounded-xl px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none"
                  >
                    <option value="FRIENDLY">Friendly & Direct</option>
                    <option value="CONSULTATIVE">Consultative & Value-first</option>
                    <option value="PROFESSIONAL">Professional & Formal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Language</label>
                  <select
                    value={icebreakerLanguage}
                    onChange={(e) => setIcebreakerLanguage(e.target.value)}
                    className="w-full bg-slate-900 border border-white/[0.08] focus:border-amber-500 rounded-xl px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none"
                  >
                    <option value="en">English</option>
                    <option value="hinglish">Hinglish (Indian Business)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Portfolio / Proof URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://yourportfolio.com"
                  value={icebreakerPortfolio}
                  onChange={(e) => setIcebreakerPortfolio(e.target.value)}
                  className="w-full bg-slate-900 border border-white/[0.08] focus:border-amber-500 rounded-xl px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={handleGenerateIcebreaker}
                disabled={icebreakerLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50 transition-all cursor-pointer"
              >
                {icebreakerLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>{icebreakerLoading ? 'Crafting Hook...' : 'Generate Contextual Hook'}</span>
              </button>

              {icebreakerResult && (
                <div className="p-4 rounded-xl bg-slate-950 border border-white/[0.08] space-y-2.5">
                  {icebreakerSubject && (
                    <p className="text-xs font-bold text-amber-400">Subject: {icebreakerSubject}</p>
                  )}
                  <p className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed select-all">
                    {icebreakerResult}
                  </p>
                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(icebreakerResult);
                        setIcebreakerCopied(true);
                        toast('Icebreaker copied to clipboard!', 'success');
                        setTimeout(() => setIcebreakerCopied(false), 2000);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-amber-300 font-bold inline-flex items-center gap-1.5 border border-white/[0.08] cursor-pointer"
                    >
                      {icebreakerCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{icebreakerCopied ? 'Copied!' : 'Copy Icebreaker'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
