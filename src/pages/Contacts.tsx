import React, { useState, useMemo } from 'react';
import * as Excel from 'exceljs';
import {
  Search, Filter, Plus, MoreVertical, Phone, MessageSquare, Mail, MapPin, Building2,
  ChevronLeft, ChevronRight, Download, Upload, Star, Trash2, Edit2, X,
  CheckCircle2, Users, Loader2, ImageIcon, Eye, AlertTriangle, Calendar,
  BarChart3, Percent, ChevronDown, ChevronUp
} from 'lucide-react';
import { generateMockContacts, serviceTypes, staff, branches, statuses, paymentStatuses } from '../mockData';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Contact } from '../types';
import { api } from '../services/api';
import {
  ROLE_PERMISSIONS, isFieldVisible, isFieldEditable,
  CTN_TO_REMARKS_FIELDS, CTN_TO_CURRENT_STATUS_FIELDS,
  SALARY_AMOUNT_FIELDS, TECHNICAL_SHARE_FIELDS, TELECALLING_SHARE_FIELDS,
  type AppRole,
} from '../permissions';

const ITEMS_PER_PAGE = 25;

interface ContactsProps {
  contacts: Contact[];
  setContacts: React.Dispatch<React.SetStateAction<Contact[]>>;
  user: any;
}

const toInputDate = (dateStr: string | undefined): string => {
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  try {
    const date = new Date(dateStr.replace(/-/g, ' '));
    if (isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const day = ('0' + date.getDate()).slice(-2);
    return `${year}-${month}-${day}`;
  } catch (e) { return ''; }
};

const fromInputDate = (dateStr: string | undefined): string => {
  if (!dateStr || /^\d{2}-[A-Za-z]{3}-\d{4}$/.test(dateStr)) return dateStr || '';
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    if (isNaN(date.getTime())) return dateStr || '';
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
  } catch (e) { return dateStr || ''; }
};

