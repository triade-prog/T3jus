-- Clientes do escritório no Portal (AP-01, AP-02, AP-04, AP-06), tela aprovada em
-- docs/design/aprovadas/portal-clientes. Decisões da Carol (18/11/2026):
-- 1. todos do escritório veem e cadastram clientes; origem, próximo contato e o histórico de
--    atendimento são só de quem tem a área Comercial (o sócio dono tem todas);
-- 2. inativar e reativar: só quem tem a área Comercial;
-- 3. atendimento não se edita nem se apaga: corrige-se registrando outro;
-- 4. origens fixas, mais "quem indicou";
-- 5. o pedido de exclusão do titular (LGPD) fica para depois (pendente de PT-11).
-- Nada é apagado (PT-03): o cliente é inativado, com motivo, e pode ser reativado.

insert into funcao_acoes (funcao, acao) values
  ('SOCIO', 'clientes.ver'), ('SOCIO', 'clientes.editar'),
  ('EQUIPE', 'clientes.ver'), ('EQUIPE', 'clientes.editar');

-- ---------------------------------------------------------------------------------------
-- Conferência de CPF e CNPJ (só os dígitos).

create function cpf_valido(p text) returns boolean
language plpgsql immutable
set search_path = public
as $$
declare
  d int[];
  s int;
  r int;
begin
  if p is null or p !~ '^[0-9]{11}$' or p ~ '^(.)\1{10}$' then return false; end if;
  d := (select array_agg(substr(p, i, 1)::int order by i) from generate_series(1, 11) i);
  s := 0;
  for i in 1..9 loop s := s + d[i] * (11 - i); end loop;
  r := (s * 10) % 11; if r = 10 then r := 0; end if;
  if r <> d[10] then return false; end if;
  s := 0;
  for i in 1..10 loop s := s + d[i] * (12 - i); end loop;
  r := (s * 10) % 11; if r = 10 then r := 0; end if;
  return r = d[11];
end $$;

