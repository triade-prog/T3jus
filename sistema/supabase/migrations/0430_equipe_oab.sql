-- 0430 · A OAB de cada advogado na Equipe (EX-12), tela aprovada pela Carol em 20/11/2026:
-- docs/design/aprovadas/portal-equipe-oab.
-- - Cada pessoa pode ter mais de uma inscrição: a principal (uma só) e as suplementares. A
--   principal vem primeiro nos documentos. Guardamos só os dígitos do número e a letra à parte,
--   repetida como está na carteira (decisões 9 e 10).
-- - Só a sócia dona inclui, muda e remove (Equipe); cada pessoa confere a própria OAB em Sua
--   conta, só para ler, e o servidor devolve só as inscrições de quem está na sessão (decisão 7).
-- - O convite já aceita a OAB principal, opcional (decisão 6). Se o convite é cancelado ou a
--   pessoa sai da equipe, as inscrições dela saem junto (com a data; nada se apaga).
-- - Remover marca removido_em. Documentos já gerados guardam a frase da OAB do dia (PT-03).
-- Fica para depois (item pendente no painel): escolher as inscrições em cada contrato
-- (contrato_advogado_oab), que depende da geração dos documentos do contrato (CH-08).

create function uf_brasil(p text) returns boolean
language sql immutable
as $$ select p in ('AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR',
                   'RS','SC','SE','SP','TO') $$;

create table oab_inscricao (
  id             uuid primary key default gen_random_uuid(),
  ordem          bigint generated always as identity,
  escritorio_id  uuid not null references escritorios (id) on delete restrict,
  pessoa_id      uuid not null references pessoas (id) on delete restrict,
  uf             text not null check (uf_brasil(uf)),
  numero         text not null check (numero ~ '^[1-9][0-9]{0,5}$'),
  letra          text check (letra ~ '^[A-Z]$'),
  tipo           text not null check (tipo in ('PRINCIPAL', 'SUPLEMENTAR')),
  criado_por     uuid not null references pessoas (id) on delete restrict,
  criado_em      timestamptz not null default app_now(),
  removido_em    timestamptz,
  removido_por   uuid references pessoas (id) on delete restrict,
  versao         integer not null default 1,
  check ((removido_em is null) = (removido_por is null))
);
create unique index oab_inscricao_numero on oab_inscricao (escritorio_id, uf, numero) where removido_em is null;
create unique index oab_inscricao_uf on oab_inscricao (pessoa_id, escritorio_id, uf) where removido_em is null;
create unique index oab_inscricao_principal on oab_inscricao (pessoa_id, escritorio_id) where removido_em is null and tipo = 'PRINCIPAL';
create index oab_inscricao_escritorio on oab_inscricao (escritorio_id, pessoa_id);
call proteger_tabela_escritorio('oab_inscricao');

-- Nada se apaga; depois de removida, a inscrição não muda mais.
create function oab_inscricao_guarda() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Inscrição na OAB não se apaga' using errcode = 'TC023';
  end if;
  if old.removido_em is not null
     or (new.id, new.ordem, new.escritorio_id, new.pessoa_id, new.criado_por, new.criado_em)
        is distinct from (old.id, old.ordem, old.escritorio_id, old.pessoa_id, old.criado_por, old.criado_em) then
    raise exception 'Inscrição removida não muda' using errcode = 'TC023';
  end if;
  return new;
end $$;
create trigger oab_inscricao_guarda before update or delete on oab_inscricao
  for each row execute function oab_inscricao_guarda();

insert into inventario_dados (tabela, dado_pessoal, o_que, para_que, base_legal, controlador, prazo, no_fim, situacao, exportar) values
 ('oab_inscricao', true, 'Inscrições na OAB de quem é da equipe: UF, número, letra e se é a principal',
  'Pôr o nome e a OAB de quem assina nos contratos, procurações e petições (EX-12)', 'Execução de contrato (LGPD, art. 7º, V)',
  'Escritório', 'Enquanto o escritório for cliente do T3jus e 5 anos depois do fim do contrato', 'Exportadas ao escritório e apagadas com ele', 'APROVADO', true);

-- ---------------------------------------------------------------------------------------
-- Peças.

-- "287104" → "287.104".
create function oab_numero_fmt(p text) returns text
language sql immutable
as $$ select regexp_replace(p, '([0-9])(?=([0-9]{3})+$)', '\1.', 'g') $$;

