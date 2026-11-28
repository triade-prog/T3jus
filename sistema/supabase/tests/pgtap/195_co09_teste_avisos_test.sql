-- O teste grátis de 7 dias, os avisos (F1.34; CO-09, DC12, migration 1163): cada passo à sócia
-- dona (dia 1, dia 5, dia 7 e dia 8) sai uma vez, por e-mail (a fila contrato_avisos) e no sino do
-- Portal; o passo que perdeu a janela é descartado, com o motivo no histórico interno, e nunca sai
-- "último dia" no dia 8; a prorrogação manda os passos de novo para a data nova; os avisos param com
-- a assinatura confirmada ou o teste dispensado e continuam com o "Quero assinar" pendente; o sino
-- do Console avisa a Administração e a Implantação (e o Financeiro só no pedido para assinar, urgente
-- no dia 7), e cada um vê só os seus, enquanto tiver console.teste.ver.
begin;
select plan(52);

create function pg_temp.relogio(p text) returns timestamptz language sql as $$ select ajustar_relogio(p::timestamptz - now()) $$;
select pg_temp.relogio('2026-11-20 09:00-03');

create temp table ids as select
  teste.equipe('Carol Andrade', 'ADMINISTRACAO') as adm,
  teste.equipe('Marta Quintela', 'FINANCEIRO') as fin,
  teste.equipe('Rafael Teles', 'IMPLANTACAO') as impl,
  teste.equipe('Bruno Saraiva', 'SUPORTE') as sup,
  teste.pessoa('Marina Ribeiro') as marina,
  teste.pessoa('Larissa Matos') as lara,
  teste.pessoa('Ana Lúcia Prado') as ana,
  teste.pessoa('Lucas Buriti') as lucas,
  teste.pessoa('Henrique Moura') as henrique,
  teste.pessoa('Lia Cedro') as lia;

create temp table c (cedro uuid, ribeiro uuid, ipe uuid, buriti uuid, inga uuid, angico uuid);
insert into c (cedro) select console_criar_escritorio(adm, 'Cedro & Lima Advocacia', 'Recife', 'PE') from ids;
update configuracoes set valor = 'true' where chave = 'teste_gratis_ligado';
update c set ribeiro = console_criar_escritorio(adm, 'Ribeiro & Matos Advocacia', 'São Paulo', 'SP'),
             ipe = console_criar_escritorio(adm, 'Ipê Advocacia', 'Brasília', 'DF'),
             buriti = console_criar_escritorio(adm, 'Buriti Advocacia', 'Fortaleza', 'CE'),
             inga = console_criar_escritorio(adm, 'Ingá Advocacia', 'Salvador', 'BA'),
             angico = console_criar_escritorio(adm, 'Angico Advocacia Trabalhista', 'Aracaju', 'SE') from ids;
update configuracoes set valor = 'false' where chave = 'teste_gratis_ligado';
insert into vinculos (pessoa_id, escritorio_id, funcao, criado_por)
            select marina, ribeiro, 'SOCIO', adm from ids, c union all select lara, ribeiro, 'EQUIPE', adm from ids, c
  union all select ana, ipe, 'SOCIO', adm from ids, c union all select lucas, buriti, 'SOCIO', adm from ids, c
  union all select henrique, angico, 'SOCIO', adm from ids, c union all select henrique, inga, 'SOCIO', adm from ids, c
  union all select lia, cedro, 'SOCIO', adm from ids, c
  union all select impl, e, 'IMPLANTACAO', adm from ids, c, unnest(array[ribeiro, inga]) e
  union all select sup, ribeiro, 'SUPORTE', adm from ids, c
  union all select fin, e, 'FINANCEIRO', adm from ids, c, unnest(array[cedro, ribeiro, ipe, buriti, inga, angico]) e;
update pessoas set senha_criada_em = now() where id in (select unnest(array[marina, lara, ana, lucas, henrique, lia]) from ids);

