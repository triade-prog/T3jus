-- Implantação assistida, parte 3 (F1.44; CO-08 e CO-06, migration 1182): as linhas IMPLANTACAO e
-- ISENCAO na 1ª fatura, atrás da chave implantacao_na_fatura. Com a chave desligada nada muda nos
-- itens (o 092 confere os itens exatos), mas a implantação abre na 1ª fatura. Com a chave ligada:
-- isenta (as duas linhas, o total igual, só na 1ª fatura, o desconto só sobre a mensalidade);
-- cobrada à vista (o total mais R$ 1.490,00); carnê isento (a parcela não muda); carnê com a
-- implantação cobrada recusado na emissão, ao salvar a assinatura, ao gerar carnê novo, na troca
-- do carnê e na conclusão; a rotina pula o escritório e segue; a fatura cancelada não faz a
-- implantação voltar a cobrar (DC14); os blocos da assinatura, do Portal e do documento; os
-- checks dos itens novos.
begin;
select plan(54);

create function pg_temp.relogio(p text) returns timestamptz language sql as $$ select ajustar_relogio(p::timestamptz - now()) $$;
select pg_temp.relogio('2026-12-01 10:00-03');

create temp table ids as select
  teste.equipe('Carol Andrade', 'ADMINISTRACAO') as adm,
  teste.equipe('Marta Quintela', 'FINANCEIRO') as fin,
  teste.equipe('Bruno Saraiva', 'SUPORTE') as sup,
  teste.pessoa('Lia Cedro') as lia,
  teste.pessoa('Ana Ipê') as ana,
  teste.pessoa('Caio Angico') as caio,
  teste.pessoa('Bia Umbu') as bia,
  teste.pessoa('Jó Jaca') as jo,
  teste.pessoa('Teo Tamarindo') as teo;

create temp table c as select
  console_criar_escritorio(adm, 'Cedro & Lima Advocacia', 'Recife', 'PE') as cedro,
  console_criar_escritorio(adm, 'Ipê Advocacia', 'Natal', 'RN') as ipe,
  console_criar_escritorio(adm, 'Angico Advocacia', 'Aracaju', 'SE') as angico,
  console_criar_escritorio(adm, 'Umbu Advocacia', 'Petrolina', 'PE') as umbu,
  console_criar_escritorio(adm, 'Jaca Advocacia', 'Ilhéus', 'BA') as jaca,
  console_criar_escritorio(adm, 'Tamarindo Advocacia', 'Olinda', 'PE') as tamarindo from ids;
select limpar_contexto();
insert into vinculos (pessoa_id, escritorio_id, funcao, criado_por)
            select lia, cedro, 'SOCIO', adm from ids, c union all select ana, ipe, 'SOCIO', adm from ids, c
  union all select caio, angico, 'SOCIO', adm from ids, c union all select bia, umbu, 'SOCIO', adm from ids, c
  union all select jo, jaca, 'SOCIO', adm from ids, c union all select teo, tamarindo, 'SOCIO', adm from ids, c
  union all select fin, e, 'FINANCEIRO', adm from ids, c, unnest(array[cedro, ipe, angico, umbu, jaca, tamarindo]) e
  union all select sup, cedro, 'SUPORTE', adm from ids, c;
update pessoas set senha_criada_em = now() where id in (select unnest(array[lia, ana, caio, bia, jo, teo]) from ids);
create temp table pl as select
  (console_plano_salvar(adm, null, null, '{"nome":"Escritório","precoCentavos":49900,"pessoasIncluidas":8}') ->> 'id')::uuid as escritorio from ids;
select limpar_contexto();

create function pg_temp.entrar(p_pessoa uuid, p_esc uuid) returns void language sql as $$
  select escolher_escritorio(p_pessoa, gen_random_uuid(), p_esc); select limpar_contexto() $$;
create function pg_temp.imp(p_esc uuid) returns implantacoes language sql as $$
  select * from implantacoes where escritorio_id = p_esc order by numero desc limit 1 $$;
