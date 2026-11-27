-- 1160 · Teste grátis de 7 dias no servidor, parte do teste (F1.31; CO-09, DC12). Plano revisado em
-- project-files t3jus/co-09/plano-v2.md (seções 1.2, 2, 4 e 7.1) e revisao.md, com as decisões da
-- Carol de 27/11/2026, e desenho aprovado em docs/design/aprovadas/teste-gratis (NOTAS.md, as 8
-- recomendações). A cobrança só depois do teste e a confirmação da assinatura (cobranca_comecar,
-- cobranca_rotina, assinada_* e assinatura_confirmar) ficam para o F1.32, na 1161.
--
-- 1. testes_gratis: uma linha por escritório cadastrado daqui em diante (gatilho no insert da
--    carteira, que pega o cadastro direto e a conversão de interessado). com_teste guarda a chave
--    teste_gratis_ligado do dia do cadastro; a chave nasce desligada, e aí nada muda para ninguém.
--    Os escritórios de antes não ganham linha e seguem como estão.
-- 2. A situação sai das datas, não é guardada (teste_situacao): PREVISTO, EM_TESTE, ACABOU,
--    DISPENSADO e REPETIDO (o ASSINADO entra no F1.32). Sem linha, nulo; com a chave desligada no
--    cadastro, SEM_TESTE.
-- 3. O dia 1 é o primeiro acesso de um sócio. escolher_escritorio (a versão da 0210) vira
--    escolher_escritorio_sem_teste e é envolvida: depois da escolha, teste_marcar_primeiro_acesso
--    grava primeiro_acesso_em uma vez só (update ... where primeiro_acesso_em is null), com ou sem
--    teste, e, com o teste previsto, inicio = dia 1 e fim = dia 7 (inclusivo). Nunca dá erro: um
--    problema do teste não impede o login. Duas sessões ao mesmo tempo: só o primeiro update muda
--    a linha. escritorio_dia_um é o nome combinado com a frente CO-08 (plano, seção 2).
-- 4. Repetição: quem já teve vínculo SOCIO (inclusive revogado) num escritório cujo teste
--    começou deixa o teste REPETIDO, sem começar, até a Administração liberar (o teste começa no
--    dia da decisão) ou dispensar. O sócio vê o Portal só para consulta (SEM_ASSINATURA), sem o
--    motivo (desenho, decisão 7).
-- 5. Dia 8: portal_trava_escrita junta as travas da escrita de quem é do escritório:
--    PORTAL_SO_CONSULTA (atraso, 0690), TESTE_ENCERRADO (teste que acabou, pela data em Brasília,
--    sem esperar rotina) e SEM_ASSINATURA (repetido sem decisão). contrato_aceita_escrita e
--    portal_exigir_escrita são refeitas a partir da 0690 e usam a trava. O contrato encerrado vem
--    antes e vence o teste. Ler e exportar continuam; a equipe T3jus e as rotinas continuam. Quem
--    pediu "Quero assinar" e não foi confirmado passa pela trava do mesmo jeito (desenho, decisão 1).
-- 6. Só a Administração dispensa, libera o repetido e prorroga, sempre com motivo; prorrogar é
--    escolher a nova data do último dia (desenho, decisão 4), também depois do fim, enquanto o
--    contrato não for encerrado, e isso devolve a escrita na hora. Tudo vai para o histórico
--    interno; o começo do teste vai para o histórico do escritório.

-- ---------------------------------------------------------------------------------------
-- 1. Quem pode o quê e a chave

insert into funcao_acoes (funcao, acao) values
  ('ADMINISTRACAO', 'console.teste.ver'),
  ('IMPLANTACAO',   'console.teste.ver'),
  ('FINANCEIRO',    'console.teste.ver'),
  ('SUPORTE',       'console.teste.ver'),
  ('ADMINISTRACAO', 'console.teste.prorrogar'),
  ('ADMINISTRACAO', 'console.teste.liberar'),
  ('ADMINISTRACAO', 'console.teste.dispensar');

