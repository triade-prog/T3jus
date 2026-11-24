#!/usr/bin/env bash
# O aviso de caso pronto para encerrar (F3.147; EX-16, EX-17) com duas conexões de verdade, as duas
# como service_role, como a api-portal chama o banco, e com commit de verdade (o gatilho adiado
# roda com o papel do commit no Postgres 17).
#  a. as duas últimas pendências do mesmo caso em transações ao mesmo tempo: a conexão 1 paga a
#     parcela, confere na hora (set constraints all immediate, tomando a trava do caso) e segura;
#     a conexão 2 marca o reembolso e faz commit enquanto isso. A conferência da 2 espera a trava
#     e, quando ela sai, enxerga as duas: exatamente um período e um aviso por pessoa. Sem a trava,
#     nenhuma das duas veria o caso pronto, e não sairia aviso;
#  b. duas transações que tocam os casos A e B em ordem trocada terminam sem deadlock, porque a
#     conferência trava os casos em ordem de caso_id.
set -euo pipefail
PSQL=("${PSQL_BIN:-psql}" -v ON_ERROR_STOP=1 -q -X -tA)
DIR="$(mktemp -d)"
trap 'rm -rf "$DIR"; "${PSQL[@]}" -c "drop table if exists teste.cpf" >/dev/null 2>&1 || true' EXIT

"${PSQL[@]}" >/dev/null <<'SQL'
begin;
create table teste.cpf as select teste.escritorio('Concorrência do caso pronto') e, teste.pessoa('Sócia do caso pronto') s,
  teste.pessoa('Diego do caso pronto') d, teste.pessoa('Bianca do caso pronto') b;
select teste.vincular(s, e) from teste.cpf;
select portal_convidar(s, e, d, 'Diego do caso pronto', array['FINANCEIRO']), portal_convidar(s, e, b, 'Bianca do caso pronto', array['FINANCEIRO'])
  from teste.cpf;
select portal_juridico_casos(s, e) is not null from teste.cpf; -- cria as etapas do escritório
create function pg_temp.caso(p_nome text, p_tel text) returns uuid language plpgsql as $$
declare
  x teste.cpf;
  v_cli uuid;
  v_ct uuid;
  v_caso uuid;
begin
  select * into x from teste.cpf;
  v_cli := (portal_cliente_cadastrar(x.s, x.e, jsonb_build_object('tipo', 'PF', 'nome', p_nome, 'origem', 'GOOGLE',
    'contatos', jsonb_build_array(jsonb_build_object('nome', p_nome, 'telefone', p_tel, 'principal', true)))) ->> 'id')::uuid;
  v_ct := (portal_contrato_criar(x.s, x.e, jsonb_build_object('clienteId', v_cli, 'objeto', 'Honorários do caso', 'responsavelId', x.s,
    'advogados', jsonb_build_array(x.s), 'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'FIXO', 'valor', 90000,
    'vencimento', hoje_brasilia())))) ->> 'id')::uuid;
  perform portal_contrato_assinatura(x.s, x.e, v_ct, 1, hoje_brasilia());
  v_caso := (portal_juridico_caso_criar(x.s, x.e, jsonb_build_object('nome', p_nome || ' x Banco', 'area', 'CIVEL',
    'etapaId', (select id from etapas where escritorio_id = x.e and ordem = 5), 'responsavelId', x.s,
    'clientes', jsonb_build_array(jsonb_build_object('clienteId', v_cli, 'papel', 'AUTOR', 'contratoId', v_ct)))) ->> 'id')::uuid;
  return v_caso;
end $$;
-- Uma despesa adiantada do caso, com reembolso à parte (não depende da parcela).
create function pg_temp.conta(p_caso uuid, p_desc text) returns uuid language sql as $$
  select (portal_financeiro_conta_lancar(x.d, x.e, jsonb_build_object('descricao', p_desc, 'categoria', 'CUSTAS', 'valor', 4500,
    'vencimento', hoje_brasilia(), 'adiantada', true, 'casoId', p_caso,
    'clienteId', (select cliente_id from caso_clientes where caso_id = p_caso), 'reembolsoComo', 'A_PARTE')) ->> 'id')::uuid from teste.cpf x
$$;
alter table teste.cpf add column ka uuid, add column kb uuid, add column kc uuid;
update teste.cpf set ka = pg_temp.caso('Caso Simultâneo', '+5511984220001'), kb = pg_temp.caso('Caso Ordem A', '+5511984220002'),
                     kc = pg_temp.caso('Caso Ordem B', '+5511984220003');
