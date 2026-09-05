CREATE OR REPLACE FUNCTION get_monthly_summary(p_date date)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_start_date date := date_trunc('month', p_date)::date;
  v_end_date date := (v_start_date + interval '1 month' - interval '1 day')::date;
  v_prev_start date := (v_start_date - interval '1 month')::date;
  v_prev_end date := (v_start_date - interval '1 day')::date;
  
  v_current_total numeric;
  v_prev_total numeric;
  v_biggest_expense json;
  v_by_category json;
  v_top_5_gastos json;
BEGIN
  -- Total current month
  SELECT COALESCE(SUM(valor), 0) INTO v_current_total
  FROM transactions
  WHERE user_id = auth.uid() AND tipo = 'despesa' AND data >= v_start_date AND data <= v_end_date AND foi_corrigida IS NOT NULL;
  
  -- Removing foi_corrigida filter since the prompt didn't say only corrected, all despesas should be counted.
  SELECT COALESCE(SUM(valor), 0) INTO v_current_total
  FROM transactions
  WHERE user_id = auth.uid() AND tipo = 'despesa' AND data >= v_start_date AND data <= v_end_date;

  -- Total previous month
  SELECT COALESCE(SUM(valor), 0) INTO v_prev_total
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

  -- By category
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
    'total_mes', v_current_total,
    'total_mes_anterior', v_prev_total,
    'maior_gasto', COALESCE(v_biggest_expense, '{}'::json),
    'por_categoria', COALESCE(v_by_category, '[]'::json),
    'top_5_gastos', COALESCE(v_top_5_gastos, '[]'::json)
  );
END;
$$;
