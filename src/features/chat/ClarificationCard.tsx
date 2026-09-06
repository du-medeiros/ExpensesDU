import React from 'react';
import { HelpCircle } from 'lucide-react';
import { getCategoryName } from '../../lib/categories';

interface ClarificationCardProps {
  question: string;
  onSelect: (answer: string) => void;
}

const CATEGORIES = [
  'alimentacao', 'transporte', 'moradia', 'saude',
  'lazer', 'compras', 'contas', 'outros',
];

export const ClarificationCard: React.FC<ClarificationCardProps> = ({ question, onSelect }) => {
  return (
    <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4 mt-2 max-w-sm w-full">
      <p className="text-sm font-medium text-orange-900 dark:text-orange-100 mb-3 flex items-center gap-2">
        <HelpCircle className="w-4 h-4" />
        {question}
      </p>
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => onSelect(cat)}
            className="px-3 py-1.5 bg-background border-2 border-border text-foreground rounded-full text-sm font-medium hover:border-primary hover:text-primary transition-colors"
          >
            {getCategoryName(cat)}
          </button>
        ))}
        <button
          onClick={() => onSelect('Cancelar')}
          className="px-3 py-1.5 bg-background border-2 border-transparent text-red-600 dark:text-red-400 rounded-full text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
};
