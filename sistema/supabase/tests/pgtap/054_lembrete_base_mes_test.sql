-- Lembrete da base do mês do percentual recorrente (CH-06, F3.13): no dia de pedir, quem foi
-- escolhido (ou o responsável) recebe o aviso no sino, uma vez por cobrança; com a base
-- informada, não há lembrete; quem saiu da equipe passa o lembrete ao responsável; isolamento.
begin;
select plan(8);

select ajustar_relogio(('2026-11-18 12:00-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Paula Nunes') as paula,
  teste.pessoa('Diego Almeida') as diego,
  teste.escritorio('Ribeiro & Matos') as rm;
select teste.vincular(socia, rm, 'SOCIO') from ids;
select portal_convidar(socia, rm, paula, 'Paula Nunes', array['CONTRATOS']),
       portal_convidar(socia, rm, diego, 'Diego Almeida', array['CONTRATOS']) from ids;

create temp table cli as select
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Hélio Batista Corrêa', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Hélio', 'telefone', '+5511996027736', 'principal', true)))) ->> 'id')::uuid h,
  (portal_cliente_cadastrar(socia, rm, jsonb_build_object('tipo', 'PF', 'nome', 'Benedito Souza Lima', 'origem', 'GOOGLE',
     'contatos', jsonb_build_array(jsonb_build_object('nome', 'Benedito', 'telefone', '+5511996027737', 'principal', true)))) ->> 'id')::uuid b
  from ids;

-- Hélio: lembrete para o responsável (Paula). Benedito: lembrete para Diego, escolhido na condição.
create temp table ct as select
  (portal_contrato_criar(paula, rm, jsonb_build_object('clienteId', cli.h, 'objeto', 'Aposentadoria especial', 'responsavelId', ids.paula,
     'advogados', jsonb_build_array(ids.socia), 'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'RECORRENTE', 'percentual', 3000,
       'sobre', 'Benefício mensal do cliente', 'primeiro', '2026-12-10', 'dia', 10, 'meses', 3, 'diaLembrete', 5)))) ->> 'id')::uuid h,
  (portal_contrato_criar(paula, rm, jsonb_build_object('clienteId', cli.b, 'objeto', 'Aposentadoria por idade', 'responsavelId', ids.paula,
     'advogados', jsonb_build_array(ids.socia), 'condicoes', jsonb_build_array(jsonb_build_object('tipo', 'RECORRENTE', 'percentual', 2000,
       'sobre', 'Benefício mensal do cliente', 'primeiro', '2026-12-10', 'dia', 10, 'meses', 3, 'diaLembrete', 5, 'quemLembrete', ids.diego)))) ->> 'id')::uuid b
  from ids, cli;
select portal_contrato_assinatura(paula, rm, ct.h, 1, '2026-11-18'), portal_contrato_assinatura(paula, rm, ct.b, 1, '2026-11-18') from ids, ct;

select is(lembrar_bases_do_mes(), 0, 'antes do dia de pedir, nada');

select ajustar_relogio(('2026-12-05 08:00-03'::timestamptz - now()));
select is(lembrar_bases_do_mes(), 2, 'CH-06: no dia de pedir, um aviso por cobrança sem base');
select is((select dados ->> 'cliente' from avisos_sino, ids where tipo = 'BASE_DO_MES' and pessoa_id = paula), 'Hélio Batista Corrêa',
  'o responsável recebe o lembrete');
select is((select dados ->> 'mes' from avisos_sino, ids where tipo = 'BASE_DO_MES' and pessoa_id = diego), '1',
  'quem foi escolhido na condição recebe o lembrete, com o mês');
select is(lembrar_bases_do_mes(), 0, 'cada cobrança é lembrada uma vez só');

-- Mês seguinte: Hélio já informou a base; Diego saiu da equipe.
select ajustar_relogio(('2026-12-11 12:00-03'::timestamptz - now()));
select portal_contrato_base(paula, rm, r.id, jsonb_build_object('valor', 211800, 'fonte', 'EXTRATO', 'vencimento', '2027-01-10'))
  from ids, ct, recebimentos_previstos r where r.contrato_id = ct.h and r.vencimento = '2027-01-10' and r.cancelado_em is null;
update vinculos set revogado_em = app_now(), revogado_por = (select socia from ids) where pessoa_id = (select diego from ids);
select ajustar_relogio(('2027-01-05 08:00-03'::timestamptz - now()));
select is(lembrar_bases_do_mes(), 1, 'em janeiro só Benedito é lembrado: dezembro já foi e Hélio informou a base');
select is((select count(*) from avisos_sino, ids where tipo = 'BASE_DO_MES' and pessoa_id = paula and dados ->> 'cliente' = 'Benedito Souza Lima'), 1::bigint,
  'EX-10: quem foi escolhido saiu da equipe, o lembrete vai ao responsável');
select is((select count(*) from avisos_sino, ids where tipo = 'BASE_DO_MES' and pessoa_id = paula and dados ->> 'cliente' = 'Hélio Batista Corrêa'), 1::bigint,
  'com a base informada, não há lembrete novo');

select ajustar_relogio(interval '0');
select * from finish();
rollback;
