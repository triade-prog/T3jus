-- O carnê com o valor de cada parcela (F1.28; CO-10, CO-06). Plano revisado em project-files
-- t3jus/co-10-carne/plano-v2.md, com as respostas da Carol de 27/11/2026 (as 5 recomendações).
-- Desenho das telas: D41 (ainda a aprovar); até lá, as telas de hoje continuam funcionando.
--
--  * O desconto de entrada vale por competência, nunca pelo carnê: cada parcela nasce com o valor
--    da fatura do mês dela (mensalidade + pessoas a mais − desconto até a competência dita). No
--    plano de R$ 499,00 com 20% até a 3ª fatura: 3 parcelas de R$ 399,20 e 9 de R$ 499,00.
--    Antes (0690), o valor da 1ª competência se repetia nas 12 parcelas.
--  * Cada parcela guarda as pessoas e os itens do mês (do dia do carnê). A fatura da parcela usa
--    esses itens: mensalidade, pessoas a mais e desconto separados, com o motivo do desconto.
--  * A pessoa a mais, no carnê, continua contada no dia em que o carnê nasce (pergunta 2, opção A).
--  * Mudar ou retirar o desconto com o carnê em uso troca o carnê, mas só com a confirmação da tela
--    ("trocarCarne": true). Sem ela, a recusa CARNE_TROCA_CONFIRMAR traz a prévia e nada é gravado.
--    Só o desconto decide: o preço de hoje da pessoa a mais não acende a troca (pergunta 1).
--  * O carnê novo de uma troca tem 12 parcelas (ou as da assinatura), começa no primeiro mês
--    cancelado e pula os meses que já têm fatura, como o pago adiantado: nenhum mês fica sem
--    parcela nem em dois carnês (pergunta 5; corrige a 0690, que começava depois da última fatura).
--  * O desconto lançado antes da cobrança começar conta das primeiras faturas de verdade: ao passar
--    para Ativo, o "até" anda junto com a 1ª competência (desconto_meses; pergunta 4).
--  * No carnê, o desconto vai até 99% (o meio de pagamento não emite parcela de R$ 0,00), e o "até"
--    precisa alcançar a próxima fatura.
--  * O motivo do desconto é gravado no item da fatura, na emissão: a fatura antiga não o perde
--    quando o desconto muda (cobranca_documento_json lia o da assinatura de hoje).
--  * Leitura com trava (for update) da assinatura nas funções que mudam o carnê: duas trocas ao
--    mesmo tempo dão um carnê novo e um conflito de versão.
--
-- valor_parcela_centavos continua no carnê e no JSON, como o valor da 1ª parcela, para as telas de
-- hoje; o JSON ganha faixas, totalCentavos e, em cada parcela, descontoCentavos e pessoas.
--
-- Aplicar fora de ordem (README, cobrança): antes, conferir que nenhuma migration pendente entre a
-- 1137 e a 1169 recria cobranca_*, carne_json, carnes_da_assinatura, previa_no_plano,
-- assinatura_dados, console_assinatura_salvar*, console_carne_novo nem console_assinatura_mudar_plano.
-- As colunas novas são not null: com carnê de verdade no banco, a migration para sozinha.
-- Testes: pgTAP 180, 181 e 182 e o 092 (o carnê trocado com parcela adiantada).

-- ---------------------------------------------------------------------------------------
-- 1. Colunas

alter table assinatura_carne_parcelas
  add column pessoas integer check (pessoas >= 0),
  add column itens jsonb check (jsonb_typeof(itens) = 'array');
alter table assinatura_carne_parcelas alter column pessoas set not null, alter column itens set not null;
comment on column assinatura_carne_parcelas.pessoas is 'As pessoas ativas no dia em que o carnê nasceu (CO-10, pergunta 2)';
comment on column assinatura_carne_parcelas.itens is 'Os itens do mês, do dia do carnê: mensalidade, pessoas a mais e desconto (com o motivo); a soma é valor_centavos';

alter table fatura_itens
  add column motivo text check (length(btrim(motivo)) between 1 and 300),
  add constraint fatura_itens_motivo_so_desconto check (motivo is null or tipo = 'DESCONTO');
comment on column fatura_itens.motivo is 'O motivo do desconto, como estava na emissão (CO-10)';

alter table assinaturas
  add column desconto_meses integer check (desconto_meses between 1 and 24),
  add constraint assinaturas_desconto_meses check (desconto_meses is null or desconto_pct is not null);
comment on column assinaturas.desconto_meses is 'Desconto lançado antes da cobrança: quantos meses ele dura, contados da 1ª fatura (CO-10, pergunta 4)';

comment on column assinatura_carnes.valor_parcela_centavos is 'Valor da 1ª parcela. As parcelas podem ter valores diferentes (CO-10): use carne_faixas.';

update inventario_dados set o_que = 'Parcelas de cada carnê da assinatura: competência, vencimento, valor, pessoas e itens do mês e situação'
 where tabela = 'assinatura_carne_parcelas';
update inventario_dados set o_que = 'Itens de cada fatura: mensalidade, pessoas a mais, desconto e o motivo do desconto'
 where tabela = 'fatura_itens';

-- A parcela não muda: agora também as pessoas e os itens.
create or replace function parcelas_so_muda_situacao() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    if current_setting('t3jus.fim_da_guarda', true) = 'on' then return old; end if;
    raise exception 'Parcela do carnê não se apaga: é cancelada com motivo' using errcode = 'TC010';
  end if;
  if (new.carne_id, new.numero, new.competencia, new.vencimento, new.valor_centavos, new.pessoas, new.itens)
     is distinct from (old.carne_id, old.numero, old.competencia, old.vencimento, old.valor_centavos, old.pessoas, old.itens)
     or (old.fatura_id is not null and new.fatura_id is distinct from old.fatura_id) then
    raise exception 'A parcela do carnê não muda' using errcode = 'TC422', detail = '{"motivo":"PARCELA_NAO_MUDA"}';
  end if;
  if old.situacao <> new.situacao and not (old.situacao = 'A_VENCER' and new.situacao in ('PAGA', 'CANCELADA')) then
    raise exception 'Transição proibida na parcela: % → %', old.situacao, new.situacao using errcode = 'TC023';
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------------------------
-- 2. A conta do mês: o item de desconto passa a se chamar "Desconto de entrada" (pergunta 3).

create or replace function cobranca_itens(p_preco integer, p_incluidas integer, p_desconto_pct integer, p_desconto_ate date,
                                          p_competencia date, p_pessoas integer, p_plano text) returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  v_mais integer := greatest(p_pessoas - p_incluidas, 0);
  v_unit integer := pessoa_a_mais_centavos();
  v_desc integer := 0;
  v_itens jsonb;
