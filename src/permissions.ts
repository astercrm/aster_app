// ─────────────────────────────────────────────────────────────────────────────
// ROLE PERMISSIONS
// Defines which contact fields each role can see / create / edit
// ─────────────────────────────────────────────────────────────────────────────

export type AppRole = 'Admin' | 'User' | 'Technical' | 'TeleCalling' | 'Account';

export interface RolePermissions {
  // Contact list / table
  canViewContacts: boolean;
  canCreateContact: boolean;
  canEditContact: boolean;
  canDeleteContact: boolean;
  canBulkUpload: boolean;
  canExport: boolean;
  canToggleFavorite: boolean;

  // Which fields are visible in the form / view modal
  visibleFields: ContactFieldGroup[];

  // Which fields can be edited (subset of visibleFields)
  editableFields: ContactFieldGroup[];

  // Admin panel access
  canAccessAdmin: boolean;
}

// Field groups that map to sections of the contact form
export type ContactFieldGroup =
  | 'ctn_to_remarks'                // CTN → Remarks (all basic info fields)
  | 'ctn_to_remarks_technical'      // CTN → Remarks minus claimApplyDate, followUpDate, pdfFileSend, remarks
  | 'ctn_to_current_status'         // CTN → Current Status only (TeleCalling subset)
  | 'salary_amount'                 // receiveAmount / serviceCharges / amounts
  | 'technical_share'               // technicalSharePercent, technicalSalaryAmount, etc.
  | 'telecalling_share'             // teleCallingSharePercent, teleCallingSalaryAmount, etc.
  | 'screenshot';                   // Screenshot image

// ─── Individual field lists per group ────────────────────────────────────────

export const CTN_TO_REMARKS_FIELDS = [
  'orderNumber', 'entryLeads', 'ctn', 'date',
  'teleCallingStaff', 'technicalStaff',
  'customerContactNumber', 'customerName', 'customerRequirement',
  'currentStatus', 'detailsNotes',
  'claimApplyDate', 'followUpDate',
  'serviceCharges', 'paymentStatus', 'pdfFileSend',
  'receiveAmount', 'transactionId', 'receiveDate',
  'remarks',
] as const;

export const CTN_TO_CURRENT_STATUS_FIELDS = [
  'orderNumber', 'entryLeads', 'ctn', 'date',
  'teleCallingStaff', 'technicalStaff',
  'customerContactNumber', 'customerName', 'customerRequirement',
  'currentStatus',
] as const;

// Technical role: CTN → Remarks but WITHOUT claimApplyDate, followUpDate, pdfFileSend, remarks
export const CTN_TO_REMARKS_TECHNICAL_FIELDS = [
  'orderNumber', 'entryLeads', 'ctn', 'date',
  'teleCallingStaff', 'technicalStaff',
  'customerContactNumber', 'customerName', 'customerRequirement',
  'currentStatus', 'detailsNotes',
  'serviceCharges', 'paymentStatus',
  'receiveAmount', 'transactionId', 'receiveDate',
] as const;

export const SALARY_AMOUNT_FIELDS = [
  'serviceCharges', 'receiveAmount', 'paymentStatus',
  'transactionId', 'receiveDate',
  'teleTotalAmount', 'technicalTotalAmount',
] as const;

export const TECHNICAL_SHARE_FIELDS = [
  'technicalSharePercent', 'technicalSalaryAmount',
  'technicalPaidDate', 'technicalRemarks', 'technicalTotalAmount',
] as const;

export const TELECALLING_SHARE_FIELDS = [
  'teleCallingSharePercent', 'teleCallingSalaryAmount',
  'teleCallingPaidDate', 'teleCallingRemarks', 'teleTotalAmount',
] as const;

// ─── Role definitions ─────────────────────────────────────────────────────────

