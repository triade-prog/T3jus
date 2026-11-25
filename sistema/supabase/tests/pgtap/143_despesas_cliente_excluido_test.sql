-- A despesa adiantada para o cliente excluído a pedido do titular (1092 e 1093; F3.156, PT-11, PT-03,
-- PT-07): na exclusão, a descrição vira o texto fixo e o nome do arquivo vira o tipo, e o arquivo
-- fica; a rotina da noite apaga no marco (1º de janeiro de ano + 2 + 5; a conta em aberto não vence)
-- o arquivo e a pasta do contador do mês, pela fila com o motivo PRAZO_FISCAL; a rotina não depende
-- da 1093 (revisão, G1); conta nova para o excluído é recusada e anexo novo nasce neutro; as leituras
-- escondem o apagado; a ficha traz arquivosQueFicam só para a sócia dona.
begin;
select plan(79);

select ajustar_relogio(('2026-11-24 10:00-03'::timestamptz - now()));
-- A saída das entradas sem acesso (0540) não entra neste teste: o relógio anda anos.
update inventario_dados set situacao = 'PROPOSTA' where tabela = 'pessoas';

create temp table ids as select
  teste.pessoa('Marina Ribeiro') as socia,
  teste.pessoa('Diego Almeida') as diego,
  teste.pessoa('Intrusa Souza') as intrusa,
  teste.escritorio('Ribeiro & Matos') as rm,
  teste.escritorio('Outro Escritório') as outro;
select teste.vincular(socia, rm, 'SOCIO'), teste.vincular(intrusa, outro, 'SOCIO') from ids;
select portal_convidar(socia, rm, diego, 'Diego Almeida', array['FINANCEIRO']) from ids;
select portal_financeiro_ajustes_salvar(socia, rm, jsonb_build_object(
  'contador', jsonb_build_object('nome', 'Paulo Serra', 'email', 'contato@exemplo.com.br', 'mandarAoExportar', true, 'lembrarDia5', false),
  'prazoRepasseDias', 3)) from ids;

create function pg_temp.cli(p_pessoa uuid, p_esc uuid, p_nome text) returns uuid language sql as $$
  select (portal_cliente_cadastrar(p_pessoa, p_esc, jsonb_build_object('tipo', 'PF', 'origem', 'GOOGLE', 'nome', p_nome,
    'contatos', jsonb_build_array(jsonb_build_object('nome', 'Contato', 'telefone', '+5511984723316', 'principal', true)))) ->> 'id')::uuid
$$;
create temp table cli as select
  pg_temp.cli(socia, rm, 'Ana Souza Lima') ana,
  pg_temp.cli(socia, rm, 'Bia Reis Prado') bia,
  pg_temp.cli(socia, rm, 'Cris Moura Dias') cris,
  pg_temp.cli(socia, rm, 'Dora Antiga Leite') dora,
  pg_temp.cli(socia, rm, 'Eva Antiga Nunes') eva,
  pg_temp.cli(intrusa, outro, 'Joana Pereira') joa
  from ids;

create function pg_temp.conta(p_pessoa uuid, p_esc uuid, p_cliente uuid, p_desc text, p_venc text, p_paga text default null) returns uuid
language plpgsql as $$
declare v uuid := (portal_financeiro_conta_lancar(p_pessoa, p_esc, jsonb_build_object('descricao', p_desc, 'categoria', 'CUSTAS',
  'valor', 48500, 'vencimento', p_venc) || case when p_cliente is null then '{}'::jsonb
    else jsonb_build_object('adiantada', true, 'clienteId', p_cliente, 'reembolsoComo', 'A_PARTE') end) ->> 'id')::uuid;
begin
  if p_paga is not null then perform portal_financeiro_conta_paga(p_pessoa, p_esc, v, jsonb_build_object('pagaEm', p_paga, 'valor', 48500)); end if;
  return v;
end $$;
create function pg_temp.anexo(p_pessoa uuid, p_esc uuid, p_conta uuid, p_cat text, p_nome text, p_tipo text default 'application/pdf',
                              p_concluir boolean default true) returns uuid
language plpgsql as $$
declare v uuid := portal_anexo_iniciar(p_pessoa, p_esc, jsonb_build_object('dono', 'CONTA', 'donoId', p_conta, 'categoria', p_cat,
  'nome', p_nome, 'tipo', p_tipo, 'tamanho', 84000));
