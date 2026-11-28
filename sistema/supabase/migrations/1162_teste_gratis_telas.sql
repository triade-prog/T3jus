-- 1162 · Teste grátis de 7 dias, o servidor das telas (F1.33; CO-09, DC12). Plano revisado em
-- project-files t3jus/co-09/plano-v2.md (seções 5, 7.2, 7.4 e 8 e "Decisões da Carol") e desenho
-- aprovado em docs/design/aprovadas/teste-gratis (NOTAS.md, as 8 decisões; ficha.html, carteira.html,
-- inicio.html e portal-escritorio.html). Parte da 1160 (F1.31) e da 1161 (F1.32).
--
-- 1. O bloco do teste no Console (console_teste, refeita a partir da 1160): o quadro da aba
--    Assinatura, com o dia N de N, as datas, quem fez o primeiro acesso, as prorrogações (com o
--    fim de antes e o motivo, do histórico interno), o teste anterior do repetido, o pedido do
--    Portal, o começo da cobrança previsto, os avisos à sócia dona previstos (o envio é do F1.34) e
--    o que a pessoa pode fazer agora (prorrogar, liberar, dispensar, confirmar).
-- 2. A carteira (console_carteira_teste): a situação do teste de cada escritório que a pessoa vê,
--    para a coluna Pendências e os filtros Em teste, Teste acabou e Quer assinar (a api-console junta
--    à carteira, como já faz com a cobrança, console_carteira_cobranca da 0690).
-- 3. O bloco do Portal (portal_teste): a faixa (a data sempre, "faltam N dias" só a partir do dia 5,
--    desenho, decisão 2), o pedido e a primeira fatura para o sócio, e o sócio dono para a equipe.
--    O teste repetido aparece como AGUARDANDO_LIBERACAO, sem o motivo (desenho, decisão 7).
-- 4. "Quero assinar" (portal_quero_assinar, ação portal.teste.quero_assinar, só o sócio): vale
--    durante o teste e depois do fim, enquanto a assinatura não for confirmada. Grava o pedido uma
--    vez só (quando, quem e o recado opcional, até 300 letras); repetir devolve o mesmo pedido. Vai
--    ao histórico interno (teste.quer_assinar) e aparece no bloco do Console. Não muda a trava do
--    dia 8 (desenho, decisão 1) nem a cobrança. O aviso no sino é do F1.34.
-- 5. Quem fez o primeiro acesso: testes_gratis.primeiro_acesso_por, gravada por um gatilho no
--    instante em que primeiro_acesso_em é preenchido (a 1160 não guardava a pessoa). As linhas de
--    antes ganham a pessoa do histórico (teste.comecou ou teste.repetido), quando houver.
--
-- Por que funções novas e não as de antes envolvidas: a 1171 recria portal_plano_faturas com
-- "create or replace" e vem depois desta na ordem dos arquivos, e a 1182 (CO-08, ainda fora do main)
-- envolve console_assinatura e portal_plano_faturas. As rotas juntam os blocos: nenhuma função de
-- outra frente muda aqui, nas duas ordens de aplicação.

-- ---------------------------------------------------------------------------------------
-- 1. Quem pode e onde fica o pedido

insert into funcao_acoes (funcao, acao) values ('SOCIO', 'portal.teste.quero_assinar');

alter table testes_gratis
  add column primeiro_acesso_por uuid references pessoas (id) on delete restrict,
  add column quer_assinar_em     timestamptz,
  add column quer_assinar_por    uuid references pessoas (id) on delete restrict,
  add column quer_assinar_recado text check (length(btrim(quer_assinar_recado)) between 1 and 300),
  add constraint testes_gratis_quer_assinar check (
    (quer_assinar_em is null) = (quer_assinar_por is null) and (quer_assinar_recado is null or quer_assinar_em is not null)),
  add constraint testes_gratis_quer_assinar_com_teste check (com_teste or quer_assinar_em is null);
comment on column testes_gratis.quer_assinar_em is 'Quando um sócio apertou "Quero assinar" no Portal (CO-09). Uma vez só; não muda a trava nem a cobrança';

update inventario_dados
   set o_que = 'Teste grátis do escritório: primeiro acesso (quando e quem), dia 1 e último dia, repetição, dispensa, liberação e o pedido Quero assinar, com motivo e autor'
 where tabela = 'testes_gratis';

