import React, { useState, useMemo } from 'react';
import { Star, Phone, MessageSquare, Mail, MapPin, Building2, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Contact } from '../types';
import { api } from '../services/api';

interface FavoritesProps {
  contacts: Contact[];
  setContacts: React.Dispatch<React.SetStateAction<Contact[]>>;
}

export default function Favorites({ contacts, setContacts }: FavoritesProps) {
  const [searchQuery, setSearchQuery] = useState('');
  
  const toggleFavorite = async (id: string) => {
    const contact = contacts.find(c => c.id === id);
    if (!contact) return;
    try {
      const updatedFields = await api.toggleFavorite(id, !contact.isFavorite);
      setContacts(prev => prev.map(c => c.id === id ? { ...c, ...updatedFields } : c));
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };
  
  const favorites = useMemo(() => {
    const query = (searchQuery || '').toLowerCase().trim();
    if (!query) return contacts.filter(c => c.isFavorite);

    return contacts.filter(c => c.isFavorite && (
      String(c.customerName || '').toLowerCase().includes(query) ||
      String(c.teleCallingStaff || '').toLowerCase().includes(query)
    ));
  }, [contacts, searchQuery]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Favorites</h1>
          <p className="text-gray-500 dark:text-slate-400 mt-1">Quick access to your most important contacts.</p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Search favorites..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none dark:text-white"
          />
        </div>
      </header>

      {favorites.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {favorites.map((contact, i) => (
              <motion.div 
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: i * 0.05 }}
                key={contact.id}
                className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
              >
                <button 
                  onClick={() => toggleFavorite(contact.id)}
                  className="absolute top-0 right-0 p-4 text-amber-400 hover:scale-110 transition-transform"
                  title="Remove from favorites"
                >
                  <Star size={18} className="fill-amber-400" />
                </button>
                
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary flex items-center justify-center font-bold text-xl">
                    {(contact.customerName || '').split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">{contact.customerName}</h3>
                    <p className="text-xs text-gray-500 dark:text-slate-400">{contact.customerRequirement}</p>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-slate-300">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-slate-800 flex items-center justify-center shrink-0">
                      <Building2 size={14} className="text-gray-400" />
                    </div>
                    {contact.teleCallingStaff}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-slate-300">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-slate-800 flex items-center justify-center shrink-0">
                      <MapPin size={14} className="text-gray-400" />
                    </div>
                    {contact.ctn}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-slate-300">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-slate-800 flex items-center justify-center shrink-0">
                      <Mail size={14} className="text-gray-400" />
                    </div>
                    <span className="truncate">{contact.customerContactNumber}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <a 
                    href={`tel:${contact.customerContactNumber}`}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                  >
                    <Phone size={16} /> Call
                  </a>
                  <a 
                    href={`https://wa.me/${(contact.customerContactNumber || '').replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-300 text-sm font-bold hover:bg-gray-100 dark:hover:bg-slate-700 transition-all"
                  >
                    <MessageSquare size={16} /> WhatsApp
                  </a>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-dashed border-gray-200 dark:border-slate-800">
          <div className="w-16 h-16 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Star className="text-gray-300 dark:text-slate-600" size={24} />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">No favorites yet</h3>
          <p className="text-gray-500 dark:text-slate-400 max-w-xs mx-auto mt-1">
            Mark contacts as favorites to see them here for quick access.
          </p>
        </div>
      )}
    </div>
  );
}
