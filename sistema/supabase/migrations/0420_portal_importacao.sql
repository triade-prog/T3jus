-- Importar clientes e contratos de uma planilha (F3.55; VA-05), tela aprovada em
-- docs/design/aprovadas/portal-importacao (Carol, 20/11/2026). Respostas da Carol:
-- 1. clientes, todos da equipe; contratos, só quem tem a área Contratos (a mesma regra do
--    cadastro um por um); desfazer, só quem importou e a sócia dona;
-- 2. parcela paga antes do T3jus não vira recebimento: fica no contrato como informação, fora
--    do Caixa e sem recibo (a parcela nasce cancelada, com pago_antes, e nenhuma tela de
--    dinheiro a conta);
-- 3. outros sistemas ficam para depois (F3.56): só planilha agora;
-- 4. desfazer vale por 7 dias, e só para o que ninguém mexeu depois.
-- O arquivo nunca fica guardado: a API lê o .xlsx ou o .csv na memória e manda para cá só as
-- células (abas), que ficam na importação até importar, cancelar ou vencer as 24 horas. Nada
-- entra no cadastro antes de importar; importar é uma transação só (entra tudo ou nada).

-- ---------------------------------------------------------------------------------------
-- Tabelas.

create table importacoes (
  id               uuid primary key default gen_random_uuid(),
  escritorio_id    uuid not null references escritorios (id) on delete restrict,
  arquivo_nome     text not null check (length(btrim(arquivo_nome)) between 1 and 200),
  o_que            text not null check (o_que in ('CLIENTES', 'CLIENTES_CONTRATOS')),
  estado           text not null default 'PREVIA',
  -- As células lidas do arquivo, só enquanto a prévia existe: [{nome, colunas, linhas}].
  abas             jsonb check (abas is null or jsonb_typeof(abas) = 'array'),
  aba              smallint check (aba between 0 and 19),
  -- Coluna da planilha (índice, em texto) -> campo do T3jus; e os pares de valores das listas.
  ligacao          jsonb not null default '{}'::jsonb check (jsonb_typeof(ligacao) = 'object'),
  pares            jsonb not null default '{}'::jsonb check (jsonb_typeof(pares) = 'object'),
  linhas_lidas     integer check (linhas_lidas between 0 and 2000),
  -- O que entrou (contagens e centavos), gravado ao importar.
  resumo           jsonb,
  criado_por       uuid not null references pessoas (id) on delete restrict,
  criado_em        timestamptz not null default app_now(),
  importado_em     timestamptz,
  desfazer_ate     timestamptz,
  desfeita_em      timestamptz,
  desfeita_por     uuid references pessoas (id) on delete restrict,
  motivo_desfazer  text check (length(btrim(motivo_desfazer)) between 3 and 300),
  versao           integer not null default 1,
  check ((estado = 'CONCLUIDA' or estado = 'DESFEITA') = (importado_em is not null)),
  check ((importado_em is null) = (desfazer_ate is null)),
  check ((estado = 'DESFEITA') = (desfeita_em is not null and desfeita_por is not null and motivo_desfazer is not null)),
  check (estado = 'PREVIA' or abas is null)
);
create index importacoes_escritorio on importacoes (escritorio_id, criado_em desc);
call proteger_tabela_escritorio('importacoes');
call ligar_guardiao('importacoes');
insert into estados_iniciais (tabela, estado) values ('importacoes', 'PREVIA');
insert into transicoes_permitidas (tabela, de, para) values
  ('importacoes', 'PREVIA', 'CONCLUIDA'), ('importacoes', 'PREVIA', 'CANCELADA'), ('importacoes', 'PREVIA', 'EXPIRADA'),
  ('importacoes', 'CONCLUIDA', 'DESFEITA');

-- Uma linha da planilha. bruto = campo -> texto como veio; correcoes = o que a pessoa corrigiu
-- na prévia (a planilha não muda); norm = a linha já conferida (o que vai gravar).
create table importacao_linhas (
  id             uuid primary key default gen_random_uuid(),
  escritorio_id  uuid not null references escritorios (id) on delete restrict,
  importacao_id  uuid not null references importacoes (id) on delete cascade,
  numero         integer not null check (numero between 2 and 2001),
  bruto          jsonb not null check (jsonb_typeof(bruto) = 'object'),
  correcoes      jsonb not null default '{}'::jsonb check (jsonb_typeof(correcoes) = 'object'),
  norm           jsonb not null default '{}'::jsonb,
  problemas      jsonb not null default '[]'::jsonb check (jsonb_typeof(problemas) = 'array'),
  situacao       text not null default 'PRONTA' check (situacao in ('PRONTA', 'AVISO', 'ERRO', 'PULADA', 'IMPORTADA')),
  decisao        text check (decisao in ('JUNTAR', 'NOVO', 'SEGUIR', 'PULAR')),
  cliente_id     uuid references clientes_escritorio (id) on delete restrict,
  contrato_id    uuid references contratos (id) on delete restrict,
  -- No cadastro juntado: os campos que a planilha preencheu (para o desfazer devolver).
  preenchidos    jsonb,
  corrigida_por  uuid references pessoas (id) on delete restrict,
  unique (importacao_id, numero)
);
call proteger_tabela_escritorio('importacao_linhas');

alter table clientes_escritorio add column importacao_id uuid references importacoes (id) on delete restrict;
alter table contratos add column importacao_id uuid references importacoes (id) on delete restrict;
create index clientes_escritorio_importacao on clientes_escritorio (escritorio_id, importacao_id) where importacao_id is not null;
-- A parcela paga antes do T3jus (pergunta 2): nasce cancelada com este sinal; é informação.
alter table recebimentos_previstos add column pago_antes boolean not null default false;
alter table recebimentos_previstos add check (not pago_antes or cancelado_em is not null);

insert into inventario_dados (tabela, dado_pessoal, o_que, para_que, base_legal, controlador, prazo, no_fim, situacao, exportar) values
 ('importacoes', true,
  'Importações de planilha: nome do arquivo, quem importou, quando, o que entrou e o motivo de desfazer; as células lidas só até importar',
  'Trazer ao T3jus os clientes e contratos que o escritório já tinha numa planilha (VA-05)',
  'Execução de contrato (LGPD, art. 7º, V)', 'Escritório',
  'As células lidas: até importar, cancelar ou 24 horas. O registro: enquanto o escritório for cliente do T3jus',
  'As células são apagadas; o registro é exportado ao escritório e apagado com ele', 'APROVADO', true),
 ('importacao_linhas', true,
  'Linhas da planilha na prévia e as que não entraram, com o motivo, as correções e as decisões',
  'Conferir antes de salvar e devolver as linhas que ficaram de fora (VA-05)',
  'Execução de contrato (LGPD, art. 7º, V)', 'Escritório',
  'A prévia: 24 horas. As linhas de fora: até o fim do prazo de desfazer (7 dias)',
  'Apagadas no fim do prazo', 'APROVADO', false);

-- ---------------------------------------------------------------------------------------
-- Peças: ler os valores da planilha.

create function imp_sem_acento(p text) returns text
language sql immutable
as $$ select translate(lower(btrim(coalesce(p, ''))), 'áàâãäéèêëíìîïóòôõöúùûüçñº°', 'aaaaaeeeeiiiiooooouuuucnoo') $$;

-- A chave de um valor das listas: sem acento, sem espaços repetidos.
create function imp_chave(p text) returns text
language sql immutable
as $$ select regexp_replace(imp_sem_acento(p), '\s+', ' ', 'g') $$;

create function imp_campos_cliente() returns text[]
language sql immutable
as $$ select array['nome', 'documento', 'telefone', 'email', 'contato_nome', 'contato_papel', 'nacionalidade', 'estado_civil', 'profissao',
                   'rg', 'rg_orgao', 'cep', 'endereco', 'bairro', 'cidade', 'uf', 'origem', 'origem_indicacao'] $$;

create function imp_campos_contrato() returns text[]
language sql immutable
as $$ select array['objeto', 'tipo', 'valor', 'parcelas', 'primeiro', 'pagas', 'assinatura', 'responsavel'] $$;

-- O campo sugerido pelo nome da coluna; nulo fica de fora.
create function imp_sugerir(p_coluna text) returns text
language sql immutable
as $$
  select case
    when c ~ '(^|\W)(obs|observ|anotac|comentario|nota)' then null
    when c ~ '(^|\W)area(\W|$)' then null
    when c ~ 'quem indicou|indicado por|indicacao de quem' then 'origem_indicacao'
    when c ~ 'origem|como chegou|como conheceu|canal' then 'origem'
    when c ~ 'cpf|cnpj|documento' then 'documento'
    when c ~ 'e-?mail' then 'email'
    when c ~ 'celular|telefone|whats|fone|(^|\W)tel(\W|$)' then 'telefone'
    when c ~ 'com quem falar|(^|\W)contato(\W|$)' then 'contato_nome'
    when c ~ 'papel|cargo' then 'contato_papel'
    when c ~ 'nacionalidade' then 'nacionalidade'
    when c ~ 'estado civil' then 'estado_civil'
    when c ~ 'profiss|ocupac' then 'profissao'
    when c ~ 'orgao|emissor' then 'rg_orgao'
    when c ~ '(^|\W)rg(\W|$)|identidade' then 'rg'
    when c ~ '(^|\W)cep(\W|$)' then 'cep'
    when c ~ 'bairro' then 'bairro'
    when c ~ 'cidade|municipio' then 'cidade'
    when c ~ '^(uf|estado)$' then 'uf'
    when c ~ 'endereco|logradouro|(^|\W)rua(\W|$)' then 'endereco'
    when c ~ 'assinatura|assinado' then 'assinatura'
    when c ~ 'pagas|ja pag|quitadas' then 'pagas'
    when c ~ 'vencimento|vencto|venc\.' then 'primeiro'
    when c ~ 'parcelas|n. de parc|qtd|quantidade' then 'parcelas'
    when c ~ 'forma de cobranca|tipo de honorario|cobranca|(^|\W)tipo(\W|$)' then 'tipo'
    when c ~ 'valor|honorario|preco' then 'valor'
    when c ~ 'advogad|responsavel' then 'responsavel'
    when c ~ 'objeto|servico|assunto|(^|\W)acao(\W|$)|demanda' then 'objeto'
    when c ~ 'nome|cliente|razao social' then 'nome'
  end
  from (select imp_chave(p_coluna) c) x
$$;

create function imp_fora_motivo(p_coluna text) returns text
language sql immutable
as $$
  select case when c ~ '(^|\W)(obs|observ|anotac|comentario|nota)' then 'OBSERVACAO'
              when c ~ '(^|\W)area(\W|$)' then 'AREA' end
    from (select imp_chave(p_coluna) c) x
$$;

-- Centavos de "4800", "4.800,00", "R$ 4.800,00" ou "4800.50"; nulo se não der para ler.
create function imp_valor(p text) returns bigint
language plpgsql immutable
as $$
declare v text := regexp_replace(replace(coalesce(p, ''), 'R$', ''), '[\s ]', '', 'g');
begin
  if v ~ '^[0-9]{1,3}(\.[0-9]{3})+(,[0-9]{1,2})?$' or v ~ '^[0-9]+(,[0-9]{1,2})?$' then
    v := replace(replace(v, '.', ''), ',', '.');
  elsif v !~ '^[0-9]+\.[0-9]{1,2}$' then
    return null;
  end if;
  return case when round(v::numeric * 100) between 1 and 10000000000 then round(v::numeric * 100)::bigint end;
