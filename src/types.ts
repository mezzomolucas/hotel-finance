export type PaymentMethod = 'Credit Card' | 'Debit Card' | 'Cash' | 'Pix' | 'Transfer' | 'A Prazo';
export type PaymentStatus = 'Paid' | 'Pending' | 'Overdue' | 'Cancelled';
export type ExpenseCategory = 'Cleaning' | 'Utilities' | 'Staff' | 'Maintenance' | 'Supplies' | 'Marketing' | 'Water' | 'Electricity' | 'Laundry' | 'OTA Commission' | 'Payroll' | 'Other';
export type ReceivableSource = 'Booking.com' | 'Expedia' | 'Airbnb' | 'Direct' | 'Corporate' | string;

export interface Income {
  id: string;
  guestName: string;
  checkIn?: string;
  checkOut?: string;
  paymentDate: string;
  dailyRate: number;
  extraConsumption: number;
  total: number;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  invoiceIssued: boolean;
}

export interface Expense {
  id: string;
  description: string;
  category: ExpenseCategory;
  amount: number;
  dueDate: string;
  paymentDate?: string;
  status: PaymentStatus;
  hasReceipt: boolean;
}

export interface Receivable {
  id: string;
  source: ReceivableSource;
  amount: number;
  dueDate: string;
  status: PaymentStatus;
}
