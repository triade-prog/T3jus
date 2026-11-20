-- Início do Portal por áreas (F3.26; PD-01 a PD-07, PA-01, PA-02, IN-04, IN-06).
-- Desenho aprovado em docs/design/aprovadas/portal-inicio-areas (Carol, 19/11/2026).
--
-- Nenhuma tabela nova: tudo sai das áreas já programadas. O que entra:
-- - o responsável pelo repasse (decisão 4): `levantamentos.responsavel_id`, que nasce com o
--   responsável pelo contrato do cliente no caso (ou, sem contrato, o do caso) e pode ser trocado;
-- - uma consulta por área (Contratos, Financeiro e Jurídico), para cada bloco carregar e falhar
--   sozinho, e o resumo do hero. O Comercial continua sendo `portal_inicio_contatos` (F1.14), que
--   ganha a contagem das propostas esperando resposta.
--
-- Regras comuns: "Da equipe" só para a sócia dona; "Os meus" filtra pelo responsável = pessoa da
-- sessão; no máximo 5 itens por bloco, os mais atrasados primeiro, com o total de cada grupo; "hoje"
-- é sempre hoje_brasilia().

-- ---------------------------------------------------------------------------------------
-- Responsável pelo repasse.

alter table levantamentos add column responsavel_id uuid references pessoas (id) on delete restrict;

-- O padrão: o responsável pelo contrato do cliente no caso; sem contrato, o do caso.
create function levantamento_responsavel_padrao(p_caso uuid, p_cliente uuid) returns uuid
language sql stable
set search_path = public
as $$
  select coalesce(
    (select c.responsavel_id from caso_clientes cc join contratos c on c.id = cc.contrato_id
      where cc.caso_id = p_caso and cc.cliente_id = p_cliente),
    (select responsavel_id from casos where id = p_caso))
$$;

update levantamentos l set responsavel_id = levantamento_responsavel_padrao(l.caso_id, l.cliente_id) where responsavel_id is null;
alter table levantamentos alter column responsavel_id set not null;

create function levantamento_responsavel_nasce() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.responsavel_id is null then new.responsavel_id := levantamento_responsavel_padrao(new.caso_id, new.cliente_id); end if;
  return new;
end $$;
create trigger levantamento_responsavel_nasce before insert on levantamentos
  for each row execute function levantamento_responsavel_nasce();

-- A linha do repasse passa a dizer de quem ele é.
create or replace function levantamento_linha(l levantamentos) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', l.id, 'tipo', l.tipo, 'valor', l.valor, 'entrouEm', l.entrou_em, 'criadoEm', l.criado_em, 'autor', pessoa_ref(l.autor_id),
    'responsavel', pessoa_ref(l.responsavel_id),
    'prestacaoEm', l.prestacao_em, 'prestacaoPor', case when l.prestacao_por is not null then pessoa_ref(l.prestacao_por) end,
    'caso', (select jsonb_build_object('id', c.id, 'nome', c.nome, 'parteContraria', c.parte_contraria, 'area', c.area) from casos c where c.id = l.caso_id),
    'cliente', (select jsonb_build_object('id', k.id, 'nome', k.nome, 'telefone', contato_principal(k.contatos) ->> 'telefone')
                  from clientes_escritorio k where k.id = l.cliente_id),
    'feitos', (select count(*) from destinacoes d where d.levantamento_id = l.id and (d.feito_em is not null or d.dispensado_em is not null)),
    'total', (select count(*) from destinacoes d where d.levantamento_id = l.id),
    'destinacoes', coalesce((select jsonb_agg(destinacao_linha(d) order by d.ordem) from destinacoes d where d.levantamento_id = l.id), '[]'::jsonb))
$$;

