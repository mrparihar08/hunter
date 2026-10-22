import axios from 'axios';
import {
  DeepLinkQuery,
  FollowUpTask,
  LeadRecord,
  OutreachDraft,
  User,
  WebsiteAudit,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to inject JWT Bearer Token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('hunter_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor to handle 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('hunter_token');
      // If not already on auth page, can trigger redirect or reload
    }
    return Promise.reject(error);
  }
);

// API Service Functions
export const leadService = {
  list: async (params?: Record<string, any>) => {
    const res = await api.get<{ items: LeadRecord[]; total: number }>('/leads', { params });
    return res.data;
  },
  getById: async (id: string) => {
    const res = await api.get<LeadRecord>(`/leads/${id}`);
    return res.data;
  },
  create: async (data: Record<string, any>) => {
    const res = await api.post<LeadRecord>('/leads', data);
    return res.data;
  },
  update: async (id: string, data: Record<string, any>) => {
    const res = await api.patch<LeadRecord>(`/leads/${id}`, data);
    return res.data;
  },
};

export const auditService = {
  triggerAudit: async (leadId: string, targetUrl?: string) => {
    const res = await api.post<WebsiteAudit>(`/leads/${leadId}/audit`, {
      target_url: targetUrl,
    });
    return res.data;
  },
};

export const aiService = {
  qualify: async (leadId: string) => {
    const res = await api.post<LeadRecord>(`/leads/${leadId}/qualify`);
    return res.data;
  },
  generateOutreach: async (leadId: string, channel: string = 'EMAIL', instructions?: string) => {
    const res = await api.post<OutreachDraft>(`/leads/${leadId}/outreach`, {
      channel,
      custom_instructions: instructions,
    });
    return res.data;
  },
};

export const searchService = {
  getCuratedDeepLinks: async () => {
    const res = await api.get<DeepLinkQuery[]>('/search/deep-links');
    return res.data;
  },
  getCustomLink: async (platform: string, keywords: string) => {
    const res = await api.get<{ generated_url: string }>('/search/custom-deep-link', {
      params: { platform, keywords },
    });
    return res.data;
  },
  searchPlaces: async (query: string, location?: string) => {
    const res = await api.post('/search/places', { query, location });
    return res.data;
  },
};

export const followUpService = {
  list: async (isCompleted: boolean = false) => {
    const res = await api.get<FollowUpTask[]>('/followups', {
      params: { is_completed: isCompleted },
    });
    return res.data;
  },
  create: async (leadId: string, dueDate: string, note: string) => {
    const res = await api.post<FollowUpTask>('/followups', {
      lead_id: leadId,
      due_date: dueDate,
      task_note: note,
    });
    return res.data;
  },
  toggleComplete: async (taskId: string, isCompleted: boolean) => {
    const res = await api.patch<FollowUpTask>(`/followups/${taskId}`, {
      is_completed: isCompleted,
    });
    return res.data;
  },
};

export const analyticsService = {
  getOverview: async () => {
    const res = await api.get('/analytics/overview');
    return res.data;
  },
};
