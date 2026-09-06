import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { format, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { ChevronLeft, ChevronRight, TrendingDown, TrendingUp, ArrowDownCircle, ArrowUpCircle, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { useTelemetry } from '../../hooks/useTelemetry';

const CATEGORY_COLORS: Record<string, string> = {
  alimentacao: '#f97316', // orange
  transporte: '#3b82f6',  // blue
  moradia: '#8b5cf6',     // violet
  saude: '#10b981',       // emerald
  lazer: '#ec4899',       // pink
  compras: '#eab308',     // yellow
  contas: '#ef4444',      // red
  outros: '#64748b'       // slate
};

export const Resumo: React.FC = () => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { trackEvent } = useTelemetry();

  useEffect(() => {
    trackEvent('resumo_aberto');
  }, [trackEvent]);

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      setLoading(true);
      try {
        const formattedDate = format(currentDate, 'yyyy-MM-dd');
        const { data: summaryData, error } = await supabase
          .rpc('get_monthly_summary', { p_date: formattedDate });
        
        if (error) throw error;
        setData(summaryData);
      } catch (err) {
        console.error('Error loading summary', err);
        toast.error('Erro ao carregar resumo');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user, currentDate]);

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  if (loading && !data) {
    return (
      <div className="flex flex-col h-full bg-muted p-4">
        <div className="max-w-md mx-auto w-full mt-16 space-y-4">
          <div className="h-32 bg-background border-border rounded-3xl animate-pulse"></div>
          <div className="h-64 bg-background border-border rounded-3xl animate-pulse mt-8"></div>
        </div>
      </div>
    );
  }

  const totalDespesas = data?.total_mes || 0;
  const totalReceitas = data?.total_receitas || 0;
  const saldo = data?.saldo || 0;
  const totalMesAnterior = data?.total_mes_anterior || 0;
  
  let variacao = 0;
  if (totalMesAnterior > 0) {
    variacao = ((totalDespesas - totalMesAnterior) / totalMesAnterior) * 100;
  } else if (totalDespesas > 0 && totalMesAnterior === 0) {
    variacao = 100;
  }

  const isEmpty = totalDespesas === 0 && totalReceitas === 0;

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

      <div className="flex-1 p-4 max-w-md mx-auto w-full space-y-6 pb-24">
        
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center text-center mt-12 px-4 space-y-2">
            <h3 className="text-lg font-semibold text-foreground">Nenhuma movimentação neste mês</h3>
            <p className="text-muted-foreground text-sm">
              Comece agora registrando algo na conversa.
            </p>
            <Link to="/app" className="mt-4 px-6 py-2 bg-primary text-primary-foreground rounded-full font-medium transition-colors hover:bg-primary/90">
              Ir para a Conversa
            </Link>
          </div>
        ) : (
          <>
            {/* Resumo Cards Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 bg-background rounded-2xl p-6 shadow-sm border border-border text-center">
                <div className="flex items-center justify-center gap-2 text-muted-foreground font-medium mb-1">
                  <Wallet className="w-4 h-4" />
                  <span>Saldo Atual</span>
                </div>
                <h1 className={`text-4xl font-bold mb-2 tabular-nums ${saldo >= 0 ? 'text-receita' : 'text-estouro'}`}>
                  {formatCurrency(saldo)}
                </h1>
              </div>

              <div className="bg-background rounded-2xl p-4 shadow-sm border border-border text-center flex flex-col items-center">
                <div className="flex items-center justify-center gap-1 text-receita font-medium mb-1">
                  <ArrowUpCircle className="w-4 h-4" />
                  <span className="text-sm">Receitas</span>
                </div>
                <p className="text-xl font-bold text-foreground tabular-nums">{formatCurrency(totalReceitas)}</p>
              </div>

              <div className="bg-background rounded-2xl p-4 shadow-sm border border-border text-center flex flex-col items-center">
                <div className="flex items-center justify-center gap-1 text-estouro font-medium mb-1">
                  <ArrowDownCircle className="w-4 h-4" />
                  <span className="text-sm">Despesas</span>
                </div>
                <p className="text-xl font-bold text-foreground tabular-nums">{formatCurrency(totalDespesas)}</p>
                <div className={`mt-2 inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    variacao > 0 
                      ? 'text-estouro bg-estouro/10' 
                      : variacao < 0 
                        ? 'text-receita bg-receita/10' 
                        : 'text-muted-foreground bg-muted'
                  }`}
                >
                  {variacao > 0 ? <TrendingUp className="w-3 h-3" /> : variacao < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                  {variacao === 0 ? 'Igual anterior' : `${Math.abs(variacao).toFixed(0)}%`}
                </div>
              </div>
            </div>

            {/* Donut Chart (Apenas Despesas) */}
            {totalDespesas > 0 && (
              <div className="bg-background rounded-2xl p-6 shadow-sm border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">Gastos por Categoria</h3>
                <div className="h-64 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.por_categoria}
                        dataKey="total"
                        nameKey="categoria"
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={90}
                        stroke="none"
                        paddingAngle={2}
                      >
                        {data.por_categoria.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.categoria] || CATEGORY_COLORS['outros']} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: any) => formatCurrency(value)}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)' }}
                        itemStyle={{ color: 'var(--color-foreground)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center text for Donut */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xs text-muted-foreground font-medium uppercase">Despesas</span>
                    <span className="text-lg font-bold text-foreground">{formatCurrency(totalDespesas)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Top 5 Gastos */}
            {data.top_5_gastos && data.top_5_gastos.length > 0 && (
              <div className="bg-background rounded-2xl p-6 shadow-sm border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">Maiores Gastos</h3>
                <div className="space-y-4">
                  {data.top_5_gastos.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-white font-bold"
                          style={{ backgroundColor: CATEGORY_COLORS[item.categoria] || CATEGORY_COLORS['outros'] }}
                        >
                          {item.categoria.substring(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-foreground line-clamp-1 capitalize">{item.descricao}</p>
                          <p className="text-xs text-muted-foreground capitalize">{item.categoria} • {format(new Date(item.data), 'dd MMM', { locale: ptBR })}</p>
                        </div>
                      </div>
                      <div className="font-semibold text-foreground whitespace-nowrap ml-2">
                        {formatCurrency(item.valor)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
