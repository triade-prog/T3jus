-- 0620 · O ofício requisitório anexado ao RPV ou precatório a caminho (F3.88; FI-09). Desenho
-- aprovado em docs/design/aprovadas/portal-comercial-financeiro-pendencias (estado rv-registrar:
-- "Ofício requisitório (opcional)", com o PDF anexado na janela de registrar o expedido).
-- - O ofício entra nos anexos do Portal (0520), com um dono novo: a requisição a caminho. O envio é
--   o mesmo: registrar, mandar o arquivo direto ao Storage (bucket documentos-portal, caminho
--   <escritório>/<anexo>) e concluir. É da área Financeiro, como a requisição.
-- - Nada se apaga. Anexar de novo guarda os dois; vale o mais novo, que a folha "A caminho" mostra.

alter table anexos add column requisicao_id uuid references requisicoes_a_caminho (id) on delete restrict;

-- As regras de dono e categoria passam a aceitar a requisição e o ofício.
do $$
declare r record;
begin
  for r in select conname from pg_constraint
            where conrelid = 'anexos'::regclass and contype = 'c'
              and (pg_get_constraintdef(oid) like '%num_nonnulls%' or pg_get_constraintdef(oid) like '%CONTRATO_ASSINADO%')
  loop
    execute format('alter table anexos drop constraint %I', r.conname);
  end loop;
end $$;
alter table anexos add constraint anexos_categoria_check
  check (categoria in ('CONTRATO_ASSINADO', 'NOTA_FISCAL', 'GUIA', 'BOLETO', 'COMPROVANTE', 'OFICIO_REQUISITORIO'));
alter table anexos add constraint anexos_um_dono check (num_nonnulls(contrato_id, conta_id, pagamento_id, requisicao_id) = 1);
alter table anexos add constraint anexos_contrato_assinado check ((contrato_id is not null) = (categoria = 'CONTRATO_ASSINADO'));
alter table anexos add constraint anexos_oficio check ((requisicao_id is not null) = (categoria = 'OFICIO_REQUISITORIO'));
create index anexos_requisicao on anexos (requisicao_id, concluido_em desc) where requisicao_id is not null and situacao = 'PRONTO';

update inventario_dados
   set o_que = 'Contrato assinado, notas, guias, boletos e comprovantes do Financeiro e ofícios requisitórios (arquivo no Storage), com quem enviou e quando'
 where tabela = 'anexos';

create or replace function anexo_linha(a anexos) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', a.id, 'categoria', a.categoria, 'nome', a.nome, 'tipo', a.tipo, 'tamanho', a.tamanho,
    'donoId', coalesce(a.contrato_id, a.conta_id, a.pagamento_id, a.requisicao_id),
    'enviadoPor', pessoa_ref(a.enviado_por), 'enviadoEm', a.concluido_em)
$$;

create or replace function anexo_dono(a anexos) returns text
language sql immutable
as $$ select case when a.contrato_id is not null then 'CONTRATO' when a.conta_id is not null then 'CONTA'
                  when a.requisicao_id is not null then 'REQUISICAO' else 'RECEBIMENTO' end $$;

create or replace function anexo_historico(a anexos, p_acao text) returns void
language plpgsql
set search_path = public
as $$
begin
  if a.contrato_id is not null then
    perform registrar_historico(p_acao, 'contratos', a.contrato_id::text, jsonb_build_object('anexo', a.id, 'categoria', a.categoria));
  elsif a.conta_id is not null then
    perform registrar_historico(p_acao, 'contas_pagar', a.conta_id::text, jsonb_build_object('anexo', a.id, 'categoria', a.categoria));
  elsif a.requisicao_id is not null then
    perform registrar_historico(p_acao, 'requisicoes_a_caminho', a.requisicao_id::text, jsonb_build_object('anexo', a.id, 'categoria', a.categoria));
  else
    perform registrar_historico(p_acao, 'recebimentos_previstos', (select p.parcela_id::text from pagamentos_recebidos p where p.id = a.pagamento_id),
      jsonb_build_object('anexo', a.id, 'categoria', a.categoria, 'pagamento', a.pagamento_id));
  end if;
end $$;

-- Registrar o envio. dono: CONTRATO, CONTA, RECEBIMENTO ou REQUISICAO.
create or replace function portal_anexo_iniciar(p_pessoa uuid, p_escritorio uuid, p_dados jsonb) returns uuid
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
  perform anexo_alguma_area(p_pessoa, p_escritorio);
  if v_dono is null or v_dono not in ('CONTRATO', 'CONTA', 'RECEBIMENTO', 'REQUISICAO') then
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
  elsif v_dono = 'REQUISICAO' then
    if not exists (select 1 from requisicoes_a_caminho where id = v_dono_id and escritorio_id = p_escritorio) then
      raise exception 'Requisição não encontrada' using errcode = 'TC404';
    end if;
    v_categoria := 'OFICIO_REQUISITORIO';
  else
    if not exists (select 1 from pagamentos_recebidos where id = v_dono_id and escritorio_id = p_escritorio) then
      raise exception 'Recebimento não encontrado' using errcode = 'TC404';
    end if;
    v_categoria := 'COMPROVANTE';
  end if;
  begin
    insert into anexos (escritorio_id, contrato_id, conta_id, pagamento_id, requisicao_id, categoria, nome, tipo, tamanho, enviado_por)
    values (p_escritorio,
            case when v_dono = 'CONTRATO' then v_dono_id end,
            case when v_dono = 'CONTA' then v_dono_id end,
            case when v_dono = 'RECEBIMENTO' then v_dono_id end,
            case when v_dono = 'REQUISICAO' then v_dono_id end,
            v_categoria, btrim(p_dados ->> 'nome'), p_dados ->> 'tipo', (p_dados ->> 'tamanho')::integer, p_pessoa)
    returning id into v_id;
  exception when check_violation or not_null_violation or invalid_text_representation or numeric_value_out_of_range then
    perform recusar_campos('Arquivo não aceito', 'arquivo');
  end;
  return v_id;
end $$;

-- A linha da requisição passa a trazer o ofício (o mais novo), para a folha "A caminho".
create or replace function requisicao_linha(r requisicoes_a_caminho) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', r.id, 'tipo', r.tipo, 'tribunal', r.tribunal, 'devedor', r.devedor, 'numero', r.numero,
    'valorRequisitado', r.valor_requisitado, 'parteEscritorio', r.parte_escritorio, 'parteRegra', r.parte_regra,
    'expedidoEm', r.expedido_em, 'estimadaMes', r.estimada_mes, 'situacao', r.situacao, 'levantamentoId', r.levantamento_id,
    'passou', r.situacao = 'A_CAMINHO' and r.estimada_mes < date_trunc('month', hoje_brasilia())::date,
    'criadoEm', r.criado_em,
    'caso', (select jsonb_build_object('id', c.id, 'nome', c.nome, 'parteContraria', c.parte_contraria) from casos c where c.id = r.caso_id),
    'cliente', (select jsonb_build_object('id', k.id, 'nome', k.nome) from clientes_escritorio k where k.id = r.cliente_id),
    'oficio', (select anexo_linha(a) from anexos a where a.requisicao_id = r.id and a.situacao = 'PRONTO'
                order by a.concluido_em desc, a.id limit 1))
$$;

call fechar_acesso();