begin
  v_itens := jsonb_build_array(jsonb_build_object('tipo', 'MENSALIDADE', 'descricao', 'Plano ' || p_plano || ' · ' || mes_por_extenso(p_competencia),
                                                  'quantidade', 1, 'valorUnitarioCentavos', p_preco, 'valorCentavos', p_preco));
  if v_mais > 0 then
    v_itens := v_itens || jsonb_build_object('tipo', 'PESSOA_A_MAIS',
      'descricao', case when v_mais = 1 then '1 pessoa a mais' else v_mais || ' pessoas a mais' end
                   || ' (' || p_pessoas || ' ativas, ' || p_incluidas || ' incluídas)',
      'quantidade', v_mais, 'valorUnitarioCentavos', v_unit, 'valorCentavos', v_mais * v_unit);
  end if;
  if p_desconto_pct is not null and p_competencia <= p_desconto_ate then
    v_desc := round(p_preco * p_desconto_pct / 100.0)::int;
    if v_desc > 0 then
      v_itens := v_itens || jsonb_build_object('tipo', 'DESCONTO', 'descricao', 'Desconto de entrada (' || p_desconto_pct || '% da mensalidade)',
                                               'quantidade', 1, 'valorUnitarioCentavos', -v_desc, 'valorCentavos', -v_desc);
    end if;
  end if;
  return jsonb_build_object('itens', v_itens, 'pessoas', p_pessoas,
                            'totalCentavos', greatest(p_preco + v_mais * v_unit - v_desc, 0));
end $$;

-- O desconto gravado nos itens de uma parcela (em centavos, positivo; 0 sem desconto).
create function carne_desconto_de(p_itens jsonb) returns integer
language sql immutable
as $$
  select coalesce(-sum((i ->> 'valorCentavos')::int), 0)::int
    from jsonb_array_elements(coalesce(p_itens, '[]'::jsonb)) i where i ->> 'tipo' = 'DESCONTO'
$$;

-- As parcelas seguidas de mesmo valor, juntas: [{de, ate, quantidade, valorCentavos}] e o total.
-- Recebe as parcelas em ordem ([{competencia, valorCentavos}]).
create function carne_faixas_de(p_parcelas jsonb) returns jsonb
language sql immutable
as $$
  with p as (select (e ->> 'competencia')::date as comp, (e ->> 'valorCentavos')::int as v, o
               from jsonb_array_elements(coalesce(p_parcelas, '[]'::jsonb)) with ordinality t(e, o)),
       g as (select comp, v, o, o - row_number() over (partition by v order by o) as grupo from p),
       f as (select min(o) as ordem, min(comp) as de, max(comp) as ate, count(*)::int as quantidade, v from g group by v, grupo)
  select jsonb_build_object(
    'faixas', coalesce((select jsonb_agg(jsonb_build_object('de', de, 'ate', ate, 'quantidade', quantidade, 'valorCentavos', v) order by ordem) from f), '[]'::jsonb),
    'totalCentavos', coalesce((select sum(v) from p), 0)::int)
$$;

-- As faixas do carnê como ele nasceu (todas as parcelas, também as canceladas depois).
create function carne_faixas(c assinatura_carnes) returns jsonb
language sql stable
set search_path = public
as $$
  select carne_faixas_de(coalesce((select jsonb_agg(jsonb_build_object('competencia', p.competencia, 'valorCentavos', p.valor_centavos) order by p.numero)
                                     from assinatura_carne_parcelas p where p.carne_id = c.id), '[]'::jsonb))
$$;

-- As N competências de um carnê a partir do início, pulando o mês que já tem fatura (qualquer
-- situação: a cancelada não é emitida de novo) e, sem p_so_faturas, o que já tem parcela válida
-- num carnê em uso. Nenhum mês fica sem parcela nem em dois carnês (pergunta 5).
create function carne_competencias(a assinaturas, p_inicio date, p_n integer, p_so_faturas boolean default false) returns date[]
language sql stable
set search_path = public
as $$
  select coalesce(array_agg(comp order by comp), '{}') from (
    select g::date as comp
      from generate_series(p_inicio, p_inicio + make_interval(months => p_n + 36), interval '1 month') g
     where not exists (select 1 from faturas f where f.assinatura_id = a.id and f.competencia = g::date)
       and (p_so_faturas or not exists (
             select 1 from assinatura_carne_parcelas p join assinatura_carnes c on c.id = p.carne_id
              where c.assinatura_id = a.id and c.substituido_em is null and p.competencia = g::date and p.situacao <> 'CANCELADA'))
     order by g limit p_n) x
$$;

-- As parcelas de um carnê, sem gravar: a mesma conta da emissão em cada competência, com as pessoas
-- do dia. Usada para gerar, nas prévias e na troca.
create function carne_parcelas_calc(a assinaturas, p_preco integer, p_incluidas integer, p_plano text, p_pessoas integer,
                                    p_competencias date[]) returns jsonb
language plpgsql stable
set search_path = public
as $$
declare
  v_comp date;
  v_conta jsonb;
  v_itens jsonb;
  v_mais integer := greatest(p_pessoas - p_incluidas, 0);
  v_lista jsonb := '[]'::jsonb;
begin
  foreach v_comp in array p_competencias loop
    v_conta := cobranca_itens(p_preco, p_incluidas, a.desconto_pct, a.desconto_ate, v_comp, p_pessoas, p_plano);
    select jsonb_agg(case
             when i ->> 'tipo' = 'DESCONTO' then i || jsonb_build_object('motivo', a.desconto_motivo)
             when i ->> 'tipo' = 'PESSOA_A_MAIS' then i || jsonb_build_object('descricao',
               case when v_mais = 1 then '1 pessoa a mais' else v_mais || ' pessoas a mais' end
               || ' (' || p_pessoas || ' ativas em ' || to_char(hoje_brasilia(), 'DD/MM/YYYY') || ', no dia do carnê; '
               || p_incluidas || ' incluídas)')
             else i end order by o)
      into v_itens from jsonb_array_elements(v_conta -> 'itens') with ordinality t(i, o);
    v_lista := v_lista || jsonb_build_object('competencia', v_comp, 'valorCentavos', (v_conta ->> 'totalCentavos')::int,
                                             'descontoCentavos', carne_desconto_de(v_itens), 'itens', v_itens);
  end loop;
  return v_lista;
end $$;

-- A prévia de um carnê que ainda não existe: {primeiraCompetencia, ultimaCompetencia, parcelas,
-- faixas, totalCentavos, pessoas}. As pessoas e o plano vêm de quem chama.
create function carne_previa(a assinaturas, p_preco integer, p_incluidas integer, p_plano text, p_pessoas integer,
                             p_inicio date, p_n integer, p_so_faturas boolean default true) returns jsonb
language plpgsql stable
set search_path = public
as $$
declare
  v_comps date[] := carne_competencias(a, p_inicio, coalesce(p_n, configuracao_int('cobranca_parcelas_por_carne')), p_so_faturas);
  v_lista jsonb := carne_parcelas_calc(a, p_preco, p_incluidas, p_plano, p_pessoas, v_comps);
begin
  return jsonb_build_object('primeiraCompetencia', v_comps[1], 'ultimaCompetencia', v_comps[cardinality(v_comps)],
                            'parcelas', cardinality(v_comps), 'pessoas', p_pessoas)
         || carne_faixas_de(v_lista);
end $$;

-- Onde começa o carnê novo de uma troca: no primeiro mês das parcelas que seriam canceladas (sem
-- fatura e a vencer, nos carnês em uso); sem elas, na próxima competência sem fatura.
create function carne_inicio_troca(a assinaturas) returns date
language sql stable
set search_path = public
as $$
  select coalesce((select min(p.competencia) from assinatura_carne_parcelas p join assinatura_carnes c on c.id = p.carne_id
                    where c.assinatura_id = a.id and c.substituido_em is null and p.situacao = 'A_VENCER' and p.fatura_id is null),
                  cobranca_proxima_sem_fatura(a))
