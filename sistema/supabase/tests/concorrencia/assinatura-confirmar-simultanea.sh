#!/usr/bin/env bash
# A confirmação da assinatura e o começo da cobrança depois do teste grátis (F1.32; CO-09,
# migration 1161), com duas conexões de verdade, as duas como service_role (como a api-console e o
# pg_cron chamam o banco) e com commit:
#  a. duas confirmações ao mesmo tempo (Administração e Financeiro): a primeira segura a transação;
#     a segunda espera a linha do teste e, quando ela sai, recebe JA_ASSINADO. Uma confirmação, um
#     evento e nenhuma fatura (ainda é o teste);
#  b. no dia seguinte ao fim, o Ativo (que chama cobranca_comecar) segura a transação e a rotina
#     chega no meio: a rotina espera a assinatura e não começa de novo. Uma fatura e um começo;
#  c. o teste acabado: a confirmação (que começa a cobrança na hora) segura a transação e a rotina
#     chega no meio. Uma fatura e um começo, no dia da confirmação.
# O relógio e a chave teste_gratis_ligado voltam ao normal no fim, para os outros testes.
set -euo pipefail
PSQL=("${PSQL_BIN:-psql}" -v ON_ERROR_STOP=1 -q -X -tA)
DIR="$(mktemp -d)"
trap 'rm -rf "$DIR"; "${PSQL[@]}" -c "drop table if exists teste.acs; update configuracoes set valor = '"'"'false'"'"' where chave = '"'"'teste_gratis_ligado'"'"'; select ajustar_relogio(interval '"'"'0'"'"')" >/dev/null 2>&1 || true' EXIT

"${PSQL[@]}" >/dev/null <<'SQL'
begin;
select ajustar_relogio('2026-11-27 10:00-03'::timestamptz - now());
update configuracoes set valor = 'true' where chave = 'teste_gratis_ligado';
create table teste.acs as select teste.equipe('Administração da confirmação', 'ADMINISTRACAO') adm,
  teste.equipe('Financeiro da confirmação', 'FINANCEIRO') fin,
  teste.pessoa('Sócia da dupla confirmação') s1, teste.pessoa('Sócia do Ativo com a rotina') s2,
  teste.pessoa('Sócia do teste acabado') s3;
alter table teste.acs add column e1 uuid, add column e2 uuid, add column e3 uuid, add column plano uuid;
update teste.acs set e1 = console_criar_escritorio(adm, 'Dupla confirmação Advocacia', 'Salvador', 'BA'),
                     e2 = console_criar_escritorio(adm, 'Ativo e rotina Advocacia', 'Salvador', 'BA'),
                     e3 = console_criar_escritorio(adm, 'Teste acabado Advocacia', 'Salvador', 'BA');
update teste.acs set plano = (console_plano_salvar(adm, null, null, '{"nome":"Plano da confirmação simultânea","precoCentavos":49900,"pessoasIncluidas":2}') ->> 'id')::uuid;
select limpar_contexto();
insert into vinculos (pessoa_id, escritorio_id, funcao, criado_por)
  select s1, e1, 'SOCIO', adm from teste.acs union all select s2, e2, 'SOCIO', adm from teste.acs
  union all select s3, e3, 'SOCIO', adm from teste.acs
  union all select fin, e, 'FINANCEIRO', adm from teste.acs, unnest(array[e1, e2, e3]) e;
update pessoas set senha_criada_em = now() where id in (select unnest(array[s1, s2, s3]) from teste.acs);
select escolher_escritorio(s1, gen_random_uuid(), e1), escolher_escritorio(s2, gen_random_uuid(), e2),
       escolher_escritorio(s3, gen_random_uuid(), e3) from teste.acs;
select console_assinatura_salvar(fin, e, null, jsonb_build_object('planoId', plano, 'diaVencimento', 10, 'forma', 'PIX',
  'emailCobranca', 'financeiro@exemplo.com.br')) from teste.acs, unnest(array[e1, e2, e3]) e;
-- A e2 é confirmada no teste (a cobrança fica para o dia seguinte ao fim).
select console_assinatura_confirmar(adm, e2, (select versao from assinaturas where escritorio_id = e2),
  '{"como":"EMAIL","detalhe":"Confirmou pelo e-mail"}') from teste.acs;
grant usage on schema teste to service_role;
grant execute on function teste.erro(text) to service_role;
commit;
SQL
read -r ADM FIN E1 E2 E3 < <("${PSQL[@]}" -F ' ' -c "select adm, fin, e1, e2, e3 from teste.acs")
V1=$("${PSQL[@]}" -c "select versao from assinaturas where escritorio_id = '$E1'")