-- Trocar o responsável (decisão 4): quem tem o Financeiro, para alguém da equipe; vai ao histórico.
create function portal_financeiro_repasse_responsavel(p_pessoa uuid, p_escritorio uuid, p_levantamento uuid, p_responsavel uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare l levantamentos;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'FINANCEIRO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'financeiro.editar');
  select * into l from levantamentos where id = p_levantamento and escritorio_id = p_escritorio for update;
  if l.id is null then raise exception 'Repasse não encontrado' using errcode = 'TC404'; end if;
  if p_responsavel is null or not pessoa_do_escritorio(p_responsavel, p_escritorio) then
    perform recusar_campos('Escolha alguém da equipe', 'responsavelId');
  end if;
  if l.responsavel_id is distinct from p_responsavel then
    update levantamentos set responsavel_id = p_responsavel where id = l.id;
    perform registrar_historico('financeiro.repasse_responsavel', 'levantamentos', l.id::text,
      jsonb_build_object('de', l.responsavel_id, 'para', p_responsavel));
  end if;
  return pessoa_ref(p_responsavel);
end $$;

-- Quem sai da equipe passa os repasses para quem ficou com o trabalho dela (EX-10).
create function repasses_passar_de_quem_saiu() returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_de uuid := (new.dados ->> 'pessoa_id')::uuid;
  v_para uuid := (new.dados ->> 'passou_para')::uuid;
begin
  if v_de is null or v_para is null then return new; end if;
  update levantamentos l set responsavel_id = v_para
   where l.escritorio_id = new.escritorio_id and l.responsavel_id = v_de and levantamento_aberto(l);
  return new;
end $$;
create trigger repasses_passar_de_quem_saiu after insert on historico
  for each row when (new.acao = 'equipe.retirada') execute function repasses_passar_de_quem_saiu();

-- ---------------------------------------------------------------------------------------
-- Peças comuns aos blocos.

-- O fim da semana (domingo) de um dia.
create function fim_da_semana(p_dia date) returns date
language sql immutable
as $$ select p_dia + (7 - extract(isodow from p_dia)::integer) $$;

-- Arruma os itens de uma área em grupos (Vencidos, Para hoje, A acompanhar, Esperando alguém),
-- corta no limite (os mais atrasados primeiro) e devolve o total de cada grupo para o rodapé.
-- Cada item traz `grupo` e `em`; `ordem` desempata.
create function inicio_bloco(p_itens jsonb, p_limite integer) returns jsonb
language sql immutable
as $$
  with x as (
    select e, e ->> 'grupo' grupo,
           array_position(array['VENCIDOS', 'HOJE', 'ACOMPANHAR', 'ESPERANDO'], e ->> 'grupo') g,
           e ->> 'em' em, coalesce(e ->> 'ordem', '') ordem
      from jsonb_array_elements(coalesce(p_itens, '[]'::jsonb)) e),
  n as (select x.*, row_number() over (order by g, em, ordem) i from x)
  select jsonb_build_object(
    'total', (select count(*) from x),
    'mostrando', (select count(*) from n where i <= p_limite),
    'grupos', coalesce((
      select jsonb_agg(jsonb_build_object('chave', grupo, 'total', total, 'itens', itens) order by g)
        from (select grupo, g, count(*) total,
                     coalesce(jsonb_agg(e - 'grupo' - 'ordem' order by i) filter (where i <= p_limite), '[]'::jsonb) itens
                from n group by grupo, g) y), '[]'::jsonb))
$$;

-- O responsável de uma parcela para "Os meus": quem tem a próxima ação da cobrança; sem
-- anotação, o responsável pelo contrato.
create function parcela_responsavel(p_parcela uuid, p_contrato_resp uuid) returns uuid
language sql stable
set search_path = public
as $$
  select coalesce((select e.prox_responsavel_id from cobranca_eventos e where e.parcela_id = p_parcela order by e.ordem desc limit 1),
                  p_contrato_resp)
$$;

-- ---------------------------------------------------------------------------------------
-- Comercial: os contatos do dia (F1.14) ganham as propostas esperando resposta (PD-02).

alter function portal_inicio_contatos(uuid, uuid, text, integer) rename to inicio_contatos_f114;

create function portal_inicio_contatos(p_pessoa uuid, p_escritorio uuid, p_de text default 'MEUS', p_limite integer default 5)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r jsonb;
begin
  r := inicio_contatos_f114(p_pessoa, p_escritorio, p_de, p_limite);
  return r || jsonb_build_object(
    'propostasEsperando', (select count(*) from propostas p
                            where p.escritorio_id = p_escritorio and p.estado in ('ENVIADA', 'NEGOCIACAO')
                              and (coalesce(p_de, 'MEUS') = 'EQUIPE' or p.responsavel_id = p_pessoa)),
    -- A proposta mais antiga esperando, para o rodapé dizer de quem é.
    'propostaMaisAntiga', (select jsonb_build_object('id', p.id, 'numero', p.numero, 'cliente', k.nome, 'clienteId', k.id,
                                                     'retornoHoje', exists (select 1 from prox_contato(k.id) x where (x ->> 'em')::date = hoje_brasilia()))
                             from propostas p join clientes_escritorio k on k.id = p.cliente_id
                            where p.escritorio_id = p_escritorio and p.estado in ('ENVIADA', 'NEGOCIACAO')
                              and (coalesce(p_de, 'MEUS') = 'EQUIPE' or p.responsavel_id = p_pessoa)
                            order by p.enviada_em, p.numero limit 1));
end $$;

-- ---------------------------------------------------------------------------------------
-- Contratos: cobranças paradas sem a base do mês e contratos esperando a assinatura desta semana.

create function inicio_contratos_itens(p_pessoa uuid, p_escritorio uuid, p_de text) returns jsonb
language sql stable
set search_path = public
as $$
  with hoje as (select hoje_brasilia() d),
  bases as (
    select jsonb_build_object(
             'tipo', 'BASE', 'id', b.recebimento_id,
             'grupo', case when b.vencimento < h.d then 'VENCIDOS' when b.vencimento = h.d then 'HOJE' else 'ACOMPANHAR' end,
             'em', b.vencimento, 'ordem', k.nome, 'pedirEm', b.pedir_em,
             'contrato', jsonb_build_object('id', c.id, 'numero', c.numero), 'cliente', jsonb_build_object('id', k.id, 'nome', k.nome),
             'percentual', (hc.params ->> 'percentual')::numeric, 'sobre', hc.params ->> 'sobre',
             'responsavel', pessoa_ref(c.responsavel_id)) j
      from contrato_bases_pendentes(p_escritorio) b cross join hoje h
      join contratos c on c.id = b.contrato_id join clientes_escritorio k on k.id = c.cliente_id
      join honorario_condicoes hc on hc.dono_tipo = 'CONTRATO' and hc.dono_id = c.id and hc.tipo = 'RECORRENTE'
     where p_de = 'EQUIPE' or c.responsavel_id = p_pessoa),
  assinaturas as (
    select distinct on (c.id) jsonb_build_object(
             'tipo', 'ASSINATURA', 'id', c.id, 'grupo', case when (m.inicio at time zone 'America/Sao_Paulo')::date = h.d then 'HOJE' else 'ACOMPANHAR' end,
             'em', (m.inicio at time zone 'America/Sao_Paulo')::date, 'ordem', k.nome,
             'contrato', jsonb_build_object('id', c.id, 'numero', c.numero), 'cliente', jsonb_build_object('id', k.id, 'nome', k.nome),
             'compromisso', jsonb_build_object('id', m.id, 'inicio', m.inicio, 'responsavel', pessoa_ref(m.responsavel_id)),
             'responsavel', pessoa_ref(c.responsavel_id)) j
      from contratos c cross join hoje h
      join clientes_escritorio k on k.id = c.cliente_id
      join compromissos m on m.escritorio_id = c.escritorio_id and m.cliente_id = c.cliente_id and m.tipo = 'ASSINATURA' and m.estado = 'MARCADO'
                         and (m.inicio at time zone 'America/Sao_Paulo')::date between h.d and fim_da_semana(h.d)
     where c.escritorio_id = p_escritorio and c.estado = 'ELABORACAO'
       and (p_de = 'EQUIPE' or c.responsavel_id = p_pessoa)
     order by c.id, m.inicio)
  select coalesce(jsonb_agg(j), '[]'::jsonb) from (select j from bases union all select j from assinaturas) t
$$;

create function portal_inicio_contratos(p_pessoa uuid, p_escritorio uuid, p_de text default 'MEUS') returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_de text := coalesce(p_de, 'MEUS');
  v_itens jsonb;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'CONTRATOS');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'contratos.ver');
  if v_de not in ('MEUS', 'EQUIPE') then perform recusar_campos('Escolha os seus ou os da equipe', 'de'); end if;
  if v_de = 'EQUIPE' then perform so_socio_dono(p_pessoa, p_escritorio); end if;
  v_itens := inicio_contratos_itens(p_pessoa, p_escritorio, v_de);
  return inicio_bloco(v_itens, 5) || jsonb_build_object(
    'de', v_de,
    'pedem', (select count(*) from jsonb_array_elements(v_itens) e where e ->> 'grupo' in ('VENCIDOS', 'HOJE')),
    'paradas', (select count(*) from jsonb_array_elements(v_itens) e where e ->> 'tipo' = 'BASE'),
    'assinaturas', (select count(*) from jsonb_array_elements(v_itens) e where e ->> 'tipo' = 'ASSINATURA'),
    -- Condições que esperam uma etapa do caso para virar cobrança (rodapé; nenhuma pede ação hoje).
    'esperandoEtapa', (select count(*) from honorario_condicoes hc join contratos c on c.id = hc.dono_id and hc.dono_tipo = 'CONTRATO'
                        where c.escritorio_id = p_escritorio and c.estado in ('ATIVO', 'ELABORACAO')
                          and (v_de = 'EQUIPE' or c.responsavel_id = p_pessoa)
                          and (hc.tipo in ('EXITO', 'SUCUMBENCIA', 'ATO') or (hc.tipo = 'RECORRENTE' and coalesce(hc.params ->> 'etapa', '') <> ''))),
    'proximo', (select jsonb_build_object('em', r.vencimento, 'cliente', k.nome, 'descricao', r.descricao)
                  from recebimentos_previstos r join contratos c on c.id = r.contrato_id and c.estado = 'ATIVO'
                  join clientes_escritorio k on k.id = c.cliente_id
                 where r.escritorio_id = p_escritorio and r.tipo = 'RECORRENTE' and r.valor is null and r.cancelado_em is null
                   and r.vencimento > hoje_brasilia() and (v_de = 'EQUIPE' or c.responsavel_id = p_pessoa)
                 order by r.vencimento, k.nome limit 1));