-- Quem fez o primeiro acesso: a pessoa do contexto no instante em que primeiro_acesso_em é
-- preenchido (teste_marcar_primeiro_acesso entra no escritório com a pessoa antes do update).
create function testes_gratis_primeiro_acesso_por() returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.primeiro_acesso_por := coalesce(new.primeiro_acesso_por, contexto_pessoa());
  return new;
end $$;
create trigger testes_gratis_primeiro_acesso_por before update of primeiro_acesso_em on testes_gratis
  for each row when (old.primeiro_acesso_em is null and new.primeiro_acesso_em is not null)
  execute function testes_gratis_primeiro_acesso_por();

-- As linhas de antes: a pessoa do evento do primeiro acesso, quando houver (com a chave desligada
-- no cadastro não há evento, e fica nula).
update testes_gratis t
   set primeiro_acesso_por = (select h.autor_id from historico h
                               where h.escritorio_id = t.escritorio_id and h.entidade = 'testes_gratis' and h.autor_tipo = 'PESSOA'
                                 and (h.acao = 'teste.repetido' or (h.acao = 'teste.comecou' and h.dados ->> 'origem' = 'PRIMEIRO_ACESSO'))
                               order by h.id limit 1)
 where t.primeiro_acesso_em is not null and t.primeiro_acesso_por is null;

-- O pedido nasce na sessão do sócio, sem o contexto da equipe que o histórico interno pede (0060):
-- esta política deixa o domínio gravar só esse evento, interno e no escritório do contexto,
-- enquanto portal_quero_assinar liga a marca (o mesmo molde de teste_historico, 1160).
create policy teste_quer_assinar_historico on historico for insert to dominio
  with check (current_setting('t3jus.teste_historico', true) = 'on' and interno and acao = 'teste.quer_assinar'
              and escritorio_id is not distinct from contexto_escritorio());

-- ---------------------------------------------------------------------------------------
-- 2. Ajudantes

-- O nome de uma pessoa, mesmo de fora do contexto (a sócia dona, quem pediu, quem decidiu).
create function teste_nome(p_pessoa uuid) returns text
language plpgsql
set search_path = public
as $$
declare v text; v_antes text := current_setting('t3jus.lendo_acesso', true);
begin
  if p_pessoa is null then return null; end if;
  perform set_config('t3jus.lendo_acesso', 'on', true);
  select nome into v from pessoas where id = p_pessoa;
  perform set_config('t3jus.lendo_acesso', coalesce(v_antes, ''), true);
  return v;
end $$;

-- O começo da cobrança e a primeira fatura, com a assinatura confirmada ou, sem ela, se fosse
-- confirmada agora (teste_inicio_cobranca, 1161): no teste, fim + 1; acabado ou dispensado, hoje.
-- A primeira fatura sai no dia do começo e é a do mês seguinte (1161, item 1).
create function teste_cobranca_prevista(t testes_gratis, a assinaturas) returns jsonb
language plpgsql
set search_path = public
as $$
declare v_comeca date; v_comp date;
begin
  if t.id is null or not t.com_teste then return null; end if;
  v_comeca := coalesce(a.inicio_cobranca, teste_inicio_cobranca(t, coalesce(a.assinada_em, app_now())));
  if v_comeca is null then return null; end if;
  v_comp := coalesce(a.primeira_competencia, (competencia_de(v_comeca) + interval '1 month')::date);
  return jsonb_build_object(
    'comecaEm', v_comeca,
    'confirmada', a.assinada_em is not null,
    'primeiraCompetencia', v_comp,
    'primeiraEmitidaEm', v_comeca,
    'primeiroVencimento', case when a.id is not null then vencimento_de(v_comp, a.dia_vencimento) end);
end $$;

-- ---------------------------------------------------------------------------------------
-- 3. O bloco do Console (aba Assinatura e GET /v1/clientes/:id/teste)