create function oab_linha(i oab_inscricao) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', i.id, 'uf', i.uf, 'numero', i.numero, 'letra', i.letra, 'tipo', i.tipo, 'versao', i.versao,
    'texto', 'OAB/' || i.uf || ' ' || oab_numero_fmt(i.numero) || coalesce('-' || i.letra, ''),
    'documento', 'OAB/' || i.uf || ' nº ' || oab_numero_fmt(i.numero) || coalesce('-' || i.letra, ''))
$$;

-- As inscrições ativas da pessoa no escritório: a principal primeiro, depois por data.
create function oab_inscricoes(p_alvo uuid, p_escritorio uuid) returns jsonb
language sql stable
set search_path = public
as $$
  select coalesce(jsonb_agg(oab_linha(i) order by i.tipo <> 'PRINCIPAL', i.ordem), '[]'::jsonb)
    from oab_inscricao i
   where i.pessoa_id = p_alvo and i.escritorio_id = p_escritorio and i.removido_em is null
$$;

-- A frase do documento: "OAB/SP nº 287.104 e OAB/RJ nº 245.880-S". Com p_ids, só essas.
create function oab_frase(p_alvo uuid, p_escritorio uuid, p_ids uuid[] default null) returns text
language sql stable
set search_path = public
as $$
  with t as (
    select row_number() over (order by i.tipo <> 'PRINCIPAL', i.ordem) n, count(*) over () total,
           'OAB/' || i.uf || ' nº ' || oab_numero_fmt(i.numero) || coalesce('-' || i.letra, '') doc
      from oab_inscricao i
     where i.pessoa_id = p_alvo and i.escritorio_id = p_escritorio and i.removido_em is null
       and (p_ids is null or i.id = any (p_ids)))
  select case when count(*) = 0 then null
              when count(*) = 1 then max(doc)
              else string_agg(doc, ', ' order by n) filter (where n < total) || ' e ' || max(doc) filter (where n = total) end
    from t
$$;

-- Os contratos em que a pessoa é advogada (ficha da pessoa e Sua conta).
create function oab_contratos_da_pessoa(p_alvo uuid, p_escritorio uuid) returns jsonb
language sql stable
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', c.id, 'numero', c.numero, 'estado', c.estado, 'responsavel', c.responsavel_id = p_alvo,
           'cliente', (select k.nome from clientes_escritorio k where k.id = c.cliente_id))
           order by c.criado_em desc), '[]'::jsonb)
    from contrato_advogados a join contratos c on c.id = a.contrato_id
   where a.pessoa_id = p_alvo and a.escritorio_id = p_escritorio and c.estado <> 'ENCERRADO'
$$;

-- Confere e normaliza a inscrição. Recusa com os campos e o código de cada erro, para a tela
-- prender a mensagem ao campo (decisões 8 a 12).
create function oab_conferir(p_dados jsonb, p_escritorio uuid, p_alvo uuid, p_ignorar uuid default null)
returns table (uf text, numero text, letra text)
language plpgsql
set search_path = public
as $$
#variable_conflict use_variable
declare
  v_uf text := upper(nullif(btrim(coalesce(p_dados ->> 'uf', '')), ''));
  v_bruto text := nullif(btrim(coalesce(p_dados ->> 'numero', '')), '');
  v_num text;
  v_letra text := upper(nullif(btrim(coalesce(p_dados ->> 'letra', '')), ''));
  e jsonb := '{}';
  v_outro text;
