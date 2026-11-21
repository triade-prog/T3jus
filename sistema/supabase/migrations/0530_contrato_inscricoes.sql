-- 0530 · Quais inscrições na OAB de cada advogado vão no contrato e na procuração (EX-12, F3.74).
-- Tela aprovada pela Carol em 20/11/2026: docs/design/aprovadas/portal-equipe-oab (decisões 14
-- a 21 e a decisão 2 da Carol).
-- - Cada contrato guarda as inscrições escolhidas de cada advogado. O padrão é todas as ativas,
--   com a principal primeiro; quem cria escolhe e fica pelo menos uma por advogado.
-- - Uma inscrição nova de alguém não entra sozinha nos contratos que já existem; entra nos novos.
-- - Se a sócia dona remove na Equipe a inscrição escolhida, ela sai dos documentos novos daquele
--   contrato. Se não sobra nenhuma escolhida e a pessoa ainda tem outra, o contrato usa todas as
--   que restam e a ficha avisa. Sem nenhuma, a ficha mostra "sem OAB" (decisão 16).
-- - Mudar marca removido_em e cria linhas novas; nada se apaga (PT-03). A mudança vai para o
--   histórico do contrato com o antes e o depois.
-- As funções de criar e mudar o contrato continuam as de 0200: as rotas chamam os invólucros
-- daqui, na mesma transação, que gravam a escolha depois.

create table contrato_advogado_oab (
  id                uuid primary key default gen_random_uuid(),
  escritorio_id     uuid not null references escritorios (id) on delete restrict,
  contrato_id       uuid not null references contratos (id) on delete restrict,
  pessoa_id         uuid not null references pessoas (id) on delete restrict,
  oab_inscricao_id  uuid not null references oab_inscricao (id) on delete restrict,
  criado_por        uuid references pessoas (id) on delete restrict,
  criado_em         timestamptz not null default app_now(),
  removido_em       timestamptz,
  removido_por      uuid references pessoas (id) on delete restrict
);
create unique index contrato_advogado_oab_unica on contrato_advogado_oab (contrato_id, oab_inscricao_id) where removido_em is null;
create index contrato_advogado_oab_contrato on contrato_advogado_oab (escritorio_id, contrato_id, pessoa_id);
call proteger_tabela_escritorio('contrato_advogado_oab');

insert into inventario_dados (tabela, dado_pessoal, o_que, para_que, base_legal, controlador, prazo, no_fim, situacao, exportar) values
 ('contrato_advogado_oab', false, 'Quais inscrições na OAB de cada advogado vão nos documentos de cada contrato, com quem escolheu e quando',
  null, null, null, null, null, null, true);

-- A inscrição precisa ser ativa, da mesma pessoa e do mesmo escritório, e a pessoa precisa ser
-- advogada do contrato.
create function contrato_advogado_oab_guarda() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'A escolha da inscrição não se apaga' using errcode = 'TC023';
  end if;
  if tg_op = 'UPDATE' then
    if old.removido_em is not null or new.contrato_id <> old.contrato_id or new.pessoa_id <> old.pessoa_id
       or new.oab_inscricao_id <> old.oab_inscricao_id then
      raise exception 'A escolha da inscrição não muda; marque a remoção e crie outra' using errcode = 'TC023';
    end if;
    return new;
  end if;
  if not exists (select 1 from oab_inscricao i where i.id = new.oab_inscricao_id and i.pessoa_id = new.pessoa_id
                   and i.escritorio_id = new.escritorio_id and i.removido_em is null) then
    raise exception 'A inscrição não é desta pessoa' using errcode = 'TC422',
      detail = jsonb_build_object('motivo', 'INSCRICAO_DE_OUTRA_PESSOA')::text;
  end if;
  if not exists (select 1 from contrato_advogados a where a.contrato_id = new.contrato_id and a.pessoa_id = new.pessoa_id
                   and a.escritorio_id = new.escritorio_id) then
    raise exception 'A pessoa não é advogada deste contrato' using errcode = 'TC422';
  end if;
  return new;
end $$;
create trigger contrato_advogado_oab_guarda before insert or update or delete on contrato_advogado_oab
  for each row execute function contrato_advogado_oab_guarda();

-- Quem entra como advogado num contrato leva, de início, todas as inscrições ativas (decisão 20).
-- Quem já tinha escolha no contrato fica com ela: mudar o contrato regrava contrato_advogados.
create function contrato_advogado_oab_padrao() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from contrato_advogado_oab x where x.contrato_id = new.contrato_id and x.pessoa_id = new.pessoa_id
                   and x.removido_em is null) then
    insert into contrato_advogado_oab (escritorio_id, contrato_id, pessoa_id, oab_inscricao_id, criado_por)
    select new.escritorio_id, new.contrato_id, new.pessoa_id, i.id, contexto_pessoa()
      from oab_inscricao i
     where i.pessoa_id = new.pessoa_id and i.escritorio_id = new.escritorio_id and i.removido_em is null;
  end if;
  return new;