begin
  if p_concluir then perform portal_anexo_concluir(p_pessoa, p_esc, v); end if;
  return v;
end $$;

create temp table cp as select
  pg_temp.conta(socia, rm, cli.ana, 'Custas de Ana Souza', '2026-03-05', '2026-03-10') c1,
  pg_temp.conta(socia, rm, cli.ana, 'Guia DARF de Ana Souza', '2027-05-10') c2,
  pg_temp.conta(socia, rm, cli.ana, 'Perícia de Ana Souza', '2026-04-10') c3,
  pg_temp.conta(socia, rm, cli.bia, 'Custas de Bia Reis', '2026-03-15', '2026-03-15') bia,
  pg_temp.conta(socia, rm, cli.cris, 'Custas de Cris Moura', '2026-05-15', '2026-05-15') cris,
  pg_temp.conta(socia, rm, cli.dora, 'Custas de Dora Antiga', '2026-02-10', '2026-02-10') dora,
  pg_temp.conta(socia, rm, cli.eva, 'Custas de Eva Antiga', '2027-02-10') eva,
  pg_temp.conta(socia, rm, null, 'Aluguel da sala', '2026-04-05', '2026-04-05') aluguel,
  pg_temp.conta(intrusa, outro, cli.joa, 'Custas de Joana Pereira', '2026-03-20', '2026-03-20') joa
  from ids, cli;
create temp table an as select
  pg_temp.anexo(socia, rm, cp.c1, 'NOTA_FISCAL', 'NF Ana Souza.pdf') nota,
  pg_temp.anexo(socia, rm, cp.c1, 'BOLETO', 'Boleto Ana Souza.pdf', 'application/pdf', false) boleto,
  pg_temp.anexo(socia, rm, cp.c2, 'GUIA', 'Guia Ana Souza.png', 'image/png') guia,
  pg_temp.anexo(socia, rm, cp.bia, 'NOTA_FISCAL', 'NF Bia Reis.pdf') bia,
  pg_temp.anexo(socia, rm, cp.cris, 'COMPROVANTE', 'Pix Cris Moura.jpg', 'image/jpeg') cris,
  pg_temp.anexo(socia, rm, cp.dora, 'NOTA_FISCAL', 'NF Dora Antiga.pdf') dora,
  pg_temp.anexo(socia, rm, cp.eva, 'BOLETO', 'Boleto Eva Antiga.pdf') eva,
  pg_temp.anexo(socia, rm, cp.aluguel, 'NOTA_FISCAL', 'nota-aluguel.pdf') aluguel,
  pg_temp.anexo(intrusa, outro, cp.joa, 'NOTA_FISCAL', 'NF Joana Pereira.pdf') joa
  from ids, cp;

-- As pastas do contador de março (com a nota de Ana e a de Bia) e de abril (só o aluguel).
create function pg_temp.pasta(p_mes text) returns uuid language plpgsql as $$
declare e uuid := (select (portal_financeiro_exportar(ids.socia, ids.rm, jsonb_build_object('mes', p_mes, 'formato', 'XLSX')) ->> 'id')::uuid from ids);
begin
  perform portal_financeiro_pasta_registrar(ids.socia, ids.rm, e, jsonb_build_array(
    jsonb_build_object('caminho', format('%s/exportacoes/%s-1.zip', ids.rm, e), 'nome', 'p1.zip', 'arquivos', 1, 'tamanho', 84200),
    jsonb_build_object('caminho', format('%s/exportacoes/%s-2.zip', ids.rm, e), 'nome', 'p2.zip', 'arquivos', 1, 'tamanho', 84200))) from ids;
  return e;
end $$;
create temp table ex as select pg_temp.pasta('2026-03-01') mar, pg_temp.pasta('2026-04-01') abr;

create function pg_temp.excluir(p_cliente uuid, p_nome text) returns jsonb language sql as $$
  select portal_cliente_excluir_dados(ids.socia, ids.rm, p_cliente, c.versao, jsonb_build_object('pedidoEm', hoje_brasilia(), 'canal', 'TELEFONE',
    'quemPediu', 'TITULAR', 'conferido', true, 'nomeConfirmado', p_nome)) from clientes_escritorio c, ids where c.id = p_cliente
$$;

