-- 1161 · Teste grátis de 7 dias, parte da cobrança (F1.32; CO-09, DC12). Plano revisado em
-- project-files t3jus/co-09/plano-v2.md (seções 1.2, 7, 8 e 9 e "Decisões da Carol") e revisao.md,
-- com o desenho aprovado em docs/design/aprovadas/teste-gratis (NOTAS.md, as 8 recomendações).
-- Parte da 1160 (F1.31, aplicada) e da 1170 (CO-10, carnê com o valor de cada parcela, aplicada).
--
-- 1. Nenhuma fatura no teste. Um gatilho em assinaturas (teste_guarda_cobranca) guarda o começo
--    da cobrança, seja qual for a versão de cobranca_comecar (a 1170 a recria e vem depois desta
--    na ordem dos arquivos; seção 3). Sem linha de teste, ou com a chave desligada no cadastro
--    (com_teste = false), é a regra antiga: o dia de hoje, ao passar para Ativo. Com teste, só com
--    a assinatura confirmada e:
--      - DISPENSADO: o dia da confirmação (o teste não existiu);
--      - com o teste começado: fim + 1 (o dia seguinte ao último dia, em Brasília), ou o dia da
--        confirmação, se ela vier depois. Antes disso, nada: assinar no dia 2 não antecipa, e
--        passar para Ativo no teste também não.
--    A primeira mensalidade continua sendo a do mês seguinte ao começo (Carol, pergunta 1, A), e o
--    desconto lançado antes da cobrança anda junto (1170, desconto_meses).
-- 2. A rotina da cobrança. cobranca_rotina (a da 0690, nunca recriada) vira cobranca_rotina_sem_teste
--    e é envolvida: antes, a rotina começa a cobrança de quem tem teste, assinatura confirmada, sem
--    cobrança e com o dia do começo já chegado. Sem pg_cron novo: o t3jus-cobranca chama o mesmo nome.
--    Com a rotina parada num dia, o começo continua sendo fim + 1 (não o dia em que a rotina rodou).
-- 3. A confirmação da assinatura pelo Console (console_assinatura_confirmar, ação
--    console.assinatura.confirmar: Administração e Financeiro), com "como o escritório confirmou"
--    de uma lista fixa e o detalhe obrigatório até 300 letras (desenho, decisão 6). As duas portas
--    (Console agora; o Portal no F1.38) passam por assinatura_confirmar. Grava assinada_* em
--    assinaturas, assinatura.confirmada em fatura_eventos e no histórico interno.
--    Recusas: SEM_TESTE_GRATIS (sem linha de teste ou com a chave desligada: segue a regra antiga),
--    TESTE_SEM_PRIMEIRO_ACESSO (previsto), TESTE_REPETIDO (libere ou dispense antes), JA_ASSINADO,
--    ASSINATURA_NAO_PREPARADA, CONTRATO_ENCERRADO, conflito de versão da assinatura e os campos.
-- 4. A situação ganha ASSINADO (teste começado e assinatura confirmada, antes, durante ou depois do
--    fim). Com ele, portal_trava_escrita deixa de devolver TESTE_ENCERRADO. Quem só pediu "Quero
--    assinar" e não foi confirmado continua com a trava no dia 8 (desenho, decisão 1).
--    O DISPENSADO continua DISPENSADO depois da confirmação (desenho, estado tg-dispensado).
--    Assinado, o teste não se prorroga nem se dispensa mais (JA_ASSINADO).
-- 5. O carnê com desconto: a 1170 (CO-10) já dá a cada parcela o valor do mês dela e faz o desconto
--    lançado antes da cobrança contar da 1ª fatura dentro de cobranca_comecar, depois da linha que
--    o gatilho acerta, o que vale também quando a cobrança começa pela rotina em fim + 1. Por isso
--    a recusa CARNE_COM_DESCONTO do plano (seção 1.2) não é necessária e não existe.
--
-- Concorrência: a confirmação trava a linha do teste e depois a da assinatura (for update); a
-- rotina e cobranca_comecar (1170) travam a assinatura antes de conferir. Duas confirmações dão
-- uma e JA_ASSINADO; a confirmação (ou o Ativo) e a rotina ao mesmo tempo começam a cobrança uma
-- vez só (tests/concorrencia/assinatura-confirmar-simultanea.sh).

-- ---------------------------------------------------------------------------------------
-- 1. Quem confirma e onde fica a confirmação

insert into funcao_acoes (funcao, acao) values
  ('ADMINISTRACAO', 'console.assinatura.confirmar'),
  ('FINANCEIRO',    'console.assinatura.confirmar');