end $$;

-- ---------------------------------------------------------------------------------------
-- Financeiro: duas listas separadas, sem total comum (FI-06). Do escritório, as parcelas
-- vencidas e as que entram nos próximos 2 dias úteis; de terceiros, os repasses pendentes.

create function inicio_financeiro_escritorio(p_pessoa uuid, p_escritorio uuid, p_de text) returns jsonb
language sql stable
set search_path = public
as $$
  with hoje as (select hoje_brasilia() d),
  ps as (
    select r.*, parcela_recebido(r.id) rec, c.id cid, c.numero, k.id kid, k.nome cliente,
           parcela_responsavel(r.id, c.responsavel_id) resp
      from recebimentos_previstos r
      join contratos c on c.id = r.contrato_id and c.estado in ('ATIVO', 'ENCERRADO')
      join clientes_escritorio k on k.id = c.cliente_id
     where r.escritorio_id = p_escritorio and r.cancelado_em is null and r.valor is not null)
  select coalesce(jsonb_agg(jsonb_build_object(
           'tipo', 'PARCELA', 'id', p.id,
           'grupo', case when p.vencimento < h.d then 'VENCIDOS' when p.vencimento = h.d then 'HOJE' else 'ACOMPANHAR' end,
           'em', p.vencimento, 'ordem', p.cliente, 'descricao', p.descricao, 'valor', p.valor - p.rec, 'forma', p.forma,
           'contrato', jsonb_build_object('id', p.cid, 'numero', p.numero), 'cliente', jsonb_build_object('id', p.kid, 'nome', p.cliente),
           'cobranca', parcela_cobranca(p.id),
           'responsavel', pessoa_ref(p.resp))), '[]'::jsonb)
    from ps p cross join hoje h
   where p.rec < p.valor
     and p.vencimento <= somar_dias_uteis(h.d, 2)
     and (p_de = 'EQUIPE' or p.resp = p_pessoa)