$$;

-- Gera um carnê da assinatura a partir da competência dita: N parcelas, cada uma com o valor do mês
-- dela (CO-10). O nome é o ano, ou os dois anos ("2026/2027"), da primeira e da última parcela.
create or replace function cobranca_gerar_carne(a assinaturas, p_competencia date, p_sistema boolean) returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_id uuid;
  v_n integer := coalesce(a.parcelas_por_carne, configuracao_int('cobranca_parcelas_por_carne'));
  v_comps date[];
  v_ultima date;
  v_pessoas integer := pessoas_ativas_portal(a.escritorio_id);
  v_lista jsonb;
  v_faixas jsonb;
  v_p jsonb;
  v_i integer := 0;
begin
  perform 1 from assinaturas where id = a.id for update;
  v_comps := carne_competencias(a, p_competencia, v_n);
  v_ultima := v_comps[cardinality(v_comps)];
  v_lista := carne_parcelas_calc(a, a.preco_centavos, a.pessoas_incluidas, (select nome from planos where id = a.plano_id), v_pessoas, v_comps);
  v_faixas := carne_faixas_de(v_lista);
  insert into assinatura_carnes (escritorio_id, assinatura_id, numero, primeira_competencia, parcelas, valor_parcela_centavos,
                                 dia_vencimento, gerado_por)
  values (a.escritorio_id, a.id,
          extract(year from v_comps[1])::int
            || case when extract(year from v_ultima) <> extract(year from v_comps[1]) then '/' || extract(year from v_ultima)::int else '' end,
          v_comps[1], v_n, (v_lista -> 0 ->> 'valorCentavos')::int, a.dia_vencimento, case when p_sistema then null else contexto_pessoa() end)
  returning id into v_id;
  for v_p in select * from jsonb_array_elements(v_lista) loop
    v_i := v_i + 1;
    -- A soma dos itens é o valor da parcela, conferida aqui (como na emissão).
    if (select sum((i ->> 'valorCentavos')::int) from jsonb_array_elements(v_p -> 'itens') i) <> (v_p ->> 'valorCentavos')::int
       and (v_p ->> 'valorCentavos')::int > 0 then
      raise exception 'A soma dos itens não fecha com o valor da parcela' using errcode = 'TC422';
    end if;
    insert into assinatura_carne_parcelas (escritorio_id, carne_id, numero, competencia, vencimento, valor_centavos, pessoas, itens)
    values (a.escritorio_id, v_id, v_i, (v_p ->> 'competencia')::date,
            vencimento_de((v_p ->> 'competencia')::date, a.dia_vencimento), (v_p ->> 'valorCentavos')::int, v_pessoas, v_p -> 'itens');
  end loop;
  perform cobranca_evento(a.id, null, 'carne.gerado', jsonb_build_object('carneId', v_id,
    'numero', (select numero from assinatura_carnes where id = v_id), 'parcelas', v_n,
    'valorParcelaCentavos', (v_lista -> 0 ->> 'valorCentavos')::int, 'faixas', v_faixas -> 'faixas',
    'totalCentavos', (v_faixas ->> 'totalCentavos')::int, 'pessoas', v_pessoas,
    'de', v_comps[1], 'ate', v_ultima), p_sistema);
  return v_id;
end $$;

-- Troca as parcelas ainda sem fatura e não pagas por um carnê novo (desenho, estado 40). Numa
-- transação só: cancela com motivo e autor, sem apagar, marca os carnês de antes como substituídos
-- e gera o novo a partir do primeiro mês cancelado, pulando os meses que já têm fatura (CO-10,
-- pergunta 5). A parcela paga não muda. Sem carnê novo quando a forma deixa de ser Carnê.
create or replace function cobranca_trocar_carne(a assinaturas, p_motivo text, p_gerar boolean, p_sistema boolean default false) returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_parcelas uuid[];
  v_carnes uuid[];
  v_novo uuid;
  v_inicio date;
  v_motivo text := left(p_motivo, 300);
begin
  perform 1 from assinaturas where id = a.id for update;
  select coalesce(array_agg(p.id order by p.competencia), '{}'), coalesce(array_agg(distinct p.carne_id), '{}'), min(p.competencia)
    into v_parcelas, v_carnes, v_inicio
    from assinatura_carne_parcelas p join assinatura_carnes c on c.id = p.carne_id
   where c.assinatura_id = a.id and c.substituido_em is null and p.situacao = 'A_VENCER' and p.fatura_id is null;
  if cardinality(v_parcelas) = 0 and p_gerar and exists (select 1 from assinatura_carnes c where c.assinatura_id = a.id and c.substituido_em is null) then
    raise exception 'Não há parcela a trocar' using errcode = 'TC422', detail = '{"motivo":"CARNE_SEM_PARCELA_A_TROCAR"}';
  end if;
  update assinatura_carne_parcelas
     set situacao = 'CANCELADA', cancelada_em = app_now(), cancelada_motivo = v_motivo,
         cancelada_por = case when p_sistema then null else contexto_pessoa() end
   where id = any (v_parcelas);
  if p_gerar and a.primeira_competencia is not null then
    v_inicio := coalesce(v_inicio, cobranca_proxima_sem_fatura(a));
    v_novo := cobranca_gerar_carne(a, v_inicio, p_sistema);
  end if;
  update assinatura_carnes
     set substituido_em = app_now(), substituido_motivo = v_motivo, substituido_por_carne = v_novo,
         substituido_autor = case when p_sistema then null else contexto_pessoa() end
   where id = any (v_carnes);
  if cardinality(v_parcelas) > 0 then
    perform cobranca_evento(a.id, null, 'carne.parcelas_canceladas', jsonb_build_object(
      'parcelas', cardinality(v_parcelas), 'motivo', v_motivo, 'novoCarneId', v_novo), p_sistema);
  end if;
  return jsonb_build_object('canceladas', cardinality(v_parcelas), 'carneNovoId', v_novo);
end $$;

-- Emite a fatura de uma competência. Com carnê, a fatura é a parcela daquele mês, com os itens e as
-- pessoas da parcela (mensalidade, pessoas a mais e desconto separados) e os mesmos códigos de
-- pagamento; sem carnê que cubra o mês, nasce um carnê novo a partir dele. O motivo do desconto
-- fica no item, como estava na emissão.
create or replace function cobranca_emitir(a assinaturas, p_competencia date, p_avisar boolean default true,
                                           p_sistema boolean default false) returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_id uuid;
  v_conta jsonb;
  v_parcela assinatura_carne_parcelas;
  v_carne assinatura_carnes;
  v_venc date := vencimento_de(p_competencia, a.dia_vencimento);
  v_plano text := (select nome from planos where id = a.plano_id);
  v_item jsonb;
  v_ordem integer := 0;
