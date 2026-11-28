#!/usr/bin/env bash
# F3.204 (PT-11, AP-05; plano da F3.204, seção 4.4, e revisão, b6) com duas conexões de verdade:
# registrar a resposta, marcar como enviada e editar a proposta ao mesmo tempo que a exclusão
# (portal_cliente_excluir_dados) e que o arquivamento a pedido (portal_cliente_arquivar_lgpd), que
# travam o cliente com FOR UPDATE no começo. As três ações leem o cliente com FOR SHARE antes da
# proposta (1145). Nenhuma rodada termina em deadlock.
#  r1. A exclusão segura: a resposta espera no cliente e é recusada com CLIENTE_EXCLUIDO; a proposta
#      continua ENVIADA.
#  r2. A resposta segura: a exclusão espera e passa; a proposta fica ACEITA (o fato) e encerrada na
#      leitura.
#  r3. O arquivamento segura: marcar o rascunho como enviado espera e é recusado com
#      CLIENTE_ARQUIVADO; a proposta continua RASCUNHO.
#  r4. Marcar como enviada segura: o arquivamento espera e passa; a proposta fica ENVIADA e encerrada.
#  r5. A exclusão segura: a edição espera e é recusada com CLIENTE_EXCLUIDO; o serviço não volta.
set -euo pipefail
PSQL=("${PSQL_BIN:-psql}" -v ON_ERROR_STOP=1 -q -X -tA)
DIR="$(mktemp -d)"
trap 'rm -rf "$DIR"' EXIT

# Os dados ficam confirmados (cada conexão precisa vê-los); este script roda no banco temporário
# do test-db.sh, depois dos testes pgTAP.
"${PSQL[@]}" >/dev/null <<'SQL'
create table teste.enc_ids as select teste.escritorio('Concorrência da proposta encerrada') as esc, teste.pessoa('Sócia da encerrada') as socia,
  teste.pessoa('Diego da encerrada') as diego;
