-- 0550 · Por que o primeiro contato não recebeu proposta (AP-03, F3.8).
-- Desenho aprovado pela Carol em 21/11/2026: docs/design/aprovadas/portal-comercial-financeiro-pendencias
-- (seção 1, estados fu-*; decisões 1 a 10; perguntas 1 e 2).
-- - Dois motivos só, os que o Funil já conta (NAO_PEGOU, NAO_VOLTOU), com uma anotação opcional.
-- - "Encerrar sem proposta" vale para quem ainda não recebeu proposta enviada; rascunho não impede
--   e fica guardado (pergunta 2).
-- - "Voltar ao funil" desfaz; a marcação de antes fica guardada (PT-03).
-- - clientes_escritorio.funil_motivo e funil_encerrado_em (0190) seguem como o que vale agora, e o
--   Funil já os conta. Cada marcação vira uma linha de funil_saidas, com quem, quando e a anotação.

create table funil_saidas (
  id             uuid primary key default gen_random_uuid(),
  escritorio_id  uuid not null references escritorios (id) on delete restrict,
  cliente_id     uuid not null references clientes_escritorio (id) on delete restrict,
  motivo         text not null check (motivo in ('NAO_PEGOU', 'NAO_VOLTOU')),
  nota           text check (length(btrim(nota)) between 1 and 300),
  marcado_por    uuid not null references pessoas (id) on delete restrict,
  marcado_em     timestamptz not null default app_now(),
  voltou_por     uuid references pessoas (id) on delete restrict,
  voltou_em      timestamptz,
  check ((voltou_por is null) = (voltou_em is null))
);
-- Uma saída aberta por cliente.
create unique index funil_saidas_aberta on funil_saidas (cliente_id) where voltou_em is null;
create index funil_saidas_escritorio on funil_saidas (escritorio_id, marcado_em desc);
call proteger_tabela_escritorio('funil_saidas');

-- Só se acrescenta e se marca a volta: nada muda o motivo, a anotação nem quem marcou.
create function funil_saidas_guardiao() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'A saída do funil não se apaga' using errcode = 'TC023';
  end if;
  if new.motivo is distinct from old.motivo or new.nota is distinct from old.nota or new.marcado_por is distinct from old.marcado_por
     or new.marcado_em is distinct from old.marcado_em or new.cliente_id is distinct from old.cliente_id
     or (old.voltou_em is not null) then
    raise exception 'A saída do funil só ganha a volta' using errcode = 'TC023';
  end if;
  return new;
end $$;
create trigger funil_saidas_guardiao before update or delete on funil_saidas
  for each row execute function funil_saidas_guardiao();

insert into inventario_dados (tabela, dado_pessoal, o_que, para_que, base_legal, controlador, prazo, no_fim, situacao, exportar) values
 ('funil_saidas', true,
  'Primeiros contatos que saíram do funil sem proposta: o motivo, a anotação, quem marcou e quando, e a volta',
  'Contar por que o primeiro contato não recebeu proposta (AP-03)',
  'Procedimentos preliminares a contrato, a pedido do titular (LGPD, art. 7º, V)', 'Escritório',
  'Enquanto o escritório for cliente do T3jus',
  'Exportados ao escritório e apagados com ele', 'APROVADO', true);

-- A saída de um cliente em JSON (para a lista e a ficha).
create function funil_saida_json(s funil_saidas) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'id', s.id, 'motivo', s.motivo, 'nota', s.nota, 'marcadoPor', pessoa_ref(s.marcado_por), 'marcadoEm', s.marcado_em,
    'voltouPor', pessoa_ref(s.voltou_por), 'voltouEm', s.voltou_em))
$$;

-- O cliente pode sair do funil? Ativo, sem proposta enviada e ainda no funil.
create function funil_cliente_para_encerrar(p_escritorio uuid, p_cliente uuid) returns clientes_escritorio
language plpgsql
set search_path = public
as $$
declare
  c clientes_escritorio;
begin
  select * into c from clientes_escritorio where id = p_cliente and escritorio_id = p_escritorio for update;
  if not found then raise exception 'Cliente não encontrado' using errcode = 'TC404'; end if;
  if c.estado <> 'ATIVO' then perform recusar_motivo('Só cliente ativo sai do funil', 'CLIENTE_NAO_ATIVO'); end if;
  if exists (select 1 from propostas p where p.cliente_id = c.id and p.estado <> 'RASCUNHO') then
    perform recusar_motivo('O cliente já recebeu proposta', 'JA_RECEBEU_PROPOSTA');
  end if;
  return c;
end $$;

-- Encerrar sem proposta. PUT /v1/escritorio/clientes/:id/funil
create function portal_funil_encerrar(p_pessoa uuid, p_escritorio uuid, p_cliente uuid, p_motivo text, p_nota text default null) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c clientes_escritorio;
  s funil_saidas;
  v_nota text := nullif(btrim(coalesce(p_nota, '')), '');
begin
  perform entrar_area(p_pessoa, p_escritorio, 'COMERCIAL');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'propostas.editar');
  if p_motivo is null or p_motivo not in ('NAO_PEGOU', 'NAO_VOLTOU') then perform recusar_campos('Escolha o motivo', 'motivo'); end if;
  if length(v_nota) > 300 then perform recusar_campos('A anotação vai até 300 caracteres', 'nota'); end if;
  c := funil_cliente_para_encerrar(p_escritorio, p_cliente);
  if c.funil_motivo is not null then perform recusar_motivo('O cliente já saiu do funil', 'JA_FORA_DO_FUNIL'); end if;
  insert into funil_saidas (escritorio_id, cliente_id, motivo, nota, marcado_por)
  values (p_escritorio, c.id, p_motivo, v_nota, p_pessoa) returning * into s;
  update clientes_escritorio set funil_motivo = p_motivo, funil_encerrado_em = s.marcado_em where id = c.id;
  perform registrar_historico('comercial.funil_encerrado', 'clientes_escritorio', c.id::text,
                              jsonb_build_object('saida_id', s.id, 'motivo', p_motivo));
  return funil_saida_json(s);
