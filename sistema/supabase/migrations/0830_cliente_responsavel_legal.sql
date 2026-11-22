-- Quem assina pelo cliente menor ou sob curatela (F3.98; AP-01, CH-08, PT-11). Tela aprovada em
-- docs/design/aprovadas/portal-responsavel-legal (Carol, 22/11/2026, com as 8 recomendações).
--
-- O que entra:
-- 1. Em Clientes, a capacidade (assina por si, menor ou sob curatela), a data de nascimento (só
--    do menor, pergunta 5) e quem assina por ele (um só, pergunta 1). Na curatela, o modo
--    (representa ou assiste, pergunta 4), o processo e a vara. Para salvar o menor, só a data e o
--    nome de quem assina; na curatela, o nome do curador (pergunta 6).
-- 2. O que falta para a procuração passa a seguir quem assina: o menor de 18 não precisa de
--    estado civil, profissão nem RG; quem assina por ele precisa de CPF, RG e qualificação.
-- 3. A ficha traz "assina", calculado com a data de hoje: representado (até 15 anos), assistido
--    (16 e 17), curatela, ou "fez 18" (pergunta 3). A conta é sempre pela data, no dia.
-- 4. "Agora assina por si": a janela dos 18 anos limpa a data e o responsável, guarda quem
--    assinava numa tabela à parte (o histórico não guarda nome nem CPF) e grava o evento.
-- 5. O sino avisa quem responde pelo contrato ativo ou pelo caso em andamento no dia em que o
--    cliente faz 18 anos (pergunta 3). O T3jus não gera procuração sozinho.
-- 6. Os dados da página de gerar documentos levam o responsável; o documento gerado guarda quem
--    assinou pelo cliente no dia.
--
-- Fica para depois (pendente no painel): o termo de curatela como anexo da ficha (pergunta 2).

-- ---------------------------------------------------------------------------------------
-- 1. Os campos novos

alter table clientes_escritorio
  add column capacidade       text not null default 'PLENA' check (capacidade in ('PLENA', 'MENOR', 'CURATELA')),
  add column nascimento       date,
  add column rl_papel         text check (rl_papel in ('MAE', 'PAI', 'TUTORA', 'TUTOR', 'CURADORA', 'CURADOR')),
  add column rl_nome          text check (length(btrim(rl_nome)) between 2 and 120),
  add column rl_documento     text check (rl_documento is null or cpf_valido(rl_documento)),
  add column rl_rg            text check (length(btrim(rl_rg)) between 3 and 20),
  add column rl_rg_orgao      text check (length(btrim(rl_rg_orgao)) between 2 and 20),
  add column rl_nacionalidade text check (length(btrim(rl_nacionalidade)) between 2 and 60),
  add column rl_estado_civil  text check (rl_estado_civil in ('SOLTEIRO', 'CASADO', 'UNIAO_ESTAVEL', 'SEPARADO', 'DIVORCIADO', 'VIUVO')),
  add column rl_profissao     text check (length(btrim(rl_profissao)) between 2 and 80),
  add column rl_mora_junto    boolean,
  add column rl_cep           text check (rl_cep ~ '^[0-9]{8}$'),
  add column rl_endereco      text check (length(btrim(rl_endereco)) between 3 and 200),
  add column rl_bairro        text check (length(btrim(rl_bairro)) between 2 and 80),
  add column rl_cidade        text check (length(btrim(rl_cidade)) between 2 and 80),
  add column rl_uf            text check (rl_uf in ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB',
                                                    'PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO')),
  add column cur_modo         text check (cur_modo in ('REPRESENTA', 'ASSISTE')),
  add column cur_processo     text check (length(btrim(cur_processo)) between 3 and 40),
  add column cur_vara         text check (length(btrim(cur_vara)) between 3 and 160);

