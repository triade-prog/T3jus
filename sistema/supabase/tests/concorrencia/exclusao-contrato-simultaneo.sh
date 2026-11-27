#!/usr/bin/env bash
# F3.180 (PT-11, CH-01; plano da F3.180, seção 2.3, e revisão, M6) com duas conexões de verdade: o
# contrato novo ao mesmo tempo que a exclusão a pedido do titular. A exclusão é a de verdade
# (portal_cliente_excluir_dados), porque o FOR UPDATE do começo dela é o que fazia o deadlock; o
# UPDATE cru dos outros roteiros não reproduz. Nenhuma rodada termina em deadlock.
#  c1. O contrato com proposta segura a transação: a exclusão espera o cliente e recusa com
#      TEM_CONTRATO_OU_PROCESSO.
#  c2. A exclusão segura: o contrato com proposta espera no cliente e recusa com o campo clienteId.
#      Nenhum contrato aponta para o excluído; a proposta continua ACEITA, com o serviço trocado.
#  c3. O deadlock de antes da 1130. A conexão 1 pega a trava do motor das automações e o cliente com
#      FOR UPDATE, como cliente_para_exclusao (1114) faz, segura 2 segundos e então exclui; a conexão
#      2 pede o contrato da proposta aceita. Antes da 1130, o contrato segurava a proposta e esperava
#      o cliente, e a exclusão esperava a proposta (40P01, ou um contrato de cliente excluído). Agora
#      o contrato espera no cliente antes da proposta: a exclusão passa e o contrato recusa.
#  c4. A importação de clientes com contrato e JUNTAR de Y segura: o contrato pela tela de Y espera a
#      trava do escritório e nasce depois, sem deadlock (a ordem nova: trava → cliente → proposta).
#  c5. A exclusão de Y segura: a importação com JUNTAR de Y espera no cliente (o FOR UPDATE de
#      imp_juntar, 0420, depois da trava do escritório) e volta inteira com CLIENTE_EXCLUIDO: o
#      cliente relido já está EXCLUIDO, e o UPDATE do juntar cai em cliente_excluido_nao_muda (0460).
#      contrato_nasce é a segunda defesa desse caminho; ele é exercitado pelo INSERT direto do pgTAP
#      165 (revisão, M5).
set -euo pipefail
PSQL=("${PSQL_BIN:-psql}" -v ON_ERROR_STOP=1 -q -X -tA)
DIR="$(mktemp -d)"
trap 'rm -rf "$DIR"' EXIT

# Os dados ficam confirmados (cada conexão precisa vê-los); este script roda no banco temporário
# do test-db.sh, depois dos testes pgTAP.
"${PSQL[@]}" >/dev/null <<'SQL'
create table teste.ctr_ids as select teste.escritorio('Concorrência dos contratos') as esc, teste.pessoa('Sócia dos contratos') as socia;
select teste.vincular(socia, esc) from teste.ctr_ids;
create function teste.ctr_cliente(p_nome text, p_doc text default null) returns uuid language sql as $$
  select (portal_cliente_cadastrar(socia, esc, jsonb_strip_nulls(jsonb_build_object('tipo', 'PF', 'nome', p_nome, 'origem', 'GOOGLE', 'documento', p_doc,
    'contatos', jsonb_build_array(jsonb_build_object('nome', p_nome, 'telefone', '+5511984723316', 'principal', true))))) ->> 'id')::uuid
  from teste.ctr_ids $$;
create function teste.ctr_aceita(p_cliente uuid) returns uuid language plpgsql as $$
declare v uuid; i teste.ctr_ids;
begin
  select * into i from teste.ctr_ids;
  v := (portal_proposta_criar(i.socia, i.esc, jsonb_build_object('clienteId', p_cliente, 'servico', 'Revisão do benefício', 'escopo', 'Ação.',
    'responsavelId', i.socia, 'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'FIXO', 'valor', 150000, 'vencimento', '2027-01-10')),
    'retorno', jsonb_build_object('em', '2027-01-05', 'responsavelId', i.socia))) ->> 'id')::uuid;
  perform portal_proposta_enviada(i.socia, i.esc, v, 1);
  perform portal_proposta_resposta(i.socia, i.esc, v, 2, jsonb_build_object('resposta', 'ACEITOU', 'em', hoje_brasilia(), 'canal', 'PRESENCIAL'));
  return v;
