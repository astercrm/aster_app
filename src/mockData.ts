import { Contact } from './types';

export const serviceTypes = ['F31 Advance', 'UAN Activation', 'KYC Bank Add', 'Bank add', 'Uan Find & Activation', 'Other', 'Online JD', 'F13_File Transfor', 'E_Nominee Add', '10C_Pension withdrown', 'F19_Final Settelment', 'PF Withdrawal', 'Pension Claim', 'Death Claim', 'Transfer Claim'];
export const staff = ['Jaya', 'Kowsalya', 'Revathi', 'Poornima', 'Anusakthiya', 'Shobana', 'Deepa', 'Ramya'];
export const branches = ['ERD_Kowsalya', 'SLM_Shobana', 'CBE_Deepa', 'TRY_Ramya', 'NKL_Poornima', 'MDU_Anusakthiya'];
export const statuses = ['New', 'Completed', 'Complete', 'Pending'];
export const paymentStatuses = ['Full Paid', 'Partially Paid'];

export const generateMockContacts = (count: number): Contact[] => {
  const contacts: Contact[] = [];
  const firstNames = ['Ananthan', 'Shanthi', 'Francis', 'Lasar', 'Palani', 'Kumar', 'Kathir', 'Lenin', 'Aravind', 'Jaisivan', 'Velmurugan', 'Arjun', 'Deepak', 'Sanjay', 'Priya', 'Meena', 'Kavitha', 'Rajesh', 'Suresh', 'Vijay', 'Karthik', 'Naveen', 'Senthil', 'Murugan', 'Ganesh', 'Lakshmi', 'Saraswathi', 'Bhuvaneswari', 'Gayathri', 'Nandhini'];
  const lastNames = ['S', 'M', 'K', 'R', 'P', 'V', 'A', 'N', 'T', 'L', 'G', 'B', 'D', 'J'];

  for (let i = 1; i <= count; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const service = serviceTypes[Math.floor(Math.random() * serviceTypes.length)];
    const creator = staff[Math.floor(Math.random() * staff.length)];
    const branch = branches[Math.floor(Math.random() * branches.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)] as any;
    const paymentStatus = paymentStatuses[Math.floor(Math.random() * paymentStatuses.length)] as any;
    
    const date = new Date(2026, 0, Math.floor(Math.random() * 60) + 1);
    const dateStr = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');

    const totalAmount = Math.floor(Math.random() * 10) * 100 + 300;
    const paidAmount = paymentStatus === 'Full Paid' ? totalAmount : Math.floor(totalAmount / 2);

    contacts.push({
      id: `c-${i}`,
      orderNumber: `ORD-${1000 + i}`,
      entryLeads: Math.random() > 0.7 ? 'Re_Entry' : 'New',
      ctn: `PT 26 ${Math.floor(1000 + Math.random() * 9000)}`,
      date: dateStr,
      teleCallingStaff: creator,
      technicalStaff: branch,
      customerContactNumber: `${Math.floor(6000000000 + Math.random() * 3999999999)}`,
      customerName: `${firstName} ${lastName}`,
      customerRequirement: service,
      currentStatus: status,
      detailsNotes: Math.random() > 0.5 ? 'Processing details updated.' : '',
      claimApplyDate: dateStr,
      followUpDate: Math.random() > 0.8 ? '25-Mar-2026' : '',
      serviceCharges: totalAmount.toString(),
      paymentStatus: paymentStatus,
      pdfFileSend: Math.random() > 0.5 ? 'Yes' : 'No',
      screenShotImage: 'No',
      receiveAmount: paidAmount.toString(),
      transactionId: `T${Date.now()}${i}`,
      receiveDate: dateStr,
      remarks: '',
      technicalSharePercent: '10',
      technicalSalaryAmount: '500',
      technicalPaidDate: '',
      technicalRemarks: Math.random() > 0.5 ? 'Send Accounts Group' : '',
      teleCallingSharePercent: '5',
      teleCallingSalaryAmount: '200',
      teleCallingPaidDate: '',
      teleCallingRemarks: '',
      teleTotalAmount: '700',
      technicalTotalAmount: '1200',
      isFavorite: false,
      createdByUserId: '',
      createdByUserName: '',
    });
  }
  return contacts;
};

export const MOCK_CONTACTS = generateMockContacts(1000);

export const MOCK_USER: any = {
  id: 'u-1',
  name: 'Admin User',
  email: 'admin@connecthub.ai',
  role: 'Admin',
};

export const MOCK_NOTIFICATIONS: any[] = [
  {
    id: 'n-1',
    title: 'Follow-up Reminder',
    message: 'Follow up with Arjun Sharma regarding the project proposal.',
    type: 'reminder',
    timestamp: new Date().toISOString(),
    isRead: false
  },
  {
    id: 'n-2',
    title: 'System Update',
    message: 'New AI search features have been deployed.',
    type: 'update',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    isRead: true
  }
];
