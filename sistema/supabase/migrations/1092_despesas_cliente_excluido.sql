-- A despesa adiantada para o cliente excluído a pedido do titular (F3.156; PT-11), pela decisão da
-- Carol (24/11/2026), pelo plano revisado (project-files t3jus/f3-156/plano.md e revisao.md) e pelo
-- desenho aprovado da janela (docs/design/aprovadas/portal-exclusao-despesas, alternativa A).
--
-- A decisão: a nota, a guia, o boleto e o comprovante da despesa adiantada (contas_pagar com
-- cliente_id) e a pasta do contador que os contém FICAM guardados pela obrigação fiscal do
-- escritório (LGPD, art. 16, I), e o T3jus apaga sozinho no fim do prazo.
--
-- O marco (revisão, G2). Pessoa física recolhe o imposto de renda por ano: o lançamento do ano da
-- despesa só pode ser feito no ano seguinte, e a decadência (CTN, art. 173, I) conta do 1º de
-- janeiro do exercício seguinte a esse. Os comprovantes ficam enquanto não houver decadência ou
-- prescrição (CTN, art. 195, parágrafo único; regra do livro-caixa no Regulamento do Imposto de
-- Renda, Decreto 9.580/2018). Por isso o arquivo sai em 1º de janeiro de ano + 2 + 5, contado da
-- data mais tarde da conta (vencimento, pagamento, reembolso ou cancelamento): pago em 2026, sai em
-- 01/01/2033. A sociedade de advogados é sociedade simples, então o CC, art. 1.194 não é a base.
-- A conta ainda em aberto (sem pagamento nem cancelamento) não vence (revisão, M1): o arquivo fica
-- enquanto ela estiver em aberto, e o fim da guarda do escritório (0540) continua sendo o limite.
-- O limite que fica: lançamento ou fiscalização que estendem a prescrição (CTN, art. 174); o T3jus
-- não sabe disso, e o escritório, que é o controlador, guarda a exportação e a pasta.
--
-- 1. Configuração prazo_fiscal_anos (5).
-- 2. Na exclusão (gatilho financeiro_apagar_do_excluido, entre comercial_ e z_ pela ordem do nome),
--    a descrição de toda despesa do cliente vira o texto fixo "Despesa adiantada a cliente
--    excluído", e o nome de cada arquivo vira o tipo ("Nota fiscal.pdf"). O arquivo fica. O evento
--    cliente.despesas_guardadas registra quantas e até quando, sem dado pessoal.
-- 3. A rotina da noite (aplicar_prazos → prazo_fiscal_aplicar) põe na fila arquivos_apagar, no
--    marco, os arquivos vencidos e as partes da pasta do contador do mês, com o motivo novo
--    PRAZO_FISCAL e cliente_id nulo, e marca anexos.apagado_em e exportacao_pastas.apagada_em. Ela
--    não depende da 1093 (revisão, G1): troca a descrição e o nome no mesmo passo.
-- 4. A pasta do contador já montada fica como foi montada, com a descrição de então no nome de cada
--    arquivo, e sai inteira no marco do mês dela (revisão, M2). A montada depois da exclusão já sai
--    com o texto fixo.
-- 5. Nada novo de cliente excluído no Financeiro: conta nova para ele é recusada (como cliente que
--    não existe, campo clienteId); anexo novo na conta dele é aceito (a nota pode chegar depois) e
--    nasce com o nome neutro. As duas regras travam o cliente com FOR SHARE na mesma consulta que lê
--    o estado (revisão, m2).
-- 6. As leituras escondem só o que foi apagado. As contagens "sem comprovante" não mudam (o
--    comprovante existiu e saiu no fim do prazo).
-- 7. A ficha ganha arquivosQueFicam, para a janela de exclusão.
-- 8. Os clientes já excluídos ficam para a 1093 (financeiro_preencher_excluidos).
--
-- Ordem de publicação (README, "Arquivos do cliente excluído"; painel, P17): api-console com o
-- caminho novo; contagem só de leitura (project-files t3jus/f3-156/contagem-antes-1092.sql); esta
-- 1092; a 1093; o Portal. Sem a api-console nova, o .zip na fila só ganha "Caminho inválido" e é
-- tentado de novo; nada sai fora do formato.
--
-- Funções recriadas e de onde partem (a versão mais recente de cada uma):
--   contas_pagar_guardiao ........................ 0534 (nunca recriada depois)
--   anexo_so_conclui ............................. 0520 (nunca recriada)
--   portal_anexo_para_concluir ................... 0520
--   portal_anexo_abrir ........................... 0520
--   portal_financeiro_anexos ..................... 0520
--   financeiro_exportacao_anexos_sem_emprestimo .. 0520 (renomeada na 0941; o embrulho da 0941 não muda)
--   financeiro_pasta_preparar_sem_recibos ........ 0621 (renomeada na 0652)
--   portal_financeiro_pasta_preparar ............. 0652 (o embrulho)
--   pasta_json ................................... 0621
--   portal_cliente ............................... 1030 (o embrulho)
--   aplicar_prazos ............................... 0580, com as trocas da 0590 (avisos_console) e da 0950
--                                                  (ponte_auth.apagar_entrada)
-- Novas: conta_guarda_fiscal_ate, anexo_nome_neutro, conta_descricao_excluido,
-- financeiro_excluido_limpar, financeiro_apagar_do_excluido (gatilho), conta_pagar_nasce,
-- anexo_nasce, exportacao_pasta_guarda, prazo_fiscal_aplicar, cliente_arquivos_que_ficam,
-- financeiro_preencher_excluidos (a 1093 chama). Nenhuma nova é security definer.

-- ---------------------------------------------------------------------------------------
-- 1. Configuração.
insert into configuracoes (chave, valor, descricao) values
  ('prazo_fiscal_anos', '5', 'Anos de guarda da nota, guia, boleto e comprovante de despesa de cliente excluído e da pasta do contador, contados do 1º de janeiro do segundo ano depois do ano da despesa (CTN, art. 173, I, para o imposto anual da pessoa física)');