begin
  if a.forma = 'CARNE' then
    select p.* into v_parcela from assinatura_carne_parcelas p join assinatura_carnes c on c.id = p.carne_id
     where c.assinatura_id = a.id and c.substituido_em is null and p.competencia = p_competencia
       and p.situacao = 'A_VENCER' and p.fatura_id is null
     order by c.gerado_em desc limit 1;
    if v_parcela.id is null then
      perform cobranca_gerar_carne(a, p_competencia, p_sistema);
      select p.* into v_parcela from assinatura_carne_parcelas p join assinatura_carnes c on c.id = p.carne_id
       where c.assinatura_id = a.id and c.substituido_em is null and p.competencia = p_competencia
         and p.situacao = 'A_VENCER' and p.fatura_id is null
       order by c.gerado_em desc limit 1;
    end if;
    select * into v_carne from assinatura_carnes where id = v_parcela.carne_id;
    v_venc := v_parcela.vencimento;
    v_conta := jsonb_build_object('pessoas', v_parcela.pessoas, 'totalCentavos', v_parcela.valor_centavos,
      'itens', (select jsonb_agg(case when o = 1 then i || jsonb_build_object(
                    'descricao', 'Parcela ' || v_parcela.numero || ' de ' || v_carne.parcelas || ' do carnê ' || v_carne.numero
                                 || ' · plano ' || v_plano || ' · ' || mes_por_extenso(p_competencia)) else i end order by o)
                  from jsonb_array_elements(v_parcela.itens) with ordinality t(i, o)));
  else
    v_conta := cobranca_itens_da(a, p_competencia);
    v_conta := jsonb_set(v_conta, '{itens}', (select jsonb_agg(case when i ->> 'tipo' = 'DESCONTO'
                                                                    then i || jsonb_build_object('motivo', a.desconto_motivo) else i end order by o)
                                                from jsonb_array_elements(v_conta -> 'itens') with ordinality t(i, o)));
  end if;

  insert into faturas (escritorio_id, assinatura_id, competencia, vencimento, plano_nome, forma, pessoas_ativas, total_centavos,
                       carne_parcela_id, pix_copia_cola, linha_boleto)
  values (a.escritorio_id, a.id, p_competencia, v_venc, v_plano, a.forma, (v_conta ->> 'pessoas')::int, (v_conta ->> 'totalCentavos')::int,
          v_parcela.id, v_parcela.pix_copia_cola, v_parcela.linha_boleto)
  returning id into v_id;
  for v_item in select * from jsonb_array_elements(v_conta -> 'itens') loop
    v_ordem := v_ordem + 1;
    insert into fatura_itens (escritorio_id, fatura_id, ordem, tipo, descricao, quantidade, valor_unitario_centavos, valor_centavos, motivo)
    values (a.escritorio_id, v_id, v_ordem, v_item ->> 'tipo', v_item ->> 'descricao', (v_item ->> 'quantidade')::int,
            (v_item ->> 'valorUnitarioCentavos')::int, (v_item ->> 'valorCentavos')::int,
            case when v_item ->> 'tipo' = 'DESCONTO' then nullif(btrim(v_item ->> 'motivo'), '') end);
  end loop;
  -- A soma dos itens é o total, conferida aqui (desenho, "Para quem for programar").
  if (select sum(valor_centavos) from fatura_itens where fatura_id = v_id) <> (v_conta ->> 'totalCentavos')::int
     and (v_conta ->> 'totalCentavos')::int > 0 then
    raise exception 'A soma dos itens não fecha com o total da fatura' using errcode = 'TC422';
  end if;
  if v_parcela.id is not null then
    update assinatura_carne_parcelas set fatura_id = v_id where id = v_parcela.id;
  end if;
  perform cobranca_evento(a.id, v_id, 'fatura.emitida', jsonb_build_object(
    'competencia', p_competencia, 'vencimento', v_venc, 'totalCentavos', (v_conta ->> 'totalCentavos')::int,
    'pessoas', (v_conta ->> 'pessoas')::int, 'parcela', v_parcela.numero), p_sistema);
  if p_avisar and contrato_situacao(a.escritorio_id) in ('ABERTO', 'MARCADO') then
    perform cobranca_enfileirar(v_id, 'EMITIDA');
  end if;
  return v_id;
end $$;

-- O começo da cobrança: o desconto lançado na implantação anda junto com a 1ª competência
-- (pergunta 4), e a mudança fica no histórico.
create or replace function cobranca_comecar(p_escritorio uuid) returns void
language plpgsql
set search_path = public
as $$
declare a assinaturas; v_antes text := current_setting('t3jus.cobrando', true); v_ate date;
begin
  select * into a from assinaturas where escritorio_id = p_escritorio for update;
  if a.id is null or a.inicio_cobranca is not null then return; end if;
  perform cobranca_marcar(true);
  update assinaturas set inicio_cobranca = hoje_brasilia(),
                         primeira_competencia = (competencia_de(hoje_brasilia()) + interval '1 month')::date
   where id = a.id returning * into a;
  perform cobranca_evento(a.id, null, 'cobranca.comecou', jsonb_build_object('em', hoje_brasilia()));
  if a.desconto_meses is not null then
    v_ate := (a.primeira_competencia + make_interval(months => a.desconto_meses - 1))::date;
    if v_ate is distinct from a.desconto_ate then
      update assinaturas set desconto_ate = v_ate where id = a.id;
      perform cobranca_evento(a.id, null, 'assinatura.desconto_ajustado', jsonb_build_object(
        'de', a.desconto_ate, 'para', v_ate, 'meses', a.desconto_meses));
    end if;
  end if;
  perform cobranca_emitir_pendentes(a.id, false);
  perform set_config('t3jus.cobrando', coalesce(v_antes, ''), true);
end $$;

-- ---------------------------------------------------------------------------------------
-- 3. O que as telas leem: faixas, o desconto de cada parcela e a última competência de verdade.

create or replace function carne_json(c assinatura_carnes) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', c.id, 'numero', c.numero, 'parcelas', c.parcelas, 'valorParcelaCentavos', c.valor_parcela_centavos,
    'diaVencimento', c.dia_vencimento, 'primeiraCompetencia', c.primeira_competencia,
    'ultimaCompetencia', (select max(p.competencia) from assinatura_carne_parcelas p where p.carne_id = c.id),
    'geradoEm', c.gerado_em, 'geradoPor', (select nome from pessoas where id = c.gerado_por),
    'substituidoEm', c.substituido_em, 'substituidoMotivo', c.substituido_motivo, 'pdf', c.pdf_path is not null,
    'itens', coalesce((select jsonb_agg(jsonb_build_object(
        'id', p.id, 'numero', p.numero, 'competencia', p.competencia, 'vencimento', p.vencimento, 'valorCentavos', p.valor_centavos,
        'descontoCentavos', carne_desconto_de(p.itens), 'pessoas', p.pessoas,
        'situacao', p.situacao, 'faturaId', p.fatura_id, 'pagaEm', (select paga_em from faturas where id = p.fatura_id),
        'emAtraso', p.situacao = 'A_VENCER' and p.vencimento < hoje_brasilia(),
        'canceladaMotivo', p.cancelada_motivo) order by p.numero)
      from assinatura_carne_parcelas p where p.carne_id = c.id), '[]'::jsonb))
    || carne_faixas(c)
$$;

-- Os carnês em uso e o que muda se a equipe gerar um carnê novo hoje. valorHojeCentavos é a
-- mensalidade de hoje da próxima competência sem fatura; valorCarneCentavos é a parcela desse
-- mesmo mês no carnê em uso (comparar os dois não acende no fim do desconto).
create or replace function carnes_da_assinatura(a assinaturas) returns jsonb
language plpgsql stable
set search_path = public
as $$
declare
  v_prox date := cobranca_proxima_sem_fatura(a);
  v_pessoas integer := pessoas_ativas_portal(a.escritorio_id);