insert into configuracoes (chave, valor, descricao) values
  ('teste_gratis_ligado', 'false',
   'Teste grátis de 7 dias (CO-09, DC12) para os escritórios cadastrados enquanto estiver ligado; só liga com o inventário e os Termos de uso prontos');

create function teste_gratis_ligado() returns boolean
language sql stable set search_path = public
as $$ select coalesce(configuracao('teste_gratis_ligado') = 'true'::jsonb, false) $$;

-- ---------------------------------------------------------------------------------------
-- 2. A tabela

create table testes_gratis (
  id                 uuid primary key default gen_random_uuid(),
  escritorio_id      uuid not null unique references escritorios (id) on delete restrict,
  com_teste          boolean not null,
  criado_em          timestamptz not null default app_now(),
  -- Gravado uma vez, no primeiro acesso de um sócio, com ou sem teste (CO-08 lê daqui).
  primeiro_acesso_em timestamptz,
  -- Dia 1 e último dia (inclusivo), em datas de Brasília.
  inicio             date,
  fim                date,
  repetido_em        timestamptz,
  dispensado_em      timestamptz,
  dispensado_motivo  text check (length(btrim(dispensado_motivo)) between 1 and 300),
  dispensado_por     uuid references pessoas (id) on delete restrict,
  liberado_em        timestamptz,
  liberado_motivo    text check (length(btrim(liberado_motivo)) between 1 and 300),
  liberado_por       uuid references pessoas (id) on delete restrict,
  versao             integer not null default 1,
  constraint testes_gratis_datas check ((inicio is null) = (fim is null) and (fim is null or fim >= inicio + 6)),
  constraint testes_gratis_inicio_tem_acesso check (inicio is null or primeiro_acesso_em is not null),
  constraint testes_gratis_sem_teste check (com_teste or (inicio is null and repetido_em is null and dispensado_em is null)),
  constraint testes_gratis_dispensa check ((dispensado_em is null) = (dispensado_motivo is null)
                                            and (dispensado_em is null) = (dispensado_por is null)),
  constraint testes_gratis_liberacao check ((liberado_em is null) = (liberado_motivo is null)
                                             and (liberado_em is null) = (liberado_por is null)
                                             and (liberado_em is null or repetido_em is not null))
);
call proteger_tabela_escritorio('testes_gratis');

-- Leitura protegida, como a dos planos (0690) e a do acesso (0210): só dentro das funções abaixo,
-- que ligam a marca e a desligam ao sair. Serve à trava (que roda em toda escrita), à repetição
-- (que olha o teste dos outros escritórios da pessoa) e ao dia 1 da CO-08.
create policy lendo_teste on testes_gratis for select to dominio
  using (current_setting('t3jus.lendo_teste', true) = 'on');

insert into inventario_dados (tabela, dado_pessoal, o_que, para_que, base_legal, controlador, prazo, no_fim, situacao, exportar) values
 ('testes_gratis', true,
  'O teste grátis do escritório: primeiro acesso de um sócio, dia 1 e último dia, repetição, dispensa e liberação, com motivo e autor',
  'Dar ao escritório 7 dias de teste antes de assinar e evitar teste repetido (CO-09)', 'Execução de contrato (LGPD, art. 7º, V)', 'T3jus',
  'Enquanto o escritório for cliente do T3jus e 5 anos depois do fim do contrato', 'Apagada no fim da guarda, com o escritório', 'APROVADO', false);

-- O cadastro (console_criar_escritorio e console_interessado_converter) põe o escritório na
-- carteira dentro do contexto dele: a linha do teste nasce junto, com a chave do dia.
create function testes_gratis_ao_cadastrar() returns trigger
language plpgsql
set search_path = public
as $$
begin
  insert into testes_gratis (escritorio_id, com_teste) values (new.escritorio_id, teste_gratis_ligado());
  return new;