-- ---------------------------------------------------------------------------------------
-- 2. Funções puras.

-- Até quando fica o arquivo da despesa (o dia em que sai): 1º de janeiro de ano + 2 + prazo, com o
-- ano da data mais tarde da conta. A conta em aberto não vence (null).
create function conta_guarda_fiscal_ate(c contas_pagar) returns date
language sql
stable
set search_path = public
as $$
  select case when c.paga_em is null and c.cancelada_em is null then null
              else make_date(extract(year from greatest(c.vencimento, c.paga_em, c.reembolsado_em,
                                                        (c.cancelada_em at time zone 'America/Sao_Paulo')::date))::integer
                             + 2 + configuracao_int('prazo_fiscal_anos'), 1, 1) end
$$;

-- O nome do arquivo sem dado pessoal: o tipo e a extensão.
create function anexo_nome_neutro(p_categoria text, p_tipo text) returns text
language sql
immutable
as $$
  select case p_categoria when 'NOTA_FISCAL' then 'Nota fiscal' when 'GUIA' then 'Guia' when 'BOLETO' then 'Boleto'
                          when 'COMPROVANTE' then 'Comprovante' else 'Arquivo' end
      || case p_tipo when 'image/jpeg' then '.jpg' when 'image/png' then '.png' else '.pdf' end
$$;

-- A descrição da despesa do cliente excluído (36 letras; cabe no check de 3 a 120 da 0230).
create function conta_descricao_excluido() returns text
language sql
immutable
as $$ select 'Despesa adiantada a cliente excluído'::text $$;

-- ---------------------------------------------------------------------------------------
-- 3. Colunas.
alter table anexos add column apagado_em timestamptz;
alter table exportacao_pastas add column apagada_em timestamptz;

-- ---------------------------------------------------------------------------------------
-- 4. A fila (0970): o motivo PRAZO_FISCAL, sem cliente, e o terceiro formato de caminho (o .zip da
-- pasta do contador), aceito só com esse motivo. O check do motivo não tem nome: precisa ser
-- exatamente um.
do $$
declare
  r record;
  v_n integer := 0;
begin
  for r in select conname, pg_get_constraintdef(oid) def from pg_constraint
            where conrelid = 'arquivos_apagar'::regclass and contype = 'c' loop
    if position('''EXCLUSAO_TITULAR''' in r.def) > 0 and position('motivo' in r.def) > 0 then
      execute format('alter table arquivos_apagar drop constraint %I', r.conname);
      v_n := v_n + 1;
    end if;
  end loop;
  if v_n <> 1 then
    raise exception 'Check do motivo da 0970 não encontrado (achados: %)', v_n;
  end if;
end $$;
alter table arquivos_apagar add constraint arquivos_apagar_motivo check (motivo in ('EXCLUSAO_TITULAR', 'PRAZO_FISCAL'));
alter table arquivos_apagar alter column cliente_id drop not null;
alter table arquivos_apagar add constraint arquivos_apagar_cliente check ((motivo = 'EXCLUSAO_TITULAR') = (cliente_id is not null));
alter table arquivos_apagar drop constraint arquivos_apagar_caminho;
alter table arquivos_apagar add constraint arquivos_apagar_caminho check (caminho ~ ('^' || escritorio::text
  || '/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
  || '|propostas/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-v[1-9][0-9]{0,8}\.docx'
  || '|exportacoes/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-[1-9][0-9]?\.zip)$'));
alter table arquivos_apagar add constraint arquivos_apagar_zip_fiscal check (motivo = 'PRAZO_FISCAL' or caminho !~ '/exportacoes/');
update tabelas_sem_escritorio
   set motivo = 'Fila dos arquivos do Storage a apagar um a um (exclusão a pedido do titular e fim da guarda fiscal); guarda só ids, nunca nome'
 where tabela = 'arquivos_apagar';

-- ---------------------------------------------------------------------------------------
-- 5. O guardião da conta: corpo da 0534, com o ramo da descrição do cliente excluído no começo
-- (também a conta cancelada recebe o texto fixo).
create or replace function contas_pagar_guardiao() returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_livres text[] := array['paga_em', 'valor_pago', 'pago_por', 'reembolsado_em', 'cancelada_em', 'cancelada_por', 'cancelada_motivo'];
begin
  if tg_op = 'DELETE' then
    raise exception 'Conta não se apaga' using errcode = 'TC023';
  end if;
  -- F3.156: a descrição da despesa adiantada para o cliente excluído vira o texto fixo, e só ela muda.
  if new.descricao is distinct from old.descricao then
    if new.descricao = conta_descricao_excluido() and old.cliente_id is not null
       and (to_jsonb(new) - 'descricao') = (to_jsonb(old) - 'descricao')
       and (select k.estado from clientes_escritorio k where k.id = old.cliente_id) = 'EXCLUIDO' then
      return new;
    end if;
    raise exception 'Conta só ganha o pagamento e o reembolso' using errcode = 'TC023';
  end if;
  if old.cancelada_em is not null and (to_jsonb(old) - 'reembolsado_em') <> (to_jsonb(new) - 'reembolsado_em') then
    raise exception 'Esta conta foi cancelada' using errcode = 'TC422', detail = jsonb_build_object('motivo', 'CONTA_CANCELADA')::text;
  end if;
  if coalesce(current_setting('t3.recorrencia_mudanca', true), '') = 'on' and old.recorrente_id is not null
     and old.paga_em is null and new.paga_em is null and old.cancelada_em is null then
    v_livres := v_livres || array['valor', 'vencimento'];
  end if;
  if (to_jsonb(old) - v_livres) <> (to_jsonb(new) - v_livres)
     or (old.paga_em is not null and (new.paga_em, new.valor_pago, new.pago_por) is distinct from (old.paga_em, old.valor_pago, old.pago_por))
     or (old.reembolsado_em is not null and new.reembolsado_em is distinct from old.reembolsado_em) then
    raise exception 'Conta só ganha o pagamento e o reembolso' using errcode = 'TC023';
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------------------------
-- 6. O guardião do anexo: corpo da 0520, com dois ramos antes do de hoje.
--   * apagado não muda mais;
--   * na conta de cliente EXCLUIDO, o nome pode virar o neutro, e o apagado_em pode entrar (na hora,
--     no marco e com o nome neutro no mesmo UPDATE; revisão, G1), com todo o resto igual.
create or replace function anexo_so_conclui() returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_livres text[] := array['nome', 'apagado_em'];
  c contas_pagar;
