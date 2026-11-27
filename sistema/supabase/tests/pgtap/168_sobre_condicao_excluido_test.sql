-- O "sobre" das condições ÊXITO e RECORRENTE do cliente excluído a pedido do titular (1135 e 1136;
-- F3.179, PT-11, PT-03, PT-07). Decisões da Carol: D3, o "sobre" vira o texto fixo "Base apagada a
-- pedido do titular" na exclusão, na proposta e na cópia do aviso PEDIDO_CONTRATO; D4, a etapa, o
-- reajuste e o nome do ATO ficam. Na exclusão, o resto da condição e as outras condições não mudam; o
-- aviso troca só o "sobre" de cada elemento, na mesma ordem, e o ramo das conversas da 1114 continua
-- igual (revisão, G1); a troca é idempotente; os clientes excluídos antes da 1135 entram pelas funções
-- da 1136, também com o escritório só de consulta, e o Word da versão final volta à fila; o
-- inventário diz que honorario_condicoes tem dado pessoal (revisão, M1 e m5).
begin;
select plan(43);

select ajustar_relogio(('2026-11-27 10:00-03'::timestamptz - now()));

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Diego Almeida') as diego,
  teste.pessoa('Bianca Torres') as bianca,
  teste.pessoa('Intrusa Souza') as intrusa,
  teste.escritorio('Ribeiro & Matos') as rm,
  teste.escritorio('Outro Escritório') as outro;
select teste.vincular(socia, rm, 'SOCIO'), teste.vincular(intrusa, outro, 'SOCIO') from ids;
select portal_convidar(socia, rm, diego, 'Diego Almeida', array['COMERCIAL']),
       portal_convidar(socia, rm, bianca, 'Bianca Torres', array['CONTRATOS']) from ids;

create function pg_temp.cli(p_pessoa uuid, p_esc uuid, p_nome text) returns uuid language sql as $$
  select (portal_cliente_cadastrar(p_pessoa, p_esc, jsonb_build_object('tipo', 'PF', 'origem', 'GOOGLE', 'nome', p_nome,
    'contatos', jsonb_build_array(jsonb_build_object('nome', 'Contato', 'telefone', '+5511984723316', 'principal', true)))) ->> 'id')::uuid
$$;
create temp table cli as select
  pg_temp.cli(socia, rm, 'Helena Prado Souza') hel,
  pg_temp.cli(socia, rm, 'Ana Lima Duarte') ana,
  pg_temp.cli(socia, rm, 'Rui Antigo Matos') rui,
  pg_temp.cli(intrusa, outro, 'Helena Prado Souza') hom,
  pg_temp.cli(intrusa, outro, 'Jorge Antigo Reis') jorge
  from ids;

-- As três condições: FIXO, ÊXITO e RECORRENTE, com o nome no "sobre".
create function pg_temp.condicoes(p_nome text) returns jsonb language sql as $$
  select jsonb_build_array(
    jsonb_build_object('tipo', 'FIXO', 'valor', 150000, 'vencimento', '2026-12-10'),
    jsonb_build_object('tipo', 'EXITO', 'percentual', 3000, 'sobre', 'Do que ' || p_nome || ' receber do INSS',
                       'etapa', 'Pagamento da RPV', 'dias', 15),
    jsonb_build_object('tipo', 'RECORRENTE', 'percentual', 2000, 'sobre', 'Benefício de ' || p_nome, 'etapa', 'Benefício implantado',
                       'dia', 10, 'meses', 12, 'diaLembrete', 5))
$$;
create function pg_temp.proposta(p_pessoa uuid, p_esc uuid, p_cliente uuid, p_servico text, p_cond jsonb, p_pedir boolean) returns uuid
language plpgsql as $$
declare v uuid;
begin
  v := (portal_proposta_criar(p_pessoa, p_esc, jsonb_build_object('clienteId', p_cliente, 'servico', p_servico, 'escopo', 'Ação e acompanhamento.',
    'responsavelId', p_pessoa, 'condicoes', p_cond, 'retorno', jsonb_build_object('em', '2026-12-01', 'responsavelId', p_pessoa))) ->> 'id')::uuid;
  if p_pedir then
    perform portal_proposta_enviada(p_pessoa, p_esc, v, 1);
    perform portal_proposta_resposta(p_pessoa, p_esc, v, 2, jsonb_build_object('resposta', 'ACEITOU', 'em', '2026-11-26', 'canal', 'PRESENCIAL'));
    perform portal_proposta_pedir_contrato(p_pessoa, p_esc, v);
  end if;
  return v;
