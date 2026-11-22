-- Importar do Astrea e do ADVBOX (F3.56; VA-05), parte 1: os clientes. Desenho aprovado em
-- docs/design/aprovadas/portal-importacao-sistemas (Carol, 21/11/2026). Respostas da Carol:
-- 1. os processos entram como casos, só os ativos e sem contrato (parte 2, ainda não);
-- 2. o financeiro antigo entra só como informação (parte 3, ainda não);
-- 3. importar de outro sistema é só da sócia dona: o servidor recusa com SEM_PERMISSAO;
-- 4. primeiro o backup do Astrea e a planilha do ADVBOX; a conexão com a API do ADVBOX depois.
-- Tudo em cima da importação de planilha (0420): os passos, a prévia, importar tudo ou nada, o
-- desfazer em 7 dias e a limpeza em 24 horas valem igual. O que muda:
-- - a importação sabe a origem (PLANILHA, ASTREA, ADVBOX_PLANILHA) e o modelo do sistema usado;
-- - o backup do Astrea traz várias abas, até 10.000 linhas cada; ele é lido no navegador e ao
--   T3jus chegam só as células das abas que podem entrar (as de fora chegam só com nome e
--   tamanho, em abas_sistema);
-- - as colunas já vêm ligadas pelo modelo do sistema (por_modelo), que a API reconhece;
-- - no Astrea, a coluna do tipo de contato separa cliente, parte contrária e terceiros: só o
--   cliente entra na prévia; os outros são contados (fora_tipo) e ficam de fora.

-- ---------------------------------------------------------------------------------------
-- Tabelas.

alter table importacoes add column origem text not null default 'PLANILHA'
  check (origem in ('PLANILHA', 'ASTREA', 'ADVBOX_PLANILHA'));
alter table importacoes add column modelo text check (length(modelo) <= 40);
-- Todas as abas do arquivo de outro sistema: [{indice, nome, linhas, destino, reconhecida, lida}].
alter table importacoes add column abas_sistema jsonb check (abas_sistema is null or jsonb_typeof(abas_sistema) = 'array');
-- Aba (índice, em texto) -> coluna (índice, em texto) -> campo, como o modelo do sistema ligou.
alter table importacoes add column por_modelo jsonb not null default '{}'::jsonb check (jsonb_typeof(por_modelo) = 'object');
-- Contatos do backup que não viraram clientes: {PARTE_CONTRARIA, FORA}.
alter table importacoes add column fora_tipo jsonb check (fora_tipo is null or jsonb_typeof(fora_tipo) = 'object');
alter table importacoes add check (origem = 'PLANILHA' or o_que = 'CLIENTES');

-- O backup tem até 10.000 linhas por aba; a planilha continua com 2.000.
alter table importacoes drop constraint importacoes_linhas_lidas_check;
alter table importacoes add constraint importacoes_linhas_lidas_check
  check (linhas_lidas between 0 and case when origem = 'PLANILHA' then 2000 else 10000 end);
alter table importacao_linhas drop constraint importacao_linhas_numero_check;
alter table importacao_linhas add constraint importacao_linhas_numero_check check (numero between 2 and 10001);

-- ---------------------------------------------------------------------------------------
-- Peças.

-- O que o valor da coluna do tipo de contato vira (espelha sugerirTipoContato, no domain).
create function imp_sugerir_tipo_contato(p text) returns text
language sql immutable
as $$
  select case when c ~ '^clientes?(\W|$)' then 'CLIENTE'
              when c ~ 'contrari|adverso|^reu(\W|$)|^re(\W|$)|requerid|reclamad|executad|^parte' then 'PARTE_CONTRARIA'
              else 'FORA' end
    from (select imp_chave(p) c) x
$$;

-- O campo que a pessoa pode importar nesta importação.
create function imp_campo_permitido(p_campo text, i importacoes, p_pessoa uuid) returns boolean
language sql stable
set search_path = public
as $$
  select (p_campo = any (imp_campos_cliente())
          or (i.o_que = 'CLIENTES_CONTRATOS' and p_campo = any (imp_campos_contrato()))
          or (i.origem = 'ASTREA' and p_campo = 'tipo_contato'))
     and (p_campo not in ('origem', 'origem_indicacao') or tem_comercial(p_pessoa, i.escritorio_id))