create temp table pl as select (console_plano_salvar(adm, null, null, '{"nome":"Escritório","precoCentavos":49000,"pessoasIncluidas":8}') ->> 'id')::uuid as id from ids;

create function pg_temp.t(p_esc uuid) returns testes_gratis language sql as $$ select * from testes_gratis where escritorio_id = p_esc $$;
create function pg_temp.entrar(p_pessoa uuid, p_esc uuid) returns void language sql as $$
  select escolher_escritorio(p_pessoa, gen_random_uuid(), p_esc) $$;
-- A fila de um escritório: "TIPO fim situação", na ordem em que nasceu.
create function pg_temp.fila(p_esc uuid) returns text language sql as $$
  select coalesce(string_agg(tipo || ' ' || to_char(fim_em, 'DD/MM') || ' '
           || case when enviado_em is not null then 'ENVIADO' when descartado_em is not null then 'DESCARTADO' else 'FILA' end, ', '
           order by criado_em, array_position(array['TESTE_COMECOU', 'TESTE_ACABANDO', 'TESTE_ULTIMO_DIA', 'TESTE_ACABOU'], tipo)), '-')
    from contrato_avisos where escritorio_id = p_esc and tipo like 'TESTE_%' $$;
-- O que a rota recebe da fila, e o envio de tudo o que veio.
create function pg_temp.mandar(p_escritorio text default '%') returns jsonb language plpgsql as $$
declare v jsonb := rotina_contrato_avisos_pendentes(50); x jsonb;
begin
  for x in select * from jsonb_array_elements(v) loop
    continue when x ->> 'escritorio' not like p_escritorio;
    perform rotina_contrato_aviso_registrar((x ->> 'id')::uuid, true);
  end loop;
  return v;
end $$;
create function pg_temp.sino(p_pessoa uuid, p_esc uuid) returns text language sql as $$
  select coalesce(string_agg(tipo, ' ' order by criado_em, id), '-') from avisos_sino
   where escritorio_id = p_esc and pessoa_id = p_pessoa and tipo like 'TESTE_%' $$;
create function pg_temp.console(p_pessoa uuid, p_esc uuid) returns text language sql as $$
  select coalesce(string_agg(tipo || case when (dados ->> 'urgente')::boolean then '!' else '' end, ' ' order by criado_em, id), '-')
    from avisos_console where pessoa_id = p_pessoa and (dados ->> 'escritorioId')::uuid = p_esc $$;
create function pg_temp.descartes(p_esc uuid) returns text language sql as $$
  select coalesce(string_agg((dados ->> 'tipo') || ' ' || (dados ->> 'motivo'), ', ' order by id), '-') from historico
   where escritorio_id = p_esc and acao = 'teste.aviso_descartado' $$;

-- ---------------------------------------------------------------------------------------
-- O dia 1: o aviso sai no próprio acesso, na fila e nos dois sinos.
select pg_temp.entrar(henrique, angico) from ids, c;
select pg_temp.relogio('2026-11-23 14:20-03');
select pg_temp.entrar(ana, ipe) from ids, c;
select pg_temp.relogio('2026-11-24 09:05-03');
select pg_temp.entrar(lucas, buriti) from ids, c;
select pg_temp.relogio('2026-11-25 10:00-03');
select console_teste_dispensar(adm, buriti, (pg_temp.t(buriti)).versao, 'Escritório piloto: o combinado de fundador está no desconto') from ids, c;
select pg_temp.relogio('2026-11-27 23:40-03');
select pg_temp.entrar(marina, ribeiro), pg_temp.entrar(lia, cedro) from ids, c;
select pg_temp.relogio('2026-11-27 23:41-03');
select pg_temp.entrar(lara, ribeiro) from ids, c;

select is((select pg_temp.fila(ribeiro) from c), 'TESTE_COMECOU 03/12 FILA',
  'CO-09: o aviso do dia 1 entra na fila no primeiro acesso, com o último dia do teste');