export default function Contacts({ contacts, setContacts, user }: ContactsProps) {
  const userRole: AppRole = (user?.role as AppRole) || 'User';
  const perms = ROLE_PERMISSIONS[userRole];

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [viewingContact, setViewingContact] = useState<Contact | null>(null);
  const [showToast, setShowToast] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [modalFormData, setModalFormData] = useState<Partial<Contact>>({});
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const [isUploadingScreenshot, setIsUploadingScreenshot] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [isDropdownManagerOpen, setIsDropdownManagerOpen] = useState(false);
  const [dropdownManagerTab, setDropdownManagerTab] = useState<'serviceTypes' | 'statuses' | 'teleCallingStaff' | 'technicalStaff' | 'branches' | 'paymentStatuses'>('serviceTypes');
  const [newDropdownItem, setNewDropdownItem] = useState('');
  // Duplicate warning state
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  // Transaction ID inline duplicate error
  const [txnIdError, setTxnIdError] = useState<string | null>(null);
  // CTN inline duplicate error
  const [ctnError, setCtnError] = useState<string | null>(null);

  // ── Admin Staff Filter state ──
  const [showStaffPanel, setShowStaffPanel] = useState(false);
  const [staffTypeFilter, setStaffTypeFilter] = useState<'All' | 'TeleCalling' | 'Technical'>('All');
  const [staffNameFilter, setStaffNameFilter] = useState('');
  const [bulkTechShare, setBulkTechShare] = useState('');
  const [bulkTeleShare, setBulkTeleShare] = useState('');
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  // Editable dropdown lists
  const loadList = (key: string, fallback: string[]) => {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : fallback; } catch { return fallback; }
  };
  const [customServiceTypes, setCustomServiceTypes] = useState<string[]>(() => loadList('aster_serviceTypes', serviceTypes));
  const [customStatuses, setCustomStatuses] = useState<string[]>(() => loadList('aster_statuses', statuses));
  const [customTeleCallingStaff, setCustomTeleCallingStaff] = useState<string[]>(() => loadList('aster_teleCallingStaff', staff));
  const [customTechnicalStaff, setCustomTechnicalStaff] = useState<string[]>(() => loadList('aster_technicalStaff', staff));
  const [customBranches, setCustomBranches] = useState<string[]>(() => loadList('aster_branches', branches));
  const [customPaymentStatuses, setCustomPaymentStatuses] = useState<string[]>(() => loadList('aster_paymentStatuses', paymentStatuses));
  const saveList = (key: string, list: string[]) => { try { localStorage.setItem(key, JSON.stringify(list)); } catch { } };

  const dropdownConfig: Record<typeof dropdownManagerTab, { label: string; list: string[]; setList: (l: string[]) => void; storageKey: string }> = {
    serviceTypes: { label: 'Service Types (Customer Requirement)', list: customServiceTypes, setList: (l) => { setCustomServiceTypes(l); saveList('aster_serviceTypes', l); }, storageKey: 'aster_serviceTypes' },
    statuses: { label: 'Current Status Options', list: customStatuses, setList: (l) => { setCustomStatuses(l); saveList('aster_statuses', l); }, storageKey: 'aster_statuses' },
    teleCallingStaff: { label: 'Tele Calling Staff', list: customTeleCallingStaff, setList: (l) => { setCustomTeleCallingStaff(l); saveList('aster_teleCallingStaff', l); }, storageKey: 'aster_teleCallingStaff' },
    technicalStaff: { label: 'Technical Staff', list: customTechnicalStaff, setList: (l) => { setCustomTechnicalStaff(l); saveList('aster_technicalStaff', l); }, storageKey: 'aster_technicalStaff' },
    branches: { label: 'Branches / Locations', list: customBranches, setList: (l) => { setCustomBranches(l); saveList('aster_branches', l); }, storageKey: 'aster_branches' },
    paymentStatuses: { label: 'Payment Status Options', list: customPaymentStatuses, setList: (l) => { setCustomPaymentStatuses(l); saveList('aster_paymentStatuses', l); }, storageKey: 'aster_paymentStatuses' },
  };

  const handleAddDropdownItem = () => {
    const trimmed = newDropdownItem.trim();
    if (!trimmed) return;
    const cfg = dropdownConfig[dropdownManagerTab];
    if (cfg.list.includes(trimmed)) { triggerToast('Item already exists', 'error'); return; }
    cfg.setList([...cfg.list, trimmed]);
    setNewDropdownItem('');
    triggerToast('Item added');
  };

  const handleRemoveDropdownItem = (item: string) => {
    const cfg = dropdownConfig[dropdownManagerTab];
    cfg.setList(cfg.list.filter(i => i !== item));
    triggerToast('Item removed');
  };

  const calculateAmounts = (data: Partial<Contact>) => {
    const receiveAmount = parseFloat(data.receiveAmount || '0') || 0;
    const techShare = parseFloat(data.technicalSharePercent || '0') || 0;
    const teleShare = parseFloat(data.teleCallingSharePercent || '0') || 0;
    const techSalary = (receiveAmount * techShare) / 100;
    const teleSalary = (receiveAmount * teleShare) / 100;
    const teleTotal = receiveAmount + teleSalary;
    const techTotal = teleTotal + techSalary;
    return {
      technicalSalaryAmount: techSalary.toFixed(2),
      teleCallingSalaryAmount: teleSalary.toFixed(2),
      teleTotalAmount: teleTotal.toFixed(2),
      technicalTotalAmount: techTotal.toFixed(2)
    };
  };

  const handleModalInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setModalFormData(prev => {
      let next = { ...prev, [name]: value };
      if (name === 'receiveAmount' && parseFloat(value || '0') > 0) {
        if (!next.technicalSharePercent || parseFloat(next.technicalSharePercent) === 0) next.technicalSharePercent = '10';
        if (!next.teleCallingSharePercent || parseFloat(next.teleCallingSharePercent) === 0) next.teleCallingSharePercent = '5';
      }
      if (['receiveAmount', 'technicalSharePercent', 'teleCallingSharePercent'].includes(name)) {
        const calculated = calculateAmounts(next);
        return { ...next, ...calculated };
      }
      return next;
    });
  };

  // Real-time CTN duplicate check against already-loaded contacts
  const handleCtnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setModalFormData(prev => ({ ...prev, ctn: value }));
    const trimmed = value.trim();
    if (!trimmed) {
      setCtnError(null);
      return;
    }
    const duplicate = contacts.find(
      c => (c.ctn || '').trim().toLowerCase() === trimmed.toLowerCase()
        && c.id !== editingContact?.id
    );
    if (duplicate) {
      setCtnError(`CTN "${trimmed}" is already used by "${duplicate.customerName || 'another contact'}".`);
    } else {
      setCtnError(null);
    }
  };

  // Real-time Transaction ID duplicate check against already-loaded contacts
  const handleTxnIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Run the normal input handler first
    setModalFormData(prev => ({ ...prev, transactionId: value }));
    const trimmed = value.trim();
    if (!trimmed) {
      setTxnIdError(null);
      return;
    }
    // Find a contact with the same transaction ID, ignoring the one currently being edited
    const duplicate = contacts.find(
      c => (c.transactionId || '').trim().toLowerCase() === trimmed.toLowerCase()
        && c.id !== editingContact?.id
    );
    if (duplicate) {
      setTxnIdError(`Transaction ID "${trimmed}" is already used by "${duplicate.customerName || 'another contact'}".`);
    } else {
      setTxnIdError(null);
    }
  };


  const getCellValue = (colNames: string[], row: any[], headers: string[], occurrence = 1) => {
    let count = 0;
    const colIndex = headers.findIndex((h: string) => {
      const isMatch = colNames.some(name => h === name.toLowerCase().trim());
      if (isMatch) { count++; return count === occurrence; }
      return false;
    });
    return colIndex !== -1 ? String(row[colIndex] || '') : '';
  };

  // Parse a date string like "26-Jan-2026" or "2026-01-26" to a Date object
  const parseContactDate = (dateStr: string | undefined): Date | null => {
    if (!dateStr) return null;
    // Already ISO format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return new Date(dateStr);
    // "26-Jan-2026" format
    try {
      const [day, mon, year] = dateStr.split('-');
      const d = new Date(`${mon} ${day} ${year}`);
      return isNaN(d.getTime()) ? null : d;
    } catch { return null; }
  };

  // ── Admin Staff Stats (computed from all contacts) ──
  const staffStats = useMemo(() => {
    if (userRole !== 'Admin') return { teleStaff: [], techStaff: [] };
    const teleMap: Record<string, { name: string; created: number; edited: number; total: number }> = {};
    const techMap: Record<string, { name: string; created: number; edited: number; total: number }> = {};
    contacts.forEach(c => {
      const tele = (c.teleCallingStaff || '').trim();
      const tech = (c.technicalStaff || '').trim();
      if (tele) {
        if (!teleMap[tele]) teleMap[tele] = { name: tele, created: 0, edited: 0, total: 0 };
        teleMap[tele].total++;
        if (c.entryLeads === 'New') teleMap[tele].created++;
        if (c.entryLeads === 'Re_Entry') teleMap[tele].edited++;
      }
      if (tech) {
        if (!techMap[tech]) techMap[tech] = { name: tech, created: 0, edited: 0, total: 0 };
        techMap[tech].total++;
        if (c.entryLeads === 'New') techMap[tech].created++;
        if (c.entryLeads === 'Re_Entry') techMap[tech].edited++;
      }
    });
    return {
      teleStaff: Object.values(teleMap).sort((a, b) => b.total - a.total),
      techStaff: Object.values(techMap).sort((a, b) => b.total - a.total),
    };
  }, [contacts, userRole]);

  // Bulk share % update handler
  const handleBulkShareUpdate = async () => {
    const techVal = bulkTechShare.trim();
    const teleVal = bulkTeleShare.trim();
    if (!techVal && !teleVal) return;
    setIsBulkUpdating(true);
    try {
      // Determine which contacts to update based on staff filters
      let targets = [...contacts];
      if (staffTypeFilter === 'TeleCalling' && staffNameFilter) {
        targets = targets.filter(c => (c.teleCallingStaff || '').trim() === staffNameFilter);
      } else if (staffTypeFilter === 'Technical' && staffNameFilter) {
        targets = targets.filter(c => (c.technicalStaff || '').trim() === staffNameFilter);
      } else if (staffTypeFilter === 'TeleCalling') {
        targets = targets.filter(c => (c.teleCallingStaff || '').trim());
      } else if (staffTypeFilter === 'Technical') {
        targets = targets.filter(c => (c.technicalStaff || '').trim());
      }
      let updated = 0;
      for (const contact of targets) {
        const patch: Partial<Contact> = {};
        if (techVal) patch.technicalSharePercent = techVal;
        if (teleVal) patch.teleCallingSharePercent = teleVal;
        // Recalculate amounts
        const recvAmt = parseFloat(contact.receiveAmount || '0') || 0;
        const ts = parseFloat(techVal || contact.technicalSharePercent || '0') || 0;
        const tl = parseFloat(teleVal || contact.teleCallingSharePercent || '0') || 0;
        patch.technicalSalaryAmount = ((recvAmt * ts) / 100).toFixed(2);
        patch.teleCallingSalaryAmount = ((recvAmt * tl) / 100).toFixed(2);
        patch.teleTotalAmount = (recvAmt + parseFloat(patch.teleCallingSalaryAmount)).toFixed(2);
        patch.technicalTotalAmount = (parseFloat(patch.teleTotalAmount) + parseFloat(patch.technicalSalaryAmount)).toFixed(2);
        try {
          const updatedContact = await api.updateContact(contact.id, patch);
          setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, ...updatedContact } : c));
          updated++;
        } catch { /* skip failures */ }
      }
      triggerToast(`Updated share % for ${updated} contact(s)`);
      setBulkTechShare('');
      setBulkTeleShare('');
    } catch (err) {
      triggerToast('Failed to update share %', 'error');
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const filteredContacts = useMemo(() => {
    const query = (searchQuery || '').toLowerCase().trim();
    const fromDate = dateFrom ? new Date(dateFrom) : null;
    const toDate = dateTo ? new Date(dateTo + 'T23:59:59') : null;

    return contacts.filter(contact => {
      // ── Staff type/name filter (Admin only) ──
      if (userRole === 'Admin' && staffTypeFilter !== 'All') {
        if (staffTypeFilter === 'TeleCalling') {
          if (staffNameFilter && (contact.teleCallingStaff || '').trim() !== staffNameFilter) return false;
          if (!staffNameFilter && !(contact.teleCallingStaff || '').trim()) return false;
        } else if (staffTypeFilter === 'Technical') {
          if (staffNameFilter && (contact.technicalStaff || '').trim() !== staffNameFilter) return false;
          if (!staffNameFilter && !(contact.technicalStaff || '').trim()) return false;
        }
      }
      // ── Date range filter ──
      if (fromDate || toDate) {
        const contactDate = parseContactDate(contact.date);
        if (!contactDate) return false;
        if (fromDate && contactDate < fromDate) return false;
        if (toDate && contactDate > toDate) return false;
      }
      // ── Text search ──
      if (!query) return true;
      const s = (v: any) => String(v || '').toLowerCase();
      return (
        s(contact.ctn).includes(query) ||
        s(contact.customerName).includes(query) ||
        s(contact.customerContactNumber).includes(query) ||
        s(contact.orderNumber).includes(query) ||
        s(contact.teleCallingStaff).includes(query) ||
        s(contact.technicalStaff).includes(query) ||
        s(contact.date).includes(query) ||
        s(contact.claimApplyDate).includes(query) ||
        s(contact.followUpDate).includes(query) ||
        s(contact.receiveDate).includes(query) ||
        s(contact.technicalPaidDate).includes(query) ||
        s(contact.teleCallingPaidDate).includes(query) ||
        s(contact.entryLeads).includes(query) ||
        s(contact.currentStatus).includes(query) ||
        s(contact.customerRequirement).includes(query) ||
        s(contact.detailsNotes).includes(query) ||
        s(contact.remarks).includes(query) ||
        s(contact.technicalRemarks).includes(query) ||
        s(contact.teleCallingRemarks).includes(query) ||
        s(contact.serviceCharges).includes(query) ||
        s(contact.paymentStatus).includes(query) ||
        s(contact.pdfFileSend).includes(query) ||
        s(contact.receiveAmount).includes(query) ||
        s(contact.transactionId).includes(query) ||
        s(contact.technicalSharePercent).includes(query) ||
        s(contact.technicalSalaryAmount).includes(query) ||
        s(contact.technicalTotalAmount).includes(query) ||
        s(contact.teleCallingSharePercent).includes(query) ||
        s(contact.teleCallingSalaryAmount).includes(query) ||
        s(contact.teleTotalAmount).includes(query)
      );
    });
  }, [searchQuery, contacts, dateFrom, dateTo, staffTypeFilter, staffNameFilter, userRole]);

  const totalPages = Math.ceil(filteredContacts.length / ITEMS_PER_PAGE);
  const paginatedContacts = filteredContacts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleAddContact = () => {
    setEditingContact(null);
    setDuplicateWarning(null);
    setTxnIdError(null);
    setCtnError(null);
    setModalFormData({
      entryLeads: 'New',
      currentStatus: 'New',
      paymentStatus: 'Full Paid',
      date: new Date().toISOString().split('T')[0],
      receiveAmount: '0',
      technicalSharePercent: '10',
      teleCallingSharePercent: '5',
      technicalSalaryAmount: '0',
      teleCallingSalaryAmount: '0',
      teleTotalAmount: '0',
      technicalTotalAmount: '0'
    });
    setIsModalOpen(true);
  };

  const handleEditContact = (contact: Contact) => {
    setEditingContact(contact);
    setViewingContact(null);
    setDuplicateWarning(null);
    setTxnIdError(null);
    setCtnError(null);
    setModalFormData({

      ...contact,
      date: toInputDate(contact.date),
      claimApplyDate: toInputDate(contact.claimApplyDate),
      followUpDate: toInputDate(contact.followUpDate),
      receiveDate: toInputDate(contact.receiveDate),
      technicalPaidDate: toInputDate(contact.technicalPaidDate),
      teleCallingPaidDate: toInputDate(contact.teleCallingPaidDate),
    });
    setIsModalOpen(true);
  };

  const handleViewContact = (contact: Contact) => {
    setViewingContact(contact);
    setEditingContact(null);
    setDuplicateWarning(null);
    setModalFormData({
      ...contact,
      date: toInputDate(contact.date),
      claimApplyDate: toInputDate(contact.claimApplyDate),
      followUpDate: toInputDate(contact.followUpDate),
      receiveDate: toInputDate(contact.receiveDate),
      technicalPaidDate: toInputDate(contact.technicalPaidDate),
      teleCallingPaidDate: toInputDate(contact.teleCallingPaidDate),
    });
    setIsModalOpen(true);
  };

  const handleDeleteContact = async (id: string) => {
    try {
      await api.deleteContact(id);
      setContacts(prev => prev.filter(c => c.id !== id));
      try {
        await api.logActivity({
          userId: user.id, userName: user.name, userEmail: user.email,
          action: 'contact_deleted',
          details: `Deleted contact ID: ${id}`,
        });
      } catch (logErr) {
        console.warn('Activity logging skipped:', logErr);
      }
      triggerToast('Contact deleted successfully');
    } catch (error) {
      console.error('Failed to delete contact:', error);
      triggerToast('Failed to delete contact', 'error');
    }
  };

  const triggerToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setShowToast(msg);
    setToastType(type);
    setTimeout(() => setShowToast(null), 4000);
  };

  const downloadTemplate = async () => {
    const headers = ['ORDER NUMBER', 'ENTRY LEADS', 'CTN', 'DATE', 'TELE CALLING STAFF', 'TECHNICAL STAFF', 'CUSTOMER CONTACTS NUMBER', 'CUSTOMER NAME', 'CUSTOMER REQURMENT', 'CURRENT STATUS', 'DETAILS & NOTES', 'CLAIM APPLY DATE', 'FOLLOW UP DATE', 'SERVICES CHARGES', 'PAYMENT STATUS', 'PDF FILE SEND', 'RECIVE AMOUNT', 'TRANSACTION ID', 'RECIVE DATE', 'REMARKS', 'TECHNICAL SHARE (%)', 'SALARY AMOUNT', 'PAID DATE', 'REMARKS', 'TELECALLING SHARE (%)', 'SALARY AMOUNT', 'PAID DATE', 'REMARKS', 'TELE TOTAL AMOUNT', 'TECHNICAL TOTAL AMOUNT'];
    const data = [headers, ['ORD-1001', 'New', 'PT 26 0651', '26-Jan-2026', 'Jaya', 'ERD_Kowsalya', '9876543210', 'Ravi Kumar', 'F31 Advance', 'New', '', '26-Jan-2026', '', '500', 'Full Paid', 'Yes', '500', 'T123456', '26-Jan-2026', '', '10', '500', '26-Jan-2026', 'Send Accounts Group', '5', '200', '26-Jan-2026', '', '700', '1200']];
    const workbook = new Excel.Workbook();
    const worksheet = workbook.addWorksheet('Template');
    worksheet.addRows(data);
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'contacts_template.xlsx';
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const downloadCurrentContacts = async () => {
    const headers = ['ORDER NUMBER', 'ENTRY LEADS', 'CTN', 'DATE', 'TELE CALLING STAFF', 'TECHNICAL STAFF', 'CUSTOMER CONTACTS NUMBER', 'CUSTOMER NAME', 'CUSTOMER REQURMENT', 'CURRENT STATUS', 'DETAILS & NOTES', 'CLAIM APPLY DATE', 'FOLLOW UP DATE', 'SERVICES CHARGES', 'PAYMENT STATUS', 'PDF FILE SEND', 'RECIVE AMOUNT', 'TRANSACTION ID', 'RECIVE DATE', 'REMARKS', 'TECHNICAL SHARE (%)', 'SALARY AMOUNT', 'PAID DATE', 'REMARKS', 'TELECALLING SHARE (%)', 'SALARY AMOUNT', 'PAID DATE', 'REMARKS', 'TELE TOTAL AMOUNT', 'TECHNICAL TOTAL AMOUNT'];
    const data = contacts.map(c => [c.orderNumber, c.entryLeads, c.ctn, c.date, c.teleCallingStaff, c.technicalStaff, c.customerContactNumber, c.customerName, c.customerRequirement, c.currentStatus, c.detailsNotes, c.claimApplyDate, c.followUpDate, c.serviceCharges, c.paymentStatus, c.pdfFileSend, c.receiveAmount, c.transactionId, c.receiveDate, c.remarks, c.technicalSharePercent, c.technicalSalaryAmount, c.technicalPaidDate, c.technicalRemarks, c.teleCallingSharePercent, c.teleCallingSalaryAmount, c.teleCallingPaidDate, c.teleCallingRemarks, c.teleTotalAmount, c.technicalTotalAmount]);
    const workbook = new Excel.Workbook();
    const worksheet = workbook.addWorksheet('Contacts');
    worksheet.addRows([headers, ...data]);
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'current_contacts.xlsx';
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const handleBulkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      setIsBulkUploading(true);
      try {
        let newContacts: Contact[] = [];
        const buffer = event.target?.result as ArrayBuffer;

        if (file.name.endsWith('.json')) {
          const content = new TextDecoder().decode(buffer);
          newContacts = JSON.parse(content);
        } else {
          const workbook = new Excel.Workbook();
          const formatDate = (d: Date) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');

          if (!file.name.endsWith('.csv')) {
            await workbook.xlsx.load(buffer);
          }

          const worksheet = workbook.worksheets[0];
          if (!worksheet) { triggerToast('No worksheet found.', 'error'); setIsBulkUploading(false); return; }

          const jsonData: any[][] = [];
          worksheet.eachRow((row: any) => {
            const formattedRow = row.values.slice(1).map((cell: any) => {
              if (cell === null || cell === undefined) return '';
              if (cell instanceof Date) return formatDate(cell);
              if (typeof cell === 'object') {
                if ('text' in cell) return cell.text || '';
                if ('result' in cell) {
                  const result = (cell as any).result;
                  if (result instanceof Date) return formatDate(result);
                  if (typeof result === 'object' && result !== null && 'error' in result) return result.error || '';
                  return String(result || '');
                }
                return JSON.stringify(cell);
              }
              return String(cell);
            });
            jsonData.push(formattedRow);
          });

          if (jsonData.length > 0) {
            const headers = jsonData[0].map((h: any) => String(h || '').toLowerCase().trim());
            newContacts = jsonData.slice(1).filter(row => {
              const hasCustomerName = getCellValue(['CUSTOMER NAME', 'NAME'], row, headers).trim() !== '';
              const hasContactNumber = getCellValue(['CUSTOMER CONTACTS NUMBER', 'PHONE NUMBER', 'PHONE', 'CONTACT NO'], row, headers).trim() !== '';
              return hasCustomerName || hasContactNumber;
            }).map((row: any[], index) => {
              const get = (colNames: string[], occurrence = 1) => getCellValue(colNames, row, headers, occurrence);
              return {
                id: `c-bulk-${Date.now()}-${index}`,
                orderNumber: get(['ORDER NUMBER', 'ORDER NO']),
                entryLeads: get(['ENTRY LEADS', 'ENTRY TYPE', 'LEADS']),
                ctn: get(['CTN', 'REFERENCE ID']),
                date: get(['DATE', 'CREATED DATE']),
                teleCallingStaff: get(['TELE CALLING STAFF', 'CREATED BY', 'STAFF']),
                technicalStaff: get(['TECHNICAL STAFF', 'BRANCH / LOCATION', 'BRANCH', 'LOCATION']),
                customerContactNumber: get(['CUSTOMER CONTACTS NUMBER', 'PHONE NUMBER', 'PHONE', 'CONTACT NO']),
                customerName: get(['CUSTOMER NAME', 'NAME']),
                customerRequirement: get(['CUSTOMER REQURMENT', 'SERVICE TYPE', 'REQUIREMENT']),
                currentStatus: get(['CURRENT STATUS', 'STATUS']),
                detailsNotes: get(['DETAILS & NOTES', 'NOTES / REMARKS', 'NOTES']),
                claimApplyDate: get(['CLAIM APPLY DATE']),
                followUpDate: get(['FOLLOW UP DATE']),
                serviceCharges: get(['SERVICES CHARGES', 'TOTAL AMOUNT', 'CHARGES']),
                paymentStatus: get(['PAYMENT STATUS']),
                pdfFileSend: get(['PDF FILE SEND']),
                receiveAmount: get(['RECIVE AMOUNT', 'PAID AMOUNT', 'REC AMOUNT']),
                transactionId: get(['TRANSACTION ID']),
                receiveDate: get(['RECIVE DATE', 'PAYMENT DATE', 'REC DATE']),
                remarks: get(['REMARKS']),
                technicalSharePercent: get(['TECHNICAL SHARE (%)']),
                technicalSalaryAmount: get(['SALARY AMOUNT'], 1),
                technicalPaidDate: get(['PAID DATE'], 1),
                technicalRemarks: get(['REMARKS'], 2),
                teleCallingSharePercent: get(['TELECALLING SHARE (%)']),
                teleCallingSalaryAmount: get(['SALARY AMOUNT'], 2),
                teleCallingPaidDate: get(['PAID DATE'], 2),
                teleCallingRemarks: get(['REMARKS'], 3),
                teleTotalAmount: get(['TELE TOTAL AMOUNT']),
                technicalTotalAmount: get(['TECHNICAL TOTAL AMOUNT']),
                isFavorite: false,
              } as any;
            });
          }
        }

        if (newContacts.length > 0) {
          const result = await api.bulkCreateContacts(newContacts);
          // Server now returns { contacts, inserted, skipped, message }
          // but for safety fall back to treating result as an array (legacy)
          const createdContacts = Array.isArray(result) ? result : (result as any).contacts ?? [];
          const skipped = Array.isArray(result) ? 0 : (result as any).skipped ?? 0;
          const serverMsg = Array.isArray(result) ? null : (result as any).message ?? null;
          setContacts(prev => [...createdContacts, ...prev]);
          triggerToast(serverMsg || (skipped > 0
            ? `Imported ${createdContacts.length} contacts. Skipped ${skipped} duplicate(s).`
            : `Successfully imported ${createdContacts.length} contacts!`
          ));
        } else {
          triggerToast('No valid contacts found in file.', 'error');
        }
      } catch (error) {
        console.error('Error parsing or uploading file:', error);
        triggerToast('Failed to import contacts. Please check the format and try again.', 'error');
      } finally {
        setIsBulkUploading(false);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingScreenshot(true);
    try {
      const result = await api.uploadScreenshot(file);
      setModalFormData(prev => ({ ...prev, screenShotImage: result.url }));
      triggerToast('Screenshot uploaded successfully');
    } catch (error) {
      triggerToast('Failed to upload screenshot', 'error');
    } finally {
      setIsUploadingScreenshot(false);
      e.target.value = '';
    }
  };

  const handleDeleteScreenshot = () => {
    setModalFormData(prev => ({ ...prev, screenShotImage: '' }));
    triggerToast('Screenshot removed');
  };

  const handleToggleFavorite = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const contact = contacts.find(c => c.id === id);
    if (!contact) return;
    try {
      const updatedFields = await api.toggleFavorite(id, !contact.isFavorite);
      setContacts(prev => prev.map(c => c.id === id ? { ...c, ...updatedFields } : c));
      triggerToast('Favorite status updated');
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  const handleSelectAll = () => {
    const allOnPageIds = paginatedContacts.map(c => c.id);
    const areAllSelected = allOnPageIds.every(id => selectedIds.has(id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (areAllSelected) { allOnPageIds.forEach(id => next.delete(id)); }
      else { allOnPageIds.forEach(id => next.add(id)); }
      return next;
    });
  };

  const handleBulkDelete = async () => {
    try {
      const idsToDelete = Array.from(selectedIds) as string[];
      await api.bulkDeleteContacts(idsToDelete);
      setContacts(prev => prev.filter(c => !selectedIds.has(c.id)));
      setSelectedIds(new Set());
      triggerToast('Selected contacts deleted successfully');
    } catch (error) {
      console.error('Failed to bulk delete:', error);
      triggerToast('Failed to delete selected contacts', 'error');
    }
  };

  const handleSaveContact = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Prevent duplicate submission from rapid double-clicks
    if (isSubmitting) return;
    setDuplicateWarning(null);
    // Block save if CTN is a duplicate
    if (ctnError) return;
    // Block save if Transaction ID is a duplicate
    if (txnIdError) return;
    setIsSubmitting(true);


    const contactData: Partial<Contact> = {
      ...modalFormData,
      date: fromInputDate(modalFormData.date),
      claimApplyDate: fromInputDate(modalFormData.claimApplyDate),
      followUpDate: fromInputDate(modalFormData.followUpDate),
      receiveDate: fromInputDate(modalFormData.receiveDate),
      technicalPaidDate: fromInputDate(modalFormData.technicalPaidDate),
      teleCallingPaidDate: fromInputDate(modalFormData.teleCallingPaidDate),
    };
    contactData.isFavorite = editingContact?.isFavorite || false;

    try {
      if (editingContact) {
        const updatedContact = await api.updateContact(editingContact.id, contactData);
        setContacts(prev => prev.map(c => c.id === editingContact.id ? updatedContact : c));
        try {
          await api.logActivity({
            userId: user.id, userName: user.name, userEmail: user.email,
            action: 'contact_updated',
            details: `Updated contact: ${contactData.customerName} (CTN: ${contactData.ctn || 'N/A'})`,
          });
        } catch (logErr) {
          console.warn('Activity logging skipped:', logErr);
        }
        triggerToast('Contact updated successfully');
      } else {
        const createdContact = await api.createContact(contactData);
        setContacts(prev => [createdContact, ...prev]);
        try {
          await api.logActivity({
            userId: user.id, userName: user.name, userEmail: user.email,
            action: 'contact_created',
            details: `Created contact: ${contactData.customerName} (CTN: ${contactData.ctn || 'N/A'})`,
          });
        } catch (logErr) {
          console.warn('Activity logging skipped:', logErr);
        }
        triggerToast('Lead created successfully');
      }
      setCurrentPage(1);
      setIsModalOpen(false);
      setTxnIdError(null);
      setCtnError(null);
    } catch (error: any) {
      console.error('Failed to save contact:', error);
      // Handle duplicate detection (409 from server)
      if (error.message && error.message.includes('Duplicate')) {
        setDuplicateWarning(error.message);
      } else {
        triggerToast(error.message || 'Failed to save contact', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPageNumbers = () => {
    if (totalPages <= 7) return [...Array(totalPages)].map((_, i) => i + 1);
    if (currentPage <= 4) return [1, 2, 3, 4, 5, '...', totalPages];
    if (currentPage > totalPages - 4) return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  };
  const pageNumbers = getPageNumbers();

  // ── Field visibility helpers ───────────────────────────────────────────────
  const fv = (fieldName: string) => isFieldVisible(fieldName, userRole);
  const fe = (fieldName: string) => !viewingContact && isFieldEditable(fieldName, userRole);

  // ── Section-level visibility guards (robust: checks group membership directly) ──
  // These avoid false negatives from isFieldVisible when permissions.ts field lists differ
  const showBasicSection = perms.visibleFields.includes('ctn_to_remarks') || perms.visibleFields.includes('ctn_to_current_status');
  const showSalarySection = perms.visibleFields.includes('salary_amount');
  const showTechnicalSection = perms.visibleFields.includes('technical_share');
  const showTeleCallingSection = perms.visibleFields.includes('telecalling_share');
  const showScreenshotSection = perms.visibleFields.includes('screenshot');

  // Input class helper
  const inputCls = (fieldName: string) => cn(
    "w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none dark:text-white",
    !fe(fieldName) && "opacity-70 cursor-not-allowed bg-gray-100 dark:bg-slate-700"
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Contacts</h1>
          <p className="text-gray-500 dark:text-slate-400 mt-1">Manage and organize your lead directory.</p>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 md:flex-wrap md:gap-3 shrink-0">
          {userRole === 'Admin' && (
            <>
              <button onClick={() => setIsDropdownManagerOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-sm font-bold text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all shadow-sm">
                <Filter size={16} /> Manage Dropdowns
              </button>
              <button onClick={downloadCurrentContacts} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-sm font-bold text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all shadow-sm">
                <Download size={16} /> Download
              </button>
              <button onClick={downloadTemplate} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-sm font-bold text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all shadow-sm">
                <Download size={16} /> Template
              </button>
              <label className={cn("flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-sm font-bold text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all shadow-sm", isBulkUploading ? "cursor-wait opacity-70" : "cursor-pointer")}>
                {isBulkUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                {isBulkUploading ? 'Uploading...' : 'Bulk Upload'}
                <input type="file" className="hidden" accept=".csv,.json,.xlsx,.xls" onChange={handleBulkUpload} disabled={isBulkUploading} />
              </label>
            </>
          )}
          {perms.canCreateContact && (
            <button onClick={handleAddContact} className="flex items-center gap-2 px-4 py-2 bg-primary rounded-xl text-sm font-bold text-white hover:bg-primary/90 transition-all shadow-md shadow-primary/20">
              <Plus size={18} /> Add New Lead
            </button>
          )}
        </div>
      </header>

      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={cn("fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border",
              toastType === 'error'
                ? "bg-red-900 text-white border-white/10"
                : "bg-gray-900 text-white border-white/10"
            )}
          >
            {toastType === 'error' ? <AlertTriangle size={18} className="text-red-400" /> : <CheckCircle2 size={18} className="text-primary" />}
            <span className="text-sm font-bold tracking-tight">{showToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 flex flex-col gap-3">
        <div className="flex flex-col md:flex-row gap-3 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by name, CTN, phone, date, month, year, status, staff, amount..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/20 focus:bg-white dark:focus:bg-slate-800 transition-all outline-none dark:text-white"
            />
          </div>
          <button
            onClick={() => setShowDateFilter(v => !v)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap border',
              showDateFilter || dateFrom || dateTo
                ? 'bg-primary text-white border-primary shadow-md shadow-primary/20'
                : 'bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700'
            )}
          >
            <Calendar size={16} />
            Date Filter
            {(dateFrom || dateTo) && (
              <span className="ml-1 w-2 h-2 rounded-full bg-white inline-block" />
            )}
          </button>
          <AnimatePresence>
            {selectedIds.size > 0 && userRole === 'Admin' && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={handleBulkDelete}
                className="flex items-center gap-2 px-4 py-2.5 bg-red-600 rounded-xl text-sm font-bold text-white hover:bg-red-700 transition-all shadow-md shadow-red-500/20 whitespace-nowrap"
              >
                <Trash2 size={16} /> Delete Selected ({selectedIds.size})
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Date Range Filter Panel */}
        <AnimatePresence>
          {showDateFilter && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex flex-col sm:flex-row gap-3 pt-1 pb-1 items-end">
                <div className="flex-1 space-y-1">
                  <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">From Date</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={e => { setDateFrom(e.target.value); setCurrentPage(1); }}
                    className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none dark:text-white"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">To Date</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={e => { setDateTo(e.target.value); setCurrentPage(1); }}
                    className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none dark:text-white"
                  />
                </div>
                {(dateFrom || dateTo) && (
                  <button
                    onClick={() => { setDateFrom(''); setDateTo(''); setCurrentPage(1); }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800 transition-colors whitespace-nowrap"
                  >
                    <X size={14} /> Clear Filter
                  </button>
                )}
                {(dateFrom || dateTo) && (
                  <p className="text-xs text-gray-400 dark:text-slate-500 whitespace-nowrap pb-2">
                    {filteredContacts.length} result{filteredContacts.length !== 1 ? 's' : ''} found
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Admin Staff Performance Panel ── */}
      {userRole === 'Admin' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
          <button
            onClick={() => setShowStaffPanel(v => !v)}
            className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-md shadow-violet-500/20">
                <BarChart3 size={16} className="text-white" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-gray-900 dark:text-white">Staff Performance</p>
                <p className="text-[11px] text-gray-400 dark:text-slate-500">Filter by staff, view stats, set share %</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {staffTypeFilter !== 'All' && (
                <span className="px-2.5 py-1 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 text-[10px] font-bold">
                  {staffTypeFilter}{staffNameFilter ? `: ${staffNameFilter}` : ''}
                </span>
              )}
              {showStaffPanel ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
            </div>
          </button>

          <AnimatePresence>
            {showStaffPanel && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="px-5 pb-5 space-y-5 border-t border-gray-100 dark:border-slate-800 pt-4">
                  {/* Filter Controls */}
                  <div className="flex flex-col sm:flex-row gap-3 items-end">
                    <div className="flex-1 space-y-1">
                      <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Staff Type</label>
                      <select
                        value={staffTypeFilter}
                        onChange={e => { setStaffTypeFilter(e.target.value as any); setStaffNameFilter(''); setCurrentPage(1); }}
                        className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl py-2.5 px-3 text-sm font-medium focus:ring-2 focus:ring-violet-500/20 outline-none dark:text-white"
                      >
                        <option value="All">All Staff</option>
                        <option value="TeleCalling">TeleCalling Staff</option>
                        <option value="Technical">Technical Staff</option>
                      </select>
                    </div>
                    <div className="flex-1 space-y-1">
                      <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Staff Name</label>
                      <select
                        value={staffNameFilter}
                        onChange={e => { setStaffNameFilter(e.target.value); setCurrentPage(1); }}
                        disabled={staffTypeFilter === 'All'}
                        className={cn("w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl py-2.5 px-3 text-sm font-medium focus:ring-2 focus:ring-violet-500/20 outline-none dark:text-white", staffTypeFilter === 'All' && "opacity-50 cursor-not-allowed")}
                      >
                        <option value="">All Names</option>
                        {(staffTypeFilter === 'TeleCalling' ? staffStats.teleStaff : staffStats.techStaff).map(s => (
                          <option key={s.name} value={s.name}>{s.name} ({s.total})</option>
                        ))}
                      </select>
                    </div>
                    {(staffTypeFilter !== 'All' || staffNameFilter) && (
                      <button
                        onClick={() => { setStaffTypeFilter('All'); setStaffNameFilter(''); setCurrentPage(1); }}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800 transition-colors whitespace-nowrap"
                      >
                        <X size={14} /> Clear
                      </button>
                    )}
                    <p className="text-xs text-gray-400 dark:text-slate-500 whitespace-nowrap pb-1">
                      {filteredContacts.length} result{filteredContacts.length !== 1 ? 's' : ''}
                    </p>
                  </div>

                  {/* Staff Stats Table */}
                  {staffTypeFilter !== 'All' && (
                    <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl overflow-hidden border border-gray-100 dark:border-slate-700">
                      <div className="overflow-x-auto max-h-[200px] overflow-y-auto">
                        <table className="w-full text-left text-sm">
                          <thead className="sticky top-0 z-10">
                            <tr className="bg-gray-100 dark:bg-slate-800 text-[10px] uppercase tracking-wider font-bold text-gray-500 dark:text-slate-400">
                              <th className="px-4 py-2">Staff Name</th>
                              <th className="px-4 py-2 text-center">Total</th>
                              <th className="px-4 py-2 text-center">Created (New)</th>
                              <th className="px-4 py-2 text-center">Edited (Re_Entry)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                            {(staffTypeFilter === 'TeleCalling' ? staffStats.teleStaff : staffStats.techStaff).map(s => (
                              <tr
                                key={s.name}
                                onClick={() => { setStaffNameFilter(s.name); setCurrentPage(1); }}
                                className={cn(
                                  "cursor-pointer hover:bg-violet-50 dark:hover:bg-violet-900/10 transition-colors",
                                  staffNameFilter === s.name && "bg-violet-50 dark:bg-violet-900/20"
                                )}
                              >
                                <td className="px-4 py-2 font-bold text-gray-900 dark:text-white">{s.name}</td>
                                <td className="px-4 py-2 text-center">
                                  <span className="inline-flex items-center justify-center w-8 h-6 rounded-md bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs font-black">{s.total}</span>
                                </td>
                                <td className="px-4 py-2 text-center">
                                  <span className="inline-flex items-center justify-center w-8 h-6 rounded-md bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-black">{s.created}</span>
                                </td>
                                <td className="px-4 py-2 text-center">
                                  <span className="inline-flex items-center justify-center w-8 h-6 rounded-md bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-black">{s.edited}</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Bulk Share % Update */}
                  <div className="bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-900/10 dark:to-indigo-900/10 rounded-xl p-4 border border-violet-200 dark:border-violet-800/50">
                    <p className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Percent size={12} /> Set Share % for {staffTypeFilter !== 'All' ? (staffNameFilter || `all ${staffTypeFilter} staff`) : 'all'} contacts
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 items-end">
                      <div className="flex-1 space-y-1">
                        <label className="text-[11px] font-bold text-gray-500 dark:text-slate-400">Technical Share %</label>
                        <input
                          type="number" min="0" max="100" step="0.5"
                          value={bulkTechShare}
                          onChange={e => setBulkTechShare(e.target.value)}
                          placeholder="e.g. 10"
                          className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-violet-500/20 outline-none dark:text-white"
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <label className="text-[11px] font-bold text-gray-500 dark:text-slate-400">TeleCalling Share %</label>
                        <input
                          type="number" min="0" max="100" step="0.5"
                          value={bulkTeleShare}
                          onChange={e => setBulkTeleShare(e.target.value)}
                          placeholder="e.g. 5"
                          className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-violet-500/20 outline-none dark:text-white"
                        />
                      </div>
                      <button
                        onClick={handleBulkShareUpdate}
                        disabled={isBulkUpdating || (!bulkTechShare.trim() && !bulkTeleShare.trim())}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl text-sm font-bold hover:from-violet-700 hover:to-indigo-700 transition-all shadow-md shadow-violet-500/20 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                      >
                        {isBulkUpdating ? <Loader2 size={14} className="animate-spin" /> : <Percent size={14} />}
                        {isBulkUpdating ? 'Updating...' : 'Apply to Contacts'}
                      </button>
                    </div>
                    <p className="text-[10px] text-violet-500/70 dark:text-violet-400/50 mt-2">
                      This will update share % and recalculate salary amounts for {staffTypeFilter !== 'All' ? (staffNameFilter ? `contacts assigned to "${staffNameFilter}"` : `all ${staffTypeFilter} contacts`) : 'all contacts'}.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Desktop Table */}
      <div className="hidden md:block bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[5000px]">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-slate-800/50 text-gray-500 dark:text-slate-400 text-[11px] uppercase tracking-wider font-bold border-b border-gray-100 dark:border-slate-800">
                {userRole === 'Admin' && (
                  <th className="px-3 py-2 w-10 sticky left-0 z-20 bg-gray-50 dark:bg-slate-800">
                    <input type="checkbox" checked={paginatedContacts.length > 0 && paginatedContacts.every(c => selectedIds.has(c.id))} onChange={handleSelectAll} className="rounded border-gray-300 text-primary focus:ring-primary" />
                  </th>
                )}
                {/* ── Frozen columns (sticky) ── */}
                <th className={cn("px-3 py-2 whitespace-nowrap sticky z-20 bg-gray-50 dark:bg-slate-800 min-w-[100px]", userRole === 'Admin' ? 'left-10' : 'left-0')}>CTN</th>
                <th className={cn("px-3 py-2 whitespace-nowrap sticky z-20 bg-gray-50 dark:bg-slate-800 min-w-[140px]", userRole === 'Admin' ? 'left-[148px]' : 'left-[100px]')}>CUSTOMER NAME</th>
                <th className={cn("px-3 py-2 whitespace-nowrap sticky z-20 bg-gray-50 dark:bg-slate-800 min-w-[140px]", userRole === 'Admin' ? 'left-[288px]' : 'left-[240px]')}>PHONE</th>
                <th className={cn("px-3 py-2 whitespace-nowrap sticky z-20 bg-gray-50 dark:bg-slate-800 min-w-[110px] border-r border-gray-200 dark:border-slate-700", userRole === 'Admin' ? 'left-[428px]' : 'left-[380px]')}>STATUS</th>
                {/* ── Scrollable columns ── */}
                <th className="px-3 py-2 whitespace-nowrap">ORDER NUMBER</th>
                {fv('entryLeads') && <th className="px-3 py-2">ENTRY LEADS</th>}
                <th className="px-3 py-2">DATE</th>
                <th className="px-3 py-2">REQUIREMENT</th>
                <th className="px-3 py-2">TELE STAFF</th>
                <th className="px-3 py-2">TECH STAFF</th>
                {fv('detailsNotes') && <th className="px-3 py-2">DETAILS / NOTES</th>}
                {fv('claimApplyDate') && <th className="px-3 py-2 whitespace-nowrap">CLAIM DATE</th>}
                {fv('followUpDate') && <th className="px-3 py-2 whitespace-nowrap">FOLLOW UP</th>}
                {fv('serviceCharges') && <th className="px-3 py-2">SERVICE CHARGES</th>}
                {fv('receiveAmount') && <th className="px-3 py-2">RECEIVED</th>}
                {fv('paymentStatus') && <th className="px-3 py-2">PAYMENT</th>}
                {fv('pdfFileSend') && <th className="px-3 py-2">PDF SEND</th>}
                {fv('transactionId') && <th className="px-3 py-2">TRANSACTION ID</th>}
                {fv('receiveDate') && <th className="px-3 py-2 whitespace-nowrap">RECEIVE DATE</th>}
                {fv('remarks') && <th className="px-3 py-2">REMARKS</th>}
                {fv('technicalSharePercent') && <th className="px-3 py-2">TECH SHARE</th>}
                {fv('technicalSalaryAmount') && <th className="px-3 py-2">TECH SALARY</th>}
                {fv('technicalPaidDate') && <th className="px-3 py-2 whitespace-nowrap">TECH PAID DATE</th>}
                {fv('technicalRemarks') && <th className="px-3 py-2">TECH REMARKS</th>}
                {fv('technicalTotalAmount') && <th className="px-3 py-2">TECH TOTAL</th>}
                {fv('teleCallingSharePercent') && <th className="px-3 py-2">TELE SHARE</th>}

                {fv('teleCallingSalaryAmount') && <th className="px-3 py-2">TELE SALARY</th>}
                {fv('teleCallingPaidDate') && <th className="px-3 py-2 whitespace-nowrap">TELE PAID DATE</th>}
                {fv('teleCallingRemarks') && <th className="px-3 py-2">TELE REMARKS</th>}
                {fv('teleTotalAmount') && <th className="px-3 py-2">TELE TOTAL</th>}
                <th className="px-3 py-2 text-right sticky right-0 z-20 bg-gray-50 dark:bg-slate-800">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
              {paginatedContacts.length === 0 ? (
                <tr><td colSpan={40} className="px-3 py-10 text-center text-gray-400 text-sm">No contacts found.</td></tr>
              ) : paginatedContacts.map(contact => (
                <tr key={contact.id} className="group hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors text-sm">
                  {userRole === 'Admin' && (
                    <td className="px-3 py-2 sticky left-0 bg-white dark:bg-slate-900 group-hover:bg-gray-50/50 dark:group-hover:bg-slate-800/30">
                      <input type="checkbox" checked={selectedIds.has(contact.id)} onChange={() => handleToggleSelect(contact.id)} className="rounded border-gray-300 text-primary focus:ring-primary" />
                    </td>
                  )}
                  {/* ── Frozen cells ── */}
                  <td className={cn("px-3 py-2 font-mono text-xs text-gray-500 dark:text-slate-400 sticky z-10 bg-white dark:bg-slate-900 group-hover:bg-gray-50/50 dark:group-hover:bg-slate-800/30 min-w-[100px]", userRole === 'Admin' ? 'left-12' : 'left-0')}>{contact.ctn || '—'}</td>
                  <td className={cn("px-3 py-2 font-bold text-gray-900 dark:text-white sticky z-10 bg-white dark:bg-slate-900 group-hover:bg-gray-50/50 dark:group-hover:bg-slate-800/30 min-w-[140px]", userRole === 'Admin' ? 'left-[148px]' : 'left-[100px]')}>{contact.customerName || '—'}</td>
                  <td className={cn("px-3 py-2 text-gray-600 dark:text-slate-300 sticky z-10 bg-white dark:bg-slate-900 group-hover:bg-gray-50/50 dark:group-hover:bg-slate-800/30 min-w-[140px]", userRole === 'Admin' ? 'left-[288px]' : 'left-[240px]')}>{contact.customerContactNumber || '—'}</td>
                  <td className={cn("px-3 py-2 sticky z-10 bg-white dark:bg-slate-900 group-hover:bg-gray-50/50 dark:group-hover:bg-slate-800/30 min-w-[110px] border-r border-gray-100 dark:border-slate-800", userRole === 'Admin' ? 'left-[428px]' : 'left-[380px]')}>
                    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                      contact.currentStatus === 'Completed' || contact.currentStatus === 'Complete' ? "bg-primary/10 text-primary dark:bg-primary/20" :
                        contact.currentStatus === 'Pending' ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                          "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    )}>{contact.currentStatus || '—'}</span>
                  </td>
                  {/* ── Scrollable cells ── */}
                  <td className="px-3 py-2 text-gray-500 dark:text-slate-400">{contact.orderNumber || '—'}</td>
                  {fv('entryLeads') && <td className="px-3 py-2 text-gray-500 dark:text-slate-400">{contact.entryLeads || '—'}</td>}
                  <td className="px-3 py-2 text-gray-500 dark:text-slate-400 whitespace-nowrap">{contact.date || '—'}</td>
                  <td className="px-3 py-2 text-gray-600 dark:text-slate-300 max-w-[140px] truncate">{contact.customerRequirement || '—'}</td>
                  <td className="px-3 py-2 text-gray-600 dark:text-slate-300">{contact.teleCallingStaff || '—'}</td>
                  <td className="px-3 py-2 text-gray-600 dark:text-slate-300">{contact.technicalStaff || '—'}</td>
                  {fv('detailsNotes') && <td className="px-3 py-2 text-gray-500 dark:text-slate-400 max-w-[160px] truncate">{contact.detailsNotes || '—'}</td>}
                  {fv('claimApplyDate') && <td className="px-3 py-2 text-gray-500 dark:text-slate-400 whitespace-nowrap">{contact.claimApplyDate || '—'}</td>}
                  {fv('followUpDate') && <td className="px-3 py-2 text-gray-500 dark:text-slate-400 whitespace-nowrap">{contact.followUpDate || '—'}</td>}
                  {fv('serviceCharges') && <td className="px-3 py-2 text-gray-600 dark:text-slate-300">{contact.serviceCharges ? `₹${contact.serviceCharges}` : '—'}</td>}
                  {fv('receiveAmount') && <td className="px-3 py-2 font-bold text-gray-900 dark:text-white">{contact.receiveAmount ? `₹${contact.receiveAmount}` : '—'}</td>}
                  {fv('paymentStatus') && <td className="px-3 py-2 text-gray-600 dark:text-slate-300">{contact.paymentStatus || '—'}</td>}
                  {fv('pdfFileSend') && <td className="px-3 py-2 text-gray-600 dark:text-slate-300">{contact.pdfFileSend || '—'}</td>}
                  {fv('transactionId') && <td className="px-3 py-2 font-mono text-xs text-gray-500 dark:text-slate-400">{contact.transactionId || '—'}</td>}
                  {fv('receiveDate') && <td className="px-3 py-2 text-gray-500 dark:text-slate-400 whitespace-nowrap">{contact.receiveDate || '—'}</td>}
                  {fv('remarks') && <td className="px-3 py-2 text-gray-500 dark:text-slate-400 max-w-[140px] truncate">{contact.remarks || '—'}</td>}
                  {fv('technicalSharePercent') && <td className="px-3 py-2 text-gray-600 dark:text-slate-300">{contact.technicalSharePercent ? `${contact.technicalSharePercent}%` : '—'}</td>}
                  {fv('technicalSalaryAmount') && <td className="px-3 py-2 font-bold text-gray-900 dark:text-white">{contact.technicalSalaryAmount ? `₹${contact.technicalSalaryAmount}` : '—'}</td>}
                  {fv('technicalPaidDate') && <td className="px-3 py-2 text-gray-500 dark:text-slate-400 whitespace-nowrap">{contact.technicalPaidDate || '—'}</td>}
                  {fv('technicalRemarks') && <td className="px-3 py-2 text-gray-500 dark:text-slate-400 max-w-[140px] truncate">{contact.technicalRemarks || '—'}</td>}
                  {fv('technicalTotalAmount') && <td className="px-3 py-2 font-bold text-primary">{contact.technicalTotalAmount ? `₹${contact.technicalTotalAmount}` : '—'}</td>}
                  {fv('teleCallingSharePercent') && <td className="px-3 py-2 text-gray-600 dark:text-slate-300">{contact.teleCallingSharePercent ? `${contact.teleCallingSharePercent}%` : '—'}</td>}
                  {fv('teleCallingSalaryAmount') && <td className="px-3 py-2 font-bold text-gray-900 dark:text-white">{contact.teleCallingSalaryAmount ? `₹${contact.teleCallingSalaryAmount}` : '—'}</td>}
                  {fv('teleCallingPaidDate') && <td className="px-3 py-2 text-gray-500 dark:text-slate-400 whitespace-nowrap">{contact.teleCallingPaidDate || '—'}</td>}
                  {fv('teleCallingRemarks') && <td className="px-3 py-2 text-gray-500 dark:text-slate-400 max-w-[140px] truncate">{contact.teleCallingRemarks || '—'}</td>}
                  {fv('teleTotalAmount') && <td className="px-3 py-2 font-bold text-primary">{contact.teleTotalAmount ? `₹${contact.teleTotalAmount}` : '—'}</td>}
                  <td className="px-3 py-2 sticky right-0 bg-white dark:bg-slate-900 group-hover:bg-gray-50/50 dark:group-hover:bg-slate-800/30">
                    <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* WhatsApp */}
                      {contact.customerContactNumber && (
                        <a
                          href={`https://wa.me/${contact.customerContactNumber.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-500 text-white text-[11px] font-bold hover:bg-green-600 transition-colors shadow-sm shadow-green-500/20"
                        >
                          <MessageSquare size={12} /> WA
                        </a>
                      )}
                      {/* Call */}
                      {contact.customerContactNumber && (
                        <a
                          href={`tel:${contact.customerContactNumber.replace(/\s/g, '')}`}
                          onClick={e => e.stopPropagation()}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary text-white text-[11px] font-bold hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20"
                        >
                          <Phone size={12} /> Call
                        </a>
                      )}
                      <div className="w-px h-4 bg-gray-200 dark:bg-slate-700 mx-0.5" />
                      {perms.canToggleFavorite && (
                        <button onClick={(e) => handleToggleFavorite(contact.id, e)} className={cn("p-1 rounded-lg transition-colors", contact.isFavorite ? "text-amber-400" : "text-gray-400 hover:text-amber-400")}>
                          <Star size={14} className={contact.isFavorite ? "fill-current" : ""} />
                        </button>
                      )}
                      <button onClick={() => handleViewContact(contact)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400 transition-colors">
                        <Eye size={14} />
                      </button>
                      {perms.canEditContact && (
                        <button onClick={() => handleEditContact(contact)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300 transition-colors">
                          <Edit2 size={14} />
                        </button>
                      )}
                      {perms.canDeleteContact && (
                        <button onClick={() => handleDeleteContact(contact.id)} className="p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>


        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs text-gray-400 dark:text-slate-500">{filteredContacts.length} contacts</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors">
                <ChevronLeft size={16} className="text-gray-500 dark:text-slate-400" />
              </button>
              {pageNumbers.map((n, i) => (
                <button key={i} onClick={() => typeof n === 'number' && setCurrentPage(n)} disabled={n === '...'}
                  className={cn("w-8 h-8 rounded-lg text-sm font-bold transition-colors", n === currentPage ? "bg-primary text-white" : "hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-slate-400 disabled:cursor-default")}>
                  {n}
                </button>
              ))}
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors">
                <ChevronRight size={16} className="text-gray-500 dark:text-slate-400" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {paginatedContacts.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-12 flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gray-50 dark:bg-slate-800 flex items-center justify-center text-gray-400"><Users size={32} /></div>
            <p className="text-lg font-bold text-gray-900 dark:text-white">No contacts found</p>
          </div>
        ) : paginatedContacts.map(contact => (
          <div key={contact.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-4 pt-4 pb-2 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold text-gray-900 dark:text-white">{contact.customerName || '—'}</p>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{contact.ctn || ''} · {contact.date || ''}</p>
                {contact.customerContactNumber && (
                  <p className="text-xs text-primary font-medium mt-0.5">{contact.customerContactNumber}</p>
                )}
              </div>
              <span className={cn("shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase",
                contact.currentStatus === 'Completed' ? "bg-primary/10 text-primary" : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
              )}>{contact.currentStatus}</span>
            </div>
            <div className="px-3 py-2.5 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50 flex items-center gap-2">
              {/* WhatsApp */}
              {contact.customerContactNumber && (
                <a
                  href={`https://wa.me/${contact.customerContactNumber.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-500 text-white text-xs font-bold shadow-sm shadow-green-500/20 active:scale-95 transition-transform"
                >
                  <MessageSquare size={14} /> WhatsApp
                </a>
              )}
              {/* Call */}
              {contact.customerContactNumber && (
                <a
                  href={`tel:${contact.customerContactNumber.replace(/\s/g, '')}`}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-sm shadow-primary/20 active:scale-95 transition-transform"
                >
                  <Phone size={14} /> Call
                </a>
              )}
              <div className="ml-auto flex items-center gap-1">
                {perms.canToggleFavorite && (
                  <button onClick={(e) => handleToggleFavorite(contact.id, e)} className={cn("p-2 rounded-xl border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-700 shadow-sm", contact.isFavorite ? "text-amber-400" : "text-gray-400")}>
                    <Star size={15} className={contact.isFavorite ? "fill-current" : ""} />
                  </button>
                )}
                <button onClick={() => handleViewContact(contact)} className="p-2 rounded-xl bg-white dark:bg-slate-700 shadow-sm text-gray-600 dark:text-slate-300 border border-gray-100 dark:border-slate-600"><Eye size={15} /></button>
                {perms.canEditContact && (
                  <button onClick={() => handleEditContact(contact)} className="p-2 rounded-xl bg-white dark:bg-slate-700 shadow-sm text-gray-600 dark:text-slate-300 border border-gray-100 dark:border-slate-600"><Edit2 size={15} /></button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>


      {/* ── Contact Modal ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-slate-800 flex flex-col max-h-[92vh]"
            >
              {/* Modal Header */}
              <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gray-50/50 dark:bg-slate-800/50 shrink-0">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {viewingContact ? 'View Lead' : editingContact ? 'Edit Lead' : 'Add New Lead'}
                  </h2>
                  <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                    {viewingContact ? 'Read-only view' : `Role: ${userRole} — you can edit highlighted fields`}
                  </p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                  <X size={20} className="text-gray-500 dark:text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleSaveContact} className="flex flex-col flex-1 overflow-hidden">
                <div className="flex-1 overflow-y-auto p-6 space-y-8">

                  {/* Duplicate warning */}
                  {duplicateWarning && (
                    <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                      <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-red-600 dark:text-red-400">Duplicate Entry Detected</p>
                        <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">{duplicateWarning}</p>
                      </div>
                    </div>
                  )}

                  {/* ── Section 1: Basic Info (CTN → Remarks / CTN → Current Status) ── */}
                  {showBasicSection && (
                    <section>
                      <h3 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px]">1</span>
                        Telecalling Staff Entry
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {fv('ctn') && (
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">CTN</label>
                            <input
                              name="ctn"
                              readOnly={!fe('ctn')}
                              value={modalFormData.ctn || ''}
                              onChange={handleCtnChange}
                              className={ctnError ? 'w-full rounded-xl px-3 py-2 text-sm border-2 border-red-400 bg-red-50 dark:bg-red-900/20 outline-none text-red-700 dark:text-red-300' : inputCls('ctn')}
                              placeholder="e.g. PT 26 0651"
                            />
                            {ctnError && (
                              <p className="text-xs text-red-500 font-medium flex items-center gap-1">
                                <span>⚠</span> {ctnError}
                              </p>
                            )}
                          </div>
                        )}
                        {fv('orderNumber') && (
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Order Number</label>
                            <input name="orderNumber" readOnly={!fe('orderNumber')} value={modalFormData.orderNumber || ''} onChange={handleModalInputChange} className={inputCls('orderNumber')} />
                          </div>
                        )}
                        {fv('entryLeads') && (
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Entry Leads</label>
                            <input name="entryLeads" list="entryLeadsList" readOnly={!fe('entryLeads')} value={modalFormData.entryLeads || ''} onChange={handleModalInputChange} className={inputCls('entryLeads')} />
                          </div>
                        )}
                        {fv('date') && (
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Date</label>
                            <input type="date" name="date" readOnly={!fe('date')} value={modalFormData.date || ''} onChange={handleModalInputChange} className={inputCls('date')} />
                          </div>
                        )}
                        {fv('teleCallingStaff') && (
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Tele Calling Staff</label>
                            <input name="teleCallingStaff" list="teleCallingStaffList" readOnly={!fe('teleCallingStaff')} value={modalFormData.teleCallingStaff || ''} onChange={handleModalInputChange} className={inputCls('teleCallingStaff')} />
                          </div>
                        )}
                        {fv('technicalStaff') && (
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Technical Staff</label>
                            <input name="technicalStaff" list="technicalStaffList" readOnly={!fe('technicalStaff')} value={modalFormData.technicalStaff || ''} onChange={handleModalInputChange} className={inputCls('technicalStaff')} />
                          </div>
                        )}
                        {fv('customerContactNumber') && (
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Customer Mobile</label>
                            <input name="customerContactNumber" readOnly={!fe('customerContactNumber')} value={modalFormData.customerContactNumber || ''} onChange={handleModalInputChange} className={inputCls('customerContactNumber')} />
                          </div>
                        )}
                        {fv('customerName') && (
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Customer Name</label>
                            <input name="customerName" readOnly={!fe('customerName')} value={modalFormData.customerName || ''} onChange={handleModalInputChange} className={inputCls('customerName')} />
                          </div>
                        )}
                        {fv('customerRequirement') && (
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Customer Requirement</label>
                            <input name="customerRequirement" list="serviceTypesList" readOnly={!fe('customerRequirement')} value={modalFormData.customerRequirement || ''} onChange={handleModalInputChange} className={inputCls('customerRequirement')} />
                          </div>
                        )}
                        {fv('currentStatus') && (
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Current Status</label>
                            <input name="currentStatus" list="statusesList" readOnly={!fe('currentStatus')} value={modalFormData.currentStatus || ''} onChange={handleModalInputChange} className={inputCls('currentStatus')} />
                          </div>
                        )}

                        {/* Fields only visible for CTN_TO_REMARKS roles */}
                        {fv('detailsNotes') && (
                          <div className="space-y-1.5 col-span-2">
                            <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Details & Notes</label>
                            <textarea name="detailsNotes" readOnly={!fe('detailsNotes')} value={modalFormData.detailsNotes || ''} onChange={handleModalInputChange} rows={2} className={cn(inputCls('detailsNotes'), 'resize-none')} />
                          </div>
                        )}
                        {fv('claimApplyDate') && (
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Claim Apply Date</label>
                            <input type="date" name="claimApplyDate" readOnly={!fe('claimApplyDate')} value={modalFormData.claimApplyDate || ''} onChange={handleModalInputChange} className={inputCls('claimApplyDate')} />
                          </div>
                        )}
                        {fv('followUpDate') && (
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Follow Up Date</label>
                            <input type="date" name="followUpDate" readOnly={!fe('followUpDate')} value={modalFormData.followUpDate || ''} onChange={handleModalInputChange} className={inputCls('followUpDate')} />
                          </div>
                        )}
                        {fv('pdfFileSend') && (
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">PDF File Send</label>
                            <input name="pdfFileSend" readOnly={!fe('pdfFileSend')} value={modalFormData.pdfFileSend || ''} onChange={handleModalInputChange} className={inputCls('pdfFileSend')} />
                          </div>
                        )}
                        {fv('remarks') && (
                          <div className="space-y-1.5 col-span-2">
                            <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Remarks</label>
                            <textarea name="remarks" readOnly={!fe('remarks')} value={modalFormData.remarks || ''} onChange={handleModalInputChange} rows={2} className={cn(inputCls('remarks'), 'resize-none')} />
                          </div>
                        )}
                      </div>
                    </section>
                  )}

                  {/* ── Section 2: Salary / Payment ── */}
                  {showSalarySection && (
                    <section>
                      <h3 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center text-[10px]">2</span>
                        Technical Staff Entry
                        {!perms.editableFields.includes('salary_amount') && <span className="text-[10px] font-bold text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">View Only</span>}
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Service Charges</label>
                          <input name="serviceCharges" readOnly={!fe('serviceCharges')} value={modalFormData.serviceCharges || ''} onChange={handleModalInputChange} className={inputCls('serviceCharges')} />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Payment Status</label>
                          <input name="paymentStatus" list="paymentStatusesList" readOnly={!fe('paymentStatus')} value={modalFormData.paymentStatus || ''} onChange={handleModalInputChange} className={inputCls('paymentStatus')} />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Receive Amount</label>
                          <input name="receiveAmount" type="number" readOnly={!fe('receiveAmount')} value={modalFormData.receiveAmount || ''} onChange={handleModalInputChange} className={inputCls('receiveAmount')} />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Transaction ID</label>
                          <input
                            name="transactionId"
                            readOnly={!fe('transactionId')}
                            value={modalFormData.transactionId || ''}
                            onChange={handleTxnIdChange}
                            className={txnIdError ? 'w-full rounded-xl px-3 py-2 text-sm border-2 border-red-400 bg-red-50 dark:bg-red-900/20 outline-none text-red-700 dark:text-red-300' : inputCls('transactionId')}
                            placeholder="e.g. TXN123456"
                          />
                          {txnIdError && (
                            <p className="text-xs text-red-500 font-medium flex items-center gap-1">
                              <span>⚠</span> {txnIdError}
                            </p>
                          )}
                        </div>

                        {/* Screenshot upload inline — visible to all roles with screenshot permission */}
                        {showScreenshotSection && (
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Screenshot</label>
                            {modalFormData.screenShotImage ? (
                              <div className="relative inline-flex items-start gap-2">
                                <img
                                  src={modalFormData.screenShotImage}
                                  alt="Screenshot"
                                  className="rounded-xl h-10 w-16 object-cover cursor-pointer border border-gray-200 dark:border-slate-700"
                                  onClick={() => setViewingImage(modalFormData.screenShotImage!)}
                                />
                                {fe('screenShotImage') && (
                                  <button type="button" onClick={handleDeleteScreenshot} className="p-1 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors">
                                    <X size={10} />
                                  </button>
                                )}
                              </div>
                            ) : fe('screenShotImage') ? (
                              <label className={cn('flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-dashed border-gray-200 dark:border-slate-700 cursor-pointer hover:border-primary/50 transition-colors text-xs text-gray-400 dark:text-slate-500', isUploadingScreenshot && 'opacity-60 cursor-wait')}>
                                {isUploadingScreenshot ? <Loader2 size={14} className="animate-spin text-primary" /> : <ImageIcon size={14} />}
                                {isUploadingScreenshot ? 'Uploading...' : 'Upload Screenshot'}
                                <input type="file" className="hidden" accept="image/*" onChange={handleScreenshotUpload} disabled={isUploadingScreenshot} />
                              </label>
                            ) : (
                              <p className="text-xs text-gray-400 dark:text-slate-500 py-2">No screenshot.</p>
                            )}
                          </div>
                        )}

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Receive Date</label>
                          <input type="date" name="receiveDate" readOnly={!fe('receiveDate')} value={modalFormData.receiveDate || ''} onChange={handleModalInputChange} className={inputCls('receiveDate')} />
                        </div>
                        {fv('claimApplyDate') && (
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Claim Apply Date</label>
                            <input type="date" name="claimApplyDate" readOnly={!fe('claimApplyDate')} value={modalFormData.claimApplyDate || ''} onChange={handleModalInputChange} className={inputCls('claimApplyDate')} />
                          </div>
                        )}
                        {fv('followUpDate') && (
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Follow Up Date</label>
                            <input type="date" name="followUpDate" readOnly={!fe('followUpDate')} value={modalFormData.followUpDate || ''} onChange={handleModalInputChange} className={inputCls('followUpDate')} />
                          </div>
                        )}
                        {fv('pdfFileSend') && (
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">PDF File Send</label>
                            <input name="pdfFileSend" readOnly={!fe('pdfFileSend')} value={modalFormData.pdfFileSend || ''} onChange={handleModalInputChange} className={inputCls('pdfFileSend')} />
                          </div>
                        )}
                        {fv('remarks') && (
                          <div className="space-y-1.5 col-span-2">
                            <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Remarks</label>
                            <textarea name="remarks" readOnly={!fe('remarks')} value={modalFormData.remarks || ''} onChange={handleModalInputChange} rows={2} className={cn(inputCls('remarks'), 'resize-none')} />
                          </div>
                        )}
                      </div>
                    </section>
                  )}

                  {/* ── Section 3: Accounts ── */}
                  {showTechnicalSection && (
                    <section>
                      <h3 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center text-[10px]">3</span>
                        Accounts
                        {!perms.editableFields.includes('technical_share') && <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">View Only</span>}
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Technical Share %</label>
                          <input name="technicalSharePercent" type="number" readOnly={!fe('technicalSharePercent')} value={modalFormData.technicalSharePercent || ''} onChange={handleModalInputChange} className={inputCls('technicalSharePercent')} />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Technical Salary Amount</label>
                          <input name="technicalSalaryAmount" readOnly value={modalFormData.technicalSalaryAmount || ''} className={inputCls('technicalSalaryAmount')} />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Technical Paid Date</label>
                          <input type="date" name="technicalPaidDate" readOnly={!fe('technicalPaidDate')} value={modalFormData.technicalPaidDate || ''} onChange={handleModalInputChange} className={inputCls('technicalPaidDate')} />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Technical Remarks</label>
                          <input name="technicalRemarks" readOnly={!fe('technicalRemarks')} value={modalFormData.technicalRemarks || ''} onChange={handleModalInputChange} className={inputCls('technicalRemarks')} />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Tele Total Amount</label>
                          <input name="teleTotalAmount" readOnly value={modalFormData.teleTotalAmount || ''} className={inputCls('teleTotalAmount')} />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Technical Total Amount</label>
                          <input name="technicalTotalAmount" readOnly value={modalFormData.technicalTotalAmount || ''} className={inputCls('technicalTotalAmount')} />
                        </div>
                      </div>
                    </section>
                  )}

                  {/* ── Section 4: TeleCalling Share ── */}
                  {showTeleCallingSection && (
                    <section>
                      <h3 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center text-[10px]">4</span>
                        TeleCalling Share
                        {!perms.editableFields.includes('telecalling_share') && <span className="text-[10px] font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full">View Only</span>}
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">TeleCalling Share %</label>
                          <input name="teleCallingSharePercent" type="number" readOnly={!fe('teleCallingSharePercent')} value={modalFormData.teleCallingSharePercent || ''} onChange={handleModalInputChange} className={inputCls('teleCallingSharePercent')} />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">TeleCalling Salary Amount</label>
                          <input name="teleCallingSalaryAmount" readOnly value={modalFormData.teleCallingSalaryAmount || ''} className={inputCls('teleCallingSalaryAmount')} />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">TeleCalling Paid Date</label>
                          <input type="date" name="teleCallingPaidDate" readOnly={!fe('teleCallingPaidDate')} value={modalFormData.teleCallingPaidDate || ''} onChange={handleModalInputChange} className={inputCls('teleCallingPaidDate')} />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">TeleCalling Remarks</label>
                          <input name="teleCallingRemarks" readOnly={!fe('teleCallingRemarks')} value={modalFormData.teleCallingRemarks || ''} onChange={handleModalInputChange} className={inputCls('teleCallingRemarks')} />
                        </div>
                      </div>
                    </section>
                  )}

                  {/* ── Section 5: Screenshot ── */}
                  {showScreenshotSection && (
                    <section>
                      <h3 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 flex items-center justify-center text-[10px]">5</span>
                        Screenshot
                      </h3>
                      {modalFormData.screenShotImage ? (
                        <div className="relative inline-block">
                          <img src={modalFormData.screenShotImage} alt="Screenshot" className="rounded-xl max-h-48 cursor-pointer border border-gray-200 dark:border-slate-700" onClick={() => setViewingImage(modalFormData.screenShotImage!)} />
                          {fe('screenShotImage') && (
                            <button type="button" onClick={handleDeleteScreenshot} className="absolute top-2 right-2 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors">
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      ) : fe('screenShotImage') ? (
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl cursor-pointer hover:border-primary/50 transition-colors">
                          {isUploadingScreenshot ? <Loader2 size={24} className="animate-spin text-primary" /> : <><ImageIcon size={24} className="text-gray-300 dark:text-slate-600 mb-2" /><span className="text-xs text-gray-400 dark:text-slate-500">Click to upload screenshot</span></>}
                          <input type="file" className="hidden" accept="image/*" onChange={handleScreenshotUpload} disabled={isUploadingScreenshot} />
                        </label>
                      ) : (
                        <p className="text-sm text-gray-400 dark:text-slate-500">No screenshot uploaded.</p>
                      )}
                    </section>
                  )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 dark:border-slate-800 flex gap-3 bg-gray-50/50 dark:bg-slate-800/50 shrink-0">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 rounded-xl text-sm font-bold text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
                    {viewingContact ? 'Close' : 'Cancel'}
                  </button>
                  {!viewingContact && (
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 py-3 bg-primary rounded-xl text-sm font-bold text-white hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                      {isSubmitting ? 'Saving...' : editingContact ? 'Update Contact' : 'Create Lead'}
                    </button>
                  )}
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Image Viewer */}
      {viewingImage && (
        <div className="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center p-4" onClick={() => setViewingImage(null)}>
          <button className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors" onClick={() => setViewingImage(null)}><X size={24} /></button>
          <img src={viewingImage} alt="Screenshot" className="max-w-full max-h-full object-contain rounded-xl" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {/* Datalists */}
      <datalist id="serviceTypesList">{customServiceTypes.map(s => <option key={s} value={s} />)}</datalist>
      <datalist id="statusesList">{customStatuses.map(s => <option key={s} value={s} />)}</datalist>
      <datalist id="entryLeadsList"><option value="New" /><option value="Re_Entry" /></datalist>
      <datalist id="paymentStatusesList">{customPaymentStatuses.map(s => <option key={s} value={s} />)}</datalist>
      <datalist id="teleCallingStaffList">{customTeleCallingStaff.map(s => <option key={s} value={s} />)}</datalist>
      <datalist id="technicalStaffList">{customTechnicalStaff.map(s => <option key={s} value={s} />)}</datalist>
      <datalist id="branchesList">{customBranches.map(s => <option key={s} value={s} />)}</datalist>

      {/* Dropdown Manager (Admin only) */}
      <AnimatePresence>
        {isDropdownManagerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsDropdownManagerOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-slate-800 flex flex-col max-h-[80vh]"
            >
              <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gray-50/50 dark:bg-slate-800/50">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Manage Dropdown Options</h2>
                <button onClick={() => setIsDropdownManagerOpen(false)} className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full transition-colors"><X size={20} className="text-gray-500 dark:text-slate-400" /></button>
              </div>
              <div className="flex gap-1 px-4 pt-3 overflow-x-auto shrink-0">
                {(Object.keys(dropdownConfig) as Array<typeof dropdownManagerTab>).map(tab => (
                  <button key={tab} onClick={() => { setDropdownManagerTab(tab); setNewDropdownItem(''); }}
                    className={cn("px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all", dropdownManagerTab === tab ? "bg-primary text-white" : "text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800")}>
                    {dropdownConfig[tab].label.split(' ').slice(0, 2).join(' ')}
                  </button>
                ))}
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">{dropdownConfig[dropdownManagerTab].label}</p>
                <div className="flex gap-2">
                  <input type="text" value={newDropdownItem} onChange={e => setNewDropdownItem(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddDropdownItem())} placeholder="Type new option and press Enter..." className="flex-1 bg-gray-50 dark:bg-slate-800 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none dark:text-white" />
                  <button onClick={handleAddDropdownItem} className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-all"><Plus size={16} /></button>
                </div>
                <div className="space-y-2">
                  {dropdownConfig[dropdownManagerTab].list.length === 0 && <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-4">No options yet.</p>}
                  {dropdownConfig[dropdownManagerTab].list.map(item => (
                    <div key={item} className="flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-slate-800 rounded-xl group">
                      <span className="text-sm text-gray-800 dark:text-slate-200">{item}</span>
                      <button onClick={() => handleRemoveDropdownItem(item)} className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors opacity-0 group-hover:opacity-100"><X size={14} /></button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50">
                <p className="text-[11px] text-gray-400 dark:text-slate-500 text-center">Changes are saved automatically.</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}