import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { getCategoryName } from '../../lib/categories';

interface GoalFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (categoria: string, valor_teto: number) => Promise<void>;
  initialData?: { categoria: string; valor_teto: number };
  categories: string[];
}

export const GoalFormModal: React.FC<GoalFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  categories,
}) => {
  const [categoria, setCategoria] = useState('');
  const [valorTeto, setValorTeto] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCategoria(initialData?.categoria || categories[0] || 'alimentacao');
      setValorTeto(initialData?.valor_teto ? initialData.valor_teto.toString() : '');
      setIsSubmitting(false);
    }
  }, [isOpen, initialData, categories]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(valorTeto);
    if (!categoria || isNaN(val) || val <= 0) return;

    setIsSubmitting(true);
    await onSubmit(categoria, val);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-background rounded-2xl w-full max-w-sm overflow-hidden shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            {initialData ? 'Editar Teto' : 'Novo Teto'}
          </h2>
          <button 
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Categoria</label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              disabled={!!initialData} // Usually we don't change category of an existing goal because it might violate unique constraints or cause confusion
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {getCategoryName(cat)}
                </option>
              ))}
            </select>
            {initialData && <p className="text-xs text-muted-foreground">Não é possível alterar a categoria de um teto existente.</p>}
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Valor Mensal (R$)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={valorTeto}
              onChange={(e) => setValorTeto(e.target.value)}
              placeholder="0,00"
              className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
              required
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !valorTeto}
              className="w-full bg-primary text-primary-foreground font-medium py-3 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Salvando...' : 'Salvar Teto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