-- 1. As peças.
select ok((select count(*) = 9 and bool_and(not prosecdef) from pg_proc where proname in ('conta_guarda_fiscal_ate', 'anexo_nome_neutro',
             'conta_descricao_excluido', 'financeiro_excluido_limpar', 'financeiro_apagar_do_excluido', 'conta_pagar_nasce', 'anexo_nasce',
             'exportacao_pasta_guarda', 'prazo_fiscal_aplicar')),
  'PT-11 F3.156: as funções novas existem e nenhuma é security definer');
select ok(not has_function_privilege('service_role', 'prazo_fiscal_aplicar()', 'execute')
          and not has_function_privilege('service_role', 'financeiro_preencher_excluidos()', 'execute')
          and not has_function_privilege('service_role', 'cliente_arquivos_que_ficam(uuid, uuid)', 'execute'),
  'PT-02 F3.156: a API não chama a rotina, o preenchimento nem a contagem direto');
select is(configuracao_int('prazo_fiscal_anos'), 5, 'PT-11 F3.156: o prazo fiscal é de 5 anos, em configuracoes');
select is(conta_descricao_excluido(), 'Despesa adiantada a cliente excluído', 'PT-11 F3.156: o texto fixo da descrição (36 letras, cabe em 120)');
select is(array[anexo_nome_neutro('NOTA_FISCAL', 'application/pdf'), anexo_nome_neutro('GUIA', 'image/png'),
                anexo_nome_neutro('BOLETO', 'image/jpeg'), anexo_nome_neutro('COMPROVANTE', 'application/pdf')],
  array['Nota fiscal.pdf', 'Guia.png', 'Boleto.jpg', 'Comprovante.pdf'], 'PT-11 F3.156: o nome neutro é o tipo com a extensão');

-- 2. O marco (revisão, G2 e M1).
select is((select conta_guarda_fiscal_ate(c) from contas_pagar c, cp where c.id = cp.c1), date '2033-01-01',
  'PT-11 F3.156: paga em 2026, sai em 01/01/2033 (CTN 173, I: o imposto do ano é lançado no ano seguinte)');
select is((select conta_guarda_fiscal_ate(c) from contas_pagar c, cp where c.id = cp.c2), null::date,
  'PT-11 F3.156: a conta em aberto não vence (revisão, M1)');
select is((select conta_guarda_fiscal_ate(jsonb_populate_record(null::contas_pagar, to_jsonb(c) || '{"reembolsado_em": "2027-02-10"}'))
             from contas_pagar c, cp where c.id = cp.c1), date '2034-01-01', 'PT-11 F3.156: reembolsada em 2027, o marco vai para 01/01/2034');
select is((select conta_guarda_fiscal_ate(jsonb_populate_record(null::contas_pagar, to_jsonb(c) || jsonb_build_object(
             'cancelada_em', '2026-12-31 22:30-03', 'cancelada_por', ids.socia, 'cancelada_motivo', 'teste')))
             from contas_pagar c, cp, ids where c.id = cp.c3), date '2033-01-01',
  'PT-11 F3.156: cancelada em 31/12/2026 (Brasília), sai em 01/01/2033');

-- 3. A ficha, antes da exclusão.
select is((select portal_cliente(socia, rm, cli.ana) -> 'arquivosQueFicam' from ids, cli),
  '{"despesas": 3, "comArquivo": 2, "arquivos": 2, "pastas": 1, "ate": null}'::jsonb,
  'PT-11 F3.156: a dona vê as 3 despesas, os 2 arquivos prontos de 2 delas, a pasta de março e nenhuma data (há despesa em aberto)');
select is((select portal_cliente(socia, rm, cli.cris) -> 'arquivosQueFicam' from ids, cli),
  '{"despesas": 1, "comArquivo": 1, "arquivos": 1, "pastas": 0, "ate": "2033-01-01"}'::jsonb,
  'PT-11 F3.156: sem despesa em aberto, a ficha traz a data em que o arquivo sai');
select ok((select not (portal_cliente(diego, rm, cli.ana) ? 'arquivosQueFicam') from ids, cli),
  'PT-11 F3.156: quem não é a dona não recebe a chave');

-- 4. A exclusão de Ana. Dora e Eva são excluídas sem o gatilho novo, como antes da 1092.
create temp table contas_antes as select * from contas_pagar;
create temp table anexos_antes as select * from anexos;
alter table clientes_escritorio disable trigger financeiro_apagar_do_excluido;
select pg_temp.excluir(cli.dora, 'Dora Antiga Leite'), pg_temp.excluir(cli.eva, 'Eva Antiga Nunes') from cli;
alter table clientes_escritorio enable trigger financeiro_apagar_do_excluido;
select pg_temp.excluir(cli.ana, 'Ana Souza Lima') from cli;