begin
  return jsonb_build_object(
    'emUso', coalesce((select jsonb_agg(carne_json(c) order by c.primeira_competencia)
                         from assinatura_carnes c where c.assinatura_id = a.id and c.substituido_em is null), '[]'::jsonb),
    'substituidos', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'numero', c.numero, 'substituidoEm', c.substituido_em,
                                                                  'motivo', c.substituido_motivo) order by c.substituido_em desc)
                                from assinatura_carnes c where c.assinatura_id = a.id and c.substituido_em is not null), '[]'::jsonb),
    'valorHojeCentavos', (cobranca_itens(a.preco_centavos, a.pessoas_incluidas, a.desconto_pct, a.desconto_ate, v_prox, v_pessoas,
                                         (select nome from planos where id = a.plano_id)) ->> 'totalCentavos')::int,
    'valorCarneCentavos', (select p.valor_centavos from assinatura_carne_parcelas p join assinatura_carnes c on c.id = p.carne_id
                            where c.assinatura_id = a.id and c.substituido_em is null and p.competencia = v_prox
                              and p.situacao = 'A_VENCER' and p.fatura_id is null order by c.gerado_em desc limit 1),
    'previaNovo', case when a.forma = 'CARNE' and a.primeira_competencia is not null then
                    carne_previa(a, a.preco_centavos, a.pessoas_incluidas, (select nome from planos where id = a.plano_id), v_pessoas,
                                 carne_inicio_troca(a), a.parcelas_por_carne) end);
end $$;

-- A prévia no plano escolhido: a próxima fatura e, com Carnê em uso, o carnê novo.
create or replace function previa_no_plano(a assinaturas, p planos) returns jsonb
language plpgsql stable
set search_path = public
as $$
declare
  v_comp date := cobranca_proxima_sem_fatura(a);
  v_pessoas integer := pessoas_ativas_portal(a.escritorio_id);
  v jsonb;
begin
  v := jsonb_build_object('competencia', v_comp, 'vencimento', vencimento_de(v_comp, a.dia_vencimento))
       || cobranca_itens(p.preco_centavos, p.pessoas_incluidas, a.desconto_pct, a.desconto_ate, v_comp, v_pessoas, p.nome);
  if a.forma = 'CARNE' and a.primeira_competencia is not null then
    v := v || jsonb_build_object('carne', carne_previa(a, p.preco_centavos, p.pessoas_incluidas, p.nome, v_pessoas,
                                                       carne_inicio_troca(a), a.parcelas_por_carne));
  end if;
  return v;
end $$;

-- O carnê em PDF: o mesmo de carne_json, também no carnê que vale no lugar (0696).
create or replace function cobranca_carne_documento_json(c assinatura_carnes) returns jsonb
language sql
stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', c.id, 'numero', c.numero, 'parcelas', c.parcelas, 'valorParcelaCentavos', c.valor_parcela_centavos,
    'diaVencimento', c.dia_vencimento, 'primeiraCompetencia', c.primeira_competencia,
    'ultimaCompetencia', (select max(p.competencia) from assinatura_carne_parcelas p where p.carne_id = c.id),
    'geradoEm', c.gerado_em,
    'hoje', hoje_brasilia(),
    'emissor', cobranca_emissor(),
    'plano', (select p.nome from assinaturas a join planos p on p.id = a.plano_id where a.id = c.assinatura_id),
    'pagador', (select jsonb_build_object('nome', x.nome, 'cnpj', coalesce(a.cnpj_nota, x.cnpj), 'email', a.email_cobranca)
                  from assinaturas a join escritorios x on x.id = a.escritorio_id where a.id = c.assinatura_id),
    -- O carnê que vale no lugar das parcelas canceladas, quando houver.
    'substituto', (select jsonb_build_object('numero', n.numero, 'primeiraCompetencia', n.primeira_competencia,
                                             'ultimaCompetencia', (select max(p.competencia) from assinatura_carne_parcelas p where p.carne_id = n.id),
                                             'valorParcelaCentavos', n.valor_parcela_centavos) || carne_faixas(n)
                     from assinatura_carnes n where n.id = c.substituido_por_carne),
    'itens', coalesce((select jsonb_agg(jsonb_build_object(
        'numero', p.numero, 'competencia', p.competencia, 'vencimento', p.vencimento, 'valorCentavos', p.valor_centavos,
        'descontoCentavos', carne_desconto_de(p.itens),
        'situacao', case when f.situacao = 'PAGA' then 'PAGA' else p.situacao end,
        'emAtraso', p.situacao = 'A_VENCER' and coalesce(f.situacao, 'A_VENCER') <> 'PAGA' and p.vencimento < hoje_brasilia(),
        'pagaEm', f.paga_em, 'formaPaga', f.forma_paga,
        'canceladaEm', p.cancelada_em,
        -- Os códigos só da parcela ainda a pagar: os da parcela, ou os da fatura do mês.
        'codigos', case when p.situacao = 'A_VENCER' and coalesce(f.situacao, 'A_VENCER') not in ('PAGA', 'CANCELADA') then jsonb_build_object(
          'pixCopiaCola', coalesce(p.pix_copia_cola, f.pix_copia_cola), 'linhaBoleto', coalesce(p.linha_boleto, f.linha_boleto),
          'codigoBarras', coalesce(p.boleto_codigo_barras, f.boleto_codigo_barras)) end)
        order by p.numero)
      from assinatura_carne_parcelas p left join faturas f on f.id = p.fatura_id
     where p.carne_id = c.id), '[]'::jsonb))
    || carne_faixas(c)
$$;

-- A fatura em PDF (0695): o motivo do desconto vem do item, gravado na emissão.
create or replace function cobranca_documento_json(f faturas) returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  a assinaturas;
  x escritorios;
  v_pago jsonb;
