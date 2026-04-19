import { Contact, User } from '../types';

const API_BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const isFormData = options?.body instanceof FormData;
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'An unknown error occurred' }));
    throw new Error(error.message || 'Request failed');
  }

  return response.json();
}

export const api = {
  // Auth
  login: (credentials: any) => request<User>('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  signup: (userData: any) => request<User>('/auth/signup', { method: 'POST', body: JSON.stringify(userData) }),
  me: () => request<User>('/auth/me'),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  updateProfile: (id: string, profile: any) => request<User>(`/auth/profile/${id}`, { method: 'PUT', body: JSON.stringify(profile) }),
  forgotPassword: (email: string) => request<{ message: string }>('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),

  // Contacts
  getContacts: () => request<Contact[]>('/contacts'),
  createContact: (contact: Partial<Contact>) => request<Contact>('/contacts', { method: 'POST', body: JSON.stringify(contact) }),
  updateContact: (id: string, contact: Partial<Contact>) => request<Contact>(`/contacts/${id}`, { method: 'PUT', body: JSON.stringify(contact) }),
  deleteContact: (id: string) => request<void>(`/contacts/${id}`, { method: 'DELETE' }),
  bulkCreateContacts: (contacts: Partial<Contact>[]) => request<Contact[]>('/contacts/bulk', { method: 'POST', body: JSON.stringify(contacts) }),
  bulkDeleteContacts: (ids: string[]) => request<void>('/contacts/bulk', { method: 'DELETE', body: JSON.stringify({ ids }) }),
  toggleFavorite: (id: string, isFavorite: boolean) => request<Contact>(`/contacts/${id}/favorite`, { method: 'PATCH', body: JSON.stringify({ isFavorite }) }),

  // Uploads
  uploadScreenshot: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return request<{ url: string }>('/upload', {
      method: 'POST',
      body: formData,
    });
  },

  // Dashboard
  getStats: () => request<any>('/contacts/stats'),
  getRecentContacts: () => request<Contact[]>('/contacts/recent'),

  // Admin
  // Admin
  getUsers: () => request<User[]>('/admin/users'),
  createUser: (userData: any) => request<User>('/admin/users', { method: 'POST', body: JSON.stringify(userData) }),
  updateUser: (id: string, userData: any) => request<User>(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(userData) }),
  deleteUser: (id: string) => request<void>(`/admin/users/${id}`, { method: 'DELETE' }),
// Activity tracking
logActivity: (data: { userId: string; userName: string; userEmail: string; action: string; details?: string }) =>
  request<void>('/activity', { method: 'POST', body: JSON.stringify(data) }),
getActivity: () => request<any[]>('/activity'),
getOnlineUsers: () => request<any[]>('/activity/online'),
getActivitySummary: () => request<any[]>('/activity/summary'),

};
