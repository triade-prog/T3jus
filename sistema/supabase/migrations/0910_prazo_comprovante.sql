-- Prazo do comprovante de residência (F3.134; AP-08), pelo desenho aprovado em
-- docs/design/aprovadas/portal-prazo-comprovante (Carol, 22/11/2026):
-- 1. O prazo (escritorios.comprovante_validade_dias, 0853: de 30 a 365, padrão 90) muda em
--    Jurídico › Casos e processos › Documentos para começar, na folha "Prazo do comprovante".
--    Só a sócia dona (e_socio_dono) muda; a equipe com Jurídico vê. Mesmo que um dia alguém
--    receba juridico.etapas.editar, o prazo continua só dela.
-- 2. Antes de salvar, a prévia conta quantos comprovantes em uso passam a "Mais de N dias" ou
--    voltam a "Em dia", com o nome e os dias. Contam só os clientes ativos: arquivados e
--    excluídos ficam de fora.
-- 3. Com a caixa marcada, "últimos {de} dias" vira "últimos {para} dias" no "Como pedir" do
--    comprovante das listas que dizem o prazo. Cada item trocado sobe de versão e ganha a sua
--    linha no histórico; quem estiver editando o item recebe VERSION_CONFLICT ao salvar.
-- 4. Mudar o prazo não cria nem fecha pedido de documento (pergunta 3): o selo é calculado
--    cada vez que a ficha abre, e o comprovante vencido é pedido de novo quando um caso abrir.
-- 5. A sugestão do T3jus passa a escrever o prazo do escritório.
--    Diferença com o NOTAS do desenho: documentos_inicio_sugestao continua immutable, porque
--    recebe o prazo como argumento e não lê tabela nenhuma; quem chama passa o prazo.
-- Sem tabela nova: o prazo já mora em escritorios.

comment on column escritorios.comprovante_validade_dias is
  'Prazo do comprovante de residência, em dias, contados da data do papel (AP-08). Muda em Jurídico › Documentos para começar, na folha "Prazo do comprovante" (0910); só a sócia dona.';

-- Os comprovantes em uso por escritório, para a prévia e para a contagem da folha.
create index cliente_documentos_comprovante_em_uso on cliente_documentos (escritorio_id, cliente_id)
  where tipo = 'COMPROVANTE_RESIDENCIA' and situacao = 'PRONTO' and substituido_por is null;

-- ---------------------------------------------------------------------------------------
-- A frase do prazo no "Como pedir": "últimos 90 dias" (ou "Últimos"), sem pegar "penúltimos",
-- "900" nem "190".
create function prazo_comprovante_padrao(p_dias integer) returns text
language sql immutable
set search_path = public
as $$ select '(?<![[:alpha:]])([Úú]ltimos) ' || p_dias || ' dias(?![[:alpha:]])' $$;

create function prazo_comprovante_tem_frase(p_texto text, p_dias integer) returns boolean
language sql immutable
set search_path = public
as $$ select coalesce(p_texto ~ prazo_comprovante_padrao(p_dias), false) $$;

create function prazo_comprovante_trocar_frase(p_texto text, p_de integer, p_para integer) returns text
language sql immutable
set search_path = public
as $$ select regexp_replace(p_texto, prazo_comprovante_padrao(p_de), '\1 ' || p_para || ' dias', 'g') $$;

-- O comprovante em uso de cada cliente ativo, com os dias contados da data do papel.
-- Vencido é "dias > prazo", a mesma conta de cliente_documento_linha (0853).
create function comprovantes_dos_clientes(p_escritorio uuid)
returns table (cliente_id uuid, nome text, data_documento date, dias integer)
language sql stable
set search_path = public
as $$
  select distinct on (k.id) k.id, k.nome, d.data_documento, hoje_brasilia() - d.data_documento
    from cliente_documentos d join clientes_escritorio k on k.id = d.cliente_id
   where d.escritorio_id = p_escritorio and k.escritorio_id = p_escritorio
     and d.tipo = 'COMPROVANTE_RESIDENCIA' and d.situacao = 'PRONTO' and d.substituido_por is null
     and k.estado = 'ATIVO'
   order by k.id, d.concluido_em desc
