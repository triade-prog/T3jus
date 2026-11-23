-- Prazo do comprovante de residência (0910; F3.134, AP-08): só a sócia dona muda, de 30 a 365
-- dias; a prévia conta os comprovantes em uso dos clientes ativos; o texto ao cliente troca junto
-- só na frase "últimos N dias"; nada de pedido novo nem fechado.
begin;
select plan(45);

select ajustar_relogio(('2026-11-18 10:00-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Felipe Matos') as felipe,
  teste.pessoa('Larissa Costa') as larissa,
  teste.escritorio('Ribeiro & Matos') as rm,
  teste.pessoa('Rui Lima') as rui,
  teste.escritorio('Lima Advocacia') as outro;
select teste.vincular(socia, rm, 'SOCIO'), teste.vincular(rui, outro, 'SOCIO') from ids;
select portal_convidar(socia, rm, larissa, 'Larissa Costa', array['JURIDICO']) from ids;
select etapas_garantir(rm) from ids;

-- Um cliente com o comprovante em uso de N dias (pela data do papel).
create function pg_temp.cliente(p_nome text, p_dias integer, p_contatos jsonb default null) returns uuid language plpgsql as $$
declare v uuid;
begin
  v := (portal_cliente_cadastrar((select socia from ids), (select rm from ids), jsonb_build_object('tipo', 'PF', 'nome', p_nome, 'origem', 'GOOGLE',
         'contatos', coalesce(p_contatos, jsonb_build_array(jsonb_build_object('nome', p_nome, 'telefone', '+5511990000000', 'principal', true))))) ->> 'id')::uuid;
  if p_dias is not null then
    insert into cliente_documentos (escritorio_id, cliente_id, tipo, data_documento, nome, arquivo_tipo, tamanho, situacao, enviado_por, concluido_em)
    select rm, v, 'COMPROVANTE_RESIDENCIA', '2026-11-18'::date - p_dias, 'conta.pdf', 'application/pdf', 1000, 'PRONTO', socia, app_now() from ids;
  end if;
  return v;
end $$;

-- Dos 9 clientes ativos com comprovante, 3 passam de 90 dias e 4 ficam entre 60 e 90.
create temp table cli as select
  pg_temp.cliente('Antônia Ferreira Prado', 139, jsonb_build_array(jsonb_build_object('nome', 'Joana Prado', 'papel', 'Filha', 'telefone', '+5511996027736', 'principal', true),
                                                                   jsonb_build_object('nome', 'Antônia Ferreira Prado', 'telefone', '+5511987654321'))) ant,
  pg_temp.cliente('Irene Castro', 118) irene,
  pg_temp.cliente('Hélio Batista', 97) helio,
  pg_temp.cliente('Eduardo Nascimento', 84) eduardo,
  pg_temp.cliente('Gabriela Teixeira', 77) gabriela,
  pg_temp.cliente('Benedito Souza', 71) benedito,
  pg_temp.cliente('Sílvia Ramos', 64) silvia,
  pg_temp.cliente('Rosa Almeida', 20) rosa,
  pg_temp.cliente('Paulo Dias', 10) paulo,
  pg_temp.cliente('Otávio Arquivado', 200) arquivado,
  pg_temp.cliente('Vera Excluída', 200) excluida;
-- O comprovante antigo de Paulo foi substituído: não conta.
insert into cliente_documentos (escritorio_id, cliente_id, tipo, data_documento, nome, arquivo_tipo, tamanho, situacao, enviado_por, concluido_em, substituido_por)
select rm, paulo, 'COMPROVANTE_RESIDENCIA', '2026-04-01', 'antiga.pdf', 'application/pdf', 1000, 'PRONTO', socia, app_now() - interval '1 day',
       (select id from cliente_documentos d where d.cliente_id = cli.paulo) from ids, cli;
select definir_transicao('ARQUIVOU', null, true);
update clientes_escritorio set estado = 'INATIVO' where id = (select arquivado from cli);
select definir_transicao('EXCLUIU', null, true);
update clientes_escritorio set estado = 'EXCLUIDO', contatos = '[]'::jsonb, excluido_em = app_now() where id = (select excluida from cli);

-- As listas: previdenciário e trabalhista pela sugestão (dizem "últimos 90 dias"); cível com
-- texto próprio; consumidor com o comprovante tirado; família com um texto de 300 letras.
select portal_juridico_documentos_inicio_sugestao(socia, rm, a) from ids, unnest(array['PREVIDENCIARIO', 'TRABALHISTA', 'CONSUMIDOR']) a;
select portal_juridico_documento_inicio_salvar(socia, rm, null, null,
  '{"area": "CIVEL", "nome": "Comprovante de residência", "comoPedir": "Conta no seu nome, de luz ou de água.", "pessoal": "COMPROVANTE_RESIDENCIA", "seHouver": false}') from ids;
select portal_juridico_documento_inicio_tirar(socia, rm, i.id, i.versao)
  from ids, documentos_inicio i where i.escritorio_id = ids.rm and i.area = 'CONSUMIDOR' and i.pessoal = 'COMPROVANTE_RESIDENCIA';
select portal_juridico_documento_inicio_salvar(socia, rm, null, null, jsonb_build_object('area', 'FAMILIA', 'nome', 'Comprovante de residência',
  'comoPedir', 'Conta dos últimos 90 dias. ' || repeat('x', 300 - length('Conta dos últimos 90 dias. ')), 'pessoal', 'COMPROVANTE_RESIDENCIA', 'seHouver', false)) from ids;
-- O outro escritório também diz "últimos 90 dias" e não pode mudar.
select portal_juridico_documentos_inicio_sugestao(rui, outro, 'PREVIDENCIARIO') from ids;

-- A frase: só "últimos N dias", inteira.
select ok(prazo_comprovante_tem_frase('Conta dos últimos 90 dias.', 90), 'a frase com o prazo é achada');
select ok(prazo_comprovante_tem_frase('Últimos 90 dias, por favor.', 90), 'também com maiúscula');
select ok(not prazo_comprovante_tem_frase('Conta dos penúltimos 90 dias.', 90), '"penúltimos" não é a frase');
select ok(not prazo_comprovante_tem_frase('Conta dos últimos 900 dias.', 90), '"900" não é 90');
select ok(not prazo_comprovante_tem_frase('Conta dos últimos 190 dias.', 90), '"190" não é 90');
select is(prazo_comprovante_trocar_frase('Últimos 90 dias. Até os últimos 90 dias.', 90, 60), 'Últimos 60 dias. Até os últimos 60 dias.',
  'troca as duas vezes, com a maiúscula de cada uma');

-- Quem pode: só a sócia dona, mesmo que a equipe tenha juridico.etapas.editar.
select teste.permitir('EQUIPE', 'juridico.etapas.editar');
select is((teste.erro($$ select portal_escritorio_prazo_comprovante(larissa, rm, 60, true) from ids $$)) -> 'detalhe' ->> 'motivo', 'SO_SOCIO_DONO',
  'AP-08: a equipe não muda o prazo, nem com juridico.etapas.editar');
select is((teste.erro($$ select portal_escritorio_prazo_comprovante_previa(larissa, rm, 60) from ids $$)) ->> 'codigo', 'TC401',
  'AP-08: e não vê a prévia');
delete from funcao_acoes where funcao = 'EQUIPE' and acao = 'juridico.etapas.editar';

-- Os limites: de 30 a 365.
select is((teste.erro($$ select portal_escritorio_prazo_comprovante(socia, rm, 29, true) from ids $$)) -> 'detalhe' -> 'campos', '["validadeDias"]'::jsonb, '29 é recusado');
select is((teste.erro($$ select portal_escritorio_prazo_comprovante(socia, rm, 366, true) from ids $$)) -> 'detalhe' -> 'campos', '["validadeDias"]'::jsonb, '366 é recusado');
select is((teste.erro($$ select portal_escritorio_prazo_comprovante(socia, rm, null, true) from ids $$)) ->> 'codigo', 'TC422', 'sem prazo é recusado');
select is((teste.erro($$ select portal_escritorio_prazo_comprovante_previa(socia, rm, 29) from ids $$)) ->> 'codigo', 'TC422', 'a prévia também recusa 29');
select is((select portal_escritorio_prazo_comprovante_previa(socia, rm, 30) ->> 'dias' from ids), '30', '30 vale');
select is((select portal_escritorio_prazo_comprovante_previa(socia, rm, 365) ->> 'dias' from ids), '365', '365 vale');

-- A página: quem muda, a contagem e as listas com a frase.
create temp table pg0 as select portal_juridico_documentos_inicio(larissa, rm) l from ids;
select is((select l -> 'podeMudarPrazo' from pg0), 'false'::jsonb, 'a equipe vê sem mudar');
select is((select l -> 'sociosDonos' from pg0), '["Marina Ribeiro"]'::jsonb, 'e sabe quem muda');
select is((select (l ->> 'comprovantesTotal') || '/' || (l ->> 'comprovantesVencidos') from pg0), '9/3',
  'só os clientes ativos contam: arquivados, excluídos e o substituído ficam fora');
select is((select l ->> 'listasComFrase' from pg0), '3', 'três listas dizem o prazo (o tirado e o texto próprio não contam)');
select ok((select portal_juridico_documentos_inicio(socia, rm) -> 'podeMudarPrazo' from ids) = 'true'::jsonb, 'a sócia dona muda');

-- A prévia com 60: 4 passam a ter mais de 60 dias, 7 de 9 no total.
create temp table pv60 as select portal_escritorio_prazo_comprovante_previa(socia, rm, 60) p from ids;
select is((select (p ->> 'passamAQtd') || '/' || (p ->> 'vencidosCom') || '/' || (p ->> 'totalComComprovante') from pv60), '4/7/9', 'com 60, 4 passam e são 7 de 9');
select is((select p -> 'passamA' -> 0 ->> 'nome' from pv60), 'Eduardo Nascimento', 'do mais velho ao mais novo');
select is((select p ->> 'vencidosAgora' from pv60), (select l ->> 'comprovantesVencidos' from pg0), 'a prévia e a página contam igual');

-- A prévia com 180: 3 voltam a em dia; o pedido aberto de Antônia continua e diz por onde foi.
insert into casos (escritorio_id, nome, area, etapa_id, responsavel_id, criado_por)
select rm, 'Ferreira Prado x INSS', 'PREVIDENCIARIO', (select id from etapas where escritorio_id = rm order by ordem limit 1), socia, socia from ids;
insert into documento_pedidos (escritorio_id, caso_id, descricao, cliente_id, pedido_em, pedido_por, tipo_pessoal, inicio)
select rm, (select id from casos where nome = 'Ferreira Prado x INSS'), 'Comprovante de residência', cli.ant, '2026-11-18', socia, 'COMPROVANTE_RESIDENCIA', true from ids, cli;
insert into conversas (escritorio_id, telefone, cliente_id) select rm, '+5511996027736', cli.ant from ids, cli;
insert into conversa_mensagens (escritorio_id, conversa_id, autor, texto, aviso_tipo, envio, dados)
select rm, (select id from conversas where cliente_id = cli.ant), 'AVISO', 'Olá, Joana.', 'Pedido de documento', 'NA_FILA',
       jsonb_build_object('pedidos', jsonb_build_array((select id from documento_pedidos where cliente_id = cli.ant)))
  from ids, cli;
create temp table pv180 as select portal_escritorio_prazo_comprovante_previa(socia, rm, 180) p from ids;
select is((select (p ->> 'voltamAEmDiaQtd') || '/' || (p ->> 'vencidosCom') from pv180), '3/0', 'com 180, 3 voltam a em dia e nenhum passa');
select is((select p -> 'voltamAEmDia' -> 0 ->> 'dataDocumento' from pv180), '2026-07-02', 'com a data do papel');
select is((select p -> 'voltamAEmDia' -> 0 -> 'pedidos' -> 0 -> 'contato' from pv180), '{"nome": "Joana Prado", "papel": "Filha"}'::jsonb,
  'o pedido aberto diz a quem foi');
select is((select p -> 'voltamAEmDia' -> 0 -> 'pedidos' -> 0 -> 'peloWhatsapp' from pv180), 'true'::jsonb, 'e que foi pelo WhatsApp');
select is((select jsonb_array_length(p -> 'voltamAEmDia' -> 1 -> 'pedidos') from pv180), 0, 'quem não tem pedido aberto vem sem pedidos');

-- Salvar 60 com a troca do texto.
create temp table antes as select i.id, i.area, i.como_pedir, i.versao, i.removido_em from documentos_inicio i;
create temp table pedidos_antes as select count(*) n, count(*) filter (where chegou_em is null) abertos from documento_pedidos;
create temp table s60 as select portal_escritorio_prazo_comprovante(socia, rm, 60, true) r from ids;
select is((select r - 'de' from s60), '{"mudou": true, "passaramA": 4, "naoCouberam": 0, "validadeDias": 60, "listasTrocadas": 3, "textosTrocados": 3, "voltaramAEmDia": 0}'::jsonb,
  'AP-08: o prazo muda, 4 passam a vencer e o texto troca em 3 listas');
select is((select como_pedir from documentos_inicio i, ids where i.escritorio_id = ids.rm and i.area = 'PREVIDENCIARIO' and i.pessoal = 'COMPROVANTE_RESIDENCIA'),
  'Conta de luz, água ou telefone dos últimos 60 dias.', 'o texto ao cliente diz o prazo novo');
select is((select i.versao - a.versao from documentos_inicio i join antes a using (id), ids
            where i.escritorio_id = ids.rm and i.area = 'PREVIDENCIARIO' and i.pessoal = 'COMPROVANTE_RESIDENCIA'), 1, 'e o item sobe de versão');
select is((select count(*) from documentos_inicio i join antes a using (id)
            where i.como_pedir is distinct from a.como_pedir and (a.removido_em is not null or i.escritorio_id = (select outro from ids) or i.area = 'CIVEL')),
  0::bigint, 'o item tirado, o texto próprio e o outro escritório ficam como estavam');
select is((select count(*) from historico h, ids where h.escritorio_id = ids.rm and h.acao = 'juridico.documento_inicio_editado' and (h.dados ->> 'porPrazo')::boolean),
  3::bigint, 'cada texto trocado tem a sua linha no histórico');
select is((select dados from historico h, ids where h.escritorio_id = ids.rm and h.acao = 'juridico.prazo_comprovante'),
  '{"de": 90, "para": 60, "trocarTexto": true, "textosTrocados": 3}'::jsonb, 'a mudança do prazo fica no histórico');
select is((select row(count(*), count(*) filter (where chegou_em is null))::text from documento_pedidos), (select row(n, abertos)::text from pedidos_antes),
  'pergunta 3: nenhum pedido nasce nem fecha');
select is((select cliente_documento_linha(d) -> 'vencido' from cliente_documentos d, cli where d.cliente_id = cli.silvia), 'true'::jsonb,
  'o selo da ficha muda na hora');
select ok(not exists (select 1 from historico h where historico_tem_dado_proibido(h.dados) and h.acao in ('juridico.prazo_comprovante', 'juridico.documento_inicio_editado')),
  'PT-03: o histórico não guarda dado pessoal');

-- Quem estava editando o item com a versão velha recebe conflito.
select is((teste.erro($$ select portal_juridico_documento_inicio_salvar(socia, rm, a.id, a.versao,
  '{"nome": "Comprovante de residência", "comoPedir": "Conta recente.", "pessoal": "COMPROVANTE_RESIDENCIA", "seHouver": false}')
  from ids, antes a join documentos_inicio i using (id) where i.escritorio_id = ids.rm and i.area = 'TRABALHISTA' and i.pessoal = 'COMPROVANTE_RESIDENCIA' $$)) ->> 'codigo',
  'TC409', 'PT-19: a edição com a versão velha dá conflito');

-- O mesmo prazo não grava nada.
select is((select portal_escritorio_prazo_comprovante(socia, rm, 60, true) -> 'mudou' from ids), 'false'::jsonb, 'o mesmo prazo não muda nada');
select is((select count(*) from historico h, ids where h.escritorio_id = ids.rm and h.acao = 'juridico.prazo_comprovante'), 1::bigint, 'e não vai para o histórico');

-- O texto de 300 letras não cabe com 180; sem a troca, nenhum texto muda.
select is((select portal_escritorio_prazo_comprovante(socia, rm, 180, true) - 'de' - 'passaramA' - 'voltaramAEmDia' from ids),
  '{"mudou": true, "naoCouberam": 1, "validadeDias": 180, "listasTrocadas": 2, "textosTrocados": 2}'::jsonb, 'o texto que passaria de 300 letras não troca');
create temp table antes2 as select id, como_pedir from documentos_inicio;
select is((select portal_escritorio_prazo_comprovante(socia, rm, 120, false) ->> 'textosTrocados' from ids), '0', 'sem a caixa marcada, nenhum texto troca');
select is((select count(*) from documentos_inicio i join antes2 a using (id) where i.como_pedir is distinct from a.como_pedir), 0::bigint, 'e as listas ficam como estavam');

-- A sugestão do T3jus escreve o prazo do escritório.
select is((select portal_juridico_documentos_inicio(socia, rm) -> 'areas' -> 4 -> 'sugestao' -> 1 ->> 'comoPedir' from ids),
  'Conta de luz, água ou telefone dos últimos 120 dias.', 'a sugestão traz o prazo do escritório');

-- Com dois sócios donos, o segundo também muda, e os dois aparecem na ordem de entrada.
select teste.vincular(felipe, rm, 'SOCIO') from ids;
select is((select portal_cliente_documentos(larissa, rm, cli.ant) -> 'sociosDonos' from ids, cli), '["Marina Ribeiro", "Felipe Matos"]'::jsonb,
  'a ficha diz os dois sócios donos, na ordem de entrada');
select is((select portal_escritorio_prazo_comprovante(felipe, rm, 90, false) ->> 'validadeDias' from ids), '90', 'o segundo sócio dono também muda');

select * from finish();
rollback;
