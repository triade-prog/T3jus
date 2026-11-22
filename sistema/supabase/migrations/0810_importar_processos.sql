-- Importar do Astrea e do ADVBOX (F3.56; VA-05), parte 2: os processos como casos no Jurídico.
-- Desenho aprovado em docs/design/aprovadas/portal-importacao-sistemas (Carol, 21/11/2026) e a
-- resposta da Carol de 22/11/2026: os processos entram numa segunda prévia, depois dos clientes
-- (duas etapas, cada uma com a prévia e o desfazer dela), em vez de uma prévia com abas.
-- - Do backup do Astrea: ao importar os clientes, a aba dos processos vira uma importação nova
--   (o_que = CASOS, pai_id = a dos clientes), já com as colunas ligadas pelo modelo. Ela vale 24
--   horas, como toda prévia, e o arquivo não precisa ser enviado de novo.
-- - Da planilha de processos do ADVBOX: enviada como a de clientes, com oQue = CASOS.
-- - Cada processo se liga a um cliente que já está no T3jus, pelo CPF ou CNPJ, ou pelo nome
--   (decisão 17). Cliente não encontrado é erro: corrigir ou pular (decisão 20).
-- - Entram só os ativos; os arquivados ficam de fora e são contados (pergunta 1). Todo caso
--   entra sem contrato e sem prazos, tarefas, andamentos e documentos (decisões 20 e 21).
-- - Mesmo número de um caso que já existe: juntar liga o cliente ao caso existente (decisão 20).
-- - Desfazer (decisão 28): os casos que ninguém mexeu ficam em Encerrados, marcados "importação
--   desfeita" e sem resultado; os casos que já existiam perdem só o cliente que a importação ligou.
-- Tudo em cima da importação de planilha (0420) e da parte 1 (0790): as funções de clientes
-- ficam como estão, com outro nome, e as de sempre escolhem pelo o_que.

-- ---------------------------------------------------------------------------------------
-- Tabelas.

alter table importacoes drop constraint importacoes_o_que_check;
alter table importacoes add constraint importacoes_o_que_check check (o_que in ('CLIENTES', 'CLIENTES_CONTRATOS', 'CASOS'));
do $$
declare r record;
begin
  for r in select conname from pg_constraint
            where conrelid = 'importacoes'::regclass and contype = 'c'
              and pg_get_constraintdef(oid) like '%origem = ''PLANILHA''::text%' and pg_get_constraintdef(oid) like '%o_que%' loop
    execute format('alter table importacoes drop constraint %I', r.conname);
  end loop;
end $$;
-- Contratos só da planilha; processos só de outro sistema.
alter table importacoes add constraint importacoes_origem_o_que_check
  check (case when origem = 'PLANILHA' then o_que in ('CLIENTES', 'CLIENTES_CONTRATOS') else o_que in ('CLIENTES', 'CASOS') end);
-- A importação dos processos nasce da dos clientes do mesmo backup.
alter table importacoes add column pai_id uuid references importacoes (id) on delete restrict;
create index importacoes_pai on importacoes (pai_id) where pai_id is not null;

alter table importacao_linhas add column caso_id uuid references casos (id) on delete restrict;

alter table casos add column importacao_id uuid references importacoes (id) on delete restrict;
create index casos_importacao on casos (escritorio_id, importacao_id) where importacao_id is not null;
-- O cliente que a importação ligou a um caso que já existia (para o desfazer tirar só ele).
alter table caso_clientes add column importacao_id uuid references importacoes (id) on delete restrict;

-- O caso de uma importação desfeita fica em Encerrados, sem resultado (decisão 28).
alter table casos add column encerrado_por text check (encerrado_por in ('RESULTADO', 'IMPORTACAO_DESFEITA'));
do $$
declare r record;
begin
  for r in select conname from pg_constraint
            where conrelid = 'casos'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%resultado IS NOT NULL%' loop
    execute format('alter table casos drop constraint %I', r.conname);
  end loop;
end $$;
alter table casos add constraint casos_resultado_encerrado_check
  check ((resultado is not null) = (situacao = 'ENCERRADO' and encerrado_por is distinct from 'IMPORTACAO_DESFEITA'));
alter table casos add constraint casos_encerrado_por_situacao_check check (encerrado_por is null or situacao = 'ENCERRADO');

-- ---------------------------------------------------------------------------------------
-- Peças.

create function imp_campos_caso() returns text[]
language sql immutable
as $$ select array['cliente', 'cliente_documento', 'numero', 'caso_nome', 'area', 'parte_contraria', 'tribunal', 'vara', 'valor_causa',
                   'distribuido_em', 'etapa', 'situacao_processo', 'papel', 'responsavel'] $$;

-- O campo do caso sugerido pelo nome da coluna (a planilha de processos e as colunas que o
-- modelo do sistema não conhece).
create function imp_sugerir_caso(p_coluna text) returns text
language sql immutable
as $$
  select case
    when c ~ '(^|\W)(obs|observ|anotac|comentario|nota)' then null
    when c ~ 'situacao|status' then 'situacao_processo'
    when c ~ '(^|\W)(fase|etapa)' then 'etapa'
    when c ~ 'valor' then 'valor_causa'
    when c ~ 'distribu' then 'distribuido_em'
    when c ~ 'cpf|cnpj|documento' then 'cliente_documento'
    when c ~ 'contrari|advers|(^|\W)reu(\W|$)|requerid|reclamad' then 'parte_contraria'
    when c ~ '(^|\W)(polo|papel|posicao)' then 'papel'
    when c ~ 'tribunal|justica' then 'tribunal'
    when c ~ '(^|\W)(vara|juizo|foro|comarca)' then 'vara'
    when c ~ '(^|\W)area(\W|$)' then 'area'
    when c ~ 'advogad|responsavel' then 'responsavel'
    when c ~ 'numero|processo|cnj' then 'numero'
    when c ~ 'titulo|nome do caso|assunto|(^|\W)acao(\W|$)|objeto' then 'caso_nome'
    when c ~ 'cliente|(^|\W)nome(\W|$)' then 'cliente'
  end
  from (select imp_chave(p_coluna) c) x
$$;

-- As sugestões para os valores das listas do caso.
create function imp_sugerir_area(p text) returns text
language sql immutable
as $$
  select case when c ~ 'trabalh|reclamat' then 'TRABALHISTA' when c ~ 'previd|inss|aposentad|beneficio' then 'PREVIDENCIARIO'
              when c ~ 'consum' then 'CONSUMIDOR' when c ~ 'famil|sucess|divorc|alimento|inventar' then 'FAMILIA'
              when c ~ 'saude|plano de saude|medic' then 'SAUDE' when c ~ 'tribut|fiscal|imposto' then 'TRIBUTARIO'
              when c ~ 'civel|civil|indeniza|contrat' then 'CIVEL' when c = '' then null else 'OUTRA' end
    from (select imp_chave(p) c) x