select is((select pg_temp.sino(marina, ribeiro) from ids, c), 'TESTE_COMECOU', 'CO-09: e no sino do Portal da sócia dona');
select is((select a.dados ->> 'fim' || ' ' || (a.dados ->> 'totalDias') || ' ' || (a.dados ->> 'origem') || ' ' || a.origem_tabela
             from avisos_sino a, ids, c where a.escritorio_id = ribeiro and a.pessoa_id = marina and a.tipo = 'TESTE_COMECOU'),
  '2026-12-03 7 PRIMEIRO_ACESSO testes_gratis', 'o sino leva o último dia, os 7 dias e leva ao teste');
select is((select pg_temp.sino(lara, ribeiro) from ids, c), '-', 'a equipe do escritório não recebe os avisos do teste');
select is((select pg_temp.console(adm, ribeiro) || ' / ' || pg_temp.console(impl, ribeiro) || ' / ' || pg_temp.console(fin, ribeiro)
                  || ' / ' || pg_temp.console(sup, ribeiro) from ids, c), 'TESTE_COMECOU / TESTE_COMECOU / - / -',
  'CO-09: o Console avisa a Administração e a Implantação do escritório; o Financeiro e o Suporte não');
select is((select a.dados ->> 'quem' || ' ' || (a.dados ->> 'escritorio') || ' ' || (a.teste_id = (pg_temp.t(ribeiro)).id)
             from avisos_console a, ids, c where a.pessoa_id = adm and a.tipo = 'TESTE_COMECOU' and (a.dados ->> 'escritorioId')::uuid = ribeiro),
  'Marina Ribeiro Ribeiro & Matos Advocacia true', 'o aviso diz quem entrou e qual escritório, ligado ao teste');
select is((select pg_temp.console(impl, ipe) from ids, c), '-', 'PT-24: a Implantação só recebe dos escritórios atribuídos');
select is((select pg_temp.fila(cedro) || ' ' || pg_temp.sino(lia, cedro) from ids, c), '- -', 'CO-09: sem teste (a chave desligada no cadastro), nada sai');

-- A rota manda o que está na fila: o do dia 1 da Ribeiro sai; o da Buriti (dispensada) e o da Ipê e
-- da Angico (fora do dia 1) são descartados.
select is((select string_agg(x ->> 'tipo' || ' ' || (x ->> 'escritorio'), ', ') from jsonb_array_elements(pg_temp.mandar()) x),
  'TESTE_COMECOU Ribeiro & Matos Advocacia', 'CO-09: a rota recebe só o aviso que ainda vale');
select is((select pg_temp.fila(ribeiro) from c), 'TESTE_COMECOU 03/12 ENVIADO', 'o envio fica registrado na fila');
select is((select count(*)::int || ' ' || bool_and(interno) || ' ' || max(dados ->> 'tipo') from historico, c
            where escritorio_id = ribeiro and acao = 'teste.aviso_enviado'), '1 true TESTE_COMECOU',
  'CO-09: o e-mail que saiu vai ao histórico interno do escritório');
select is((select pg_temp.fila(buriti) || ' · ' || pg_temp.descartes(buriti) from c), 'TESTE_COMECOU 30/11 DESCARTADO · TESTE_COMECOU DISPENSADO',
  'CO-09: o teste dispensado não manda mais nada, e o motivo vai ao histórico');
select is((select pg_temp.fila(ipe) || ' · ' || pg_temp.descartes(ipe) from c), 'TESTE_COMECOU 29/11 DESCARTADO · TESTE_COMECOU JANELA',
  'CO-09: o aviso do dia 1 que não saiu no dia 1 é descartado ("começou hoje" já não vale)');
select is((select pg_temp.mandar() from c), '[]'::jsonb, 'mandar de novo não manda nada');

