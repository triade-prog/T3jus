-- 0600 · "Não foi paga" na folha "Pago antes do T3jus" (F3.84, VA-05).
-- Desenho aprovado pela Carol em 21/11/2026: docs/design/aprovadas/portal-nao-paga-logo (parte A,
-- decisões 1 a 12 e perguntas 1 a 4).
-- - A parcela paga antes nasce cancelada, com pago_antes (0420), e essa linha não muda. "Não foi
--   paga" cria uma linha nova em recebimentos_previstos, com o mesmo contrato, tipo, descrição e
--   valor, e o vencimento escolhido: o da planilha (já vencida) ou outra data combinada.
-- - Só quem tem a área Financeiro e financeiro.editar; motivo obrigatório; tudo no histórico.
-- - A cobrança fica com quem cuida do contrato, com a próxima ação "Falar com <cliente>" amanhã.
-- - Nenhum aviso automático sai por passo de antes de a parcela voltar (avisos_desde, pergunta 3).
-- - "Foi paga, sim" desfaz o engano enquanto nada foi feito na parcela (pergunta 2).
-- - Desfazer a importação conta o contrato com parcela corrigida como mexido (decisão 12).

alter table recebimentos_previstos add column corrige_pago_antes_id uuid references recebimentos_previstos (id) on delete restrict;
alter table recebimentos_previstos add column avisos_desde timestamptz;
-- Uma correção que vale por parcela paga antes.
create unique index recebimentos_previstos_correcao on recebimentos_previstos (corrige_pago_antes_id)
  where corrige_pago_antes_id is not null and cancelado_em is null;

-- O que se fez em cada parcela paga antes. Só inserção.
create table pago_antes_mudancas (
  id                        uuid primary key default gen_random_uuid(),
  escritorio_id             uuid not null references escritorios (id) on delete restrict,
  recebimento_pago_antes_id uuid not null references recebimentos_previstos (id) on delete restrict,
  recebimento_novo_id       uuid not null references recebimentos_previstos (id) on delete restrict,
  tipo                      text not null check (tipo in ('NAO_PAGA', 'FOI_PAGA')),
  vencimento_planilha       date not null,
  vencimento_escolhido      date,
  motivo                    text not null check (length(btrim(motivo)) between 3 and 500),
  feito_por                 uuid not null references pessoas (id) on delete restrict,
  feito_em                  timestamptz not null default app_now(),
  check ((tipo = 'NAO_PAGA') = (vencimento_escolhido is not null))
);
create index pago_antes_mudancas_parcela on pago_antes_mudancas (escritorio_id, recebimento_pago_antes_id, feito_em);
call proteger_tabela_escritorio('pago_antes_mudancas');
create trigger pago_antes_mudancas_so_acrescenta before update or delete on pago_antes_mudancas
  for each row execute function financeiro_so_acrescenta();

insert into inventario_dados (tabela, dado_pessoal, o_que, para_que, base_legal, controlador, prazo, no_fim, situacao, exportar) values
 ('pago_antes_mudancas', false,
  'Parcelas que a planilha trouxe como pagas e que voltaram para A receber (ou de volta), com o vencimento, o motivo, quem e quando',
  null, null, null, null, null, null, true);

-- Dá para voltar atrás ("Foi paga, sim") enquanto nada foi feito na parcela em A receber:
-- nenhum recebimento, carnê, cobrança feita por alguém ou aviso automático.
create function pago_antes_pode_voltar(r recebimentos_previstos) returns boolean
language sql stable
set search_path = public
as $$
  select r.corrige_pago_antes_id is not null and r.cancelado_em is null
     and not exists (select 1 from pagamentos_recebidos p where p.parcela_id = r.id)
     and not exists (select 1 from carne_parcelas cp where cp.recebimento_id = r.id)
     and not exists (select 1 from automacao_execucoes x where x.origem_id = r.id)
     and (select count(*) from cobranca_eventos e where e.parcela_id = r.id) <= 1
     and not exists (select 1 from cobranca_eventos e where e.parcela_id = r.id and e.tipo in ('LIGACAO', 'MENSAGEM'))
$$;

