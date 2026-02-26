import React, { createContext, useContext, useState, useEffect } from 'react';
import { Income, Expense, Receivable } from '../types';
import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

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
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only fetch data if user is authenticated
    const checkUserAndFetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        fetchData();
      } else {
        setLoading(false);
      }
    };
    
    checkUserAndFetch();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchData();
      } else {
        setIncomes([]);
        setExpenses([]);
        setReceivables([]);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkOverdueItems = async (
    currentIncomes: Income[],
    currentExpenses: Expense[],
    currentReceivables: Receivable[]
  ) => {
    const now = new Date();
    // Ensure we are comparing against local date string YYYY-MM-DD
    const todayStr = now.toLocaleDateString('pt-BR').split('/').reverse().join('-');

    // 1. Batch Update Receivables
    const overdueReceivablesIds = currentReceivables
      .filter(r => r.status === 'Pending' && r.dueDate && r.dueDate.split('T')[0] < todayStr)
      .map(r => r.id);

    if (overdueReceivablesIds.length > 0) {
      await supabase
        .from('receivables')
        .update({ status: 'Overdue' })
        .in('id', overdueReceivablesIds);
      
      // Update local state immediately
      setReceivables(prev => prev.map(r => 
        overdueReceivablesIds.includes(r.id) ? { ...r, status: 'Overdue' } : r
      ));
    }

    // 2. Batch Update Expenses
    const overdueExpensesIds = currentExpenses
      .filter(e => e.status === 'Pending' && e.dueDate && e.dueDate.split('T')[0] < todayStr)
      .map(e => e.id);

    if (overdueExpensesIds.length > 0) {
      await supabase
        .from('expenses')
        .update({ status: 'Overdue' })
        .in('id', overdueExpensesIds);

      // Update local state immediately
      setExpenses(prev => prev.map(e => 
        overdueExpensesIds.includes(e.id) ? { ...e, status: 'Overdue' } : e
      ));
    }
    
    // 3. Batch Update Incomes
    const overdueIncomesIds = currentIncomes
      .filter(i => i.status === 'Pending' && i.checkOut && i.checkOut.split('T')[0] < todayStr)
      .map(i => i.id);

    if (overdueIncomesIds.length > 0) {
      await supabase
        .from('incomes')
        .update({ status: 'Overdue' })
        .in('id', overdueIncomesIds);

      // Update local state immediately
      setIncomes(prev => prev.map(i => 
        overdueIncomesIds.includes(i.id) ? { ...i, status: 'Overdue' } : i
      ));
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

      const [incomesRes, expensesRes, receivablesRes] = await Promise.all([
        supabase.from('incomes').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('expenses').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('receivables').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      ]);

      let loadedIncomes: Income[] = [];
      let loadedExpenses: Expense[] = [];
      let loadedReceivables: Receivable[] = [];

      if (incomesRes.data) loadedIncomes = incomesRes.data.map(mapIncomeFromDb);
      if (expensesRes.data) loadedExpenses = expensesRes.data.map(mapExpenseFromDb);
      if (receivablesRes.data) loadedReceivables = receivablesRes.data.map(mapReceivableFromDb);

      setIncomes(loadedIncomes);
      setExpenses(loadedExpenses);
      setReceivables(loadedReceivables);

      // Check for overdue items after loading
      await checkOverdueItems(loadedIncomes, loadedExpenses, loadedReceivables);

    } catch (error: any) {
      console.error('Error fetching data:', error);
      if (error?.code === 'PGRST205' || error?.message?.includes('relation') || error?.message?.includes('does not exist')) {
        console.warn('Supabase tables not found. Please run the SQL schema provided in supabase_schema.sql');
      }
    } finally {
      setLoading(false);
    }
  };

  // Mappers
  const mapIncomeFromDb = (dbIncome: any): Income => ({
    id: dbIncome.id,
    guestName: dbIncome.guest_name,
    checkIn: dbIncome.check_in,
    checkOut: dbIncome.check_out,
    paymentDate: dbIncome.payment_date,
    dailyRate: dbIncome.daily_rate,
    extraConsumption: dbIncome.extra_consumption,
    total: dbIncome.total,
    paymentMethod: dbIncome.payment_method,
    status: dbIncome.status,
    invoiceIssued: dbIncome.invoice_issued,
  });

  const mapExpenseFromDb = (dbExpense: any): Expense => ({
    id: dbExpense.id,
    description: dbExpense.description,
    category: dbExpense.category,
    amount: dbExpense.amount,
    dueDate: dbExpense.due_date,
    paymentDate: dbExpense.payment_date,
    status: dbExpense.status,
    hasReceipt: dbExpense.has_receipt,
  });

  const mapReceivableFromDb = (dbReceivable: any): Receivable => ({
    id: dbReceivable.id,
    source: dbReceivable.source,
    amount: dbReceivable.amount,
    dueDate: dbReceivable.due_date,
    status: dbReceivable.status,
  });

  // Actions
  const addIncome = async (income: Income) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('User not authenticated');
      return;
    }

    // Logic for 'A Prazo' (On Credit)
    if (income.paymentMethod === 'A Prazo') {
      // Create ONLY a Receivable, DO NOT create an Income yet
      const receivable: Receivable = {
        id: uuidv4(),
        source: income.guestName as any, 
        amount: income.total,
        dueDate: income.checkOut || new Date().toISOString(),
        status: 'Pending',
      };
      
      await addReceivable(receivable);
      return; // Stop here, do not insert into incomes table
    }

    const { data, error } = await supabase.from('incomes').insert([{
      id: income.id,
      guest_name: income.guestName,
      check_in: income.checkIn,
      check_out: income.checkOut,
      payment_date: income.paymentDate,
      daily_rate: income.dailyRate,
      extra_consumption: income.extraConsumption,
      total: income.total,
      payment_method: income.paymentMethod,
      status: income.status,
      invoice_issued: income.invoiceIssued,
      user_id: user.id
    }]).select();

    if (error) {
      console.error('Error adding income:', error);
      throw error;
    }

    if (data) {
      setIncomes([mapIncomeFromDb(data[0]), ...incomes]);
    }
  };

  const updateIncome = async (updated: Income) => {
    const { error } = await supabase.from('incomes').update({
      guest_name: updated.guestName,
      check_in: updated.checkIn,
      check_out: updated.checkOut,
      payment_date: updated.paymentDate,
      daily_rate: updated.dailyRate,
      extra_consumption: updated.extraConsumption,
      total: updated.total,
      payment_method: updated.paymentMethod,
      status: updated.status,
      invoice_issued: updated.invoiceIssued,
    }).eq('id', updated.id);

    if (error) {
      console.error('Error updating income:', error);
      throw error;
    }

    setIncomes(incomes.map(i => i.id === updated.id ? updated : i));
  };

  const deleteIncome = async (id: string) => {
    const { error } = await supabase.from('incomes').delete().eq('id', id);
    
    if (error) {
      console.error('Error deleting income:', error);
      throw error;
    }

    setIncomes(incomes.filter(i => i.id !== id));
  };

  const addExpense = async (expense: Expense) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('User not authenticated');
      return;
    }

    const { data, error } = await supabase.from('expenses').insert([{
      id: expense.id,
      description: expense.description,
      category: expense.category,
      amount: expense.amount,
      due_date: expense.dueDate,
      payment_date: expense.paymentDate,
      status: expense.status,
      has_receipt: expense.hasReceipt,
      user_id: user.id
    }]).select();

    if (error) {
      console.error('Error adding expense:', error);
      throw error;
    }

    if (data) {
      setExpenses([mapExpenseFromDb(data[0]), ...expenses]);
    }
  };

  const updateExpense = async (updated: Expense) => {
    const { error } = await supabase.from('expenses').update({
      description: updated.description,
      category: updated.category,
      amount: updated.amount,
      due_date: updated.dueDate,
      payment_date: updated.paymentDate,
      status: updated.status,
      has_receipt: updated.hasReceipt,
    }).eq('id', updated.id);

    if (error) {
      console.error('Error updating expense:', error);
      throw error;
    }

    setExpenses(expenses.map(e => e.id === updated.id ? updated : e));
  };

  const deleteExpense = async (id: string) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    
    if (error) {
      console.error('Error deleting expense:', error);
      throw error;
    }

    setExpenses(expenses.filter(e => e.id !== id));
  };

  const addReceivable = async (receivable: Receivable) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('User not authenticated');
      return;
    }

    const { data, error } = await supabase.from('receivables').insert([{
      id: receivable.id,
      source: receivable.source,
      amount: receivable.amount,
      due_date: receivable.dueDate,
      status: receivable.status,
      user_id: user.id
    }]).select();

    if (error) {
      console.error('Error adding receivable:', error);
      throw error;
    }

    if (data) {
      setReceivables([mapReceivableFromDb(data[0]), ...receivables]);
    }
  };

  const updateReceivable = async (updated: Receivable) => {
    const { error } = await supabase.from('receivables').update({
      source: updated.source,
      amount: updated.amount,
      due_date: updated.dueDate,
      status: updated.status,
    }).eq('id', updated.id);

    if (error) {
      console.error('Error updating receivable:', error);
      throw error;
    }

    setReceivables(receivables.map(r => r.id === updated.id ? updated : r));
  };

  const deleteReceivable = async (id: string) => {
    const { error } = await supabase.from('receivables').delete().eq('id', id);
    
    if (error) {
      console.error('Error deleting receivable:', error);
      throw error;
    }

    setReceivables(receivables.filter(r => r.id !== id));
  };

  return (
    <FinanceContext.Provider value={{
      incomes, expenses, receivables,
      addIncome, updateIncome, deleteIncome,
      addExpense, updateExpense, deleteExpense,
      addReceivable, updateReceivable, deleteReceivable,
      loading
    }}>
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (context === undefined) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};
