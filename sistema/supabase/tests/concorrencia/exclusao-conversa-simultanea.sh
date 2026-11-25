#!/usr/bin/env bash
# F3.157 (PT-11, PA-05; revisão da F3.157, seção 6) com duas ou três conexões de verdade: as conversas
# do WhatsApp ao mesmo tempo que a exclusão a pedido do titular. Nenhuma rodada termina em deadlock.
#  1. A exclusão segura a transação: a mensagem que chega do número da cliente espera a conversa e,
#     quando a exclusão confirma, nasce numa conversa nova; quem escreve na conversa apagada recebe
#     404 (a mensagem não nasce nela).
#  2. A exclusão segura a transação: o número de um contato dela, sem conversa ainda, escreve; o
#     webhook espera a ficha e, quando a exclusão confirma, a conversa nasce sem cliente.
#  3. Alguém assume a conversa e segura a transação: a exclusão espera e, quando o assumir confirma,
#     apaga a conversa (volta para a IA, fora da fila).
#  4. O motor das automações segura a transação com dois lembretes da cliente: a exclusão espera a
#     trava do escritório e, quando o motor confirma, para as execuções e tira os avisos da fila.
#  5. A exclusão segura a transação: o motor espera a trava do escritório e, quando a exclusão
#     confirma, não começa lembrete para a cliente excluída.
set -euo pipefail
PSQL=("${PSQL_BIN:-psql}" -v ON_ERROR_STOP=1 -q -X -tA)
DIR="$(mktemp -d)"
trap 'rm -rf "$DIR"; "${PSQL[@]}" -c "select ajustar_relogio(interval ''0'')" >/dev/null 2>&1 || true' EXIT

# Os dados ficam confirmados (cada conexão precisa vê-los); este script roda no banco temporário
# do test-db.sh, depois dos testes pgTAP. O relógio vai para o dia anterior às audiências (os
# lembretes começam na hora) e volta ao fim.
"${PSQL[@]}" >/dev/null <<'SQL'
select ajustar_relogio('2026-12-14 11:30-03'::timestamptz - now());
create table teste.conv_ids as select teste.escritorio('Concorrência das conversas') as esc, teste.pessoa('Sócia das conversas') as socia;
select teste.vincular(socia, esc) from teste.conv_ids;
select whatsapp_meta_ligou(esc, socia, '{"telefone":"+5511974052288","nomeExibicao":"Concorrência","numeroId":"109876543288"}') from teste.conv_ids;
select portal_automacoes(socia, esc) from teste.conv_ids;
create function teste.conv_cliente(p_nome text, p_tel text, p_tio text default null) returns uuid language sql as $$
  select (portal_cliente_cadastrar(socia, esc, jsonb_build_object('tipo', 'PF', 'nome', p_nome, 'origem', 'GOOGLE',
    'contatos', jsonb_build_array(jsonb_build_object('nome', p_nome, 'telefone', p_tel, 'principal', true))
                || case when p_tio is null then '[]'::jsonb
                        else jsonb_build_array(jsonb_build_object('nome', 'Tio de ' || p_nome, 'telefone', p_tio, 'principal', false, 'papel', 'tio')) end))
    ->> 'id')::uuid
  from teste.conv_ids $$;
create function teste.conv_excluir(p_cliente uuid) returns jsonb language sql as $$
  select portal_cliente_excluir_dados(i.socia, c.escritorio_id, p_cliente, c.versao,
    jsonb_build_object('pedidoEm', hoje_brasilia(), 'canal', 'TELEFONE', 'quemPediu', 'TITULAR', 'conferido', true, 'nomeConfirmado', c.nome))
    from clientes_escritorio c, teste.conv_ids i where c.id = p_cliente $$;
create function teste.conv_codigo(p_sql text) returns text language plpgsql as $$
begin
  execute p_sql;
  return 'ok';
exception when others then
  return sqlstate;
