-- O histórico financeiro importado do cliente excluído a pedido do titular (F3.177; PT-11, VA-05),
-- pelo plano revisado (project-files t3jus/f3-177/plano-v2.md e revisao-v2.md, que vale onde os dois
-- divergem) e pelo desenho aprovado da janela (docs/design/aprovadas/portal-exclusao-historico,
-- Carol, 26/11/2026, alternativa A).
--
-- A decisão da Carol (C1 = b, 25/11/2026), como controladora: a descrição dos lançamentos importados
-- do sistema antigo (historico_financeiro_anterior.descricao, texto livre de até 300 letras), pagos
-- e em aberto, e o detalhe escrito ao dispensar o lembrete de contrato (lembrete_contrato.
-- dispensa_detalhe) FICAM guardados como estão até o fim do prazo do imposto, como os arquivos da
-- despesa da F3.156, e só então viram texto fixo. A base é também a obrigação legal (LGPD, art. 7º,
-- II, e 16, I): a anotação do honorário apoia a prova da receita no livro-caixa enquanto o imposto
-- do ano não decai (CTN, art. 173, I, e 195, parágrafo único; Decreto 9.580/2018). A revisão
-- registrou dúvida sobre essa leitura, mais fraca ainda para o em aberto e para o detalhe (valor em
-- aberto não é receita); a leitura é da controladora e fica registrada aqui como dela (R10). Se o
-- contador do escritório ou a ANPD entenderem diferente, basta historico_anterior_guardada()
-- devolver false: tudo troca na primeira noite, sem migração de dados.
--
-- O marco (desenho, alternativa A; revisão, 2.1 e 2.2):
--   * do lançamento: 1º de janeiro de ano + 2 + prazo_fiscal_anos (5), com o ano da data dele, e o ano
--     da importação (criado_em) quando ele veio sem data (aviso CAMPO_INVALIDO). Pago ou em aberto,
--     o marco é o mesmo: a linha importada é uma foto do sistema antigo e não muda mais no T3jus.
--     A "data mais tarde" é a própria data: diferente da conta da F3.156, a linha não ganha
--     pagamento, reembolso nem cancelamento depois de nascer. Pago em 2026, troca em 01/01/2033;
--   * do detalhe da dispensa: o maior marco dos lançamentos EM_ABERTO que o lembrete cobre (mesma
--     importação, cliente e caso), e o ano da dispensa só quando não houver lançamento. O detalhe
--     explica esses valores e sai junto com eles; nunca empurra a data para depois deles;
--   * a linha desfeita (o escritório já desfez a importação) e a já vencida trocam na hora.
--
-- 1. Configuração prazo_fiscal_anos: a descrição cita o histórico importado; o valor não muda.
-- 2. Na exclusão (gatilho historico_anterior_apagar_do_excluido, entre financeiro_ e importacao_ pela
--    ordem do nome), a descrição vencida ou desfeita vira "Lançamento do sistema antigo de cliente
--    excluído" e o detalhe vencido vira "Detalhe apagado a pedido do titular"; o resto fica. O evento
--    cliente.historico_anterior_guardado registra quantas e até quando, sem dado pessoal.
-- 3. A rotina da noite (aplicar_prazos → prazo_fiscal_historico_aplicar) troca o que venceu. Não
--    depende da 1117: a lista vem do estado EXCLUIDO, não do evento.
-- 4. Guardiões: nada muda nem se apaga em historico_financeiro_anterior, fora o desfazer (desfeito_em)
--    e a troca do vencido de cliente excluído do mesmo escritório; o detalhe só vira o texto fixo
--    vencido, e o texto fixo não muda mais.
-- 5. Ninguém lê a descrição guardada pela ficha: portal_cliente_anterior do excluído devolve
--    anterior: null. Ela sai só na exportação do escritório, que é da controladora (F0.12).
-- 6. A ficha ganha arquivosQueFicam.historico = {lancamentos, detalhes, semData, origem, ate}, para a
--    janela (só quando há lançamento que fica).
-- 7. As travas (revisão v1, M1, M2 e M6): o desfazer do financeiro trava o histórico e depois os
--    lembretes, em ordem de id, como a exclusão e a rotina; "trazer de volta" trava o cliente antes
--    do lembrete, e dispensar e trazer recusam o cliente excluído (CLIENTE_EXCLUIDO); lançamento e
--    lembrete novos para cliente excluído são recusados (FOR SHARE no cliente).
-- 8. Os clientes já excluídos ficam para a 1117 (historico_anterior_preencher_excluidos).
--
-- O limite que fica (revisão, m-c): a cópia do detalhe no histórico do cliente (o evento
-- cliente.lembrete_dispensado, 0921) fica para sempre, porque o histórico só recebe inserção (PT-03).
-- O lembrete aberto do excluído continua na lista de Contratos e ninguém consegue dispensá-lo até a
-- F3.186.
--
-- Ordem de publicação (README, "Arquivos do cliente excluído"; painel, P21): contagem só de leitura
-- (project-files t3jus/f3-177/contagem-antes-1116.sql), porque a primeira noite depois desta 1116 já
-- troca as descrições vencidas e desfeitas dos já excluídos; esta 1116; a 1117; a 1118; a contagem
-- antes da 1119; a 1119; o Portal (a janela). A 1116-1119 não dependem da 1120.
--
-- Funções recriadas e de onde partem (a versão mais recente de cada uma):
--   aplicar_prazos ............... 1092 (nada a recriou depois)
--   portal_cliente ............... 1092 (o embrulho; cliente_arquivos_que_ficam NÃO é recriada: o
--                                  evento cliente.despesas_guardadas e o preenchimento da 1092 leem o
--                                  ate dela, que é o da despesa)
--   portal_cliente_anterior ...... 0921
--   imp_desfazer_cf .............. 0820 (a portal_importacao_desfazer de lá, renomeada na 0920; o
--                                  embrulho da 0920 não muda)
--   portal_lembrete_dispensar .... 0921
--   portal_lembrete_trazer ....... 0921
-- Novas: historico_anterior_descricao_excluido, lembrete_detalhe_excluido, historico_anterior_guardada,
-- historico_anterior_guarda_ate, historico_anterior_vencida, lembrete_detalhe_guarda_ate,
-- lembrete_detalhe_vencido, historico_anterior_guarda, lembrete_detalhe_guarda, historico_anterior_nasce,
-- lembrete_contrato_nasce, historico_anterior_excluido_limpar, cliente_historico_anterior_que_fica,
-- historico_anterior_apagar_do_excluido (gatilho), prazo_fiscal_historico_aplicar,
-- historico_anterior_preencher_excluidos (a 1117 chama). Nenhuma nova é security definer.

