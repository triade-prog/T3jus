-- Importar do Astrea e do ADVBOX (F3.56; VA-05), parte 3: o financeiro antigo só como informação
-- (pergunta 2 do desenho aprovado em docs/design/aprovadas/portal-importacao-sistemas, estado
-- previa-financeiro). Como os processos (0810), a aba Lançamentos do backup do Astrea vira uma
-- importação filha da dos clientes (o_que = 'FINANCEIRO'), com a sua prévia e o seu desfazer:
-- - o que foi recebido fica no histórico da ficha do cliente como "pago antes do T3jus": fora do
--   Caixa, de A receber e dos relatórios do contador, sem recibo;
-- - o que está em aberto não vira cobrança (no T3jus a cobrança nasce do contrato, FI-01): vira um
--   lembrete na ficha do cliente para criar o contrato, que some quando um contrato do cliente é
--   criado;
-- - as despesas do escritório ficam de fora (o Caixa começa no T3jus): são contadas e não entram
--   na prévia.
-- Pela planilha do ADVBOX o financeiro fica de fora (decisão 17).
-- As funções de antes (clientes e casos) ganham o sufixo _cc; as de nome original olham o_que.

-- ---------------------------------------------------------------------------------------
-- Tabelas.

alter table importacoes drop constraint importacoes_o_que_check;
alter table importacoes add constraint importacoes_o_que_check check (o_que in ('CLIENTES', 'CLIENTES_CONTRATOS', 'CASOS', 'FINANCEIRO'));
alter table importacoes drop constraint importacoes_origem_o_que_check;
alter table importacoes add constraint importacoes_origem_o_que_check
  check (case origem when 'PLANILHA' then o_que in ('CLIENTES', 'CLIENTES_CONTRATOS')
                     when 'ASTREA' then o_que in ('CLIENTES', 'CASOS', 'FINANCEIRO')
                     else o_que in ('CLIENTES', 'CASOS') end);

-- O histórico financeiro do sistema antigo: só informação.
create table historico_financeiro_anterior (
  id             uuid primary key default gen_random_uuid(),
  escritorio_id  uuid not null references escritorios (id) on delete restrict,
  importacao_id  uuid not null references importacoes (id) on delete restrict,
  linha          integer not null check (linha between 2 and 10001),
  cliente_id     uuid not null references clientes_escritorio (id) on delete restrict,
  caso_id        uuid references casos (id) on delete restrict,
  data           date,
  descricao      text not null check (length(descricao) between 1 and 300),
  valor_centavos bigint not null check (valor_centavos > 0),
  situacao       text not null check (situacao in ('PAGO', 'EM_ABERTO')),
  origem         text not null check (origem in ('ASTREA', 'ADVBOX_PLANILHA')),
  criado_em      timestamptz not null default app_now(),
  -- A importação desfeita tira a linha das fichas; nada é apagado em silêncio.
  desfeito_em    timestamptz
);
create index historico_financeiro_anterior_cliente on historico_financeiro_anterior (escritorio_id, cliente_id) where desfeito_em is null;
create index historico_financeiro_anterior_importacao on historico_financeiro_anterior (importacao_id);
call proteger_tabela_escritorio('historico_financeiro_anterior');

-- O lembrete de criar o contrato: um por cliente (e caso) com valor em aberto no sistema antigo.
create table lembrete_contrato (
  id                       uuid primary key default gen_random_uuid(),
  escritorio_id            uuid not null references escritorios (id) on delete restrict,
  importacao_id            uuid not null references importacoes (id) on delete restrict,
  cliente_id               uuid not null references clientes_escritorio (id) on delete restrict,
  caso_id                  uuid references casos (id) on delete restrict,
  valor_em_aberto_centavos bigint not null check (valor_em_aberto_centavos > 0),
  lancamentos              integer not null check (lancamentos > 0),
  criado_em                timestamptz not null default app_now(),
  resolvido_em             timestamptz,
  contrato_id              uuid references contratos (id) on delete restrict,
  desfeito_em              timestamptz,
  check (contrato_id is null or resolvido_em is not null)
);
create index lembrete_contrato_aberto on lembrete_contrato (escritorio_id, cliente_id) where resolvido_em is null and desfeito_em is null;
create index lembrete_contrato_importacao on lembrete_contrato (importacao_id);
call proteger_tabela_escritorio('lembrete_contrato');

insert into inventario_dados (tabela, dado_pessoal, o_que, para_que, base_legal, controlador, prazo, no_fim, situacao, exportar) values
 ('historico_financeiro_anterior', true,
  'Lançamentos de honorários do cliente no sistema antigo (Astrea): data, descrição, valor e se foi pago ou ficou em aberto',
  'Mostrar na ficha do cliente o que ele já pagou antes do T3jus e o que ficou em aberto, só como informação',
  'Execução de contrato e exercício regular de direitos (LGPD, art. 7º, V e VI)', 'Escritório',
  'Enquanto o escritório for cliente do T3jus e 5 anos depois do fim do contrato', 'Exportados ao escritório e apagados com ele', 'APROVADO', true),
 ('lembrete_contrato', true,
  'Lembrete na ficha do cliente: valor em aberto no sistema antigo, para criar o contrato que cobra',
  'Lembrar o escritório de criar o contrato, porque no T3jus a cobrança nasce do contrato',
  'Execução de contrato e exercício regular de direitos (LGPD, art. 7º, V e VI)', 'Escritório',
  'Enquanto o escritório for cliente do T3jus e 5 anos depois do fim do contrato', 'Exportados ao escritório e apagados com ele', 'APROVADO', true);

