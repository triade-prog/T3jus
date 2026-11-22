-- Cobrança dos escritórios (CO-06, F1.18), com as decisões da Carol de 20/11/2026: planos por
-- faixa de pessoas, cobrança a partir do Ativo, desconto de implantação com motivo, aviso aos 7
-- dias, só consulta aos 30 com confirmação da Administração e carnê de 12 parcelas.
begin;
select plan(83);

create temp table ids as select
  teste.equipe('Carol', 'ADMINISTRACAO') as adm,
  teste.equipe('Marta Quintela', 'FINANCEIRO') as fin,
  teste.equipe('Rafael Teles', 'IMPLANTACAO') as impl,
  teste.equipe('Bruno Saraiva', 'SUPORTE') as sup,
  teste.pessoa('Renata Cedro') as socia,
  teste.pessoa('Diego Almeida') as diego,
  teste.pessoa('Joana Pequi') as socia2,
  hoje_brasilia() as hoje0;
create temp table c as select
  console_criar_escritorio(adm, 'Cedro & Lima Advocacia', 'Recife', 'PE') as cedro,
  console_criar_escritorio(adm, 'Pequi Advocacia', 'Teresina', 'PI') as pequi from ids;
insert into vinculos (pessoa_id, escritorio_id, funcao, criado_por)
  select fin, cedro, 'FINANCEIRO', adm from ids, c
  union all select impl, cedro, 'IMPLANTACAO', adm from ids, c
  union all select sup, cedro, 'SUPORTE', adm from ids, c
  union all select socia, cedro, 'SOCIO', adm from ids, c
  union all select fin, pequi, 'FINANCEIRO', adm from ids, c
  union all select socia2, pequi, 'SOCIO', adm from ids, c;
select portal_convidar(socia, cedro, diego, 'Diego Almeida', array['COMERCIAL']) from ids, c;

create function pg_temp.ver(p_esc uuid) returns integer language sql as $$ select versao from assinaturas where escritorio_id = p_esc $$;
create function pg_temp.vcli(p_esc uuid) returns integer language sql as $$ select versao from clientes where escritorio_id = p_esc $$;
-- Adianta o relógio até o dia dito (contado do hoje real do começo do teste).
create function pg_temp.ir(p_dia date) returns void language sql as $$
  select ajustar_relogio(make_interval(days => p_dia - (select hoje0 from ids))) $$;
create function pg_temp.f1() returns faturas language sql as $$
  select * from faturas where escritorio_id = (select cedro from c) order by competencia limit 1 $$;

-- ---------------------------------------------------------------------------------------
-- Planos: só a Administração cria; o Financeiro só vê.
select is((teste.erro($$ select console_plano_salvar(fin, null, null, '{"nome":"Escritório","precoCentavos":49000,"pessoasIncluidas":8}') from ids $$)) ->> 'codigo',
  'TC401', 'CO-06: o Financeiro não cria plano');
select is((teste.erro($$ select console_plano_salvar(adm, null, null, '{"nome":" ","precoCentavos":0,"pessoasIncluidas":"x"}') from ids $$)) -> 'detalhe',
  '{"campos": ["nome", "preco", "pessoas"], "motivo": "PRECO_INVALIDO"}'::jsonb, 'os erros do plano voltam juntos, com PRECO_INVALIDO');
create temp table pl as select
  (console_plano_salvar(adm, null, null, '{"nome":"Escritório","precoCentavos":49000,"pessoasIncluidas":1}') ->> 'id')::uuid as escritorio,
  (console_plano_salvar(adm, null, null, '{"nome":"Banca","precoCentavos":89000,"pessoasIncluidas":15}') ->> 'id')::uuid as banca,
  (console_plano_salvar(adm, null, null, '{"nome":"Fundador","precoCentavos":19000,"pessoasIncluidas":5}') ->> 'id')::uuid as fundador
  from ids;
select is((teste.erro($$ select console_plano_salvar(adm, null, null, '{"nome":"escritório","precoCentavos":100,"pessoasIncluidas":2}') from ids $$)) -> 'detalhe' -> 'campos',
  '["nome"]'::jsonb, 'nome de plano não se repete');
select is((select jsonb_array_length(console_planos(fin) -> 'planos') from ids), 3, 'o Financeiro vê os planos');
select is((select (console_planos(fin) ->> 'podeEditar')::boolean from ids), false, 'só leitura para o Financeiro');
select is((select (console_planos(adm) -> 'pessoaAMais' ->> 'centavos')::int from ids), 3900, 'pessoa a mais: um valor único (R$ 39,00 de exemplo)');
select is((teste.erro($$ select console_planos(impl) from ids $$)) ->> 'codigo', 'TC401', 'a Implantação não abre Cobrança');

