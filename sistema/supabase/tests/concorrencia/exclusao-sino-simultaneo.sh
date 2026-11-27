#!/usr/bin/env bash
# F3.172, F3.179 e F3.181 (PT-11; plano da F3.172, seção 4, da F3.180, seção 6.4, e da F3.181, seção 7.3) com duas conexões de
# verdade: pedir o contrato da proposta aceita ao mesmo tempo que a exclusão a pedido do titular não
# deixa o nome no aviso do sino, e nenhuma das duas termina em deadlock.
#  1. A exclusão chega primeiro e segura a transação: o pedido espera o cliente (FOR SHARE, 1140) e,
#     quando a exclusão confirma, é recusado com CLIENTE_EXCLUIDO, sem aviso novo (F3.181). Antes da
#     1140, o pedido entrava e o aviso nascia com o texto fixo.
#  2. O pedido chega primeiro e segura a transação: a exclusão espera a proposta e, quando o pedido
#     confirma, o UPDATE dos avisos já vê o aviso confirmado e o troca.
#  3. (F3.179) A edição da proposta chega primeiro, com um "sobre" novo na condição de ÊXITO, e segura a
#     transação: a exclusão espera a proposta e, quando a edição confirma, o UPDATE das condições (uma
#     instrução depois da das propostas, a ordem da edição) troca o "sobre" gravado pela edição.
# No cenário 2 o aviso também confere o "sobre" da cópia das condições (F3.179). A exclusão de verdade
# (portal_cliente_excluir_dados) e o contrato pela proposta ficam em exclusao-pedido-contrato-simultaneo.sh. O contrário do
# 3 (a exclusão primeiro) já é coberto: a edição cai em conflito de versão, porque a exclusão sobe a
# versão da proposta (1090).
# Os avisos de conversa ficam para a F3.157 (revisão, M4), então não há o cenário da conversa.
set -euo pipefail
PSQL=("${PSQL_BIN:-psql}" -v ON_ERROR_STOP=1 -q -X -tA)
DIR="$(mktemp -d)"
trap 'rm -rf "$DIR"' EXIT

# Os dados ficam confirmados (cada conexão precisa vê-los); este script roda no banco temporário
# do test-db.sh, depois dos testes pgTAP.
"${PSQL[@]}" >/dev/null <<'SQL'
create table teste.sino_ids as select teste.escritorio('Concorrência do sino') as esc, teste.pessoa('Sócia do sino') as socia,
  teste.pessoa('Diego do sino') as diego;
select teste.vincular(socia, esc) from teste.sino_ids;
select portal_convidar(socia, esc, diego, 'Diego do sino', array['COMERCIAL']) from teste.sino_ids;
create function teste.sino_cliente(p_nome text) returns uuid language sql as $$
  select (portal_cliente_cadastrar(socia, esc, jsonb_build_object('tipo', 'PF', 'nome', p_nome, 'origem', 'GOOGLE',
    'contatos', jsonb_build_array(jsonb_build_object('nome', p_nome, 'telefone', '+5511984723316', 'principal', true)))) ->> 'id')::uuid
  from teste.sino_ids $$;
create function teste.sino_aceita(p_cliente uuid, p_servico text) returns uuid language plpgsql as $$
declare v uuid; i teste.sino_ids;
begin
  select * into i from teste.sino_ids;
  v := (portal_proposta_criar(i.diego, i.esc, jsonb_build_object('clienteId', p_cliente, 'servico', p_servico, 'escopo', 'Ação.',
    'responsavelId', i.diego, 'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'FIXO', 'valor', 150000, 'vencimento', '2026-12-10'),
      jsonb_build_object('tipo', 'EXITO', 'percentual', 3000, 'sobre', 'Do que ' || p_servico || ' receber', 'etapa', 'Sentença', 'dias', 15)),
    'retorno', jsonb_build_object('em', '2026-12-30', 'responsavelId', i.diego))) ->> 'id')::uuid;
  perform portal_proposta_enviada(i.diego, i.esc, v, 1);
  perform portal_proposta_resposta(i.diego, i.esc, v, 2, jsonb_build_object('resposta', 'ACEITOU', 'em', hoje_brasilia(), 'canal', 'PRESENCIAL'));
  return v;
end $$;
alter table teste.sino_ids add column um uuid, add column dois uuid, add column prop_um uuid, add column prop_dois uuid,
  add column tres uuid, add column prop_tres uuid;
update teste.sino_ids set um = teste.sino_cliente('Zé Primeiro Sino'), dois = teste.sino_cliente('Lia Segunda Sino'),
  tres = teste.sino_cliente('Bia Terceira Sino');
update teste.sino_ids set prop_um = teste.sino_aceita(um, 'Divórcio de Zé Primeiro'), prop_dois = teste.sino_aceita(dois, 'Guarda de Lia Segunda');
-- A proposta de Bia fica em rascunho, com o ÊXITO, para a edição do cenário 3.
update teste.sino_ids set prop_tres = (portal_proposta_criar(diego, esc, jsonb_build_object('clienteId', tres, 'servico', 'Pensão de Bia',
  'responsavelId', diego, 'rascunho', true, 'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'EXITO', 'percentual', 3000,
  'sobre', 'Do que Bia Terceira receber', 'etapa', 'Sentença', 'dias', 15)))) ->> 'id')::uuid;
