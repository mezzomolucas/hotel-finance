import React, { createContext, useContext, useState, useEffect } from 'react';
import { Income, Expense, Receivable } from '../types';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import {
  collection, doc, getDocs, setDoc, updateDoc, deleteDoc,
  query, orderBy, writeBatch, serverTimestamp,
} from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { localDateStr } from '../lib/utils';

interface FinanceContextType {
  incomes: Income[];
  expenses: Expense[];
  receivables: Receivable[];
  addIncome: (income: Income) => Promise<void>;
  updateIncome: (income: Income) => Promise<void>;
  deleteIncome: (id: string) => Promise<void>;
  addExpense: (expense: Expense) => Promise<void>;
  updateExpense: (expense: Expense) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  addReceivable: (receivable: Receivable) => Promise<void>;
  updateReceivable: (receivable: Receivable) => Promise<void>;
  deleteReceivable: (id: string) => Promise<void>;
  loading: boolean;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchData(user.uid);
    } else {
      setIncomes([]);
      setExpenses([]);
      setReceivables([]);
      setLoading(false);
    }
  }, [user]);

  const userCol = (uid: string, name: string) => collection(db, 'users', uid, name);
  const userDoc = (uid: string, name: string, id: string) => doc(db, 'users', uid, name, id);

  const requireUser = () => {
    if (!user) throw new Error('User not authenticated');
    return user;
  };

  const checkOverdueItems = async (
    uid: string,
    currentIncomes: Income[],
    currentExpenses: Expense[],
    currentReceivables: Receivable[]
  ) => {
    const todayStr = localDateStr();
    const batch = writeBatch(db);
    let hasUpdates = false;

    const overdueReceivablesIds = currentReceivables
      .filter(r => r.status === 'Pending' && r.dueDate && r.dueDate.split('T')[0] < todayStr)
      .map(r => r.id);
    overdueReceivablesIds.forEach(id => { batch.update(userDoc(uid, 'receivables', id), { status: 'Overdue' }); hasUpdates = true; });

    const overdueExpensesIds = currentExpenses
      .filter(e => e.status === 'Pending' && e.dueDate && e.dueDate.split('T')[0] < todayStr)
      .map(e => e.id);
    overdueExpensesIds.forEach(id => { batch.update(userDoc(uid, 'expenses', id), { status: 'Overdue' }); hasUpdates = true; });

    const overdueIncomesIds = currentIncomes
      .filter(i => i.status === 'Pending' && i.checkOut && i.checkOut.split('T')[0] < todayStr)
      .map(i => i.id);
    overdueIncomesIds.forEach(id => { batch.update(userDoc(uid, 'incomes', id), { status: 'Overdue' }); hasUpdates = true; });

    if (hasUpdates) {
      await batch.commit();
      if (overdueReceivablesIds.length > 0)
        setReceivables(prev => prev.map(r => overdueReceivablesIds.includes(r.id) ? { ...r, status: 'Overdue' } : r));
      if (overdueExpensesIds.length > 0)
        setExpenses(prev => prev.map(e => overdueExpensesIds.includes(e.id) ? { ...e, status: 'Overdue' } : e));
      if (overdueIncomesIds.length > 0)
        setIncomes(prev => prev.map(i => overdueIncomesIds.includes(i.id) ? { ...i, status: 'Overdue' } : i));
    }
  };

  const fetchData = async (uid: string) => {
    setLoading(true);
    try {
      const [incomesSnap, expensesSnap, receivablesSnap] = await Promise.all([
        getDocs(query(userCol(uid, 'incomes'), orderBy('createdAt', 'desc'))),
        getDocs(query(userCol(uid, 'expenses'), orderBy('createdAt', 'desc'))),
        getDocs(query(userCol(uid, 'receivables'), orderBy('createdAt', 'desc'))),
      ]);

      const loadedIncomes: Income[] = incomesSnap.docs.map(d => {
        const data = d.data();
        return { id: d.id, guestName: data.guestName, checkIn: data.checkIn, checkOut: data.checkOut, paymentDate: data.paymentDate, dailyRate: data.dailyRate, extraConsumption: data.extraConsumption, total: data.total, paymentMethod: data.paymentMethod, status: data.status, invoiceIssued: data.invoiceIssued };
      });

      const loadedExpenses: Expense[] = expensesSnap.docs.map(d => {
        const data = d.data();
        return { id: d.id, description: data.description, category: data.category, amount: data.amount, dueDate: data.dueDate, paymentDate: data.paymentDate, status: data.status, hasReceipt: data.hasReceipt };
      });

      const loadedReceivables: Receivable[] = receivablesSnap.docs.map(d => {
        const data = d.data();
        return { id: d.id, source: data.source, amount: data.amount, dueDate: data.dueDate, status: data.status };
      });

      setIncomes(loadedIncomes);
      setExpenses(loadedExpenses);
      setReceivables(loadedReceivables);

      await checkOverdueItems(uid, loadedIncomes, loadedExpenses, loadedReceivables);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const addIncome = async (income: Income) => {
    const u = requireUser();

    if (income.paymentMethod === 'A Prazo') {
      await addReceivable({
        id: uuidv4(),
        source: income.guestName as any,
        amount: income.total,
        dueDate: income.checkOut || localDateStr(),
        status: 'Pending',
      });
      return;
    }

    await setDoc(userDoc(u.uid, 'incomes', income.id), {
      guestName: income.guestName, checkIn: income.checkIn, checkOut: income.checkOut,
      paymentDate: income.paymentDate, dailyRate: income.dailyRate,
      extraConsumption: income.extraConsumption, total: income.total,
      paymentMethod: income.paymentMethod, status: income.status,
      invoiceIssued: income.invoiceIssued, createdAt: serverTimestamp(),
    });
    setIncomes(prev => [income, ...prev]);
  };

  const updateIncome = async (updated: Income) => {
    const u = requireUser();
    await updateDoc(userDoc(u.uid, 'incomes', updated.id), {
      guestName: updated.guestName, checkIn: updated.checkIn, checkOut: updated.checkOut,
      paymentDate: updated.paymentDate, dailyRate: updated.dailyRate,
      extraConsumption: updated.extraConsumption, total: updated.total,
      paymentMethod: updated.paymentMethod, status: updated.status,
      invoiceIssued: updated.invoiceIssued,
    });
    setIncomes(prev => prev.map(i => i.id === updated.id ? updated : i));
  };

  const deleteIncome = async (id: string) => {
    const u = requireUser();
    await deleteDoc(userDoc(u.uid, 'incomes', id));
    setIncomes(prev => prev.filter(i => i.id !== id));
  };

  const addExpense = async (expense: Expense) => {
    const u = requireUser();
    await setDoc(userDoc(u.uid, 'expenses', expense.id), {
      description: expense.description, category: expense.category, amount: expense.amount,
      dueDate: expense.dueDate, paymentDate: expense.paymentDate,
      status: expense.status, hasReceipt: expense.hasReceipt, createdAt: serverTimestamp(),
    });
    setExpenses(prev => [expense, ...prev]);
  };

  const updateExpense = async (updated: Expense) => {
    const u = requireUser();
    await updateDoc(userDoc(u.uid, 'expenses', updated.id), {
      description: updated.description, category: updated.category, amount: updated.amount,
      dueDate: updated.dueDate, paymentDate: updated.paymentDate,
      status: updated.status, hasReceipt: updated.hasReceipt,
    });
    setExpenses(prev => prev.map(e => e.id === updated.id ? updated : e));
  };

  const deleteExpense = async (id: string) => {
    const u = requireUser();
    await deleteDoc(userDoc(u.uid, 'expenses', id));
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  const addReceivable = async (receivable: Receivable) => {
    const u = requireUser();
    await setDoc(userDoc(u.uid, 'receivables', receivable.id), {
      source: receivable.source, amount: receivable.amount,
      dueDate: receivable.dueDate, status: receivable.status, createdAt: serverTimestamp(),
    });
    setReceivables(prev => [receivable, ...prev]);
  };

  const updateReceivable = async (updated: Receivable) => {
    const u = requireUser();
    await updateDoc(userDoc(u.uid, 'receivables', updated.id), {
      source: updated.source, amount: updated.amount, dueDate: updated.dueDate, status: updated.status,
    });
    setReceivables(prev => prev.map(r => r.id === updated.id ? updated : r));
  };

  const deleteReceivable = async (id: string) => {
    const u = requireUser();
    await deleteDoc(userDoc(u.uid, 'receivables', id));
    setReceivables(prev => prev.filter(r => r.id !== id));
  };

  return (
    <FinanceContext.Provider value={{
      incomes, expenses, receivables,
      addIncome, updateIncome, deleteIncome,
      addExpense, updateExpense, deleteExpense,
      addReceivable, updateReceivable, deleteReceivable,
      loading,
    }}>
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (context === undefined) throw new Error('useFinance must be used within a FinanceProvider');
  return context;
};