-- ---------------------------------------------------------------------------------------
-- Assinatura: preparada na implantação, sem fatura (decisão 2).
select is((teste.erro($$ select console_assinatura_salvar(impl, cedro, null, '{}') from ids, c $$)) ->> 'codigo', 'TC401',
  'a Implantação não prepara a assinatura');
select is((teste.erro($$ select console_assinatura_salvar(fin, cedro, null, '{"planoId":"00000000-0000-0000-0000-000000000000","diaVencimento":31,"forma":"CHEQUE","emailCobranca":"x","desconto":{"pct":0}}') from ids, c $$)) -> 'detalhe' -> 'campos',
  '["plano", "diaVencimento", "forma", "emailCobranca", "descontoPct", "descontoAte", "descontoMotivo"]'::jsonb, 'os erros da assinatura voltam presos aos campos');
select console_assinatura_salvar(fin, cedro, null, jsonb_build_object('planoId', escritorio, 'diaVencimento', 10, 'forma', 'PIX',
  'emailCobranca', 'Financeiro@CedroLima.adv.br', 'cnpjNota', '12.345.678/0001-95',
  'desconto', jsonb_build_object('pct', 20, 'ate', (competencia_de(hoje_brasilia()) + interval '3 months')::date, 'motivo', 'Implantação: 3 primeiras faturas')))
  from ids, c, pl;
select is((select count(*)::int from faturas), 0, 'decisão 2: em implantação, nenhuma fatura sai');
select is((select console_assinatura(fin, cedro) -> 'assinatura' ->> 'situacao' from ids, c), 'SEM_COBRANCA', 'a aba diz que a cobrança não começou');
select is((select email_cobranca || '|' || cnpj_nota || '|' || preco_centavos from assinaturas where escritorio_id = (select cedro from c)),
  'financeiro@cedrolima.adv.br|12345678000195|49000', 'e-mail normalizado, CNPJ só com os dígitos e o preço do dia');

-- Passa para Ativo: a primeira fatura sai hoje e vence no dia 10 do mês seguinte (decisão 2).
update pessoas set senha_criada_em = now() where id in (select socia from ids union select diego from ids);
select console_mudar_estagio(adm, cedro, pg_temp.vcli(cedro), 'ATIVO', 'Implantação concluída') from ids, c;
select is((select count(*)::int from faturas where escritorio_id = (select cedro from c)), 1, 'decisão 2: ao passar para Ativo, a primeira fatura sai');
select is((select competencia || '|' || vencimento from faturas where escritorio_id = (select cedro from c)),
  (competencia_de(hoje_brasilia()) + interval '1 month')::date || '|' || vencimento_de((competencia_de(hoje_brasilia()) + interval '1 month')::date, 10),
  'vence no dia escolhido do mês seguinte');
-- 2 pessoas ativas (Renata e Diego) e 1 incluída: R$ 490,00 + R$ 39,00 − R$ 98,00 = R$ 431,00.
select is((select array_agg(tipo || ':' || valor_centavos order by ordem) from fatura_itens where fatura_id = (pg_temp.f1()).id),
  array['MENSALIDADE:49000', 'PESSOA_A_MAIS:3900', 'DESCONTO:-9800'], 'decisão 1 e 3: mensalidade, pessoa a mais e desconto sobre a mensalidade');
select is((pg_temp.f1()).total_centavos, 43100, 'a soma dos itens é o total');
select is((select tipo from fatura_envios where fatura_id = (pg_temp.f1()).id), 'EMITIDA', 'o e-mail da fatura emitida vai para a fila');
select is((select (console_cobranca_fatura(fin, cedro, (pg_temp.f1()).id) -> 'pagamento' ->> 'disponivel')::boolean from ids, c), false,
  'Pix e boleto ficam reservados até o meio de pagamento');

-- A fatura emitida não muda; o histórico só cresce.
select is((teste.erro($$ update faturas set total_centavos = 1 where id = (pg_temp.f1()).id $$)) ->> 'codigo', 'TC422', 'a fatura emitida não muda');
select is((teste.erro($$ delete from faturas where id = (pg_temp.f1()).id $$)) ->> 'codigo', 'TC010', 'a fatura não se apaga');
select is((teste.erro($$ update fatura_eventos set acao = 'x.y' $$)) ->> 'codigo', 'TC010', 'fatura_eventos é só de inserção');