end $$;
create trigger contrato_advogado_oab_padrao after insert on contrato_advogados
  for each row execute function contrato_advogado_oab_padrao();

-- As escolhas de quem deixou de ser advogado do contrato saem com a data.
create function contrato_inscricoes_limpar(p_escritorio uuid, p_contrato uuid, p_autor uuid) returns void
language sql
set search_path = public
as $$
  update contrato_advogado_oab x set removido_em = app_now(), removido_por = p_autor
   where x.escritorio_id = p_escritorio and x.contrato_id = p_contrato and x.removido_em is null
     and not exists (select 1 from contrato_advogados a where a.contrato_id = x.contrato_id and a.pessoa_id = x.pessoa_id);
$$;

-- As inscrições que valem hoje para uma pessoa num contrato: as escolhidas que continuam ativas
-- na Equipe; se nenhuma sobrou, todas as ativas (decisão 20).
create function contrato_inscricoes_valem(p_escritorio uuid, p_contrato uuid, p_alvo uuid) returns uuid[]
language sql stable
set search_path = public
as $$
  select coalesce(
    (select array_agg(i.id) from contrato_advogado_oab x join oab_inscricao i on i.id = x.oab_inscricao_id
      where x.escritorio_id = p_escritorio and x.contrato_id = p_contrato and x.pessoa_id = p_alvo
        and x.removido_em is null and i.removido_em is null),
    (select array_agg(i.id) from oab_inscricao i
      where i.pessoa_id = p_alvo and i.escritorio_id = p_escritorio and i.removido_em is null))
$$;

-- A frase da OAB de cada advogado no documento deste contrato (decisão 17). Nula = sem OAB.
create function contrato_oab_frase(p_escritorio uuid, p_contrato uuid, p_alvo uuid) returns text
language sql stable
set search_path = public
as $$
  select case when cardinality(v) > 0 then oab_frase(p_alvo, p_escritorio, v) end
    from (select contrato_inscricoes_valem(p_escritorio, p_contrato, p_alvo) v) x
$$;

-- Confere {pessoaId: [inscrição, ...]}: só advogados marcados, pelo menos uma, e só inscrições
-- ativas da própria pessoa. Devolve os erros por campo ("inscricoes.<pessoa>") e o motivo.
create function contrato_inscricoes_erros(p_escritorio uuid, p_adv jsonb, p_insc jsonb) returns jsonb
language plpgsql stable
set search_path = public
as $$
declare
  e jsonb := '{}';
  k text;
  v jsonb;
  x text;
  v_p uuid;
  v_i uuid;
begin
  if p_insc is null or jsonb_typeof(p_insc) = 'null' then return e; end if;
  if jsonb_typeof(p_insc) <> 'object' then return jsonb_build_object('inscricoes', 'INSCRICOES_INVALIDAS'); end if;
  for k, v in select * from jsonb_each(p_insc) loop
    begin v_p := k::uuid; exception when others then v_p := null; end;
    if v_p is null or jsonb_typeof(p_adv) is distinct from 'array' or not p_adv ? k then
      e := e || jsonb_build_object('inscricoes', 'INSCRICOES_INVALIDAS');
      continue;
    end if;
    if jsonb_typeof(v) is distinct from 'array' or jsonb_array_length(v) > 30 then
      e := e || jsonb_build_object('inscricoes.' || k, 'INSCRICOES_INVALIDAS');
      continue;
    end if;
    if jsonb_array_length(v) = 0 then
      -- Quem não tem OAB não tem o que escolher; quem tem fica com pelo menos uma (decisão 14).
      if exists (select 1 from oab_inscricao i where i.pessoa_id = v_p and i.escritorio_id = p_escritorio and i.removido_em is null) then
        e := e || jsonb_build_object('inscricoes.' || k, 'INSCRICAO_OBRIGATORIA');
      end if;
      continue;
    end if;
    for x in select jsonb_array_elements_text(v) loop
      begin v_i := x::uuid; exception when others then v_i := null; end;
      if v_i is null or not exists (select 1 from oab_inscricao i where i.id = v_i and i.pessoa_id = v_p
                                      and i.escritorio_id = p_escritorio and i.removido_em is null) then
        e := e || jsonb_build_object('inscricoes.' || k, 'INSCRICAO_DE_OUTRA_PESSOA');
      end if;
    end loop;
  end loop;
  return e;
end $$;