alter table assinaturas
  add column assinada_em      timestamptz,
  add column assinada_por     uuid references pessoas (id) on delete restrict,
  add column assinada_canal   text check (assinada_canal in ('CONSOLE', 'PORTAL')),
  add column assinada_como    text check (assinada_como in ('PORTAL', 'EMAIL', 'WHATSAPP', 'REUNIAO_OU_LIGACAO', 'OUTRO')),
  add column assinada_detalhe text check (length(btrim(assinada_detalhe)) between 1 and 300),
  add constraint assinaturas_assinada check (
    (assinada_em is null) = (assinada_por is null) and (assinada_em is null) = (assinada_canal is null)
    and (assinada_em is null) = (assinada_como is null) and (assinada_em is null) = (assinada_detalhe is null));
comment on column assinaturas.assinada_em is 'Quando a assinatura foi confirmada (CO-09). Com teste grátis, a cobrança só começa com ela';
comment on column assinaturas.assinada_como is 'Como o escritório confirmou: pediu no Portal, e-mail, WhatsApp, reunião ou ligação, ou outro (desenho, decisão 6)';

update inventario_dados
   set o_que = 'Assinatura do escritório: plano, preço, dia, forma, e-mail de cobrança, CNPJ da nota, desconto, só consulta e confirmação (quando, quem, como e detalhe)'
 where tabela = 'assinaturas';

-- Leitura protegida da assinatura (a mesma marca de portal_so_consulta_desde, 0690): a trava roda
-- em toda escrita, também fora do contexto que enxerga a assinatura.
create function assinatura_do_teste(p_escritorio uuid) returns assinaturas
language plpgsql
set search_path = public
as $$
declare a assinaturas; v_antes text := current_setting('t3jus.contando_planos', true);
begin
  perform set_config('t3jus.contando_planos', 'on', true);
  select * into a from assinaturas where escritorio_id = p_escritorio;
  perform set_config('t3jus.contando_planos', coalesce(v_antes, ''), true);
  return a;
end $$;

-- ---------------------------------------------------------------------------------------
-- 2. A situação ganha ASSINADO (refeita a partir da 1160)

create or replace function teste_situacao_de(t testes_gratis) returns text
language plpgsql
set search_path = public
as $$
declare v text;
begin
  v := case
    when t.id is null then null
    when not t.com_teste then 'SEM_TESTE'
    when t.dispensado_em is not null then 'DISPENSADO'
    when t.repetido_em is not null and t.liberado_em is null then 'REPETIDO'
    when t.inicio is null then 'PREVISTO'
    when hoje_brasilia() <= t.fim then 'EM_TESTE'
    else 'ACABOU' end;
  -- Só o teste começado é confirmado (assinatura_confirmar); a leitura da assinatura fica só aqui.
  if v in ('EM_TESTE', 'ACABOU') and (assinatura_do_teste(t.escritorio_id)).assinada_em is not null then
    return 'ASSINADO';
  end if;
  return v;
end $$;

-- O dia em que a cobrança começa (ou começaria) para quem tem teste, ou nulo: sem assinatura
-- confirmada, ou com o teste ainda sem datas. Regra no cabeçalho, item 1.
create function teste_inicio_cobranca(t testes_gratis, p_assinada_em timestamptz) returns date
language sql
stable
set search_path = public
as $$
  select case
    when p_assinada_em is null or t.id is null or not t.com_teste then null
    when t.dispensado_em is not null then (p_assinada_em at time zone 'America/Sao_Paulo')::date
    when t.fim is null then null
    else greatest(t.fim + 1, (p_assinada_em at time zone 'America/Sao_Paulo')::date) end
$$;