create function pg_temp.vc(p_esc uuid) returns integer language sql as $$ select versao from clientes where escritorio_id = p_esc $$;
create function pg_temp.va(p_esc uuid) returns integer language sql as $$ select versao from assinaturas where escritorio_id = p_esc $$;
create function pg_temp.f(p_esc uuid, p_n integer default 1) returns faturas language sql as $$
  select * from faturas where escritorio_id = p_esc order by competencia, numero offset p_n - 1 limit 1 $$;
create function pg_temp.itens(p_fatura uuid) returns text[] language sql as $$
  select array_agg(tipo || ':' || valor_centavos order by ordem) from fatura_itens where fatura_id = p_fatura $$;
create function pg_temp.motivo(p jsonb) returns text language sql as $$ select coalesce(p -> 'detalhe' ->> 'motivo', p ->> 'codigo', 'ok') $$;
create function pg_temp.assinar(p_esc uuid, p_forma text, p_desconto boolean default false) returns jsonb language sql as $$
  select console_assinatura_salvar((select fin from ids), p_esc, null, jsonb_build_object('planoId', (select escritorio from pl),
    'diaVencimento', 10, 'forma', p_forma, 'emailCobranca', 'financeiro@escritorio.adv.br')
    || case when p_desconto then jsonb_build_object('desconto', jsonb_build_object('pct', 20, 'ate', date '2027-03-01',
                                                                                  'motivo', 'Entrada: 3 primeiras faturas')) else '{}'::jsonb end) $$;
create function pg_temp.ativar(p_esc uuid) returns integer language sql as $$
  select console_mudar_estagio((select adm from ids), p_esc, pg_temp.vc(p_esc), 'ATIVO', 'Implantação concluída') $$;
create function pg_temp.chave(p boolean) returns void language sql as $$
  update configuracoes set valor = to_jsonb(p) where chave = 'implantacao_na_fatura' $$;
create function pg_temp.regra(p_condicao text) returns void language sql as $$
  update implantacao_regras set condicao_padrao = p_condicao $$;

-- ---------------------------------------------------------------------------------------
-- Chave desligada (como nasce): os itens não mudam, mas a 1ª fatura abre a implantação.
select is(implantacao_na_fatura(), false, 'CO-08: a chave implantacao_na_fatura nasce desligada');
select pg_temp.assinar(jaca, 'PIX', true) from c;
select limpar_contexto();
select pg_temp.ativar(jaca) from c;
select limpar_contexto();
select is((select pg_temp.itens((pg_temp.f(jaca)).id) from c), array['MENSALIDADE:49900', 'DESCONTO:-9980'],
  'CO-08: com a chave desligada, a 1ª fatura tem só os itens de sempre');
select is((select (pg_temp.f(jaca)).total_centavos from c), 39920, 'e o total de sempre');
select is((select (pg_temp.imp(jaca)).estado from c), 'CONCLUIDA',
  'CO-08: nenhum sócio entrou: a 1ª fatura abriu a implantação (na_fatura) e o Ativo a concluiu');
select is((select (console_assinatura(fin, jaca) -> 'implantacao') - 'id' from ids, c),
  jsonb_build_object('numero', 1, 'estado', 'CONCLUIDA', 'nome', 'Implantação assistida',
    'descricao', 'treino de toda a equipe e acompanhamento por 30 dias', 'condicao', 'ISENTA', 'condicaoTexto', 'Oferta de lançamento',
    'naFatura', false, 'faturada', false, 'faturaId', null, 'faturaNumero', null, 'faturaCompetencia', null,
    'naPrimeiraFatura', false, 'valorCentavos', 149000),
  'CO-08: o bloco da assinatura diz que a implantação não foi para a fatura');

-- ---------------------------------------------------------------------------------------
-- Isenta, com Pix e desconto de entrada.
select pg_temp.chave(true);
select pg_temp.entrar(lia, cedro) from ids, c;
select pg_temp.assinar(cedro, 'PIX', true) from c;
select limpar_contexto();
select is((select console_assinatura(fin, cedro) -> 'implantacao' ->> 'naPrimeiraFatura' from ids, c), 'true',
  'CO-08: antes da 1ª fatura, o bloco diz que a implantação vai nela');