create function cnpj_valido(p text) returns boolean
language plpgsql immutable
set search_path = public
as $$
declare
  d int[];
  p1 int[] := array[5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  p2 int[] := array[6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  s int;
  r int;
begin
  if p is null or p !~ '^[0-9]{14}$' or p ~ '^(.)\1{13}$' then return false; end if;
  d := (select array_agg(substr(p, i, 1)::int order by i) from generate_series(1, 14) i);
  s := 0;
  for i in 1..12 loop s := s + d[i] * p1[i]; end loop;
  r := s % 11; r := case when r < 2 then 0 else 11 - r end;
  if r <> d[13] then return false; end if;
  s := 0;
  for i in 1..13 loop s := s + d[i] * p2[i]; end loop;
  r := s % 11; r := case when r < 2 then 0 else 11 - r end;
  return r = d[14];
end $$;

-- Contatos do cliente: de 1 a 10, cada um com id, nome, papel opcional, telefone ou e-mail, e
-- um só principal. O telefone vai no formato internacional (+5511999990000).
create function contatos_cliente_validos(p jsonb) returns boolean
language sql immutable
set search_path = public
as $$
  select jsonb_typeof(p) = 'array' and jsonb_array_length(p) between 1 and 10
     and (select count(*) from jsonb_array_elements(p) c where (c ->> 'principal')::boolean) = 1
     and not exists (
       select 1 from jsonb_array_elements(p) c
        where jsonb_typeof(c) <> 'object'
           or exists (select 1 from jsonb_object_keys(c) k where k not in ('id', 'nome', 'papel', 'telefone', 'email', 'principal'))
           or coalesce(c ->> 'id', '') !~ '^[0-9a-f-]{36}$'
           or length(btrim(coalesce(c ->> 'nome', ''))) not between 1 and 120
           or length(coalesce(c ->> 'papel', '')) > 60
           or (c ->> 'telefone' is null and c ->> 'email' is null)
           or (c ->> 'telefone' is not null and c ->> 'telefone' !~ '^\+[1-9][0-9]{7,14}$')
           or (c ->> 'email' is not null and (length(c ->> 'email') > 254 or c ->> 'email' !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'))
           or jsonb_typeof(c -> 'principal') <> 'boolean')
$$;

-- ---------------------------------------------------------------------------------------
-- Tabelas.

create table clientes_escritorio (
  id                    uuid primary key default gen_random_uuid(),
  escritorio_id         uuid not null references escritorios (id) on delete restrict,
  tipo                  text not null check (tipo in ('PF', 'PJ')),
  nome                  text not null check (length(btrim(nome)) between 2 and 160),
  -- CPF (PF) ou CNPJ (PJ), só os dígitos e conferidos. Sem índice único: o duplicado é aviso.
  documento             text,
  contatos              jsonb not null check (contatos_cliente_validos(contatos)),
  -- Qualificação para a procuração e o contrato (CH-08). Na PJ, o endereço é o da sede.
  nacionalidade         text check (length(btrim(nacionalidade)) between 2 and 60),
  estado_civil          text check (estado_civil in ('SOLTEIRO', 'CASADO', 'UNIAO_ESTAVEL', 'SEPARADO', 'DIVORCIADO', 'VIUVO')),
  profissao             text check (length(btrim(profissao)) between 2 and 80),
  rg                    text check (length(btrim(rg)) between 3 and 20),
  rg_orgao              text check (length(btrim(rg_orgao)) between 2 and 20),
  cep                   text check (cep ~ '^[0-9]{8}$'),
  endereco              text check (length(btrim(endereco)) between 3 and 200),
  bairro                text check (length(btrim(bairro)) between 2 and 80),
  cidade                text check (length(btrim(cidade)) between 2 and 80),
  uf                    text check (uf in ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB',
                                           'PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO')),
  -- Quem assina pela empresa (PJ).
  rep_nome              text check (length(btrim(rep_nome)) between 2 and 120),
  rep_cargo             text check (length(btrim(rep_cargo)) between 2 and 60),
  rep_documento         text check (rep_documento is null or cpf_valido(rep_documento)),
  rep_estado_civil      text check (rep_estado_civil in ('SOLTEIRO', 'CASADO', 'UNIAO_ESTAVEL', 'SEPARADO', 'DIVORCIADO', 'VIUVO')),
  rep_profissao         text check (length(btrim(rep_profissao)) between 2 and 80),
  -- Comercial (AP-04): origens fixas (decisão 4).
  origem                text check (origem in ('INDICACAO_CLIENTE', 'INDICACAO_PARCEIRO', 'GOOGLE', 'INSTAGRAM', 'SITE',
                                               'PASSOU_NO_ESCRITORIO', 'OUTRA')),
  origem_indicacao      text check (length(btrim(origem_indicacao)) between 2 and 120),
  estado                text not null default 'ATIVO',
  inativado_em          timestamptz,
  inativado_por         uuid references pessoas (id) on delete restrict,
  motivo_inativacao     text check (length(btrim(motivo_inativacao)) between 1 and 300),
  criado_por            uuid not null references pessoas (id) on delete restrict,
  criado_em             timestamptz not null default app_now(),
  versao                integer not null default 1,
  check (documento is null or (tipo = 'PF' and cpf_valido(documento)) or (tipo = 'PJ' and cnpj_valido(documento))),
  check (tipo = 'PJ' or (rep_nome is null and rep_cargo is null and rep_documento is null and rep_estado_civil is null and rep_profissao is null))
);
create index clientes_escritorio_busca on clientes_escritorio (escritorio_id, estado, nome);
create index clientes_escritorio_documento on clientes_escritorio (escritorio_id, documento) where documento is not null;
call proteger_tabela_escritorio('clientes_escritorio');
call ligar_guardiao('clientes_escritorio');
insert into estados_iniciais (tabela, estado) values ('clientes_escritorio', 'ATIVO');
insert into transicoes_permitidas (tabela, de, para) values
  ('clientes_escritorio', 'ATIVO', 'INATIVO'),
  ('clientes_escritorio', 'INATIVO', 'ATIVO');

-- Histórico de atendimento (AP-02, AP-06): só de inserção (decisão 3). O próximo contato do
-- cliente é o do atendimento mais novo, desde a última inativação.
create table atendimentos (
  id                uuid primary key default gen_random_uuid(),
  escritorio_id     uuid not null references escritorios (id) on delete restrict,
  cliente_id        uuid not null references clientes_escritorio (id) on delete restrict,
  ocorrido_em       timestamptz not null,
  canal             text not null check (canal in ('WHATSAPP', 'TELEFONE', 'PRESENCIAL', 'EMAIL', 'VIDEO')),
  com_quem          text check (length(btrim(com_quem)) between 1 and 120),
  atendido_por      uuid not null references pessoas (id) on delete restrict,
  resumo            text not null check (length(btrim(resumo)) between 1 and 2000),
  prox_em           date,
  prox_responsavel  uuid references pessoas (id) on delete restrict,
  prox_oque         text check (length(btrim(prox_oque)) between 1 and 200),
  criado_por        uuid not null references pessoas (id) on delete restrict,
  criado_em         timestamptz not null default app_now(),
  check ((prox_em is null) = (prox_responsavel is null) and (prox_em is null) = (prox_oque is null))
);
create index atendimentos_cliente on atendimentos (escritorio_id, cliente_id, criado_em desc);
call proteger_tabela_escritorio('atendimentos');
create trigger atendimentos_somente_insercao before update or delete on atendimentos
  for each row execute function somente_insercao();

insert into inventario_dados (tabela, dado_pessoal, o_que, para_que, base_legal, controlador, prazo, no_fim, situacao, exportar) values
 ('clientes_escritorio', true,
  'Clientes do escritório: nome, CPF ou CNPJ, contatos, qualificação para procuração e contrato, origem e situação',
  'Falar com o cliente e qualificá-lo na procuração e no contrato (AP-01); saber de onde vêm os clientes (AP-04)',
  'Execução de contrato e exercício regular de direitos (LGPD, art. 7º, V e VI)', 'Escritório',
  'Enquanto o escritório for cliente do T3jus; o escritório decide o prazo de guarda de cada cliente',
  'Exportados ao escritório e apagados com ele; o pedido de exclusão do titular entra depois (PT-11)', 'APROVADO', true),
 ('atendimentos', true,
  'Histórico de atendimento: quando, canal, com quem, quem atendeu, resumo e o próximo contato',
  'Dar continuidade ao atendimento e não perder o retorno combinado (AP-02, AP-06)',
  'Execução de contrato e exercício regular de direitos (LGPD, art. 7º, V e VI)', 'Escritório',
  'Enquanto o escritório for cliente do T3jus',
  'Exportados ao escritório e apagados com ele', 'APROVADO', true);

-- ---------------------------------------------------------------------------------------
-- Leituras de apoio (dentro do contexto do escritório).

create function tem_comercial(p_pessoa uuid, p_escritorio uuid) returns boolean
language sql stable
set search_path = public
as $$ select 'COMERCIAL' = any (areas_da_pessoa(p_pessoa, p_escritorio)) $$;

-- Hoje no horário de Brasília (o próximo contato é uma data, sem hora).
create function hoje_brasilia() returns date
language sql stable
set search_path = public
as $$ select (app_now() at time zone 'America/Sao_Paulo')::date $$;

-- O próximo contato: o do atendimento mais novo, desde a última inativação.
create function prox_contato(p_cliente uuid) returns jsonb
language sql stable
set search_path = public
as $$
  select case when a.prox_em is null then null else jsonb_build_object(
           'em', a.prox_em, 'oque', a.prox_oque, 'vencido', a.prox_em < hoje_brasilia(),
           'responsavel', jsonb_build_object('id', a.prox_responsavel, 'nome', p.nome)) end
    from clientes_escritorio c
    join lateral (select * from atendimentos x where x.cliente_id = c.id
                    and (c.inativado_em is null or x.criado_em > c.inativado_em)
                  order by x.criado_em desc, x.ocorrido_em desc limit 1) a on true
    left join pessoas p on p.id = a.prox_responsavel
   where c.id = p_cliente and c.estado = 'ATIVO'
$$;

-- O que falta para gerar a procuração e o contrato (CH-08), calculado aqui para servir também
-- à geração dos documentos.
create function qualificacao_faltando(c clientes_escritorio) returns text[]
language sql stable
set search_path = public
as $$
  select array_remove(case when c.tipo = 'PF' then array[
    case when c.documento is null then 'DOCUMENTO' end,
    case when c.nacionalidade is null then 'NACIONALIDADE' end,
    case when c.estado_civil is null then 'ESTADO_CIVIL' end,
    case when c.profissao is null then 'PROFISSAO' end,
    case when c.rg is null then 'RG' end,
    case when c.endereco is null or c.cidade is null or c.uf is null then 'ENDERECO' end]
  else array[
    case when c.documento is null then 'DOCUMENTO' end,
    case when c.endereco is null or c.cidade is null or c.uf is null then 'ENDERECO' end,
    case when c.rep_nome is null then 'REP_NOME' end,
    case when c.rep_cargo is null then 'REP_CARGO' end,
    case when c.rep_documento is null then 'REP_DOCUMENTO' end,
    case when c.rep_estado_civil is null or c.rep_profissao is null then 'REP_QUALIFICACAO' end] end, null)
$$;

create function contato_principal(p_contatos jsonb) returns jsonb
language sql immutable
set search_path = public
as $$ select c - 'principal' from jsonb_array_elements(p_contatos) c where (c ->> 'principal')::boolean limit 1 $$;

-- Linha da lista. Sem a área Comercial, sem origem e sem próximo contato (decisão 1).
create function cliente_linha(c clientes_escritorio, p_comercial boolean) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object('id', c.id, 'tipo', c.tipo, 'nome', c.nome, 'situacao', c.estado,
                            'contatoPrincipal', contato_principal(c.contatos), 'versao', c.versao)
      || case when p_comercial then jsonb_build_object('origem', c.origem, 'proxContato', prox_contato(c.id)) else '{}'::jsonb end
$$;

-- Pessoas do escritório (sócio e equipe) para escolher o responsável do próximo contato.
create function portal_pessoas_escritorio(p_pessoa uuid, p_escritorio uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'clientes.ver');
  return coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'nome', p.nome) order by p.nome)
                     from (select distinct v.pessoa_id from vinculos v
                            where v.escritorio_id = p_escritorio and v.funcao in ('SOCIO', 'EQUIPE') and v.revogado_em is null) v
                     join pessoas p on p.id = v.pessoa_id), '[]'::jsonb);
