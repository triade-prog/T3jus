-- 0080 · Rotina noturna dos prazos do inventário (F0.13; PT-11, PT-03).
--
-- Regras desta parte:
-- 1. A rotina só age numa tabela cujo prazo está APROVADO no inventário. Enquanto o prazo é
--    PROPOSTA, ela não apaga nada daquela tabela e diz isso no resultado.
-- 2. O que ela sabe aplicar hoje: sessões de escritório (30 dias), contadores de tentativas
--    (1 dia) e entradas no sistema no histórico (6 meses, acao acesso.*). Os números ficam em
--    configuracoes, para mudar sem reescrever a rotina.
-- 3. Os prazos que dependem do fim do contrato ou da saída da pessoa (escritórios, notas,
--    pessoas, equipe e eventos do escritório no histórico) ainda não têm gatilho: o sistema
--    não registra o fim do contrato nem apaga a entrada no Supabase Auth. Aparecem no
--    resultado como "sem gatilho" e ficam no painel como pendência.
-- 4. Cada execução registra no histórico a contagem do que saiu por tabela, sem nenhum dado
--    pessoal (PT-03).
-- 5. Ninguém apaga histórico fora desta rotina: o bloqueio de alteração continua, e só a
--    rotina, rodando como dono das tabelas e com a marca da execução, passa por ele.

insert into configuracoes (chave, valor, descricao) values
  ('prazo_sessoes_dias',   '30', 'Dias sem uso até a sessão de escritório ser apagada (inventário: sessoes_escritorio)'),
  ('prazo_limites_horas',  '24', 'Horas até um contador de tentativas ser apagado (inventário: limites_uso)'),
  ('prazo_acessos_meses',  '6',  'Meses até uma entrada no sistema sair do histórico (inventário: historico; Marco Civil, art. 15)');

-- O histórico continua só de inserção, menos para a rotina dos prazos (regra 5).
create or replace function historico_somente_insercao() returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' and current_user = 'dominio'
     and current_setting('t3jus.aplicando_prazos', true) = 'on' then
    return old;
  end if;
  raise exception 'O histórico é só de inserção (% bloqueado)', tg_op using errcode = 'TC010';
end $$;

-- Sem contexto de pessoa, as políticas de leitura não deixam a rotina ver as linhas (o
-- delete com filtro também precisa ler). Estas políticas valem só para o dono das tabelas e
-- só durante a rotina.
create policy rotina_prazos_ler on historico for select to dominio
  using (current_setting('t3jus.aplicando_prazos', true) = 'on');
create policy rotina_prazos_apagar on historico for delete to dominio
  using (current_setting('t3jus.aplicando_prazos', true) = 'on');
create policy rotina_prazos_ler on sessoes_escritorio for select to dominio
  using (current_setting('t3jus.aplicando_prazos', true) = 'on');
create policy rotina_prazos_apagar on sessoes_escritorio for delete to dominio
  using (current_setting('t3jus.aplicando_prazos', true) = 'on');

create function prazo_aprovado(p_tabela text) returns boolean
language sql stable
set search_path = public
as $$ select exists (select 1 from inventario_dados where tabela = p_tabela and situacao = 'APROVADO') $$;

-- Aplica os prazos aprovados e devolve o que fez: {"apagados": {tabela: n}, "aguardando_aprovacao":
-- [...], "sem_gatilho": [...]}.
create function aplicar_prazos() returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n         integer;
  v_apagados  jsonb := '{}'::jsonb;
  v_aguardam  text[] := '{}';
  v_sem       text[];
  v_resultado jsonb;
begin
  perform limpar_contexto();
  perform set_config('t3jus.aplicando_prazos', 'on', true);

  if prazo_aprovado('sessoes_escritorio') then
    delete from sessoes_escritorio
     where escolhido_em < app_now() - make_interval(days => configuracao_int('prazo_sessoes_dias'));
    get diagnostics v_n = row_count;
    v_apagados := v_apagados || jsonb_build_object('sessoes_escritorio', v_n);
  else
    v_aguardam := v_aguardam || 'sessoes_escritorio'::text;
  end if;

  if prazo_aprovado('limites_uso') then
    delete from limites_uso
     where inicio_janela < app_now() - make_interval(hours => configuracao_int('prazo_limites_horas'));
    get diagnostics v_n = row_count;
    v_apagados := v_apagados || jsonb_build_object('limites_uso', v_n);
  else
    v_aguardam := v_aguardam || 'limites_uso'::text;
  end if;

  if prazo_aprovado('historico') then
    delete from historico
     where acao like 'acesso.%'
       and ocorrido_em < app_now() - make_interval(months => configuracao_int('prazo_acessos_meses'));
    get diagnostics v_n = row_count;
    v_apagados := v_apagados || jsonb_build_object('historico', v_n);
  else
    v_aguardam := v_aguardam || 'historico'::text;
  end if;

  perform set_config('t3jus.aplicando_prazos', 'off', true);

  -- Regra 3: tabelas com dado pessoal cujo prazo a rotina ainda não sabe aplicar.
  select coalesce(array_agg(tabela order by tabela), '{}') into v_sem
    from inventario_dados
   where dado_pessoal and tabela not in ('sessoes_escritorio', 'limites_uso');

  v_resultado := jsonb_build_object(
    'apagados', v_apagados,
    'aguardando_aprovacao', to_jsonb(v_aguardam),
    'sem_gatilho', to_jsonb(v_sem));
  perform registrar_historico('dados.prazos_aplicados', 'inventario', null, v_resultado);
  return v_resultado;
end $$;

-- Toda noite às 3h de Brasília (6h UTC), onde o pg_cron existe (no Supabase existe; no banco
-- local de testes, não).
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('t3jus-prazos', '0 6 * * *', 'select public.aplicar_prazos()');
  end if;
end
$$;

call fechar_acesso();