$$;

create function imp_sugerir_situacao_processo(p text) returns text
language sql immutable
as $$
  select case when imp_chave(p) ~ 'arquiv|baixad|encerrad|extint|finaliz|transitad|concluid|inativ' then 'FORA' else 'ATIVO' end
$$;

-- A etapa do escritório pelo nome da fase do sistema antigo; sem nome igual, a primeira etapa.
create function imp_sugerir_etapa(p text, p_escritorio uuid) returns uuid
language sql stable
set search_path = public
as $$
  select coalesce(
    (select id from etapas where escritorio_id = p_escritorio and not final and imp_chave(nome) = imp_chave(p) and imp_chave(p) <> '' limit 1),
    (select id from etapas where escritorio_id = p_escritorio and not final order by ordem limit 1))
$$;

create function imp_papel(p text) returns text
language sql immutable
as $$
  select case when c ~ '(^|\W)(reu|re|requerid|reclamad|executad|passivo|impetrad)' then 'REU'
              when c ~ 'interessad|terceir|assistent' then 'INTERESSADO' else 'AUTOR' end
    from (select imp_chave(p) c) x
$$;

-- O campo que a pessoa pode importar nesta importação.
create or replace function imp_campo_permitido(p_campo text, i importacoes, p_pessoa uuid) returns boolean
language sql stable
set search_path = public
as $$
  select case when i.o_que = 'CASOS' then p_campo = any (imp_campos_caso())
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
           'sugestao', case when i.o_que = 'CASOS' then imp_sugerir_caso(c.nome) else imp_sugerir(c.nome) end,
           'modelo', nullif(i.por_modelo -> coalesce(i.aba, 0)::text ->> (k - 1)::text, ''),
           'foraMotivo', case when i.o_que = 'CASOS' then nullif(imp_fora_motivo(c.nome), 'AREA') else imp_fora_motivo(c.nome) end) order by k), '[]'::jsonb)
    from (select i.abas -> coalesce(i.aba, 0) a) aa, jsonb_array_elements_text(aa.a -> 'colunas') with ordinality c(nome, k)
$$;

create or replace function imp_ligacao_valida(i importacoes, p_aba integer, p_ligacao jsonb, p_pessoa uuid) returns jsonb
language plpgsql stable
set search_path = public
as $$
declare
  v_cols integer := jsonb_array_length(i.abas -> p_aba -> 'colunas');
  r jsonb := '{}'::jsonb;
  k text;
  v text;
begin
  if jsonb_typeof(p_ligacao) is distinct from 'object' then perform recusar_campos('Ligação inválida', 'ligacao'); end if;
  for k, v in select key, value from jsonb_each_text(p_ligacao) loop
    if v is null or v = '' then continue; end if;
    if k !~ '^[0-9]{1,2}$' or k::integer >= v_cols or not imp_campo_permitido(v, i, p_pessoa) then perform recusar_campos('Ligação inválida', 'ligacao'); end if;
    if exists (select 1 from jsonb_each_text(r) x where x.value = v) then perform recusar_campos('O mesmo campo em duas colunas', 'c' || k); end if;
    r := r || jsonb_build_object(k, v);
  end loop;
  return r;
end $$;

-- A ligação inicial: pelo modelo do sistema e, no resto, pela sugestão do nome (sem repetir
-- campo; sem os campos que a pessoa não pode importar).
create function imp_ligacao_inicial(i importacoes, p_pessoa uuid) returns jsonb
language sql stable
set search_path = public
as $$
  select coalesce(jsonb_object_agg(indice, campo), '{}'::jsonb)
    from (select distinct on (campo) indice, campo
            from (select c ->> 'indice' indice, coalesce(c ->> 'modelo', c ->> 'sugestao') campo, c ->> 'modelo' is not null pelo_modelo
                    from jsonb_array_elements(imp_colunas(i)) c) c0
           where campo is not null and imp_campo_permitido(campo, i, p_pessoa)
           order by campo, pelo_modelo desc, indice::integer) s
$$;

-- Os valores das colunas de lista, com quantas linhas usam cada um e a sugestão. No caso: o
-- responsável (todos precisam de um), a área, a etapa e a situação do processo.
create or replace function imp_pares(i importacoes, p_aba integer, p_ligacao jsonb) returns jsonb
language sql stable
set search_path = public
as $$
  with lig as (select key::integer col, value campo from jsonb_each_text(p_ligacao)
                where value in ('responsavel', 'tipo', 'origem', 'tipo_contato', 'area', 'etapa', 'situacao_processo')),
  vals as (select lig.campo, btrim(coalesce(x ->> lig.col, '')) v from lig, jsonb_array_elements(i.abas -> p_aba -> 'linhas') x),
  g as (select campo, imp_chave(v) chave, min(v) valor, count(*) n from vals
         where v <> '' or campo in ('responsavel', 'tipo_contato', 'etapa', 'area', 'situacao_processo') group by campo, imp_chave(v))
  select jsonb_build_object(
    'responsavel', coalesce((select jsonb_agg(jsonb_build_object('chave', chave, 'valor', valor, 'n', n,
                                               'sugestao', case when chave = '' then null else imp_sugerir_responsavel(valor, i.escritorio_id) end) order by n desc, valor)
                               from g where campo = 'responsavel'),
                            case when i.o_que in ('CLIENTES_CONTRATOS', 'CASOS') and not exists (select 1 from lig where campo = 'responsavel')
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
    'area', coalesce((select jsonb_agg(jsonb_build_object('chave', chave, 'valor', valor, 'n', n,
                                         'sugestao', coalesce(imp_sugerir_area(valor), 'OUTRA')) order by n desc, valor)
                        from g where campo = 'area'), '[]'::jsonb),
    'etapa', coalesce((select jsonb_agg(jsonb_build_object('chave', chave, 'valor', valor, 'n', n,
                                          'sugestao', imp_sugerir_etapa(valor, i.escritorio_id)) order by n desc, valor)
                         from g where campo = 'etapa'), '[]'::jsonb),
    'situacaoProcesso', coalesce((select jsonb_agg(jsonb_build_object('chave', chave, 'valor', valor, 'n', n,
                                                     'sugestao', imp_sugerir_situacao_processo(valor)) order by n desc, valor)
                                    from g where campo = 'situacao_processo'), '[]'::jsonb),
    'etapas', case when i.o_que = 'CASOS' then (
                select coalesce(jsonb_agg(jsonb_build_object('id', e.id, 'nome', e.nome) order by e.ordem), '[]'::jsonb)
                  from etapas e where e.escritorio_id = i.escritorio_id and not e.final) else '[]'::jsonb end,
    'equipe', (select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'nome', p.nome) order by p.nome), '[]'::jsonb)
                 from (select distinct v.pessoa_id from vinculos v
                        where v.escritorio_id = i.escritorio_id and v.funcao in ('SOCIO', 'EQUIPE') and v.revogado_em is null) v
                 join pessoas p on p.id = v.pessoa_id))