-- Só a pessoa física deixa de assinar por si. Quem assina por si não guarda responsável, data
-- de nascimento nem curatela (PT-11: não guarda o que não usa).
alter table clientes_escritorio add constraint clientes_escritorio_capacidade_regras check (
  case capacidade
    when 'PLENA' then nascimento is null and rl_papel is null and rl_nome is null and rl_documento is null and rl_rg is null
                      and rl_rg_orgao is null and rl_nacionalidade is null and rl_estado_civil is null and rl_profissao is null
                      and rl_mora_junto is null and rl_cep is null and rl_endereco is null and rl_bairro is null and rl_cidade is null
                      and rl_uf is null and cur_modo is null and cur_processo is null and cur_vara is null
    when 'MENOR' then tipo = 'PF' and nascimento is not null and rl_nome is not null and rl_papel in ('MAE', 'PAI', 'TUTORA', 'TUTOR')
                      and rl_mora_junto is not null and cur_modo is null and cur_processo is null and cur_vara is null
    else tipo = 'PF' and nascimento is null and rl_nome is not null and rl_papel in ('CURADORA', 'CURADOR')
         and rl_mora_junto is not null and cur_modo is not null
  end);
-- O endereço de quem assina só existe quando não mora com o cliente; o CPF é de outra pessoa.
alter table clientes_escritorio add constraint clientes_escritorio_rl_endereco_regra
  check (rl_mora_junto is distinct from true or (rl_cep is null and rl_endereco is null and rl_bairro is null and rl_cidade is null and rl_uf is null));
alter table clientes_escritorio add constraint clientes_escritorio_rl_documento_outro
  check (rl_documento is null or documento is null or rl_documento <> documento);

-- Quem assinava pelo cliente antes de ele fazer 18 anos (a folha "Quem assinava com..."). O
-- histórico não guarda nome nem CPF, por isso a tabela à parte. Nada se apaga (PT-03); na
-- exclusão a pedido do titular, o nome e o CPF saem.
create table clientes_quem_assinava (
  id             uuid primary key default gen_random_uuid(),
  escritorio_id  uuid not null references escritorios (id) on delete restrict,
  cliente_id     uuid not null references clientes_escritorio (id) on delete restrict,
  papel          text not null check (papel in ('MAE', 'PAI', 'TUTORA', 'TUTOR')),
  nome           text check (length(btrim(nome)) between 2 and 120),
  documento      text check (documento is null or cpf_valido(documento)),
  ate            date not null,
  registrado_por uuid not null references pessoas (id) on delete restrict,
  registrado_em  timestamptz not null default app_now()
);
create index clientes_quem_assinava_cliente on clientes_quem_assinava (cliente_id, registrado_em desc);
call proteger_tabela_escritorio('clientes_quem_assinava');

insert into inventario_dados (tabela, dado_pessoal, o_que, para_que, base_legal, controlador, prazo, no_fim, situacao, exportar) values
 ('clientes_quem_assinava', true,
  'Quem assinava pelo cliente até ele fazer 18 anos: papel, nome, CPF e até quando',
  'Mostrar na ficha quem assinou com o cliente os documentos de antes dos 18 anos (CH-08)',
  'Execução de contrato e exercício regular de direitos (art. 7º, V e VI, LGPD)', 'Escritório',
  'Enquanto o cliente estiver no escritório e o prazo de guarda dos documentos', 'Exportados ao escritório; nome e CPF saem na exclusão a pedido do titular', 'APROVADO', true);

update inventario_dados
   set o_que = 'Clientes: nome, CPF ou CNPJ, contatos, qualificação, quem assina pelo menor ou curatelado, origem e situação'
 where tabela = 'clientes_escritorio';

-- A exclusão a pedido do titular (F1.15) também tira a data de nascimento e quem assina.
create function cliente_excluido_limpa_responsavel() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.estado = 'EXCLUIDO' and old.estado is distinct from 'EXCLUIDO' then
    new.capacidade := 'PLENA';
    new.nascimento := null; new.rl_papel := null; new.rl_nome := null; new.rl_documento := null; new.rl_rg := null;
    new.rl_rg_orgao := null; new.rl_nacionalidade := null; new.rl_estado_civil := null; new.rl_profissao := null;
    new.rl_mora_junto := null; new.rl_cep := null; new.rl_endereco := null; new.rl_bairro := null; new.rl_cidade := null;
    new.rl_uf := null; new.cur_modo := null; new.cur_processo := null; new.cur_vara := null;
    update clientes_quem_assinava set nome = null, documento = null where cliente_id = new.id;
  end if;
  return new;
