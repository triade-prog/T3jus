#!/usr/bin/env bash
# O êxito não cobrado e a divisão do alvará ao mesmo tempo (F3.191; CH-07, FI-05), com duas conexões
# de verdade como service_role e commit de verdade. O "Não cobrar" trava a linha do êxito para
# conferir (for update); o registrar trava a mesma linha com for share, ou com for update quando
# traz o "Cobrar" (1104, o modo escolhido antes de travar). As corridas terminam numa ordem só, sem
# deadlock:
#  a. o "Não cobrar" segura; o registrar, com a proposta vista sem não cobrado, espera e recusa com
#     EXITO_MUDOU;
#  b. o registrar sem honorários segura; o "Não cobrar" espera e passa depois;
#  c. dois registrares com "Cobrar" do mesmo êxito, cada um com o êxito inteiro: o for update os põe
#     em fila, o primeiro passa e o segundo recusa com um EXITO_ACIMA_DO_CALCULADO, sem 40P01.
set -euo pipefail
PSQL=("${PSQL_BIN:-psql}" -v ON_ERROR_STOP=1 -q -X -tA)
DIR="$(mktemp -d)"
trap 'rm -rf "$DIR"; "${PSQL[@]}" -c "drop table if exists teste.enc" >/dev/null 2>&1 || true' EXIT

"${PSQL[@]}" >/dev/null <<'SQL'
begin;
create table teste.enc as select teste.escritorio('Concorrência do êxito não cobrado') e, teste.pessoa('Sócia do não cobrado') s,
  teste.pessoa('Diego do não cobrado') d, teste.pessoa('Bianca do não cobrado') b, teste.pessoa('Larissa do não cobrado') j;
select teste.vincular(s, e) from teste.enc;
select portal_convidar(s, e, d, 'Diego do não cobrado', array['FINANCEIRO']), portal_convidar(s, e, b, 'Bianca do não cobrado', array['FINANCEIRO']),
       portal_convidar(s, e, j, 'Larissa do não cobrado', array['JURIDICO']) from teste.enc;
select portal_juridico_casos(s, e) is not null from teste.enc;
-- Um cliente com contrato de êxito (30%) e o caso encerrado com acordo de R$ 10.000,00: o êxito
-- (R$ 3.000,00) fica para conferir. Com p_nao_cobrar, a sócia já o marca como perdoado.
create function pg_temp.caso(p_nome text, p_tel text, p_nao_cobrar boolean) returns uuid language plpgsql as $$
declare
  x teste.enc;
  v_cli uuid;
  v_ct uuid;
  v_caso uuid;
begin
  select * into x from teste.enc;
  v_cli := (portal_cliente_cadastrar(x.s, x.e, jsonb_build_object('tipo', 'PF', 'nome', p_nome, 'origem', 'GOOGLE',
    'contatos', jsonb_build_array(jsonb_build_object('nome', p_nome, 'telefone', p_tel, 'principal', true)))) ->> 'id')::uuid;
  v_ct := (portal_contrato_criar(x.s, x.e, jsonb_build_object('clienteId', v_cli, 'objeto', 'Vícios na obra', 'responsavelId', x.s,
    'advogados', jsonb_build_array(x.s), 'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'EXITO', 'percentual', 3000,
    'sobre', 'acordo', 'etapa', 'Encerrado', 'dias', 0)))) ->> 'id')::uuid;
  perform portal_contrato_assinatura(x.s, x.e, v_ct, 1, hoje_brasilia());
  v_caso := (portal_juridico_caso_criar(x.s, x.e, jsonb_build_object('nome', p_nome || ' x Construtora', 'area', 'CIVEL',
    'etapaId', (select id from etapas where escritorio_id = x.e and ordem = 5), 'responsavelId', x.j,
    'clientes', jsonb_build_array(jsonb_build_object('clienteId', v_cli, 'papel', 'AUTOR', 'contratoId', v_ct)))) ->> 'id')::uuid;
  perform portal_juridico_caso_etapa(x.j, x.e, v_caso, (select versao from casos where id = v_caso), jsonb_build_object(
    'etapaId', (select id from etapas where escritorio_id = x.e and final), 'motivo', 'Acordo homologado', 'resultado', 'ACORDO',
    'previstoEm', hoje_brasilia() + 20, 'valores', jsonb_build_object(v_cli, 1000000)));
  if p_nao_cobrar then
    perform portal_financeiro_exito_nao_cobrar(x.s, x.e, (select id from exitos_conferir where caso_id = v_caso),
      '{"motivo": "PERDOADO", "explicacao": "Indicou dois clientes"}');
  end if;
  return v_caso;
end $$;
alter table teste.enc add column ka uuid, add column kb uuid, add column kc uuid;
update teste.enc set ka = pg_temp.caso('Não Cobrar Antes', '+5511984220301', false), kb = pg_temp.caso('Registrar Antes', '+5511984220302', false),
                     kc = pg_temp.caso('Cobrar Duas Vezes', '+5511984220303', true);
