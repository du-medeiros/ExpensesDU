import React from 'react';

interface MetaCardProps {
  categoria: string;
  valorTeto: number;
  gastoAtual: number;
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

export const MetaCard: React.FC<MetaCardProps> = ({ categoria, valorTeto, gastoAtual }) => {
  const percentage = Math.min((gastoAtual / valorTeto) * 100, 100);
  const isOver = gastoAtual > valorTeto;

  let statusText = 'Dentro do limite';
  let statusColorClass = 'text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300';
  let barColorClass = 'bg-primary';

  if (isOver) {
    statusText = 'Estourou o teto';
    statusColorClass = 'text-estouro bg-red-100 dark:bg-red-900/30';
    barColorClass = 'bg-estouro';
  } else if (percentage >= 70) {
    statusText = 'Atenção, quase lá';
    statusColorClass = 'text-atencao bg-amber-100 dark:bg-amber-900/30';
    barColorClass = 'bg-atencao';
  }

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

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
            <h3 className="font-semibold text-slate-900 dark:text-white capitalize">{categoria}</h3>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full mt-1 inline-block ${statusColorClass}`}>
              {statusText}
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-foreground tabular-nums">{formatCurrency(gastoAtual)}</p>
          <p className="text-xs text-muted-foreground tabular-nums">de {formatCurrency(valorTeto)}</p>
        </div>
      </div>
      
      <div className="w-full h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-500 ${barColorClass}`} 
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
