#!/usr/bin/env bash
# F3.188 (PT-11; plano da F3.181 a F3.190, seção 7.3, e revisão, D4) com duas conexões de verdade:
# a exclusão que abre o pedido no outro cadastro com o mesmo CPF (1143) ao mesmo tempo que outra
# exclusão e que a edição do outro cadastro. A exclusão trava o escritório (automacoes:), o cliente e
# depois os outros cadastros com o mesmo CPF, em ordem de id, antes de qualquer escrita. Nenhuma rodada
# termina em deadlock.
#  m1. Duas exclusões dos dois cadastros com o mesmo CPF, cada uma com a caixa do outro marcada (duas
#      abas): a segunda espera a trava do escritório; quando a primeira confirma, o outro já foi
#      excluído e o id dele é ignorado, e o pedido aberto pela primeira é atendido.
#  m2. A edição do outro cadastro segura a transação trocando o CPF: a exclusão espera por ele, relê a
#      linha com o CPF novo, e o id marcado volta como erro de campo; nada é excluído.
#  m3. A exclusão segura: a edição do outro cadastro espera e passa depois; o pedido aberto fica.
set -euo pipefail
PSQL=("${PSQL_BIN:-psql}" -v ON_ERROR_STOP=1 -q -X -tA)
DIR="$(mktemp -d)"
trap 'rm -rf "$DIR"' EXIT

# Os dados ficam confirmados (cada conexão precisa vê-los); este script roda no banco temporário
# do test-db.sh, depois dos testes pgTAP.
"${PSQL[@]}" >/dev/null <<'SQL'
create table teste.mdoc_ids as select teste.escritorio('Concorrência do mesmo CPF') as esc, teste.pessoa('Sócia do mesmo CPF') as socia;
select teste.vincular(socia, esc) from teste.mdoc_ids;
create function teste.mdoc_dados(p_nome text, p_doc text) returns jsonb language sql as $$
  select jsonb_build_object('tipo', 'PF', 'nome', p_nome, 'documento', p_doc, 'origem', 'GOOGLE',
    'contatos', jsonb_build_array(jsonb_build_object('nome', p_nome, 'telefone', '+5511984723316', 'principal', true))) $$;
create function teste.mdoc_cliente(p_nome text, p_doc text) returns uuid language sql as $$
  select (portal_cliente_cadastrar(socia, esc, teste.mdoc_dados(p_nome, p_doc)) ->> 'id')::uuid from teste.mdoc_ids $$;
-- O resultado de uma chamada: o que deu certo, ou o código e o motivo (ou os campos) do erro; o
-- deadlock também vira texto, com o código 40P01, e o roteiro procura por ele.
create function teste.mdoc_tentar(p_ok text, p_sql text) returns text language plpgsql as $$
declare v_codigo text; v_detalhe text; d jsonb;
begin
  execute p_sql;
  return p_ok;
exception when others then
  get stacked diagnostics v_codigo = returned_sqlstate, v_detalhe = pg_exception_detail;
  if v_detalhe like '{%' then d := v_detalhe::jsonb; end if;
  return v_codigo || ' ' || coalesce(d ->> 'motivo', d ->> 'campos', v_detalhe, '');
end $$;
create function teste.mdoc_excluir(p_cliente uuid, p_marcado uuid) returns text language sql as $$
  select teste.mdoc_tentar('EXCLUIU', format('select portal_cliente_excluir_dados(%L, %L, %L, %s, %L)', i.socia, c.escritorio_id, p_cliente, c.versao,
    jsonb_build_object('pedidoEm', hoje_brasilia(), 'canal', 'TELEFONE', 'quemPediu', 'TITULAR', 'conferido', true, 'nomeConfirmado', c.nome,
                       'abrirNoMesmoDocumento', jsonb_build_array(p_marcado))))
    from clientes_escritorio c, teste.mdoc_ids i where c.id = p_cliente $$;
create function teste.mdoc_editar(p_cliente uuid, p_doc text) returns text language sql as $$
  select teste.mdoc_tentar('EDITOU', format('select portal_cliente_editar(%L, %L, %L, %s, %L)', i.socia, c.escritorio_id, p_cliente, c.versao,
    teste.mdoc_dados(c.nome, p_doc)))
    from clientes_escritorio c, teste.mdoc_ids i where c.id = p_cliente $$;