-- ---------------------------------------------------------------------------------------
-- 1. Configuração.
update configuracoes
   set descricao = 'Anos de guarda da nota, guia, boleto e comprovante de despesa de cliente excluído, da pasta do contador e da descrição do lançamento do sistema antigo de cliente excluído (com o detalhe da dispensa), contados do 1º de janeiro do segundo ano depois do ano do fato (CTN, art. 173, I, para o imposto anual da pessoa física)'
 where chave = 'prazo_fiscal_anos';

-- ---------------------------------------------------------------------------------------
-- 2. Funções puras.

-- A descrição do lançamento de cliente excluído (48 letras; cabe no check de 1 a 300 da 0820).
create function historico_anterior_descricao_excluido() returns text
language sql
immutable
as $$ select 'Lançamento do sistema antigo de cliente excluído'::text $$;

-- O detalhe da dispensa de cliente excluído (35 letras; cabe no check de 3 a 140 da 0921).
create function lembrete_detalhe_excluido() returns text
language sql
immutable
as $$ select 'Detalhe apagado a pedido do titular'::text $$;

-- A decisão C1 da Carol: guardar até o marco. false troca tudo na primeira noite (R10).
create function historico_anterior_guardada() returns boolean
language sql
immutable
as $$ select true $$;

-- O dia em que a descrição troca: 1º de janeiro de ano + 2 + prazo, com o ano da data do lançamento
-- ou, sem data, o da importação (alternativa A do desenho). A situação não muda o marco.
create function historico_anterior_guarda_ate(h historico_financeiro_anterior) returns date
language sql
stable
set search_path = public
as $$
  select make_date(extract(year from coalesce(h.data, (h.criado_em at time zone 'America/Sao_Paulo')::date))::integer
                   + 2 + configuracao_int('prazo_fiscal_anos'), 1, 1)
$$;

-- Vencida: desfeita (troca na hora), passada do marco ou sem a guarda (R10).
create function historico_anterior_vencida(h historico_financeiro_anterior) returns boolean
language sql
stable
set search_path = public
as $$
  select not historico_anterior_guardada() or h.desfeito_em is not null or hoje_brasilia() >= historico_anterior_guarda_ate(h)
$$;

-- O marco do detalhe: o maior marco dos lançamentos EM_ABERTO que o lembrete cobre (0920:792-796),
-- sem o filtro lancamento_de_encerrado_importado, que lê linhas que somem (revisão, 2.2); sem
-- lançamento, o ano da dispensa.
create function lembrete_detalhe_guarda_ate(l lembrete_contrato) returns date
language sql
stable
set search_path = public
as $$
  select coalesce(
    (select max(historico_anterior_guarda_ate(h)) from historico_financeiro_anterior h
      where h.importacao_id = l.importacao_id and h.cliente_id = l.cliente_id
        and h.caso_id is not distinct from l.caso_id and h.situacao = 'EM_ABERTO'),
    make_date(extract(year from (coalesce(l.dispensado_em, l.criado_em) at time zone 'America/Sao_Paulo'))::integer
              + 2 + configuracao_int('prazo_fiscal_anos'), 1, 1))
$$;

create function lembrete_detalhe_vencido(l lembrete_contrato) returns boolean
language sql
stable
set search_path = public
as $$
  select not historico_anterior_guardada() or l.desfeito_em is not null or hoje_brasilia() >= lembrete_detalhe_guarda_ate(l)
$$;

-- ---------------------------------------------------------------------------------------
-- 3. Os guardiões.

-- historico_financeiro_anterior não se apaga (o fim da guarda desliga os gatilhos de usuário, 0540)
-- e só muda de dois jeitos: o desfazer (desfeito_em, de nulo para valor, com o resto igual) e a troca
-- da descrição pelo texto fixo, vencida, do cliente EXCLUIDO do mesmo escritório.
create function historico_anterior_guarda() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Lançamento do sistema antigo não se apaga' using errcode = 'TC023';
  end if;
  if old.desfeito_em is null and new.desfeito_em is not null
     and (to_jsonb(new) - 'desfeito_em') = (to_jsonb(old) - 'desfeito_em') then
    return new;
  end if;
  if new.descricao = historico_anterior_descricao_excluido() and old.descricao <> historico_anterior_descricao_excluido()
     and (to_jsonb(new) - 'descricao') = (to_jsonb(old) - 'descricao')
     and (select k.estado from clientes_escritorio k where k.id = old.cliente_id and k.escritorio_id = old.escritorio_id) = 'EXCLUIDO'
     and coalesce(historico_anterior_vencida(old), false) then
    return new;
  end if;
  raise exception 'Lançamento do sistema antigo não muda' using errcode = 'TC023';
end $$;
create trigger historico_anterior_guarda before update or delete on historico_financeiro_anterior
  for each row execute function historico_anterior_guarda();

-- O detalhe da dispensa: o texto fixo não muda mais; virar o texto fixo exige o cliente EXCLUIDO do
-- mesmo escritório, o detalhe vencido e o resto igual. Dispensar e trazer de volta continuam.
create function lembrete_detalhe_guarda() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.dispensa_detalhe is not distinct from old.dispensa_detalhe then
    return new;
  end if;
  if old.dispensa_detalhe = lembrete_detalhe_excluido() then
    raise exception 'O detalhe foi apagado a pedido do titular' using errcode = 'TC023';
  end if;
  if new.dispensa_detalhe = lembrete_detalhe_excluido() then
    if old.dispensa_detalhe is not null
       and (to_jsonb(new) - 'dispensa_detalhe') = (to_jsonb(old) - 'dispensa_detalhe')
       and (select k.estado from clientes_escritorio k where k.id = old.cliente_id and k.escritorio_id = old.escritorio_id) = 'EXCLUIDO'
       and coalesce(lembrete_detalhe_vencido(old), false) then
      return new;
    end if;
    raise exception 'O detalhe só vira o texto fixo no cliente excluído, no fim do prazo' using errcode = 'TC023';
  end if;
  return new;