select ok((select bool_and(c.descricao = conta_descricao_excluido() and (to_jsonb(c) - 'descricao') = (to_jsonb(a) - 'descricao'))
             from contas_pagar c join contas_antes a using (id), cp where c.id in (cp.c1, cp.c2, cp.c3)),
  'PT-11 F3.156: as 3 despesas de Ana ficam com o texto fixo, e o resto da linha (valor, datas, pagamento) igual');
select is((select array_agg(a.nome order by a.nome) from anexos a, an where a.id in (an.nota, an.boleto, an.guia)),
  array['Boleto.pdf', 'Guia.png', 'Nota fiscal.pdf'], 'PT-11 F3.156: a nota, o boleto (ainda enviando) e a guia ficam com o nome neutro');
select ok((select bool_and(a.apagado_em is null and (to_jsonb(a) - 'nome') = (to_jsonb(b) - 'nome'))
             from anexos a join anexos_antes b using (id), an where a.id in (an.nota, an.boleto, an.guia)),
  'PT-11 F3.156: os arquivos ficam (sem apagado_em), com o resto igual');
select is((select count(*)::int from arquivos_apagar a, an where a.motivo = 'PRAZO_FISCAL' or a.caminho like '%' || an.nota::text), 0,
  'PT-11 F3.156: nada vai para a fila na exclusão (a fila apaga na primeira volta)');
select is((select dados from historico, cli where acao = 'cliente.despesas_guardadas' and entidade_id = cli.ana::text),
  '{"despesas": 3, "anexos": 3, "ate": null}'::jsonb, 'PT-03 F3.156: o evento diz quantas despesas e arquivos ficaram e até quando');
select ok((select bool_and(not historico_tem_dado_proibido(dados) and dados::text not like '%Ana%') from historico where acao = 'cliente.despesas_guardadas'),
  'PT-03 F3.156: sem dado pessoal');
select ok((select bool_and((to_jsonb(c) = to_jsonb(a))) from contas_pagar c join contas_antes a using (id), cp where c.id in (cp.bia, cp.cris, cp.aluguel, cp.joa)),
  'PT-11 F3.156: as contas dos outros clientes, do escritório e do outro escritório não mudam');
select ok((select bool_and((to_jsonb(x) = to_jsonb(b))) from anexos x join anexos_antes b using (id), an where x.id in (an.bia, an.cris, an.aluguel, an.joa)),
  'PT-11 F3.156: nem os arquivos deles');
select ok((select descricao = 'Custas de Dora Antiga' from contas_pagar, cp where id = cp.dora)
          and (select nome = 'NF Dora Antiga.pdf' from anexos, an where id = an.dora),
  'sem o gatilho novo, Dora fica com a descrição e o nome antigos (o caso de antes da 1092)');
select ok((select not (portal_cliente(socia, rm, cli.ana) ? 'arquivosQueFicam') from ids, cli), 'PT-11 F3.156: no excluído, a chave não vem');

-- 5. Os guardiões.
select is((teste.erro($$ update contas_pagar set descricao = conta_descricao_excluido() where id = (select bia from cp) $$)) ->> 'codigo', 'TC023',
  'PT-11 F3.156: a descrição de conta de cliente ativo não muda');
select is((teste.erro($$ update contas_pagar set descricao = 'Outra coisa' where id = (select c1 from cp) $$)) ->> 'codigo', 'TC023',
  'PT-11 F3.156: a conta do excluído só aceita o texto fixo');
select is((teste.erro($$ update contas_pagar set descricao = conta_descricao_excluido(), valor = 1 where id = (select dora from cp) $$)) ->> 'codigo', 'TC023',
  'PT-11 F3.156: junto com o texto fixo, nada mais muda');
select is((teste.erro($$ update anexos set nome = 'Nota fiscal.pdf' where id = (select bia from an) $$)) ->> 'codigo', 'TC023',
  'PT-11 F3.156: o nome do anexo de cliente ativo não muda');
select is((teste.erro($$ update anexos set nome = 'Outro.pdf' where id = (select dora from an) $$)) ->> 'codigo', 'TC023',
  'PT-11 F3.156: o anexo do excluído só aceita o nome neutro');