select is((select console_assinatura(fin, cedro) -> 'assinatura' -> 'proxima' -> 'itens' from ids, c) @? '$[*] ? (@.tipo == "IMPLANTACAO")', false,
  'CO-08: a prévia da próxima fatura (cobranca_itens_da) não traz a implantação');
select pg_temp.ativar(cedro) from c;
select limpar_contexto();
select is((select pg_temp.itens((pg_temp.f(cedro)).id) from c),
  array['MENSALIDADE:49900', 'DESCONTO:-9980', 'IMPLANTACAO:149000', 'ISENCAO:-149000'],
  'CO-08: isenta, a 1ª fatura traz a implantação e a isenção depois dos itens do mês');
select is((select (pg_temp.f(cedro)).total_centavos from c), 39920, 'CO-08: e as duas somam zero: o total não muda');
select is((select array_agg(descricao order by ordem) from fatura_itens where fatura_id = (select (pg_temp.f(cedro)).id from c) and implantacao_id is not null),
  array['Implantação assistida · treino de toda a equipe e acompanhamento por 30 dias', 'Isenção da implantação · Oferta de lançamento'],
  'CO-08: o texto da isenção fica congelado na descrição do item');
select is((select count(distinct implantacao_id)::int from fatura_itens where fatura_id = (select (pg_temp.f(cedro)).id from c) and implantacao_id = (select (pg_temp.imp(cedro)).id from c)), 1,
  'CO-08: as duas linhas apontam para a implantação do escritório');
select is((select valor_centavos from fatura_itens where fatura_id = (select (pg_temp.f(cedro)).id from c) and tipo = 'DESCONTO'), -9980,
  'CO-06: o desconto de entrada continua só sobre a mensalidade (20% de R$ 499,00)');
select is((select (pg_temp.imp(cedro)).estado from c), 'CONCLUIDA', 'CO-08: o Ativo concluiu a implantação');
select is((select e.dados -> 'implantacao' ->> 'isenta' from fatura_eventos e, c where e.fatura_id = (pg_temp.f(cedro)).id and e.acao = 'fatura.emitida'), 'true',
  'CO-08: o evento da emissão diz que a implantação foi, isenta');
select is((select console_assinatura(fin, cedro) -> 'implantacao' ->> 'faturaId' from ids, c), (select (pg_temp.f(cedro)).id::text from c),
  'CO-08: o bloco da assinatura aponta para a fatura que levou a implantação');
select is((select (console_assinatura(fin, cedro) -> 'implantacao' ->> 'valorCentavos')::int from ids, c), 149000,
  'CO-08: o Financeiro vê o valor da implantação');
select ok((select not (console_assinatura(sup, cedro) -> 'implantacao' ? 'valorCentavos')
              and console_assinatura(sup, cedro) -> 'implantacao' ->> 'condicao' = 'ISENTA' from ids, c),
  'CO-08: o Suporte vê a condição, sem o valor (NOTAS.md:146)');
select is((select portal_plano_faturas(lia, cedro) -> 'implantacao' ->> 'valorCentavos' from ids, c), '149000',
  'CO-08: no Portal, a sócia dona vê o bloco com o valor');
select is((select jsonb_path_query_array(portal_plano_faturas(lia, cedro) -> 'faturas' -> 0 -> 'itens', '$[*].tipo') from ids, c),
  '["MENSALIDADE", "DESCONTO", "IMPLANTACAO", "ISENCAO"]'::jsonb, 'CO-08: e as linhas na fatura do Portal');
select is((select cobranca_documento_json(f) -> 'implantacao' from c, pg_temp.f(cedro) f),
  jsonb_build_object('nome', 'Implantação assistida', 'descricao', 'treino de toda a equipe e acompanhamento por 30 dias',
                     'condicao', 'ISENTA', 'condicaoTexto', 'Oferta de lançamento', 'valorCentavos', 149000),
  'CO-08: o documento da fatura traz a implantação como estava na emissão');
