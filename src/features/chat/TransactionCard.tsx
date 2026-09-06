import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Transaction } from '../../types/chat';
import { Check, Edit2, Trash2, X, Tag, Calendar, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { useTelemetry } from '../../hooks/useTelemetry';
import { formatDate } from '../../lib/date';
import { formatCurrency } from '../../lib/currency';
import { getCategoryName } from '../../lib/categories';

interface TransactionCardProps {
  transaction: Transaction;
  onUpdate: (updated: Transaction) => void;
  onDelete: (id: string) => void;
}

const CATEGORIES = [
  'alimentacao', 'transporte', 'moradia', 'saude',
  'lazer', 'compras', 'contas', 'outros',
];

export const TransactionCard: React.FC<TransactionCardProps> = ({ transaction, onUpdate, onDelete }) => {
  const [isEditingValue, setIsEditingValue] = useState(false);
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  
  const [editValue, setEditValue] = useState(String(transaction.valor));
  const [editCategory, setEditCategory] = useState(transaction.categoria);

  const { trackEvent } = useTelemetry();

  const handleUpdateField = async (field: 'valor' | 'categoria', newValue: any) => {
    try {
      const updatePayload: any = { [field]: newValue, foi_corrigida: true };
      const { data, error } = await supabase
        .from('transactions')
        .update(updatePayload)
        .eq('id', transaction.id)
        .select()
        .single();
        
      if (error) throw error;
      if (data) {
        trackEvent('transacao_corrigida', { campo: field, old_value: transaction[field], new_value: newValue });
        onUpdate(data as Transaction);
        toast.success('Transação atualizada');
      }
    } catch (error) {
      console.error(error);
      toast.error('Erro ao atualizar transação');
    }
  };

  const handleSaveValue = () => {
    const num = parseFloat(editValue.replace(',', '.'));
    if (!isNaN(num) && num > 0) {
      handleUpdateField('valor', num);
    }
    setIsEditingValue(false);
  };

  const handleSaveCategory = (cat: string) => {
    setEditCategory(cat as Transaction['categoria']);
    handleUpdateField('categoria', cat);
    setIsEditingCategory(false);
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', transaction.id);
      if (error) throw error;
      onDelete(transaction.id);
      toast.success('Transação desfeita');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao desfazer transação');
    }
  };

  return (
    <div className="bg-background rounded-xl border-2 border-border p-4 mt-2 max-w-sm w-full animate-card-enter shadow-sm relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
      <div className="flex justify-between items-start mb-3">
        <h4 className="font-semibold text-foreground capitalize">
          {transaction.descricao || 'Despesa registrada'}
        </h4>
        {!isConfirmingDelete ? (
          <button 
            onClick={() => setIsConfirmingDelete(true)}
            className="text-muted-foreground hover:text-estouro transition-colors p-1"
            title="Excluir"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        ) : null}
      </div>

      {isConfirmingDelete && (
        <div className="bg-estouro/10 rounded-lg p-3 mb-3 border border-estouro/20">
          <p className="text-sm text-foreground mb-2">
            Excluir {transaction.descricao || 'esta transação'} de {formatCurrency(transaction.valor)}?
          </p>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleDelete}
              className="text-xs bg-estouro text-primary-foreground px-3 py-1.5 rounded font-medium hover:bg-estouro/90 transition-colors"
            >
              Sim, excluir
            </button>
            <button 
              onClick={() => setIsConfirmingDelete(false)}
              className="text-xs bg-muted text-foreground px-3 py-1.5 rounded font-medium hover:bg-border transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {/* Value Chip */}
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-muted-foreground" />
          {isEditingValue ? (
            <div className="flex items-center gap-1">
              <input
                autoFocus
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-24 px-2 py-1 text-sm border-2 rounded bg-muted border-border text-foreground tabular-nums"
                onKeyDown={(e) => e.key === 'Enter' && handleSaveValue()}
              />
              <button onClick={handleSaveValue} className="p-1 text-receita"><Check className="w-4 h-4"/></button>
              <button onClick={() => { setIsEditingValue(false); setEditValue(String(transaction.valor)); }} className="p-1 text-estouro"><X className="w-4 h-4"/></button>
            </div>
          ) : (
            <button 
              onClick={() => setIsEditingValue(true)}
              className="px-3 py-1 rounded-full bg-muted text-sm font-medium text-foreground hover:bg-border transition-colors flex items-center gap-1"
            >
              <span className={`tabular-nums ${transaction.tipo === 'despesa' ? 'text-despesa' : 'text-receita'}`}>
                {transaction.tipo === 'despesa' ? '↓ −' : '↑ +'}{formatCurrency(transaction.valor)}
              </span>
              <Edit2 className="w-3 h-3 opacity-50" />
            </button>
          )}
        </div>

        {/* Category Chip */}
        <div className="flex items-start gap-2">
          <Tag className="w-4 h-4 text-muted-foreground mt-1" />
          {isEditingCategory ? (
            <div className="flex items-center gap-1">
              <select
                autoFocus
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value as any)}
                className="w-32 px-2 py-1 text-sm border-2 rounded bg-muted border-border text-foreground focus:outline-none focus:border-primary capitalize"
                onKeyDown={(e) => e.key === 'Enter' && handleSaveCategory(editCategory)}
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{getCategoryName(cat)}</option>
                ))}
              </select>
              <button onClick={() => handleSaveCategory(editCategory)} className="p-1 text-receita"><Check className="w-4 h-4"/></button>
              <button onClick={() => { setIsEditingCategory(false); setEditCategory(transaction.categoria); }} className="p-1 text-estouro"><X className="w-4 h-4"/></button>
            </div>
          ) : (
            <button 
              onClick={() => setIsEditingCategory(true)}
              className="px-3 py-1 rounded-full bg-muted text-sm text-foreground hover:bg-border transition-colors flex items-center gap-1 capitalize"
            >
              {getCategoryName(transaction.categoria)}
              <Edit2 className="w-3 h-3 opacity-50" />
            </button>
          )}
        </div>

        {/* Date Chip */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          {transaction.data && (
            <span className="text-sm text-muted-foreground">{formatDate(transaction.data, 'dd/MM/yyyy')}</span>
          )}
        </div>
      </div>
    </div>
  );
};