end $$;
create trigger testes_gratis_ao_cadastrar after insert on clientes
  for each row execute function testes_gratis_ao_cadastrar();

-- ---------------------------------------------------------------------------------------
-- 3. A situação e o dia 1

create function teste_situacao_de(t testes_gratis) returns text
language sql stable set search_path = public
as $$
  select case
    when t.id is null then null
    when not t.com_teste then 'SEM_TESTE'
    when t.dispensado_em is not null then 'DISPENSADO'
    when t.repetido_em is not null and t.liberado_em is null then 'REPETIDO'
    when t.inicio is null then 'PREVISTO'
    when hoje_brasilia() <= t.fim then 'EM_TESTE'
    else 'ACABOU' end
$$;

create function teste_ler(p_escritorio uuid) returns testes_gratis
language plpgsql
set search_path = public
as $$
declare t testes_gratis; v_antes text := current_setting('t3jus.lendo_teste', true);
begin
  perform set_config('t3jus.lendo_teste', 'on', true);
  select * into t from testes_gratis where escritorio_id = p_escritorio;
  perform set_config('t3jus.lendo_teste', coalesce(v_antes, ''), true);
  return t;
end $$;

create function teste_situacao(p_escritorio uuid) returns text
language sql
set search_path = public
as $$ select teste_situacao_de(teste_ler(p_escritorio)) $$;

-- Nome combinado com a frente CO-08 (plano, seção 2): o dia do primeiro acesso de um sócio, em
-- Brasília; nulo se ninguém entrou ou se o escritório não tem linha (os de antes da 1160).
create function escritorio_dia_um(p_escritorio uuid) returns date
language plpgsql
stable
set search_path = public
as $$
declare v timestamptz; v_antes text := current_setting('t3jus.lendo_teste', true);
begin
  perform set_config('t3jus.lendo_teste', 'on', true);
  select primeiro_acesso_em into v from testes_gratis where escritorio_id = p_escritorio;
  perform set_config('t3jus.lendo_teste', coalesce(v_antes, ''), true);
  return (v at time zone 'America/Sao_Paulo')::date;
end $$;

-- O que as telas do teste vão mostrar (F1.33 monta os blocos a partir daqui). Os motivos e quem
-- decidiu são da equipe: o Portal recebe só as datas e a situação.
create function teste_json(p_escritorio uuid, p_interno boolean) returns jsonb
language plpgsql
set search_path = public
as $$
declare t testes_gratis := teste_ler(p_escritorio); v_sit text; v jsonb;
begin
  if t.id is null then return null; end if;
  v_sit := teste_situacao_de(t);
  v := jsonb_build_object(
    'situacao', v_sit,
    'primeiroAcessoEm', t.primeiro_acesso_em,
    'diaUm', (t.primeiro_acesso_em at time zone 'America/Sao_Paulo')::date,
    'inicio', t.inicio, 'fim', t.fim,
    'soConsultaDesde', t.fim + 1,
    'totalDias', t.fim - t.inicio + 1,
    'diaAtual', case when v_sit = 'EM_TESTE' then hoje_brasilia() - t.inicio + 1 end,
    'versao', t.versao);
  if p_interno then
    v := v || jsonb_build_object(
      'repetidoEm', t.repetido_em,
      'dispensa', case when t.dispensado_em is not null then jsonb_build_object(
        'em', t.dispensado_em, 'motivo', t.dispensado_motivo, 'porId', t.dispensado_por,
        'por', (select nome from pessoas where id = t.dispensado_por)) end,
      'liberacao', case when t.liberado_em is not null then jsonb_build_object(
        'em', t.liberado_em, 'motivo', t.liberado_motivo, 'porId', t.liberado_por,
        'por', (select nome from pessoas where id = t.liberado_por)) end);
  end if;
  return v;
