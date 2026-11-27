#!/usr/bin/env bash
# F3.187 (PT-11, EX-01; plano da F3.187, seção 4.3) com duas conexões de verdade: a ligação nova a caso
# ao mesmo tempo que a exclusão a pedido do titular. A exclusão é a de verdade
# (portal_cliente_excluir_dados). Nenhuma rodada termina em deadlock.
#  k1. Adicionar a cliente ao caso segura a transação: a exclusão espera o cliente e recusa com
#      TEM_CONTRATO_OU_PROCESSO.
#  k2. A exclusão segura: adicionar a cliente ao caso espera no cliente (antes do caso, 1131) e recusa
#      com CLIENTE_EXCLUIDO; a ligação não nasce.
#  k3. A exclusão segura: cadastrar um caso com dois clientes, um deles o que está sendo excluído,
#      espera e recusa com CLIENTE_EXCLUIDO; o caso não existe.
#  k4. A importação dos processos com a linha da cliente segura: a exclusão espera e recusa com
#      TEM_CONTRATO_OU_PROCESSO.
#  k5. A exclusão segura: a importação dos processos (a prévia já conferida) espera no INSERT da
#      ligação e volta inteira com CLIENTE_EXCLUIDO (caso_cliente_nasce); nenhum caso novo fica.
# F3.185 (1134; plano, 5.4, e revisão, M3): a exclusão de quem só tem a ligação ao caso novo de
# importação desfeita (o caso X) apaga a ligação e troca o nome de X, que fica sem cliente.
#  k6. Adicionar outra pessoa a X pela tela segura (o caso com FOR UPDATE): a exclusão espera no caso
#      e vê a ligação nova; exclui, e X, que tem cliente, fica com o nome.
#  k7. A exclusão segura (já com o UPDATE de X): adicionar a cliente a X espera no cliente (antes do
#      caso, 1131) e recusa com CLIENTE_EXCLUIDO. É a rodada que prova a ordem cliente → caso.
#  k8. A importação dos processos junta outra pessoa a X (pelo número, JUNTAR) e segura: a exclusão
#      troca o nome de X sem esperar (FOR NO KEY UPDATE contra o FOR KEY SHARE da chave), sem deadlock;
#      X fica com a outra pessoa e o nome novo (limite no README).
#  k9. A exclusão segura: o levantamento da cliente em X (levantamento_erros ainda vê a ligação) espera
#      no cliente e recusa com CLIENTE_EXCLUIDO (levantamento_nasce, revisão M3); nada nasce.
# O ciclo que ainda é possível (revisão, M4: quem trava vários clientes contra quem atualiza dois dos
# mesmos em outra ordem) cai com 40P01 sem dado errado e está escrito no README; não tem rodada aqui.
set -euo pipefail
PSQL=("${PSQL_BIN:-psql}" -v ON_ERROR_STOP=1 -q -X -tA)
DIR="$(mktemp -d)"
trap 'rm -rf "$DIR"' EXIT

# Os dados ficam confirmados (cada conexão precisa vê-los); este script roda no banco temporário
# do test-db.sh, depois dos testes pgTAP.
"${PSQL[@]}" >/dev/null <<'SQL'
create table teste.cso_ids as select teste.escritorio('Concorrência dos casos') as esc, teste.pessoa('Marina Ribeiro') as socia;
select teste.vincular(socia, esc) from teste.cso_ids;
select etapas_garantir(esc) from teste.cso_ids;
create function teste.cso_cliente(p_nome text) returns uuid language sql as $$
  select (portal_cliente_cadastrar(socia, esc, jsonb_build_object('tipo', 'PF', 'nome', p_nome, 'origem', 'GOOGLE',
    'contatos', jsonb_build_array(jsonb_build_object('nome', p_nome, 'telefone', '+5511984723316', 'principal', true)))) ->> 'id')::uuid
  from teste.cso_ids $$;
-- O resultado de uma chamada: o que deu certo, ou o código e o motivo (ou os campos) do erro. O
-- deadlock também vira texto, com o código 40P01, e o roteiro procura por ele.
create function teste.cso_tentar(p_ok text, p_sql text) returns text language plpgsql as $$
declare v_codigo text; v_detalhe text; d jsonb;
begin
  execute p_sql;
  return p_ok;
exception when others then
  get stacked diagnostics v_codigo = returned_sqlstate, v_detalhe = pg_exception_detail;
  if v_detalhe like '{%' then d := v_detalhe::jsonb; end if;
  return v_codigo || ' ' || coalesce(d ->> 'motivo', d ->> 'campos', v_detalhe, '');
