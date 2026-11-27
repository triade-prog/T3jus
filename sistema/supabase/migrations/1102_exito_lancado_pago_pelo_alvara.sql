-- 1102 · O êxito lançado depois do alvará já nasce pago (F3.199; CH-07, FI-05).
-- Plano F3.194/F3.192/F3.191 (v5, Parte A; no plano, a entrega se chama F3.194) e desenho D39,
-- aprovados pela Carol em 26/11/2026, às 22h11 (Bahia), em docs/design/aprovadas/portal-exito-alvara-conferir,
-- com as decisões:
--   C2. com honorários do alvará já entrados, o "Não cobrar" é recusado (HONORARIOS_JA_ENTRARAM);
--   C3. a proposta limita os honorários ao que falta do êxito lançado, também nos alvarás seguintes.
--
-- O problema: com o alvará dividido antes da conferência do êxito (ou antes do encerramento do
-- caso), o registrar não acha parcela para pagar, e o lançar criava a parcela EXITO aberta, sem
-- olhar o que já tinha entrado. O cliente era cobrado duas vezes (CC, arts. 876 e 940).
--
-- O que muda:
--   - o lançar paga a parcela nova com as partes de honorários livres do mesmo caso e cliente, na
--     ordem em que entraram, com o mesmo recebimento TERCEIROS ligado à parte que a 0651 usa
--     (recebido_em = o dia em que o dinheiro entrou), e responde pagoPeloAlvara;
--   - o "Dispensar" trava a parte antes de conferir se ela já pagou o êxito (a corrida com o lançar);
--   - o "Não cobrar" recusa quando há honorários livres (C2);
--   - a linha do êxito traz honorariosAlvara (o aviso da janela de conferir);
--   - a proposta traz exitoSituacao e limita os honorários ao que falta do êxito lançado (C3), com
--     semLimite na linha quando o limite foi aplicado. O seguiuProposta não compara semLimite;
--   - a linha de cada parte traz pagou (o que ela pagou de parcela do êxito), nos dois caminhos;
--   - o registrar trava a linha do êxito para conferir do cliente no caso (for share), a mesma que
--     o lançar e o "Não cobrar" travam (for update).
-- A sucumbência vai como "Outro" e não paga o êxito. Nenhuma tabela, coluna, gatilho ou permissão
-- nova: o escritório vem sempre da sessão (p_escritorio). As funções que outras frentes também
-- mudam são achadas pelo conteúdo e trocadas por trecho exato (como a 1100), e a troca para se o
-- trecho não aparecer exatamente uma vez.

-- ---------------------------------------------------------------------------------------
-- 0. Troca de um trecho exato numa função que já existe (cópia da t1100_trocar).
create function t1102_trocar(p_funcao regprocedure, p_de text, p_para text, p_vezes integer default 1) returns void
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
create function t1102_achar(p_trecho text) returns regprocedure
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
-- 1. As peças novas.

-- As partes de honorários dos levantamentos do cliente no caso que ainda têm valor livre (não
-- dispensadas e sem ter pago tudo a parcelas), do dinheiro que entrou primeiro para o mais novo.
create function exito_honorarios_livres(p_escritorio uuid, p_caso uuid, p_cliente uuid)
  returns table (destinacao_id uuid, levantamento_id uuid, tipo text, entrou_em date, livre bigint)
language sql stable
set search_path = public
as $$
  select d.id, l.id, l.tipo, l.entrou_em, t.livre
    from levantamentos l
    join destinacoes d on d.levantamento_id = l.id and d.escritorio_id = p_escritorio
    cross join lateral (select d.valor - coalesce((select sum(p.valor) from pagamentos_recebidos p
                                                    where p.destinacao_id = d.id and p.escritorio_id = p_escritorio), 0) livre) t
   where l.escritorio_id = p_escritorio and l.caso_id = p_caso and l.cliente_id = p_cliente
     and d.para = 'HONORARIOS' and d.dispensado_em is null and t.livre > 0
   order by l.entrou_em, d.ordem, d.id
$$;

