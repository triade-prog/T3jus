-- Importar do Astrea e do ADVBOX (F3.56; VA-05): o que sobrou das partes 2 e 3, pelo desenho
-- aprovado em docs/design/aprovadas/portal-importacao-sistemas (decisões 3, 7, 18, 23, 28 e 29)
-- e pelo plano revisado de 23/11/2026 (planos/importacao-sobras).
-- - F3.116, parte "arquivados como encerrados": a sócia dona escolhe, no passo das abas do backup
--   do Astrea (estado astrea-abas) ou ao lado das colunas da planilha de processos do ADVBOX
--   (estado advbox-valores), se os processos arquivados ficam de fora (o padrão recomendado) ou
--   entram como casos encerrados, sem resultado nem acerto. A escolha fica na importação
--   (importacoes.arquivados) e passa da importação dos clientes para a dos processos.
--   O caso importado encerrado é marcado encerrado_por = 'IMPORTADO_ENCERRADO': fica fora do
--   fechamento (EX-16), do resumo do acerto e dos relatórios do sócio. Desfazer passa esses casos
--   a "importação desfeita", com a data em que entraram.
-- - F3.117, parte "prévia agrupada": as despesas do escritório passam a ser gravadas na prévia,
--   com a situação FORA_REGRA (lida, mostrada e nunca importada), para a prévia listar os
--   lançamentos em Recebidos, Em aberto e Despesas (estado previa-financeiro), com busca por
--   cliente, caso ou valor.
-- - Os relatórios do sócio deixam de contar como caso do período o caso encerrado sem resultado
--   (o importado encerrado e o de importação desfeita, que já distorcia).
-- Não há tabela nova: as colunas novas ficam em importacoes, que já tem escritorio_id e passou por
-- proteger_tabela_escritorio. O escritório vem sempre de p_escritorio, que a API tira da sessão.

-- ---------------------------------------------------------------------------------------
-- Tabelas e checks.

-- O que fazer com os processos arquivados do sistema antigo. FORA é o recomendado.
alter table importacoes add column arquivados text not null default 'FORA' check (arquivados in ('FORA', 'ENCERRADOS'));

-- O caso pode vir encerrado do sistema antigo, sem resultado.
do $$
declare r record;
begin
  for r in select conname from pg_constraint
            where conrelid = 'casos'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%encerrado_por = ANY%' loop
    execute format('alter table casos drop constraint %I', r.conname);
  end loop;
end $$;
alter table casos add constraint casos_encerrado_por_check check (encerrado_por in ('RESULTADO', 'IMPORTACAO_DESFEITA', 'IMPORTADO_ENCERRADO'));
alter table casos drop constraint casos_resultado_encerrado_check;
-- Só o encerramento normal (encerrado_por nulo ou RESULTADO) tem resultado.
alter table casos add constraint casos_resultado_encerrado_check
  check ((resultado is not null) = (situacao = 'ENCERRADO' and coalesce(encerrado_por, 'RESULTADO') = 'RESULTADO'));

-- A linha lida e mostrada que nunca entra, por regra (hoje, a despesa do escritório).
do $$
declare r record;
begin
  for r in select conname from pg_constraint
            where conrelid = 'importacao_linhas'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%situacao%PULADA%' loop
    execute format('alter table importacao_linhas drop constraint %I', r.conname);
  end loop;
end $$;
alter table importacao_linhas add constraint importacao_linhas_situacao_check
  check (situacao in ('PRONTA', 'AVISO', 'ERRO', 'PULADA', 'IMPORTADA', 'FORA_REGRA'));

-- ---------------------------------------------------------------------------------------
-- Troca pontual nas funções de outras frentes (jornada e relatórios). Falha alto se o trecho
-- não aparecer exatamente uma vez: assim, uma mudança de outra PR não passa em silêncio.

create function t920_trocar(p_funcao regprocedure, p_de text, p_para text) returns void
language plpgsql
as $$
declare
  v_def text := pg_get_functiondef(p_funcao);
  v_n integer := (length(v_def) - length(replace(v_def, p_de, ''))) / length(p_de);
begin
  if v_n <> 1 then raise exception 'O trecho aparece % vezes em % (esperado 1): %', v_n, p_funcao, left(p_de, 80); end if;
  execute replace(v_def, p_de, p_para);
end $$;

-- O resumo do acerto é só do caso encerrado com resultado.
select t920_trocar('caso_resumo_acerto(uuid,uuid,uuid)',
  $q$ca.encerrado_por is not distinct from 'IMPORTACAO_DESFEITA'$q$,
  $q$coalesce(ca.encerrado_por, 'RESULTADO') <> 'RESULTADO'$q$);