-- O bloco das telas (refeito a partir da 1160): o dia atual vale também para o assinado dentro do
-- teste, e entram a confirmação e o começo da cobrança. O detalhe e quem confirmou são da equipe.
create or replace function teste_json(p_escritorio uuid, p_interno boolean) returns jsonb
language plpgsql
set search_path = public
as $$
declare t testes_gratis := teste_ler(p_escritorio); a assinaturas; v_sit text; v jsonb;
begin
  if t.id is null then return null; end if;
  v_sit := teste_situacao_de(t);
  a := assinatura_do_teste(p_escritorio);
  v := jsonb_build_object(
    'situacao', v_sit,
    'primeiroAcessoEm', t.primeiro_acesso_em,
    'diaUm', (t.primeiro_acesso_em at time zone 'America/Sao_Paulo')::date,
    'inicio', t.inicio, 'fim', t.fim,
    'soConsultaDesde', t.fim + 1,
    'totalDias', t.fim - t.inicio + 1,
    'diaAtual', case when v_sit in ('EM_TESTE', 'ASSINADO') and hoje_brasilia() between t.inicio and t.fim
                     then hoje_brasilia() - t.inicio + 1 end,
    'versao', t.versao)
    -- Só com a assinatura confirmada (ou a cobrança começada): o bloco de antes não muda.
    || jsonb_strip_nulls(jsonb_build_object(
    'assinadaEm', a.assinada_em,
    'cobrancaComecaEm', coalesce(a.inicio_cobranca, teste_inicio_cobranca(t, a.assinada_em))));
  if p_interno then
    v := v || jsonb_build_object(
      'repetidoEm', t.repetido_em,
      'dispensa', case when t.dispensado_em is not null then jsonb_build_object(
        'em', t.dispensado_em, 'motivo', t.dispensado_motivo, 'porId', t.dispensado_por,
        'por', (select nome from pessoas where id = t.dispensado_por)) end,
      'liberacao', case when t.liberado_em is not null then jsonb_build_object(
        'em', t.liberado_em, 'motivo', t.liberado_motivo, 'porId', t.liberado_por,
        'por', (select nome from pessoas where id = t.liberado_por)) end,
      'confirmacao', case when a.assinada_em is not null then jsonb_build_object(
        'em', a.assinada_em, 'canal', a.assinada_canal, 'como', a.assinada_como, 'detalhe', a.assinada_detalhe,
        'porId', a.assinada_por, 'por', (select nome from pessoas where id = a.assinada_por)) end);
  end if;
  return v;
end $$;

-- ---------------------------------------------------------------------------------------
-- 3. O começo da cobrança: a guarda do teste fica num gatilho da assinatura

-- Por que um gatilho e não uma nova cobranca_comecar: a 1170 (CO-10) recria cobranca_comecar e
-- vem depois desta na ordem dos arquivos, embora tenha sido aplicada antes no Supabase. Num banco
-- novo (test-db.sh, CI, o projeto de desenvolvimento), ela apagaria uma guarda posta na função. O
-- gatilho vale para qualquer versão de cobranca_comecar (0690 ou 1170) e para todos os que a chamam
-- (o Ativo, a assinatura preparada já Ativa, a rotina e a confirmação), nas duas ordens.
--
-- No instante em que inicio_cobranca deixa de ser nulo: sem linha de teste ou com com_teste
-- desligado, nada muda (regra antiga). Com teste, antes do dia do começo a mudança é desfeita
-- (return null: cobranca_comecar não grava nada, não registra evento e não emite fatura); no dia,
-- ou depois dele (a rotina parada), o começo fica no dia certo e a primeira competência é o mês
-- seguinte a ele. O desconto que anda com a 1ª competência (1170) lê a linha já acertada.
create function teste_guarda_cobranca() returns trigger
language plpgsql
set search_path = public
as $$
declare t testes_gratis; v_inicio date;
begin
  t := teste_ler(new.escritorio_id);
  if t.id is null or not t.com_teste then return new; end if;
  v_inicio := teste_inicio_cobranca(t, new.assinada_em);
  if v_inicio is null or v_inicio > hoje_brasilia() then return null; end if;
  new.inicio_cobranca := v_inicio;
  new.primeira_competencia := (competencia_de(v_inicio) + interval '1 month')::date;
  perform registrar_historico('teste.cobranca_comecou', 'testes_gratis', t.id::text, jsonb_build_object(
    'inicio_cobranca', new.inicio_cobranca, 'primeira_competencia', new.primeira_competencia,
    'origem', case when t.dispensado_em is not null then 'DISPENSADO' else 'FIM_DO_TESTE' end));
  return new;
end $$;
create trigger teste_guarda_cobranca before update of inicio_cobranca on assinaturas
  for each row when (old.inicio_cobranca is null and new.inicio_cobranca is not null)
  execute function teste_guarda_cobranca();

-- ---------------------------------------------------------------------------------------
-- 4. A rotina da cobrança: o passo do teste antes da rotina de sempre

alter function cobranca_rotina() rename to cobranca_rotina_sem_teste;
-- Só a nova chama a de antes: sem security definer, a API não pula o passo do teste.
alter function cobranca_rotina_sem_teste() security invoker;

create function cobranca_rotina() returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  e uuid;
  a assinaturas;
  v_lista uuid[];
  v_comecou integer := 0;
  v_emitidas integer := 0;
  v jsonb;