$$;

-- ---------------------------------------------------------------------------------------
-- Conferir uma linha de processo.

create function imp_conferir_caso(i importacoes, l importacao_linhas, out o_norm jsonb, out o_problemas jsonb)
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
  v_dup casos;
  v_etapa uuid;
  v_resp uuid;
  v_area text;
  v_valor bigint;
  v_dist date;
  v_parte text;
  caso jsonb;
begin
  -- O cliente: pelo CPF ou CNPJ e, sem ele, pelo nome (só quando um só combina).
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

  -- O número do processo (CNJ, com o dígito de conferência); sem número também entra.
  v_num := nullif(regexp_replace(coalesce(d ->> 'numero', ''), '[^0-9]', '', 'g'), '');
  if v_num is not null and not numero_cnj_valido(v_num) then
    p := p || imp_problema('NUMERO_CNJ_INVALIDO', 'numero', 'ERRO', d ->> 'numero');
    v_num := null;
  end if;
  if v_num is not null then
    select * into v_dup from casos where escritorio_id = i.escritorio_id and numero_cnj = v_num;
    if v_dup.id is not null then p := p || imp_problema('CASO_DUPLICADO', 'numero', 'AVISO'); end if;
  end if;

  -- As listas, pelos pares do passo 2.
  begin
    v_resp := nullif(i.pares -> 'responsavel' ->> imp_chave(d ->> 'responsavel'), '')::uuid;
  exception when others then v_resp := null;
  end;
  if v_resp is null or not pessoa_do_escritorio(v_resp, i.escritorio_id) then
    v_resp := null;
    p := p || imp_problema('RESPONSAVEL_FALTA', 'responsavel', 'ERRO', nullif(btrim(coalesce(d ->> 'responsavel', '')), ''));
  end if;
  begin
    v_etapa := nullif(i.pares -> 'etapa' ->> imp_chave(d ->> 'etapa'), '')::uuid;
  exception when others then v_etapa := null;
  end;
  if v_etapa is null or not exists (select 1 from etapas where id = v_etapa and escritorio_id = i.escritorio_id and not final) then
    v_etapa := (select id from etapas where escritorio_id = i.escritorio_id and not final order by ordem limit 1);
  end if;
  v_area := coalesce(nullif(i.pares -> 'area' ->> imp_chave(d ->> 'area'), ''), imp_sugerir_area(d ->> 'area'), 'OUTRA');
  if not area_direito_valida(v_area) then v_area := 'OUTRA'; end if;

  v_parte := nullif(left(btrim(coalesce(d ->> 'parte_contraria', '')), 160), '');
  if length(v_parte) < 2 then v_parte := null; end if;
  caso := jsonb_build_object('area', v_area, 'parte_contraria', v_parte, 'numero', v_num, 'etapa_id', v_etapa,
                             'etapa', (select nome from etapas where id = v_etapa),
                             'etapa_antiga', nullif(btrim(coalesce(d ->> 'etapa', '')), ''),
                             'responsavel', v_resp, 'papel', imp_papel(d ->> 'papel'));
  if coalesce(d ->> 'valor_causa', '') <> '' then
    v_valor := imp_valor(d ->> 'valor_causa');
    if v_valor is null then p := p || imp_problema('CAMPO_INVALIDO', 'valor_causa', 'AVISO', d ->> 'valor_causa');
    else caso := caso || jsonb_build_object('valor_causa', v_valor); end if;
  end if;
  if coalesce(d ->> 'distribuido_em', '') <> '' then
    v_dist := imp_data(d ->> 'distribuido_em');
    if v_dist is null or v_dist > hoje_brasilia() then p := p || imp_problema('CAMPO_INVALIDO', 'distribuido_em', 'AVISO', d ->> 'distribuido_em');
    else caso := caso || jsonb_build_object('distribuido_em', v_dist); end if;
  end if;
  foreach v in array array['tribunal', 'vara'] loop
    if coalesce(d ->> v, '') <> '' then
      if length(btrim(d ->> v)) between 2 and (case v when 'tribunal' then 60 else 120 end) then caso := caso || jsonb_build_object(v, btrim(d ->> v));
      else p := p || imp_problema('CAMPO_INVALIDO', v, 'AVISO', d ->> v); end if;
    end if;
  end loop;
  -- O nome do caso: o da coluna ou "Cliente x Parte contrária" (EX-01).
  v := btrim(coalesce(d ->> 'caso_nome', ''));
  if length(v) not between 3 and 120 then
    v := left(coalesce(v_cli.nome, nullif(btrim(coalesce(d ->> 'cliente', '')), ''), 'Caso') || coalesce(' x ' || v_parte, ''), 120);
    if length(v) < 3 then v := 'Caso ' || coalesce(v_num, l.numero::text); end if;
  end if;
  caso := caso || jsonb_build_object('nome', v);

  o_norm := jsonb_build_object(
    'cliente', jsonb_strip_nulls(jsonb_build_object('id', v_cli.id, 'nome', coalesce(v_cli.nome, nullif(btrim(coalesce(d ->> 'cliente', '')), '')),
                                                    'documento', coalesce(v_cli.documento, v_doc))),
    'caso', jsonb_strip_nulls(caso),
    'duplicado', case when v_dup.id is not null then jsonb_build_object('id', v_dup.id, 'nome', v_dup.nome) end);
  o_problemas := p;
end $$;