create function contrato_inscricoes_recusar(p_erros jsonb) returns void
language plpgsql
set search_path = public
as $$
begin
  if p_erros <> '{}' then
    raise exception 'Confira as inscrições' using errcode = 'TC422',
      detail = jsonb_build_object('campos', (select jsonb_agg(k) from jsonb_object_keys(p_erros) k), 'motivos', p_erros)::text;
  end if;
end $$;

-- As escolhas de hoje de um contrato, para o histórico: {pessoa: [frase]}.
create function contrato_inscricoes_retrato(p_escritorio uuid, p_contrato uuid) returns jsonb
language sql stable
set search_path = public
as $$
  select coalesce(jsonb_object_agg(pe.nome, contrato_oab_frase(p_escritorio, p_contrato, a.pessoa_id)), '{}'::jsonb)
    from contrato_advogados a join pessoas pe on pe.id = a.pessoa_id
   where a.escritorio_id = p_escritorio and a.contrato_id = p_contrato
$$;

-- Troca a escolha de uma pessoa no contrato pelas inscrições dadas (já conferidas).
create function contrato_inscricoes_gravar(p_escritorio uuid, p_contrato uuid, p_alvo uuid, p_ids uuid[], p_autor uuid) returns void
language sql
set search_path = public
as $$
  update contrato_advogado_oab set removido_em = app_now(), removido_por = p_autor
   where escritorio_id = p_escritorio and contrato_id = p_contrato and pessoa_id = p_alvo and removido_em is null
     and not (oab_inscricao_id = any (p_ids));
  insert into contrato_advogado_oab (escritorio_id, contrato_id, pessoa_id, oab_inscricao_id, criado_por)
  select p_escritorio, p_contrato, p_alvo, i, p_autor from unnest(p_ids) i
   where not exists (select 1 from contrato_advogado_oab x where x.contrato_id = p_contrato and x.oab_inscricao_id = i and x.removido_em is null);
$$;

-- Grava as escolhas que vieram no formulário ({pessoa: [ids]}); quem não veio fica como está.
create function contrato_inscricoes_aplicar(p_escritorio uuid, p_contrato uuid, p_insc jsonb, p_autor uuid) returns void
language plpgsql
set search_path = public
as $$
declare
  k text;
  v jsonb;
begin
  perform contrato_inscricoes_limpar(p_escritorio, p_contrato, p_autor);
  if p_insc is null or jsonb_typeof(p_insc) <> 'object' then return; end if;
  for k, v in select * from jsonb_each(p_insc) loop
    if jsonb_array_length(v) > 0 then
      perform contrato_inscricoes_gravar(p_escritorio, p_contrato, k::uuid,
        array(select jsonb_array_elements_text(v)::uuid), p_autor);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------------------
-- Rotas.

-- Novo contrato com a escolha das inscrições (POST /v1/escritorio/contratos).
create function portal_contrato_criar_oab(p_pessoa uuid, p_escritorio uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r jsonb;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'CONTRATOS');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'contratos.editar');
  perform contrato_inscricoes_recusar(contrato_inscricoes_erros(p_escritorio, p_dados -> 'advogados', p_dados -> 'inscricoes'));
  r := portal_contrato_criar(p_pessoa, p_escritorio, p_dados - 'inscricoes');
  perform contrato_inscricoes_aplicar(p_escritorio, (r ->> 'id')::uuid, p_dados -> 'inscricoes', p_pessoa);
  return r;
end $$;

-- Mudar o contrato com a escolha das inscrições (PUT /v1/escritorio/contratos/:id).
create function portal_contrato_condicoes_oab(p_pessoa uuid, p_escritorio uuid, p_contrato uuid, p_versao integer, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r jsonb;
  v_antes jsonb;
  v_depois jsonb;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'CONTRATOS');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'contratos.editar');
  perform contrato_inscricoes_recusar(contrato_inscricoes_erros(p_escritorio, p_dados -> 'advogados', p_dados -> 'inscricoes'));
  v_antes := contrato_inscricoes_retrato(p_escritorio, p_contrato);
  r := portal_contrato_condicoes(p_pessoa, p_escritorio, p_contrato, p_versao, p_dados - 'inscricoes');
  perform contrato_inscricoes_aplicar(p_escritorio, p_contrato, p_dados -> 'inscricoes', p_pessoa);
  v_depois := contrato_inscricoes_retrato(p_escritorio, p_contrato);
  if v_antes <> v_depois then
    perform registrar_historico('contrato.inscricoes_mudadas', 'contratos', p_contrato::text,
      jsonb_build_object('antes', v_antes, 'depois', v_depois));
  end if;
  return r;
end $$;