$$;

create function inicio_financeiro_terceiros(p_pessoa uuid, p_escritorio uuid, p_de text) returns jsonb
language sql stable
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'tipo', 'REPASSE', 'id', d.id,
           'grupo', case when d.prazo < hoje_brasilia() then 'VENCIDOS' when d.prazo = hoje_brasilia() then 'HOJE' else 'ACOMPANHAR' end,
           'em', d.prazo, 'ordem', d.nome, 'para', d.para, 'nome', d.nome, 'valor', d.valor,
           'levantamento', jsonb_build_object('id', l.id, 'tipo', l.tipo, 'entrouEm', l.entrou_em),
           'caso', (select jsonb_build_object('id', c.id, 'nome', c.nome) from casos c where c.id = l.caso_id),
           'cliente', (select jsonb_build_object('id', k.id, 'nome', k.nome) from clientes_escritorio k where k.id = l.cliente_id),
           'responsavel', pessoa_ref(l.responsavel_id))), '[]'::jsonb)
    from destinacoes d join levantamentos l on l.id = d.levantamento_id
   where d.escritorio_id = p_escritorio and d.feito_em is null and d.dispensado_em is null
     and not destinacao_do_escritorio(d.para)
     and (p_de = 'EQUIPE' or l.responsavel_id = p_pessoa)