-- O contrato criado para o cliente resolve o lembrete aberto dele.
create function lembrete_contrato_resolver() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update lembrete_contrato set resolvido_em = app_now(), contrato_id = new.id
   where escritorio_id = new.escritorio_id and cliente_id = new.cliente_id and resolvido_em is null and desfeito_em is null;
  return new;
end $$;
create trigger contratos_resolve_lembrete after insert on contratos
  for each row execute function lembrete_contrato_resolver();

-- O financeiro antigo ligado a um caso importado não conta como "mexido" no desfazer dos processos.
create or replace function imp_caso_mexido(p_caso uuid) returns boolean
language plpgsql stable
set search_path = public
as $$
declare
  r record;
  v boolean;
begin
  if exists (select 1 from caso_etapa_mudancas where caso_id = p_caso offset 1)
     or exists (select 1 from caso_clientes where caso_id = p_caso and contrato_id is not null)
     or exists (select 1 from historico where entidade = 'casos' and entidade_id = p_caso::text and acao <> 'juridico.caso_cadastrado') then
    return true;
  end if;
  for r in select c.table_name from information_schema.columns c
            where c.table_schema = 'public' and c.column_name = 'caso_id'
              and c.table_name not in ('caso_clientes', 'caso_etapa_mudancas', 'importacao_linhas',
                                         'historico_financeiro_anterior', 'lembrete_contrato') loop
    execute format('select exists (select 1 from %I where caso_id = $1)', r.table_name) into v using p_caso;
    if v then return true; end if;
  end loop;
  return false;
end $$;

-- ---------------------------------------------------------------------------------------
-- Peças.

create function imp_campos_lancamento() returns text[]
language sql immutable
as $$ select array['cliente', 'cliente_documento', 'numero', 'lanc_descricao', 'lanc_data', 'lanc_valor', 'lanc_situacao', 'lanc_tipo'] $$;

create function imp_sugerir_lancamento(p_coluna text) returns text
language sql immutable
as $$
  select case
    when c ~ '(^|\W)(obs|observ|anotac|comentario|nota)' then null
    when c ~ 'situacao|status|pago|quitad' then 'lanc_situacao'
    when c ~ '(^|\W)(tipo|natureza|receita|despesa|categoria)' then 'lanc_tipo'
    when c ~ 'valor|quantia|montante' then 'lanc_valor'
    when c ~ '(^|\W)data|vencimento|pagamento|competencia' then 'lanc_data'
    when c ~ 'cpf|cnpj|documento' then 'cliente_documento'
    when c ~ 'processo|cnj|numero' then 'numero'
    when c ~ 'descri|historico|lancamento|referente' then 'lanc_descricao'
    when c ~ 'cliente|(^|\W)nome(\W|$)' then 'cliente'
  end
  from (select imp_chave(p_coluna) c) x
$$;

create function imp_sugerir_lanc_situacao(p text) returns text
language sql immutable
as $$
  select case when imp_chave(p) ~ 'aberto|pendente|a receber|vencid|atrasad|nao pag|a vencer' then 'EM_ABERTO'
              when imp_chave(p) ~ 'pag|receb|quitad|liquidad|baixad|compensad' then 'PAGO'
              else 'EM_ABERTO' end
$$;

create function imp_sugerir_lanc_tipo(p text) returns text
language sql immutable
as $$
  select case when imp_chave(p) ~ 'despesa|saida|a pagar|custo|debito' then 'DESPESA' else 'RECEITA' end
$$;

create or replace function imp_campo_permitido(p_campo text, i importacoes, p_pessoa uuid) returns boolean
language sql stable
set search_path = public
as $$
  select case when i.o_que = 'FINANCEIRO' then p_campo = any (imp_campos_lancamento())
              when i.o_que = 'CASOS' then p_campo = any (imp_campos_caso())
              else (p_campo = any (imp_campos_cliente())
                    or (i.o_que = 'CLIENTES_CONTRATOS' and p_campo = any (imp_campos_contrato()))
                    or (i.origem = 'ASTREA' and p_campo = 'tipo_contato'))
                   and (p_campo not in ('origem', 'origem_indicacao') or tem_comercial(p_pessoa, i.escritorio_id)) end
$$;