-- A rotina não emite de novo.
select is((cobranca_rotina() ->> 'emitidas')::int, 0, 'a rotina não repete a fatura');

-- Implantação e Suporte: plano e situação, sem valores.
select ok((select not ((console_assinatura(sup, cedro) -> 'assinatura') ? 'precoCentavos') and not ((console_assinatura(sup, cedro) -> 'assinatura') ? 'faturas') from ids, c),
  'o Suporte vê o plano e a situação, sem valores nem faturas');
select is((select console_assinatura(sup, cedro) -> 'assinatura' -> 'plano' ->> 'nome' from ids, c), 'Escritório', 'o Suporte vê o nome do plano');
select is((teste.erro($$ select console_cobranca_fatura(sup, cedro, (pg_temp.f1()).id) from ids, c $$)) ->> 'codigo', 'TC401', 'o Suporte não abre a fatura');
-- Só os escritórios atribuídos (PT-24): o Financeiro do Pequi não vê o Cedro sem atribuição.
select is((teste.erro($$ select console_assinatura(fin, (select escritorio_id from vinculos where false limit 1)) from ids $$)) ->> 'codigo', 'TC401',
  'sem escritório, nada');

-- ---------------------------------------------------------------------------------------
-- Régua: 3 dias antes, no dia, depois.
select pg_temp.ir((pg_temp.f1()).vencimento - 3);
select cobranca_rotina();
select is((select array_agg(tipo order by criado_em) from fatura_envios where fatura_id = (pg_temp.f1()).id), array['EMITIDA', 'VENCE_EM_3'],
  'régua: o lembrete de 3 dias antes');
select pg_temp.ir((pg_temp.f1()).vencimento + 4);
select cobranca_rotina();
select is((select array_agg(tipo order by criado_em) from fatura_envios where fatura_id = (pg_temp.f1()).id), array['EMITIDA', 'VENCE_EM_3', 'VENCEU_3'],
  'um dia sem rotina não perde o passo; o que passou não volta');
select is((select portal_cobranca(socia, cedro) ->> 'atraso' from ids, c), null, 'antes de 7 dias, o Portal não mostra faixa');
select is((select console_assinatura(fin, cedro) -> 'assinatura' ->> 'situacao' from ids, c), 'EM_ATRASO', 'a assinatura fica Em atraso');
select is((select (console_carteira_cobranca(sup) -> 0 ->> 'atrasoDias')::int from ids), 4, 'a carteira mostra os dias de atraso para toda a equipe');
select is((select console_cobranca_atencao(fin) from ids), 1, 'o trilho conta a fatura em atraso');
select is((select console_cobranca_atencao(impl) from ids), 0, 'a Implantação não tem o contador');

-- 7 dias: aviso só para o sócio dono.
select pg_temp.ir((pg_temp.f1()).vencimento + 7);
select cobranca_rotina();
select is((select (portal_cobranca(socia, cedro) -> 'atraso' ->> 'dias')::int from ids, c), 7, 'decisão 4: aos 7 dias, a faixa aparece para a sócia dona');
select is((select portal_cobranca(diego, cedro) ->> 'atraso' from ids, c), null, 'a equipe do escritório não vê o atraso');
select ok((select exists (select 1 from fatura_eventos where fatura_id = (pg_temp.f1()).id and acao = 'portal.aviso_aceso' and autor_id is null)),
  'o aviso aceso fica no histórico, pelo sistema');
select is((teste.erro($$ select console_portal_so_consulta(adm, cedro, pg_temp.ver(cedro), 'Atraso') from ids, c $$)) -> 'detalhe' ->> 'motivo',
  'SEM_ATRASO_30', 'só consulta só passados 30 dias');

-- 30 dias: o Console propõe; nada acontece sozinho.
select pg_temp.ir((pg_temp.f1()).vencimento + 31);
select cobranca_rotina();
select is((select (console_assinatura(adm, cedro) -> 'assinatura' ->> 'proporConsulta')::boolean from ids, c), true, 'aos 30 dias, o Console propõe só consulta');
select is((select so_consulta_desde from assinaturas where escritorio_id = (select cedro from c)), null, 'decisão 4: a rotina não passa para só consulta');
select is((select count(*)::int from faturas where escritorio_id = (select cedro from c)), 2, 'a fatura do mês seguinte saiu 20 dias antes do vencimento');
select is((teste.erro($$ select console_portal_so_consulta(fin, cedro, pg_temp.ver(cedro), 'Atraso') from ids, c $$)) ->> 'codigo', 'TC401',
  'decisão 4: só a Administração passa o Portal para só consulta');
