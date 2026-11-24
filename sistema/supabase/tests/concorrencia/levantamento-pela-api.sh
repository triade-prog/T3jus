#!/usr/bin/env bash
# A divisão do levantamento pela API com commit de verdade (F3.163; FI-05). A api-portal chama o
# banco como service_role, e no Postgres 17 o gatilho adiado destinacoes_fecham roda com o papel
# ativo no commit. Cada passo é uma transação própria, com commit:
#  a. registrar o alvará com a divisão: o commit passa e grava o levantamento e as partes;
#  b. marcar a parte do cliente como feita e dispensar a do perito: os dois commits passam;
#  c. uma parte a mais gravada sem o contexto do escritório (como numa migration ou no SQL Editor)
#     é recusada no commit, em vez de passar calada.
set -euo pipefail
PSQL=("${PSQL_BIN:-psql}" -v ON_ERROR_STOP=1 -q -X -tA)
trap '"${PSQL[@]}" -c "drop table if exists teste.lpa" >/dev/null 2>&1 || true' EXIT

"${PSQL[@]}" >/dev/null <<'SQL'
create table teste.lpa as select teste.escritorio('Levantamento pela API') e, teste.pessoa('Sócia do levantamento') s,
  teste.pessoa('Diego do levantamento') d;
select teste.vincular(s, e) from teste.lpa;
select portal_convidar(s, e, d, 'Diego do levantamento', array['FINANCEIRO']) from teste.lpa;
select portal_juridico_etapas(s, e) is not null from teste.lpa;
alter table teste.lpa add column cli uuid, add column caso uuid, add column lev uuid;
update teste.lpa set cli = (portal_cliente_cadastrar(s, e, jsonb_build_object('tipo', 'PF', 'nome', 'Cliente do levantamento', 'origem', 'GOOGLE',
  'contatos', jsonb_build_array(jsonb_build_object('nome', 'Cliente do levantamento', 'telefone', '+5511984229901', 'principal', true)))) ->> 'id')::uuid;
update teste.lpa set caso = (portal_juridico_caso_criar(s, e, jsonb_build_object('nome', 'Levantamento x INSS', 'area', 'PREVIDENCIARIO',
  'etapaId', (select id from etapas where escritorio_id = teste.lpa.e and ordem = 7), 'responsavelId', s,
  'clientes', jsonb_build_array(jsonb_build_object('clienteId', cli, 'papel', 'AUTOR')))) ->> 'id')::uuid;
grant usage on schema teste to service_role;
SQL
read -r E D CLI CASO HOJE < <("${PSQL[@]}" -F ' ' -c "select e, d, cli, caso, hoje_brasilia() from teste.lpa")

# a. Registrar, como a API: service_role e commit.
LEV=$("${PSQL[@]}" <<SQL | tail -1
begin;
set local role service_role;
select portal_financeiro_levantamento_registrar('$D', '$E', jsonb_build_object('tipo', 'ALVARA', 'casoId', '$CASO', 'clienteId', '$CLI',
  'valor', 100000, 'entrouEm', '$HOJE', 'divisao', jsonb_build_array(
    jsonb_build_object('para', 'CLIENTE', 'valor', 90000),
    jsonb_build_object('para', 'PERITO', 'nome', 'Dr. Paulo Mendes', 'valor', 10000)))) ->> 'id';
commit;
SQL
)
N=$("${PSQL[@]}" -c "select count(*) from destinacoes where levantamento_id = '$LEV'")
[ "$N" = 2 ] || { echo "levantamento-pela-api: esperava 2 partes gravadas depois do commit, veio $N"; exit 1; }

# b. Feito e dispensado, cada um com commit.
read -r DCLI DPER < <("${PSQL[@]}" -F ' ' -c "select (select id from destinacoes where levantamento_id = '$LEV' and para = 'CLIENTE'),
  (select id from destinacoes where levantamento_id = '$LEV' and para = 'PERITO')")
"${PSQL[@]}" >/dev/null <<SQL
begin; set local role service_role;
select portal_financeiro_destinacao_feita('$D', '$E', '$DCLI', jsonb_build_object('feitoEm', '$HOJE'));
commit;
begin; set local role service_role;
select portal_financeiro_destinacao_dispensar('$D', '$E', '$DPER', 'O perito abriu mão');
commit;
SQL
R=$("${PSQL[@]}" -c "select count(*) filter (where feito_em is not null) || ' ' || count(*) filter (where dispensado_em is not null) from destinacoes where levantamento_id = '$LEV'")
[ "$R" = "1 1" ] || { echo "levantamento-pela-api: esperava uma parte feita e uma dispensada, veio $R"; exit 1; }

# c. Uma parte a mais sem o contexto do escritório: o commit recusa.
if "${PSQL[@]}" >/dev/null 2>&1 <<SQL
begin;
insert into destinacoes (escritorio_id, levantamento_id, ordem, para, nome, valor, prazo)
  values ('$E', '$LEV', 9, 'OUTRO', 'Parte a mais', 700, '$HOJE');
commit;
SQL
then echo "levantamento-pela-api: a parte a mais sem contexto passou no commit"; exit 1; fi
N=$("${PSQL[@]}" -c "select count(*) from destinacoes where levantamento_id = '$LEV'")
[ "$N" = 2 ] || { echo "levantamento-pela-api: a parte a mais ficou gravada ($N partes)"; exit 1; }

echo "levantamento-pela-api: ok (registrar, feito e dispensado pela API com commit; sem contexto, recusa)"