create or replace function imp_colunas(i importacoes) returns jsonb
language sql stable
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'indice', k - 1, 'letra', imp_letra((k - 1)::integer), 'nome', c.nome,
           'exemplo', (select x ->> (k - 1)::integer from jsonb_array_elements(a -> 'linhas') x where coalesce(x ->> (k - 1)::integer, '') <> '' limit 1),
           'campo', nullif(i.ligacao ->> (k - 1)::text, ''),
           'sugestao', case i.o_que when 'CASOS' then imp_sugerir_caso(c.nome) when 'FINANCEIRO' then imp_sugerir_lancamento(c.nome) else imp_sugerir(c.nome) end,
           'modelo', nullif(i.por_modelo -> coalesce(i.aba, 0)::text ->> (k - 1)::text, ''),
           'foraMotivo', case when i.o_que in ('CASOS', 'FINANCEIRO') then nullif(imp_fora_motivo(c.nome), 'AREA') else imp_fora_motivo(c.nome) end) order by k), '[]'::jsonb)
    from (select i.abas -> coalesce(i.aba, 0) a) aa, jsonb_array_elements_text(aa.a -> 'colunas') with ordinality c(nome, k)
$$;

-- Os pares do lançamento: a situação (pago ou em aberto) e o tipo (receita ou despesa).
alter function imp_pares(importacoes, integer, jsonb) rename to imp_pares_cc;
create function imp_pares(i importacoes, p_aba integer, p_ligacao jsonb) returns jsonb
language sql stable
set search_path = public
as $$
  with lig as (select key::integer col, value campo from jsonb_each_text(p_ligacao) where value in ('lanc_situacao', 'lanc_tipo')),
  vals as (select lig.campo, btrim(coalesce(x ->> lig.col, '')) v from lig, jsonb_array_elements(i.abas -> p_aba -> 'linhas') x),
  g as (select campo, imp_chave(v) chave, min(v) valor, count(*) n from vals group by campo, imp_chave(v))
  select imp_pares_cc(i, p_aba, p_ligacao) || jsonb_build_object(
    'lancSituacao', coalesce((select jsonb_agg(jsonb_build_object('chave', chave, 'valor', valor, 'n', n, 'sugestao', imp_sugerir_lanc_situacao(valor))
                                     order by n desc, valor) from g where campo = 'lanc_situacao'), '[]'::jsonb),
    'lancTipo', coalesce((select jsonb_agg(jsonb_build_object('chave', chave, 'valor', valor, 'n', n, 'sugestao', imp_sugerir_lanc_tipo(valor))
                                 order by n desc, valor) from g where campo = 'lanc_tipo'), '[]'::jsonb))
$$;

-- ---------------------------------------------------------------------------------------
-- Conferir uma linha de lançamento.

create function imp_conferir_lancamento(i importacoes, l importacao_linhas, out o_norm jsonb, out o_problemas jsonb)
language plpgsql stable
set search_path = public
as $$
declare
  d jsonb := l.bruto || l.correcoes;
  p jsonb := '[]'::jsonb;
  v text;
  v_cli clientes_escritorio;
  v_n integer;
  v_doc text;
  v_num text;
  v_caso casos;
  v_valor bigint;
  v_data date;
  v_sit text;
  lanc jsonb;
begin
  -- O cliente, como no processo: pelo CPF ou CNPJ e, sem ele, pelo nome (só quando um só combina).
  v := btrim(coalesce(d ->> 'cliente', ''));
  v_doc := nullif(regexp_replace(coalesce(d ->> 'cliente_documento', ''), '[^0-9]', '', 'g'), '');
  if v_doc is not null then
    select * into v_cli from clientes_escritorio c
     where c.escritorio_id = i.escritorio_id and c.documento = v_doc and c.estado <> 'EXCLUIDO'
     order by c.estado = 'ATIVO' desc, c.criado_em limit 1;
  end if;
  if v_cli.id is null and v <> '' then
    select count(*) into v_n from clientes_escritorio c
     where c.escritorio_id = i.escritorio_id and c.estado = 'ATIVO' and imp_chave(c.nome) = imp_chave(v);
    if v_n = 1 then
      select * into v_cli from clientes_escritorio c
       where c.escritorio_id = i.escritorio_id and c.estado = 'ATIVO' and imp_chave(c.nome) = imp_chave(v);
    elsif v_n > 1 then
      p := p || imp_problema('CLIENTE_AMBIGUO', 'cliente', 'ERRO', v);
    end if;
  end if;
  if v_cli.id is null and not (p @> '[{"codigo": "CLIENTE_AMBIGUO"}]') then
    if v = '' and v_doc is null then p := p || imp_problema('CLIENTE_FALTA', 'cliente', 'ERRO');
    else p := p || imp_problema('CLIENTE_NAO_ENCONTRADO', 'cliente', 'ERRO', coalesce(nullif(v, ''), d ->> 'cliente_documento')); end if;
  end if;

  -- O caso, pelo número do processo, quando ele já está no Jurídico; sem caso também entra.
  v_num := nullif(regexp_replace(coalesce(d ->> 'numero', ''), '[^0-9]', '', 'g'), '');
  if v_num is not null then
    select * into v_caso from casos where escritorio_id = i.escritorio_id and numero_cnj = v_num and situacao <> 'ENCERRADO'
     order by criado_em limit 1;
  end if;

  -- O valor, em centavos, maior que zero.
  if btrim(coalesce(d ->> 'lanc_valor', '')) = '' then
    p := p || imp_problema('VALOR_FALTA', 'lanc_valor', 'ERRO');
  else
    v_valor := abs(imp_valor(d ->> 'lanc_valor'));
    if v_valor is null or v_valor = 0 then p := p || imp_problema('VALOR_INVALIDO', 'lanc_valor', 'ERRO', d ->> 'lanc_valor'); end if;
  end if;
  v_sit := coalesce(nullif(i.pares -> 'lancSituacao' ->> imp_chave(d ->> 'lanc_situacao'), ''), imp_sugerir_lanc_situacao(d ->> 'lanc_situacao'));
  if coalesce(d ->> 'lanc_data', '') <> '' then
    v_data := imp_data(d ->> 'lanc_data');
    if v_data is null or (v_sit = 'PAGO' and v_data > hoje_brasilia()) then
      p := p || imp_problema('CAMPO_INVALIDO', 'lanc_data', 'AVISO', d ->> 'lanc_data');
      v_data := null;
    end if;
  end if;

  lanc := jsonb_build_object(
    'descricao', left(coalesce(nullif(btrim(coalesce(d ->> 'lanc_descricao', '')), ''), 'Lançamento do sistema antigo'), 300),
    'data', v_data, 'valor', v_valor, 'situacao', v_sit, 'caso_id', v_caso.id, 'caso', v_caso.nome);
  o_norm := jsonb_build_object(
    'cliente', jsonb_strip_nulls(jsonb_build_object('id', v_cli.id, 'nome', coalesce(v_cli.nome, nullif(btrim(coalesce(d ->> 'cliente', '')), '')),
                                                    'documento', coalesce(v_cli.documento, v_doc))),
    'lancamento', jsonb_strip_nulls(lanc));
  o_problemas := p;