end $$;
-- Helena: a aceita com o contrato pedido (aviso PEDIDO_CONTRATO para a sócia e Bianca) e uma em
-- andamento só com o ÊXITO. Ana (o mesmo texto, outro cliente) e a homônima do outro escritório não
-- mudam. Rui e Jorge são os "antigos" (a 1136).
create temp table pr as select
  pg_temp.proposta(ids.diego, ids.rm, cli.hel, 'Aposentadoria de Helena', pg_temp.condicoes('Helena Prado'), true) hel,
  pg_temp.proposta(ids.diego, ids.rm, cli.hel, 'Pensão de Helena', jsonb_build_array(pg_temp.condicoes('Helena Prado') -> 1), false) hel_and,
  pg_temp.proposta(ids.diego, ids.rm, cli.ana, 'Aposentadoria de Ana', pg_temp.condicoes('Helena Prado'), true) ana,
  pg_temp.proposta(ids.diego, ids.rm, cli.rui, 'Aposentadoria de Rui', pg_temp.condicoes('Rui Antigo'), true) rui,
  pg_temp.proposta(ids.intrusa, ids.outro, cli.hom, 'Aposentadoria da homônima', pg_temp.condicoes('Helena Prado'), false) hom,
  pg_temp.proposta(ids.intrusa, ids.outro, cli.jorge, 'Aposentadoria de Jorge', jsonb_build_array(pg_temp.condicoes('Jorge Antigo') -> 1), false) jorge
  from ids, cli;

-- Um aviso de conversa apagada, para conferir que o ramo da 1114 continua igual (revisão, G1).
create temp table conversa_dados as select
  '{"contato": "Helena", "trecho": "Oi", "recado": "Ligar", "arquivo": "rg.pdf", "texto": "x", "conversa": "Helena Prado", "motivo": "PEDIU_HUMANO", "quem": "Diego"}'::jsonb d;

create temp table cond_antes as select * from honorario_condicoes;
create temp table avisos_antes as select * from avisos_sino;

create function pg_temp.excluir(p_cliente uuid) returns jsonb language sql as $$
  select portal_cliente_excluir_dados(case when c.escritorio_id = ids.rm then ids.socia else ids.intrusa end, c.escritorio_id, p_cliente, c.versao,
    jsonb_build_object('pedidoEm', hoje_brasilia(), 'canal', 'TELEFONE', 'quemPediu', 'TITULAR', 'conferido', true, 'nomeConfirmado', c.nome))
    from clientes_escritorio c, ids where c.id = p_cliente
$$;

-- 1. O texto fixo e a função pura.
select is(condicao_sobre_apagado_texto(), 'Base apagada a pedido do titular', 'PT-11 F3.179: o texto fixo do sobre apagado (D3)');
select ok(length(condicao_sobre_apagado_texto()) = 32 and json_texto_ok(jsonb_build_object('s', condicao_sobre_apagado_texto()), 's', 2, 120),
  'PT-11 F3.179: o texto tem 32 letras e passa na conferência do sobre (2 a 120)');
select ok((select bool_and(provolatile = 'i') from pg_proc where proname in ('condicao_sobre_apagado_texto', 'condicao_do_excluido')),
  'PT-11 F3.179: as duas funções puras são imutáveis');
select is(condicao_do_excluido('FIXO', '{"valor": 1, "sobre": "x"}'), '{"valor": 1, "sobre": "x"}'::jsonb,
  'PT-11 F3.179: fora do ÊXITO e do RECORRENTE, nada muda');