begin
  if v_uf is null and v_bruto is not null then e := e || jsonb_build_object('uf', 'UF_OBRIGATORIA');
  elsif v_uf is not null and not uf_brasil(v_uf) then e := e || jsonb_build_object('uf', 'UF_INVALIDA');
  end if;
  if v_bruto is null then
    if v_uf is not null or v_letra is not null then e := e || jsonb_build_object('numero', 'NUMERO_OBRIGATORIO'); end if;
  else
    v_num := ltrim(regexp_replace(v_bruto, '[\s.\-/]', '', 'g'), '0');
    if v_num !~ '^[0-9]{1,6}$' then
      e := e || jsonb_build_object('numero', 'NUMERO_INVALIDO');
    end if;
  end if;
  if v_letra is not null and v_letra !~ '^[A-Z]$' then e := e || jsonb_build_object('letra', 'LETRA_INVALIDA'); end if;
  if e = '{}'::jsonb and v_uf is null then
    e := jsonb_build_object('uf', 'UF_OBRIGATORIA', 'numero', 'NUMERO_OBRIGATORIO');
  end if;
  if e = '{}'::jsonb then
    select p.nome into v_outro from oab_inscricao i join pessoas p on p.id = i.pessoa_id
     where i.escritorio_id = p_escritorio and i.uf = v_uf and i.numero = v_num and i.removido_em is null
       and i.pessoa_id <> p_alvo limit 1;
    if v_outro is not null then
      raise exception 'Esta inscrição já é de outra pessoa da equipe' using errcode = 'TC422',
        detail = jsonb_build_object('campos', jsonb_build_array('numero'), 'motivos', jsonb_build_object('numero', 'OAB_DE_OUTRA_PESSOA'),
                                    'motivo', 'OAB_DE_OUTRA_PESSOA', 'nome', v_outro)::text;
    end if;
    if exists (select 1 from oab_inscricao i where i.escritorio_id = p_escritorio and i.pessoa_id = p_alvo and i.uf = v_uf
                and i.removido_em is null and i.id is distinct from p_ignorar) then
      e := jsonb_build_object('uf', 'UF_REPETIDA');
    end if;
  end if;
  if e <> '{}'::jsonb then
    raise exception 'Confira a inscrição na OAB.' using errcode = 'TC422',
      detail = jsonb_build_object('campos', (select jsonb_agg(k) from jsonb_object_keys(e) k), 'motivos', e)::text;
  end if;
  return query select v_uf, v_num, v_letra;
end $$;

-- A pessoa da equipe (vínculo ativo de SOCIO ou EQUIPE) ou 404.
create function equipe_alvo(p_alvo uuid, p_escritorio uuid) returns vinculos
language plpgsql stable
set search_path = public
as $$
declare v vinculos;
begin
  select * into v from vinculos
   where pessoa_id = p_alvo and escritorio_id = p_escritorio and funcao in ('SOCIO', 'EQUIPE') and revogado_em is null
   order by funcao = 'SOCIO' desc limit 1;
  if v.id is null then raise exception 'Pessoa não encontrada na equipe' using errcode = 'TC404'; end if;
  return v;
end $$;

-- Grava uma inscrição nova. "PRINCIPAL" quando a pessoa ainda não tem principal; quando já tem,
-- só com trocar = true a antiga passa a suplementar (a tela avisa antes de salvar).
create function oab_gravar(p_autor uuid, p_escritorio uuid, p_alvo uuid, p_dados jsonb) returns oab_inscricao
language plpgsql
set search_path = public
as $$
declare
  c record;
  v_tipo text := upper(coalesce(p_dados ->> 'tipo', 'PRINCIPAL'));
  i oab_inscricao;
begin
  if v_tipo not in ('PRINCIPAL', 'SUPLEMENTAR') then
    perform recusar_campos('Escolha o tipo da inscrição', 'tipo');
  end if;
  select * into c from oab_conferir(p_dados, p_escritorio, p_alvo);
  if v_tipo = 'PRINCIPAL' and exists (select 1 from oab_inscricao where pessoa_id = p_alvo and escritorio_id = p_escritorio
                                        and removido_em is null and tipo = 'PRINCIPAL') then
    if coalesce((p_dados ->> 'trocarPrincipal')::boolean, false) then
      update oab_inscricao set tipo = 'SUPLEMENTAR'
       where pessoa_id = p_alvo and escritorio_id = p_escritorio and removido_em is null and tipo = 'PRINCIPAL';
    else
      raise exception 'Esta pessoa já tem a inscrição principal' using errcode = 'TC422',
        detail = jsonb_build_object('campos', jsonb_build_array('tipo'), 'motivos', jsonb_build_object('tipo', 'PRINCIPAL_JA_EXISTE'))::text;
    end if;
  end if;
  insert into oab_inscricao (escritorio_id, pessoa_id, uf, numero, letra, tipo, criado_por)
  values (p_escritorio, p_alvo, c.uf, c.numero, c.letra, v_tipo, p_autor)
  returning * into i;
  perform registrar_historico('equipe.oab_incluida', 'oab_inscricao', i.id::text,
    jsonb_build_object('pessoa_id', p_alvo, 'inscricao', oab_linha(i) ->> 'texto', 'tipo', i.tipo));
  return i;