$$;

create function portal_inicio_financeiro(p_pessoa uuid, p_escritorio uuid, p_de text default 'MEUS') returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_de text := coalesce(p_de, 'MEUS');
  v_esc jsonb;
  v_ter jsonb;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'FINANCEIRO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'financeiro.ver');
  if v_de not in ('MEUS', 'EQUIPE') then perform recusar_campos('Escolha os seus ou os da equipe', 'de'); end if;
  if v_de = 'EQUIPE' then perform so_socio_dono(p_pessoa, p_escritorio); end if;
  v_esc := inicio_financeiro_escritorio(p_pessoa, p_escritorio, v_de);
  v_ter := inicio_financeiro_terceiros(p_pessoa, p_escritorio, v_de);
  return jsonb_build_object(
    'de', v_de,
    'pedem', (select count(*) from jsonb_array_elements(v_esc || v_ter) e where e ->> 'grupo' in ('VENCIDOS', 'HOJE')),
    'escritorio', inicio_bloco(v_esc, 5) || jsonb_build_object(
      'vencidas', (select count(*) from jsonb_array_elements(v_esc) e where e ->> 'grupo' = 'VENCIDOS'),
      'valorVencido', (select coalesce(sum((e ->> 'valor')::bigint), 0) from jsonb_array_elements(v_esc) e where e ->> 'grupo' = 'VENCIDOS'),
      -- Para a dona, nos dela: quantas parcelas estão vencidas no escritório todo.
      'escritorioVencidas', case when v_de = 'MEUS' and e_socio_dono(p_pessoa, p_escritorio) then (
        select count(*) from recebimentos_previstos r join contratos c on c.id = r.contrato_id and c.estado in ('ATIVO', 'ENCERRADO')
         where r.escritorio_id = p_escritorio and r.cancelado_em is null and r.valor is not null
           and r.vencimento < hoje_brasilia() and parcela_recebido(r.id) < r.valor) end,
      'proximo', (select jsonb_build_object('em', r.vencimento, 'cliente', k.nome, 'valor', r.valor)
                    from recebimentos_previstos r join contratos c on c.id = r.contrato_id and c.estado = 'ATIVO'
                    join clientes_escritorio k on k.id = c.cliente_id
                   where r.escritorio_id = p_escritorio and r.cancelado_em is null and r.valor is not null
                     and r.vencimento > somar_dias_uteis(hoje_brasilia(), 2) and parcela_recebido(r.id) < r.valor
                     and (v_de = 'EQUIPE' or parcela_responsavel(r.id, c.responsavel_id) = p_pessoa)
                   order by r.vencimento, k.nome limit 1)),
    'terceiros', inicio_bloco(v_ter, 5) || jsonb_build_object(
      'atrasados', (select count(*) from jsonb_array_elements(v_ter) e where e ->> 'grupo' = 'VENCIDOS'),
      'prazoMaisLonge', (select max((e ->> 'em')::date) from jsonb_array_elements(v_ter) e)));