-- 28/11, 8h (dia 6 da Ipê, dia 9 da Angico): a rotina. A Angico perdeu os dias 5 e 7, porque a
-- rotina não rodou; o dia 8 ainda vale.
select pg_temp.relogio('2026-11-28 08:00-03');
select is((select contrato_avisos_rotina() - 'chamados' from c), '{"enfileirados": 0, "testeDescartados": 2, "testeEnfileirados": 2}'::jsonb,
  'CO-09: a rotina das 8h põe na fila o que o dia pede e descarta o que perdeu a janela');
select is((select pg_temp.fila(ipe) from c), 'TESTE_COMECOU 29/11 DESCARTADO, TESTE_ACABANDO 29/11 FILA', 'CO-09: o dia 6 ainda é do aviso "faltam N dias"');
select is((select pg_temp.fila(angico) from c), 'TESTE_COMECOU 26/11 DESCARTADO, TESTE_ACABANDO 26/11 DESCARTADO, TESTE_ULTIMO_DIA 26/11 DESCARTADO, TESTE_ACABOU 26/11 FILA',
  'CO-09: o passo que perdeu a janela é descartado, e o do fim sai');
select is((select pg_temp.descartes(angico) from c), 'TESTE_COMECOU JANELA, TESTE_ACABANDO JANELA, TESTE_ULTIMO_DIA JANELA', 'o motivo de cada descarte vai ao histórico interno');
select is((select contrato_avisos_rotina() ->> 'testeEnfileirados' from c), '0', 'CO-09: cada passo sai uma vez (rodar de novo não repete)');
select is((select string_agg(x ->> 'tipo' || ' ' || (x ->> 'faltamDias'), ', ' order by x ->> 'tipo') from jsonb_array_elements(pg_temp.mandar()) x),
  'TESTE_ACABANDO 2, TESTE_ACABOU 0', 'a rota recebe o "faltam 2 dias" da Ipê e o fim da Angico');
select is((select pg_temp.sino(ana, ipe) from ids, c), 'TESTE_COMECOU TESTE_ACABANDO', 'CO-09: o sino do Portal da Ipê tem os dois passos');
select is((select a.dados ->> 'assinaturaPreparada' || ' ' || (a.dados ->> 'prorrogado') || ' ' || (a.dados ->> 'fim')
             from avisos_console a, ids, c where a.pessoa_id = adm and a.tipo = 'TESTE_ACABANDO' and (a.dados ->> 'escritorioId')::uuid = ipe),
  'false false 2026-11-29', 'CO-09: o aviso do Console diz se a assinatura está preparada');
select is((select a.dados ->> 'proposta' || ' ' || (a.dados ->> 'soConsultaDesde')
             from avisos_console a, ids, c where a.pessoa_id = adm and a.tipo = 'TESTE_ACABOU' and (a.dados ->> 'escritorioId')::uuid = angico),
  'ENCERRAR 2026-11-27', 'CO-09: o fim sem assinatura propõe encerrar');

-- 29/11 a rotina não roda. 30/11, 8h (dia 8 da Ipê): o "último dia" nunca sai no dia 8.
select pg_temp.relogio('2026-11-30 08:00-03');
select contrato_avisos_rotina() from c;
select is((select pg_temp.fila(ipe) from c), 'TESTE_COMECOU 29/11 DESCARTADO, TESTE_ACABANDO 29/11 ENVIADO, TESTE_ULTIMO_DIA 29/11 DESCARTADO, TESTE_ACABOU 29/11 FILA',
  'CO-09: no dia 8, o "último dia" é descartado e sai o do fim');
select is((select pg_temp.sino(ana, ipe) from ids, c), 'TESTE_COMECOU TESTE_ACABANDO TESTE_ACABOU', 'e o sino não ganha o "último dia"');

