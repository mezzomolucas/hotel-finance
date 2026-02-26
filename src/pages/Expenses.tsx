import React, { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Table, TableRow, TableCell } from '../components/ui/Table';
import { CyberButton } from '../components/ui/CyberButton';
import { CyberInput } from '../components/ui/CyberInput';
import { CyberSelect } from '../components/ui/CyberSelect';
import { Badge } from '../components/ui/Badge';
import { formatCurrency, formatDate } from '../lib/utils';
import { Plus, Trash2, Edit2, X, Save, Search, Download, FileText, AlertCircle, Calendar, CheckCircle2, Clock } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Expense, ExpenseCategory, PaymentStatus } from '../types';
import { CyberCard } from '../components/ui/CyberCard';
import { isSameDay, isTomorrow, isBefore, parseISO, startOfDay } from 'date-fns';

export const ExpensesPage: React.FC = () => {
  const { expenses, addExpense, deleteExpense, updateExpense } = useFinance();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'All'>('All');
  const [activeTab, setActiveTab] = useState<'payable' | 'history'>('payable');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Expense | 'date', direction: 'asc' | 'desc' }>({ key: 'date', direction: 'asc' });

  // Form State
  const [formData, setFormData] = useState<Partial<Expense>>({
    description: '',
    category: 'Other',
    amount: 0,
    dueDate: '',
    paymentDate: '',
    status: 'Pending',
    hasReceipt: false,
  });

  // Filter Logic based on Tab
  const filteredExpenses = useMemo(() => {
    return expenses.filter(expense => {
      // Tab Filter
      if (activeTab === 'payable') {
        if (expense.status === 'Paid' || expense.status === 'Cancelled') return false;
      } else {
        if (expense.status === 'Pending' || expense.status === 'Overdue') return false;
      }

      // Search Filter
      const matchesSearch = expense.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Status Filter (within the tab context)
      const matchesStatus = statusFilter === 'All' || expense.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    }).sort((a, b) => {
      const direction = sortConfig.direction === 'asc' ? 1 : -1;
      
      if (sortConfig.key === 'amount') {
        return (a.amount - b.amount) * direction;
      }
      
      if (sortConfig.key === 'description') {
        return a.description.localeCompare(b.description) * direction;
      }

      // Default Date Sort
      if (activeTab === 'payable') {
        const dateA = new Date(a.dueDate).getTime();
        const dateB = new Date(b.dueDate).getTime();
        return (dateA - dateB) * direction;
      } else {
        const dateA = new Date(a.paymentDate || a.dueDate).getTime();
        const dateB = new Date(b.paymentDate || b.dueDate).getTime();
        return (dateB - dateA) * direction; // Default desc for history
      }
    });
  }, [expenses, searchTerm, statusFilter, activeTab, sortConfig]);

  // Summary Metrics for Payable Tab
  const summary = useMemo(() => {
    // Use local date string for comparison to avoid timezone issues
    const now = new Date();
    const todayStr = now.toLocaleDateString('pt-BR').split('/').reverse().join('-'); // YYYY-MM-DD
    
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toLocaleDateString('pt-BR').split('/').reverse().join('-'); // YYYY-MM-DD
    
    const dueToday = expenses.filter(e => 
      (e.status === 'Pending' || e.status === 'Overdue') && 
      e.dueDate.split('T')[0] === todayStr
    );

    const dueTomorrow = expenses.filter(e => 
      (e.status === 'Pending' || e.status === 'Overdue') && 
      e.dueDate.split('T')[0] === tomorrowStr
    );

    const overdue = expenses.filter(e => 
      e.status === 'Overdue' || 
      (e.status === 'Pending' && e.dueDate.split('T')[0] < todayStr)
    );

    return {
      todayCount: dueToday.length,
      todayTotal: dueToday.reduce((acc, curr) => acc + curr.amount, 0),
      tomorrowCount: dueTomorrow.length,
      tomorrowTotal: dueTomorrow.reduce((acc, curr) => acc + curr.amount, 0),
      overdueCount: overdue.length,
      overdueTotal: overdue.reduce((acc, curr) => acc + curr.amount, 0),
    };
  }, [expenses]);

  const handleExport = () => {
    const headers = ['Descrição', 'Categoria', 'Vencimento', 'Pagamento', 'Valor', 'Status', 'Recibo'];
    const csvContent = [
      headers.join(','),
      ...filteredExpenses.map(e => [
        `"${e.description}"`,
        e.category,
        e.dueDate,
        e.paymentDate || '-',
        e.amount,
        e.status,
        e.hasReceipt ? 'Sim' : 'Não'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `expenses_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleOpenModal = (expense?: Expense) => {
    if (expense) {
      setEditingId(expense.id);
      setFormData({
        ...expense,
        dueDate: expense.dueDate.split('T')[0],
        paymentDate: expense.paymentDate ? expense.paymentDate.split('T')[0] : '',
      });
    } else {
      setEditingId(null);
      setFormData({
        description: '',
        category: 'Other',
        amount: 0,
        dueDate: new Date().toISOString().split('T')[0],
        paymentDate: activeTab === 'history' ? new Date().toISOString().split('T')[0] : '',
        status: activeTab === 'payable' ? 'Pending' : 'Paid',
        hasReceipt: false,
      });
    }
    setIsModalOpen(true);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const data: Expense = {
        id: editingId || uuidv4(),
        description: formData.description!,
        category: formData.category as ExpenseCategory,
        amount: Number(formData.amount),
        dueDate: formData.dueDate!,
        paymentDate: formData.paymentDate || undefined,
        status: formData.status as PaymentStatus,
        hasReceipt: formData.hasReceipt!,
      };

      if (editingId) {
        await updateExpense(data);
      } else {
        await addExpense(data);
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar despesa.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-sans font-bold text-white tracking-tight">SAÍDAS</h1>
          <p className="text-sm text-gray-400">Controle de despesas e contas a pagar.</p>
        </div>
        <div className="flex gap-2">
          <CyberButton onClick={handleExport} variant="secondary" className="px-4">
            <Download className="w-4 h-4" />
          </CyberButton>
          <CyberButton onClick={() => handleOpenModal()} variant="primary">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar
          </CyberButton>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-white/5 p-1 rounded-lg w-full md:w-fit border border-white/10">
        <button
          onClick={() => setActiveTab('payable')}
          className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${
            activeTab === 'payable'
              ? 'bg-white text-black shadow-sm'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Clock className="w-4 h-4" />
          Contas a Pagar
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${
            activeTab === 'history'
              ? 'bg-white text-black shadow-sm'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          Histórico Pago
        </button>
      </div>

      {/* Summary Alerts (Only for Payable Tab) */}
      {activeTab === 'payable' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`p-4 rounded-xl border ${summary.todayCount > 0 ? 'bg-red-500/10 border-red-500/30' : 'bg-white/5 border-white/10'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm font-medium ${summary.todayCount > 0 ? 'text-red-400' : 'text-gray-400'}`}>Vence Hoje</span>
              <Calendar className={`w-4 h-4 ${summary.todayCount > 0 ? 'text-red-400' : 'text-gray-500'}`} />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">{summary.todayCount}</span>
              <span className="text-sm text-gray-400">boletos</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">Total: {formatCurrency(summary.todayTotal)}</div>
          </div>

          <div className={`p-4 rounded-xl border ${summary.tomorrowCount > 0 ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-white/5 border-white/10'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm font-medium ${summary.tomorrowCount > 0 ? 'text-yellow-400' : 'text-gray-400'}`}>Vence Amanhã</span>
              <Clock className={`w-4 h-4 ${summary.tomorrowCount > 0 ? 'text-yellow-400' : 'text-gray-500'}`} />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">{summary.tomorrowCount}</span>
              <span className="text-sm text-gray-400">boletos</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">Total: {formatCurrency(summary.tomorrowTotal)}</div>
          </div>

          <div className={`p-4 rounded-xl border ${summary.overdueCount > 0 ? 'bg-red-900/20 border-red-500/50' : 'bg-white/5 border-white/10'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm font-medium ${summary.overdueCount > 0 ? 'text-red-400' : 'text-gray-400'}`}>Em Atraso</span>
              <AlertCircle className={`w-4 h-4 ${summary.overdueCount > 0 ? 'text-red-400' : 'text-gray-500'}`} />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">{summary.overdueCount}</span>
              <span className="text-sm text-gray-400">boletos</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">Total: {formatCurrency(summary.overdueTotal)}</div>
          </div>
        </div>
      )}

      {/* Filters Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 bg-white/5 p-4 rounded-xl border border-white/10">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Buscar por descrição..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black/20 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-white/30 transition-colors"
          />
        </div>
        <div className="w-full md:w-48">
          <CyberSelect 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            options={[
              { value: 'All', label: 'Todos os Status' },
              ...(activeTab === 'payable' ? [
                { value: 'Pending', label: 'Pendente' },
                { value: 'Overdue', label: 'Atrasado' }
              ] : [
                { value: 'Paid', label: 'Pago' },
                { value: 'Cancelled', label: 'Cancelado' }
              ])
            ]}
          />
        </div>
        <div className="w-full md:w-48">
          <CyberSelect 
            value={`${sortConfig.key}-${sortConfig.direction}`}
            onChange={(e) => {
              const [key, direction] = e.target.value.split('-');
              setSortConfig({ key: key as any, direction: direction as 'asc' | 'desc' });
            }}
            options={[
              { value: 'date-asc', label: 'Mais Antigos' },
              { value: 'date-desc', label: 'Mais Recentes' },
              { value: 'amount-desc', label: 'Maior Valor' },
              { value: 'amount-asc', label: 'Menor Valor' },
              { value: 'description-asc', label: 'Nome (A-Z)' },
            ]}
          />
        </div>
      </div>

      <CyberCard>
        {filteredExpenses.length > 0 ? (
          <Table headers={['Descrição', 'Categoria', 'Vencimento', 'Pagamento', 'Valor', 'Status', 'Recibo', 'Ações']}>
            {filteredExpenses.map((expense) => (
              <TableRow key={expense.id}>
                <TableCell>{expense.description}</TableCell>
                <TableCell>
                  <span className="px-2 py-1 rounded-md bg-white/5 text-xs text-gray-300 border border-white/10">
                    {expense.category}
                  </span>
                </TableCell>
                <TableCell>{formatDate(expense.dueDate)}</TableCell>
                <TableCell>{expense.paymentDate ? formatDate(expense.paymentDate) : '-'}</TableCell>
                <TableCell className="font-bold text-white">{formatCurrency(expense.amount)}</TableCell>
                <TableCell>
                  <Badge variant={expense.status === 'Paid' ? 'success' : expense.status === 'Pending' ? 'warning' : expense.status === 'Cancelled' ? 'neutral' : 'danger'}>
                    {expense.status === 'Paid' ? 'Pago' : expense.status === 'Pending' ? 'Pendente' : expense.status === 'Cancelled' ? 'Cancelado' : 'Atrasado'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={expense.hasReceipt ? 'info' : 'neutral'}>
                    {expense.hasReceipt ? 'Sim' : 'Não'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <button onClick={() => handleOpenModal(expense)} className="text-gray-400 hover:text-white transition-colors">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => deleteExpense(expense.id)} className="text-red-500 hover:text-red-400 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </Table>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-gray-500" />
            </div>
            <h3 className="text-lg font-medium text-white mb-1">Nenhum registro encontrado</h3>
            <p className="text-gray-400 text-sm max-w-sm mx-auto mb-6">
              Não encontramos nenhuma despesa com os filtros selecionados.
            </p>
            <CyberButton onClick={() => handleOpenModal()} variant="primary">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Nova Saída
            </CyberButton>
          </div>
        )}
      </CyberCard>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#141414] border border-white/10 rounded-xl shadow-2xl w-full max-w-md p-6 relative">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-sans font-bold text-white tracking-tight">{editingId ? 'Editar Saída' : 'Nova Saída'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <CyberInput
                label="Descrição"
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
              <CyberSelect
                label="Categoria"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as ExpenseCategory })}
                options={[
                  { value: 'Cleaning', label: 'Limpeza' },
                  { value: 'Utilities', label: 'Utilidades' },
                  { value: 'Staff', label: 'Equipe' },
                  { value: 'Maintenance', label: 'Manutenção' },
                  { value: 'Supplies', label: 'Suprimentos' },
                  { value: 'Marketing', label: 'Marketing' },
                  { value: 'Water', label: 'Água' },
                  { value: 'Electricity', label: 'Luz' },
                  { value: 'Laundry', label: 'Lavanderia' },
                  { value: 'OTA Commission', label: 'Comissão OTA' },
                  { value: 'Payroll', label: 'Folha de Pagamento' },
                  { value: 'Other', label: 'Outros' },
                ]}
              />
              <div className="grid grid-cols-2 gap-4">
                <CyberInput
                  label="Valor (R$)"
                  type="number"
                  step="0.01"
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                />
                <CyberInput
                  label="Vencimento"
                  type="date"
                  required
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <CyberSelect
                  label="Status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as PaymentStatus })}
                  options={[
                    { value: 'Paid', label: 'Pago' },
                    { value: 'Pending', label: 'Pendente' },
                    { value: 'Overdue', label: 'Atrasado' },
                    { value: 'Cancelled', label: 'Cancelado' },
                  ]}
                />
                <CyberInput
                  label="Data Pagamento"
                  type="date"
                  value={formData.paymentDate}
                  onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                  disabled={formData.status !== 'Paid'}
                />
              </div>

              <div className="flex items-center pt-2">
                <label className="flex items-center space-x-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    className="rounded border-gray-600 bg-white/5 text-white focus:ring-white/20"
                    checked={formData.hasReceipt}
                    onChange={(e) => setFormData({ ...formData, hasReceipt: e.target.checked })}
                  />
                  <span className="text-sm text-gray-400 group-hover:text-white transition-colors">Tem Recibo?</span>
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-6">
                <CyberButton 
                  type="button"
                  variant="secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancelar
                </CyberButton>
                <CyberButton type="submit" variant="primary" disabled={isSubmitting}>
                  <Save className="w-4 h-4 mr-2" />
                  {isSubmitting ? 'Salvando...' : 'Salvar'}
                </CyberButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
