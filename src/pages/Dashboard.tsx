import { motion } from 'motion/react';
import { Users, UserPlus, Star, TrendingUp, Phone, MessageSquare, MapPin, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
  AreaChart, 
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
} from 'recharts';
import { Contact } from '../types';
import { useMemo, useEffect, useState } from 'react';
import { api } from '../services/api';

interface DashboardProps {
  contacts: Contact[];
  user?: any;
}

// Skeleton shimmer component
function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gray-200 dark:bg-slate-700 rounded-xl ${className}`} />
  );
}

function AdminActivityPanel() {
  const [summary, setSummary] = useState<any[]>([]);
  const [online, setOnline] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [tab, setTab] = useState<'online' | 'today' | 'log'>('online');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [s, o, a, u] = await Promise.all([
          api.getActivitySummary(),
          api.getOnlineUsers(),
          api.getActivity(),
          api.getUsers(),
        ]);
        setSummary(s || []);
        setOnline(o || []);
        setActivity(a || []);
        setUsers(u || []);
      } catch (e: any) {
        setError(e?.message || 'Failed to load activity');
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 30 * 1000); // refresh every 30 sec
    return () => clearInterval(interval);
  }, []);

  const formatTime = (iso: string) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  const calcHours = (loginTime: string, lastSeen: string) => {
    if (!loginTime || !lastSeen) return '-';
    const mins = Math.round((new Date(lastSeen).getTime() - new Date(loginTime).getTime()) / 60000);
    if (mins < 1) return '< 1 min';
    if (mins < 60) return `${mins} min`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
      <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-bold text-lg dark:text-white">Employee Activity</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
              {online.length} online now
            </span>
            {' · '}
            {summary.length} active today
            {' · '}
            {users.length} total employees
          </p>
        </div>
        <div className="flex gap-2">
          {(['online', 'today', 'log'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                tab === t
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700'
              }`}
            >
              {t === 'online' ? `Online (${online.length})` : t === 'today' ? `Today (${summary.length})` : 'Activity Log'}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="px-6 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-sm text-gray-400 dark:text-slate-500">Loading activity data...</div>
      ) : (
        <div className="overflow-x-auto">

          {/* ONLINE TAB */}
          {tab === 'online' && (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-slate-800/50 text-gray-500 dark:text-slate-400 text-[11px] uppercase tracking-wider font-bold">
                  <th className="px-6 py-3">Employee</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Last Seen</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {users.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-400">No employees registered</td></tr>
                ) : users.map((u: any) => {
                  const onlineEntry = online.find((o: any) => o.user_id === u.id);
                  const isOnline = !!onlineEntry;
                  return (
                    <tr key={u.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${isOnline ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700' : 'bg-primary/10 text-primary'}`}>
                            {(u.name || '').charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{u.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-xs font-bold text-gray-500 dark:text-slate-400">{u.role}</td>
                      <td className="px-6 py-3 text-sm text-gray-500 dark:text-slate-400">{isOnline ? formatTime(onlineEntry.created_at) : '—'}</td>
                      <td className="px-6 py-3">
                        {isOnline ? (
                          <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block"></span>
                            Online
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-gray-400">Offline</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* TODAY TAB */}
          {tab === 'today' && (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-slate-800/50 text-gray-500 dark:text-slate-400 text-[11px] uppercase tracking-wider font-bold">
                  <th className="px-6 py-3">Employee</th>
                  <th className="px-6 py-3">Login Time</th>
                  <th className="px-6 py-3">Last Seen</th>
                  <th className="px-6 py-3">Time Used</th>
                  <th className="px-6 py-3">Created</th>
                  <th className="px-6 py-3">Edited</th>
                  <th className="px-6 py-3">Deleted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {users.map((u: any) => {
                  const s = summary.find((x: any) => x.userId === u.id);
                  const isOnline = online.some((o: any) => o.user_id === u.id);
                  return (
                    <tr key={u.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${isOnline ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700' : 'bg-primary/10 text-primary'}`}>
                            {(u.name || '').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{u.name}</p>
                            <p className="text-xs text-gray-400">{u.role}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600 dark:text-slate-300">{s ? formatTime(s.loginTime) : <span className="text-gray-300 dark:text-slate-600">Not logged in</span>}</td>
                      <td className="px-6 py-3 text-sm text-gray-600 dark:text-slate-300">{s ? formatTime(s.lastSeen) : '—'}</td>
                      <td className="px-6 py-3 text-sm font-bold text-primary">{s ? calcHours(s.loginTime, s.lastSeen) : '—'}</td>
                      <td className="px-6 py-3"><span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">{s?.contactsCreated ?? 0}</span></td>
                      <td className="px-6 py-3"><span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">{s?.contactsEdited ?? 0}</span></td>
                      <td className="px-6 py-3"><span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-bold">{s?.contactsDeleted ?? 0}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* ACTIVITY LOG TAB */}
          {tab === 'log' && (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-slate-800/50 text-gray-500 dark:text-slate-400 text-[11px] uppercase tracking-wider font-bold">
                  <th className="px-6 py-3">Time</th>
                  <th className="px-6 py-3">Employee</th>
                  <th className="px-6 py-3">Action</th>
                  <th className="px-6 py-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {activity.filter((a: any) => a.action !== 'heartbeat').length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-400">
                    No activity logged yet. Activity appears here as employees log in and work.
                  </td></tr>
                ) : activity.filter((a: any) => a.action !== 'heartbeat').slice(0, 50).map((a: any) => (
                  <tr key={a.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50">
                    <td className="px-6 py-3 text-xs text-gray-400 whitespace-nowrap">{formatTime(a.created_at)}</td>
                    <td className="px-6 py-3 text-sm font-medium text-gray-900 dark:text-white">{a.user_name}</td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        a.action === 'login' ? 'bg-blue-100 text-blue-700' :
                        a.action === 'contact_created' ? 'bg-emerald-100 text-emerald-700' :
                        a.action === 'contact_updated' ? 'bg-amber-100 text-amber-700' :
                        a.action === 'contact_deleted' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {a.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-500 dark:text-slate-400">{a.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

        </div>
      )}
    </div>
  );
}

export default function Dashboard({ contacts, user }: DashboardProps) {
  const navigate = useNavigate();
  const [recentContacts, setRecentContacts] = useState<Contact[]>([]);
  const [dashboardStats, setDashboardStats] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const localStats = useMemo(() => {
    const total = contacts.length;
    const favorites = contacts.filter(c => c.isFavorite).length;
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const todayStr = today.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
    const activeToday = contacts.filter(c => c.date === todayStr).length;
    const newThisMonth = contacts.filter(c => {
      if (!c.date) return false;
      const [, monthStr, year] = c.date.split('-');
      const monthIndex = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(monthStr);
      return monthIndex === currentMonth && parseInt(year) === currentYear;
    }).length;

    return [
      { label: 'Total Contacts', value: total.toLocaleString(), icon: Users, color: 'bg-blue-500', trend: '+12%' },
      { label: 'New This Month', value: newThisMonth.toLocaleString(), icon: UserPlus, color: 'bg-primary', trend: '+5%' },
      { label: 'Favorites', value: favorites.toLocaleString(), icon: Star, color: 'bg-amber-500', trend: '+2%' },
      { label: 'Active Today', value: activeToday.toLocaleString(), icon: TrendingUp, color: 'bg-violet-500', trend: '+18%' },
    ];
  }, [contacts]);

  const localChartData = useMemo(() => {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const counts: Record<string, number> = {};
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      counts[months[d.getMonth()]] = 0;
    }
    contacts.forEach(c => {
      if (!c.date) return;
      const [, monthStr] = c.date.split('-');
      if (counts[monthStr] !== undefined) counts[monthStr]++;
    });
    return Object.entries(counts).map(([name, contacts]) => ({ name, contacts }));
  }, [contacts]);

  // Show local data immediately — derived directly from contacts prop, no API needed
  useEffect(() => {
    if (contacts.length > 0 || !isLoading) {
      setDashboardStats(localStats);
      setChartData(localChartData);
      const sorted = [...contacts]
        .sort((a, b) => new Date(b.date?.replace(/-/g, ' ') || '').getTime() - new Date(a.date?.replace(/-/g, ' ') || '').getTime())
        .slice(0, 5);
      setRecentContacts(sorted);
      setIsLoading(false);
    }
  }, [contacts, localStats, localChartData]);

  // No background API fetch — avoids the flicker of stats changing after load

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-gray-500 dark:text-slate-400 mt-1">Welcome back! Here's what's happening with your contacts.</p>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isLoading && dashboardStats.length === 0 ? (
          // Skeleton cards while loading
          [...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <Skeleton className="w-10 h-10" />
                <Skeleton className="w-14 h-6" />
              </div>
              <Skeleton className="w-24 h-4 mb-2" />
              <Skeleton className="w-16 h-8" />
            </div>
          ))
        ) : (
          dashboardStats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`${stat.color} p-2.5 rounded-xl text-white`}>
                  <stat.icon size={20} />
                </div>
                <span className="text-xs font-bold text-primary bg-primary/10 dark:bg-primary/20 px-2 py-1 rounded-full">
                  {stat.trend}
                </span>
              </div>
              <p className="text-sm font-medium text-gray-500 dark:text-slate-400">{stat.label}</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stat.value}</h3>
            </motion.div>
          ))
        )}
      </div>

      {/* Chart */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800">
        <div className="flex items-center justify-between mb-8">
          <h3 className="font-bold text-lg dark:text-white">Contact Growth</h3>
          <select className="text-sm bg-gray-50 dark:bg-slate-800 border-none rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-primary/20 outline-none dark:text-white">
            <option>Last 6 Months</option>
            <option>Last Year</option>
          </select>
        </div>
        {isLoading && chartData.length === 0 ? (
          <Skeleton className="h-[300px] w-full" />
        ) : (
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorContacts" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', color: '#fff' }}
                  itemStyle={{ color: '#10b981' }}
                />
                <Area type="monotone" dataKey="contacts" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorContacts)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Recent Contacts */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-lg dark:text-white">Recent Contacts</h3>
          <button
            onClick={() => navigate('/contacts')}
            className="text-sm text-primary font-bold hover:underline"
          >
            View All
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-slate-800/50 text-gray-500 dark:text-slate-400 text-[11px] uppercase tracking-wider font-bold">
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Created By</th>
                <th className="px-6 py-4">Ref ID</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {isLoading && recentContacts.length === 0 ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4"><div className="flex items-center gap-3"><Skeleton className="w-8 h-8 rounded-full" /><div className="space-y-1"><Skeleton className="w-28 h-3" /><Skeleton className="w-20 h-3" /></div></div></td>
                    <td className="px-6 py-4"><Skeleton className="w-24 h-3" /></td>
                    <td className="px-6 py-4"><Skeleton className="w-20 h-3" /></td>
                    <td className="px-6 py-4"><Skeleton className="w-16 h-6 ml-auto" /></td>
                  </tr>
                ))
              ) : recentContacts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-sm text-gray-400">No contacts yet.</td>
                </tr>
              ) : (
                recentContacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 dark:bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">
                          {(contact.customerName || '').split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">{contact.customerName}</p>
                          <p className="text-xs text-gray-500 dark:text-slate-400">{contact.customerRequirement}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-300">
                        <Building2 size={14} className="text-gray-400" />
                        {contact.teleCallingStaff}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-300">
                        <MapPin size={14} className="text-gray-400" />
                        {contact.ctn}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a href={`tel:${contact.customerContactNumber}`} className="p-1.5 rounded-lg hover:bg-primary/10 dark:hover:bg-primary/20 text-primary transition-colors">
                          <Phone size={16} />
                        </a>
                        <a href={`https://wa.me/${(contact.customerContactNumber || '').replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="p-1.5 rounded-lg hover:bg-primary/10 dark:hover:bg-primary/20 text-primary transition-colors">
                          <MessageSquare size={16} />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* ── ADMIN ACTIVITY PANEL — visible to Admin only ── */}
{user?.role === 'Admin' && (
  <AdminActivityPanel />
)}
    </div>
  );
}