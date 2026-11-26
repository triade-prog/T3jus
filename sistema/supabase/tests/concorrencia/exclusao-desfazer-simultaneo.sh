#!/usr/bin/env bash
# F3.177 e F3.158 (PT-11, VA-05; plano revisado, seção 5.4) com duas conexões de verdade. Cada cenário
# roda nas duas ordens (a primeira conexão segura a transação por 2 segundos):
#  1. M1: a exclusão de um cliente com três lançamentos do sistema antigo (ids fora da ordem de
#     inserção, dois vencidos) e dois lembretes × o desfazer dessa importação. Sem 40P01: tudo
#     desfeito e as descrições vencidas com o texto fixo.
#  2. M1, rotina: a troca no marco (prazo_fiscal_historico_aplicar) × o desfazer. Sem 40P01.
#  3. M2: a exclusão × o "trazer de volta" do lembrete do mesmo cliente. Ou o trazer passa antes (e
#     a exclusão não acha detalhe), ou é recusado com CLIENTE_EXCLUIDO.
#  4. M6: a exclusão × a importação do financeiro do mesmo cliente. Com a exclusão antes, a
#     importação é recusada com CLIENTE_EXCLUIDO e não sobra lançamento nem lembrete; com a
#     importação antes, a exclusão espera e troca a descrição vencida.
#  5. O desfazer dos processos × o levantamento novo do cliente juntado: ou a ligação fica, ou ela
#     sai e a exclusão é recusada pela regra (d) (ou o levantamento não entra).
#  6. m4: o desfazer dos clientes × a exclusão do juntado. Resultado aceito: com a exclusão antes, o
#     desfazer pode falhar na primeira tentativa (o cliente excluído não muda, TC422) e passa na
#     segunda; nunca deadlock.
set -euo pipefail
PSQL=("${PSQL_BIN:-psql}" -v ON_ERROR_STOP=1 -q -X -tA)
DIR="$(mktemp -d)"
trap 'rm -rf "$DIR"' EXIT

# Os dados ficam confirmados (cada conexão precisa vê-los); este script roda no banco temporário
# do test-db.sh, depois dos testes pgTAP.
"${PSQL[@]}" >/dev/null <<'SQL'
create table teste.eds as select teste.escritorio('Concorrência do desfazer') a, teste.pessoa('Sócia do desfazer') p;
select teste.vincular(p, a) from teste.eds;
select etapas_garantir(a) from teste.eds;
create table teste.eds_set (chave text primary key, cli uuid, imp uuid, extra uuid);
create function teste.eds_cliente(p_nome text, p_email text default null) returns uuid language sql as $$
  select (portal_cliente_cadastrar(p, a, jsonb_build_object('tipo', 'PF', 'nome', p_nome, 'origem', 'GOOGLE',
    'contatos', jsonb_build_array(jsonb_strip_nulls(jsonb_build_object('nome', p_nome, 'telefone', '+5511984723316', 'email', p_email, 'principal', true))))) ->> 'id')::uuid
  from teste.eds $$;
-- A importação concluída, posta direto (o_que: FINANCEIRO, CASOS ou CLIENTES).
create function teste.eds_importacao(p_o_que text, p_concluida boolean default true) returns uuid language plpgsql as $$
declare v uuid;
begin
  perform definir_transicao('TESTE_CONCORRENCIA', null, true);
  insert into importacoes (escritorio_id, arquivo_nome, o_que, criado_por, origem) select a, 'backup.xlsx', p_o_que, p, 'ASTREA' from teste.eds returning id into v;
  if p_concluida then
    perform definir_transicao('TESTE_CONCORRENCIA', null, true);
    update importacoes set estado = 'CONCLUIDA', importado_em = app_now(), desfazer_ate = app_now() + interval '7 days' where id = v;
  end if;
  return v;
end $$;
create function teste.eds_lanc(p_imp uuid, p_cli uuid, p_id uuid, p_linha integer, p_data date, p_situacao text) returns void language sql as $$
  insert into historico_financeiro_anterior (id, escritorio_id, importacao_id, linha, cliente_id, data, descricao, valor_centavos, situacao, origem)
  select p_id, a, p_imp, p_linha, p_cli, p_data, 'Honorários antigos, linha ' || p_linha, 10000, p_situacao, 'ASTREA' from teste.eds $$;
create function teste.eds_lembrete(p_imp uuid, p_cli uuid, p_id uuid) returns void language sql as $$
  insert into lembrete_contrato (id, escritorio_id, importacao_id, cliente_id, valor_em_aberto_centavos, lancamentos)
  select p_id, a, p_imp, p_cli, 10000, 1 from teste.eds $$;
