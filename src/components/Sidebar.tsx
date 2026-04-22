import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Star, 
  ShieldCheck, 
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { User } from '../types';


interface SidebarProps {
  isOpen: boolean;
  toggle: () => void;
  user: User | null;
}

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Users, label: 'Contacts', path: '/contacts' },
  { icon: Star, label: 'Favorites', path: '/favorites' },
  { icon: ShieldCheck, label: 'Admin Panel', path: '/admin', adminOnly: true },
  { icon: Settings, label: 'Settings', path: '/settings' },
];


export default function Sidebar({ isOpen, toggle, user }: SidebarProps) {
  return (
    <aside 
      className={cn(
        "sidebar-sky text-gray-900 dark:text-white transition-all duration-300 flex flex-col",
        isOpen ? "w-64" : "w-20"
      )}
    >
      <div className="p-6 flex items-center justify-between">
        <div className={cn("flex items-center gap-3 overflow-hidden transition-all", !isOpen && "opacity-0 w-0")}>
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center overflow-hidden border border-gray-100 dark:border-white/10 shadow-sm">
            <img 
              src="/_png.png" 
              alt="ASTER Logo" 
              className="w-full h-full object-contain p-1"
              onError={(e) => {
                e.currentTarget.src = 'https://ui-avatars.com/api/?name=ASTER&background=051733&color=fff';
              }}
            />
          </div>
          <div className="flex flex-col">
            <span className="font-black text-base tracking-tighter dark:text-white leading-none">ASTER</span>
            <span className="font-bold text-[9px] text-primary dark:text-primary tracking-tight uppercase">ONLINE SERVICE EPF</span>
          </div>
        </div>
        <button 
          onClick={toggle}
          className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 transition-colors"
        >
          {isOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems
          .filter(item => !item.adminOnly || (item.adminOnly && user?.role === 'Admin'))
          .map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
                isActive 
                  ? "bg-primary/10 text-primary dark:text-primary" 
                  : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              <item.icon size={22} className={cn("shrink-0 transition-transform group-hover:scale-110")} />
              <span className={cn(
                "font-medium transition-all duration-300 whitespace-nowrap overflow-hidden",
                isOpen ? "opacity-100 w-auto" : "opacity-0 w-0"
              )}>
                {item.label}
              </span>
            </NavLink>
          ))
        }
      </nav>

    </aside>
  );
}
