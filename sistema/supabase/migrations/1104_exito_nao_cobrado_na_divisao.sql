-- 1104 · O êxito marcado como não cobrado na divisão do alvará (F3.191; CH-07, FI-05).
-- Plano F3.194/F3.192/F3.191 (v5, Parte C) e desenho D40, aprovados pela Carol em 26/11/2026, às
-- 22h11 (Bahia), em docs/design/aprovadas/portal-exito-nao-cobrado-alvara, com a decisão C1 = (a),
-- "Cobrar com motivo escrito" (27/11/2026).
--
-- O problema: o "Não cobrar este êxito" (0640) não chegava à divisão do alvará. A proposta tirava os
-- honorários do percentual do contrato, e o caixa recebia um êxito que o escritório tinha decidido
-- não cobrar, sem aviso e sem rastro.
--
-- O que muda:
--   - a proposta vem sem a linha de honorários quando o êxito do cliente no caso está como não
--     cobrado, e traz exitoNaoCobrado (o aviso e a escolha da janela). O "A caminho" acompanha;
--   - o registrar pede a escolha: "Deixar sem" (grava financeiro.levantamento_exito_nao_cobrado) ou
--     "Cobrar" (cobrarExitoNaoCobrado), com as salvaguardas no servidor: nunca para Indevido; o
--     combinado escrito com o cliente (3 a 1.000 letras) e a confirmação de que ele concordou; o valor
--     nunca acima do êxito calculado, somando os alvarás anteriores. A parte de honorários sem a
--     escolha recusa (EXITO_NAO_COBRADO), também a mandada à mão e a do Portal antigo;
--   - a cobrança fica na tabela nova exito_cobrancas_alvara (só inserção), com o combinado. Os
--     históricos guardam só ids, valor e motivo; a ficha do repasse e o "De onde veio" leem o
--     combinado da tabela, e nunca o mostram para o cliente excluído;
--   - a corrida: exitoNaoCobradoVisto (o que a tela viu) e a trava escolhida antes de travar
--     (for update com "Cobrar", for share sem), para dois "Cobrar" do mesmo êxito ficarem em fila
--     sem deadlock;
--   - o sino EXITO_COBRADO_NO_ALVARA a quem conferiu, a quem encerrou o caso e ao responsável, uma
--     vez cada; valor, calculado e combinado só a quem tem o Financeiro com financeiro.ver (PT-02);
--   - as telas do caso: cobradoNoAlvara em cliente_fechamento e caso_resumo_acerto, e a ação
--     financeiro.exito_cobrado_no_alvara no "De onde veio".
-- O escritório vem sempre da sessão (p_escritorio). As funções que outras frentes também mudam são
-- achadas pelo conteúdo e trocadas por trecho exato (como a 1100 e a 1102), e a troca para se o
-- trecho não aparecer exatamente uma vez.

-- ---------------------------------------------------------------------------------------
-- 0. Troca de um trecho exato numa função que já existe (cópia da t1102_trocar).
create function t1104_trocar(p_funcao regprocedure, p_de text, p_para text, p_vezes integer default 1) returns void
language plpgsql
as $$
declare
  v_def text := pg_get_functiondef(p_funcao);
  v_n integer := (length(v_def) - length(replace(v_def, p_de, ''))) / length(p_de);
begin
  if v_n <> p_vezes then raise exception 'O trecho aparece % vezes em % (esperado %): %', v_n, p_funcao, p_vezes, left(p_de, 80); end if;
  execute replace(v_def, p_de, p_para);
end $$;

-- A única função do public cujo corpo tem o trecho (senão, para a migration).
create function t1104_achar(p_trecho text) returns regprocedure
language plpgsql
as $$
declare
  v_oids oid[] := array(select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                         where n.nspname = 'public' and strpos(p.prosrc, p_trecho) > 0);
begin
  if cardinality(v_oids) <> 1 then
    raise exception 'O trecho aparece em % funções (esperada 1): %', cardinality(v_oids), left(p_trecho, 80);
  end if;
  return v_oids[1]::regprocedure;
end $$;

-- ---------------------------------------------------------------------------------------
-- 1. A cobrança do êxito não cobrado num alvará (C3.2). É a fonte do limite, do cobradoNoAlvara das
-- telas e do combinado. Só aceita inserção: a anonimização do combinado na exclusão do titular vem
-- com a F3.201, no molde do guardião da 1110. Sem grant: a leitura e a escrita passam pelas funções.
create table exito_cobrancas_alvara (
  id                uuid primary key default gen_random_uuid(),
  escritorio_id     uuid not null references escritorios (id) on delete restrict,
  exito_id          uuid not null references exitos_conferir (id) on delete restrict,
  levantamento_id   uuid not null unique references levantamentos (id) on delete restrict,
  -- Em centavos: o que foi cobrado neste alvará.
  valor             bigint not null check (valor > 0),
  combinado         text not null check (char_length(combinado) between 3 and 1000),
  cliente_concordou boolean not null check (cliente_concordou),
  autor_id          uuid not null references pessoas (id) on delete restrict,
  criado_em         timestamptz not null default app_now()
);
create index exito_cobrancas_alvara_exito on exito_cobrancas_alvara (escritorio_id, exito_id, criado_em desc);
call proteger_tabela_escritorio('exito_cobrancas_alvara');
create trigger exito_cobrancas_alvara_so_acrescenta before update or delete on exito_cobrancas_alvara
  for each row execute function financeiro_so_acrescenta();