select is(condicao_do_excluido('EXITO', '{"percentual": 3000, "etapa": "Sentença"}'), '{"percentual": 3000, "etapa": "Sentença"}'::jsonb,
  'PT-11 F3.179: sem a chave sobre, a chave não nasce');
select is(condicao_do_excluido('RECORRENTE', condicao_do_excluido('RECORRENTE', '{"sobre": "Benefício de Rui", "meses": 12}')),
  '{"sobre": "Base apagada a pedido do titular", "meses": 12}'::jsonb, 'PT-11 F3.179: a troca é idempotente');

select is((select count(*)::int from avisos_sino, pr where tipo = 'PEDIDO_CONTRATO' and origem_id = pr.hel
             and dados -> 'condicoes' -> 1 ->> 'sobre' = 'Do que Helena Prado receber do INSS'), 2,
  'antes da exclusão, a sócia e Bianca têm o aviso com o sobre escrito');

-- 2. A exclusão de Helena.
select pg_temp.excluir(hel) from cli;

select ok((select bool_and(h.params ->> 'sobre' = condicao_sobre_apagado_texto()) from honorario_condicoes h, pr
            where h.dono_tipo = 'PROPOSTA' and h.dono_id in (pr.hel, pr.hel_and) and h.tipo in ('EXITO', 'RECORRENTE')),
  'PT-11 F3.179: na exclusão, o sobre do ÊXITO e do RECORRENTE vira o texto fixo, nas duas propostas');
select is((select count(*)::int from honorario_condicoes h, pr where h.dono_tipo = 'PROPOSTA' and h.dono_id in (pr.hel, pr.hel_and)), 4,
  'PT-11 F3.179: nenhuma condição sai nem entra');
select ok((select bool_and((h.params - 'sobre') = (b.params - 'sobre') and h.tipo = b.tipo and h.ordem = b.ordem)
             from honorario_condicoes h join cond_antes b using (id), pr where h.dono_id in (pr.hel, pr.hel_and)),
  'PT-11 F3.179: percentual, etapa, dias, dia, meses e lembrete ficam iguais (D4: a etapa fica)');
select is((select h.params from honorario_condicoes h join cond_antes b using (id), pr where h.dono_id = pr.hel and h.tipo = 'FIXO'),
  (select b.params from cond_antes b, pr where b.dono_id = pr.hel and b.tipo = 'FIXO'), 'PT-11 F3.179: o FIXO não muda');
select ok((select bool_and(h.params = b.params) from honorario_condicoes h join cond_antes b using (id), pr where h.dono_id in (pr.ana, pr.rui, pr.hom, pr.jorge)),
  'PT-11 F3.179: as condições de outro cliente com o mesmo texto e da homônima do outro escritório não mudam');
select is((select count(*)::int from honorario_condicoes h join cond_antes b using (id) where h.params is distinct from b.params), 3,
  'PT-11 F3.179: só mudam as três condições de Helena (2 + 1)');

-- O aviso.
select ok((select bool_and(a.dados -> 'condicoes' -> 1 ->> 'sobre' = condicao_sobre_apagado_texto()
                           and a.dados -> 'condicoes' -> 2 ->> 'sobre' = condicao_sobre_apagado_texto())
             from avisos_sino a, pr where a.origem_id = pr.hel),
  'PT-11 F3.179: no aviso, o sobre do ÊXITO e do RECORRENTE vira o texto fixo, lido ou não');
select ok((select bool_and(
             (select array_agg(x.c ->> 'tipo' order by x.n) from jsonb_array_elements(a.dados -> 'condicoes') with ordinality x(c, n))
               = (select array_agg(x.c ->> 'tipo' order by x.n) from jsonb_array_elements(b.dados -> 'condicoes') with ordinality x(c, n))
             and (select bool_and((x.c - 'sobre') = (b.dados -> 'condicoes' -> (x.n::int - 1)) - 'sobre')
                    from jsonb_array_elements(a.dados -> 'condicoes') with ordinality x(c, n))
             and a.dados -> 'condicoes' -> 0 = b.dados -> 'condicoes' -> 0)
             from avisos_sino a join avisos_antes b using (id), pr where a.origem_id = pr.hel),
  'PT-11 F3.179: a ordem, o tipo e o resto de cada elemento ficam iguais; o FIXO fica inteiro');