end $$;

-- ---------------------------------------------------------------------------------------
-- API do Portal.

-- A equipe ganha as inscrições de cada pessoa (a lista mostra a OAB embaixo do nome).
create or replace function portal_equipe(p_pessoa uuid, p_escritorio uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'escritorio.equipe.gerenciar');
  return (
    select coalesce(jsonb_agg(jsonb_build_object(
             'vinculoId', v.id, 'pessoaId', p.id, 'nome', p.nome, 'dono', v.funcao = 'SOCIO',
             'areas', to_jsonb(areas_da_pessoa(p.id, p_escritorio)), 'desde', v.criado_em, 'versao', v.versao,
             'senhaCriadaEm', p.senha_criada_em, 'conviteEnviadoEm', convite_enviado_em(v.id),
             'oab', oab_inscricoes(p.id, p_escritorio))
             order by v.funcao <> 'SOCIO', p.nome), '[]'::jsonb)
      from vinculos v join pessoas p on p.id = v.pessoa_id
     where v.escritorio_id = p_escritorio and v.funcao in ('SOCIO', 'EQUIPE') and v.revogado_em is null);
end $$;

-- A ficha da pessoa (só a sócia dona): dados, inscrições e os contratos em que ela é advogada.
create function portal_equipe_pessoa(p_pessoa uuid, p_escritorio uuid, p_alvo uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v vinculos;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'escritorio.equipe.gerenciar');
  v := equipe_alvo(p_alvo, p_escritorio);
  return (select jsonb_build_object(
      'vinculoId', v.id, 'pessoaId', p.id, 'nome', p.nome, 'dono', v.funcao = 'SOCIO',
      'areas', to_jsonb(areas_da_pessoa(p.id, p_escritorio)), 'desde', v.criado_em, 'versao', v.versao,
      'senhaCriadaEm', p.senha_criada_em, 'conviteEnviadoEm', convite_enviado_em(v.id),
      'oab', oab_inscricoes(p.id, p_escritorio), 'frase', oab_frase(p.id, p_escritorio),
      'contratos', oab_contratos_da_pessoa(p.id, p_escritorio))
    from pessoas p where p.id = p_alvo);
end $$;

create function portal_oab_incluir(p_pessoa uuid, p_escritorio uuid, p_alvo uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare i oab_inscricao;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'escritorio.equipe.gerenciar');
  perform portal_exigir_escrita(p_pessoa, p_escritorio);
  perform equipe_alvo(p_alvo, p_escritorio);
  i := oab_gravar(p_pessoa, p_escritorio, p_alvo, p_dados);
  return oab_linha(i) || jsonb_build_object('frase', oab_frase(p_alvo, p_escritorio));
end $$;

-- Mudar a inscrição (com a versão lida, PT-19). Marcar como principal troca a antiga para
-- suplementar quando trocarPrincipal vem marcado.
create function portal_oab_mudar(p_pessoa uuid, p_escritorio uuid, p_inscricao uuid, p_versao integer, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  a oab_inscricao;
  i oab_inscricao;
  c record;
  v_tipo text := upper(coalesce(p_dados ->> 'tipo', ''));
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'escritorio.equipe.gerenciar');
  perform portal_exigir_escrita(p_pessoa, p_escritorio);
  select * into a from oab_inscricao where id = p_inscricao and escritorio_id = p_escritorio and removido_em is null for update;
  if a.id is null then raise exception 'Inscrição não encontrada' using errcode = 'TC404'; end if;
  if a.versao <> p_versao then perform conflito_versao('oab_inscricao', a.id); end if;
  if v_tipo not in ('PRINCIPAL', 'SUPLEMENTAR') then perform recusar_campos('Escolha o tipo da inscrição', 'tipo'); end if;
  select * into c from oab_conferir(p_dados, p_escritorio, a.pessoa_id, a.id);
  if v_tipo = 'PRINCIPAL' and a.tipo <> 'PRINCIPAL' and exists (
       select 1 from oab_inscricao where pessoa_id = a.pessoa_id and escritorio_id = p_escritorio and removido_em is null and tipo = 'PRINCIPAL') then
    if coalesce((p_dados ->> 'trocarPrincipal')::boolean, false) then
      update oab_inscricao set tipo = 'SUPLEMENTAR'
       where pessoa_id = a.pessoa_id and escritorio_id = p_escritorio and removido_em is null and tipo = 'PRINCIPAL';
    else
      raise exception 'Esta pessoa já tem a inscrição principal' using errcode = 'TC422',
        detail = jsonb_build_object('campos', jsonb_build_array('tipo'), 'motivos', jsonb_build_object('tipo', 'PRINCIPAL_JA_EXISTE'))::text;
    end if;
  end if;
  update oab_inscricao set uf = c.uf, numero = c.numero, letra = c.letra, tipo = v_tipo
   where id = a.id returning * into i;
  if (a.uf, a.numero, a.letra, a.tipo) is distinct from (i.uf, i.numero, i.letra, i.tipo) then
    perform registrar_historico('equipe.oab_mudada', 'oab_inscricao', i.id::text,
      jsonb_build_object('pessoa_id', a.pessoa_id, 'antes', oab_linha(a) ->> 'texto', 'depois', oab_linha(i) ->> 'texto',
                         'tipoAntes', a.tipo, 'tipoDepois', i.tipo));
  end if;
  return oab_linha(i) || jsonb_build_object('frase', oab_frase(a.pessoa_id, p_escritorio));
