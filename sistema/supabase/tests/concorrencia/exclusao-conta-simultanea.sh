#!/usr/bin/env bash
# F3.156 (PT-11; revisão da F3.156, m2) com duas conexões de verdade: a despesa adiantada e o arquivo
# dela lançados ao mesmo tempo que a exclusão a pedido do titular não escapam da regra.
#  1. A exclusão chega primeiro e segura a transação: a conta nova para o cliente espera e, quando a
#     exclusão confirma, é recusada no campo clienteId (TC422).
#  2. A exclusão chega primeiro: o arquivo novo numa conta do cliente espera e nasce com o nome neutro.
#  3. O arquivo chega primeiro e segura a transação: a exclusão espera e, quando ele confirma, já o vê
#     e troca o nome pelo tipo; a descrição da conta vira o texto fixo.
set -euo pipefail
PSQL=("${PSQL_BIN:-psql}" -v ON_ERROR_STOP=1 -q -X -tA)
DIR="$(mktemp -d)"
trap 'rm -rf "$DIR"' EXIT

# Os dados ficam confirmados (cada conexão precisa vê-los); este script roda no banco temporário
# do test-db.sh, depois dos testes pgTAP.
"${PSQL[@]}" >/dev/null <<'SQL'
create table teste.conta_ids as select teste.escritorio('Concorrência da despesa') as esc, teste.pessoa('Sócia da despesa') as socia;
select teste.vincular(socia, esc) from teste.conta_ids;
create function teste.conta_cliente(p_nome text) returns uuid language sql as $$
  select (portal_cliente_cadastrar(socia, esc, jsonb_build_object('tipo', 'PF', 'nome', p_nome, 'origem', 'GOOGLE',
    'contatos', jsonb_build_array(jsonb_build_object('nome', p_nome, 'telefone', '+5511984723316', 'principal', true)))) ->> 'id')::uuid
  from teste.conta_ids $$;
create function teste.conta_nova(p_cliente uuid, p_desc text) returns uuid language sql as $$
  insert into contas_pagar (escritorio_id, descricao, categoria, valor, vencimento, cliente_id, reembolso_como, autor_id)
  select esc, p_desc, 'CUSTAS', 1000, date '2026-12-01', p_cliente, 'A_PARTE', socia from teste.conta_ids returning id $$;
alter table teste.conta_ids add column um uuid, add column dois uuid, add column tres uuid, add column conta_dois uuid, add column conta_tres uuid;
update teste.conta_ids set um = teste.conta_cliente('Zé Primeiro'), dois = teste.conta_cliente('Lia Segunda'), tres = teste.conta_cliente('Rui Terceiro');
update teste.conta_ids set conta_dois = teste.conta_nova(dois, 'Custas de Lia Segunda'), conta_tres = teste.conta_nova(tres, 'Custas de Rui Terceiro');
SQL

excluir="select definir_transicao('EXCLUIU', null, true);
update clientes_escritorio set estado = 'EXCLUIDO', excluido_em = app_now(), nome = 'Cliente excluído', contatos = '[]'"
anexar="insert into anexos (escritorio_id, conta_id, categoria, nome, tipo, tamanho, enviado_por)
select esc, %s, 'NOTA_FISCAL', 'NF do cliente.pdf', 'application/pdf', 10, socia from teste.conta_ids"

# 1. A exclusão primeiro; a conta nova espera e é recusada.
"${PSQL[@]}" > "$DIR/um" 2>&1 <<SQL &
begin;
$excluir where id = (select um from teste.conta_ids);
select pg_sleep(2);
commit;
SQL
sleep 0.7
um=$("${PSQL[@]}" -c "select coalesce(teste.erro(\$q\$ select teste.conta_nova(um, 'Custas de Zé') from teste.conta_ids \$q\$) -> 'detalhe' ->> 'campos', 'aceita')" 2>&1)
wait
um_contas=$("${PSQL[@]}" -c "select count(*) from contas_pagar where cliente_id = (select um from teste.conta_ids)")

# 2. A exclusão primeiro; o arquivo novo espera e nasce neutro.
"${PSQL[@]}" > "$DIR/dois" 2>&1 <<SQL &
begin;
$excluir where id = (select dois from teste.conta_ids);
select pg_sleep(2);
commit;
SQL
sleep 0.7
"${PSQL[@]}" > "$DIR/dois-anexo" 2>&1 -c "$(printf "$anexar" conta_dois)"
wait
dois=$("${PSQL[@]}" -c "select string_agg(nome, ',') || ' ' || (select descricao from contas_pagar where id = (select conta_dois from teste.conta_ids))
                          from anexos where conta_id = (select conta_dois from teste.conta_ids)")

# 3. O arquivo primeiro; a exclusão espera e o vê.
"${PSQL[@]}" > "$DIR/tres" 2>&1 <<SQL &
begin;
$(printf "$anexar" conta_tres);
select pg_sleep(2);
commit;
SQL
sleep 0.7
"${PSQL[@]}" > "$DIR/tres-exclusao" 2>&1 <<SQL
begin;
$excluir where id = (select tres from teste.conta_ids);
commit;
SQL
wait
tres=$("${PSQL[@]}" -c "select string_agg(nome, ',') || ' ' || (select descricao from contas_pagar where id = (select conta_tres from teste.conta_ids))
                          from anexos where conta_id = (select conta_tres from teste.conta_ids)")

fixo="Despesa adiantada a cliente excluído"
if [ "$um" != '["clienteId"]' ] || [ "$um_contas" != "0" ] || [ "$dois" != "Nota fiscal.pdf $fixo" ] || [ "$tres" != "Nota fiscal.pdf $fixo" ]; then
  echo "Exclusão com despesa simultânea: falhou (conta depois: $um, $um_contas conta(s); anexo depois: $dois; anexo antes: $tres;" \
       "$(cat "$DIR/um" "$DIR/dois" "$DIR/dois-anexo" "$DIR/tres" "$DIR/tres-exclusao"))"
  exit 1
fi
echo "Exclusão com despesa simultânea: ok (a conta que chega depois é recusada; o arquivo, antes ou depois, fica com o nome neutro)"
