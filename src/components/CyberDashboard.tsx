import React, { useMemo, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, formatDate } from '../lib/utils';
import { CyberCard } from '../components/ui/CyberCard';
import { CyberButton } from '../components/ui/CyberButton';
import { CyberInput } from '../components/ui/CyberInput';
import { TrendingUp, TrendingDown, Activity, Zap, Plus, Calendar, AlertTriangle, Bell } from 'lucide-react';
import { motion } from 'motion/react';
import { v4 as uuidv4 } from 'uuid';
import { ExpenseCategory } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { 
  isSameDay, isSameWeek, isSameMonth, parseISO, subDays, format, isAfter, isBefore, addDays, startOfDay 
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { useNavigate } from 'react-router-dom';

export const CyberDashboard: React.FC = () => {
  const { incomes, expenses, receivables, addIncome, addExpense } = useFinance();
  const navigate = useNavigate();
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all' | 'custom'>('month');
  
  // Custom Date Range State
  const [customDateRange, setCustomDateRange] = useState<{ start: string; end: string }>({
    start: format(startOfDay(new Date()), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });

  // Quick Form States
  const [incomeForm, setIncomeForm] = useState({
    guestName: '',
    amount: '',
    source: 'Direct'
  });
  
  const [expenseForm, setExpenseForm] = useState({
    description: '',
    amount: '',
    category: 'Other'
  });

  // Filter Data Logic
  const filteredData = useMemo(() => {
    const now = new Date();
    
    const filterFn = (dateStr: string, status?: string) => {
      if (status && status !== 'Paid') return false; // Only show Paid items in charts/totals
      if (dateFilter === 'all') return true;
      if (!dateStr) return false;
      const date = parseISO(dateStr);
      if (dateFilter === 'today') return isSameDay(date, now);
      if (dateFilter === 'week') return isSameWeek(date, now, { locale: ptBR });
      if (dateFilter === 'month') return isSameMonth(date, now);
      if (dateFilter === 'custom') {
        const start = parseISO(customDateRange.start);
        const end = parseISO(customDateRange.end);
        // Ensure end date includes the full day
        const endOfDayDate = new Date(end);
        endOfDayDate.setHours(23, 59, 59, 999);
        return isAfter(date, subDays(start, 1)) && isBefore(date, addDays(endOfDayDate, 0));
      }
      return true;
    };

    return {
      incomes: incomes.filter(i => filterFn(i.paymentDate, i.status)), // Use paymentDate for Incomes, filter by status
      expenses: expenses.filter(e => filterFn(e.paymentDate || e.dueDate, e.status)), // Use paymentDate if available, else dueDate, filter by status
    };
  }, [incomes, expenses, dateFilter, customDateRange]);

  // Calculate Totals
  const totals = useMemo(() => {
    const totalIncome = filteredData.incomes.reduce((acc, curr) => acc + curr.total, 0);
    const totalExpense = filteredData.expenses.reduce((acc, curr) => acc + curr.amount, 0);
    return {
      income: totalIncome,
      expense: totalExpense,
      profit: totalIncome - totalExpense
    };
  }, [filteredData]);

  // KPIs
  const kpis = useMemo(() => {
    const totalIncome = totals.income;
    
    // RevPAR Placeholder (Revenue Per Available Room)
    // Assuming a fixed number of rooms for now, e.g., 20
    const totalRooms = 20; 
    // For 'month' filter, we divide by 30 days, for 'today' by 1, etc.
    let days = 1;
    if (dateFilter === 'week') days = 7;
    if (dateFilter === 'month') days = 30;
    if (dateFilter === 'all') days = 365; // Rough estimate
    
    const revPar = totalIncome / (totalRooms * days);

    return { revPar };
  }, [totals, dateFilter]);

  // Charts Data
  const chartsData = useMemo(() => {
    // Bar Chart: Last 30 days comparison
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const d = subDays(new Date(), 29 - i);
      return {
        date: format(d, 'dd/MM'),
        fullDate: d,
        income: 0,
        expense: 0,
      };
    });

    incomes.forEach(inc => {
      if (inc.status !== 'Paid') return; // Only count paid incomes
      // Use paymentDate if available, otherwise checkIn, otherwise ignore
      const dateStr = inc.paymentDate || inc.checkIn;
      if (!dateStr) return;
      
      const incDate = parseISO(dateStr);
      const day = last30Days.find(d => isSameDay(d.fullDate, incDate));
      if (day) day.income += inc.total;
    });

    expenses.forEach(exp => {
      if (exp.status !== 'Paid') return; // Only count paid expenses
      // Use paymentDate if available (realized), otherwise dueDate (projected)
      const dateStr = exp.paymentDate || exp.dueDate;
      if (!dateStr) return;

      const expDate = parseISO(dateStr);
      const day = last30Days.find(d => isSameDay(d.fullDate, expDate));
      if (day) day.expense += exp.amount;
    });

    // Pie Chart: Expenses by Category (based on filtered data)
    const categoryMap: Record<string, number> = {};
    filteredData.expenses.forEach(exp => {
      categoryMap[exp.category] = (categoryMap[exp.category] || 0) + exp.amount;
    });

    const pieData = Object.entries(categoryMap).map(([name, value]) => ({ name, value }));

    return { barData: last30Days, pieData };
  }, [incomes, expenses, filteredData]);

  // Alerts
  const alerts = useMemo(() => {
    // Use local date string for comparison to avoid timezone issues
    const now = new Date();
    const todayStr = now.toLocaleDateString('pt-BR').split('/').reverse().join('-'); // YYYY-MM-DD
    
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toLocaleDateString('pt-BR').split('/').reverse().join('-'); // YYYY-MM-DD
    
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekStr = nextWeek.toLocaleDateString('pt-BR').split('/').reverse().join('-'); // YYYY-MM-DD

    const urgentExpenses = expenses.filter(e => {
      if (e.status === 'Paid') return false;
      const dueStr = e.dueDate.split('T')[0];
      return (dueStr === todayStr || dueStr === tomorrowStr || dueStr < todayStr || e.status === 'Overdue');
    });

    const incomingReceivables = receivables.filter(r => {
      if (r.status === 'Paid') return false;
      const dueStr = r.dueDate.split('T')[0];
      // Show if overdue OR if due within next week
      return r.status === 'Overdue' || (dueStr > todayStr && dueStr < nextWeekStr) || dueStr === todayStr || dueStr < todayStr;
    });

    return { urgentExpenses, incomingReceivables };
  }, [expenses, receivables]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  const handleAddIncome = (e: React.FormEvent) => {
    e.preventDefault();
    if (!incomeForm.amount || !incomeForm.guestName) return;
    
    addIncome({
      id: uuidv4(),
      guestName: incomeForm.guestName,
      checkIn: new Date().toISOString(),
      checkOut: new Date().toISOString(),
      dailyRate: Number(incomeForm.amount),
      extraConsumption: 0,
      total: Number(incomeForm.amount),
      paymentMethod: 'Credit Card',
      status: 'Paid',
      invoiceIssued: true
    });
    
    setIncomeForm({ guestName: '', amount: '', source: 'Direct' });
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.amount || !expenseForm.description) return;

    addExpense({
      id: uuidv4(),
      description: expenseForm.description,
      category: expenseForm.category as ExpenseCategory,
      amount: Number(expenseForm.amount),
      dueDate: new Date().toISOString(),
      status: 'Paid',
      hasReceipt: true
    });

    setExpenseForm({ description: '', amount: '', category: 'Other' });
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Header Section */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8"
      >
        <div>
          <h2 className="text-2xl font-sans font-bold text-white tracking-tight">
            Hotel Finance OS
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Monitoramento financeiro em tempo real.
          </p>
        </div>

        {/* Date Filter */}
        <div className="flex flex-col sm:flex-row gap-2 items-end sm:items-center">
          {dateFilter === 'custom' && (
            <div className="flex gap-2 mr-2 animate-in fade-in slide-in-from-right-4">
              <input 
                type="date" 
                value={customDateRange.start}
                onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="bg-black/40 border border-white/10 rounded-md px-2 py-1 text-xs text-white focus:outline-none focus:border-white/30"
              />
              <span className="text-gray-400 self-center">-</span>
              <input 
                type="date" 
                value={customDateRange.end}
                onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="bg-black/40 border border-white/10 rounded-md px-2 py-1 text-xs text-white focus:outline-none focus:border-white/30"
              />
            </div>
          )}
          <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
            {[
              { id: 'today', label: 'Hoje' },
              { id: 'week', label: 'Semana' },
              { id: 'month', label: 'Mês' },
              { id: 'all', label: 'Tudo' },
              { id: 'custom', label: 'Personalizado' },
            ].map((filter) => (
              <button
                key={filter.id}
                onClick={() => setDateFilter(filter.id as any)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  dateFilter === filter.id 
                    ? 'bg-white text-black shadow-sm' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <CyberCard title="Entradas" className="flex flex-col justify-between min-h-[140px] h-full">
          <div className="text-2xl lg:text-3xl font-sans font-bold text-white tracking-tight mt-2 truncate">
            {formatCurrency(totals.income)}
          </div>
          <div className="text-xs text-gray-400 flex items-center mt-2">
            <TrendingUp className="w-3 h-3 text-green-400 mr-1" />
            <span className="text-green-400">Receita do período</span>
          </div>
        </CyberCard>

        <CyberCard title="Saídas" className="flex flex-col justify-between min-h-[140px] h-full">
          <div className="text-2xl lg:text-3xl font-sans font-bold text-white tracking-tight mt-2 truncate">
            {formatCurrency(totals.expense)}
          </div>
          <div className="text-xs text-gray-400 flex items-center mt-2">
            <TrendingDown className="w-3 h-3 text-red-400 mr-1" />
            <span className="text-red-400">Despesas do período</span>
          </div>
        </CyberCard>

        <CyberCard title="Lucro Líquido" className="flex flex-col justify-between min-h-[140px] h-full">
          <div className={`text-2xl lg:text-3xl font-sans font-bold tracking-tight mt-2 truncate ${totals.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatCurrency(totals.profit)}
          </div>
          <div className="text-xs text-gray-400 flex items-center mt-2">
            <Activity className="w-3 h-3 text-gray-400 mr-1" />
            <span>Resultado operacional</span>
          </div>
        </CyberCard>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Charts Section - Takes 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Bar Chart */}
          <CyberCard title="Fluxo de Caixa (30 Dias)">
            <div className="mt-4 h-[300px] w-full min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartsData.barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke="#666" 
                    tick={{fill: '#666', fontSize: 12}} 
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="#666" 
                    tick={{fill: '#666', fontSize: 12}} 
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `R$${value/1000}k`}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#141414', borderColor: '#333', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  />
                  <Legend />
                  <Bar dataKey="income" name="Entradas" fill="#4ade80" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name="Saídas" fill="#f87171" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CyberCard>

          {/* Pie Chart */}
          <CyberCard title="Despesas por Categoria">
            <div className="mt-4 h-[300px] w-full min-h-[300px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartsData.pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {chartsData.pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#141414', borderColor: '#333', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend 
                    layout="vertical" 
                    verticalAlign="middle" 
                    align="right"
                    formatter={(value) => {
                      const translations: Record<string, string> = {
                        'Supplies': 'Suprimentos',
                        'Cleaning': 'Limpeza',
                        'Maintenance': 'Manutenção',
                        'Staff': 'Equipe',
                        'Utilities': 'Utilidades',
                        'Marketing': 'Marketing',
                        'Taxes': 'Impostos',
                        'Other': 'Outros',
                        'Water': 'Água',
                        'Electricity': 'Luz',
                        'Internet': 'Internet',
                        'Laundry': 'Lavanderia',
                        'OTA Commission': 'Comissão OTA',
                        'Payroll': 'Folha de Pagamento'
                      };
                      return translations[value] || value;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CyberCard>
        </div>

        {/* Sidebar - Alerts & Quick Actions */}
        <div className="space-y-6">
          {/* Alerts */}
          <CyberCard title="Alertas Urgentes">
            <div className="space-y-4 mt-4">
              {alerts.urgentExpenses.length === 0 && alerts.incomingReceivables.length === 0 && (
                <div className="text-gray-500 text-sm text-center py-4">
                  Nenhum alerta urgente.
                </div>
              )}

              {alerts.urgentExpenses.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">Contas a Vencer (Hoje/Amanhã)</h4>
                  {alerts.urgentExpenses.map(exp => (
                    <div key={exp.id} className="flex items-start p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <AlertTriangle className="w-5 h-5 text-red-500 mr-3 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-red-200">{exp.description}</p>
                        <p className="text-xs text-red-300/70 mt-1">
                          {formatCurrency(exp.amount)}
                        </p>
                        <p className="text-[10px] text-red-400 mt-1 uppercase font-bold">
                          {formatDate(exp.dueDate)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {alerts.incomingReceivables.length > 0 && (
                <div className="space-y-2 mt-4">
                  <h4 className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2">Valores a Receber (Atrasados/Semana)</h4>
                  {alerts.incomingReceivables.map(rec => (
                    <div key={rec.id} className={`flex items-start p-3 border rounded-lg ${rec.status === 'Overdue' ? 'bg-red-500/10 border-red-500/20' : 'bg-blue-500/10 border-blue-500/20'}`}>
                      <Bell className={`w-5 h-5 mr-3 mt-0.5 ${rec.status === 'Overdue' ? 'text-red-500' : 'text-blue-500'}`} />
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className={`text-sm font-medium ${rec.status === 'Overdue' ? 'text-red-200' : 'text-blue-200'}`}>{rec.source}</p>
                            <p className={`text-xs mt-1 ${rec.status === 'Overdue' ? 'text-red-300/70' : 'text-blue-300/70'}`}>
                              {formatCurrency(rec.amount)}
                            </p>
                            <p className={`text-[10px] mt-1 uppercase font-bold ${rec.status === 'Overdue' ? 'text-red-400' : 'text-blue-400'}`}>
                              {rec.status === 'Overdue' ? 'ATRASADO' : formatDate(rec.dueDate)}
                            </p>
                          </div>
                          {/* Quick Confirm Button - Only for Overdue or Due Today */}
                          <button 
                            onClick={() => navigate('/receivables')}
                            className="text-xs bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded transition-colors"
                          >
                            Ver
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CyberCard>

          {/* Quick Actions */}
          <CyberCard title="Ações Rápidas">
             <div className="space-y-4 mt-4">
                <CyberButton onClick={() => navigate('/incomes')} variant="primary" className="w-full justify-start">
                  <Zap className="w-4 h-4 mr-2" />
                  Nova Entrada
                </CyberButton>
                <CyberButton onClick={() => navigate('/expenses')} variant="secondary" className="w-full justify-start">
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Saída
                </CyberButton>
             </div>
          </CyberCard>
        </div>
      </div>
    </div>
  );
};
