import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Edit2, X, CheckCircle2, XCircle, Loader2, Upload, Image as ImageIcon, Search, Calendar, Filter, ChevronDown } from 'lucide-react';
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

  // ── Filter state ──
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStaff, setFilterStaff] = useState('');
  const [filterPayment, setFilterPayment] = useState('');
  const [filterCtn, setFilterCtn] = useState('');
  const [ctnSearch, setCtnSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [ctnList, setCtnList] = useState<any[]>([]);
  const [showCtnDropdown, setShowCtnDropdown] = useState(false);

  const resetForm = () => {
    setForm({ date: '', staffName: '', staffRole: 'Technical', serviceCharges: '', paymentStatus: '', receiveAmount: '', transactionId: '', receiveDate: '', screenshotImage: '', bankTransactionId: '', employeeTransactionId: '' });
    setEditing(null);
    setShowForm(false);
  };

  useEffect(() => {
    api.getIncomes().then(setIncomes).catch(e => setError(e.message)).finally(() => setLoading(false));
    refreshDropdowns();
    api.getCtnList().then(setCtnList).catch(() => {});
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

  // Build CTN→contact lookup map
  const ctnContactMap = useMemo(() => {
    const map: Record<string, { teleCallingStaff: string; technicalStaff: string; customerName: string }> = {};
    ctnList.forEach(c => { map[c.ctn] = c; });
    return map;
  }, [ctnList]);

  // Filtered CTN options for the searchable dropdown
  const filteredCtnOptions = useMemo(() => {
    const q = ctnSearch.toLowerCase().trim();
    if (!q) return ctnList.slice(0, 50);
    return ctnList.filter(c =>
      c.ctn.toLowerCase().includes(q) || (c.customerName || '').toLowerCase().includes(q)
    ).slice(0, 50);
  }, [ctnList, ctnSearch]);

  // ── Date filtering active flag ──
  const isDateFiltered = dateFrom !== '' || dateTo !== '';
  const hasAnyFilter = searchQuery || dateFrom || dateTo || filterRole || filterStaff || filterPayment || filterCtn;

  // ── Filtered incomes ──
  const filteredIncomes = useMemo(() => {
    return incomes.filter(inc => {
      // Text search
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const s = (v: any) => String(v || '').toLowerCase();
        const match = s(inc.staffName).includes(q) || s(inc.staffRole).includes(q) ||
          s(inc.serviceCharges).includes(q) || s(inc.paymentStatus).includes(q) ||
          s(inc.receiveAmount).includes(q) || s(inc.transactionId).includes(q) ||
          s(inc.date).includes(q) || s(inc.receiveDate).includes(q) ||
          s(inc.bankTransactionId).includes(q) || s(inc.employeeTransactionId).includes(q);
        if (!match) return false;
      }
      // Date range
      if (dateFrom) {
        const d = inc.receiveDate || inc.date || '';
        if (d < dateFrom) return false;
      }
      if (dateTo) {
        const d = inc.receiveDate || inc.date || '';
        if (d > dateTo) return false;
      }
      // Staff role
      if (filterRole && inc.staffRole !== filterRole) return false;
      // Staff name
      if (filterStaff && inc.staffName !== filterStaff) return false;
      // Payment status
      if (filterPayment && inc.paymentStatus !== filterPayment) return false;
      // CTN filter - match incomes by staff name associated with the CTN contact
      if (filterCtn) {
        const contact = ctnContactMap[filterCtn];
        if (contact) {
          const matchesTele = contact.teleCallingStaff && inc.staffName === contact.teleCallingStaff;
          const matchesTech = contact.technicalStaff && inc.staffName === contact.technicalStaff;
          if (!matchesTele && !matchesTech) return false;
        } else {
          return false;
        }
      }
      return true;
    });
  }, [incomes, searchQuery, dateFrom, dateTo, filterRole, filterStaff, filterPayment, filterCtn, ctnContactMap]);

  const totalAmount = filteredIncomes.reduce((s, i) => s + (parseFloat(i.receiveAmount) || 0), 0);

  // Staff name options for filter (from dropdown options based on selected role)
  const filterStaffOptions = useMemo(() => {
    if (filterRole === 'TeleCalling') return dropdownOpts['teleCallingStaff'] || [];
    if (filterRole === 'Technical') return dropdownOpts['technicalStaff'] || [];
    return [...new Set([...(dropdownOpts['teleCallingStaff'] || []), ...(dropdownOpts['technicalStaff'] || [])])];
  }, [filterRole, dropdownOpts]);

  const clearFilters = () => {
    setSearchQuery(''); setDateFrom(''); setDateTo('');
    setFilterRole(''); setFilterStaff(''); setFilterPayment(''); setFilterCtn('');
    setCtnSearch('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Incomes</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            {hasAnyFilter ? `Filtered: ₹${totalAmount.toLocaleString('en-IN')} (${filteredIncomes.length} of ${incomes.length})` : `Total: ₹${totalAmount.toLocaleString('en-IN')}`}
          </p>
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
          <button onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border ${hasAnyFilter ? 'bg-primary text-white border-primary shadow-md shadow-primary/20' : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-700 hover:bg-gray-50'}`}>
            <Filter size={16} /> Filters {hasAnyFilter && <span className="w-5 h-5 rounded-full bg-white/20 text-[10px] flex items-center justify-center">!</span>}
          </button>
          <button onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-primary rounded-xl text-sm font-bold text-white hover:bg-primary/90 transition-all shadow-md shadow-primary/20">
            <Plus size={16} /> Add Income
          </button>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      {showFilters && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-4 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Filter Incomes</p>
            {hasAnyFilter && <button onClick={clearFilters} className="text-xs font-bold text-red-500 hover:text-red-600">Clear All</button>}
          </div>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input type="text" placeholder="Search staff, amount, txn ID, date..." value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none dark:text-white" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Date From */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Date From</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none dark:text-white" />
            </div>
            {/* Date To */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Date To</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none dark:text-white" />
            </div>
            {/* Staff Role */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Staff Role</label>
              <select value={filterRole} onChange={e => { setFilterRole(e.target.value); setFilterStaff(''); }}
                className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none dark:text-white">
                <option value="">All Roles</option>
                <option value="TeleCalling">TeleCalling</option>
                <option value="Technical">Technical</option>
              </select>
            </div>
            {/* Staff Name */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Staff Name</label>
              <select value={filterStaff} onChange={e => setFilterStaff(e.target.value)}
                className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none dark:text-white">
                <option value="">All Staff</option>
                {filterStaffOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {/* Payment Status */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Payment Status</label>
              <select value={filterPayment} onChange={e => setFilterPayment(e.target.value)}
                className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none dark:text-white">
                <option value="">All</option>
                {(dropdownOpts['incomePaymentStatuses'] || ['Full Paid', 'Partially Paid', 'Pending']).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {/* CTN Number (searchable) */}
            <div className="space-y-1 relative">
              <label className="text-[10px] font-bold text-gray-400 uppercase">CTN Number</label>
              <div className="relative">
                <input type="text" placeholder="Search CTN..."
                  value={filterCtn || ctnSearch}
                  onChange={e => { setCtnSearch(e.target.value); setFilterCtn(''); setShowCtnDropdown(true); }}
                  onFocus={() => setShowCtnDropdown(true)}
                  className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none dark:text-white" />
                {filterCtn && <button onClick={() => { setFilterCtn(''); setCtnSearch(''); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"><X size={14} /></button>}
              </div>
              {showCtnDropdown && filteredCtnOptions.length > 0 && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-lg max-h-48 overflow-y-auto">
                  {filteredCtnOptions.map(c => (
                    <button key={c.ctn} onClick={() => { setFilterCtn(c.ctn); setCtnSearch(''); setShowCtnDropdown(false); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors border-b border-gray-50 dark:border-slate-700/50 last:border-0">
                      <span className="font-bold text-gray-900 dark:text-white">{c.ctn}</span>
                      {c.customerName && <span className="text-gray-400 text-xs ml-2">({c.customerName})</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          {filterCtn && ctnContactMap[filterCtn] && (
            <div className="flex items-center gap-4 px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-xs">
              <span className="font-bold text-blue-600 dark:text-blue-400">CTN: {filterCtn}</span>
              {ctnContactMap[filterCtn].customerName && <span className="text-gray-600 dark:text-gray-300">Customer: <b>{ctnContactMap[filterCtn].customerName}</b></span>}
              {ctnContactMap[filterCtn].teleCallingStaff && <span className="text-amber-600">TeleCalling: <b>{ctnContactMap[filterCtn].teleCallingStaff}</b></span>}
              {ctnContactMap[filterCtn].technicalStaff && <span className="text-emerald-600">Technical: <b>{ctnContactMap[filterCtn].technicalStaff}</b></span>}
            </div>
          )}
        </motion.div>
      )}

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
              {isDateFiltered && <th className="px-4 py-3 bg-amber-50/50 dark:bg-amber-900/10 border-x border-amber-200/50 dark:border-amber-800/30"><span className="text-amber-600 dark:text-amber-400">TeleCalling</span></th>}
              {isDateFiltered && <th className="px-4 py-3 bg-emerald-50/50 dark:bg-emerald-900/10 border-x border-emerald-200/50 dark:border-emerald-800/30"><span className="text-emerald-600 dark:text-emerald-400">Technical</span></th>}
              <th className="px-4 py-3">Amount</th><th className="px-4 py-3">Payment</th><th className="px-4 py-3">TXN ID</th>
              <th className="px-4 py-3">Verification</th><th className="px-4 py-3 text-right">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
              {loading ? (
                <tr><td colSpan={isDateFiltered ? 10 : 8} className="px-4 py-12 text-center text-gray-400">Loading...</td></tr>
              ) : filteredIncomes.length === 0 ? (
                <tr><td colSpan={isDateFiltered ? 10 : 8} className="px-4 py-12 text-center text-gray-400">{hasAnyFilter ? 'No matching income entries.' : 'No income entries yet.'}</td></tr>
              ) : filteredIncomes.map(inc => {
                // Find matching contact staff names for frozen columns
                const matchedContact = isDateFiltered ? ctnList.find(c =>
                  (c.teleCallingStaff && c.teleCallingStaff === inc.staffName) ||
                  (c.technicalStaff && c.technicalStaff === inc.staffName)
                ) : null;
                const teleStaffName = matchedContact?.teleCallingStaff || '—';
                const techStaffName = matchedContact?.technicalStaff || '—';
                return (
                <tr key={inc.id} className="group hover:bg-gray-50/50 dark:hover:bg-slate-800/30">
                  <td className="px-4 py-3 whitespace-nowrap">{inc.receiveDate || inc.date || '—'}</td>
                  <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">{inc.staffName || '—'}</td>
                  <td className="px-4 py-3"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${inc.staffRole === 'Technical' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{inc.staffRole}</span></td>
                  {isDateFiltered && <td className="px-4 py-3 bg-amber-50/30 dark:bg-amber-900/5 border-x border-amber-100/50 dark:border-amber-800/20 text-xs font-bold text-amber-700 dark:text-amber-400">{teleStaffName}</td>}
                  {isDateFiltered && <td className="px-4 py-3 bg-emerald-50/30 dark:bg-emerald-900/5 border-x border-emerald-100/50 dark:border-emerald-800/20 text-xs font-bold text-emerald-700 dark:text-emerald-400">{techStaffName}</td>}
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
              )})}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