end $$;

-- ---------------------------------------------------------------------------------------
-- Jurídico: prazos com "fazer até" ou prazo final hoje (ou já passados), tarefas atrasadas e de
-- hoje e tarefas esperando alguém (PD-04, PD-05).

create function inicio_juridico_itens(p_pessoa uuid, p_escritorio uuid, p_de text) returns jsonb
language sql stable
set search_path = public
as $$
  with hoje as (select hoje_brasilia() d),
  pz as (
    select jsonb_build_object(
             'tipo', 'PRAZO', 'id', p.id,
             'grupo', case when coalesce(p.fazer_ate, p.data_final) < h.d then 'VENCIDOS' else 'HOJE' end,
             'em', coalesce(p.fazer_ate, p.data_final), 'ordem', p.descricao,
             'descricao', p.descricao, 'fazerAte', p.fazer_ate, 'dataFinal', p.data_final,
             'caso', (select jsonb_build_object('id', c.id, 'nome', c.nome, 'numero', c.numero_cnj, 'tribunal', c.tribunal) from casos c where c.id = p.caso_id),
             'responsavel', pessoa_ref(p.responsavel_id)) j
      from prazos p cross join hoje h
     where p.escritorio_id = p_escritorio and p.cumprido_em is null
       and coalesce(p.fazer_ate, p.data_final) <= h.d
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
       and (p_de = 'EQUIPE' or t.responsavel_id = p_pessoa))
  select coalesce(jsonb_agg(j), '[]'::jsonb) from (select j from pz union all select j from tf) x
$$;

create function portal_inicio_juridico(p_pessoa uuid, p_escritorio uuid, p_de text default 'MEUS') returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_de text := coalesce(p_de, 'MEUS');
  v_itens jsonb;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'JURIDICO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'juridico.ver');
  if v_de not in ('MEUS', 'EQUIPE') then perform recusar_campos('Escolha os seus ou os da equipe', 'de'); end if;
  if v_de = 'EQUIPE' then perform so_socio_dono(p_pessoa, p_escritorio); end if;
  v_itens := inicio_juridico_itens(p_pessoa, p_escritorio, v_de);
  return inicio_bloco(v_itens, 5) || jsonb_build_object(
    'de', v_de,
    'pedem', (select count(*) from jsonb_array_elements(v_itens) e where e ->> 'grupo' in ('VENCIDOS', 'HOJE')),
    'atrasadas', (select count(*) from jsonb_array_elements(v_itens) e where e ->> 'grupo' = 'VENCIDOS'),
    'prazosHoje', (select count(*) from jsonb_array_elements(v_itens) e where e ->> 'tipo' = 'PRAZO' and e ->> 'grupo' = 'HOJE'),
    -- Para a dona, nos dela: quantos prazos vencem hoje no escritório e com quem.
    'escritorioPrazosHoje', case when v_de = 'MEUS' and e_socio_dono(p_pessoa, p_escritorio) then (
      select jsonb_build_object('n', count(*), 'com', coalesce(jsonb_agg(distinct pe.nome), '[]'::jsonb))
        from prazos p join pessoas pe on pe.id = p.responsavel_id
       where p.escritorio_id = p_escritorio and p.cumprido_em is null and p.data_final = hoje_brasilia()
         and p.responsavel_id <> p_pessoa) end,
    'proximo', (select jsonb_build_object('em', x.em, 'texto', x.texto) from (
                  select coalesce(p.fazer_ate, p.data_final) em, p.descricao texto from prazos p
                   where p.escritorio_id = p_escritorio and p.cumprido_em is null and coalesce(p.fazer_ate, p.data_final) > hoje_brasilia()
                     and (v_de = 'EQUIPE' or p.responsavel_id = p_pessoa)
                  union all
                  select t.vence_em, t.titulo from tarefas t
                   where t.escritorio_id = p_escritorio and t.concluida_em is null and t.esperando is null and t.vence_em > hoje_brasilia()
                     and (v_de = 'EQUIPE' or t.responsavel_id = p_pessoa)) x
                 order by x.em, x.texto limit 1));