end $$;

-- Percentual em pontos-base: "30%", "30" ou "30,5" (até 100%).
create function imp_percentual(p text) returns integer
language plpgsql immutable
as $$
declare v text := replace(regexp_replace(coalesce(p, ''), '[\s%]', '', 'g'), ',', '.');
begin
  if v !~ '^[0-9]{1,3}(\.[0-9]{1,2})?$' then return null; end if;
  return case when round(v::numeric * 100) between 1 and 10000 then round(v::numeric * 100)::integer end;
end $$;

-- Data em dd/mm/aaaa (também d/m/aa e aaaa-mm-dd); nula se não existir (31/02).
create function imp_data(p text) returns date
language plpgsql immutable
as $$
declare
  v text := btrim(coalesce(p, ''));
  m text[];
  d date;
begin
  m := regexp_match(v, '^([0-9]{1,2})[/.-]([0-9]{1,2})[/.-]([0-9]{2}|[0-9]{4})$');
  if m is not null then
    if length(m[3]) = 2 then m[3] := '20' || m[3]; end if;
    v := m[3] || '-' || lpad(m[2], 2, '0') || '-' || lpad(m[1], 2, '0');
  end if;
  if v !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then return null; end if;
  d := to_date(v, 'YYYY-MM-DD');
  return case when to_char(d, 'YYYY-MM-DD') = v and d between '1990-01-01' and '2100-12-31' then d end;
exception when others then
  return null;
end $$;

create function imp_inteiro(p text) returns integer
language sql immutable
as $$ select case when btrim(coalesce(p, '')) ~ '^[0-9]{1,3}$' then btrim(p)::integer end $$;

-- Telefone no formato internacional; nulo se não der para ler.
create function imp_telefone(p text) returns text
language sql immutable
as $$
  select case when d ~ '^55[1-9][0-9]{9,10}$' and length(d) between 12 and 13 then '+' || d
              when d ~ '^[1-9][0-9]{9,10}$' then '+55' || d
              when btrim(p) like '+%' and d ~ '^[1-9][0-9]{7,14}$' then '+' || d end
    from (select regexp_replace(coalesce(p, ''), '[^0-9]', '', 'g') d) x
$$;

create function imp_estado_civil(p text) returns text
language sql immutable
as $$
  select case when c ~ '^solteir' then 'SOLTEIRO' when c ~ '^casad' then 'CASADO'
              when c ~ 'uniao estavel|companheir|convivente' then 'UNIAO_ESTAVEL'
              when c ~ '^separad' then 'SEPARADO' when c ~ '^divorciad' then 'DIVORCIADO' when c ~ '^viuv' then 'VIUVO' end
    from (select imp_chave(p) c) x
$$;

create function imp_uf(p text) returns text
language sql immutable
as $$
  select case when u = any (array['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB',
                                   'PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']) then u end
    from (select upper(btrim(coalesce(p, ''))) u) x
$$;

-- As sugestões para os valores das listas (a pessoa confirma no passo 2).
create function imp_sugerir_tipo(p text) returns text
language sql immutable
as $$
  select case when c ~ 'parcel|prestac' then 'PARCELADO' when c ~ 'mensal|mes a mes|partido' then 'MENSAL'
              when c ~ 'exito|%|resultado' then 'EXITO' when c ~ 'fixo|a vista|unico|integral' then 'FIXO' end
    from (select imp_chave(p) c) x
$$;

create function imp_sugerir_origem(p text) returns text
language sql immutable
as $$
  select case when c ~ 'parceir|advogad|(^|\W)dra?\.?(\W|$)|doutor|colega' then 'INDICACAO_PARCEIRO'
              when c ~ 'indica|amig|cliente|familia|parente' then 'INDICACAO_CLIENTE'
              when c ~ 'google|busca' then 'GOOGLE' when c ~ 'insta' then 'INSTAGRAM'
              when c ~ '(^|\W)site|internet' then 'SITE' when c ~ 'passou|balcao|na porta|escritorio' then 'PASSOU_NO_ESCRITORIO' end
    from (select imp_chave(p) c) x
$$;

-- O responsável pelo nome: sem "Dr."/"Dra.", pelo nome inteiro ou pelo primeiro nome, só quando
-- um só da equipe combina.
create function imp_sugerir_responsavel(p text, p_escritorio uuid) returns uuid
language sql stable
set search_path = public
as $$
  with alvo as (select btrim(regexp_replace(imp_chave(p), '^(dra?\.?|doutora?)\s+', '')) a),
  eq as (select distinct p2.id, imp_chave(p2.nome) n from vinculos v join pessoas p2 on p2.id = v.pessoa_id
          where v.escritorio_id = p_escritorio and v.funcao in ('SOCIO', 'EQUIPE') and v.revogado_em is null),
  achou as (select eq.id from eq, alvo where alvo.a <> '' and (eq.n = alvo.a or split_part(eq.n, ' ', 1) = alvo.a or eq.n like alvo.a || ' %'))
  select case when (select count(*) from achou) = 1 then (select id from achou) end
$$;

-- As parcelas que a condição gera (espelha contrato_programar), com as pagas antes do T3jus.
create function imp_parcelas(c jsonb, p_pagas integer) returns table (n integer, vencimento date, valor bigint, pago_antes boolean)
language plpgsql immutable
as $$
declare
  v_n integer;
  v_total bigint;
begin
  if c ->> 'tipo' = 'FIXO' then
    return query select 1, (c ->> 'vencimento')::date, (c ->> 'valor')::bigint, coalesce(p_pagas, 0) >= 1;
  elsif c ->> 'tipo' = 'PARCELADO' then
    v_n := (c ->> 'parcelas')::integer;
    v_total := (c ->> 'total')::bigint;
    return query select i + 1, ((c ->> 'primeiro')::date + make_interval(months => i))::date,
                        v_total / v_n + case when i < v_total % v_n then 1 else 0 end, i < coalesce(p_pagas, 0)
                   from generate_series(0, v_n - 1) i;
  elsif c ->> 'tipo' = 'MENSAL' then
    return query select i + 1, ((c ->> 'primeiro')::date + make_interval(months => i))::date, (c ->> 'valor')::bigint, i < coalesce(p_pagas, 0)
                   from generate_series(0, coalesce((c ->> 'meses')::integer, 12) - 1) i;
  end if;
end $$;

-- ---------------------------------------------------------------------------------------
-- Conferir uma linha. Devolve a linha pronta para gravar (norm) e os problemas. Erro impede a
-- linha de entrar; aviso pede uma decisão. Os nomes dos campos são os da ligação.

create function imp_problema(p_codigo text, p_campo text, p_nivel text, p_valor text default null) returns jsonb
language sql immutable
as $$ select jsonb_strip_nulls(jsonb_build_object('codigo', p_codigo, 'campo', p_campo, 'nivel', p_nivel, 'valor', p_valor)) $$;

create function imp_conferir(i importacoes, l importacao_linhas, out o_norm jsonb, out o_problemas jsonb)
language plpgsql stable
set search_path = public
as $$
declare
  d jsonb := l.bruto || l.correcoes;
  p jsonb := '[]'::jsonb;
  cli jsonb := '{}'::jsonb;
  ctr jsonb;
  cond jsonb;
  v text;
  v_doc text;
  v_tipo_cli text;
  v_tel text;
  v_email text;
  v_dup clientes_escritorio;
  v_outro clientes_escritorio;
  v_comercial boolean := tem_comercial(i.criado_por, i.escritorio_id);
  v_tipo text;
  v_valor bigint;
  v_perc integer;
  v_parc integer;
  v_prim date;
  v_pagas integer;
  v_ass date;
  v_resp uuid;
  v_max integer;
  v_gera jsonb;
  v_hoje date := hoje_brasilia();
