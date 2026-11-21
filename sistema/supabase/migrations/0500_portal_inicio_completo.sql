-- Completa o Início do Portal por áreas (F3.26) com o que ficou pendente:
-- - F3.21 (PD-07): a cobrança com a próxima ação para hoje (ou já passada) aparece no Início de
--   quem tem a próxima ação, mesmo quando a parcela ainda não está perto de vencer;
-- - F3.38 (EX-04, EX-02): o prazo com "lembrar" marcado aparece 2 dias antes no bloco Jurídico
--   ("A acompanhar"), e a rotina diária grava o aviso PRAZO_2_DIAS no sino do responsável;
-- - F3.76 (EX-09): a petição esperando a revisão aparece em "Para hoje" no Jurídico de quem
--   revisa, com o prazo do caso quando houver; sai quando o revisor decide.
-- Desenho aprovado em docs/design/aprovadas/portal-inicio-areas (os itens seguem o padrão de
-- item aprovado) e docs/design/aprovadas/portal-peticoes (decisão 20).
-- Nenhuma tabela nova.

-- ---------------------------------------------------------------------------------------
-- F3.21: a cobrança do dia de cada pessoa.
--
-- Do escritório entram as parcelas vencidas, as que entram nos próximos 2 dias úteis e, agora,
-- as que têm a próxima ação de cobrança para hoje ou já passada, sempre de quem tem a próxima
-- ação (sem anotação, o responsável pelo contrato). A data do disco continua sendo o vencimento;
-- a parcela ainda no prazo com a ação de hoje vai para "Para hoje".

create or replace function inicio_financeiro_escritorio(p_pessoa uuid, p_escritorio uuid, p_de text) returns jsonb
language sql stable
set search_path = public
as $$
  with hoje as (select hoje_brasilia() d),
  ps as (
    select r.*, parcela_recebido(r.id) rec, c.id cid, c.numero, k.id kid, k.nome cliente,
           parcela_responsavel(r.id, c.responsavel_id) resp,
           (select e.prox_data from cobranca_eventos e where e.parcela_id = r.id order by e.ordem desc limit 1) prox
      from recebimentos_previstos r
      join contratos c on c.id = r.contrato_id and c.estado in ('ATIVO', 'ENCERRADO')
      join clientes_escritorio k on k.id = c.cliente_id
     where r.escritorio_id = p_escritorio and r.cancelado_em is null and r.valor is not null)
  select coalesce(jsonb_agg(jsonb_build_object(
           'tipo', 'PARCELA', 'id', p.id,
           'grupo', case when p.vencimento < h.d then 'VENCIDOS'
                         when p.vencimento = h.d or p.prox <= h.d then 'HOJE'
                         else 'ACOMPANHAR' end,
           'em', p.vencimento, 'ordem', p.cliente, 'descricao', p.descricao, 'valor', p.valor - p.rec, 'forma', p.forma,
           'contrato', jsonb_build_object('id', p.cid, 'numero', p.numero), 'cliente', jsonb_build_object('id', p.kid, 'nome', p.cliente),
           'cobranca', parcela_cobranca(p.id),
           'responsavel', pessoa_ref(p.resp))), '[]'::jsonb)
    from ps p cross join hoje h
   where p.rec < p.valor
     and (p.vencimento <= somar_dias_uteis(h.d, 2) or p.prox <= h.d)
     and (p_de = 'EQUIPE' or p.resp = p_pessoa)
$$;

-- ---------------------------------------------------------------------------------------
-- F3.38 e F3.76: o Jurídico ganha o prazo em 2 dias e a petição para revisar.

-- O prazo aberto mais próximo de um caso (para o item da petição).
create function caso_prazo_mais_proximo(p_caso uuid) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object('id', p.id, 'descricao', p.descricao, 'em', coalesce(p.fazer_ate, p.data_final), 'dataFinal', p.data_final)
    from prazos p where p.caso_id = p_caso and p.cumprido_em is null
   order by coalesce(p.fazer_ate, p.data_final), p.descricao limit 1
$$;