alter table teste.mdoc_ids add column a uuid, add column b uuid, add column c uuid, add column d uuid, add column e uuid, add column f uuid;
update teste.mdoc_ids set a = teste.mdoc_cliente('Ana Mesmo CPF', '52998224725'), b = teste.mdoc_cliente('Ana M. CPF', '52998224725'),
  c = teste.mdoc_cliente('Caio Mesmo CPF', '48821390730'), d = teste.mdoc_cliente('Caio M. CPF', '48821390730'),
  e = teste.mdoc_cliente('Eva Mesmo CPF', '12345678909'), f = teste.mdoc_cliente('Eva M. CPF', '12345678909');
SQL

segura() { # $1 = a chamada que segura a transação por 2 segundos; o resultado vai para a saída
  printf "begin;\nselect %s;\nselect pg_sleep(2);\ncommit;\n" "$1"
}
v() { "${PSQL[@]}" -c "select $1 from teste.mdoc_ids"; }

# m1. Duas exclusões ao mesmo tempo, cada uma com o outro marcado.
segura "teste.mdoc_excluir(a, b) from teste.mdoc_ids" | "${PSQL[@]}" > "$DIR/m1-a" 2>&1 &
sleep 0.7
"${PSQL[@]}" -c "select teste.mdoc_excluir(b, a) from teste.mdoc_ids" > "$DIR/m1-b" 2>&1 || true
wait
m1="$(tr '\n' ' ' < "$DIR/m1-a")| $(cat "$DIR/m1-b") | $(v "(select string_agg(estado, ',' order by nome) from clientes_escritorio where id in (a, b))
  || ' ' || (select string_agg(estado, ',') from pedidos_exclusao where cliente_id = b)")"

# m2. A edição do outro cadastro (o CPF muda) segura; a exclusão espera e recusa o id marcado.
segura "teste.mdoc_editar(d, '12345678909') from teste.mdoc_ids" | "${PSQL[@]}" > "$DIR/m2-editar" 2>&1 &
sleep 0.7
"${PSQL[@]}" -c "select teste.mdoc_excluir(c, d) from teste.mdoc_ids" > "$DIR/m2-excluir" 2>&1 || true
wait
m2="$(tr '\n' ' ' < "$DIR/m2-editar")| $(cat "$DIR/m2-excluir") | $(v "(select estado from clientes_escritorio where id = c)
  || ' ' || (select count(*) from pedidos_exclusao where cliente_id in (c, d))")"

# m3. A exclusão segura; a edição do outro cadastro espera e passa, e o pedido aberto fica.
segura "teste.mdoc_excluir(e, f) from teste.mdoc_ids" | "${PSQL[@]}" > "$DIR/m3-excluir" 2>&1 &
sleep 0.7
"${PSQL[@]}" -c "select teste.mdoc_editar(f, '52998224725') from teste.mdoc_ids" > "$DIR/m3-editar" 2>&1 || true
wait
m3="$(tr '\n' ' ' < "$DIR/m3-excluir")| $(cat "$DIR/m3-editar") | $(v "(select estado from pedidos_exclusao where cliente_id = f)")"

e1="EXCLUIU  | EXCLUIU | EXCLUIDO,EXCLUIDO ATENDIDO"
e2="EDITOU  | TC422 [\"abrirNoMesmoDocumento\"] | ATIVO 0"
e3="EXCLUIU  | EDITOU | PENDENTE"
if [ "$m1" != "$e1" ] || [ "$m2" != "$e2" ] || [ "$m3" != "$e3" ] || grep -qi "deadlock\|40P01\|ERROR" "$DIR"/*; then
  echo "Exclusão com o mesmo CPF simultânea: falhou (m1: $m1; m2: $m2; m3: $m3; $(cat "$DIR"/*))"
  exit 1
fi
echo "Exclusão com o mesmo CPF simultânea: ok (duas exclusões do mesmo CPF uma depois da outra, a edição do outro cadastro reavaliada, sem deadlock)"