end $$;

-- ---------------------------------------------------------------------------------------
-- 4. O primeiro acesso

-- O aviso da repetição é interno (fala de outro escritório), mas nasce no acesso do sócio, sem o
-- contexto da equipe que registrar_historico_interno pede (0060). Esta política deixa o domínio
-- gravar só esse evento, como interno e no escritório do contexto, enquanto
-- teste_marcar_primeiro_acesso liga a marca (o mesmo molde de caso_pronto_historico, 0990).
create policy teste_historico on historico for insert to dominio
  with check (current_setting('t3jus.teste_historico', true) = 'on' and interno and acao = 'teste.repetido'
              and escritorio_id is not distinct from contexto_escritorio());

-- Chamada depois da escolha do escritório, com a sessão já validada. Só o vínculo SOCIO ativo
-- conta. Nunca dá erro: qualquer problema desfaz só o que ela fez e o login segue.
create function teste_marcar_primeiro_acesso(p_escritorio uuid, p_pessoa uuid) returns void
language plpgsql
set search_path = public
as $$
declare
  t testes_gratis;
  v_comeca boolean;
  v_repetido_de uuid;
  v_hoje date;
begin
  begin
    if p_escritorio is not null and p_pessoa is not null and p_pessoa = contexto_pessoa()
       and exists (select 1 from vinculos v where v.pessoa_id = p_pessoa and v.escritorio_id = p_escritorio
                      and v.funcao = 'SOCIO' and v.revogado_em is null) then
      t := teste_ler(p_escritorio);
      if t.id is not null and t.primeiro_acesso_em is null then
        v_hoje := hoje_brasilia();
        v_comeca := t.com_teste and t.dispensado_em is null and contrato_situacao(p_escritorio) in ('ABERTO', 'MARCADO');
        if v_comeca then
          -- Repetição pela pessoa: outro escritório em que ela foi sócia e o teste começou.
          perform set_config('t3jus.lendo_teste', 'on', true);
          select o.escritorio_id into v_repetido_de
            from vinculos x join testes_gratis o on o.escritorio_id = x.escritorio_id
           where x.pessoa_id = p_pessoa and x.funcao = 'SOCIO' and x.escritorio_id <> p_escritorio and o.inicio is not null
           order by o.inicio limit 1;
          perform set_config('t3jus.lendo_teste', '', true);
        end if;
        perform entrar_escritorio(p_pessoa, p_escritorio, 'escritorio.ver');
        perform set_config('t3jus.marcando_teste', 'on', true);
        update testes_gratis
           set primeiro_acesso_em = app_now(),
               inicio = case when v_comeca and v_repetido_de is null then v_hoje end,
               fim = case when v_comeca and v_repetido_de is null then v_hoje + 6 end,
               repetido_em = case when v_comeca and v_repetido_de is not null then app_now() end
         where id = t.id and primeiro_acesso_em is null
         returning * into t;
        if found then
          if t.inicio is not null then
            perform registrar_historico('teste.comecou', 'testes_gratis', t.id::text,
              jsonb_build_object('inicio', t.inicio, 'fim', t.fim, 'origem', 'PRIMEIRO_ACESSO'));
          elsif t.repetido_em is not null then
            perform set_config('t3jus.teste_historico', 'on', true);
            insert into historico (ocorrido_em, escritorio_id, autor_tipo, autor_id, acao, entidade, entidade_id, dados, interno)
            values (app_now(), p_escritorio, 'PESSOA', p_pessoa, 'teste.repetido', 'testes_gratis', t.id::text,
                    jsonb_build_object('escritorio_anterior_id', v_repetido_de), true);
            perform set_config('t3jus.teste_historico', '', true);
          end if;
        end if;
      end if;
    end if;
  exception when others then
    raise warning 'Teste grátis: o primeiro acesso não foi marcado (%)', sqlerrm;
  end;
  perform set_config('t3jus.marcando_teste', '', true);
  perform set_config('t3jus.teste_historico', '', true);
  perform set_config('t3jus.lendo_teste', '', true);
