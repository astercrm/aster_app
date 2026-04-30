import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, X, CheckCircle2, XCircle, Loader2, Upload, Image as ImageIcon } from 'lucide-react';
import { api } from '../services/api';
import { motion } from 'motion/react';
import DropdownManager from './DropdownManager';

export default function IncomesSection() {
  const [incomes, setIncomes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [dropdownOpts, setDropdownOpts] = useState<Record<string, string[]>>({});
  const [form, setForm] = useState({
    date: '', staffName: '', staffRole: 'Technical' as string,
    serviceCharges: '', paymentStatus: '', receiveAmount: '',
    transactionId: '', receiveDate: '', screenshotImage: '',
    bankTransactionId: '', employeeTransactionId: '',
  });

  const resetForm = () => {
    setForm({ date: '', staffName: '', staffRole: 'Technical', serviceCharges: '', paymentStatus: '', receiveAmount: '', transactionId: '', receiveDate: '', screenshotImage: '', bankTransactionId: '', employeeTransactionId: '' });
    setEditing(null);
    setShowForm(false);
  };

  useEffect(() => {
    api.getIncomes().then(setIncomes).catch(e => setError(e.message)).finally(() => setLoading(false));
    refreshDropdowns();
  }, []);

  const refreshDropdowns = () => {
    api.getDropdownOptions().then(setDropdownOpts).catch(() => {});
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editing) {
        const updated = await api.updateIncome(editing.id, form);
        setIncomes(incomes.map(i => i.id === editing.id ? updated : i));
      } else {
        const created = await api.createIncome(form);
        setIncomes([created, ...incomes]);
      }
      resetForm();
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this income entry?')) return;
    try { await api.deleteIncome(id); setIncomes(incomes.filter(i => i.id !== id)); }
    catch (err: any) { setError(err.message); }
  };

  const handleEdit = (inc: any) => {
    setForm({ date: inc.date, staffName: inc.staffName, staffRole: inc.staffRole, serviceCharges: inc.serviceCharges, paymentStatus: inc.paymentStatus, receiveAmount: inc.receiveAmount, transactionId: inc.transactionId, receiveDate: inc.receiveDate, screenshotImage: inc.screenshotImage, bankTransactionId: inc.bankTransactionId, employeeTransactionId: inc.employeeTransactionId });
    setEditing(inc);
    setShowForm(true);
  };

  const handleScreenshot = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { url } = await api.uploadScreenshot(file);
      setForm({ ...form, screenshotImage: url });
    } catch {}
  };

  const staffList = dropdownOpts[form.staffRole === 'TeleCalling' ? 'teleCallingStaff' : 'technicalStaff'] || [];
  const bankId = (form.bankTransactionId || '').trim();
  const empId = (form.employeeTransactionId || '').trim();
  const showVerify = bankId !== '' && empId !== '';
  const isVerified = showVerify && bankId === empId;

  const inputCls = "w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none dark:text-white";

  const totalAmount = incomes.reduce((s, i) => s + (parseFloat(i.receiveAmount) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Incomes</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400">Total: ₹{totalAmount.toLocaleString('en-IN')}</p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownManager
            categories={{
              teleCallingStaff: { label: 'TeleCalling Staff', items: dropdownOpts['teleCallingStaff'] || [] },
              technicalStaff: { label: 'Technical Staff', items: dropdownOpts['technicalStaff'] || [] },
              incomePaymentStatuses: { label: 'Payment Statuses', items: dropdownOpts['incomePaymentStatuses'] || ['Full Paid', 'Partially Paid', 'Pending'] },
            }}
            onUpdate={refreshDropdowns}
          />
          <button onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-primary rounded-xl text-sm font-bold text-white hover:bg-primary/90 transition-all shadow-md shadow-primary/20">
            <Plus size={16} /> Add Income
          </button>
        </div>
      </div>

      {error && <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 text-sm font-medium">{error}</div>}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold dark:text-white">{editing ? 'Edit Income' : 'Add Income'}</h3>
              <button onClick={resetForm} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full"><X size={18} /></button>
            </div>
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase">Date</label>
                  <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className={inputCls} required /></div>
                <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase">Staff Role</label>
                  <select value={form.staffRole} onChange={e => setForm({...form, staffRole: e.target.value, staffName: ''})} className={inputCls}>
                    <option value="TeleCalling">TeleCalling</option><option value="Technical">Technical</option>
                  </select></div>
                <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase">Staff Name</label>
                  <select value={form.staffName} onChange={e => setForm({...form, staffName: e.target.value})} className={inputCls} required>
                    <option value="">Select Staff</option>
                    {staffList.map(s => <option key={s} value={s}>{s}</option>)}
                  </select></div>
                <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase">Service Charges</label>
                  <input value={form.serviceCharges} onChange={e => setForm({...form, serviceCharges: e.target.value})} className={inputCls} placeholder="₹" /></div>
                <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase">Payment Status</label>
                  <select value={form.paymentStatus} onChange={e => setForm({...form, paymentStatus: e.target.value})} className={inputCls}>
                    <option value="">Select</option>
                    {(dropdownOpts['incomePaymentStatuses'] || ['Full Paid', 'Partially Paid', 'Pending']).map(s => <option key={s} value={s}>{s}</option>)}
                  </select></div>
                <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase">Receive Amount</label>
                  <input type="number" value={form.receiveAmount} onChange={e => setForm({...form, receiveAmount: e.target.value})} className={inputCls} placeholder="₹" required /></div>
                <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase">Transaction ID</label>
                  <input value={form.transactionId} onChange={e => setForm({...form, transactionId: e.target.value})} className={inputCls} /></div>
                <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase">Receive Date</label>
                  <input type="date" value={form.receiveDate} onChange={e => setForm({...form, receiveDate: e.target.value})} className={inputCls} /></div>
                <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase">Screenshot</label>
                  {form.screenshotImage ? (
                    <div className="flex items-center gap-2">
                      <img src={form.screenshotImage} className="h-10 w-16 object-cover rounded-lg border" />
                      <button type="button" onClick={() => setForm({...form, screenshotImage: ''})} className="text-red-500 text-xs">Remove</button>
                    </div>
                  ) : (
                    <label className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-dashed border-gray-200 dark:border-slate-700 cursor-pointer text-xs text-gray-400">
                      <Upload size={14} /> Upload
                      <input type="file" className="hidden" accept="image/*" onChange={handleScreenshot} />
                    </label>
                  )}</div>
              </div>

              {/* Bank & Employee Transaction IDs */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-xl p-4 border border-blue-200 dark:border-blue-800/50 space-y-3">
                <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase">Transaction Verification</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase">Bank Transaction ID</label>
                    <input type="text" inputMode="numeric" value={form.bankTransactionId} onChange={e => setForm({...form, bankTransactionId: e.target.value.replace(/\D/g,'')})} className={inputCls} placeholder="Number" /></div>
                  <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase">Employee Transaction ID</label>
                    <input type="text" inputMode="numeric" value={form.employeeTransactionId} onChange={e => setForm({...form, employeeTransactionId: e.target.value.replace(/\D/g,'')})} className={inputCls} placeholder="Number" /></div>
                </div>
                {showVerify && (
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold ${isVerified ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700' : 'bg-red-100 dark:bg-red-900/30 text-red-700'}`}>
                    {isVerified ? <><CheckCircle2 size={16} /> ✅ Verified — IDs match</> : <><XCircle size={16} /> ❌ Not Verified — IDs do not match</>}
                  </div>
                )}
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

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead><tr className="bg-gray-50 dark:bg-slate-800/50 text-[10px] uppercase tracking-wider font-bold text-gray-500 dark:text-slate-400 border-b border-gray-100 dark:border-slate-800">
              <th className="px-4 py-3">Date</th><th className="px-4 py-3">Staff</th><th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Amount</th><th className="px-4 py-3">Payment</th><th className="px-4 py-3">TXN ID</th>
              <th className="px-4 py-3">Verification</th><th className="px-4 py-3 text-right">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">Loading...</td></tr>
              ) : incomes.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">No income entries yet.</td></tr>
              ) : incomes.map(inc => (
                <tr key={inc.id} className="group hover:bg-gray-50/50 dark:hover:bg-slate-800/30">
                  <td className="px-4 py-3 whitespace-nowrap">{inc.receiveDate || inc.date || '—'}</td>
                  <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">{inc.staffName || '—'}</td>
                  <td className="px-4 py-3"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${inc.staffRole === 'Technical' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{inc.staffRole}</span></td>
                  <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">₹{inc.receiveAmount || '0'}</td>
                  <td className="px-4 py-3">{inc.paymentStatus || '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs">{inc.transactionId || '—'}</td>
                  <td className="px-4 py-3">
                    {inc.bankTransactionId && inc.employeeTransactionId ? (
                      inc.isVerified ? <span className="text-emerald-600 font-bold text-xs flex items-center gap-1"><CheckCircle2 size={14}/>Verified</span>
                      : <span className="text-red-500 font-bold text-xs flex items-center gap-1"><XCircle size={14}/>Not Verified</span>
                    ) : <span className="text-gray-400 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEdit(inc)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500"><Edit2 size={14}/></button>
                      <button onClick={() => handleDelete(inc.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"><Trash2 size={14}/></button>
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