insert into inventario_dados (tabela, dado_pessoal, o_que, para_que, base_legal, controlador, prazo, no_fim, situacao, exportar) values
 ('exito_cobrancas_alvara', true,
  'A cobrança no alvará do êxito marcado como não cobrado: o valor, o que foi combinado com o cliente, a confirmação, quem e quando',
  'Prestar contas ao cliente do êxito cobrado no alvará depois de não cobrado na conferência (CH-07, FI-05)',
  'Execução de contrato (LGPD, art. 7º, V)', 'Escritório',
  'Enquanto o escritório for cliente do T3jus e 5 anos depois do fim do contrato',
  'Exportadas ao escritório e apagadas com ele', 'APROVADO', true);

-- ---------------------------------------------------------------------------------------
-- 2. As peças (C3.3). Nenhuma é security definer, e todas filtram o escritório.

-- A única conta do percentual de êxito do contrato do cliente no caso (nota 9): {valor, regra}.
-- null sem contrato ou sem condição de êxito.
create function exito_honorarios_do_contrato(p_escritorio uuid, p_caso uuid, p_cliente uuid, p_valor bigint) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
           'valor', round(coalesce(p_valor, 0) * (h.params ->> 'percentual')::bigint / 10000.0)::bigint,
           'regra', format('%s%% · %s · contrato %s',
                           replace(rtrim(rtrim(to_char((h.params ->> 'percentual')::numeric / 100, 'FM9990.00'), '0'), '.'), '.', ','),
                           h.params ->> 'sobre', ct.numero))
    from caso_clientes cc
    join contratos ct on ct.id = cc.contrato_id and ct.escritorio_id = p_escritorio
    join honorario_condicoes h on h.dono_tipo = 'CONTRATO' and h.dono_id = ct.id and h.tipo = 'EXITO'
   where cc.escritorio_id = p_escritorio and cc.caso_id = p_caso and cc.cliente_id = p_cliente
   limit 1
$$;

-- O que já foi cobrado do êxito em alvarás: a soma das partes de honorários não dispensadas dos
-- levantamentos ligados a ele por exito_cobrancas_alvara. A parte dispensada depois não conta.
create function exito_ja_cobrado(p_escritorio uuid, p_exito uuid) returns bigint
language sql stable
set search_path = public
as $$
  select coalesce(sum(d.valor), 0)::bigint
    from exito_cobrancas_alvara c
    join destinacoes d on d.levantamento_id = c.levantamento_id and d.escritorio_id = p_escritorio
   where c.escritorio_id = p_escritorio and c.exito_id = p_exito
     and d.para = 'HONORARIOS' and d.dispensado_em is null
$$;

-- Quem o sino da cobrança avisa (C3.6), uma vez cada, na ordem do texto: quem conferiu, quem
-- encerrou o caso e o responsável por ele, só com vínculo ativo no escritório (quem saiu não recebe).
create function exito_quem_avisar(p_escritorio uuid, p_exito uuid) returns table (pessoa_id uuid, ordem integer)
language sql stable
set search_path = public
as $$
  select t.p, min(t.o)::integer
    from exitos_conferir x
    cross join lateral (
      select x.conferido_por p, 1 o
      union all select m.por, 2 from caso_etapa_mudancas m where m.id = x.etapa_mudanca_id and m.escritorio_id = p_escritorio
      union all select s.responsavel_id, 3 from casos s where s.id = x.caso_id and s.escritorio_id = p_escritorio) t
   where x.escritorio_id = p_escritorio and x.id = p_exito and t.p is not null
     and exists (select 1 from vinculos v where v.pessoa_id = t.p and v.escritorio_id = p_escritorio
                    and v.funcao in ('SOCIO', 'EQUIPE') and v.revogado_em is null)
   group by t.p
   order by min(t.o), t.p
$$;

