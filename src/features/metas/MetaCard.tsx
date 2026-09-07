import React, { useState } from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import { formatCurrency } from '../../lib/currency';
import { getCategoryName } from '../../lib/categories';

interface MetaCardProps {
  id: string;
  categoria: string;
  valorTeto: number;
  gastoAtual: number;
  onEdit?: (id: string, categoria: string, valorTeto: number) => void;
  onDelete?: (id: string, cascade: boolean, categoria: string) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  alimentacao: '#f97316',
  transporte: '#3b82f6',
  moradia: '#8b5cf6',
  saude: '#10b981',
  lazer: '#ec4899',
  compras: '#eab308',
  contas: '#ef4444',
  outros: '#64748b'
};

export const MetaCard: React.FC<MetaCardProps> = ({ id, categoria, valorTeto, gastoAtual, onEdit, onDelete }) => {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  
  const percentage = Math.min((gastoAtual / valorTeto) * 100, 100);
  const isOver = gastoAtual > valorTeto;

  let statusText = 'Dentro do limite';
  let statusColorClass = 'text-muted-foreground bg-muted';
  let barColorClass = 'bg-primary';

  if (isOver) {
    statusText = 'Estourou o teto';
    statusColorClass = 'text-estouro bg-estouro/10';
    barColorClass = 'bg-estouro';
  } else if (percentage >= 70) {
    statusText = 'Atenção, quase lá';
    statusColorClass = 'text-atencao bg-atencao/10';
    barColorClass = 'bg-atencao';
  }

  return (
    <div className="bg-background rounded-2xl p-5 shadow-sm border-2 border-border mb-4">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-white font-bold"
            style={{ backgroundColor: CATEGORY_COLORS[categoria] || CATEGORY_COLORS['outros'] }}
          >
            {categoria.substring(0, 1).toUpperCase()}
          </div>
          <div>
            <h3 className="font-semibold text-foreground">
              {getCategoryName(categoria)}
            </h3>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full mt-1 inline-block ${statusColorClass}`}>
              {statusText}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <div className="flex gap-2 mb-1">
            {onEdit && (
              <button onClick={() => onEdit(id, categoria, valorTeto)} className="p-1 text-muted-foreground hover:text-primary transition-colors">
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            {onDelete && !isConfirmingDelete && (
              <button onClick={() => setIsConfirmingDelete(true)} className="p-1 text-muted-foreground hover:text-destructive transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          <p className="text-sm font-bold text-foreground tabular-nums">{formatCurrency(gastoAtual)}</p>
          <p className="text-xs text-muted-foreground tabular-nums">de {formatCurrency(valorTeto)}</p>
        </div>
      </div>
      
      {isConfirmingDelete && onDelete && (
        <div className="bg-estouro/10 rounded-lg p-3 mb-4 border border-estouro/20">
          <p className="text-sm text-foreground mb-3 font-medium">
            Excluir o teto de {formatCurrency(valorTeto)} para {getCategoryName(categoria)}?
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <button 
              onClick={() => onDelete(id, false, categoria)}
              className="text-xs bg-estouro text-primary-foreground px-3 py-2 rounded font-medium hover:bg-estouro/90 transition-colors flex-1"
            >
              Só este mês
            </button>
            <button 
              onClick={() => onDelete(id, true, categoria)}
              className="text-xs bg-estouro/80 text-primary-foreground px-3 py-2 rounded font-medium hover:bg-estouro transition-colors flex-1"
            >
              Este e os próximos
            </button>
            <button 
              onClick={() => setIsConfirmingDelete(false)}
              className="text-xs bg-muted text-foreground px-3 py-2 rounded font-medium hover:bg-border transition-colors flex-1 sm:flex-none"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-500 ${barColorClass}`} 
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