-- Conferir de novo. No caso, duas linhas com o mesmo número são o mesmo processo: o segundo
-- cliente entra no caso da primeira linha.
alter function imp_reconferir(uuid, integer) rename to imp_reconferir_clientes;
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
  if i.o_que <> 'CASOS' then
    perform imp_reconferir_clientes(p_importacao, p_numero);
    return;
  end if;
  for l in select * from importacao_linhas where importacao_id = p_importacao and (p_numero is null or numero = p_numero) loop
    r := imp_conferir_caso(i, l);
    if l.decisao = 'JUNTAR' and r.o_norm -> 'duplicado' = 'null'::jsonb then l.decisao := null; end if;
    update importacao_linhas set norm = r.o_norm, problemas = r.o_problemas, decisao = l.decisao,
                                 situacao = imp_situacao(r.o_problemas, l.decisao, r.o_norm -> 'duplicado' <> 'null'::jsonb)
     where id = l.id;
  end loop;
  update importacao_linhas x set norm = case when y.primeira < y.numero then x.norm || jsonb_build_object('mesmaDe', y.primeira) else x.norm - 'mesmaDe' end
    from (select id, numero, min(numero) over (partition by norm -> 'caso' ->> 'numero') primeira
            from importacao_linhas where importacao_id = p_importacao and norm -> 'caso' ->> 'numero' is not null
             and jsonb_typeof(norm -> 'duplicado') is distinct from 'object') y
   where x.id = y.id;
  update importacao_linhas x set norm = x.norm - 'mesmaDe'
   where x.importacao_id = p_importacao and x.norm ? 'mesmaDe'
     and (x.norm -> 'caso' ->> 'numero' is null or jsonb_typeof(x.norm -> 'duplicado') = 'object');
end $$;

-- Uma linha da prévia do caso.
alter function imp_linha_json(importacao_linhas) rename to imp_linha_json_cliente;
create function imp_linha_json(l importacao_linhas) returns jsonb
language sql stable
set search_path = public
as $$
  select case when not (l.norm ? 'caso') then imp_linha_json_cliente(l) else jsonb_build_object(
    'numero', l.numero, 'situacao', l.situacao, 'decisao', l.decisao, 'problemas', l.problemas,
    'valores', l.bruto || l.correcoes,
    'corrigidas', (select coalesce(jsonb_agg(jsonb_build_object('campo', k, 'antes', l.bruto ->> k, 'agora', v) order by k), '[]'::jsonb)
                     from jsonb_each_text(l.correcoes) e(k, v)),
    'cliente', jsonb_build_object('nome', coalesce(l.norm -> 'cliente' ->> 'nome', ''), 'tipo', 'PF', 'contatos', '[]'::jsonb)
               || jsonb_strip_nulls(jsonb_build_object('documento', l.norm -> 'cliente' ->> 'documento')),
    'clienteId', l.norm -> 'cliente' -> 'id',
    'mesmaDe', l.norm -> 'mesmaDe', 'telefoneDe', null, 'contrato', null, 'duplicado', null,
    'caso', jsonb_build_object(
      'nome', l.norm -> 'caso' ->> 'nome', 'area', l.norm -> 'caso' ->> 'area', 'parteContraria', l.norm -> 'caso' ->> 'parte_contraria',
      'numero', l.norm -> 'caso' ->> 'numero', 'tribunal', l.norm -> 'caso' ->> 'tribunal', 'vara', l.norm -> 'caso' ->> 'vara',
      'valorCausa', (l.norm -> 'caso' ->> 'valor_causa')::bigint, 'distribuidoEm', l.norm -> 'caso' ->> 'distribuido_em',
      'etapa', case when l.norm -> 'caso' ->> 'etapa_id' is not null
                    then jsonb_build_object('id', l.norm -> 'caso' ->> 'etapa_id', 'nome', l.norm -> 'caso' ->> 'etapa') end,
      'etapaAntiga', l.norm -> 'caso' ->> 'etapa_antiga', 'papel', l.norm -> 'caso' ->> 'papel',
      'responsavel', pessoa_ref(nullif(l.norm -> 'caso' ->> 'responsavel', '')::uuid)),
    'casoExistente', case when jsonb_typeof(l.norm -> 'duplicado') = 'object' then (
      select jsonb_build_object('id', c.id, 'nome', c.nome, 'numero', c.numero_cnj, 'situacao', c.situacao,
               'clientes', (select coalesce(jsonb_agg(k.nome order by cc.ordem), '[]'::jsonb) from caso_clientes cc
                             join clientes_escritorio k on k.id = cc.cliente_id where cc.caso_id = c.id),
               'jaNoCaso', exists (select 1 from caso_clientes cc where cc.caso_id = c.id and cc.cliente_id = nullif(l.norm -> 'cliente' ->> 'id', '')::uuid))
        from casos c where c.id = (l.norm -> 'duplicado' ->> 'id')::uuid) end) end
$$;

-- O resumo da prévia ganha os casos.
alter function imp_resumo(uuid) rename to imp_resumo_clientes;
create function imp_resumo(p_importacao uuid) returns jsonb
language sql stable
set search_path = public
as $$
  select imp_resumo_clientes(p_importacao) || case when (select o_que from importacoes where id = p_importacao) <> 'CASOS' then '{}'::jsonb
    else jsonb_build_object('casos', jsonb_build_object(
    'novos', (select count(distinct coalesce(norm -> 'caso' ->> 'numero', 'linha' || numero)) from importacao_linhas
               where importacao_id = p_importacao and situacao = 'PRONTA' and norm ? 'caso' and decisao is distinct from 'JUNTAR'),
    'juntados', (select count(*) from importacao_linhas
                  where importacao_id = p_importacao and situacao = 'PRONTA' and norm ? 'caso' and decisao = 'JUNTAR'),
    'clientes', (select count(distinct norm -> 'cliente' ->> 'id') from importacao_linhas
                  where importacao_id = p_importacao and situacao = 'PRONTA' and norm ? 'caso'))) end
$$;

-- A importação mostra a dos processos que nasceu dela e a dos clientes de onde veio.
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
                from importacoes f where f.pai_id = i.id order by f.criado_em desc limit 1))
$$;