end $$;
create function teste.cso_excluir(p_cliente uuid) returns text language sql as $$
  select teste.cso_tentar('EXCLUIU', format('select portal_cliente_excluir_dados(%L, %L, %L, %s, %L)', i.socia, c.escritorio_id, p_cliente, c.versao,
    jsonb_build_object('pedidoEm', hoje_brasilia(), 'canal', 'TELEFONE', 'quemPediu', 'TITULAR', 'conferido', true, 'nomeConfirmado', c.nome)))
    from clientes_escritorio c, teste.cso_ids i where c.id = p_cliente $$;
create function teste.cso_dados_caso(p_nome text, p_clientes uuid[]) returns jsonb language sql as $$
  select jsonb_build_object('nome', p_nome, 'area', 'CIVEL', 'responsavelId', socia,
    'etapaId', (select id from etapas where escritorio_id = esc and not final order by ordem limit 1),
    'clientes', (select jsonb_agg(jsonb_build_object('clienteId', c, 'papel', 'AUTOR') order by n) from unnest(p_clientes) with ordinality t(c, n)))
  from teste.cso_ids $$;
create function teste.cso_caso(p_nome text, p_clientes uuid[]) returns uuid language sql as $$
  select (portal_juridico_caso_criar(socia, esc, teste.cso_dados_caso(p_nome, p_clientes)) ->> 'id')::uuid from teste.cso_ids $$;
create function teste.cso_cadastrar(p_nome text, p_clientes uuid[]) returns text language sql as $$
  select teste.cso_tentar('CADASTROU', format('select portal_juridico_caso_criar(%L, %L, %L)', socia, esc, teste.cso_dados_caso(p_nome, p_clientes)))
  from teste.cso_ids $$;
create function teste.cso_adicionar(p_caso uuid, p_cliente uuid) returns text language sql as $$
  select teste.cso_tentar('ADICIONOU', format('select portal_juridico_caso_cliente(%L, %L, %L, %L)', socia, esc, p_caso,
    jsonb_build_object('clienteId', p_cliente, 'papel', 'AUTOR')))
  from teste.cso_ids $$;
-- A importação dos processos (a filha da importação dos contatos), com a linha da cliente pelo nome,
-- a prévia feita: só falta importar.
create function teste.cso_importacao(p_cliente text, p_numero text, p_tel text) returns uuid language plpgsql as $$
declare i teste.cso_ids; j jsonb; v uuid; f uuid;
begin
  select * into i from teste.cso_ids;
  j := portal_importacao_criar(i.socia, i.esc, jsonb_build_object(
    'arquivoNome', 'backup-astrea.xlsx', 'oQue', 'CLIENTES', 'origem', 'ASTREA', 'modelo', 'astrea-2026-11',
    'abas', jsonb_build_array(
      jsonb_build_object('nome', 'Contatos', 'colunas', jsonb_build_array('Nome', 'Tipo', 'Celular'),
        'linhas', jsonb_build_array(jsonb_build_array('Vera de ' || p_cliente, 'Cliente', p_tel))),
      jsonb_build_object('nome', 'Processos', 'colunas', jsonb_build_array('Número', 'Cliente', 'Parte contrária', 'Área', 'Fase', 'Situação', 'Responsável'),
        'linhas', jsonb_build_array(jsonb_build_array(p_numero, p_cliente, 'Banco Sul', 'Cível', 'Inicial', 'Ativo', 'Dra. Marina')))),
    'sistema', jsonb_build_array(
      jsonb_build_object('nome', 'Contatos', 'linhas', 1, 'destino', 'CLIENTES', 'reconhecida', true,
                         'porModelo', jsonb_build_object('0', 'nome', '1', 'tipo_contato', '2', 'telefone')),
      jsonb_build_object('nome', 'Processos', 'linhas', 1, 'destino', 'CASOS', 'reconhecida', true,
                         'porModelo', jsonb_build_object('0', 'numero', '1', 'cliente', '2', 'parte_contraria', '3', 'area', '4', 'etapa',
                                                         '5', 'situacao_processo', '6', 'responsavel')))));
  v := (j ->> 'id')::uuid;
  perform portal_importacao_colunas(i.socia, i.esc, v, (select versao from importacoes where id = v), jsonb_build_object('aba', 0, 'ligacao', j -> 'ligacao'));
  f := (portal_importacao_importar(i.socia, i.esc, v, (select versao from importacoes where id = v)) -> 'filha' ->> 'id')::uuid;
  perform portal_importacao_colunas(i.socia, i.esc, f, (select versao from importacoes where id = f), jsonb_build_object('ligacao', (select ligacao from importacoes where id = f)));
  return f;
end $$;
create function teste.cso_importar(p_importacao uuid) returns text language sql as $$
  select teste.cso_tentar('IMPORTOU', format('select portal_importacao_importar(%L, %L, %L, %s)', socia, esc, p_importacao,
    (select versao from importacoes where id = p_importacao)))
  from teste.cso_ids $$;
