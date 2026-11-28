#!/usr/bin/env bash
# O primeiro acesso de duas sócias ao mesmo tempo (F1.31; CO-09, migration 1160), com duas conexões
# de verdade, as duas como service_role (como a api-portal chama o banco) e com commit:
#  a. a primeira entrada segura a transação; a segunda espera a linha do teste e, quando ela sai,
#     não muda nada. As duas entram, o dia 1 é o da primeira e teste.comecou sai uma vez só; e
#     a implantação assistida (CO-08, 1181) abre uma vez só, com um evento só;
#  b. a mesma pessoa entra noutro escritório com teste: o teste fica REPETIDO (a leitura protegida
#     dos outros escritórios funciona com o RLS de verdade);
#  c. no dia 8, como a API, a escrita da sócia é recusada com TESTE_ENCERRADO.
# A chave teste_gratis_ligado volta a ficar desligada no fim, para os outros testes.
set -euo pipefail
PSQL=("${PSQL_BIN:-psql}" -v ON_ERROR_STOP=1 -q -X -tA)
DIR="$(mktemp -d)"
trap 'rm -rf "$DIR"; "${PSQL[@]}" -c "drop table if exists teste.pas; update configuracoes set valor = '"'"'false'"'"' where chave = '"'"'teste_gratis_ligado'"'"'" >/dev/null 2>&1 || true' EXIT

"${PSQL[@]}" >/dev/null <<'SQL'
begin;
update configuracoes set valor = 'true' where chave = 'teste_gratis_ligado';
create table teste.pas as select teste.equipe('Administração do primeiro acesso', 'ADMINISTRACAO') adm,
  teste.pessoa('Primeira sócia do acesso') s1, teste.pessoa('Segunda sócia do acesso') s2;
alter table teste.pas add column e uuid, add column e2 uuid;
update teste.pas set e = console_criar_escritorio(adm, 'Concorrência do primeiro acesso', 'Salvador', 'BA'),
                     e2 = console_criar_escritorio(adm, 'Repetição do primeiro acesso', 'Salvador', 'BA');
select limpar_contexto();
insert into vinculos (pessoa_id, escritorio_id, funcao, criado_por)
  select s1, e, 'SOCIO', adm from teste.pas union all select s2, e, 'SOCIO', adm from teste.pas
  union all select s1, e2, 'SOCIO', adm from teste.pas;
grant usage on schema teste to service_role;
grant execute on function teste.erro(text) to service_role;
commit;
SQL
read -r E E2 S1 S2 < <("${PSQL[@]}" -F ' ' -c "select e, e2, s1, s2 from teste.pas")

# a. A primeira entrada segura a transação por 2 segundos; a segunda chega no meio.
"${PSQL[@]}" > "$DIR/a" 2>&1 <<SQL &
begin;
set local role service_role;
select escolher_escritorio('$S1', gen_random_uuid(), '$E');
select pg_sleep(2);
commit;
SQL
sleep 0.7
"${PSQL[@]}" > "$DIR/b" 2>&1 <<SQL
begin;
set local role service_role;
select escolher_escritorio('$S2', gen_random_uuid(), '$E');
commit;
SQL
wait
fim=$("${PSQL[@]}" -c "select (select count(*) from sessoes_escritorio where escritorio_id = '$E') || ' ' ||
  (select count(*) from historico where escritorio_id = '$E' and acao = 'teste.comecou') || ' ' ||
  (select (autor_id = '$S1')::text from historico where escritorio_id = '$E' and acao = 'teste.comecou' limit 1) || ' ' ||
  (select (fim - inicio)::text from testes_gratis where escritorio_id = '$E') || ' ' ||
  (select count(*) from implantacoes where escritorio_id = '$E' and estado = 'ABERTA') || ' ' ||
  (select count(*) from historico where escritorio_id = '$E' and entidade = 'implantacoes' and dados ->> 'evento' = 'IMPLANTACAO_ABERTA')")
if [ "$fim" != "2 1 true 6 1 1" ] || grep -qi "warning\|error" "$DIR/a" "$DIR/b"; then
  echo "Primeiro acesso simultâneo: falhou (sessões, eventos, autora, dias, implantações, aberturas: $fim; primeira: $(cat "$DIR/a"); segunda: $(cat "$DIR/b"))"
  exit 1
fi

# b. A primeira sócia entra noutro escritório com teste: repetido.
"${PSQL[@]}" > "$DIR/c" 2>&1 <<SQL
begin;
set local role service_role;
select escolher_escritorio('$S1', gen_random_uuid(), '$E2');
commit;
SQL
rep=$("${PSQL[@]}" -c "select (repetido_em is not null)::text || ' ' || coalesce(inicio::text, '-') || ' ' ||
  (select count(*) from historico where escritorio_id = '$E2' and acao = 'teste.repetido' and interno)
  from testes_gratis where escritorio_id = '$E2'")
if [ "$rep" != "true - 1" ] || grep -qi "warning\|error" "$DIR/c"; then
  echo "Primeiro acesso simultâneo: a repetição falhou como service_role ($rep; $(cat "$DIR/c"))"
  exit 1
fi

# c. No dia 8, como a API: a escrita é recusada pelo teste.
d8=$("${PSQL[@]}" 2>&1 <<SQL | tail -1
begin;
select ajustar_relogio(inicio_do_dia((select fim + 1 from testes_gratis where escritorio_id = '$E')) - now()) is not null;
set local role service_role;
select coalesce((teste.erro(format('select portal_exigir_escrita(%L, %L)', '$S1', '$E')) -> 'detalhe' ->> 'motivo'), 'sem erro');
rollback;
SQL
) || true
if [ "$d8" != "TESTE_ENCERRADO" ]; then
  echo "Primeiro acesso simultâneo: no dia 8, esperava TESTE_ENCERRADO e veio $d8"
  exit 1
fi
echo "Primeiro acesso simultâneo: ok (duas sócias ao mesmo tempo, um dia 1 e um evento; a repetição e o dia 8 como a API)"