-- O êxito do cliente no caso marcado como não cobrado, para a divisão do alvará; null quando não
-- há. O recorte é o de exito_parcelas_baixadas (1100): o contrato ativo ou encerrado, sem a
-- importação desfeita. Com p_valor, traz a linha de honorários do "Cobrar", limitada ao que ainda
-- falta cobrar do calculado. A explicação some para o cliente excluído. Só quem tem a área
-- Financeiro abre a divisão (PT-02).
create function exito_nao_cobrado(p_escritorio uuid, p_caso uuid, p_cliente uuid, p_valor bigint default null) returns jsonb
language sql stable
set search_path = public
as $$
  with x as (
    select x.*, c.numero contrato_numero, k.estado cliente_estado, k.nome cliente_nome,
           -- Na regra: o primeiro nome da pessoa física e o nome inteiro da empresa.
           case when k.tipo = 'PJ' then btrim(k.nome) else split_part(btrim(k.nome), ' ', 1) end cliente_curto
      from exitos_conferir x
      join contratos c on c.id = x.contrato_id and c.escritorio_id = p_escritorio and c.estado in ('ATIVO', 'ENCERRADO')
      join clientes_escritorio k on k.id = x.cliente_id and k.escritorio_id = p_escritorio
      left join importacoes i on i.id = c.importacao_id
     where x.escritorio_id = p_escritorio and x.caso_id = p_caso and x.cliente_id = p_cliente and x.situacao = 'NAO_COBRADO'
       and (i.id is null or i.estado <> 'DESFEITA')
  ), j as (
    select x.*, exito_ja_cobrado(p_escritorio, x.id) ja,
           exito_honorarios_do_contrato(p_escritorio, p_caso, p_cliente, p_valor) hon
      from x
  )
  select jsonb_build_object(
           'exitoId', j.id, 'calculado', j.calculado, 'percentual', j.percentual, 'sobre', j.sobre, 'motivo', j.motivo_nao_cobrar,
           'conferido', jsonb_build_object('por', pessoa_ref(j.conferido_por), 'em', j.conferido_em),
           'contrato', jsonb_build_object('id', j.contrato_id, 'numero', j.contrato_numero),
           'explicacao', case when j.cliente_estado <> 'EXCLUIDO' then j.explicacao end,
           'podeCobrar', j.motivo_nao_cobrar <> 'INDEVIDO' and j.calculado - j.ja > 0,
           'jaCobrado', j.ja, 'limite', greatest(j.calculado - j.ja, 0),
           'cobrancas', coalesce((select jsonb_agg(jsonb_build_object('levantamentoId', l.id, 'tipo', l.tipo, 'entrouEm', l.entrou_em,
                                                                      'valor', (select coalesce(sum(d.valor), 0) from destinacoes d
                                                                                 where d.levantamento_id = l.id and d.escritorio_id = p_escritorio
                                                                                   and d.para = 'HONORARIOS' and d.dispensado_em is null))
                                            order by c.criado_em, c.id)
                                    from exito_cobrancas_alvara c join levantamentos l on l.id = c.levantamento_id and l.escritorio_id = p_escritorio
                                   where c.escritorio_id = p_escritorio and c.exito_id = j.id), '[]'::jsonb),
           'avisados', coalesce((select jsonb_agg(pessoa_ref(q.pessoa_id) order by q.ordem, q.pessoa_id) from exito_quem_avisar(p_escritorio, j.id) q), '[]'::jsonb),
           -- A regra que o servidor grava na parte cobrada (C3.5.5), no limite de 200 letras da parte.
           'regra', left(concat_ws(' · ', j.hon ->> 'regra', 'combinado com ' || j.cliente_curto), 200),
           'honorarios', case when p_valor is not null and j.hon is not null and j.motivo_nao_cobrar <> 'INDEVIDO'
                                   and least((j.hon ->> 'valor')::bigint, j.calculado - j.ja) > 0 then
             jsonb_build_object('para', 'HONORARIOS', 'nome', 'Honorários de êxito',
                                'regra', left(concat_ws(' · ', j.hon ->> 'regra', 'combinado com ' || j.cliente_curto), 200),
                                'valor', least((j.hon ->> 'valor')::bigint, j.calculado - j.ja)) end)
    from j
   limit 1
$$;

-- A última cobrança no alvará do êxito, para as telas do caso: {em, por, levantamentoId, tipo,
-- entrouEm, valor}. O tipo vai a todos, como no desenho aprovado (D40, enc-acerto-larissa) e no
-- sino; o levantamento, o dia em que entrou e o valor só com p_valores (PT-02), como
-- cliente_fechamento e caso_resumo_acerto já fazem (0900). null sem cobrança.
create function exito_cobrado_no_alvara(p_escritorio uuid, p_exito uuid, p_valores boolean) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object('em', c.criado_em, 'por', pessoa_ref(c.autor_id),
                            'levantamentoId', case when p_valores then l.id end, 'tipo', l.tipo,
                            'entrouEm', case when p_valores then l.entrou_em end,
                            'valor', case when p_valores then c.valor end)
    from exito_cobrancas_alvara c
    join levantamentos l on l.id = c.levantamento_id and l.escritorio_id = p_escritorio
   where c.escritorio_id = p_escritorio and c.exito_id = p_exito
   order by c.criado_em desc, c.id desc
   limit 1
$$;