$$;

-- Quantas listas (áreas) e quantos itens do comprovante dizem "últimos {p_dias} dias".
create function prazo_comprovante_listas(p_escritorio uuid, p_dias integer) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object('listasComFrase', count(distinct i.area), 'itensComFrase', count(*))
    from documentos_inicio i
   where i.escritorio_id = p_escritorio and i.pessoal = 'COMPROVANTE_RESIDENCIA' and i.removido_em is null
     and prazo_comprovante_tem_frase(i.como_pedir, p_dias)
$$;

-- Os nomes dos sócios donos, na ordem de entrada no escritório (o "Quem muda").
create function socios_donos_nomes(p_escritorio uuid) returns jsonb
language sql stable
set search_path = public
as $$
  select coalesce(jsonb_agg(q.nome order by s.criado_em), '[]'::jsonb)
    from vinculos s join pessoas q on q.id = s.pessoa_id
   where s.escritorio_id = p_escritorio and s.funcao = 'SOCIO' and s.revogado_em is null
$$;

create function prazo_comprovante_so_dona(p_pessoa uuid, p_escritorio uuid) returns void
language plpgsql
set search_path = public
as $$
begin
  if not e_socio_dono(p_pessoa, p_escritorio) then
    raise exception 'Só a sócia dona muda o prazo do comprovante' using errcode = 'TC401',
      detail = jsonb_build_object('motivo', 'SO_SOCIO_DONO')::text;
  end if;
end $$;

create function prazo_comprovante_conferir(p_dias integer) returns void
language plpgsql
set search_path = public
as $$
begin
  if p_dias is null or p_dias not between 30 and 365 then
    perform recusar_campos('O prazo vai de 30 a 365 dias.', 'validadeDias');
  end if;
end $$;