end $$;

-- ---------------------------------------------------------------------------------------
-- Lista e busca (AP-01). A busca compara o nome e, com 3 dígitos ou mais, o documento e os
-- telefones só pelos dígitos; olha também os contatos ("Prado" acha a cliente pela filha).

create function portal_clientes(p_pessoa uuid, p_escritorio uuid, p_termo text default null,
                                p_situacao text default 'ATIVO', p_vencidos boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_comercial boolean;
  v_termo text := lower(btrim(coalesce(p_termo, '')));
  v_padrao text;
  v_digitos text := regexp_replace(coalesce(p_termo, ''), '[^0-9]', '', 'g');
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'clientes.ver');
  v_comercial := tem_comercial(p_pessoa, p_escritorio);
  if p_vencidos and not v_comercial then
    raise exception 'Área não liberada para esta pessoa' using errcode = 'TC401',
      detail = jsonb_build_object('motivo', 'AREA_NAO_LIBERADA')::text;
  end if;
  if coalesce(p_situacao, 'ATIVO') not in ('ATIVO', 'INATIVO') then
    perform recusar_campos('Situação desconhecida', 'situacao');
  end if;
  if length(v_termo) > 120 then perform recusar_campos('Busca longa demais', 'q'); end if;
  v_padrao := '%' || replace(replace(replace(v_termo, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  return jsonb_build_object('comercial', v_comercial, 'clientes', coalesce((
    select jsonb_agg(l order by (l -> 'proxContato' ->> 'em') nulls last, l ->> 'nome')
      from (select cliente_linha(c, v_comercial) l
              from clientes_escritorio c
             where c.escritorio_id = p_escritorio
               and (v_termo <> '' or c.estado = coalesce(p_situacao, 'ATIVO'))
               and (v_termo = '' or lower(c.nome) like v_padrao
                    or exists (select 1 from jsonb_array_elements(c.contatos) k where lower(k ->> 'nome') like v_padrao)
                    or (length(v_digitos) >= 3 and (c.documento like '%' || v_digitos || '%'
                        or exists (select 1 from jsonb_array_elements(c.contatos) k
                                    where regexp_replace(coalesce(k ->> 'telefone', ''), '[^0-9]', '', 'g') like '%' || v_digitos || '%'))))
             order by c.nome
             limit 200) x
     where not p_vencidos or (l -> 'proxContato' ->> 'vencido')::boolean), '[]'::jsonb));
end $$;

-- Possíveis duplicados: mesmo documento ou mesmo telefone de outro cliente. É aviso, não
-- bloqueio (um parente pode usar o mesmo número).
create function portal_clientes_duplicados(p_pessoa uuid, p_escritorio uuid, p_documento text, p_telefone text,
                                           p_ignorar uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_doc text := nullif(regexp_replace(coalesce(p_documento, ''), '[^0-9]', '', 'g'), '');
  v_tel text := nullif(regexp_replace(coalesce(p_telefone, ''), '[^0-9]', '', 'g'), '');
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'clientes.ver');
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', c.id, 'nome', c.nome, 'situacao', c.estado, 'desde', c.criado_em,
                                        'por', case when v_doc is not null and c.documento = v_doc then 'DOCUMENTO' else 'TELEFONE' end)
                     order by c.nome)
      from clientes_escritorio c
     where c.escritorio_id = p_escritorio and c.id is distinct from p_ignorar
       and ((v_doc is not null and c.documento = v_doc)
            or (v_tel is not null and length(v_tel) >= 10 and exists (
                  select 1 from jsonb_array_elements(c.contatos) k
                   where regexp_replace(coalesce(k ->> 'telefone', ''), '[^0-9]', '', 'g') = v_tel)))), '[]'::jsonb);