-- M1: três lançamentos com os ids fora da ordem de inserção (o 3, o 1 e o 2), dois de 2015 (vencidos),
-- e dois lembretes também fora da ordem.
create function teste.eds_m1(p_chave text) returns void language plpgsql as $$
declare
  c uuid := teste.eds_cliente('Cliente ' || p_chave);
  i uuid := teste.eds_importacao('FINANCEIRO');
  b text := substr(md5(p_chave), 1, 8);
begin
  perform teste.eds_lanc(i, c, (b || '-0000-4000-8000-000000000003')::uuid, 2, '2015-03-10', 'PAGO');
  perform teste.eds_lanc(i, c, (b || '-0000-4000-8000-000000000001')::uuid, 3, '2015-05-10', 'EM_ABERTO');
  perform teste.eds_lanc(i, c, (b || '-0000-4000-8000-000000000002')::uuid, 4, '2026-03-10', 'PAGO');
  perform teste.eds_lembrete(i, c, (b || '-0000-4000-8000-0000000000f2')::uuid);
  perform teste.eds_lembrete(i, c, (b || '-0000-4000-8000-0000000000f1')::uuid);
  insert into teste.eds_set values (p_chave, c, i);
end $$;
select teste.eds_m1('m1a'), teste.eds_m1('m1b'), teste.eds_m1('rota'), teste.eds_m1('rotb');
-- M2: o lembrete dispensado com o detalhe escrito.
create function teste.eds_m2(p_chave text) returns void language plpgsql as $$
declare
  c uuid := teste.eds_cliente('Cliente ' || p_chave);
  i uuid := teste.eds_importacao('FINANCEIRO');
  l uuid := gen_random_uuid();
begin
  perform teste.eds_lanc(i, c, gen_random_uuid(), 2, '2026-03-10', 'EM_ABERTO');
  perform teste.eds_lembrete(i, c, l);
  perform portal_lembrete_dispensar(p, a, l, '{"motivo": "OUTRO", "detalhe": "Pagou em dinheiro ao Dr. José"}') from teste.eds;
  insert into teste.eds_set values (p_chave, c, i, l);
end $$;
select teste.eds_m2('m2a'), teste.eds_m2('m2b');
-- M6: o cliente e a importação em prévia, que vai gravar o lançamento.
create function teste.eds_m6(p_chave text) returns void language sql as $$
  insert into teste.eds_set values (p_chave, teste.eds_cliente('Cliente ' || p_chave), teste.eds_importacao('FINANCEIRO', false)) $$;
select teste.eds_m6('m6a'), teste.eds_m6('m6b');
-- 5: o caso que já existia, com o cliente juntado pela importação dos processos.
create function teste.eds_c5(p_chave text) returns void language plpgsql as $$
declare
  c uuid := teste.eds_cliente('Cliente ' || p_chave);
  i uuid := teste.eds_importacao('CASOS');
  s uuid;
begin
  insert into casos (escritorio_id, nome, area, etapa_id, responsavel_id, criado_por)
  select a, 'Caso ' || p_chave, 'CIVEL', (select id from etapas where escritorio_id = a order by ordem limit 1), p, p from teste.eds returning id into s;
  insert into caso_clientes (escritorio_id, caso_id, cliente_id, papel, ordem, importacao_id) select a, s, c, 'AUTOR', 1, i from teste.eds;
  insert into teste.eds_set values (p_chave, c, i, s);
end $$;
select teste.eds_c5('c5a'), teste.eds_c5('c5b');
-- 6: o cliente juntado pela importação dos clientes (a planilha preencheu o e-mail).
create function teste.eds_c6(p_chave text) returns void language plpgsql as $$
declare
  c uuid := teste.eds_cliente('Cliente ' || p_chave, p_chave || '@exemplo.com.br');
  i uuid := teste.eds_importacao('CLIENTES');
begin
  insert into importacao_linhas (escritorio_id, importacao_id, numero, bruto, situacao, decisao, cliente_id, preenchidos)
  select a, i, 2, jsonb_build_object('nome', 'Cliente ' || p_chave), 'IMPORTADA', 'JUNTAR', c, jsonb_build_object('email', p_chave || '@exemplo.com.br') from teste.eds;
  insert into teste.eds_set values (p_chave, c, i);
end $$;
select teste.eds_c6('c6a'), teste.eds_c6('c6b');
SQL

