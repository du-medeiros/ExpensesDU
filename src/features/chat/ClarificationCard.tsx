import React from 'react';

interface ClarificationCardProps {
  question: string;
  onSelect: (answer: string) => void;
}

const CATEGORIES = [
  'alimentacao', 'transporte', 'moradia', 'saude',
  'lazer', 'compras', 'contas', 'outros',
];

export const ClarificationCard: React.FC<ClarificationCardProps> = ({ question, onSelect }) => {
  // Try to determine what kind of clarification it is.
  // The simplest is category clarification.
  // If the question contains 'categoria', 'qual', etc, we show category chips.
  const isCategoryClarification = question.toLowerCase().includes('categoria') || question.toLowerCase().includes('com o que');

  return (
    <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4 mt-2 max-w-sm w-full">
      <p className="text-orange-800 dark:text-orange-200 text-sm mb-4">
        {question}
      </p>

      {isCategoryClarification ? (
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => onSelect(cat)}
              className="px-3 py-1.5 bg-background border border-border rounded-full text-sm font-medium text-foreground hover:bg-muted transition-colors capitalize"
            >
              {cat}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex gap-2">
           {/* Fallback to simple Yes/No or just let the user know they need to type in the main input if we can't show chips */}
           <button onClick={() => onSelect('Sim')} className="px-4 py-2 bg-background border border-border rounded-full text-sm font-medium text-foreground hover:bg-muted">Sim</button>
           <button onClick={() => onSelect('Não')} className="px-4 py-2 bg-background border border-border rounded-full text-sm font-medium text-foreground hover:bg-muted">Não</button>
        </div>
      )}
    </div>
  );
};
