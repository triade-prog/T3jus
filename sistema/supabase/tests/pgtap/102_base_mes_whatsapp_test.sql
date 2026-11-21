-- O pedido da base do mês ao cliente pelo WhatsApp (F3.13, CH-06): só com "Pedir também ao
-- cliente pelo WhatsApp" marcado e o WhatsApp do escritório ligado; no dia do lembrete, a partir
-- das 8h; o aviso "Pedido da base do mês" vai ao contato principal com o mês, o contrato e a
-- base; uma vez por cobrança; sem celular ou com "não receber avisos", não sai e fica o motivo;
-- pedido velho não sai; o aviso novo está nos avisos do escritório.
begin;
select plan(11);

select ajustar_relogio(('2026-11-18 12:00-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Paula Nunes') as paula,
  teste.escritorio('Ribeiro & Matos') as rm;
select teste.vincular(socia, rm, 'SOCIO') from ids;
select portal_convidar(socia, rm, paula, 'Paula Nunes', array['CONTRATOS']) from ids;

create temp table cli as select
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Hélio Batista Corrêa', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Marta Corrêa', 'telefone', '+5511996027736', 'principal', true)))) ->> 'id')::uuid h,
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Benedito Souza Lima', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Benedito', 'telefone', '+5511996027737', 'principal', true)))) ->> 'id')::uuid b,
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Eduardo Nascimento', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Eduardo', 'telefone', '+551130324410', 'principal', true)))) ->> 'id')::uuid e,
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Antônia Ferreira Prado', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Antônia', 'telefone', '+5511996027732', 'principal', true)))) ->> 'id')::uuid a
  from ids;

-- Hélio, Eduardo (só fixo) e Antônia (não quer avisos) com o pedido pelo WhatsApp; Benedito sem.
create function pg_temp.contrato(p_cli uuid, p_whats boolean) returns uuid language sql as $$
  select (portal_contrato_criar(ids.paula, ids.rm, jsonb_build_object('clienteId', p_cli, 'objeto', 'Aposentadoria especial', 'responsavelId', ids.paula,
     'advogados', jsonb_build_array(ids.socia), 'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'RECORRENTE', 'percentual', 3000,
       'sobre', 'Benefício mensal do cliente', 'primeiro', '2026-12-10', 'dia', 10, 'meses', 3, 'diaLembrete', 5, 'pedirWhats', p_whats)))) ->> 'id')::uuid
    from ids $$;
create temp table ct as select pg_temp.contrato(cli.h, true) h, pg_temp.contrato(cli.b, false) b, pg_temp.contrato(cli.e, true) e, pg_temp.contrato(cli.a, true) a from cli;
select portal_contrato_assinatura(paula, rm, x, 1, '2026-11-18') from ids, ct, unnest(array[ct.h, ct.b, ct.e, ct.a]) x;
select portal_cliente_sem_avisos(socia, rm, cli.a, '{"tipo":"COBRANCA","origem":"CONVERSA","quemPediu":"Antônia"}') from ids, cli;

-- Sem o WhatsApp ligado, nada sai.
select ajustar_relogio(('2026-12-05 09:00-03'::timestamptz - now()));
select is(pedir_bases_ao_cliente(), 0, 'sem o WhatsApp do escritório ligado, nada sai');
select is((select count(*)::integer from base_mes_pedidos), 0, 'e nada fica marcado: liga hoje, pede hoje');

select whatsapp_meta_ligou(rm, socia, '{"telefone":"+5511974052210","nomeExibicao":"Ribeiro & Matos"}') from ids;
select is((select count(*)::integer from whatsapp_avisos w, ids where w.escritorio_id = ids.rm and w.chave = 'BASE_DO_MES'), 1,
  'o aviso "Pedido da base do mês" está nos avisos do escritório');

select ajustar_relogio(('2026-12-05 07:30-03'::timestamptz - now()));
select is(pedir_bases_ao_cliente(), 0, 'antes das 8h, não sai');

select ajustar_relogio(('2026-12-05 08:05-03'::timestamptz - now()));
select is(pedir_bases_ao_cliente(), 1, 'a partir das 8h do dia do lembrete, só Hélio entra na fila');
select is((select m.texto from conversa_mensagens m where m.aviso_tipo = 'Pedido da base do mês'),
  (select 'Olá, Marta. Aqui é do escritório Ribeiro & Matos. Para calcular os honorários de dezembro de 2026 do contrato ' || c.numero
          || ', precisamos do valor de benefício mensal do cliente. Pode mandar o extrato ou o comprovante por aqui mesmo. Qualquer dúvida, é só responder esta mensagem.'
     from contratos c, ct where c.id = ct.h),
  'o texto aprovado vai ao contato principal, com o mês, o contrato e a base');
select is((select m.envio || ' · ' || (m.dados ->> 'aviso') from conversa_mensagens m where m.aviso_tipo = 'Pedido da base do mês'), 'NA_FILA · BASE_DO_MES',
  'entra na fila com o aviso da Meta');
select is((select string_agg(x.motivo, ' | ' order by x.motivo) from base_mes_pedidos x where x.motivo is not null),
  'O cliente pediu para não receber avisos. | Sem WhatsApp no contato principal da ficha.', 'sem celular ou sem avisos, fica o motivo');
select is(pedir_bases_ao_cliente(), 0, 'cada cobrança é pedida uma vez só');

-- Janeiro: o pedido de janeiro sai; um pedido de mais de 3 dias atrás, não.
select ajustar_relogio(('2027-01-09 08:30-03'::timestamptz - now()));
select is(pedir_bases_ao_cliente(), 0, 'pedido de mais de 3 dias atrás não sai');
select is((teste.erro($$ update base_mes_pedidos set motivo = 'x' $$)) ->> 'codigo', 'TC023', 'o registro do pedido não muda');

select ajustar_relogio(interval '0');
select * from finish();
rollback;