-- O fechamento (EX-16) também: o caso que veio encerrado não tem o que acertar, e o cliente cujo
-- único caso veio encerrado segue em "Fazer a proposta", não em "Cliente atendido".
select t920_trocar('cliente_passo_sem_docs(uuid,uuid,uuid)',
  $q$and c.encerrado_por is distinct from 'IMPORTACAO_DESFEITA'$q$,
  $q$and coalesce(c.encerrado_por, 'RESULTADO') = 'RESULTADO'$q$);
-- Os relatórios do sócio contam só o caso que andou no escritório.
select t920_trocar('relatorio_casos(uuid,date,date)',
  $q$and (c.encerrado_em is null or (c.encerrado_em at time zone 'America/Sao_Paulo')::date >= p_de)$q$,
  $q$and (c.encerrado_em is null or (c.encerrado_em at time zone 'America/Sao_Paulo')::date >= p_de)
     and coalesce(c.encerrado_por, 'RESULTADO') = 'RESULTADO'$q$);
-- As linhas de fora (a planilha baixada) não trazem as despesas do escritório.
select t920_trocar('portal_importacao_fora(uuid,uuid,uuid)',
  $q$where l.importacao_id = i.id and l.situacao <> 'IMPORTADA'$q$,
  $q$where l.importacao_id = i.id and l.situacao not in ('IMPORTADA', 'FORA_REGRA')$q$);

drop function t920_trocar(regprocedure, text, text);

-- ---------------------------------------------------------------------------------------
-- A lista de casos diz como o caso encerrou (o selo vem com a próxima entrega).

create or replace function caso_linha(c casos) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', c.id, 'nome', c.nome, 'area', c.area, 'numero', c.numero_cnj, 'situacao', c.situacao, 'resultado', c.resultado,
    'encerradoPor', c.encerrado_por,
    'parteContraria', c.parte_contraria,
    'cliente', (select jsonb_build_object('id', k.id, 'nome', k.nome) from caso_clientes cc join clientes_escritorio k on k.id = cc.cliente_id
                 where cc.caso_id = c.id order by cc.ordem limit 1),
    'outrosClientes', (select count(*) - 1 from caso_clientes cc where cc.caso_id = c.id),
    'semContrato', exists (select 1 from caso_clientes cc where cc.caso_id = c.id and cc.contrato_id is null),
    'etapa', (select jsonb_build_object('id', e.id, 'ordem', e.ordem, 'nome', e.nome, 'final', e.final) from etapas e where e.id = c.etapa_id),
    'responsavel', pessoa_ref(c.responsavel_id),
    'etapaDesde', c.etapa_desde,
    'proximoPrazo', (select jsonb_build_object('data', p.data_final, 'fazerAte', p.fazer_ate, 'descricao', p.descricao)
                       from prazos p where p.caso_id = c.id and p.cumprido_em is null order by p.data_final, p.criado_em limit 1),
    'pendencias', (select count(*) from tarefas t where t.caso_id = c.id and t.concluida_em is null and t.esperando is not null)
                  + (select count(*) from documento_pedidos d where d.caso_id = c.id and d.chegou_em is null))
$$;

-- ---------------------------------------------------------------------------------------
-- Ativo ou arquivado: uma regra só, para separar as linhas ao montar a prévia e para conferir
-- cada linha depois (a mesma busca nos pares do passo 2 e, sem par, a sugestão pelo nome).

create function imp_sit_processo(i importacoes, d jsonb) returns text
language sql stable
set search_path = public
as $$
  select case when exists (select 1 from jsonb_each_text(i.ligacao) x where x.value = 'situacao_processo')
              then coalesce(i.pares -> 'situacaoProcesso' ->> imp_chave(d ->> 'situacao_processo'), imp_sugerir_situacao_processo(d ->> 'situacao_processo'))
              else 'ATIVO' end
$$;

-- ---------------------------------------------------------------------------------------
-- Enviar: no backup do Astrea, a aba dos processos já diz quantos estão ativos e arquivados
-- ("241 ativos e 71 arquivados", estado astrea-abas), pela sugestão do nome da situação.

