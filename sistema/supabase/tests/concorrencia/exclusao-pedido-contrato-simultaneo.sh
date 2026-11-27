#!/usr/bin/env bash
# F3.181 (PT-11, IN-01; plano da F3.181, seção 7.3, e revisão, D5 e b6) com duas conexões de verdade:
# o pedido de contrato da proposta aceita ao mesmo tempo que a exclusão de verdade
# (portal_cliente_excluir_dados, que trava o cliente com FOR UPDATE no começo) e ao mesmo tempo que o
# contrato pela proposta (portal_contrato_criar, 1130: a trava contratos:, o cliente FOR SHARE, a
# proposta FOR UPDATE). O pedir lê o cliente com FOR SHARE antes da proposta (1140). Nenhuma rodada
# termina em deadlock.
#  p1. A exclusão segura a transação: o pedido espera no cliente e, quando a exclusão confirma, é
#      recusado com CLIENTE_EXCLUIDO; nenhum aviso nasce e a proposta continua sem pedido.
#  p2. O pedido segura: a exclusão espera o cliente e, quando o pedido confirma, exclui; o aviso que
#      nasceu do pedido fica com o texto fixo, e o pedido sai do bloco de Contratos.
#  p3. O pedido segura: o contrato pela proposta espera a proposta e nasce depois (os dois FOR SHARE
#      no cliente convivem).
#  p4. O contrato pela proposta segura: o pedido espera a proposta e, quando o contrato confirma, relê
#      a proposta travada e recusa com PROPOSTA_NAO_ACEITA (antes da 1140, o pedido entrava e o aviso
#      nascia para uma proposta que já era contrato).
set -euo pipefail
PSQL=("${PSQL_BIN:-psql}" -v ON_ERROR_STOP=1 -q -X -tA)
DIR="$(mktemp -d)"
trap 'rm -rf "$DIR"' EXIT

# Os dados ficam confirmados (cada conexão precisa vê-los); este script roda no banco temporário
# do test-db.sh, depois dos testes pgTAP.
"${PSQL[@]}" >/dev/null <<'SQL'
create table teste.ped_ids as select teste.escritorio('Concorrência do pedido de contrato') as esc, teste.pessoa('Sócia do pedido') as socia,
  teste.pessoa('Diego do pedido') as diego;
select teste.vincular(socia, esc) from teste.ped_ids;
select portal_convidar(socia, esc, diego, 'Diego do pedido', array['COMERCIAL']) from teste.ped_ids;
create function teste.ped_cliente(p_nome text) returns uuid language sql as $$
  select (portal_cliente_cadastrar(socia, esc, jsonb_build_object('tipo', 'PF', 'nome', p_nome, 'origem', 'GOOGLE',
    'contatos', jsonb_build_array(jsonb_build_object('nome', p_nome, 'telefone', '+5511984723316', 'principal', true)))) ->> 'id')::uuid
  from teste.ped_ids $$;
create function teste.ped_aceita(p_cliente uuid, p_servico text) returns uuid language plpgsql as $$
declare v uuid; i teste.ped_ids;
begin
  select * into i from teste.ped_ids;
  v := (portal_proposta_criar(i.diego, i.esc, jsonb_build_object('clienteId', p_cliente, 'servico', p_servico, 'escopo', 'Ação.',
    'responsavelId', i.diego, 'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'FIXO', 'valor', 150000, 'vencimento', '2027-01-10')),
    'retorno', jsonb_build_object('em', '2027-01-05', 'responsavelId', i.diego))) ->> 'id')::uuid;
  perform portal_proposta_enviada(i.diego, i.esc, v, 1);
  perform portal_proposta_resposta(i.diego, i.esc, v, 2, jsonb_build_object('resposta', 'ACEITOU', 'em', hoje_brasilia(), 'canal', 'PRESENCIAL'));
  return v;
end $$;
-- O resultado de uma chamada: o que deu certo, ou o código e o motivo do erro (o deadlock também
-- vira texto, com o código 40P01, e o roteiro procura por ele).
create function teste.ped_tentar(p_ok text, p_sql text) returns text language plpgsql as $$
declare v_codigo text; v_detalhe text; d jsonb;
begin
  execute p_sql;
  return p_ok;
exception when others then
  get stacked diagnostics v_codigo = returned_sqlstate, v_detalhe = pg_exception_detail;
  if v_detalhe like '{%' then d := v_detalhe::jsonb; end if;
  return v_codigo || ' ' || coalesce(d ->> 'motivo', d ->> 'campos', v_detalhe, '');
end $$;
create function teste.ped_pedir(p_proposta uuid) returns text language sql as $$
  select teste.ped_tentar('PEDIU', format('select portal_proposta_pedir_contrato(%L, %L, %L)', diego, esc, p_proposta)) from teste.ped_ids $$;
create function teste.ped_excluir(p_cliente uuid) returns text language sql as $$
  select teste.ped_tentar('EXCLUIU', format('select portal_cliente_excluir_dados(%L, %L, %L, %s, %L)', i.socia, c.escritorio_id, p_cliente, c.versao,
    jsonb_build_object('pedidoEm', hoje_brasilia(), 'canal', 'TELEFONE', 'quemPediu', 'TITULAR', 'conferido', true, 'nomeConfirmado', c.nome)))
    from clientes_escritorio c, teste.ped_ids i where c.id = p_cliente $$;
