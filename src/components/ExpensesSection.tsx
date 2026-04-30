import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, X, Loader2, Upload } from 'lucide-react';
import { api } from '../services/api';
import { motion } from 'motion/react';
import DropdownManager from './DropdownManager';

export default function ExpensesSection() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [dropdownOpts, setDropdownOpts] = useState<Record<string, string[]>>({});
  const [form, setForm] = useState({
    date: '', productName: '', quantity: 1, amount: '',
    transactionId: '', billScreenshot: '', productScreenshot: '',
  });

  const resetForm = () => {
    setForm({ date: '', productName: '', quantity: 1, amount: '', transactionId: '', billScreenshot: '', productScreenshot: '' });
    setEditing(null); setShowForm(false);
  };

  useEffect(() => {
    api.getExpenses().then(setExpenses).catch(e => setError(e.message)).finally(() => setLoading(false));
    refreshDropdowns();
  }, []);

  const refreshDropdowns = () => {
    api.getDropdownOptions().then(setDropdownOpts).catch(() => {});
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      if (editing) {
        const updated = await api.updateExpense(editing.id, form);
        setExpenses(expenses.map(i => i.id === editing.id ? updated : i));
      } else {
        const created = await api.createExpense(form);
        setExpenses([created, ...expenses]);
      }
      resetForm();
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this expense?')) return;
    try { await api.deleteExpense(id); setExpenses(expenses.filter(i => i.id !== id)); }
    catch (err: any) { setError(err.message); }
  };

  const handleEdit = (exp: any) => {
    setForm({ date: exp.date, productName: exp.productName, quantity: exp.quantity, amount: exp.amount, transactionId: exp.transactionId, billScreenshot: exp.billScreenshot, productScreenshot: exp.productScreenshot });
    setEditing(exp); setShowForm(true);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'billScreenshot' | 'productScreenshot') => {
    const file = e.target.files?.[0];
    if (!file) return;
    try { const { url } = await api.uploadScreenshot(file); setForm({ ...form, [field]: url }); } catch {}
  };

  const productNames = dropdownOpts['expenseProducts'] || ['Office Supplies', 'Electronics', 'Furniture', 'Software', 'Travel', 'Food', 'Utilities', 'Other'];
  const inputCls = "w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none dark:text-white";
  const totalAmount = expenses.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Expenses</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400">Total: ₹{totalAmount.toLocaleString('en-IN')}</p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownManager
            categories={{
              expenseProducts: { label: 'Product Names', items: dropdownOpts['expenseProducts'] || productNames },
            }}
            onUpdate={refreshDropdowns}
          />
          <button onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 rounded-xl text-sm font-bold text-white hover:bg-red-600 transition-all shadow-md shadow-red-500/20">
            <Plus size={16} /> Add Expense
          </button>
        </div>
      </div>

      {error && <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 text-sm font-medium">{error}</div>}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold dark:text-white">{editing ? 'Edit Expense' : 'Add Expense'}</h3>
              <button onClick={resetForm} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full"><X size={18} /></button>
            </div>
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase">Date</label>
                  <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className={inputCls} required /></div>
                <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase">Product Name</label>
                  <select value={form.productName} onChange={e => setForm({...form, productName: e.target.value})} className={inputCls} required>
                    <option value="">Select Product</option>
                    {productNames.map(p => <option key={p} value={p}>{p}</option>)}
                  </select></div>
                <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase">Quantity</label>
                  <input type="number" min="1" value={form.quantity} onChange={e => setForm({...form, quantity: parseInt(e.target.value) || 1})} className={inputCls} required /></div>
                <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase">Amount</label>
                  <input type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className={inputCls} placeholder="₹" required /></div>
                <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase">Transaction ID</label>
                  <input value={form.transactionId} onChange={e => setForm({...form, transactionId: e.target.value})} className={inputCls} /></div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase">Bill Screenshot</label>
                  {form.billScreenshot ? (
                    <div className="flex items-center gap-2">
                      <img src={form.billScreenshot} className="h-10 w-16 object-cover rounded-lg border" />
                      <button type="button" onClick={() => setForm({...form, billScreenshot: ''})} className="text-red-500 text-xs">Remove</button>
                    </div>
                  ) : (
                    <label className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-dashed border-gray-200 dark:border-slate-700 cursor-pointer text-xs text-gray-400">
                      <Upload size={14} /> Upload Bill
                      <input type="file" className="hidden" accept="image/*" onChange={e => handleUpload(e, 'billScreenshot')} />
                    </label>
                  )}</div>
                <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase">Product Screenshot</label>
                  {form.productScreenshot ? (
                    <div className="flex items-center gap-2">
                      <img src={form.productScreenshot} className="h-10 w-16 object-cover rounded-lg border" />
                      <button type="button" onClick={() => setForm({...form, productScreenshot: ''})} className="text-red-500 text-xs">Remove</button>
                    </div>
                  ) : (
                    <label className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-dashed border-gray-200 dark:border-slate-700 cursor-pointer text-xs text-gray-400">
                      <Upload size={14} /> Upload Product
                      <input type="file" className="hidden" accept="image/*" onChange={e => handleUpload(e, 'productScreenshot')} />
                    </label>
                  )}</div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={resetForm} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 shadow-md disabled:opacity-60 flex items-center justify-center gap-2">
                  {saving && <Loader2 size={14} className="animate-spin" />}{saving ? 'Saving...' : editing ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead><tr className="bg-gray-50 dark:bg-slate-800/50 text-[10px] uppercase tracking-wider font-bold text-gray-500 dark:text-slate-400 border-b border-gray-100 dark:border-slate-800">
              <th className="px-4 py-3">Date</th><th className="px-4 py-3">Product</th><th className="px-4 py-3">Qty</th>
              <th className="px-4 py-3">Amount</th><th className="px-4 py-3">TXN ID</th>
              <th className="px-4 py-3">Bill</th><th className="px-4 py-3">Product</th><th className="px-4 py-3 text-right">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">Loading...</td></tr>
              ) : expenses.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">No expense entries yet.</td></tr>
              ) : expenses.map(exp => (
                <tr key={exp.id} className="group hover:bg-gray-50/50 dark:hover:bg-slate-800/30">
                  <td className="px-4 py-3 whitespace-nowrap">{exp.date || '—'}</td>
                  <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">{exp.productName || '—'}</td>
                  <td className="px-4 py-3">{exp.quantity}</td>
                  <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">₹{exp.amount || '0'}</td>
                  <td className="px-4 py-3 font-mono text-xs">{exp.transactionId || '—'}</td>
                  <td className="px-4 py-3">{exp.billScreenshot ? <img src={exp.billScreenshot} className="h-8 w-12 object-cover rounded border cursor-pointer" /> : '—'}</td>
                  <td className="px-4 py-3">{exp.productScreenshot ? <img src={exp.productScreenshot} className="h-8 w-12 object-cover rounded border cursor-pointer" /> : '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEdit(exp)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500"><Edit2 size={14}/></button>
                      <button onClick={() => handleDelete(exp.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"><Trash2 size={14}/></button>
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