alter function portal_importacao_criar(uuid, uuid, jsonb) rename to imp_criar_cf;
create function portal_importacao_criar(p_pessoa uuid, p_escritorio uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r jsonb := imp_criar_cf(p_pessoa, p_escritorio, p_dados);
  i importacoes;
  v_idx integer;
  v_col text;
  v_ativos integer;
  v_arq integer;
begin
  select * into i from importacoes where id = (r ->> 'id')::uuid and escritorio_id = p_escritorio;
  if i.origem <> 'ASTREA' then return r; end if;
  select x.k - 1 into v_idx from jsonb_array_elements(coalesce(i.abas_sistema, '[]'::jsonb)) with ordinality x(s, k)
   where x.s ->> 'destino' = 'CASOS' and (x.s ->> 'lida')::boolean order by x.k limit 1;
  if v_idx is null then return r; end if;
  select key into v_col from jsonb_each_text(coalesce(i.por_modelo -> v_idx::text, '{}'::jsonb)) where value = 'situacao_processo' limit 1;
  if v_col is not null then
    select count(*) filter (where imp_sugerir_situacao_processo(x ->> v_col::integer) = 'ATIVO'),
           count(*) filter (where imp_sugerir_situacao_processo(x ->> v_col::integer) = 'FORA')
      into v_ativos, v_arq
      from jsonb_array_elements(i.abas -> v_idx -> 'linhas') x
     where exists (select 1 from jsonb_array_elements_text(x) c where btrim(c) <> '');
  end if;
  update importacoes set abas_sistema = jsonb_set(abas_sistema, array[v_idx::text],
           (abas_sistema -> v_idx) || jsonb_build_object('ativos', v_ativos, 'arquivados', v_arq))
   where id = i.id returning * into i;
  return imp_json(i, p_pessoa);
end $$;

-- A escolha dos arquivados no passo das abas do backup do Astrea. Fica na importação dos
-- clientes e passa para a dos processos quando os clientes entram.
create function portal_importacao_arquivados(p_pessoa uuid, p_escritorio uuid, p_importacao uuid, p_versao integer, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  i importacoes;
  v text := p_dados ->> 'arquivados';
  v_versao integer;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'clientes.editar');
  if not e_socio_dono(p_pessoa, p_escritorio) then
    raise exception 'Só a sócia dona importa de outro sistema' using errcode = 'TC401', detail = jsonb_build_object('motivo', 'SEM_PERMISSAO')::text;
  end if;
  i := imp_da_pessoa(p_pessoa, p_escritorio, p_importacao);
  if i.origem <> 'ASTREA' or i.o_que <> 'CLIENTES' then perform recusar_campos('A escolha dos arquivados é do backup do Astrea', 'arquivados'); end if;
  if v is null or v not in ('FORA', 'ENCERRADOS') then perform recusar_campos('Escolha o que fazer com os arquivados', 'arquivados'); end if;
  update importacoes set arquivados = v where id = i.id and versao = p_versao returning versao into v_versao;
  if v_versao is null then perform conflito_versao('importacoes', i.id); end if;
  select * into i from importacoes where id = i.id;
  return imp_json(i, p_pessoa);
end $$;

-- ---------------------------------------------------------------------------------------
-- As colunas e a prévia dos processos: os arquivados entram como encerrados, se for a escolha.
-- O bruto guarda a situação (não dá para corrigi-la na prévia), para conferir cada linha com a
-- mesma regra de quando a prévia foi montada.

create or replace function imp_colunas_cc(p_pessoa uuid, p_escritorio uuid, p_importacao uuid, p_versao integer, p_dados jsonb) returns jsonb
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
  v_arqv text;
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
  -- Na planilha do ADVBOX a escolha vem aqui; no backup do Astrea, ela veio da importação dos clientes.
  v_arqv := coalesce(nullif(p_dados ->> 'arquivados', ''), i.arquivados);
  if v_arqv not in ('FORA', 'ENCERRADOS') then perform recusar_campos('Escolha o que fazer com os arquivados', 'arquivados'); end if;
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

  update importacoes set aba = v_aba, ligacao = v_lig, pares = v_pares, linhas_lidas = null, fora_tipo = null, arquivados = v_arqv
   where id = i.id and versao = p_versao returning versao into v_versao;
  if v_versao is null then perform conflito_versao('importacoes', i.id); end if;
  select * into i from importacoes where id = p_importacao;

  -- A prévia: os ativos e, com a escolha ENCERRADOS, também os arquivados (que entram encerrados).
  -- Com FORA, os arquivados são contados e ficam de fora (pergunta 1).
  delete from importacao_linhas where importacao_id = i.id;
  with t as (
    select k::integer k, b, imp_sit_processo(i, b) sit
      from jsonb_array_elements(i.abas -> v_aba -> 'linhas') with ordinality x(r, k),
           lateral (select coalesce(jsonb_object_agg(c.value, btrim(r ->> c.key::integer)), '{}'::jsonb) b
                      from jsonb_each_text(v_lig) c where btrim(coalesce(r ->> c.key::integer, '')) <> '') bb
     where b - 'situacao_processo' <> '{}'::jsonb),
  ins as (insert into importacao_linhas (escritorio_id, importacao_id, numero, bruto)
          select p_escritorio, i.id, k + 1, b from t where sit = 'ATIVO' or v_arqv = 'ENCERRADOS' returning 1)
  select count(*) filter (where sit = 'FORA'), (select count(*) from ins) into v_arq, v_n from t;
  -- fora_tipo guarda só o que ficou de fora; os encerrados aparecem no resumo da prévia.
  update importacoes set linhas_lidas = v_n,
         fora_tipo = case when 'situacao_processo' = any (v_campos) and v_arqv = 'FORA' then jsonb_build_object('ARQUIVADOS', v_arq) end
   where id = i.id returning versao into v_versao;
  perform imp_reconferir(i.id);
  return jsonb_build_object('versao', v_versao) || imp_resumo(i.id);
end $$;

-- Conferir uma linha de processo: o arquivado que entra vai direto para a etapa final, encerrado
-- e sem resultado; a fase que tinha lá fica guardada.
create or replace function imp_conferir_caso(i importacoes, l importacao_linhas, out o_norm jsonb, out o_problemas jsonb)
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
  v_enc boolean := i.arquivados = 'ENCERRADOS' and imp_sit_processo(i, d) = 'FORA';
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
  if v_enc then
    v_etapa := (select id from etapas where escritorio_id = i.escritorio_id and final limit 1);
  else
    begin
      v_etapa := nullif(i.pares -> 'etapa' ->> imp_chave(d ->> 'etapa'), '')::uuid;
    exception when others then v_etapa := null;
    end;
    if v_etapa is null or not exists (select 1 from etapas where id = v_etapa and escritorio_id = i.escritorio_id and not final) then
      v_etapa := (select id from etapas where escritorio_id = i.escritorio_id and not final order by ordem limit 1);
    end if;
  end if;
  v_area := coalesce(nullif(i.pares -> 'area' ->> imp_chave(d ->> 'area'), ''), imp_sugerir_area(d ->> 'area'), 'OUTRA');
  if not area_direito_valida(v_area) then v_area := 'OUTRA'; end if;

  v_parte := nullif(left(btrim(coalesce(d ->> 'parte_contraria', '')), 160), '');
  if length(v_parte) < 2 then v_parte := null; end if;
  caso := jsonb_build_object('area', v_area, 'parte_contraria', v_parte, 'numero', v_num, 'etapa_id', v_etapa,
                             'etapa', (select nome from etapas where id = v_etapa),
                             'etapa_antiga', nullif(btrim(coalesce(d ->> 'etapa', '')), ''),
                             'responsavel', v_resp, 'papel', imp_papel(d ->> 'papel'),
                             'encerrado', case when v_enc then true end);
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

-- O mesmo número numa linha ativa e numa arquivada: a primeira linha decide (o caso nasce dela e
-- as outras se juntam a ele); a outra ganha um aviso na situação, para a pessoa decidir.
create function imp_casos_mesmo_numero(p_importacao uuid) returns void
language plpgsql
set search_path = public
as $$
declare
  r record;
  v_p jsonb;
begin
  for r in select l.id, l.norm, l.problemas, l.decisao, l.bruto, f.norm -> 'caso' -> 'encerrado' enc_primeira
             from importacao_linhas l
             left join importacao_linhas f on f.importacao_id = l.importacao_id and f.numero = (l.norm ->> 'mesmaDe')::integer
            where l.importacao_id = p_importacao and l.situacao <> 'IMPORTADA' loop
    v_p := coalesce((select jsonb_agg(x order by k) from jsonb_array_elements(r.problemas) with ordinality t(x, k)
                      where not (x ->> 'codigo' = 'CAMPO_INVALIDO' and x ->> 'campo' = 'situacao_processo')), '[]'::jsonb);
    if r.norm ? 'mesmaDe' and coalesce((r.norm -> 'caso' ->> 'encerrado')::boolean, false) <> coalesce((r.enc_primeira #>> '{}')::boolean, false) then
      v_p := v_p || imp_problema('CAMPO_INVALIDO', 'situacao_processo', 'AVISO', nullif(btrim(coalesce(r.bruto ->> 'situacao_processo', '')), ''));
    end if;
    if v_p <> r.problemas then
      update importacao_linhas set problemas = v_p, situacao = imp_situacao(v_p, r.decisao, jsonb_typeof(r.norm -> 'duplicado') = 'object')
       where id = r.id;
    end if;
  end loop;
end $$;

-- Conferir de novo. Nos processos, também o mesmo número entre ativo e arquivado. No financeiro,
-- cada lançamento sabe o grupo (Recebidos, Em aberto, Despesas); a despesa do escritório passa
-- pela conferência só para montar o que a prévia mostra: os problemas são descartados e ela
-- nunca muda de situação (FORA_REGRA).
create or replace function imp_reconferir(p_importacao uuid, p_numero integer default null) returns void
language plpgsql
set search_path = public
as $$
declare
  i importacoes;
  l importacao_linhas;
  r record;
  v_norm jsonb;
begin
  select * into i from importacoes where id = p_importacao;
  if i.o_que <> 'FINANCEIRO' then
    perform imp_reconferir_cc(p_importacao, p_numero);
    if i.o_que = 'CASOS' then perform imp_casos_mesmo_numero(p_importacao); end if;
    return;
  end if;
  for l in select * from importacao_linhas where importacao_id = p_importacao and (p_numero is null or numero = p_numero) loop
    r := imp_conferir_lancamento(i, l);
    v_norm := jsonb_set(r.o_norm, '{lancamento,grupo}', to_jsonb(case when l.situacao = 'FORA_REGRA' then 'DESPESAS'
                                                                     when r.o_norm -> 'lancamento' ->> 'situacao' = 'PAGO' then 'RECEBIDOS'
                                                                     else 'EM_ABERTO' end));
    if l.situacao = 'FORA_REGRA' then
      update importacao_linhas set norm = v_norm, problemas = '[]'::jsonb where id = l.id;
    else
      update importacao_linhas set norm = v_norm, problemas = r.o_problemas, situacao = imp_situacao(r.o_problemas, l.decisao, false)
       where id = l.id;
    end if;
  end loop;
end $$;

-- Uma linha da prévia: o caso diz se entra encerrado; o lançamento, o grupo.
alter function imp_linha_json(importacao_linhas) rename to imp_linha_json_cf;
create function imp_linha_json(l importacao_linhas) returns jsonb
language sql stable
set search_path = public
as $$
  select case when l.norm ? 'caso' and jsonb_typeof(r -> 'caso') = 'object'
              then jsonb_set(r, '{caso,encerrado}', to_jsonb(coalesce((l.norm -> 'caso' ->> 'encerrado')::boolean, false)))
              when l.norm ? 'lancamento' and jsonb_typeof(r -> 'lancamento') = 'object'
              then jsonb_set(r, '{lancamento,grupo}', coalesce(l.norm -> 'lancamento' -> 'grupo', '"RECEBIDOS"'::jsonb))
              else r end
    from (select imp_linha_json_cf(l) r) x
$$;

-- O resumo da prévia. Processos: quantos casos entram ativos e quantos encerrados (a primeira
-- linha de cada número decide, como no importar). Financeiro: as despesas e a conta de cada
-- grupo, com todas as linhas que não foram puladas (com erro e com aviso também).
alter function imp_resumo(uuid) rename to imp_resumo_cf;
create function imp_resumo(p_importacao uuid) returns jsonb
language sql stable
set search_path = public
as $$
  with i as (select o_que from importacoes where id = p_importacao),
  cs as (select distinct on (coalesce(norm -> 'caso' ->> 'numero', 'linha' || numero)) coalesce((norm -> 'caso' ->> 'encerrado')::boolean, false) enc
           from importacao_linhas
          where importacao_id = p_importacao and situacao = 'PRONTA' and norm ? 'caso' and decisao is distinct from 'JUNTAR'
          order by coalesce(norm -> 'caso' ->> 'numero', 'linha' || numero), numero),
  g as (select norm -> 'lancamento' ->> 'grupo' grupo, count(*) n, coalesce(sum((norm -> 'lancamento' ->> 'valor')::bigint), 0) valor
          from importacao_linhas where importacao_id = p_importacao and norm ? 'lancamento' and situacao <> 'PULADA'
         group by 1),
  r as (select imp_resumo_cf(p_importacao) x)
  select case
    when (select o_que from i) = 'CASOS' then
      jsonb_set(r.x, '{casos}', (r.x -> 'casos') || jsonb_build_object(
        'encerrados', (select count(*) from cs where enc), 'ativos', (select count(*) from cs where not enc)))
    when (select o_que from i) = 'FINANCEIRO' then
      jsonb_set(r.x, '{financeiroAntigo}', (r.x -> 'financeiroAntigo') || jsonb_build_object(
        'despesas', (select count(*) from importacao_linhas where importacao_id = p_importacao and situacao = 'FORA_REGRA'),
        'grupos', jsonb_build_object(
          'recebidos', jsonb_build_object('linhas', coalesce((select n from g where grupo = 'RECEBIDOS'), 0), 'valor', coalesce((select valor from g where grupo = 'RECEBIDOS'), 0)),
          'emAberto', jsonb_build_object('linhas', coalesce((select n from g where grupo = 'EM_ABERTO'), 0), 'valor', coalesce((select valor from g where grupo = 'EM_ABERTO'), 0)),
          'despesas', jsonb_build_object('linhas', coalesce((select n from g where grupo = 'DESPESAS'), 0), 'valor', coalesce((select valor from g where grupo = 'DESPESAS'), 0)))))
    else r.x end
  from r
$$;

-- A importação diz a escolha dos arquivados; "fora" não conta a despesa, que nunca entra.
create or replace function imp_json(i importacoes, p_pessoa uuid) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', i.id, 'arquivo', i.arquivo_nome, 'oQue', i.o_que, 'origem', i.origem, 'modelo', i.modelo,
    'abasSistema', i.abas_sistema, 'foraTipo', i.fora_tipo, 'situacao', i.estado, 'versao', i.versao,
    'criadoEm', i.criado_em, 'por', pessoa_ref(i.criado_por), 'linhasLidas', i.linhas_lidas,
    'contratos', i.o_que = 'CLIENTES_CONTRATOS', 'comercial', tem_comercial(i.criado_por, i.escritorio_id),
    'arquivados', i.arquivados,
    'abas', case when i.abas is not null then (select jsonb_agg(jsonb_build_object('indice', k - 1, 'nome', a ->> 'nome', 'linhas', jsonb_array_length(a -> 'linhas'),
                                                                                   'colunas', jsonb_array_length(a -> 'colunas')) order by k)
                                                 from jsonb_array_elements(i.abas) with ordinality x(a, k)) end,
    'aba', coalesce(i.aba, 0), 'colunas', case when i.abas is not null then imp_colunas(i) end,
    'ligacao', i.ligacao, 'pares', i.pares,
    'temPrevia', exists (select 1 from importacao_linhas where importacao_id = i.id),
    'importadoEm', i.importado_em, 'desfazerAte', i.desfazer_ate, 'resumo', i.resumo,
    'podeDesfazer', i.estado = 'CONCLUIDA' and i.desfazer_ate > app_now() and (i.criado_por = p_pessoa or e_socio_dono(p_pessoa, i.escritorio_id)),
    'fora', (select count(*) from importacao_linhas where importacao_id = i.id and situacao not in ('IMPORTADA', 'FORA_REGRA') and i.estado <> 'PREVIA'),
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
-- As colunas e a prévia do financeiro: todas as linhas entram na prévia; a despesa do
-- escritório com FORA_REGRA, para ser listada sem nunca entrar. "Lidas" conta todas.

create or replace function portal_importacao_colunas(p_pessoa uuid, p_escritorio uuid, p_importacao uuid, p_versao integer, p_dados jsonb) returns jsonb
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
    select k::integer k, b,
           case when 'lanc_tipo' = any (v_campos)
                then coalesce(v_pares -> 'lancTipo' ->> imp_chave(b ->> 'lanc_tipo'), imp_sugerir_lanc_tipo(b ->> 'lanc_tipo'))
                else 'RECEITA' end tipo
      from jsonb_array_elements(i.abas -> 0 -> 'linhas') with ordinality x(r, k),
           lateral (select coalesce(jsonb_object_agg(c.value, btrim(r ->> c.key::integer)), '{}'::jsonb) b
                      from jsonb_each_text(v_lig) c where btrim(coalesce(r ->> c.key::integer, '')) <> '') bb
     where b - 'lanc_tipo' <> '{}'::jsonb),
  ins as (insert into importacao_linhas (escritorio_id, importacao_id, numero, bruto, situacao)
          select p_escritorio, i.id, k + 1, b, case when tipo = 'DESPESA' then 'FORA_REGRA' else 'PRONTA' end from t returning 1)
  select count(*) filter (where tipo = 'DESPESA'), (select count(*) from ins) into v_desp, v_n from t;
  update importacoes set linhas_lidas = v_n,
         fora_tipo = case when 'lanc_tipo' = any (v_campos) then jsonb_build_object('DESPESAS', v_desp) end
   where id = i.id returning versao into v_versao;
  perform imp_reconferir(i.id);
  return jsonb_build_object('versao', v_versao) || imp_resumo(i.id);
end $$;

-- Corrigir a linha do lançamento: a despesa do escritório não se corrige, porque não entra.
create or replace function portal_importacao_linha(p_pessoa uuid, p_escritorio uuid, p_importacao uuid, p_numero integer, p_dados jsonb) returns jsonb
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
  if l.situacao = 'FORA_REGRA' then perform recusar_motivo('A despesa do escritório fica de fora: o Caixa começa no T3jus', 'LINHA_FORA_REGRA'); end if;
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

-- A prévia do financeiro agrupada (estado previa-financeiro): Recebidos, Em aberto e Despesas,
-- nessa ordem e pela linha, 50 por vez. A busca acha o cliente, a descrição, o caso e, com
-- números, a linha ou o valor em reais ("1.250,00", "R$ 1250" e "1250,5" valem 125.000 centavos).
create function portal_importacao_lancamentos(p_pessoa uuid, p_escritorio uuid, p_importacao uuid, p_grupo text default null,
                                              p_situacao text default null, p_q text default null, p_pular integer default 0) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  i importacoes;
  v_q text := imp_chave(p_q);
  v_dig text := case when btrim(coalesce(p_q, '')) ~ '^[0-9]+$' then btrim(p_q) end;
  v_cent bigint := case when btrim(coalesce(p_q, '')) ~ '^(R\$)?\s*[0-9][0-9.,]*$' then imp_valor(p_q) end;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'clientes.ver');
  i := imp_da_pessoa(p_pessoa, p_escritorio, p_importacao);
  if i.o_que <> 'FINANCEIRO' then perform recusar_campos('Esta importação não tem lançamentos', 'importacao'); end if;
  if p_grupo is not null and p_grupo not in ('RECEBIDOS', 'EM_ABERTO', 'DESPESAS') then perform recusar_campos('Grupo desconhecido', 'grupo'); end if;
  if p_situacao is not null and p_situacao not in ('PRONTA', 'AVISO', 'ERRO', 'PULADA') then perform recusar_campos('Situação desconhecida', 'situacao'); end if;
  if length(coalesce(p_q, '')) > 120 then perform recusar_campos('Busca longa demais', 'q'); end if;
  if coalesce(p_pular, 0) not between 0 and 10000 then perform recusar_campos('Página inválida', 'pular'); end if;
  return jsonb_build_object('importacao', imp_json(i, p_pessoa)) || imp_resumo(i.id) || (
    with f as (
      select l.* from importacao_linhas l
       where l.importacao_id = i.id
         and (p_grupo is null or l.norm -> 'lancamento' ->> 'grupo' = p_grupo)
         and (p_situacao is null or l.situacao = p_situacao)
         and (v_q = '' or imp_chave(l.norm -> 'cliente' ->> 'nome') like '%' || v_q || '%'
              or imp_chave(l.norm -> 'lancamento' ->> 'descricao') like '%' || v_q || '%'
              or imp_chave(l.norm -> 'lancamento' ->> 'caso') like '%' || v_q || '%'
              or (v_dig is not null and l.numero::text = v_dig)
              or (v_cent is not null and (l.norm -> 'lancamento' ->> 'valor')::bigint = v_cent)))
    select jsonb_build_object(
      'linhas', coalesce((select jsonb_agg(imp_linha_json(p.x) order by p.o, (p.x).numero) from (
                  select f.*::importacao_linhas x, case f.norm -> 'lancamento' ->> 'grupo' when 'RECEBIDOS' then 1 when 'EM_ABERTO' then 2 else 3 end o
                    from f order by 2, f.numero offset coalesce(p_pular, 0) limit 50) p), '[]'::jsonb),
      'total', (select count(*) from f)));
end $$;

-- ---------------------------------------------------------------------------------------
-- Importar.

-- Os processos: o arquivado escolhido entra encerrado, na etapa final, sem resultado e sem
-- acerto (encerrado_por = IMPORTADO_ENCERRADO), com a data da importação.
create or replace function imp_importar_casos(i importacoes, p_pessoa uuid) returns jsonb
language plpgsql
set search_path = public
as $$
declare
  l importacao_linhas;
  c jsonb;
  v_caso uuid;
  v_cli uuid;
  v_enc boolean;
  v_numeros jsonb := '{}'::jsonb;
  v_sistema text := case i.origem when 'ASTREA' then 'do Astrea' when 'ADVBOX_PLANILHA' then 'do ADVBOX' else 'da planilha' end;
begin
  for l in select * from importacao_linhas where importacao_id = i.id and situacao = 'PRONTA' order by numero loop
    c := l.norm -> 'caso';
    v_cli := (l.norm -> 'cliente' ->> 'id')::uuid;
    v_enc := coalesce((c ->> 'encerrado')::boolean, false);
    if l.decisao = 'JUNTAR' then
      v_caso := (l.norm -> 'duplicado' ->> 'id')::uuid;
    elsif c ->> 'numero' is not null and v_numeros ? (c ->> 'numero') then
      v_caso := (v_numeros ->> (c ->> 'numero'))::uuid;
    else
      insert into casos (escritorio_id, nome, area, parte_contraria, numero_cnj, tribunal, vara, distribuido_em, valor_causa,
                         etapa_id, responsavel_id, criado_por, importacao_id, situacao, encerrado_em, encerrado_por)
      values (i.escritorio_id, c ->> 'nome', c ->> 'area', c ->> 'parte_contraria', c ->> 'numero', c ->> 'tribunal', c ->> 'vara',
              (c ->> 'distribuido_em')::date, (c ->> 'valor_causa')::bigint, (c ->> 'etapa_id')::uuid, (c ->> 'responsavel')::uuid, p_pessoa, i.id,
              case when v_enc then 'ENCERRADO' else 'ANDAMENTO' end, case when v_enc then app_now() end,
              case when v_enc then 'IMPORTADO_ENCERRADO' end)
      returning id into v_caso;
      insert into caso_etapa_mudancas (escritorio_id, caso_id, para_etapa_id, motivo, por)
      values (i.escritorio_id, v_caso, (c ->> 'etapa_id')::uuid,
              left('Caso importado ' || v_sistema || case when v_enc then ', já encerrado lá' else '' end
                   || coalesce(' (etapa lá: ' || (c ->> 'etapa_antiga') || ')', '') || '.', 1000), p_pessoa);
      perform registrar_historico('juridico.caso_cadastrado', 'casos', v_caso::text,
        jsonb_build_object('etapa', c ->> 'etapa_id', 'responsavel', c ->> 'responsavel', 'clientes', 1, 'importacao', i.id)
        || case when v_enc then jsonb_build_object('encerrado', true) else '{}'::jsonb end);
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
    'encerrados', (select count(*) from casos where escritorio_id = i.escritorio_id and importacao_id = i.id and encerrado_por = 'IMPORTADO_ENCERRADO'),
    'juntadosCasos', (select count(distinct caso_id) from caso_clientes where escritorio_id = i.escritorio_id and importacao_id = i.id),
    'clientes', 0, 'juntados', 0, 'juntadosIds', '[]'::jsonb, 'contratos', 0, 'ativos', 0, 'parcelas', 0, 'valor', 0, 'vencidas', 0,
    'exitos', 0, 'valorPagoAntes', 0,
    'linhas', (select count(*) from importacao_linhas where importacao_id = i.id and situacao = 'IMPORTADA'),
    'fora', (select count(*) from importacao_linhas where importacao_id = i.id and situacao <> 'IMPORTADA'));
