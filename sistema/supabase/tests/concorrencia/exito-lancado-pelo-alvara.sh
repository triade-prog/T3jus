#!/usr/bin/env bash
# O êxito lançado e a divisão do alvará ao mesmo tempo (F3.199; CH-07, FI-05), com duas conexões de
# verdade como service_role e commit de verdade. O registrar trava a linha do êxito para conferir
# (for share), a mesma que o lançar trava (for update), e o lançar trava a parte de honorários antes
# de pagar com ela, a mesma que o "Dispensar" trava antes de conferir. As corridas terminam numa
# ordem só, sem deadlock:
#  a. o lançar segura; o registrar espera e, na 0651, paga a parcela nova uma vez só;
#  b. o registrar segura; o lançar espera e paga a parcela com a parte nova uma vez só;
#  c. o lançar segura (já pagou com a parte); o "Dispensar" da mesma parte espera e recusa com BAIXOU_EXITO;
#  d. o "Dispensar" segura; o lançar espera, pula a parte dispensada, e a parcela nasce aberta.
set -euo pipefail
PSQL=("${PSQL_BIN:-psql}" -v ON_ERROR_STOP=1 -q -X -tA)
DIR="$(mktemp -d)"
trap 'rm -rf "$DIR"; "${PSQL[@]}" -c "drop table if exists teste.ela" >/dev/null 2>&1 || true' EXIT

"${PSQL[@]}" >/dev/null <<'SQL'
begin;
create table teste.ela as select teste.escritorio('Concorrência do êxito lançado') e, teste.pessoa('Sócia do lançado') s,
  teste.pessoa('Diego do lançado') d, teste.pessoa('Bianca do lançado') b, teste.pessoa('Larissa do lançado') j;
select teste.vincular(s, e) from teste.ela;
select portal_convidar(s, e, d, 'Diego do lançado', array['FINANCEIRO']), portal_convidar(s, e, b, 'Bianca do lançado', array['FINANCEIRO']),
       portal_convidar(s, e, j, 'Larissa do lançado', array['JURIDICO']) from teste.ela;
select portal_juridico_casos(s, e) is not null from teste.ela;
-- Um cliente com contrato de êxito (30%) e o caso encerrado com acordo: o êxito fica para conferir.
-- Com p_alvara, um alvará de R$ 10.000,00 (R$ 3.000,00 de honorários) entra antes.
create function pg_temp.caso(p_nome text, p_tel text, p_alvara boolean) returns uuid language plpgsql as $$
declare
  x teste.ela;
  v_cli uuid;
  v_ct uuid;
  v_caso uuid;
begin
  select * into x from teste.ela;
  v_cli := (portal_cliente_cadastrar(x.s, x.e, jsonb_build_object('tipo', 'PF', 'nome', p_nome, 'origem', 'GOOGLE',
    'contatos', jsonb_build_array(jsonb_build_object('nome', p_nome, 'telefone', p_tel, 'principal', true)))) ->> 'id')::uuid;
  v_ct := (portal_contrato_criar(x.s, x.e, jsonb_build_object('clienteId', v_cli, 'objeto', 'Vícios na obra', 'responsavelId', x.s,
    'advogados', jsonb_build_array(x.s), 'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'EXITO', 'percentual', 3000,
    'sobre', 'acordo', 'etapa', 'Encerrado', 'dias', 0)))) ->> 'id')::uuid;
  perform portal_contrato_assinatura(x.s, x.e, v_ct, 1, hoje_brasilia());
  v_caso := (portal_juridico_caso_criar(x.s, x.e, jsonb_build_object('nome', p_nome || ' x Construtora', 'area', 'CIVEL',
    'etapaId', (select id from etapas where escritorio_id = x.e and ordem = 5), 'responsavelId', x.j,
    'clientes', jsonb_build_array(jsonb_build_object('clienteId', v_cli, 'papel', 'AUTOR', 'contratoId', v_ct)))) ->> 'id')::uuid;
  if p_alvara then
    perform portal_financeiro_levantamento_registrar(x.d, x.e, jsonb_build_object('tipo', 'ALVARA', 'casoId', v_caso, 'clienteId', v_cli,
      'valor', 1000000, 'entrouEm', hoje_brasilia(), 'exitoBaixadoVisto', '[]'::jsonb, 'divisao', jsonb_build_array(
        jsonb_build_object('para', 'CLIENTE', 'valor', 700000), jsonb_build_object('para', 'HONORARIOS', 'nome', 'Honorários de êxito', 'valor', 300000))));
  end if;
  perform portal_juridico_caso_etapa(x.j, x.e, v_caso, (select versao from casos where id = v_caso), jsonb_build_object(
    'etapaId', (select id from etapas where escritorio_id = x.e and final), 'motivo', 'Acordo homologado', 'resultado', 'ACORDO',
    'previstoEm', hoje_brasilia() + 20, 'valores', jsonb_build_object(v_cli, 1000000)));
  return v_caso;
end $$;
alter table teste.ela add column ka uuid, add column kb uuid, add column kc uuid, add column kd uuid;
update teste.ela set ka = pg_temp.caso('Lançar Antes', '+5511984220201', false), kb = pg_temp.caso('Registrar Antes', '+5511984220202', false),
                     kc = pg_temp.caso('Lançar Antes Dispensa', '+5511984220203', true), kd = pg_temp.caso('Dispensar Antes', '+5511984220204', true);