begin
  -- Cliente.
  v := btrim(coalesce(d ->> 'nome', ''));
  if length(v) not between 2 and 160 then p := p || imp_problema('NOME_FALTA', 'nome', 'ERRO', nullif(v, '')); end if;
  cli := jsonb_build_object('nome', v);
  v_doc := nullif(regexp_replace(coalesce(d ->> 'documento', ''), '[^0-9]', '', 'g'), '');
  if v_doc is null then
    v_tipo_cli := case when imp_chave(v) ~ '(^|\W)(ltda|s\.?a\.?|me|epp|eireli)\.?$' then 'PJ' else 'PF' end;
  elsif length(v_doc) = 11 then
    v_tipo_cli := 'PF';
    if not cpf_valido(v_doc) then p := p || imp_problema('CPF_INVALIDO', 'documento', 'ERRO', d ->> 'documento'); v_doc := null; end if;
  elsif length(v_doc) = 14 then
    v_tipo_cli := 'PJ';
    if not cnpj_valido(v_doc) then p := p || imp_problema('CNPJ_INVALIDO', 'documento', 'ERRO', d ->> 'documento'); v_doc := null; end if;
  else
    v_tipo_cli := 'PF';
    p := p || imp_problema('DOCUMENTO_INVALIDO', 'documento', 'ERRO', d ->> 'documento');
    v_doc := null;
  end if;
  cli := cli || jsonb_build_object('tipo', v_tipo_cli, 'documento', v_doc);

  if coalesce(d ->> 'telefone', '') <> '' then
    v_tel := imp_telefone(d ->> 'telefone');
    if v_tel is null then p := p || imp_problema('TELEFONE_INVALIDO', 'telefone', 'ERRO', d ->> 'telefone'); end if;
  end if;
  if coalesce(d ->> 'email', '') <> '' then
    v_email := lower(btrim(d ->> 'email'));
    if length(v_email) > 254 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
      p := p || imp_problema('EMAIL_INVALIDO', 'email', 'ERRO', d ->> 'email');
      v_email := null;
    end if;
  end if;
  if coalesce(d ->> 'telefone', '') = '' and coalesce(d ->> 'email', '') = '' then
    p := p || imp_problema('CONTATO_OBRIGATORIO', 'telefone', 'ERRO');
  end if;
  cli := cli || jsonb_build_object('contatos', jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
    'nome', left(coalesce(nullif(btrim(coalesce(d ->> 'contato_nome', '')), ''), nullif(v, ''), 'Cliente'), 120),
    'papel', nullif(left(btrim(coalesce(d ->> 'contato_papel', '')), 60), ''),
    'telefone', v_tel, 'email', v_email, 'principal', true))));

  -- Os campos opcionais: o que não dá para ler fica vazio, com aviso.
  foreach v in array array['nacionalidade', 'profissao', 'rg', 'rg_orgao', 'endereco', 'bairro', 'cidade'] loop
    if coalesce(d ->> v, '') <> '' then
      v_max := case v when 'nacionalidade' then 60 when 'rg' then 20 when 'rg_orgao' then 20 when 'endereco' then 200 else 80 end;
      if length(btrim(d ->> v)) between (case when v in ('rg', 'endereco') then 3 else 2 end) and v_max then
        cli := cli || jsonb_build_object(v, btrim(d ->> v));
      else
        p := p || imp_problema('CAMPO_INVALIDO', v, 'AVISO', d ->> v);
      end if;
    end if;
  end loop;
  if coalesce(d ->> 'cep', '') <> '' then
    if regexp_replace(d ->> 'cep', '[^0-9]', '', 'g') ~ '^[0-9]{8}$' then cli := cli || jsonb_build_object('cep', regexp_replace(d ->> 'cep', '[^0-9]', '', 'g'));
    else p := p || imp_problema('CAMPO_INVALIDO', 'cep', 'AVISO', d ->> 'cep'); end if;
  end if;
  if coalesce(d ->> 'estado_civil', '') <> '' then
    if imp_estado_civil(d ->> 'estado_civil') is not null then cli := cli || jsonb_build_object('estado_civil', imp_estado_civil(d ->> 'estado_civil'));
    else p := p || imp_problema('FORA_DA_LISTA', 'estado_civil', 'AVISO', d ->> 'estado_civil'); end if;
  end if;
  if coalesce(d ->> 'uf', '') <> '' then
    if imp_uf(d ->> 'uf') is not null then cli := cli || jsonb_build_object('uf', imp_uf(d ->> 'uf'));
    else p := p || imp_problema('FORA_DA_LISTA', 'uf', 'AVISO', d ->> 'uf'); end if;
  end if;
  if v_comercial and coalesce(d ->> 'origem', '') <> '' then
    v := coalesce(i.pares -> 'origem' ->> imp_chave(d ->> 'origem'), imp_sugerir_origem(d ->> 'origem'));
    if v is null then p := p || imp_problema('FORA_DA_LISTA', 'origem', 'AVISO', d ->> 'origem');
    elsif v <> '' then cli := cli || jsonb_build_object('origem', v); end if;
  end if;
  if v_comercial and length(btrim(coalesce(d ->> 'origem_indicacao', ''))) between 2 and 120 then
    cli := cli || jsonb_build_object('origem_indicacao', btrim(d ->> 'origem_indicacao'));
  end if;

  -- Possível duplicado (aviso, não bloqueia): o mesmo documento ou o mesmo telefone.
  if v_doc is not null then
    select * into v_dup from clientes_escritorio c
     where c.escritorio_id = i.escritorio_id and c.documento = v_doc and c.estado <> 'EXCLUIDO' order by c.criado_em limit 1;
    if v_dup.id is not null then p := p || imp_problema('DUPLICADO', 'documento', 'AVISO'); end if;
  end if;
  if v_tel is not null then
    select * into v_outro from clientes_escritorio c
     where c.escritorio_id = i.escritorio_id and c.estado <> 'EXCLUIDO' and c.id is distinct from v_dup.id
       and exists (select 1 from jsonb_array_elements(c.contatos) k where k ->> 'telefone' = v_tel) order by c.criado_em limit 1;
    if v_outro.id is not null then p := p || imp_problema('TELEFONE_DE_OUTRO', 'telefone', 'AVISO'); end if;
  end if;

  -- Contrato: só na importação de contratos e quando a linha traz algum dado de contrato.
  if i.o_que = 'CLIENTES_CONTRATOS'
     and exists (select 1 from unnest(array['objeto', 'tipo', 'valor', 'parcelas', 'primeiro']) k where coalesce(d ->> k, '') <> '') then
    v := btrim(coalesce(d ->> 'objeto', ''));
    if length(v) not between 2 and 400 then p := p || imp_problema('OBJETO_FALTA', 'objeto', 'ERRO', nullif(v, '')); end if;
    ctr := jsonb_build_object('objeto', v);
    v_tipo := nullif(coalesce(i.pares -> 'tipo' ->> imp_chave(d ->> 'tipo'), imp_sugerir_tipo(d ->> 'tipo')), '');
    if coalesce(d ->> 'tipo', '') = '' or v_tipo is null then p := p || imp_problema('TIPO_FALTA', 'tipo', 'ERRO', nullif(d ->> 'tipo', '')); end if;
    if coalesce(d ->> 'valor', '') = '' then
      p := p || imp_problema('VALOR_FALTA', 'valor', 'ERRO');
    elsif v_tipo = 'EXITO' then
      v_perc := imp_percentual(d ->> 'valor');
      if v_perc is null then p := p || imp_problema('VALOR_INVALIDO', 'valor', 'ERRO', d ->> 'valor'); end if;
    else
      v_valor := imp_valor(d ->> 'valor');
      if v_valor is null then p := p || imp_problema('VALOR_INVALIDO', 'valor', 'ERRO', d ->> 'valor'); end if;
    end if;
    if coalesce(d ->> 'parcelas', '') <> '' then
      v_parc := imp_inteiro(d ->> 'parcelas');
      if v_parc is null or v_parc not between 1 and 120 then
        p := p || imp_problema('PARCELAS_INVALIDAS', 'parcelas', 'ERRO', d ->> 'parcelas'); v_parc := null;
      end if;
    elsif v_tipo = 'PARCELADO' then
      p := p || imp_problema('PARCELAS_INVALIDAS', 'parcelas', 'ERRO');
    end if;
    if v_tipo = 'PARCELADO' and v_valor is not null and v_parc is not null and v_valor < v_parc then
      p := p || imp_problema('VALOR_INVALIDO', 'valor', 'ERRO', d ->> 'valor');
    end if;
    if coalesce(d ->> 'primeiro', '') <> '' then
      v_prim := imp_data(d ->> 'primeiro');
      if v_prim is null then p := p || imp_problema('DATA_INVALIDA', 'primeiro', 'ERRO', d ->> 'primeiro'); end if;
    elsif v_tipo in ('FIXO', 'PARCELADO', 'MENSAL') then
      p := p || imp_problema('PRIMEIRO_FALTA', 'primeiro', 'ERRO');
    end if;
    v_max := case v_tipo when 'FIXO' then 1 when 'PARCELADO' then coalesce(v_parc, 120) when 'MENSAL' then coalesce(v_parc, 12) else 0 end;
    if coalesce(d ->> 'pagas', '') <> '' and v_tipo <> 'EXITO' then
      v_pagas := imp_inteiro(d ->> 'pagas');
      if v_pagas is null or v_pagas > v_max then p := p || imp_problema('PAGAS_INVALIDAS', 'pagas', 'ERRO', d ->> 'pagas'); v_pagas := null; end if;
    end if;
    if coalesce(d ->> 'assinatura', '') <> '' then
      v_ass := imp_data(d ->> 'assinatura');
      if v_ass is null or v_ass > v_hoje then p := p || imp_problema('DATA_INVALIDA', 'assinatura', 'ERRO', d ->> 'assinatura'); v_ass := null; end if;
    elsif i.ligacao ? 'assinatura' or exists (select 1 from jsonb_each_text(i.ligacao) x where x.value = 'assinatura') then
      p := p || imp_problema('SEM_ASSINATURA', 'assinatura', 'AVISO');
    end if;
    begin
      v_resp := coalesce(nullif(i.pares -> 'responsavel' ->> imp_chave(d ->> 'responsavel'), '')::uuid,
                         imp_sugerir_responsavel(d ->> 'responsavel', i.escritorio_id));
    exception when others then v_resp := null;
    end;
    if v_resp is null or not pessoa_do_escritorio(v_resp, i.escritorio_id) then
      p := p || imp_problema('RESPONSAVEL_FALTA', 'responsavel', 'ERRO', nullif(d ->> 'responsavel', '')); v_resp := null;
    end if;

    cond := case v_tipo
      when 'FIXO' then jsonb_build_object('tipo', 'FIXO', 'valor', v_valor, 'vencimento', v_prim)
      when 'PARCELADO' then jsonb_build_object('tipo', 'PARCELADO', 'total', v_valor, 'parcelas', v_parc, 'primeiro', v_prim)
      when 'MENSAL' then jsonb_build_object('tipo', 'MENSAL', 'valor', v_valor, 'primeiro', v_prim, 'meses', v_parc)
      when 'EXITO' then jsonb_build_object('tipo', 'EXITO', 'percentual', v_perc, 'sobre', 'o proveito econômico do cliente',
                                           'etapa', 'A ligar na ficha do contrato', 'dias', 0)
    end;
    if cond is not null and not exists (select 1 from jsonb_array_elements(p) x where x ->> 'nivel' = 'ERRO' and x ->> 'campo' in ('valor', 'parcelas', 'primeiro', 'tipo'))
       and cardinality(honorario_erros(i.escritorio_id, cond)) > 0 then
      p := p || imp_problema('VALOR_INVALIDO', 'valor', 'ERRO', d ->> 'valor');
    end if;
    ctr := ctr || jsonb_build_object('tipo', v_tipo, 'valor', coalesce(v_valor, v_perc), 'parcelas', v_parc, 'primeiro', v_prim,
                                     'pagas', coalesce(v_pagas, 0), 'assinatura', v_ass, 'responsavel', v_resp, 'condicao', cond);
    -- O que vai ao Financeiro: só o contrato assinado; a paga antes é informação.
    if cond is not null and v_tipo in ('FIXO', 'PARCELADO', 'MENSAL') and v_prim is not null and coalesce(v_valor, 0) > 0
       and (v_tipo <> 'PARCELADO' or v_parc is not null) then
      select jsonb_build_object(
               'parcelas', count(*) filter (where not x.pago_antes),
               'valor', coalesce(sum(x.valor) filter (where not x.pago_antes), 0),
               'vencidas', count(*) filter (where not x.pago_antes and x.vencimento < v_hoje),
               'valorVencido', coalesce(sum(x.valor) filter (where not x.pago_antes and x.vencimento < v_hoje), 0),
               'pagasAntes', count(*) filter (where x.pago_antes),
               'valorPagoAntes', coalesce(sum(x.valor) filter (where x.pago_antes), 0),
               'proxima', min(x.vencimento) filter (where not x.pago_antes and x.vencimento >= v_hoje),
               'lista', jsonb_agg(jsonb_build_object('n', x.n, 'vencimento', x.vencimento, 'valor', x.valor, 'pagoAntes', x.pago_antes) order by x.n))
        into v_gera from imp_parcelas(cond, coalesce(v_pagas, 0)) x;
    end if;
    ctr := ctr || jsonb_build_object('gera', v_gera);
  end if;

  o_norm := jsonb_build_object('cliente', jsonb_strip_nulls(cli), 'contrato', ctr,
                               'duplicado', case when v_dup.id is not null then jsonb_build_object('id', v_dup.id, 'nome', v_dup.nome) end,
                               'telefoneDe', case when v_outro.id is not null then jsonb_build_object('id', v_outro.id, 'nome', v_outro.nome) end);
  o_problemas := p;
end $$;

-- A situação que sai dos problemas e da decisão.
create function imp_situacao(p_problemas jsonb, p_decisao text, p_duplicado boolean) returns text
language sql immutable
as $$
  select case when p_decisao = 'PULAR' then 'PULADA'
              when exists (select 1 from jsonb_array_elements(p_problemas) x where x ->> 'nivel' = 'ERRO') then 'ERRO'
              when exists (select 1 from jsonb_array_elements(p_problemas) x where x ->> 'nivel' = 'AVISO')
                   and (p_decisao is null or (p_duplicado and p_decisao not in ('JUNTAR', 'NOVO'))) then 'AVISO'
              else 'PRONTA' end
$$;

create function imp_reconferir(p_importacao uuid, p_numero integer default null) returns void
language plpgsql
set search_path = public
as $$
declare
  i importacoes;
  l importacao_linhas;
  r record;
