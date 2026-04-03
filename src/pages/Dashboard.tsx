import { motion } from 'motion/react';
import { Users, UserPlus, Star, TrendingUp, Phone, MessageSquare, MapPin, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area 
} from 'recharts';
import { Contact } from '../types';
import { useMemo, useEffect, useState } from 'react';
import { api } from '../services/api';

interface DashboardProps {
  contacts: Contact[];
}

export default function Dashboard({ contacts }: DashboardProps) {
  const navigate = useNavigate();
  const [recentContacts, setRecentContacts] = useState<Contact[]>([]);
  const [dashboardStats, setDashboardStats] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

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
      const [day, monthStr, year] = c.date.split('-');
      const monthIndex = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(monthStr);
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
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const counts: Record<string, number> = {};
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      counts[months[d.getMonth()]] = 0;
    }
    contacts.forEach(c => {
      if (!c.date) return;
      const [day, monthStr, year] = c.date.split('-');
      if (counts[monthStr] !== undefined) {
        counts[monthStr]++;
      }
    });
    return Object.entries(counts).map(([name, contacts]) => ({ name, contacts }));
  }, [contacts]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [recent, stats] = await Promise.all([
          api.getRecentContacts(),
          api.getStats()
        ]);
        
        if (recent.length > 0) {
          setRecentContacts(recent);
        } else {
          const sorted = [...contacts].sort((a, b) => {
            const dateA = new Date(a.date?.replace(/-/g, ' ') || '');
            const dateB = new Date(b.date?.replace(/-/g, ' ') || '');
            return dateB.getTime() - dateA.getTime();
          }).slice(0, 5);
          setRecentContacts(sorted);
        }

        if (stats && stats.summary) {
          setDashboardStats(stats.summary);
          setChartData(stats.chartData);
        } else {
          setDashboardStats(localStats);
          setChartData(localChartData);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        setDashboardStats(localStats);
        setChartData(localChartData);
      }
    };
    fetchData();
  }, [contacts, localStats, localChartData]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-gray-500 dark:text-slate-400 mt-1">Welcome back! Here's what's happening with your contacts.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {dashboardStats.map((stat, i) => (
          <motion.div 
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
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
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-lg dark:text-white">Contact Growth</h3>
            <select className="text-sm bg-gray-50 dark:bg-slate-800 border-none rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-primary/20 outline-none dark:text-white">
              <option>Last 6 Months</option>
              <option>Last Year</option>
            </select>
          </div>
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
        </div>
      </div>

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
              {recentContacts.map((contact) => (
                <tr key={contact.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary flex items-center justify-center font-bold text-xs">
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
                      <a href={`tel:${contact.customerContactNumber}`} className="p-1.5 rounded-lg hover:bg-primary/10 dark:hover:bg-primary/20 text-primary dark:text-primary transition-colors">
                        <Phone size={16} />
                      </a>
                      <a href={`https://wa.me/${(contact.customerContactNumber || '').replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="p-1.5 rounded-lg hover:bg-primary/10 dark:hover:bg-primary/20 text-primary dark:text-primary transition-colors">
                        <MessageSquare size={16} />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
