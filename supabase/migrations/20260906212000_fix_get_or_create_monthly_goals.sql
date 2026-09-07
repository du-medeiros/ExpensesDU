-- 1. Atualizar RPC para não criar metas passivamente em meses futuros
CREATE OR REPLACE FUNCTION get_or_create_monthly_goals(p_date text)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_parsed_date date := p_date::date;
  v_target_date date := date_trunc('month', v_parsed_date)::date;
  v_current_month date := date_trunc('month', current_date)::date;
  v_user_id uuid := auth.uid();
  v_goals_count int;
  v_last_goals_date date;
  v_result json;
BEGIN
  SELECT COUNT(*) INTO v_goals_count
  FROM goals
  WHERE user_id = v_user_id AND mes_referencia = v_target_date;

  -- Só replicamos metas do passado se o mês acessado não for no futuro!
  IF v_goals_count = 0 AND v_target_date <= v_current_month THEN
    SELECT mes_referencia INTO v_last_goals_date
    FROM goals
    WHERE user_id = v_user_id AND mes_referencia < v_target_date
    ORDER BY mes_referencia DESC
    LIMIT 1;

    IF v_last_goals_date IS NOT NULL THEN
      INSERT INTO goals (user_id, categoria, valor_teto, mes_referencia)
      SELECT user_id, categoria, valor_teto, v_target_date
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
      COALESCE((
        SELECT SUM(valor)
        FROM transactions t
        WHERE t.user_id = v_user_id 
          AND t.categoria = g.categoria 
          AND t.tipo = 'despesa'
          AND date_trunc('month', t.data) = v_target_date
      ), 0) as gasto_atual
    FROM goals g
    WHERE g.user_id = v_user_id AND g.mes_referencia = v_target_date
    ORDER BY g.valor_teto DESC
  ) g;

  RETURN COALESCE(v_result, '[]'::json);
END;
$$;

-- 2. Limpar metas criadas indevidamente em meses futuros
DELETE FROM goals
WHERE mes_referencia > date_trunc('month', CURRENT_DATE)::date;