end $$;

-- Remover: marca a data. Se era a principal e sobra outra, a mais antiga vira a principal.
create function portal_oab_remover(p_pessoa uuid, p_escritorio uuid, p_inscricao uuid, p_versao integer) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare a oab_inscricao;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'escritorio.equipe.gerenciar');
  perform portal_exigir_escrita(p_pessoa, p_escritorio);
  select * into a from oab_inscricao where id = p_inscricao and escritorio_id = p_escritorio and removido_em is null for update;
  if a.id is null then raise exception 'Inscrição não encontrada' using errcode = 'TC404'; end if;
  if a.versao <> p_versao then perform conflito_versao('oab_inscricao', a.id); end if;
  update oab_inscricao set removido_em = app_now(), removido_por = p_pessoa where id = a.id;
  if a.tipo = 'PRINCIPAL' then
    update oab_inscricao set tipo = 'PRINCIPAL'
     where id = (select id from oab_inscricao where pessoa_id = a.pessoa_id and escritorio_id = p_escritorio and removido_em is null
                  order by ordem limit 1);
  end if;
  perform registrar_historico('equipe.oab_removida', 'oab_inscricao', a.id::text,
    jsonb_build_object('pessoa_id', a.pessoa_id, 'inscricao', oab_linha(a) ->> 'texto'));
  return jsonb_build_object('frase', oab_frase(a.pessoa_id, p_escritorio));
end $$;

-- Sua conta: só a pessoa da sessão, só para ler (decisão 7).
create function portal_conta(p_pessoa uuid, p_escritorio uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v vinculos;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'escritorio.ver');
  v := equipe_alvo(p_pessoa, p_escritorio);
  return (select jsonb_build_object(
      'pessoaId', p.id, 'nome', p.nome, 'dono', v.funcao = 'SOCIO', 'desde', v.criado_em,
      'areas', to_jsonb(areas_da_pessoa(p.id, p_escritorio)),
      'oab', oab_inscricoes(p.id, p_escritorio), 'frase', oab_frase(p.id, p_escritorio),
      'contratos', (select coalesce(jsonb_agg(x || jsonb_build_object('inscricoes', oab_frase(p.id, p_escritorio))), '[]'::jsonb)
                      from jsonb_array_elements(oab_contratos_da_pessoa(p.id, p_escritorio)) x),
      'socios', (select coalesce(jsonb_agg(q.nome order by s.criado_em), '[]'::jsonb)
                   from vinculos s join pessoas q on q.id = s.pessoa_id
                  where s.escritorio_id = p_escritorio and s.funcao = 'SOCIO' and s.revogado_em is null))
    from pessoas p where p.id = p_pessoa);
end $$;