-- A Ribeiro: o dia 5 sai na rotina de 01/12, mas a rota fica fora do ar até o dia 7.
select pg_temp.relogio('2026-12-01 08:00-03');
select contrato_avisos_rotina() from c;
select is((select pg_temp.fila(ribeiro) from c), 'TESTE_COMECOU 03/12 ENVIADO, TESTE_ACABANDO 03/12 FILA', 'CO-09: no dia 5, o aviso "faltam 3 dias"');
select is((select a.dados ->> 'faltamDias' from avisos_sino a, ids, c where a.pessoa_id = marina and a.tipo = 'TESTE_ACABANDO'), '3',
  'o sino da sócia diz que faltam 3 dias');

-- "Quero assinar" no dia 5: o sino do Console avisa também o Financeiro.
select pg_temp.relogio('2026-12-01 16:20-03');
select portal_quero_assinar(marina, ribeiro, '{"recado":"Prefiro falar depois das 18h"}') from ids, c;
select is((select pg_temp.console(adm, ribeiro) || ' / ' || pg_temp.console(impl, ribeiro) || ' / ' || pg_temp.console(fin, ribeiro)
                  || ' / ' || pg_temp.console(sup, ribeiro) from ids, c),
  'TESTE_COMECOU TESTE_ACABANDO TESTE_QUER_ASSINAR / TESTE_COMECOU TESTE_ACABANDO TESTE_QUER_ASSINAR / TESTE_QUER_ASSINAR / -',
  'CO-09: o pedido para assinar vai à Administração, à Implantação e ao Financeiro');
select is((select a.dados ->> 'quem' || ' ' || (a.dados ->> 'comRecado') || ' ' || (a.dados ->> 'urgente') || ' ' || (a.dados ? 'recado')
             from avisos_console a, ids where a.pessoa_id = fin and a.tipo = 'TESTE_QUER_ASSINAR'),
  'Marina Ribeiro true false false', 'o aviso diz quem pediu e se há recado, sem o texto; no dia 5 não é urgente');
select portal_quero_assinar(marina, ribeiro, '{}') from ids, c;
select is((select count(*)::int from avisos_console, ids where pessoa_id = fin and tipo = 'TESTE_QUER_ASSINAR'), 1,
  'apertar de novo não avisa de novo');

-- O que cada um vê no sino: o Financeiro só o pedido; quem perde console.teste.ver deixa de ver.
select is((select string_agg(x ->> 'tipo', ' ') from ids, jsonb_array_elements(console_avisos(fin) -> 'itens') x where x ->> 'tipo' like 'TESTE_%'),
  'TESTE_QUER_ASSINAR', 'CO-09: no sino do Financeiro, do teste só o pedido para assinar');
select is((select count(*)::int from ids, jsonb_array_elements(console_avisos(sup) -> 'itens') x), 0, 'o Suporte não recebe avisos do teste');
delete from funcao_acoes where funcao = 'IMPLANTACAO' and acao = 'console.teste.ver';
select is((select count(*)::int from ids, jsonb_array_elements(console_avisos(impl) -> 'itens') x where x ->> 'tipo' like 'TESTE_%'), 0,
  'PT-02: sem console.teste.ver, o aviso do teste some do sino');
insert into funcao_acoes (funcao, acao) values ('IMPLANTACAO', 'console.teste.ver');
select is((select count(*)::int from ids, jsonb_array_elements(console_avisos(impl) -> 'itens') x where x ->> 'tipo' like 'TESTE_%'), 3,
  'e volta com a permissão');

-- 03/12, 8h (dia 7): o pedido ainda sem confirmação; os avisos continuam (decisão 1), e o pedido
-- volta urgente ao sino da equipe. O "faltam 3 dias" que a rota não mandou a tempo é descartado.
select pg_temp.relogio('2026-12-03 08:00-03');
select contrato_avisos_rotina() from c;
select is((select pg_temp.fila(ribeiro) from c), 'TESTE_COMECOU 03/12 ENVIADO, TESTE_ACABANDO 03/12 FILA, TESTE_ULTIMO_DIA 03/12 FILA',
  'CO-09: com o "Quero assinar" pendente, o aviso do último dia sai');