alter table teste.enc add column ca uuid, add column cb uuid, add column cc uuid, add column xa uuid, add column xb uuid, add column xc uuid;
update teste.enc set ca = (select cliente_id from caso_clientes where caso_id = ka), cb = (select cliente_id from caso_clientes where caso_id = kb),
  cc = (select cliente_id from caso_clientes where caso_id = kc), xa = (select id from exitos_conferir where caso_id = ka),
  xb = (select id from exitos_conferir where caso_id = kb), xc = (select id from exitos_conferir where caso_id = kc);
grant usage on schema teste to service_role;
commit;
SQL

read -r E D B KA KB KC CA CB CC XA XB XC <<<"$("${PSQL[@]}" -F ' ' -c "select e, d, b, ka, kb, kc, ca, cb, cc, xa, xb, xc from teste.enc")"
HOJE=$("${PSQL[@]}" -c "select hoje_brasilia()")
# $1 caso, $2 cliente, $3 honorários, $4 campos a mais (jsonb)
registrar() { echo "select portal_financeiro_levantamento_registrar('$D', '$E', jsonb_build_object('tipo', 'ALVARA', 'casoId', '$1', 'clienteId', '$2',
  'valor', 1000000, 'entrouEm', '$HOJE', 'exitoBaixadoVisto', '[]'::jsonb, 'divisao', jsonb_build_array(jsonb_build_object('para', 'CLIENTE', 'valor', 1000000 - $3))
    || case when $3 > 0 then jsonb_build_array(jsonb_build_object('para', 'HONORARIOS', 'nome', 'Honorários de êxito', 'valor', $3)) else '[]'::jsonb end)
  || '$4'::jsonb) is not null;"; }
nao_cobrar() { echo "select portal_financeiro_exito_nao_cobrar('$B', '$E', '$1', '{\"motivo\": \"PERDOADO\", \"explicacao\": \"Renegociado com o cliente\"}') is not null;"; }
COBRAR="{\"exitoNaoCobradoVisto\": [\"$XC\"], \"cobrarExitoNaoCobrado\": {\"exitoId\": \"$XC\", \"explicacao\": \"O cliente aceitou pagar com o alvará\", \"clienteConcordou\": true}}"

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

corrida a "$(nao_cobrar "$XA")" "$(registrar "$KA" "$CA" 300000 '{"exitoNaoCobradoVisto": []}')"
corrida b "$(registrar "$KB" "$CB" 0 '{"exitoNaoCobradoVisto": []}')" "$(nao_cobrar "$XB")"
corrida c "$(registrar "$KC" "$CC" 300000 "$COBRAR")" "$(registrar "$KC" "$CC" 300000 "$COBRAR")"

resultado=$("${PSQL[@]}" <<'SQL'
-- Para cada caso: a situação do êxito / quantos levantamentos / quantas cobranças no alvará.
create function pg_temp.r(p_caso uuid, p_exito uuid) returns text language sql as $$
  select (select situacao from exitos_conferir where id = p_exito) || '/' || (select count(*) from levantamentos where caso_id = p_caso)
      || '/' || (select count(*) from exito_cobrancas_alvara where exito_id = p_exito)
$$;
select pg_temp.r(ka, xa) || ' ' || pg_temp.r(kb, xb) || ' ' || pg_temp.r(kc, xc)
    || ' ' || (select coalesce(sum(valor), 0) from exito_cobrancas_alvara where exito_id = xc) from teste.enc;
SQL
)

esperado="NAO_COBRADO/0/0 NAO_COBRADO/1/0 NAO_COBRADO/1/1 300000"
if [ "$resultado" != "$esperado" ] || ! grep -q "EXITO_MUDOU" "$DIR/a-2" \
   || [ "$(grep -c "EXITO_ACIMA_DO_CALCULADO" "$DIR/c-2")" != 1 ] \
   || grep -qi "deadlock\|40P01" "$DIR/a-1" "$DIR/a-2" "$DIR/b-1" "$DIR/b-2" "$DIR/c-1" "$DIR/c-2" \
   || grep -qi "error" "$DIR/a-1" "$DIR/b-1" "$DIR/b-2" "$DIR/c-1"; then
  echo "exito-nao-cobrado-divisao: esperava '$esperado', EXITO_MUDOU e um EXITO_ACIMA_DO_CALCULADO; veio '$resultado'"
  for f in a-1 a-2 b-1 b-2 c-1 c-2; do echo "--- $f"; cat "$DIR/$f"; done
  exit 1
fi
echo "Êxito não cobrado e divisão ao mesmo tempo: ok (o \"Não cobrar\" antes faz o registrar recusar com EXITO_MUDOU; o registrar sem honorários antes deixa o \"Não cobrar\" passar; dois \"Cobrar\" do mesmo êxito ficam em fila e o segundo recusa com EXITO_ACIMA_DO_CALCULADO, sem deadlock)"
