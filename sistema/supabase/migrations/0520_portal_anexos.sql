-- Anexos do Portal fora do caso (F3.12, F3.22): o contrato assinado (CH-01) e a nota, guia,
-- boleto ou comprovante de cada conta a pagar e de cada recebimento (FI-18). Telas aprovadas em
-- docs/design/aprovadas/portal-comercial-contratos (ficha do contrato, "Arquivo assinado") e
-- docs/design/aprovadas/portal-financeiro (A pagar, coluna "Nota ou guia"; Lançar conta e
-- Registrar recebimento, com o arquivo opcional; exportação com as despesas sem nota).
-- - O envio é o mesmo dos documentos do caso (0270): a API registra (ENVIANDO) e devolve um
--   endereço de envio de uso único; depois de o arquivo chegar, confere o tamanho e o tipo no
--   Storage e conclui (PRONTO). O bucket é o documentos-portal; o caminho, <escritório>/<anexo>.
-- - Cada anexo tem um só dono: um contrato, uma conta a pagar ou um recebimento.
-- - Nada se apaga. Anexar de novo guarda os dois; vale o mais novo.
-- - O contrato é da área Contratos; a conta e o recebimento, da área Financeiro.
-- - As leituras ficam em funções próprias, sem mexer nas fichas de outras frentes.

create table anexos (
  id            uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null references escritorios (id) on delete restrict,
  contrato_id   uuid references contratos (id) on delete restrict,
  conta_id      uuid references contas_pagar (id) on delete restrict,
  pagamento_id  uuid references pagamentos_recebidos (id) on delete restrict,
  categoria     text not null check (categoria in ('CONTRATO_ASSINADO', 'NOTA_FISCAL', 'GUIA', 'BOLETO', 'COMPROVANTE')),
  nome          text not null check (length(btrim(nome)) between 1 and 200 and nome !~ '[/\\]'),
  tipo          text not null check (tipo in ('application/pdf', 'image/jpeg', 'image/png')),
  tamanho       integer not null check (tamanho between 1 and 10485760),
  situacao      situacao_documento not null default 'ENVIANDO',
  enviado_por   uuid not null references pessoas (id) on delete restrict,
  criado_em     timestamptz not null default app_now(),
  concluido_em  timestamptz,
  check (num_nonnulls(contrato_id, conta_id, pagamento_id) = 1),
  check ((contrato_id is not null) = (categoria = 'CONTRATO_ASSINADO')),
  check (pagamento_id is null or categoria = 'COMPROVANTE'),
  check ((situacao = 'PRONTO') = (concluido_em is not null))
);
create index anexos_contrato on anexos (contrato_id, concluido_em desc) where contrato_id is not null and situacao = 'PRONTO';
create index anexos_conta on anexos (conta_id, concluido_em desc) where conta_id is not null and situacao = 'PRONTO';
create index anexos_pagamento on anexos (pagamento_id, concluido_em desc) where pagamento_id is not null and situacao = 'PRONTO';
create index anexos_escritorio on anexos (escritorio_id, criado_em);
call proteger_tabela_escritorio('anexos');

-- Guardar tudo: não se apaga, e a única mudança é ENVIANDO → PRONTO.
create function anexo_so_conclui() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Anexo não se apaga' using errcode = 'TC023';
  end if;
  if old.situacao <> 'ENVIANDO' or new.situacao <> 'PRONTO'
     or (to_jsonb(new) - array['situacao', 'concluido_em']) <> (to_jsonb(old) - array['situacao', 'concluido_em']) then
    raise exception 'Anexo só muda de enviando para pronto' using errcode = 'TC023';
  end if;
  return new;
end $$;
create trigger anexo_so_conclui before update or delete on anexos
  for each row execute function anexo_so_conclui();

insert into inventario_dados (tabela, dado_pessoal, o_que, para_que, base_legal, controlador, prazo, no_fim, situacao, exportar) values
 ('anexos', true, 'Arquivos do contrato assinado e das notas, guias, boletos e comprovantes do Financeiro (o arquivo fica no Storage), com quem enviou e quando',
  'Guardar o contrato assinado (CH-01) e o que comprova cada lançamento, inclusive para o contador (FI-18, FI-21)',
  'Execução de contrato (LGPD, art. 7º, V), obrigação legal (art. 7º, II) e exercício regular de direitos (art. 7º, VI)',
  'Escritório', 'Enquanto o escritório for cliente do T3jus e 5 anos depois do fim do contrato', 'Exportados ao escritório e apagados com ele, com o arquivo', 'APROVADO', true);