-- Mudar inscrições na ficha (decisão 19): só as inscrições; quem é advogado não muda por aqui.
-- PUT /v1/escritorio/contratos/:id/advogados/:pessoa/inscricoes, com a versão do contrato.
create function portal_contrato_inscricoes_mudar(p_pessoa uuid, p_escritorio uuid, p_contrato uuid, p_alvo uuid, p_versao integer, p_ids jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c contratos;
  v_versao integer;
  v_antes text;
  v_depois text;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'CONTRATOS');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'contratos.editar');
  select * into c from contratos where id = p_contrato and escritorio_id = p_escritorio;
  if c.id is null then raise exception 'Contrato não encontrado' using errcode = 'TC404'; end if;
  if c.estado = 'ENCERRADO' then perform recusar_motivo('O contrato está encerrado', 'CONTRATO_ENCERRADO'); end if;
  if not exists (select 1 from contrato_advogados a where a.contrato_id = c.id and a.pessoa_id = p_alvo) then
    raise exception 'Advogado não encontrado neste contrato' using errcode = 'TC404';
  end if;
  perform contrato_inscricoes_recusar(contrato_inscricoes_erros(p_escritorio, jsonb_build_array(p_alvo::text),
    jsonb_build_object(p_alvo::text, coalesce(p_ids, '[]'::jsonb))));
  update contratos set versao = versao where id = c.id and escritorio_id = p_escritorio and versao = p_versao
  returning versao into v_versao;
  if v_versao is null then perform conflito_versao('contratos', c.id); end if;
  v_antes := contrato_oab_frase(p_escritorio, c.id, p_alvo);
  perform contrato_inscricoes_gravar(p_escritorio, c.id, p_alvo, array(select jsonb_array_elements_text(p_ids)::uuid), p_pessoa);
  v_depois := contrato_oab_frase(p_escritorio, c.id, p_alvo);
  if v_antes is distinct from v_depois then
    perform registrar_historico('contrato.inscricoes_mudadas', 'contratos', c.id::text,
      jsonb_build_object('antes', jsonb_build_object((select nome from pessoas where id = p_alvo), v_antes),
                         'depois', jsonb_build_object((select nome from pessoas where id = p_alvo), v_depois)));
  end if;
  return jsonb_build_object('id', c.id, 'versao', v_versao, 'frase', v_depois);
end $$;

-- O que a ficha do contrato mostra em Responsáveis (decisões 16, 18 e 20).
create function portal_contrato_inscricoes(p_pessoa uuid, p_escritorio uuid, p_contrato uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform entrar_area(p_pessoa, p_escritorio, 'CONTRATOS');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'contratos.ver');
  if not exists (select 1 from contratos where id = p_contrato and escritorio_id = p_escritorio) then
    raise exception 'Contrato não encontrado' using errcode = 'TC404';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'pessoaId', a.pessoa_id,
             'frase', contrato_oab_frase(p_escritorio, p_contrato, a.pessoa_id),
             'inscricoes', (select coalesce(jsonb_agg(oab_linha(i) || jsonb_build_object('escolhida', i.id = any (v.ids))
                                                     order by i.tipo <> 'PRINCIPAL', i.ordem), '[]'::jsonb)
                              from oab_inscricao i where i.pessoa_id = a.pessoa_id and i.escritorio_id = p_escritorio and i.removido_em is null),
             -- As escolhidas foram removidas na Equipe e o contrato passou a usar as que restam.
             'usaTodas', not exists (select 1 from contrato_advogado_oab x join oab_inscricao i on i.id = x.oab_inscricao_id
                                      where x.contrato_id = p_contrato and x.pessoa_id = a.pessoa_id and x.removido_em is null and i.removido_em is null)
                         and cardinality(v.ids) > 0
                         and exists (select 1 from contrato_advogado_oab x where x.contrato_id = p_contrato and x.pessoa_id = a.pessoa_id)) order by pe.nome)
      from contrato_advogados a join pessoas pe on pe.id = a.pessoa_id
      cross join lateral (select coalesce(contrato_inscricoes_valem(p_escritorio, p_contrato, a.pessoa_id), '{}') ids) v
     where a.escritorio_id = p_escritorio and a.contrato_id = p_contrato), '[]'::jsonb);
end $$;

-- As pessoas da equipe com as inscrições ativas, para marcar os advogados do contrato.
create function portal_pessoas_oab(p_pessoa uuid, p_escritorio uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform entrar_area(p_pessoa, p_escritorio, 'CONTRATOS');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'contratos.ver');
  return coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'nome', p.nome, 'oab', oab_inscricoes(p.id, p_escritorio)) order by p.nome)
                     from (select distinct v.pessoa_id from vinculos v
                            where v.escritorio_id = p_escritorio and v.funcao in ('SOCIO', 'EQUIPE') and v.revogado_em is null) v
                     join pessoas p on p.id = v.pessoa_id), '[]'::jsonb);
end $$;

call fechar_acesso();
