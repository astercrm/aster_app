import React, { useState } from 'react';
import { Plus, Edit2, X, Settings2 } from 'lucide-react';
import { api } from '../services/api';
import { motion, AnimatePresence } from 'motion/react';

interface DropdownManagerProps {
  /** Map of category key → { label, items } */
  categories: Record<string, { label: string; items: string[] }>;
  /** Called after any add/rename/delete so parent can refresh its dropdown state */
  onUpdate: () => void;
}

export default function DropdownManager({ categories, onUpdate }: DropdownManagerProps) {
  const categoryKeys = Object.keys(categories);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(categoryKeys[0] || '');
  const [newItem, setNewItem] = useState('');
  const [renamingItem, setRenamingItem] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const currentCategory = categories[activeTab];
  const items = currentCategory?.items || [];

  const handleAdd = async () => {
    const trimmed = newItem.trim();
    if (!trimmed) return;
    if (items.includes(trimmed)) { showToast('Item already exists'); return; }
    setSaving(true);
    try {
      await api.addDropdownOption(activeTab, trimmed);
      setNewItem('');
      onUpdate();
      showToast('Added successfully');
    } catch (err: any) { showToast(err.message || 'Failed to add'); }
    finally { setSaving(false); }
  };

  const handleRename = async (oldLabel: string) => {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === oldLabel) { setRenamingItem(null); return; }
    setSaving(true);
    try {
      await api.renameDropdownOption(activeTab, oldLabel, trimmed);
      setRenamingItem(null);
      onUpdate();
      showToast('Renamed successfully');
    } catch (err: any) { showToast(err.message || 'Failed to rename'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (label: string) => {
    if (!confirm(`Delete "${label}"?`)) return;
    setSaving(true);
    try {
      await api.deleteDropdownOption(activeTab, label);
      onUpdate();
      showToast('Deleted successfully');
    } catch (err: any) { showToast(err.message || 'Failed to delete'); }
    finally { setSaving(false); }
  };

  if (categoryKeys.length === 0) return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-sm font-bold text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all shadow-sm"
      >
        <Settings2 size={16} /> Manage Options
      </button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-slate-800 flex flex-col max-h-[80vh]"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gray-50/50 dark:bg-slate-800/50">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Manage Dropdown Options</h2>
                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                  <X size={20} className="text-gray-500 dark:text-slate-400" />
                </button>
              </div>

              {/* Tabs */}
              {categoryKeys.length > 1 && (
                <div className="flex gap-1 px-4 pt-3 overflow-x-auto shrink-0">
                  {categoryKeys.map(key => (
                    <button
                      key={key}
                      onClick={() => { setActiveTab(key); setNewItem(''); setRenamingItem(null); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                        activeTab === key
                          ? 'bg-primary text-white'
                          : 'text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {categories[key].label}
                    </button>
                  ))}
                </div>
              )}

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
                  {currentCategory?.label || activeTab}
                </p>

                {/* Add new */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newItem}
                    onChange={e => setNewItem(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAdd())}
                    placeholder="Type new option and press Enter..."
                    className="flex-1 bg-gray-50 dark:bg-slate-800 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none dark:text-white"
                    disabled={saving}
                  />
                  <button
                    onClick={handleAdd}
                    disabled={saving}
                    className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-all disabled:opacity-50"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                {/* Items list */}
                <div className="space-y-2">
                  {items.length === 0 && (
                    <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-4">No options yet.</p>
                  )}
                  {items.map(item => (
                    <div key={item} className="flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-slate-800 rounded-xl group">
                      {renamingItem === item ? (
                        <div className="flex items-center gap-2 flex-1 mr-2">
                          <input
                            type="text"
                            value={renameValue}
                            onChange={e => setRenameValue(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleRename(item); } if (e.key === 'Escape') setRenamingItem(null); }}
                            autoFocus
                            className="flex-1 bg-white dark:bg-slate-700 border border-primary/30 rounded-lg py-1 px-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none dark:text-white"
                          />
                          <button onClick={() => handleRename(item)} className="px-2.5 py-1 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary/90">Save</button>
                          <button onClick={() => setRenamingItem(null)} className="px-2 py-1 text-gray-400 hover:text-gray-600 text-xs font-bold">Cancel</button>
                        </div>
                      ) : (
                        <>
                          <span className="text-sm text-gray-800 dark:text-slate-200">{item}</span>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => { setRenamingItem(item); setRenameValue(item); }}
                              className="p-1 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                              title="Rename"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => handleDelete(item)}
                              className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              title="Delete"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50">
                <p className="text-[11px] text-gray-400 dark:text-slate-500 text-center">
                  Changes are saved permanently and shared across all users.
                </p>
              </div>
            </motion.div>

            {/* Toast */}
            <AnimatePresence>
              {toast && (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 30 }}
                  className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl bg-gray-900 text-white text-sm font-bold shadow-2xl border border-white/10"
                >
                  {toast}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