end $$;

alter function imp_reconferir(uuid, integer) rename to imp_reconferir_cc;
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
  if i.o_que <> 'FINANCEIRO' then
    perform imp_reconferir_cc(p_importacao, p_numero);
    return;
  end if;
  for l in select * from importacao_linhas where importacao_id = p_importacao and (p_numero is null or numero = p_numero) loop
    r := imp_conferir_lancamento(i, l);
    update importacao_linhas set norm = r.o_norm, problemas = r.o_problemas, situacao = imp_situacao(r.o_problemas, l.decisao, false)
     where id = l.id;
  end loop;
end $$;

alter function imp_linha_json(importacao_linhas) rename to imp_linha_json_cc;
create function imp_linha_json(l importacao_linhas) returns jsonb
language sql stable
set search_path = public
as $$
  select case when not (l.norm ? 'lancamento') then imp_linha_json_cc(l) else jsonb_build_object(
    'numero', l.numero, 'situacao', l.situacao, 'decisao', l.decisao, 'problemas', l.problemas,
    'valores', l.bruto || l.correcoes,
    'corrigidas', (select coalesce(jsonb_agg(jsonb_build_object('campo', k, 'antes', l.bruto ->> k, 'agora', v) order by k), '[]'::jsonb)
                     from jsonb_each_text(l.correcoes) e(k, v)),
    'cliente', jsonb_build_object('nome', coalesce(l.norm -> 'cliente' ->> 'nome', ''), 'tipo', 'PF', 'contatos', '[]'::jsonb)
               || jsonb_strip_nulls(jsonb_build_object('documento', l.norm -> 'cliente' ->> 'documento')),
    'clienteId', l.norm -> 'cliente' -> 'id',
    'mesmaDe', null, 'telefoneDe', null, 'contrato', null, 'duplicado', null,
    'lancamento', jsonb_build_object(
      'descricao', l.norm -> 'lancamento' ->> 'descricao', 'data', l.norm -> 'lancamento' ->> 'data',
      'valor', (l.norm -> 'lancamento' ->> 'valor')::bigint, 'situacao', l.norm -> 'lancamento' ->> 'situacao',
      'caso', case when l.norm -> 'lancamento' ? 'caso_id'
                   then jsonb_build_object('id', l.norm -> 'lancamento' ->> 'caso_id', 'nome', l.norm -> 'lancamento' ->> 'caso') end)) end
$$;

alter function imp_resumo(uuid) rename to imp_resumo_cc;
create function imp_resumo(p_importacao uuid) returns jsonb
language sql stable
set search_path = public
as $$
  with p as (select norm -> 'lancamento' x, norm -> 'cliente' ->> 'id' cliente from importacao_linhas
              where importacao_id = p_importacao and situacao = 'PRONTA' and norm ? 'lancamento')
  select imp_resumo_cc(p_importacao) || case when (select o_que from importacoes where id = p_importacao) <> 'FINANCEIRO' then '{}'::jsonb
    else jsonb_build_object('financeiroAntigo', jsonb_build_object(
      'recebidos', (select count(*) from p where x ->> 'situacao' = 'PAGO'),
      'valorRecebido', (select coalesce(sum((x ->> 'valor')::bigint), 0) from p where x ->> 'situacao' = 'PAGO'),
      'emAberto', (select count(*) from p where x ->> 'situacao' = 'EM_ABERTO'),
      'valorEmAberto', (select coalesce(sum((x ->> 'valor')::bigint), 0) from p where x ->> 'situacao' = 'EM_ABERTO'),
      'lembretes', (select count(distinct cliente || coalesce(x ->> 'caso_id', '')) from p where x ->> 'situacao' = 'EM_ABERTO'),
      'clientes', (select count(distinct cliente) from p))) end
