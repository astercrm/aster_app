import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import Contacts from './pages/Contacts';
import Favorites from './pages/Favorites';
import AdminPanel from './pages/AdminPanel';
import Settings from './pages/Settings';
import Login from './pages/Login';
//import Signup from './pages/Signup';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import { Contact } from './types';
import { api } from './services/api';
import ResetPassword from './pages/ResetPassword';


export default function App() {
  const [user, setUser] = useState<any>(() => {
    return null;
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      setIsLoading(true);
      api.getContacts()
        .then(setContacts)
        .catch(err => console.error('Failed to fetch contacts:', err))
        .finally(() => setIsLoading(false));
    } else {
      setContacts([]);
      setIsLoading(false);
    }
  }, [user]);

  // ── Real-time sync: poll every 60 seconds (reduced from 30s to cut server load with many users) ──
  useEffect(() => {
    if (!user) return;
    const poll = setInterval(() => {
      api.getContacts()
        .then(fresh => setContacts(fresh))
        .catch(() => {}); // silently ignore transient errors
    }, 60_000);
    return () => clearInterval(poll);
  }, [user]);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
    }
    return 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);
// ✅ Heartbeat — sends immediately on login, then every 3 minutes
useEffect(() => {
  if (!user) return;

  const sendHeartbeat = () => {
    api.logActivity({
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      action: 'heartbeat',
      details: '',
    }).catch(() => {});
  };

  sendHeartbeat(); // immediate on login
  const interval = setInterval(sendHeartbeat, 3 * 60 * 1000); // every 3 min

  return () => clearInterval(interval);
}, [user]);
  return (
    <Router>
      <Routes>
        {!user ? (
          <>
            <Route path="/login" element={<Login onLogin={setUser} onToggleView={() => {}} />} />
            {/* <Route path="/signup" element={<Signup onSignup={setUser} onToggleView={() => {}} />} /> */}
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="*" element={<Navigate to="/login" />} />
          </>
        ) : (
          <Route path="/*" element={
            <div className="sky-bg flex h-screen text-[#1A1A1A] dark:text-slate-200 font-sans overflow-hidden transition-colors duration-300">
          <Sidebar user={user} isOpen={isSidebarOpen} toggle={() => setIsSidebarOpen(!isSidebarOpen)} />
              <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <Topbar user={user} onLogout={() => setUser(null)} />
                <main className="flex-1 overflow-y-auto p-4 md:p-8 relative z-10">
                  <Routes>
                    <Route path="/" element={<Dashboard contacts={contacts} user={user} />} />
                    <Route path="/contacts" element={<Contacts contacts={contacts} setContacts={setContacts} user={user} />} />
                    <Route path="/favorites" element={<Favorites contacts={contacts} setContacts={setContacts} />} />
                    <Route path="/admin" element={user.role === 'Admin' ? <AdminPanel /> : <Navigate to="/" />} />
                    <Route path="/settings" element={<Settings theme={theme} setTheme={setTheme} user={user} setUser={setUser} />} />
                    <Route path="*" element={<Navigate to="/" />} />
                  </Routes>
                </main>
              </div>
            </div>
          } />
        )}
      </Routes>
    </Router>
  );
  
}