end $$;
-- O resultado de uma chamada: o que deu certo, ou o código e o motivo (ou os campos) do erro.
-- (O deadlock também vira texto, com o código 40P01, e o roteiro procura por ele.)
create function teste.ctr_tentar(p_ok text, p_sql text) returns text language plpgsql as $$
declare v_codigo text; v_detalhe text; d jsonb;
begin
  execute p_sql;
  return p_ok;
exception when others then
  get stacked diagnostics v_codigo = returned_sqlstate, v_detalhe = pg_exception_detail;
  if v_detalhe like '{%' then d := v_detalhe::jsonb; end if;
  return v_codigo || ' ' || coalesce(d ->> 'motivo', d ->> 'campos', v_detalhe, '');
end $$;
create function teste.ctr_excluir(p_cliente uuid) returns text language sql as $$
  select teste.ctr_tentar('EXCLUIU', format('select portal_cliente_excluir_dados(%L, %L, %L, %s, %L)', i.socia, c.escritorio_id, p_cliente, c.versao,
    jsonb_build_object('pedidoEm', hoje_brasilia(), 'canal', 'TELEFONE', 'quemPediu', 'TITULAR', 'conferido', true, 'nomeConfirmado', c.nome)))
    from clientes_escritorio c, teste.ctr_ids i where c.id = p_cliente $$;