begin
  perform limpar_contexto();
  perform set_config('t3jus.lendo_teste', 'on', true);
  select coalesce(array_agg(escritorio_id order by escritorio_id), '{}') into v_lista
    from testes_gratis where com_teste and (dispensado_em is not null or fim < hoje_brasilia());
  perform set_config('t3jus.lendo_teste', '', true);
  foreach e in array v_lista loop
    perform entrar_escritorio_servico(e);
    -- Com a trava: quem espera outra transação (a confirmação ou o Ativo) relê a linha e não começa
    -- de novo; a cobrança contada é só a que esta rotina começou. Um escritório com erro não para
    -- os outros nem a rotina de sempre: fica para o dia seguinte, com o aviso no log.
    select * into a from assinaturas where escritorio_id = e for update;
    continue when a.id is null or a.inicio_cobranca is not null or a.assinada_em is null
               or contrato_situacao(e) not in ('ABERTO', 'MARCADO');
    begin
      perform cobranca_comecar(e);
      if (select inicio_cobranca from assinaturas where id = a.id) is not null then
        v_comecou := v_comecou + 1;
        v_emitidas := v_emitidas + (select count(*)::int from faturas where assinatura_id = a.id);
      end if;
    exception when others then
      raise warning 'cobranca_rotina: teste do escritorio % nao comecou: %', e, sqlerrm;
    end;
  end loop;
  perform limpar_contexto();
  v := cobranca_rotina_sem_teste();
  return v || jsonb_build_object('emitidas', (v ->> 'emitidas')::int + v_emitidas, 'testesComecados', v_comecou);
end $$;

-- ---------------------------------------------------------------------------------------
-- 5. A confirmação da assinatura

-- A porta comum (Console agora, Portal no F1.38). Roda dentro da função da API, com o escritório
-- e a pessoa do contexto. Devolve a assinatura confirmada.
create function assinatura_confirmar(p_escritorio uuid, p_versao integer, p_canal text, p_dados jsonb) returns assinaturas
language plpgsql
set search_path = public
as $$
declare
  t testes_gratis;
  a assinaturas;
  v_sit text;
  v_como text := p_dados ->> 'como';
  v_detalhe text := btrim(coalesce(p_dados ->> 'detalhe', ''));
  v_campos text[] := '{}';
  v_antes text := current_setting('t3jus.cobrando', true);
begin
  if p_canal is null or p_canal not in ('CONSOLE', 'PORTAL') then
    raise exception 'Canal da confirmação desconhecido' using errcode = 'TC422';
  end if;
  if coalesce(v_como, '') not in ('PORTAL', 'EMAIL', 'WHATSAPP', 'REUNIAO_OU_LIGACAO', 'OUTRO') then
    v_campos := v_campos || 'como'::text;
  end if;
  if length(v_detalhe) not between 1 and 300 then v_campos := v_campos || 'detalhe'::text; end if;
  if cardinality(v_campos) > 0 then
    raise exception 'Confira a confirmação da assinatura' using errcode = 'TC422',
      detail = jsonb_build_object('campos', to_jsonb(v_campos))::text;
  end if;
  if contrato_situacao(p_escritorio) not in ('ABERTO', 'MARCADO') then
    perform recusar_motivo('O contrato deste escritório foi encerrado', 'CONTRATO_ENCERRADO');
  end if;

  -- A ordem das travas: o teste, depois a assinatura (a mesma de prorrogar e dispensar, que só
  -- travam o teste).
  select * into t from testes_gratis where escritorio_id = p_escritorio for update;
  if t.id is null or not t.com_teste then
    perform recusar_motivo('Este escritório segue a regra antiga: a cobrança começa ao passar para Ativo', 'SEM_TESTE_GRATIS');
  end if;
  select * into a from assinaturas where escritorio_id = p_escritorio for update;
  v_sit := teste_situacao_de(t);
  if v_sit = 'ASSINADO' or a.assinada_em is not null then
    perform recusar_motivo('A assinatura deste escritório já foi confirmada', 'JA_ASSINADO');
  end if;
  if v_sit = 'PREVISTO' then
    perform recusar_motivo('O teste ainda não começou: nenhum sócio entrou no Portal', 'TESTE_SEM_PRIMEIRO_ACESSO');
  end if;
  if v_sit = 'REPETIDO' then
    perform recusar_motivo('O teste repetido espera a decisão da Administração: libere ou dispense o teste antes', 'TESTE_REPETIDO');
  end if;
  if a.id is null then
    perform recusar_motivo('A assinatura ainda não foi preparada', 'ASSINATURA_NAO_PREPARADA');
  end if;
  if p_versao is null or a.versao <> p_versao then perform conflito_cobranca('assinaturas', a.id); end if;

  perform cobranca_marcar(true);
  update assinaturas
     set assinada_em = app_now(), assinada_por = contexto_pessoa(), assinada_canal = p_canal,
         assinada_como = v_como, assinada_detalhe = v_detalhe
   where id = a.id returning * into a;
  perform cobranca_evento(a.id, null, 'assinatura.confirmada', jsonb_build_object(
    'canal', p_canal, 'como', v_como, 'situacaoTeste', v_sit,
    'cobrancaComecaEm', teste_inicio_cobranca(t, a.assinada_em)));
  perform registrar_historico_interno('assinatura.confirmada', 'assinaturas', a.id::text, jsonb_build_object(
    'canal', p_canal, 'como', v_como, 'detalhe', v_detalhe, 'situacao_teste', v_sit,
    'cobranca_comeca_em', teste_inicio_cobranca(t, a.assinada_em)));
  -- Dispensado, ou com o teste já acabado: a cobrança começa hoje. No teste, fica para a rotina.
  perform cobranca_comecar(p_escritorio);
  perform set_config('t3jus.cobrando', coalesce(v_antes, ''), true);
  select * into a from assinaturas where id = a.id;
  return a;