select is((select pg_temp.console(fin, ribeiro) from ids, c), 'TESTE_QUER_ASSINAR TESTE_QUER_ASSINAR!',
  'CO-09: no dia 7, o pedido sem confirmação volta urgente ao sino, também do Financeiro');
select contrato_avisos_rotina() from c;
select is((select count(*)::int from avisos_console, ids where pessoa_id = fin and tipo = 'TESTE_QUER_ASSINAR'), 2, 'uma vez só');
select is((select string_agg(x ->> 'tipo', ', ') from jsonb_array_elements(pg_temp.mandar('Ribeiro%')) x where x ->> 'escritorio' like 'Ribeiro%'),
  'TESTE_ULTIMO_DIA', 'CO-09: a rota manda o "último dia"; o "faltam 3 dias" atrasado não sai');
select is((select pg_temp.descartes(ribeiro) from c), 'TESTE_ACABANDO JANELA', 'e o descarte vai ao histórico');

-- O quadro do Console junta o envio a cada aviso previsto.
select is((select jsonb_agg(x -> 'envio' -> 'situacao') from ids, c, jsonb_array_elements(console_teste(adm, ribeiro) -> 'avisosPrevistos') x),
  '["ENVIADO", "DESCARTADO", "ENVIADO", null]'::jsonb, 'CO-09: o Console vê o que saiu e o que foi descartado em cada passo');
select is((select jsonb_array_length(console_teste(adm, ipe) -> 'avisosEnviados') || ' '
                  || (console_teste(adm, ipe) -> 'avisosPrevistos' -> 2 -> 'envio' ->> 'motivo') from ids, c),
  '4 O dia do aviso passou sem o envio (a rotina ou o e-mail não saíram a tempo)', 'com o motivo do descarte');

-- Prorrogar no dia 7: o "último dia" de 03/12 ainda não enviado sai da fila, e os passos saem de
-- novo para a data nova (05/12).
select pg_temp.relogio('2026-12-03 10:00-03');
select contrato_avisos_rotina() from c;
select console_teste_prorrogar(adm, ipe, (pg_temp.t(ipe)).versao, '2026-12-05', 'A sócia ficou sem internet na primeira semana') from ids, c;
select console_teste_prorrogar(adm, ribeiro, (pg_temp.t(ribeiro)).versao, '2026-12-05', 'Pediu mais dois dias para mostrar ao sócio') from ids, c;
select contrato_avisos_rotina() from c;
select is((select pg_temp.fila(ipe) from c),
  'TESTE_COMECOU 29/11 DESCARTADO, TESTE_ACABANDO 29/11 ENVIADO, TESTE_ULTIMO_DIA 29/11 DESCARTADO, TESTE_ACABOU 29/11 FILA, TESTE_ACABANDO 05/12 FILA',
  'CO-09: depois do fim, prorrogar manda de novo o "faltam N dias" para a data nova');
select is((select string_agg(x ->> 'tipo' || ' ' || (x ->> 'fim') || ' ' || (x ->> 'faltamDias'), ', ' order by x ->> 'escritorio', x ->> 'tipo')
             from jsonb_array_elements(pg_temp.mandar()) x), 'TESTE_ACABANDO 2026-12-05 3, TESTE_ACABANDO 2026-12-05 3',
  'a rota manda os dois "faltam 3 dias" novos; o fim antigo da Ipê sai sem ir');
select is((select pg_temp.descartes(ipe) from c), 'TESTE_COMECOU JANELA, TESTE_ULTIMO_DIA JANELA, TESTE_ACABOU PRORROGADO',
  'CO-09: o aviso do fim antigo é descartado pela prorrogação');