select ok((select bool_and((a.dados - 'condicoes' - 'cliente' - 'servico') = (b.dados - 'condicoes' - 'cliente' - 'servico')
                           and a.dados ->> 'cliente' = 'Cliente excluído' and a.dados ->> 'servico' = servico_apagado_texto())
             from avisos_sino a join avisos_antes b using (id), pr where a.origem_id = pr.hel),
  'PT-11 F3.179: o nome e o serviço continuam com a troca da 1110; proposta, aceita e quem pediu ficam');
select ok((select bool_and(a.dados = b.dados) from avisos_sino a join avisos_antes b using (id), pr where a.origem_id in (pr.ana, pr.rui)),
  'PT-11 F3.179: os avisos de outro cliente não mudam');
select is((select x -> 'dados' -> 'condicoes' -> 1 ->> 'sobre' from ids, pr, jsonb_array_elements(portal_avisos(bianca, rm) -> 'itens') x
            where (x ->> 'origemId')::uuid = pr.hel),
  'Base apagada a pedido do titular', 'PT-11 F3.179: o sino de Bianca mostra o texto fixo');

-- As leituras.
select is((select portal_proposta(diego, rm, pr.hel) -> 'condicoes' -> 1 ->> 'sobre' from ids, pr), condicao_sobre_apagado_texto(),
  'PT-11 F3.179: a ficha da proposta traz o texto fixo');
select is((select proposta_linha(p) -> 'condicoes' -> 2 ->> 'sobre' from propostas p, pr where p.id = pr.hel), condicao_sobre_apagado_texto(),
  'PT-11 F3.179: a linha da lista do Comercial traz o texto fixo');
-- Desde a F3.181 (1140), o pedido do cliente excluído sai do bloco de Contratos; a cópia nas condições da proposta fica com o texto fixo.
select is((select count(*)::int from ids, pr, jsonb_array_elements(portal_contratos_pedidos(bianca, rm)) x
            where (x -> 'proposta' ->> 'id')::uuid = pr.hel),
  0, 'PT-11 F3.179 F3.181: o pedido de contrato do cliente excluído sai de Contratos');
select is((select count(*)::int from historico where dados::text like '%Helena Prado%'), 0,
  'PT-03 F3.179: a exclusão não leva o sobre para o histórico');

-- 3. O sino: idempotência, o aviso sem condições e o ramo das conversas da 1114.
select ok((select bool_and(aviso_sino_dados_do_excluido(a) = aviso_sino_dados_do_excluido((a.id, a.escritorio_id, a.pessoa_id, a.tipo,
             aviso_sino_dados_do_excluido(a), a.origem_tabela, a.origem_id, a.criado_em, a.lido_em)::avisos_sino)) from avisos_sino a),
  'PT-11 F3.179: aplicada duas vezes, a troca do sino dá o mesmo');
select is(avisos_sino_excluido_limpar((select rm from ids), (select hel from cli)), 0, 'PT-11 F3.179: rodar a troca do sino de novo não muda nada');
select ok((select not (aviso_sino_dados_do_excluido((gen_random_uuid(), ids.rm, ids.socia, 'CONTRATO_GERADO',
             '{"contrato": 7, "servico": "x", "cliente": "y"}'::jsonb, 'propostas', pr.hel, now(), null)::avisos_sino) ? 'condicoes') from ids, pr),
  'PT-11 F3.179: o aviso sem condições não ganha a chave');
select is((select aviso_sino_dados_do_excluido((gen_random_uuid(), ids.rm, ids.socia, 'CONVERSA_IA', d, 'conversas', gen_random_uuid(), now(), null)::avisos_sino)
             from ids, conversa_dados),
  '{"conversa": "Cliente excluído", "motivo": "PEDIU_HUMANO", "quem": "Diego"}'::jsonb,
  'PT-11 F3.179: o ramo das conversas da 1114 continua igual (revisão, G1)');