end $$;

-- Voltar ao funil. POST /v1/escritorio/clientes/:id/funil/voltar
create function portal_funil_voltar(p_pessoa uuid, p_escritorio uuid, p_cliente uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c clientes_escritorio;
  s funil_saidas;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'COMERCIAL');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'propostas.editar');
  select * into c from clientes_escritorio where id = p_cliente and escritorio_id = p_escritorio for update;
  if not found then raise exception 'Cliente não encontrado' using errcode = 'TC404'; end if;
  if c.funil_motivo is null then perform recusar_motivo('O cliente já está no funil', 'JA_NO_FUNIL'); end if;
  update funil_saidas set voltou_por = p_pessoa, voltou_em = app_now()
   where cliente_id = c.id and voltou_em is null returning * into s;
  update clientes_escritorio set funil_motivo = null, funil_encerrado_em = null where id = c.id;
  perform registrar_historico('comercial.funil_reaberto', 'clientes_escritorio', c.id::text,
                              jsonb_build_object('saida_id', s.id, 'motivo', c.funil_motivo));
  return coalesce(funil_saida_json(s), '{}'::jsonb);
end $$;

-- A situação do cliente no funil, para a ficha (folha "No funil do Comercial" e as linhas do
-- histórico de atendimento). GET /v1/escritorio/clientes/:id/funil
create function portal_cliente_funil(p_pessoa uuid, p_escritorio uuid, p_cliente uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c clientes_escritorio;
  v_situacao text;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'COMERCIAL');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'propostas.ver');
  select * into c from clientes_escritorio where id = p_cliente and escritorio_id = p_escritorio;
  if not found then raise exception 'Cliente não encontrado' using errcode = 'TC404'; end if;
  v_situacao := case
    when exists (select 1 from propostas p where p.cliente_id = c.id and p.estado = 'CONTRATO') then 'CONTRATO'
    when exists (select 1 from propostas p where p.cliente_id = c.id and p.estado <> 'RASCUNHO') then 'PROPOSTA'
    when c.funil_motivo is not null then 'FORA'
    else 'PRIMEIRO' end;
  return jsonb_build_object(
    'situacao', v_situacao,
    'podeEncerrar', v_situacao = 'PRIMEIRO' and c.estado = 'ATIVO'
                    and pode(p_pessoa, p_escritorio, 'propostas.editar'),
    'rascunho', exists (select 1 from propostas p where p.cliente_id = c.id and p.estado = 'RASCUNHO'),
    'saida', (select funil_saida_json(s) from funil_saidas s where s.cliente_id = c.id and s.voltou_em is null),
    'eventos', coalesce((select jsonb_agg(funil_saida_json(s) order by s.marcado_em desc) from funil_saidas s where s.cliente_id = c.id), '[]'::jsonb));
end $$;

-- O Funil ganha a lista "Saíram sem proposta" do período (as 6 mais recentes e o total) e
-- quantos recusaram, para a barra "Onde os N pararam".
alter function portal_comercial_funil(uuid, uuid, text) rename to comercial_funil_sem_saidas;

create function portal_comercial_funil(p_pessoa uuid, p_escritorio uuid, p_periodo text default '90') returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v jsonb := comercial_funil_sem_saidas(p_pessoa, p_escritorio, p_periodo);
  v_ini timestamptz := (v ->> 'de')::date::timestamp at time zone 'America/Sao_Paulo';
begin
  return v || jsonb_build_object('sairam', (
    with s as (
      select x as saida, k.nome, x.marcado_em from funil_saidas x join clientes_escritorio k on k.id = x.cliente_id
       where x.escritorio_id = p_escritorio and x.voltou_em is null and k.criado_em >= v_ini and k.estado <> 'EXCLUIDO'
         and not exists (select 1 from propostas p where p.cliente_id = k.id and p.estado <> 'RASCUNHO'))
    select jsonb_build_object(
      'total', (select count(*) from s),
      'itens', coalesce((select jsonb_agg(funil_saida_json(y.saida) || jsonb_build_object('clienteId', (y.saida).cliente_id, 'nome', y.nome) order by y.marcado_em desc)
                           from (select * from s order by marcado_em desc limit 50) y), '[]'::jsonb))));
end $$;

-- Atendimentos: quem está "Sem próximo contato" e ainda pode sair do funil ganha o botão
-- "Encerrar sem proposta" (decisão 2).
alter function portal_comercial_retornos(uuid, uuid, uuid) rename to comercial_retornos_sem_funil;

create function portal_comercial_retornos(p_pessoa uuid, p_escritorio uuid, p_responsavel uuid default null) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v jsonb := comercial_retornos_sem_funil(p_pessoa, p_escritorio, p_responsavel);
begin
  return jsonb_set(v, '{grupos,semData}', coalesce((
    select jsonb_agg(x || jsonb_build_object('podeSairDoFunil',
             k.estado = 'ATIVO' and k.funil_motivo is null
             and not exists (select 1 from propostas p where p.cliente_id = k.id and p.estado <> 'RASCUNHO')) order by o)
      from jsonb_array_elements(v -> 'grupos' -> 'semData') with ordinality e(x, o)
      left join clientes_escritorio k on k.id = (x ->> 'clienteId')::uuid and k.escritorio_id = p_escritorio), '[]'::jsonb));
end $$;

call fechar_acesso();