end $$;

alter function escolher_escritorio(uuid, uuid, uuid) rename to escolher_escritorio_sem_teste;
-- Só a nova chama a de antes: sem security definer, a API não consegue pular a marcação.
alter function escolher_escritorio_sem_teste(uuid, uuid, uuid) security invoker;

create function escolher_escritorio(p_pessoa uuid, p_sessao uuid, p_escritorio uuid) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform escolher_escritorio_sem_teste(p_pessoa, p_sessao, p_escritorio);
  perform teste_marcar_primeiro_acesso(p_escritorio, p_pessoa);
end $$;

-- ---------------------------------------------------------------------------------------
-- 5. A trava da escrita (dia 8)

-- O motivo que impede quem é do escritório de gravar, ou nulo. O contrato encerrado é conferido
-- antes, por quem chama, e vence.
create function portal_trava_escrita(p_escritorio uuid) returns text
language plpgsql
set search_path = public
as $$
declare v_sit text;
begin
  if portal_so_consulta_desde(p_escritorio) is not null then return 'PORTAL_SO_CONSULTA'; end if;
  v_sit := teste_situacao(p_escritorio);
  return case v_sit when 'ACABOU' then 'TESTE_ENCERRADO' when 'REPETIDO' then 'SEM_ASSINATURA' end;
end $$;

create function recusar_trava_escrita(p_motivo text) returns void
language plpgsql
set search_path = public
as $$
begin
  raise exception '%', case p_motivo
      when 'PORTAL_SO_CONSULTA' then 'O Portal está só para consulta por uma pendência com o T3jus'
      when 'TESTE_ENCERRADO' then 'O teste grátis terminou: o Portal está só para consulta'
      when 'SEM_ASSINATURA' then 'A equipe do T3jus está liberando o seu acesso'
      else 'O Portal está só para consulta' end
    using errcode = 'TC401', detail = jsonb_build_object('motivo', p_motivo)::text;
end $$;

create or replace function contrato_aceita_escrita() returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_linha jsonb := to_jsonb(coalesce(new, old));
  v_escritorio uuid := case when tg_table_name = 'escritorios' then (v_linha ->> 'id')::uuid
                            else (v_linha ->> 'escritorio_id')::uuid end;
  v_trava text;
begin
  if current_setting('t3jus.aplicando_prazos', true) = 'on' or current_setting('t3jus.mudando_contrato', true) = 'on'
     or current_setting('t3jus.cobrando', true) = 'on' or current_setting('t3jus.marcando_teste', true) = 'on' then
    return coalesce(new, old);
  end if;
  if tg_table_name = 'vinculos' and not exists (select 1 from funcoes f where f.codigo = v_linha ->> 'funcao' and f.sistema = 'PORTAL') then
    return coalesce(new, old);
  end if;
  if contrato_situacao(v_escritorio) in ('CONSULTA', 'FECHADO') then
    raise exception 'O contrato terminou: o Portal está só para consulta' using errcode = 'TC401',
      detail = jsonb_build_object('motivo', 'CONTRATO_ENCERRADO')::text;
  end if;
  if contexto_pessoa() is not null and not contexto_equipe() then
    v_trava := portal_trava_escrita(v_escritorio);
    if v_trava is not null then perform recusar_trava_escrita(v_trava); end if;
  end if;
  return coalesce(new, old);
end $$;

-- A API confere antes de criar a conta de um convite no Auth.
create or replace function portal_exigir_escrita(p_pessoa uuid, p_escritorio uuid) returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_trava text;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'escritorio.ver');
  if contrato_situacao(p_escritorio) <> 'ABERTO' and contrato_situacao(p_escritorio) <> 'MARCADO' then
    raise exception 'O contrato terminou: o Portal está só para consulta' using errcode = 'TC401',
      detail = jsonb_build_object('motivo', 'CONTRATO_ENCERRADO')::text;
  end if;
  if not contexto_equipe() then
    v_trava := portal_trava_escrita(p_escritorio);
    if v_trava is not null then perform recusar_trava_escrita(v_trava); end if;
  end if;