select is((teste.erro($$ select console_portal_so_consulta(adm, cedro, pg_temp.ver(cedro), ' ') from ids, c $$)) -> 'detalhe' ->> 'motivo',
  'MOTIVO_OBRIGATORIO', 'o motivo é obrigatório');
select console_portal_so_consulta(adm, cedro, pg_temp.ver(cedro), 'Outubro e novembro em aberto') from ids, c;
select is((teste.erro($$ select portal_cliente_cadastrar(diego, cedro, '{"tipo":"PF","nome":"Helena Prado","origem":"SITE","contatos":[{"nome":"Helena","telefone":"+5511988887777","principal":true}]}') from ids, c $$)) -> 'detalhe' ->> 'motivo',
  'PORTAL_SO_CONSULTA', 'no só consulta, ninguém do escritório cria nada');
select is((teste.erro($$ select portal_exigir_escrita(socia, cedro) from ids, c $$)) -> 'detalhe' ->> 'motivo', 'PORTAL_SO_CONSULTA',
  'nem convida ninguém');
select is((select portal_cobranca(diego, cedro) ->> 'socioDono' from ids, c), 'Renata Cedro', 'a equipe vê a quem falar');
select ok((select portal_cobranca(diego, cedro) ->> 'soConsultaDesde' is not null from ids, c), 'a equipe vê a faixa de só consulta');
select ok((select exportar_escritorio(socia, cedro) is not null from ids, c), 'a exportação continua liberada');

-- Pagamento manual: confere data, valor e motivo; o conflito diz quem registrou.
select is((teste.erro($$ select console_fatura_pagamento_manual(fin, cedro, (pg_temp.f1()).id, (pg_temp.f1()).versao,
  jsonb_build_object('pagoEm', hoje_brasilia() + 1, 'valorCentavos', 100, 'forma', 'PIX', 'motivo', '')) from ids, c $$)) -> 'detalhe',
  '{"campos": ["pagoEm", "valor", "motivo"], "motivo": "DATA_NO_FUTURO"}'::jsonb, 'data no futuro, valor diferente e sem motivo');
select is((teste.erro($$ select console_fatura_pagamento_manual(fin, cedro, (pg_temp.f1()).id, 99, '{}') from ids, c $$)) ->> 'codigo', 'TC409',
  'PT-19: a versão lida confere');
select is((select console_fatura_pagamento_manual(fin, cedro, (pg_temp.f1()).id, (pg_temp.f1()).versao,
  jsonb_build_object('pagoEm', hoje_brasilia(), 'valorCentavos', 43100, 'forma', 'TRANSFERENCIA', 'motivo', 'TED recebida, comprovante por e-mail')) ->> 'acessoDevolvido' from ids, c),
  'true', 'decisão 4: ao pagar, o Portal volta ao normal sozinho');
select is((select autor_id from fatura_eventos where acao = 'acesso.devolvido'), null, 'quem devolveu foi o sistema');
select is((teste.erro($$ select console_fatura_pagamento_manual(adm, cedro, (pg_temp.f1()).id, (pg_temp.f1()).versao,
  jsonb_build_object('pagoEm', hoje_brasilia(), 'valorCentavos', 43100, 'forma', 'PIX', 'motivo', 'De novo')) from ids, c $$)) -> 'detalhe' ->> 'quem',
  'Marta Quintela', 'registrar de novo mostra quem registrou antes');
select is((select array_agg(tipo order by criado_em) filter (where enviado_em is null and descartado_em is null) from fatura_envios where fatura_id = (pg_temp.f1()).id),
  array['RECIBO'], 'os lembretes que faltavam saem da fila e o recibo entra');
select is((teste.erro($$ select portal_cliente_cadastrar(diego, cedro, '{"tipo":"PF","nome":"Helena Prado","origem":"SITE","contatos":[{"nome":"Helena","telefone":"+5511988887777","principal":true}]}') from ids, c $$)),
  null, 'depois de pagar, o escritório volta a cadastrar');