select is((teste.erro($$ update anexos set apagado_em = app_now() where id = (select nota from an) $$)) ->> 'codigo', 'TC023',
  'PT-11 F3.156: antes do marco, o anexo não se apaga');
select is((teste.erro($$ delete from anexos where id = (select nota from an) $$)) ->> 'codigo', 'TC023', 'PT-03 F3.156: o anexo não se apaga por DELETE');
select is((teste.erro($$ delete from contas_pagar where id = (select c1 from cp) $$)) ->> 'codigo', 'TC023', 'PT-03 F3.156: a conta não se apaga');
select is((teste.erro($$ update exportacao_pastas set apagada_em = app_now() $$)) ->> 'codigo', 'TC023',
  'PT-11 F3.156: fora da rotina, a pasta não se marca');
select is((teste.erro($$ delete from exportacao_pastas $$)) ->> 'codigo', 'TC023', 'PT-03 F3.156: a pasta não se apaga');

-- 6. Nascer.
select is((teste.erro($$ select portal_financeiro_conta_lancar(socia, rm, jsonb_build_object('descricao', 'Custas novas', 'categoria', 'CUSTAS',
    'valor', 1000, 'vencimento', '2026-12-01', 'adiantada', true, 'clienteId', cli.ana, 'reembolsoComo', 'A_PARTE')) from ids, cli $$)) -> 'detalhe' -> 'campos',
  '["clienteId"]'::jsonb, 'PT-11 F3.156: conta nova para o cliente excluído é recusada como cliente que não existe (revisão, A1)');
create temp table an_nova as select pg_temp.anexo(socia, rm, cp.c2, 'GUIA', 'Guia DARF Ana Souza.pdf') guia2 from ids, cp;
select is((select nome from anexos, an_nova where id = an_nova.guia2), 'Guia.pdf',
  'PT-11 F3.156: o anexo novo na conta do excluído é aceito e nasce com o nome neutro');
select is((teste.erro($$ insert into anexos (escritorio_id, conta_id, categoria, nome, tipo, tamanho, enviado_por, apagado_em)
    select rm, cp.bia, 'GUIA', 'x.pdf', 'application/pdf', 1, socia, app_now() from ids, cp $$)) ->> 'codigo', 'TC023',
  'PT-11 F3.156: anexo não nasce apagado');

-- 7. A pasta nova do mês, montada depois da exclusão, já sai com o texto fixo (revisão, M2).
create temp table ex_nova as select (portal_financeiro_exportar(socia, rm, '{"mes": "2026-03-01", "formato": "XLSX"}') ->> 'id')::uuid e from ids;
create temp table prep_nova as select portal_financeiro_pasta_preparar(socia, rm, e) p from ids, ex_nova;
select ok((select jsonb_array_length(p -> 'anexos') = 2 and p::text not like '%Ana%'
                  and p -> 'anexos' @> jsonb_build_array(jsonb_build_object('nome', 'Nota fiscal.pdf', 'lancamento', conta_descricao_excluido()))
             from prep_nova),
  'PT-11 F3.156: a pasta montada depois da exclusão leva o texto fixo e o nome neutro, sem o nome da cliente');

-- 8. Antes do marco, a rotina não faz nada.
select ajustar_relogio(('2032-12-31 23:00-03'::timestamptz - now()));
grant select on ids, cli, cp, an, ex to dominio;
set local role dominio;
create temp table fiscal0 as select prazo_fiscal_aplicar() j;
reset role;
select is((select j from fiscal0), '{"anexos": 0, "pastas": 0}'::jsonb, 'PT-11 F3.156: na véspera do marco, nada sai');

-- 9. No marco (01/01/2033, 3h de Brasília), pela rotina da noite.
select ajustar_relogio(('2033-01-01 03:00-03'::timestamptz - now()));
create temp table r1 as select aplicar_prazos() j;
select is((select j -> 'apagados' -> 'anexos_fiscais' from r1), '3'::jsonb,
  'PT-11 F3.156: a rotina conta os 3 arquivos vencidos (a nota e o boleto de Ana, a nota de Dora)');
