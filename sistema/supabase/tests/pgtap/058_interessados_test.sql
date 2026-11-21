-- Interessados (F2.2, F2.3; SC-02, SC-05): o pedido do site entra sozinho, com a autorização;
-- limites; pedido repetido; quem vê; responsável, próximo passo, estágio com motivo, encerrar,
-- reabrir, notas, virar escritório cliente e o prazo de 12 meses.
begin;
select plan(38);

create temp table ids as select
  teste.equipe('Carol Andrade', 'ADMINISTRACAO') as adm,
  teste.equipe('Rafael Teles', 'IMPLANTACAO') as impl,
  teste.equipe('Bruno Seixas', 'SUPORTE') as sup,
  teste.equipe('Fátima Lopes', 'FINANCEIRO') as fin;

create temp table ped as select site_registrar_pedido(
  '{"nome":"Lívia Prado","escritorio":"Jatobá Advocacia","email":"Livia@Jatoba.adv.br","whats":"(86) 99812-4410",
    "tamanho":"6 a 10","area":"Previdenciário","msg":"Planilha e caderno.","aceite":true,
    "origem":{"pagina":"/demonstracao","campanha":"lancamento"}}'::jsonb, '200.1.2.3') as r;
create temp table i as select (r ->> 'id')::uuid as jat from ped;

-- SC-02: o pedido entra com a autorização (texto e versão), a origem e o e-mail em minúsculas.
select is((select r ->> 'repetido' from ped), 'false', 'SC-02: o pedido do site vira interessado');
select is((select estado || '|' || origem || '|' || email || '|' || whats || '|' || tamanho from interessados where id = (select jat from i)),
  'NOVO|SITE|livia@jatoba.adv.br|+5586998124410|DE_6_A_10', 'SC-02: guarda o pedido normalizado');
select is((select autorizacao ->> 'versao' from interessados where id = (select jat from i)), '1', 'SC-02: guarda a versão da autorização');
select ok((select autorizacao ->> 'texto' like 'Autorizo o T3jus%' from interessados where id = (select jat from i)), 'SC-02: guarda o texto aceito');
select is((select origem_detalhe ->> 'campanha' from interessados where id = (select jat from i)), 'lancamento', 'SC-02: guarda a campanha');
select is((select acao from interessado_eventos where interessado_id = (select jat from i)), 'pedido.recebido', 'o site fica no histórico, sem autor');

-- Sem autorização, não entra.
select is((teste.erro($$ select site_registrar_pedido('{"nome":"X Y","escritorio":"Esc","email":"x@y.com.br","whats":"86998124410","tamanho":"Só eu","aceite":false}', '200.1.2.4') $$)) -> 'detalhe' -> 'campos',
  '["aceite"]'::jsonb, 'SC-02: sem autorização o pedido é recusado');

-- O mesmo e-mail com pedido aberto não cria outro.
select is((select site_registrar_pedido('{"nome":"Lívia Prado","escritorio":"Jatobá","email":"livia@jatoba.adv.br","whats":"86998124410","tamanho":"6 a 10","aceite":true}', '200.1.2.5') ->> 'repetido'),
  'true', 'pedido repetido fica no mesmo interessado');
select is((select count(*)::int from interessados), 1, 'só um interessado');

-- Limite por endereço de rede (5 por hora).
select site_registrar_pedido(format('{"nome":"Pessoa %s","escritorio":"Esc %s","email":"p%s@ex.com.br","whats":"86998124410","tamanho":"Só eu","aceite":true}', n, n, n)::jsonb, '9.9.9.9')
  from generate_series(1, 5) n;
select is((select site_registrar_pedido('{"nome":"Sexta","escritorio":"Esc","email":"p6@ex.com.br","whats":"86998124410","tamanho":"Só eu","aceite":true}', '9.9.9.9') ->> 'limite'),
  'true', 'o sexto pedido do mesmo endereço na hora passa do limite');

-- Quem vê: Administração e Implantação (decisão 9).
select is((select jsonb_array_length(console_interessados(impl) -> 'interessados') from ids), 6, 'SC-05: a Implantação vê a lista');
select is((teste.erro($$ select console_interessados(fin) from ids $$)) ->> 'codigo', 'TC401', 'o Financeiro não vê interessados');
select is((teste.erro($$ select console_interessados(sup) from ids $$)) ->> 'codigo', 'TC401', 'o Suporte não vê interessados');
select is((select console_interessados_atencao(adm) from ids), 6, 'pedidos sem responsável pedem atenção');
select is((select console_interessados_atencao(sup) from ids), 0, 'quem não vê não recebe contador');
select ok((select console_sessao(impl) -> 'acoes' ? 'console.interessados.ver' from ids), 'a moldura mostra Comercial à Implantação');
select ok(not (select console_sessao(fin) -> 'acoes' ? 'console.interessados.ver' from ids), 'o Financeiro não vê Comercial');