$$;

-- A importação mostra as duas filhas: a dos processos e a do financeiro.
create or replace function imp_json(i importacoes, p_pessoa uuid) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', i.id, 'arquivo', i.arquivo_nome, 'oQue', i.o_que, 'origem', i.origem, 'modelo', i.modelo,
    'abasSistema', i.abas_sistema, 'foraTipo', i.fora_tipo, 'situacao', i.estado, 'versao', i.versao,
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
    'desfeita', case when i.estado = 'DESFEITA' then jsonb_build_object('em', i.desfeita_em, 'por', pessoa_ref(i.desfeita_por), 'motivo', i.motivo_desfazer) end,
    'pai', i.pai_id,
    'filha', (select jsonb_build_object('id', f.id, 'situacao', f.estado, 'linhas', coalesce(jsonb_array_length(f.abas -> 0 -> 'linhas'), f.linhas_lidas),
                                        'criadoEm', f.criado_em)
                from importacoes f where f.pai_id = i.id and f.o_que = 'CASOS' order by f.criado_em desc limit 1),
    'filhaFinanceiro', (select jsonb_build_object('id', f.id, 'situacao', f.estado, 'linhas', coalesce(jsonb_array_length(f.abas -> 0 -> 'linhas'), f.linhas_lidas),
                                                  'criadoEm', f.criado_em)
                          from importacoes f where f.pai_id = i.id and f.o_que = 'FINANCEIRO' order by f.criado_em desc limit 1))
$$;

-- ---------------------------------------------------------------------------------------
-- As colunas e a prévia do financeiro. As despesas do escritório ficam de fora e são contadas.

alter function portal_importacao_colunas(uuid, uuid, uuid, integer, jsonb) rename to imp_colunas_cc;
create function portal_importacao_colunas(p_pessoa uuid, p_escritorio uuid, p_importacao uuid, p_versao integer, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  i importacoes;
  v_lig jsonb;
  v_pares jsonb := '{}'::jsonb;
  v_campos text[];
  e text[] := '{}';
  v_versao integer;
  x jsonb;
  v_escolha text;
  v_desp integer;
  v_n integer;
  v_pares_disp jsonb;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'clientes.editar');
  i := imp_da_pessoa(p_pessoa, p_escritorio, p_importacao);
  if i.o_que <> 'FINANCEIRO' then
    -- A aba dos lançamentos do backup não vai para os clientes: ela vem depois, só como informação.
    if i.abas_sistema -> coalesce(json_inteiro(p_dados, 'aba'), i.aba)::integer ->> 'destino' = 'FINANCEIRO' then
      perform recusar_campos('O financeiro entra depois dos clientes', 'aba');
    end if;
    return imp_colunas_cc(p_pessoa, p_escritorio, p_importacao, p_versao, p_dados);
  end if;
  if not e_socio_dono(p_pessoa, p_escritorio) then
    raise exception 'Só a sócia dona importa de outro sistema' using errcode = 'TC401', detail = jsonb_build_object('motivo', 'SEM_PERMISSAO')::text;
  end if;
  v_lig := imp_ligacao_valida(i, 0, p_dados -> 'ligacao', p_pessoa);
  select array_agg(value) into v_campos from jsonb_each_text(v_lig);
  v_campos := coalesce(v_campos, '{}');
  if jsonb_typeof(coalesce(p_dados -> 'pares', '{}'::jsonb)) <> 'object' then perform recusar_campos('Pares inválidos', 'pares'); end if;
  v_pares_disp := imp_pares(i, 0, v_lig);
  for x in select jsonb_array_elements(v_pares_disp -> 'lancSituacao') loop
    v_escolha := p_dados -> 'pares' -> 'lancSituacao' ->> (x ->> 'chave');
    v_pares := jsonb_set(v_pares, '{lancSituacao}', coalesce(v_pares -> 'lancSituacao', '{}') || jsonb_build_object(x ->> 'chave',
      case when v_escolha in ('PAGO', 'EM_ABERTO') then v_escolha else x ->> 'sugestao' end));
  end loop;
  for x in select jsonb_array_elements(v_pares_disp -> 'lancTipo') loop
    v_escolha := p_dados -> 'pares' -> 'lancTipo' ->> (x ->> 'chave');
    v_pares := jsonb_set(v_pares, '{lancTipo}', coalesce(v_pares -> 'lancTipo', '{}') || jsonb_build_object(x ->> 'chave',
      case when v_escolha in ('RECEITA', 'DESPESA') then v_escolha else x ->> 'sugestao' end));
  end loop;

  if not (v_campos && array['cliente', 'cliente_documento']) then e := e || 'cliente'::text; end if;
  if not ('lanc_valor' = any (v_campos)) then e := e || 'lanc_valor'::text; end if;
  if not ('lanc_situacao' = any (v_campos)) then e := e || 'lanc_situacao'::text; end if;
  if cardinality(e) > 0 then
    raise exception 'Falta ligar campos obrigatórios' using errcode = 'TC422',
      detail = jsonb_build_object('motivo', 'CAMPO_OBRIGATORIO_SEM_COLUNA', 'campos', to_jsonb(e))::text;
  end if;

  update importacoes set ligacao = v_lig, pares = v_pares, linhas_lidas = null, fora_tipo = null
   where id = i.id and versao = p_versao returning versao into v_versao;
  if v_versao is null then perform conflito_versao('importacoes', i.id); end if;

  delete from importacao_linhas where importacao_id = i.id;
  with t as (
    select k::integer k, b - 'lanc_tipo' b,
           case when 'lanc_tipo' = any (v_campos)
                then coalesce(v_pares -> 'lancTipo' ->> imp_chave(b ->> 'lanc_tipo'), imp_sugerir_lanc_tipo(b ->> 'lanc_tipo'))
                else 'RECEITA' end tipo
      from jsonb_array_elements(i.abas -> 0 -> 'linhas') with ordinality x(r, k),
           lateral (select coalesce(jsonb_object_agg(c.value, btrim(r ->> c.key::integer)), '{}'::jsonb) b
                      from jsonb_each_text(v_lig) c where btrim(coalesce(r ->> c.key::integer, '')) <> '') bb
     where b - 'lanc_tipo' <> '{}'::jsonb),
  ins as (insert into importacao_linhas (escritorio_id, importacao_id, numero, bruto)
          select p_escritorio, i.id, k + 1, b from t where tipo = 'RECEITA' returning 1)
  select count(*) filter (where tipo = 'DESPESA'), (select count(*) from ins) into v_desp, v_n from t;
  update importacoes set linhas_lidas = v_n,
         fora_tipo = case when 'lanc_tipo' = any (v_campos) then jsonb_build_object('DESPESAS', v_desp) end
   where id = i.id returning versao into v_versao;
  perform imp_reconferir(i.id);
  return jsonb_build_object('versao', v_versao) || imp_resumo(i.id);