-- A divisão com a regra do servidor nas partes de honorários cobradas (nota 6): a regra que vem da
-- tela não vale.
create function exito_divisao_com_regra(p_dados jsonb, p_regra text) returns jsonb
language sql immutable
set search_path = public
as $$
  select case when jsonb_typeof(p_dados -> 'divisao') <> 'array' then p_dados
    else jsonb_set(p_dados, '{divisao}', (
      select coalesce(jsonb_agg(case when jsonb_typeof(y) = 'object' and y ->> 'para' = 'HONORARIOS'
                                     then y || jsonb_build_object('regra', p_regra) else y end order by o), '[]'::jsonb)
        from jsonb_array_elements(p_dados -> 'divisao') with ordinality t(y, o))) end
$$;

-- A proposta sem quem pede na lista dos avisados (nota 10): o sino não avisa o autor.
create function exito_proposta_para(p_pessoa uuid, p jsonb) returns jsonb
language sql stable
set search_path = public
as $$
  select case when jsonb_typeof(p -> 'exitoNaoCobrado') = 'object' then
    jsonb_set(p, '{exitoNaoCobrado,avisados}', (
      select coalesce(jsonb_agg(a order by o), '[]'::jsonb)
        from jsonb_array_elements(coalesce(p -> 'exitoNaoCobrado' -> 'avisados', '[]'::jsonb)) with ordinality t(a, o)
       where a ->> 'id' is distinct from p_pessoa::text))
  else p end
$$;

-- ---------------------------------------------------------------------------------------
-- 3. A divisão proposta (C3.1): a linha de honorários sai com o êxito não cobrado, a conta do
-- percentual passa a ser a de exito_honorarios_do_contrato, e a proposta traz exitoNaoCobrado.
select t1104_trocar('repasse_proposta_sem_exito(uuid,uuid,uuid,bigint)',
  $q$  v_hon bigint;$q$,
  $q$  v_hon bigint;
  v_hon_j jsonb;$q$);
select t1104_trocar('repasse_proposta_sem_exito(uuid,uuid,uuid,bigint)',
  $q$    if v_exito.id is not null then$q$,
  $q$    -- F3.191: com o êxito marcado como não cobrado, a linha sai; a janela pede a escolha.
    if v_exito.id is not null and exito_nao_cobrado(p_escritorio, p_caso, p_cliente) is null then$q$);
select t1104_trocar('repasse_proposta_sem_exito(uuid,uuid,uuid,bigint)',
  $q$      v_hon := round(p_valor * (v_exito.params ->> 'percentual')::bigint / 10000.0);$q$,
  $q$      -- F3.191: a única conta do percentual, feita uma vez (valor e regra).
      v_hon_j := exito_honorarios_do_contrato(p_escritorio, p_caso, p_cliente, p_valor);
      v_hon := (v_hon_j ->> 'valor')::bigint;$q$);
select t1104_trocar('repasse_proposta_sem_exito(uuid,uuid,uuid,bigint)',
  $q$format('%s%% · %s · contrato %s',
                               replace(rtrim(rtrim(to_char((v_exito.params ->> 'percentual')::numeric / 100, 'FM9990.00'), '0'), '.'), '.', ','),
                               v_exito.params ->> 'sobre', v_contrato.numero)$q$,
  $q$(v_hon_j ->> 'regra')$q$);

select t1104_trocar('repasse_proposta(uuid,uuid,uuid,bigint)',
  $q$'exitoSituacao', exito_situacao(p_escritorio, p_caso, p_cliente))$q$,
  $q$'exitoSituacao', exito_situacao(p_escritorio, p_caso, p_cliente),
    -- F3.191: o êxito marcado como não cobrado, para o aviso e a escolha da janela.
    'exitoNaoCobrado', exito_nao_cobrado(p_escritorio, p_caso, p_cliente, p_valor))$q$);

select t1104_trocar('portal_financeiro_repasse_proposta(uuid,uuid,jsonb)',
  $q$  return repasse_proposta(p_escritorio, (p_dados ->> 'casoId')::uuid, (p_dados ->> 'clienteId')::uuid, (p_dados ->> 'valor')::bigint);$q$,
  $q$  -- F3.191: quem pede a proposta sai da lista dos avisados.
  return exito_proposta_para(p_pessoa, repasse_proposta(p_escritorio, (p_dados ->> 'casoId')::uuid, (p_dados ->> 'clienteId')::uuid, (p_dados ->> 'valor')::bigint));$q$);

-- ---------------------------------------------------------------------------------------
-- 5 (antes da 4, que a chama). O sino da cobrança (C3.6), com função própria: exito_avisar manda o
-- calculado a todos, e este só manda valores a quem tem o Financeiro com financeiro.ver.
do $$
declare
  v_tipos text[];
begin
  select array_agg(distinct x) into v_tipos from (
    select unnest(regexp_matches(pg_get_constraintdef(oid), '''([A-Z0-9_]+)''', 'g')) x
      from pg_constraint where conrelid = 'avisos_sino'::regclass and conname = 'avisos_sino_tipo_check'
    union select 'EXITO_COBRADO_NO_ALVARA') t;
  alter table avisos_sino drop constraint avisos_sino_tipo_check;
  execute format('alter table avisos_sino add constraint avisos_sino_tipo_check check (tipo in (%s))',
                 (select string_agg(quote_literal(x), ', ' order by x) from unnest(v_tipos) x));
