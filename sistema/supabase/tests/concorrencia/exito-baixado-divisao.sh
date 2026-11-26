#!/usr/bin/env bash
# O êxito com baixa sem receber e a divisão do alvará ao mesmo tempo (F3.174; FI-24, FI-05), com duas
# conexões de verdade como service_role e commit de verdade (o gatilho adiado da divisão e o
# caso_pronto_fim rodam no commit). O registrar trava as parcelas do êxito, a mesma linha que a
# baixa trava, e a corrida termina numa ordem só:
#  a. a baixa trava a parcela e segura; o registrar, com exitoBaixadoVisto = [], espera e recusa
#     com EXITO_MUDOU, sem gravar nada;
#  b. o registrar trava a parcela e segura; a baixa espera e recusa com PARCELA_JA_PAGA (a divisão
#     pagou a parcela).
set -euo pipefail
PSQL=("${PSQL_BIN:-psql}" -v ON_ERROR_STOP=1 -q -X -tA)
DIR="$(mktemp -d)"
trap 'rm -rf "$DIR"; "${PSQL[@]}" -c "drop table if exists teste.ebd" >/dev/null 2>&1 || true' EXIT

"${PSQL[@]}" >/dev/null <<'SQL'
begin;
create table teste.ebd as select teste.escritorio('Concorrência do êxito baixado') e, teste.pessoa('Sócia do êxito') s,
  teste.pessoa('Diego do êxito') d, teste.pessoa('Bianca do êxito') b, teste.pessoa('Larissa do êxito') j;
select teste.vincular(s, e) from teste.ebd;
select portal_convidar(s, e, d, 'Diego do êxito', array['FINANCEIRO']), portal_convidar(s, e, b, 'Bianca do êxito', array['FINANCEIRO']),
       portal_convidar(s, e, j, 'Larissa do êxito', array['JURIDICO']) from teste.ebd;
select portal_juridico_casos(s, e) is not null from teste.ebd;
-- Um cliente com contrato de êxito (30%), o caso encerrado com acordo e a parcela do êxito vencida.
create function pg_temp.caso(p_nome text, p_tel text) returns uuid language plpgsql as $$
declare
  x teste.ebd;
  v_cli uuid;
  v_ct uuid;
  v_caso uuid;
begin
  select * into x from teste.ebd;
  v_cli := (portal_cliente_cadastrar(x.s, x.e, jsonb_build_object('tipo', 'PF', 'nome', p_nome, 'origem', 'GOOGLE',
    'contatos', jsonb_build_array(jsonb_build_object('nome', p_nome, 'telefone', p_tel, 'principal', true)))) ->> 'id')::uuid;
  v_ct := (portal_contrato_criar(x.s, x.e, jsonb_build_object('clienteId', v_cli, 'objeto', 'Revisão bancária', 'responsavelId', x.s,
    'advogados', jsonb_build_array(x.s), 'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'EXITO', 'percentual', 3000,
    'sobre', 'acordo', 'etapa', 'Encerrado', 'dias', 0)))) ->> 'id')::uuid;
  perform portal_contrato_assinatura(x.s, x.e, v_ct, 1, hoje_brasilia());
  v_caso := (portal_juridico_caso_criar(x.s, x.e, jsonb_build_object('nome', p_nome || ' x Banco', 'area', 'CIVEL',
    'etapaId', (select id from etapas where escritorio_id = x.e and ordem = 5), 'responsavelId', x.j,
    'clientes', jsonb_build_array(jsonb_build_object('clienteId', v_cli, 'papel', 'AUTOR', 'contratoId', v_ct)))) ->> 'id')::uuid;
  perform portal_juridico_caso_etapa(x.j, x.e, v_caso, (select versao from casos where id = v_caso), jsonb_build_object(
    'etapaId', (select id from etapas where escritorio_id = x.e and final), 'motivo', 'Acordo homologado', 'resultado', 'ACORDO',
    'previstoEm', hoje_brasilia(), 'valores', jsonb_build_object(v_cli, 1000000)));
  perform portal_financeiro_exito_lancar(x.d, x.e, (select id from exitos_conferir where caso_id = v_caso),
    jsonb_build_object('valor', 300000, 'vencimento', hoje_brasilia() - 10, 'forma', 'PIX'));
  return v_caso;
