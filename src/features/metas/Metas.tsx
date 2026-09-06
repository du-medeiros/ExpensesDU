import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { format, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MetaCard } from './MetaCard';
import { toast } from 'sonner';

export const Metas: React.FC = () => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadGoals() {
      if (!user) return;
      setLoading(true);
      try {
        const formattedDate = format(currentDate, 'yyyy-MM-dd');
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
    }
    loadGoals();
  }, [user, currentDate]);

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

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
          <button onClick={handlePrevMonth} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h2 className="text-lg font-semibold text-foreground capitalize">
            {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
          </h2>
          <button onClick={handleNextMonth} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
            <ChevronRight className="w-6 h-6" />
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
            <Link to="/app" className="mt-4 px-6 py-2 bg-primary text-primary-foreground rounded-full font-medium transition-colors hover:bg-primary/90">
              Ir para a Conversa
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {goals.map((g) => (
              <MetaCard 
                key={g.id}
                categoria={g.categoria}
                valorTeto={g.valor_teto}
                gastoAtual={g.gasto_atual}
                tipo={g.tipo}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