select is((teste.erro($$ update avisos_sino set dados = jsonb_set(dados, '{condicoes,1,sobre}', '"Outro texto"')
                           where origem_id = (select hel from pr) and pessoa_id = (select socia from ids) $$)) ->> 'codigo', 'TC023',
  'PT-11 F3.179: o guardião recusa outro sobre no aviso do cliente excluído');

-- 4. Os clientes excluídos antes da 1135 (a 1136).
-- (a) Rui é excluído agora e a fila dele conclui; depois o sobre livre volta às condições e ao aviso,
--     como a 1090 e a 1114 deixavam (o guardião desligado só aqui).
select pg_temp.excluir(rui) from cli;
select ajustar_relogio(('2026-11-27 10:20-03'::timestamptz - now()));
select rotina_arquivos_apagar_registrar(array(select id from arquivos_apagar, cli where cliente_id = cli.rui));
update honorario_condicoes h set params = b.params from cond_antes b, pr where b.id = h.id and h.dono_id = pr.rui;
alter table avisos_sino disable trigger avisos_sino_guardiao;
update avisos_sino a set dados = a.dados || jsonb_build_object('condicoes', b.dados -> 'condicoes') from avisos_antes b, pr
 where b.id = a.id and a.origem_id = pr.rui;
alter table avisos_sino enable trigger avisos_sino_guardiao;
create temp table rui_docx as select p.escritorio_id::text || '/propostas/' || p.id::text || '-v' || p.versao::text || '.docx' caminho
  from propostas p, pr where p.id = pr.rui;
select ok((select concluido_em is not null from arquivos_apagar a, rui_docx r where a.caminho = r.caminho), 'a fila de Rui concluiu');
-- (b) Jorge (outro escritório) é excluído sem os gatilhos, como antes da 0970: sem fila e com o sobre livre.
alter table clientes_escritorio disable trigger comercial_apagar_do_excluido;
alter table clientes_escritorio disable trigger z_cliente_excluido_arquivos;
select pg_temp.excluir(jorge) from cli;
alter table clientes_escritorio enable trigger comercial_apagar_do_excluido;
alter table clientes_escritorio enable trigger z_cliente_excluido_arquivos;
create temp table jorge_docx as select p.escritorio_id::text || '/propostas/' || p.id::text || '-v' || p.versao::text || '.docx' caminho
  from propostas p, pr where p.id = pr.jorge;
select is((select count(*)::int from honorario_condicoes h, pr where h.dono_id in (pr.rui, pr.jorge) and h.params ->> 'sobre' like '%Antigo%'), 3,
  'antes da 1136, as condições de Rui e de Jorge ficam com o sobre escrito');

-- O escritório Ribeiro & Matos fica só para consulta.
update escritorios set contrato_fim_em = hoje_brasilia() - 1 from ids where escritorios.id = ids.rm;
select is((teste.erro($$ update honorario_condicoes set params = condicao_do_excluido(tipo, params)
                           where dono_id = (select rui from pr) and tipo = 'EXITO' $$)) ->> 'codigo', 'TC401',
  'sem a marca aplicando_prazos, o escritório só de consulta recusa a troca');

select ajustar_relogio(('2026-11-27 11:00-03'::timestamptz - now()));
grant select on ids, cli, pr to dominio;
set local role dominio;
create temp table pre1 as select honorario_sobre_preencher_excluidos() c, avisos_sino_preencher_excluidos() a;
create temp table pre2 as select honorario_sobre_preencher_excluidos() c, avisos_sino_preencher_excluidos() a;
create temp table marcas as select coalesce(current_setting('t3jus.fim_da_guarda', true), '') fg, coalesce(current_setting('t3jus.aplicando_prazos', true), '') ap;
reset role;
select is((select c from pre1), jsonb_build_object(
    (select rm from ids)::text, '{"propostas": 1, "condicoes": 2, "docxReabertos": 1}'::jsonb,
    (select outro from ids)::text, '{"propostas": 1, "condicoes": 1, "docxReabertos": 1}'::jsonb),
  'PT-11 F3.179: o preenchimento conta por escritório, também no escritório só de consulta');
