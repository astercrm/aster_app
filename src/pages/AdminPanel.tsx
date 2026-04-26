import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ShieldCheck, UserPlus, Search, Edit2, Trash2, User,
  Shield, Lock, Users, TrendingUp, Activity, Clock, Wifi, WifiOff,
  RefreshCw, LogIn, FilePlus, FileEdit, AlertCircle, CalendarDays,
  ChevronLeft, ChevronRight, CheckCircle2,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { api } from '../services/api';
import { ALL_ROLES, ROLE_BADGE_COLORS, type AppRole } from '../permissions';

export default function AdminPanel() {
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

  // ── Activity state ────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'users' | 'activity' | 'attendance'>('users');
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [activitySummary, setActivitySummary] = useState<any[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [attendanceSummary, setAttendanceSummary] = useState<any[]>([]);
  const [isActivityLoading, setIsActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState<string | null>(null);

  // ── Attendance tab state ──────────────────────────────────────────────────
  const now = new Date();
  const [attMonth, setAttMonth] = useState(now.getMonth() + 1);
  const [attYear, setAttYear] = useState(now.getFullYear());
  const [attRecords, setAttRecords] = useState<any[]>([]);
  const [isAttLoading, setIsAttLoading] = useState(false);
  const [attError, setAttError] = useState<string | null>(null);
  const [attRoleFilter, setAttRoleFilter] = useState<string>('All');

  useEffect(() => { fetchUsers(); }, []);
  useEffect(() => {
    if (activeTab !== 'activity') return;
    fetchActivity();
    const timer = setInterval(fetchActivity, 30_000);
    return () => clearInterval(timer);
  }, [activeTab]);
  useEffect(() => {
    if (activeTab !== 'attendance') return;
    fetchAttendance();
  }, [activeTab, attMonth, attYear]);

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

  const fetchActivity = async () => {
    setIsActivityLoading(true);
    setActivityError(null);
    try {
      const now = new Date();
      const [logs, summary, online, attendance] = await Promise.all([
        api.getActivity(),
        api.getActivitySummary(),
        api.getOnlineUsers(),
        api.getAttendanceSummary(now.getMonth() + 1, now.getFullYear()),
      ]);
      setActivityLogs(logs || []);
      setActivitySummary(summary || []);
      setOnlineUsers(online || []);
      // Filter to only today's attendance
      const todayStr = now.toISOString().slice(0, 10);
      setAttendanceSummary((attendance || []).filter((a: any) =>
        (a.dates || []).includes(todayStr)
      ));
    } catch (err: any) {
      const msg: string = err.message || 'Failed to load activity data.';
      // Give clear fix instructions based on common Supabase errors
      if (msg.includes('does not exist') || msg.includes('42P01')) {
        setActivityError('❌ Tables missing in Supabase. Please run the setup SQL in your Supabase SQL Editor to create user_activity and attendance tables.');
      } else if (msg.includes('row-level security') || msg.includes('42501')) {
        setActivityError('❌ Supabase RLS is blocking data. Please disable RLS on user_activity and attendance tables, OR add SUPABASE_SERVICE_ROLE_KEY to Railway environment variables.');
      } else {
        setActivityError(`❌ ${msg}`);
      }
    } finally {
      setIsActivityLoading(false);
    }
  };

  const fetchAttendance = async () => {
    setIsAttLoading(true);
    setAttError(null);
    try {
      const data = await api.getAttendanceSummary(attMonth, attYear);
      setAttRecords(data || []);
    } catch (err: any) {
      const msg: string = err.message || 'Failed to load attendance data.';
      if (msg.includes('does not exist') || msg.includes('42P01')) {
        setAttError('❌ The "attendance" table does not exist. Please run the setup SQL in Supabase.');
      } else if (msg.includes('row-level security') || msg.includes('42501')) {
        setAttError('❌ Supabase RLS is blocking. Disable RLS on attendance table or add SUPABASE_SERVICE_ROLE_KEY.');
      } else {
        setAttError(`❌ ${msg}`);
      }
    } finally {
      setIsAttLoading(false);
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
          <p className="text-gray-500 dark:text-slate-400 mt-1">Manage users and role permissions.</p>
        </div>
        <button
          onClick={handleAddUser}
          className="flex items-center gap-2 px-4 py-2 bg-primary rounded-xl text-sm font-bold text-white hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
        >
          <UserPlus size={18} /> Add User
        </button>
      </header>

      {/* ── TABS ──────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-gray-100 dark:bg-slate-800 p-1 rounded-2xl w-fit flex-wrap">
        {(['users', 'activity', 'attendance'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all',
              activeTab === tab
                ? 'bg-white dark:bg-slate-900 text-primary shadow-sm'
                : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
            )}
          >
            {tab === 'users' ? <Users size={16} /> : tab === 'activity' ? <Activity size={16} /> : <CalendarDays size={16} />}
            {tab === 'users' ? 'Users' : tab === 'activity' ? 'Employee Activity' : 'Attendance'}
          </button>
        ))}
      </div>

      {/* ── USERS SECTION ──────────────────────────────────────────────────── */}
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
                <p className="mt-1">Create/Edit/View/Favourite: CTN→Remarks + Payment fields. View-only: Technical Share % &amp; Salary calculated fields.</p>
              </div>
              <div>
                <span className={cn('font-bold px-2 py-0.5 rounded-full', ROLE_BADGE_COLORS['TeleCalling'])}>TeleCalling</span>
                <p className="mt-1">Create/Edit/View/Fav: CTN→Status + Service Charges, Payment, Received Amount, Transaction ID, Screenshot. View-only: TeleCalling Share.</p>
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
      )} {/* end users tab */}

      {/* ── ACTIVITY SECTION ───────────────────────────────────────────────── */}
      {activeTab === 'activity' && (
        <div className="space-y-6">
          {/* Stats bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Online Now', value: onlineUsers.length, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', dot: true },
              { label: 'Active Today', value: attendanceSummary.length, color: 'text-primary', bg: 'bg-primary/5' },
              { label: 'Actions Today', value: activitySummary.reduce((s: number, u: any) => s + (u.contactsCreated || 0) + (u.contactsEdited || 0) + (u.contactsDeleted || 0), 0), color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
              { label: 'Total Users', value: users.length, color: 'text-gray-700 dark:text-gray-300', bg: 'bg-gray-100 dark:bg-slate-800' },
            ].map(stat => (
              <div key={stat.label} className={cn('rounded-2xl p-4 flex items-center gap-3', stat.bg)}>
                {stat.dot && <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />}
                <div>
                  <p className={cn('text-2xl font-black', stat.color)}>{stat.value}</p>
                  <p className="text-xs font-medium text-gray-500 dark:text-slate-400">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Refresh + auto-refresh notice */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400 dark:text-slate-500 flex items-center gap-1">
              <Clock size={11} /> Auto-refreshes every 30 seconds
            </p>
            <button
              onClick={fetchActivity}
              disabled={isActivityLoading}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-sm font-bold text-gray-700 dark:text-slate-300 hover:bg-gray-50 transition-all shadow-sm disabled:opacity-60"
            >
              <RefreshCw size={15} className={isActivityLoading ? 'animate-spin' : ''} />
              Refresh Now
            </button>
          </div>

          {activityError && (
            <div className="flex items-center gap-3 px-4 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium">
              <AlertCircle size={16} />{activityError}
            </div>
          )}

          {/* Today's summary cards — always show all users */}
          <div>
            <h3 className="text-sm font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-3">
              Employee Status Today
            </h3>
            {isActivityLoading && users.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-sm">Loading...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {users.filter((u: any) => u.role !== 'Admin' ? true : true).map((u: any) => {
                  const stats = activitySummary.find((s: any) => s.userId === u.id);
                  const isOnline = onlineUsers.some((o: any) => o.user_id === u.id);
                  const activeToday = attendanceSummary.some((a: any) => a.userId === u.id);
                  return (
                    <div key={u.id} className={cn(
                      'bg-white dark:bg-slate-900 rounded-2xl border p-4 shadow-sm transition-all',
                      isOnline ? 'border-emerald-200 dark:border-emerald-800' : 'border-gray-100 dark:border-slate-800'
                    )}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className={cn('w-9 h-9 rounded-full flex items-center justify-center', isOnline ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-primary/10')}>
                          <User size={16} className={isOnline ? 'text-emerald-600' : 'text-primary'} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{u.name}</p>
                          <p className="text-xs text-gray-400 dark:text-slate-500 truncate">{u.email}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          {isOnline ? (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">
                              <Wifi size={10} />Online
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-gray-400 bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                              <WifiOff size={10} />Offline
                            </span>
                          )}
                          {activeToday && (
                            <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                              Active Today
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-gray-50 dark:bg-slate-800 rounded-xl py-2">
                          <p className="text-lg font-black text-primary">{stats?.contactsCreated ?? 0}</p>
                          <p className="text-[10px] text-gray-400 font-medium">Created</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-slate-800 rounded-xl py-2">
                          <p className="text-lg font-black text-amber-500">{stats?.contactsEdited ?? 0}</p>
                          <p className="text-[10px] text-gray-400 font-medium">Edited</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-slate-800 rounded-xl py-2">
                          <p className="text-lg font-black text-red-500">{stats?.contactsDeleted ?? 0}</p>
                          <p className="text-[10px] text-gray-400 font-medium">Deleted</p>
                        </div>
                      </div>
                      {stats?.loginTime && (
                        <p className="mt-2 text-[10px] text-gray-400 dark:text-slate-500 flex items-center gap-1">
                          <LogIn size={10} /> Login: {new Date(stats.loginTime).toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Activity log table */}
          <div>
            <h3 className="text-sm font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-3">Recent Activity Log</h3>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
              {isActivityLoading ? (
                <div className="py-16 text-center text-gray-400 text-sm">Loading activity...</div>
              ) : activityLogs.length === 0 ? (
                <div className="py-16 text-center text-gray-400 text-sm">No activity recorded yet.</div>
              ) : (
                <div className="divide-y divide-gray-50 dark:divide-slate-800 max-h-[500px] overflow-y-auto">
                  {activityLogs.map((log: any) => (
                    <div key={log.id} className="flex items-start gap-3 px-5 py-3 hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <div className={cn('mt-0.5 w-7 h-7 rounded-full flex items-center justify-center shrink-0',
                        log.action === 'login' ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600' :
                        log.action === 'contact_created' ? 'bg-primary/10 text-primary' :
                        log.action === 'contact_updated' ? 'bg-amber-100 dark:bg-amber-900/20 text-amber-600' :
                        log.action === 'contact_deleted' ? 'bg-red-100 dark:bg-red-900/20 text-red-600' :
                        'bg-gray-100 dark:bg-slate-800 text-gray-500'
                      )}>
                        {log.action === 'login' ? <LogIn size={13} /> :
                         log.action === 'contact_created' ? <FilePlus size={13} /> :
                         log.action === 'contact_updated' ? <FileEdit size={13} /> :
                         <Activity size={13} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 dark:text-white font-medium">
                          <span className="font-bold">{log.user_name}</span>{' '}
                          <span className="text-gray-500 dark:text-slate-400">
                            {log.action === 'login' ? 'logged in' :
                             log.action === 'contact_created' ? 'created a contact' :
                             log.action === 'contact_updated' ? 'edited a contact' :
                             log.action === 'contact_deleted' ? 'deleted a contact' :
                             log.action}
                          </span>
                        </p>
                        {log.details && <p className="text-xs text-gray-400 dark:text-slate-500 truncate mt-0.5">{log.details}</p>}
                      </div>
                      <span className="text-[10px] text-gray-400 dark:text-slate-500 whitespace-nowrap mt-1 flex items-center gap-1">
                        <Clock size={10} />{new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )} {/* end activity tab */}

      {/* ── ATTENDANCE SECTION ──────────────────────────────────────────────── */}
      {activeTab === 'attendance' && (() => {
        const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const daysInMonth = new Date(attYear, attMonth, 0).getDate();
        const dayNumbers = Array.from({ length: daysInMonth }, (_, i) => i + 1);

        // Build role map from users
        const userRoleMap: Record<string, string> = {};
        users.forEach((u: any) => { userRoleMap[u.id] = u.role; });

        // Merge users with their attendance — show ALL users, not just those with records
        const mergedData = users
          .filter((u: any) => attRoleFilter === 'All' || u.role === attRoleFilter)
          .map((u: any) => {
            const record = attRecords.find((r: any) => r.userId === u.id);
            return {
              userId: u.id,
              userName: u.name || u.email,
              userEmail: u.email,
              role: u.role,
              presentDays: record?.presentDays || 0,
              dates: (record?.dates || []).map((d: string) => d.slice(8, 10)), // extract day number as string
            };
          })
          .sort((a: any, b: any) => b.presentDays - a.presentDays);

        const totalWorkingDays = daysInMonth;

        const handlePrevMonth = () => {
          if (attMonth === 1) { setAttMonth(12); setAttYear(attYear - 1); }
          else setAttMonth(attMonth - 1);
        };
        const handleNextMonth = () => {
          if (attMonth === 12) { setAttMonth(1); setAttYear(attYear + 1); }
          else setAttMonth(attMonth + 1);
        };

        return (
          <div className="space-y-6">
            {/* Header controls */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button onClick={handlePrevMonth} className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors shadow-sm">
                  <ChevronLeft size={18} className="text-gray-600 dark:text-slate-300" />
                </button>
                <div className="flex items-center gap-2">
                  <select
                    value={attMonth}
                    onChange={e => setAttMonth(Number(e.target.value))}
                    className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 outline-none shadow-sm"
                  >
                    {MONTH_NAMES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                  </select>
                  <select
                    value={attYear}
                    onChange={e => setAttYear(Number(e.target.value))}
                    className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 outline-none shadow-sm"
                  >
                    {[attYear - 1, attYear, attYear + 1].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <button onClick={handleNextMonth} className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors shadow-sm">
                  <ChevronRight size={18} className="text-gray-600 dark:text-slate-300" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Role:</span>
                <select
                  value={attRoleFilter}
                  onChange={e => setAttRoleFilter(e.target.value)}
                  className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 outline-none shadow-sm"
                >
                  <option value="All">All Roles</option>
                  {ALL_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <button
                  onClick={fetchAttendance}
                  disabled={isAttLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-sm font-bold text-gray-700 dark:text-slate-300 hover:bg-gray-50 transition-all shadow-sm disabled:opacity-60"
                >
                  <RefreshCw size={15} className={isAttLoading ? 'animate-spin' : ''} />
                  Refresh
                </button>
              </div>
            </div>

            {/* Stats bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Staff', value: mergedData.length, color: 'text-primary', bg: 'bg-primary/5' },
                { label: 'Present Today', value: mergedData.filter((u: any) => u.dates.includes(String(new Date().getDate()).padStart(2, '0'))).length, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                { label: 'Avg Attendance', value: mergedData.length > 0 ? `${Math.round(mergedData.reduce((s: number, u: any) => s + u.presentDays, 0) / mergedData.length)}d` : '0d', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
                { label: 'Days in Month', value: daysInMonth, color: 'text-gray-700 dark:text-gray-300', bg: 'bg-gray-100 dark:bg-slate-800' },
              ].map(stat => (
                <div key={stat.label} className={cn('rounded-2xl p-4', stat.bg)}>
                  <p className={cn('text-2xl font-black', stat.color)}>{stat.value}</p>
                  <p className="text-xs font-medium text-gray-500 dark:text-slate-400">{stat.label}</p>
                </div>
              ))}
            </div>

            {attError && (
              <div className="flex items-center gap-3 px-4 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium">
                <AlertCircle size={16} />{attError}
              </div>
            )}

            {/* Attendance Grid */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left" style={{ minWidth: `${300 + daysInMonth * 36}px` }}>
                  <thead>
                    <tr className="bg-gray-50/50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800">
                      <th className="px-4 py-3 text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider sticky left-0 z-10 bg-gray-50 dark:bg-slate-800 min-w-[180px]">Employee</th>
                      <th className="px-3 py-3 text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider sticky left-[180px] z-10 bg-gray-50 dark:bg-slate-800 min-w-[70px]">Role</th>
                      <th className="px-3 py-3 text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider sticky left-[250px] z-10 bg-gray-50 dark:bg-slate-800 min-w-[50px] border-r border-gray-200 dark:border-slate-700">Days</th>
                      {dayNumbers.map(d => (
                        <th key={d} className="px-0 py-3 text-center text-[10px] font-bold text-gray-400 dark:text-slate-500 w-8 min-w-[32px]">
                          {d}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                    {isAttLoading ? (
                      <tr><td colSpan={3 + daysInMonth} className="px-4 py-12 text-center text-gray-400 text-sm">Loading attendance...</td></tr>
                    ) : mergedData.length === 0 ? (
                      <tr><td colSpan={3 + daysInMonth} className="px-4 py-12 text-center text-gray-400 text-sm">No attendance records found.</td></tr>
                    ) : mergedData.map((emp: any) => {
                      const attendancePercent = totalWorkingDays > 0 ? Math.round((emp.presentDays / totalWorkingDays) * 100) : 0;
                      return (
                        <tr key={emp.userId} className="group hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="px-4 py-2.5 sticky left-0 z-[5] bg-white dark:bg-slate-900 group-hover:bg-gray-50/50 dark:group-hover:bg-slate-800/30 min-w-[180px]">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <User size={13} className="text-primary" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{emp.userName}</p>
                                <p className="text-[10px] text-gray-400 dark:text-slate-500 truncate">{emp.userEmail}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 sticky left-[180px] z-[5] bg-white dark:bg-slate-900 group-hover:bg-gray-50/50 dark:group-hover:bg-slate-800/30 min-w-[70px]">
                            <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', ROLE_BADGE_COLORS[emp.role as AppRole] || 'bg-gray-100 text-gray-600')}>
                              {emp.role}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 sticky left-[250px] z-[5] bg-white dark:bg-slate-900 group-hover:bg-gray-50/50 dark:group-hover:bg-slate-800/30 min-w-[50px] border-r border-gray-100 dark:border-slate-800">
                            <div className="text-center">
                              <span className={cn('text-sm font-black', attendancePercent >= 80 ? 'text-emerald-600' : attendancePercent >= 50 ? 'text-amber-500' : 'text-red-500')}>
                                {emp.presentDays}
                              </span>
                              <p className="text-[9px] text-gray-400">{attendancePercent}%</p>
                            </div>
                          </td>
                          {dayNumbers.map(d => {
                            const dayStr = String(d).padStart(2, '0');
                            const isPresent = emp.dates.includes(dayStr);
                            const isToday = d === new Date().getDate() && attMonth === (new Date().getMonth() + 1) && attYear === new Date().getFullYear();
                            return (
                              <td key={d} className="px-0 py-2.5 text-center w-8 min-w-[32px]">
                                {isPresent ? (
                                  <span className={cn('inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold', isToday ? 'bg-primary text-white shadow-sm shadow-primary/30' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400')}>
                                    ✓
                                  </span>
                                ) : (
                                  <span className={cn('inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px]', isToday ? 'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-400 ring-2 ring-primary/30' : 'text-gray-300 dark:text-slate-700')}>
                                    •
                                  </span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Legend */}
              <div className="px-4 py-3 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50 flex items-center gap-6 text-xs text-gray-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 items-center justify-center text-[9px] font-bold">✓</span>
                  Present
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex w-5 h-5 rounded-full text-gray-300 dark:text-slate-700 items-center justify-center text-[9px]">•</span>
                  Absent
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex w-5 h-5 rounded-full bg-primary text-white items-center justify-center text-[9px] font-bold">✓</span>
                  Today
                </div>
                <div className="ml-auto text-[10px] text-gray-400 dark:text-slate-500">
                  {MONTH_NAMES[attMonth - 1]} {attYear} · {mergedData.length} employees
                </div>
              </div>
            </div>
          </div>
        );
      })()}


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
                  {formData.role === 'Technical' && 'Can create/edit/view/favourite CTN→Remarks + Service Charges, Payment, Received Amount, Transaction ID fields. View-only: Technical Share & Salary Amount calculated fields.'}
                  {formData.role === 'TeleCalling' && 'Can create/edit/view/favourite CTN→Current Status + Service Charges, Payment Status, Received Amount, Transaction ID, Receive Date, Screenshot. View-only: TeleCalling Share.'}
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