select is((select jsonb_array_length(cobranca_documento_json(f) -> 'itens') from c, pg_temp.f(cedro) f), 4, 'e os quatro itens');
-- Só a 1ª fatura (a 2ª sai 20 dias antes do vencimento de 10/02/2027).
select pg_temp.relogio('2027-01-25 10:00-03');
select cobranca_rotina();
select is((select pg_temp.itens((pg_temp.f(cedro, 2)).id) from c), array['MENSALIDADE:49900', 'DESCONTO:-9980'],
  'CO-08: a 2ª fatura não traz a implantação');
select is((select count(*)::int from fatura_itens i, c where i.escritorio_id = cedro and i.implantacao_id is not null), 2,
  'CO-08: a implantação entra uma vez só');
-- A regra mudou depois: a fatura emitida não muda.
select pg_temp.regra('COBRADA');
select is((select cobranca_documento_json(f) -> 'implantacao' ->> 'condicao' from c, pg_temp.f(cedro) f), 'ISENTA',
  'CO-08: mudar a regra não muda a implantação nem a fatura já emitida');
select pg_temp.regra('ISENTA');

-- ---------------------------------------------------------------------------------------
-- Cobrada, à vista (boleto), aberta na 1ª fatura (nenhum sócio entrou).
select pg_temp.relogio('2026-12-01 10:00-03');
select pg_temp.regra('COBRADA');
select pg_temp.assinar(ipe, 'BOLETO', true) from c;
select limpar_contexto();
select pg_temp.ativar(ipe) from c;
select limpar_contexto();
select is((select pg_temp.itens((pg_temp.f(ipe)).id) from c), array['MENSALIDADE:49900', 'DESCONTO:-9980', 'IMPLANTACAO:149000'],
  'CO-08: cobrada, a 1ª fatura traz a implantação sem a isenção');
select is((select (pg_temp.f(ipe)).total_centavos from c), 39920 + 149000, 'CO-08: e o total sobe R$ 1.490,00 (à vista)');
select is((select row((pg_temp.imp(ipe)).condicao, (pg_temp.imp(ipe)).estado)::text from c), row('COBRADA', 'CONCLUIDA')::text,
  'CO-08: a implantação aberta na 1ª fatura copiou a regra do dia (cobrada) e foi concluída no Ativo');
select is((select cobranca_documento_json(f) -> 'implantacao' ->> 'condicaoTexto' from c, pg_temp.f(ipe) f), null,
  'CO-08: cobrada, sem texto de isenção');
-- A fatura cancelada não faz a implantação voltar a cobrar (DC14).
select console_fatura_cancelar(adm, ipe, (pg_temp.f(ipe)).id, (pg_temp.f(ipe)).versao, 'Desistência') from ids, c;
select limpar_contexto();
select is((select console_assinatura(fin, ipe) -> 'implantacao' ->> 'faturada' from ids, c), 'false',
  'CO-08: com a 1ª fatura cancelada, a implantação deixa de contar como faturada');
select is((select console_assinatura(fin, ipe) -> 'implantacao' ->> 'naPrimeiraFatura' from ids, c), 'false',
  'CO-08: e não vai mais para fatura nenhuma (não há reemissão)');
select pg_temp.relogio('2027-01-25 10:00-03');
select cobranca_rotina();
select is((select pg_temp.itens((pg_temp.f(ipe, 2)).id) from c), array['MENSALIDADE:49900', 'DESCONTO:-9980'],
  'CO-08: a fatura seguinte sai sem a implantação: a cancelada não volta a cobrar (DC14)');
select pg_temp.relogio('2026-12-01 10:00-03');
select pg_temp.regra('ISENTA');

-- ---------------------------------------------------------------------------------------
-- Carnê com a implantação isenta: a parcela não muda.
select pg_temp.entrar(caio, angico) from ids, c;
select pg_temp.assinar(angico, 'CARNE', true) from c;
select limpar_contexto();
select pg_temp.ativar(angico) from c;
select limpar_contexto();
select is((select pg_temp.itens((pg_temp.f(angico)).id) from c), array['MENSALIDADE:49900', 'DESCONTO:-9980', 'IMPLANTACAO:149000', 'ISENCAO:-149000'],
  'CO-08: no carnê isento, a 1ª fatura traz os itens da parcela e as duas linhas');