begin
  select * into a from assinaturas where id = f.assinatura_id;
  select * into x from escritorios where id = f.escritorio_id;
  if f.situacao = 'PAGA' then
    v_pago := jsonb_build_object(
      'pagaEm', f.paga_em, 'forma', f.forma_paga, 'baixa', f.baixa,
      -- Quando o sistema registrou (baixa automática) ou quem registrou à mão, sem o motivo.
      'registradoEm', coalesce((select m.registrado_em from pagamentos_manuais m where m.fatura_id = f.id),
                               (select max(e.ocorrido_em) from fatura_eventos e where e.fatura_id = f.id and e.acao = 'fatura.paga')),
      'registradoPor', (select p.nome from pagamentos_manuais m join pessoas p on p.id = m.registrado_por where m.fatura_id = f.id));
  end if;
  return fatura_json(f) || jsonb_build_object(
    'hoje', hoje_brasilia(),
    'emissor', cobranca_emissor(),
    'pagador', jsonb_build_object(
      'nome', x.nome, 'cnpj', coalesce(a.cnpj_nota, x.cnpj), 'email', a.email_cobranca,
      'socio', (select p.nome from vinculos v join pessoas p on p.id = v.pessoa_id
                 where v.escritorio_id = f.escritorio_id and v.funcao = 'SOCIO' and v.revogado_em is null order by v.criado_em limit 1),
      'endereco', assinatura_endereco_json(a)),
    'pessoasIncluidas', a.pessoas_incluidas,
    'itens', (select jsonb_agg(jsonb_build_object('tipo', i.tipo, 'descricao', i.descricao, 'quantidade', i.quantidade,
                                                  'valorUnitarioCentavos', i.valor_unitario_centavos, 'valorCentavos', i.valor_centavos) order by i.ordem)
                from fatura_itens i where i.fatura_id = f.id),
    -- O motivo do desconto é combinado com o escritório e aparece na fatura, como estava na emissão.
    'motivoDesconto', (select i.motivo from fatura_itens i where i.fatura_id = f.id and i.tipo = 'DESCONTO' order by i.ordem limit 1),
    'codigos', case when f.situacao = 'A_VENCER' then jsonb_build_object(
      'provedor', f.pagamento_provedor, 'pixCopiaCola', f.pix_copia_cola, 'linhaBoleto', f.linha_boleto,
      'codigoBarras', f.boleto_codigo_barras) end,
    'pagamento', v_pago,
    'canceladaEm', f.cancelada_em,
    -- As outras faturas em aberto, lembradas na fatura em atraso (cada uma tem o próprio documento).
    'outrasAbertas', coalesce((select jsonb_agg(jsonb_build_object('numero', o.numero, 'competencia', o.competencia, 'vencimento', o.vencimento,
                                                                   'totalCentavos', o.total_centavos) order by o.competencia)
                                 from faturas o where o.escritorio_id = f.escritorio_id and o.id <> f.id and o.situacao = 'A_VENCER'
                                  and o.vencimento < hoje_brasilia()), '[]'::jsonb),
    'carne', (select jsonb_build_object('numero', c.numero, 'parcela', p.numero, 'de', c.parcelas, 'geradoEm', c.gerado_em)
                from assinatura_carne_parcelas p join assinatura_carnes c on c.id = p.carne_id where p.id = f.carne_parcela_id));
end $$;

-- ---------------------------------------------------------------------------------------
-- 4. Salvar a assinatura: 99% no carnê, a troca confirmada e a trava.

create or replace function assinatura_dados(p_dados jsonb, p_criar boolean) returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  v_campos text[] := '{}';
  v_dia integer;
  v_pct integer;
  v_ate date;
  v_parcelas integer;
  v_email text := lower(btrim(coalesce(p_dados ->> 'emailCobranca', '')));
  v_cnpj text := nullif(regexp_replace(coalesce(p_dados ->> 'cnpjNota', ''), '[^0-9]', '', 'g'), '');
  v_forma text := p_dados ->> 'forma';
  v_plano planos;
  v_motivo text;
begin
  if p_criar then
    begin
      select * into v_plano from planos where id = (p_dados ->> 'planoId')::uuid;
    exception when others then v_plano := null;
    end;
    if v_plano.id is null then v_campos := v_campos || 'plano'::text;
    elsif v_plano.arquivado_em is not null then
      raise exception 'O plano está arquivado' using errcode = 'TC422',
        detail = jsonb_build_object('motivo', 'PLANO_ARQUIVADO', 'campos', jsonb_build_array('plano'))::text;
    end if;
  end if;
  begin v_dia := (p_dados ->> 'diaVencimento')::int; exception when others then v_dia := null; end;
  if v_dia is null or v_dia not between 1 and 28 then v_campos := v_campos || 'diaVencimento'::text; end if;
  if coalesce(v_forma, '') not in ('PIX', 'BOLETO', 'CARNE') then v_campos := v_campos || 'forma'::text; end if;
  if length(v_email) > 254 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then v_campos := v_campos || 'emailCobranca'::text; end if;
  if v_cnpj is not null and v_cnpj !~ '^[0-9]{14}$' then v_campos := v_campos || 'cnpjNota'::text; end if;
  if p_dados -> 'desconto' is not null and jsonb_typeof(p_dados -> 'desconto') = 'object' then
    begin v_pct := (p_dados -> 'desconto' ->> 'pct')::int; exception when others then v_pct := null; end;
    begin v_ate := competencia_de((p_dados -> 'desconto' ->> 'ate')::date); exception when others then v_ate := null; end;
    if v_pct is null or v_pct not between 1 and 100 then v_campos := v_campos || 'descontoPct'::text;
    -- No carnê, até 99%: o meio de pagamento não emite parcela de R$ 0,00 (CO-10).
    elsif v_pct = 100 and v_forma = 'CARNE' then v_campos := v_campos || 'descontoPct'::text; v_motivo := 'CARNE_DESCONTO_ATE_99';
    end if;
    if v_ate is null then v_campos := v_campos || 'descontoAte'::text; end if;
    if length(btrim(coalesce(p_dados -> 'desconto' ->> 'motivo', ''))) not between 1 and 300 then v_campos := v_campos || 'descontoMotivo'::text; end if;
  end if;
  if v_forma = 'CARNE' then
    begin v_parcelas := coalesce((p_dados ->> 'parcelasPorCarne')::int, configuracao_int('cobranca_parcelas_por_carne'));
    exception when others then v_parcelas := null; end;
    if v_parcelas is null or v_parcelas not between 1 and 12 then v_campos := v_campos || 'parcelasPorCarne'::text; end if;
  end if;
  if cardinality(v_campos) > 0 then
    raise exception 'Confira a assinatura' using errcode = 'TC422',
      detail = jsonb_strip_nulls(jsonb_build_object('campos', to_jsonb(v_campos), 'motivo', v_motivo))::text;
  end if;
  return jsonb_build_object('plano', v_plano.id, 'preco', v_plano.preco_centavos, 'pessoas', v_plano.pessoas_incluidas,
    'dia', v_dia, 'forma', v_forma, 'email', v_email, 'cnpj', v_cnpj,
    'pct', v_pct, 'ate', v_ate, 'motivoDesconto', btrim(p_dados -> 'desconto' ->> 'motivo'), 'parcelas', v_parcelas);
end $$;

-- O texto do desconto para o motivo da troca: "20% até a fatura de fevereiro de 2027" ou "sem desconto".
create function desconto_texto(p_pct integer, p_ate date) returns text
language sql immutable
as $$ select case when p_pct is null then 'sem desconto' else p_pct || '% até a fatura de ' || mes_por_extenso(p_ate) end $$;

-- A troca que um desconto novo pede no carnê em uso (pergunta 1). Só o desconto decide: para cada
-- parcela sem fatura e a vencer, compara o desconto gravado nela com o desconto novo sobre a
-- mensalidade gravada nela. Devolve {muda, parcelas, competencias, pessoasHoje, pessoasCarne, previa}.
create function carne_troca_por_desconto(n assinaturas) returns jsonb
language plpgsql stable
set search_path = public
as $$
declare
  v_muda boolean;
  v_pessoas integer := pessoas_ativas_portal(n.escritorio_id);