end $$;
create trigger lembrete_detalhe_guarda before update of dispensa_detalhe on lembrete_contrato
  for each row execute function lembrete_detalhe_guarda();

-- ---------------------------------------------------------------------------------------
-- 4. Nascer (revisão v1, M6): lançamento e lembrete novos para cliente excluído são recusados, com
-- FOR SHARE na mesma consulta que lê o estado (molde de conta_pagar_nasce, 1092). A importação que
-- cruza com a exclusão espera por ela e volta inteira; o escritório refaz a prévia.
create function historico_anterior_nasce() returns trigger
language plpgsql
set search_path = public
as $$
begin
  perform 1 from clientes_escritorio where id = new.cliente_id and escritorio_id = new.escritorio_id and estado <> 'EXCLUIDO' for share;
  if not found then
    perform recusar_motivo('O cliente foi excluído durante a importação', 'CLIENTE_EXCLUIDO');
  end if;
  return new;
end $$;
create trigger historico_anterior_nasce before insert on historico_financeiro_anterior
  for each row execute function historico_anterior_nasce();

create function lembrete_contrato_nasce() returns trigger
language plpgsql
set search_path = public
as $$
begin
  perform 1 from clientes_escritorio where id = new.cliente_id and escritorio_id = new.escritorio_id and estado <> 'EXCLUIDO' for share;
  if not found then
    perform recusar_motivo('O cliente foi excluído durante a importação', 'CLIENTE_EXCLUIDO');
  end if;
  return new;
end $$;
create trigger lembrete_contrato_nasce before insert on lembrete_contrato
  for each row execute function lembrete_contrato_nasce();

-- ---------------------------------------------------------------------------------------
-- 5. Na exclusão.

-- Troca a descrição vencida (ou desfeita) e o detalhe vencido pelo texto fixo. Trava o histórico e
-- depois os lembretes do cliente, em ordem de id, como o desfazer do financeiro (M1). Devolve
-- {trocados, guardados, detalhesTrocados, detalhesGuardados, ate}: o que trocou agora, o que continua
-- guardado e o maior marco do que fica (null se nada fica). Idempotente. Não é security definer:
-- roda dentro da exclusão (contexto do escritório), da rotina e do preenchimento (com as marcas).
create function historico_anterior_excluido_limpar(p_escritorio uuid, p_cliente uuid) returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_trocados integer;
  v_detalhes integer;
begin
  perform 1 from historico_financeiro_anterior where escritorio_id = p_escritorio and cliente_id = p_cliente order by id for update;
  perform 1 from lembrete_contrato where escritorio_id = p_escritorio and cliente_id = p_cliente order by id for update;
  update historico_financeiro_anterior h set descricao = historico_anterior_descricao_excluido()
   where h.escritorio_id = p_escritorio and h.cliente_id = p_cliente
     and h.descricao <> historico_anterior_descricao_excluido() and historico_anterior_vencida(h);
  get diagnostics v_trocados = row_count;
  update lembrete_contrato l set dispensa_detalhe = lembrete_detalhe_excluido()
   where l.escritorio_id = p_escritorio and l.cliente_id = p_cliente
     and l.dispensa_detalhe is not null and l.dispensa_detalhe <> lembrete_detalhe_excluido() and lembrete_detalhe_vencido(l);
  get diagnostics v_detalhes = row_count;
  return (
    with hs as (select historico_anterior_guarda_ate(h) ate from historico_financeiro_anterior h
                 where h.escritorio_id = p_escritorio and h.cliente_id = p_cliente
                   and h.descricao <> historico_anterior_descricao_excluido()),
         ls as (select lembrete_detalhe_guarda_ate(l) ate from lembrete_contrato l
                 where l.escritorio_id = p_escritorio and l.cliente_id = p_cliente
                   and l.dispensa_detalhe is not null and l.dispensa_detalhe <> lembrete_detalhe_excluido())
    select jsonb_build_object('trocados', v_trocados, 'guardados', (select count(*) from hs),
                              'detalhesTrocados', v_detalhes, 'detalhesGuardados', (select count(*) from ls),
                              'ate', (select max(x.ate) from (select ate from hs union all select ate from ls) x)));
end $$;