select is((select (pg_temp.f(angico)).total_centavos = p.valor_centavos from c, assinatura_carne_parcelas p where p.id = (pg_temp.f(angico)).carne_parcela_id), true,
  'CO-08: e o total é o da parcela (as duas linhas somam zero)');
select is((select p.itens @? '$[*] ? (@.tipo == "IMPLANTACAO")' from c, assinatura_carne_parcelas p where p.id = (pg_temp.f(angico)).carne_parcela_id), false,
  'CO-08: a parcela do carnê não guarda a implantação (as linhas saem só na emissão)');

-- ---------------------------------------------------------------------------------------
-- Carnê com a implantação cobrada: recusado em todos os caminhos.
select pg_temp.regra('COBRADA');
select is(pg_temp.motivo(teste.erro($$ select pg_temp.assinar(umbu, 'CARNE') from c $$)), 'IMPLANTACAO_COBRADA_NO_CARNE',
  'CO-08: preparar a assinatura com carnê e a regra cobrada é recusado');
select pg_temp.assinar(umbu, 'PIX') from c;
select limpar_contexto();
select is(pg_temp.motivo(teste.erro(format('select console_assinatura_salvar(%L, %L, %s, %L)', fin, umbu, pg_temp.va(umbu),
  jsonb_build_object('diaVencimento', 10, 'forma', 'CARNE', 'emailCobranca', 'financeiro@escritorio.adv.br')))), 'IMPLANTACAO_COBRADA_NO_CARNE')
  from ids, c;
select is((select forma from assinaturas, c where escritorio_id = umbu), 'PIX', 'CO-08: e a assinatura continua no Pix');
-- O carnê salvo antes (chave desligada) e a implantação nascida cobrada depois.
select pg_temp.chave(false);
select console_assinatura_salvar(fin, umbu, pg_temp.va(umbu), jsonb_build_object('diaVencimento', 10, 'forma', 'CARNE',
  'emailCobranca', 'financeiro@escritorio.adv.br')) from ids, c;
select limpar_contexto();
select pg_temp.chave(true);
select pg_temp.entrar(bia, umbu) from ids, c;
select is((select (pg_temp.imp(umbu)).condicao from c), 'COBRADA', 'CO-08: a implantação nasce cobrada com o carnê já salvo');
select is(pg_temp.motivo(teste.erro(format('select console_implantacao_concluir(%L, %L, %s, %s, null)', adm, umbu, pg_temp.vc(umbu),
  (pg_temp.imp(umbu)).versao))), 'IMPLANTACAO_COBRADA_NO_CARNE', 'CO-08: concluir a implantação com o carnê é recusado') from ids, c;
select is(pg_temp.motivo(teste.erro($$ select pg_temp.ativar(umbu) from c $$)), 'IMPLANTACAO_COBRADA_NO_CARNE',
  'CO-08: passar a Ativo pela aba Contrato também');
select is((select (pg_temp.imp(umbu)).estado || ' ' || (select estado from clientes where escritorio_id = umbu) from c), 'ABERTA IMPLANTACAO',
  'CO-08: e nada muda');
select is(pg_temp.motivo(teste.erro($$ select cobranca_emitir(a, (competencia_de(hoje_brasilia()) + interval '1 month')::date)
  from assinaturas a, c where a.escritorio_id = umbu $$)), 'IMPLANTACAO_COBRADA_NO_CARNE', 'CO-08: a emissão recusa');
-- A cobrança começa pela rotina (como no fim do teste do CO-09, sem pessoa no contexto).
select entrar_escritorio_servico(umbu) from c;
select lives_ok($$ select cobranca_comecar(umbu) from c $$, 'CO-08: pela rotina, a recusa não derruba a cobrança');
select limpar_contexto();
select is((select count(*)::int from faturas, c where escritorio_id = umbu), 0, 'CO-08: a 1ª fatura desse escritório não sai');
select is((select count(*)::int from fatura_eventos e, c where e.escritorio_id = umbu and e.acao = 'implantacao.carne_recusado'), 1,
  'CO-08: e a recusa fica registrada');