excluir() { echo "select definir_transicao('EXCLUIU', null, true);
update clientes_escritorio set estado = 'EXCLUIDO', excluido_em = app_now(), nome = 'Cliente excluído', documento = null, contatos = '[]'
 where id = (select cli from teste.eds_set where chave = '$1');"; }
desfazer() { echo "select portal_importacao_desfazer(p, a, (select imp from teste.eds_set where chave = '$1'), 'Desfazer na corrida') is not null from teste.eds;"; }
rotina() { echo "select prazo_fiscal_historico_aplicar() is not null;"; }
trazer() { echo "select coalesce(teste.erro(\$q\$ select portal_lembrete_trazer(p, a, (select extra from teste.eds_set where chave = '$1')) from teste.eds \$q\$) -> 'detalhe' ->> 'motivo', 'TROUXE');"; }
importar() { echo "select coalesce(teste.erro(\$q\$ select teste.eds_lanc(s.imp, s.cli, gen_random_uuid(), 2, '2015-03-10', 'EM_ABERTO'), teste.eds_lembrete(s.imp, s.cli, gen_random_uuid()) from teste.eds_set s where chave = '$1' \$q\$) -> 'detalhe' ->> 'motivo', 'IMPORTOU');"; }
levantar() { echo "select coalesce(teste.erro(\$q\$ insert into levantamentos (escritorio_id, caso_id, cliente_id, tipo, valor, entrou_em, autor_id) select a, s.extra, s.cli, 'ALVARA', 100000, hoje_brasilia(), p from teste.eds, teste.eds_set s where s.chave = '$1' \$q\$) ->> 'codigo', 'LEVANTOU');"; }

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
falhas=()
sem_deadlock() { if grep -qi "deadlock\|40P01" "$DIR/$1.1" "$DIR/$1.2"; then falhas+=("$1: deadlock ($(cat "$DIR/$1.1" "$DIR/$1.2"))"); fi; }
q() { "${PSQL[@]}" -c "$1"; }
fixo="Lançamento do sistema antigo de cliente excluído"

# 1. M1, nas duas ordens.
corrida m1a "$(excluir m1a)" "$(desfazer m1a)"
corrida m1b "$(desfazer m1b)" "$(excluir m1b)"
for k in m1a m1b; do
  sem_deadlock $k
  r=$(q "select count(*) filter (where h.desfeito_em is null) || ' ' || count(*) filter (where h.data < '2020-01-01' and h.descricao <> '$fixo')
                || ' ' || (select count(*) from lembrete_contrato l where l.importacao_id = s.imp and l.desfeito_em is null)
                || ' ' || (select estado from clientes_escritorio where id = s.cli)
           from teste.eds_set s join historico_financeiro_anterior h on h.importacao_id = s.imp where s.chave = '$k' group by s.imp, s.cli")
  [ "$r" = "0 0 0 EXCLUIDO" ] || falhas+=("$k: esperava tudo desfeito e as vencidas com o texto fixo, veio '$r' ($(cat "$DIR/$k.1" "$DIR/$k.2"))")
done

# 2. M1, rotina: os clientes já excluídos sem o gatilho (como os de antes da 1116), a rotina × o desfazer.
for k in rota rotb; do
  q "alter table clientes_escritorio disable trigger historico_anterior_apagar_do_excluido; $(excluir $k)
     alter table clientes_escritorio enable trigger historico_anterior_apagar_do_excluido;" >/dev/null
  if [ $k = rota ]; then corrida $k "$(rotina)" "$(desfazer $k)"; else corrida $k "$(desfazer $k)" "$(rotina)"; fi
  sem_deadlock $k
  r=$(q "select count(*) filter (where h.desfeito_em is null) || ' ' || count(*) filter (where h.data < '2020-01-01' and h.descricao <> '$fixo')
           from teste.eds_set s join historico_financeiro_anterior h on h.importacao_id = s.imp where s.chave = '$k'")
  [ "$r" = "0 0" ] || falhas+=("$k: esperava tudo desfeito e as vencidas trocadas, veio '$r' ($(cat "$DIR/$k.1" "$DIR/$k.2"))")
done

# 3. M2: a exclusão segura e o trazer é recusado; o trazer segura e a exclusão não acha detalhe.
corrida m2a "$(excluir m2a)" "$(trazer m2a)"
corrida m2b "$(trazer m2b)" "$(excluir m2b)"
for k in m2a m2b; do sem_deadlock $k; done
grep -q "CLIENTE_EXCLUIDO" "$DIR/m2a.2" || falhas+=("m2a: o trazer devia ser recusado com CLIENTE_EXCLUIDO ($(cat "$DIR/m2a.1" "$DIR/m2a.2"))")
r=$(q "select coalesce(l.dispensa_detalhe, 'sem detalhe') || ' ' || c.estado from teste.eds_set s join lembrete_contrato l on l.id = s.extra
         join clientes_escritorio c on c.id = s.cli where s.chave = 'm2b'")
{ grep -q "TROUXE" "$DIR/m2b.1" && [ "$r" = "sem detalhe EXCLUIDO" ]; } || falhas+=("m2b: esperava o trazer e depois a exclusão, veio '$r' ($(cat "$DIR/m2b.1" "$DIR/m2b.2"))")

# 4. M6: a exclusão segura e a importação é recusada; a importação segura e a exclusão troca a vencida.
corrida m6a "$(excluir m6a)" "$(importar m6a)"
corrida m6b "$(importar m6b)" "$(excluir m6b)"
for k in m6a m6b; do sem_deadlock $k; done
r=$(q "select (select count(*) from historico_financeiro_anterior where cliente_id = s.cli) || ' ' || (select count(*) from lembrete_contrato where cliente_id = s.cli)
         from teste.eds_set s where s.chave = 'm6a'")
{ grep -q "CLIENTE_EXCLUIDO" "$DIR/m6a.2" && [ "$r" = "0 0" ]; } || falhas+=("m6a: a importação devia ser recusada, sem sobrar nada; veio '$r' ($(cat "$DIR/m6a.1" "$DIR/m6a.2"))")
r=$(q "select string_agg(h.descricao, ',') from teste.eds_set s join historico_financeiro_anterior h on h.cliente_id = s.cli where s.chave = 'm6b'")
{ grep -q "IMPORTOU" "$DIR/m6b.1" && [ "$r" = "$fixo" ]; } || falhas+=("m6b: esperava a importação e a troca da vencida, veio '$r' ($(cat "$DIR/m6b.1" "$DIR/m6b.2"))")

# 5. O desfazer dos processos × o levantamento novo, nas duas ordens.
corrida c5a "$(desfazer c5a)" "$(levantar c5a)"
corrida c5b "$(levantar c5b)" "$(desfazer c5b)"
for k in c5a c5b; do
  sem_deadlock $k
  r=$(q "select case when exists (select 1 from caso_clientes cc where cc.caso_id = s.extra and cc.cliente_id = s.cli) then 'FICOU'
                     when not exists (select 1 from levantamentos l where l.caso_id = s.extra and l.cliente_id = s.cli) then 'SEM_LEVANTAMENTO'
                     when cliente_vinculos_lgpd(s.cli) is not null then 'REGRA_D'
                     else 'SOLTO' end
           from teste.eds_set s where s.chave = '$k'")
  [ "$r" = "FICOU" ] || [ "$r" = "REGRA_D" ] || [ "$r" = "SEM_LEVANTAMENTO" ] \
    || falhas+=("$k: o cliente com levantamento ficou solto ($r; $(cat "$DIR/$k.1" "$DIR/$k.2"))")
  echo "$k:$r" >> "$DIR/c5"
done

# 6. m4: a exclusão segura e o desfazer dos clientes pode falhar na primeira; o desfazer segura e a
# exclusão espera.
corrida c6a "$(excluir c6a)" "$(desfazer c6a)"
corrida c6b "$(desfazer c6b)" "$(excluir c6b)"
for k in c6a c6b; do sem_deadlock $k; done
tentativas=1
if ! grep -q "^t$" "$DIR/c6a.2"; then
  grep -q "TC422\|excluído" "$DIR/c6a.2" || falhas+=("c6a: a primeira tentativa falhou de outro jeito ($(cat "$DIR/c6a.2"))")
  q "$(desfazer c6a)" > "$DIR/c6a.3" 2>&1 || true
  tentativas=2
fi
for k in c6a c6b; do
  r=$(q "select i.estado || ' ' || c.estado || ' ' || c.contatos::text from teste.eds_set s join importacoes i on i.id = s.imp
           join clientes_escritorio c on c.id = s.cli where s.chave = '$k'")
  [ "$r" = "DESFEITA EXCLUIDO []" ] || falhas+=("$k: esperava desfeita e o cliente excluído, veio '$r' ($(cat "$DIR/$k".*))")
done

if [ ${#falhas[@]} -gt 0 ]; then
  echo "Exclusão e desfazer simultâneos: falhou"
  printf '  %s\n' "${falhas[@]}"
  exit 1
fi
echo "Exclusão e desfazer simultâneos: ok (sem deadlock; M1, rotina, M2 e M6 como o plano; processos: $(tr '\n' ' ' < "$DIR/c5");" \
     "desfazer dos clientes depois da exclusão em $tentativas tentativa(s))"