end $$;

create function exito_avisar_cobrado(p_x exitos_conferir, p_autor uuid, p_lev levantamentos, p_valor bigint, p_combinado text) returns void
language plpgsql
set search_path = public
as $$
declare
  q record;
  v jsonb;
  v_fin uuid[] := array(select pessoas_com_area(p_x.escritorio_id, 'FINANCEIRO', 'financeiro.ver'));
begin
  -- Para todos: sem valor, sem calculado e sem o combinado.
  v := jsonb_build_object('cliente', (select nome from clientes_escritorio where id = p_x.cliente_id and escritorio_id = p_x.escritorio_id),
                          'caso', (select nome from casos where id = p_x.caso_id and escritorio_id = p_x.escritorio_id),
                          'casoId', p_x.caso_id,
                          'quem', (select nome from pessoas where id = p_autor),
                          'motivo', p_x.motivo_nao_cobrar,
                          'levantamentoId', p_lev.id,
                          'tipo', p_lev.tipo);
  for q in select * from exito_quem_avisar(p_x.escritorio_id, p_x.id) loop
    perform aviso_sino(p_x.escritorio_id, q.pessoa_id, p_autor, 'EXITO_COBRADO_NO_ALVARA', 'levantamentos', p_lev.id,
      v || case when q.pessoa_id = any (v_fin)
                then jsonb_build_object('valor', p_valor, 'calculado', p_x.calculado, 'combinado', left(p_combinado, 300))
                else '{}'::jsonb end);
  end loop;
end $$;

-- ---------------------------------------------------------------------------------------
-- 4. O registrar (o embrulho da 0651 com a 1100 e a 1102, achado pelo conteúdo).

-- 4.1. As variáveis.
select t1104_trocar(t1104_achar('exito_parcelas_abertas(p_escritorio, l.caso_id, l.cliente_id)'),
  $q$  v_pago bigint;$q$,
  $q$  v_pago bigint;
  -- F3.191: o êxito marcado como não cobrado.
  v_nc jsonb;
  v_nc_visto jsonb := p_dados -> 'exitoNaoCobradoVisto';
  v_cobrar jsonb := p_dados -> 'cobrarExitoNaoCobrado';
  v_hon bigint;
  v_cobranca uuid;
  v_nc_x exitos_conferir;
  v_nc_campos text[] := '{}';
  v_combinado text;$q$);

-- 4.2. A conferência de tipo.
select t1104_trocar(t1104_achar('exito_parcelas_abertas(p_escritorio, l.caso_id, l.cliente_id)'),
  $q$  if v_desf is not null and jsonb_typeof(v_desf) not in ('object', 'null') then
    perform recusar_campos('Confira o êxito da divisão.', 'desfazerBaixa');
  end if;$q$,
  $q$  if v_desf is not null and jsonb_typeof(v_desf) not in ('object', 'null') then
    perform recusar_campos('Confira o êxito da divisão.', 'desfazerBaixa');
  end if;
  -- F3.191: o não cobrado que a tela viu é uma lista, e a cobrança é um objeto.
  if v_nc_visto is not null and jsonb_typeof(v_nc_visto) not in ('array', 'null') then
    perform recusar_campos('Confira o êxito da divisão.', 'exitoNaoCobradoVisto');
  end if;
  if v_cobrar is not null and jsonb_typeof(v_cobrar) not in ('object', 'null') then
    perform recusar_campos('Confira o êxito da divisão.', 'cobrarExitoNaoCobrado');
  end if;$q$);

-- 4.3. A trava, com o modo escolhido antes de travar (nota 1 da revisão v4): pegar o share e depois
-- pedir o update na mesma linha dá deadlock entre dois "Cobrar" (40P01). O modo vem do p_dados.
select t1104_trocar(t1104_achar('exito_parcelas_abertas(p_escritorio, l.caso_id, l.cliente_id)'),
  $q$    perform 1 from exitos_conferir x
     where x.escritorio_id = p_escritorio and x.caso_id = v_caso and x.cliente_id = v_cliente
       for share;$q$,
  $q$    -- F3.191: com "Cobrar", for update (dois "Cobrar" do mesmo êxito ficam em fila); sem, for share.
    if jsonb_typeof(v_cobrar) = 'object' then
      perform 1 from exitos_conferir x
       where x.escritorio_id = p_escritorio and x.caso_id = v_caso and x.cliente_id = v_cliente
         for update;
    else
      perform 1 from exitos_conferir x
       where x.escritorio_id = p_escritorio and x.caso_id = v_caso and x.cliente_id = v_cliente
         for share;
    end if;$q$);