-- Onde está o êxito do cliente no caso, para a divisão do alvará (nota 3 da segunda revisão):
-- null sem condição de êxito no contrato; senão
--   SEM_CONFERENCIA: o caso ainda em andamento, sem a linha de exitos_conferir;
--   SEM_EXITO: o caso encerrado sem a linha (sem valores, calculado 0 ou antes da 0640);
--   PARA_CONFERIR (com o calculado) ou NAO_COBRADO;
--   LANCADO (com o valor e a falta);
--   PAGO (falta 0, com o dia do último pagamento): só com parcela em vigor e paga de verdade;
--   CANCELADO: lançado, mas sem parcela em vigor (por exemplo, cancelada por
--     contrato_cancelar_futuros no encerramento do contrato). Não traz falta, e a proposta não
--     limita (revisão de código da F3.199, nota 1).
-- A falta soma o que falta das parcelas do êxito abertas ou com baixa sem receber em vigor (F3.174:
-- a baixa não é pagamento), com o contrato ATIVO ou ENCERRADO, o mesmo filtro de
-- exito_parcelas_abertas (0651), que é quem paga a parcela pela divisão (nota 4).
create function exito_situacao(p_escritorio uuid, p_caso uuid, p_cliente uuid) returns jsonb
language sql stable
set search_path = public
as $$
  with c as (
    select ct.id from caso_clientes cc join contratos ct on ct.id = cc.contrato_id
     where cc.escritorio_id = p_escritorio and cc.caso_id = p_caso and cc.cliente_id = p_cliente
       and exists (select 1 from honorario_condicoes h where h.dono_tipo = 'CONTRATO' and h.dono_id = ct.id and h.tipo = 'EXITO')
  ), x as (
    select x.* from exitos_conferir x
     where x.escritorio_id = p_escritorio and x.caso_id = p_caso and x.cliente_id = p_cliente
     order by x.criado_em desc, x.id desc limit 1
  ), r as (
    select count(*) n, coalesce(sum(r.valor), 0)::bigint total,
           coalesce(sum(least(parcela_recebido(r.id), r.valor)), 0)::bigint recebido,
           coalesce(sum(greatest(r.valor - parcela_recebido(r.id), 0)), 0)::bigint falta,
           (select max(p.recebido_em) from pagamentos_recebidos p join recebimentos_previstos q on q.id = p.parcela_id
             where q.exito_id = (select id from x) and q.escritorio_id = p_escritorio and p.escritorio_id = p_escritorio) pago_em
      from recebimentos_previstos r
      join contratos ct on ct.id = r.contrato_id and ct.estado in ('ATIVO', 'ENCERRADO')
     where r.escritorio_id = p_escritorio and r.exito_id = (select id from x)
       and r.valor is not null and (r.cancelado_em is null or r.baixa_id is not null)
  )
  select case
    when not exists (select 1 from c) then null
    when not exists (select 1 from x) then
      case when exists (select 1 from casos k where k.id = p_caso and k.escritorio_id = p_escritorio and k.situacao = 'ANDAMENTO')
           then jsonb_build_object('situacao', 'SEM_CONFERENCIA') else jsonb_build_object('situacao', 'SEM_EXITO') end
    when (select situacao from x) = 'PARA_CONFERIR' then jsonb_build_object('situacao', 'PARA_CONFERIR', 'calculado', (select calculado from x))
    when (select situacao from x) = 'NAO_COBRADO' then jsonb_build_object('situacao', 'NAO_COBRADO')
    when (select n from r) = 0 then jsonb_build_object('situacao', 'CANCELADO', 'valor', (select valor_lancado from x))
    when (select falta from r) = 0 and (select recebido from r) >= (select total from r)
      then jsonb_build_object('situacao', 'PAGO', 'valor', (select valor_lancado from x), 'falta', 0, 'pagoEm', (select pago_em from r))
    else jsonb_build_object('situacao', 'LANCADO', 'valor', (select valor_lancado from x), 'falta', (select falta from r))
  end
$$;