create table teste.cso_set (chave text primary key, cli uuid, outro uuid, caso uuid, imp uuid, imp2 uuid);
insert into teste.cso_set (chave, cli, outro) select k, teste.cso_cliente('Cliente ' || k), teste.cso_cliente('Base ' || k)
  from unnest(array['k1', 'k2', 'k3', 'k4', 'k5', 'k6', 'k7', 'k8', 'k9']) k;
update teste.cso_set set caso = teste.cso_caso('Caso ' || chave, array[outro]) where chave in ('k1', 'k2');
SQL
# A prévia da importação dos processos (uma prévia aberta por vez: a nova encerra a anterior).
previa() { "${PSQL[@]}" -c "update teste.cso_set set imp = teste.cso_importacao('Cliente $1', '$2', '$3') where chave = '$1'" >/dev/null; }
# F3.185: o caso X de cada rodada, o caso novo de uma importação dos processos já desfeita, só com a
# cliente da rodada (a ligação da própria importação).
desfeito() {
  previa "$1" "$2" "$3"
  "${PSQL[@]}" >/dev/null <<SQL
select portal_importacao_importar(i.socia, i.esc, s.imp, (select versao from importacoes where id = s.imp)) from teste.cso_set s, teste.cso_ids i where s.chave = '$1';
select portal_importacao_desfazer(i.socia, i.esc, s.imp, 'Backup errado') from teste.cso_set s, teste.cso_ids i where s.chave = '$1';
update teste.cso_set s set caso = (select c.id from casos c where c.importacao_id = s.imp) where s.chave = '$1';
SQL
}

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
de() { echo "(select $2 from teste.cso_set where chave = '$1')"; }
excluir() { echo "select teste.cso_excluir($(de "$1" cli));"; }
adicionar() { echo "select teste.cso_adicionar($(de "$1" caso), $(de "$1" cli));"; }
importar() { echo "select teste.cso_importar($(de "$1" imp));"; }
q() { "${PSQL[@]}" -c "$1"; }
falhas=()
confere() { # $1 = rodada, $2 = o que a conexão 1 devolve, $3 = o que a conexão 2 devolve
  grep -qx "$2" "$DIR/$1.1" || falhas+=("$1: a conexão 1 devia dar '$2' ($(tr '\n' ' ' < "$DIR/$1.1"))")
  grep -qx "$3" "$DIR/$1.2" || falhas+=("$1: a conexão 2 devia dar '$3' ($(tr '\n' ' ' < "$DIR/$1.2"))")
}
ligacoes() { q "select count(*) from caso_clientes where cliente_id = $(de "$1" cli)"; }

# k1. Adicionar segura; a exclusão espera e recusa.
corrida k1 "$(adicionar k1)" "$(excluir k1)"
confere k1 ADICIONOU "TC422 TEM_CONTRATO_OU_PROCESSO"

# k2. A exclusão segura; adicionar espera no cliente e recusa.
corrida k2 "$(excluir k2)" "$(adicionar k2)"
confere k2 EXCLUIU "TC422 CLIENTE_EXCLUIDO"
[ "$(ligacoes k2)" = "0" ] || falhas+=("k2: nasceu ligação para a cliente excluída")

# k3. A exclusão segura; o cadastro do caso com dois clientes espera e recusa.
corrida k3 "$(excluir k3)" "select teste.cso_cadastrar('Caso k3 novo', array[$(de k3 outro), $(de k3 cli)]);"
confere k3 EXCLUIU "TC422 CLIENTE_EXCLUIDO"
[ "$(q "select count(*) from casos c, teste.cso_ids i where c.escritorio_id = i.esc and c.nome = 'Caso k3 novo'")" = "0" ] \
  || falhas+=("k3: o caso nasceu")

# k4. A importação dos processos segura; a exclusão espera e recusa.
previa k4 2000101-47.2025.5.02.0001 '(11) 93333-0104'
corrida k4 "$(importar k4)" "$(excluir k4)"
confere k4 IMPORTOU "TC422 TEM_CONTRATO_OU_PROCESSO"
[ "$(ligacoes k4)" = "1" ] || falhas+=("k4: esperava a ligação da importação, veio $(ligacoes k4)")