end $$;

-- ---------------------------------------------------------------------------------------
-- Cadastrar e editar (AP-01). O navegador manda os dados; o servidor confere cada campo e só
-- grava a origem de quem tem a área Comercial. O histórico guarda quais campos mudaram, nunca
-- os valores (PT-13).

create function cliente_doc_ok(p_tipo text, p_doc text) returns void
language plpgsql
set search_path = public
as $$
begin
  if p_doc is not null and not ((p_tipo = 'PF' and cpf_valido(p_doc)) or (p_tipo = 'PJ' and cnpj_valido(p_doc))) then
    perform recusar_campos(case when p_tipo = 'PF' then 'CPF inválido' else 'CNPJ inválido' end, 'documento');
  end if;
end $$;

-- Os contatos ganham id no servidor quando chegam sem um (contato novo).
create function contatos_com_id(p jsonb) returns jsonb
language sql volatile
set search_path = public
as $$
  select coalesce(jsonb_agg(case when coalesce(c ->> 'id', '') ~ '^[0-9a-f-]{36}$' then c
                                 else c || jsonb_build_object('id', gen_random_uuid()) end), '[]'::jsonb)
    from jsonb_array_elements(case when jsonb_typeof(p) = 'array' then p else '[]'::jsonb end) c
$$;