-- O que a exclusão guarda, simulado sem mexer em nada, para a janela (desenho, "O campo que o
-- servidor devolve"): os lançamentos sem as desfeitas e sem as já vencidas (trocadas na exclusão),
-- os detalhes que ficam, quantos lançamentos vieram sem data, o sistema (se um só) e o maior marco.
-- Não é security definer.
create function cliente_historico_anterior_que_fica(p_escritorio uuid, p_cliente uuid) returns jsonb
language sql
stable
set search_path = public
as $$
  with hs as (select h.data, h.origem, historico_anterior_guarda_ate(h) ate from historico_financeiro_anterior h
               where h.escritorio_id = p_escritorio and h.cliente_id = p_cliente
                 and h.descricao <> historico_anterior_descricao_excluido() and not historico_anterior_vencida(h)),
       ls as (select lembrete_detalhe_guarda_ate(l) ate from lembrete_contrato l
               where l.escritorio_id = p_escritorio and l.cliente_id = p_cliente
                 and l.dispensa_detalhe is not null and l.dispensa_detalhe <> lembrete_detalhe_excluido()
                 and not lembrete_detalhe_vencido(l))
  select jsonb_build_object(
    'lancamentos', (select count(*) from hs),
    'detalhes', (select count(*) from ls),
    'semData', (select count(*) from hs where data is null),
    'origem', (select case when count(distinct origem) = 1 then min(origem) end from hs),
    'ate', (select max(x.ate) from (select ate from hs union all select ate from ls) x))
$$;

create function historico_anterior_apagar_do_excluido() returns trigger
language plpgsql
set search_path = public
as $$
declare v jsonb := historico_anterior_excluido_limpar(new.escritorio_id, new.id);
begin
  if (v ->> 'trocados')::integer + (v ->> 'guardados')::integer + (v ->> 'detalhesTrocados')::integer
     + (v ->> 'detalhesGuardados')::integer > 0 then
    -- A prova de que a descrição ficou pela lei e até quando, sem dado pessoal.
    perform historico_do_cliente(new.escritorio_id, new.id, 'cliente.historico_anterior_guardado', v);
  end if;
  return null;
end $$;
-- Pelo nome, roda depois de financeiro_apagar_do_excluido e antes de importacao_apagar_do_excluido
-- (1118), sino_apagar_do_excluido e z_cliente_excluido_arquivos, sem depender de nenhum.
create trigger historico_anterior_apagar_do_excluido after update of estado on clientes_escritorio
  for each row when (new.estado = 'EXCLUIDO' and old.estado <> 'EXCLUIDO') execute function historico_anterior_apagar_do_excluido();

-- ---------------------------------------------------------------------------------------
-- 6. A rotina: no marco, a descrição e o detalhe vencidos de cliente excluído viram o texto fixo. No
-- molde de prazo_fiscal_aplicar (1092): as marcas fim_da_guarda e aplicando_prazos só durante a
-- chamada, primeiro a lista e depois as mudanças. Não depende da 1117. Idempotente.
create function prazo_fiscal_historico_aplicar() returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_guarda text := coalesce(current_setting('t3jus.fim_da_guarda', true), '');
  v_prazos text := coalesce(current_setting('t3jus.aplicando_prazos', true), '');
  v_pares jsonb;
  p jsonb;
  v jsonb;
  v_esc jsonb := '{}'::jsonb;
  v_um jsonb;
  v_desc integer := 0;
  v_det integer := 0;
  r record;
begin
  perform limpar_contexto();
  perform set_config('t3jus.fim_da_guarda', 'on', true);
  perform set_config('t3jus.aplicando_prazos', 'on', true);

  select coalesce(jsonb_agg(jsonb_build_array(x.esc, x.cli) order by x.esc, x.cli), '[]'::jsonb) into v_pares from (
    select h.escritorio_id esc, h.cliente_id cli from historico_financeiro_anterior h
      join clientes_escritorio k on k.id = h.cliente_id and k.escritorio_id = h.escritorio_id
     where k.estado = 'EXCLUIDO' and h.descricao <> historico_anterior_descricao_excluido() and historico_anterior_vencida(h)
    union
    select l.escritorio_id, l.cliente_id from lembrete_contrato l
      join clientes_escritorio k on k.id = l.cliente_id and k.escritorio_id = l.escritorio_id
     where k.estado = 'EXCLUIDO' and l.dispensa_detalhe is not null and l.dispensa_detalhe <> lembrete_detalhe_excluido()
       and lembrete_detalhe_vencido(l)) x;

  for p in select * from jsonb_array_elements(v_pares) loop
    v := historico_anterior_excluido_limpar((p ->> 0)::uuid, (p ->> 1)::uuid);
    v_um := coalesce(v_esc -> (p ->> 0), '{"descricoes": 0, "detalhes": 0}'::jsonb);
    v_esc := v_esc || jsonb_build_object(p ->> 0, jsonb_build_object(
      'descricoes', (v_um ->> 'descricoes')::integer + (v ->> 'trocados')::integer,
      'detalhes', (v_um ->> 'detalhes')::integer + (v ->> 'detalhesTrocados')::integer));
    v_desc := v_desc + (v ->> 'trocados')::integer;
    v_det := v_det + (v ->> 'detalhesTrocados')::integer;
  end loop;

  for r in select e.key, e.value from jsonb_each(v_esc) e order by e.key loop
    perform historico_do_escritorio(r.key::uuid, false, 'dados.prazo_fiscal_aplicado', r.value);
  end loop;

  perform set_config('t3jus.fim_da_guarda', v_guarda, true);
  perform set_config('t3jus.aplicando_prazos', v_prazos, true);
  return jsonb_build_object('descricoes', v_desc, 'detalhes', v_det);
end $$;

-- ---------------------------------------------------------------------------------------
-- 7. A rotina da noite: corpo da 1092 (o texto que está no banco), com o histórico importado logo
-- depois do prazo fiscal dos anexos.
create or replace function aplicar_prazos() returns jsonb
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
  v_contratos jsonb := '{}'::jsonb;
  r           record;
  v_encerrados integer := 0;
  v_fechados  integer := 0;
  v_entradas  integer := 0;
  v_guardas   integer := 0;
  v_ids       uuid[];
  v_id        uuid;
  v_fiscal    jsonb;
  v_hist      jsonb;
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

  -- Contrato que chegou ao fim marcado: vira Encerrado (decisão 1 do F0.14).
  for r in select e.id from escritorios e join clientes cl on cl.escritorio_id = e.id
            where e.contrato_fim_em <= hoje_brasilia() and cl.estado <> 'ENCERRADO' and cl.fim_motivo is not null
            order by e.id loop
    perform encerrar_no_dia(r.id, true);
    v_encerrados := v_encerrados + 1;
  end loop;

  -- Fim dos 30 dias: o acesso fecha e as sessões no escritório saem.
  for r in select e.id from escritorios e
            where e.contrato_fim_em is not null and e.acesso_fechado_em is null
              and situacao_do_contrato(e.contrato_fim_em) = 'FECHADO'
            order by e.id loop
    update escritorios set acesso_fechado_em = app_now() where id = r.id;
    delete from sessoes_escritorio where escritorio_id = r.id;
    get diagnostics v_n = row_count;
    perform historico_do_escritorio(r.id, false, 'contrato.acesso_fechado', jsonb_build_object('sessoes', v_n));
    v_fechados := v_fechados + 1;
  end loop;

  -- 90 dias sem nenhum acesso: a entrada sai do Auth e a pessoa fica como autora.
  if prazo_aprovado('pessoas') then
    for r in select p.id from pessoas p
              where p.entrada_apagada_em is null
                and pessoa_sem_acesso_desde(p.id) <= app_now() - make_interval(days => configuracao_int('prazo_entrada_dias'))
              order by p.id loop
      perform ponte_auth.apagar_entrada(r.id);
      delete from sessoes_escritorio where pessoa_id = r.id;
      update pessoas set entrada_apagada_em = app_now() where id = r.id;
      perform inserir_historico(true, 'pessoa.entrada_apagada', 'pessoa', r.id::text, '{}'::jsonb);
      v_entradas := v_entradas + 1;
    end loop;
  else
    v_aguardam := v_aguardam || 'pessoas'::text;
  end if;

  -- F0.15: 5 anos depois do fim do contrato, o escritório sai e fica só o nome. Vem depois da
  -- saída das entradas, para quem só tinha este escritório sair junto.
  -- A lista vem antes: terminar_guarda muda as tabelas, e um cursor aberto nelas impede.
  select coalesce(array_agg(e.id order by e.id), '{}') into v_ids from escritorios e
   where e.contrato_fim_em is not null and e.guarda_terminada_em is null
     and hoje_brasilia() >= guarda_ate(e.contrato_fim_em);
  foreach v_id in array v_ids loop
    perform terminar_guarda(v_id);
    v_guardas := v_guardas + 1;
  end loop;

  perform set_config('t3jus.aplicando_prazos', 'off', true);

  v_contratos := jsonb_build_object('encerrados', v_encerrados, 'acessos_fechados', v_fechados,
                                    'entradas_apagadas', v_entradas, 'guardas_terminadas', v_guardas);

  -- Interessados que não viraram cliente (0580): 12 meses depois do último contato.
  if prazo_aprovado('interessados') then
    v_n := apagar_interessados_vencidos();
    -- Só aparece na contagem quando apagou alguém (a contagem dos outros prazos não muda).
    if v_n > 0 then v_apagados := v_apagados || jsonb_build_object('interessados', v_n); end if;
  else
    v_aguardam := v_aguardam || 'interessados'::text;
  end if;

  -- F3.156: nota, guia, boleto e comprovante de despesa de cliente excluído e a pasta do contador do
  -- mês, no fim da guarda fiscal. As chaves só aparecem quando houve algo.
  if prazo_aprovado('anexos') then
    v_fiscal := prazo_fiscal_aplicar();
    if (v_fiscal ->> 'anexos')::integer > 0 then
      v_apagados := v_apagados || jsonb_build_object('anexos_fiscais', (v_fiscal ->> 'anexos')::integer);
    end if;
    if (v_fiscal ->> 'pastas')::integer > 0 then
      v_apagados := v_apagados || jsonb_build_object('pastas_fiscais', (v_fiscal ->> 'pastas')::integer);
    end if;
  else
    v_aguardam := v_aguardam || 'anexos'::text;
  end if;

  -- F3.177: a descrição do lançamento do sistema antigo e o detalhe da dispensa de cliente excluído,
  -- no fim da guarda fiscal. As chaves só aparecem quando houve troca.
  if prazo_aprovado('historico_financeiro_anterior') then
    v_hist := prazo_fiscal_historico_aplicar();
    if (v_hist ->> 'descricoes')::integer > 0 then
      v_apagados := v_apagados || jsonb_build_object('descricoes_antigas', (v_hist ->> 'descricoes')::integer);
    end if;
    if (v_hist ->> 'detalhes')::integer > 0 then
      v_apagados := v_apagados || jsonb_build_object('detalhes_antigos', (v_hist ->> 'detalhes')::integer);
    end if;
  else
    v_aguardam := v_aguardam || 'historico_financeiro_anterior'::text;
  end if;

  -- Dado pessoal cujo prazo a rotina ainda não aplica: hoje, só o da equipe T3jus (5 anos
  -- depois de sair). Tudo o que é do escritório sai no fim da guarda.
  select coalesce(array_agg(d.tabela order by d.tabela), '{}') into v_sem
    from inventario_dados d
   where d.dado_pessoal and d.tabela not in ('sessoes_escritorio', 'limites_uso', 'pessoas', 'historico', 'escritorios',
                                             'interessados', 'interessado_eventos', 'interessado_notas', 'avisos_console')
     and not exists (select 1 from pg_attribute a
                      where a.attrelid = to_regclass('public.' || d.tabela) and a.attname = 'escritorio_id' and not a.attisdropped);

  v_resultado := jsonb_build_object(
    'apagados', v_apagados,
    'contratos', v_contratos,
    'aguardando_aprovacao', to_jsonb(v_aguardam),
    'sem_gatilho', to_jsonb(v_sem),
    'arquivos_chamados', guarda_arquivos_chamar());
  perform registrar_historico('dados.prazos_aplicados', 'inventario', null, v_resultado);
  return v_resultado;
end $$;

-- ---------------------------------------------------------------------------------------
-- 8. A ficha: corpo da 1092, letra por letra, com a chave historico dentro de arquivosQueFicam, só
-- quando há lançamento que fica (sem ela, o objeto é o da F3.156, que o 143 confere inteiro).
create or replace function portal_cliente(p_pessoa uuid, p_escritorio uuid, p_cliente uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  f jsonb := portal_cliente_sem_termo(p_pessoa, p_escritorio, p_cliente);
  c clientes_escritorio;
  v_tutela jsonb;
  v_hist jsonb;
begin
  select * into c from clientes_escritorio where id = p_cliente and escritorio_id = p_escritorio;
  v_tutela := cliente_termo_tutela_linha(p_escritorio, p_cliente);
  if v_tutela is null and c.tipo = 'PF' and c.capacidade = 'MENOR' and c.rl_papel in ('TUTORA', 'TUTOR')
     and cliente_assina(c) ->> 'situacao' = 'FEZ_18' then
    v_tutela := cliente_termo_tutela_guardado(p_escritorio, p_cliente);
  end if;
  f := f || jsonb_build_object('termoCuratela', cliente_termo_linha(p_escritorio, p_cliente), 'termoTutela', v_tutela);
  -- Só a tutora ou o tutor que assinava ganha a chave "termo", e só quando há termo guardado;
  -- sem termo, "Quem assinava" sai como antes (o 112 confere o objeto inteiro).
  if jsonb_typeof(f -> 'quemAssinava') = 'object' and f -> 'quemAssinava' ->> 'papel' in ('TUTORA', 'TUTOR') then
    v_tutela := cliente_termo_tutela_guardado(p_escritorio, p_cliente);
    if v_tutela is not null then
      f := jsonb_set(f, '{quemAssinava,termo}', v_tutela);
    end if;
  end if;
  -- F3.155: só a sócia dona, no cliente que ela pode excluir (ativo ou inativo, sem contrato nem
  -- processo; com eles a janela é a de arquivar e nada se apaga). Sem isso, a chave não vem.
  -- F3.156: arquivosQueFicam, com as mesmas regras de quem recebe.
  -- F3.177: arquivosQueFicam.historico, só quando há lançamento do sistema antigo que fica.
  if (f ->> 'dono')::boolean and c.estado in ('ATIVO', 'INATIVO')
     and jsonb_typeof(f -> 'vinculosLgpd') is distinct from 'object' then
    v_hist := cliente_historico_anterior_que_fica(p_escritorio, p_cliente);
    f := f || jsonb_build_object('arquivosParaApagar', cliente_arquivos_para_apagar(p_escritorio, p_cliente),
                                 'arquivosQueFicam', cliente_arquivos_que_ficam(p_escritorio, p_cliente)
                                   || case when (v_hist ->> 'lancamentos')::integer > 0 then jsonb_build_object('historico', v_hist)
                                           else '{}'::jsonb end);
  end if;
  return f;
end $$;

-- A folha "Sistema antigo" da ficha: corpo da 0921, e o cliente excluído devolve anterior: null.
-- Guardar não é mostrar: a descrição guardada só sai na exportação do escritório (F0.12).
create or replace function portal_cliente_anterior(p_pessoa uuid, p_escritorio uuid, p_cliente uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'clientes.ver');
  if not exists (select 1 from clientes_escritorio where id = p_cliente and escritorio_id = p_escritorio) then
    raise exception 'Cliente não encontrado' using errcode = 'TC404';
  end if;
  if exists (select 1 from clientes_escritorio where id = p_cliente and escritorio_id = p_escritorio and estado = 'EXCLUIDO') then
    return jsonb_build_object('anterior', null);
  end if;
  if not (areas_da_pessoa(p_pessoa, p_escritorio) && array['FINANCEIRO', 'CONTRATOS']) then return jsonb_build_object('anterior', null); end if;
  if not exists (select 1 from historico_financeiro_anterior where escritorio_id = p_escritorio and cliente_id = p_cliente and desfeito_em is null) then
    return jsonb_build_object('anterior', null);
  end if;
  return jsonb_build_object('anterior', jsonb_build_object(
    'origem', (select h.origem from historico_financeiro_anterior h where h.escritorio_id = p_escritorio and h.cliente_id = p_cliente and h.desfeito_em is null limit 1),
    'importacao', (select jsonb_build_object('id', i.id, 'arquivo', i.arquivo_nome, 'em', i.importado_em)
                     from importacoes i where i.id = (select h.importacao_id from historico_financeiro_anterior h
                                                       where h.escritorio_id = p_escritorio and h.cliente_id = p_cliente and h.desfeito_em is null
                                                       order by h.criado_em desc limit 1)),
    'lembretes', (select coalesce(jsonb_agg(jsonb_build_object('id', l.id, 'valor', l.valor_em_aberto_centavos, 'lancamentos', l.lancamentos,
                                                               'caso', case when c.id is not null then jsonb_build_object('id', c.id, 'nome', c.nome) end,
                                                               'contratoAtivo', lembrete_contrato_ativo(l))
                                            order by l.criado_em), '[]'::jsonb)
                    from lembrete_contrato l left join casos c on c.id = l.caso_id
                   where l.escritorio_id = p_escritorio and l.cliente_id = p_cliente and l.resolvido_em is null and l.desfeito_em is null
                     and l.dispensado_em is null),
    'dispensados', (select coalesce(jsonb_agg(jsonb_build_object('id', l.id, 'valor', l.valor_em_aberto_centavos,
                                                                 'caso', case when c.id is not null then jsonb_build_object('id', c.id, 'nome', c.nome) end,
                                                                 'motivo', l.dispensa_motivo, 'detalhe', l.dispensa_detalhe,
                                                                 'em', l.dispensado_em, 'por', pessoa_ref(l.dispensado_por))
                                              order by l.dispensado_em desc), '[]'::jsonb)
                      from lembrete_contrato l left join casos c on c.id = l.caso_id
                     where l.escritorio_id = p_escritorio and l.cliente_id = p_cliente and l.dispensado_em is not null and l.desfeito_em is null),
    'pago', (select coalesce(sum(valor_centavos), 0) from historico_financeiro_anterior
              where escritorio_id = p_escritorio and cliente_id = p_cliente and desfeito_em is null and situacao = 'PAGO'),
    'lancamentos', (select coalesce(jsonb_agg(jsonb_build_object('data', h.data, 'descricao', h.descricao, 'valor', h.valor_centavos,
                                                                 'situacao', h.situacao, 'caso', c.nome)
                                              order by h.data desc nulls last, h.linha), '[]'::jsonb)
                      from (select * from historico_financeiro_anterior
                             where escritorio_id = p_escritorio and cliente_id = p_cliente and desfeito_em is null
                             order by data desc nulls last, linha limit 50) h
                      left join casos c on c.id = h.caso_id),
    'total', (select count(*) from historico_financeiro_anterior where escritorio_id = p_escritorio and cliente_id = p_cliente and desfeito_em is null)));
end $$;

-- ---------------------------------------------------------------------------------------
-- 9. As travas.

-- M1: o desfazer do financeiro, corpo da 0820 (renomeado na 0920), com as travas do histórico e
-- depois dos lembretes, em ordem de id, antes dos dois UPDATEs: a mesma ordem da exclusão e da
-- rotina (historico_anterior_excluido_limpar). Sem isso, a exclusão e o desfazer da mesma
-- importação podiam se travar (40P01).
create or replace function imp_desfazer_cf(p_pessoa uuid, p_escritorio uuid, p_importacao uuid, p_motivo text) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  i importacoes;
  v_motivo text := btrim(coalesce(p_motivo, ''));
  v_plano jsonb;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'clientes.editar');
  select * into i from importacoes where id = p_importacao and escritorio_id = p_escritorio for update;
  if i.id is null or i.o_que <> 'FINANCEIRO' then return imp_desfazer_cc(p_pessoa, p_escritorio, p_importacao, p_motivo); end if;
  if i.estado not in ('CONCLUIDA', 'DESFEITA') then raise exception 'Importação não encontrada' using errcode = 'TC404'; end if;
  if i.estado = 'DESFEITA' then perform recusar_motivo('A importação já foi desfeita', 'JA_DESFEITA'); end if;
  if i.criado_por <> p_pessoa and not e_socio_dono(p_pessoa, p_escritorio) then
    raise exception 'Só quem importou ou a sócia dona desfaz' using errcode = 'TC401', detail = jsonb_build_object('motivo', 'SEM_PERMISSAO')::text;
  end if;
  if i.desfazer_ate < app_now() then perform recusar_motivo('O prazo de desfazer acabou', 'PRAZO_ENCERRADO'); end if;
  if length(v_motivo) not between 3 and 300 then perform recusar_campos('Escreva o motivo', 'motivo'); end if;
  v_plano := imp_desfazer_plano(i);
  perform 1 from historico_financeiro_anterior where importacao_id = i.id and desfeito_em is null order by id for update;
  perform 1 from lembrete_contrato where importacao_id = i.id and desfeito_em is null and resolvido_em is null order by id for update;
  update historico_financeiro_anterior set desfeito_em = app_now() where importacao_id = i.id and desfeito_em is null;
  update lembrete_contrato set desfeito_em = app_now() where importacao_id = i.id and desfeito_em is null and resolvido_em is null;

  perform definir_transicao('DESFEITA', v_motivo);
  update importacoes set estado = 'DESFEITA', desfeita_em = app_now(), desfeita_por = p_pessoa, motivo_desfazer = v_motivo
   where id = i.id returning * into i;
  perform registrar_historico('importacao.desfeita', 'importacoes', i.id::text, jsonb_build_object('motivo', v_motivo) || (v_plano - 'mexidos'));
  return imp_json(i, p_pessoa) || jsonb_build_object('feito', v_plano);
end $$;

-- M2: dispensar, corpo da 0921. Lê o cliente do lembrete sem trava, trava o cliente (FOR SHARE, que
-- espera a exclusão em andamento) e só então o lembrete: a mesma ordem da exclusão. O cliente
-- excluído é recusado, para nenhum texto livre novo nascer depois da exclusão.
create or replace function portal_lembrete_dispensar(p_pessoa uuid, p_escritorio uuid, p_lembrete uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  l lembrete_contrato;
  c contratos;
  v_motivo text;
  v_det text;
  e text[] := '{}';
  v_cli uuid;
  v_estado text;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'CONTRATOS');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'contratos.editar');
  select x.cliente_id into v_cli from lembrete_contrato x where x.id = p_lembrete and x.escritorio_id = p_escritorio;
  if v_cli is null then raise exception 'Lembrete não encontrado' using errcode = 'TC404'; end if;
  select k.estado into v_estado from clientes_escritorio k where k.id = v_cli and k.escritorio_id = p_escritorio for share;
  if v_estado = 'EXCLUIDO' then perform recusar_motivo('O cliente foi excluído', 'CLIENTE_EXCLUIDO'); end if;
  l := lembrete_para_mudar(p_escritorio, p_lembrete);
  if l.resolvido_em is not null then
    select * into c from contratos where id = l.contrato_id;
    raise exception 'O lembrete já virou contrato' using errcode = 'TC409',
      detail = jsonb_build_object('motivo', 'JA_RESOLVIDO', 'contrato', jsonb_build_object('id', c.id, 'numero', c.numero),
                                  'por', pessoa_ref(c.criado_por), 'em', c.criado_em)::text;
  end if;
  if l.dispensado_em is not null then
    raise exception 'O lembrete já foi dispensado' using errcode = 'TC409',
      detail = jsonb_build_object('motivo', 'JA_DISPENSADO', 'por', pessoa_ref(l.dispensado_por), 'em', l.dispensado_em)::text;
  end if;
  v_motivo := case when jsonb_typeof(p_dados) = 'object' then p_dados ->> 'motivo' end;
  v_det := case when jsonb_typeof(p_dados) = 'object' then btrim(coalesce(p_dados ->> 'detalhe', '')) end;
  if length(coalesce(v_det, '')) < 3 then v_det := null; end if;
  if v_motivo is null or v_motivo not in ('JA_NEGOCIADO', 'PERDOADO', 'OUTRO_CONTRATO', 'OUTRO') then e := e || 'motivo'::text; end if;
  if length(v_det) > 140 or (v_motivo = 'OUTRO' and v_det is null) then e := e || 'detalhe'::text; end if;
  if cardinality(e) > 0 then
    raise exception 'Escolha o motivo' using errcode = 'TC422',
      detail = jsonb_build_object('motivo', 'MOTIVO_OBRIGATORIO', 'campos', to_jsonb(e))::text;
  end if;
  update lembrete_contrato set dispensado_em = app_now(), dispensado_por = p_pessoa, dispensa_motivo = v_motivo, dispensa_detalhe = v_det,
         trazido_em = null, trazido_por = null
   where id = l.id returning * into l;
  perform registrar_historico('cliente.lembrete_dispensado', 'cliente', l.cliente_id::text,
    jsonb_build_object('lembrete', l.id, 'motivo', v_motivo, 'detalhe', v_det, 'valor', l.valor_em_aberto_centavos,
                       'caso', l.caso_id, 'importacao', l.importacao_id));
  return jsonb_build_object('lembrete', lembrete_linha(l)) || lembretes_totais(p_escritorio);