begin
  if tg_op = 'DELETE' then
    raise exception 'Anexo não se apaga' using errcode = 'TC023';
  end if;
  if old.apagado_em is not null then
    raise exception 'Anexo apagado não muda' using errcode = 'TC023';
  end if;
  if new.nome is distinct from old.nome or new.apagado_em is not null then
    if old.conta_id is not null then
      select * into c from contas_pagar x where x.id = old.conta_id;
    end if;
    if c.id is not null
       and (select k.estado from clientes_escritorio k where k.id = c.cliente_id) = 'EXCLUIDO'
       and new.nome = anexo_nome_neutro(old.categoria, old.tipo)
       and (to_jsonb(new) - v_livres) = (to_jsonb(old) - v_livres)
       and (new.apagado_em is null
            or (new.apagado_em = app_now() and coalesce(hoje_brasilia() >= conta_guarda_fiscal_ate(c), false))) then
      return new;
    end if;
    raise exception 'Anexo só muda de enviando para pronto' using errcode = 'TC023';
  end if;
  if old.situacao <> 'ENVIANDO' or new.situacao <> 'PRONTO'
     or (to_jsonb(new) - array['situacao', 'concluido_em']) <> (to_jsonb(old) - array['situacao', 'concluido_em']) then
    raise exception 'Anexo só muda de enviando para pronto' using errcode = 'TC023';
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------------------------
-- 7. A pasta do contador: só a rotina da noite marca apagada_em, e nada mais muda. DELETE continua
-- recusado. Troca o financeiro_so_acrescenta (0621), que outras tabelas continuam usando.
create function exportacao_pasta_guarda() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and old.apagada_em is null and new.apagada_em = app_now()
     and (to_jsonb(new) - 'apagada_em') = (to_jsonb(old) - 'apagada_em')
     and coalesce(current_setting('t3jus.aplicando_prazos', true), '') = 'on' then
    return new;
  end if;
  raise exception 'Registro do financeiro não se muda nem se apaga' using errcode = 'TC023';
end $$;
drop trigger exportacao_pastas_so_acrescenta on exportacao_pastas;
create trigger exportacao_pasta_guarda before update or delete on exportacao_pastas
  for each row execute function exportacao_pasta_guarda();

-- ---------------------------------------------------------------------------------------
-- 8. Nascer. FOR SHARE no cliente, na mesma consulta que lê o estado (revisão, m2), como o
-- cliente_documento_nasce da 0970: o que chega durante a exclusão espera por ela e a vê.

-- Conta nova para cliente excluído é recusada como cliente que não existe (0511).
create function conta_pagar_nasce() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.cliente_id is not null then
    perform 1 from clientes_escritorio where id = new.cliente_id and estado <> 'EXCLUIDO' for share;
    if not found then
      perform recusar_campos('Confira a conta', 'clienteId');
    end if;
  end if;
  return new;
end $$;
create trigger conta_pagar_nasce before insert on contas_pagar
  for each row execute function conta_pagar_nasce();

-- Anexo novo na conta de cliente excluído é aceito (a nota pode chegar depois), com o nome neutro.
create function anexo_nasce() returns trigger
language plpgsql
set search_path = public
as $$
declare v text;
begin
  if new.apagado_em is not null then
    raise exception 'Anexo nasce sem apagado_em' using errcode = 'TC023';
  end if;
  if new.conta_id is not null then
    select k.estado into v from contas_pagar c join clientes_escritorio k on k.id = c.cliente_id
     where c.id = new.conta_id for share of k;
    if v = 'EXCLUIDO' then
      new.nome := anexo_nome_neutro(new.categoria, new.tipo);
    end if;
  end if;
  return new;
end $$;
create trigger anexo_nasce before insert on anexos
  for each row execute function anexo_nasce();

-- ---------------------------------------------------------------------------------------
-- 9. As leituras: o apagado responde como o que não existe.

-- Corpo da 0520; o envio atrasado de um anexo apagado recebe 404 (revisão, m3).
create or replace function portal_anexo_para_concluir(p_pessoa uuid, p_escritorio uuid, p_anexo uuid)
returns table (tipo text, tamanho integer)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare a anexos;
begin
  perform anexo_alguma_area(p_pessoa, p_escritorio);
  select * into a from anexos x where x.id = p_anexo and x.escritorio_id = p_escritorio and x.enviado_por = p_pessoa and x.apagado_em is null;
  if a.id is null then raise exception 'Anexo não encontrado' using errcode = 'TC404'; end if;
  perform anexo_entrar(p_pessoa, p_escritorio, anexo_dono(a), true);
  return query select a.tipo, a.tamanho;
end $$;

-- Corpo da 0520.
create or replace function portal_anexo_abrir(p_pessoa uuid, p_escritorio uuid, p_anexo uuid) returns text
language plpgsql
security definer
set search_path = public
as $$
declare a anexos;
begin
  perform anexo_alguma_area(p_pessoa, p_escritorio);
  select * into a from anexos where id = p_anexo and escritorio_id = p_escritorio and situacao = 'PRONTO' and apagado_em is null;
  if a.id is null then raise exception 'Anexo não encontrado' using errcode = 'TC404'; end if;
  perform anexo_entrar(p_pessoa, p_escritorio, anexo_dono(a), false);
  perform anexo_historico(a, 'anexo.aberto');
  return a.nome;
end $$;