create or replace function inicio_juridico_itens(p_pessoa uuid, p_escritorio uuid, p_de text) returns jsonb
language sql stable
set search_path = public
as $$
  with hoje as (select hoje_brasilia() d),
  pz as (
    -- Até hoje, sempre; amanhã e depois de amanhã, só com o lembrete marcado (F3.38).
    select jsonb_build_object(
             'tipo', 'PRAZO', 'id', p.id,
             'grupo', case when coalesce(p.fazer_ate, p.data_final) < h.d then 'VENCIDOS'
                           when coalesce(p.fazer_ate, p.data_final) = h.d then 'HOJE' else 'ACOMPANHAR' end,
             'em', coalesce(p.fazer_ate, p.data_final), 'ordem', p.descricao,
             'descricao', p.descricao, 'fazerAte', p.fazer_ate, 'dataFinal', p.data_final,
             'lembrete', coalesce(p.fazer_ate, p.data_final) > h.d,
             'caso', (select jsonb_build_object('id', c.id, 'nome', c.nome, 'numero', c.numero_cnj, 'tribunal', c.tribunal) from casos c where c.id = p.caso_id),
             'responsavel', pessoa_ref(p.responsavel_id)) j
      from prazos p cross join hoje h
     where p.escritorio_id = p_escritorio and p.cumprido_em is null
       and (coalesce(p.fazer_ate, p.data_final) <= h.d
            or (p.lembrar and coalesce(p.fazer_ate, p.data_final) <= h.d + 2))
       and (p_de = 'EQUIPE' or p.responsavel_id = p_pessoa)),
  tf as (
    select jsonb_build_object(
             'tipo', 'TAREFA', 'id', t.id,
             'grupo', case when t.esperando is not null then 'ESPERANDO' when t.vence_em < h.d then 'VENCIDOS' else 'HOJE' end,
             'em', t.vence_em, 'ordem', t.titulo, 'titulo', t.titulo,
             'esperando', t.esperando, 'esperandoDesde', t.esperando_desde,
             'caso', (select jsonb_build_object('id', c.id, 'nome', c.nome) from casos c where c.id = t.caso_id),
             'responsavel', pessoa_ref(t.responsavel_id)) j
      from tarefas t cross join hoje h
     where t.escritorio_id = p_escritorio and t.concluida_em is null
       and (t.esperando is not null or t.vence_em <= h.d)
       and (p_de = 'EQUIPE' or t.responsavel_id = p_pessoa)),
  pt as (
    -- A petição esperando a revisão (F3.76): é de quem revisa e pede a pessoa hoje.
    select jsonb_build_object(
             'tipo', 'PETICAO', 'id', x.id, 'grupo', 'HOJE', 'em', h.d, 'ordem', x.modelo_nome,
             'modelo', x.modelo_nome, 'versao', x.versao_atual,
             'enviadaEm', (coalesce((select max(e.em) from peticao_eventos e where e.peticao_id = x.id and e.tipo in ('ENVIADA', 'VERSAO', 'PASSADA')),
                                    x.gerado_em) at time zone 'America/Sao_Paulo')::date,
             'por', pessoa_ref(x.gerado_por),
             'caso', (select jsonb_build_object('id', c.id, 'nome', c.nome) from casos c where c.id = x.caso_id),
             'prazo', caso_prazo_mais_proximo(x.caso_id),
             'responsavel', pessoa_ref(x.revisor_id)) j
      from peticoes x cross join hoje h
     where x.escritorio_id = p_escritorio and x.situacao = 'REVISAO' and x.revisor_id is not null
       and (p_de = 'EQUIPE' or x.revisor_id = p_pessoa))
  select coalesce(jsonb_agg(j), '[]'::jsonb) from (select j from pz union all select j from tf union all select j from pt) x
$$;

-- ---------------------------------------------------------------------------------------
-- F3.38: a rotina diária do lembrete. Para cada prazo aberto com "lembrar" marcado cujo "fazer
-- até" (ou, sem ele, o prazo final) é daqui a 2 dias, grava o aviso no sino do responsável.
-- Um aviso por prazo e por data: rodar de novo no mesmo dia não repete; se a data mudar, o novo
-- dia ganha o seu aviso.

-- "sexta, 20/11".
create function dia_da_semana_curto(p_dia date) returns text
language sql immutable
as $$
  select (array['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'])[extract(isodow from p_dia)::integer]
         || ', ' || to_char(p_dia, 'DD/MM')
$$;

create function avisar_prazos_em_2_dias() returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lista uuid[];
  v_esc uuid;
  v_alvo date := hoje_brasilia() + 2;
  v_n integer := 0;
  p record;
begin
  perform limpar_contexto();
  perform set_config('t3jus.lendo_acesso', 'on', true);
  select coalesce(array_agg(id order by id), '{}') into v_lista from escritorios;
  perform set_config('t3jus.lendo_acesso', 'off', true);
  foreach v_esc in array v_lista loop
    perform entrar_escritorio_servico(v_esc);
    for p in
      select z.*, coalesce(z.fazer_ate, z.data_final) alvo, c.numero_cnj,
             (select k.nome from caso_clientes cc join clientes_escritorio k on k.id = cc.cliente_id
               where cc.caso_id = z.caso_id order by cc.ordem limit 1) cliente
        from prazos z join casos c on c.id = z.caso_id
       where z.escritorio_id = v_esc and z.cumprido_em is null and z.lembrar
         and coalesce(z.fazer_ate, z.data_final) = v_alvo
         and not exists (select 1 from avisos_sino a
                          where a.escritorio_id = v_esc and a.tipo = 'PRAZO_2_DIAS' and a.origem_id = z.id
                            and a.dados ->> 'em' = v_alvo::text)
    loop
      perform aviso_sino(v_esc, p.responsavel_id, null, 'PRAZO_2_DIAS', 'prazos', p.id, jsonb_build_object(
        'prazo', p.descricao, 'cliente', p.cliente, 'processo', p.numero_cnj, 'em', p.alvo,
        'vence', case when p.fazer_ate is not null and p.fazer_ate <> p.data_final
                      then dia_da_semana_curto(p.data_final) || ' (fazer até ' || dia_da_semana_curto(p.fazer_ate) || ')'
                      else dia_da_semana_curto(p.data_final) end));
      v_n := v_n + 1;
    end loop;
  end loop;
  perform limpar_contexto();
  return jsonb_build_object('avisos', v_n, 'para', v_alvo);
end $$;

-- Todo dia às 6h de Brasília (9h UTC), onde o pg_cron existe (no Supabase existe; no banco de
-- teste, não).
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('t3jus-prazos-2-dias', '0 9 * * *', 'select public.avisar_prazos_em_2_dias()');
  end if;
end $$;

call fechar_acesso();