select teste.vincular(socia, esc) from teste.enc_ids;
select portal_convidar(socia, esc, diego, 'Diego da encerrada', array['COMERCIAL']) from teste.enc_ids;
create function teste.enc_cliente(p_nome text, p_contrato boolean) returns uuid language plpgsql as $$
declare v uuid; i teste.enc_ids;
begin
  select * into i from teste.enc_ids;
  v := (portal_cliente_cadastrar(i.socia, i.esc, jsonb_build_object('tipo', 'PF', 'nome', p_nome, 'origem', 'GOOGLE',
    'contatos', jsonb_build_array(jsonb_build_object('nome', p_nome, 'telefone', '+5511984723316', 'principal', true)))) ->> 'id')::uuid;
  -- O arquivado a pedido precisa de contrato (o direto, sem proposta).
  if p_contrato then
    perform portal_contrato_criar(i.socia, i.esc, jsonb_build_object('clienteId', v, 'objeto', 'Consultoria', 'responsavelId', i.socia,
      'advogados', jsonb_build_array(i.socia), 'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'FIXO', 'valor', 150000, 'vencimento', '2027-01-10'))));
  end if;
  return v;
end $$;
create function teste.enc_proposta(p_cliente uuid, p_servico text, p_enviar boolean) returns uuid language plpgsql as $$
declare v uuid; i teste.enc_ids;
begin
  select * into i from teste.enc_ids;
  v := (portal_proposta_criar(i.diego, i.esc, jsonb_build_object('clienteId', p_cliente, 'servico', p_servico, 'escopo', 'Ação.',
    'responsavelId', i.diego, 'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'FIXO', 'valor', 150000, 'vencimento', '2027-01-10')),
    'retorno', jsonb_build_object('em', '2027-01-05', 'responsavelId', i.diego))) ->> 'id')::uuid;
  if p_enviar then perform portal_proposta_enviada(i.diego, i.esc, v, 1); end if;
  return v;
end $$;
-- O resultado de uma chamada: o que deu certo, ou o código e o motivo do erro (o deadlock também
-- vira texto, com o código 40P01, e o roteiro procura por ele).
create function teste.enc_tentar(p_ok text, p_sql text) returns text language plpgsql as $$
declare v_codigo text; v_detalhe text; d jsonb;
begin
  execute p_sql;
  return p_ok;
exception when others then
  get stacked diagnostics v_codigo = returned_sqlstate, v_detalhe = pg_exception_detail;
  if v_detalhe like '{%' then d := v_detalhe::jsonb; end if;
  return v_codigo || ' ' || coalesce(d ->> 'motivo', d ->> 'campos', v_detalhe, '');
end $$;
create function teste.enc_responder(p uuid) returns text language sql as $$
  select teste.enc_tentar('RESPONDEU', format('select portal_proposta_resposta(%L, %L, %L, %s, %L)', diego, esc, p, (select versao from propostas where id = p),
    jsonb_build_object('resposta', 'ACEITOU', 'em', hoje_brasilia(), 'canal', 'WHATSAPP'))) from teste.enc_ids $$;
create function teste.enc_enviar(p uuid) returns text language sql as $$
  select teste.enc_tentar('ENVIOU', format('select portal_proposta_enviada(%L, %L, %L, %s)', diego, esc, p, (select versao from propostas where id = p)))
    from teste.enc_ids $$;
create function teste.enc_editar(p uuid) returns text language sql as $$
  select teste.enc_tentar('EDITOU', format('select portal_proposta_editar(%L, %L, %L, %s, %L)', diego, esc, p, (select versao from propostas where id = p),
    jsonb_build_object('servico', 'Serviço novo', 'escopo', 'Ação.', 'responsavelId', diego,
      'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'FIXO', 'valor', 150000, 'vencimento', '2027-01-10')),
      'retorno', jsonb_build_object('em', '2027-01-05', 'responsavelId', diego)))) from teste.enc_ids $$;
create function teste.enc_excluir(p_cliente uuid) returns text language sql as $$
  select teste.enc_tentar('EXCLUIU', format('select portal_cliente_excluir_dados(%L, %L, %L, %s, %L)', i.socia, c.escritorio_id, p_cliente, c.versao,
    jsonb_build_object('pedidoEm', hoje_brasilia(), 'canal', 'TELEFONE', 'quemPediu', 'TITULAR', 'conferido', true, 'nomeConfirmado', c.nome)))
    from clientes_escritorio c, teste.enc_ids i where c.id = p_cliente $$;
create function teste.enc_arquivar(p_cliente uuid) returns text language sql as $$
  select teste.enc_tentar('ARQUIVOU', format('select portal_cliente_arquivar_lgpd(%L, %L, %L, %s, %L)', i.socia, c.escritorio_id, p_cliente, c.versao,
    jsonb_build_object('pedidoEm', hoje_brasilia(), 'canal', 'EMAIL', 'quemPediu', 'TITULAR', 'conferido', true)))
    from clientes_escritorio c, teste.enc_ids i where c.id = p_cliente $$;
alter table teste.enc_ids add column um uuid, add column dois uuid, add column tres uuid, add column quatro uuid, add column cinco uuid,
  add column p_um uuid, add column p_dois uuid, add column p_tres uuid, add column p_quatro uuid, add column p_cinco uuid;
update teste.enc_ids set um = teste.enc_cliente('Zé Primeiro Encerrada', false), dois = teste.enc_cliente('Lia Segunda Encerrada', false),
  tres = teste.enc_cliente('Bia Terceira Encerrada', true), quatro = teste.enc_cliente('Rui Quarto Encerrada', true),
  cinco = teste.enc_cliente('Eva Quinta Encerrada', false);
update teste.enc_ids set p_um = teste.enc_proposta(um, 'Divórcio de Zé', true), p_dois = teste.enc_proposta(dois, 'Guarda de Lia', true),
  p_tres = teste.enc_proposta(tres, 'Pensão de Bia', false), p_quatro = teste.enc_proposta(quatro, 'Despejo de Rui', false),
  p_cinco = teste.enc_proposta(cinco, 'Inventário de Eva', true);
SQL

segura() { # $1 = a chamada que segura a transação por 2 segundos; o resultado vai para a saída
  printf "begin;\nselect %s;\nselect pg_sleep(2);\ncommit;\n" "$1"
}
v() { "${PSQL[@]}" -c "select $1 from teste.enc_ids"; }
estado() { echo "(select estado || ' ' || proposta_esta_encerrada(p)::text from propostas p where p.id = $1)"; }

# r1. A exclusão primeiro; a resposta espera e é recusada.
segura "teste.enc_excluir(um) from teste.enc_ids" | "${PSQL[@]}" > "$DIR/r1-excluir" 2>&1 &
sleep 0.7
"${PSQL[@]}" -c "select teste.enc_responder(p_um) from teste.enc_ids" > "$DIR/r1-responder" 2>&1 || true
wait
r1="$(tr '\n' ' ' < "$DIR/r1-excluir")| $(cat "$DIR/r1-responder") | $(v "$(estado p_um)")"

# r2. A resposta primeiro; a exclusão espera e passa.
segura "teste.enc_responder(p_dois) from teste.enc_ids" | "${PSQL[@]}" > "$DIR/r2-responder" 2>&1 &
sleep 0.7
"${PSQL[@]}" -c "select teste.enc_excluir(dois) from teste.enc_ids" > "$DIR/r2-excluir" 2>&1 || true
wait
r2="$(tr '\n' ' ' < "$DIR/r2-responder")| $(cat "$DIR/r2-excluir") | $(v "$(estado p_dois)")"

# r3. O arquivamento primeiro; marcar como enviada espera e é recusado.
segura "teste.enc_arquivar(tres) from teste.enc_ids" | "${PSQL[@]}" > "$DIR/r3-arquivar" 2>&1 &
sleep 0.7
"${PSQL[@]}" -c "select teste.enc_enviar(p_tres) from teste.enc_ids" > "$DIR/r3-enviar" 2>&1 || true
wait
r3="$(tr '\n' ' ' < "$DIR/r3-arquivar")| $(cat "$DIR/r3-enviar") | $(v "$(estado p_tres)")"

# r4. Marcar como enviada primeiro; o arquivamento espera e passa.
segura "teste.enc_enviar(p_quatro) from teste.enc_ids" | "${PSQL[@]}" > "$DIR/r4-enviar" 2>&1 &
sleep 0.7
"${PSQL[@]}" -c "select teste.enc_arquivar(quatro) from teste.enc_ids" > "$DIR/r4-arquivar" 2>&1 || true
wait
r4="$(tr '\n' ' ' < "$DIR/r4-enviar")| $(cat "$DIR/r4-arquivar") | $(v "$(estado p_quatro)")"

# r5. A exclusão primeiro; a edição espera e é recusada.
segura "teste.enc_excluir(cinco) from teste.enc_ids" | "${PSQL[@]}" > "$DIR/r5-excluir" 2>&1 &
sleep 0.7
"${PSQL[@]}" -c "select teste.enc_editar(p_cinco) from teste.enc_ids" > "$DIR/r5-editar" 2>&1 || true
wait
r5="$(tr '\n' ' ' < "$DIR/r5-excluir")| $(cat "$DIR/r5-editar") | $(v "(select servico from propostas where id = p_cinco)")"

e1="EXCLUIU  | TC422 CLIENTE_EXCLUIDO | ENVIADA true"
e2="RESPONDEU  | EXCLUIU | ACEITA true"
e3="ARQUIVOU  | TC422 CLIENTE_ARQUIVADO | RASCUNHO true"
e4="ENVIOU  | ARQUIVOU | ENVIADA true"
e5="EXCLUIU  | TC422 CLIENTE_EXCLUIDO | Serviço apagado a pedido do titular"
if [ "$r1" != "$e1" ] || [ "$r2" != "$e2" ] || [ "$r3" != "$e3" ] || [ "$r4" != "$e4" ] || [ "$r5" != "$e5" ] || grep -qi "deadlock\|40P01\|ERROR" "$DIR"/*; then
  echo "Proposta com exclusão e arquivamento simultâneos: falhou (r1: $r1; r2: $r2; r3: $r3; r4: $r4; r5: $r5; $(cat "$DIR"/*))"
  exit 1
fi
echo "Proposta com exclusão e arquivamento simultâneos: ok (responder, enviar e editar durante a exclusão ou o arquivamento são recusados; o que vem antes entra e fica encerrado na leitura; sem deadlock)"