end $$;
create function teste.conv_lembrete(p_cliente uuid, p_titulo text, p_inicio text) returns uuid language sql as $$
  select (portal_compromisso_marcar(socia, esc, jsonb_build_object('tipo', 'AUDIENCIA', 'titulo', p_titulo, 'inicio', p_inicio,
    'fim', (p_inicio::timestamptz + interval '30 minutes')::text, 'modalidade', 'PRESENCIAL', 'local', 'Fórum Central',
    'clienteId', p_cliente, 'responsavelId', socia, 'lembrete', true)) ->> 'id')::uuid
  from teste.conv_ids $$;
alter table teste.conv_ids add column um uuid, add column dois uuid, add column tres uuid, add column quatro uuid, add column cinco uuid,
  add column conv_um uuid, add column conv_tres uuid, add column conv_quatro uuid, add column conv_cinco uuid;
update teste.conv_ids set um = teste.conv_cliente('Ana Um', '+5511985100001'), dois = teste.conv_cliente('Bia Dois', '+5511985100002', '+5511985100012'),
  tres = teste.conv_cliente('Caio Três', '+5511985100003'), quatro = teste.conv_cliente('Duda Quatro', '+5511985100004'),
  cinco = teste.conv_cliente('Eva Cinco', '+5511985100005');
update teste.conv_ids set conv_um = whatsapp_mensagem_recebida(esc, '+5511985100001', 'Ana', 'Oi, sou a Ana Um'),
  conv_tres = whatsapp_mensagem_recebida(esc, '+5511985100003', 'Caio', 'Oi, sou o Caio Três'),
  conv_quatro = whatsapp_mensagem_recebida(esc, '+5511985100004', 'Duda', 'Oi, sou a Duda Quatro'),
  conv_cinco = whatsapp_mensagem_recebida(esc, '+5511985100005', 'Eva', 'Oi, sou a Eva Cinco');
-- Ana Um: a sócia assume a conversa (para poder escrever nela). Caio Três: a IA passa.
select conversa_ia_passou(esc, conv_um, 'PEDIU_PESSOA', 'Ana quer falar'), conversa_ia_passou(esc, conv_tres, 'PEDIU_PESSOA', 'Caio quer falar')
  from teste.conv_ids;
select portal_conversa_assumir(socia, esc, conv_um, (select versao from conversas where id = conv_um)) from teste.conv_ids;
-- Duda Quatro: duas audiências amanhã, com lembrete (o motor começa as duas na rodada 4).
select teste.conv_lembrete(quatro, 'Audiência de Duda', '2026-12-15T10:00:00-03:00'),
       teste.conv_lembrete(quatro, 'Perícia de Duda', '2026-12-15T11:00:00-03:00') from teste.conv_ids;
SQL

segura() { # $1 = arquivo de saída, $2 = SQL que segura a transação por 2 segundos
  "${PSQL[@]}" > "$DIR/$1" 2>&1 <<SQL &
begin;
$2;
select pg_sleep(2);
commit;
SQL
}
q() { "${PSQL[@]}" -c "$1"; }

# 1. A exclusão de Ana Um segura; a mensagem do número dela chega e a sócia escreve na conversa.
segura um "select teste.conv_excluir(um) from teste.conv_ids"
sleep 0.7
"${PSQL[@]}" > "$DIR/um-chega" 2>&1 -c "select whatsapp_mensagem_recebida(esc, '+5511985100001', 'Ana', 'Oi de novo') from teste.conv_ids" &
"${PSQL[@]}" > "$DIR/um-escreve" 2>&1 \
  -c "select teste.conv_codigo(format('select portal_conversa_enviar(%L, %L, %L, %L)', socia, esc, conv_um, '{\"texto\":\"Oi, Ana\"}')) from teste.conv_ids" &