end $$;
alter table teste.ebd add column ka uuid, add column kb uuid;
update teste.ebd set ka = pg_temp.caso('Êxito Baixa Antes', '+5511984220101'), kb = pg_temp.caso('Êxito Registrar Antes', '+5511984220102');
alter table teste.ebd add column ca uuid, add column cb uuid, add column pa uuid, add column pb uuid;
update teste.ebd set ca = (select cliente_id from caso_clientes where caso_id = ka), cb = (select cliente_id from caso_clientes where caso_id = kb);
update teste.ebd set pa = (select r.id from recebimentos_previstos r join exitos_conferir x on x.id = r.exito_id where x.caso_id = ka),
                     pb = (select r.id from recebimentos_previstos r join exitos_conferir x on x.id = r.exito_id where x.caso_id = kb);
grant usage on schema teste to service_role;
commit;
SQL

read -r E D B KA KB CA CB PA PB <<<"$("${PSQL[@]}" -F ' ' -c "select e, d, b, ka, kb, ca, cb, pa, pb from teste.ebd")"
HOJE=$("${PSQL[@]}" -c "select hoje_brasilia()")
baixar() { echo "select portal_financeiro_parcela_baixar('$1', '$E', '$2', jsonb_build_object('motivo', 'INADIMPLENCIA', 'explicacao', 'O cliente não pagou', 'falta', 300000)) is not null;"; }
registrar() { echo "select portal_financeiro_levantamento_registrar('$D', '$E', jsonb_build_object('tipo', 'ALVARA', 'casoId', '$1', 'clienteId', '$2',
  'valor', 1000000, 'entrouEm', '$HOJE', 'exitoBaixadoVisto', '[]'::jsonb, 'divisao', jsonb_build_array(
    jsonb_build_object('para', 'CLIENTE', 'valor', 700000), jsonb_build_object('para', 'HONORARIOS', 'nome', 'Honorários de êxito', 'valor', 300000)))) is not null;"; }

# a. A baixa trava a parcela e segura; o registrar espera e recusa com EXITO_MUDOU.
"${PSQL[@]}" > "$DIR/a1" 2>&1 <<SQL &
begin;
set local role service_role;
$(baixar "$B" "$PA")
select pg_sleep(2);
commit;
SQL
sleep 0.7
"${PSQL[@]}" > "$DIR/a2" 2>&1 <<SQL || true
begin;
set local role service_role;
$(registrar "$KA" "$CA")
commit;
SQL
wait

# b. O registrar trava a parcela e segura; a baixa espera e recusa com PARCELA_JA_PAGA.
"${PSQL[@]}" > "$DIR/b1" 2>&1 <<SQL &
begin;
set local role service_role;
$(registrar "$KB" "$CB")
select pg_sleep(2);
commit;
SQL
sleep 0.7
"${PSQL[@]}" > "$DIR/b2" 2>&1 <<SQL || true
begin;
set local role service_role;
$(baixar "$B" "$PB")
commit;
SQL
wait

resultado=$("${PSQL[@]}" <<'SQL'
select (select (baixa_id is not null)::text from recebimentos_previstos r, teste.ebd where r.id = pa) || ' '
    || (select count(*) from levantamentos l, teste.ebd where l.caso_id = ka) || ' '
    || (select parcela_linha(r) ->> 'situacao' from recebimentos_previstos r, teste.ebd where r.id = pb) || ' '
    || (select count(*) from parcela_baixas x, teste.ebd where x.parcela_id = pb) || ' '
    || (select count(*) from levantamentos l, teste.ebd where l.caso_id = kb)
  from teste.ebd;
SQL
)

if [ "$resultado" != "true 0 PAGA 0 1" ] || ! grep -q "EXITO_MUDOU" "$DIR/a2" || ! grep -q "PARCELA_JA_PAGA" "$DIR/b2" \
   || grep -qi "error\|deadlock" "$DIR/a1" "$DIR/b1"; then
  echo "exito-baixado-divisao: esperava 'true 0 PAGA 0 1', EXITO_MUDOU e PARCELA_JA_PAGA; veio '$resultado'"
  for f in a1 a2 b1 b2; do echo "--- $f"; cat "$DIR/$f"; done
  exit 1
fi
echo "Êxito baixado e divisão ao mesmo tempo: ok (a baixa antes: o registrar espera e recusa com EXITO_MUDOU; o registrar antes: a baixa espera e recusa com PARCELA_JA_PAGA)"