-- ---------------------------------------------------------------------------------------
-- Enviar: a planilha de processos do ADVBOX chega como a de clientes, com oQue = CASOS.

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
  v_destino text;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'clientes.editar');
  if v_oque is null or v_oque not in ('CLIENTES', 'CLIENTES_CONTRATOS', 'CASOS') then perform recusar_campos('Escolha o que importar', 'oQue'); end if;
  if v_origem not in ('PLANILHA', 'ASTREA', 'ADVBOX_PLANILHA') then perform recusar_campos('Origem inválida', 'origem'); end if;
  -- De outro sistema, só a sócia dona (pergunta 3): traz o escritório inteiro de uma vez.
  if v_origem <> 'PLANILHA' then
    if not e_socio_dono(p_pessoa, p_escritorio) then
      raise exception 'Só a sócia dona importa de outro sistema' using errcode = 'TC401', detail = jsonb_build_object('motivo', 'SEM_PERMISSAO')::text;
    end if;
    -- Do backup do Astrea, os processos vêm depois dos clientes, sem enviar de novo.
    if v_oque not in ('CLIENTES', 'CASOS') or (v_origem = 'ASTREA' and v_oque <> 'CLIENTES') then
      perform recusar_campos('Deste arquivo, só clientes', 'oQue');
    end if;
    if jsonb_typeof(v_sistema) is distinct from 'array' or jsonb_array_length(v_sistema) <> jsonb_array_length(coalesce(p_dados -> 'abas', '[]'::jsonb)) then
      perform recusar_campos('Abas do sistema inválidas', 'sistema');
    end if;
  else
    if v_oque = 'CASOS' then perform recusar_campos('Processos vêm do Astrea ou do ADVBOX', 'oQue'); end if;
    v_sistema := null;
  end if;
  v_limite := case when v_origem = 'PLANILHA' then 2000 else 10000 end;
  if v_oque = 'CLIENTES_CONTRATOS' then
    perform entrar_area(p_pessoa, p_escritorio, 'CONTRATOS');
    perform entrar_escritorio(p_pessoa, p_escritorio, 'contratos.editar');
  elsif v_oque = 'CASOS' then
    perform entrar_area(p_pessoa, p_escritorio, 'JURIDICO');
    perform entrar_escritorio(p_pessoa, p_escritorio, 'juridico.editar');
    perform etapas_garantir(p_escritorio);
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
  -- No arquivo de outro sistema, a aba pelo modelo vem primeiro; senão, a primeira com linhas.
  v_destino := case when v_oque = 'CASOS' then 'CASOS' else 'CLIENTES' end;
  select x.k - 1 into v_aba from jsonb_array_elements(p_dados -> 'abas') with ordinality x(ab, k)
   where jsonb_array_length(x.ab -> 'linhas') > 0 and jsonb_array_length(x.ab -> 'colunas') > 0
   order by case when v_sistema -> (x.k - 1)::integer ->> 'destino' = v_destino then 0 else 1 end, x.k limit 1;
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
          case when v_sistema is not null and v_origem = 'ASTREA' then (
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
  update importacoes set ligacao = imp_ligacao_inicial(i, p_pessoa) where id = i.id returning * into i;
  perform registrar_historico('importacao.enviada', 'importacoes', i.id::text,
    jsonb_build_object('arquivo', i.arquivo_nome, 'oQue', v_oque, 'origem', v_origem));
  return imp_json(i, p_pessoa);
end $$;

-- ---------------------------------------------------------------------------------------
-- Gravar a ligação e os pares e montar a prévia dos processos.

alter function portal_importacao_colunas(uuid, uuid, uuid, integer, jsonb) rename to imp_colunas_clientes;
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
  v_escolha text;
  v_arq integer;
  v_n integer;
  v_pares_disp jsonb;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'clientes.editar');
  i := imp_da_pessoa(p_pessoa, p_escritorio, p_importacao);
  if i.o_que <> 'CASOS' then
    -- A aba dos processos do backup não vai para os clientes: ela vem depois, como casos.
    if i.abas_sistema -> coalesce(json_inteiro(p_dados, 'aba'), i.aba)::integer ->> 'destino' = 'CASOS' then
      perform recusar_campos('Os processos entram depois dos clientes', 'aba');
    end if;
    return imp_colunas_clientes(p_pessoa, p_escritorio, p_importacao, p_versao, p_dados);
  end if;
  perform entrar_area(p_pessoa, p_escritorio, 'JURIDICO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'juridico.editar');
  perform etapas_garantir(p_escritorio);
  v_aba := coalesce(json_inteiro(p_dados, 'aba'), i.aba);
  if v_aba < 0 or v_aba >= jsonb_array_length(i.abas) then perform recusar_campos('Aba inválida', 'aba'); end if;
  v_lig := imp_ligacao_valida(i, v_aba, p_dados -> 'ligacao', p_pessoa);
  select array_agg(value) into v_campos from jsonb_each_text(v_lig);
  v_campos := coalesce(v_campos, '{}');
  if jsonb_typeof(coalesce(p_dados -> 'pares', '{}'::jsonb)) <> 'object' then perform recusar_campos('Pares inválidos', 'pares'); end if;
  v_pares_disp := imp_pares(i, v_aba, v_lig);

  -- Todo caso precisa de um responsável da equipe (EX-01).
  for x in select jsonb_array_elements(v_pares_disp -> 'responsavel') loop
    v_escolha := p_dados -> 'pares' -> 'responsavel' ->> (x ->> 'chave');
    if v_escolha is not null and v_escolha ~ '^[0-9a-f-]{36}$' and pessoa_do_escritorio(v_escolha::uuid, p_escritorio) then null;
    elsif x ->> 'sugestao' is not null then v_escolha := x ->> 'sugestao';
    else
      e := e || 'responsavel'::text;
      continue;
    end if;
    v_pares := jsonb_set(v_pares, '{responsavel}', coalesce(v_pares -> 'responsavel', '{}') || jsonb_build_object(x ->> 'chave', v_escolha));
  end loop;
  for x in select jsonb_array_elements(v_pares_disp -> 'area') loop
    v_escolha := p_dados -> 'pares' -> 'area' ->> (x ->> 'chave');
    v_pares := jsonb_set(v_pares, '{area}', coalesce(v_pares -> 'area', '{}') || jsonb_build_object(x ->> 'chave',
      case when area_direito_valida(v_escolha) then v_escolha else x ->> 'sugestao' end));
  end loop;
  for x in select jsonb_array_elements(v_pares_disp -> 'etapa') loop
    v_escolha := p_dados -> 'pares' -> 'etapa' ->> (x ->> 'chave');
    v_pares := jsonb_set(v_pares, '{etapa}', coalesce(v_pares -> 'etapa', '{}') || jsonb_build_object(x ->> 'chave',
      case when v_escolha ~ '^[0-9a-f-]{36}$' and exists (select 1 from etapas where id = v_escolha::uuid and escritorio_id = p_escritorio and not final)
           then v_escolha else x ->> 'sugestao' end));
  end loop;
  for x in select jsonb_array_elements(v_pares_disp -> 'situacaoProcesso') loop
    v_escolha := p_dados -> 'pares' -> 'situacaoProcesso' ->> (x ->> 'chave');
    v_pares := jsonb_set(v_pares, '{situacaoProcesso}', coalesce(v_pares -> 'situacaoProcesso', '{}') || jsonb_build_object(x ->> 'chave',
      case when v_escolha in ('ATIVO', 'FORA') then v_escolha else x ->> 'sugestao' end));
  end loop;

  if not (v_campos && array['cliente', 'cliente_documento']) then e := e || 'cliente'::text; end if;
  if cardinality(e) > 0 then
    raise exception 'Falta ligar campos obrigatórios' using errcode = 'TC422',
      detail = jsonb_build_object('motivo', 'CAMPO_OBRIGATORIO_SEM_COLUNA', 'campos', to_jsonb(array(select distinct v from unnest(e) v order by v)))::text;
  end if;

  update importacoes set aba = v_aba, ligacao = v_lig, pares = v_pares, linhas_lidas = null, fora_tipo = null
   where id = i.id and versao = p_versao returning versao into v_versao;
  if v_versao is null then perform conflito_versao('importacoes', i.id); end if;

  -- A prévia: só os processos ativos (pergunta 1); os arquivados são contados e ficam de fora.
  delete from importacao_linhas where importacao_id = i.id;
  with t as (
    select k::integer k, b - 'situacao_processo' b,
           case when 'situacao_processo' = any (v_campos)
                then coalesce(v_pares -> 'situacaoProcesso' ->> imp_chave(b ->> 'situacao_processo'), imp_sugerir_situacao_processo(b ->> 'situacao_processo'))
                else 'ATIVO' end sit
      from jsonb_array_elements(i.abas -> v_aba -> 'linhas') with ordinality x(r, k),
           lateral (select coalesce(jsonb_object_agg(c.value, btrim(r ->> c.key::integer)), '{}'::jsonb) b
                      from jsonb_each_text(v_lig) c where btrim(coalesce(r ->> c.key::integer, '')) <> '') bb
     where b - 'situacao_processo' <> '{}'::jsonb),
  ins as (insert into importacao_linhas (escritorio_id, importacao_id, numero, bruto)
          select p_escritorio, i.id, k + 1, b from t where sit = 'ATIVO' returning 1)
  select count(*) filter (where sit = 'FORA'), (select count(*) from ins) into v_arq, v_n from t;
  update importacoes set linhas_lidas = v_n,
         fora_tipo = case when 'situacao_processo' = any (v_campos) then jsonb_build_object('ARQUIVADOS', v_arq) end
   where id = i.id returning versao into v_versao;
  perform imp_reconferir(i.id);
  return jsonb_build_object('versao', v_versao) || imp_resumo(i.id);
end $$;

-- Corrigir a linha do processo, decidir o aviso ou pular.
alter function portal_importacao_linha(uuid, uuid, uuid, integer, jsonb) rename to imp_linha_clientes;
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
  if i.o_que <> 'CASOS' then return imp_linha_clientes(p_pessoa, p_escritorio, p_importacao, p_numero, p_dados); end if;
  select * into l from importacao_linhas where importacao_id = i.id and numero = p_numero for update;
  if l.id is null then raise exception 'Linha não encontrada' using errcode = 'TC404'; end if;
  if jsonb_typeof(p_dados) is distinct from 'object' then perform recusar_campos('Dados inválidos', 'dados'); end if;
  v_corr := l.correcoes;
  if p_dados ? 'campos' then
    if jsonb_typeof(p_dados -> 'campos') <> 'object' then perform recusar_campos('Dados inválidos', 'campos'); end if;
    for k, v in select key, value from jsonb_each_text(p_dados -> 'campos') loop
      if not (k = any (imp_campos_caso())) or k = 'situacao_processo' or length(coalesce(v, '')) > 400 then perform recusar_campos('Campo desconhecido', k); end if;
      v := btrim(coalesce(v, ''));
      v_corr := case when v = coalesce(l.bruto ->> k, '') then v_corr - k else v_corr || jsonb_build_object(k, v) end;
    end loop;
  end if;
  v_dec := case when p_dados ? 'decisao' then nullif(p_dados ->> 'decisao', '') else l.decisao end;
  if v_dec is not null and v_dec not in ('JUNTAR', 'SEGUIR', 'PULAR') then perform recusar_campos('Decisão desconhecida', 'decisao'); end if;
  if v_dec = 'JUNTAR' and jsonb_typeof(l.norm -> 'duplicado') is distinct from 'object' then
    perform recusar_campos('Não há caso com este número para juntar', 'decisao');
  end if;
  update importacao_linhas set correcoes = v_corr, decisao = v_dec, corrigida_por = case when v_corr <> '{}'::jsonb then p_pessoa end
   where id = l.id;
  perform imp_reconferir(i.id, p_numero);
  -- O mesmo número em outra linha muda o "mesmo processo" das outras.
  if (l.bruto || l.correcoes) ->> 'numero' is distinct from (l.bruto || v_corr) ->> 'numero' then perform imp_reconferir(i.id); end if;
  update importacoes set versao = versao where id = i.id;
  select * into l from importacao_linhas where id = l.id;
  return jsonb_build_object('linha', imp_linha_json(l), 'versao', (select versao from importacoes where id = i.id)) || imp_resumo(i.id);
end $$;

-- Decisão em lote ("Juntar as 6"): no caso, juntar os processos que já existem.
alter function portal_importacao_decidir(uuid, uuid, uuid, jsonb) rename to imp_decidir_clientes;
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
  if i.o_que <> 'CASOS' then return imp_decidir_clientes(p_pessoa, p_escritorio, p_importacao, p_dados); end if;
  if v_cod is null or v_cod not in ('CASO_DUPLICADO', 'CAMPO_INVALIDO') then perform recusar_campos('Aviso desconhecido', 'codigo'); end if;
  if v_dec is null or v_dec not in (case when v_cod = 'CASO_DUPLICADO' then 'JUNTAR' else 'SEGUIR' end, 'PULAR') then
    perform recusar_campos('Decisão inválida', 'decisao');
  end if;
  update importacao_linhas l set decisao = v_dec,
         situacao = imp_situacao(l.problemas, v_dec, jsonb_typeof(l.norm -> 'duplicado') = 'object')
   where l.importacao_id = i.id and l.situacao = 'AVISO' and l.decisao is null
     and exists (select 1 from jsonb_array_elements(l.problemas) x where x ->> 'codigo' = v_cod)
     and (v_dec <> 'JUNTAR' or jsonb_typeof(l.norm -> 'duplicado') = 'object');
  get diagnostics v_n = row_count;
  return jsonb_build_object('decididas', v_n) || imp_resumo(i.id);
end $$;

-- ---------------------------------------------------------------------------------------
-- Importar.

-- Os processos: tudo numa transação. Cada caso entra sem contrato, sem aviso ao cliente e com a
-- mudança de etapa "Caso importado".
create function imp_importar_casos(i importacoes, p_pessoa uuid) returns jsonb
language plpgsql
set search_path = public
as $$
declare
  l importacao_linhas;
  c jsonb;
  v_caso uuid;
  v_cli uuid;
  v_numeros jsonb := '{}'::jsonb;
  v_sistema text := case i.origem when 'ASTREA' then 'do Astrea' when 'ADVBOX_PLANILHA' then 'do ADVBOX' else 'da planilha' end;
begin
  for l in select * from importacao_linhas where importacao_id = i.id and situacao = 'PRONTA' order by numero loop
    c := l.norm -> 'caso';
    v_cli := (l.norm -> 'cliente' ->> 'id')::uuid;
    if l.decisao = 'JUNTAR' then
      v_caso := (l.norm -> 'duplicado' ->> 'id')::uuid;
    elsif c ->> 'numero' is not null and v_numeros ? (c ->> 'numero') then
      v_caso := (v_numeros ->> (c ->> 'numero'))::uuid;
    else
      insert into casos (escritorio_id, nome, area, parte_contraria, numero_cnj, tribunal, vara, distribuido_em, valor_causa,
                         etapa_id, responsavel_id, criado_por, importacao_id)
      values (i.escritorio_id, c ->> 'nome', c ->> 'area', c ->> 'parte_contraria', c ->> 'numero', c ->> 'tribunal', c ->> 'vara',
              (c ->> 'distribuido_em')::date, (c ->> 'valor_causa')::bigint, (c ->> 'etapa_id')::uuid, (c ->> 'responsavel')::uuid, p_pessoa, i.id)
      returning id into v_caso;
      insert into caso_etapa_mudancas (escritorio_id, caso_id, para_etapa_id, motivo, por)
      values (i.escritorio_id, v_caso, (c ->> 'etapa_id')::uuid,
              left('Caso importado ' || v_sistema || coalesce(' (etapa lá: ' || (c ->> 'etapa_antiga') || ')', '') || '.', 1000), p_pessoa);
      perform registrar_historico('juridico.caso_cadastrado', 'casos', v_caso::text,
        jsonb_build_object('etapa', c ->> 'etapa_id', 'responsavel', c ->> 'responsavel', 'clientes', 1, 'importacao', i.id));
      if c ->> 'numero' is not null then v_numeros := v_numeros || jsonb_build_object(c ->> 'numero', v_caso); end if;
    end if;
    if not exists (select 1 from caso_clientes where caso_id = v_caso and cliente_id = v_cli) then
      insert into caso_clientes (escritorio_id, caso_id, cliente_id, papel, ordem, importacao_id)
      values (i.escritorio_id, v_caso, v_cli, c ->> 'papel', coalesce((select max(ordem) from caso_clientes where caso_id = v_caso), 0) + 1,
              case when (select importacao_id from casos where id = v_caso) is distinct from i.id then i.id end);
    end if;
    update importacao_linhas set situacao = 'IMPORTADA', cliente_id = v_cli, caso_id = v_caso where id = l.id;
  end loop;
  return jsonb_build_object(
    'casos', (select count(*) from casos where escritorio_id = i.escritorio_id and importacao_id = i.id),
    'juntadosCasos', (select count(distinct caso_id) from caso_clientes where escritorio_id = i.escritorio_id and importacao_id = i.id),
    'clientes', 0, 'juntados', 0, 'juntadosIds', '[]'::jsonb, 'contratos', 0, 'ativos', 0, 'parcelas', 0, 'valor', 0, 'vencidas', 0,
    'exitos', 0, 'valorPagoAntes', 0,
    'linhas', (select count(*) from importacao_linhas where importacao_id = i.id and situacao = 'IMPORTADA'),
    'fora', (select count(*) from importacao_linhas where importacao_id = i.id and situacao <> 'IMPORTADA'));
end $$;

alter function portal_importacao_importar(uuid, uuid, uuid, integer) rename to imp_importar_clientes;
create function portal_importacao_importar(p_pessoa uuid, p_escritorio uuid, p_importacao uuid, p_versao integer) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  i importacoes;
  v_antes jsonb;
  v_procs jsonb;
  v_idx integer;
  f importacoes;
  r jsonb;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'clientes.editar');
  select * into i from importacoes where id = p_importacao and escritorio_id = p_escritorio for update;
  i := imp_da_pessoa(p_pessoa, p_escritorio, p_importacao);
  if i.o_que <> 'CASOS' then
    -- A aba dos processos do backup, guardada antes de a importação dos clientes apagar as células.
    select x.k - 1 into v_idx from jsonb_array_elements(coalesce(i.abas_sistema, '[]'::jsonb)) with ordinality x(s, k)
     where x.s ->> 'destino' = 'CASOS' and (x.s ->> 'lida')::boolean and jsonb_array_length(i.abas -> (x.k - 1)::integer -> 'linhas') > 0
     order by x.k limit 1;
    if v_idx is not null then v_procs := i.abas -> v_idx; end if;
    r := imp_importar_clientes(p_pessoa, p_escritorio, p_importacao, p_versao);
    -- Os processos viram a segunda prévia, já com as colunas ligadas pelo modelo (decisão de 22/11).
    if v_procs is not null and e_socio_dono(p_pessoa, p_escritorio) and 'JURIDICO' = any (areas_da_pessoa(p_pessoa, p_escritorio)) then
      perform etapas_garantir(p_escritorio);
      perform definir_transicao('ENVIADA', 'Os processos do backup');
      insert into importacoes (escritorio_id, arquivo_nome, o_que, abas, aba, criado_por, origem, modelo, por_modelo, pai_id)
      values (p_escritorio, i.arquivo_nome, 'CASOS', jsonb_build_array(v_procs), 0, p_pessoa, i.origem, i.modelo,
              case when i.por_modelo ? v_idx::text then jsonb_build_object('0', i.por_modelo -> v_idx::text) else '{}'::jsonb end, i.id)
      returning * into f;
      update importacoes set ligacao = imp_ligacao_inicial(f, p_pessoa) where id = f.id;
      perform registrar_historico('importacao.enviada', 'importacoes', f.id::text,
        jsonb_build_object('arquivo', f.arquivo_nome, 'oQue', 'CASOS', 'origem', f.origem, 'de', i.id));
      select * into i from importacoes where id = p_importacao;
      return imp_json(i, p_pessoa);
    end if;
    return r;
  end if;

  perform entrar_area(p_pessoa, p_escritorio, 'JURIDICO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'juridico.editar');
  if i.versao <> p_versao then perform conflito_versao('importacoes', i.id); end if;
  if not exists (select 1 from importacao_linhas where importacao_id = i.id) then perform recusar_motivo('Faça a prévia antes de importar', 'SEM_PREVIA'); end if;
  -- Conferir de novo: um caso cadastrado desde a prévia pode virar o mesmo número.
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
  perform pg_advisory_xact_lock(hashtext('casos:' || p_escritorio::text));
  r := imp_importar_casos(i, p_pessoa);
  perform definir_transicao('IMPORTADA');
  update importacoes set estado = 'CONCLUIDA', abas = null, importado_em = app_now(), desfazer_ate = app_now() + interval '7 days', resumo = r
   where id = i.id returning * into i;
  perform registrar_historico('importacao.concluida', 'importacoes', i.id::text, r - 'juntadosIds');
  return imp_json(i, p_pessoa);
end $$;

-- ---------------------------------------------------------------------------------------
-- Desfazer os processos (decisão 28). O caso que alguém mexeu depois fica como está.

-- Mexido: editado, com outra etapa, com contrato ou com qualquer coisa ligada a ele (prazo,
-- tarefa, documento, petição...), olhando toda tabela que tem caso_id.
create function imp_caso_mexido(p_caso uuid) returns boolean
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
              and c.table_name not in ('caso_clientes', 'caso_etapa_mudancas', 'importacao_linhas') loop
    execute format('select exists (select 1 from %I where caso_id = $1)', r.table_name) into v using p_caso;
    if v then return true; end if;
  end loop;
  return false;
end $$;

create function imp_desfazer_plano_casos(i importacoes) returns jsonb
language sql stable
set search_path = public
as $$
  with cs as (select c.*, imp_caso_mexido(c.id) mexido from casos c
               where c.escritorio_id = i.escritorio_id and c.importacao_id = i.id and c.situacao = 'ANDAMENTO'),
  lig as (select cc.*, cc.contrato_id is not null mexido from caso_clientes cc where cc.escritorio_id = i.escritorio_id and cc.importacao_id = i.id)
  select jsonb_build_object(
    'clientes', 0, 'juntados', 0, 'contratos', 0, 'parcelas', 0,
    'casos', (select count(*) from cs where not mexido),
    'ligacoes', (select count(*) from lig where not mexido),
    'mexidos', (select coalesce(jsonb_agg(x order by x ->> 'nome'), '[]'::jsonb) from (
                  select jsonb_build_object('tipo', 'CASO', 'id', id, 'nome', nome) x from cs where mexido) m))
$$;

alter function imp_desfazer_plano(importacoes) rename to imp_desfazer_plano_clientes;
create function imp_desfazer_plano(i importacoes) returns jsonb
language sql stable
set search_path = public
as $$
  select case when i.o_que = 'CASOS' then imp_desfazer_plano_casos(i) else imp_desfazer_plano_clientes(i) end
$$;

alter function portal_importacao_desfazer(uuid, uuid, uuid, text) rename to imp_desfazer_clientes;
create function portal_importacao_desfazer(p_pessoa uuid, p_escritorio uuid, p_importacao uuid, p_motivo text) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  i importacoes;
  v_motivo text := btrim(coalesce(p_motivo, ''));
  v_plano jsonb;
  c casos;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'clientes.editar');
  select * into i from importacoes where id = p_importacao and escritorio_id = p_escritorio for update;
  if i.id is null or i.o_que <> 'CASOS' then return imp_desfazer_clientes(p_pessoa, p_escritorio, p_importacao, p_motivo); end if;
  if i.estado not in ('CONCLUIDA', 'DESFEITA') then raise exception 'Importação não encontrada' using errcode = 'TC404'; end if;
  if i.estado = 'DESFEITA' then perform recusar_motivo('A importação já foi desfeita', 'JA_DESFEITA'); end if;
  if i.criado_por <> p_pessoa and not e_socio_dono(p_pessoa, p_escritorio) then
    raise exception 'Só quem importou ou a sócia dona desfaz' using errcode = 'TC401', detail = jsonb_build_object('motivo', 'SEM_PERMISSAO')::text;
  end if;
  if i.desfazer_ate < app_now() then perform recusar_motivo('O prazo de desfazer acabou', 'PRAZO_ENCERRADO'); end if;
  if length(v_motivo) not between 3 and 300 then perform recusar_campos('Escreva o motivo', 'motivo'); end if;
  perform entrar_area(p_pessoa, p_escritorio, 'JURIDICO');
  v_plano := imp_desfazer_plano(i);

  -- Os casos novos: em Encerrados, marcados "importação desfeita", sem resultado.
  for c in select * from casos where escritorio_id = p_escritorio and importacao_id = i.id and situacao = 'ANDAMENTO' loop
    if exists (select 1 from jsonb_array_elements(v_plano -> 'mexidos') m where m ->> 'id' = c.id::text) then continue; end if;
    update casos set situacao = 'ENCERRADO', encerrado_em = app_now(), encerrado_por = 'IMPORTACAO_DESFEITA' where id = c.id;
    perform registrar_historico('juridico.caso_encerrado', 'casos', c.id::text,
      jsonb_build_object('importacaoDesfeita', i.id, 'motivo', left(v_motivo, 300)));
  end loop;
  -- Os casos que já existiam perdem só o cliente que a importação ligou.
  delete from caso_clientes where escritorio_id = p_escritorio and importacao_id = i.id and contrato_id is null;

  perform definir_transicao('DESFEITA', v_motivo);
  update importacoes set estado = 'DESFEITA', desfeita_em = app_now(), desfeita_por = p_pessoa, motivo_desfazer = v_motivo
   where id = i.id returning * into i;
  perform registrar_historico('importacao.desfeita', 'importacoes', i.id::text, jsonb_build_object('motivo', v_motivo) || (v_plano - 'mexidos'));
  return imp_json(i, p_pessoa) || jsonb_build_object('feito', v_plano);
end $$;

-- A linha "veio da importação" também na ficha do caso.
create or replace function portal_importacao_origem(p_pessoa uuid, p_escritorio uuid, p_importacao uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v uuid := coalesce((select importacao_id from clientes_escritorio where id = p_importacao and escritorio_id = p_escritorio),
                     (select importacao_id from contratos where id = p_importacao and escritorio_id = p_escritorio),
                     (select importacao_id from casos where id = p_importacao and escritorio_id = p_escritorio),
                     p_importacao);
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'clientes.ver');
  return (select jsonb_build_object('id', i.id, 'arquivo', i.arquivo_nome, 'em', i.importado_em, 'por', pessoa_ref(i.criado_por), 'origem', i.origem)
            from importacoes i where i.id = v and i.escritorio_id = p_escritorio and i.importado_em is not null);
end $$;

call fechar_acesso();