begin
  select * into i from importacoes where id = p_importacao;
  for l in select * from importacao_linhas where importacao_id = p_importacao and (p_numero is null or numero = p_numero) loop
    r := imp_conferir(i, l);
    -- A decisão de juntar perde o sentido se o duplicado sumiu (e vice-versa).
    if l.decisao in ('JUNTAR', 'NOVO') and r.o_norm -> 'duplicado' = 'null'::jsonb then l.decisao := null; end if;
    update importacao_linhas set norm = r.o_norm, problemas = r.o_problemas, decisao = l.decisao,
                                 situacao = imp_situacao(r.o_problemas, l.decisao, r.o_norm -> 'duplicado' <> 'null'::jsonb)
     where id = l.id;
  end loop;
  -- Duas linhas com o mesmo documento são um cliente só (o da primeira linha).
  update importacao_linhas x set norm = x.norm || jsonb_build_object('mesmaDe', y.primeira)
    from (select id, min(numero) over (partition by norm -> 'cliente' ->> 'documento') primeira, numero
            from importacao_linhas where importacao_id = p_importacao and norm -> 'cliente' ->> 'documento' is not null) y
   where x.id = y.id and x.importacao_id = p_importacao
     and (x.norm ->> 'mesmaDe') is distinct from (case when y.primeira < y.numero then y.primeira::text end);
  update importacao_linhas x set norm = x.norm - 'mesmaDe'
   where x.importacao_id = p_importacao and x.norm ? 'mesmaDe'
     and not exists (select 1 from importacao_linhas z where z.importacao_id = p_importacao and z.numero < x.numero
                       and z.norm -> 'cliente' ->> 'documento' = x.norm -> 'cliente' ->> 'documento');
  update importacao_linhas x set norm = x.norm || jsonb_build_object('mesmaDe', (x.norm ->> 'mesmaDe')::integer)
   where x.importacao_id = p_importacao and jsonb_typeof(x.norm -> 'mesmaDe') = 'string';
end $$;

-- ---------------------------------------------------------------------------------------
-- O que mostrar.

create function imp_letra(p integer) returns text
language sql immutable
as $$ select case when p < 26 then chr(65 + p) else chr(64 + p / 26) || chr(65 + p % 26) end $$;

-- A importação aberta pela pessoa (a prévia é só de quem importou).
create function imp_da_pessoa(p_pessoa uuid, p_escritorio uuid, p_importacao uuid, p_estado text default 'PREVIA') returns importacoes
language plpgsql
set search_path = public
as $$
declare i importacoes;
begin
  select * into i from importacoes where id = p_importacao and escritorio_id = p_escritorio;
  if i.id is null or (i.estado = 'PREVIA' and i.criado_por <> p_pessoa) then
    raise exception 'Importação não encontrada' using errcode = 'TC404';
  end if;
  if p_estado is not null and i.estado <> p_estado then
    if i.estado = 'EXPIRADA' then perform recusar_motivo('A prévia passou de 24 horas e foi apagada', 'PREVIA_EXPIRADA'); end if;
    perform recusar_motivo('A importação não está nesta etapa', 'IMPORTACAO_OUTRA_ETAPA');
  end if;
  return i;
end $$;

-- As colunas da aba escolhida, com o primeiro valor, a ligação atual e a sugestão.
create function imp_colunas(i importacoes) returns jsonb
language sql stable
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'indice', k - 1, 'letra', imp_letra((k - 1)::integer), 'nome', c.nome,
           'exemplo', (select x ->> (k - 1)::integer from jsonb_array_elements(a -> 'linhas') x where coalesce(x ->> (k - 1)::integer, '') <> '' limit 1),
           'campo', nullif(i.ligacao ->> (k - 1)::text, ''),
           'sugestao', imp_sugerir(c.nome), 'foraMotivo', imp_fora_motivo(c.nome)) order by k), '[]'::jsonb)
    from (select i.abas -> coalesce(i.aba, 0) a) aa, jsonb_array_elements_text(aa.a -> 'colunas') with ordinality c(nome, k)
$$;

create function imp_resumo(p_importacao uuid) returns jsonb
language sql stable
set search_path = public
as $$
  with l as (select * from importacao_linhas where importacao_id = p_importacao),
  p as (select * from l where situacao = 'PRONTA'),
  ativos as (select * from p where jsonb_typeof(norm -> 'contrato') = 'object' and norm -> 'contrato' ->> 'assinatura' is not null),
  parc as (select (g ->> 'vencimento')::date venc, (g ->> 'valor')::bigint valor, (g ->> 'pagoAntes')::boolean pago
             from ativos, jsonb_array_elements(case when jsonb_typeof(norm -> 'contrato' -> 'gera') = 'object' then norm -> 'contrato' -> 'gera' -> 'lista' else '[]' end) g),
  m as (select date_trunc('month', hoje_brasilia())::date base)
  select jsonb_build_object(
    'contagens', jsonb_build_object('lidas', (select count(*) from l), 'prontas', (select count(*) from l where situacao = 'PRONTA'),
                                    'aviso', (select count(*) from l where situacao = 'AVISO'), 'erro', (select count(*) from l where situacao = 'ERRO'),
                                    'puladas', (select count(*) from l where situacao = 'PULADA'),
                                    'corrigidas', (select count(*) from l where situacao = 'PRONTA' and correcoes <> '{}'::jsonb),
                                    'decididas', (select count(*) from l where situacao = 'PRONTA' and decisao is not null)),
    'clientes', jsonb_build_object(
       'novos', (select count(distinct coalesce(norm -> 'cliente' ->> 'documento', 'linha' || numero)) from p where decisao is distinct from 'JUNTAR'),
       'juntados', (select count(distinct norm -> 'duplicado' ->> 'id') from p where decisao = 'JUNTAR')),
    'contratos', jsonb_build_object('ativos', (select count(*) from ativos),
                                    'elaboracao', (select count(*) from p where jsonb_typeof(norm -> 'contrato') = 'object'
                                                     and norm -> 'contrato' ->> 'assinatura' is null),
                                    'mensais', (select count(*) from p where norm -> 'contrato' ->> 'tipo' = 'MENSAL'),
                                    'exitos', (select count(*) from p where norm -> 'contrato' ->> 'tipo' = 'EXITO')),
    'financeiro', jsonb_build_object('parcelas', (select count(*) from parc where not pago),
                                     'valor', (select coalesce(sum(valor), 0) from parc where not pago),
                                     'vencidas', (select count(*) from parc where not pago and venc < hoje_brasilia()),
                                     'pagasAntes', (select count(*) from parc where pago),
                                     'valorPagoAntes', (select coalesce(sum(valor), 0) from parc where pago)),
    'meses', (select jsonb_agg(jsonb_build_object('mes', to_char(mm, 'YYYY-MM'),
                                                 'valor', (select coalesce(sum(valor), 0) from parc where not pago and date_trunc('month', venc) = mm)) order by mm)
                from m, generate_series(m.base + interval '1 month', m.base + interval '3 months', interval '1 month') mm))
$$;

-- Uma linha da prévia: o que a pessoa vê e corrige.
create function imp_linha_json(l importacao_linhas) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'numero', l.numero, 'situacao', l.situacao, 'decisao', l.decisao, 'problemas', l.problemas,
    'valores', l.bruto || l.correcoes,
    'corrigidas', (select coalesce(jsonb_agg(jsonb_build_object('campo', k, 'antes', l.bruto ->> k, 'agora', v) order by k), '[]'::jsonb)
                     from jsonb_each_text(l.correcoes) e(k, v)),
    'cliente', l.norm -> 'cliente', 'mesmaDe', l.norm -> 'mesmaDe', 'telefoneDe', l.norm -> 'telefoneDe',
    'contrato', case when jsonb_typeof(l.norm -> 'contrato') = 'object'
                     then (l.norm -> 'contrato') - 'condicao' - 'responsavel'
                          || jsonb_build_object('responsavel', pessoa_ref(nullif(l.norm -> 'contrato' ->> 'responsavel', '')::uuid)) end,
    'duplicado', case when jsonb_typeof(l.norm -> 'duplicado') = 'object' then (
      select jsonb_build_object('id', c.id, 'nome', c.nome, 'situacao', c.estado, 'desde', c.criado_em,
               'contratos', (select coalesce(jsonb_agg(ct.numero order by ct.numero), '[]'::jsonb) from contratos ct
                              where ct.escritorio_id = c.escritorio_id and ct.cliente_id = c.id and ct.estado <> 'ENCERRADO'),
               'comparar', (select coalesce(jsonb_agg(jsonb_build_object('campo', k, 'planilha', pl, 'cadastrado', ca,
                                                          'resultado', case when ca is null then 'ENTRA' when imp_chave(ca) = imp_chave(pl) then 'IGUAL' else 'FICA' end)
                                              order by array_position(imp_campos_cliente(), k)), '[]'::jsonb)
                              from (select k,
                                           case k when 'telefone' then l.norm -> 'cliente' -> 'contatos' -> 0 ->> 'telefone'
                                                  when 'email' then l.norm -> 'cliente' -> 'contatos' -> 0 ->> 'email'
                                                  else l.norm -> 'cliente' ->> k end pl,
                                           case k when 'telefone' then contato_principal(c.contatos) ->> 'telefone'
                                                  when 'email' then contato_principal(c.contatos) ->> 'email'
                                                  else to_jsonb(c) ->> k end ca
                                      from unnest(imp_campos_cliente()) k
                                     where k not in ('contato_nome', 'contato_papel', 'origem', 'origem_indicacao')) cmp
                             where pl is not null))
        from clientes_escritorio c where c.id = (l.norm -> 'duplicado' ->> 'id')::uuid) end)
$$;

create function imp_json(i importacoes, p_pessoa uuid) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', i.id, 'arquivo', i.arquivo_nome, 'oQue', i.o_que, 'situacao', i.estado, 'versao', i.versao,
    'criadoEm', i.criado_em, 'por', pessoa_ref(i.criado_por), 'linhasLidas', i.linhas_lidas,
    'contratos', i.o_que = 'CLIENTES_CONTRATOS', 'comercial', tem_comercial(i.criado_por, i.escritorio_id),
    'abas', case when i.abas is not null then (select jsonb_agg(jsonb_build_object('indice', k - 1, 'nome', a ->> 'nome', 'linhas', jsonb_array_length(a -> 'linhas'),
                                                                                   'colunas', jsonb_array_length(a -> 'colunas')) order by k)
                                                 from jsonb_array_elements(i.abas) with ordinality x(a, k)) end,
    'aba', coalesce(i.aba, 0), 'colunas', case when i.abas is not null then imp_colunas(i) end,
    'ligacao', i.ligacao, 'pares', i.pares,
    'temPrevia', exists (select 1 from importacao_linhas where importacao_id = i.id),
    'importadoEm', i.importado_em, 'desfazerAte', i.desfazer_ate, 'resumo', i.resumo,
    'podeDesfazer', i.estado = 'CONCLUIDA' and i.desfazer_ate > app_now() and (i.criado_por = p_pessoa or e_socio_dono(p_pessoa, i.escritorio_id)),
    'fora', (select count(*) from importacao_linhas where importacao_id = i.id and situacao <> 'IMPORTADA' and i.estado <> 'PREVIA'),
    'desfeita', case when i.estado = 'DESFEITA' then jsonb_build_object('em', i.desfeita_em, 'por', pessoa_ref(i.desfeita_por), 'motivo', i.motivo_desfazer) end)