-- O que uma parte pagou de parcela do êxito (revisão do desenho, nota 2): nos dois caminhos (o
-- lançar depois do alvará e o alvará depois do lançar), lido de pagamentos_recebidos.destinacao_id.
create function destinacao_pagou(d destinacoes) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_agg(jsonb_build_object('parcelaId', r.id, 'descricao', r.descricao, 'valor', t.valor, 'parcelaValor', r.valor, 'lancadaEm', r.criado_em,
                                      'pagaEm', t.pago_em, 'contrato', ct.numero,
                                      'lancadaPor', (select pessoa_ref(x.conferido_por) from exitos_conferir x where x.id = r.exito_id and x.conferido_por is not null))
                   order by r.criado_em, r.id)
    from (select p.parcela_id, sum(p.valor)::bigint valor, max(p.recebido_em) pago_em from pagamentos_recebidos p
           where p.destinacao_id = d.id and p.escritorio_id = d.escritorio_id group by p.parcela_id) t
    join recebimentos_previstos r on r.id = t.parcela_id and r.escritorio_id = d.escritorio_id
    left join contratos ct on ct.id = r.contrato_id
$$;

-- ---------------------------------------------------------------------------------------
-- 2. O lançar: a parcela nasce paga pelas partes de honorários livres (A2.2), e o "Dispensar"
-- trava a parte antes de conferir (A2.3b).
select t1102_trocar('portal_financeiro_exito_lancar(uuid,uuid,uuid,jsonb)',
  $q$  v_parcela uuid;$q$,
  $q$  v_parcela uuid;
  -- F3.199: o que o alvará já pagou.
  h record;
  v_disp timestamptz;
  v_livre bigint;
  v_falta bigint;
  v_parte bigint;
  v_pag uuid;
  v_pagos jsonb := '[]'::jsonb;$q$);

select t1102_trocar('portal_financeiro_exito_lancar(uuid,uuid,uuid,jsonb)',
  $q$   where id = x.id returning * into x;$q$,
  $q$   where id = x.id returning * into x;
  -- F3.199: os honorários que já entraram pela divisão do alvará pagam a parcela, do mais antigo
  -- para o mais novo. A parte é travada e conferida de novo no mesmo comando (a corrida com o
  -- "Dispensar"): a dispensada, ou sem nada livre, é pulada.
  v_falta := v_valor;
  for h in select * from exito_honorarios_livres(p_escritorio, x.caso_id, x.cliente_id) loop
    exit when v_falta <= 0;
    select d.dispensado_em, d.valor - coalesce((select sum(p.valor) from pagamentos_recebidos p where p.destinacao_id = d.id), 0)
      into v_disp, v_livre
      from destinacoes d where d.id = h.destinacao_id and d.escritorio_id = p_escritorio for update;
    continue when v_disp is not null or coalesce(v_livre, 0) <= 0;
    v_parte := least(v_livre, v_falta);
    insert into pagamentos_recebidos (escritorio_id, parcela_id, valor, recebido_em, forma, caixa, destinacao_id, autor_id)
    values (p_escritorio, v_parcela, v_parte, h.entrou_em, 'TRANSFERENCIA', 'TERCEIROS', h.destinacao_id, p_pessoa) returning id into v_pag;
    perform registrar_historico('financeiro.recebimento', 'recebimentos_previstos', v_parcela::text,
      jsonb_build_object('pagamento', v_pag, 'valor', v_parte, 'recebidoEm', h.entrou_em, 'forma', 'TRANSFERENCIA',
                         'levantamento', h.levantamento_id, 'destinacao', h.destinacao_id, 'tipo', h.tipo, 'pelaConferencia', true));
    perform registrar_historico('financeiro.levantamento_exito_lancado_depois', 'levantamentos', h.levantamento_id::text,
      jsonb_build_object('tipo', h.tipo, 'exito', x.id, 'parcela', v_parcela, 'destinacao', h.destinacao_id, 'valor', v_parte,
                         'contrato', (select c.numero from contratos c where c.id = x.contrato_id)));
    v_pagos := v_pagos || jsonb_build_object('levantamentoId', h.levantamento_id, 'tipo', h.tipo, 'entrouEm', h.entrou_em, 'valor', v_parte);
    v_falta := v_falta - v_parte;
  end loop;$q$);

select t1102_trocar('portal_financeiro_exito_lancar(uuid,uuid,uuid,jsonb)',
  $q$  return exito_linha(x) || jsonb_build_object('parcela', (select parcela_linha(r) from recebimentos_previstos r where r.id = v_parcela));$q$,
  $q$  return exito_linha(x) || jsonb_build_object('parcela', (select parcela_linha(r) from recebimentos_previstos r where r.id = v_parcela),
                                               'pagoPeloAlvara', v_pagos);$q$);

