import React, { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Table, TableRow, TableCell } from '../components/ui/Table';
import { CyberButton } from '../components/ui/CyberButton';
import { CyberInput } from '../components/ui/CyberInput';
import { CyberSelect } from '../components/ui/CyberSelect';
import { Badge } from '../components/ui/Badge';
import { formatCurrency, formatDate } from '../lib/utils';
import { Plus, Trash2, Edit2, X, Save, Search, Filter, Download, FileText, Clock, CheckCircle2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Income, PaymentMethod, PaymentStatus } from '../types';
import { CyberCard } from '../components/ui/CyberCard';

export const IncomesPage: React.FC = () => {
  const { incomes, addIncome, deleteIncome, updateIncome } = useFinance();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'All'>('All');
  const [activeTab, setActiveTab] = useState<'received' | 'pending'>('received');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Income | 'date', direction: 'asc' | 'desc' }>({ key: 'date', direction: 'asc' });

  // Form State
  const [formData, setFormData] = useState<Partial<Income>>({
    guestName: '',
    checkIn: '',
    checkOut: '',
    paymentDate: '',
    dailyRate: 0,
    extraConsumption: 0,
    paymentMethod: 'Credit Card',
    status: 'Pending',
    invoiceIssued: false,
  });

  const filteredIncomes = useMemo(() => {
    return incomes.filter(income => {
      const matchesSearch = income.guestName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'All' || income.status === statusFilter;
      
      let matchesTab = true;
      if (activeTab === 'received') {
        matchesTab = income.status === 'Paid';
      } else {
        matchesTab = income.status === 'Pending' || income.status === 'Overdue' || income.status === 'Cancelled';
      }

      return matchesSearch && matchesStatus && matchesTab;
    }).sort((a, b) => {
      const direction = sortConfig.direction === 'asc' ? 1 : -1;
      
      if (sortConfig.key === 'total') {
        return (a.total - b.total) * direction;
      }
      
      if (sortConfig.key === 'guestName') {
        return a.guestName.localeCompare(b.guestName) * direction;
      }

      // Default Date Sort
      const dateA = new Date(a.paymentDate || a.checkIn).getTime();
      const dateB = new Date(b.paymentDate || b.checkIn).getTime();
      return (dateA - dateB) * direction;
    });
  }, [incomes, searchTerm, statusFilter, activeTab, sortConfig]);

  const handleExport = () => {
    const headers = ['Hóspede', 'Check-In', 'Check-Out', 'Total', 'Método', 'Status', 'Nota'];
    const csvContent = [
      headers.join(','),
      ...filteredIncomes.map(i => [
        `"${i.guestName}"`,
        i.checkIn,
        i.checkOut,
        i.total,
        i.paymentMethod,
        i.status,
        i.invoiceIssued ? 'Sim' : 'Não'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `incomes_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleOpenModal = (income?: Income) => {
    if (income) {
      setEditingId(income.id);
      setFormData({
        ...income,
        checkIn: income.checkIn ? income.checkIn.split('T')[0] : '',
        checkOut: income.checkOut ? income.checkOut.split('T')[0] : '',
        paymentDate: income.paymentDate ? income.paymentDate.split('T')[0] : '',
      });
    } else {
      setEditingId(null);
      setFormData({
        guestName: '',
        checkIn: '',
        checkOut: '',
        paymentDate: new Date().toISOString().split('T')[0],
        dailyRate: 0,
        extraConsumption: 0,
        total: 0,
        paymentMethod: 'Credit Card',
        status: activeTab === 'received' ? 'Paid' : 'Pending',
        invoiceIssued: false,
      });
    }
    setIsModalOpen(true);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Ensure dates are not null to satisfy DB constraints
      const finalCheckIn = formData.checkIn || formData.paymentDate!;
      const finalCheckOut = formData.checkOut || formData.paymentDate!;

      const data: Income = {
        id: editingId || uuidv4(),
        guestName: formData.guestName!,
        checkIn: finalCheckIn,
        checkOut: finalCheckOut,
        paymentDate: formData.paymentDate!,
        dailyRate: 0,
        extraConsumption: 0,
        total: Number(formData.total),
        paymentMethod: formData.paymentMethod as PaymentMethod,
        status: formData.status as PaymentStatus,
        invoiceIssued: formData.invoiceIssued!,
      };

      if (editingId) {
        await updateIncome(data);
      } else {
        await addIncome(data);
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar entrada.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-sans font-bold text-white tracking-tight">ENTRADAS</h1>
          <p className="text-sm text-gray-400">Gerencie pagamentos de hóspedes e notas fiscais.</p>
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
          onClick={() => setActiveTab('received')}
          className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${
            activeTab === 'received'
              ? 'bg-white text-black shadow-sm'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          Recebidos
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${
            activeTab === 'pending'
              ? 'bg-white text-black shadow-sm'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Clock className="w-4 h-4" />
          Pendentes
        </button>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 bg-white/5 p-4 rounded-xl border border-white/10">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Buscar por hóspede..." 
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
              ...(activeTab === 'received' ? [
                { value: 'Paid', label: 'Pago' }
              ] : [
                { value: 'Pending', label: 'Pendente' },
                { value: 'Overdue', label: 'Atrasado' },
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
              { value: 'total-desc', label: 'Maior Valor' },
              { value: 'total-asc', label: 'Menor Valor' },
              { value: 'guestName-asc', label: 'Hóspede (A-Z)' },
            ]}
          />
        </div>
      </div>

      <CyberCard>
        {filteredIncomes.length > 0 ? (
          <Table headers={['Hóspede', 'Check-In', 'Check-Out', 'Total', 'Método', 'Status', 'Nota', 'Ações']}>
            {filteredIncomes.map((income) => (
              <TableRow key={income.id}>
                <TableCell>{income.guestName}</TableCell>
                <TableCell>{formatDate(income.checkIn)}</TableCell>
                <TableCell>{formatDate(income.checkOut)}</TableCell>
                <TableCell className="font-bold text-white">{formatCurrency(income.total)}</TableCell>
                <TableCell>{income.paymentMethod}</TableCell>
                <TableCell>
                  <Badge variant={income.status === 'Paid' ? 'success' : income.status === 'Pending' ? 'warning' : income.status === 'Cancelled' ? 'neutral' : 'danger'}>
                    {income.status === 'Paid' ? 'Pago' : income.status === 'Pending' ? 'Pendente' : income.status === 'Cancelled' ? 'Cancelado' : 'Atrasado'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={income.invoiceIssued ? 'info' : 'neutral'}>
                    {income.invoiceIssued ? 'Sim' : 'Não'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <button onClick={() => handleOpenModal(income)} className="text-gray-400 hover:text-white transition-colors">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => deleteIncome(income.id)} className="text-red-500 hover:text-red-400 transition-colors">
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
              Não encontramos nenhuma entrada com os filtros selecionados. Tente buscar por outro termo ou adicione um novo registro.
            </p>
            <CyberButton onClick={() => handleOpenModal()} variant="primary">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Nova Entrada
            </CyberButton>
          </div>
        )}
      </CyberCard>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[#141414] border border-white/10 rounded-xl shadow-2xl w-full max-w-md p-6 relative my-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-sans font-bold text-white tracking-tight">{editingId ? 'Editar Entrada' : 'Nova Entrada'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <CyberInput
                label="Nome do Hóspede / Empresa"
                required
                value={formData.guestName}
                onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
              />
              
              <CyberInput
                label="Data do Pagamento"
                type="date"
                required
                value={formData.paymentDate}
                onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
              />

              <div className="grid grid-cols-2 gap-4">
                <CyberInput
                  label="Check-in (Opcional)"
                  type="date"
                  value={formData.checkIn}
                  onChange={(e) => setFormData({ ...formData, checkIn: e.target.value })}
                />
                <CyberInput
                  label="Check-out (Opcional)"
                  type="date"
                  value={formData.checkOut}
                  onChange={(e) => setFormData({ ...formData, checkOut: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <CyberInput
                  label="Valor Total (R$)"
                  type="number"
                  step="0.01"
                  required
                  value={formData.total}
                  onChange={(e) => setFormData({ ...formData, total: parseFloat(e.target.value) })}
                />
                <CyberSelect
                  label="Método Pagamento"
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as PaymentMethod })}
                  options={[
                    { value: 'Credit Card', label: 'Cartão Crédito' },
                    { value: 'Debit Card', label: 'Cartão Débito' },
                    { value: 'Cash', label: 'Dinheiro' },
                    { value: 'Pix', label: 'Pix' },
                    { value: 'Transfer', label: 'Transferência' },
                    { value: 'A Prazo', label: 'A Prazo' },
                  ]}
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
                <div className="flex items-center h-full pt-6">
                  <label className="flex items-center space-x-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      className="rounded border-gray-600 bg-white/5 text-white focus:ring-white/20"
                      checked={formData.invoiceIssued}
                      onChange={(e) => setFormData({ ...formData, invoiceIssued: e.target.checked })}
                    />
                    <span className="text-sm text-gray-400 group-hover:text-white transition-colors">Nota Emitida?</span>
                  </label>
                </div>
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
