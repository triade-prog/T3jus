-- Jornada do cliente, parte 5 (AP-07, F3.130), desenho aprovado em
-- docs/design/aprovadas/portal-jornada-fechamento (grupo 7, decisões 30 a 32; nota técnica 7 e 8):
-- 1. "Cadastrar como cliente" na conversa: o Novo cliente lê o nome e o telefone da conversa
--    (portal_conversa_contato) e o cadastro, com conversaId, liga a conversa à ficha na mesma
--    transação. Os compromissos marcados com a conversa passam para a ficha.
-- 2. "Marcar primeira reunião" na conversa: o compromisso guarda a conversa (conversa_id) quando
--    a pessoa ainda não é cliente. O "lembrar pelo WhatsApp" fica guardado e começa quando ela
--    for cadastrada, porque o motor de lembretes trabalha com a ficha (F3.137 fica pendente para
--    o lembrete sair antes do cadastro, pelo número da conversa).

alter table compromissos add column conversa_id uuid references conversas (id) on delete restrict;
create index compromissos_conversa on compromissos (conversa_id) where conversa_id is not null;
alter table compromissos drop constraint compromissos_check3;
alter table compromissos add constraint compromissos_lembrete_quem
  check (cliente_id is not null or conversa_id is not null or not lembrete_cliente);

-- ---------------------------------------------------------------------------------------
-- O contato da conversa, para preencher o cadastro e o "Com quem" da reunião.
create function portal_conversa_contato(p_pessoa uuid, p_escritorio uuid, p_conversa uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c conversas;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'conversas.ver');
  select * into c from conversas where id = p_conversa and escritorio_id = p_escritorio;
  if c.id is null then raise exception 'Conversa não encontrada' using errcode = 'TC404'; end if;
  return jsonb_build_object('id', c.id, 'nome', c.nome_contato, 'telefone', c.telefone,
    'clienteId', (select k.id from clientes_escritorio k where k.id = c.cliente_id and k.estado <> 'EXCLUIDO'),
    'responsavel', pessoa_ref(c.responsavel_id));
end $$;

-- ---------------------------------------------------------------------------------------
-- 1. O cadastro pela conversa.
alter function portal_cliente_cadastrar(uuid, uuid, jsonb) rename to portal_cliente_cadastrar_sem_conversa;