end $$;

-- M2: trazer de volta, corpo da 0921. A trava no cliente (FOR UPDATE, que também espera o contrato
-- que está sendo criado) passa a vir antes da do lembrete, como na exclusão; o cliente excluído é
-- recusado com o motivo, e não cai no TC023 genérico do guardião do detalhe.
create or replace function portal_lembrete_trazer(p_pessoa uuid, p_escritorio uuid, p_lembrete uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  l lembrete_contrato;
  c contratos;
  v_antes lembrete_contrato;
  v_cli uuid;
  v_estado text;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'CONTRATOS');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'contratos.editar');
  select x.cliente_id into v_cli from lembrete_contrato x where x.id = p_lembrete and x.escritorio_id = p_escritorio;
  if v_cli is null then raise exception 'Lembrete não encontrado' using errcode = 'TC404'; end if;
  select k.estado into v_estado from clientes_escritorio k where k.id = v_cli and k.escritorio_id = p_escritorio for update;
  if v_estado = 'EXCLUIDO' then perform recusar_motivo('O cliente foi excluído', 'CLIENTE_EXCLUIDO'); end if;
  l := lembrete_para_mudar(p_escritorio, p_lembrete);
  if l.cliente_id <> v_cli then raise exception 'Lembrete não encontrado' using errcode = 'TC404'; end if;
  if l.dispensado_em is null then perform recusar_motivo_409('O lembrete não está dispensado', 'NAO_DISPENSADO'); end if;
  v_antes := l;
  -- Um contrato posterior ao lembrete que não o resolveu só pode ter nascido enquanto ele estava dispensado.
  select * into c from contratos
   where escritorio_id = p_escritorio and cliente_id = l.cliente_id and criado_em >= l.criado_em
   order by criado_em, numero limit 1;
  update lembrete_contrato set dispensado_em = null, dispensado_por = null, dispensa_motivo = null, dispensa_detalhe = null,
         trazido_em = app_now(), trazido_por = p_pessoa,
         resolvido_em = case when c.id is not null then c.criado_em end, contrato_id = c.id
   where id = l.id returning * into l;
  perform registrar_historico('cliente.lembrete_trazido', 'cliente', l.cliente_id::text,
    jsonb_build_object('lembrete', l.id, 'motivoAntes', v_antes.dispensa_motivo, 'detalheAntes', v_antes.dispensa_detalhe,
                       'dispensadoPor', v_antes.dispensado_por, 'dispensadoEm', v_antes.dispensado_em, 'virouContrato', c.id));
  return jsonb_build_object('lembrete', lembrete_linha(l)) || lembretes_totais(p_escritorio);