create function teste.ped_contrato(p_cliente uuid, p_proposta uuid) returns text language sql as $$
  select teste.ped_tentar('CRIOU', format('select portal_contrato_criar(%L, %L, %L)', socia, esc, jsonb_build_object(
    'clienteId', p_cliente, 'propostaId', p_proposta, 'objeto', 'Revisão do benefício', 'responsavelId', socia,
    'advogados', jsonb_build_array(socia), 'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'FIXO', 'valor', 150000, 'vencimento', '2027-01-10')))))
    from teste.ped_ids $$;
alter table teste.ped_ids add column um uuid, add column dois uuid, add column tres uuid, add column quatro uuid,
  add column p_um uuid, add column p_dois uuid, add column p_tres uuid, add column p_quatro uuid;
update teste.ped_ids set um = teste.ped_cliente('Zé Primeiro Pedido'), dois = teste.ped_cliente('Lia Segunda Pedido'),
  tres = teste.ped_cliente('Bia Terceira Pedido'), quatro = teste.ped_cliente('Rui Quarto Pedido');
update teste.ped_ids set p_um = teste.ped_aceita(um, 'Divórcio de Zé'), p_dois = teste.ped_aceita(dois, 'Guarda de Lia'),
  p_tres = teste.ped_aceita(tres, 'Pensão de Bia'), p_quatro = teste.ped_aceita(quatro, 'Despejo de Rui');
SQL

segura() { # $1 = a chamada que segura a transação por 2 segundos; o resultado vai para a saída
  printf "begin;\nselect %s;\nselect pg_sleep(2);\ncommit;\n" "$1"
}
v() { "${PSQL[@]}" -c "select $1 from teste.ped_ids"; }

# p1. A exclusão primeiro; o pedido espera e é recusado.
segura "teste.ped_excluir(um) from teste.ped_ids" | "${PSQL[@]}" > "$DIR/p1-excluir" 2>&1 &
sleep 0.7
"${PSQL[@]}" -c "select teste.ped_pedir(p_um) from teste.ped_ids" > "$DIR/p1-pedir" 2>&1 || true
wait
p1="$(tr '\n' ' ' < "$DIR/p1-excluir")| $(cat "$DIR/p1-pedir") | $(v "(select count(*) from avisos_sino where origem_id = p_um) || ' ' || (select (contrato_pedido_em is null)::text from propostas where id = p_um)")"

# p2. O pedido primeiro; a exclusão espera e passa.
segura "teste.ped_pedir(p_dois) from teste.ped_ids" | "${PSQL[@]}" > "$DIR/p2-pedir" 2>&1 &
sleep 0.7
"${PSQL[@]}" -c "select teste.ped_excluir(dois) from teste.ped_ids" > "$DIR/p2-excluir" 2>&1 || true
wait
p2="$(tr '\n' ' ' < "$DIR/p2-pedir")| $(cat "$DIR/p2-excluir") | $(v "(select count(*) || ' ' || string_agg(distinct dados ->> 'cliente', ',') from avisos_sino where origem_id = p_dois)
  || ' ' || (select count(*) from jsonb_array_elements(portal_contratos_pedidos(socia, esc)) x where (x -> 'proposta' ->> 'id')::uuid = p_dois)")"

# p3. O pedido primeiro; o contrato pela proposta espera e nasce.
segura "teste.ped_pedir(p_tres) from teste.ped_ids" | "${PSQL[@]}" > "$DIR/p3-pedir" 2>&1 &
sleep 0.7
"${PSQL[@]}" -c "select teste.ped_contrato(tres, p_tres) from teste.ped_ids" > "$DIR/p3-contrato" 2>&1 || true
wait
p3="$(tr '\n' ' ' < "$DIR/p3-pedir")| $(cat "$DIR/p3-contrato") | $(v "(select estado from propostas where id = p_tres)")"

# p4. O contrato pela proposta primeiro; o pedido espera e recusa.
segura "teste.ped_contrato(quatro, p_quatro) from teste.ped_ids" | "${PSQL[@]}" > "$DIR/p4-contrato" 2>&1 &
sleep 0.7
"${PSQL[@]}" -c "select teste.ped_pedir(p_quatro) from teste.ped_ids" > "$DIR/p4-pedir" 2>&1 || true
wait
p4="$(tr '\n' ' ' < "$DIR/p4-contrato")| $(cat "$DIR/p4-pedir") | $(v "(select count(*) from avisos_sino where origem_id = p_quatro and tipo = 'PEDIDO_CONTRATO')
  || ' ' || (select (contrato_pedido_em is null)::text from propostas where id = p_quatro)")"

e1="EXCLUIU  | TC422 CLIENTE_EXCLUIDO | 0 true"
e2="PEDIU  | EXCLUIU | 1 Cliente excluído 0"
e3="PEDIU  | CRIOU | CONTRATO"
e4="CRIOU  | TC422 PROPOSTA_NAO_ACEITA | 0 true"
if [ "$p1" != "$e1" ] || [ "$p2" != "$e2" ] || [ "$p3" != "$e3" ] || [ "$p4" != "$e4" ] || grep -qi "deadlock\|40P01\|ERROR" "$DIR"/*; then
  echo "Pedido de contrato com exclusão e contrato simultâneos: falhou (p1: $p1; p2: $p2; p3: $p3; p4: $p4; $(cat "$DIR"/*))"
  exit 1
fi
echo "Pedido de contrato com exclusão e contrato simultâneos: ok (o pedido feito durante a exclusão é recusado, o de antes sai da lista; com o contrato pela proposta, sem deadlock)"