create function teste_bloco_console(p_pessoa uuid, p_escritorio uuid) returns jsonb
language plpgsql
set search_path = public
as $$
declare
  t testes_gratis := teste_ler(p_escritorio);
  a assinaturas := assinatura_do_teste(p_escritorio);
  v_sit text;
  v_hoje date := hoje_brasilia();
  v_aberto boolean := contrato_situacao(p_escritorio) in ('ABERTO', 'MARCADO');
  v_dono uuid := socio_dono_do_escritorio(p_escritorio);
  v_anterior uuid;
  v_ant testes_gratis;
  v_ant_nome text;
  v_ant_fim date;
  v_lendo text;
begin
  if t.id is null then return null; end if;
  v_sit := teste_situacao_de(t);
  if t.repetido_em is not null then
    select (h.dados ->> 'escritorio_anterior_id')::uuid into v_anterior from historico h
     where h.escritorio_id = p_escritorio and h.acao = 'teste.repetido' and h.entidade_id = t.id::text order by h.id limit 1;
    if v_anterior is not null then
      v_ant := teste_ler(v_anterior);
      v_lendo := current_setting('t3jus.lendo_acesso', true);
      perform set_config('t3jus.lendo_acesso', 'on', true);
      select nome, contrato_fim_em into v_ant_nome, v_ant_fim from escritorios where id = v_anterior;
      perform set_config('t3jus.lendo_acesso', coalesce(v_lendo, ''), true);
    end if;
  end if;
  return teste_json(p_escritorio, true) || jsonb_build_object(
    'hoje', v_hoje,
    'comTeste', t.com_teste,
    'cadastradoEm', t.criado_em,
    'faltamDias', case when v_sit in ('EM_TESTE', 'ASSINADO') and v_hoje between t.inicio and t.fim then t.fim - v_hoje + 1 end,
    'diasSoConsulta', case when v_sit = 'ACABOU' then v_hoje - t.fim end,
    'fimOriginal', t.inicio + 6,
    'prorrogado', t.fim > t.inicio + 6,
    'seEntrarHojeVaiAte', case when v_sit = 'PREVISTO' then v_hoje + 6 end,
    'socioDono', case when v_dono is not null then jsonb_build_object('id', v_dono, 'nome', teste_nome(v_dono)) end,
    'primeiroAcesso', case when t.primeiro_acesso_em is not null then jsonb_build_object(
      'em', t.primeiro_acesso_em, 'porId', t.primeiro_acesso_por, 'por', teste_nome(t.primeiro_acesso_por)) end,
    'prorrogacoes', coalesce((select jsonb_agg(jsonb_build_object(
        'em', h.ocorrido_em, 'porId', h.autor_id, 'por', teste_nome(h.autor_id),
        'fimAntes', h.dados ->> 'fim_antes', 'fimNovo', h.dados ->> 'fim_novo', 'motivo', h.dados ->> 'motivo') order by h.id)
      from historico h where h.escritorio_id = p_escritorio and h.acao = 'teste.prorrogado' and h.entidade_id = t.id::text), '[]'::jsonb),
    'testeAnterior', case when v_anterior is not null then jsonb_build_object(
      'escritorioId', v_anterior, 'nome', v_ant_nome, 'inicio', v_ant.inicio, 'fim', v_ant.fim, 'contratoFimEm', v_ant_fim) end,
    'pedido', case when t.quer_assinar_em is not null then jsonb_build_object(
      'em', t.quer_assinar_em, 'porId', t.quer_assinar_por, 'por', teste_nome(t.quer_assinar_por), 'recado', t.quer_assinar_recado) end,
    'assinaturaPreparada', a.id is not null,
    'cobranca', teste_cobranca_prevista(t, a),
    -- A previsão dos avisos à sócia dona pelas datas de hoje (desenho, ficha); o envio e o descarte
    -- entram no F1.34. Com a assinatura confirmada, o do último dia e o do fim não saem.
    'avisosPrevistos', case when t.inicio is not null then jsonb_build_array(
      jsonb_build_object('tipo', 'TESTE_COMECOU', 'dia', t.inicio, 'sai', true),
      jsonb_build_object('tipo', 'TESTE_ACABANDO', 'dia', t.fim - 2, 'sai', true),
      jsonb_build_object('tipo', 'TESTE_ULTIMO_DIA', 'dia', t.fim, 'sai', v_sit <> 'ASSINADO'),
      jsonb_build_object('tipo', 'TESTE_ACABOU', 'dia', t.fim + 1, 'sai', v_sit <> 'ASSINADO')) else '[]'::jsonb end,
    -- O que dá para fazer agora: a permissão e a situação (o banco confere de novo em cada ação).
    'acoes', jsonb_build_object(
      'prorrogar', v_aberto and v_sit in ('EM_TESTE', 'ACABOU') and pode(p_pessoa, p_escritorio, 'console.teste.prorrogar'),
      'liberar', v_aberto and v_sit = 'REPETIDO' and pode(p_pessoa, p_escritorio, 'console.teste.liberar'),
      'dispensar', v_aberto and v_sit in ('PREVISTO', 'EM_TESTE', 'ACABOU', 'REPETIDO') and pode(p_pessoa, p_escritorio, 'console.teste.dispensar'),
      'confirmar', v_aberto and v_sit in ('EM_TESTE', 'ACABOU', 'DISPENSADO') and a.id is not null and a.assinada_em is null
                   and pode(p_pessoa, p_escritorio, 'console.assinatura.confirmar')));
