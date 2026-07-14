import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Trash2, Edit2, X, CheckCircle2, XCircle, Loader2, Upload, FileText, Search, Filter } from 'lucide-react';
import { api } from '../services/api';
import { motion } from 'motion/react';
import DropdownManager from './DropdownManager';
import { Contact } from '../types';

interface IncomesSectionProps {
  contacts?: Contact[];
}

export default function IncomesSection({ contacts = [] }: IncomesSectionProps) {
  const [incomes, setIncomes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [dropdownOpts, setDropdownOpts] = useState<Record<string, string[]>>({});
  const [form, setForm] = useState({
    date: '', staffName: '', staffRole: 'Technical' as string,
    ctnNumber: '', customerName: '', customerMobile: '',
    serviceCharges: '', paymentStatus: '', receiveAmount: '',
    receiveDate: '', screenshotImage: '',
    bankTransactionId: '', employeeTransactionId: '',
    verificationStatus: '' as '' | 'auto' | 'manual_verified' | 'manual_not_verified',
  });

  // ── CTN form search state ──
  const [ctnFormSearch, setCtnFormSearch] = useState('');
  const [showCtnFormDrop, setShowCtnFormDrop] = useState(false);
  const [ctnContactInfo, setCtnContactInfo] = useState<{ technicalStaff: string; teleCallingStaff: string; extraImages: string[] } | null>(null);
  const [bankFileNumbers, setBankFileNumbers] = useState<string[]>([]);
  const bankFileRef = useRef<HTMLInputElement>(null);

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

  const resetForm = () => {
    setForm({ date: '', staffName: '', staffRole: 'Technical', ctnNumber: '', customerName: '', customerMobile: '', serviceCharges: '', paymentStatus: '', receiveAmount: '', receiveDate: '', screenshotImage: '', bankTransactionId: '', employeeTransactionId: '', verificationStatus: '' });
    setCtnFormSearch(''); setShowCtnFormDrop(false); setBankFileNumbers([]);
    setCtnContactInfo(null);
    setEditing(null);
    setShowForm(false);
  };

  // ── CTN list: poll the lightweight API endpoint every 15 seconds ──
  // This ensures new CTNs added by Technical/TeleCalling appear instantly
  // in the Account role's Income filter without waiting for the 60s contacts poll.
  const fetchCtnList = () => {
    api.getCtnList().then(data => {
      // Sort and deduplicate
      const seen = new Set<string>();
      const unique = (data || [])
        .filter(c => (c.ctn || '').trim() !== '')
        .sort((a: any, b: any) => (a.ctn || '').localeCompare(b.ctn || ''))
        .filter((c: any) => {
          if (seen.has(c.ctn)) return false;
          seen.add(c.ctn);
          return true;
        });
      setCtnList(unique);
    }).catch(() => {});
  };

  useEffect(() => {
    // Fetch immediately on mount
    fetchCtnList();
    // Then poll every 15 seconds for real-time updates
    const ctnPoll = setInterval(fetchCtnList, 15_000);
    return () => clearInterval(ctnPoll);
  }, []);

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
    setForm({
      date: inc.date, staffName: inc.staffName, staffRole: inc.staffRole,
      ctnNumber: inc.ctnNumber || '', customerName: inc.customerName || '', customerMobile: inc.customerMobile || '',
      serviceCharges: inc.serviceCharges, paymentStatus: inc.paymentStatus, receiveAmount: inc.receiveAmount,
      receiveDate: inc.receiveDate, screenshotImage: inc.screenshotImage,
      bankTransactionId: inc.bankTransactionId, employeeTransactionId: inc.employeeTransactionId,
      verificationStatus: inc.verificationStatus || '',
    });
    setCtnFormSearch(inc.ctnNumber || '');
    setBankFileNumbers([]);
    setEditing(inc);
    setShowForm(true);
  };

  // Parse contact date to YYYY-MM-DD format for the date input
  const parseToISO = (d: string) => {
    if (!d) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
    const months: Record<string, string> = { Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12' };
    const parts = d.split('-');
    if (parts.length === 3 && months[parts[1]]) {
      return `${parts[2]}-${months[parts[1]]}-${parts[0].padStart(2, '0')}`;
    }
    return '';
  };

  // When a CTN is selected from the form dropdown, auto-fill ALL contact details
  const handleCtnSelect = (c: any) => {
    const autoDate = parseToISO(c.receiveDate) || parseToISO(c.date) || '';
    // Determine staff role & name: use teleCallingStaff if present, else technicalStaff
    const autoStaffRole = c.teleCallingStaff ? 'TeleCalling' : c.technicalStaff ? 'Technical' : '';
    const autoStaffName = c.teleCallingStaff || c.technicalStaff || '';
    setForm(f => ({
      ...f,
      ctnNumber: c.ctn,
      customerName: c.customerName || '',
      customerMobile: c.customerMobile || '',
      receiveAmount: c.receiveAmount || f.receiveAmount,
      serviceCharges: c.serviceCharges || f.serviceCharges,
      paymentStatus: c.paymentStatus || f.paymentStatus,
      employeeTransactionId: c.transactionId || f.employeeTransactionId,
      date: autoDate || f.date,
      receiveDate: parseToISO(c.receiveDate) || f.receiveDate,
      staffRole: autoStaffRole || f.staffRole,
      staffName: autoStaffName || f.staffName,
      screenshotImage: c.screenshotImage || f.screenshotImage,
    }));
    // Store extra contact info for display
    setCtnContactInfo({
      technicalStaff: c.technicalStaff || '',
      teleCallingStaff: c.teleCallingStaff || '',
      extraImages: (c.extraImages || []).filter(Boolean),
    });
    setCtnFormSearch(c.ctn);
    setShowCtnFormDrop(false);
  };

  // Parse a text file for all numeric sequences, check against Employee TXN ID
  const handleBankFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const nums = (text.match(/\d{6,}/g) || []).filter((v, i, a) => a.indexOf(v) === i);
      setBankFileNumbers(nums);
      setForm(f => {
        const empTxn = (f.employeeTransactionId || '').trim();
        const matched = nums.length > 0 && empTxn !== '' && nums.includes(empTxn);
        return {
          ...f,
          // If exactly one number found, auto-fill bank TXN ID
          bankTransactionId: nums.length === 1 ? nums[0] : f.bankTransactionId,
          // Auto-set verification: if Employee TXN ID found in file → verified, else → not verified
          verificationStatus: empTxn === '' ? f.verificationStatus : (matched ? 'auto' : 'manual_not_verified'),
        };
      });
    };
    reader.readAsText(file);
    // Reset input so same file can be re-uploaded
    if (bankFileRef.current) bankFileRef.current.value = '';
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
  // Auto-verification: check if bank file contains the employee TXN ID (case-insensitive)
  const autoMatch = bankFileNumbers.length > 0 && empId !== '' && bankFileNumbers.some(n => n.toLowerCase() === empId.toLowerCase());
  const autoNoMatch = bankFileNumbers.length > 0 && empId !== '' && !bankFileNumbers.some(n => n.toLowerCase() === empId.toLowerCase());
  // Manual typing match: Bank TXN ID typed/entered matches Employee TXN ID (case-insensitive)
  const manualTypedMatch = bankId !== '' && empId !== '' && bankId.toLowerCase() === empId.toLowerCase();
  const manualTypedNoMatch = bankId !== '' && empId !== '' && bankId.toLowerCase() !== empId.toLowerCase();
  // Effective verification status — 'auto' means file-matched verified
  const effVerified = form.verificationStatus === 'manual_verified' || form.verificationStatus === 'auto' || autoMatch || manualTypedMatch;
  const effNotVerified = form.verificationStatus === 'manual_not_verified' || (form.verificationStatus !== 'manual_verified' && form.verificationStatus !== 'auto' && !manualTypedMatch && (autoNoMatch || manualTypedNoMatch));

  const inputCls = "w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none dark:text-white";

  // Build CTN→contact lookup map
  const ctnContactMap = useMemo(() => {
    const map: Record<string, any> = {};
    ctnList.forEach(c => { map[c.ctn] = c; });
    return map;
  }, [ctnList]);

  // Filtered CTN options for the FORM's CTN search
  const filteredCtnFormOptions = useMemo(() => {
    const q = (ctnFormSearch || '').toLowerCase().trim();
    if (!q) return ctnList.slice(0, 60);
    return ctnList.filter(c =>
      c.ctn.toLowerCase().includes(q) || (c.customerName || '').toLowerCase().includes(q)
    ).slice(0, 60);
  }, [ctnList, ctnFormSearch]);

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
          s(inc.receiveAmount).includes(q) || s(inc.ctnNumber).includes(q) ||
          s(inc.customerName).includes(q) || s(inc.customerMobile).includes(q) ||
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
            {/* CTN Number (searchable always-visible list) */}
            <div className="space-y-1 col-span-2 md:col-span-1 lg:col-span-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase">CTN Number</label>
              <div className="relative">
                <input type="text" placeholder="Search CTN or customer name..."
                  value={filterCtn || ctnSearch}
                  onChange={e => { setCtnSearch(e.target.value); setFilterCtn(''); }}
                  className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none dark:text-white pr-8" />
                {(filterCtn || ctnSearch) && (
                  <button onClick={() => { setFilterCtn(''); setCtnSearch(''); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500">
                    <X size={14} />
                  </button>
                )}
              </div>
              {/* Always-visible CTN list — no focus needed */}
              {filteredCtnOptions.length > 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm max-h-40 overflow-y-auto">
                  {filteredCtnOptions.map(c => (
                    <button key={c.ctn}
                      onClick={() => { setFilterCtn(c.ctn); setCtnSearch(''); }}
                      className={`w-full text-left px-3 py-1.5 text-sm transition-colors border-b border-gray-50 dark:border-slate-700/50 last:border-0 flex items-center justify-between gap-2 ${filterCtn === c.ctn ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-900 dark:text-white'}`}>
                      <span className="font-bold truncate">{c.ctn}</span>
                      {c.customerName && <span className="text-gray-400 text-xs shrink-0 truncate max-w-[100px]">({c.customerName})</span>}
                    </button>
                  ))}
                </div>
              ) : ctnList.length === 0 ? (
                <p className="text-xs text-gray-400 dark:text-slate-500 px-1 py-1">Loading CTN list...</p>
              ) : (
                <p className="text-xs text-gray-400 dark:text-slate-500 px-1 py-1">No CTN matches "{ctnSearch}"</p>
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

              {/* CTN Number with auto-fill */}
              <div className="bg-gradient-to-r from-sky-50 to-blue-50 dark:from-sky-900/10 dark:to-blue-900/10 rounded-xl p-4 border border-sky-200 dark:border-sky-800/50 space-y-3">
                <p className="text-xs font-bold text-sky-600 dark:text-sky-400 uppercase">CTN Details (Auto-fill from Contact)</p>
                <div className="relative">
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">CTN Number</label>
                  <input
                    type="text"
                    placeholder="Search CTN or customer name..."
                    value={ctnFormSearch}
                    onChange={e => { setCtnFormSearch(e.target.value); setShowCtnFormDrop(true); }}
                    onFocus={() => setShowCtnFormDrop(true)}
                    className={inputCls}
                  />
                  {showCtnFormDrop && filteredCtnFormOptions.length > 0 && (
                    <div className="absolute z-30 w-full mt-1 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-lg max-h-44 overflow-y-auto">
                      {filteredCtnFormOptions.map(c => (
                        <button key={c.ctn} type="button"
                          onMouseDown={() => handleCtnSelect(c)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-sky-50 dark:hover:bg-sky-900/20 flex items-center justify-between border-b border-gray-50 dark:border-slate-700/50 last:border-0">
                          <span className="font-bold text-gray-900 dark:text-white">{c.ctn}</span>
                          {c.customerName && <span className="text-gray-400 text-xs ml-2 truncate">{c.customerName}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                  {showCtnFormDrop && <button type="button" className="absolute right-2 top-8 text-gray-400 hover:text-red-400" onClick={() => setShowCtnFormDrop(false)}><X size={14}/></button>}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase">Customer Name</label>
                    <input value={form.customerName} onChange={e => setForm({...form, customerName: e.target.value})} className={inputCls} placeholder="Auto-filled" /></div>
                  <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase">Customer Mobile</label>
                    <input value={form.customerMobile} onChange={e => setForm({...form, customerMobile: e.target.value})} className={inputCls} placeholder="Auto-filled" /></div>
                  <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase">Employee TXN ID</label>
                    <input type="text" value={form.employeeTransactionId} onChange={e => setForm({...form, employeeTransactionId: e.target.value.trim()})} className={inputCls} placeholder="Auto-filled" /></div>
                  {ctnContactInfo?.technicalStaff && (
                    <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase">Technical Staff</label>
                      <div className={`${inputCls} flex items-center gap-1.5 !bg-emerald-50 dark:!bg-emerald-900/20 !text-emerald-700 dark:!text-emerald-300 font-bold`}>
                        <span className="w-5 h-5 rounded-full bg-emerald-200 dark:bg-emerald-800 flex items-center justify-center text-[10px] font-black shrink-0">{ctnContactInfo.technicalStaff.charAt(0)}</span>
                        {ctnContactInfo.technicalStaff}
                      </div>
                    </div>
                  )}
                </div>
                {/* Auto-filled Screenshot & Extra Images from Contact */}
                {(form.screenshotImage || (ctnContactInfo?.extraImages && ctnContactInfo.extraImages.length > 0)) && (
                  <div className="mt-2 space-y-1.5">
                    <p className="text-[10px] font-bold text-sky-500 uppercase tracking-wider">Auto-filled Images from Contact</p>
                    <div className="flex flex-wrap gap-2">
                      {form.screenshotImage && (
                        <div className="relative group">
                          <img src={form.screenshotImage} className="h-16 w-24 object-cover rounded-lg border-2 border-sky-200 dark:border-sky-700 shadow-sm" alt="Screenshot" />
                          <span className="absolute -top-1.5 -left-1.5 bg-sky-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">Screenshot</span>
                        </div>
                      )}
                      {(ctnContactInfo?.extraImages || []).map((img: string, i: number) => (
                        <div key={i} className="relative group">
                          <img src={img} className="h-16 w-24 object-cover rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm" alt={`Extra ${i + 1}`} />
                          <span className="absolute -top-1.5 -left-1.5 bg-gray-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">Extra {i + 1}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

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

              {/* Bank Transaction ID with file upload */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-xl p-4 border border-blue-200 dark:border-blue-800/50 space-y-3">
                <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase">Transaction Verification</p>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Bank Transaction ID</label>
                  <div className="flex gap-2 items-start">
                    <input type="text" value={form.bankTransactionId}
                      onChange={e => {
                        const val = e.target.value.trim();
                        setForm(f => ({
                          ...f,
                          bankTransactionId: val,
                          // Auto-set verification when manually typing
                          verificationStatus: empId === '' ? f.verificationStatus
                            : (val !== '' && val.toLowerCase() === empId.toLowerCase()) ? 'manual_verified'
                            : (val !== '' && val.toLowerCase() !== empId.toLowerCase()) ? 'manual_not_verified'
                            : '',
                        }));
                      }}
                      className={`${inputCls} ${
                        bankId !== '' && empId !== ''
                          ? manualTypedMatch ? '!border-2 !border-emerald-500 !bg-emerald-50 dark:!bg-emerald-900/20' : '!border-2 !border-red-400 !bg-red-50 dark:!bg-red-900/20'
                          : ''
                      }`}
                      placeholder="Enter manually or upload file" />
                    <label className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border-2 border-dashed border-blue-200 dark:border-blue-700 cursor-pointer text-xs text-blue-500 font-bold whitespace-nowrap hover:bg-blue-50 dark:hover:bg-blue-900/20">
                      <FileText size={13} /> Upload File
                      <input ref={bankFileRef} type="file" className="hidden" accept=".txt,.csv,.pdf,image/*" onChange={handleBankFileUpload} />
                    </label>
                  </div>
                  {/* Show numbers found in uploaded file — highlight the matching one in green */}
                  {bankFileNumbers.length > 0 && (
                    <div className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2 space-y-1">
                      <span>Found {bankFileNumbers.length} number(s) in file:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {bankFileNumbers.map(n => {
                          const isMatch = empId !== '' && n === empId;
                          const isSelected = form.bankTransactionId === n;
                          return (
                            <button key={n} type="button"
                              onClick={() => setForm(f => ({
                                ...f,
                                bankTransactionId: n,
                                verificationStatus: empId !== '' ? (n === empId ? 'auto' : 'manual_not_verified') : f.verificationStatus,
                              }))}
                              className={`inline-flex items-center gap-1 mx-0.5 px-2 py-1 rounded-lg font-mono font-bold border text-xs transition-all ${
                                isMatch
                                  ? 'bg-emerald-500 text-white border-emerald-500 ring-2 ring-emerald-300 shadow-md shadow-emerald-500/30'
                                  : isSelected
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-white border-gray-200 dark:border-slate-600 hover:border-blue-400'
                              }`}>
                              {isMatch && <CheckCircle2 size={12} />}
                              {n}
                              {isMatch && <span className="text-[10px] font-bold ml-0.5">MATCH</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Verification status — shows for both file-upload and manual entry */}
                {(effVerified || effNotVerified) && (
                  <div className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-bold ${effVerified ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
                    {effVerified ? <><CheckCircle2 size={16} /> ✅ Verified — Bank TXN ID matches Employee TXN ID</> : <><XCircle size={16} /> ❌ Not Verified — Bank TXN ID does not match Employee TXN ID</>}
                    {(autoMatch || form.verificationStatus === 'auto') && <span className="text-xs font-normal opacity-70 ml-1">(from file)</span>}
                    {manualTypedMatch && !autoMatch && form.verificationStatus !== 'auto' && <span className="text-xs font-normal opacity-70 ml-1">(manual entry)</span>}
                  </div>
                )}
                {/* Manual override buttons */}
                <div className="flex gap-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase self-center mr-1">Manual Override:</p>
                  <button type="button"
                    onClick={() => setForm(f => ({...f, verificationStatus: f.verificationStatus === 'manual_verified' ? '' : 'manual_verified'}))}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${form.verificationStatus === 'manual_verified' ? 'bg-emerald-500 text-white border-emerald-500' : 'border-emerald-300 text-emerald-600 hover:bg-emerald-50'}`}>
                    <CheckCircle2 size={12} /> Verified
                  </button>
                  <button type="button"
                    onClick={() => setForm(f => ({...f, verificationStatus: f.verificationStatus === 'manual_not_verified' ? '' : 'manual_not_verified'}))}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${form.verificationStatus === 'manual_not_verified' ? 'bg-red-500 text-white border-red-500' : 'border-red-300 text-red-600 hover:bg-red-50'}`}>
                    <XCircle size={12} /> Not Verified
                  </button>
                </div>
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
              <th className="px-4 py-3">Amount</th><th className="px-4 py-3">Payment</th><th className="px-4 py-3">Emp TXN ID</th>
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
                  <td className="px-4 py-3 font-mono text-xs">{inc.employeeTransactionId || '—'}</td>
                  <td className="px-4 py-3">
                    {(inc.verificationStatus || (inc.bankTransactionId && inc.employeeTransactionId)) ? (
                      inc.isVerified ? <span className="text-emerald-600 font-bold text-xs flex items-center gap-1"><CheckCircle2 size={14}/>Verified</span>
                      : <span className="text-red-500 font-bold text-xs flex items-center gap-1"><XCircle size={14}/>Not Verified</span>
                    ) : <span className="text-gray-400 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
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