$$;

create or replace function imp_colunas(i importacoes) returns jsonb
language sql stable
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'indice', k - 1, 'letra', imp_letra((k - 1)::integer), 'nome', c.nome,
           'exemplo', (select x ->> (k - 1)::integer from jsonb_array_elements(a -> 'linhas') x where coalesce(x ->> (k - 1)::integer, '') <> '' limit 1),
           'campo', nullif(i.ligacao ->> (k - 1)::text, ''),
           'sugestao', imp_sugerir(c.nome),
           'modelo', nullif(i.por_modelo -> coalesce(i.aba, 0)::text ->> (k - 1)::text, ''), 'foraMotivo', imp_fora_motivo(c.nome)) order by k), '[]'::jsonb)
    from (select i.abas -> coalesce(i.aba, 0) a) aa, jsonb_array_elements_text(aa.a -> 'colunas') with ordinality c(nome, k)
$$;

create or replace function imp_ligacao_valida(i importacoes, p_aba integer, p_ligacao jsonb, p_pessoa uuid) returns jsonb
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
  if i.origem = 'ASTREA' then v_ok := v_ok || 'tipo_contato'::text; end if;
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

create or replace function imp_pares(i importacoes, p_aba integer, p_ligacao jsonb) returns jsonb
language sql stable
set search_path = public
as $$
  with lig as (select key::integer col, value campo from jsonb_each_text(p_ligacao) where value in ('responsavel', 'tipo', 'origem', 'tipo_contato')),
  vals as (select lig.campo, btrim(coalesce(x ->> lig.col, '')) v from lig, jsonb_array_elements(i.abas -> p_aba -> 'linhas') x),
  g as (select campo, imp_chave(v) chave, min(v) valor, count(*) n from vals
         where v <> '' or campo in ('responsavel', 'tipo_contato') group by campo, imp_chave(v))
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
    'tipoContato', coalesce((select jsonb_agg(jsonb_build_object('chave', chave, 'valor', valor, 'n', n,
                                                    'sugestao', case when chave = '' then 'CLIENTE' else imp_sugerir_tipo_contato(valor) end)
                                  order by n desc, valor)
                               from g where campo = 'tipo_contato'), '[]'::jsonb),
    'equipe', (select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'nome', p.nome) order by p.nome), '[]'::jsonb)
                 from (select distinct v.pessoa_id from vinculos v
                        where v.escritorio_id = i.escritorio_id and v.funcao in ('SOCIO', 'EQUIPE') and v.revogado_em is null) v
                 join pessoas p on p.id = v.pessoa_id))
$$;

-- ---------------------------------------------------------------------------------------
-- O que mostrar.

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
    'desfeita', case when i.estado = 'DESFEITA' then jsonb_build_object('em', i.desfeita_em, 'por', pessoa_ref(i.desfeita_por), 'motivo', i.motivo_desfazer) end)
$$;

-- ---------------------------------------------------------------------------------------
-- Enviar: a API já leu o arquivo (ou recebeu do navegador as abas do backup) e reconheceu o
-- modelo do sistema; aqui chegam o nome, as células, as abas do sistema e a ligação pelo modelo.