end $$;
create trigger a_cliente_excluido_limpa_responsavel before update on clientes_escritorio
  for each row execute function cliente_excluido_limpa_responsavel();

-- ---------------------------------------------------------------------------------------
-- 2. Quem assina, no dia

create function idade_em(p_nascimento date, p_dia date) returns integer
language sql immutable
as $$ select extract(year from age(p_dia, p_nascimento))::integer $$;

-- PROPRIO, REPRESENTADO (até 15), ASSISTIDO (16 e 17), CURATELA ou FEZ_18 (o menor que já fez
-- 18 e ainda não teve a ficha atualizada). Com a idade e as datas dos 16 e dos 18 anos.
create function cliente_assina(c clientes_escritorio, p_dia date default null) returns jsonb
language sql stable
set search_path = public
as $$
  with d as (select coalesce(p_dia, hoje_brasilia()) dia),
       i as (select case when c.nascimento is not null then idade_em(c.nascimento, d.dia) end idade from d)
  select jsonb_build_object(
    'situacao', case c.capacidade when 'PLENA' then 'PROPRIO' when 'CURATELA' then 'CURATELA'
                  else case when i.idade >= 18 then 'FEZ_18' when i.idade >= 16 then 'ASSISTIDO' else 'REPRESENTADO' end end,
    'idade', i.idade,
    'faz16', case when c.nascimento is not null then (c.nascimento + interval '16 years')::date end,
    'faz18', case when c.nascimento is not null then (c.nascimento + interval '18 years')::date end,
    'modo', c.cur_modo)
  from i
$$;

-- O que a procuração pede, na ordem da ficha, e se falta. O menor de 18 não precisa de estado
-- civil, profissão nem RG; quem assina por ele precisa de CPF, RG e qualificação (e do endereço,
-- quando não mora com ele).
create function qualificacao_itens(c clientes_escritorio) returns table (chave text, falta boolean)
language sql stable
set search_path = public
as $$
  with s as (select cliente_assina(c) ->> 'situacao' sit),
       f as (select sit, sit in ('REPRESENTADO', 'ASSISTIDO') menor, sit in ('REPRESENTADO', 'ASSISTIDO', 'CURATELA') com_rl from s)
  select v.chave, v.falta
    from f, lateral (values
      (1, 'DOCUMENTO', c.documento is null, true),
      (2, 'NACIONALIDADE', c.nacionalidade is null, c.tipo = 'PF'),
      (3, 'ESTADO_CIVIL', c.estado_civil is null, c.tipo = 'PF' and not f.menor),
      (4, 'PROFISSAO', c.profissao is null, c.tipo = 'PF' and not f.menor),
      (5, 'RG', c.rg is null, c.tipo = 'PF' and not f.menor),
      (6, 'ENDERECO', c.endereco is null or c.cidade is null or c.uf is null, true),
      (7, 'RL_DOCUMENTO', c.rl_documento is null, f.com_rl),
      (8, 'RL_RG', c.rl_rg is null, f.com_rl),
      (9, 'RL_QUALIFICACAO', c.rl_nacionalidade is null or c.rl_estado_civil is null or c.rl_profissao is null, f.com_rl),
      (10, 'RL_ENDERECO', c.rl_endereco is null or c.rl_cidade is null or c.rl_uf is null, f.com_rl and c.rl_mora_junto is false),
      (11, 'REP_NOME', c.rep_nome is null, c.tipo = 'PJ'),
      (12, 'REP_CARGO', c.rep_cargo is null, c.tipo = 'PJ'),
      (13, 'REP_DOCUMENTO', c.rep_documento is null, c.tipo = 'PJ'),
      (14, 'REP_QUALIFICACAO', c.rep_estado_civil is null or c.rep_profissao is null, c.tipo = 'PJ')
    ) v(ordem, chave, falta, vale)
   where v.vale
   order by v.ordem
$$;

create or replace function qualificacao_faltando(c clientes_escritorio) returns text[]
language sql stable
set search_path = public
as $$ select coalesce(array_agg(chave), '{}') from qualificacao_itens(c) where falta $$;

create function qualificacao_total(c clientes_escritorio) returns integer
language sql stable
set search_path = public
as $$ select count(*)::integer from qualificacao_itens(c) $$;