$$;

-- ---------------------------------------------------------------------------------------
-- Limpeza: a prévia vale 24 horas; as linhas de fora, até o fim do prazo de desfazer.

create function importacoes_limpar(p_escritorio uuid default null) returns integer
language plpgsql
set search_path = public
as $$
declare
  v integer := 0;
  i importacoes;
begin
  for i in select * from importacoes where (p_escritorio is null or escritorio_id = p_escritorio)
             and estado = 'PREVIA' and criado_em < app_now() - interval '24 hours' loop
    delete from importacao_linhas where importacao_id = i.id;
    perform definir_transicao('EXPIRADA', 'Prévia de mais de 24 horas', true);
    update importacoes set estado = 'EXPIRADA', abas = null where id = i.id;
    v := v + 1;
  end loop;
  delete from importacao_linhas x using importacoes im
   where x.importacao_id = im.id and (p_escritorio is null or im.escritorio_id = p_escritorio)
     and im.estado in ('CONCLUIDA', 'DESFEITA') and im.desfazer_ate < app_now();
  return v;
end $$;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('t3jus-importacoes', '15 * * * *', 'select public.importacoes_limpar()');
  end if;
end $$;

-- ---------------------------------------------------------------------------------------
-- Enviar: a API já leu o arquivo; aqui chegam o nome e as células. Começar outra importação
-- cancela a prévia anterior da mesma pessoa.

create function portal_importacao_criar(p_pessoa uuid, p_escritorio uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  i importacoes;
  v_oque text := p_dados ->> 'oQue';
  a jsonb;
  v_aba integer;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'clientes.editar');
  if v_oque is null or v_oque not in ('CLIENTES', 'CLIENTES_CONTRATOS') then perform recusar_campos('Escolha o que importar', 'oQue'); end if;
  if v_oque = 'CLIENTES_CONTRATOS' then
    perform entrar_area(p_pessoa, p_escritorio, 'CONTRATOS');
    perform entrar_escritorio(p_pessoa, p_escritorio, 'contratos.editar');
  end if;
  if length(btrim(coalesce(p_dados ->> 'arquivoNome', ''))) not between 1 and 200 then perform recusar_campos('Arquivo sem nome', 'arquivoNome'); end if;
  if jsonb_typeof(p_dados -> 'abas') is distinct from 'array' or jsonb_array_length(p_dados -> 'abas') not between 1 and 20 then
    perform recusar_motivo('Planilha vazia', 'ARQUIVO_VAZIO');
  end if;
  for a in select * from jsonb_array_elements(p_dados -> 'abas') loop
    if jsonb_typeof(a -> 'colunas') is distinct from 'array' or jsonb_typeof(a -> 'linhas') is distinct from 'array'
       or jsonb_array_length(a -> 'colunas') > 60 or length(coalesce(a ->> 'nome', '')) > 100 then
      perform recusar_campos('Planilha inválida', 'abas');
    end if;
    if jsonb_array_length(a -> 'linhas') > 2000 then perform recusar_motivo('Grande demais', 'ARQUIVO_GRANDE'); end if;
  end loop;
  select min(x.k - 1) into v_aba from jsonb_array_elements(p_dados -> 'abas') with ordinality x(ab, k)
   where jsonb_array_length(x.ab -> 'linhas') > 0 and jsonb_array_length(x.ab -> 'colunas') > 0;
  if v_aba is null then perform recusar_motivo('Planilha vazia', 'ARQUIVO_VAZIO'); end if;

  perform importacoes_limpar(p_escritorio);
  for i in select * from importacoes where escritorio_id = p_escritorio and criado_por = p_pessoa and estado = 'PREVIA' loop
    delete from importacao_linhas where importacao_id = i.id;
    perform definir_transicao('CANCELADA', 'Outra importação começou');
    update importacoes set estado = 'CANCELADA', abas = null where id = i.id;
  end loop;

  perform definir_transicao('ENVIADA');
  insert into importacoes (escritorio_id, arquivo_nome, o_que, abas, aba, criado_por)
  values (p_escritorio, btrim(p_dados ->> 'arquivoNome'), v_oque, p_dados -> 'abas', v_aba, p_pessoa)
  returning * into i;
  -- A ligação começa com a sugestão pelo nome (sem repetir campo; sem os campos que a pessoa
  -- não pode importar).
  update importacoes set ligacao = (
    select coalesce(jsonb_object_agg(indice, campo), '{}'::jsonb)
      from (select distinct on (c ->> 'sugestao') c ->> 'indice' indice, c ->> 'sugestao' campo
              from jsonb_array_elements(imp_colunas(i)) c
             where c ->> 'sugestao' is not null
               and (v_oque = 'CLIENTES_CONTRATOS' or not (c ->> 'sugestao' = any (imp_campos_contrato())))
               and (tem_comercial(p_pessoa, p_escritorio) or c ->> 'sugestao' not in ('origem', 'origem_indicacao'))
             order by c ->> 'sugestao', (c ->> 'indice')::integer) s)
   where id = i.id returning * into i;
  perform registrar_historico('importacao.enviada', 'importacoes', i.id::text, jsonb_build_object('arquivo', i.arquivo_nome, 'oQue', v_oque));
  return imp_json(i, p_pessoa);
end $$;

create function portal_importacao(p_pessoa uuid, p_escritorio uuid, p_importacao uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare i importacoes;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'clientes.ver');
  i := imp_da_pessoa(p_pessoa, p_escritorio, p_importacao, null);
  return imp_json(i, p_pessoa);
end $$;

-- Os valores diferentes das colunas de lista (responsável, tipo, origem), com quantas linhas
-- usam cada um e a sugestão. Não grava: a tela pede de novo quando a ligação muda.
create function imp_pares(i importacoes, p_aba integer, p_ligacao jsonb) returns jsonb
language sql stable
set search_path = public
as $$
  with lig as (select key::integer col, value campo from jsonb_each_text(p_ligacao) where value in ('responsavel', 'tipo', 'origem')),
  vals as (select lig.campo, btrim(coalesce(x ->> lig.col, '')) v from lig, jsonb_array_elements(i.abas -> p_aba -> 'linhas') x),
  g as (select campo, imp_chave(v) chave, min(v) valor, count(*) n from vals
         where v <> '' or campo = 'responsavel' group by campo, imp_chave(v))
  select jsonb_build_object(
    'responsavel', coalesce((select jsonb_agg(jsonb_build_object('chave', chave, 'valor', valor, 'n', n,
                                               'sugestao', case when chave = '' then null else imp_sugerir_responsavel(valor, i.escritorio_id) end) order by n desc, valor)
                               from g where campo = 'responsavel'),
                            case when i.o_que = 'CLIENTES_CONTRATOS' and not exists (select 1 from lig where campo = 'responsavel')
                                 then jsonb_build_array(jsonb_build_object('chave', '', 'valor', '', 'n', jsonb_array_length(i.abas -> p_aba -> 'linhas'), 'sugestao', null)) end,
                            '[]'::jsonb),
    'tipo', coalesce((select jsonb_agg(jsonb_build_object('chave', chave, 'valor', valor, 'n', n, 'sugestao', imp_sugerir_tipo(valor)) order by n desc, valor)
                        from g where campo = 'tipo'), '[]'::jsonb),
    'origem', coalesce((select jsonb_agg(jsonb_build_object('chave', chave, 'valor', valor, 'n', n, 'sugestao', imp_sugerir_origem(valor)) order by n desc, valor)
                          from g where campo = 'origem'), '[]'::jsonb),
    'equipe', (select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'nome', p.nome) order by p.nome), '[]'::jsonb)
                 from (select distinct v.pessoa_id from vinculos v
                        where v.escritorio_id = i.escritorio_id and v.funcao in ('SOCIO', 'EQUIPE') and v.revogado_em is null) v
                 join pessoas p on p.id = v.pessoa_id))
$$;

-- A ligação limpa: só índices da aba, só campos conhecidos que a pessoa pode importar, sem
-- campo repetido.
create function imp_ligacao_valida(i importacoes, p_aba integer, p_ligacao jsonb, p_pessoa uuid) returns jsonb
language plpgsql stable
set search_path = public
as $$
declare
  v_cols integer := jsonb_array_length(i.abas -> p_aba -> 'colunas');
  v_ok text[] := imp_campos_cliente() || case when i.o_que = 'CLIENTES_CONTRATOS' then imp_campos_contrato() else '{}' end;
  r jsonb := '{}'::jsonb;
  k text;
  v text;
begin
  if not tem_comercial(p_pessoa, i.escritorio_id) then v_ok := array_remove(array_remove(v_ok, 'origem'), 'origem_indicacao'); end if;
  if jsonb_typeof(p_ligacao) is distinct from 'object' then perform recusar_campos('Ligação inválida', 'ligacao'); end if;
  for k, v in select key, value from jsonb_each_text(p_ligacao) loop
    if v is null or v = '' then continue; end if;
    if k !~ '^[0-9]{1,2}$' or k::integer >= v_cols or not (v = any (v_ok)) then perform recusar_campos('Ligação inválida', 'ligacao'); end if;
    if exists (select 1 from jsonb_each_text(r) x where x.value = v) then perform recusar_campos('O mesmo campo em duas colunas', 'c' || k); end if;
    r := r || jsonb_build_object(k, v);
  end loop;
  return r;
end $$;

create function portal_importacao_pares(p_pessoa uuid, p_escritorio uuid, p_importacao uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  i importacoes;
  v_aba integer;
  j importacoes;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'clientes.editar');
  i := imp_da_pessoa(p_pessoa, p_escritorio, p_importacao);
  v_aba := coalesce(json_inteiro(p_dados, 'aba'), i.aba);
  if v_aba < 0 or v_aba >= jsonb_array_length(i.abas) then perform recusar_campos('Aba inválida', 'aba'); end if;
  -- As colunas da aba pedida vão junto: trocar de aba no passo 2 mostra as colunas dela.
  j := i;
  j.aba := v_aba;
  if v_aba is distinct from coalesce(i.aba, 0) then j.ligacao := '{}'::jsonb; end if;
  return imp_pares(i, v_aba, imp_ligacao_valida(i, v_aba, p_dados -> 'ligacao', p_pessoa)) || jsonb_build_object('colunas', imp_colunas(j));
end $$;