create or replace function portal_importacao_criar(p_pessoa uuid, p_escritorio uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  i importacoes;
  v_oque text := p_dados ->> 'oQue';
  v_origem text := coalesce(p_dados ->> 'origem', 'PLANILHA');
  v_limite integer;
  v_sistema jsonb := p_dados -> 'sistema';
  a jsonb;
  v_aba integer;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'clientes.editar');
  if v_oque is null or v_oque not in ('CLIENTES', 'CLIENTES_CONTRATOS') then perform recusar_campos('Escolha o que importar', 'oQue'); end if;
  if v_origem not in ('PLANILHA', 'ASTREA', 'ADVBOX_PLANILHA') then perform recusar_campos('Origem inválida', 'origem'); end if;
  -- De outro sistema, só a sócia dona (pergunta 3): traz o escritório inteiro de uma vez.
  if v_origem <> 'PLANILHA' then
    if not e_socio_dono(p_pessoa, p_escritorio) then
      raise exception 'Só a sócia dona importa de outro sistema' using errcode = 'TC401', detail = jsonb_build_object('motivo', 'SEM_PERMISSAO')::text;
    end if;
    if v_oque <> 'CLIENTES' then perform recusar_campos('De outro sistema, só clientes', 'oQue'); end if;
    if jsonb_typeof(v_sistema) is distinct from 'array' or jsonb_array_length(v_sistema) <> jsonb_array_length(coalesce(p_dados -> 'abas', '[]'::jsonb)) then
      perform recusar_campos('Abas do sistema inválidas', 'sistema');
    end if;
  else
    v_sistema := null;
  end if;
  v_limite := case when v_origem = 'PLANILHA' then 2000 else 10000 end;
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
    if jsonb_array_length(a -> 'linhas') > v_limite then perform recusar_motivo('Grande demais', 'ARQUIVO_GRANDE'); end if;
  end loop;
  -- No backup, a aba dos clientes pelo modelo vem primeiro; senão, a primeira com linhas.
  select x.k - 1 into v_aba from jsonb_array_elements(p_dados -> 'abas') with ordinality x(ab, k)
   where jsonb_array_length(x.ab -> 'linhas') > 0 and jsonb_array_length(x.ab -> 'colunas') > 0
   order by case when v_sistema -> (x.k - 1)::integer ->> 'destino' = 'CLIENTES' then 0 else 1 end, x.k limit 1;
  if v_aba is null then perform recusar_motivo('Planilha vazia', 'ARQUIVO_VAZIO'); end if;

  perform importacoes_limpar(p_escritorio);
  for i in select * from importacoes where escritorio_id = p_escritorio and criado_por = p_pessoa and estado = 'PREVIA' loop
    delete from importacao_linhas where importacao_id = i.id;
    perform definir_transicao('CANCELADA', 'Outra importação começou');
    update importacoes set estado = 'CANCELADA', abas = null where id = i.id;
  end loop;

  perform definir_transicao('ENVIADA');
  insert into importacoes (escritorio_id, arquivo_nome, o_que, abas, aba, criado_por, origem, modelo, abas_sistema, por_modelo)
  values (p_escritorio, btrim(p_dados ->> 'arquivoNome'), v_oque, p_dados -> 'abas', v_aba, p_pessoa, v_origem,
          case when v_origem <> 'PLANILHA' then left(p_dados ->> 'modelo', 40) end,
          case when v_sistema is not null then (
            select jsonb_agg(jsonb_build_object('indice', x.k - 1, 'nome', left(coalesce(x.s ->> 'nome', ''), 100),
                                                'linhas', greatest(coalesce(json_inteiro(x.s, 'linhas'), 0), 0),
                                                'destino', case when x.s ->> 'destino' in ('CLIENTES', 'CASOS', 'FINANCEIRO', 'TAREFAS', 'AGENDA', 'PUBLICACOES')
                                                                then x.s ->> 'destino' else 'FORA' end,
                                                'reconhecida', coalesce((x.s ->> 'reconhecida')::boolean, false),
                                                'lida', jsonb_array_length(p_dados -> 'abas' -> (x.k - 1)::integer -> 'colunas') > 0) order by x.k)
              from jsonb_array_elements(v_sistema) with ordinality x(s, k)) end,
          case when v_sistema is not null then (
            select coalesce(jsonb_object_agg((x.k - 1)::text, x.s -> 'porModelo'), '{}'::jsonb)
              from jsonb_array_elements(v_sistema) with ordinality x(s, k) where jsonb_typeof(x.s -> 'porModelo') = 'object') else '{}'::jsonb end)
  returning * into i;
  -- A ligação começa pelo modelo do sistema e, no resto, com a sugestão pelo nome (sem repetir
  -- campo; sem os campos que a pessoa não pode importar).
  update importacoes set ligacao = (
    select coalesce(jsonb_object_agg(indice, campo), '{}'::jsonb)
      from (select distinct on (campo) indice, campo
              from (select c ->> 'indice' indice, coalesce(c ->> 'modelo', c ->> 'sugestao') campo, c ->> 'modelo' is not null pelo_modelo
                      from jsonb_array_elements(imp_colunas(i)) c) c0
             where campo is not null
               and imp_campo_permitido(campo, i, p_pessoa)
             order by campo, pelo_modelo desc, indice::integer) s)
   where id = i.id returning * into i;
  perform registrar_historico('importacao.enviada', 'importacoes', i.id::text,
    jsonb_build_object('arquivo', i.arquivo_nome, 'oQue', v_oque, 'origem', v_origem));
  return imp_json(i, p_pessoa);
