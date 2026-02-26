import { v4 as uuidv4 } from 'uuid';

export type PaymentMethod = 'Credit Card' | 'Debit Card' | 'Cash' | 'Pix' | 'Transfer' | 'A Prazo';
export type PaymentStatus = 'Paid' | 'Pending' | 'Overdue' | 'Cancelled';
export type ExpenseCategory = 'Cleaning' | 'Utilities' | 'Staff' | 'Maintenance' | 'Supplies' | 'Marketing' | 'Water' | 'Electricity' | 'Laundry' | 'OTA Commission' | 'Payroll' | 'Other';
export type ReceivableSource = 'Booking.com' | 'Expedia' | 'Airbnb' | 'Direct' | 'Corporate' | string;

export interface Income {
  id: string;
  guestName: string;
  checkIn?: string; // ISO Date (Optional)
  checkOut?: string; // ISO Date (Optional)
  paymentDate: string; // ISO Date (Mandatory)
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
  dueDate: string; // ISO Date
  paymentDate?: string; // ISO Date (Optional, for paid items)
  status: PaymentStatus;
  hasReceipt: boolean;
}

export interface Receivable {
  id: string;
  source: ReceivableSource;
  amount: number;
  dueDate: string; // ISO Date
  status: PaymentStatus;
}

export const initialIncomes: Income[] = [
  {
    id: uuidv4(),
    guestName: 'John Doe',
    checkIn: '2024-03-01',
    checkOut: '2024-03-05',
    paymentDate: '2024-03-05',
    dailyRate: 150,
    extraConsumption: 50,
    total: 650,
    paymentMethod: 'Credit Card',
    status: 'Paid',
    invoiceIssued: true,
  },
  {
    id: uuidv4(),
    guestName: 'Jane Smith',
    checkIn: '2024-03-10',
    checkOut: '2024-03-12',
    paymentDate: '2024-03-12',
    dailyRate: 180,
    extraConsumption: 20,
    total: 380,
    paymentMethod: 'Pix',
    status: 'Paid',
    invoiceIssued: false,
  },
];

export const initialExpenses: Expense[] = [
  {
    id: uuidv4(),
    description: 'Cleaning Supplies',
    category: 'Cleaning',
    amount: 120.50,
    dueDate: '2024-03-02',
    status: 'Paid',
    hasReceipt: true,
  },
  {
    id: uuidv4(),
    description: 'Electricity Bill',
    category: 'Utilities',
    amount: 450.00,
    dueDate: '2024-03-15',
    status: 'Pending',
    hasReceipt: true,
  },
];

export const initialReceivables: Receivable[] = [
  {
    id: uuidv4(),
    source: 'Booking.com',
    amount: 1250.00,
    dueDate: '2024-04-05',
    status: 'Pending',
  },
];