-- ---------------------------------------------------------------------------------------
-- A sugestão do T3jus com o prazo do escritório ("dos últimos {prazo} dias").
drop function documentos_inicio_sugestao(text);
create function documentos_inicio_sugestao(p_area text, p_validade_dias integer) returns jsonb
language sql immutable
as $$
  select coalesce(jsonb_agg(jsonb_build_object('nome', s.nome, 'comoPedir', s.como, 'pessoal', s.pessoal, 'seHouver', s.se) order by s.n), '[]'::jsonb)
    from (values
      ('PREVIDENCIARIO', 1, 'RG e CPF, ou CNH', 'Documento com foto e o CPF.', 'RG_CPF', false),
      ('PREVIDENCIARIO', 2, 'Comprovante de residência', 'Conta de luz, água ou telefone dos últimos ' || p_validade_dias || ' dias.', 'COMPROVANTE_RESIDENCIA', false),
      ('PREVIDENCIARIO', 3, 'Certidão de casamento ou de nascimento', 'A certidão do estado civil de hoje.', 'CERTIDAO_CASAMENTO', false),
      ('PREVIDENCIARIO', 4, 'Extrato do CNIS', 'Pelo Meu INSS. Se não conseguir, a gente ajuda.', null, false),
      ('PREVIDENCIARIO', 5, 'Carta do INSS', 'Se o pedido foi negado, a carta com o motivo.', null, true),
      ('PREVIDENCIARIO', 6, 'Laudos e exames médicos', 'Só nos pedidos por doença: os dos últimos 2 anos.', null, true),
      ('PREVIDENCIARIO', 7, 'Certidão de óbito', 'Só na pensão por morte: a de quem faleceu.', 'CERTIDAO_OBITO', true),
      ('TRABALHISTA', 1, 'RG e CPF, ou CNH', 'Documento com foto e o CPF.', 'RG_CPF', false),
      ('TRABALHISTA', 2, 'Comprovante de residência', 'Conta de luz, água ou telefone dos últimos ' || p_validade_dias || ' dias.', 'COMPROVANTE_RESIDENCIA', false),
      ('TRABALHISTA', 3, 'Carteira de trabalho (CTPS)', 'Foto das páginas com os contratos, ou a carteira digital.', null, false),
      ('TRABALHISTA', 4, 'Holerites', 'Os últimos que tiver, de preferência dos 12 últimos meses.', null, false),
      ('TRABALHISTA', 5, 'Termo de rescisão (TRCT)', 'O papel da rescisão, se já saiu da empresa.', null, true),
      ('TRABALHISTA', 6, 'Extrato do FGTS', 'Pelo aplicativo FGTS.', null, false),
      ('CIVEL', 1, 'RG e CPF, ou CNH', 'Documento com foto e o CPF.', 'RG_CPF', false),
      ('CIVEL', 2, 'Comprovante de residência', 'Conta de luz, água ou telefone dos últimos ' || p_validade_dias || ' dias.', 'COMPROVANTE_RESIDENCIA', false),
      ('CIVEL', 3, 'Contrato ou nota fiscal', 'O contrato, a nota ou o recibo do que foi comprado ou contratado.', null, false),
      ('CIVEL', 4, 'Prints e protocolos', 'Conversas, e-mails e números de protocolo do atendimento.', null, true),
      ('CONSUMIDOR', 1, 'RG e CPF, ou CNH', 'Documento com foto e o CPF.', 'RG_CPF', false),
      ('CONSUMIDOR', 2, 'Comprovante de residência', 'Conta de luz, água ou telefone dos últimos ' || p_validade_dias || ' dias.', 'COMPROVANTE_RESIDENCIA', false),
      ('CONSUMIDOR', 3, 'Contrato ou nota fiscal', 'O contrato, a nota ou o recibo do que foi comprado ou contratado.', null, false),
      ('CONSUMIDOR', 4, 'Prints e protocolos', 'Conversas, e-mails e números de protocolo do atendimento.', null, true),
      ('FAMILIA', 1, 'RG e CPF, ou CNH', 'Documento com foto e o CPF.', 'RG_CPF', false),
      ('FAMILIA', 2, 'Comprovante de residência', 'Conta de luz, água ou telefone dos últimos ' || p_validade_dias || ' dias.', 'COMPROVANTE_RESIDENCIA', false),
      ('FAMILIA', 3, 'Certidão de casamento ou de nascimento', 'A certidão do estado civil de hoje.', 'CERTIDAO_CASAMENTO', false),
      ('FAMILIA', 4, 'Certidão de nascimento dos filhos', 'A de cada filho que entra no caso.', null, true),
      ('FAMILIA', 5, 'Comprovantes de renda', 'Holerites, extrato do benefício ou declaração do imposto de renda.', null, false),
      ('FAMILIA', 6, 'Lista dos bens e dívidas', 'O que o casal tem e deve: imóveis, carros, contas, empréstimos.', null, true),
      ('SAUDE', 1, 'RG e CPF, ou CNH', 'Documento com foto e o CPF.', 'RG_CPF', false),
      ('SAUDE', 2, 'Carteirinha do plano', 'Foto da frente e do verso.', null, false),
      ('SAUDE', 3, 'Negativa do plano', 'A resposta do plano negando, por escrito ou o protocolo.', null, false),
      ('SAUDE', 4, 'Relatório médico', 'O relatório do médico pedindo o tratamento.', null, false),
      ('TRIBUTARIO', 1, 'Cartão CNPJ', 'Tirado no site da Receita Federal.', null, false),
      ('TRIBUTARIO', 2, 'Contrato social', 'O contrato social e a última alteração.', null, false),
      ('TRIBUTARIO', 3, 'Notas e guias', 'As notas fiscais e as guias pagas do período.', null, false)
    ) as s (area, n, nome, como, pessoal, se)
   where s.area = p_area
$$;