select is((select a from pre1), jsonb_build_object((select rm from ids)::text, '{"clientes": 1, "avisos": 2}'::jsonb),
  'PT-11 F3.179: com a função nova, o preenchimento do sino acha os dois avisos de Rui com o sobre antigo');
select ok((select c = '{}'::jsonb and a = '{}'::jsonb from pre2), 'PT-11 F3.179: rodar de novo não muda nada (idempotente)');
select ok((select fg in ('', 'off') and ap in ('', 'off') from marcas), 'PT-11 F3.179: as marcas da rotina voltam como estavam');
select ok((select bool_and(h.params ->> 'sobre' = condicao_sobre_apagado_texto()) from honorario_condicoes h, pr
            where h.dono_id in (pr.rui, pr.jorge) and h.tipo in ('EXITO', 'RECORRENTE')),
  'PT-11 F3.179: as condições de Rui e de Jorge ficam com o texto fixo');
select ok((select bool_and(a.dados -> 'condicoes' -> 1 ->> 'sobre' = condicao_sobre_apagado_texto()
                           and a.dados -> 'condicoes' -> 2 ->> 'sobre' = condicao_sobre_apagado_texto()) from avisos_sino a, pr where a.origem_id = pr.rui),
  'PT-11 F3.179: os avisos de Rui ficam com o texto fixo');
select ok((select concluido_em is null and tentativas = 0 and ultimo_erro is null and conferir_ate = '2026-11-27 11:15-03'::timestamptz
             from arquivos_apagar a, rui_docx r where a.caminho = r.caminho),
  'PT-07 F3.179: o Word da versão final de Rui volta à fila, pendente, e espera 15 minutos');
select ok((select a.concluido_em is null and a.escritorio = ids.outro and a.motivo = 'EXCLUSAO_TITULAR' and a.cliente_id = cli.jorge
             from arquivos_apagar a, jorge_docx j, ids, cli where a.caminho = j.caminho),
  'PT-07 F3.179: sem linha na fila, o Word de Jorge entra');
select ok((select bool_and(h.params = b.params) from honorario_condicoes h join cond_antes b using (id), pr where h.dono_id in (pr.ana, pr.hom)),
  'PT-11 F3.179: o preenchimento não mexe em condição de cliente ativo');

-- 5. Inventário (PT-11; revisão, M1 e m5).
select ok((select dado_pessoal and situacao = 'APROVADO' and controlador = 'Escritório' and prazo = 'Enquanto o escritório for cliente do T3jus'
                  and o_que like '%sobre o quê%' and no_fim like '%texto fixo%' and exportar
             from inventario_dados where tabela = 'honorario_condicoes'),
  'PT-11 F3.179 inventário: honorario_condicoes tem dado pessoal, aprovado, com o prazo dos donos');
select ok((select no_fim like '%o serviço vira um texto fixo%' and no_fim like '%.docx gerados%' and no_fim like '%sobre das condições%'
             from inventario_dados where tabela = 'propostas')
          and (select no_fim like '%texto fixo%' and no_fim like '%18 anos%' and no_fim like '%sobre das condições%'
                 from inventario_dados where tabela = 'avisos_sino'),
  'PT-11 F3.179 inventário: propostas e avisos citam o sobre, e as frases de antes continuam');
select ok((select bool_and(length(no_fim) <= 200 and no_fim like '%A pedido do titular%' and situacao = 'APROVADO') from inventario_dados
            where tabela in ('honorario_condicoes', 'propostas', 'avisos_sino')),
  'PT-11 F3.179 inventário: os três textos cabem em 200 letras');

-- 6. Acesso: a API não chama o preenchimento.
select ok(not has_function_privilege('service_role', 'honorario_sobre_preencher_excluidos()', 'execute'),
  'PT-02 F3.179: a API não chama o preenchimento');

select * from finish();