select is((select j -> 'apagados' -> 'pastas_fiscais' from r1), '1'::jsonb, 'PT-11 F3.156: e a pasta de março');
select ok((select bool_and(a.motivo = 'PRAZO_FISCAL' and a.cliente_id is null and a.escritorio = ids.rm and a.concluido_em is null
                           and a.conferir_ate is not null)
             from arquivos_apagar a, ids, an where a.caminho in (ids.rm || '/' || an.nota, ids.rm || '/' || an.boleto, ids.rm || '/' || an.dora))
          and (select count(*) = 3 from arquivos_apagar a, ids, an where a.caminho in (ids.rm || '/' || an.nota, ids.rm || '/' || an.boleto, ids.rm || '/' || an.dora)),
  'PT-07 F3.156: os 3 arquivos entram na fila com PRAZO_FISCAL e sem cliente');
select is((select a.conferir_ate from arquivos_apagar a, ids, an where a.caminho = ids.rm || '/' || an.boleto), app_now(),
  'PT-07 F3.156: o boleto enviando espera o envio atrasado (criado há anos: confere já)');
select ok((select bool_and(apagado_em = app_now()) from anexos, an where id in (an.nota, an.boleto, an.dora)), 'PT-11 F3.156: os 3 ficam marcados como apagados');
select ok((select bool_and(apagado_em is null) from anexos, an, an_nova where id in (an.guia, an_nova.guia2)),
  'PT-11 F3.156: as guias da despesa em aberto ficam (revisão, M1)');
select ok((select bool_and(apagado_em is null) from anexos, an where id in (an.bia, an.cris, an.aluguel, an.joa)),
  'PT-11 F3.156: os arquivos de quem não foi excluído ficam');
select is((select array_agg(caminho order by caminho) from arquivos_apagar where caminho ~ '/exportacoes/'),
  (select array[format('%s/exportacoes/%s-1.zip', ids.rm, ex.mar), format('%s/exportacoes/%s-2.zip', ids.rm, ex.mar)] from ids, ex),
  'PT-07 F3.156: as duas partes da pasta de março entram na fila; a de abril não');
select ok((select bool_and(motivo = 'PRAZO_FISCAL' and cliente_id is null and conferir_ate is null) from arquivos_apagar where caminho ~ '/exportacoes/'),
  'PT-07 F3.156: as partes da pasta entram com PRAZO_FISCAL, sem cliente e sem espera');
select is((select array_agg(x.apagada_em is not null order by e.mes) from exportacao_pastas x join exportacoes_contador e on e.id = x.exportacao_id, ids
            where x.escritorio_id = ids.rm), array[true, false], 'PT-11 F3.156: a pasta de março fica marcada; a de abril não');
select is((select dados from historico, ids where acao = 'dados.prazo_fiscal_aplicado' and escritorio_id = ids.rm),
  '{"anexos": 3, "pastas": 1}'::jsonb, 'PT-03 F3.156: o registro do prazo fiscal, por escritório');
-- Revisão, G1: Dora (excluída antes da 1092, sem a 1093) não desfaz a rotina; a descrição e o nome viram os neutros.
select ok((select descricao = conta_descricao_excluido() from contas_pagar, cp where id = cp.dora)
          and (select nome = 'Nota fiscal.pdf' and apagado_em is not null from anexos, an where id = an.dora),
  'PT-11 F3.156: sem a 1093, a rotina troca a descrição e o nome no mesmo passo e termina (revisão, G1)');
select ok((select (j -> 'contratos') is not null from r1), 'PT-11 F3.156: a rotina da noite inteira termina');

-- 10. De novo, nada se repete.
create temp table r2 as select aplicar_prazos() j;
select ok((select not (j -> 'apagados' ? 'anexos_fiscais') and not (j -> 'apagados' ? 'pastas_fiscais') from r2),
  'PT-11 F3.156: rodar de novo não acha nada, e as chaves não aparecem');
select is((select count(*)::int from arquivos_apagar where motivo = 'PRAZO_FISCAL'), 5, 'PT-07 F3.156: a fila não duplica');

-- 11. As leituras depois do marco.
select is((teste.erro($$ select portal_anexo_abrir(socia, rm, an.nota) from ids, an $$)) ->> 'codigo', 'TC404',
  'PT-11 F3.156: o arquivo apagado não abre (como o que não existe)');
select is((teste.erro($$ select portal_anexo_para_concluir(socia, rm, an.boleto) from ids, an $$)) ->> 'codigo', 'TC404',
  'PT-11 F3.156: o envio atrasado do apagado recebe 404 (revisão, m3)');