-- "Usar a sugestão do T3jus" (0853), agora com o prazo do escritório.
create or replace function portal_juridico_documentos_inicio_sugestao(p_pessoa uuid, p_escritorio uuid, p_area text) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_dias integer;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'JURIDICO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'juridico.etapas.editar');
  if not coalesce(area_direito_valida(p_area) and p_area <> 'OUTRA', false) then perform recusar_campos('Escolha a área.', 'area'); end if;
  if exists (select 1 from documentos_inicio where escritorio_id = p_escritorio and area = p_area and removido_em is null) then
    perform recusar_motivo('Esta área já tem lista.', 'AREA_COM_LISTA');
  end if;
  select comprovante_validade_dias into v_dias from escritorios where id = p_escritorio;
  insert into documentos_inicio (escritorio_id, area, ordem, nome, como_pedir, pessoal, se_houver, criado_por)
  select p_escritorio, p_area, s.n, s.x ->> 'nome', s.x ->> 'comoPedir', s.x ->> 'pessoal', (s.x ->> 'seHouver')::boolean, p_pessoa
    from jsonb_array_elements(documentos_inicio_sugestao(p_area, v_dias)) with ordinality as s (x, n);
  perform registrar_historico('juridico.documentos_inicio_sugestao', 'documentos_inicio', p_area,
    jsonb_build_object('area', p_area, 'documentos', jsonb_array_length(documentos_inicio_sugestao(p_area, v_dias))));
  return documentos_inicio_lista(p_escritorio, p_area);
end $$;

-- A página Documentos para começar (0853) ganha o que a folha do prazo mostra.
create or replace function portal_juridico_documentos_inicio(p_pessoa uuid, p_escritorio uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dias integer;
  v_frase jsonb;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'JURIDICO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'juridico.ver');
  select comprovante_validade_dias into v_dias from escritorios where id = p_escritorio;
  v_frase := prazo_comprovante_listas(p_escritorio, v_dias);
  return jsonb_build_object(
    'podeEditar', pode(p_pessoa, p_escritorio, 'juridico.etapas.editar'),
    'podeMudarPrazo', e_socio_dono(p_pessoa, p_escritorio),
    'sociosDonos', socios_donos_nomes(p_escritorio),
    'validadeDias', v_dias,
    'comprovantesTotal', (select count(*) from comprovantes_dos_clientes(p_escritorio)),
    -- A mesma conta da prévia, com o prazo de hoje, para os dois números nunca discordarem.
    'comprovantesVencidos', (select count(*) from comprovantes_dos_clientes(p_escritorio) c where c.dias > v_dias),
    'listasComFrase', (v_frase ->> 'listasComFrase')::integer,
    'areas', (select jsonb_agg(jsonb_build_object('area', a, 'itens', documentos_inicio_lista(p_escritorio, a), 'sugestao', documentos_inicio_sugestao(a, v_dias))
                               order by o)
                from unnest(array['PREVIDENCIARIO', 'TRABALHISTA', 'CIVEL', 'CONSUMIDOR', 'FAMILIA', 'SAUDE', 'TRIBUTARIO']) with ordinality as t (a, o)));
end $$;

-- A folha "Documentos pessoais" (0853) ganha quem muda o prazo, para o "Mudar o prazo" da ficha.
create or replace function portal_cliente_documentos(p_pessoa uuid, p_escritorio uuid, p_cliente uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare c clientes_escritorio;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'clientes.ver');
  select * into c from clientes_escritorio where id = p_cliente and escritorio_id = p_escritorio;
  if c.id is null or c.estado = 'EXCLUIDO' then raise exception 'Cliente não encontrado' using errcode = 'TC404'; end if;
  return jsonb_build_object(
    'hoje', hoje_brasilia(),
    'validadeDias', (select e.comprovante_validade_dias from escritorios e where e.id = p_escritorio),
    'podeAnexar', c.estado = 'ATIVO' and pode(p_pessoa, p_escritorio, 'clientes.editar'),
    'podeMudarPrazo', e_socio_dono(p_pessoa, p_escritorio),
    'sociosDonos', socios_donos_nomes(p_escritorio),
    'documentos', coalesce((select jsonb_agg(cliente_documento_linha(d) order by d.concluido_em desc, d.id)
                              from cliente_documentos_em_uso(p_escritorio, p_cliente) d), '[]'::jsonb),
    -- Os pedidos de documento pessoal abertos nos casos em andamento (o anexo pode atender).
    'pedidos', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'tipoPessoal', p.tipo_pessoal, 'descricao', p.descricao,
                            'pedidoEm', p.pedido_em, 'caso', jsonb_build_object('id', ca.id, 'nome', ca.nome)) order by p.pedido_em, p.criado_em)
                           from documento_pedidos p join casos ca on ca.id = p.caso_id
                          where p.cliente_id = p_cliente and p.escritorio_id = p_escritorio and p.chegou_em is null
                            and p.tipo_pessoal is not null and ca.situacao = 'ANDAMENTO'), '[]'::jsonb));