begin
  select coalesce(bool_or(carne_desconto_de(p.itens) <>
           case when n.desconto_pct is not null and p.competencia <= n.desconto_ate
                then round(coalesce((select (i ->> 'valorUnitarioCentavos')::int from jsonb_array_elements(p.itens) i
                                      where i ->> 'tipo' = 'MENSALIDADE' limit 1), 0) * n.desconto_pct / 100.0)::int
                else 0 end), false)
    into v_muda
    from assinatura_carne_parcelas p join assinatura_carnes c on c.id = p.carne_id
   where c.assinatura_id = n.id and c.substituido_em is null and p.situacao = 'A_VENCER' and p.fatura_id is null;
  if not v_muda then return jsonb_build_object('muda', false); end if;
  return (select jsonb_build_object('muda', true, 'parcelas', count(*), 'competencias', jsonb_agg(p.competencia order by p.competencia),
                                    'pessoasCarne', max(p.pessoas), 'pessoasHoje', v_pessoas)
            from assinatura_carne_parcelas p join assinatura_carnes c on c.id = p.carne_id
           where c.assinatura_id = n.id and c.substituido_em is null and p.situacao = 'A_VENCER' and p.fatura_id is null)
         || jsonb_build_object('previa', carne_previa(n, n.preco_centavos, n.pessoas_incluidas, (select nome from planos where id = n.plano_id),
                                                      v_pessoas, carne_inicio_troca(n), n.parcelas_por_carne));
end $$;

-- Preparar (sem versão) ou editar a assinatura (corpo da 0690, renomeado na 0694). Muda a trava, o
-- desconto que conta das primeiras faturas (desconto_meses), a recusa do "até" que não alcança a
-- próxima fatura e a troca do carnê pelo desconto, só com "trocarCarne" (CO-10).
create or replace function console_assinatura_salvar_sem_endereco(p_pessoa uuid, p_escritorio uuid, p_versao integer, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  a assinaturas;
  n assinaturas;
  d jsonb;
  v_estagio text;
  v_mudou jsonb := '{}'::jsonb;
  v_carne jsonb;
  v_desc_mudou boolean;
  v_meses integer;
  v_troca jsonb;
  v_motivos text[] := '{}';
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'console.cobranca.editar');
  if contrato_situacao(p_escritorio) not in ('ABERTO', 'MARCADO') then
    perform recusar_motivo('O contrato terminou: a assinatura não muda mais', 'CONTRATO_ENCERRADO');
  end if;
  select * into a from assinaturas where escritorio_id = p_escritorio for update;
  perform cobranca_marcar(true);
  if a.id is null then
    d := assinatura_dados(p_dados, true);
    if (d ->> 'pct') is not null then
      -- Antes da cobrança, o desconto conta da 1ª fatura (pergunta 4).
      v_meses := (extract(year from age((d ->> 'ate')::date, (competencia_de(hoje_brasilia()) + interval '1 month')::date)) * 12
                  + extract(month from age((d ->> 'ate')::date, (competencia_de(hoje_brasilia()) + interval '1 month')::date)))::int + 1;
      if v_meses < 1 then
        raise exception 'O desconto precisa valer pelo menos na próxima fatura' using errcode = 'TC422',
          detail = jsonb_build_object('campos', jsonb_build_array('descontoAte'), 'motivo', 'DESCONTO_JA_PASSOU')::text;
      end if;
    end if;
    insert into assinaturas (escritorio_id, plano_id, preco_centavos, pessoas_incluidas, dia_vencimento, forma, email_cobranca, cnpj_nota,
                             desconto_pct, desconto_ate, desconto_motivo, desconto_por, desconto_meses, parcelas_por_carne, criado_por)
    values (p_escritorio, (d ->> 'plano')::uuid, (d ->> 'preco')::int, (d ->> 'pessoas')::int, (d ->> 'dia')::int, d ->> 'forma',
            d ->> 'email', d ->> 'cnpj', (d ->> 'pct')::int, (d ->> 'ate')::date, d ->> 'motivoDesconto',
            case when d ->> 'pct' is not null then p_pessoa end, case when v_meses is not null then least(v_meses, 24) end, (d ->> 'parcelas')::int, p_pessoa)
    returning * into n;
    perform cobranca_evento(n.id, null, 'assinatura.preparada', jsonb_build_object(
      'plano', (select nome from planos where id = n.plano_id), 'precoCentavos', n.preco_centavos, 'dia', n.dia_vencimento,
      'forma', n.forma, 'descontoPct', n.desconto_pct, 'descontoAte', n.desconto_ate, 'descontoMotivo', n.desconto_motivo));
    select estado into v_estagio from clientes where escritorio_id = p_escritorio;
    if v_estagio = 'ATIVO' then perform cobranca_comecar(p_escritorio); end if;
    perform cobranca_marcar(false);
    return jsonb_build_object('id', n.id, 'versao', (select versao from assinaturas where id = n.id));
  end if;

  if p_versao is null or a.versao <> p_versao then perform conflito_cobranca('assinaturas', a.id); end if;
  d := assinatura_dados(p_dados, false);
  v_desc_mudou := (a.desconto_pct, a.desconto_ate) is distinct from ((d ->> 'pct')::int, (d ->> 'ate')::date);
  -- A próxima fatura a sair: no carnê, a 1ª parcela ainda sem fatura (pode vir antes de uma paga adiantada).
  if v_desc_mudou and (d ->> 'pct') is not null then
    v_meses := (extract(year from age((d ->> 'ate')::date, carne_inicio_troca(a))) * 12
                + extract(month from age((d ->> 'ate')::date, carne_inicio_troca(a))))::int + 1;
    if (d ->> 'ate')::date < carne_inicio_troca(a) then
      raise exception 'O desconto precisa valer pelo menos na próxima fatura' using errcode = 'TC422',
        detail = jsonb_build_object('campos', jsonb_build_array('descontoAte'), 'motivo', 'DESCONTO_JA_PASSOU')::text;
    end if;
  end if;
  update assinaturas
     set dia_vencimento = (d ->> 'dia')::int, forma = d ->> 'forma', email_cobranca = d ->> 'email', cnpj_nota = d ->> 'cnpj',
         desconto_pct = (d ->> 'pct')::int, desconto_ate = (d ->> 'ate')::date, desconto_motivo = d ->> 'motivoDesconto',
         desconto_por = case when (d ->> 'pct') is null then null
                             when (a.desconto_pct, a.desconto_ate, a.desconto_motivo) is not distinct from ((d ->> 'pct')::int, (d ->> 'ate')::date, d ->> 'motivoDesconto')
                             then a.desconto_por else p_pessoa end,
         -- Só antes da cobrança o desconto conta da 1ª fatura; depois, o "até" vale como foi escrito.
         desconto_meses = case when (d ->> 'pct') is null then null
                               when not v_desc_mudou then a.desconto_meses
                               when a.primeira_competencia is null then least(v_meses, 24)
                               else null end,
         parcelas_por_carne = (d ->> 'parcelas')::int
   where id = a.id returning * into n;
  -- O que mudou, para "Mudanças da assinatura" (o e-mail não vai para o histórico: é dado pessoal).
  if a.dia_vencimento <> n.dia_vencimento then v_mudou := v_mudou || jsonb_build_object('dia', jsonb_build_object('de', a.dia_vencimento, 'para', n.dia_vencimento)); end if;
  if a.forma <> n.forma then v_mudou := v_mudou || jsonb_build_object('forma', jsonb_build_object('de', a.forma, 'para', n.forma)); end if;
  if a.email_cobranca <> n.email_cobranca then v_mudou := v_mudou || jsonb_build_object('emailCobranca', true); end if;
  if a.cnpj_nota is distinct from n.cnpj_nota then v_mudou := v_mudou || jsonb_build_object('cnpjNota', true); end if;
  if (a.desconto_pct, a.desconto_ate, a.desconto_motivo) is distinct from (n.desconto_pct, n.desconto_ate, n.desconto_motivo) then
    v_mudou := v_mudou || jsonb_build_object('desconto', jsonb_build_object('pct', n.desconto_pct, 'ate', n.desconto_ate, 'motivo', n.desconto_motivo));
  end if;
  if a.parcelas_por_carne is distinct from n.parcelas_por_carne then
    v_mudou := v_mudou || jsonb_build_object('parcelasPorCarne', jsonb_build_object('de', a.parcelas_por_carne, 'para', n.parcelas_por_carne));
  end if;
  if v_mudou <> '{}'::jsonb then perform cobranca_evento(a.id, null, 'assinatura.alterada', v_mudou); end if;

  -- O desconto mudou com o carnê em uso: troca só com a confirmação da tela (pergunta 1).
  if n.forma = 'CARNE' and a.forma = 'CARNE' and v_desc_mudou then
    v_troca := carne_troca_por_desconto(n);
    if (v_troca ->> 'muda')::boolean then
      if not coalesce((p_dados ->> 'trocarCarne')::boolean, false) then
        raise exception 'Mudar o desconto troca o carnê' using errcode = 'TC422',
          detail = jsonb_build_object('motivo', 'CARNE_TROCA_CONFIRMAR', 'previa', v_troca - 'muda')::text;
      end if;
      v_motivos := v_motivos || ('O desconto de entrada mudou: de ' || desconto_texto(a.desconto_pct, a.desconto_ate)
                                 || ' para ' || desconto_texto(n.desconto_pct, n.desconto_ate)
                                 || case when (v_troca ->> 'pessoasHoje')::int <> (v_troca ->> 'pessoasCarne')::int
                                         then ', e passa a contar ' || (v_troca ->> 'pessoasHoje') || ' pessoas (eram ' || (v_troca ->> 'pessoasCarne') || ')'
                                         else '' end);
    end if;
  end if;

  if a.forma = 'CARNE' and n.forma <> 'CARNE' then
    v_carne := cobranca_trocar_carne(n, 'A forma de pagamento mudou para ' || case n.forma when 'PIX' then 'Pix' else 'boleto' end, false);
  elsif n.forma = 'CARNE' and a.forma <> 'CARNE' and n.primeira_competencia is not null then
    perform cobranca_gerar_carne(n, cobranca_proxima_sem_fatura(n), false);
  elsif n.forma = 'CARNE' and (a.dia_vencimento <> n.dia_vencimento or a.parcelas_por_carne is distinct from n.parcelas_por_carne
                               or cardinality(v_motivos) > 0)
        and exists (select 1 from assinatura_carnes c where c.assinatura_id = n.id and c.substituido_em is null) then
    if a.dia_vencimento <> n.dia_vencimento then
      v_motivos := ('O dia de vencimento mudou de ' || a.dia_vencimento || ' para ' || n.dia_vencimento) || v_motivos;
    elsif a.parcelas_por_carne is distinct from n.parcelas_por_carne then
      v_motivos := 'As parcelas por carnê mudaram'::text || v_motivos;
    end if;
    v_carne := cobranca_trocar_carne(n, left(array_to_string(v_motivos, '. '), 300), true);
  end if;
  perform cobranca_marcar(false);
  return jsonb_build_object('id', n.id, 'versao', (select versao from assinaturas where id = n.id), 'carne', v_carne);