select is((select portal_financeiro_anexos(socia, rm, array[cp.c1, cp.c2], null) -> 'anexos' from ids, cp) @> '[{"categoria": "NOTA_FISCAL"}]'::jsonb, false,
  'PT-11 F3.156: a lista de A pagar não traz o apagado');
select is((select jsonb_array_length(portal_financeiro_anexos(socia, rm, array[cp.c1, cp.c2], null) -> 'anexos') from ids, cp), 2,
  'PT-11 F3.156: as guias da conta em aberto continuam na lista');
create temp table exp_mar as select portal_financeiro_exportacao_anexos(socia, rm, '2026-03-01') j from ids;
select ok((select not (j -> 'anexos' @> jsonb_build_array(jsonb_build_object('id', an.nota)))
                  and j -> 'anexos' @> jsonb_build_array(jsonb_build_object('id', an.bia))
                  and not (j -> 'semNota' @> jsonb_build_array(jsonb_build_object('id', cp.c1)))
             from exp_mar, an, cp),
  'PT-11 F3.156: a exportação de março não traz o apagado, e a despesa não passa a constar como sem nota');
select is((select portal_financeiro_pasta_preparar(socia, rm, ex.mar) - 'exportacaoId' - 'mes' - 'formato' from ids, ex),
  '{"pasta": null, "anexos": [], "recibos": []}'::jsonb, 'PT-11 F3.156: a exportação de março não tem mais pasta nem o que montar');
select is((select portal_financeiro_envio_preparar(socia, rm, ex.mar) -> 'pasta' from ids, ex), 'null'::jsonb,
  'PT-11 F3.156: o envio ao contador trata a pasta apagada como inexistente');
select ok((select portal_financeiro_pasta_preparar(socia, rm, ex.abr) -> 'pasta' ->> 'id' is not null from ids, ex),
  'PT-11 F3.156: a pasta de abril continua');

-- 12. A rota conclui as linhas PRAZO_FISCAL sem soltar o evento do cliente.
select is(rotina_arquivos_apagar_registrar(array(select id from arquivos_apagar where motivo = 'PRAZO_FISCAL')), 5,
  'PT-07 F3.156: as linhas do prazo fiscal concluem');
select is((select count(*)::int from historico where acao = 'cliente.arquivos_apagados'), 0,
  'PT-03 F3.156: e não soltam cliente.arquivos_apagados (não têm cliente)');

-- 13. A conta em aberto paga depois ganha o marco do pagamento (revisão, M1).
select portal_financeiro_conta_paga(socia, rm, cp.c2, '{"pagaEm": "2033-01-01", "valor": 48500}') from ids, cp;
select is((select conta_guarda_fiscal_ate(c) from contas_pagar c, cp where c.id = cp.c2), date '2040-01-01',
  'PT-11 F3.156: paga em 2033, a guia sai em 01/01/2040');
select ajustar_relogio(('2040-01-01 03:00-03'::timestamptz - now()));
set local role dominio;
create temp table fiscal2 as select prazo_fiscal_aplicar() j;
reset role;
select is((select j from fiscal2), '{"anexos": 2, "pastas": 0}'::jsonb, 'PT-11 F3.156: no marco do pagamento, as duas guias saem');

-- 14. Os checks da fila.
select throws_ok($$ insert into arquivos_apagar (escritorio, bucket, caminho, motivo, cliente_id)
    select rm, 'documentos-portal', rm || '/' || gen_random_uuid(), 'EXCLUSAO_TITULAR', null from ids $$, '23514', null,
  'PT-07 F3.156: EXCLUSAO_TITULAR sem cliente é recusado');
select throws_ok($$ insert into arquivos_apagar (escritorio, bucket, caminho, motivo, cliente_id)
    select rm, 'documentos-portal', rm || '/' || gen_random_uuid(), 'PRAZO_FISCAL', cli.bia from ids, cli $$, '23514', null,
  'PT-07 F3.156: PRAZO_FISCAL com cliente é recusado');
select throws_ok($$ insert into arquivos_apagar (escritorio, bucket, caminho, motivo, cliente_id)
    select rm, 'documentos-portal', rm || '/exportacoes/' || gen_random_uuid() || '-1.zip', 'EXCLUSAO_TITULAR', cli.bia from ids, cli $$, '23514', null,
  'PT-07 F3.156: o .zip só entra pelo prazo fiscal');
