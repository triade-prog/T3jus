#!/usr/bin/env bash
# Duas trocas do carnê ao mesmo tempo (F1.28; CO-10, migration 1170), com duas conexões de verdade:
# a primeira segura a transação; a segunda espera a trava da assinatura e recebe o conflito de
# versão. Fica um carnê novo só, sem parcela repetida.
set -euo pipefail
PSQL=("${PSQL_BIN:-psql}" -v ON_ERROR_STOP=1 -q -X -tA)
DIR="$(mktemp -d)"
trap 'rm -rf "$DIR"; "${PSQL[@]}" -c "drop table if exists teste.ct" >/dev/null 2>&1 || true' EXIT

"${PSQL[@]}" >/dev/null <<'SQL'
begin;
create table teste.ct as select teste.equipe('Administração da troca', 'ADMINISTRACAO') adm, teste.equipe('Financeiro da troca', 'FINANCEIRO') fin,
  teste.pessoa('Sócia da troca') socia;
alter table teste.ct add column e uuid, add column pl uuid;
update teste.ct set e = console_criar_escritorio(adm, 'Concorrência do carnê', 'Recife', 'PE');
insert into vinculos (pessoa_id, escritorio_id, funcao, criado_por)
  select fin, e, 'FINANCEIRO', adm from teste.ct union all select socia, e, 'SOCIO', adm from teste.ct;
update pessoas set senha_criada_em = now() where id = (select socia from teste.ct);
update teste.ct set pl = (console_plano_salvar(adm, null, null, '{"nome":"Concorrência do carnê","precoCentavos":49900,"pessoasIncluidas":6}') ->> 'id')::uuid;
select console_assinatura_salvar(fin, e, null, jsonb_build_object('planoId', pl, 'diaVencimento', 10, 'forma', 'CARNE', 'emailCobranca', 'a@troca.adv.br',
  'desconto', jsonb_build_object('pct', 20, 'ate', (competencia_de(hoje_brasilia()) + interval '3 months')::date, 'motivo', 'Escritório novo')))
  from teste.ct;
select console_mudar_estagio(adm, e, (select versao from clientes where escritorio_id = e), 'ATIVO', 'Pronto') from teste.ct;
commit;
SQL
V=$("${PSQL[@]}" -c "select versao from assinaturas a, teste.ct where a.escritorio_id = e")

# A primeira troca segura a transação por 2 segundos.
"${PSQL[@]}" > "$DIR/a" 2>&1 <<SQL &
begin;
select (console_carne_novo(fin, e, $V, 'Primeira troca') ->> 'carneNovoId') is not null from teste.ct;
select pg_sleep(2);
commit;
SQL
sleep 0.7
b=$("${PSQL[@]}" -c "select teste.erro(format('select console_carne_novo(%L, %L, %s, %L)', fin, e, $V, 'Segunda troca')) ->> 'codigo' from teste.ct" 2>&1)
wait
fim=$("${PSQL[@]}" -c "select (select count(*) from assinatura_carnes k where k.escritorio_id = e) || ' ' ||
  (select count(*) from assinatura_carnes k where k.escritorio_id = e and k.substituido_em is null) || ' ' ||
  (select count(*) from (select p.competencia from assinatura_carne_parcelas p join assinatura_carnes k on k.id = p.carne_id
     where k.escritorio_id = e and p.situacao <> 'CANCELADA' group by p.competencia having count(*) > 1) x) from teste.ct")

if [ "$b" != "TC409" ] || [ "$fim" != "2 1 0" ]; then
  echo "Duas trocas do carnê ao mesmo tempo: falhou (segunda: $b; carnês, em uso, meses repetidos: $fim; primeira: $(cat "$DIR/a"))"
  exit 1
fi
echo "Duas trocas do carnê ao mesmo tempo: ok"
