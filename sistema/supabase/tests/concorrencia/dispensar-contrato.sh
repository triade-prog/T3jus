#!/usr/bin/env bash
# Lembretes de contrato (F3.145; VA-05) com duas conexões de verdade: dispensar, trazer de volta
# e o contrato novo do mesmo cliente ao mesmo tempo (correções 6 e 7 da revisão do plano 2).
#  a. o contrato segura a transação: o dispensar espera e recebe "já virou contrato";
#  b. o dispensar segura: o contrato confirma sem resolver o lembrete dispensado;
#  c. o contrato segura e o lembrete está dispensado: o "trazer de volta" espera e o lembrete
#     volta já resolvido, com esse contrato.
set -euo pipefail
PSQL=("${PSQL_BIN:-psql}" -v ON_ERROR_STOP=1 -q -X -tA)
DIR="$(mktemp -d)"
trap 'rm -rf "$DIR"; "${PSQL[@]}" -c "drop table if exists teste.lc" >/dev/null 2>&1 || true' EXIT

"${PSQL[@]}" >/dev/null <<'SQL'
begin;
create table teste.lc as select teste.escritorio('Concorrência dos lembretes') a, teste.pessoa('Sócia dos lembretes') p;
select teste.vincular(p, a) from teste.lc;
select definir_transicao('TESTE_CONCORRENCIA', null, true);
alter table teste.lc add column i uuid, add column ca uuid, add column cb uuid, add column cc uuid,
                     add column la uuid, add column lb uuid, add column lc uuid;
with ins as (insert into importacoes (escritorio_id, arquivo_nome, o_que, criado_por) select a, 'backup.xlsx', 'CLIENTES', p from teste.lc returning id)
update teste.lc set i = (select id from ins);
with n(nome) as (values ('Cliente A'), ('Cliente B'), ('Cliente C')),
ins as (insert into clientes_escritorio (escritorio_id, tipo, nome, contatos, criado_por)
        select lc.a, 'PF', n.nome, jsonb_build_array(jsonb_build_object('id', gen_random_uuid(), 'nome', n.nome, 'telefone', '+5511999990000', 'principal', true)), lc.p
          from teste.lc lc, n returning id, nome)
update teste.lc set ca = (select id from ins where nome = 'Cliente A'), cb = (select id from ins where nome = 'Cliente B'),
                    cc = (select id from ins where nome = 'Cliente C');
insert into lembrete_contrato (escritorio_id, importacao_id, cliente_id, valor_em_aberto_centavos, lancamentos)
select a, i, x, 100000, 1 from teste.lc, unnest(array[ca, cb, cc]) x;
update teste.lc set la = (select id from lembrete_contrato where cliente_id = ca), lb = (select id from lembrete_contrato where cliente_id = cb),
                    lc = (select id from lembrete_contrato where cliente_id = cc);
commit;
SQL

# O contrato pela API, como na tela. $1 = a coluna do cliente; $2 = os segundos que segura a transação.
contrato() {
  "${PSQL[@]}" <<SQL
begin;
select portal_contrato_criar(p, a, jsonb_build_object('clienteId', $1, 'objeto', 'Honorários do processo', 'responsavelId', p,
  'advogados', jsonb_build_array(p),
  'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'MENSAL', 'valor', 50000, 'primeiro', '2027-01-10', 'meses', 2)))) is not null
  from teste.lc;
select pg_sleep($2);
commit;
SQL
}

# a. O contrato segura; o dispensar espera e recebe o conflito.
contrato ca 2 > "$DIR/a1" 2>&1 &
sleep 0.7
a=$("${PSQL[@]}" -c "select teste.erro(format('select portal_lembrete_dispensar(%L, %L, %L, %L)', p, a, la, '{\"motivo\": \"PERDOADO\"}')) -> 'detalhe' ->> 'motivo' from teste.lc" 2>&1)
wait
a_fim=$("${PSQL[@]}" -c "select (resolvido_em is not null)::text || ' ' || coalesce(dispensa_motivo, '-') from lembrete_contrato, teste.lc where id = la")

# b. O dispensar segura; o contrato confirma sem resolver o dispensado.
"${PSQL[@]}" > "$DIR/b1" 2>&1 <<'SQL' &
begin;
select portal_lembrete_dispensar(p, a, lb, '{"motivo": "PERDOADO"}') is not null from teste.lc;
select pg_sleep(2);
commit;
SQL
sleep 0.7
contrato cb 0 > "$DIR/b2" 2>&1
wait
b_fim=$("${PSQL[@]}" -c "select (resolvido_em is not null)::text || ' ' || coalesce(dispensa_motivo, '-') from lembrete_contrato, teste.lc where id = lb")

# c. O lembrete está dispensado e o contrato segura; o "trazer de volta" espera o contrato.
"${PSQL[@]}" -c "select portal_lembrete_dispensar(p, a, lc, '{\"motivo\": \"PERDOADO\"}') is not null from teste.lc" >/dev/null
contrato cc 2 > "$DIR/c1" 2>&1 &
sleep 0.7
"${PSQL[@]}" -c "select portal_lembrete_trazer(p, a, lc) -> 'lembrete' ->> 'situacao' from teste.lc" > "$DIR/c2" 2>&1
wait
c_fim=$("${PSQL[@]}" -c "select (contrato_id = (select id from contratos where cliente_id = cc))::text || ' ' || coalesce(dispensa_motivo, '-')
                         from lembrete_contrato, teste.lc where id = lc")

if [ "$a" != "JA_RESOLVIDO" ] || [ "$a_fim" != "true -" ] || [ "$b_fim" != "false PERDOADO" ] \
   || [ "$(tr -d '[:space:]' < "$DIR/c2")" != "CONTRATO" ] || [ "$c_fim" != "true -" ]; then
  echo "Lembretes ao mesmo tempo: falhou (a: $a / $a_fim / $(cat "$DIR/a1"); b: $b_fim / $(cat "$DIR/b2"); c: $(cat "$DIR/c2") / $c_fim)"
  exit 1
fi
echo "Lembretes ao mesmo tempo: ok (o dispensar espera o contrato; o contrato não resolve o dispensado; o trazer de volta espera o contrato)"