end $$;

create or replace function console_teste(p_pessoa uuid, p_escritorio uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'console.teste.ver');
  return teste_bloco_console(p_pessoa, p_escritorio);
end $$;

-- ---------------------------------------------------------------------------------------
-- 4. A carteira: a situação do teste de cada escritório que a pessoa vê

create function console_carteira_teste(p_pessoa uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare e uuid; t testes_gratis; v_sit text; v jsonb := '[]'::jsonb; v_hoje date;
begin
  perform definir_pessoa(p_pessoa);
  if not contexto_equipe() then raise exception 'Só a equipe T3jus' using errcode = 'TC401'; end if;
  v_hoje := hoje_brasilia();
  foreach e in array escritorios_com_acao(p_pessoa, 'console.teste.ver') loop
    perform entrar_escritorio(p_pessoa, e, 'console.teste.ver');
    t := teste_ler(e);
    v_sit := teste_situacao_de(t);
    continue when v_sit is null or v_sit = 'SEM_TESTE';
    v := v || jsonb_build_object(
      'escritorioId', e, 'situacao', v_sit, 'inicio', t.inicio, 'fim', t.fim,
      'totalDias', t.fim - t.inicio + 1,
      'diaAtual', case when v_sit in ('EM_TESTE', 'ASSINADO') and v_hoje between t.inicio and t.fim then v_hoje - t.inicio + 1 end,
      'prorrogado', t.fim > t.inicio + 6,
      'soConsultaDesde', case when v_sit = 'ACABOU' then t.fim + 1 end,
      'querAssinarEm', t.quer_assinar_em);
  end loop;
  return v;
end $$;

-- ---------------------------------------------------------------------------------------
-- 5. O bloco do Portal (GET /v1/escritorio, em cobranca.teste, e GET /v1/escritorio/faturas)

create function teste_bloco_portal(p_pessoa uuid, p_escritorio uuid) returns jsonb
language plpgsql
set search_path = public
as $$
declare
  t testes_gratis := teste_ler(p_escritorio);
  a assinaturas;
  v_sit text;
  v_socio boolean;
  v_hoje date := hoje_brasilia();
  v_dentro boolean;
begin
  v_sit := teste_situacao_de(t);
  if v_sit is null or v_sit in ('SEM_TESTE', 'DISPENSADO') then return null; end if;
  v_socio := pode(p_pessoa, p_escritorio, 'portal.teste.quero_assinar');
  -- O repetido não diz o motivo (desenho, decisão 7): só que a equipe está liberando o acesso.
  if v_sit = 'REPETIDO' then
    return jsonb_build_object('situacao', 'AGUARDANDO_LIBERACAO', 'hoje', v_hoje, 'souSocio', v_socio,
      'socioDono', teste_nome(socio_dono_do_escritorio(p_escritorio)), 'podePedir', false);
  end if;
  a := assinatura_do_teste(p_escritorio);
  v_dentro := t.inicio is not null and v_hoje between t.inicio and t.fim;
  return jsonb_build_object(
    'situacao', v_sit,
    'hoje', v_hoje,
    'inicio', t.inicio, 'fim', t.fim,
    'totalDias', t.fim - t.inicio + 1,
    'diaAtual', case when v_dentro then v_hoje - t.inicio + 1 end,
    'soConsultaDesde', t.fim + 1,
    -- A data aparece sempre; "faltam N dias" só a partir do dia 5 (o aviso TESTE_ACABANDO, fim - 2).
    'faltamDias', case when v_dentro and v_hoje >= t.fim - 2 then t.fim - v_hoje + 1 end,
    'ultimoDia', v_dentro and v_hoje = t.fim,
    'souSocio', v_socio,
    'socioDono', teste_nome(socio_dono_do_escritorio(p_escritorio)),
    'assinadaEm', a.assinada_em,
    'pedido', case when v_socio and t.quer_assinar_em is not null then jsonb_build_object(
      'em', t.quer_assinar_em, 'por', teste_nome(t.quer_assinar_por)) end,
    'podePedir', v_socio and v_sit in ('EM_TESTE', 'ACABOU') and t.quer_assinar_em is null
                 and contrato_situacao(p_escritorio) in ('ABERTO', 'MARCADO'),
    -- Plano e faturas antes da assinatura (só o sócio): quando começa e qual é a primeira fatura.
    'cobranca', case when v_socio then teste_cobranca_prevista(t, a) end);
end $$;

create function portal_teste(p_pessoa uuid, p_escritorio uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'escritorio.ver');
  return teste_bloco_portal(p_pessoa, p_escritorio);
end $$;

-- ---------------------------------------------------------------------------------------
-- 6. "Quero assinar"

create function portal_quero_assinar(p_pessoa uuid, p_escritorio uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  t testes_gratis;
  v_sit text;
  v_recado text := nullif(btrim(coalesce(p_dados ->> 'recado', '')), '');
  v_novo boolean := false;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'portal.teste.quero_assinar');
  if v_recado is not null and length(v_recado) > 300 then
    raise exception 'O recado vai até 300 letras' using errcode = 'TC422',
      detail = jsonb_build_object('campos', jsonb_build_array('recado'))::text;
  end if;
  if contrato_situacao(p_escritorio) not in ('ABERTO', 'MARCADO') then
    perform recusar_motivo('O contrato deste escritório foi encerrado', 'CONTRATO_ENCERRADO');
  end if;
  -- Trava a linha: dois cliques ao mesmo tempo gravam um pedido só.
  select * into t from testes_gratis where escritorio_id = p_escritorio for update;
  if t.id is null or not t.com_teste then
    perform recusar_motivo('Este escritório não tem teste grátis', 'SEM_TESTE_GRATIS');
  end if;
  v_sit := teste_situacao_de(t);
  if v_sit = 'ASSINADO' then
    perform recusar_motivo('A assinatura deste escritório já foi confirmada', 'JA_ASSINADO');
  end if;
  if v_sit not in ('EM_TESTE', 'ACABOU') then
    perform recusar_motivo('O pedido vale durante o teste grátis ou depois do fim', 'QUERO_ASSINAR_FORA_DO_TESTE');
  end if;
  if t.quer_assinar_em is null then
    -- A marca da 1160: o pedido grava também com o Portal só para consulta (dia 8), sem mudar a trava.
    perform set_config('t3jus.marcando_teste', 'on', true);
    update testes_gratis set quer_assinar_em = app_now(), quer_assinar_por = p_pessoa, quer_assinar_recado = v_recado
     where id = t.id returning * into t;
    perform set_config('t3jus.marcando_teste', '', true);
    perform set_config('t3jus.teste_historico', 'on', true);
    -- Sem returning: a sócia não lê o histórico interno (registrar_historico_interno pede o id).
    insert into historico (ocorrido_em, escritorio_id, autor_tipo, autor_id, acao, entidade, entidade_id, dados, interno)
    values (app_now(), p_escritorio, 'PESSOA', p_pessoa, 'teste.quer_assinar', 'testes_gratis', t.id::text,
            jsonb_build_object('situacao', v_sit, 'fim', t.fim, 'com_recado', v_recado is not null), true);
    perform set_config('t3jus.teste_historico', '', true);
    v_novo := true;
  end if;
  return jsonb_build_object('novo', v_novo, 'teste', teste_bloco_portal(p_pessoa, p_escritorio));
end $$;

call fechar_acesso();