end $$;

-- O financeiro: a despesa do escritório nunca entra e não conta como "de fora" (é a regra).
create or replace function imp_importar_financeiro(i importacoes, p_pessoa uuid) returns jsonb
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
    'despesas', (select count(*) from importacao_linhas where importacao_id = i.id and situacao = 'FORA_REGRA'),
    'linhas', (select count(*) from importacao_linhas where importacao_id = i.id and situacao = 'IMPORTADA'),
    'fora', (select count(*) from importacao_linhas where importacao_id = i.id and situacao not in ('IMPORTADA', 'FORA_REGRA')));
end $$;

-- Os clientes do backup do Astrea passam a escolha dos arquivados para a importação dos processos.
alter function portal_importacao_importar(uuid, uuid, uuid, integer) rename to imp_importar_cf;
create function portal_importacao_importar(p_pessoa uuid, p_escritorio uuid, p_importacao uuid, p_versao integer) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r jsonb := imp_importar_cf(p_pessoa, p_escritorio, p_importacao, p_versao);
  i importacoes;
begin
  select * into i from importacoes where id = p_importacao and escritorio_id = p_escritorio;
  if i.o_que = 'CLIENTES' and i.origem = 'ASTREA' then
    update importacoes set arquivados = i.arquivados
     where escritorio_id = p_escritorio and pai_id = i.id and o_que = 'CASOS' and estado = 'PREVIA' and arquivados <> i.arquivados;
  end if;
  return r;