-- Gravar a ligação e os pares e montar a prévia. Falta de campo obrigatório: os campos que
-- faltam (nome, contato, objeto, tipo, valor, parcelas, primeiro, responsavel).
create function portal_importacao_colunas(p_pessoa uuid, p_escritorio uuid, p_importacao uuid, p_versao integer, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  i importacoes;
  v_aba integer;
  v_lig jsonb;
  v_pares jsonb := '{}'::jsonb;
  v_campos text[];
  e text[] := '{}';
  v_versao integer;
  x jsonb;
  v_tipos text[];
  v_linhas jsonb;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'clientes.editar');
  i := imp_da_pessoa(p_pessoa, p_escritorio, p_importacao);
  v_aba := coalesce(json_inteiro(p_dados, 'aba'), i.aba);
  if v_aba < 0 or v_aba >= jsonb_array_length(i.abas) then perform recusar_campos('Aba inválida', 'aba'); end if;
  v_lig := imp_ligacao_valida(i, v_aba, p_dados -> 'ligacao', p_pessoa);
  select array_agg(value) into v_campos from jsonb_each_text(v_lig);
  v_campos := coalesce(v_campos, '{}');

  -- Os pares: só as chaves que existem; o responsável tem de ser da equipe; o tipo, um dos quatro.
  if jsonb_typeof(coalesce(p_dados -> 'pares', '{}'::jsonb)) <> 'object' then perform recusar_campos('Pares inválidos', 'pares'); end if;
  for x in select jsonb_array_elements(imp_pares(i, v_aba, v_lig) -> 'responsavel') loop
    begin
      if not pessoa_do_escritorio((p_dados -> 'pares' -> 'responsavel' ->> (x ->> 'chave'))::uuid, p_escritorio) then raise exception 'x'; end if;
      v_pares := jsonb_set(v_pares, '{responsavel}', coalesce(v_pares -> 'responsavel', '{}') || jsonb_build_object(x ->> 'chave', p_dados -> 'pares' -> 'responsavel' ->> (x ->> 'chave')));
    exception when others then
      if x ->> 'sugestao' is not null then
        v_pares := jsonb_set(v_pares, '{responsavel}', coalesce(v_pares -> 'responsavel', '{}') || jsonb_build_object(x ->> 'chave', x ->> 'sugestao'));
      elsif x ->> 'chave' = '' and exists (select 1 from jsonb_each_text(v_lig) l2 where l2.value = 'responsavel') then
        null; -- linha sem advogado: só a linha com contrato pede o responsável
      else
        e := e || 'responsavel'::text;
      end if;
    end;
  end loop;
  for x in select jsonb_array_elements(imp_pares(i, v_aba, v_lig) -> 'tipo') loop
    v_pares := jsonb_set(v_pares, '{tipo}', coalesce(v_pares -> 'tipo', '{}') || jsonb_build_object(x ->> 'chave',
      case when p_dados -> 'pares' -> 'tipo' ->> (x ->> 'chave') in ('FIXO', 'PARCELADO', 'MENSAL', 'EXITO', '') then p_dados -> 'pares' -> 'tipo' ->> (x ->> 'chave')
           else coalesce(x ->> 'sugestao', '') end));
  end loop;
  for x in select jsonb_array_elements(imp_pares(i, v_aba, v_lig) -> 'origem') loop
    v_pares := jsonb_set(v_pares, '{origem}', coalesce(v_pares -> 'origem', '{}') || jsonb_build_object(x ->> 'chave',
      case when p_dados -> 'pares' -> 'origem' ->> (x ->> 'chave') in ('INDICACAO_CLIENTE', 'INDICACAO_PARCEIRO', 'GOOGLE', 'INSTAGRAM', 'SITE', 'PASSOU_NO_ESCRITORIO', 'OUTRA', '')
           then p_dados -> 'pares' -> 'origem' ->> (x ->> 'chave') else coalesce(x ->> 'sugestao', '') end));
  end loop;

  if not ('nome' = any (v_campos)) then e := e || 'nome'::text; end if;
  if not ('telefone' = any (v_campos) or 'email' = any (v_campos)) then e := e || 'contato'::text; end if;
  if i.o_que = 'CLIENTES_CONTRATOS' then
    foreach x in array array['"objeto"', '"tipo"', '"valor"']::jsonb[] loop
      if not ((x #>> '{}') = any (v_campos)) then e := e || (x #>> '{}'); end if;
    end loop;
    select array_agg(distinct value) into v_tipos from jsonb_each_text(coalesce(v_pares -> 'tipo', '{}'));
    if 'PARCELADO' = any (coalesce(v_tipos, '{}')) and not ('parcelas' = any (v_campos)) then e := e || 'parcelas'::text; end if;
    if coalesce(v_tipos, '{}') && array['FIXO', 'PARCELADO', 'MENSAL'] and not ('primeiro' = any (v_campos)) then e := e || 'primeiro'::text; end if;
  end if;
  if cardinality(e) > 0 then
    raise exception 'Falta ligar campos obrigatórios' using errcode = 'TC422',
      detail = jsonb_build_object('motivo', 'CAMPO_OBRIGATORIO_SEM_COLUNA', 'campos', to_jsonb(e))::text;
  end if;

  update importacoes set aba = v_aba, ligacao = v_lig, pares = v_pares, linhas_lidas = null
   where id = i.id and versao = p_versao returning versao into v_versao;
  if v_versao is null then perform conflito_versao('importacoes', i.id); end if;

  -- A prévia: cada linha não vazia, com só as colunas ligadas.
  delete from importacao_linhas where importacao_id = i.id;
  insert into importacao_linhas (escritorio_id, importacao_id, numero, bruto)
  select p_escritorio, i.id, (k + 1)::integer, b
    from jsonb_array_elements(i.abas -> v_aba -> 'linhas') with ordinality x(r, k),
         lateral (select coalesce(jsonb_object_agg(c.value, btrim(r ->> c.key::integer)), '{}'::jsonb) b
                    from jsonb_each_text(v_lig) c where btrim(coalesce(r ->> c.key::integer, '')) <> '') bb
   where b <> '{}'::jsonb;
  update importacoes set linhas_lidas = (select count(*) from importacao_linhas where importacao_id = i.id)
   where id = i.id returning versao into v_versao;
  perform imp_reconferir(i.id);
  return jsonb_build_object('versao', v_versao) || imp_resumo(i.id);
end $$;

-- A prévia, em páginas de 50 (filtro pela situação e busca pelo nome, documento ou número).
create function portal_importacao_linhas(p_pessoa uuid, p_escritorio uuid, p_importacao uuid, p_situacao text default null,
                                         p_q text default null, p_desde integer default 0) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  i importacoes;
  v_q text := imp_chave(p_q);
  v_dig text := regexp_replace(coalesce(p_q, ''), '[^0-9]', '', 'g');
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'clientes.ver');
  i := imp_da_pessoa(p_pessoa, p_escritorio, p_importacao);
  if p_situacao is not null and p_situacao not in ('PRONTA', 'AVISO', 'ERRO', 'PULADA') then perform recusar_campos('Situação desconhecida', 'situacao'); end if;
  if length(v_q) > 120 then perform recusar_campos('Busca longa demais', 'q'); end if;
  return jsonb_build_object('importacao', imp_json(i, p_pessoa)) || imp_resumo(i.id) || jsonb_build_object(
    'linhas', coalesce((select jsonb_agg(imp_linha_json(l) order by l.numero) from (
                select * from importacao_linhas l where l.importacao_id = i.id and (p_situacao is null or l.situacao = p_situacao)
                   and l.numero > coalesce(p_desde, 0)
                   and (v_q = '' or imp_chave(l.norm -> 'cliente' ->> 'nome') like '%' || v_q || '%'
                        or (v_dig <> '' and (l.numero::text = v_dig or (length(v_dig) >= 3 and l.norm -> 'cliente' ->> 'documento' like '%' || v_dig || '%'))))
                 order by l.numero limit 50) l), '[]'::jsonb),
    'total', (select count(*) from importacao_linhas l where l.importacao_id = i.id and (p_situacao is null or l.situacao = p_situacao)
                 and (v_q = '' or imp_chave(l.norm -> 'cliente' ->> 'nome') like '%' || v_q || '%'
                      or (v_dig <> '' and (l.numero::text = v_dig or (length(v_dig) >= 3 and l.norm -> 'cliente' ->> 'documento' like '%' || v_dig || '%'))))));
end $$;

-- Corrigir a linha, decidir o aviso ou pular. A correção vale só para esta importação.
create function portal_importacao_linha(p_pessoa uuid, p_escritorio uuid, p_importacao uuid, p_numero integer, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  i importacoes;
  l importacao_linhas;
  v_corr jsonb;
  k text;
  v text;
  v_dec text;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'clientes.editar');
  i := imp_da_pessoa(p_pessoa, p_escritorio, p_importacao);
  select * into l from importacao_linhas where importacao_id = i.id and numero = p_numero for update;
  if l.id is null then raise exception 'Linha não encontrada' using errcode = 'TC404'; end if;
  if jsonb_typeof(p_dados) is distinct from 'object' then perform recusar_campos('Dados inválidos', 'dados'); end if;
  v_corr := l.correcoes;
  if p_dados ? 'campos' then
    if jsonb_typeof(p_dados -> 'campos') <> 'object' then perform recusar_campos('Dados inválidos', 'campos'); end if;
    for k, v in select key, value from jsonb_each_text(p_dados -> 'campos') loop
      if not (k = any (imp_campos_cliente() || case when i.o_que = 'CLIENTES_CONTRATOS' then imp_campos_contrato() else '{}' end))
         or length(coalesce(v, '')) > 400 then
        perform recusar_campos('Campo desconhecido', k);
      end if;
      v := btrim(coalesce(v, ''));
      v_corr := case when v = coalesce(l.bruto ->> k, '') then v_corr - k else v_corr || jsonb_build_object(k, v) end;
    end loop;
  end if;
  v_dec := case when p_dados ? 'decisao' then nullif(p_dados ->> 'decisao', '') else l.decisao end;
  if v_dec is not null and v_dec not in ('JUNTAR', 'NOVO', 'SEGUIR', 'PULAR') then perform recusar_campos('Decisão desconhecida', 'decisao'); end if;
  if v_dec in ('JUNTAR', 'NOVO') and jsonb_typeof(l.norm -> 'duplicado') is distinct from 'object' then
    perform recusar_campos('Não há cadastro parecido para juntar', 'decisao');
  end if;
  update importacao_linhas set correcoes = v_corr, decisao = v_dec,
                               corrigida_por = case when v_corr <> '{}'::jsonb then p_pessoa end
   where id = l.id;
  perform imp_reconferir(i.id, p_numero);
  -- O mesmo documento em outra linha muda o "um cliente só" das outras.
  if (l.bruto || l.correcoes) ->> 'documento' is distinct from (l.bruto || v_corr) ->> 'documento' then perform imp_reconferir(i.id); end if;
  update importacoes set versao = versao where id = i.id;
  select * into l from importacao_linhas where id = l.id;
  return jsonb_build_object('linha', imp_linha_json(l), 'versao', (select versao from importacoes where id = i.id)) || imp_resumo(i.id);
end $$;

-- Decisão em lote ("Juntar as 6"): vale para as linhas com aviso daquele tipo ainda sem decisão.
create function portal_importacao_decidir(p_pessoa uuid, p_escritorio uuid, p_importacao uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  i importacoes;
  v_cod text := p_dados ->> 'codigo';
  v_dec text := p_dados ->> 'decisao';
  v_n integer;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'clientes.editar');
  i := imp_da_pessoa(p_pessoa, p_escritorio, p_importacao);
  if v_cod is null or v_cod not in ('DUPLICADO', 'TELEFONE_DE_OUTRO', 'SEM_ASSINATURA', 'FORA_DA_LISTA', 'CAMPO_INVALIDO') then
    perform recusar_campos('Aviso desconhecido', 'codigo');
  end if;
  if v_dec is null or v_dec not in ('JUNTAR', 'NOVO', 'SEGUIR', 'PULAR') or (v_cod <> 'DUPLICADO' and v_dec in ('JUNTAR', 'NOVO'))
     or (v_cod = 'DUPLICADO' and v_dec = 'SEGUIR') then
    perform recusar_campos('Decisão inválida', 'decisao');
  end if;
  update importacao_linhas l set decisao = v_dec,
         situacao = imp_situacao(l.problemas, v_dec, jsonb_typeof(l.norm -> 'duplicado') = 'object')
   where l.importacao_id = i.id and l.situacao = 'AVISO' and l.decisao is null
     and exists (select 1 from jsonb_array_elements(l.problemas) x where x ->> 'codigo' = v_cod)
     and (v_dec in ('SEGUIR', 'PULAR') or jsonb_typeof(l.norm -> 'duplicado') = 'object');
  get diagnostics v_n = row_count;
  return jsonb_build_object('decididas', v_n) || imp_resumo(i.id);
end $$;

create function portal_importacao_cancelar(p_pessoa uuid, p_escritorio uuid, p_importacao uuid) returns void
language plpgsql
security definer
set search_path = public
as $$
declare i importacoes;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'clientes.editar');
  i := imp_da_pessoa(p_pessoa, p_escritorio, p_importacao);
  delete from importacao_linhas where importacao_id = i.id;
  perform definir_transicao('CANCELADA', 'Cancelada por quem importou');
  update importacoes set estado = 'CANCELADA', abas = null where id = i.id;