end $$;

-- Corrigir a linha do lançamento, deixar o campo ilegível vazio ou pular.
alter function portal_importacao_linha(uuid, uuid, uuid, integer, jsonb) rename to imp_linha_cc;
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
  if i.o_que <> 'FINANCEIRO' then return imp_linha_cc(p_pessoa, p_escritorio, p_importacao, p_numero, p_dados); end if;
  select * into l from importacao_linhas where importacao_id = i.id and numero = p_numero for update;
  if l.id is null then raise exception 'Linha não encontrada' using errcode = 'TC404'; end if;
  if jsonb_typeof(p_dados) is distinct from 'object' then perform recusar_campos('Dados inválidos', 'dados'); end if;
  v_corr := l.correcoes;
  if p_dados ? 'campos' then
    if jsonb_typeof(p_dados -> 'campos') <> 'object' then perform recusar_campos('Dados inválidos', 'campos'); end if;
    for k, v in select key, value from jsonb_each_text(p_dados -> 'campos') loop
      if not (k = any (imp_campos_lancamento())) or k = 'lanc_tipo' or length(coalesce(v, '')) > 400 then perform recusar_campos('Campo desconhecido', k); end if;
      v := btrim(coalesce(v, ''));
      v_corr := case when v = coalesce(l.bruto ->> k, '') then v_corr - k else v_corr || jsonb_build_object(k, v) end;
    end loop;
  end if;
  v_dec := case when p_dados ? 'decisao' then nullif(p_dados ->> 'decisao', '') else l.decisao end;
  if v_dec is not null and v_dec not in ('SEGUIR', 'PULAR') then perform recusar_campos('Decisão desconhecida', 'decisao'); end if;
  update importacao_linhas set correcoes = v_corr, decisao = v_dec, corrigida_por = case when v_corr <> '{}'::jsonb then p_pessoa end
   where id = l.id;
  perform imp_reconferir(i.id, p_numero);
  update importacoes set versao = versao where id = i.id;
  select * into l from importacao_linhas where id = l.id;
  return jsonb_build_object('linha', imp_linha_json(l), 'versao', (select versao from importacoes where id = i.id)) || imp_resumo(i.id);
end $$;

alter function portal_importacao_decidir(uuid, uuid, uuid, jsonb) rename to imp_decidir_cc;
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
  if i.o_que <> 'FINANCEIRO' then return imp_decidir_cc(p_pessoa, p_escritorio, p_importacao, p_dados); end if;
  if v_cod is distinct from 'CAMPO_INVALIDO' then perform recusar_campos('Aviso desconhecido', 'codigo'); end if;
  if v_dec is null or v_dec not in ('SEGUIR', 'PULAR') then perform recusar_campos('Decisão inválida', 'decisao'); end if;
  update importacao_linhas l set decisao = v_dec, situacao = imp_situacao(l.problemas, v_dec, false)
   where l.importacao_id = i.id and l.situacao = 'AVISO' and l.decisao is null
     and exists (select 1 from jsonb_array_elements(l.problemas) x where x ->> 'codigo' = v_cod);
  get diagnostics v_n = row_count;
  return jsonb_build_object('decididas', v_n) || imp_resumo(i.id);