end $$;

-- ---------------------------------------------------------------------------------------
-- Desfazer os processos: o encerrado importado que ninguém mexeu passa a "importação desfeita",
-- com a data em que entrou; o mexido fica como está e aparece na lista.

create or replace function imp_desfazer_plano_casos(i importacoes) returns jsonb
language sql stable
set search_path = public
as $$
  with cs as (select c.*, imp_caso_mexido(c.id) mexido from casos c
               where c.escritorio_id = i.escritorio_id and c.importacao_id = i.id
                 and (c.situacao = 'ANDAMENTO' or c.encerrado_por = 'IMPORTADO_ENCERRADO')),
  lig as (select cc.*, cc.contrato_id is not null mexido from caso_clientes cc where cc.escritorio_id = i.escritorio_id and cc.importacao_id = i.id)
  select jsonb_build_object(
    'clientes', 0, 'juntados', 0, 'contratos', 0, 'parcelas', 0,
    'casos', (select count(*) from cs where not mexido and situacao = 'ANDAMENTO'),
    'encerrados', (select count(*) from cs where not mexido and encerrado_por = 'IMPORTADO_ENCERRADO'),
    'ligacoes', (select count(*) from lig where not mexido),
    'mexidos', (select coalesce(jsonb_agg(x order by x ->> 'nome'), '[]'::jsonb) from (
                  select jsonb_build_object('tipo', 'CASO', 'id', id, 'nome', nome) x from cs where mexido) m))
$$;

alter function portal_importacao_desfazer(uuid, uuid, uuid, text) rename to imp_desfazer_cf;
create function portal_importacao_desfazer(p_pessoa uuid, p_escritorio uuid, p_importacao uuid, p_motivo text) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r jsonb := imp_desfazer_cf(p_pessoa, p_escritorio, p_importacao, p_motivo);
  i importacoes;
  c casos;
begin
  select * into i from importacoes where id = p_importacao and escritorio_id = p_escritorio;
  if i.o_que <> 'CASOS' then return r; end if;
  for c in select * from casos where escritorio_id = p_escritorio and importacao_id = i.id and encerrado_por = 'IMPORTADO_ENCERRADO' loop
    if imp_caso_mexido(c.id) then continue; end if;
    update casos set encerrado_por = 'IMPORTACAO_DESFEITA' where id = c.id;
    perform registrar_historico('juridico.caso_encerrado', 'casos', c.id::text,
      jsonb_build_object('importacaoDesfeita', i.id, 'jaEncerrado', true, 'motivo', left(btrim(coalesce(p_motivo, '')), 300)));
  end loop;
  return r;
end $$;

call fechar_acesso();
