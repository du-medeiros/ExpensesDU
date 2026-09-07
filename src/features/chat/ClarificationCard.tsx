import React, { useState } from 'react';

interface ClarificationCardProps {
  campo_faltante?: 'valor' | 'categoria' | 'confirmacao';
  options?: string[];
  onSelect: (answer: string) => void;
}

export const ClarificationCard: React.FC<ClarificationCardProps> = ({ campo_faltante = 'valor', options, onSelect }) => {
  const [valorInput, setValorInput] = useState('');

  const handleConfirmarValor = () => {
    if (valorInput.trim()) {
      onSelect(valorInput.trim());
    }
  };

  return (
    <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4 mt-2 max-w-sm w-full">
      {campo_faltante === 'valor' ? (
        <div className="flex gap-2 items-center">
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            placeholder="R$ 0,00"
            className="flex-1 px-3 py-2 bg-background border-2 border-border text-foreground rounded-xl text-sm focus:outline-none focus:border-primary"
            value={valorInput}
            onChange={(e) => setValorInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleConfirmarValor()}
          />
          <button
            onClick={handleConfirmarValor}
            disabled={!valorInput.trim()}
            className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-xl text-sm disabled:opacity-50 transition-opacity"
          >
            Confirmar
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {options && options.map((opt) => (
            <button
              key={opt}
              onClick={() => onSelect(opt)}
              className="px-3 py-1.5 bg-background border-2 border-border text-foreground rounded-full text-sm font-medium hover:border-primary hover:text-primary transition-colors"
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
