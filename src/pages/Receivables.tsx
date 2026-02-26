import React, { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Table, TableRow, TableCell } from '../components/ui/Table';
import { CyberButton } from '../components/ui/CyberButton';
import { CyberInput } from '../components/ui/CyberInput';
import { CyberSelect } from '../components/ui/CyberSelect';
import { Badge } from '../components/ui/Badge';
import { formatCurrency, formatDate } from '../lib/utils';
import { Plus, Trash2, Edit2, X, Save, Search, Download, FileText, Calendar, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Receivable, ReceivableSource, PaymentStatus } from '../types';
import { CyberCard } from '../components/ui/CyberCard';
import { isSameDay, isTomorrow, isBefore, parseISO, startOfDay } from 'date-fns';

export const ReceivablesPage: React.FC = () => {
  const { receivables, addReceivable, deleteReceivable, updateReceivable, addIncome } = useFinance();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'All'>('All');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Receivable | 'date', direction: 'asc' | 'desc' }>({ key: 'date', direction: 'asc' });

  // Form State
  const [formData, setFormData] = useState<Partial<Receivable>>({
    source: 'Booking.com',
    amount: 0,
    dueDate: '',
    status: 'Pending',
  });

  // Summary Metrics
  const summary = useMemo(() => {
    // Use local date string for comparison to avoid timezone issues
    const now = new Date();
    const todayStr = now.toLocaleDateString('pt-BR').split('/').reverse().join('-'); // YYYY-MM-DD
    
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toLocaleDateString('pt-BR').split('/').reverse().join('-'); // YYYY-MM-DD
    
    const dueToday = receivables.filter(r => 
      (r.status === 'Pending' || r.status === 'Overdue') && 
      r.dueDate.split('T')[0] === todayStr
    );

    const dueTomorrow = receivables.filter(r => 
      (r.status === 'Pending' || r.status === 'Overdue') && 
      r.dueDate.split('T')[0] === tomorrowStr
    );

    const overdue = receivables.filter(r => 
      r.status === 'Overdue' || 
      (r.status === 'Pending' && r.dueDate.split('T')[0] < todayStr)
    );

    const totalPending = receivables.filter(r => r.status === 'Pending' || r.status === 'Overdue');

    return {
      todayCount: dueToday.length,
      todayTotal: dueToday.reduce((acc, curr) => acc + curr.amount, 0),
      tomorrowCount: dueTomorrow.length,
      tomorrowTotal: dueTomorrow.reduce((acc, curr) => acc + curr.amount, 0),
      overdueCount: overdue.length,
      overdueTotal: overdue.reduce((acc, curr) => acc + curr.amount, 0),
      totalPendingAmount: totalPending.reduce((acc, curr) => acc + curr.amount, 0),
    };
  }, [receivables]);

  const filteredReceivables = useMemo(() => {
    return receivables.filter(receivable => {
      const matchesSearch = receivable.source.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'All' || receivable.status === statusFilter;
      return matchesSearch && matchesStatus;
    }).sort((a, b) => {
      const direction = sortConfig.direction === 'asc' ? 1 : -1;
      
      if (sortConfig.key === 'amount') {
        return (a.amount - b.amount) * direction;
      }
      
      // Default Date Sort
      const dateA = new Date(a.dueDate).getTime();
      const dateB = new Date(b.dueDate).getTime();
      return (dateA - dateB) * direction;
    });
  }, [receivables, searchTerm, statusFilter, sortConfig]);

  const handleExport = () => {
    const headers = ['Origem', 'Vencimento', 'Valor', 'Status'];
    const csvContent = [
      headers.join(','),
      ...filteredReceivables.map(r => [
        `"${r.source}"`,
        r.dueDate,
        r.amount,
        r.status
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `receivables_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleOpenModal = (receivable?: Receivable) => {
    if (receivable) {
      setEditingId(receivable.id);
      setFormData({
        ...receivable,
        dueDate: receivable.dueDate.split('T')[0],
      });
    } else {
      setEditingId(null);
      setFormData({
        source: 'Booking.com',
        amount: 0,
        dueDate: new Date().toISOString().split('T')[0],
        status: 'Pending',
      });
    }
    setIsModalOpen(true);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const data: Receivable = {
        id: editingId || uuidv4(),
        source: formData.source as ReceivableSource,
        amount: Number(formData.amount),
        dueDate: formData.dueDate!,
        status: formData.status as PaymentStatus,
      };

      if (editingId) {
        // Check if status changed to Paid, if so, AUTOMATICALLY create income
        const original = receivables.find(r => r.id === editingId);
        if (original && original.status !== 'Paid' && data.status === 'Paid') {
          // Create the income automatically
          await addIncome({
            id: uuidv4(),
            guestName: `Recebimento - ${data.source}`,
            checkIn: new Date().toISOString(),
            checkOut: new Date().toISOString(),
            dailyRate: data.amount,
            extraConsumption: 0,
            total: data.amount,
            paymentMethod: 'Transfer', // Default to Transfer/Pix as we don't have this field in Receivables
            status: 'Paid',
            invoiceIssued: true,
            paymentDate: new Date().toISOString() // Set payment date to NOW
          });
          alert("Pagamento confirmado! O valor foi lançado nas Entradas e no Fluxo de Caixa.");
        }
        await updateReceivable(data);
      } else {
        await addReceivable(data);
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar recebível.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-sans font-bold text-white tracking-tight">A RECEBER</h1>
          <p className="text-sm text-gray-400">Gerencie pagamentos pendentes de "A Prazo" (Boletos) e comissões de OTAs.</p>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
         <div className="p-4 rounded-xl border bg-blue-500/10 border-blue-500/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-400">Total a Receber</span>
              <FileText className="w-4 h-4 text-blue-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">{formatCurrency(summary.totalPendingAmount)}</span>
            </div>
            <div className="text-xs text-gray-400 mt-1">Pendente + Atrasado</div>
          </div>

          <div className={`p-4 rounded-xl border ${summary.todayCount > 0 ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-white/5 border-white/10'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm font-medium ${summary.todayCount > 0 ? 'text-yellow-400' : 'text-gray-400'}`}>Vence Hoje</span>
              <Calendar className={`w-4 h-4 ${summary.todayCount > 0 ? 'text-yellow-400' : 'text-gray-500'}`} />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">{summary.todayCount}</span>
              <span className="text-sm text-gray-400">itens</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">Total: {formatCurrency(summary.todayTotal)}</div>
          </div>

          <div className={`p-4 rounded-xl border ${summary.tomorrowCount > 0 ? 'bg-white/10 border-white/20' : 'bg-white/5 border-white/10'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm font-medium ${summary.tomorrowCount > 0 ? 'text-white' : 'text-gray-400'}`}>Vence Amanhã</span>
              <Clock className={`w-4 h-4 ${summary.tomorrowCount > 0 ? 'text-white' : 'text-gray-500'}`} />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">{summary.tomorrowCount}</span>
              <span className="text-sm text-gray-400">itens</span>
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
              <span className="text-sm text-gray-400">itens</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">Total: {formatCurrency(summary.overdueTotal)}</div>
          </div>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 bg-white/5 p-4 rounded-xl border border-white/10">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Buscar por origem..." 
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
              { value: 'Paid', label: 'Pago' },
              { value: 'Pending', label: 'Pendente' },
              { value: 'Overdue', label: 'Atrasado' },
              { value: 'Cancelled', label: 'Cancelado' },
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
            ]}
          />
        </div>
      </div>

      <CyberCard>
        {filteredReceivables.length > 0 ? (
          <Table headers={['Origem', 'Vencimento', 'Valor', 'Status', 'Ações']}>
            {filteredReceivables.map((receivable) => (
              <TableRow key={receivable.id}>
                <TableCell>{receivable.source}</TableCell>
                <TableCell>{formatDate(receivable.dueDate)}</TableCell>
                <TableCell className="font-bold text-white">{formatCurrency(receivable.amount)}</TableCell>
                <TableCell>
                  <Badge variant={receivable.status === 'Paid' ? 'success' : receivable.status === 'Pending' ? 'warning' : receivable.status === 'Cancelled' ? 'neutral' : 'danger'}>
                    {receivable.status === 'Paid' ? 'Pago' : receivable.status === 'Pending' ? 'Pendente' : receivable.status === 'Cancelled' ? 'Cancelado' : 'Atrasado'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <button onClick={() => handleOpenModal(receivable)} className="text-gray-400 hover:text-white transition-colors">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => deleteReceivable(receivable.id)} className="text-red-500 hover:text-red-400 transition-colors">
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
              Não encontramos nenhum recebível com os filtros selecionados.
            </p>
            <CyberButton onClick={() => handleOpenModal()} variant="primary">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Novo Recebível
            </CyberButton>
          </div>
        )}
      </CyberCard>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#141414] border border-white/10 rounded-xl shadow-2xl w-full max-w-md p-6 relative">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-sans font-bold text-white tracking-tight">{editingId ? 'Editar Recebível' : 'Novo Recebível'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-sans font-medium text-gray-400 mb-2 uppercase tracking-wide">
                  Origem / Hóspede
                </label>
                <input
                  type="text"
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value as any })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg text-white font-sans px-4 py-3 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all duration-200"
                  placeholder="Ex: Booking.com ou Nome do Hóspede"
                  list="source-suggestions"
                />
                <datalist id="source-suggestions">
                  <option value="Booking.com" />
                  <option value="Expedia" />
                  <option value="Airbnb" />
                  <option value="Direct" />
                  <option value="Corporate" />
                </datalist>
              </div>

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