wait
um=$(q "select (select count(*) from conversas c, teste.conv_ids i where c.id = i.conv_um and c.apagada_em is not null and c.telefone is null)
          || ' ' || (select count(*) from conversa_mensagens m, teste.conv_ids i where m.conversa_id = i.conv_um and m.apagada_em is null)
          || ' ' || (select count(*) from conversas c, teste.conv_ids i where c.escritorio_id = i.esc and c.telefone = '+5511985100001'
                       and c.id <> i.conv_um and c.cliente_id is null)")
um_escreve=$(cat "$DIR/um-escreve")

# 2. A exclusão de Bia Dois segura; o tio (contato dela, sem conversa) escreve.
segura dois "select teste.conv_excluir(dois) from teste.conv_ids"
sleep 0.7
"${PSQL[@]}" > "$DIR/dois-chega" 2>&1 -c "select whatsapp_mensagem_recebida(esc, '+5511985100012', 'Tio', 'Sou o tio da Bia') from teste.conv_ids" || true
wait
dois=$(q "select count(*) || ' ' || count(*) filter (where cliente_id is null and apagada_em is null)
            from conversas c, teste.conv_ids i where c.escritorio_id = i.esc and c.telefone = '+5511985100012'")

# 3. A sócia assume a conversa de Caio Três e segura; a exclusão chega.
segura tres "select portal_conversa_assumir(socia, esc, conv_tres, (select versao from conversas where id = conv_tres)) from teste.conv_ids"
sleep 0.7
"${PSQL[@]}" > "$DIR/tres-exclui" 2>&1 -c "select teste.conv_excluir(tres) from teste.conv_ids" || true
wait
tres=$(q "select situacao || ' ' || (assumida_por is null) || ' ' || (apagada_em is not null) from conversas c, teste.conv_ids i where c.id = i.conv_tres")

# 4. O motor começa os dois lembretes de Duda Quatro e segura; a exclusão chega.
segura quatro "select automacoes_rodar()"
sleep 0.7
"${PSQL[@]}" > "$DIR/quatro-exclui" 2>&1 -c "select teste.conv_excluir(quatro) from teste.conv_ids" || true
wait
quatro=$(q "select (select count(*) || ' ' || count(*) filter (where situacao = 'FICOU_DE_FORA' and proximo_em is null and rotulo = 'Cliente excluído')
                      from automacao_execucoes x, teste.conv_ids i where x.cliente_id = i.quatro)
            || ' ' || (select count(*) from conversa_mensagens m, teste.conv_ids i where m.conversa_id = i.conv_quatro and m.envio = 'NA_FILA')
            || ' ' || (select count(*) from conversa_mensagens m, teste.conv_ids i where m.conversa_id = i.conv_quatro and m.autor = 'AVISO')")

# 5. A exclusão de Eva Cinco segura (com um lembrete dela pronto para começar); o motor chega.
q "select teste.conv_lembrete(cinco, 'Audiência de Eva', '2026-12-15T10:30:00-03:00') from teste.conv_ids" >/dev/null
segura cinco "select teste.conv_excluir(cinco) from teste.conv_ids"
sleep 0.7
"${PSQL[@]}" > "$DIR/cinco-motor" 2>&1 -c "select automacoes_rodar()" || true
wait
cinco=$(q "select (select count(*) filter (where proximo_em is not null) from automacao_execucoes x, teste.conv_ids i where x.cliente_id = i.cinco)
             || ' ' || (select count(*) from conversa_mensagens m, teste.conv_ids i where m.conversa_id = i.conv_cinco and m.envio = 'NA_FILA')
             || ' ' || (select count(*) from conversas c, teste.conv_ids i where c.id = i.conv_cinco and c.apagada_em is not null)")

saidas=("$DIR/um" "$DIR/um-chega" "$DIR/dois" "$DIR/dois-chega" "$DIR/tres" "$DIR/tres-exclui" "$DIR/quatro" "$DIR/quatro-exclui" "$DIR/cinco" "$DIR/cinco-motor")
if [ "$um" != "1 0 1" ] || [ "$um_escreve" != "TC404" ] || [ "$dois" != "1 1" ] || [ "$tres" != "IA true true" ] \
   || [ "$quatro" != "2 2 0 2" ] || [ "$cinco" != "0 0 1" ] || grep -qi "deadlock\|ERROR" "${saidas[@]}"; then
  echo "Exclusão com conversas simultâneas: falhou (1: $um, escreve $um_escreve; 2: $dois; 3: $tres; 4: $quatro; 5: $cinco;" \
       "$(cat "${saidas[@]}" "$DIR/um-escreve")"
  exit 1
fi
echo "Exclusão com conversas simultâneas: ok (mensagem que chega, escrever, contato novo, assumir e o motor, sem deadlock)"
