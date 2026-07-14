import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { IndianRupee, RefreshCw, Save, ChevronLeft, ChevronRight, Users, Percent, AlertCircle, CheckCircle2, XCircle, Settings, Loader2, Filter } from 'lucide-react';
import { cn } from '../lib/utils';
import { api } from '../services/api';
import { Contact } from '../types';

// ── helpers ─────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getPeriodDates(year: number, month: number) {
  // Period: 26th of `month` in `year` → 25th of next month
  const from = new Date(year, month, 26);
  const toMonth = month === 11 ? 0 : month + 1;
  const toYear = month === 11 ? year + 1 : year;
  const to = new Date(toYear, toMonth, 25);
  const toISO = (d: Date) => d.toISOString().slice(0, 10);
  return { fromDate: toISO(from), toDate: toISO(to) };
}

function periodLabel(year: number, month: number) {
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const { fromDate, toDate } = getPeriodDates(year, month);
  return `26 ${MONTHS[month]} ${year} – 25 ${MONTHS[month === 11 ? 0 : month + 1]} ${month === 11 ? year + 1 : year}`;
}

// ── types ────────────────────────────────────────────────────────────────────
interface SalaryRule { id: string; staffName: string; staffRole: string; percentage: number; }
interface SalaryRow { staffName: string; staffRole: string; contactCount: number; receiveTotal: number; percentage: number; salaryAmount: number; }
interface CalcResult { tele: SalaryRow[]; technical: SalaryRow[]; fromDate: string; toDate: string; }