-- O embrulho do "Dispensar" (0651) conferia o pagamento antes de travar a parte: com o lançar
-- pagando ao mesmo tempo, dispensava uma parte que já tinha pago a parcela. A trava vem antes, e
-- destinacao_aberta trava a mesma linha na mesma transação.
select t1102_trocar('portal_financeiro_destinacao_dispensar(uuid,uuid,uuid,text)',
  $q$  if exists (select 1 from pagamentos_recebidos p where p.destinacao_id = p_destinacao and p.escritorio_id = p_escritorio) then$q$,
  $q$  -- F3.199: trava a parte antes de conferir, para a corrida com o lançar terminar numa ordem só.
  perform 1 from destinacoes where id = p_destinacao and escritorio_id = p_escritorio for update;
  if exists (select 1 from pagamentos_recebidos p where p.destinacao_id = p_destinacao and p.escritorio_id = p_escritorio) then$q$);

-- ---------------------------------------------------------------------------------------
-- 3. O "Não cobrar" com honorários já entrados (C2: a janela recusa).
select t1102_trocar('portal_financeiro_exito_nao_cobrar(uuid,uuid,uuid,jsonb)',
  $q$  if x.situacao <> 'PARA_CONFERIR' then perform recusar_motivo('Este êxito já foi conferido', 'JA_CONFERIDO'); end if;$q$,
  $q$  if x.situacao <> 'PARA_CONFERIR' then perform recusar_motivo('Este êxito já foi conferido', 'JA_CONFERIDO'); end if;
  -- F3.199 (C2): os honorários já entraram; para não cobrar, o dinheiro teria de voltar ao cliente.
  if exists (select 1 from exito_honorarios_livres(p_escritorio, x.caso_id, x.cliente_id)) then
    perform recusar_motivo('Os honorários deste êxito já entraram pela divisão do alvará. Lance o êxito: ele nasce pago.', 'HONORARIOS_JA_ENTRARAM');
  end if;$q$);

-- ---------------------------------------------------------------------------------------
-- 4. A linha do êxito traz os honorários que já entraram (o aviso da janela de conferir).
alter function exito_linha(exitos_conferir) rename to exito_linha_sem_alvara;
create function exito_linha(x exitos_conferir) returns jsonb
language sql stable
set search_path = public
as $$
  select exito_linha_sem_alvara(x) || jsonb_build_object(
    'honorariosAlvara', coalesce((select jsonb_agg(jsonb_build_object('levantamentoId', h.levantamento_id, 'tipo', h.tipo, 'entrouEm', h.entrou_em, 'livre', h.livre)
                                                   order by h.entrou_em, h.destinacao_id)
                                    from exito_honorarios_livres(x.escritorio_id, x.caso_id, x.cliente_id) h), '[]'::jsonb))
$$;

-- ---------------------------------------------------------------------------------------
-- 4b. A divisão proposta: a situação do êxito (A2.7) e o limite ao que falta dele (C3).
select t1102_trocar('repasse_proposta(uuid,uuid,uuid,bigint)',
  $q$'exitoBaixado', exito_parcelas_baixadas(p_escritorio, p_caso, p_cliente))$q$,
  $q$'exitoBaixado', exito_parcelas_baixadas(p_escritorio, p_caso, p_cliente),
    -- F3.199: onde está o êxito, para a linha curta e os avisos da janela.
    'exitoSituacao', exito_situacao(p_escritorio, p_caso, p_cliente))$q$);

select t1102_trocar('repasse_proposta_sem_exito(uuid,uuid,uuid,bigint)',
  $q$  v_hon bigint;$q$,
  $q$  v_hon bigint;
  -- F3.199 (C3): o limite ao que falta do êxito lançado.
  v_sem_limite bigint;
  v_lim bigint;
  v_limitado boolean := false;$q$);