# k5. A exclusão segura; a importação espera no INSERT da ligação e volta inteira.
previa k5 2000102-32.2025.5.02.0001 '(11) 93333-0105'
corrida k5 "$(excluir k5)" "$(importar k5)"
confere k5 EXCLUIU "TC422 CLIENTE_EXCLUIDO"
r=$(q "select (select count(*) from caso_clientes where cliente_id = s.cli) || ' ' || (select count(*) from casos where importacao_id = s.imp)
         || ' ' || i.estado from teste.cso_set s join importacoes i on i.id = s.imp where s.chave = 'k5'")
[ "$r" = "0 0 PREVIA" ] || falhas+=("k5: esperava nenhuma ligação, nenhum caso e a importação em prévia, veio '$r'")

# k6. Adicionar outra pessoa a X segura; a exclusão espera no caso, exclui e X fica com o nome.
desfeito k6 2000103-17.2025.5.02.0001 '(11) 93333-0106'
corrida k6 "select teste.cso_adicionar($(de k6 caso), $(de k6 outro));" "$(excluir k6)"
confere k6 ADICIONOU EXCLUIU
r=$(q "select (select count(*) from caso_clientes where caso_id = s.caso) || ' ' || c.nome from teste.cso_set s join casos c on c.id = s.caso where s.chave = 'k6'")
[ "$r" = "1 Cliente k6 x Banco Sul" ] || falhas+=("k6: esperava X com a outra pessoa e o nome, veio '$r'")

# k7. A exclusão segura (já com o UPDATE de X); adicionar a cliente a X espera no cliente e recusa.
desfeito k7 2000104-02.2025.5.02.0001 '(11) 93333-0107'
corrida k7 "$(excluir k7)" "$(adicionar k7)"
confere k7 EXCLUIU "TC422 CLIENTE_EXCLUIDO"
r=$(q "select (select count(*) from caso_clientes where caso_id = s.caso) || ' ' || c.nome from teste.cso_set s join casos c on c.id = s.caso where s.chave = 'k7'")
[ "$r" = "0 Caso de importação desfeita" ] || falhas+=("k7: esperava X sem cliente e com o nome novo, veio '$r'")

# k8. A importação junta outra pessoa a X e segura; a exclusão troca o nome sem esperar.
desfeito k8 2000105-84.2025.5.02.0001 '(11) 93333-0108'
"${PSQL[@]}" >/dev/null <<'SQL'
update teste.cso_set set imp2 = teste.cso_importacao('Base k8', '2000105-84.2025.5.02.0001', '(11) 93333-0118') where chave = 'k8';
select portal_importacao_decidir(i.socia, i.esc, s.imp2, '{"codigo": "CASO_DUPLICADO", "decisao": "JUNTAR"}') from teste.cso_set s, teste.cso_ids i where s.chave = 'k8';
SQL
corrida k8 "select teste.cso_importar($(de k8 imp2));" "$(excluir k8)"
confere k8 IMPORTOU EXCLUIU
r=$(q "select (select string_agg(k.nome, ',') from caso_clientes cc join clientes_escritorio k on k.id = cc.cliente_id where cc.caso_id = s.caso) || ' ' || c.nome
         from teste.cso_set s join casos c on c.id = s.caso where s.chave = 'k8'")
[ "$r" = "Base k8 Caso de importação desfeita" ] || falhas+=("k8: esperava X com Base k8 e o nome novo, veio '$r'")

# k9. A exclusão segura; o levantamento da cliente em X espera no cliente e recusa.
desfeito k9 2000106-69.2025.5.02.0001 '(11) 93333-0109'
levantamento="select teste.cso_tentar('REGISTROU', format('select portal_financeiro_levantamento_registrar(%L, %L, %L)', i.socia, i.esc,
  jsonb_build_object('tipo', 'ALVARA', 'casoId', s.caso, 'clienteId', s.cli, 'valor', 100000, 'entrouEm', hoje_brasilia(),
    'divisao', jsonb_build_array(jsonb_build_object('para', 'CLIENTE', 'valor', 100000))))) from teste.cso_set s, teste.cso_ids i where s.chave = 'k9';"
corrida k9 "$(excluir k9)" "$levantamento"
confere k9 EXCLUIU "TC422 CLIENTE_EXCLUIDO"
[ "$(q "select count(*) from levantamentos where cliente_id = $(de k9 cli)")" = "0" ] || falhas+=("k9: nasceu levantamento para a cliente excluída")

if grep -qi "deadlock\|40P01" "$DIR"/k*; then falhas+=("deadlock: $(grep -il "deadlock\|40P01" "$DIR"/k* | xargs -n1 basename | tr '\n' ' ')"); fi
if [ ${#falhas[@]} -gt 0 ]; then
  echo "Exclusão com ligação a caso simultânea: falhou"
  printf '  %s\n' "${falhas[@]}"
  exit 1
fi
echo "Exclusão com ligação a caso simultânea: ok (adicionar, cadastrar, importar e o levantamento antes ou depois da exclusão, com o caso desfeito, sem deadlock)"