end $$;

-- ---------------------------------------------------------------------------------------
-- A prévia do efeito, antes de salvar: só leitura, só a sócia dona.
create function portal_escritorio_prazo_comprovante_previa(p_pessoa uuid, p_escritorio uuid, p_dias integer) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_atual integer;
  v_frase jsonb;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'JURIDICO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'juridico.ver');
  perform prazo_comprovante_so_dona(p_pessoa, p_escritorio);
  perform prazo_comprovante_conferir(p_dias);
  select comprovante_validade_dias into v_atual from escritorios where id = p_escritorio;
  v_frase := prazo_comprovante_listas(p_escritorio, v_atual);
  return (
    with c as (select * from comprovantes_dos_clientes(p_escritorio)),
         passam as (select * from c where c.dias > p_dias and c.dias <= v_atual),
         voltam as (select * from c where c.dias > v_atual and c.dias <= p_dias)
    select jsonb_build_object(
    'dias', p_dias,
    'atual', v_atual,
    'totalComComprovante', (select count(*) from c),
    'vencidosAgora', (select count(*) from c where c.dias > v_atual),
    'vencidosCom', (select count(*) from c where c.dias > p_dias),
    'passamAQtd', (select count(*) from passam),
    'passamA', coalesce((select jsonb_agg(jsonb_build_object('clienteId', x.cliente_id, 'nome', x.nome, 'dias', x.dias) order by x.dias desc, x.nome)
                           from (select * from passam order by dias desc, nome limit 50) x), '[]'::jsonb),
    'voltamAEmDiaQtd', (select count(*) from voltam),
    'voltamAEmDia', coalesce((select jsonb_agg(jsonb_build_object('clienteId', x.cliente_id, 'nome', x.nome, 'dias', x.dias, 'dataDocumento', x.data_documento,
                                'pedidos', coalesce((
                                  select jsonb_agg(jsonb_build_object(
                                           'casoId', ca.id, 'caso', ca.nome, 'pedidoEm', p.pedido_em,
                                           'contato', case when ct.v ->> 'nome' is not null and lower(btrim(ct.v ->> 'nome')) <> lower(btrim(k.nome))
                                                           then jsonb_build_object('nome', ct.v ->> 'nome', 'papel', nullif(btrim(ct.v ->> 'papel'), '')) end,
                                           'peloWhatsapp', p.repedido_mensagem_id is not null
                                                           or exists (select 1 from conversa_mensagens m
                                                                       where m.escritorio_id = p_escritorio and m.dados -> 'pedidos' ? p.id::text))
                                         order by p.pedido_em, p.criado_em)
                                    from documento_pedidos p join casos ca on ca.id = p.caso_id
                                    join clientes_escritorio k on k.id = p.cliente_id
                                    cross join lateral (select contato_principal(k.contatos) v) ct
                                   where p.escritorio_id = p_escritorio and p.cliente_id = x.cliente_id
                                     and p.tipo_pessoal = 'COMPROVANTE_RESIDENCIA' and p.chegou_em is null and ca.situacao = 'ANDAMENTO'), '[]'::jsonb))
                              order by x.dias desc, x.nome)
                         from (select * from voltam order by dias desc, nome limit 50) x), '[]'::jsonb),
    'listasComFrase', (v_frase ->> 'listasComFrase')::integer,
    'itensComFrase', (v_frase ->> 'itensComFrase')::integer));
