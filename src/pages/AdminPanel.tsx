import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, UserPlus, Search, Edit2, Trash2, User, Mail,
  Shield, Lock, Calendar, Activity, Clock, CheckCircle2, XCircle,
  ChevronLeft, ChevronRight, Users, TrendingUp, Eye,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { api } from '../services/api';
import { ALL_ROLES, ROLE_BADGE_COLORS, type AppRole } from '../permissions';

// ─── Tabs ─────────────────────────────────────────────────────────────────────
type Tab = 'users' | 'attendance' | 'activity';

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<Tab>('users');

  // ── Users state ──────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'User', status: 'Active' });
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // ── Attendance state ─────────────────────────────────────────────────────
  const [attendance, setAttendance] = useState<any[]>([]);
  const [attLoading, setAttLoading] = useState(false);
  const [attError, setAttError] = useState<string | null>(null);
  const [attMonth, setAttMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // ── Activity state ───────────────────────────────────────────────────────
  const [activity, setActivity] = useState<any[]>([]);
  const [actLoading, setActLoading] = useState(false);
  const [actError, setActError] = useState<string | null>(null);
  const [actPage, setActPage] = useState(1);
  const ACT_PER_PAGE = 25;

  // ── Fetch data on mount ──────────────────────────────────────────────────
  useEffect(() => { fetchUsers(); }, []);
  useEffect(() => { if (activeTab === 'attendance') fetchAttendance(); }, [activeTab, attMonth]);
  useEffect(() => { if (activeTab === 'activity') fetchActivity(); }, [activeTab]);

  const fetchUsers = async () => {
    try {
      const fetchedUsers = await api.getUsers();
      setUsers(fetchedUsers);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAttendance = async () => {
    setAttLoading(true);
    setAttError(null);
    try {
      const [year, month] = attMonth.split('-').map(Number);
      const from = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      const res = await fetch(`/api/attendance?from=${from}&to=${to}`);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error('Invalid response from server');
      // Normalize: Supabase may return full ISO timestamps for DATE columns.
      // Slice to YYYY-MM-DD so Set lookups work correctly.
      const normalized = data.map((row: any) => ({
        ...row,
        date: typeof row.date === 'string' ? row.date.slice(0, 10) : row.date,
      }));
      setAttendance(normalized);
    } catch (e: any) {
      console.error('Attendance fetch error:', e);
      setAttError(e.message || 'Failed to load attendance data.');
      setAttendance([]);
    } finally {
      setAttLoading(false);
    }
  };

  const fetchActivity = async () => {
    setActLoading(true);
    setActError(null);
    try {
      // Use direct fetch — api service may not have getActivity method
      const res = await fetch('/api/activity');
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error('Invalid response from server');
      setActivity(data);
    } catch (e: any) {
      console.error('Activity fetch error:', e);
      setActError(e.message || 'Failed to load activity log.');
      setActivity([]);
    } finally {
      setActLoading(false);
    }
  };

  // ── Users helpers ─────────────────────────────────────────────────────────
  const filteredUsers = users.filter((user: any) => {
    const query = (searchQuery || '').toLowerCase().trim();
    return String(user.name || '').toLowerCase().includes(query) ||
           String(user.email || '').toLowerCase().includes(query);
  });

  const handleAddUser = () => {
    setEditingUser(null);
    setFormData({ name: '', email: '', password: '', role: 'User', status: 'Active' });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleEditUser = (user: any) => {
    setEditingUser(user);
    setFormData({ name: user.name, email: user.email, password: '', role: user.role, status: user.status || 'Active' });
    setFormError('');
    setIsModalOpen(true);
  };

  const confirmDelete = (id: string) => {
    setUserToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteUser = async () => {
    if (userToDelete) {
      try {
        await api.deleteUser(userToDelete);
        setUsers(users.filter((u: any) => u.id !== userToDelete));
        setIsDeleteModalOpen(false);
        setUserToDelete(null);
      } catch (error) {
        console.error('Failed to delete user:', error);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSaving(true);
    try {
      if (editingUser) {
        const updated = await api.updateUser(editingUser.id, {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          status: formData.status,
          ...(formData.password ? { password: formData.password } : {}),
        });
        setUsers(users.map((u: any) => u.id === editingUser.id ? { ...u, ...updated } : u));
      } else {
        if (!formData.password || formData.password.length < 6) {
          setFormError('Password must be at least 6 characters.');
          setIsSaving(false);
          return;
        }
        const newUser = await api.createUser({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
          status: formData.status,
        });
        setUsers([...users, newUser]);
      }
      setIsModalOpen(false);
    } catch (error: any) {
      setFormError(error.message || 'Failed to save user.');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Attendance helpers ────────────────────────────────────────────────────
  const attByUser = React.useMemo(() => {
    const map: Record<string, { userId: string; userName: string; userEmail: string; dates: Set<string> }> = {};
    attendance.forEach((row: any) => {
      if (!map[row.user_id]) {
        map[row.user_id] = { userId: row.user_id, userName: row.user_name, userEmail: row.user_email, dates: new Set() };
      }
      // Always store as YYYY-MM-DD (slice in case Supabase returns ISO timestamp)
      const dateKey = typeof row.date === 'string' ? row.date.slice(0, 10) : String(row.date);
      map[row.user_id].dates.add(dateKey);
    });
    return Object.values(map);
  }, [attendance]);

  const [year, month] = attMonth.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const dayNums = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const changeAttMonth = (delta: number) => {
    const d = new Date(`${attMonth}-01`);
    d.setMonth(d.getMonth() + delta);
    setAttMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  // ── Activity helpers ──────────────────────────────────────────────────────
  const activityPages = Math.ceil(activity.length / ACT_PER_PAGE);
  const pagedActivity = activity.slice((actPage - 1) * ACT_PER_PAGE, actPage * ACT_PER_PAGE);

  const actionColor = (action: string) => {
    if (action === 'login') return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
    if (action === 'contact_created') return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20';
    if (action === 'contact_updated') return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20';
    if (action === 'contact_deleted') return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
    return 'text-gray-600 dark:text-slate-400 bg-gray-50 dark:bg-slate-800';
  };

  const actionLabel = (action: string) => {
    const map: Record<string, string> = {
      login: 'Login',
      contact_created: 'Created',
      contact_updated: 'Edited',
      contact_deleted: 'Deleted',
      heartbeat: 'Online',
    };
    return map[action] || action;
  };

  const fmtTime = (ts: string) => {
    try {
      return new Date(ts).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch { return ts; }
  };

  // ── Overview counts ───────────────────────────────────────────────────────
  const roleCounts = React.useMemo(() => {
    const c: Record<string, number> = {};
    ALL_ROLES.forEach(r => { c[r] = users.filter((u: any) => u.role === r).length; });
    return c;
  }, [users]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Admin Panel</h1>
          <p className="text-gray-500 dark:text-slate-400 mt-1">Manage users, attendance and activity logs.</p>
        </div>
        {activeTab === 'users' && (
          <button
            onClick={handleAddUser}
            className="flex items-center gap-2 px-4 py-2 bg-primary rounded-xl text-sm font-bold text-white hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
          >
            <UserPlus size={18} /> Add User
          </button>
        )}
      </header>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 dark:bg-slate-800 p-1 rounded-2xl w-fit">
        {([
          { id: 'users', label: 'Users', icon: Users },
          { id: 'attendance', label: 'Attendance', icon: Calendar },
          { id: 'activity', label: 'Activity Log', icon: Activity },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all',
              activeTab === id
                ? 'bg-white dark:bg-slate-900 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
            )}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {/* ── USERS TAB ──────────────────────────────────────────────────────── */}
      {activeTab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* System Overview */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-gray-900 dark:text-white mb-4">System Overview</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500 dark:text-slate-400 font-medium">Total Users</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">{users.length}</span>
                </div>
                {ALL_ROLES.map(role => (
                  <div key={role} className="flex justify-between items-center">
                    <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', ROLE_BADGE_COLORS[role])}>{role}</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{roleCounts[role] || 0}</span>
                  </div>
                ))}
                <div className="pt-2 border-t border-gray-100 dark:border-slate-800">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500 dark:text-slate-400 font-medium">Active</span>
                    <span className="text-sm font-bold text-emerald-600">{users.filter((u: any) => u.status === 'Active').length}</span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-gray-500 dark:text-slate-400 font-medium">Inactive</span>
                    <span className="text-sm font-bold text-gray-400">{users.filter((u: any) => u.status === 'Inactive').length}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Role Legend */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-gray-900 dark:text-white mb-4">Role Permissions</h3>
              <div className="space-y-3 text-xs text-gray-600 dark:text-slate-400">
                <div>
                  <span className={cn('font-bold px-2 py-0.5 rounded-full', ROLE_BADGE_COLORS['Admin'])}>Admin</span>
                  <p className="mt-1">Full access to all features.</p>
                </div>
                <div>
                  <span className={cn('font-bold px-2 py-0.5 rounded-full', ROLE_BADGE_COLORS['User'])}>User</span>
                  <p className="mt-1">Create, edit, view all fields. No delete.</p>
                </div>
                <div>
                  <span className={cn('font-bold px-2 py-0.5 rounded-full', ROLE_BADGE_COLORS['Technical'])}>Technical</span>
                  <p className="mt-1">Create/Edit/View: CTN→Remarks. View: Salary, Technical Share.</p>
                </div>
                <div>
                  <span className={cn('font-bold px-2 py-0.5 rounded-full', ROLE_BADGE_COLORS['TeleCalling'])}>TeleCalling</span>
                  <p className="mt-1">Create/Edit/View: CTN→Status. View: Salary, TeleCalling Share.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Users Table */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search users by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none dark:text-white"
                />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-slate-800">
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">User</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                    {isLoading ? (
                      <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-400 dark:text-slate-500 text-sm">Loading users...</td></tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-400 dark:text-slate-500 text-sm">No users found.</td></tr>
                    ) : filteredUsers.map((user: any) => (
                      <tr key={user.id} className="group hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                              <User size={16} className="text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-900 dark:text-white">{user.name}</p>
                              <p className="text-xs text-gray-400 dark:text-slate-500">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn('text-xs font-bold px-2.5 py-1 rounded-full', ROLE_BADGE_COLORS[user.role as AppRole] || 'bg-gray-100 text-gray-600')}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn('text-xs font-bold px-2.5 py-1 rounded-full', user.status === 'Active'
                            ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                            : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400'
                          )}>
                            {user.status || 'Active'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleEditUser(user)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-300 transition-colors">
                              <Edit2 size={16} />
                            </button>
                            <button onClick={() => confirmDelete(user.id)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ATTENDANCE TAB ─────────────────────────────────────────────────── */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          {/* Month selector */}
          <div className="flex items-center gap-4">
            <button onClick={() => changeAttMonth(-1)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
              <ChevronLeft size={18} className="text-gray-500 dark:text-slate-400" />
            </button>
            <span className="text-lg font-bold text-gray-900 dark:text-white min-w-[160px] text-center">
              {new Date(`${attMonth}-01`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </span>
            <button onClick={() => changeAttMonth(1)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
              <ChevronRight size={18} className="text-gray-500 dark:text-slate-400" />
            </button>
          </div>

          {attLoading ? (
            <div className="flex items-center justify-center py-16 gap-3 text-gray-400 text-sm">
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              Loading attendance...
            </div>
          ) : attError ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                <XCircle size={24} className="text-red-400" />
              </div>
              <p className="text-sm font-bold text-red-500">{attError}</p>
              <button onClick={fetchAttendance} className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition-all">
                Retry
              </button>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-slate-800">
                      <th className="px-4 py-3 text-left font-bold text-gray-400 uppercase tracking-wider sticky left-0 bg-white dark:bg-slate-900 z-10 min-w-[160px]">User</th>
                      <th className="px-4 py-3 text-center font-bold text-gray-400 uppercase tracking-wider">Total</th>
                      {dayNums.map(d => (
                        <th key={d} className="px-2 py-3 text-center font-bold text-gray-400 uppercase tracking-wider min-w-[28px]">{d}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                    {attByUser.length === 0 ? (
                      <tr><td colSpan={daysInMonth + 2} className="px-6 py-12 text-center text-gray-400 text-sm">No attendance records for this month.</td></tr>
                    ) : attByUser.map(u => (
                      <tr key={u.userId} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-4 py-3 sticky left-0 bg-white dark:bg-slate-900 z-10">
                          <div className="font-bold text-gray-900 dark:text-white text-xs">{u.userName}</div>
                          <div className="text-gray-400 dark:text-slate-500 text-[10px]">{u.userEmail}</div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-bold text-primary">{u.dates.size}</span>
                          <span className="text-gray-400">/{daysInMonth}</span>
                        </td>
                        {dayNums.map(d => {
                          const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                          const present = u.dates.has(dateStr);
                          return (
                            <td key={d} className="px-1 py-3 text-center">
                              {present
                                ? <CheckCircle2 size={14} className="mx-auto text-emerald-500" />
                                : <span className="text-gray-200 dark:text-slate-700">·</span>
                              }
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ACTIVITY LOG TAB ───────────────────────────────────────────────── */}
      {activeTab === 'activity' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 dark:text-white">User Activity Log</h3>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400 dark:text-slate-500">{activity.length} records</span>
                <button
                  onClick={fetchActivity}
                  disabled={actLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
                >
                  <TrendingUp size={13} className={actLoading ? 'animate-spin' : ''} />
                  Refresh
                </button>
              </div>
            </div>
            {actLoading ? (
              <div className="flex items-center justify-center py-16 gap-3 text-gray-400 text-sm">
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Loading activity log...
              </div>
            ) : actError ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                  <XCircle size={24} className="text-red-400" />
                </div>
                <p className="text-sm font-bold text-red-500">{actError}</p>
                <button onClick={fetchActivity} className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition-all">
                  Retry
                </button>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-slate-800">
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">User</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Action</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Details</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                      {pagedActivity.length === 0 ? (
                        <tr><td colSpan={4} className="py-12 text-center text-gray-400 text-sm">No activity recorded yet.</td></tr>
                      ) : pagedActivity.map((row: any) => (
                        <tr key={row.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="px-6 py-3">
                            <div className="text-sm font-bold text-gray-900 dark:text-white">{row.user_name}</div>
                            <div className="text-xs text-gray-400 dark:text-slate-500">{row.user_email}</div>
                          </td>
                          <td className="px-6 py-3">
                            <span className={cn('text-xs font-bold px-2.5 py-1 rounded-full', actionColor(row.action))}>
                              {actionLabel(row.action)}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-sm text-gray-600 dark:text-slate-400 max-w-[260px] truncate">
                            {row.details || '—'}
                          </td>
                          <td className="px-6 py-3 text-xs text-gray-400 dark:text-slate-500 whitespace-nowrap">
                            {fmtTime(row.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Pagination */}
                {activityPages > 1 && (
                  <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs text-gray-400 dark:text-slate-500">
                      Page {actPage} of {activityPages}
                    </span>
                    <div className="flex gap-2">
                      <button onClick={() => setActPage(p => Math.max(1, p - 1))} disabled={actPage === 1}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors">
                        <ChevronLeft size={16} className="text-gray-500 dark:text-slate-400" />
                      </button>
                      <button onClick={() => setActPage(p => Math.min(activityPages, p + 1))} disabled={actPage === activityPages}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors">
                        <ChevronRight size={16} className="text-gray-500 dark:text-slate-400" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Add / Edit Modal ──────────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
          >
            <form onSubmit={handleSubmit}>
              <div className="p-6 border-b border-gray-100 dark:border-slate-800">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingUser ? 'Edit User' : 'Add New User'}
                </h3>
              </div>
              <div className="p-6 space-y-4">
                {formError && (
                  <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-medium">
                    {formError}
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Full Name</label>
                  <input
                    type="text" required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none dark:text-white"
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Email Address</label>
                  <input
                    type="email" required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none dark:text-white"
                    placeholder="name@company.com"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Password {editingUser && <span className="normal-case text-gray-400">(leave blank to keep current)</span>}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="password"
                      required={!editingUser}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none dark:text-white"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Role</label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none dark:text-white"
                    >
                      {ALL_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none dark:text-white"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
                {/* Role description hint */}
                <div className="px-4 py-3 rounded-xl bg-gray-50 dark:bg-slate-800 text-xs text-gray-500 dark:text-slate-400">
                  {formData.role === 'Admin' && 'Full access to all features including admin panel.'}
                  {formData.role === 'User' && 'Can create, edit, view all contact fields. Cannot delete.'}
                  {formData.role === 'Technical' && 'Can create/edit/view CTN→Remarks fields. View-only: Salary Amount & Technical Share.'}
                  {formData.role === 'TeleCalling' && 'Can create/edit/view CTN→Current Status fields. View-only: Salary Amount & TeleCalling Share.'}
                </div>
              </div>
              <div className="p-6 bg-gray-50 dark:bg-slate-800/50 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isSaving} className="px-6 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-60">
                  {isSaving ? 'Saving...' : editingUser ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ── Delete Confirm Modal ──────────────────────────────────────────── */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
          >
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Confirm Delete</h3>
              <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">Are you sure you want to delete this user? This action cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
                  Cancel
                </button>
                <button onClick={handleDeleteUser} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-500/20">
                  Delete
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}