end $$;


-- ---------------------------------------------------------------------------------------
-- Gravar a ligação e os pares e montar a prévia.

create or replace function portal_importacao_colunas(p_pessoa uuid, p_escritorio uuid, p_importacao uuid, p_versao integer, p_dados jsonb) returns jsonb
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
  v_partes integer;
  v_terceiros integer;
  v_n integer;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'clientes.editar');
  i := imp_da_pessoa(p_pessoa, p_escritorio, p_importacao);
  v_aba := coalesce(json_inteiro(p_dados, 'aba'), i.aba);
  if v_aba < 0 or v_aba >= jsonb_array_length(i.abas) then perform recusar_campos('Aba inválida', 'aba'); end if;
  -- No backup, só as abas lidas podem ir para os clientes.
  if i.abas_sistema is not null and not coalesce((i.abas_sistema -> v_aba ->> 'lida')::boolean, false) then
    perform recusar_campos('Esta aba não entra nesta importação', 'aba');
  end if;
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

  for x in select jsonb_array_elements(imp_pares(i, v_aba, v_lig) -> 'tipoContato') loop
    v_pares := jsonb_set(v_pares, '{tipoContato}', coalesce(v_pares -> 'tipoContato', '{}') || jsonb_build_object(x ->> 'chave',
      case when p_dados -> 'pares' -> 'tipoContato' ->> (x ->> 'chave') in ('CLIENTE', 'PARTE_CONTRARIA', 'FORA')
           then p_dados -> 'pares' -> 'tipoContato' ->> (x ->> 'chave') else x ->> 'sugestao' end));
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

  update importacoes set aba = v_aba, ligacao = v_lig, pares = v_pares, linhas_lidas = null, fora_tipo = null
   where id = i.id and versao = p_versao returning versao into v_versao;
  if v_versao is null then perform conflito_versao('importacoes', i.id); end if;

  -- A prévia: cada linha não vazia, com só as colunas ligadas. No backup, o tipo de contato
  -- separa: só o que vira cliente entra na prévia; as partes contrárias e os terceiros são
  -- contados e ficam de fora (decisão 9).
  delete from importacao_linhas where importacao_id = i.id;
  with t as (
    select k::integer k, b - 'tipo_contato' b,
           case when 'tipo_contato' = any (v_campos)
                then coalesce(v_pares -> 'tipoContato' ->> imp_chave(b ->> 'tipo_contato'), 'CLIENTE') else 'CLIENTE' end tipo
      from jsonb_array_elements(i.abas -> v_aba -> 'linhas') with ordinality x(r, k),
           lateral (select coalesce(jsonb_object_agg(c.value, btrim(r ->> c.key::integer)), '{}'::jsonb) b
                      from jsonb_each_text(v_lig) c where btrim(coalesce(r ->> c.key::integer, '')) <> '') bb
     where b - 'tipo_contato' <> '{}'::jsonb),
  ins as (insert into importacao_linhas (escritorio_id, importacao_id, numero, bruto)
          select p_escritorio, i.id, k + 1, b from t where tipo = 'CLIENTE' returning 1)
  select count(*) filter (where tipo = 'PARTE_CONTRARIA'), count(*) filter (where tipo = 'FORA'), (select count(*) from ins)
    into v_partes, v_terceiros, v_n from t;
  update importacoes set linhas_lidas = v_n,
         fora_tipo = case when 'tipo_contato' = any (v_campos) then jsonb_build_object('PARTE_CONTRARIA', v_partes, 'FORA', v_terceiros) end
   where id = i.id returning versao into v_versao;
  perform imp_reconferir(i.id);
  return jsonb_build_object('versao', v_versao) || imp_resumo(i.id);
end $$;

call fechar_acesso();