end $$;

-- ---------------------------------------------------------------------------------------
-- Importar: tudo numa transação. A prévia é conferida de novo; se mudou desde a última vez que
-- a pessoa viu (versão), nada entra e a tela recarrega.

create function imp_juntar(p_escritorio uuid, p_cliente uuid, p_novo jsonb) returns jsonb
language plpgsql
set search_path = public
as $$
declare
  c clientes_escritorio;
  v_set jsonb := '{}'::jsonb;
  k text;
  v_contatos jsonb;
  v_princ jsonb;
  v_tel text := p_novo -> 'contatos' -> 0 ->> 'telefone';
  v_email text := p_novo -> 'contatos' -> 0 ->> 'email';
begin
  select * into c from clientes_escritorio where id = p_cliente and escritorio_id = p_escritorio for update;
  foreach k in array array['documento', 'nacionalidade', 'estado_civil', 'profissao', 'rg', 'rg_orgao', 'cep', 'endereco', 'bairro', 'cidade',
                           'uf', 'origem', 'origem_indicacao'] loop
    if to_jsonb(c) ->> k is null and p_novo ->> k is not null then v_set := v_set || jsonb_build_object(k, p_novo ->> k); end if;
  end loop;
  v_contatos := c.contatos;
  v_princ := contato_principal(c.contatos);
  if v_tel is not null and v_princ ->> 'telefone' is null
     and not exists (select 1 from jsonb_array_elements(c.contatos) x where x ->> 'telefone' = v_tel) then
    v_set := v_set || jsonb_build_object('telefone', v_tel);
  end if;
  if v_email is not null and v_princ ->> 'email' is null
     and not exists (select 1 from jsonb_array_elements(c.contatos) x where lower(x ->> 'email') = v_email) then
    v_set := v_set || jsonb_build_object('email', v_email);
  end if;
  if v_set = '{}'::jsonb then return v_set; end if;
  if v_set ? 'telefone' or v_set ? 'email' then
    select jsonb_agg(case when (x ->> 'principal')::boolean then x || (v_set - (select array_agg(k2) from jsonb_object_keys(v_set) k2 where k2 not in ('telefone', 'email'))) else x end)
      into v_contatos from jsonb_array_elements(c.contatos) x;
  end if;
  update clientes_escritorio x set
    documento = coalesce(x.documento, v_set ->> 'documento'), nacionalidade = coalesce(x.nacionalidade, v_set ->> 'nacionalidade'),
    estado_civil = coalesce(x.estado_civil, v_set ->> 'estado_civil'), profissao = coalesce(x.profissao, v_set ->> 'profissao'),
    rg = coalesce(x.rg, v_set ->> 'rg'), rg_orgao = coalesce(x.rg_orgao, v_set ->> 'rg_orgao'), cep = coalesce(x.cep, v_set ->> 'cep'),
    endereco = coalesce(x.endereco, v_set ->> 'endereco'), bairro = coalesce(x.bairro, v_set ->> 'bairro'), cidade = coalesce(x.cidade, v_set ->> 'cidade'),
    uf = coalesce(x.uf, v_set ->> 'uf'), origem = coalesce(x.origem, v_set ->> 'origem'),
    origem_indicacao = coalesce(x.origem_indicacao, v_set ->> 'origem_indicacao'), contatos = v_contatos
   where x.id = p_cliente;
  perform registrar_historico('cliente.juntado', 'cliente', p_cliente::text,
    jsonb_build_object('campos', (select jsonb_agg(k2 order by k2) from jsonb_object_keys(v_set) k2)));
  return v_set;
end $$;

create function portal_importacao_importar(p_pessoa uuid, p_escritorio uuid, p_importacao uuid, p_versao integer) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  i importacoes;
  l importacao_linhas;
  v_antes jsonb;
  v_cli uuid;
  v_ctr uuid;
  v_numero text;
  v_docs jsonb := '{}'::jsonb;
  v_pre jsonb;
  c jsonb;
  v_comercial boolean := tem_comercial(p_pessoa, p_escritorio);
  r jsonb;
  v_n integer;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'clientes.editar');
  select * into i from importacoes where id = p_importacao and escritorio_id = p_escritorio for update;
  i := imp_da_pessoa(p_pessoa, p_escritorio, p_importacao);
  if i.o_que = 'CLIENTES_CONTRATOS' then
    perform entrar_area(p_pessoa, p_escritorio, 'CONTRATOS');
    perform entrar_escritorio(p_pessoa, p_escritorio, 'contratos.editar');
  end if;
  if i.versao <> p_versao then perform conflito_versao('importacoes', i.id); end if;
  if not exists (select 1 from importacao_linhas where importacao_id = i.id) then perform recusar_motivo('Faça a prévia antes de importar', 'SEM_PREVIA'); end if;
  -- Conferir de novo: um cadastro novo desde a prévia pode virar duplicado.
  select jsonb_object_agg(numero, situacao) into v_antes from importacao_linhas where importacao_id = i.id;
  perform imp_reconferir(i.id);
  if v_antes <> (select jsonb_object_agg(numero, situacao) from importacao_linhas where importacao_id = i.id) then
    update importacoes set versao = versao where id = i.id;
    raise exception 'A prévia mudou' using errcode = 'TC409',
      detail = jsonb_build_object('motivo', 'PREVIA_MUDOU', 'versao', (select versao from importacoes where id = i.id))::text;
  end if;
  if not exists (select 1 from importacao_linhas where importacao_id = i.id and situacao = 'PRONTA') then
    perform recusar_motivo('Nenhuma linha pronta para importar', 'NADA_PRONTO');
  end if;
  perform pg_advisory_xact_lock(hashtext('contratos:' || p_escritorio::text));
  r := imp_resumo(i.id);
  v_n := (r -> 'contratos' ->> 'exitos')::integer;

  for l in select * from importacao_linhas where importacao_id = i.id and situacao = 'PRONTA' order by numero loop
    v_pre := null;
    v_cli := null;
    c := l.norm -> 'cliente';
    if l.decisao = 'JUNTAR' then
      v_cli := (l.norm -> 'duplicado' ->> 'id')::uuid;
      v_pre := imp_juntar(p_escritorio, v_cli, case when v_comercial then c else c - 'origem' - 'origem_indicacao' end);
    elsif c ->> 'documento' is not null and v_docs ? (c ->> 'documento') then
      v_cli := (v_docs ->> (c ->> 'documento'))::uuid;
    else
      v_cli := (cliente_gravar(p_pessoa, p_escritorio, null, null, c) ->> 'id')::uuid;
      update clientes_escritorio set importacao_id = i.id where id = v_cli;
    end if;
    if c ->> 'documento' is not null and not v_docs ? (c ->> 'documento') then
      v_docs := v_docs || jsonb_build_object(c ->> 'documento', v_cli);
    end if;

    v_ctr := null;
    if jsonb_typeof(l.norm -> 'contrato') = 'object' then
      r := l.norm -> 'contrato';
      v_numero := contrato_proximo_numero(p_escritorio);
      perform definir_transicao('ELABORACAO');
      insert into contratos (escritorio_id, numero, cliente_id, objeto, responsavel_id, criado_por, importacao_id)
      values (p_escritorio, v_numero, v_cli, r ->> 'objeto', (r ->> 'responsavel')::uuid, p_pessoa, i.id)
      returning id into v_ctr;
      perform contrato_gravar_advogados(p_escritorio, v_ctr, jsonb_build_array(r ->> 'responsavel'));
      perform honorario_gravar(p_escritorio, 'CONTRATO', v_ctr, jsonb_build_array(r -> 'condicao'));
      perform registrar_historico('contrato.criado', 'contratos', v_ctr::text,
        jsonb_build_object('numero', v_numero, 'tipos', jsonb_build_array(r ->> 'tipo'), 'importacao', i.id));
      if r ->> 'assinatura' is not null then
        perform definir_transicao('ATIVO');
        update contratos set estado = 'ATIVO', assinado_em = (r ->> 'assinatura')::date, assinatura_por = p_pessoa where id = v_ctr;
        v_n := contrato_programar(p_escritorio, v_ctr, '1990-01-01');
        -- As pagas antes do T3jus: as primeiras, só como informação.
        update recebimentos_previstos set pago_antes = true, cancelado_em = app_now(), cancelado_motivo = 'Paga antes do T3jus (importação)'
         where id in (select id from recebimentos_previstos where escritorio_id = p_escritorio and contrato_id = v_ctr
                       order by vencimento, descricao limit coalesce((r ->> 'pagas')::integer, 0));
        perform registrar_historico('contrato.assinado', 'contratos', v_ctr::text,
          jsonb_build_object('em', r ->> 'assinatura', 'recebimentos', v_n, 'pagasAntes', coalesce((r ->> 'pagas')::integer, 0)));
      end if;
    end if;
    update importacao_linhas set situacao = 'IMPORTADA', cliente_id = v_cli, contrato_id = v_ctr, preenchidos = v_pre where id = l.id;
  end loop;

  perform definir_transicao('IMPORTADA');
  update importacoes set estado = 'CONCLUIDA', abas = null, importado_em = app_now(), desfazer_ate = app_now() + interval '7 days',
         resumo = jsonb_build_object(
           'clientes', (select count(*) from clientes_escritorio where escritorio_id = p_escritorio and importacao_id = i.id),
           'juntados', (select count(distinct cliente_id) from importacao_linhas where importacao_id = i.id and preenchidos is not null and decisao = 'JUNTAR'),
           'juntadosIds', (select coalesce(jsonb_agg(distinct cliente_id), '[]') from importacao_linhas where importacao_id = i.id and decisao = 'JUNTAR' and situacao = 'IMPORTADA'),
           'contratos', (select count(*) from contratos where escritorio_id = p_escritorio and importacao_id = i.id),
           'ativos', (select count(*) from contratos where escritorio_id = p_escritorio and importacao_id = i.id and estado = 'ATIVO'),
           'parcelas', (select count(*) from recebimentos_previstos rp join contratos ct on ct.id = rp.contrato_id
                         where ct.importacao_id = i.id and rp.cancelado_em is null and rp.valor is not null),
           'valor', (select coalesce(sum(rp.valor), 0) from recebimentos_previstos rp join contratos ct on ct.id = rp.contrato_id
                      where ct.importacao_id = i.id and rp.cancelado_em is null),
           'vencidas', (select count(*) from recebimentos_previstos rp join contratos ct on ct.id = rp.contrato_id
                         where ct.importacao_id = i.id and rp.cancelado_em is null and rp.vencimento < hoje_brasilia()),
           'exitos', (select count(*) from contratos ct join honorario_condicoes h on h.dono_tipo = 'CONTRATO' and h.dono_id = ct.id
                       where ct.importacao_id = i.id and h.tipo = 'EXITO'),
           'valorPagoAntes', (select coalesce(sum(rp.valor), 0) from recebimentos_previstos rp join contratos ct on ct.id = rp.contrato_id
                               where ct.importacao_id = i.id and rp.pago_antes),
           'linhas', (select count(*) from importacao_linhas where importacao_id = i.id and situacao = 'IMPORTADA'),
           'fora', (select count(*) from importacao_linhas where importacao_id = i.id and situacao <> 'IMPORTADA'))
   where id = i.id returning * into i;
  perform registrar_historico('importacao.concluida', 'importacoes', i.id::text, i.resumo - 'juntadosIds');
  return imp_json(i, p_pessoa);