SQL

excluir="select definir_transicao('EXCLUIU', null, true);
update clientes_escritorio set estado = 'EXCLUIDO', excluido_em = app_now(), nome = 'Cliente excluído', contatos = '[]'"
pedir="select portal_proposta_pedir_contrato(diego, esc, %s) from teste.sino_ids"
avisos="select count(*) || ' ' || coalesce(string_agg(distinct (dados ->> 'cliente') || ' / ' || (dados ->> 'servico')
                                                     || ' / ' || (dados -> 'condicoes' -> 1 ->> 'sobre'), ','), '')
          from avisos_sino where origem_id = (select %s from teste.sino_ids)"

# 1. A exclusão primeiro; o pedido espera e é recusado (F3.181).
"${PSQL[@]}" > "$DIR/um" 2>&1 <<SQL &
begin;
$excluir where id = (select um from teste.sino_ids);
select pg_sleep(2);
commit;
SQL
sleep 0.7
"${PSQL[@]}" > "$DIR/um-pedido" 2>&1 -c "$(printf "$pedir" prop_um)" || true
wait
um=$("${PSQL[@]}" -c "$(printf "$avisos" prop_um)")

# 2. O pedido primeiro; a exclusão espera e troca o aviso já confirmado.
"${PSQL[@]}" > "$DIR/dois-pedido" 2>&1 <<SQL &
begin;
$(printf "$pedir" prop_dois);
select pg_sleep(2);
commit;
SQL
sleep 0.7
"${PSQL[@]}" > "$DIR/dois" 2>&1 <<SQL || true
begin;
$excluir where id = (select dois from teste.sino_ids);
commit;
SQL
wait
dois=$("${PSQL[@]}" -c "$(printf "$avisos" prop_dois)")
dois_cliente=$("${PSQL[@]}" -c "select estado from clientes_escritorio where id = (select dois from teste.sino_ids)")

# 3. A edição primeiro, com um sobre novo; a exclusão espera a proposta e troca o sobre gravado pela
#    edição (a etapa nova prova que a linha trocada é a da edição).
"${PSQL[@]}" > "$DIR/tres-edicao" 2>&1 <<SQL &
begin;
select portal_proposta_editar(diego, esc, prop_tres, 1, jsonb_build_object('servico', 'Pensão de Bia', 'responsavelId', diego, 'rascunho', true,
  'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'EXITO', 'percentual', 3000, 'sobre', 'Do que Bia Terceira Souza receber',
  'etapa', 'Trânsito em julgado', 'dias', 15)))) from teste.sino_ids;
select pg_sleep(2);
commit;
SQL
sleep 0.7
"${PSQL[@]}" > "$DIR/tres" 2>&1 <<SQL || true
begin;
$excluir where id = (select tres from teste.sino_ids);
commit;
SQL
wait
tres=$("${PSQL[@]}" -c "select count(*) || ' ' || string_agg((params ->> 'sobre') || ' / ' || (params ->> 'etapa'), ',')
                         from honorario_condicoes where dono_tipo = 'PROPOSTA' and dono_id = (select prop_tres from teste.sino_ids)")
tres_cliente=$("${PSQL[@]}" -c "select estado from clientes_escritorio where id = (select tres from teste.sino_ids)")

esperado_um="0 "
esperado="1 Cliente excluído / Serviço apagado a pedido do titular / Base apagada a pedido do titular"
esperado_tres="1 Base apagada a pedido do titular / Trânsito em julgado"
if [ "$um" != "$esperado_um" ] || ! grep -q "CLIENTE_EXCLUIDO" "$DIR/um-pedido" || [ "$dois" != "$esperado" ] || [ "$dois_cliente" != "EXCLUIDO" ] \
   || [ "$tres" != "$esperado_tres" ] || [ "$tres_cliente" != "EXCLUIDO" ] \
   || grep -qi "deadlock" "$DIR/um-pedido" \
   || grep -qi "deadlock\|ERROR" "$DIR/um" "$DIR/dois" "$DIR/dois-pedido" "$DIR/tres" "$DIR/tres-edicao"; then
  echo "Exclusão com pedido de contrato e edição simultâneos: falhou (exclusão antes: $um; pedido antes: $dois, cliente $dois_cliente;" \
       "edição antes: $tres, cliente $tres_cliente;" \
       "$(cat "$DIR/um" "$DIR/um-pedido" "$DIR/dois" "$DIR/dois-pedido" "$DIR/tres" "$DIR/tres-edicao"))"
  exit 1
fi
echo "Exclusão com pedido de contrato e edição simultâneos: ok (o pedido depois da exclusão é recusado; o de antes e a edição ficam com o texto fixo; sem deadlock)"