-- ---------------------------------------------------------------------------------------
-- 3. Salvar o cliente com os campos novos

create or replace function campos_cliente() returns text[]
language sql immutable
as $$ select array['nome', 'documento', 'contatos', 'nacionalidade', 'estado_civil', 'profissao', 'rg', 'rg_orgao', 'cep',
                   'endereco', 'bairro', 'cidade', 'uf', 'rep_nome', 'rep_cargo', 'rep_documento', 'rep_estado_civil',
                   'rep_profissao', 'origem', 'origem_indicacao', 'capacidade', 'nascimento', 'rl_papel', 'rl_nome', 'rl_documento',
                   'rl_rg', 'rl_rg_orgao', 'rl_nacionalidade', 'rl_estado_civil', 'rl_profissao', 'rl_mora_junto', 'rl_cep',
                   'rl_endereco', 'rl_bairro', 'rl_cidade', 'rl_uf', 'cur_modo', 'cur_processo', 'cur_vara'] $$;

-- Arruma quem assina antes de gravar e confere o que a tela confere (os erros voltam presos ao
-- campo). O menor com 18 anos ou mais só passa se a data já era a do cadastro (a ficha de quem
-- fez 18 continua editável até a janela "Agora assina por si").
create function cliente_quem_assina_ok(n inout clientes_escritorio, v_antigo clientes_escritorio) returns clientes_escritorio
language plpgsql
set search_path = public
as $$
begin
  n.capacidade := coalesce(n.capacidade, 'PLENA');
  if n.capacidade not in ('PLENA', 'MENOR', 'CURATELA') then perform recusar_campos('Escolha quem assina', 'capacidade'); end if;
  if n.tipo = 'PJ' or n.capacidade = 'PLENA' then
    n.capacidade := 'PLENA';
    n.nascimento := null; n.rl_papel := null; n.rl_nome := null; n.rl_documento := null; n.rl_rg := null; n.rl_rg_orgao := null;
    n.rl_nacionalidade := null; n.rl_estado_civil := null; n.rl_profissao := null; n.rl_mora_junto := null;
    n.cur_modo := null; n.cur_processo := null; n.cur_vara := null;
  end if;
  if n.capacidade = 'MENOR' then
    n.cur_modo := null; n.cur_processo := null; n.cur_vara := null;
    if n.nascimento is null then perform recusar_campos('Escreva a data de nascimento', 'nascimento'); end if;
    if n.nascimento > hoje_brasilia() then perform recusar_campos('A data de nascimento está no futuro', 'nascimento'); end if;
    if idade_em(n.nascimento, hoje_brasilia()) >= 18
       and not coalesce(v_antigo.capacidade = 'MENOR' and v_antigo.nascimento = n.nascimento, false) then
      perform recusar_campos('Com esta data, o cliente já tem 18 anos e assina por si', 'nascimento');
    end if;
    if n.rl_papel is null or n.rl_papel not in ('MAE', 'PAI', 'TUTORA', 'TUTOR') then perform recusar_campos('Escolha quem é', 'rl_papel'); end if;
  elsif n.capacidade = 'CURATELA' then
    n.nascimento := null;
    n.cur_modo := coalesce(n.cur_modo, 'REPRESENTA');
    if n.rl_papel is null or n.rl_papel not in ('CURADORA', 'CURADOR') then perform recusar_campos('Escolha quem é', 'rl_papel'); end if;
  end if;
  if n.capacidade <> 'PLENA' then
    if length(btrim(coalesce(n.rl_nome, ''))) < 2 then perform recusar_campos('Escreva o nome de quem assina', 'rl_nome'); end if;
    if n.rl_documento is not null and not cpf_valido(n.rl_documento) then perform recusar_campos('CPF inválido', 'rl_documento'); end if;
    if n.rl_documento is not null and n.rl_documento = n.documento then
      perform recusar_campos('O CPF de quem assina é o mesmo do cliente', 'rl_documento');
    end if;
    n.rl_mora_junto := coalesce(n.rl_mora_junto, true);
  end if;
  if n.rl_mora_junto is distinct from false then
    n.rl_cep := null; n.rl_endereco := null; n.rl_bairro := null; n.rl_cidade := null; n.rl_uf := null;
  end if;