end $$;

-- ---------------------------------------------------------------------------------------
-- Importar.

create function imp_importar_financeiro(i importacoes, p_pessoa uuid) returns jsonb
language plpgsql
set search_path = public
as $$
declare
  l importacao_linhas;
  x jsonb;
begin
  for l in select * from importacao_linhas where importacao_id = i.id and situacao = 'PRONTA' order by numero loop
    x := l.norm -> 'lancamento';
    insert into historico_financeiro_anterior (escritorio_id, importacao_id, linha, cliente_id, caso_id, data, descricao, valor_centavos, situacao, origem)
    values (i.escritorio_id, i.id, l.numero, (l.norm -> 'cliente' ->> 'id')::uuid, (x ->> 'caso_id')::uuid, (x ->> 'data')::date,
            x ->> 'descricao', (x ->> 'valor')::bigint, x ->> 'situacao', i.origem);
    update importacao_linhas set situacao = 'IMPORTADA', cliente_id = (l.norm -> 'cliente' ->> 'id')::uuid, caso_id = (x ->> 'caso_id')::uuid
     where id = l.id;
  end loop;
  -- O que ficou em aberto vira um lembrete por cliente (e caso), para criar o contrato.
  insert into lembrete_contrato (escritorio_id, importacao_id, cliente_id, caso_id, valor_em_aberto_centavos, lancamentos)
  select i.escritorio_id, i.id, h.cliente_id, h.caso_id, sum(h.valor_centavos), count(*)
    from historico_financeiro_anterior h
   where h.importacao_id = i.id and h.situacao = 'EM_ABERTO'
   group by h.cliente_id, h.caso_id;
  return jsonb_build_object(
    'clientes', 0, 'juntados', 0, 'juntadosIds', '[]'::jsonb, 'contratos', 0, 'ativos', 0, 'parcelas', 0, 'valor', 0, 'vencidas', 0,
    'exitos', 0, 'valorPagoAntes', 0,
    'recebidos', (select count(*) from historico_financeiro_anterior where importacao_id = i.id and situacao = 'PAGO'),
    'valorRecebido', (select coalesce(sum(valor_centavos), 0) from historico_financeiro_anterior where importacao_id = i.id and situacao = 'PAGO'),
    'emAberto', (select count(*) from historico_financeiro_anterior where importacao_id = i.id and situacao = 'EM_ABERTO'),
    'valorEmAberto', (select coalesce(sum(valor_centavos), 0) from historico_financeiro_anterior where importacao_id = i.id and situacao = 'EM_ABERTO'),
    'lembretes', (select count(*) from lembrete_contrato where importacao_id = i.id),
    'linhas', (select count(*) from importacao_linhas where importacao_id = i.id and situacao = 'IMPORTADA'),
    'fora', (select count(*) from importacao_linhas where importacao_id = i.id and situacao <> 'IMPORTADA'));
end $$;

alter function portal_importacao_importar(uuid, uuid, uuid, integer) rename to imp_importar_cc;
create function portal_importacao_importar(p_pessoa uuid, p_escritorio uuid, p_importacao uuid, p_versao integer) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  i importacoes;
  v_antes jsonb;
  v_lanc jsonb;
  v_idx integer;
  f importacoes;
  r jsonb;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'clientes.editar');
  select * into i from importacoes where id = p_importacao and escritorio_id = p_escritorio for update;
  i := imp_da_pessoa(p_pessoa, p_escritorio, p_importacao);
  if i.o_que <> 'FINANCEIRO' then
    -- A aba dos lançamentos do backup, guardada antes de a importação dos clientes apagar as células.
    if i.o_que = 'CLIENTES' and i.origem = 'ASTREA' then
      select x.k - 1 into v_idx from jsonb_array_elements(coalesce(i.abas_sistema, '[]'::jsonb)) with ordinality x(s, k)
       where x.s ->> 'destino' = 'FINANCEIRO' and (x.s ->> 'lida')::boolean and jsonb_array_length(i.abas -> (x.k - 1)::integer -> 'linhas') > 0
       order by x.k limit 1;
      if v_idx is not null then v_lanc := i.abas -> v_idx; end if;
    end if;
    r := imp_importar_cc(p_pessoa, p_escritorio, p_importacao, p_versao);
    -- O financeiro vira mais uma prévia, só como informação (pergunta 2).
    if v_lanc is not null and e_socio_dono(p_pessoa, p_escritorio) then
      perform definir_transicao('ENVIADA', 'O financeiro do backup');
      insert into importacoes (escritorio_id, arquivo_nome, o_que, abas, aba, criado_por, origem, modelo, por_modelo, pai_id)
      values (p_escritorio, i.arquivo_nome, 'FINANCEIRO', jsonb_build_array(v_lanc), 0, p_pessoa, i.origem, i.modelo,
              case when i.por_modelo ? v_idx::text then jsonb_build_object('0', i.por_modelo -> v_idx::text) else '{}'::jsonb end, i.id)
      returning * into f;
      update importacoes set ligacao = imp_ligacao_inicial(f, p_pessoa) where id = f.id;
      perform registrar_historico('importacao.enviada', 'importacoes', f.id::text,
        jsonb_build_object('arquivo', f.arquivo_nome, 'oQue', 'FINANCEIRO', 'origem', f.origem, 'de', i.id));
      select * into i from importacoes where id = p_importacao;
      return imp_json(i, p_pessoa);
    end if;
    return r;
  end if;

  if not e_socio_dono(p_pessoa, p_escritorio) then
    raise exception 'Só a sócia dona importa de outro sistema' using errcode = 'TC401', detail = jsonb_build_object('motivo', 'SEM_PERMISSAO')::text;
  end if;
  if i.versao <> p_versao then perform conflito_versao('importacoes', i.id); end if;
  if not exists (select 1 from importacao_linhas where importacao_id = i.id) then perform recusar_motivo('Faça a prévia antes de importar', 'SEM_PREVIA'); end if;
  -- Conferir de novo: um cliente cadastrado ou um caso importado desde a prévia mudam as linhas.
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
  r := imp_importar_financeiro(i, p_pessoa);
  perform definir_transicao('IMPORTADA');
  update importacoes set estado = 'CONCLUIDA', abas = null, importado_em = app_now(), desfazer_ate = app_now() + interval '7 days', resumo = r
   where id = i.id returning * into i;
  perform registrar_historico('importacao.concluida', 'importacoes', i.id::text, r - 'juntadosIds');
  return imp_json(i, p_pessoa);
