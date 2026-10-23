export type UserRole = 'OWNER_ADMIN' | 'COLLABORATOR';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
}

export type LeadType = 'LOCAL_BUSINESS' | 'FREELANCE_PROJECT' | 'SOCIAL_OPPORTUNITY';

export type LeadStatus =
  | 'NEW'
  | 'NEEDS_REVIEW'
  | 'QUALIFIED'
  | 'CONTACTED'
  | 'REPLIED'
  | 'MEETING_SCHEDULED'
  | 'PROPOSAL_SENT'
  | 'WON'
  | 'LOST'
  | 'NOT_RELEVANT';

export type AICategory = 'EXPLICIT_NEED' | 'INFERRED_OPPORTUNITY' | 'SPECULATIVE';

export interface LeadSource {
  id: string;
  platform: string;
  external_id?: string;
  source_url: string;
  raw_payload: Record<string, any>;
  discovered_at: string;
}

export interface LeadRecord {
  id: string;
  business_or_title: string;
  lead_type: LeadType;
  current_status: LeadStatus;
  canonical_domain?: string;
  normalized_phone?: string;
  contact_email?: string;
  city?: string;
  country?: string;
  estimated_budget?: string;
  ai_fit_score?: number;
  ai_qualification_category?: AICategory;
  ai_qualification_reason?: string;
  assigned_user_id?: string;
  created_by_user_id: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  sources: LeadSource[];
}

export interface WebsiteAudit {
  id: string;
  lead_id: string;
  target_url: string;
  http_status?: number;
  is_https: boolean;
  has_mobile_viewport: boolean;
  page_load_ms?: number;
  meta_title?: string;
  meta_description?: string;
  detected_technologies: string[];
  identified_issues: string[];
  audited_at: string;
}

export interface OutreachDraft {
  id: string;
  lead_id: string;
  channel: string;
  subject_line?: string;
  body_text: string;
  is_approved: boolean;
  created_at: string;
}

export interface FollowUpTask {
  id: string;
  lead_id: string;
  assigned_to_user_id: string;
  due_date: string;
  task_note: string;
  is_completed: boolean;
  completed_at?: string;
  created_at: string;
}

export interface DeepLinkQuery {
  platform: string;
  target_category: string;
  query_text: string;
  generated_url: string;
  description: string;
}

// --- Query Engine & Discovery Types ---

export interface QueryCompileRequest {
  platform: string;
  positive_keywords: string[];
  negative_keywords: string[];
  industry_id?: string;
  location_target?: string;
  language?: string;
  intent_preset?: string;
  subreddits?: string[];
  dork_mode?: string;
}

export interface CompiledQueryResponse {
  platform: string;
  raw_query: string;
  generated_url: string;
  positive_clauses: string[];
  negative_clauses: string[];
  location_clause?: string;
  operator_notes: string;
  integration_status: string;
}

export interface IndustryPreset {
  id: string;
  name: string;
  buying_intents: string[];
  hinglish_variants: string[];
  suggested_services: string[];
  recommended_negatives: string[];
  rationale: string;
}

export interface GeoLocationPreset {
  region: string;
  name: string;
  search_tokens: string[];
}

export interface DorkQuery {
  category: string;
  dork_syntax: string;
  target_industry: string;
  target_location: string;
  generated_url: string;
  verification_advice: string;
}

export interface QueryPreset {
  id: string;
  user_id: string;
  preset_name: string;
  platform: string;
  industry?: string;
  location_target?: string;
  positive_keywords: string[];
  negative_keywords: string[];
  language: string;
  intent_level: string;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface IcebreakerRequest {
  platform: string;
  lead_title: string;
  contact_name?: string;
  industry?: string;
  tone?: string;
  language?: string;
  context_snippet?: string;
  portfolio_url?: string;
  audit_issues?: string[];
}

export interface IcebreakerResponse {
  platform: string;
  tone: string;
  subject_line?: string;
  message_body: string;
  caution_notes: string;
}