-- Lembrete manual e cancelamento.
create temp table f2 as select * from faturas where escritorio_id = (select cedro from c) and situacao = 'A_VENCER';
select console_fatura_lembrete(fin, cedro, id) from ids, c, f2;
select is((select count(*)::int from fatura_envios where fatura_id = (select id from f2) and tipo = 'MANUAL'), 1, 'o lembrete manual entra na fila');
select is((teste.erro($$ select console_fatura_cancelar(fin, cedro, id, versao, '') from ids, c, f2 $$)) -> 'detalhe' ->> 'motivo', 'MOTIVO_OBRIGATORIO',
  'cancelar pede motivo');
select console_fatura_cancelar(fin, cedro, id, versao, 'Mês de cortesia combinado') from ids, c, f2;
select is((select situacao || '|' || cancelada_motivo from faturas where id = (select id from f2)), 'CANCELADA|Mês de cortesia combinado', 'a fatura fica Cancelada, com o motivo');
select is((select cobranca_emitir_pendentes(id, true) from assinaturas where escritorio_id = (select cedro from c)), 0, 'a competência cancelada não é emitida de novo');

-- Envios: a rota recebe o que mandar e registra.
create temp table env as select rotina_cobranca_envios_pendentes(50) as e;
select ok((select bool_and(x ->> 'para' = 'financeiro@cedrolima.adv.br') from env, jsonb_array_elements(e) x), 'os e-mails vão para o e-mail de cobrança');
select ok((select bool_and(x ->> 'tipo' <> 'VENCEU_3') from env, jsonb_array_elements(e) x), 'lembrete de fatura paga não vai');
select rotina_cobranca_envio_registrar((x ->> 'id')::uuid, true) from env, jsonb_array_elements(e) x;
select is((select count(*)::int from fatura_envios where enviado_em is null and descartado_em is null), 0, 'cada envio fica registrado');

-- ---------------------------------------------------------------------------------------
-- Mudar de plano: vale na próxima fatura sem emitir, sem proporcional.
select is((teste.erro($$ select console_assinatura_mudar_plano(fin, cedro, pg_temp.ver(cedro), banca, '') from ids, c, pl $$)) -> 'detalhe' ->> 'motivo',
  'MOTIVO_OBRIGATORIO', 'mudar de plano pede motivo');
select console_assinatura_mudar_plano(fin, cedro, pg_temp.ver(cedro), banca, 'Cresceu para 12 pessoas') from ids, c, pl;
select is((select preco_centavos from assinaturas where escritorio_id = (select cedro from c)), 89000, 'a assinatura guarda o preço do plano novo');
select is((pg_temp.f1()).total_centavos, 43100, 'a fatura já emitida não muda');

-- Arquivar: some para novas assinaturas, quem assina continua.
select console_plano_arquivar(adm, fundador, (select versao from planos where id = fundador), true, 'Plano de lançamento') from ids, pl;
select is((teste.erro($$ select console_assinatura_salvar(fin, pequi, null, jsonb_build_object('planoId', fundador, 'diaVencimento', 5, 'forma', 'PIX', 'emailCobranca', 'a@b.com.br')) from ids, c, pl $$))
  -> 'detalhe' ->> 'motivo', 'PLANO_ARQUIVADO', 'plano arquivado não entra em assinatura nova');

-- ---------------------------------------------------------------------------------------
-- Carnê (decisão 6): 12 parcelas iguais, a fatura do mês é a parcela.
select ajustar_relogio('0');
select console_assinatura_salvar(fin, pequi, null, jsonb_build_object('planoId', escritorio, 'diaVencimento', 5, 'forma', 'CARNE',
  'emailCobranca', 'contas@pequi.adv.br')) from ids, c, pl;
update pessoas set senha_criada_em = now() where id = (select socia2 from ids);
select console_mudar_estagio(adm, pequi, pg_temp.vcli(pequi), 'ATIVO', 'Pronto') from ids, c;
create temp table ca as select * from assinatura_carnes where escritorio_id = (select pequi from c);
select is((select parcelas || '|' || valor_parcela_centavos from ca), '12|49000', 'decisão 6: carnê de 12 parcelas de R$ 490,00');
select is((select count(distinct valor_centavos)::int from assinatura_carne_parcelas where carne_id = (select id from ca)), 1, 'todas as parcelas com o mesmo valor');
select is((select p.numero from faturas f join assinatura_carne_parcelas p on p.id = f.carne_parcela_id where f.escritorio_id = (select pequi from c)), 1,
  'a primeira fatura é a parcela 1');