-- 4.4. A corrida: o não cobrado que a tela viu precisa ser o que está em vigor agora ({exitoId}
-- com não cobrado, {} sem). Sem o campo (cliente antigo), o passo é pulado; a rede abaixo vale.
select t1104_trocar(t1104_achar('exito_parcelas_abertas(p_escritorio, l.caso_id, l.cliente_id)'),
  $q$    v_baixadas := exito_parcelas_baixadas(p_escritorio, v_caso, v_cliente);$q$,
  $q$    -- F3.191: o êxito marcado como não cobrado mudou enquanto a pessoa dividia.
    v_nc := exito_nao_cobrado(p_escritorio, v_caso, v_cliente);
    if (jsonb_typeof(v_nc_visto) = 'array'
        and (select coalesce(array_agg(distinct lower(t) order by lower(t)), '{}') from jsonb_array_elements_text(v_nc_visto) t)
            is distinct from case when v_nc is null then '{}'::text[] else array[v_nc ->> 'exitoId'] end)
       or (jsonb_typeof(v_cobrar) = 'object' and (v_nc is null or lower(v_cobrar ->> 'exitoId') is distinct from lower(v_nc ->> 'exitoId'))) then
      raise exception 'O êxito deste cliente mudou enquanto você dividia' using errcode = 'TC409',
        detail = (jsonb_build_object('motivo', 'EXITO_MUDOU', 'tipo', case when v_nc is not null then 'NAO_COBRADO' else 'CONFERENCIA' end)
                  || coalesce((select jsonb_build_object('por', pessoa_ref(x.conferido_por), 'em', x.conferido_em)
                                 from exitos_conferir x where x.escritorio_id = p_escritorio and x.caso_id = v_caso and x.cliente_id = v_cliente
                                  and x.conferido_em is not null), '{}'::jsonb))::text;
    end if;
    v_baixadas := exito_parcelas_baixadas(p_escritorio, v_caso, v_cliente);$q$);

-- 4.5. O corpo, com a regra do servidor na parte cobrada e sem os campos novos.
select t1104_trocar(t1104_achar('exito_parcelas_abertas(p_escritorio, l.caso_id, l.cliente_id)'),
  $q$  v := financeiro_levantamento_registrar_sem_exito(p_pessoa, p_escritorio, p_dados - 'exitoBaixadoVisto' - 'desfazerBaixa');$q$,
  $q$  v := financeiro_levantamento_registrar_sem_exito(p_pessoa, p_escritorio,
         case when v_nc is not null and jsonb_typeof(v_cobrar) = 'object' then exito_divisao_com_regra(p_dados, v_nc ->> 'regra') else p_dados end
         - 'exitoBaixadoVisto' - 'desfazerBaixa' - 'exitoNaoCobradoVisto' - 'cobrarExitoNaoCobrado');$q$);