create function teste.ctr_contrato(p_cliente uuid, p_proposta uuid) returns text language sql as $$
  select teste.ctr_tentar('CRIOU', format('select portal_contrato_criar(%L, %L, %L)', socia, esc, jsonb_strip_nulls(jsonb_build_object(
    'clienteId', p_cliente, 'propostaId', p_proposta, 'objeto', 'Revisão do benefício', 'responsavelId', socia,
    'advogados', jsonb_build_array(socia), 'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'FIXO', 'valor', 150000, 'vencimento', '2027-01-10'))))))
    from teste.ctr_ids $$;
-- A importação de clientes com contrato, com a linha de Y (mesmo CPF, mesmo nome e telefone) em
-- JUNTAR e a prévia feita: só falta importar.
create function teste.ctr_importacao(p_nome text, p_cpf text) returns uuid language plpgsql as $$
declare i teste.ctr_ids; j jsonb; v uuid;
begin
  select * into i from teste.ctr_ids;
  j := portal_importacao_criar(i.socia, i.esc, jsonb_build_object('arquivoNome', 'contratos.xlsx', 'oQue', 'CLIENTES_CONTRATOS', 'abas', jsonb_build_array(
    jsonb_build_object('nome', 'Clientes', 'colunas', jsonb_build_array('Nome do cliente', 'CPF/CNPJ', 'Celular', 'Serviço', 'Forma de cobrança', 'Valor',
                                                                        '1º vencto', 'Assinatura', 'Advogado'),
      'linhas', jsonb_build_array(jsonb_build_array(p_nome, p_cpf, '(11) 98472-3316', 'Revisão da pensão', 'à vista', '1500', '10/01/2027',
                                                    '01/11/2026', 'Dra. Sócia'))))));
  v := (j ->> 'id')::uuid;
  perform portal_importacao_colunas(i.socia, i.esc, v, (j ->> 'versao')::integer, jsonb_build_object('ligacao', j -> 'ligacao',
    'pares', jsonb_build_object('responsavel', jsonb_build_object('dra. sócia', i.socia))));
  perform portal_importacao_decidir(i.socia, i.esc, v, '{"codigo": "DUPLICADO", "decisao": "JUNTAR"}');
  return v;
end $$;
create function teste.ctr_importar(p_importacao uuid) returns text language sql as $$
  select teste.ctr_tentar('IMPORTOU', format('select portal_importacao_importar(%L, %L, %L, %s)', socia, esc, p_importacao,
    (select versao from importacoes where id = p_importacao)))
    from teste.ctr_ids $$;
create table teste.ctr_set (chave text primary key, cli uuid, prop uuid, imp uuid);
insert into teste.ctr_set (chave, cli) values
  ('c1', teste.ctr_cliente('Cliente c1')), ('c2', teste.ctr_cliente('Cliente c2')), ('c3', teste.ctr_cliente('Cliente c3')),
  ('c4', teste.ctr_cliente('Cliente c4', '12345678062')), ('c5', teste.ctr_cliente('Cliente c5', '22345678151'));
update teste.ctr_set set prop = teste.ctr_aceita(cli);
SQL
# A prévia da importação de Y (uma prévia aberta por vez: a nova encerra a anterior).
previa() { "${PSQL[@]}" -c "update teste.ctr_set set imp = teste.ctr_importacao('Cliente $1', '$2') where chave = '$1'" >/dev/null; }

# Roda $2 numa conexão que segura a transação por 2 segundos e, 0,7 segundo depois, $3 em outra.
# As saídas ficam em $DIR/$1.1 e $DIR/$1.2.
corrida() {
  "${PSQL[@]}" > "$DIR/$1.1" 2>&1 <<SQL &
begin;
$2
select pg_sleep(2);
commit;
SQL
  sleep 0.7
  "${PSQL[@]}" > "$DIR/$1.2" 2>&1 <<SQL || true
begin;
$3
commit;
SQL
  wait || true
}
de() { echo "(select $2 from teste.ctr_set where chave = '$1')"; }
excluir() { echo "select teste.ctr_excluir($(de "$1" cli));"; }
contrato() { echo "select teste.ctr_contrato($(de "$1" cli), $(de "$1" prop));"; }
importar() { echo "select teste.ctr_importar($(de "$1" imp));"; }
q() { "${PSQL[@]}" -c "$1"; }
falhas=()
confere() { # $1 = rodada, $2 = o que a conexão 1 devolve, $3 = o que a conexão 2 devolve
  grep -qx "$2" "$DIR/$1.1" || falhas+=("$1: a conexão 1 devia dar '$2' ($(tr '\n' ' ' < "$DIR/$1.1"))")
  grep -qx "$3" "$DIR/$1.2" || falhas+=("$1: a conexão 2 devia dar '$3' ($(tr '\n' ' ' < "$DIR/$1.2"))")
}
contratos() { q "select count(*) from contratos where cliente_id = $(de "$1" cli)"; }

# c1. O contrato segura; a exclusão espera e recusa.
corrida c1 "$(contrato c1)" "$(excluir c1)"
confere c1 CRIOU "TC422 TEM_CONTRATO_OU_PROCESSO"

# c2. A exclusão segura; o contrato espera no cliente e recusa pelo campo.
corrida c2 "$(excluir c2)" "$(contrato c2)"
confere c2 EXCLUIU 'TC422 \["clienteId"\]'
r=$(q "select (select count(*) from contratos where cliente_id = s.cli) || ' ' || p.estado || ' ' || p.servico
         from teste.ctr_set s join propostas p on p.id = s.prop where s.chave = 'c2'")
[ "$r" = "0 ACEITA Serviço apagado a pedido do titular" ] || falhas+=("c2: esperava nenhum contrato e a proposta aceita com o serviço trocado, veio '$r'")

# c3. O deadlock de antes da 1130: a conexão 1 segura o cliente como a exclusão de verdade e só
# depois exclui; o contrato chega no meio.
corrida c3 "select pg_advisory_xact_lock(hashtext('automacoes:' || esc)) from teste.ctr_ids;
select 1 from clientes_escritorio where id = $(de c3 cli) for update;
select pg_sleep(2);
$(excluir c3)" "$(contrato c3)"
confere c3 EXCLUIU 'TC422 \["clienteId"\]'
[ "$(contratos c3)" = "0" ] || falhas+=("c3: nasceu contrato para o cliente excluído")

# c4. A importação com JUNTAR segura; o contrato pela tela espera a trava do escritório e nasce depois.
previa c4 123.456.780-62
corrida c4 "$(importar c4)" "$(contrato c4)"
confere c4 IMPORTOU CRIOU
[ "$(contratos c4)" = "2" ] || falhas+=("c4: esperava os dois contratos de Y, veio $(contratos c4)")

# c5. A exclusão segura; a importação com JUNTAR espera e volta inteira.
previa c5 223.456.781-51
corrida c5 "$(excluir c5)" "$(importar c5)"
confere c5 EXCLUIU "TC422 CLIENTE_EXCLUIDO"
r=$(q "select (select count(*) from contratos where cliente_id = s.cli) || ' ' || i.estado from teste.ctr_set s join importacoes i on i.id = s.imp where s.chave = 'c5'")
[ "$r" = "0 PREVIA" ] || falhas+=("c5: esperava nenhum contrato e a importação em prévia, veio '$r'")

if grep -qi "deadlock\|40P01" "$DIR"/c*; then falhas+=("deadlock: $(grep -il "deadlock\|40P01" "$DIR"/c* | xargs -n1 basename | tr '\n' ' ')"); fi
if [ ${#falhas[@]} -gt 0 ]; then
  echo "Exclusão com contrato simultâneo: falhou"
  printf '  %s\n' "${falhas[@]}"
  exit 1
fi
echo "Exclusão com contrato simultâneo: ok (contrato antes ou depois da exclusão, o deadlock da proposta e a importação com JUNTAR, sem deadlock)"