end $$;

-- ---------------------------------------------------------------------------------------
-- 10. Os clientes excluídos antes desta migration (a 1117 chama), no molde de
-- financeiro_preencher_excluidos (1092). O evento leva antes: true quando houve troca, ou quando há
-- algo guardado e o cliente ainda não tem o evento. Devolve {escritório: {clientes, trocados,
-- guardados, detalhesTrocados, detalhesGuardados}}. Idempotente: chamada de novo, devolve {}.
create function historico_anterior_preencher_excluidos() returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_guarda text := coalesce(current_setting('t3jus.fim_da_guarda', true), '');
  v_prazos text := coalesce(current_setting('t3jus.aplicando_prazos', true), '');
  r record;
  v jsonb;
  v_esc jsonb := '{}'::jsonb;
  v_um jsonb;
begin
  perform limpar_contexto();
  perform set_config('t3jus.fim_da_guarda', 'on', true);
  perform set_config('t3jus.aplicando_prazos', 'on', true);
  for r in select c.id, c.escritorio_id from clientes_escritorio c where c.estado = 'EXCLUIDO' order by c.escritorio_id, c.id loop
    v := historico_anterior_excluido_limpar(r.escritorio_id, r.id);
    if (v ->> 'trocados')::integer + (v ->> 'detalhesTrocados')::integer > 0
       or ((v ->> 'guardados')::integer + (v ->> 'detalhesGuardados')::integer > 0
           and not exists (select 1 from historico x where x.escritorio_id = r.escritorio_id and x.entidade = 'cliente'
                            and x.entidade_id = r.id::text and x.acao = 'cliente.historico_anterior_guardado')) then
      perform historico_do_cliente(r.escritorio_id, r.id, 'cliente.historico_anterior_guardado', v || jsonb_build_object('antes', true));
      v_um := coalesce(v_esc -> r.escritorio_id::text,
                       '{"clientes": 0, "trocados": 0, "guardados": 0, "detalhesTrocados": 0, "detalhesGuardados": 0}'::jsonb);
      v_esc := v_esc || jsonb_build_object(r.escritorio_id::text, jsonb_build_object(
        'clientes', (v_um ->> 'clientes')::integer + 1,
        'trocados', (v_um ->> 'trocados')::integer + (v ->> 'trocados')::integer,
        'guardados', (v_um ->> 'guardados')::integer + (v ->> 'guardados')::integer,
        'detalhesTrocados', (v_um ->> 'detalhesTrocados')::integer + (v ->> 'detalhesTrocados')::integer,
        'detalhesGuardados', (v_um ->> 'detalhesGuardados')::integer + (v ->> 'detalhesGuardados')::integer));
    end if;
  end loop;
  perform set_config('t3jus.fim_da_guarda', v_guarda, true);
  perform set_config('t3jus.aplicando_prazos', v_prazos, true);
  return v_esc;
