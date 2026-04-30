export interface Contact {
  id: string;
  orderNumber: string;
  entryLeads: string;
  ctn: string;
  date: string;
  teleCallingStaff: string;
  technicalStaff: string;
  customerContactNumber: string;
  customerName: string;
  customerRequirement: string;
  currentStatus: string;
  detailsNotes: string;
  claimApplyDate: string;
  followUpDate: string;
  serviceCharges: string;
  paymentStatus: string;
  pdfFileSend: string;
  receiveAmount: string;
  transactionId: string;
  receiveDate: string;
  remarks: string;
  technicalSharePercent: string;
  technicalSalaryAmount: string;
  technicalPaidDate: string;
  technicalRemarks: string;
  teleCallingSharePercent: string;
  teleCallingSalaryAmount: string;
  teleCallingPaidDate: string;
  teleCallingRemarks: string;
  teleTotalAmount: string;
  technicalTotalAmount: string;
  isFavorite: boolean;
  screenShotImage: string;
  createdByUserId: string;
  createdByUserName: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'User' | 'Technical' | 'TeleCalling' | 'Account';
  avatar?: string;
  phone?: string;
  location?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'reminder' | 'update';
  timestamp: string;
  isRead: boolean;
}

export interface Income {
  id: string;
  date: string;
  staffName: string;
  staffRole: 'TeleCalling' | 'Technical';
  serviceCharges: string;
  paymentStatus: string;
  receiveAmount: string;
  transactionId: string;
  receiveDate: string;
  screenshotImage: string;
  bankTransactionId: string;
  employeeTransactionId: string;
  isVerified: boolean;
  createdAt: string;
}

export interface Expense {
  id: string;
  date: string;
  productName: string;
  quantity: number;
  amount: string;
  transactionId: string;
  billScreenshot: string;
  productScreenshot: string;
  createdAt: string;
}