end $$;

-- ---------------------------------------------------------------------------------------
-- O hero: quantos itens pedem a pessoa hoje, somando as áreas dela (contagem, nunca dinheiro),
-- e os compromissos de hoje da equipe. As áreas que a pessoa não tem nem são calculadas.

create function portal_inicio_resumo(p_pessoa uuid, p_escritorio uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_areas text[];
  v_pedem jsonb := '{}'::jsonb;
  v_hoje date := hoje_brasilia();
  r jsonb;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'escritorio.ver');
  v_areas := areas_da_pessoa(p_pessoa, p_escritorio);
  if 'COMERCIAL' = any (v_areas) then
    r := inicio_contatos_f114(p_pessoa, p_escritorio, 'MEUS', 1);
    v_pedem := v_pedem || jsonb_build_object('COMERCIAL', (r ->> 'totalVencidos')::integer + (r ->> 'totalHoje')::integer);
  end if;
  if 'CONTRATOS' = any (v_areas) then
    v_pedem := v_pedem || jsonb_build_object('CONTRATOS', (select count(*) from jsonb_array_elements(inicio_contratos_itens(p_pessoa, p_escritorio, 'MEUS')) e
                                                             where e ->> 'grupo' in ('VENCIDOS', 'HOJE')));
  end if;
  if 'FINANCEIRO' = any (v_areas) then
    v_pedem := v_pedem || jsonb_build_object('FINANCEIRO', (select count(*) from jsonb_array_elements(
                                                                inicio_financeiro_escritorio(p_pessoa, p_escritorio, 'MEUS') || inicio_financeiro_terceiros(p_pessoa, p_escritorio, 'MEUS')) e
                                                              where e ->> 'grupo' in ('VENCIDOS', 'HOJE')));
  end if;
  if 'JURIDICO' = any (v_areas) then
    v_pedem := v_pedem || jsonb_build_object('JURIDICO', (select count(*) from jsonb_array_elements(inicio_juridico_itens(p_pessoa, p_escritorio, 'MEUS')) e
                                                            where e ->> 'grupo' in ('VENCIDOS', 'HOJE')));
  end if;
  return jsonb_build_object(
    'areas', to_jsonb(v_areas),
    'dono', e_socio_dono(p_pessoa, p_escritorio),
    'pedem', v_pedem,
    'total', (select coalesce(sum(value::integer), 0) from jsonb_each_text(v_pedem)),
    'compromissos', (select count(*) from compromissos m
                      where m.escritorio_id = p_escritorio and m.estado = 'MARCADO'
                        and (m.inicio at time zone 'America/Sao_Paulo')::date = v_hoje),
    'proximoCompromisso', (select jsonb_build_object('tipo', m.tipo, 'tipoEscrito', m.tipo_escrito, 'inicio', m.inicio)
                             from compromissos m
                            where m.escritorio_id = p_escritorio and m.estado = 'MARCADO'
                              and (m.inicio at time zone 'America/Sao_Paulo')::date = v_hoje and m.inicio >= app_now()
                            order by m.inicio limit 1));
end $$;

call fechar_acesso();