create function anexo_linha(a anexos) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', a.id, 'categoria', a.categoria, 'nome', a.nome, 'tipo', a.tipo, 'tamanho', a.tamanho,
    'donoId', coalesce(a.contrato_id, a.conta_id, a.pagamento_id),
    'enviadoPor', pessoa_ref(a.enviado_por), 'enviadoEm', a.concluido_em)
$$;

-- A área e a ação de cada dono: o contrato é de Contratos; a conta e o recebimento, do Financeiro.
create function anexo_entrar(p_pessoa uuid, p_escritorio uuid, p_dono text, p_editar boolean) returns void
language plpgsql
set search_path = public
as $$
begin
  if p_dono = 'CONTRATO' then
    perform entrar_area(p_pessoa, p_escritorio, 'CONTRATOS');
    perform entrar_escritorio(p_pessoa, p_escritorio, case when p_editar then 'contratos.editar' else 'contratos.ver' end);
  else
    perform entrar_area(p_pessoa, p_escritorio, 'FINANCEIRO');
    perform entrar_escritorio(p_pessoa, p_escritorio, case when p_editar then 'financeiro.editar' else 'financeiro.ver' end);
  end if;
end $$;

create function anexo_dono(a anexos) returns text
language sql immutable
as $$ select case when a.contrato_id is not null then 'CONTRATO' when a.conta_id is not null then 'CONTA' else 'RECEBIMENTO' end $$;

-- Onde o anexo aparece no histórico: na ficha do contrato, na conta ou na parcela do recebimento.
create function anexo_historico(a anexos, p_acao text) returns void
language plpgsql
set search_path = public
as $$
begin
  if a.contrato_id is not null then
    perform registrar_historico(p_acao, 'contratos', a.contrato_id::text, jsonb_build_object('anexo', a.id, 'categoria', a.categoria));
  elsif a.conta_id is not null then
    perform registrar_historico(p_acao, 'contas_pagar', a.conta_id::text, jsonb_build_object('anexo', a.id, 'categoria', a.categoria));
  else
    perform registrar_historico(p_acao, 'recebimentos_previstos', (select p.parcela_id::text from pagamentos_recebidos p where p.id = a.pagamento_id),
      jsonb_build_object('anexo', a.id, 'categoria', a.categoria, 'pagamento', a.pagamento_id));
  end if;
end $$;

-- Registrar o envio: devolve o id, que vira o nome do arquivo no Storage (<escritório>/<id>).
-- dono: CONTRATO, CONTA ou RECEBIMENTO; donoId: o contrato, a conta ou o recebimento.
create function portal_anexo_iniciar(p_pessoa uuid, p_escritorio uuid, p_dados jsonb) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dono text := p_dados ->> 'dono';
  v_id uuid;
  v_dono_id uuid;
  v_categoria text := p_dados ->> 'categoria';
begin
  if v_dono is null or v_dono not in ('CONTRATO', 'CONTA', 'RECEBIMENTO') then
    perform entrar_escritorio(p_pessoa, p_escritorio, 'escritorio.ver');
    perform recusar_campos('Confira o anexo', 'dono');
  end if;
  perform anexo_entrar(p_pessoa, p_escritorio, v_dono, true);
  begin
    v_dono_id := (p_dados ->> 'donoId')::uuid;
  exception when invalid_text_representation then
    v_dono_id := null;
  end;
  if v_dono = 'CONTRATO' then
    if not exists (select 1 from contratos where id = v_dono_id and escritorio_id = p_escritorio) then
      raise exception 'Contrato não encontrado' using errcode = 'TC404';
    end if;
    v_categoria := 'CONTRATO_ASSINADO';
  elsif v_dono = 'CONTA' then
    if not exists (select 1 from contas_pagar where id = v_dono_id and escritorio_id = p_escritorio) then
      raise exception 'Conta não encontrada' using errcode = 'TC404';
    end if;
    if v_categoria is null or v_categoria not in ('NOTA_FISCAL', 'GUIA', 'BOLETO', 'COMPROVANTE') then
      perform recusar_campos('Diga o que é o arquivo', 'categoria');
    end if;
  else
    if not exists (select 1 from pagamentos_recebidos where id = v_dono_id and escritorio_id = p_escritorio) then
      raise exception 'Recebimento não encontrado' using errcode = 'TC404';
    end if;
    v_categoria := 'COMPROVANTE';
  end if;
  begin
    insert into anexos (escritorio_id, contrato_id, conta_id, pagamento_id, categoria, nome, tipo, tamanho, enviado_por)
    values (p_escritorio,
            case when v_dono = 'CONTRATO' then v_dono_id end,
            case when v_dono = 'CONTA' then v_dono_id end,
            case when v_dono = 'RECEBIMENTO' then v_dono_id end,
            v_categoria, btrim(p_dados ->> 'nome'), p_dados ->> 'tipo', (p_dados ->> 'tamanho')::integer, p_pessoa)
    returning id into v_id;
  exception when check_violation or not_null_violation or invalid_text_representation or numeric_value_out_of_range then
    perform recusar_campos('Arquivo não aceito', 'arquivo');
  end;
  return v_id;