-- 4.6. A rede, as salvaguardas (C3.5) e o registro (C3.6), depois do corpo e da rede do êxito baixado.
select t1104_trocar(t1104_achar('exito_parcelas_abertas(p_escritorio, l.caso_id, l.cliente_id)'),
  $q$  -- Passo 5: o rastro, sem a explicação da baixa (PT-02) e sem nome (o histórico guarda o id).$q$,
  $q$  -- F3.191: o êxito marcado como não cobrado. Lê de novo, com a linha já travada.
  v_nc := exito_nao_cobrado(p_escritorio, l.caso_id, l.cliente_id);
  if v_nc is not null then
    select * into v_nc_x from exitos_conferir where id = (v_nc ->> 'exitoId')::uuid and escritorio_id = p_escritorio;
    v_hon := coalesce((select sum(x.valor) from destinacoes x where x.levantamento_id = l.id and x.para = 'HONORARIOS' and x.valor > 0), 0);
    -- C3.5.1: Indevido não se cobra, nem pela escolha nem pela parte posta à mão (revisão, L1).
    if v_nc_x.motivo_nao_cobrar = 'INDEVIDO' and (v_hon > 0 or jsonb_typeof(v_cobrar) = 'object') then
      raise exception 'O êxito deste cliente foi marcado como não devido' using errcode = 'TC409',
        detail = jsonb_build_object('motivo', 'EXITO_INDEVIDO', 'exito', v_nc_x.id)::text;
    end if;
    if v_hon > 0 and jsonb_typeof(v_cobrar) is distinct from 'object' then
      -- Sem a escolha: também a parte mandada à mão e a do Portal antigo.
      raise exception 'O êxito deste cliente foi marcado como não cobrado' using errcode = 'TC409',
        detail = jsonb_build_object('motivo', 'EXITO_NAO_COBRADO', 'exito', v_nc_x.id)::text;
    elsif v_hon = 0 and jsonb_typeof(v_cobrar) = 'object' then
      -- "Cobrar" sem a parte de honorários (revisão, M3): o corpo não pode virar "Deixar sem" calado.
      raise exception 'Escolheu cobrar, mas a divisão não tem os honorários do êxito' using errcode = 'TC422',
        detail = jsonb_build_object('motivo', 'COBRAR_SEM_HONORARIOS', 'campos', jsonb_build_array('honorarios'))::text;
    elsif v_hon > 0 then
      -- C3.5.2: o combinado escrito e a confirmação estrita de que o cliente concordou.
      v_combinado := btrim(coalesce(case when jsonb_typeof(v_cobrar -> 'explicacao') = 'string' then v_cobrar ->> 'explicacao' end, ''));
      if char_length(v_combinado) not between 3 and 1000 then v_nc_campos := v_nc_campos || 'cobrarExitoNaoCobrado.explicacao'::text; end if;
      if (v_cobrar -> 'clienteConcordou') is distinct from 'true'::jsonb then
        v_nc_campos := v_nc_campos || 'cobrarExitoNaoCobrado.clienteConcordou'::text;
      end if;
      if cardinality(v_nc_campos) > 0 then
        raise exception 'Confira o que foi combinado com o cliente' using errcode = 'TC422',
          detail = jsonb_build_object('motivo', 'COMBINADO_OBRIGATORIO', 'campos', to_jsonb(v_nc_campos))::text;
      end if;
      -- C3.5.3: nunca acima do êxito calculado, somando os alvarás anteriores.
      if v_hon + exito_ja_cobrado(p_escritorio, v_nc_x.id) > v_nc_x.calculado then
        raise exception 'Os honorários passam do êxito calculado na conferência' using errcode = 'TC422',
          detail = jsonb_build_object('motivo', 'EXITO_ACIMA_DO_CALCULADO', 'campos', jsonb_build_array('honorarios'),
                                      'limite', greatest(v_nc_x.calculado - exito_ja_cobrado(p_escritorio, v_nc_x.id), 0))::text;
      end if;
      insert into exito_cobrancas_alvara (escritorio_id, exito_id, levantamento_id, valor, combinado, cliente_concordou, autor_id)
      values (p_escritorio, v_nc_x.id, l.id, v_hon, v_combinado, true, p_pessoa)
      returning id into v_cobranca;
      -- O rastro só com ids, valor e motivo: o combinado mora na tabela (nota 2).
      perform registrar_historico('financeiro.levantamento_exito_cobrado', 'levantamentos', l.id::text,
        jsonb_build_object('tipo', l.tipo, 'cobranca', v_cobranca, 'exito', v_nc_x.id, 'conferidoPor', v_nc_x.conferido_por,
                           'conferidoEm', v_nc_x.conferido_em, 'contrato', v_nc -> 'contrato' ->> 'numero',
                           'motivo', v_nc_x.motivo_nao_cobrar, 'calculado', v_nc_x.calculado, 'honorarios', v_hon));
      perform registrar_historico('financeiro.exito_cobrado_no_alvara', 'casos', l.caso_id::text,
        jsonb_build_object('cobranca', v_cobranca, 'exito', v_nc_x.id, 'cliente', l.cliente_id, 'levantamento', l.id, 'tipo', l.tipo,
                           'conferidoPor', v_nc_x.conferido_por, 'conferidoEm', v_nc_x.conferido_em,
                           'contrato', v_nc -> 'contrato' ->> 'numero', 'contratoId', v_nc_x.contrato_id,
                           'motivo', v_nc_x.motivo_nao_cobrar, 'calculado', v_nc_x.calculado, 'honorarios', v_hon));
      perform exito_avisar_cobrado(v_nc_x, p_pessoa, l, v_hon, v_combinado);
    else
      -- "Deixar sem": sem nenhuma explicação (PT-02).
      perform registrar_historico('financeiro.levantamento_exito_nao_cobrado', 'levantamentos', l.id::text,
        jsonb_build_object('tipo', l.tipo, 'exito', v_nc_x.id, 'motivo', v_nc_x.motivo_nao_cobrar, 'calculado', v_nc_x.calculado,
                           'conferidoPor', v_nc_x.conferido_por, 'conferidoEm', v_nc_x.conferido_em,
                           'contrato', v_nc -> 'contrato' ->> 'numero'));
    end if;
  end if;

  -- Passo 5: o rastro, sem a explicação da baixa (PT-02) e sem nome (o histórico guarda o id).$q$);

-- A resposta diz se cobrou, para a confirmação da tela.
select t1104_trocar(t1104_achar('exito_parcelas_abertas(p_escritorio, l.caso_id, l.cliente_id)'),
  $q$  return v || jsonb_build_object('exitoBaixado', v_baixas, 'baixaDesfeita', v_desfeita is not null);$q$,
  $q$  return v || jsonb_build_object('exitoBaixado', v_baixas, 'baixaDesfeita', v_desfeita is not null,
                                  -- F3.191: o êxito não cobrado foi cobrado neste alvará.
                                  'exitoCobrado', v_cobranca is not null);$q$);

-- ---------------------------------------------------------------------------------------
-- 6. As telas do caso (C3.7) e a ficha do repasse.