select t1102_trocar('repasse_proposta_sem_exito(uuid,uuid,uuid,bigint)',
  $q$      v_hon := round(p_valor * (v_exito.params ->> 'percentual')::bigint / 10000.0);$q$,
  $q$      v_hon := round(p_valor * (v_exito.params ->> 'percentual')::bigint / 10000.0);
      -- F3.199 (C3): só o LANCADO e o PAGO trazem falta; sem valor conferido, não limita.
      v_sem_limite := v_hon;
      v_lim := (exito_situacao(p_escritorio, p_caso, p_cliente) ->> 'falta')::bigint;
      if v_lim is not null and v_hon > v_lim then v_hon := v_lim; v_limitado := true; end if;$q$);
-- A linha de honorários inteira numa troca só (o corpo precisa ficar válido a cada troca).
select t1102_trocar('repasse_proposta_sem_exito(uuid,uuid,uuid,bigint)',
  $q$        v_linhas := v_linhas || jsonb_build_object('para', 'HONORARIOS', 'nome', 'Honorários de êxito',
          'regra', format('%s%% · %s · contrato %s',
                          replace(rtrim(rtrim(to_char((v_exito.params ->> 'percentual')::numeric / 100, 'FM9990.00'), '0'), '.'), '.', ','),
                          v_exito.params ->> 'sobre', v_contrato.numero),
          'valor', v_hon);$q$,
  $q$        v_linhas := v_linhas || (jsonb_build_object('para', 'HONORARIOS', 'nome', 'Honorários de êxito',
          'regra', left(format('%s%% · %s · contrato %s',
                               replace(rtrim(rtrim(to_char((v_exito.params ->> 'percentual')::numeric / 100, 'FM9990.00'), '0'), '.'), '.', ','),
                               v_exito.params ->> 'sobre', v_contrato.numero)
                        -- F3.199 (C3): a regra diz que o valor foi limitado.
                        || case when v_limitado then ' · até o que falta do êxito' else '' end, 200),
          'valor', v_hon)
          -- F3.199: o valor pelo percentual do contrato, só quando o limite foi aplicado.
          || case when v_limitado then jsonb_build_object('semLimite', v_sem_limite) else '{}'::jsonb end);$q$);

-- O seguiuProposta compara as partes registradas com as linhas da proposta, sem o semLimite
-- (que é só da tela).
select t1102_trocar(t1102_achar($q$'seguiuProposta', repasse_proposta(p_escritorio, l.caso_id, l.cliente_id, l.valor) -> 'linhas' = ($q$),
  $q$'seguiuProposta', repasse_proposta(p_escritorio, l.caso_id, l.cliente_id, l.valor) -> 'linhas' = ($q$,
  $q$'seguiuProposta', (select coalesce(jsonb_agg(y - 'semLimite' order by o), '[]'::jsonb)
                                           from jsonb_array_elements(repasse_proposta(p_escritorio, l.caso_id, l.cliente_id, l.valor) -> 'linhas') with ordinality t(y, o)) = ($q$);

-- ---------------------------------------------------------------------------------------
-- 4c. A linha da parte diz o que ela pagou de parcela do êxito (A2.9). A ficha, o Início e a fila
-- da prestação recebem o campo sem outra troca.
select t1102_trocar('destinacao_linha(destinacoes)',
  $q$    'contaId', d.conta_id,$q$,
  $q$    'contaId', d.conta_id,
    'pagou', destinacao_pagou(d),$q$);

-- ---------------------------------------------------------------------------------------
-- 5. O registrar (o embrulho da 0651 com a 1100, achado pelo conteúdo): depois de travar as
-- parcelas do êxito, trava a linha do êxito para conferir do cliente no caso, a mesma que o lançar
-- trava. Com o lançar primeiro, o registrar espera e já vê a parcela nova; com o registrar
-- primeiro, o lançar espera e já vê a parte nova. A F3.191 reaproveita esta trava.
select t1102_trocar(t1102_achar('exito_parcelas_abertas(p_escritorio, l.caso_id, l.cliente_id)'),
  $q$     order by r.id for update of r;$q$,
  $q$     order by r.id for update of r;
    -- F3.199: a corrida com o lançar do êxito deste cliente no caso.
    perform 1 from exitos_conferir x
     where x.escritorio_id = p_escritorio and x.caso_id = v_caso and x.cliente_id = v_cliente
       for share;$q$);

drop function t1102_trocar(regprocedure, text, text, integer);
drop function t1102_achar(text);

call fechar_acesso();
