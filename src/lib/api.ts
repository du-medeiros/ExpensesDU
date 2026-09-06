import { supabase } from './supabase';
import type { Database } from '../types/database';

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
    
    const rawData = data as any;
    
    // Converte todos os campos numeric (string do pg) para number
    const parsedData = {
      ...rawData,
      total_mes: parseNumeric(rawData?.total_mes),
      total_receitas: parseNumeric(rawData?.total_receitas),
      saldo: parseNumeric(rawData?.saldo),
      total_mes_anterior: parseNumeric(rawData?.total_mes_anterior),
      maior_gasto: rawData?.maior_gasto && Object.keys(rawData.maior_gasto).length > 0 ? {
        ...rawData.maior_gasto,
        valor: parseNumeric(rawData.maior_gasto.valor)
      } : null,
      por_categoria: (rawData?.por_categoria || []).map((c: any) => ({
        ...c,
        total: parseNumeric(c.total)
      })),
      top_5_gastos: (rawData?.top_5_gastos || []).map((t: any) => ({
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

    const rawData = data as any[];
    return (rawData || []).map((g: any) => ({
      ...g,
      valor_teto: parseNumeric(g.valor_teto),
      gasto_atual: parseNumeric(g.gasto_atual)
    })) as Goal[];
  }
};