end $$;

-- ---------------------------------------------------------------------------------------
-- Desfazer o financeiro: o histórico e os lembretes saem das fichas. O lembrete que já virou
-- contrato fica como está.

create function imp_desfazer_plano_financeiro(i importacoes) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'clientes', 0, 'juntados', 0, 'contratos', 0, 'parcelas', 0,
    'lancamentos', (select count(*) from historico_financeiro_anterior where importacao_id = i.id and desfeito_em is null),
    'lembretes', (select count(*) from lembrete_contrato where importacao_id = i.id and desfeito_em is null and resolvido_em is null),
    'mexidos', (select coalesce(jsonb_agg(jsonb_build_object('tipo', 'LEMBRETE', 'id', l.id, 'nome', c.nome) order by c.nome), '[]'::jsonb)
                  from lembrete_contrato l join clientes_escritorio c on c.id = l.cliente_id
                 where l.importacao_id = i.id and l.desfeito_em is null and l.resolvido_em is not null))
$$;

alter function imp_desfazer_plano(importacoes) rename to imp_desfazer_plano_cc;
create function imp_desfazer_plano(i importacoes) returns jsonb
language sql stable
set search_path = public
as $$
  select case when i.o_que = 'FINANCEIRO' then imp_desfazer_plano_financeiro(i) else imp_desfazer_plano_cc(i) end
$$;

alter function portal_importacao_desfazer(uuid, uuid, uuid, text) rename to imp_desfazer_cc;
create function portal_importacao_desfazer(p_pessoa uuid, p_escritorio uuid, p_importacao uuid, p_motivo text) returns jsonb
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
  update historico_financeiro_anterior set desfeito_em = app_now() where importacao_id = i.id and desfeito_em is null;
  update lembrete_contrato set desfeito_em = app_now() where importacao_id = i.id and desfeito_em is null and resolvido_em is null;

  perform definir_transicao('DESFEITA', v_motivo);
  update importacoes set estado = 'DESFEITA', desfeita_em = app_now(), desfeita_por = p_pessoa, motivo_desfazer = v_motivo
   where id = i.id returning * into i;
  perform registrar_historico('importacao.desfeita', 'importacoes', i.id::text, jsonb_build_object('motivo', v_motivo) || (v_plano - 'mexidos'));
  return imp_json(i, p_pessoa) || jsonb_build_object('feito', v_plano);
end $$;

-- ---------------------------------------------------------------------------------------
-- Na ficha do cliente: o que veio do sistema antigo. Valores são do Financeiro e dos Contratos:
-- quem não tem nenhuma das duas áreas não vê.

create function portal_cliente_anterior(p_pessoa uuid, p_escritorio uuid, p_cliente uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'clientes.ver');
  if not exists (select 1 from clientes_escritorio where id = p_cliente and escritorio_id = p_escritorio) then
    raise exception 'Cliente não encontrado' using errcode = 'TC404';
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
                                                               'caso', case when c.id is not null then jsonb_build_object('id', c.id, 'nome', c.nome) end)
                                            order by l.criado_em), '[]'::jsonb)
                    from lembrete_contrato l left join casos c on c.id = l.caso_id
                   where l.escritorio_id = p_escritorio and l.cliente_id = p_cliente and l.resolvido_em is null and l.desfeito_em is null),
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

call fechar_acesso();
