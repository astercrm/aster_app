import React, { useState, useMemo } from 'react';
import * as Excel from 'exceljs';
import { 
  Search, 
  Filter, 
  Plus, 
  MoreVertical, 
  Phone, 
  MessageSquare, 
  Mail, 
  MapPin, 
  Building2,
  ChevronLeft,
  ChevronRight,
  Download,
  Upload,
  Star,
  Trash2,
  Edit2,
  X,
  CheckCircle2,
  Users,
  Loader2,
  ImageIcon,
  Eye
} from 'lucide-react';
import { generateMockContacts, serviceTypes, staff, branches, statuses, paymentStatuses } from '../mockData';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Contact } from '../types';
import { api } from '../services/api';

const ITEMS_PER_PAGE = 10;

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
  } catch (e) {
    return '';
  }
};

const fromInputDate = (dateStr: string | undefined): string => {
  if (!dateStr || /^\d{2}-[A-Za-z]{3}-\d{4}$/.test(dateStr)) return dateStr || '';
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    if (isNaN(date.getTime())) return dateStr || '';
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
  } catch (e) {
    return dateStr || '';
  }
};

export default function Contacts({ contacts, setContacts, user }: ContactsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [viewingContact, setViewingContact] = useState<Contact | null>(null);
  const [showToast, setShowToast] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [modalFormData, setModalFormData] = useState<Partial<Contact>>({});
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const [isUploadingScreenshot, setIsUploadingScreenshot] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  const calculateAmounts = (data: Partial<Contact>) => {
    const receiveAmount = parseFloat(data.receiveAmount || '0') || 0;
    const techShare = parseFloat(data.technicalSharePercent || '0') || 0;
    const teleShare = parseFloat(data.teleCallingSharePercent || '0') || 0;

    const techSalary = (receiveAmount * techShare) / 100;
    const teleSalary = (receiveAmount * teleShare) / 100;
    
    // Logic based on template: 
    // teleTotalAmount = receiveAmount + teleCallingSalaryAmount
    // technicalTotalAmount = teleTotalAmount + technicalSalaryAmount
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
      
      // Automatically populate shares if they are 0 and receiveAmount is entered
      if (name === 'receiveAmount' && parseFloat(value || '0') > 0) {
        if (!next.technicalSharePercent || parseFloat(next.technicalSharePercent) === 0) {
          next.technicalSharePercent = '10';
        }
        if (!next.teleCallingSharePercent || parseFloat(next.teleCallingSharePercent) === 0) {
          next.teleCallingSharePercent = '5';
        }
      }

      if (['receiveAmount', 'technicalSharePercent', 'teleCallingSharePercent'].includes(name)) {
        const calculated = calculateAmounts(next);
        return { ...next, ...calculated };
      }
      return next;
    });
  };

  // Helper function to get cell value from a row based on possible header names
  const getCellValue = (colNames: string[], row: any[], headers: string[], occurrence = 1) => {
    let count = 0;
    const colIndex = headers.findIndex((h: string, idx: number) => {
      const isMatch = colNames.some(name => h === name.toLowerCase().trim());
      if (isMatch) {
        count++;
        return count === occurrence;
      }
      return false;
    });
    return colIndex !== -1 ? String(row[colIndex] || '') : '';
  };

  const filteredContacts = useMemo(() => {
    const query = (searchQuery || '').toLowerCase().trim();
    if (!query) return contacts;

    return contacts.filter(contact => {
      const matchesSearch = 
        String(contact.customerName || '').toLowerCase().includes(query) ||
        String(contact.teleCallingStaff || '').toLowerCase().includes(query) ||
        String(contact.technicalStaff || '').toLowerCase().includes(query) ||
        String(contact.customerContactNumber || '').toLowerCase().includes(query) ||
        String(contact.orderNumber || '').toLowerCase().includes(query) ||
        String(contact.ctn || '').toLowerCase().includes(query);
      return matchesSearch;
    });
  }, [searchQuery, contacts]);

  const totalPages = Math.ceil(filteredContacts.length / ITEMS_PER_PAGE);
  const paginatedContacts = filteredContacts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleAddContact = () => {
    setEditingContact(null);
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
      await api.logActivity({
        userId: user.id, userName: user.name, userEmail: user.email,
        action: 'contact_deleted',
        details: `Deleted contact ID: ${id}`,
      });
      triggerToast('Contact deleted successfully');
    } catch (error) {
      console.error('Failed to delete contact:', error);
      triggerToast('Failed to delete contact');
    }
  };

  const triggerToast = (msg: string) => {
    setShowToast(msg);
    setTimeout(() => setShowToast(null), 3000);
  };

  const downloadTemplate = async () => {
    const headers = [
      'ORDER NUMBER', 'ENTRY LEADS', 'CTN', 'DATE', 'TELE CALLING STAFF', 'TECHNICAL STAFF', 
      'CUSTOMER CONTACTS NUMBER', 'CUSTOMER NAME', 'CUSTOMER REQURMENT', 'CURRENT STATUS', 
      'DETAILS & NOTES', 'CLAIM APPLY DATE', 'FOLLOW UP DATE', 'SERVICES CHARGES', 
      'PAYMENT STATUS', 'PDF FILE SEND', 'RECIVE AMOUNT', 
      'TRANSACTION ID', 'RECIVE DATE', 'REMARKS', 'TECHNICAL SHARE (%)', 
      'SALARY AMOUNT', 'PAID DATE', 'REMARKS', 'TELECALLING SHARE (%)', 
      'SALARY AMOUNT', 'PAID DATE', 'REMARKS', 'TELE TOTAL AMOUNT', 
      'TECHNICAL TOTAL AMOUNT'
    ];
    const data = [
      headers,
      ['ORD-1001', 'New', 'PT 26 0651', '26-Jan-2026', 'Jaya', 'ERD_Kowsalya', '9876543210', 'Ravi Kumar', 'F31 Advance', 'New', '', '26-Jan-2026', '', '500', 'Full Paid', 'Yes', '500', 'T123456', '26-Jan-2026', '', '10', '500', '26-Jan-2026', 'Send Accounts Group', '5', '200', '26-Jan-2026', '', '700', '1200']
    ];
    const workbook = new Excel.Workbook();
    const worksheet = workbook.addWorksheet('Template');
    worksheet.addRows(data);
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'contacts_template.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadCurrentContacts = async () => {
    const headers = [
      'ORDER NUMBER', 'ENTRY LEADS', 'CTN', 'DATE', 'TELE CALLING STAFF', 'TECHNICAL STAFF', 
      'CUSTOMER CONTACTS NUMBER', 'CUSTOMER NAME', 'CUSTOMER REQURMENT', 'CURRENT STATUS', 
      'DETAILS & NOTES', 'CLAIM APPLY DATE', 'FOLLOW UP DATE', 'SERVICES CHARGES', 
      'PAYMENT STATUS', 'PDF FILE SEND', 'RECIVE AMOUNT', 
      'TRANSACTION ID', 'RECIVE DATE', 'REMARKS', 'TECHNICAL SHARE (%)', 
      'SALARY AMOUNT', 'PAID DATE', 'REMARKS', 'TELECALLING SHARE (%)', 
      'SALARY AMOUNT', 'PAID DATE', 'REMARKS', 'TELE TOTAL AMOUNT', 
      'TECHNICAL TOTAL AMOUNT'
    ];
    
    const data = contacts.map(c => [
      c.orderNumber, c.entryLeads, c.ctn, c.date, c.teleCallingStaff, c.technicalStaff,
      c.customerContactNumber, c.customerName, c.customerRequirement, c.currentStatus,
      c.detailsNotes, c.claimApplyDate, c.followUpDate, c.serviceCharges,
      c.paymentStatus, c.pdfFileSend, c.receiveAmount,
      c.transactionId, c.receiveDate, c.remarks, c.technicalSharePercent,
      c.technicalSalaryAmount, c.technicalPaidDate, c.technicalRemarks, c.teleCallingSharePercent,
      c.teleCallingSalaryAmount, c.teleCallingPaidDate, c.teleCallingRemarks, c.teleTotalAmount,
      c.technicalTotalAmount
    ]);
    
    const workbook = new Excel.Workbook();
    const worksheet = workbook.addWorksheet('Contacts');
    worksheet.addRows([headers, ...data]);
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'current_contacts.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
          
          if (file.name.endsWith('.csv')) {
            const content = new TextDecoder().decode(buffer);
            const worksheet = workbook.addWorksheet('CSV');
            
            // Custom CSV parser to handle quotes and commas correctly
            let row: string[] = [];
            let inQuotes = false;
            let currentVal = '';
            for (let i = 0; i < content.length; i++) {
              const char = content[i];
              if (char === '"') {
                if (inQuotes && content[i + 1] === '"') {
                  currentVal += '"';
                  i++; // skip escaped quote
                } else {
                  inQuotes = !inQuotes;
                }
              } else if (char === ',' && !inQuotes) {
                row.push(currentVal);
                currentVal = '';
              } else if ((char === '\n' || char === '\r') && !inQuotes) {
                if (char === '\r' && content[i + 1] === '\n') i++; // handle \r\n
                row.push(currentVal);
                if (row.some(val => val.trim() !== '')) worksheet.addRow(row);
                row = [];
                currentVal = '';
              } else {
                currentVal += char;
              }
            }
            // Add the last row if file doesn't end with a newline
            if (currentVal || row.length > 0) {
              row.push(currentVal);
              if (row.some(val => val.trim() !== '')) worksheet.addRow(row);
            }
          } else {
            await workbook.xlsx.load(buffer);
          }
          
          const worksheet = workbook.worksheets[0];
          const jsonData: any[][] = [];
          worksheet.eachRow({ includeEmpty: false }, (row) => {
            const rowValues = Array.from(row.values as Excel.CellValue[]).slice(1);
            const formattedRow = rowValues.map(cell => {
              if (cell === null || cell === undefined) {
                return '';
              }
              const formatDate = (d: Date) => {
                const day = ('0' + d.getDate()).slice(-2);
                const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()];
                const year = d.getFullYear();
                return `${day}-${month}-${year}`;
              };

              if (cell instanceof Date) {
                return formatDate(cell);
              }
              if (typeof cell === 'object' && cell !== null) {
                if ('richText' in cell && Array.isArray(cell.richText)) {
                  return cell.richText.map(t => t.text).join('');
                }
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
              // Filter out rows that are effectively blank (no customer name or contact number)
              const hasCustomerName = getCellValue(['CUSTOMER NAME', 'NAME'], row, headers).trim() !== '';
              const hasContactNumber = getCellValue(['CUSTOMER CONTACTS NUMBER', 'PHONE NUMBER', 'PHONE', 'CONTACT NO'], row, headers).trim() !== '';
              return hasCustomerName || hasContactNumber;
            }).map((row: any[], index) => {
              const get = (colNames: string[], occurrence = 1) => {
                let count = 0;
                const colIndex = headers.findIndex((h: string, idx: number) => {
                  const isMatch = colNames.some(name => h === name.toLowerCase().trim());
                  if (isMatch) {
                    count++;
                    return count === occurrence;
                  }
                  return false;
                });
                return colIndex !== -1 ? String(row[colIndex] || '') : ''; // Use the local 'get' for mapping
              };

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
          const createdContacts = await api.bulkCreateContacts(newContacts);
          setContacts(prev => [...createdContacts, ...prev]);
          triggerToast(`Successfully imported ${createdContacts.length} contacts!`);
        } else {
          triggerToast('No valid contacts found in file.');
        }
      } catch (error) {
        console.error('Error parsing or uploading file:', error);
        triggerToast('Failed to import contacts. Please check the format and try again.');
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
      triggerToast('Failed to upload screenshot');
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
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    const allOnPageIds = paginatedContacts.map(c => c.id);
    const areAllSelected = allOnPageIds.every(id => selectedIds.has(id));

    setSelectedIds(prev => {
      const next = new Set(prev);
      if (areAllSelected) {
        allOnPageIds.forEach(id => next.delete(id));
      } else {
        allOnPageIds.forEach(id => next.add(id));
      }
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
      triggerToast('Failed to delete selected contacts');
    }
  };

  const handleSaveContact = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const contactData: Partial<Contact> = { 
      ...modalFormData,
      date: fromInputDate(modalFormData.date),
      claimApplyDate: fromInputDate(modalFormData.claimApplyDate),
      followUpDate: fromInputDate(modalFormData.followUpDate),
      receiveDate: fromInputDate(modalFormData.receiveDate),
      technicalPaidDate: fromInputDate(modalFormData.technicalPaidDate),
      teleCallingPaidDate: fromInputDate(modalFormData.teleCallingPaidDate),
    };

    
    
    // Add default fields
    contactData.isFavorite = editingContact?.isFavorite || false;
    
    try {
      if (editingContact) {
        const updatedContact = await api.updateContact(editingContact.id, contactData);
        setContacts(prev => prev.map(c => c.id === editingContact.id ? updatedContact : c));
        await api.logActivity({
          userId: user.id, userName: user.name, userEmail: user.email,
          action: 'contact_updated',
          details: `Updated contact: ${contactData.customerName}`,
        });
        triggerToast('Contact updated successfully');
      } else {
        const createdContact = await api.createContact(contactData);
        setContacts(prev => [createdContact, ...prev]);
        await api.logActivity({
          userId: user.id, userName: user.name, userEmail: user.email,
          action: 'contact_created',
          details: `Created contact: ${contactData.customerName}`,
        });
        triggerToast('Lead created successfully');
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Failed to save contact:', error);
      triggerToast('Failed to save contact');
    }
  };

  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return [...Array(totalPages)].map((_, i) => i + 1);
    }
    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    if (currentPage > totalPages - 4) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Contacts</h1>
          <p className="text-gray-500 dark:text-slate-400 mt-1">Manage and organize your employee directory.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={downloadCurrentContacts}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-sm font-bold text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all shadow-sm"
          >
            <Download size={16} /> Download
          </button>
          <button 
            onClick={downloadTemplate}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-sm font-bold text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all shadow-sm"
          >
            <Download size={16} /> Template
          </button>
          <label className={cn(
            "flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-sm font-bold text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all shadow-sm",
            isBulkUploading ? "cursor-wait opacity-70" : "cursor-pointer"
          )}>
            {isBulkUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {isBulkUploading ? 'Uploading...' : 'Bulk Upload'}
            <input 
              type="file" 
              className="hidden" 
              accept=".csv,.json,.xlsx,.xls"
              onChange={handleBulkUpload}
              disabled={isBulkUploading}
            />
          </label>
          <button 
            onClick={handleAddContact}
            className="flex items-center gap-2 px-4 py-2 bg-primary rounded-xl text-sm font-bold text-white hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
          >
            <Plus size={18} /> Lead Contact
          </button>
        </div>
      </header>

      <AnimatePresence>
        {showToast && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] bg-gray-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/10"
          >
            <CheckCircle2 size={18} className="text-primary" />
            <span className="text-sm font-bold tracking-tight">{showToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Search by name, order no, phone or CTN..." 
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/20 focus:bg-white dark:focus:bg-slate-800 transition-all outline-none dark:text-white"
          />
        </div>
        <AnimatePresence>
          {selectedIds.size > 0 && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={handleBulkDelete}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-600 rounded-xl text-sm font-bold text-white hover:bg-red-700 transition-all shadow-md shadow-red-500/20 whitespace-nowrap"
            >
              <Trash2 size={16} />
              Delete Selected ({selectedIds.size})
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[4000px]">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-slate-800/50 text-gray-500 dark:text-slate-400 text-[11px] uppercase tracking-wider font-bold border-b border-gray-100 dark:border-slate-800">
                <th className="px-6 py-4 w-10">
                  <input 
                    type="checkbox" 
                    checked={paginatedContacts.length > 0 && paginatedContacts.every(c => selectedIds.has(c.id))}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-primary focus:ring-primary" 
                  />
                </th>
                <th className="px-6 py-4">CTN</th>
                <th className="px-6 py-4">ORDER NUMBER</th>
                <th className="px-6 py-4">ENTRY LEADS</th>
                <th className="px-6 py-4">DATE</th>
                <th className="px-6 py-4">TELE CALLING STAFF</th>
                <th className="px-6 py-4">TECHNICAL STAFF</th>
                <th className="px-6 py-4">CUSTOMER CONTACTS NUMBER</th>
                <th className="px-6 py-4">CUSTOMER NAME</th>
                <th className="px-6 py-4">CUSTOMER REQURMENT</th>
                <th className="px-6 py-4">CURRENT STATUS</th>
                <th className="px-6 py-4">DETAILS & NOTES</th>
                <th className="px-6 py-4">CLAIM APPLY DATE</th>
                <th className="px-6 py-4">FOLLOW UP DATE</th>
                <th className="px-6 py-4">SERVICES CHARGES</th>
                <th className="px-6 py-4">PAYMENT STATUS</th>
                <th className="px-6 py-4">PDF FILE SEND</th>
                <th className="px-6 py-4">RECIVE AMOUNT</th>
                <th className="px-6 py-4">TRANSACTION ID</th>
                <th className="px-6 py-4">RECIVE DATE</th>
                <th className="px-6 py-4">REMARKS</th>
                <th className="px-6 py-4">TECHNICAL SHARE (%)</th>
                <th className="px-6 py-4">SALARY AMOUNT</th>
                <th className="px-6 py-4">PAID DATE</th>
                <th className="px-6 py-4">REMARKS</th>
                <th className="px-6 py-4">TELECALLING SHARE (%)</th>
                <th className="px-6 py-4">SALARY AMOUNT</th>
                <th className="px-6 py-4">PAID DATE</th>
                <th className="px-6 py-4">REMARKS</th>
                <th className="px-6 py-4">TELE TOTAL AMOUNT</th>
                <th className="px-6 py-4">TECHNICAL TOTAL AMOUNT</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              <AnimatePresence mode="popLayout">
                {paginatedContacts.length > 0 ? (
                  paginatedContacts.map((contact) => (
                    <motion.tr 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      key={contact.id} 
                      className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <input 
                          type="checkbox" 
                          checked={selectedIds.has(contact.id)}
                          onChange={() => handleToggleSelect(contact.id)}
                          className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" 
                        />
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300">{contact.ctn}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-500 dark:text-slate-400">{contact.orderNumber}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300">{contact.entryLeads}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300">{contact.date}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300">{contact.teleCallingStaff}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300">{contact.technicalStaff}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300">{contact.customerContactNumber}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-900 dark:text-white">{contact.customerName}</span>
                          {contact.isFavorite && <Star size={12} className="fill-amber-400 text-amber-400" />}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300">{contact.customerRequirement}</td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                          contact.currentStatus === 'Completed' || contact.currentStatus === 'Complete' ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary" :
                          contact.currentStatus === 'Pending' ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                          "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                        )}>
                          {contact.currentStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300">{contact.detailsNotes}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300">{contact.claimApplyDate}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300">{contact.followUpDate}</td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white">₹{contact.serviceCharges}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300">{contact.paymentStatus}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300">{contact.pdfFileSend}</td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white">₹{contact.receiveAmount}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300">{contact.transactionId}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300">{contact.receiveDate}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300">{contact.remarks}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300">{contact.technicalSharePercent}%</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300">₹{contact.technicalSalaryAmount}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300">{contact.technicalPaidDate}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300">{contact.technicalRemarks}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300">{contact.teleCallingSharePercent}%</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300">₹{contact.teleCallingSalaryAmount}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300">{contact.teleCallingPaidDate}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300">{contact.teleCallingRemarks}</td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white">₹{contact.teleTotalAmount}</td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white">₹{contact.technicalTotalAmount}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                          <a 
                            href={`tel:${contact.customerContactNumber}`}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-400 transition-colors"
                            title="Call"
                          >
                            <Phone size={16} />
                          </a>
                          <a 
                            href={`https://wa.me/${contact.customerContactNumber}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-colors"
                            title="WhatsApp"
                          >
                            <MessageSquare size={16} />
                          </a>
                          <button 
                            onClick={(e) => handleToggleFavorite(contact.id, e)}
                            className={cn(
                              "p-2 rounded-lg transition-colors",
                              contact.isFavorite 
                                ? "text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20" 
                                : "text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700"
                            )}
                            title={contact.isFavorite ? "Remove from Favorites" : "Add to Favorites"}
                          >
                            <Star size={16} className={contact.isFavorite ? "fill-current" : ""} />
                          </button>
                          <button 
                            onClick={() => handleViewContact(contact)}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-400 transition-colors" 
                            title="View Details"
                          >
                            <MoreVertical size={16} />
                          </button>
                          <button 
                            onClick={() => handleEditContact(contact)}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-400 transition-colors" 
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <motion.tr
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="h-64"
                    >
                      <td colSpan={33} className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center justify-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-gray-50 dark:bg-slate-800 flex items-center justify-center text-gray-400">
                          <Users size={32} />
                        </div>
                        <div>
                          <p className="text-lg font-bold text-gray-900 dark:text-white">No contacts found</p>
                          <p className="text-sm text-gray-500 dark:text-slate-400">Your contact list is currently empty.</p>
                        </div>
                      </div>
                    </td>
                  </motion.tr>
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        <div className="p-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500 dark:text-slate-400 font-medium">
            Showing <span className="text-gray-900 dark:text-white">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="text-gray-900 dark:text-white">{Math.min(currentPage * ITEMS_PER_PAGE, filteredContacts.length)}</span> of <span className="text-gray-900 dark:text-white">{filteredContacts.length}</span> contacts
          </p>
          <div className="flex items-center gap-2">
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
              className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors dark:text-slate-400"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="flex items-center gap-1">
              {pageNumbers.map((page, index) => {
                if (typeof page === 'string') {
                  return <span key={`ellipsis-${index}`} className="w-9 h-9 flex items-center justify-center text-gray-400">...</span>;
                }
                return (
                  <button 
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={cn(
                      "w-9 h-9 rounded-lg text-sm font-bold transition-all",
                      currentPage === page 
                      ? "bg-primary text-white shadow-md shadow-primary/20" 
                      : "hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-400"
                    )}
                  >
                    {page}
                  </button>
                );
              })}
            </div>
            <button 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
              className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors dark:text-slate-400"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-slate-800"
            >
              <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gray-50/50 dark:bg-slate-800/50">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {viewingContact ? 'Contact Details' : editingContact ? 'Edit Contact' : 'Add New Lead'}
                </h2>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full transition-colors"
                >
                  <X size={20} className="text-gray-500 dark:text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleSaveContact} className="flex flex-col h-[70vh]">
                <div className="flex-1 p-6 space-y-6 overflow-y-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Basic Info */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold text-primary dark:text-primary uppercase tracking-wider">Basic Information</h3>
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">CUSTOMER NAME *</label>
                          <input name="customerName" required readOnly={!!viewingContact} value={modalFormData.customerName || ''} onChange={handleModalInputChange} className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none dark:text-white" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">CUSTOMER CONTACTS NUMBER *</label>
                          <input name="customerContactNumber" required type="tel" readOnly={!!viewingContact} value={modalFormData.customerContactNumber || ''} onChange={handleModalInputChange} className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none dark:text-white" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">ORDER NUMBER</label>
                          <input name="orderNumber" readOnly={!!viewingContact} value={modalFormData.orderNumber || ''} onChange={handleModalInputChange} className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none dark:text-white" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">ENTRY LEADS</label>
                          <input 
                            name="entryLeads" 
                            list="entryLeadsList"
                            readOnly={!!viewingContact} 
                            value={modalFormData.entryLeads || ''} 
                            onChange={handleModalInputChange} 
                            className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none dark:text-white" 
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">CTN</label>
                          <input name="ctn" readOnly={!!viewingContact} value={modalFormData.ctn || ''} onChange={handleModalInputChange} className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none dark:text-white" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">DATE</label>
                          <input name="date" type="date" readOnly={!!viewingContact} value={modalFormData.date || ''} onChange={handleModalInputChange} className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none dark:text-white" />
                        </div>
                      </div>
                    </div>

                    {/* Service Info */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold text-primary dark:text-primary uppercase tracking-wider">Service Details</h3>
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">CUSTOMER REQURMENT</label>
                          <input 
                            name="customerRequirement" 
                            list="serviceTypesList"
                            readOnly={!!viewingContact} 
                            value={modalFormData.customerRequirement || ''} 
                            onChange={handleModalInputChange} 
                            className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none dark:text-white" 
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">CURRENT STATUS</label>
                          <input 
                            name="currentStatus" 
                            list="statusesList"
                            readOnly={!!viewingContact} 
                            value={modalFormData.currentStatus || ''} 
                            onChange={handleModalInputChange} 
                            className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none dark:text-white" 
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">DETAILS & NOTES</label>
                          <textarea name="detailsNotes" readOnly={!!viewingContact} value={modalFormData.detailsNotes || ''} onChange={handleModalInputChange} rows={2} className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none dark:text-white resize-none" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">CLAIM APPLY DATE</label>
                            <input name="claimApplyDate" type="date" readOnly={!!viewingContact} value={modalFormData.claimApplyDate || ''} onChange={handleModalInputChange} className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none dark:text-white" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">FOLLOW UP DATE</label>
                            <input name="followUpDate" type="date" readOnly={!!viewingContact} value={modalFormData.followUpDate || ''} onChange={handleModalInputChange} className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none dark:text-white" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Payment Info */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold text-primary dark:text-primary uppercase tracking-wider">Payment Information</h3>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">SERVICES CHARGES</label>
                            <input name="serviceCharges" readOnly={!!viewingContact} value={modalFormData.serviceCharges || ''} onChange={handleModalInputChange} className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none dark:text-white" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">RECIVE AMOUNT</label>
                            <input name="receiveAmount" readOnly={!!viewingContact} value={modalFormData.receiveAmount || ''} onChange={handleModalInputChange} className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none dark:text-white" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">PAYMENT STATUS</label>
                            <input 
                              name="paymentStatus" 
                              list="paymentStatusesList"
                              readOnly={!!viewingContact} 
                              value={modalFormData.paymentStatus || ''} 
                              onChange={handleModalInputChange} 
                              className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none dark:text-white" 
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">TRANSACTION ID</label>
                            <input name="transactionId" readOnly={!!viewingContact} value={modalFormData.transactionId || ''} onChange={handleModalInputChange} className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none dark:text-white" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">RECIVE DATE</label>
                            <input name="receiveDate" type="date" readOnly={!!viewingContact} value={modalFormData.receiveDate || ''} onChange={handleModalInputChange} className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none dark:text-white" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">PDF FILE SEND</label>
                            <input name="pdfFileSend" readOnly={!!viewingContact} value={modalFormData.pdfFileSend || ''} onChange={handleModalInputChange} className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none dark:text-white" />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">REMARKS</label>
                          <textarea name="remarks" readOnly={!!viewingContact} value={modalFormData.remarks || ''} onChange={handleModalInputChange} rows={2} className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none dark:text-white resize-none" />
                        </div>
                      </div>
                    </div>

                    {/* Staff Info */}
                    <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">SCREENSHOT IMAGE</label>
                          {modalFormData.screenShotImage ? (
                            <div className="relative group w-full rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700">
                              <img
                                src={modalFormData.screenShotImage}
                                alt="Screenshot"
                                className="w-full max-h-48 object-contain bg-gray-50 dark:bg-slate-800"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => setViewingImage(modalFormData.screenShotImage!)}
                                  className="p-2 bg-white rounded-lg text-gray-800 hover:bg-gray-100 transition-colors"
                                >
                                  <Eye size={18} />
                                </button>
                                {!viewingContact && (
                                  <button
                                    type="button"
                                    onClick={handleDeleteScreenshot}
                                    className="p-2 bg-red-500 rounded-lg text-white hover:bg-red-600 transition-colors"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                )}
                              </div>
                            </div>
                          ) : (
                            !viewingContact && (
                              <label className={cn(
                                "flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all",
                                isUploadingScreenshot && "opacity-60 cursor-wait"
                              )}>
                                {isUploadingScreenshot ? (
                                  <Loader2 size={24} className="animate-spin text-primary" />
                                ) : (
                                  <>
                                    <ImageIcon size={24} className="text-gray-400 mb-2" />
                                    <span className="text-xs font-bold text-gray-400">Click to upload screenshot</span>
                                    <span className="text-[10px] text-gray-300 mt-1">PNG, JPG up to 5MB</span>
                                  </>
                                )}
                                <input
                                  type="file"
                                  className="hidden"
                                  accept="image/*"
                                  onChange={handleScreenshotUpload}
                                  disabled={isUploadingScreenshot}
                                />
                              </label>
                            )
                          )}
                        </div>
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold text-primary dark:text-primary uppercase tracking-wider">Staff Information</h3>
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">TELE CALLING STAFF</label>
                          <input 
                            name="teleCallingStaff" 
                            list="staffList"
                            readOnly={!!viewingContact} 
                            value={modalFormData.teleCallingStaff || ''} 
                            onChange={handleModalInputChange} 
                            className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none dark:text-white" 
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">TECHNICAL STAFF</label>
                          <input 
                            name="technicalStaff" 
                            list="staffList"
                            readOnly={!!viewingContact} 
                            value={modalFormData.technicalStaff || ''} 
                            onChange={handleModalInputChange} 
                            className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none dark:text-white" 
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">TECHNICAL SHARE (%)</label>
                            <input name="technicalSharePercent" readOnly={!!viewingContact} value={modalFormData.technicalSharePercent || ''} onChange={handleModalInputChange} className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none dark:text-white" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">SALARY AMOUNT</label>
                            <input name="technicalSalaryAmount" readOnly={!!viewingContact} value={modalFormData.technicalSalaryAmount || ''} onChange={handleModalInputChange} className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none dark:text-white" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">PAID DATE</label>
                            <input name="technicalPaidDate" type="date" readOnly={!!viewingContact} value={modalFormData.technicalPaidDate || ''} onChange={handleModalInputChange} className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none dark:text-white" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">REMARKS</label>
                            <textarea name="technicalRemarks" readOnly={!!viewingContact} value={modalFormData.technicalRemarks || ''} onChange={handleModalInputChange} rows={1} className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none dark:text-white resize-none" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">TELECALLING SHARE (%)</label>
                            <input name="teleCallingSharePercent" readOnly={!!viewingContact} value={modalFormData.teleCallingSharePercent || ''} onChange={handleModalInputChange} className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none dark:text-white" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">SALARY AMOUNT</label>
                            <input name="teleCallingSalaryAmount" readOnly={!!viewingContact} value={modalFormData.teleCallingSalaryAmount || ''} onChange={handleModalInputChange} className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none dark:text-white" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">PAID DATE</label>
                            <input name="teleCallingPaidDate" type="date" readOnly={!!viewingContact} value={modalFormData.teleCallingPaidDate || ''} onChange={handleModalInputChange} className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none dark:text-white" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">REMARKS</label>
                            <textarea name="teleCallingRemarks" readOnly={!!viewingContact} value={modalFormData.teleCallingRemarks || ''} onChange={handleModalInputChange} rows={1} className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none dark:text-white resize-none" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">TELE TOTAL AMOUNT</label>
                            <input name="teleTotalAmount" readOnly={!!viewingContact} value={modalFormData.teleTotalAmount || ''} onChange={handleModalInputChange} className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none dark:text-white" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">TECHNICAL TOTAL AMOUNT</label>
                            <input name="technicalTotalAmount" readOnly={!!viewingContact} value={modalFormData.technicalTotalAmount || ''} onChange={handleModalInputChange} className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none dark:text-white" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 border-t border-gray-100 dark:border-slate-800 flex gap-3 bg-gray-50/50 dark:bg-slate-800/50">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3 rounded-xl text-sm font-bold text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    {viewingContact ? 'Close' : 'Cancel'}
                  </button>
                  {!viewingContact && (
                    <button 
                      type="submit"
                      className="flex-1 py-3 bg-primary rounded-xl text-sm font-bold text-white hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
                    >
                      {editingContact ? 'Update Contact' : 'Create Lead'}
                    </button>
                  )}
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
       {viewingImage && (
        <div
          className="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center p-4"
          onClick={() => setViewingImage(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
            onClick={() => setViewingImage(null)}
          >
            <X size={24} />
          </button>
          <img
            src={viewingImage}
            alt="Screenshot"
            className="max-w-full max-h-full object-contain rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
      {/* Datalists for editable dropdowns */}
      <datalist id="serviceTypesList">
        {serviceTypes.map(s => <option key={s} value={s} />)}
      </datalist>
      <datalist id="statusesList">
        {statuses.map(s => <option key={s} value={s} />)}
      </datalist>
      <datalist id="entryLeadsList">
        <option value="New" />
        <option value="Re_Entry" />
      </datalist>
      <datalist id="paymentStatusesList">
        {paymentStatuses.map(s => <option key={s} value={s} />)}
      </datalist>
      <datalist id="staffList">
        {staff.map(s => <option key={s} value={s} />)}
      </datalist>
      <datalist id="branchesList">
        {branches.map(s => <option key={s} value={s} />)}
      </datalist>
    </div>
  );
}