-- a: a parcela fica aberta e uma despesa por reembolsar. b: parcelas pagas e duas despesas por caso.
alter table teste.cpf add column pa uuid, add column ca uuid, add column a1 uuid, add column a2 uuid, add column b1 uuid, add column b2 uuid;
update teste.cpf set pa = (select r.id from recebimentos_previstos r join caso_clientes cc on cc.contrato_id = r.contrato_id where cc.caso_id = ka),
                     ca = pg_temp.conta(ka, 'Custas do caso simultâneo'),
                     a1 = pg_temp.conta(kb, 'Custas um'), a2 = pg_temp.conta(kb, 'Custas dois'),
                     b1 = pg_temp.conta(kc, 'Custas um'), b2 = pg_temp.conta(kc, 'Custas dois');
select portal_financeiro_receber_registrar_recibo(d, e, r.id, jsonb_build_object('valor', 90000, 'recebidoEm', hoje_brasilia(), 'forma', 'PIX'))
  from teste.cpf, recebimentos_previstos r join caso_clientes cc on cc.contrato_id = r.contrato_id where cc.caso_id in (kb, kc);
select portal_juridico_caso_etapa(s, e, k, (select versao from casos where id = k),
  jsonb_build_object('etapaId', (select id from etapas where escritorio_id = e and final), 'motivo', 'Sentença sem recurso', 'resultado', 'PERDA'))
  from teste.cpf, unnest(array[ka, kb, kc]) k;
commit;
SQL

read -r E D B PA CA A1 A2 B1 B2 <<<"$("${PSQL[@]}" -F ' ' -c "select e, d, b, pa, ca, a1, a2, b1, b2 from teste.cpf")"
HOJE=$("${PSQL[@]}" -c "select hoje_brasilia()")
pagar="select portal_financeiro_receber_registrar_recibo('$D', '$E', '$PA', jsonb_build_object('valor', 90000, 'recebidoEm', '$HOJE', 'forma', 'PIX')) is not null"
reembolsar() { echo "select portal_financeiro_conta_reembolsada('$1', '$E', '$2', jsonb_build_object('reembolsadoEm', '$HOJE')) is not null;"; }

# a. A conexão 1 paga, confere na hora e segura a trava; a 2 marca o reembolso e faz commit.
"${PSQL[@]}" > "$DIR/a1" 2>&1 <<SQL &
begin;
set local role service_role;
$pagar;
set constraints all immediate;
select pg_sleep(2);
commit;
SQL
sleep 0.7
"${PSQL[@]}" > "$DIR/a2" 2>&1 <<SQL
begin;
set local role service_role;
$(reembolsar "$B" "$CA")
commit;
SQL
wait

# b. Ordem trocada: a 1 toca A e depois B, confere na hora e segura; a 2 toca B e depois A.
"${PSQL[@]}" > "$DIR/b1" 2>&1 <<SQL &
begin;
set local role service_role;
$(reembolsar "$D" "$A1")
$(reembolsar "$D" "$B1")
set constraints all immediate;
select pg_sleep(2);
commit;
SQL
sleep 0.7
"${PSQL[@]}" > "$DIR/b2" 2>&1 <<SQL
begin;
set local role service_role;
$(reembolsar "$B" "$B2")
$(reembolsar "$B" "$A2")
commit;
SQL
wait

resultado=$("${PSQL[@]}" <<'SQL'
select (select count(*) from casos_prontos_fechar p, teste.cpf where p.caso_id = ka) || ' '
    || (select count(*) from avisos_sino a, teste.cpf where a.origem_id = ka) || ' '
    || (select count(distinct pessoa_id) from avisos_sino a, teste.cpf where a.origem_id = ka) || ' '
    || (select count(*) from casos_prontos_fechar p, teste.cpf where p.caso_id in (kb, kc) and p.saiu_em is null) || ' '
    || (select count(*) from historico h, teste.cpf where h.escritorio_id = e and h.acao like 'financeiro.caso_pronto_%')
  from teste.cpf;
SQL
)

if [ "$resultado" != "1 2 2 2 0" ] || grep -qi "error\|deadlock" "$DIR/a1" "$DIR/a2" "$DIR/b1" "$DIR/b2"; then
  echo "Caso pronto ao mesmo tempo: falhou (períodos, avisos, pessoas, períodos A e B, falhas: $resultado; a1: $(cat "$DIR/a1"); a2: $(cat "$DIR/a2"); b1: $(cat "$DIR/b1"); b2: $(cat "$DIR/b2"))"
  exit 1
fi
echo "Caso pronto ao mesmo tempo: ok (a segunda conferência espera a trava e avisa uma vez; a ordem trocada termina sem deadlock)"