-- O que impede voltar, para a mensagem: RECEBIMENTO, CARNE, AVISO ou COBRANCA.
create function pago_antes_movimento(r recebimentos_previstos) returns text
language sql stable
set search_path = public
as $$
  select case
    when exists (select 1 from pagamentos_recebidos p where p.parcela_id = r.id) then 'RECEBIMENTO'
    when exists (select 1 from carne_parcelas cp where cp.recebimento_id = r.id) then 'CARNE'
    when exists (select 1 from automacao_execucoes x where x.origem_id = r.id) then 'AVISO'
    when (select count(*) from cobranca_eventos e where e.parcela_id = r.id) > 1
         or exists (select 1 from cobranca_eventos e where e.parcela_id = r.id and e.tipo in ('LIGACAO', 'MENSAGEM')) then 'COBRANCA'
  end
$$;

-- Entrar para mudar uma parcela paga antes: área Financeiro e financeiro.editar.
create function pago_antes_entrar(p_pessoa uuid, p_escritorio uuid) returns void
language plpgsql
set search_path = public
as $$
begin
  perform entrar_area(p_pessoa, p_escritorio, 'FINANCEIRO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'financeiro.editar');
  perform portal_exigir_escrita(p_pessoa, p_escritorio);
end $$;

-- "Não foi paga" (POST /v1/escritorio/contratos/:id/pago-antes/:recebimentoId/nao-paga).
-- p_dados: { vencimento: "ORIGINAL" | "aaaa-mm-dd", motivo }.
create function portal_pago_antes_nao_paga(p_pessoa uuid, p_escritorio uuid, p_contrato uuid, p_recebimento uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c contratos;
  r recebimentos_previstos;
  n recebimentos_previstos;
  i importacoes;
  m pago_antes_mudancas;
  k clientes_escritorio;
  v_motivo text := btrim(coalesce(p_dados ->> 'motivo', ''));
  v_venc_txt text := btrim(coalesce(p_dados ->> 'vencimento', 'ORIGINAL'));
  v_venc date;
  v_hoje date := hoje_brasilia();
begin
  perform pago_antes_entrar(p_pessoa, p_escritorio);
  select * into c from contratos where id = p_contrato and escritorio_id = p_escritorio;
  if c.id is null then raise exception 'Contrato não encontrado' using errcode = 'TC404'; end if;
  select * into r from recebimentos_previstos where id = p_recebimento and contrato_id = c.id and escritorio_id = p_escritorio for update;
  if r.id is null then raise exception 'Parcela não encontrada' using errcode = 'TC404'; end if;
  if not r.pago_antes then perform recusar_motivo('Esta parcela não veio como paga antes do T3jus', 'NAO_E_PAGO_ANTES'); end if;
  -- Outra pessoa já passou esta parcela para A receber enquanto a janela estava aberta.
  select * into n from recebimentos_previstos where corrige_pago_antes_id = r.id and cancelado_em is null;
  if n.id is not null then
    select * into m from pago_antes_mudancas where recebimento_novo_id = n.id and tipo = 'NAO_PAGA' order by feito_em desc limit 1;
    raise exception 'Outra pessoa mudou esta parcela' using errcode = 'TC409',
      detail = jsonb_build_object('motivo', 'JA_MUDADA', 'por', pessoa_ref(m.feito_por), 'em', m.feito_em,
                                  'como', jsonb_build_object('vencimento', n.vencimento, 'situacao', parcela_situacao(n, parcela_recebido(n.id))))::text;
  end if;
  select * into i from importacoes where id = c.importacao_id;
  if i.id is not null and i.estado = 'DESFEITA' then
    raise exception 'A importação foi desfeita' using errcode = 'TC409',
      detail = jsonb_build_object('motivo', 'IMPORTACAO_DESFEITA', 'por', pessoa_ref(i.desfeita_por), 'em', i.desfeita_em)::text;
  end if;
  if c.estado <> 'ATIVO' then
    raise exception 'O contrato não está vigente' using errcode = 'TC422', detail = jsonb_build_object('motivo', 'CONTRATO_NAO_VIGENTE')::text;
  end if;
  if length(v_motivo) not between 3 and 500 then perform recusar_campos('Escreva o motivo', 'motivo'); end if;
  if v_venc_txt = 'ORIGINAL' then
    v_venc := r.vencimento;
  elsif v_venc_txt ~ '^\d{4}-\d{2}-\d{2}$' then
    begin
      v_venc := v_venc_txt::date;
    exception when others then
      perform recusar_campos('Data inválida', 'vencimento');
    end;
    -- Nem antes de um ano do vencimento da planilha, nem mais de três anos à frente.
    if v_venc < r.vencimento - 365 or v_venc > v_hoje + 365 * 3 then
      raise exception 'Escolha outra data' using errcode = 'TC422', detail = jsonb_build_object('motivo', 'VENCIMENTO_INVALIDO', 'campos', jsonb_build_array('vencimento'))::text;
    end if;
  else
    perform recusar_campos('Data inválida', 'vencimento');
  end if;

  insert into recebimentos_previstos (escritorio_id, contrato_id, tipo, descricao, vencimento, valor, origem, forma, corrige_pago_antes_id, avisos_desde)
  values (p_escritorio, c.id, r.tipo, r.descricao, v_venc, r.valor, r.origem, r.forma, r.id, app_now())
  returning * into n;
  insert into pago_antes_mudancas (escritorio_id, recebimento_pago_antes_id, recebimento_novo_id, tipo, vencimento_planilha, vencimento_escolhido, motivo, feito_por)
  values (p_escritorio, r.id, n.id, 'NAO_PAGA', r.vencimento, v_venc, v_motivo, p_pessoa);
  -- A cobrança: quem cuida do contrato fala com o cliente amanhã (toda vencida tem responsável e próxima ação).
  select * into k from clientes_escritorio where id = c.cliente_id;
  insert into cobranca_eventos (escritorio_id, parcela_id, tipo, texto, prox_data, prox_oque, prox_responsavel_id, autor_id)
  values (p_escritorio, n.id, 'ANOTACAO', left('Era paga antes do T3jus. Não foi paga: ' || v_motivo, 1000),
          v_hoje + 1, left('Falar com ' || k.nome, 300), c.responsavel_id, p_pessoa);
  perform registrar_historico('contrato.parcela_nao_paga', 'contratos', c.id::text,
    jsonb_build_object('parcela', n.id, 'pagaAntes', r.id, 'descricao', r.descricao, 'valor', r.valor,
                       'vencimentoPlanilha', r.vencimento, 'vencimento', v_venc, 'motivo', v_motivo));
  return parcela_linha(n);
end $$;

-- "Foi paga, sim" (POST /v1/escritorio/recebimentos/:id/foi-paga): a parcela volta para "Pago
-- antes do T3jus", fora dos totais. Só se nada foi feito nela.
create function portal_pago_antes_foi_paga(p_pessoa uuid, p_escritorio uuid, p_recebimento uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  n recebimentos_previstos;
  r recebimentos_previstos;
  v_motivo text := btrim(coalesce(p_dados ->> 'motivo', ''));
  v_mov text;
begin
  perform pago_antes_entrar(p_pessoa, p_escritorio);
  select * into n from recebimentos_previstos where id = p_recebimento and escritorio_id = p_escritorio for update;
  if n.id is null or n.corrige_pago_antes_id is null then raise exception 'Parcela não encontrada' using errcode = 'TC404'; end if;
  if n.cancelado_em is not null then perform recusar_motivo('A parcela já voltou para "Pago antes do T3jus"', 'JA_VOLTOU'); end if;
  v_mov := pago_antes_movimento(n);
  if v_mov is not null then
    raise exception 'A parcela já tem movimento em A receber' using errcode = 'TC422',
      detail = jsonb_build_object('motivo', 'JA_TEM_MOVIMENTO', 'qual', v_mov)::text;
  end if;
  if length(v_motivo) not between 3 and 300 then perform recusar_campos('Escreva o motivo', 'motivo'); end if;
  select * into r from recebimentos_previstos where id = n.corrige_pago_antes_id;
  update recebimentos_previstos set cancelado_em = app_now(), cancelado_motivo = left('Foi paga antes do T3jus: ' || v_motivo, 500)
   where id = n.id returning * into n;
  insert into pago_antes_mudancas (escritorio_id, recebimento_pago_antes_id, recebimento_novo_id, tipo, vencimento_planilha, motivo, feito_por)
  values (p_escritorio, r.id, n.id, 'FOI_PAGA', r.vencimento, v_motivo, p_pessoa);
  perform registrar_historico('contrato.parcela_foi_paga', 'contratos', n.contrato_id::text,
    jsonb_build_object('parcela', n.id, 'pagaAntes', r.id, 'descricao', r.descricao, 'valor', r.valor, 'motivo', v_motivo));
  return jsonb_build_object('id', r.id, 'contratoId', n.contrato_id);
end $$;

-- A receber e a ficha de parcelas trazem a marca "Era paga antes do T3jus" e se há aviso automático.
create or replace function parcela_linha(r recebimentos_previstos) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', r.id, 'tipo', r.tipo, 'descricao', r.descricao, 'vencimento', r.vencimento, 'valor', r.valor,
    'recebido', x.rec, 'falta', greatest(r.valor - x.rec, 0), 'forma', r.forma,
    'situacao', parcela_situacao(r, x.rec),
    'pagaEm', (select max(p.recebido_em) from pagamentos_recebidos p where p.parcela_id = r.id),
    'contrato', jsonb_build_object('id', c.id, 'numero', c.numero, 'objeto', c.objeto),
    'cliente', jsonb_build_object('id', k.id, 'nome', k.nome),
    'responsavel', pessoa_ref(c.responsavel_id),
    'cobranca', parcela_cobranca(r.id),
    'cancelado', case when r.cancelado_em is not null then jsonb_build_object('em', r.cancelado_em, 'motivo', r.cancelado_motivo) end,
    'eraPagoAntes', r.corrige_pago_antes_id is not null,
    'semAvisoAutomatico', r.avisos_desde is not null and r.vencimento < automacao_local(r.avisos_desde)::date)
    from (select parcela_recebido(r.id) rec) x
    join contratos c on c.id = r.contrato_id
    join clientes_escritorio k on k.id = c.cliente_id
$$;

create or replace function automacao_candidatos(a automacoes) returns table (cliente_id uuid, origem text, origem_id uuid, rotulo text)
language plpgsql stable
set search_path = public
as $$
declare
  v_fluxo jsonb := automacao_fluxo_valendo(a);
  v_dias integer := coalesce((v_fluxo #>> '{passos,0,dias}')::integer, 1);
  v_hoje date := hoje_brasilia();
  v_desde timestamptz := (select max(v.ligada_em) from automacao_versoes v where v.automacao_id = a.id and v.numero = a.versao_ligada);
begin
  -- Desde quando vale: a primeira versão ligada (ligar de novo não reabre o que já passou).
  v_desde := coalesce((select min(v.ligada_em) from automacao_versoes v where v.automacao_id = a.id), v_desde);
  if a.gatilho in ('PARCELA_ATRASO', 'PARCELA_VAI_VENCER') then
    return query
      select c.cliente_id, 'PARCELA', r.id, r.descricao
        from recebimentos_previstos r join contratos c on c.id = r.contrato_id
       where r.escritorio_id = a.escritorio_id and r.cancelado_em is null and r.valor is not null
         and parcela_recebido(r.id) < r.valor
         -- F3.84: a parcela que voltou de "Não foi paga" não recebe passo de antes de voltar.
         and (r.avisos_desde is null
              or (case when a.gatilho = 'PARCELA_ATRASO' then r.vencimento + v_dias else v_hoje end) >= automacao_local(r.avisos_desde)::date)
         and case when a.gatilho = 'PARCELA_ATRASO'
                  then v_hoje - r.vencimento >= v_dias
                       and (a.entram_ja_atrasados or r.vencimento + v_dias >= automacao_local(v_desde)::date)
                  else r.vencimento = v_hoje + v_dias end
         and not exists (select 1 from automacao_execucoes x where x.automacao_id = a.id and x.origem_id = r.id);
  elsif a.gatilho = 'PAGAMENTO_RECEBIDO' then
    return query
      select c.cliente_id, 'PARCELA', p.id, r.descricao
        from pagamentos_recebidos p join recebimentos_previstos r on r.id = p.parcela_id join contratos c on c.id = r.contrato_id
       where p.escritorio_id = a.escritorio_id and p.criado_em >= v_desde
         and not exists (select 1 from automacao_execucoes x where x.automacao_id = a.id and x.origem_id = p.id);
  elsif a.gatilho = 'ETAPA_CASO' then
    -- Um aviso por mudança de etapa, para o primeiro cliente do caso.
    return query
      select (select cc.cliente_id from caso_clientes cc where cc.caso_id = m.caso_id order by cc.cliente_id limit 1), 'ETAPA', m.id,
             left(cs.nome || ' · ' || t.nome, 160)
        from caso_etapa_mudancas m join casos cs on cs.id = m.caso_id join etapas t on t.id = m.para_etapa_id
       where m.escritorio_id = a.escritorio_id and m.aviso_texto is not null and m.em >= v_desde
         and exists (select 1 from caso_clientes cc where cc.caso_id = m.caso_id)
         and not exists (select 1 from automacao_execucoes x where x.automacao_id = a.id and x.origem_id = m.id);
  elsif a.gatilho = 'LEMBRETE_AUDIENCIA' then
    -- Compromisso com o cliente e "lembrar o cliente" marcado, a menos de 1 dia.
    return query
      select c.cliente_id, 'COMPROMISSO', c.id, left(c.titulo || ' · ' || to_char(automacao_local(c.inicio), 'DD/MM HH24:MI'), 160)
        from compromissos c
       where c.escritorio_id = a.escritorio_id and c.estado = 'MARCADO' and c.cliente_id is not null and c.lembrete_cliente
         and c.tipo <> 'INTERNO' and c.inicio > app_now() and c.inicio <= app_now() + interval '1 day'
         and not exists (select 1 from automacao_execucoes x where x.automacao_id = a.id and x.origem_id = c.id);
  elsif a.gatilho = 'PRESTACAO_CONTAS' then
    return query
      select l.cliente_id, 'REPASSE', d.id, left('Repasse · ' || cs.nome, 160)
        from destinacoes d join levantamentos l on l.id = d.levantamento_id join casos cs on cs.id = l.caso_id
       where d.escritorio_id = a.escritorio_id and d.para = 'CLIENTE' and d.feito_em is not null
         and d.feito_em >= automacao_local(v_desde)::date
         and not exists (select 1 from automacao_execucoes x where x.automacao_id = a.id and x.origem_id = d.id);
  elsif a.gatilho = 'CLIENTE_NOVO' then
    -- Quem virou cliente depois de ligar e chegou aos dias do gatilho; uma vez por cliente, em
    -- todas as boas-vindas. Importados da planilha nunca entram (PA-06, decisão 1).
    return query
      select k.id, 'CLIENTE', k.id, left(k.nome, 160)
        from clientes_escritorio k
        cross join lateral (select automacao_virou_cliente(k, coalesce(v_fluxo #>> '{passos,0,conta}', 'FECHOU')) dia) q
       where k.escritorio_id = a.escritorio_id and k.estado = 'ATIVO' and k.importacao_id is null
         and q.dia is not null and q.dia >= automacao_local(v_desde)::date and q.dia + v_dias <= v_hoje
         and not exists (select 1 from automacao_execucoes x join automacoes y on y.id = x.automacao_id
                          where x.escritorio_id = a.escritorio_id and x.cliente_id = k.id and y.gatilho = 'CLIENTE_NOVO');
  elsif a.gatilho = 'DOCUMENTO_PENDENTE' then
    -- Um lembrete por cliente com tudo o que falta (decisão 3). Quem já está numa execução
    -- andando desta automação espera ela acabar.
    return query
      select k.id, 'DOCUMENTO', md5(a.id::text || k.id::text || array_to_string(dd.docs, ','))::uuid,
             left('Documentos · ' || (select string_agg(d.descricao, ', ' order by d.pedido_em, d.criado_em) from documento_pedidos d where d.id = any (dd.docs)), 160)
        from clientes_escritorio k
        cross join lateral (select automacao_docs_do_cliente(a, k.id) docs) dd
       where k.escritorio_id = a.escritorio_id and cardinality(dd.docs) > 0
         and not exists (select 1 from automacao_execucoes x where x.automacao_id = a.id and x.cliente_id = k.id and x.proximo_em is not null);
  end if;
end $$;


-- Desfazer a importação: o contrato com parcela corrigida conta como mexido (decisão 12).
create or replace function imp_desfazer_plano(i importacoes) returns jsonb
language sql stable
set search_path = public
as $$
  with ctr as (select ct.*, exists (select 1 from pagamentos_recebidos pr join recebimentos_previstos rp on rp.id = pr.parcela_id
                                     where rp.contrato_id = ct.id)
                            or exists (select 1 from bases_mensais b join recebimentos_previstos rp on rp.id = b.recebimento_id where rp.contrato_id = ct.id)
                            or exists (select 1 from caso_clientes cc where cc.contrato_id = ct.id)
                            -- F3.84 (decisão 12): parcela passada para A receber conta como mexida.
                            or exists (select 1 from recebimentos_previstos rp where rp.contrato_id = ct.id and rp.corrige_pago_antes_id is not null) mexido
                 from contratos ct where ct.escritorio_id = i.escritorio_id and ct.importacao_id = i.id and ct.estado <> 'ENCERRADO'),
  cli as (select c.*, (exists (select 1 from atendimentos a where a.cliente_id = c.id)
                       or exists (select 1 from contratos ct where ct.cliente_id = c.id and ct.importacao_id is distinct from i.id)
                       or exists (select 1 from caso_clientes cc where cc.cliente_id = c.id)
                       or exists (select 1 from ctr where ctr.cliente_id = c.id and ctr.mexido)
                       or exists (select 1 from historico h where h.escritorio_id = c.escritorio_id and h.entidade = 'cliente'
                                     and h.entidade_id = c.id::text and h.acao = 'cliente.editado')) mexido
            from clientes_escritorio c where c.escritorio_id = i.escritorio_id and c.importacao_id = i.id and c.estado = 'ATIVO'),
  jun as (select l.cliente_id, l.preenchidos from importacao_linhas l where l.importacao_id = i.id and l.preenchidos is not null)
  select jsonb_build_object(
    'clientes', (select count(*) from cli where not mexido),
    'juntados', (select count(distinct cliente_id) from jun),
    'contratos', (select count(*) from ctr where not mexido),
    'parcelas', (select count(*) from recebimentos_previstos rp join ctr on ctr.id = rp.contrato_id where not ctr.mexido and rp.cancelado_em is null),
    'mexidos', (select coalesce(jsonb_agg(x order by x ->> 'nome'), '[]'::jsonb) from (
                  select jsonb_build_object('tipo', 'CLIENTE', 'id', id, 'nome', nome) x from cli where mexido
                  union all select jsonb_build_object('tipo', 'CONTRATO', 'id', id, 'nome', numero || ' · ' || objeto) from ctr where mexido) m))
$$;

-- A ficha do contrato: a folha, quem pode e o histórico das mudanças.
create or replace function portal_contrato(p_pessoa uuid, p_escritorio uuid, p_contrato uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c contratos;
  v_fin boolean;
  v_pode boolean;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'CONTRATOS');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'contratos.ver');
  select * into c from contratos where id = p_contrato and escritorio_id = p_escritorio;
  if c.id is null then raise exception 'Contrato não encontrado' using errcode = 'TC404'; end if;
  v_fin := 'FINANCEIRO' = any (areas_da_pessoa(p_pessoa, p_escritorio));
  v_pode := v_fin and pode(p_pessoa, p_escritorio, 'financeiro.editar');
  return contrato_linha(c) || jsonb_build_object(
    'observacoes', c.observacoes, 'versao', c.versao, 'assinadoEm', c.assinado_em,
    'assinaturaPor', pessoa_ref(c.assinatura_por), 'encerradoEm', c.encerrado_em, 'motivoEncerramento', c.motivo_encerramento,
    'proposta', (select jsonb_build_object('id', p.id, 'numero', p.numero) from propostas p where p.id = c.proposta_id),
    'advogados', coalesce((select jsonb_agg(pessoa_ref(a.pessoa_id) order by pe.nome) from contrato_advogados a join pessoas pe on pe.id = a.pessoa_id
                            where a.contrato_id = c.id), '[]'::jsonb),
    'financeiro', v_fin,
    -- F3.84: quem tem Financeiro passa a parcela paga antes para A receber; os outros veem quem pode.
    'podeMarcarNaoPaga', v_pode and c.estado = 'ATIVO',
    'quemFinanceiro', (select coalesce(jsonb_agg(pessoa_ref(x.pessoa_id) order by x.nome), '[]'::jsonb)
                         from (select distinct v.pessoa_id, pe.nome from vinculos v join funcoes f on f.codigo = v.funcao join pessoas pe on pe.id = v.pessoa_id
                                where v.escritorio_id = p_escritorio and f.sistema = 'PORTAL' and v.revogado_em is null
                                  and 'FINANCEIRO' = any (areas_da_pessoa(v.pessoa_id, p_escritorio))) x),
    'mudancasPagoAntes', coalesce((
      select jsonb_agg(jsonb_build_object('id', m.id, 'tipo', m.tipo, 'parcela', rp.descricao, 'vencimentoPlanilha', m.vencimento_planilha,
                                          'vencimento', m.vencimento_escolhido, 'motivo', m.motivo, 'por', pessoa_ref(m.feito_por), 'em', m.feito_em)
                       order by m.feito_em desc, m.id)
        from pago_antes_mudancas m join recebimentos_previstos rp on rp.id = m.recebimento_pago_antes_id
       where m.escritorio_id = p_escritorio and rp.contrato_id = c.id), '[]'::jsonb),
    'importacao', (select jsonb_build_object('id', i.id, 'arquivo', i.arquivo_nome, 'em', i.importado_em, 'por', pessoa_ref(i.criado_por),
                                             'linha', (select min(l.numero) from importacao_linhas l where l.importacao_id = i.id and l.contrato_id = c.id),
                                             'desfazerAte', i.desfazer_ate, 'desfeita', i.estado = 'DESFEITA')
                     from importacoes i where i.id = c.importacao_id and i.importado_em is not null),
    'recebimentos', coalesce((
      select jsonb_agg(jsonb_build_object('id', r.id, 'tipo', r.tipo, 'descricao', r.descricao, 'vencimento', r.vencimento, 'valor', r.valor,
                                          'origem', r.origem, 'criadoEm', r.criado_em, 'pagoAntes', r.pago_antes,
                                          'corrigida', r.pago_antes and exists (select 1 from recebimentos_previstos n where n.corrige_pago_antes_id = r.id and n.cancelado_em is null),
                                          'eraPagoAntes', r.corrige_pago_antes_id is not null,
                                          'podeVoltar', r.corrige_pago_antes_id is not null and v_pode and pago_antes_pode_voltar(r),
                                          'cancelado', case when r.cancelado_em is not null then jsonb_build_object('em', r.cancelado_em, 'motivo', r.cancelado_motivo) end,
                                          'base', (select jsonb_build_object('valor', b.valor_base, 'fonte', b.fonte, 'por', pessoa_ref(b.informado_por), 'em', b.informado_em)
                                                     from bases_mensais b where b.recebimento_id = r.id))
                       order by r.vencimento, r.descricao)
        from recebimentos_previstos r where r.contrato_id = c.id), '[]'::jsonb),
    'historico', coalesce((
      select jsonb_agg(jsonb_build_object('em', h.ocorrido_em, 'acao', h.acao, 'autor', a.nome, 'dados', h.dados) order by h.id desc)
        from historico h left join pessoas a on a.id = h.autor_id
       where h.escritorio_id = p_escritorio and h.entidade = 'contratos' and h.entidade_id = c.id::text), '[]'::jsonb));
end $$;


call fechar_acesso();
