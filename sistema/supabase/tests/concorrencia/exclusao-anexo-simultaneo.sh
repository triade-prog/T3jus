#!/usr/bin/env bash
# F3.141 (PT-11; revisão, B1) com duas conexões de verdade: um documento anexado ao mesmo tempo que
# a exclusão a pedido do titular não escapa da fila.
#  1. A exclusão chega primeiro e segura a transação: o anexo espera e, quando ela confirma, recebe
#     "Cliente não encontrado" (TC404).
#  2. O anexo chega primeiro e segura a transação: a exclusão espera e, quando ele confirma, já vê o
#     documento, que sai sem o nome e entra na fila.
set -euo pipefail
PSQL=("${PSQL_BIN:-psql}" -v ON_ERROR_STOP=1 -q -X -tA)
DIR="$(mktemp -d)"
trap 'rm -rf "$DIR"' EXIT

# Os dados ficam confirmados (cada conexão precisa vê-los); este script roda no banco temporário
# do test-db.sh, depois dos testes pgTAP.
"${PSQL[@]}" >/dev/null <<'SQL'
create table teste.anexo_ids as select teste.escritorio('Concorrência da exclusão') as esc, teste.pessoa('Sócia da concorrência') as socia;
select teste.vincular(socia, esc) from teste.anexo_ids;
create function teste.anexo_cliente(p_nome text) returns uuid language sql as $$
  select (portal_cliente_cadastrar(socia, esc, jsonb_build_object('tipo', 'PF', 'nome', p_nome, 'origem', 'GOOGLE',
    'contatos', jsonb_build_array(jsonb_build_object('nome', p_nome, 'telefone', '+5511984723316', 'principal', true)))) ->> 'id')::uuid
  from teste.anexo_ids $$;
alter table teste.anexo_ids add column um uuid, add column dois uuid;
update teste.anexo_ids set um = teste.anexo_cliente('Zé Primeiro'), dois = teste.anexo_cliente('Lia Segunda');
SQL

excluir="select definir_transicao('EXCLUIU', null, true);
update clientes_escritorio set estado = 'EXCLUIDO', excluido_em = app_now(), nome = 'Cliente excluído', contatos = '[]'"
anexar="insert into cliente_documentos (escritorio_id, cliente_id, tipo, nome, arquivo_tipo, tamanho, enviado_por)
select esc, %s, 'RG_CPF', 'rg.pdf', 'application/pdf', 10, socia from teste.anexo_ids"

# 1. A exclusão primeiro.
"${PSQL[@]}" > "$DIR/um" 2>&1 <<SQL &
begin;
$excluir where id = (select um from teste.anexo_ids);
select pg_sleep(2);
commit;
SQL
sleep 0.7
um=$("${PSQL[@]}" -c "select teste.erro(\$q\$$(printf "$anexar" um)\$q\$) ->> 'codigo'" 2>&1)
wait
um_docs=$("${PSQL[@]}" -c "select count(*) from cliente_documentos where cliente_id = (select um from teste.anexo_ids)")

# 2. O anexo primeiro.
"${PSQL[@]}" > "$DIR/dois" 2>&1 <<SQL &
begin;
$(printf "$anexar" dois);
select pg_sleep(2);
commit;
SQL
sleep 0.7
"${PSQL[@]}" > "$DIR/dois-exclusao" 2>&1 <<SQL
begin;
$excluir where id = (select dois from teste.anexo_ids);
commit;
SQL
wait
dois=$("${PSQL[@]}" -c "select count(*) filter (where nome is null and apagado_em is not null) || '/' || count(*)
                          || ' fila ' || (select count(*) from arquivos_apagar where cliente_id = (select dois from teste.anexo_ids))
                          from cliente_documentos where cliente_id = (select dois from teste.anexo_ids)")

if [ "$um" != "TC404" ] || [ "$um_docs" != "0" ] || [ "$dois" != "1/1 fila 1" ]; then
  echo "Exclusão com anexo simultâneo: falhou (exclusão primeiro: $um, $um_docs documento(s); anexo primeiro: $dois; $(cat "$DIR/um" "$DIR/dois" "$DIR/dois-exclusao"))"
  exit 1
fi
echo "Exclusão com anexo simultâneo: ok (o anexo que chega depois é recusado; o que chega antes sai junto com a exclusão)"