end $$;

create function console_assinatura_confirmar(p_pessoa uuid, p_escritorio uuid, p_versao integer, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare a assinaturas;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'console.assinatura.confirmar');
  a := assinatura_confirmar(p_escritorio, p_versao, 'CONSOLE', coalesce(p_dados, '{}'::jsonb));
  return jsonb_build_object('versao', a.versao, 'assinadaEm', a.assinada_em,
    'inicioCobranca', a.inicio_cobranca, 'primeiraCompetencia', a.primeira_competencia,
    'teste', teste_json(p_escritorio, true));
end $$;

-- ---------------------------------------------------------------------------------------
-- 6. Assinado, o teste não se dispensa nem se prorroga (refeitas a partir da 1160)

create or replace function console_teste_dispensar(p_pessoa uuid, p_escritorio uuid, p_versao integer, p_motivo text) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare t testes_gratis; v_motivo text; v_antes text;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'console.teste.dispensar');
  v_motivo := motivo_valido(p_motivo);
  t := teste_para_mudar(p_escritorio, p_versao);
  v_antes := teste_situacao_de(t);
  if v_antes = 'DISPENSADO' then perform recusar_motivo('O teste já foi dispensado', 'TESTE_JA_DISPENSADO'); end if;
  if v_antes = 'ASSINADO' then perform recusar_motivo('A assinatura deste escritório já foi confirmada', 'JA_ASSINADO'); end if;
  update testes_gratis set dispensado_em = app_now(), dispensado_motivo = v_motivo, dispensado_por = p_pessoa
   where id = t.id returning * into t;
  perform registrar_historico_interno('teste.dispensado', 'testes_gratis', t.id::text,
    jsonb_build_object('motivo', v_motivo, 'situacao_antes', v_antes));
  return jsonb_build_object('versao', t.versao, 'teste', teste_json(p_escritorio, true));
end $$;

create or replace function console_teste_prorrogar(p_pessoa uuid, p_escritorio uuid, p_versao integer, p_fim date, p_motivo text) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare t testes_gratis; v_motivo text; v_fim_antes date; v_sit text;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'console.teste.prorrogar');
  v_motivo := motivo_valido(p_motivo);
  t := teste_para_mudar(p_escritorio, p_versao);
  v_sit := teste_situacao_de(t);
  if v_sit = 'ASSINADO' then perform recusar_motivo('A assinatura deste escritório já foi confirmada', 'JA_ASSINADO'); end if;
  if v_sit not in ('EM_TESTE', 'ACABOU') then
    perform recusar_motivo('Só dá para prorrogar o teste que já começou', 'TESTE_NAO_COMECOU');
  end if;
  if p_fim is null or p_fim <= t.fim or p_fim < hoje_brasilia() then
    raise exception 'O novo último dia precisa ser depois do último dia de agora e não antes de hoje' using errcode = 'TC422',
      detail = jsonb_build_object('motivo', 'PRORROGAR_DATA', 'campos', jsonb_build_array('fim'))::text;
  end if;
  v_fim_antes := t.fim;
  update testes_gratis set fim = p_fim where id = t.id returning * into t;
  perform registrar_historico_interno('teste.prorrogado', 'testes_gratis', t.id::text,
    jsonb_build_object('motivo', v_motivo, 'fim_antes', v_fim_antes, 'fim_novo', t.fim, 'situacao_antes', v_sit));
  return jsonb_build_object('versao', t.versao, 'teste', teste_json(p_escritorio, true));
end $$;

call fechar_acesso();