-- Corpo da 0520.
create or replace function portal_financeiro_anexos(p_pessoa uuid, p_escritorio uuid, p_contas uuid[], p_pagamentos uuid[]) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform anexo_entrar(p_pessoa, p_escritorio, 'CONTA', false);
  if coalesce(cardinality(p_contas), 0) > 500 or coalesce(cardinality(p_pagamentos), 0) > 500 then
    perform recusar_campos('Peça menos de uma vez', 'ids');
  end if;
  return jsonb_build_object('anexos', coalesce((
    select jsonb_agg(anexo_linha(a) order by a.concluido_em desc, a.id)
      from anexos a
     where a.escritorio_id = p_escritorio and a.situacao = 'PRONTO' and a.apagado_em is null
       and (a.conta_id = any (coalesce(p_contas, '{}')) or a.pagamento_id = any (coalesce(p_pagamentos, '{}')))), '[]'::jsonb));
end $$;

-- Corpo da 0520 (com o nome da 0941). O filtro vai só na lista dos anexos: o semNota continua sem
-- ele (o comprovante existiu e saiu no fim do prazo).
create or replace function financeiro_exportacao_anexos_sem_emprestimo(p_pessoa uuid, p_escritorio uuid, p_mes text) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mes date;
  v_fm date;
begin
  perform anexo_entrar(p_pessoa, p_escritorio, 'CONTA', false);
  v_mes := exportacao_mes(p_mes);
  v_fm := (v_mes + interval '1 month')::date - 1;
  return jsonb_build_object(
    'mes', v_mes,
    'semNota', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'descricao', c.descricao, 'fornecedor', c.fornecedor,
                                                             'dia', c.paga_em, 'valor', c.valor_pago) order by c.paga_em, c.descricao)
                           from contas_pagar c
                          where c.escritorio_id = p_escritorio and c.paga_em between v_mes and v_fm
                            and not exists (select 1 from anexos a where a.conta_id = c.id and a.situacao = 'PRONTO')), '[]'::jsonb),
    'anexos', coalesce((select jsonb_agg(anexo_linha(a) order by a.concluido_em, a.id)
                          from anexos a
                         where a.escritorio_id = p_escritorio and a.situacao = 'PRONTO' and a.apagado_em is null
                           and (a.conta_id in (select c.id from contas_pagar c where c.escritorio_id = p_escritorio and c.paga_em between v_mes and v_fm)
                                or a.pagamento_id in (select p.id from pagamentos_recebidos p where p.escritorio_id = p_escritorio
                                                        and p.caixa = 'ESCRITORIO' and p.recebido_em between v_mes and v_fm))), '[]'::jsonb));
end $$;
revoke all on function financeiro_exportacao_anexos_sem_emprestimo(uuid, uuid, text) from public, anon, authenticated;

-- A pasta apagada é tratada como inexistente (corpo da 0621).
create or replace function pasta_json(x exportacao_pastas) returns jsonb
language sql stable
set search_path = public
as $$
  select case when x.id is null or x.apagada_em is not null then null else jsonb_build_object(
    'id', x.id, 'partes', x.partes, 'arquivos', x.arquivos, 'tamanho', x.tamanho, 'em', x.criada_em, 'por', pessoa_ref(x.criada_por)) end
$$;

