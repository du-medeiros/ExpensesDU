-- 1. Add tipo to goals
ALTER TABLE public.goals 
ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'despesa' CHECK (tipo IN ('despesa', 'receita'));

-- 2. Update get_monthly_summary
CREATE OR REPLACE FUNCTION get_monthly_summary(p_date text)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_parsed_date date := p_date::date;
  v_start_date date := date_trunc('month', v_parsed_date)::date;
  v_end_date date := (v_start_date + interval '1 month' - interval '1 day')::date;
  v_prev_start date := (v_start_date - interval '1 month')::date;
  v_prev_end date := (v_start_date - interval '1 day')::date;
  
  v_current_despesas numeric;
  v_current_receitas numeric;
  v_prev_despesas numeric;
  v_biggest_expense json;
  v_by_category json;
  v_top_5_gastos json;
BEGIN
  -- Total despesas current month
  SELECT COALESCE(SUM(valor), 0) INTO v_current_despesas
  FROM transactions
  WHERE user_id = auth.uid() AND tipo = 'despesa' AND data >= v_start_date AND data <= v_end_date;

  -- Total receitas current month
  SELECT COALESCE(SUM(valor), 0) INTO v_current_receitas
  FROM transactions
  WHERE user_id = auth.uid() AND tipo = 'receita' AND data >= v_start_date AND data <= v_end_date;

  -- Total despesas previous month
  SELECT COALESCE(SUM(valor), 0) INTO v_prev_despesas
  FROM transactions
  WHERE user_id = auth.uid() AND tipo = 'despesa' AND data >= v_prev_start AND data <= v_prev_end;

  -- Biggest expense
  SELECT row_to_json(t) INTO v_biggest_expense
  FROM (
    SELECT valor, categoria, descricao, data
    FROM transactions
    WHERE user_id = auth.uid() AND tipo = 'despesa' AND data >= v_start_date AND data <= v_end_date
    ORDER BY valor DESC, created_at DESC
    LIMIT 1
  ) t;

  -- By category (despesas only, typically for the chart)
  SELECT json_agg(row_to_json(c)) INTO v_by_category
  FROM (
    SELECT categoria, SUM(valor) as total
    FROM transactions
    WHERE user_id = auth.uid() AND tipo = 'despesa' AND data >= v_start_date AND data <= v_end_date
    GROUP BY categoria
    ORDER BY total DESC
  ) c;

  -- Top 5 gastos
  SELECT json_agg(row_to_json(t5)) INTO v_top_5_gastos
  FROM (
    SELECT valor, categoria, descricao, data
    FROM transactions
    WHERE user_id = auth.uid() AND tipo = 'despesa' AND data >= v_start_date AND data <= v_end_date
    ORDER BY valor DESC, created_at DESC
    LIMIT 5
  ) t5;

  RETURN json_build_object(
    'total_mes', v_current_despesas,
    'total_receitas', v_current_receitas,
    'saldo', v_current_receitas - v_current_despesas,
    'total_mes_anterior', v_prev_despesas,
    'maior_gasto', COALESCE(v_biggest_expense, '{}'::json),
    'por_categoria', COALESCE(v_by_category, '[]'::json),
    'top_5_gastos', COALESCE(v_top_5_gastos, '[]'::json)
  );
END;
$$;

-- 3. Update get_or_create_monthly_goals to consider 'tipo'
CREATE OR REPLACE FUNCTION get_or_create_monthly_goals(p_date text)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_parsed_date date := p_date::date;
  v_target_date date := date_trunc('month', v_parsed_date)::date;
  v_user_id uuid := auth.uid();
  v_goals_count int;
  v_last_goals_date date;
  v_result json;
BEGIN
  SELECT COUNT(*) INTO v_goals_count
  FROM goals
  WHERE user_id = v_user_id AND mes_referencia = v_target_date;

  IF v_goals_count = 0 THEN
    SELECT mes_referencia INTO v_last_goals_date
    FROM goals
    WHERE user_id = v_user_id AND mes_referencia < v_target_date
    ORDER BY mes_referencia DESC
    LIMIT 1;

    IF v_last_goals_date IS NOT NULL THEN
      INSERT INTO goals (user_id, categoria, valor_teto, mes_referencia, tipo)
      SELECT user_id, categoria, valor_teto, v_target_date, tipo
      FROM goals
      WHERE user_id = v_user_id AND mes_referencia = v_last_goals_date;
    END IF;
  END IF;

  SELECT json_agg(row_to_json(g)) INTO v_result
  FROM (
    SELECT 
      g.id,
      g.categoria,
      g.valor_teto,
      g.tipo,
      COALESCE((
        SELECT SUM(valor)
        FROM transactions t
        WHERE t.user_id = v_user_id 
          AND t.categoria = g.categoria 
          AND t.tipo = g.tipo
          AND date_trunc('month', t.data) = v_target_date
      ), 0) as gasto_atual
    FROM goals g
    WHERE g.user_id = v_user_id AND g.mes_referencia = v_target_date
    ORDER BY g.valor_teto DESC
  ) g;

  RETURN COALESCE(v_result, '[]'::json);
END;
$$;

-- 4. Create function for agent context
CREATE OR REPLACE FUNCTION get_agent_context(p_date text)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_parsed_date date := p_date::date;
  v_start_date date := date_trunc('month', v_parsed_date)::date;
  v_end_date date := (v_start_date + interval '1 month' - interval '1 day')::date;
  v_receitas numeric;
  v_despesas numeric;
  v_metas json;
BEGIN
  SELECT COALESCE(SUM(valor), 0) INTO v_receitas
  FROM transactions
  WHERE user_id = auth.uid() AND tipo = 'receita' AND data >= v_start_date AND data <= v_end_date;

  SELECT COALESCE(SUM(valor), 0) INTO v_despesas
  FROM transactions
  WHERE user_id = auth.uid() AND tipo = 'despesa' AND data >= v_start_date AND data <= v_end_date;

  SELECT json_agg(row_to_json(g)) INTO v_metas
  FROM (
    SELECT 
      g.categoria,
      g.valor_teto,
      g.tipo,
      COALESCE((
        SELECT SUM(valor)
        FROM transactions t
        WHERE t.user_id = auth.uid() 
          AND t.categoria = g.categoria 
          AND t.tipo = g.tipo
          AND date_trunc('month', t.data) = v_start_date
      ), 0) as gasto_atual
    FROM goals g
    WHERE g.user_id = auth.uid() AND g.mes_referencia = v_start_date
  ) g;

  RETURN json_build_object(
    'receitas', v_receitas,
    'despesas', v_despesas,
    'saldo', v_receitas - v_despesas,
    'metas', COALESCE(v_metas, '[]'::json)
  );
END;
$$;