-- Ficar com ele: vira responsável e ganha o passo de responder em 1 dia útil.
select console_interessado_responsavel(impl, jat, 2, impl) from ids, i;
select is((select responsavel_id from interessados where id = (select jat from i)), (select impl from ids), 'SC-05: ficar com ele');
select is((select proximo_passo from interessados where id = (select jat from i)), 'Responder o pedido', 'o pedido novo ganha o passo de responder');
select ok((select proximo_data > (app_now() at time zone 'America/Sao_Paulo')::date from interessados where id = (select jat from i)), 'o prazo é o próximo dia útil');
select is((teste.erro($$ select console_interessado_responsavel(adm, jat, 3, sup) from ids, i $$)) -> 'detalhe' -> 'campos',
  '["responsavel"]'::jsonb, 'só quem vê interessados pode ser responsável');
select is((teste.erro($$ select console_interessado_responsavel(adm, jat, 1, adm) from ids, i $$)) ->> 'codigo', 'TC409', 'PT-19: versão velha dá conflito');

-- Estágio: motivo obrigatório; demonstração pede data e hora e vira o próximo passo.
select is((teste.erro($$ select console_interessado_estagio(impl, jat, 3, 'EM_CONTATO', '  ') from ids, i $$)) -> 'detalhe' -> 'campos',
  '["motivo"]'::jsonb, 'SC-05: mudar estágio sem motivo é recusado');
select console_interessado_estagio(impl, jat, 3, 'EM_CONTATO', 'Respondi por WhatsApp.') from ids, i;
select is((teste.erro($$ select console_interessado_estagio(impl, jat, 4, 'DEMONSTRACAO', 'Marcado') from ids, i $$)) -> 'detalhe' -> 'campos',
  '["data", "hora"]'::jsonb, 'demonstração pede data e hora');
select console_interessado_estagio(impl, jat, 4, 'DEMONSTRACAO', 'Confirmou por WhatsApp.', current_date + 5, '18:00') from ids, i;
select is((select proximo_passo || ' ' || to_char(proximo_hora, 'HH24:MI') from interessados where id = (select jat from i)), 'Demonstração por vídeo 18:00',
  'a demonstração vira o próximo passo');
select is((select dados ->> 'motivo' from interessado_eventos where interessado_id = (select jat from i) and acao = 'estagio.mudou' order by id desc limit 1),
  'Confirmou por WhatsApp.', 'o motivo fica no histórico');
select is((teste.erro($$ select console_interessado_estagio(sup, jat, 5, 'PROPOSTA', 'x') from ids, i $$)) ->> 'codigo', 'TC401', 'o Suporte não muda estágio');

-- Notas só de inserção.
select console_interessado_nota(impl, jat, 'Quer a sócia na demonstração.') from ids, i;
select throws_ok($$ update interessado_notas set texto = 'outra' $$, 'TC010', null, 'a nota não muda');
select throws_ok($$ delete from interessados $$, 'TC010', null, 'o interessado não se apaga à mão');

-- Virar escritório cliente: cadastro preenchido, contato na ficha, responsável como Implantação.
create temp table conv as select console_interessado_converter(adm, jat, 6, 'Jatobá Advocacia', 'Teresina', 'PI', 'Contrato assinado.') as esc from ids, i;
select is((select estado from interessados where id = (select jat from i)), 'CLIENTE', 'SC-05: virou cliente');
select is((select contatos -> 0 ->> 'email' from escritorios where id = (select esc from conv)), 'livia@jatoba.adv.br', 'o contato vai para a ficha sem redigitar');
select is((select array_agg(funcao::text order by funcao) from vinculos where escritorio_id = (select esc from conv) and revogado_em is null),
  array['ADMINISTRACAO', 'IMPLANTACAO'], 'quem converteu e o responsável ficam atribuídos');
select is((select estado from clientes where escritorio_id = (select esc from conv)), 'IMPLANTACAO', 'o escritório entra em implantação');

-- Encerrar e reabrir, com motivo.
create temp table outro as select id from interessados where email = 'p1@ex.com.br';
select console_interessado_encerrar(adm, (select id from outro), 1, 'DESCARTADO', 'Pedido de teste', 'Fui eu testando.') from ids;
select is((select estado from interessados where id = (select id from outro)), 'DESCARTADO', 'descartado com o porquê');
select console_interessado_reabrir(adm, (select id from outro), 2, 'Era de verdade.') from ids;
select is((select estado from interessados where id = (select id from outro)), 'EM_CONTATO', 'reabre em contato, com motivo');

-- EX-10: quem sai da equipe deixa o interessado sem responsável.
create temp table outro2 as select id from interessados where email = 'p2@ex.com.br';
select console_interessado_responsavel(impl, (select id from outro2), 1, impl) from ids;
select console_definir_funcoes(adm, impl, array['SUPORTE']) from ids;
select is((select responsavel_id from interessados where id = (select id from outro2)), null::uuid, 'EX-10: quem perde a função deixa o interessado sem responsável');

-- Prazo de 12 meses: quem não virou cliente sai com notas e histórico; o cliente fica.
select ajustar_relogio('13 months');
select is((aplicar_prazos() -> 'apagados' ->> 'interessados')::int, 5, 'PT-11: os que não viraram cliente saem depois de 12 meses');
select is((select count(*)::int from interessados), 1, 'o que virou cliente fica');
select ajustar_relogio('0');

select * from finish();
rollback;