export const ROLE_PERMISSIONS: Record<AppRole, RolePermissions> = {
  Admin: {
    canViewContacts: true,
    canCreateContact: true,
    canEditContact: true,
    canDeleteContact: true,
    canBulkUpload: true,
    canExport: true,
    canToggleFavorite: true,
    visibleFields: ['ctn_to_remarks', 'salary_amount', 'technical_share', 'telecalling_share', 'screenshot'],
    editableFields: ['ctn_to_remarks', 'salary_amount', 'technical_share', 'telecalling_share', 'screenshot'],
    canAccessAdmin: true,
  },

  User: {
    canViewContacts: true,
    canCreateContact: true,
    canEditContact: true,
    canDeleteContact: false,
    canBulkUpload: true,
    canExport: true,
    canToggleFavorite: true,
    visibleFields: ['ctn_to_remarks', 'salary_amount', 'technical_share', 'telecalling_share', 'screenshot'],
    editableFields: ['ctn_to_remarks', 'salary_amount', 'technical_share', 'telecalling_share', 'screenshot'],
    canAccessAdmin: false,
  },

  // Technical: CTN → Remarks + Salary/Payment fields (create/edit/view) + Technical Share (view only)
  Technical: {
    canViewContacts: true,
    canCreateContact: true,
    canEditContact: true,
    canDeleteContact: false,
    canBulkUpload: false,
    canExport: false,
    canToggleFavorite: true,
    visibleFields: ['ctn_to_remarks', 'salary_amount', 'technical_share', 'screenshot'],
    editableFields: ['ctn_to_remarks', 'salary_amount', 'screenshot'], // technical_share is view-only
    canAccessAdmin: false,
  },

  // TeleCalling: CTN → Current Status + Salary/Payment fields (create/edit/view/fav) + TeleCalling Share (view only)
  TeleCalling: {
    canViewContacts: true,
    canCreateContact: true,
    canEditContact: true,
    canDeleteContact: false,
    canBulkUpload: false,
    canExport: false,
    canToggleFavorite: true,
    visibleFields: ['ctn_to_current_status', 'salary_amount', 'telecalling_share', 'screenshot'],
    editableFields: ['ctn_to_current_status', 'salary_amount', 'screenshot'], // telecalling_share is view-only
    canAccessAdmin: false,
  },

  // Account: View-only contacts, access admin panel for Incomes/Expenses
  Account: {
    canViewContacts: true,
    canCreateContact: false,
    canEditContact: false,
    canDeleteContact: false,
    canBulkUpload: false,
    canExport: true,
    canToggleFavorite: false,
    visibleFields: ['ctn_to_remarks', 'salary_amount', 'technical_share', 'telecalling_share'],
    editableFields: [],
    canAccessAdmin: true,
  },
};

// ─── Helper: is a field visible for a role? ───────────────────────────────────
export function isFieldVisible(fieldName: string, role: AppRole): boolean {
  const perms = ROLE_PERMISSIONS[role];
  return perms.visibleFields.some(group => getFieldsForGroup(group).includes(fieldName as any));
}

export function isFieldEditable(fieldName: string, role: AppRole): boolean {
  const perms = ROLE_PERMISSIONS[role];
  return perms.editableFields.some(group => getFieldsForGroup(group).includes(fieldName as any));
}

export function getFieldsForGroup(group: ContactFieldGroup): readonly string[] {
  switch (group) {
    case 'ctn_to_remarks':              return CTN_TO_REMARKS_FIELDS;
    case 'ctn_to_remarks_technical':    return CTN_TO_REMARKS_TECHNICAL_FIELDS;
    case 'ctn_to_current_status':       return CTN_TO_CURRENT_STATUS_FIELDS;
    case 'salary_amount':               return SALARY_AMOUNT_FIELDS;
    case 'technical_share':             return TECHNICAL_SHARE_FIELDS;
    case 'telecalling_share':           return TELECALLING_SHARE_FIELDS;
    case 'screenshot':                  return ['screenShotImage'];
    default:                            return [];
  }
}

export const ROLE_BADGE_COLORS: Record<AppRole, string> = {
  Admin:       'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  User:        'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  Technical:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  TeleCalling: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  Account:     'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
};

export const ALL_ROLES: AppRole[] = ['Admin', 'User', 'Technical', 'TeleCalling', 'Account'];