end $$;

-- ---------------------------------------------------------------------------------------
-- 11. Inventário (PT-11): a base legal com a obrigação legal (LGPD, art. 7º, II e 16, I), o marco no
-- prazo e o destino no pedido do titular. A situação continua APROVADO, com o ok da Carol antes do
-- merge (como na 1092).
update inventario_dados
   set base_legal = 'Execução de contrato, exercício regular de direitos e obrigação legal (LGPD, art. 7º, V, VI e II)',
       prazo = 'Enquanto o escritório for cliente do T3jus e 5 anos depois do fim do contrato; a descrição do lançamento de cliente excluído, até a decadência do imposto do ano dele (5 anos, CTN 173, I)',
       no_fim = 'Exportados ao escritório e apagados com ele. De cliente excluído, a descrição do lançamento fica até 1º de janeiro do 7º ano depois do lançamento e vira texto fixo (LGPD, art. 16, I)'
 where tabela = 'historico_financeiro_anterior';
update inventario_dados
   set base_legal = 'Execução de contrato, exercício regular de direitos e obrigação legal (LGPD, art. 7º, V, VI e II)',
       prazo = 'Enquanto o escritório for cliente do T3jus e 5 anos depois do fim do contrato; o detalhe da dispensa de cliente excluído, até a decadência do imposto dos lançamentos dele (5 anos, CTN 173, I)',
       no_fim = 'Exportados ao escritório e apagados com ele. De cliente excluído, o detalhe da dispensa fica até 1º de janeiro do 7º ano depois dos lançamentos que explica e vira texto fixo (LGPD, art. 16, I)'
 where tabela = 'lembrete_contrato';

call fechar_acesso();