end $$;

-- ---------------------------------------------------------------------------------------
-- Desfazer (até 7 dias; quem importou ou a sócia dona). O que alguém mexeu depois fica.

create function imp_desfazer_plano(i importacoes) returns jsonb
language sql stable
set search_path = public
as $$
  with ctr as (select ct.*, exists (select 1 from pagamentos_recebidos pr join recebimentos_previstos rp on rp.id = pr.parcela_id
                                     where rp.contrato_id = ct.id)
                            or exists (select 1 from bases_mensais b join recebimentos_previstos rp on rp.id = b.recebimento_id where rp.contrato_id = ct.id)
                            or exists (select 1 from caso_clientes cc where cc.contrato_id = ct.id) mexido
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

create function portal_importacao_desfazer(p_pessoa uuid, p_escritorio uuid, p_importacao uuid, p_motivo text) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  i importacoes;
  v_motivo text := btrim(coalesce(p_motivo, ''));
  v_plano jsonb;
  x jsonb;
  l importacao_linhas;
  k text;
  v_cont jsonb;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'clientes.editar');
  select * into i from importacoes where id = p_importacao and escritorio_id = p_escritorio for update;
  if i.id is null or i.estado not in ('CONCLUIDA', 'DESFEITA') then raise exception 'Importação não encontrada' using errcode = 'TC404'; end if;
  if i.estado = 'DESFEITA' then perform recusar_motivo('A importação já foi desfeita', 'JA_DESFEITA'); end if;
  if i.criado_por <> p_pessoa and not e_socio_dono(p_pessoa, p_escritorio) then
    raise exception 'Só quem importou ou a sócia dona desfaz' using errcode = 'TC401', detail = jsonb_build_object('motivo', 'SEM_PERMISSAO')::text;
  end if;
  if i.desfazer_ate < app_now() then perform recusar_motivo('O prazo de desfazer acabou', 'PRAZO_ENCERRADO'); end if;
  if length(v_motivo) not between 3 and 300 then perform recusar_campos('Escreva o motivo', 'motivo'); end if;
  v_plano := imp_desfazer_plano(i);

  -- Contratos: encerrados, e as parcelas que faltam, canceladas.
  for x in select to_jsonb(ct) from contratos ct where ct.escritorio_id = p_escritorio and ct.importacao_id = i.id and ct.estado <> 'ENCERRADO'
              and not exists (select 1 from jsonb_array_elements(v_plano -> 'mexidos') m where m ->> 'id' = ct.id::text) loop
    perform definir_transicao('ENCERRADO', 'Importação desfeita: ' || v_motivo);
    update contratos set estado = 'ENCERRADO', encerrado_em = app_now(), motivo_encerramento = left('Importação desfeita: ' || v_motivo, 500)
     where id = (x ->> 'id')::uuid;
    perform contrato_cancelar_futuros(p_escritorio, (x ->> 'id')::uuid, '1990-01-01', left('Importação desfeita: ' || v_motivo, 500));
    perform registrar_historico('contrato.encerrado', 'contratos', x ->> 'id', jsonb_build_object('importacaoDesfeita', i.id));
  end loop;
  -- Clientes novos: inativos, com o motivo.
  for x in select to_jsonb(c) from clientes_escritorio c where c.escritorio_id = p_escritorio and c.importacao_id = i.id and c.estado = 'ATIVO'
              and not exists (select 1 from jsonb_array_elements(v_plano -> 'mexidos') m where m ->> 'id' = c.id::text) loop
    perform definir_transicao('INATIVADO', left('Importação desfeita: ' || v_motivo, 300));
    update clientes_escritorio set estado = 'INATIVO', inativado_em = app_now(), inativado_por = p_pessoa,
                                   motivo_inativacao = left('Importação desfeita: ' || v_motivo, 300)
     where id = (x ->> 'id')::uuid;
  end loop;
  -- Cadastros juntados: o que a planilha preencheu volta a ficar vazio, se ninguém mudou depois.
  for l in select * from importacao_linhas where importacao_id = i.id and preenchidos is not null loop
    foreach k in array array(select jsonb_object_keys(l.preenchidos)) loop
      if k in ('telefone', 'email') then
        select jsonb_agg(case when (c2 ->> 'principal')::boolean and c2 ->> k = l.preenchidos ->> k
                                   and (c2 - k) ?| array['telefone', 'email'] then c2 - k else c2 end)
          into v_cont from clientes_escritorio c, jsonb_array_elements(c.contatos) c2 where c.id = l.cliente_id;
        update clientes_escritorio set contatos = v_cont where id = l.cliente_id and contatos <> v_cont;
      else
        execute format('update clientes_escritorio set %I = null where id = $1 and %I = $2', k, k) using l.cliente_id, l.preenchidos ->> k;
      end if;
    end loop;
    perform registrar_historico('cliente.juntado_desfeito', 'cliente', l.cliente_id::text,
      jsonb_build_object('campos', (select jsonb_agg(k2 order by k2) from jsonb_object_keys(l.preenchidos) k2), 'importacao', i.id));
  end loop;

  perform definir_transicao('DESFEITA', v_motivo);
  update importacoes set estado = 'DESFEITA', desfeita_em = app_now(), desfeita_por = p_pessoa, motivo_desfazer = v_motivo
   where id = i.id returning * into i;
  perform registrar_historico('importacao.desfeita', 'importacoes', i.id::text, jsonb_build_object('motivo', v_motivo) || (v_plano - 'mexidos'));
  return imp_json(i, p_pessoa) || jsonb_build_object('feito', v_plano);
end $$;

create function portal_importacao_plano_desfazer(p_pessoa uuid, p_escritorio uuid, p_importacao uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare i importacoes;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'clientes.ver');
  i := imp_da_pessoa(p_pessoa, p_escritorio, p_importacao, 'CONCLUIDA');
  return imp_desfazer_plano(i);
end $$;

-- O histórico das importações do escritório (todos da equipe veem).
create function portal_importacoes(p_pessoa uuid, p_escritorio uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'clientes.ver');
  perform importacoes_limpar(p_escritorio);
  return coalesce((select jsonb_agg(imp_json(i, p_pessoa) order by i.importado_em desc)
                     from importacoes i where i.escritorio_id = p_escritorio and i.estado in ('CONCLUIDA', 'DESFEITA')), '[]'::jsonb);
end $$;

-- As linhas que ficaram de fora, com o motivo, até o fim do prazo de desfazer (410 depois).
create function portal_importacao_fora(p_pessoa uuid, p_escritorio uuid, p_importacao uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare i importacoes;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'clientes.ver');
  select * into i from importacoes where id = p_importacao and escritorio_id = p_escritorio;
  if i.id is null or i.estado not in ('CONCLUIDA', 'DESFEITA') then raise exception 'Importação não encontrada' using errcode = 'TC404'; end if;
  if i.criado_por <> p_pessoa and not e_socio_dono(p_pessoa, p_escritorio) then
    raise exception 'Só quem importou ou a sócia dona' using errcode = 'TC401', detail = jsonb_build_object('motivo', 'SEM_PERMISSAO')::text;
  end if;
  if i.desfazer_ate < app_now() then perform recusar_motivo('A planilha das linhas de fora foi apagada', 'PRAZO_ENCERRADO'); end if;
  return jsonb_build_object('arquivo', i.arquivo_nome, 'ligacao', i.ligacao, 'linhas', coalesce((
    select jsonb_agg(jsonb_build_object('numero', l.numero, 'valores', l.bruto || l.correcoes, 'situacao', l.situacao,
                                        'problemas', l.problemas) order by l.numero)
      from importacao_linhas l where l.importacao_id = i.id and l.situacao <> 'IMPORTADA'), '[]'::jsonb));
end $$;

-- ---------------------------------------------------------------------------------------
-- Clientes: o filtro "Desta importação" e a linha "veio da planilha" na ficha.

create function portal_clientes_da_importacao(p_pessoa uuid, p_escritorio uuid, p_importacao uuid, p_juntados boolean default false) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  i importacoes;
  v_comercial boolean;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'clientes.ver');
  v_comercial := tem_comercial(p_pessoa, p_escritorio);
  select * into i from importacoes where id = p_importacao and escritorio_id = p_escritorio and estado in ('CONCLUIDA', 'DESFEITA');
  if i.id is null then raise exception 'Importação não encontrada' using errcode = 'TC404'; end if;
  return jsonb_build_object('comercial', v_comercial, 'importacao', jsonb_build_object('id', i.id, 'arquivo', i.arquivo_nome, 'em', i.importado_em),
    'clientes', coalesce((select jsonb_agg(cliente_linha(c, v_comercial) order by c.nome) from clientes_escritorio c
                           where c.escritorio_id = p_escritorio and c.estado <> 'EXCLUIDO'
                             and (case when p_juntados then c.id in (select (x #>> '{}')::uuid from jsonb_array_elements(coalesce(i.resumo -> 'juntadosIds', '[]')) x)
                                       else c.importacao_id = i.id end)), '[]'::jsonb));
end $$;

-- A linha "veio da planilha" na ficha do cliente e do contrato. O id pode ser do cliente, do
-- contrato ou da própria importação; null quando não veio de planilha.
create function portal_importacao_origem(p_pessoa uuid, p_escritorio uuid, p_importacao uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v uuid := coalesce((select importacao_id from clientes_escritorio where id = p_importacao and escritorio_id = p_escritorio),
                     (select importacao_id from contratos where id = p_importacao and escritorio_id = p_escritorio),
                     p_importacao);
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'clientes.ver');
  return (select jsonb_build_object('id', i.id, 'arquivo', i.arquivo_nome, 'em', i.importado_em, 'por', pessoa_ref(i.criado_por))
            from importacoes i where i.id = v and i.escritorio_id = p_escritorio and i.importado_em is not null);
end $$;

call fechar_acesso();