# a. Duas confirmações ao mesmo tempo, no teste.
"${PSQL[@]}" > "$DIR/a" 2>&1 <<SQL &
begin;
set local role service_role;
select console_assinatura_confirmar('$ADM', '$E1', $V1, '{"como":"PORTAL","detalhe":"Pediu no Portal e confirmou por telefone"}') is not null;
select pg_sleep(2);
commit;
SQL
sleep 0.7
seg=$("${PSQL[@]}" 2>&1 <<SQL | tail -1
begin;
set local role service_role;
select coalesce(teste.erro(format('select console_assinatura_confirmar(%L, %L, %s, %L)', '$FIN', '$E1', $V1,
  '{"como":"WHATSAPP","detalhe":"Mandou o ok pelo WhatsApp"}')) -> 'detalhe' ->> 'motivo', 'sem erro');
commit;
SQL
) || true
wait
a=$("${PSQL[@]}" -c "select (select count(*) from fatura_eventos where escritorio_id = '$E1' and acao = 'assinatura.confirmada') || ' ' ||
  (select assinada_como from assinaturas where escritorio_id = '$E1') || ' ' ||
  (select count(*) from faturas where escritorio_id = '$E1')")
if [ "$seg" != "JA_ASSINADO" ] || [ "$a" != "1 PORTAL 0" ] || grep -qi "error" "$DIR/a"; then
  echo "Confirmação simultânea: as duas confirmações falharam (segunda: $seg; eventos, como, faturas: $a; primeira: $(cat "$DIR/a"))"
  exit 1
fi

# b. 04/12, o dia seguinte ao fim: o Ativo segura a transação e a rotina chega no meio.
"${PSQL[@]}" -c "select ajustar_relogio('2026-12-04 09:00-03'::timestamptz - now())" >/dev/null
VC2=$("${PSQL[@]}" -c "select versao from clientes where escritorio_id = '$E2'")
"${PSQL[@]}" > "$DIR/b" 2>&1 <<SQL &
begin;
set local role service_role;
select console_mudar_estagio('$ADM', '$E2', $VC2, 'ATIVO', 'Implantação concluída') is not null;
select pg_sleep(2);
commit;
SQL
sleep 0.7
"${PSQL[@]}" > "$DIR/c" 2>&1 <<SQL
begin;
set local role service_role;
select cobranca_rotina() is not null;
commit;
SQL
wait
b=$("${PSQL[@]}" -c "select (select count(*) from faturas where escritorio_id = '$E2') || ' ' ||
  (select count(*) from fatura_eventos where escritorio_id = '$E2' and acao = 'cobranca.comecou') || ' ' ||
  (select inicio_cobranca || ' ' || primeira_competencia from assinaturas where escritorio_id = '$E2')")
if [ "$b" != "1 1 2026-12-04 2027-01-01" ] || grep -qi "error" "$DIR/b" "$DIR/c"; then
  echo "Confirmação simultânea: o Ativo e a rotina ao mesmo tempo falharam ($b; Ativo: $(cat "$DIR/b"); rotina: $(cat "$DIR/c"))"
  exit 1
fi

# c. O teste da e3 acabou sem confirmação: a confirmação segura a transação e a rotina chega no meio.
V3=$("${PSQL[@]}" -c "select versao from assinaturas where escritorio_id = '$E3'")
"${PSQL[@]}" > "$DIR/d" 2>&1 <<SQL &
begin;
set local role service_role;
select console_assinatura_confirmar('$FIN', '$E3', $V3, '{"como":"REUNIAO_OU_LIGACAO","detalhe":"Ligação de 04/12"}') is not null;
select pg_sleep(2);
commit;
SQL
sleep 0.7
"${PSQL[@]}" > "$DIR/e" 2>&1 <<SQL
begin;
set local role service_role;
select cobranca_rotina() is not null;
commit;
SQL
wait
c=$("${PSQL[@]}" -c "select (select count(*) from faturas where escritorio_id = '$E3') || ' ' ||
  (select count(*) from fatura_eventos where escritorio_id = '$E3' and acao = 'cobranca.comecou') || ' ' ||
  (select inicio_cobranca || ' ' || primeira_competencia from assinaturas where escritorio_id = '$E3')")
if [ "$c" != "1 1 2026-12-04 2027-01-01" ] || grep -qi "error" "$DIR/d" "$DIR/e"; then
  echo "Confirmação simultânea: a confirmação e a rotina ao mesmo tempo falharam ($c; confirmação: $(cat "$DIR/d"); rotina: $(cat "$DIR/e"))"
  exit 1
fi
echo "Confirmação simultânea: ok (duas confirmações dão uma e JA_ASSINADO; o Ativo e a confirmação com a rotina ao mesmo tempo começam a cobrança uma vez só)"