-- Corpo da 0621 (com o nome da 0652), sem os anexos apagados nos dois ramos.
create or replace function financeiro_pasta_preparar_sem_recibos(p_pessoa uuid, p_escritorio uuid, p_exportacao uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  x exportacoes_contador;
  v_pasta exportacao_pastas;
  v_fm date;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'FINANCEIRO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'financeiro.ver');
  select * into x from exportacoes_contador where id = p_exportacao and escritorio_id = p_escritorio;
  if x.id is null then raise exception 'Exportação não encontrada' using errcode = 'TC404'; end if;
  select * into v_pasta from exportacao_pastas where exportacao_id = x.id;
  v_fm := (x.mes + interval '1 month')::date - 1;
  return jsonb_build_object(
    'exportacaoId', x.id, 'mes', x.mes, 'formato', x.formato,
    'pasta', pasta_json(v_pasta),
    'anexos', case when v_pasta.id is not null then '[]'::jsonb else coalesce((
      select jsonb_agg(l.j order by l.dia, l.lancamento, l.criado) from (
        select jsonb_build_object('id', a.id, 'nome', a.nome, 'tipo', a.tipo, 'tamanho', a.tamanho, 'categoria', a.categoria,
                                  'dia', c.paga_em, 'lancamento', c.descricao) j, c.paga_em dia, c.descricao lancamento, a.concluido_em criado
          from anexos a join contas_pagar c on c.id = a.conta_id
         where a.escritorio_id = p_escritorio and a.situacao = 'PRONTO' and a.apagado_em is null and c.paga_em between x.mes and v_fm
        union all
        select jsonb_build_object('id', a.id, 'nome', a.nome, 'tipo', a.tipo, 'tamanho', a.tamanho, 'categoria', a.categoria,
                                  'dia', p.recebido_em, 'lancamento', 'Recebimento de ' || k.nome || ' · ' || rp.descricao),
               p.recebido_em, 'Recebimento de ' || k.nome, a.concluido_em
          from anexos a
          join pagamentos_recebidos p on p.id = a.pagamento_id
          join recebimentos_previstos rp on rp.id = p.parcela_id
          join contratos ct on ct.id = rp.contrato_id
          join clientes_escritorio k on k.id = ct.cliente_id
         where a.escritorio_id = p_escritorio and a.situacao = 'PRONTO' and a.apagado_em is null and p.caixa = 'ESCRITORIO'
           and p.recebido_em between x.mes and v_fm
      ) l), '[]'::jsonb) end);
end $$;

-- O embrulho da 0652: a exportação cuja pasta saiu no fim do prazo fiscal devolve a pasta nula e
-- nada a montar (a pasta não se remonta: o registro é um por exportação).
create or replace function portal_financeiro_pasta_preparar(p_pessoa uuid, p_escritorio uuid, p_exportacao uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v jsonb := financeiro_pasta_preparar_sem_recibos(p_pessoa, p_escritorio, p_exportacao);
  v_mes date := (v ->> 'mes')::date;
begin
  if v -> 'pasta' <> 'null'::jsonb then return v || jsonb_build_object('recibos', '[]'::jsonb); end if;
  if exists (select 1 from exportacao_pastas x where x.exportacao_id = p_exportacao and x.escritorio_id = p_escritorio and x.apagada_em is not null) then
    return v || jsonb_build_object('pasta', null, 'anexos', '[]'::jsonb, 'recibos', '[]'::jsonb);
  end if;
  return v || jsonb_build_object('recibos', coalesce((
    select jsonb_agg(recibo_dados(p_escritorio, b.id) order by p.recebido_em, b.ano, b.numero)
      from recibos b join pagamentos_recebidos p on p.id = b.pagamento_id
     where b.escritorio_id = p_escritorio and p.caixa = 'ESCRITORIO'
       and p.recebido_em between v_mes and (v_mes + interval '1 month')::date - 1), '[]'::jsonb));
end $$;

-- ---------------------------------------------------------------------------------------
-- 10. Na exclusão.

-- Troca a descrição das despesas do cliente pelo texto fixo e o nome dos arquivos (não apagados, de
-- qualquer situação) pelo tipo. Idempotente. Não é security definer: roda dentro da exclusão
-- (contexto do escritório), da rotina e do preenchimento (com as marcas da rotina).
create function financeiro_excluido_limpar(p_escritorio uuid, p_cliente uuid) returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_despesas integer;
  v_anexos integer;
begin
  perform 1 from contas_pagar where escritorio_id = p_escritorio and cliente_id = p_cliente order by id for update;
  update contas_pagar set descricao = conta_descricao_excluido()
   where escritorio_id = p_escritorio and cliente_id = p_cliente and descricao <> conta_descricao_excluido();
  get diagnostics v_despesas = row_count;
  update anexos a set nome = anexo_nome_neutro(a.categoria, a.tipo)
    from contas_pagar c
   where c.escritorio_id = p_escritorio and c.cliente_id = p_cliente and a.conta_id = c.id
     and a.apagado_em is null and a.nome <> anexo_nome_neutro(a.categoria, a.tipo);
  get diagnostics v_anexos = row_count;
  return jsonb_build_object('despesas', v_despesas, 'anexos', v_anexos);
end $$;

-- O que fica guardado pela lei fiscal, contado para a janela e para o evento: as despesas do
-- cliente, as que têm arquivo pronto e não apagado, esses arquivos, as pastas do contador não
-- apagadas que os contêm e até quando ficam (o maior marco; null se alguma conta com arquivo está
-- em aberto ou se não há arquivo). Não é security definer.
create function cliente_arquivos_que_ficam(p_escritorio uuid, p_cliente uuid) returns jsonb
language sql
stable
set search_path = public
as $$
  with cs as (select cp.id, cp.paga_em, conta_guarda_fiscal_ate(cp) ate
                from contas_pagar cp where cp.escritorio_id = p_escritorio and cp.cliente_id = p_cliente),
       ax as (select x.id, x.conta_id, x.criado_em from anexos x join cs on cs.id = x.conta_id
               where x.situacao = 'PRONTO' and x.apagado_em is null)
  select jsonb_build_object(
    'despesas', (select count(*) from cs),
    'comArquivo', (select count(distinct conta_id) from ax),
    'arquivos', (select count(*) from ax),
    'pastas', (select count(*) from exportacao_pastas p join exportacoes_contador e on e.id = p.exportacao_id
                where p.escritorio_id = p_escritorio and p.apagada_em is null
                  and exists (select 1 from ax join cs on cs.id = ax.conta_id
                               where cs.paga_em between e.mes and (e.mes + interval '1 month')::date - 1 and ax.criado_em <= p.criada_em)),
    'ate', case when exists (select 1 from cs where cs.id in (select conta_id from ax) and cs.ate is null) then null
                else (select max(cs.ate) from cs where cs.id in (select conta_id from ax)) end)
$$;

create function financeiro_apagar_do_excluido() returns trigger
language plpgsql
set search_path = public
as $$
declare v jsonb := financeiro_excluido_limpar(new.escritorio_id, new.id);
begin
  if (v ->> 'despesas')::integer + (v ->> 'anexos')::integer > 0 then
    -- A prova de que a despesa ficou pela lei e até quando, sem dado pessoal.
    perform historico_do_cliente(new.escritorio_id, new.id, 'cliente.despesas_guardadas',
      v || jsonb_build_object('ate', cliente_arquivos_que_ficam(new.escritorio_id, new.id) -> 'ate'));
  end if;
  return null;
end $$;
-- Pelo nome, roda depois de comercial_apagar_do_excluido e antes de z_cliente_excluido_arquivos,
-- sem depender de nenhum dos dois.
create trigger financeiro_apagar_do_excluido after update of estado on clientes_escritorio
  for each row when (new.estado = 'EXCLUIDO' and old.estado <> 'EXCLUIDO') execute function financeiro_apagar_do_excluido();

-- ---------------------------------------------------------------------------------------
-- 11. A rotina: no marco, os arquivos vencidos de despesa de cliente excluído e as partes da pasta
-- do contador do mês vão para a fila (PRAZO_FISCAL, sem cliente), e as linhas ficam marcadas. No
-- molde de arquivos_apagar_preencher_excluidos (0970): as marcas fim_da_guarda e aplicando_prazos
-- só durante a chamada. Primeiro a lista, depois as mudanças (0580). Não depende da 1093 (revisão,
-- G1): a descrição da conta vencida e o nome do arquivo são trocados no mesmo passo. Idempotente.
-- A pasta usa a regra da montagem (0621): conta paga no mês e anexo criado até a pasta; o anexo já
-- apagado também conta (revisão, m4).
create function prazo_fiscal_aplicar() returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_guarda text := coalesce(current_setting('t3jus.fim_da_guarda', true), '');
  v_prazos text := coalesce(current_setting('t3jus.aplicando_prazos', true), '');
  v_hoje date;
  v_anos integer := configuracao_int('prazo_fiscal_anos');
  v_anexos uuid[];
  v_pastas uuid[];
  r record;
begin
  perform limpar_contexto();
  perform set_config('t3jus.fim_da_guarda', 'on', true);
  perform set_config('t3jus.aplicando_prazos', 'on', true);
  v_hoje := hoje_brasilia();

  select coalesce(array_agg(a.id order by a.id), '{}') into v_anexos
    from anexos a join contas_pagar c on c.id = a.conta_id join clientes_escritorio k on k.id = c.cliente_id
   where k.estado = 'EXCLUIDO' and a.apagado_em is null and v_hoje >= conta_guarda_fiscal_ate(c);

  select coalesce(array_agg(x.id order by x.id), '{}') into v_pastas
    from exportacao_pastas x join exportacoes_contador e on e.id = x.exportacao_id
   where x.apagada_em is null
     and v_hoje >= make_date(extract(year from e.mes)::integer + 2 + v_anos, 1, 1)
     and exists (select 1 from anexos a join contas_pagar c on c.id = a.conta_id join clientes_escritorio k on k.id = c.cliente_id
                  where k.estado = 'EXCLUIDO' and c.escritorio_id = x.escritorio_id
                    and c.paga_em between e.mes and (e.mes + interval '1 month')::date - 1
                    and a.criado_em <= x.criada_em);

  -- A descrição e o nome dos clientes dos anexos vencidos (sem a 1093, ainda podem ser os antigos).
  for r in select distinct c.escritorio_id, c.cliente_id from anexos a join contas_pagar c on c.id = a.conta_id
            where a.id = any (v_anexos) order by c.escritorio_id, c.cliente_id loop
    perform financeiro_excluido_limpar(r.escritorio_id, r.cliente_id);
  end loop;

  -- O envio pode chegar até 2 h depois de criado o endereço (0970): o anexo espera até criado_em + 2 h 10 min.
  insert into arquivos_apagar (escritorio, bucket, caminho, motivo, cliente_id, conferir_ate)
  select a.escritorio_id, 'documentos-portal', a.escritorio_id::text || '/' || a.id::text, 'PRAZO_FISCAL', null,
         greatest(app_now(), a.criado_em + interval '2 hours 10 minutes')
    from anexos a where a.id = any (v_anexos) order by a.id
  on conflict (bucket, caminho) do nothing;
  update anexos set nome = anexo_nome_neutro(categoria, tipo), apagado_em = app_now() where id = any (v_anexos);

  insert into arquivos_apagar (escritorio, bucket, caminho, motivo, cliente_id)
  select x.escritorio_id, 'documentos-portal', p ->> 'caminho', 'PRAZO_FISCAL', null
    from exportacao_pastas x cross join lateral jsonb_array_elements(x.partes) with ordinality t(p, n)
   where x.id = any (v_pastas) order by x.id, n
  on conflict (bucket, caminho) do nothing;
  update exportacao_pastas set apagada_em = app_now() where id = any (v_pastas);

  for r in select s.esc, sum(s.an)::integer anexos, sum(s.pa)::integer pastas from (
             select a.escritorio_id esc, 1 an, 0 pa from anexos a where a.id = any (v_anexos)
             union all
             select x.escritorio_id, 0, 1 from exportacao_pastas x where x.id = any (v_pastas)) s
            group by s.esc order by s.esc loop
    perform historico_do_escritorio(r.esc, false, 'dados.prazo_fiscal_aplicado', jsonb_build_object('anexos', r.anexos, 'pastas', r.pastas));
  end loop;

  perform set_config('t3jus.fim_da_guarda', v_guarda, true);
  perform set_config('t3jus.aplicando_prazos', v_prazos, true);
  return jsonb_build_object('anexos', cardinality(v_anexos), 'pastas', cardinality(v_pastas));
end $$;

-- ---------------------------------------------------------------------------------------
-- 12. A rotina da noite: corpo da 0580 com as trocas da 0590 e da 0950 (o texto que está no banco),
-- e o prazo fiscal depois dos interessados.
create or replace function aplicar_prazos() returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n         integer;
  v_apagados  jsonb := '{}'::jsonb;
  v_aguardam  text[] := '{}';
  v_sem       text[];
  v_resultado jsonb;
  v_contratos jsonb := '{}'::jsonb;
  r           record;
  v_encerrados integer := 0;
  v_fechados  integer := 0;
  v_entradas  integer := 0;
  v_guardas   integer := 0;
  v_ids       uuid[];
  v_id        uuid;
  v_fiscal    jsonb;
begin
  perform limpar_contexto();
  perform set_config('t3jus.aplicando_prazos', 'on', true);

  if prazo_aprovado('sessoes_escritorio') then
    delete from sessoes_escritorio
     where escolhido_em < app_now() - make_interval(days => configuracao_int('prazo_sessoes_dias'));
    get diagnostics v_n = row_count;
    v_apagados := v_apagados || jsonb_build_object('sessoes_escritorio', v_n);
  else
    v_aguardam := v_aguardam || 'sessoes_escritorio'::text;
  end if;

  if prazo_aprovado('limites_uso') then
    delete from limites_uso
     where inicio_janela < app_now() - make_interval(hours => configuracao_int('prazo_limites_horas'));
    get diagnostics v_n = row_count;
    v_apagados := v_apagados || jsonb_build_object('limites_uso', v_n);
  else
    v_aguardam := v_aguardam || 'limites_uso'::text;
  end if;

  if prazo_aprovado('historico') then
    delete from historico
     where acao like 'acesso.%'
       and ocorrido_em < app_now() - make_interval(months => configuracao_int('prazo_acessos_meses'));
    get diagnostics v_n = row_count;
    v_apagados := v_apagados || jsonb_build_object('historico', v_n);
  else
    v_aguardam := v_aguardam || 'historico'::text;
  end if;

  -- Contrato que chegou ao fim marcado: vira Encerrado (decisão 1 do F0.14).
  for r in select e.id from escritorios e join clientes cl on cl.escritorio_id = e.id
            where e.contrato_fim_em <= hoje_brasilia() and cl.estado <> 'ENCERRADO' and cl.fim_motivo is not null
            order by e.id loop
    perform encerrar_no_dia(r.id, true);
    v_encerrados := v_encerrados + 1;
  end loop;

  -- Fim dos 30 dias: o acesso fecha e as sessões no escritório saem.
  for r in select e.id from escritorios e
            where e.contrato_fim_em is not null and e.acesso_fechado_em is null
              and situacao_do_contrato(e.contrato_fim_em) = 'FECHADO'
            order by e.id loop
    update escritorios set acesso_fechado_em = app_now() where id = r.id;
    delete from sessoes_escritorio where escritorio_id = r.id;
    get diagnostics v_n = row_count;
    perform historico_do_escritorio(r.id, false, 'contrato.acesso_fechado', jsonb_build_object('sessoes', v_n));
    v_fechados := v_fechados + 1;
  end loop;

  -- 90 dias sem nenhum acesso: a entrada sai do Auth e a pessoa fica como autora.
  if prazo_aprovado('pessoas') then
    for r in select p.id from pessoas p
              where p.entrada_apagada_em is null
                and pessoa_sem_acesso_desde(p.id) <= app_now() - make_interval(days => configuracao_int('prazo_entrada_dias'))
              order by p.id loop
      perform ponte_auth.apagar_entrada(r.id);
      delete from sessoes_escritorio where pessoa_id = r.id;
      update pessoas set entrada_apagada_em = app_now() where id = r.id;
      perform inserir_historico(true, 'pessoa.entrada_apagada', 'pessoa', r.id::text, '{}'::jsonb);
      v_entradas := v_entradas + 1;
    end loop;
  else
    v_aguardam := v_aguardam || 'pessoas'::text;
  end if;

  -- F0.15: 5 anos depois do fim do contrato, o escritório sai e fica só o nome. Vem depois da
  -- saída das entradas, para quem só tinha este escritório sair junto.
  -- A lista vem antes: terminar_guarda muda as tabelas, e um cursor aberto nelas impede.
  select coalesce(array_agg(e.id order by e.id), '{}') into v_ids from escritorios e
   where e.contrato_fim_em is not null and e.guarda_terminada_em is null
     and hoje_brasilia() >= guarda_ate(e.contrato_fim_em);
  foreach v_id in array v_ids loop
    perform terminar_guarda(v_id);
    v_guardas := v_guardas + 1;
  end loop;

  perform set_config('t3jus.aplicando_prazos', 'off', true);

  v_contratos := jsonb_build_object('encerrados', v_encerrados, 'acessos_fechados', v_fechados,
                                    'entradas_apagadas', v_entradas, 'guardas_terminadas', v_guardas);

  -- Interessados que não viraram cliente (0580): 12 meses depois do último contato.
  if prazo_aprovado('interessados') then
    v_n := apagar_interessados_vencidos();
    -- Só aparece na contagem quando apagou alguém (a contagem dos outros prazos não muda).
    if v_n > 0 then v_apagados := v_apagados || jsonb_build_object('interessados', v_n); end if;
  else
    v_aguardam := v_aguardam || 'interessados'::text;
  end if;

  -- F3.156: nota, guia, boleto e comprovante de despesa de cliente excluído e a pasta do contador do
  -- mês, no fim da guarda fiscal. As chaves só aparecem quando houve algo.
  if prazo_aprovado('anexos') then
    v_fiscal := prazo_fiscal_aplicar();
    if (v_fiscal ->> 'anexos')::integer > 0 then
      v_apagados := v_apagados || jsonb_build_object('anexos_fiscais', (v_fiscal ->> 'anexos')::integer);
    end if;
    if (v_fiscal ->> 'pastas')::integer > 0 then
      v_apagados := v_apagados || jsonb_build_object('pastas_fiscais', (v_fiscal ->> 'pastas')::integer);
    end if;
  else
    v_aguardam := v_aguardam || 'anexos'::text;
  end if;

  -- Dado pessoal cujo prazo a rotina ainda não aplica: hoje, só o da equipe T3jus (5 anos
  -- depois de sair). Tudo o que é do escritório sai no fim da guarda.
  select coalesce(array_agg(d.tabela order by d.tabela), '{}') into v_sem
    from inventario_dados d
   where d.dado_pessoal and d.tabela not in ('sessoes_escritorio', 'limites_uso', 'pessoas', 'historico', 'escritorios',
                                             'interessados', 'interessado_eventos', 'interessado_notas', 'avisos_console')
     and not exists (select 1 from pg_attribute a
                      where a.attrelid = to_regclass('public.' || d.tabela) and a.attname = 'escritorio_id' and not a.attisdropped);

  v_resultado := jsonb_build_object(
    'apagados', v_apagados,
    'contratos', v_contratos,
    'aguardando_aprovacao', to_jsonb(v_aguardam),
    'sem_gatilho', to_jsonb(v_sem),
    'arquivos_chamados', guarda_arquivos_chamar());
  perform registrar_historico('dados.prazos_aplicados', 'inventario', null, v_resultado);
  return v_resultado;
end $$;

-- ---------------------------------------------------------------------------------------
-- 13. A ficha: corpo da 1030, letra por letra, com arquivosQueFicam ao lado de arquivosParaApagar.
create or replace function portal_cliente(p_pessoa uuid, p_escritorio uuid, p_cliente uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  f jsonb := portal_cliente_sem_termo(p_pessoa, p_escritorio, p_cliente);
  c clientes_escritorio;
  v_tutela jsonb;
begin
  select * into c from clientes_escritorio where id = p_cliente and escritorio_id = p_escritorio;
  v_tutela := cliente_termo_tutela_linha(p_escritorio, p_cliente);
  if v_tutela is null and c.tipo = 'PF' and c.capacidade = 'MENOR' and c.rl_papel in ('TUTORA', 'TUTOR')
     and cliente_assina(c) ->> 'situacao' = 'FEZ_18' then
    v_tutela := cliente_termo_tutela_guardado(p_escritorio, p_cliente);
  end if;
  f := f || jsonb_build_object('termoCuratela', cliente_termo_linha(p_escritorio, p_cliente), 'termoTutela', v_tutela);
  -- Só a tutora ou o tutor que assinava ganha a chave "termo", e só quando há termo guardado;
  -- sem termo, "Quem assinava" sai como antes (o 112 confere o objeto inteiro).
  if jsonb_typeof(f -> 'quemAssinava') = 'object' and f -> 'quemAssinava' ->> 'papel' in ('TUTORA', 'TUTOR') then
    v_tutela := cliente_termo_tutela_guardado(p_escritorio, p_cliente);
    if v_tutela is not null then
      f := jsonb_set(f, '{quemAssinava,termo}', v_tutela);
    end if;
  end if;
  -- F3.155: só a sócia dona, no cliente que ela pode excluir (ativo ou inativo, sem contrato nem
  -- processo; com eles a janela é a de arquivar e nada se apaga). Sem isso, a chave não vem.
  -- F3.156: arquivosQueFicam, com as mesmas regras de quem recebe.
  if (f ->> 'dono')::boolean and c.estado in ('ATIVO', 'INATIVO')
     and jsonb_typeof(f -> 'vinculosLgpd') is distinct from 'object' then
    f := f || jsonb_build_object('arquivosParaApagar', cliente_arquivos_para_apagar(p_escritorio, p_cliente),
                                 'arquivosQueFicam', cliente_arquivos_que_ficam(p_escritorio, p_cliente));
  end if;
  return f;
end $$;

-- ---------------------------------------------------------------------------------------
-- 14. Os clientes excluídos antes desta migration (a 1093 chama). No molde de
-- arquivos_apagar_preencher_excluidos (0970). Devolve {escritório: {clientes, despesas, anexos}}.
-- Idempotente: chamada de novo, não acha nada. Os arquivos não saem: só a descrição e o nome.
create function financeiro_preencher_excluidos() returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_guarda text := coalesce(current_setting('t3jus.fim_da_guarda', true), '');
  v_prazos text := coalesce(current_setting('t3jus.aplicando_prazos', true), '');
  r record;
  v jsonb;
  v_esc jsonb := '{}'::jsonb;
  v_um jsonb;
begin
  perform limpar_contexto();
  perform set_config('t3jus.fim_da_guarda', 'on', true);
  perform set_config('t3jus.aplicando_prazos', 'on', true);
  for r in select c.id, c.escritorio_id from clientes_escritorio c where c.estado = 'EXCLUIDO' order by c.escritorio_id, c.id loop
    v := financeiro_excluido_limpar(r.escritorio_id, r.id);
    if (v ->> 'despesas')::integer + (v ->> 'anexos')::integer > 0 then
      perform historico_do_cliente(r.escritorio_id, r.id, 'cliente.despesas_guardadas',
        v || jsonb_build_object('ate', cliente_arquivos_que_ficam(r.escritorio_id, r.id) -> 'ate', 'antes', true));
      v_um := coalesce(v_esc -> r.escritorio_id::text, '{"clientes": 0, "despesas": 0, "anexos": 0}'::jsonb);
      v_esc := v_esc || jsonb_build_object(r.escritorio_id::text, jsonb_build_object(
        'clientes', (v_um ->> 'clientes')::integer + 1,
        'despesas', (v_um ->> 'despesas')::integer + (v ->> 'despesas')::integer,
        'anexos', (v_um ->> 'anexos')::integer + (v ->> 'anexos')::integer));
    end if;
  end loop;
  perform set_config('t3jus.fim_da_guarda', v_guarda, true);
  perform set_config('t3jus.aplicando_prazos', v_prazos, true);
  return v_esc;
end $$;

-- ---------------------------------------------------------------------------------------
-- 15. Inventário (PT-11): a base legal das tabelas guardadas pela obrigação legal (LGPD, art. 7º, II
-- e 16, I; revisão, M4) e o destino no pedido do titular. A situação continua APROVADO, com o ok da
-- Carol antes do merge (como na 0970 e na 1090).
update inventario_dados
   set prazo = 'Enquanto o escritório for cliente do T3jus e 5 anos depois do fim do contrato; o de despesa de cliente excluído, até a decadência do imposto do ano da despesa (5 anos, CTN 173, I)',
       no_fim = 'Exportados ao escritório e apagados com ele, com o arquivo. De despesa de cliente excluído, fica com o nome trocado pelo tipo e sai em 1º de janeiro do 7º ano depois do pagamento (LGPD, art. 16, I)'
 where tabela = 'anexos';
update inventario_dados
   set base_legal = 'Execução de contrato e obrigação legal (LGPD, art. 7º, V e II)',
       no_fim = 'Exportadas ao escritório e apagadas com ele. A pedido do titular, a descrição da despesa adiantada vira texto fixo; valor, datas e reembolso ficam, sem dado pessoal'
 where tabela = 'contas_pagar';
update inventario_dados
   set base_legal = 'Execução de contrato e obrigação legal (LGPD, art. 7º, V e II)',
       no_fim = 'Exportadas ao escritório e apagadas com ele, com os arquivos. A do mês com nota de despesa de cliente excluído fica como foi montada e sai em 1º de janeiro do 7º ano depois do mês (LGPD, art. 16, I)'
 where tabela = 'exportacao_pastas';
update inventario_dados
   set o_que = 'Arquivos do Storage a apagar um a um (exclusão a pedido do titular e fim da guarda fiscal): o caminho (só ids), as tentativas e quando saiu; a linha fica'
 where tabela = 'arquivos_apagar';

call fechar_acesso();
