import { User, LogOut, Settings as SettingsIcon } from 'lucide-react';
import { User as UserType } from '../types';
import { useState } from 'react';
import { cn } from '../lib/utils';

interface TopbarProps {
  user: UserType;
  onLogout: () => void;
}

function InitialsAvatar({ name, className }: { name: string; className?: string }) {
  const initials = (name || 'U')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className={cn('flex items-center justify-center rounded-full bg-primary text-white font-bold text-xs select-none', className)}>
      {initials}
    </div>
  );
}

export default function Topbar({ user, onLogout }: TopbarProps) {
  const [showProfile, setShowProfile] = useState(false);

  return (
    <header className="topbar-sky h-16 px-8 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-4 md:hidden mr-4">
        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm overflow-hidden border border-gray-100 dark:border-slate-800">
          <img 
            src="/_png.png" 
            alt="Aster Logo" 
            className="w-full h-full object-contain p-0.5"
            onError={(e) => {
              e.currentTarget.src = 'https://ui-avatars.com/api/?name=Aster&background=051733&color=fff';
            }}
          />
        </div>
        <span className="text-lg font-black tracking-tighter text-gray-900 dark:text-white">ASTER</span>
      </div>

      <div className="hidden md:block flex-1"></div>

      <div className="flex items-center gap-4">
        <div className="h-8 w-px bg-gray-200 dark:bg-slate-800 mx-2"></div>

        <div className="relative">
          <button 
            onClick={() => setShowProfile(!showProfile)}
            className="flex items-center gap-3 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-all"
          >
            <InitialsAvatar name={user.name} className="w-8 h-8" />
            <div className="text-left hidden md:block pr-2">
              <p className="text-xs font-bold text-gray-900 dark:text-white leading-none">{user.name}</p>
              <p className="text-[10px] text-gray-500 dark:text-slate-400 font-medium">{user.role}</p>
            </div>
          </button>

          {showProfile && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-800 py-2 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-800 flex items-center gap-3">
                <InitialsAvatar name={user.name} className="w-10 h-10 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{user.name}</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{user.email}</p>
                </div>
              </div>
              <div className="py-1">
                <button className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                  <User size={16} /> Profile
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                  <SettingsIcon size={16} /> Settings
                </button>
              </div>
              <div className="border-t border-gray-100 dark:border-slate-800 mt-1 pt-1">
                <button 
                  onClick={onLogout}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <LogOut size={16} /> Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}