end $$;

-- Mudar o prazo: só a sócia dona, no escritório da sessão. Não cria nem fecha pedido.
create function portal_escritorio_prazo_comprovante(p_pessoa uuid, p_escritorio uuid, p_dias integer, p_trocar_texto boolean) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_de integer;
  v_trocar boolean := coalesce(p_trocar_texto, false);
  v_passaram integer;
  v_voltaram integer;
  v_trocados integer := 0;
  v_nao_couberam integer := 0;
  v_listas text[] := '{}';
  v_novo text;
  i documentos_inicio;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'JURIDICO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'juridico.ver');
  perform prazo_comprovante_so_dona(p_pessoa, p_escritorio);
  perform prazo_comprovante_conferir(p_dias);
  select comprovante_validade_dias into v_de from escritorios where id = p_escritorio for update;
  if v_de = p_dias then
    return jsonb_build_object('validadeDias', p_dias, 'de', v_de, 'mudou', false, 'passaramA', 0, 'voltaramAEmDia', 0,
                              'textosTrocados', 0, 'listasTrocadas', 0, 'naoCouberam', 0);
  end if;
  select count(*) filter (where c.dias > p_dias and c.dias <= v_de), count(*) filter (where c.dias > v_de and c.dias <= p_dias)
    into v_passaram, v_voltaram
    from comprovantes_dos_clientes(p_escritorio) c;
  update escritorios set comprovante_validade_dias = p_dias where id = p_escritorio;
  if v_trocar then
    for i in select * from documentos_inicio
              where escritorio_id = p_escritorio and pessoal = 'COMPROVANTE_RESIDENCIA' and removido_em is null
                and prazo_comprovante_tem_frase(como_pedir, v_de)
              order by area, ordem
              for update loop
      v_novo := prazo_comprovante_trocar_frase(i.como_pedir, v_de, p_dias);
      if length(btrim(v_novo)) > 300 then
        v_nao_couberam := v_nao_couberam + 1;
        continue;
      end if;
      -- Sem filtro de versão: a versão sobe, e quem está editando o item recebe VERSION_CONFLICT.
      update documentos_inicio set como_pedir = v_novo where id = i.id;
      perform registrar_historico('juridico.documento_inicio_editado', 'documentos_inicio', i.id::text, jsonb_build_object(
        'area', i.area,
        'antes', jsonb_build_object('documento', i.nome, 'comoPedir', i.como_pedir, 'pessoal', i.pessoal, 'seHouver', i.se_houver),
        'depois', jsonb_build_object('documento', i.nome, 'comoPedir', v_novo, 'pessoal', i.pessoal, 'seHouver', i.se_houver),
        'porPrazo', true));
      v_trocados := v_trocados + 1;
      if not i.area = any (v_listas) then v_listas := v_listas || i.area; end if;
    end loop;
  end if;
  perform registrar_historico('juridico.prazo_comprovante', 'escritorios', p_escritorio::text,
    jsonb_build_object('de', v_de, 'para', p_dias, 'textosTrocados', v_trocados, 'trocarTexto', v_trocar));
  return jsonb_build_object('validadeDias', p_dias, 'de', v_de, 'mudou', true, 'passaramA', v_passaram, 'voltaramAEmDia', v_voltaram,
                            'textosTrocados', v_trocados, 'listasTrocadas', cardinality(v_listas), 'naoCouberam', v_nao_couberam);
end $$;

call fechar_acesso();