select lives_ok($$ select cobranca_rotina() $$, 'CO-08: a rotina diária segue com os outros escritórios');
select is((select count(*)::int from fatura_eventos e, c where e.escritorio_id = umbu and e.acao = 'implantacao.carne_recusado'), 1,
  'CO-08: uma vez por dia');
select is(pg_temp.motivo(teste.erro(format('select console_carne_novo(%L, %L, %s, %L)', fin, umbu, pg_temp.va(umbu), 'Carnê do ano'))),
  'IMPLANTACAO_COBRADA_NO_CARNE', 'CO-08: gerar carnê novo é recusado') from ids, c;
select is(pg_temp.motivo(teste.erro($$ select entrar_escritorio((select fin from ids), (select umbu from c), 'console.cobranca.editar'),
  cobranca_trocar_carne(a, 'Mudança de plano', true) from assinaturas a, c where a.escritorio_id = umbu $$)), 'IMPLANTACAO_COBRADA_NO_CARNE',
  'CO-08: a troca do carnê também');
select limpar_contexto();
-- Com Pix, a rotina emite a 1ª fatura com a implantação cobrada.
select console_assinatura_salvar(fin, umbu, pg_temp.va(umbu), jsonb_build_object('diaVencimento', 10, 'forma', 'PIX',
  'emailCobranca', 'financeiro@escritorio.adv.br')) from ids, c;
select limpar_contexto();
select cobranca_rotina();
select is((select pg_temp.itens((pg_temp.f(umbu)).id) from c), array['MENSALIDADE:49900', 'IMPLANTACAO:149000'],
  'CO-08: no Pix, a rotina emite a 1ª fatura com a implantação à vista');
select pg_temp.regra('ISENTA');

-- ---------------------------------------------------------------------------------------
-- Os itens novos: o sinal, a implantação só nos dois tipos e do mesmo escritório.
select throws_ok($$ insert into fatura_itens (escritorio_id, fatura_id, ordem, tipo, descricao, quantidade, valor_unitario_centavos, valor_centavos, implantacao_id)
  select cedro, (pg_temp.f(cedro, 2)).id, 9, 'ISENCAO', 'x', 1, 100, 100, (pg_temp.imp(cedro)).id from c $$, '23514', null,
  'CO-08: a isenção é negativa');
select throws_ok($$ insert into fatura_itens (escritorio_id, fatura_id, ordem, tipo, descricao, quantidade, valor_unitario_centavos, valor_centavos)
  select cedro, (pg_temp.f(cedro, 2)).id, 9, 'IMPLANTACAO', 'x', 1, 100, 100 from c $$, '23514', null,
  'CO-08: a linha da implantação aponta para a implantação');
select throws_ok($$ insert into fatura_itens (escritorio_id, fatura_id, ordem, tipo, descricao, quantidade, valor_unitario_centavos, valor_centavos, implantacao_id)
  select cedro, (pg_temp.f(cedro, 2)).id, 9, 'IMPLANTACAO', 'x', 1, 100, 100, (pg_temp.imp(angico)).id from c $$, '23503', null,
  'CO-08: e só para a implantação do mesmo escritório');

-- ---------------------------------------------------------------------------------------
-- Depois de todas as migrations: a 1ª fatura isenta ainda traz as duas linhas (revisão, correção 3).
select pg_temp.assinar(tamarindo, 'PIX') from c;
select limpar_contexto();
select pg_temp.ativar(tamarindo) from c;
select limpar_contexto();
select is((select pg_temp.itens((pg_temp.f(tamarindo)).id) from c), array['MENSALIDADE:49900', 'IMPLANTACAO:149000', 'ISENCAO:-149000'],
  'CO-08: depois de todas as migrations, a 1ª fatura isenta traz as duas linhas');

select * from finish();
rollback;
