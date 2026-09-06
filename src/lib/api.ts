import { supabase } from './supabase';
import { Database } from '../types/database';

export type Transaction = Omit<Database['public']['Tables']['transactions']['Row'], 'valor'> & { valor: number };
export type Goal = Omit<Database['public']['Tables']['goals']['Row'], 'valor_limite'> & { valor_teto: number, gasto_atual: number };

// Helper para converter com segurança
const parseNumeric = (val: any): number => {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') return parseFloat(val) || 0;
  return 0;
};

export const api = {
  async getMonthlySummary(dateStr: string) {
    const { data, error } = await supabase.rpc('get_monthly_summary', { p_date: dateStr });
    if (error) throw error;
    
    // Converte todos os campos numeric (string do pg) para number
    const parsedData = {
      ...data,
      total_mes: parseNumeric(data.total_mes),
      total_receitas: parseNumeric(data.total_receitas),
      saldo: parseNumeric(data.saldo),
      total_mes_anterior: parseNumeric(data.total_mes_anterior),
      maior_gasto: data.maior_gasto && Object.keys(data.maior_gasto).length > 0 ? {
        ...data.maior_gasto,
        valor: parseNumeric(data.maior_gasto.valor)
      } : null,
      por_categoria: (data.por_categoria || []).map((c: any) => ({
        ...c,
        total: parseNumeric(c.total)
      })),
      top_5_gastos: (data.top_5_gastos || []).map((t: any) => ({
        ...t,
        valor: parseNumeric(t.valor)
      }))
    };
    
    return parsedData;
  },

  async getMonthTransactions(startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .gte('data', startDate)
      .lte('data', endDate)
      .order('data', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    return (data || []).map(t => ({
      ...t,
      valor: parseNumeric(t.valor)
    })) as Transaction[];
  },

  async getMonthlyGoals(dateStr: string) {
    const { data, error } = await supabase.rpc('get_or_create_monthly_goals', { p_date: dateStr });
    if (error) throw error;

    return (data || []).map((g: any) => ({
      ...g,
      valor_teto: parseNumeric(g.valor_teto),
      gasto_atual: parseNumeric(g.gasto_atual)
    })) as Goal[];
  }
};