end $$;

-- O anexo a enviar (registrado, ainda não pronto), para a API conferir no Storage.
create function portal_anexo_para_concluir(p_pessoa uuid, p_escritorio uuid, p_anexo uuid)
returns table (tipo text, tamanho integer)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare a anexos;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'escritorio.ver');
  select * into a from anexos x where x.id = p_anexo and x.escritorio_id = p_escritorio and x.enviado_por = p_pessoa;
  if a.id is null then raise exception 'Anexo não encontrado' using errcode = 'TC404'; end if;
  perform anexo_entrar(p_pessoa, p_escritorio, anexo_dono(a), true);
  return query select a.tipo, a.tamanho;
end $$;

-- Concluir: a API já conferiu no Storage que o arquivo chegou com o tamanho e o tipo
-- registrados. Só quem iniciou conclui.
create function portal_anexo_concluir(p_pessoa uuid, p_escritorio uuid, p_anexo uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare a anexos;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'escritorio.ver');
  select * into a from anexos where id = p_anexo and escritorio_id = p_escritorio and enviado_por = p_pessoa for update;
  if a.id is null then raise exception 'Anexo não encontrado' using errcode = 'TC404'; end if;
  perform anexo_entrar(p_pessoa, p_escritorio, anexo_dono(a), true);
  if a.situacao = 'ENVIANDO' then
    update anexos set situacao = 'PRONTO', concluido_em = app_now() where id = a.id returning * into a;
    perform anexo_historico(a, 'anexo.enviado');
  end if;
  return anexo_linha(a);
end $$;

-- Abrir: confere a área e devolve o nome (para o download); a API gera o link temporário.
-- Cada abertura fica no histórico do escritório.
create function portal_anexo_abrir(p_pessoa uuid, p_escritorio uuid, p_anexo uuid) returns text
language plpgsql
security definer
set search_path = public
as $$
declare a anexos;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'escritorio.ver');
  select * into a from anexos where id = p_anexo and escritorio_id = p_escritorio and situacao = 'PRONTO';
  if a.id is null then raise exception 'Anexo não encontrado' using errcode = 'TC404'; end if;
  perform anexo_entrar(p_pessoa, p_escritorio, anexo_dono(a), false);
  perform anexo_historico(a, 'anexo.aberto');
  return a.nome;
end $$;

-- ---------------------------------------------------------------------------------------
-- Leituras.

-- Os assinados de um contrato, do mais novo ao mais antigo (vale o primeiro).
create function portal_contrato_anexos(p_pessoa uuid, p_escritorio uuid, p_contrato uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform anexo_entrar(p_pessoa, p_escritorio, 'CONTRATO', false);
  if not exists (select 1 from contratos where id = p_contrato and escritorio_id = p_escritorio) then
    raise exception 'Contrato não encontrado' using errcode = 'TC404';
  end if;
  return jsonb_build_object('anexos', coalesce((
    select jsonb_agg(anexo_linha(a) order by a.concluido_em desc, a.id)
      from anexos a where a.contrato_id = p_contrato and a.situacao = 'PRONTO'), '[]'::jsonb));
end $$;

-- Os anexos das contas e dos recebimentos que a tela está mostrando (até 500 de cada).
create function portal_financeiro_anexos(p_pessoa uuid, p_escritorio uuid, p_contas uuid[], p_pagamentos uuid[]) returns jsonb
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
     where a.escritorio_id = p_escritorio and a.situacao = 'PRONTO'
       and (a.conta_id = any (coalesce(p_contas, '{}')) or a.pagamento_id = any (coalesce(p_pagamentos, '{}')))), '[]'::jsonb));
end $$;

-- Para a exportação do mês (FI-21): as despesas pagas sem nota, guia, boleto ou comprovante, e
-- os anexos que comprovam os lançamentos do mês.
create function portal_financeiro_exportacao_anexos(p_pessoa uuid, p_escritorio uuid, p_mes text) returns jsonb
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
                         where a.escritorio_id = p_escritorio and a.situacao = 'PRONTO'
                           and (a.conta_id in (select c.id from contas_pagar c where c.escritorio_id = p_escritorio and c.paga_em between v_mes and v_fm)
                                or a.pagamento_id in (select p.id from pagamentos_recebidos p where p.escritorio_id = p_escritorio
                                                        and p.caixa = 'ESCRITORIO' and p.recebido_em between v_mes and v_fm))), '[]'::jsonb));
end $$;

call fechar_acesso();