end $$;

-- ---------------------------------------------------------------------------------------
-- 6. O Console: ver, dispensar, liberar o repetido e prorrogar

create function console_teste(p_pessoa uuid, p_escritorio uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'console.teste.ver');
  return teste_json(p_escritorio, true);
end $$;

-- A linha para mudar, já travada, com as recusas comuns às três ações.
create function teste_para_mudar(p_escritorio uuid, p_versao integer) returns testes_gratis
language plpgsql
set search_path = public
as $$
declare t testes_gratis;
begin
  select * into t from testes_gratis where escritorio_id = p_escritorio for update;
  if t.id is null or not t.com_teste then
    perform recusar_motivo('Este escritório não tem teste grátis', 'SEM_TESTE_GRATIS');
  end if;
  if p_versao is null or t.versao <> p_versao then perform conflito_versao('testes_gratis', t.id); end if;
  if contrato_situacao(p_escritorio) not in ('ABERTO', 'MARCADO') then
    perform recusar_motivo('O contrato deste escritório foi encerrado', 'CONTRATO_ENCERRADO');
  end if;
  return t;
end $$;

-- Pilotos e fundadores (DC12): o teste não começa mais. Vale antes, durante e depois do teste.
create function console_teste_dispensar(p_pessoa uuid, p_escritorio uuid, p_versao integer, p_motivo text) returns jsonb
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
  update testes_gratis set dispensado_em = app_now(), dispensado_motivo = v_motivo, dispensado_por = p_pessoa
   where id = t.id returning * into t;
  perform registrar_historico_interno('teste.dispensado', 'testes_gratis', t.id::text,
    jsonb_build_object('motivo', v_motivo, 'situacao_antes', v_antes));
  return jsonb_build_object('versao', t.versao, 'teste', teste_json(p_escritorio, true));
end $$;

-- O teste repetido, liberado com motivo, começa no dia da decisão (desenho, tg-repetido).
create function console_teste_liberar(p_pessoa uuid, p_escritorio uuid, p_versao integer, p_motivo text) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare t testes_gratis; v_motivo text; v_hoje date := hoje_brasilia();
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'console.teste.liberar');
  v_motivo := motivo_valido(p_motivo);
  t := teste_para_mudar(p_escritorio, p_versao);
  if teste_situacao_de(t) <> 'REPETIDO' then
    perform recusar_motivo('Só o teste repetido espera ser liberado', 'TESTE_NAO_REPETIDO');
  end if;
  update testes_gratis set liberado_em = app_now(), liberado_motivo = v_motivo, liberado_por = p_pessoa,
                           inicio = v_hoje, fim = v_hoje + 6
   where id = t.id returning * into t;
  perform registrar_historico_interno('teste.liberado', 'testes_gratis', t.id::text,
    jsonb_build_object('motivo', v_motivo, 'inicio', t.inicio, 'fim', t.fim));
  perform registrar_historico('teste.comecou', 'testes_gratis', t.id::text,
    jsonb_build_object('inicio', t.inicio, 'fim', t.fim, 'origem', 'LIBERADO'));
  return jsonb_build_object('versao', t.versao, 'teste', teste_json(p_escritorio, true));
end $$;

-- Prorrogar é escolher a nova data do último dia (desenho, decisão 4): depois do último dia de
-- agora e não antes de hoje. Vale também depois do fim, e a escrita volta na hora.
create function console_teste_prorrogar(p_pessoa uuid, p_escritorio uuid, p_versao integer, p_fim date, p_motivo text) returns jsonb
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