-- Campos que a pessoa edita (o tipo fica o do cadastro).
create function campos_cliente() returns text[]
language sql immutable
as $$ select array['nome', 'documento', 'contatos', 'nacionalidade', 'estado_civil', 'profissao', 'rg', 'rg_orgao', 'cep',
                   'endereco', 'bairro', 'cidade', 'uf', 'rep_nome', 'rep_cargo', 'rep_documento', 'rep_estado_civil',
                   'rep_profissao', 'origem', 'origem_indicacao'] $$;

create function cliente_gravar(p_pessoa uuid, p_escritorio uuid, p_cliente uuid, p_versao integer, p_dados jsonb)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_comercial boolean := tem_comercial(p_pessoa, p_escritorio);
  v_antigo clientes_escritorio;
  n clientes_escritorio;
  v_id uuid;
  v_versao integer;
  v_campos text[];
begin
  if jsonb_typeof(p_dados) is distinct from 'object' then perform recusar_campos('Dados inválidos', 'dados'); end if;
  -- Campo em branco vale como vazio; documento, CPF do representante e CEP ficam só com os dígitos.
  p_dados := coalesce((select jsonb_object_agg(k, case when k in ('documento', 'rep_documento', 'cep')
                                                       then to_jsonb(regexp_replace(v #>> '{}', '[^0-9]', '', 'g'))
                                                       when jsonb_typeof(v) = 'string' then to_jsonb(btrim(v #>> '{}')) else v end)
                         from jsonb_each(p_dados) e(k, v)
                        where not (jsonb_typeof(v) = 'string' and btrim(v #>> '{}') = '') and jsonb_typeof(v) <> 'null'), '{}'::jsonb);
  n := jsonb_populate_record(null::clientes_escritorio, p_dados - 'id' - 'escritorio_id' - 'estado' - 'versao' - 'criado_por'
                                                                 - 'criado_em' - 'inativado_em' - 'inativado_por' - 'motivo_inativacao');
  n.contatos := contatos_com_id(p_dados -> 'contatos');
  if p_cliente is not null then
    select * into v_antigo from clientes_escritorio where id = p_cliente and escritorio_id = p_escritorio;
    if v_antigo.id is null then raise exception 'Cliente não encontrado' using errcode = 'TC404'; end if;
    n.tipo := v_antigo.tipo;
    if not v_comercial then n.origem := v_antigo.origem; n.origem_indicacao := v_antigo.origem_indicacao; end if;
  elsif not v_comercial then
    n.origem := null; n.origem_indicacao := null;
  end if;
  if n.tipo is null or n.tipo not in ('PF', 'PJ') then perform recusar_campos('Escolha pessoa física ou jurídica', 'tipo'); end if;
  if length(btrim(coalesce(n.nome, ''))) not between 2 and 160 then perform recusar_campos('Escreva o nome', 'nome'); end if;
  perform cliente_doc_ok(n.tipo, n.documento);
  if n.rep_documento is not null and not cpf_valido(n.rep_documento) then perform recusar_campos('CPF inválido', 'rep_documento'); end if;
  if not contatos_cliente_validos(n.contatos) then perform recusar_campos('Confira os contatos', 'contatos'); end if;
  if n.tipo = 'PF' then n.rep_nome := null; n.rep_cargo := null; n.rep_documento := null; n.rep_estado_civil := null; n.rep_profissao := null; end if;

  if p_cliente is null then
    perform definir_transicao('CADASTRADO');
    insert into clientes_escritorio (escritorio_id, tipo, nome, documento, contatos, nacionalidade, estado_civil, profissao, rg, rg_orgao,
                                     cep, endereco, bairro, cidade, uf, rep_nome, rep_cargo, rep_documento, rep_estado_civil, rep_profissao,
                                     origem, origem_indicacao, criado_por)
    values (p_escritorio, n.tipo, btrim(n.nome), n.documento, n.contatos, n.nacionalidade, n.estado_civil, n.profissao, n.rg, n.rg_orgao,
            n.cep, n.endereco, n.bairro, n.cidade, n.uf, n.rep_nome, n.rep_cargo, n.rep_documento, n.rep_estado_civil, n.rep_profissao,
            n.origem, n.origem_indicacao, p_pessoa)
    returning id, versao into v_id, v_versao;
    perform registrar_historico('cliente.cadastrado', 'cliente', v_id::text, jsonb_build_object('tipo', n.tipo));
    return jsonb_build_object('id', v_id, 'versao', v_versao);
  end if;

  update clientes_escritorio set
    nome = btrim(n.nome), documento = n.documento, contatos = n.contatos, nacionalidade = n.nacionalidade,
    estado_civil = n.estado_civil, profissao = n.profissao, rg = n.rg, rg_orgao = n.rg_orgao, cep = n.cep, endereco = n.endereco,
    bairro = n.bairro, cidade = n.cidade, uf = n.uf, rep_nome = n.rep_nome, rep_cargo = n.rep_cargo, rep_documento = n.rep_documento,
    rep_estado_civil = n.rep_estado_civil, rep_profissao = n.rep_profissao, origem = n.origem, origem_indicacao = n.origem_indicacao
   where id = p_cliente and escritorio_id = p_escritorio and versao = p_versao
  returning versao into v_versao;
  if v_versao is null then perform conflito_versao('clientes_escritorio', p_cliente); end if;
  select coalesce(array_agg(k order by k), '{}') into v_campos
    from unnest(campos_cliente()) k
   where to_jsonb(v_antigo) -> k is distinct from (select to_jsonb(c) -> k from clientes_escritorio c where c.id = p_cliente);
  if cardinality(v_campos) > 0 then
    perform registrar_historico('cliente.editado', 'cliente', p_cliente::text, jsonb_build_object('campos', to_jsonb(v_campos)));
  end if;
  return jsonb_build_object('id', p_cliente, 'versao', v_versao);
exception when check_violation then
  -- A regra da tabela recusou um campo: devolve qual, como as outras validações.
  declare v_restricao text;
  begin
    get stacked diagnostics v_restricao = constraint_name;
    perform recusar_campos('Confira os campos marcados',
      coalesce(substring(v_restricao from '^clientes_escritorio_(.+)_check$'), 'dados'));
  end;
end $$;

create function portal_cliente_cadastrar(p_pessoa uuid, p_escritorio uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'clientes.editar');
  return cliente_gravar(p_pessoa, p_escritorio, null, null, p_dados);
end $$;

create function portal_cliente_editar(p_pessoa uuid, p_escritorio uuid, p_cliente uuid, p_versao integer, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'clientes.editar');
  if p_versao is null then perform recusar_campos('Falta a versão lida', 'versao'); end if;
  return cliente_gravar(p_pessoa, p_escritorio, p_cliente, p_versao, p_dados);
end $$;

-- ---------------------------------------------------------------------------------------
-- Ficha (AP-01). Sem a área Comercial, sem origem, sem próximo contato e sem atendimentos.

create function portal_cliente(p_pessoa uuid, p_escritorio uuid, p_cliente uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c clientes_escritorio;
  v_comercial boolean;
  v jsonb;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'clientes.ver');
  select * into c from clientes_escritorio where id = p_cliente and escritorio_id = p_escritorio;
  if c.id is null then raise exception 'Cliente não encontrado' using errcode = 'TC404'; end if;
  v_comercial := tem_comercial(p_pessoa, p_escritorio);
  v := (to_jsonb(c) - 'escritorio_id' - 'origem' - 'origem_indicacao' - 'inativado_por' - 'criado_por' - 'estado')
    || jsonb_build_object(
      'situacao', c.estado,
      'comercial', v_comercial,
      'podeInativar', v_comercial,
      'faltando', to_jsonb(qualificacao_faltando(c)),
      'criadoPor', (select jsonb_build_object('id', p.id, 'nome', p.nome) from pessoas p where p.id = c.criado_por),
      'inativadoPor', (select jsonb_build_object('id', p.id, 'nome', p.nome) from pessoas p where p.id = c.inativado_por),
      -- Quem salvou por último e quando: o conflito de edição diz quem salvou antes (PT-19).
      'alterado', (select jsonb_build_object('em', h.ocorrido_em, 'por', p.nome)
                     from historico h left join pessoas p on p.id = h.autor_id
                    where h.escritorio_id = p_escritorio and h.entidade = 'cliente' and h.entidade_id = c.id::text
                      and h.acao in ('cliente.cadastrado', 'cliente.editado')
                    order by h.id desc limit 1));
  if v_comercial then
    v := v || jsonb_build_object(
      'origem', c.origem, 'origemIndicacao', c.origem_indicacao, 'proxContato', prox_contato(c.id),
      'atendimentos', (select count(*) from atendimentos a where a.cliente_id = c.id),
      'primeiroAtendimento', (select jsonb_build_object('em', a.ocorrido_em, 'canal', a.canal)
                                from atendimentos a where a.cliente_id = c.id order by a.ocorrido_em limit 1));
  end if;
  return v;
end $$;

-- ---------------------------------------------------------------------------------------
-- Inativar e reativar (decisão 2: só quem tem a área Comercial). O guardião grava a mudança
-- de estado com o evento e o motivo; o próximo contato marcado se encerra ao inativar.

create function portal_cliente_inativar(p_pessoa uuid, p_escritorio uuid, p_cliente uuid, p_versao integer, p_motivo text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_versao integer;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'COMERCIAL');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'clientes.editar');
  if length(btrim(coalesce(p_motivo, ''))) not between 1 and 300 then
    perform recusar_campos('Escreva o motivo', 'motivo');
  end if;
  if not exists (select 1 from clientes_escritorio where id = p_cliente and escritorio_id = p_escritorio) then
    raise exception 'Cliente não encontrado' using errcode = 'TC404';
  end if;
  if exists (select 1 from clientes_escritorio where id = p_cliente and estado = 'INATIVO') then
    perform recusar_motivo('O cliente já está inativo', 'JA_INATIVO');
  end if;
  perform definir_transicao('INATIVADO', btrim(p_motivo));
  update clientes_escritorio set estado = 'INATIVO', inativado_em = app_now(), inativado_por = p_pessoa, motivo_inativacao = btrim(p_motivo)
   where id = p_cliente and escritorio_id = p_escritorio and versao = p_versao
  returning versao into v_versao;
  if v_versao is null then perform conflito_versao('clientes_escritorio', p_cliente); end if;
  return v_versao;
end $$;

create function portal_cliente_reativar(p_pessoa uuid, p_escritorio uuid, p_cliente uuid, p_versao integer, p_motivo text default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_versao integer;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'COMERCIAL');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'clientes.editar');
  if length(coalesce(p_motivo, '')) > 300 then perform recusar_campos('Motivo longo demais', 'motivo'); end if;
  if not exists (select 1 from clientes_escritorio where id = p_cliente and escritorio_id = p_escritorio) then
    raise exception 'Cliente não encontrado' using errcode = 'TC404';
  end if;
  if exists (select 1 from clientes_escritorio where id = p_cliente and estado = 'ATIVO') then
    perform recusar_motivo('O cliente já está ativo', 'JA_ATIVO');
  end if;
  perform definir_transicao('REATIVADO', nullif(btrim(coalesce(p_motivo, '')), ''));
  update clientes_escritorio set estado = 'ATIVO'
   where id = p_cliente and escritorio_id = p_escritorio and versao = p_versao
  returning versao into v_versao;
  if v_versao is null then perform conflito_versao('clientes_escritorio', p_cliente); end if;
  return v_versao;
end $$;

-- ---------------------------------------------------------------------------------------
-- Atendimentos (AP-02, AP-06): só quem tem a área Comercial. Registrar marca (ou tira) o
-- próximo contato; nada se edita nem se apaga (decisão 3).

create function portal_atendimentos(p_pessoa uuid, p_escritorio uuid, p_cliente uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform entrar_area(p_pessoa, p_escritorio, 'COMERCIAL');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'clientes.ver');
  if not exists (select 1 from clientes_escritorio where id = p_cliente and escritorio_id = p_escritorio) then
    raise exception 'Cliente não encontrado' using errcode = 'TC404';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', a.id, 'ocorridoEm', a.ocorrido_em, 'canal', a.canal, 'comQuem', a.com_quem, 'resumo', a.resumo,
             'atendidoPor', jsonb_build_object('id', a.atendido_por, 'nome', pa.nome),
             'proxContato', case when a.prox_em is null then null else jsonb_build_object(
               'em', a.prox_em, 'oque', a.prox_oque, 'responsavel', jsonb_build_object('id', a.prox_responsavel, 'nome', pr.nome)) end,
             'registradoEm', a.criado_em)
           order by a.ocorrido_em desc, a.criado_em desc)
      from atendimentos a
      left join pessoas pa on pa.id = a.atendido_por
      left join pessoas pr on pr.id = a.prox_responsavel
     where a.cliente_id = p_cliente), '[]'::jsonb);
end $$;

-- Pessoa que atende no escritório (sócio ou equipe com vínculo ativo).
create function pessoa_do_escritorio(p_pessoa uuid, p_escritorio uuid) returns boolean
language sql stable
set search_path = public
as $$ select exists (select 1 from vinculos where pessoa_id = p_pessoa and escritorio_id = p_escritorio
                                               and funcao in ('SOCIO', 'EQUIPE') and revogado_em is null) $$;

create function portal_registrar_atendimento(p_pessoa uuid, p_escritorio uuid, p_cliente uuid, p_dados jsonb) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_em timestamptz;
  v_atendeu uuid := coalesce(nullif(p_dados ->> 'atendidoPor', '')::uuid, p_pessoa);
  v_prox date := nullif(p_dados ->> 'proxEm', '')::date;
  v_resp uuid := nullif(p_dados ->> 'proxResponsavel', '')::uuid;
  v_oque text := nullif(btrim(coalesce(p_dados ->> 'proxOque', '')), '');
  v_resumo text := btrim(coalesce(p_dados ->> 'resumo', ''));
  v_campos text[] := '{}';
begin
  perform entrar_area(p_pessoa, p_escritorio, 'COMERCIAL');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'clientes.editar');
  if not exists (select 1 from clientes_escritorio where id = p_cliente and escritorio_id = p_escritorio) then
    raise exception 'Cliente não encontrado' using errcode = 'TC404';
  end if;
  if exists (select 1 from clientes_escritorio where id = p_cliente and estado = 'INATIVO') then
    perform recusar_motivo('Reative o cliente antes de registrar', 'CLIENTE_INATIVO');
  end if;
  v_em := coalesce(nullif(p_dados ->> 'ocorridoEm', '')::timestamptz, app_now());
  if v_em > app_now() + interval '5 minutes' then v_campos := array_append(v_campos, 'ocorridoEm'); end if;
  if coalesce(p_dados ->> 'canal', '') not in ('WHATSAPP', 'TELEFONE', 'PRESENCIAL', 'EMAIL', 'VIDEO') then v_campos := array_append(v_campos, 'canal'); end if;
  if length(v_resumo) not between 1 and 2000 then v_campos := array_append(v_campos, 'resumo'); end if;
  if length(coalesce(p_dados ->> 'comQuem', '')) > 120 then v_campos := array_append(v_campos, 'comQuem'); end if;
  if not pessoa_do_escritorio(v_atendeu, p_escritorio) then v_campos := array_append(v_campos, 'atendidoPor'); end if;
  if v_prox is not null or v_resp is not null or v_oque is not null then
    if v_prox is null or v_prox < hoje_brasilia() then v_campos := array_append(v_campos, 'proxEm'); end if;
    if v_resp is null or not pessoa_do_escritorio(v_resp, p_escritorio) then v_campos := array_append(v_campos, 'proxResponsavel'); end if;
    if v_oque is null or length(v_oque) > 200 then v_campos := array_append(v_campos, 'proxOque'); end if;
  end if;
  if cardinality(v_campos) > 0 then
    perform recusar_campos('Confira o atendimento', variadic v_campos);
  end if;
  insert into atendimentos (escritorio_id, cliente_id, ocorrido_em, canal, com_quem, atendido_por, resumo, prox_em, prox_responsavel, prox_oque, criado_por)
  values (p_escritorio, p_cliente, v_em, p_dados ->> 'canal', nullif(btrim(coalesce(p_dados ->> 'comQuem', '')), ''), v_atendeu, v_resumo,
          v_prox, v_resp, v_oque, p_pessoa)
  returning id into v_id;
  perform registrar_historico('cliente.atendimento_registrado', 'cliente', p_cliente::text,
    jsonb_build_object('atendimento_id', v_id, 'canal', p_dados ->> 'canal', 'com_proximo_contato', v_prox is not null));
  return v_id;
end $$;

call fechar_acesso();