create function portal_cliente_cadastrar(p_pessoa uuid, p_escritorio uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conversa uuid;
  c conversas;
  r jsonb;
  v_cli uuid;
  v_contato jsonb;
  v_compromissos integer;
begin
  if jsonb_typeof(p_dados) is distinct from 'object' or nullif(p_dados ->> 'conversaId', '') is null then
    return portal_cliente_cadastrar_sem_conversa(p_pessoa, p_escritorio, case when jsonb_typeof(p_dados) = 'object' then p_dados - 'conversaId' else p_dados end);
  end if;
  perform entrar_escritorio(p_pessoa, p_escritorio, 'clientes.editar');
  begin
    v_conversa := (p_dados ->> 'conversaId')::uuid;
  exception when others then perform recusar_campos('Confira a conversa', 'conversaId');
  end;
  select * into c from conversas where id = v_conversa and escritorio_id = p_escritorio for update;
  if c.id is null then raise exception 'Conversa não encontrada' using errcode = 'TC404'; end if;
  if c.cliente_id is not null and exists (select 1 from clientes_escritorio k where k.id = c.cliente_id and k.estado <> 'EXCLUIDO') then
    perform recusar_motivo('Esta conversa já está ligada a um cliente', 'CONVERSA_JA_LIGADA');
  end if;

  r := portal_cliente_cadastrar_sem_conversa(p_pessoa, p_escritorio, p_dados - 'conversaId');
  v_cli := (r ->> 'id')::uuid;
  -- Quem escreve é o contato da ficha nova com o número da conversa, quando houver.
  select k into v_contato from clientes_escritorio x, jsonb_array_elements(x.contatos) k
   where x.id = v_cli and k ->> 'telefone' = c.telefone limit 1;
  update conversas
     set cliente_id = v_cli, contato_id = v_contato ->> 'id',
         nome_contato = coalesce(v_contato ->> 'nome', nome_contato),
         papel_contato = case when v_contato is null then papel_contato else nullif(btrim(coalesce(v_contato ->> 'papel', '')), '') end
   where id = c.id;
  -- A primeira reunião marcada com a conversa passa para a ficha (e o lembrete começa).
  update compromissos set cliente_id = v_cli
   where escritorio_id = p_escritorio and conversa_id = c.id and cliente_id is null;
  get diagnostics v_compromissos = row_count;
  perform registrar_historico('cliente.da_conversa', 'cliente', v_cli::text,
    jsonb_build_object('conversa', c.id, 'compromissos', v_compromissos));
  return r || jsonb_build_object('conversaId', c.id);
end $$;

-- ---------------------------------------------------------------------------------------
-- 2. A reunião com a conversa. A conversa já ligada a uma ficha vale como o cliente.
create function compromisso_conversa_pedida(p_escritorio uuid, p_dados jsonb) returns conversas
language plpgsql
set search_path = public
as $$
declare
  c conversas;
  v_id uuid;
begin
  if jsonb_typeof(p_dados) is distinct from 'object' or nullif(p_dados ->> 'conversaId', '') is null then return null; end if;
  begin
    v_id := (p_dados ->> 'conversaId')::uuid;
  exception when others then perform recusar_campos('Confira a conversa', 'conversaId');
  end;
  select * into c from conversas where id = v_id and escritorio_id = p_escritorio;
  if c.id is null then perform recusar_campos('Esta conversa não é deste escritório', 'conversaId'); end if;
  return c;
end $$;

alter function portal_compromisso_marcar(uuid, uuid, jsonb) rename to portal_compromisso_marcar_sem_conversa;

create function portal_compromisso_marcar(p_pessoa uuid, p_escritorio uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c conversas;
  r jsonb;
  v_lembrete boolean;
  v_versao integer;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'agenda.editar');
  c := compromisso_conversa_pedida(p_escritorio, p_dados);
  if c.id is null then
    return portal_compromisso_marcar_sem_conversa(p_pessoa, p_escritorio, case when jsonb_typeof(p_dados) = 'object' then p_dados - 'conversaId' else p_dados end);
  end if;
  if nullif(p_dados ->> 'clienteId', '') is null and c.cliente_id is not null then
    p_dados := p_dados || jsonb_build_object('clienteId', c.cliente_id);
  end if;
  v_lembrete := coalesce((p_dados ->> 'lembrete')::boolean, false) and p_dados ->> 'tipo' is distinct from 'INTERNO';
  r := portal_compromisso_marcar_sem_conversa(p_pessoa, p_escritorio, p_dados - 'conversaId');
  update compromissos
     set conversa_id = c.id,
         lembrete_cliente = case when cliente_id is null then v_lembrete else lembrete_cliente end
   where id = (r ->> 'id')::uuid
  returning versao into v_versao;
  return r || jsonb_build_object('versao', v_versao);
end $$;

-- Editar uma reunião com a conversa, antes do cadastro, não perde o lembrete pedido.
alter function portal_compromisso_editar(uuid, uuid, uuid, integer, jsonb, text) rename to portal_compromisso_editar_sem_conversa;

create function portal_compromisso_editar(p_pessoa uuid, p_escritorio uuid, p_compromisso uuid, p_versao integer,
                                          p_dados jsonb, p_motivo text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  a compromissos;
  r jsonb;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'agenda.editar');
  r := portal_compromisso_editar_sem_conversa(p_pessoa, p_escritorio, p_compromisso, p_versao,
         case when jsonb_typeof(p_dados) = 'object' then p_dados - 'conversaId' else p_dados end, p_motivo);
  select * into a from compromissos where id = p_compromisso and escritorio_id = p_escritorio;
  if a.conversa_id is not null and a.cliente_id is null
     and a.lembrete_cliente is distinct from (coalesce((p_dados ->> 'lembrete')::boolean, false) and a.tipo <> 'INTERNO') then
    update compromissos set lembrete_cliente = not lembrete_cliente where id = a.id returning versao into a.versao;
    r := r || jsonb_build_object('versao', a.versao);
  end if;
  return r;
end $$;

-- A Agenda e a ficha do compromisso mostram "Com quem" quando ainda não há ficha.
create or replace function compromisso_linha(c compromissos) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', c.id, 'tipo', c.tipo, 'tipoEscrito', c.tipo_escrito, 'titulo', c.titulo, 'inicio', c.inicio, 'fim', c.fim,
    'modalidade', c.modalidade, 'local', c.local, 'situacao', c.estado, 'lembrete', c.lembrete_cliente,
    'responsavel', pessoa_ref(c.responsavel_id),
    'tambemVai', coalesce((select jsonb_agg(pessoa_ref(t) order by o) from unnest(c.tambem_vai) with ordinality u(t, o)), '[]'::jsonb),
    'cliente', (select jsonb_build_object('id', k.id, 'nome', k.nome) from clientes_escritorio k where k.id = c.cliente_id),
    'conversa', (select jsonb_build_object('id', v.id, 'nome', coalesce(v.nome_contato, v.telefone), 'telefone', v.telefone)
                   from conversas v where v.id = c.conversa_id and c.cliente_id is null))
$$;

call fechar_acesso();