select throws_ok($$ insert into arquivos_apagar (escritorio, bucket, caminho, motivo)
    select rm, 'documentos-portal', outro || '/exportacoes/' || gen_random_uuid() || '-1.zip', 'PRAZO_FISCAL' from ids $$, '23514', null,
  'PT-07 F3.156: o .zip de outro escritório é recusado');
select throws_ok($$ insert into arquivos_apagar (escritorio, bucket, caminho, motivo)
    select rm, 'documentos-portal', rm || '/exportacoes/' || gen_random_uuid() || '-0.zip', 'PRAZO_FISCAL' from ids $$, '23514', null,
  'PT-07 F3.156: a parte 0 não existe');

-- 15. Com o prazo dos anexos em proposta, a rotina não apaga e diz que espera.
update inventario_dados set situacao = 'PROPOSTA' where tabela = 'anexos';
select is((select aplicar_prazos() -> 'aguardando_aprovacao' -> -1), '"anexos"'::jsonb,
  'PT-11 F3.156: com o prazo dos anexos em proposta, a rotina diz que ele espera aprovação');
update inventario_dados set situacao = 'APROVADO' where tabela = 'anexos';

-- 16. Os clientes excluídos antes da 1092 (a 1093): Eva ainda tem a descrição e o nome antigos.
set local role dominio;
create temp table pre1 as select financeiro_preencher_excluidos() j;
create temp table pre2 as select financeiro_preencher_excluidos() j;
create temp table marcas as select coalesce(current_setting('t3jus.fim_da_guarda', true), '') fg, coalesce(current_setting('t3jus.aplicando_prazos', true), '') ap;
reset role;
select is((select j from pre1), jsonb_build_object((select rm from ids)::text, '{"clientes": 1, "despesas": 1, "anexos": 1}'::jsonb),
  'PT-11 F3.156: o preenchimento conta por escritório os clientes, as despesas e os arquivos trocados');
select is((select j from pre2), '{}'::jsonb, 'PT-11 F3.156: rodar de novo não muda nada (idempotente)');
select ok((select fg in ('', 'off') and ap in ('', 'off') from marcas), 'PT-11 F3.156: as marcas da rotina voltam como estavam');
select ok((select descricao = conta_descricao_excluido() from contas_pagar, cp where id = cp.eva)
          and (select nome = 'Boleto.pdf' and apagado_em is null from anexos, an where id = an.eva),
  'PT-11 F3.156: Eva fica com o texto fixo e o nome neutro, e o arquivo fica');
select is((select dados from historico, cli where acao = 'cliente.despesas_guardadas' and entidade_id = cli.eva::text),
  '{"despesas": 1, "anexos": 1, "ate": null, "antes": true}'::jsonb, 'PT-03 F3.156: o evento do preenchimento marca que a exclusão foi antes');

-- 17. Inventário (PT-11) e histórico.
select ok((select prazo like '%decadência do imposto do ano da despesa%' and no_fim like '%7º ano depois do pagamento%' and situacao = 'APROVADO'
                  and length(prazo) <= 200 and length(no_fim) <= 200 from inventario_dados where tabela = 'anexos'),
  'PT-11 F3.156 inventário: anexos dizem até quando fica o arquivo da despesa do excluído');
select ok((select bool_and(base_legal like '%obrigação legal (LGPD, art. 7º, V e II)%' and length(no_fim) <= 200)
             from inventario_dados where tabela in ('contas_pagar', 'exportacao_pastas')),
  'PT-11 F3.156 inventário: a conta e a pasta citam a obrigação legal (revisão, M4)');
select ok((select no_fim like '%fica como foi montada%' from inventario_dados where tabela = 'exportacao_pastas')
          and (select no_fim like '%descrição da despesa adiantada vira texto fixo%' from inventario_dados where tabela = 'contas_pagar')
          and (select o_que like '%fim da guarda fiscal%' and length(o_que) <= 160 from inventario_dados where tabela = 'arquivos_apagar'),
  'PT-11 F3.156 inventário: o destino da pasta, da descrição e o que a fila guarda');
select is((select count(*)::int from historico where dados::text ~ '(Ana Souza|Dora Antiga|Eva Antiga|NF |Guia Ana|Boleto Ana)'), 0,
  'PT-03 F3.156: nenhuma linha do histórico guarda a descrição ou o nome antigos');

select * from finish();
rollback;