select is((select pg_temp.fila(ribeiro) from c),
  'TESTE_COMECOU 03/12 ENVIADO, TESTE_ACABANDO 03/12 DESCARTADO, TESTE_ULTIMO_DIA 03/12 ENVIADO, TESTE_ACABANDO 05/12 ENVIADO',
  'na Ribeiro, os passos de antes ficam como estavam, e o da data nova sai');

-- 04/12: a assinatura da Ribeiro é confirmada. Os avisos param.
select pg_temp.relogio('2026-12-04 09:00-03');
select console_assinatura_salvar(fin, ribeiro, null, jsonb_build_object('planoId', (select id from pl), 'diaVencimento', 10,
    'forma', 'PIX', 'emailCobranca', 'financeiro@exemplo.com.br')) from ids, c;
select console_assinatura_confirmar(fin, ribeiro, (select versao from assinaturas a, c where a.escritorio_id = c.ribeiro),
  '{"como":"PORTAL","detalhe":"Marina confirmou por telefone o plano, o Pix e o e-mail"}') from ids, c;
select pg_temp.relogio('2026-12-05 08:00-03');
select contrato_avisos_rotina() from c;
select is((select pg_temp.fila(ribeiro) from c),
  'TESTE_COMECOU 03/12 ENVIADO, TESTE_ACABANDO 03/12 DESCARTADO, TESTE_ULTIMO_DIA 03/12 ENVIADO, TESTE_ACABANDO 05/12 ENVIADO',
  'CO-09: assinado, o "último dia" e o fim não saem mais');
select is((select pg_temp.fila(ipe) from c) like '%TESTE_ULTIMO_DIA 05/12 FILA', true, 'a Ipê, sem assinar, recebe o último dia novo');
select console_teste_dispensar(adm, ipe, (pg_temp.t(ipe)).versao, 'A Administração decidiu tratar como piloto') from ids, c;
select pg_temp.mandar();
select is((select pg_temp.fila(ipe) from c) like '%TESTE_ULTIMO_DIA 05/12 DESCARTADO', true,
  'CO-09: dispensado depois de entrar na fila, o aviso sai sem ir');
select pg_temp.relogio('2026-12-06 08:00-03');
select is((select contrato_avisos_rotina() ->> 'testeEnfileirados' from c), '0', 'CO-09: dispensado ou assinado, nenhum passo novo');

-- O teste repetido (Ingá): o aviso vai só ao Console; liberado, o dia 1 sai na hora.
select pg_temp.relogio('2026-12-06 10:15-03');
select pg_temp.entrar(henrique, inga) from ids, c;
select is((select pg_temp.console(adm, inga) || ' / ' || pg_temp.sino(henrique, inga) || ' / ' || pg_temp.fila(inga) from ids, c),
  'TESTE_REPETIDO / - / -', 'CO-09: o repetido avisa a Administração no sino, sem aviso à sócia');
select is((select a.dados ->> 'quem' || ' · ' || (a.dados ->> 'anterior') || ' · ' || (a.dados ->> 'anteriorInicio')
             from avisos_console a, ids, c where a.pessoa_id = adm and a.tipo = 'TESTE_REPETIDO'),
  'Henrique Moura · Angico Advocacia Trabalhista · 2026-11-20', 'o aviso diz quem e qual foi o teste anterior');
select pg_temp.relogio('2026-12-06 10:30-03');
select console_teste_liberar(adm, inga, (pg_temp.t(inga)).versao, 'Escritório novo, com outro sócio na decisão') from ids, c;
select is((select pg_temp.fila(inga) || ' / ' || pg_temp.sino(henrique, inga) || ' / ' || pg_temp.console(impl, inga) from ids, c),
  'TESTE_COMECOU 12/12 FILA / TESTE_COMECOU / TESTE_REPETIDO TESTE_COMECOU',
  'CO-09: liberado, o dia 1 sai na hora, à sócia e à equipe (a Administração, que liberou, não se avisa)');

select * from finish();
rollback;