-- O convite aceita a OAB principal, opcional (decisão 6). Mesma assinatura com p_oab no fim.
drop function portal_convidar(uuid, uuid, uuid, text, text[]);
create function portal_convidar(p_pessoa uuid, p_escritorio uuid, p_convidado uuid, p_nome text, p_areas text[], p_oab jsonb default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vinculo uuid;
  v_areas text[];
  v_oab jsonb := case when p_oab is null or jsonb_typeof(p_oab) <> 'object'
                        or coalesce(nullif(btrim(p_oab ->> 'uf'), ''), nullif(btrim(p_oab ->> 'numero'), ''), nullif(btrim(p_oab ->> 'letra'), '')) is null
                      then null else p_oab end;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'escritorio.equipe.gerenciar');
  if length(btrim(coalesce(p_nome, ''))) not between 1 and 120 then
    perform recusar_campos('Escreva o nome da pessoa', 'nome');
  end if;
  v_areas := areas_validas(p_areas);
  perform garantir_pessoa(p_convidado, p_nome);
  if exists (select 1 from vinculos v join funcoes f on f.codigo = v.funcao
              where v.pessoa_id = p_convidado and v.escritorio_id = p_escritorio and f.sistema = 'PORTAL' and v.revogado_em is null) then
    perform recusar_motivo('Esta pessoa já está na equipe', 'JA_NA_EQUIPE');
  end if;
  insert into vinculos (pessoa_id, escritorio_id, funcao, criado_por)
  values (p_convidado, p_escritorio, 'EQUIPE', p_pessoa)
  returning id into v_vinculo;
  insert into areas_liberadas (escritorio_id, vinculo_id, area, criado_por)
  select p_escritorio, v_vinculo, a, p_pessoa from unnest(v_areas) a;
  perform registrar_historico('equipe.convidada', 'vinculo', v_vinculo::text,
    jsonb_build_object('pessoa_id', p_convidado, 'areas', to_jsonb(v_areas)));
  if v_oab is not null then
    perform oab_gravar(p_pessoa, p_escritorio, p_convidado, (v_oab - 'tipo') || jsonb_build_object('tipo', 'PRINCIPAL'));
  end if;
  return v_vinculo;
end $$;

-- Quem sai da equipe (ou tem o convite cancelado) leva as inscrições: elas saem com a data.
create function oab_sai_com_vinculo() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.revogado_em is null and new.revogado_em is not null and new.funcao in ('SOCIO', 'EQUIPE')
     and not exists (select 1 from vinculos v where v.pessoa_id = new.pessoa_id and v.escritorio_id = new.escritorio_id
                       and v.id <> new.id and v.funcao in ('SOCIO', 'EQUIPE') and v.revogado_em is null) then
    update oab_inscricao set removido_em = new.revogado_em, removido_por = coalesce(new.revogado_por, pessoa_id)
     where pessoa_id = new.pessoa_id and escritorio_id = new.escritorio_id and removido_em is null;
  end if;
  return new;
end $$;
create trigger oab_sai_com_vinculo after update of revogado_em on vinculos
  for each row execute function oab_sai_com_vinculo();

-- O histórico da equipe mostra as mudanças da OAB.
create or replace function portal_historico_equipe(p_pessoa uuid, p_escritorio uuid, p_antes bigint default null, p_limite integer default 50)
returns table (id bigint, ocorrido_em timestamptz, autor_id uuid, autor_nome text, acao text, entidade_id text,
               dados jsonb, pessoa_nome text, para_nome text)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'escritorio.equipe.gerenciar');
  return query
    select h.id, h.ocorrido_em, h.autor_id, a.nome, h.acao, h.entidade_id, h.dados, m.nome, t.nome
      from historico h
      left join pessoas a on a.id = h.autor_id
      left join pessoas m on m.id = (h.dados ->> 'pessoa_id')::uuid
      left join pessoas t on t.id = (h.dados ->> 'passou_para')::uuid
     where h.escritorio_id = p_escritorio and not h.interno
       and h.acao in ('equipe.convidada', 'equipe.areas_mudadas', 'equipe.convite_reenviado', 'equipe.convite_cancelado',
                      'equipe.retirada', 'socio.convidado', 'socio.convite_reenviado', 'escritorio.exportado',
                      'suporte.link_senha', 'suporte.desconectou', 'suporte.tirou_autenticador',
                      'equipe.oab_incluida', 'equipe.oab_mudada', 'equipe.oab_removida')
       and (p_antes is null or h.id < p_antes)
     order by h.id desc
     limit least(greatest(coalesce(p_limite, 50), 1), 200);
end $$;

call fechar_acesso();