// ── component ─────────────────────────────────────────────────────────────────
export default function SalarySection({ contacts = [] }: { contacts?: Contact[] }) {
  const now = new Date();
  // Default period = current month (26th of prev month to 25th of this month)
  const defaultMonth = now.getDate() >= 26 ? now.getMonth() : (now.getMonth() === 0 ? 11 : now.getMonth() - 1);
  const defaultYear = now.getDate() >= 26 ? now.getFullYear() : (now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear());

  const [periodMonth, setPeriodMonth] = useState(defaultMonth);
  const [periodYear, setPeriodYear] = useState(defaultYear);

  // salary rules (persisted)
  const [rules, setRules] = useState<SalaryRule[]>([]);
  const [rulesLoading, setRulesLoading] = useState(false);

  // calculation result
  const [result, setResult] = useState<CalcResult | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcError, setCalcError] = useState<string | null>(null);

  // per-row percentage overrides (keyed by staffName::staffRole)
  const [pctOverrides, setPctOverrides] = useState<Record<string, string>>({});

  // save feedback
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  // active tab
  const [tab, setTab] = useState<'calculate' | 'rules' | 'verified' | 'not_verified'>('calculate');

  // incomes data for verified/not-verified lists
  const [incomes, setIncomes] = useState<any[]>([]);
  const [incomesLoading, setIncomesLoading] = useState(false);
  const [incomesFilterRole, setIncomesFilterRole] = useState<string>('');

  // new rule form
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<'TeleCalling' | 'Technical'>('TeleCalling');
  const [newPct, setNewPct] = useState('');
  const [addingRule, setAddingRule] = useState(false);
  const [ruleError, setRuleError] = useState('');

  // ── fetch rules ──────────────────────────────────────────────────────────
  const loadRules = useCallback(async () => {
    setRulesLoading(true);
    try {
      const data = await api.getSalaryRules();
      setRules(data || []);
    } catch { /* ignore */ }
    finally { setRulesLoading(false); }
  }, []);

  useEffect(() => { loadRules(); }, [loadRules]);

  // ── fetch incomes ────────────────────────────────────────────────────────
  const loadIncomes = useCallback(async () => {
    setIncomesLoading(true);
    try {
      const data = await api.getIncomes();
      setIncomes(data || []);
    } catch { /* ignore */ }
    finally { setIncomesLoading(false); }
  }, []);

  useEffect(() => {
    if (tab === 'verified' || tab === 'not_verified') loadIncomes();
  }, [tab]); // eslint-disable-line

  // ── calculate salary ─────────────────────────────────────────────────────
  const calculate = useCallback(async () => {
    setCalcLoading(true);
    setCalcError(null);
    try {
      const { fromDate, toDate } = getPeriodDates(periodYear, periodMonth);
      const data = await api.calculateSalary(fromDate, toDate);
      setResult(data);
      // Seed overrides from saved rules
      const init: Record<string, string> = {};
      [...(data.tele || []), ...(data.technical || [])].forEach((row: SalaryRow) => {
        const key = `${row.staffName}::${row.staffRole}`;
        const saved = rules.find(r => r.staffName === row.staffName && r.staffRole === row.staffRole);
        init[key] = String(saved?.percentage ?? row.percentage ?? 0);
      });
      setPctOverrides(init);
    } catch (e: any) {
      setCalcError(e.message || 'Failed to calculate salary.');
    } finally { setCalcLoading(false); }
  }, [periodYear, periodMonth, rules]);

  // Auto-calculate on mount + period change
  useEffect(() => { calculate(); }, [periodYear, periodMonth]); // eslint-disable-line

  // ── period navigation ────────────────────────────────────────────────────
  const prevPeriod = () => {
    if (periodMonth === 0) { setPeriodMonth(11); setPeriodYear(y => y - 1); }
    else setPeriodMonth(m => m - 1);
  };
  const nextPeriod = () => {
    if (periodMonth === 11) { setPeriodMonth(0); setPeriodYear(y => y + 1); }
    else setPeriodMonth(m => m + 1);
  };

  // ── save percentage override ──────────────────────────────────────────────
  const savePct = async (staffName: string, staffRole: string) => {
    const key = `${staffName}::${staffRole}`;
    const rule = rules.find(r => r.staffName === staffName && r.staffRole === staffRole);
    const pctVal = pctOverrides[key] !== undefined ? pctOverrides[key] : (rule ? String(rule.percentage) : '0');
    const pct = parseFloat(pctVal || '0');
    setSavingKey(key);
    try {
      const existing = rules.find(r => r.staffName === staffName && r.staffRole === staffRole);
      const saved = await api.upsertSalaryRule(staffName, staffRole, pct);
      if (existing) {
        setRules(prev => prev.map(r => r.id === existing.id ? { ...r, percentage: pct } : r));
      } else {
        setRules(prev => [...prev, saved]);
      }
      setSavedKey(key);
      setTimeout(() => setSavedKey(null), 2000);
    } catch { /* ignore */ }
    finally { setSavingKey(null); }
  };

  // ── computed rows with override percentages applied ───────────────────────
  const applyOverride = (rows: SalaryRow[]) =>
    rows.map(row => {
      const key = `${row.staffName}::${row.staffRole}`;
      const pct = parseFloat(pctOverrides[key] ?? String(row.percentage)) || 0;
      return { ...row, percentage: pct, salaryAmount: (row.receiveTotal * pct) / 100 };
    });

  const teleRows = applyOverride(result?.tele || []);
  const techRows = applyOverride(result?.technical || []);

  const totalTeleSalary = teleRows.reduce((s, r) => s + r.salaryAmount, 0);
  const totalTechSalary = techRows.reduce((s, r) => s + r.salaryAmount, 0);
  const totalSalary = totalTeleSalary + totalTechSalary;

  // ── add rule ─────────────────────────────────────────────────────────────
  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim()) { setRuleError('Staff name is required.'); return; }
    setAddingRule(true); setRuleError('');
    try {
      const saved = await api.upsertSalaryRule(newStaffName.trim(), newStaffRole, parseFloat(newPct) || 0);
      setRules(prev => {
        const idx = prev.findIndex(r => r.staffName === saved.staffName && r.staffRole === saved.staffRole);
        if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next; }
        return [...prev, saved];
      });
      setNewStaffName(''); setNewPct(''); setRuleError('');
    } catch (e: any) { setRuleError(e.message); }
    finally { setAddingRule(false); }
  };

  const handleDeleteRule = async (id: string) => {
    try { await api.deleteSalaryRule(id); setRules(prev => prev.filter(r => r.id !== id)); }
    catch { /* ignore */ }
  };

  // ── render table ──────────────────────────────────────────────────────────
  const renderTable = (rows: SalaryRow[], roleColor: string, roleLabel: string) => (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
      <div className={cn('px-6 py-3 flex items-center gap-2 border-b border-gray-100 dark:border-slate-800', roleColor)}>
        <Users size={15} className="opacity-80" />
        <span className="font-bold text-sm">{roleLabel} Staff</span>
        <span className="ml-auto text-xs font-medium opacity-75">{rows.length} employees</span>
      </div>
      {rows.length === 0 ? (
        <div className="py-10 text-center text-sm text-gray-400 dark:text-slate-500">
          No {roleLabel} contacts with receive amount in this period.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left" style={{ minWidth: 700 }}>
            <thead>
              <tr className="bg-gray-50/60 dark:bg-slate-800/60 text-[11px] uppercase tracking-wider font-bold text-gray-400 dark:text-slate-500">
                <th className="px-5 py-3">Staff Name</th>
                <th className="px-5 py-3 text-center">Contacts</th>
                <th className="px-5 py-3 text-right">Receive Total</th>
                <th className="px-5 py-3 text-center" style={{ minWidth: 160 }}>Percentage %</th>
                <th className="px-5 py-3 text-right">Salary Amount</th>
                <th className="px-5 py-3 text-center">Save</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
              {rows.map(row => {
                const key = `${row.staffName}::${row.staffRole}`;
                const isSaving = savingKey === key;
                const isSaved = savedKey === key;
                return (
                  <tr key={key} className="hover:bg-gray-50/40 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                          {row.staffName.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-bold text-sm text-gray-900 dark:text-white">{row.staffName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className="inline-flex items-center justify-center min-w-[28px] h-6 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-black px-2">
                        {row.contactCount}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-bold text-gray-800 dark:text-slate-200 text-sm">
                      {fmt(row.receiveTotal)}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 justify-center">
                        <div className="relative">
                          <input
                            type="number"
                            min="0" max="100" step="0.5"
                            value={pctOverrides[key] ?? String(row.percentage)}
                            onChange={e => setPctOverrides(prev => ({ ...prev, [key]: e.target.value }))}
                            className="w-24 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm font-bold text-gray-900 dark:text-white text-right focus:ring-2 focus:ring-primary/20 outline-none pr-7"
                          />
                          <Percent size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="font-black text-base text-emerald-600 dark:text-emerald-400">
                        {fmt(row.salaryAmount)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <button
                        onClick={() => savePct(row.staffName, row.staffRole)}
                        disabled={isSaving}
                        className={cn(
                          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                          isSaved
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600'
                            : 'bg-primary text-white hover:bg-primary/90 shadow-sm shadow-primary/20',
                          isSaving && 'opacity-60 cursor-not-allowed'
                        )}
                      >
                        {isSaving ? <Loader2 size={12} className="animate-spin" /> : isSaved ? <CheckCircle2 size={12} /> : <Save size={12} />}
                        {isSaved ? 'Saved' : 'Save'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50/80 dark:bg-slate-800/60 border-t border-gray-200 dark:border-slate-700">
                <td colSpan={2} className="px-5 py-3 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">{roleLabel} Total</td>
                <td className="px-5 py-3 text-right font-black text-gray-800 dark:text-slate-200 text-sm">
                  {fmt(rows.reduce((s, r) => s + r.receiveTotal, 0))}
                </td>
                <td />
                <td className="px-5 py-3 text-right font-black text-emerald-600 dark:text-emerald-400 text-base">
                  {fmt(rows.reduce((s, r) => s + r.salaryAmount, 0))}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header + tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <IndianRupee size={22} className="text-primary" /> Staff Salary Calculator
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            Monthly salary based on contacts created & receive amount. Period: 26th → 25th.
          </p>
        </div>
        <div className="flex gap-1 bg-gray-100 dark:bg-slate-800 p-1 rounded-xl flex-wrap">
          {(['calculate', 'rules', 'verified', 'not_verified'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'px-4 py-1.5 rounded-lg text-sm font-bold transition-all',
                tab === t ? 'bg-white dark:bg-slate-900 text-primary shadow-sm' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700'
              )}
            >
              {t === 'calculate' ? '📊 Calculate Salary' : t === 'rules' ? '⚙️ Salary Rules' : t === 'verified' ? '✅ Verified Amounts' : '❌ Not Verified'}
            </button>
          ))}
        </div>
      </div>

      {/* ── CALCULATE TAB ── */}
      {tab === 'calculate' && (
        <>
          {/* Period Picker */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-5">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button onClick={prevPeriod} className="p-2 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors">
                  <ChevronLeft size={18} className="text-gray-600 dark:text-slate-300" />
                </button>
                <div className="text-center">
                  <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">Salary Period</p>
                  <p className="text-base font-black text-gray-900 dark:text-white">{periodLabel(periodYear, periodMonth)}</p>
                </div>
                <button onClick={nextPeriod} className="p-2 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors">
                  <ChevronRight size={18} className="text-gray-600 dark:text-slate-300" />
                </button>
              </div>
              <button
                onClick={calculate}
                disabled={calcLoading}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-60"
              >
                <RefreshCw size={15} className={calcLoading ? 'animate-spin' : ''} />
                {calcLoading ? 'Calculating…' : 'Recalculate'}
              </button>
            </div>
          </div>

          {calcError && (
            <div className="flex items-center gap-3 px-4 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium">
              <AlertCircle size={16} />{calcError}
            </div>
          )}

          {/* Summary cards */}
          {result && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { label: 'TeleCalling Salary', value: totalTeleSalary, color: 'from-amber-500 to-orange-600', shadow: 'shadow-amber-500/20' },
                  { label: 'Technical Salary', value: totalTechSalary, color: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/20' },
                  { label: 'Total Salary Payout', value: totalSalary, color: 'from-violet-500 to-purple-600', shadow: 'shadow-violet-500/20' },
                ].map(card => (
                  <div key={card.label} className={cn('bg-gradient-to-br p-5 rounded-2xl shadow-lg text-white', card.color, card.shadow)}>
                    <p className="text-sm font-medium text-white/80 mb-1">{card.label}</p>
                    <p className="text-2xl font-black">{fmt(card.value)}</p>
                  </div>
                ))}
              </div>

              {/* TeleCalling table */}
              {renderTable(teleRows, 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300', 'TeleCalling')}

              {/* Technical table */}
              {renderTable(techRows, 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300', 'Technical')}
            </>
          )}

          {calcLoading && !result && (
            <div className="py-16 text-center text-gray-400 dark:text-slate-500 text-sm flex items-center justify-center gap-2">
              <Loader2 size={18} className="animate-spin" /> Loading salary data…
            </div>
          )}
        </>
      )}

      {/* ── RULES TAB ── */}
      {tab === 'rules' && (
        <div className="space-y-6">
          {/* Add rule form */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-6">
            <h3 className="font-bold text-sm text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Settings size={16} className="text-primary" /> Add / Update Salary Rule
            </h3>
            <form onSubmit={handleAddRule} className="flex flex-wrap gap-3 items-end">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Staff Name</label>
                <input
                  type="text" value={newStaffName} onChange={e => setNewStaffName(e.target.value)}
                  placeholder="e.g. Jaya" required
                  className="bg-gray-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none dark:text-white w-48"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Role</label>
                <select value={newStaffRole} onChange={e => setNewStaffRole(e.target.value as any)}
                  className="bg-gray-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none dark:text-white">
                  <option value="TeleCalling">TeleCalling</option>
                  <option value="Technical">Technical</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Percentage (%)</label>
                <div className="relative">
                  <input
                    type="number" value={newPct} onChange={e => setNewPct(e.target.value)}
                    min="0" max="100" step="0.5" placeholder="0" required
                    className="bg-gray-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 pr-8 text-sm focus:ring-2 focus:ring-primary/20 outline-none dark:text-white w-28 text-right"
                  />
                  <Percent size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
              </div>
              <button type="submit" disabled={addingRule}
                className="flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-60">
                {addingRule ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save Rule
              </button>
            </form>
            {ruleError && <p className="mt-2 text-xs text-red-500">{ruleError}</p>}
          </div>

          {/* Rules table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-3 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-gray-900 dark:text-white">Saved Salary Rules</h3>
              <button onClick={loadRules} disabled={rulesLoading}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors">
                <RefreshCw size={12} className={rulesLoading ? 'animate-spin' : ''} /> Refresh
              </button>
            </div>
            {rulesLoading ? (
              <div className="py-10 text-center text-sm text-gray-400">Loading rules…</div>
            ) : rules.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-400 dark:text-slate-500">
                No salary rules yet. Add one above to set default percentages.
              </div>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/60 dark:bg-slate-800/60 text-[11px] uppercase tracking-wider font-bold text-gray-400 dark:text-slate-500">
                    <th className="px-6 py-3">Staff Name</th>
                    <th className="px-6 py-3">Role</th>
                    <th className="px-6 py-3 text-right">Percentage</th>
                    <th className="px-6 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                  {rules.map(rule => (
                    <tr key={rule.id} className="hover:bg-gray-50/40 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-3 font-bold text-sm text-gray-900 dark:text-white">{rule.staffName}</td>
                      <td className="px-6 py-3">
                        <span className={cn('text-xs font-bold px-2.5 py-1 rounded-full',
                          rule.staffRole === 'TeleCalling' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                        )}>{rule.staffRole}</span>
                      </td>
                      <td className="px-6 py-3 text-right font-black text-primary text-base">{rule.percentage}%</td>
                      <td className="px-6 py-3 text-center">
                        <button onClick={() => handleDeleteRule(rule.id)}
                          className="text-xs text-red-500 hover:text-red-700 font-bold transition-colors px-3 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── VERIFIED / NOT VERIFIED TABS (from Contacts) ── */}
      {(tab === 'verified' || tab === 'not_verified') && (() => {
        const isVerifiedTab = tab === 'verified';
        const statusKey = isVerifiedTab ? 'verified' : 'not_verified';
        const filtered = contacts.filter(c => {
          if (c.contactVerificationStatus !== statusKey) return false;
          if (incomesFilterRole && incomesFilterRole === 'TeleCalling' && !(c.teleCallingStaff || '').trim()) return false;
          if (incomesFilterRole && incomesFilterRole === 'Technical' && !(c.technicalStaff || '').trim()) return false;
          return true;
        });
        const totalAmount = filtered.reduce((s, c) => s + (parseFloat(c.receiveAmount) || 0), 0);
        const staffMap: Record<string, { staffName: string; staffRole: string; contactCount: number; receiveTotal: number; contacts: typeof filtered }> = {};
        filtered.forEach(c => {
          const tele = (c.teleCallingStaff || '').trim();
          const tech = (c.technicalStaff || '').trim();
          if (tele) { const k = `${tele}::TeleCalling`; if (!staffMap[k]) staffMap[k] = { staffName: tele, staffRole: 'TeleCalling', contactCount: 0, receiveTotal: 0, contacts: [] }; staffMap[k].contactCount++; staffMap[k].receiveTotal += parseFloat(c.receiveAmount) || 0; staffMap[k].contacts.push(c); }
          if (tech) { const k = `${tech}::Technical`; if (!staffMap[k]) staffMap[k] = { staffName: tech, staffRole: 'Technical', contactCount: 0, receiveTotal: 0, contacts: [] }; staffMap[k].contactCount++; staffMap[k].receiveTotal += parseFloat(c.receiveAmount) || 0; staffMap[k].contacts.push(c); }
        });
        const allRows = Object.values(staffMap).sort((a, b) => b.receiveTotal - a.receiveTotal);
        const teleRows2 = allRows.filter(r => r.staffRole === 'TeleCalling');
        const techRows2 = allRows.filter(r => r.staffRole === 'Technical');
        const teleTotal2 = teleRows2.reduce((s, r) => s + r.receiveTotal, 0);
        const techTotal2 = techRows2.reduce((s, r) => s + r.receiveTotal, 0);
        const teleSal = teleRows2.reduce((s, r) => {
          const rule = rules.find(ru => ru.staffName === r.staffName && ru.staffRole === 'TeleCalling');
          const p = parseFloat(pctOverrides[`${r.staffName}::TeleCalling`] ?? String(rule?.percentage ?? '0')) || 0;
          return s + (r.receiveTotal * p) / 100;
        }, 0);
        const techSal = techRows2.reduce((s, r) => {
          const rule = rules.find(ru => ru.staffName === r.staffName && ru.staffRole === 'Technical');
          const p = parseFloat(pctOverrides[`${r.staffName}::Technical`] ?? String(rule?.percentage ?? '0')) || 0;
          return s + (r.receiveTotal * p) / 100;
        }, 0);

        const renderVTable = (rows: typeof allRows, roleColor: string, roleLabel: string) => (
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
            <div className={cn('px-6 py-3 flex items-center gap-2 border-b border-gray-100 dark:border-slate-800', roleColor)}>
              <Users size={15} className="opacity-80" /><span className="font-bold text-sm">{roleLabel} Staff</span>
              <span className="ml-auto text-xs font-medium opacity-75">{rows.length} employees</span>
            </div>
            {rows.length === 0 ? (<div className="py-10 text-center text-sm text-gray-400">No {roleLabel} contacts {isVerifiedTab ? 'verified' : 'not verified'}.</div>) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left" style={{ minWidth: 850 }}>
                  <thead><tr className="bg-gray-50/60 dark:bg-slate-800/60 text-[11px] uppercase tracking-wider font-bold text-gray-400 dark:text-slate-500">
                    <th className="px-5 py-3">Staff Name</th><th className="px-5 py-3 text-center">Contacts</th>
                    <th className="px-5 py-3 text-right">Receive Total (A)</th><th className="px-5 py-3 text-center" style={{minWidth:140}}>% (B)</th>
                    <th className="px-5 py-3 text-center">Calculation</th><th className="px-5 py-3 text-right">Salary = A×B÷100</th><th className="px-5 py-3 text-center">Save</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                    {rows.map(row => {
                      const k = `${row.staffName}::${row.staffRole}`;
                      const savedRule = rules.find(r => r.staffName === row.staffName && r.staffRole === row.staffRole);
                      const defaultPct = savedRule ? String(savedRule.percentage) : '0';
                      const p = parseFloat(pctOverrides[k] ?? defaultPct) || 0;
                      const sal = (row.receiveTotal * p) / 100;
                      const saving = savingKey === k;
                      const saved = savedKey === k;
                      return (<React.Fragment key={k}>
                        <tr className="hover:bg-gray-50/40 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="px-5 py-3.5"><div className="flex items-center gap-2.5"><div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">{row.staffName.charAt(0).toUpperCase()}</div><div><span className="font-bold text-sm text-gray-900 dark:text-white">{row.staffName}</span><p className="text-[10px] text-gray-400">{row.contacts.length} contact{row.contacts.length!==1?'s':''}</p></div></div></td>
                          <td className="px-5 py-3.5 text-center"><span className="inline-flex items-center justify-center min-w-[28px] h-6 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-black px-2">{row.contactCount}</span></td>
                          <td className="px-5 py-3.5 text-right font-bold text-gray-800 dark:text-slate-200 text-sm">{fmt(row.receiveTotal)}</td>
                          <td className="px-5 py-3.5"><div className="flex items-center gap-1.5 justify-center"><div className="relative"><input type="number" min="0" max="100" step="0.5" value={pctOverrides[k] ?? defaultPct} onChange={e=>setPctOverrides(pr=>({...pr,[k]:e.target.value}))} className="w-24 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm font-bold text-gray-900 dark:text-white text-right focus:ring-2 focus:ring-primary/20 outline-none pr-7" /><Percent size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" /></div></div></td>
                          <td className="px-5 py-3.5 text-center"><span className="text-[11px] font-mono font-bold text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">{fmt(row.receiveTotal)} × {p}%</span></td>
                          <td className="px-5 py-3.5 text-right"><span className="font-black text-base text-emerald-600 dark:text-emerald-400">{fmt(sal)}</span></td>
                          <td className="px-5 py-3.5 text-center"><button onClick={()=>savePct(row.staffName,row.staffRole)} disabled={saving} className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all',saved?'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600':'bg-primary text-white hover:bg-primary/90 shadow-sm shadow-primary/20',saving&&'opacity-60 cursor-not-allowed')}>{saving?<Loader2 size={12} className="animate-spin"/>:saved?<CheckCircle2 size={12}/>:<Save size={12}/>}{saved?'Saved':'Save'}</button></td>
                        </tr>
                        <tr><td colSpan={7} className="px-5 py-0"><details className="group"><summary className="text-[11px] font-bold text-primary cursor-pointer py-1.5 hover:underline">View {row.contacts.length} contact{row.contacts.length!==1?'s':''} →</summary><div className="pb-3 pt-1"><table className="w-full text-xs border border-gray-100 dark:border-slate-800 rounded-lg overflow-hidden"><thead><tr className="bg-gray-50 dark:bg-slate-800 text-[10px] uppercase text-gray-400 font-bold"><th className="px-3 py-2 text-left">CTN</th><th className="px-3 py-2 text-left">Customer</th><th className="px-3 py-2 text-left">TXN ID</th><th className="px-3 py-2 text-right">Receive Amt</th><th className="px-3 py-2 text-center">Status</th></tr></thead><tbody className="divide-y divide-gray-50 dark:divide-slate-800">{row.contacts.map(c=>(<tr key={c.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/20"><td className="px-3 py-1.5 font-bold text-primary">{c.ctn||'—'}</td><td className="px-3 py-1.5 text-gray-700 dark:text-slate-300">{c.customerName||'—'}</td><td className="px-3 py-1.5 font-mono text-gray-500">{c.transactionId||'—'}</td><td className="px-3 py-1.5 text-right font-bold">{c.receiveAmount?fmt(parseFloat(c.receiveAmount)||0):'—'}</td><td className="px-3 py-1.5 text-center">{c.contactVerificationStatus==='verified'?<span className="text-emerald-600 font-bold">✅</span>:<span className="text-red-500 font-bold">❌</span>}</td></tr>))}</tbody></table></div></details></td></tr>
                      </React.Fragment>);
                    })}
                  </tbody>
                  <tfoot><tr className="bg-gray-50/80 dark:bg-slate-800/60 border-t-2 border-gray-200 dark:border-slate-700">
                    <td colSpan={2} className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">{roleLabel} Total</td>
                    <td className="px-5 py-3 text-right font-black text-gray-800 dark:text-slate-200 text-sm">{fmt(rows.reduce((s,r)=>s+r.receiveTotal,0))}</td><td/><td/>
                    <td className="px-5 py-3 text-right font-black text-emerald-600 dark:text-emerald-400 text-base">
                      {fmt(rows.reduce((s, r) => {
                        const rule = rules.find(ru => ru.staffName === r.staffName && ru.staffRole === r.staffRole);
                        const p = parseFloat(pctOverrides[`${r.staffName}::${r.staffRole}`] ?? String(rule?.percentage ?? '0')) || 0;
                        return s + (r.receiveTotal * p) / 100;
                      }, 0))}
                    </td>
                    <td/>
                  </tr></tfoot>
                </table>
              </div>
            )}
          </div>
        );

        return (
          <div className="space-y-6">
            {/* How It Works */}
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/15 dark:to-blue-900/15 rounded-2xl p-5 border border-indigo-200 dark:border-indigo-800/50">
              <h3 className="text-sm font-black text-indigo-700 dark:text-indigo-300 mb-3 flex items-center gap-2">💡 How Salary Calculation Works</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {[
                  { step: '1', title: 'Account Verifies', desc: 'Upload file → Match TXN IDs → ✅/❌' },
                  { step: '2', title: 'Sum Receive Amount', desc: 'Total (A) = All verified receive amounts' },
                  { step: '3', title: 'Admin Sets %', desc: 'Percentage (B) = Set manually per staff' },
                  { step: '4', title: 'Salary = A × B ÷ 100', desc: 'e.g. ₹10,000 × 5% = ₹500' },
                ].map(s => (
                  <div key={s.step} className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-indigo-100 dark:border-slate-800 text-center">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Step {s.step}</p>
                    <p className="text-xs font-bold text-gray-700 dark:text-slate-300">{s.title}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'TeleCalling Amount', value: teleTotal2, sub: `${teleRows2.reduce((s,r)=>s+r.contactCount,0)} contacts`, color: 'from-amber-500 to-orange-600', shadow: 'shadow-amber-500/20' },
                { label: 'Technical Amount', value: techTotal2, sub: `${techRows2.reduce((s,r)=>s+r.contactCount,0)} contacts`, color: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/20' },
                { label: `Total ${isVerifiedTab?'Verified':'Not Verified'}`, value: totalAmount, sub: `${filtered.length} contacts`, color: isVerifiedTab?'from-violet-500 to-purple-600':'from-red-500 to-rose-600', shadow: isVerifiedTab?'shadow-violet-500/20':'shadow-red-500/20' },
                { label: 'Total Salary Payout', value: teleSal+techSal, sub: `Tele ${fmt(teleSal)} + Tech ${fmt(techSal)}`, color: 'from-cyan-500 to-blue-600', shadow: 'shadow-cyan-500/20' },
              ].map(card => (
                <div key={card.label} className={cn('bg-gradient-to-br p-4 rounded-2xl shadow-lg text-white', card.color, card.shadow)}>
                  <p className="text-[11px] font-medium text-white/70 mb-0.5">{card.label}</p>
                  <p className="text-xl font-black">{fmt(card.value)}</p>
                  <p className="text-[10px] text-white/50 mt-0.5">{card.sub}</p>
                </div>
              ))}
            </div>

            {/* Period + Filter */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-5">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <button onClick={prevPeriod} className="p-2 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"><ChevronLeft size={18} className="text-gray-600 dark:text-slate-300" /></button>
                  <div className="text-center"><p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">Salary Period</p><p className="text-base font-black text-gray-900 dark:text-white">{periodLabel(periodYear, periodMonth)}</p></div>
                  <button onClick={nextPeriod} className="p-2 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"><ChevronRight size={18} className="text-gray-600 dark:text-slate-300" /></button>
                </div>
                <div className="flex items-center gap-3"><Filter size={15} className="text-gray-400" />
                  <select value={incomesFilterRole} onChange={e=>setIncomesFilterRole(e.target.value)} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 outline-none shadow-sm"><option value="">All Roles</option><option value="TeleCalling">TeleCalling</option><option value="Technical">Technical</option></select>
                </div>
              </div>
            </div>

            {renderVTable(teleRows2, 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300', 'TeleCalling')}
            {renderVTable(techRows2, 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300', 'Technical')}

            {/* Grand Total Summary */}
            <div className="bg-gradient-to-r from-gray-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 rounded-2xl p-6 text-white border border-gray-700 dark:border-slate-700">
              <h3 className="text-sm font-bold text-white/70 uppercase tracking-wider mb-4">📋 Grand Total Summary</h3>
              <div className="space-y-2.5">
                {[
                  { label: 'TeleCalling Receive Total', value: fmt(teleTotal2), cls: '' },
                  { label: 'Technical Receive Total', value: fmt(techTotal2), cls: '' },
                  { label: 'Combined Receive Total', value: fmt(totalAmount), cls: '' },
                  { label: 'TeleCalling Salary (after %)', value: fmt(teleSal), cls: 'text-amber-300' },
                  { label: 'Technical Salary (after %)', value: fmt(techSal), cls: 'text-emerald-300' },
                ].map(r => (
                  <div key={r.label} className="flex justify-between items-center py-1.5 border-b border-white/10">
                    <span className={cn('text-sm', r.cls || 'text-white/70')}>{r.label}</span>
                    <span className={cn('font-bold text-sm', r.cls)}>{r.value}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-3 mt-2 border-t-2 border-white/20">
                  <span className="text-base font-black text-white">💰 Total Salary Payout</span>
                  <span className="text-2xl font-black text-emerald-400">{fmt(teleSal + techSal)}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