end $$;

-- Mudar de plano (0690): a leitura passa a travar a assinatura.
create or replace function console_assinatura_mudar_plano(p_pessoa uuid, p_escritorio uuid, p_versao integer, p_plano uuid, p_motivo text) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare a assinaturas; n assinaturas; p planos; v_motivo text; v_de text; v_carne jsonb;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'console.cobranca.editar');
  v_motivo := motivo_valido(p_motivo);
  if contrato_situacao(p_escritorio) not in ('ABERTO', 'MARCADO') then
    perform recusar_motivo('O contrato terminou: a assinatura não muda mais', 'CONTRATO_ENCERRADO');
  end if;
  select * into a from assinaturas where escritorio_id = p_escritorio for update;
  if a.id is null then raise exception 'Assinatura não encontrada' using errcode = 'TC404'; end if;
  if a.versao <> p_versao then perform conflito_cobranca('assinaturas', a.id); end if;
  select * into p from planos where id = p_plano;
  if p.id is null then perform recusar_campos('Escolha o plano', 'plano'); end if;
  if p.arquivado_em is not null then perform recusar_motivo('O plano está arquivado', 'PLANO_ARQUIVADO'); end if;
  if p.id = a.plano_id then perform recusar_motivo('O escritório já está neste plano', 'MESMO_PLANO'); end if;
  v_de := (select nome from planos where id = a.plano_id);
  perform cobranca_marcar(true);
  update assinaturas set plano_id = p.id, preco_centavos = p.preco_centavos, pessoas_incluidas = p.pessoas_incluidas
   where id = a.id returning * into n;
  perform cobranca_evento(a.id, null, 'assinatura.plano_mudou', jsonb_build_object(
    'de', v_de, 'para', p.nome, 'precoDeCentavos', a.preco_centavos, 'precoParaCentavos', p.preco_centavos,
    'valeEm', cobranca_proxima_sem_fatura(n), 'motivo', v_motivo));
  if n.forma = 'CARNE' and exists (select 1 from assinatura_carnes c where c.assinatura_id = n.id and c.substituido_em is null) then
    v_carne := cobranca_trocar_carne(n, 'Mudança de plano: ' || v_de || ' para ' || p.nome || '. ' || v_motivo, true);
  end if;
  perform cobranca_marcar(false);
  return jsonb_build_object('versao', (select versao from assinaturas where id = a.id), 'carne', v_carne);
end $$;

-- Gerar um carnê novo (0690): a leitura passa a travar a assinatura.
create or replace function console_carne_novo(p_pessoa uuid, p_escritorio uuid, p_versao integer, p_motivo text) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare a assinaturas; v_motivo text; v jsonb;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'console.cobranca.editar');
  v_motivo := motivo_valido(p_motivo);
  select * into a from assinaturas where escritorio_id = p_escritorio for update;
  if a.id is null then raise exception 'Assinatura não encontrada' using errcode = 'TC404'; end if;
  if a.versao <> p_versao then perform conflito_cobranca('assinaturas', a.id); end if;
  if a.forma <> 'CARNE' or a.primeira_competencia is null then
    perform recusar_motivo('A assinatura não paga por carnê', 'CARNE_SEM_PARCELA_A_TROCAR');
  end if;
  perform cobranca_marcar(true);
  v := cobranca_trocar_carne(a, v_motivo, true);
  -- A versão sobe: o carnê é parte da assinatura que a tela leu.
  update assinaturas set forma = forma where id = a.id;
  perform cobranca_marcar(false);
  return v || jsonb_build_object('versao', (select versao from assinaturas where id = a.id));
end $$;

call fechar_acesso();