-- O passo do fechamento na ficha do cliente e o acerto na ficha do caso: o valor só para quem tem o
-- Financeiro, como o valor do êxito já faz. naoCobrado continua true.
select t1104_trocar(t1104_achar($q$'naoCobrado', v_x.situacao = 'NAO_COBRADO',$q$),
  $q$'naoCobrado', v_x.situacao = 'NAO_COBRADO',$q$,
  $q$'naoCobrado', v_x.situacao = 'NAO_COBRADO',
      -- F3.191: cobrado num alvará depois de não cobrado na conferência.
      'cobradoNoAlvara', case when v_x.situacao = 'NAO_COBRADO' then exito_cobrado_no_alvara(p_escritorio, v_x.id, p_valores) end,$q$);
select t1104_trocar(t1104_achar($q$'naoCobrado', x.situacao = 'NAO_COBRADO',$q$),
  $q$'naoCobrado', x.situacao = 'NAO_COBRADO',$q$,
  $q$'naoCobrado', x.situacao = 'NAO_COBRADO',
                 'cobradoNoAlvara', case when x.situacao = 'NAO_COBRADO' then exito_cobrado_no_alvara(p_escritorio, x.id, v_fin) end,$q$);

-- "De onde veio", na ficha do contrato em Financeiro › A receber (só quem tem o Financeiro).
select t1104_trocar(t1104_achar($q$'financeiro.exito_nao_cobrado', 'financeiro.caso_encerrado')$q$),
  $q$'financeiro.exito_nao_cobrado', 'financeiro.caso_encerrado')$q$,
  $q$'financeiro.exito_nao_cobrado', 'financeiro.caso_encerrado', 'financeiro.exito_cobrado_no_alvara')$q$);
select t1104_trocar(t1104_achar($q$'custasAReembolsar', u.dados -> 'custasAReembolsar',$q$),
  $q$             'valor', u.dados -> 'valor',$q$,
  $q$             'valor', coalesce(u.dados -> 'valor', case when u.acao = 'financeiro.exito_cobrado_no_alvara'
                                                    then coalesce((select to_jsonb(c.valor) from exito_cobrancas_alvara c
                                                                    where c.escritorio_id = p_escritorio and c.id::text = u.dados ->> 'cobranca'),
                                                                  u.dados -> 'honorarios') end),$q$);
select t1104_trocar(t1104_achar($q$'custasAReembolsar', u.dados -> 'custasAReembolsar',$q$),
  $q$             'custasAReembolsar', u.dados -> 'custasAReembolsar',$q$,
  $q$             'custasAReembolsar', u.dados -> 'custasAReembolsar',
             -- F3.191: a cobrança no alvará, com o combinado da tabela (nunca para o cliente excluído).
             'levantamento', case when u.acao = 'financeiro.exito_cobrado_no_alvara' then u.dados ->> 'levantamento' end,
             'tipo', case when u.acao = 'financeiro.exito_cobrado_no_alvara' then u.dados ->> 'tipo' end,
             'entrouEm', case when u.acao = 'financeiro.exito_cobrado_no_alvara' then (
                           select l.entrou_em from levantamentos l
                            where l.escritorio_id = p_escritorio and l.id::text = u.dados ->> 'levantamento') end,
             'doContrato', case when u.acao = 'financeiro.exito_cobrado_no_alvara' then u.dados ->> 'contratoId' = p_contrato::text end,
             'combinado', case when u.acao = 'financeiro.exito_cobrado_no_alvara' then (
                            select c.combinado from exito_cobrancas_alvara c
                              join exitos_conferir x on x.id = c.exito_id and x.escritorio_id = p_escritorio
                              join clientes_escritorio k on k.id = x.cliente_id and k.escritorio_id = p_escritorio
                             where c.escritorio_id = p_escritorio and c.id::text = u.dados ->> 'cobranca' and k.estado <> 'EXCLUIDO') end,$q$);

-- A ficha do repasse: quem conferiu (o histórico guarda só o id) e o combinado da cobrança, que não
-- mora no histórico, com null para o cliente excluído.
select t1104_trocar('levantamento_historico_dados(text,jsonb)',
  $q$  else p_dados end$q$,
  $q$  -- F3.191: o êxito não cobrado ao registrar.
  when p_acao in ('financeiro.levantamento_exito_cobrado', 'financeiro.levantamento_exito_nao_cobrado') then
    p_dados || jsonb_build_object('conferidoPor', pessoa_ref(nullif(p_dados ->> 'conferidoPor', '')::uuid))
            || case when p_acao = 'financeiro.levantamento_exito_cobrado' then jsonb_build_object('combinado', (
                 select c.combinado from exito_cobrancas_alvara c
                   join exitos_conferir x on x.id = c.exito_id and x.escritorio_id = c.escritorio_id
                   join clientes_escritorio k on k.id = x.cliente_id and k.escritorio_id = c.escritorio_id
                  where c.id::text = p_dados ->> 'cobranca' and c.escritorio_id = contexto_escritorio() and k.estado <> 'EXCLUIDO'))
               else '{}'::jsonb end
  else p_dados end$q$);

drop function t1104_trocar(regprocedure, text, text, integer);
drop function t1104_achar(text);

call fechar_acesso();
