CREATE OR REPLACE FUNCTION get_or_create_monthly_goals(p_date date)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_target_date date := date_trunc('month', p_date)::date;
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


CREATE OR REPLACE FUNCTION check_financial_agent_triggers(p_date date)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_day int := EXTRACT(day from p_date);
  v_target_month date := date_trunc('month', p_date)::date;
  
  v_trigger_found boolean := false;
  v_result json;
  
  -- variables for trigger 1
  v_t1_cat text;
  v_t1_gasto numeric;
  v_t1_teto numeric;
  
  -- variables for trigger 2
  v_t2_cat text;
  v_t2_gasto numeric;
  v_t2_avg numeric;
  
  -- variables for trigger 3
  v_t3_cat text;
  v_t3_gasto numeric;
  v_t3_gasto_prev numeric;
BEGIN
  -- Gatilho 1: Categoria com teto atinge 80% antes do dia 20
  IF v_day < 20 THEN
    SELECT g.categoria, g.gasto_atual, g.valor_teto 
    INTO v_t1_cat, v_t1_gasto, v_t1_teto
    FROM (
      SELECT 
        go.categoria,
        go.valor_teto,
        COALESCE((
          SELECT SUM(valor) FROM transactions t 
          WHERE t.user_id = v_user_id AND t.categoria = go.categoria AND t.tipo = 'despesa' AND date_trunc('month', t.data) = v_target_month
        ), 0) as gasto_atual
      FROM goals go
      WHERE go.user_id = v_user_id AND go.mes_referencia = v_target_month
    ) g
    WHERE g.gasto_atual >= (g.valor_teto * 0.8)
    ORDER BY (g.gasto_atual / g.valor_teto) DESC
    LIMIT 1;
    
    IF FOUND THEN
      v_trigger_found := true;
      v_result := json_build_object(
        'gatilho', 'teto_80_antes_dia_20',
        'dados', json_build_object('categoria', v_t1_cat, 'gasto', v_t1_gasto, 'teto', v_t1_teto)
      );
      RETURN v_result;
    END IF;
  END IF;

  -- Gatilho 2: Categoria com gasto 30% ou mais acima da média dos 2 meses anteriores
  SELECT c.categoria, c.gasto_atual, c.media_2_meses
  INTO v_t2_cat, v_t2_gasto, v_t2_avg
  FROM (
    SELECT 
      t.categoria,
      SUM(CASE WHEN date_trunc('month', t.data) = v_target_month THEN t.valor ELSE 0 END) as gasto_atual,
      SUM(CASE WHEN date_trunc('month', t.data) < v_target_month THEN t.valor ELSE 0 END) / 2.0 as media_2_meses
    FROM transactions t
    WHERE t.user_id = v_user_id AND t.tipo = 'despesa' 
      AND date_trunc('month', t.data) >= (v_target_month - interval '2 months')::date
      AND date_trunc('month', t.data) <= v_target_month
    GROUP BY t.categoria
  ) c
  WHERE c.media_2_meses > 0 AND c.gasto_atual >= (c.media_2_meses * 1.3)
  ORDER BY (c.gasto_atual / c.media_2_meses) DESC
  LIMIT 1;

  IF FOUND THEN
    v_trigger_found := true;
    v_result := json_build_object(
      'gatilho', 'gasto_30_acima_media',
      'dados', json_build_object('categoria', v_t2_cat, 'gasto_atual', v_t2_gasto, 'media_anterior', v_t2_avg)
    );
    RETURN v_result;
  END IF;

  -- Gatilho 3: Fechamento de mês (dia >= 25 ou dia <= 5)
  IF v_day >= 25 OR v_day <= 5 THEN
    -- Determina se estamos olhando pro mes atual (se >25) ou pro mes passado (se <=5)
    DECLARE
      v_close_month date := CASE WHEN v_day <= 5 THEN (v_target_month - interval '1 month')::date ELSE v_target_month END;
      v_prev_month date := (v_close_month - interval '1 month')::date;
    BEGIN
      SELECT c.categoria, c.gasto_atual, c.gasto_anterior
      INTO v_t3_cat, v_t3_gasto, v_t3_gasto_prev
      FROM (
        SELECT 
          t.categoria,
          SUM(CASE WHEN date_trunc('month', t.data) = v_close_month THEN t.valor ELSE 0 END) as gasto_atual,
          SUM(CASE WHEN date_trunc('month', t.data) = v_prev_month THEN t.valor ELSE 0 END) as gasto_anterior
        FROM transactions t
        WHERE t.user_id = v_user_id AND t.tipo = 'despesa'
          AND date_trunc('month', t.data) >= v_prev_month
          AND date_trunc('month', t.data) <= v_close_month
        GROUP BY t.categoria
      ) c
      ORDER BY c.gasto_atual DESC
      LIMIT 1;

      IF FOUND AND v_t3_gasto > 0 THEN
        v_trigger_found := true;
        v_result := json_build_object(
          'gatilho', 'fechamento_mes',
          'dados', json_build_object('mes_referencia', v_close_month, 'maior_categoria', v_t3_cat, 'gasto', v_t3_gasto, 'gasto_mes_anterior', v_t3_gasto_prev)
        );
        RETURN v_result;
      END IF;
    END;
  END IF;

  RETURN NULL;
END;
$$;