alter table teste.ela add column ca uuid, add column cb uuid, add column xa uuid, add column xb uuid, add column xc uuid, add column xd uuid,
  add column hc uuid, add column hd uuid;
update teste.ela set ca = (select cliente_id from caso_clientes where caso_id = ka), cb = (select cliente_id from caso_clientes where caso_id = kb),
  xa = (select id from exitos_conferir where caso_id = ka), xb = (select id from exitos_conferir where caso_id = kb),
  xc = (select id from exitos_conferir where caso_id = kc), xd = (select id from exitos_conferir where caso_id = kd),
  hc = (select d.id from destinacoes d join levantamentos l on l.id = d.levantamento_id where l.caso_id = kc and d.para = 'HONORARIOS'),
  hd = (select d.id from destinacoes d join levantamentos l on l.id = d.levantamento_id where l.caso_id = kd and d.para = 'HONORARIOS');
grant usage on schema teste to service_role;
commit;
SQL

read -r E D B KA KB CA CB XA XB XC XD HC HD <<<"$("${PSQL[@]}" -F ' ' -c "select e, d, b, ka, kb, ca, cb, xa, xb, xc, xd, hc, hd from teste.ela")"
HOJE=$("${PSQL[@]}" -c "select hoje_brasilia()")
lancar() { echo "select portal_financeiro_exito_lancar('$D', '$E', '$1', jsonb_build_object('valor', 300000, 'vencimento', '$HOJE'::date + 20, 'forma', 'PIX')) is not null;"; }
registrar() { echo "select portal_financeiro_levantamento_registrar('$D', '$E', jsonb_build_object('tipo', 'ALVARA', 'casoId', '$1', 'clienteId', '$2',
  'valor', 1000000, 'entrouEm', '$HOJE', 'exitoBaixadoVisto', '[]'::jsonb, 'divisao', jsonb_build_array(
    jsonb_build_object('para', 'CLIENTE', 'valor', 700000), jsonb_build_object('para', 'HONORARIOS', 'nome', 'Honorários de êxito', 'valor', 300000)))) is not null;"; }
dispensar() { echo "select portal_financeiro_destinacao_dispensar('$B', '$E', '$1', 'Combinado com o cliente') is not null;"; }

# Um segura (com pg_sleep) e o outro chega 0,7 s depois.
corrida() { # $1 nome, $2 sql do primeiro, $3 sql do segundo
  "${PSQL[@]}" > "$DIR/$1-1" 2>&1 <<SQL &
begin;
set local role service_role;
$2
select pg_sleep(2);
commit;
SQL
  sleep 0.7
  "${PSQL[@]}" > "$DIR/$1-2" 2>&1 <<SQL || true
begin;
set local role service_role;
$3
commit;
SQL
  wait
}

corrida a "$(lancar "$XA")" "$(registrar "$KA" "$CA")"
corrida b "$(registrar "$KB" "$CB")" "$(lancar "$XB")"
corrida c "$(lancar "$XC")" "$(dispensar "$HC")"
corrida d "$(dispensar "$HD")" "$(lancar "$XD")"

resultado=$("${PSQL[@]}" <<'SQL'
-- Para cada caso: quantos recebimentos pela divisão a parcela do êxito tem, a soma e a situação da parcela.
create function pg_temp.r(p_exito uuid) returns text language sql as $$
  select count(p.id) || '/' || coalesce(sum(p.valor), 0) || '/' || (select parcela_linha(r) ->> 'situacao' from recebimentos_previstos r where r.exito_id = p_exito)
    from recebimentos_previstos r left join pagamentos_recebidos p on p.parcela_id = r.id and p.destinacao_id is not null
   where r.exito_id = p_exito
$$;
select pg_temp.r(xa) || ' ' || pg_temp.r(xb) || ' ' || pg_temp.r(xc) || ' ' || pg_temp.r(xd) || ' '
    || (select (dispensado_em is not null)::text from destinacoes where id = hc) || ' '
    || (select (dispensado_em is not null)::text from destinacoes where id = hd)
  from teste.ela;
SQL
)

esperado="1/300000/PAGA 1/300000/PAGA 1/300000/PAGA 0/0/A_VENCER false true"
if [ "$resultado" != "$esperado" ] || ! grep -q "BAIXOU_EXITO" "$DIR/c-2" || grep -qi "error\|deadlock" "$DIR/a-1" "$DIR/a-2" "$DIR/b-1" "$DIR/b-2" "$DIR/c-1" "$DIR/d-1" "$DIR/d-2"; then
  echo "exito-lancado-pelo-alvara: esperava '$esperado' e BAIXOU_EXITO; veio '$resultado'"
  for f in a-1 a-2 b-1 b-2 c-1 c-2 d-1 d-2; do echo "--- $f"; cat "$DIR/$f"; done
  exit 1
fi
echo "Êxito lançado e divisão ao mesmo tempo: ok (lançar e registrar nas duas ordens pagam a parcela uma vez; lançar antes do \"Dispensar\" recusa com BAIXOU_EXITO; \"Dispensar\" antes deixa a parcela aberta)"