-- Parcela 3 paga adiantada: a fatura do mês já nasce paga.
select console_parcela_pagamento_manual(fin, pequi, id, jsonb_build_object('pagoEm', hoje_brasilia(), 'valorCentavos', 49000, 'forma', 'PIX', 'motivo', 'Pagou adiantado'))
  from ids, c, assinatura_carne_parcelas where carne_id = (select id from ca) and numero = 3;
select is((select p.situacao || '|' || f.situacao from assinatura_carne_parcelas p join faturas f on f.id = p.fatura_id where p.carne_id = (select id from ca) and p.numero = 3),
  'PAGA|PAGA', 'a parcela paga adiantada cria a fatura do mês já paga');
-- Carnê novo: cancela as parcelas sem fatura, começa depois da última com fatura.
select is((teste.erro($$ select console_carne_novo(fin, pequi, pg_temp.ver(pequi), '') from ids, c $$)) -> 'detalhe' ->> 'motivo', 'MOTIVO_OBRIGATORIO',
  'o carnê novo pede motivo');
create temp table cn as select console_carne_novo(fin, pequi, pg_temp.ver(pequi), 'Passou para 9 pessoas') as r from ids, c;
select is((select (r ->> 'canceladas')::int from cn), 10, 'as parcelas 2 e 4 a 12, sem fatura, são canceladas');
select is((select primeira_competencia from assinatura_carnes where id = (select (r ->> 'carneNovoId')::uuid from cn)),
  (select (max(competencia) + interval '1 month')::date from faturas where escritorio_id = (select pequi from c)),
  'o carnê novo começa na competência seguinte à última com fatura');
select is((select situacao from assinatura_carne_parcelas where carne_id = (select id from ca) and numero = 3), 'PAGA', 'a parcela paga continua paga');
select is((select substituido_motivo from assinatura_carnes where id = (select id from ca)), 'Passou para 9 pessoas', 'o carnê antigo fica como substituído, com o motivo');
select is((teste.erro($$ delete from assinatura_carne_parcelas where carne_id = (select id from ca) $$)) ->> 'codigo', 'TC010', 'parcela não se apaga');

-- Portal: só o sócio dono vê as faturas.
select is((teste.erro($$ select portal_plano_faturas(diego, cedro) from ids, c $$)) ->> 'codigo', 'TC401', 'decisão 5: a equipe do escritório não vê as faturas');
select is((select portal_plano_faturas(socia, cedro) -> 'assinatura' ->> 'plano' from ids, c), 'Banca', 'a sócia dona vê o plano');
select is((select jsonb_array_length(portal_plano_faturas(socia, cedro) -> 'faturas') from ids, c), 1, 'e as faturas, sem as canceladas');
select is((select portal_plano_faturas(socia, cedro) -> 'assinatura' ->> 'emailCobranca' from ids, c),
  (select email_cobranca from assinaturas where escritorio_id = (select cedro from c)), 'F1.21: a sócia dona vê o e-mail para onde a fatura vai');

-- Contrato encerrado: a régua para e a fatura ainda pode ser paga (desenho, estado 37).
select console_encerrar_contrato(adm, pequi, pg_temp.vcli(pequi), jsonb_build_object('fimEm', hoje_brasilia(), 'motivo', 'Distrato', 'nomeConfirmado', 'Pequi Advocacia')) from ids, c;
select pg_temp.ir((select max(vencimento) from faturas where escritorio_id = (select pequi from c)) + 40);
create temp table antes as select count(*)::int as n from faturas where escritorio_id = (select pequi from c);
select cobranca_rotina();
select is((select count(*)::int from faturas where escritorio_id = (select pequi from c)), (select n from antes), 'com o contrato encerrado, nenhuma fatura nova');
select is((select count(*)::int from fatura_envios x join faturas f on f.id = x.fatura_id where f.escritorio_id = (select pequi from c) and x.tipo like 'VENCEU%'), 0,
  'com o contrato encerrado, a régua para');
select is((select console_fatura_pagamento_manual(fin, pequi, f.id, f.versao, jsonb_build_object('pagoEm', hoje_brasilia(), 'valorCentavos', f.total_centavos, 'forma', 'PIX', 'motivo', 'Pagou depois do fim')) ->> 'acessoDevolvido'
  from ids, c, faturas f where f.escritorio_id = (select pequi from c) and f.situacao = 'A_VENCER' order by f.competencia limit 1), 'false',
  'ainda dá para registrar o pagamento com o contrato encerrado');
select ok((select (console_cobranca_faturas(fin) -> 'resumo') ? 'atraso' from ids), 'Cobrança traz o resumo do mês e o atraso por idade');
select * from finish();
rollback;