end $$;

create or replace function cliente_gravar(p_pessoa uuid, p_escritorio uuid, p_cliente uuid, p_versao integer, p_dados jsonb)
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
  -- Campo em branco vale como vazio; documento, CPFs e CEPs ficam só com os dígitos.
  p_dados := coalesce((select jsonb_object_agg(k, case when k in ('documento', 'rep_documento', 'cep', 'rl_documento', 'rl_cep')
                                                       then to_jsonb(regexp_replace(v #>> '{}', '[^0-9]', '', 'g'))
                                                       when jsonb_typeof(v) = 'string' then to_jsonb(btrim(v #>> '{}')) else v end)
                         from jsonb_each(p_dados) e(k, v)
                        where not (jsonb_typeof(v) = 'string' and btrim(v #>> '{}') = '') and jsonb_typeof(v) <> 'null'), '{}'::jsonb);
  begin
    n := jsonb_populate_record(null::clientes_escritorio, p_dados - 'id' - 'escritorio_id' - 'estado' - 'versao' - 'criado_por'
                                                                   - 'criado_em' - 'inativado_em' - 'inativado_por' - 'motivo_inativacao'
                                                                   - 'excluido_em' - 'arquivado_em');
  exception when invalid_datetime_format or datetime_field_overflow then
    perform recusar_campos('Confira a data de nascimento', 'nascimento');
  when invalid_text_representation then
    perform recusar_campos('Confira os campos marcados', 'dados');
  end;
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
  n := cliente_quem_assina_ok(n, v_antigo);

  if p_cliente is null then
    perform definir_transicao('CADASTRADO');
    insert into clientes_escritorio (escritorio_id, tipo, nome, documento, contatos, nacionalidade, estado_civil, profissao, rg, rg_orgao,
                                     cep, endereco, bairro, cidade, uf, rep_nome, rep_cargo, rep_documento, rep_estado_civil, rep_profissao,
                                     origem, origem_indicacao, criado_por, capacidade, nascimento, rl_papel, rl_nome, rl_documento, rl_rg,
                                     rl_rg_orgao, rl_nacionalidade, rl_estado_civil, rl_profissao, rl_mora_junto, rl_cep, rl_endereco,
                                     rl_bairro, rl_cidade, rl_uf, cur_modo, cur_processo, cur_vara)
    values (p_escritorio, n.tipo, btrim(n.nome), n.documento, n.contatos, n.nacionalidade, n.estado_civil, n.profissao, n.rg, n.rg_orgao,
            n.cep, n.endereco, n.bairro, n.cidade, n.uf, n.rep_nome, n.rep_cargo, n.rep_documento, n.rep_estado_civil, n.rep_profissao,
            n.origem, n.origem_indicacao, p_pessoa, n.capacidade, n.nascimento, n.rl_papel, btrim(n.rl_nome), n.rl_documento, n.rl_rg,
            n.rl_rg_orgao, n.rl_nacionalidade, n.rl_estado_civil, n.rl_profissao, n.rl_mora_junto, n.rl_cep, n.rl_endereco,
            n.rl_bairro, n.rl_cidade, n.rl_uf, n.cur_modo, n.cur_processo, n.cur_vara)
    returning id, versao into v_id, v_versao;
    perform registrar_historico('cliente.cadastrado', 'cliente', v_id::text, jsonb_build_object('tipo', n.tipo));
    return jsonb_build_object('id', v_id, 'versao', v_versao);
  end if;

  update clientes_escritorio set
    nome = btrim(n.nome), documento = n.documento, contatos = n.contatos, nacionalidade = n.nacionalidade,
    estado_civil = n.estado_civil, profissao = n.profissao, rg = n.rg, rg_orgao = n.rg_orgao, cep = n.cep, endereco = n.endereco,
    bairro = n.bairro, cidade = n.cidade, uf = n.uf, rep_nome = n.rep_nome, rep_cargo = n.rep_cargo, rep_documento = n.rep_documento,
    rep_estado_civil = n.rep_estado_civil, rep_profissao = n.rep_profissao, origem = n.origem, origem_indicacao = n.origem_indicacao,
    capacidade = n.capacidade, nascimento = n.nascimento, rl_papel = n.rl_papel, rl_nome = btrim(n.rl_nome), rl_documento = n.rl_documento,
    rl_rg = n.rl_rg, rl_rg_orgao = n.rl_rg_orgao, rl_nacionalidade = n.rl_nacionalidade, rl_estado_civil = n.rl_estado_civil,
    rl_profissao = n.rl_profissao, rl_mora_junto = n.rl_mora_junto, rl_cep = n.rl_cep, rl_endereco = n.rl_endereco,
    rl_bairro = n.rl_bairro, rl_cidade = n.rl_cidade, rl_uf = n.rl_uf, cur_modo = n.cur_modo, cur_processo = n.cur_processo,
    cur_vara = n.cur_vara
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
      case v_restricao when 'clientes_escritorio_rl_documento_outro' then 'rl_documento'
                       when 'clientes_escritorio_capacidade_regras' then 'capacidade'
                       else coalesce(substring(v_restricao from '^clientes_escritorio_(.+)_check$'), 'dados') end);
  end;
end $$;

-- ---------------------------------------------------------------------------------------
-- 4. A ficha: quem assina, o total do que a procuração pede e quem assinava antes dos 18

create function cliente_quem_assinava(p_escritorio uuid, p_cliente uuid) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object('papel', q.papel, 'nome', q.nome, 'documento', q.documento, 'ate', q.ate,
           'contratos', coalesce((select jsonb_agg(distinct ct.numero) from documentos_gerados g join contratos ct on ct.id = g.contrato_id
                                   where ct.cliente_id = p_cliente and ct.escritorio_id = p_escritorio
                                     and (g.gerado_em at time zone 'America/Sao_Paulo')::date <= q.ate), '[]'::jsonb))
    from clientes_quem_assinava q
   where q.cliente_id = p_cliente and q.escritorio_id = p_escritorio
   order by q.registrado_em desc limit 1
$$;

alter function portal_cliente(uuid, uuid, uuid) rename to portal_cliente_sem_assina;

create function portal_cliente(p_pessoa uuid, p_escritorio uuid, p_cliente uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  f jsonb := portal_cliente_sem_assina(p_pessoa, p_escritorio, p_cliente);
  c clientes_escritorio;
begin
  select * into c from clientes_escritorio where id = p_cliente and escritorio_id = p_escritorio;
  return f || jsonb_build_object(
    'assina', case when c.tipo = 'PF' and c.estado <> 'EXCLUIDO' then cliente_assina(c) end,
    'totalQualificacao', case when c.estado = 'EXCLUIDO' then 0 else qualificacao_total(c) end,
    'quemAssinava', cliente_quem_assinava(p_escritorio, p_cliente));
end $$;

-- ---------------------------------------------------------------------------------------
-- 5. "Agora assina por si" (a janela dos 18 anos, pergunta 3): só quando o cliente já fez 18.
-- Na mesma transação, guarda quem assinava, limpa a data e o responsável e completa o estado
-- civil e a profissão, que agora vão no documento.

create function portal_cliente_assina_por_si(p_pessoa uuid, p_escritorio uuid, p_cliente uuid, p_versao integer, p_dados jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c clientes_escritorio;
  v_civil text := nullif(btrim(coalesce(p_dados ->> 'estado_civil', '')), '');
  v_prof text := nullif(btrim(coalesce(p_dados ->> 'profissao', '')), '');
  v_versao integer;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'clientes.editar');
  if p_versao is null then perform recusar_campos('Falta a versão lida', 'versao'); end if;
  select * into c from clientes_escritorio where id = p_cliente and escritorio_id = p_escritorio;
  if c.id is null then raise exception 'Cliente não encontrado' using errcode = 'TC404'; end if;
  if c.estado in ('EXCLUIDO', 'ARQUIVADO') then
    perform recusar_motivo('Este cliente não muda mais', case c.estado when 'EXCLUIDO' then 'CLIENTE_EXCLUIDO' else 'CLIENTE_ARQUIVADO' end);
  end if;
  if cliente_assina(c) ->> 'situacao' <> 'FEZ_18' then
    perform recusar_motivo('O cliente ainda não fez 18 anos', 'CLIENTE_NAO_FEZ_18');
  end if;
  if v_civil is not null and v_civil not in ('SOLTEIRO', 'CASADO', 'UNIAO_ESTAVEL', 'SEPARADO', 'DIVORCIADO', 'VIUVO') then
    perform recusar_campos('Escolha uma das opções', 'estado_civil');
  end if;
  if v_prof is not null and length(v_prof) not between 2 and 80 then perform recusar_campos('Escreva a profissão', 'profissao'); end if;

  update clientes_escritorio set
    capacidade = 'PLENA', nascimento = null, rl_papel = null, rl_nome = null, rl_documento = null, rl_rg = null, rl_rg_orgao = null,
    rl_nacionalidade = null, rl_estado_civil = null, rl_profissao = null, rl_mora_junto = null, rl_cep = null, rl_endereco = null,
    rl_bairro = null, rl_cidade = null, rl_uf = null,
    estado_civil = coalesce(v_civil, estado_civil), profissao = coalesce(v_prof, profissao)
   where id = p_cliente and escritorio_id = p_escritorio and versao = p_versao
  returning versao into v_versao;
  if v_versao is null then perform conflito_versao('clientes_escritorio', p_cliente); end if;
  insert into clientes_quem_assinava (escritorio_id, cliente_id, papel, nome, documento, ate, registrado_por)
  values (p_escritorio, p_cliente, c.rl_papel, c.rl_nome, c.rl_documento, ((c.nascimento + interval '18 years')::date - 1), p_pessoa);
  perform registrar_historico('cliente.passou_a_assinar', 'cliente', p_cliente::text,
    jsonb_build_object('fez18', (c.nascimento + interval '18 years')::date,
                       'campos', to_jsonb(array_remove(array['capacidade', 'nascimento', 'rl_nome',
                                   case when v_civil is not null then 'estado_civil' end, case when v_prof is not null then 'profissao' end], null))));
  return jsonb_build_object('id', p_cliente, 'versao', v_versao);
end $$;

-- ---------------------------------------------------------------------------------------
-- 6. Gerar documentos: o cliente leva quem assina; o documento guarda quem assinou no dia.

alter function documento_dados(uuid, uuid, contratos) rename to documento_dados_sem_responsavel;

create function documento_dados(p_pessoa uuid, p_escritorio uuid, c contratos) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_set(d, '{cliente}', (d -> 'cliente') || (select jsonb_build_object(
           'capacidade', k.capacidade, 'nascimento', k.nascimento, 'rlPapel', k.rl_papel, 'rlNome', k.rl_nome,
           'rlDocumento', k.rl_documento, 'rlRg', k.rl_rg, 'rlRgOrgao', k.rl_rg_orgao, 'rlNacionalidade', k.rl_nacionalidade,
           'rlEstadoCivil', k.rl_estado_civil, 'rlProfissao', k.rl_profissao, 'rlMoraJunto', k.rl_mora_junto, 'rlCep', k.rl_cep,
           'rlEndereco', k.rl_endereco, 'rlBairro', k.rl_bairro, 'rlCidade', k.rl_cidade, 'rlUf', k.rl_uf, 'curModo', k.cur_modo,
           'curProcesso', k.cur_processo, 'curVara', k.cur_vara)
           from clientes_escritorio k where k.id = c.cliente_id))
    from (select documento_dados_sem_responsavel(p_pessoa, p_escritorio, c) d) x
$$;

-- Quem assinou pelo menor ou pelo curatelado no dia da geração (decisão 16 de Procurações).
create function documento_gerado_responsavel() returns trigger
language plpgsql
set search_path = public
as $$
declare
  k clientes_escritorio;
  v_sit text;
begin
  if new.representante is not null then return new; end if;
  select * into k from clientes_escritorio where id = (select cliente_id from contratos where id = new.contrato_id);
  v_sit := cliente_assina(k) ->> 'situacao';
  if v_sit in ('REPRESENTADO', 'ASSISTIDO', 'CURATELA') then
    new.representante := jsonb_build_object('nome', k.rl_nome,
      'cargo', case k.rl_papel when 'MAE' then 'mãe' when 'PAI' then 'pai' when 'TUTORA' then 'tutora' when 'TUTOR' then 'tutor'
                               when 'CURADORA' then 'curadora' else 'curador' end,
      'situacao', case when v_sit = 'CURATELA' and k.cur_modo = 'ASSISTE' then 'CURATELA_ASSISTE'
                       when v_sit = 'CURATELA' then 'CURATELA_REPRESENTA' else v_sit end,
      'idade', cliente_assina(k) -> 'idade');
  end if;
  return new;
end $$;
create trigger documento_gerado_responsavel before insert on documentos_gerados
  for each row execute function documento_gerado_responsavel();

-- ---------------------------------------------------------------------------------------
-- 7. O sino dos 18 anos (pergunta 3): no dia, para quem responde pelo contrato ativo e pelo caso
-- em andamento do cliente. Uma vez por pessoa e por cliente.

do $$
declare
  v_tipos text[];
  v_origens text[];
begin
  select array_agg(distinct x) into v_tipos from (
    select unnest(regexp_matches(pg_get_constraintdef(oid), '''([A-Z0-9_]+)''', 'g')) x
      from pg_constraint where conrelid = 'avisos_sino'::regclass and conname = 'avisos_sino_tipo_check'
    union select 'CLIENTE_FEZ_18') t;
  select array_agg(distinct x) into v_origens from (
    select unnest(regexp_matches(pg_get_constraintdef(oid), '''([a-z0-9_]+)''', 'g')) x
      from pg_constraint where conrelid = 'avisos_sino'::regclass and conname = 'avisos_sino_origem_tabela_check'
    union select 'clientes') t;
  alter table avisos_sino drop constraint avisos_sino_tipo_check;
  execute format('alter table avisos_sino add constraint avisos_sino_tipo_check check (tipo in (%s))',
                 (select string_agg(quote_literal(x), ', ' order by x) from unnest(v_tipos) x));
  alter table avisos_sino drop constraint avisos_sino_origem_tabela_check;
  execute format('alter table avisos_sino add constraint avisos_sino_origem_tabela_check check (origem_tabela in (%s))',
                 (select string_agg(quote_literal(x), ', ' order by x) from unnest(v_origens) x));
end $$;

create function avisar_clientes_fez_18() returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lista uuid[];
  v_esc uuid;
  v_hoje date := hoje_brasilia();
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
      select distinct k.id cliente_id, k.nome, k.rl_papel, k.rl_nome, (k.nascimento + interval '18 years')::date fez, r.pessoa_id
        from clientes_escritorio k
        join lateral (select ct.responsavel_id pessoa_id from contratos ct
                       where ct.cliente_id = k.id and ct.escritorio_id = v_esc and ct.estado <> 'ENCERRADO'
                      union
                      select s.responsavel_id from casos s join caso_clientes cc on cc.caso_id = s.id
                       where cc.cliente_id = k.id and s.escritorio_id = v_esc and s.situacao = 'ANDAMENTO') r on true
       where k.escritorio_id = v_esc and k.capacidade = 'MENOR' and k.estado = 'ATIVO'
         and (k.nascimento + interval '18 years')::date between v_hoje - 30 and v_hoje
         and not exists (select 1 from avisos_sino a
                          where a.escritorio_id = v_esc and a.tipo = 'CLIENTE_FEZ_18' and a.origem_id = k.id and a.pessoa_id = r.pessoa_id)
    loop
      perform aviso_sino(v_esc, p.pessoa_id, null, 'CLIENTE_FEZ_18', 'clientes', p.cliente_id, jsonb_build_object(
        'cliente', p.nome, 'em', to_char(p.fez, 'DD/MM/YYYY'),
        'quem', split_part(p.rl_nome, ' ', 1) || case p.rl_papel when 'MAE' then ', a mãe' when 'PAI' then ', o pai'
                                                                 when 'TUTORA' then ', a tutora' else ', o tutor' end));
      v_n := v_n + 1;
    end loop;
  end loop;
  perform limpar_contexto();
  return jsonb_build_object('avisos', v_n, 'em', v_hoje);
end $$;

-- Todo dia às 7h de Brasília (10h UTC), onde o pg_cron existe.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('t3jus-clientes-fez-18', '0 10 * * *', 'select public.avisar_clientes_fez_18()');
  end if;
end $$;

call fechar_acesso();
