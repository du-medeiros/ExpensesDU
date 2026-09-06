import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { format, addMonths, subMonths } from 'date-fns';
import { formatDate } from '../../lib/date';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { MetaCard } from './MetaCard';
import { GoalFormModal } from './GoalFormModal';
import { toast } from 'sonner';

const CATEGORIES = ['alimentacao', 'transporte', 'moradia', 'saude', 'lazer', 'compras', 'contas', 'outros'];

export const Metas: React.FC = () => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<any>(null);

  const loadGoals = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const formattedDate = formatDate(currentDate, 'yyyy-MM-dd');
      const { data, error } = await supabase
        .rpc('get_or_create_monthly_goals', { p_date: formattedDate });
      
      if (error) throw error;
      setGoals((data as any[]) || []);
    } catch (err) {
      console.error('Error loading goals', err);
      toast.error('Erro ao carregar metas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGoals();
  }, [user, currentDate]);

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const handleOpenNewModal = () => {
    setEditingGoal(null);
    setIsModalOpen(true);
  };

  const handleSubmitGoal = async (categoria: string, valor_teto: number) => {
    if (!user) return;
    try {
      const firstDayOfMonth = formatDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1), 'yyyy-MM-dd');
      
      const { error } = await supabase
        .from('goals')
        .upsert({
          user_id: user.id,
          categoria,
          mes_referencia: firstDayOfMonth,
          valor_teto,
        }, { onConflict: 'user_id, categoria, mes_referencia' });

      if (error) throw error;
      toast.success(editingGoal ? 'Teto atualizado com sucesso!' : 'Teto criado com sucesso!');
      await loadGoals();
    } catch (err) {
      console.error('Error saving goal', err);
      toast.error('Erro ao salvar meta');
    }
  };

  const handleDeleteGoal = async (id: string) => {
    if (!confirm('Deseja realmente excluir este teto de gastos?')) return;
    try {
      const { error } = await supabase.from('goals').delete().eq('id', id);
      if (error) throw error;
      toast.success('Teto excluído com sucesso');
      await loadGoals();
    } catch (err) {
      console.error('Error deleting goal', err);
      toast.error('Erro ao excluir meta');
    }
  };

  if (loading && goals.length === 0) {
    return (
      <div className="flex flex-col h-full bg-muted p-4">
        <div className="max-w-md mx-auto w-full mt-16 space-y-4">
          <div className="h-24 bg-background border-border rounded-2xl animate-pulse"></div>
          <div className="h-24 bg-background border-border rounded-2xl animate-pulse"></div>
          <div className="h-24 bg-background border-border rounded-2xl animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-muted overflow-y-auto">
      {/* Header / Month Selector */}
      <div className="bg-background p-4 border-b border-border sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <div className="flex items-center">
            <button onClick={handlePrevMonth} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h2 className="text-lg font-semibold text-foreground capitalize mx-2">
              {formatDate(currentDate, 'MMMM yyyy')}
            </h2>
            <button onClick={handleNextMonth} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
          <button 
            onClick={handleOpenNewModal}
            className="flex items-center gap-1 text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-full transition-colors"
          >
            <Plus className="w-4 h-4" /> Nova Meta
          </button>
        </div>
      </div>

      <div className="flex-1 p-4 max-w-md mx-auto w-full pb-24">
        {goals.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center mt-12 px-4 space-y-2">
            <h3 className="text-lg font-semibold text-foreground">Sem metas este mês</h3>
            <p className="text-muted-foreground text-sm">
              Peça para o agente criar um limite (ex: "Meta de 400 em mercado").
            </p>
            <button 
              onClick={handleOpenNewModal}
              className="mt-4 px-6 py-2 bg-primary text-primary-foreground rounded-full font-medium transition-colors hover:bg-primary/90"
            >
              Criar Primeiro Teto
            </button>
            <div className="text-xs text-muted-foreground mt-4 pt-4 border-t border-border">
              Ou peça no chat: "Meta de 400 em mercado"
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {goals.map((g) => (
              <MetaCard 
                key={g.id}
                id={g.id}
                categoria={g.categoria}
                valorTeto={g.valor_teto}
                gastoAtual={g.gasto_atual}
                onEdit={(id, cat, val) => {
                  setEditingGoal({ id, categoria: cat, valor_teto: val });
                  setIsModalOpen(true);
                }}
                onDelete={handleDeleteGoal}
              />
            ))}
          </div>
        )}
      </div>

      <GoalFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmitGoal}
        initialData={editingGoal}
        categories={CATEGORIES}
      />
    </div>
  );
};
