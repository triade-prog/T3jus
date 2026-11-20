-- Ficha do cliente › "não receber avisos" (F3.63; PA-03, PT-03). Tela aprovada em
-- docs/design/aprovadas/portal-sem-avisos-sino (sem-avisos.html). O pedido passa a guardar quem
-- pediu (o próprio cliente, um contato da ficha ou outra pessoa), como pediu (WhatsApp, telefone,
-- pessoalmente ou e-mail) e o dia em que pediu, que pode ser anterior ao registro e nunca depois
-- de hoje. Retirar o pedido guarda também quem pediu para voltar e como. Toda a equipe registra
-- e retira (Conversas é comum a todos); nada se apaga.

alter table clientes_sem_avisos
  add column quem         text check (quem in ('CLIENTE', 'CONTATO', 'OUTRA')),
  add column contato_id   text check (contato_id ~ '^[0-9a-f-]{36}$'),
  add column quem_papel   text check (length(btrim(quem_papel)) between 1 and 80),
  add column canal        text check (canal in ('WHATSAPP', 'TELEFONE', 'PRESENCIAL', 'EMAIL')),
  add column registrado_em timestamptz,
  add column retirado_quem        text check (retirado_quem in ('CLIENTE', 'CONTATO', 'OUTRA')),
  add column retirado_contato_id  text check (retirado_contato_id ~ '^[0-9a-f-]{36}$'),
  add column retirado_quem_pediu  text check (length(btrim(retirado_quem_pediu)) between 1 and 120),
  add column retirado_quem_papel  text check (length(btrim(retirado_quem_papel)) between 1 and 80),
  add column retirado_canal       text check (retirado_canal in ('WHATSAPP', 'TELEFONE', 'PRESENCIAL', 'EMAIL'));

-- Os pedidos de antes desta mudança foram registrados na hora em que chegaram.
update clientes_sem_avisos set registrado_em = pedido_em where registrado_em is null;
alter table clientes_sem_avisos alter column registrado_em set not null, alter column registrado_em set default app_now();
alter table clientes_sem_avisos add check (pedido_em <= registrado_em);

-- Quem pediu, a partir do que a tela manda: o próprio cliente, um contato da ficha (pelo id) ou
-- outra pessoa (nome e o que é do cliente, escritos à mão).
create function sem_avisos_quem(c clientes_escritorio, p_quem text, p_contato text, p_nome text,
                                out quem text, out contato_id text, out nome text, out papel text)
language plpgsql
stable
set search_path = public
as $$
declare k jsonb;
begin
  quem := p_quem;
  if p_quem = 'CLIENTE' then
    nome := c.nome;
    papel := case when c.tipo = 'PJ' then 'A própria empresa' else 'Titular' end;
  elsif p_quem = 'CONTATO' then
    select x into k from jsonb_array_elements(c.contatos) x where x ->> 'id' = p_contato;
    if k is null then
      raise exception 'Escolha quem pediu' using errcode = 'TC422',
        detail = jsonb_build_object('campos', jsonb_build_array('quem'), 'motivo', 'QUEM_PEDIU_OBRIGATORIO')::text;
    end if;
    contato_id := k ->> 'id';
    nome := k ->> 'nome';
    papel := nullif(concat_ws(' · ', nullif(btrim(coalesce(k ->> 'papel', '')), ''),
                              case when (k ->> 'principal')::boolean then 'contato principal' end), '');
  elsif p_quem = 'OUTRA' then
    nome := nullif(btrim(coalesce(p_nome, '')), '');
    if nome is null then
      raise exception 'Escreva o nome de quem pediu e o que a pessoa é do cliente' using errcode = 'TC422',
        detail = jsonb_build_object('campos', jsonb_build_array('quemPediu'), 'motivo', 'QUEM_PEDIU_OBRIGATORIO')::text;
    end if;
    if length(nome) > 120 then perform recusar_campos('Escreva até 120 caracteres', 'quemPediu'); end if;
  else
    raise exception 'Escolha quem pediu' using errcode = 'TC422',
      detail = jsonb_build_object('campos', jsonb_build_array('quem'), 'motivo', 'QUEM_PEDIU_OBRIGATORIO')::text;
  end if;
end $$;

-- Um pedido na ficha: o tipo, quem pediu, como, o dia e quem registrou (e, se retirado, o mesmo
-- da retirada).
create function sem_avisos_json(s clientes_sem_avisos) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', s.id, 'tipo', s.tipo, 'origem', s.origem, 'canal', s.canal,
    'quem', s.quem, 'contatoId', s.contato_id, 'quemPediu', s.quem_pediu, 'quemPapel', s.quem_papel,
    'pedidoEm', s.pedido_em, 'registradoEm', s.registrado_em, 'registradoPor', pessoa_ref(s.registrado_por),
    'retirada', case when s.retirado_em is not null then jsonb_build_object(
      'em', s.retirado_em, 'por', pessoa_ref(s.retirado_por), 'quem', s.retirado_quem, 'contatoId', s.retirado_contato_id,
      'quemPediu', s.retirado_quem_pediu, 'quemPapel', s.retirado_quem_papel, 'canal', s.retirado_canal) end)
$$;

-- O que a ficha mostra: o pedido que vale agora e o histórico (o mais novo primeiro). Quem abre a
-- ficha vê; não traz valor nem parcela, só o tipo de aviso.
create function portal_cliente_avisos(p_pessoa uuid, p_escritorio uuid, p_cliente uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'clientes.ver');
  if not exists (select 1 from clientes_escritorio where id = p_cliente and escritorio_id = p_escritorio) then
    raise exception 'Cliente não encontrado' using errcode = 'TC404';
  end if;
  return jsonb_build_object(
    'ativo', (select sem_avisos_json(s) from clientes_sem_avisos s
               where s.escritorio_id = p_escritorio and s.cliente_id = p_cliente and s.retirado_em is null),
    'historico', coalesce((select jsonb_agg(sem_avisos_json(s) order by s.registrado_em desc, s.id)
                             from clientes_sem_avisos s where s.escritorio_id = p_escritorio and s.cliente_id = p_cliente), '[]'::jsonb),
    'podeMudar', not exists (select 1 from clientes_escritorio where id = p_cliente and estado = 'EXCLUIDO'));
end $$;

-- Registrar, mudar ou retirar o pedido. Mudar retira o que vale e registra o novo (os dois ficam
-- no histórico). Pela conversa, sem dizer quem nem como, vale o que a conversa já sabe: pelo
-- WhatsApp, com o nome escrito (o atalho da conversa ainda vai ganhar a janela desenhada).
create or replace function portal_cliente_sem_avisos(p_pessoa uuid, p_escritorio uuid, p_cliente uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c clientes_escritorio;
  q_quem text; q_contato text; q_nome text; q_papel text;
  v_id uuid;
  v_origem text := coalesce(p_dados ->> 'origem', '');
  v_canal text := p_dados ->> 'canal';
  v_dia date;
  v_quem text := p_dados ->> 'quem';
  v_ativo clientes_sem_avisos;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'conversas.editar');
  perform portal_exigir_escrita(p_pessoa, p_escritorio);
  select * into c from clientes_escritorio where id = p_cliente and escritorio_id = p_escritorio;
  if c.id is null then raise exception 'Cliente não encontrado' using errcode = 'TC404'; end if;
  if c.estado = 'EXCLUIDO' then perform recusar_motivo('Os dados deste cliente foram excluídos a pedido do titular', 'CLIENTE_EXCLUIDO'); end if;
  if v_quem is null and v_origem = 'CONVERSA' and nullif(btrim(coalesce(p_dados ->> 'quemPediu', '')), '') is not null then v_quem := 'OUTRA'; end if;
  if v_canal is null and v_origem = 'CONVERSA' then v_canal := 'WHATSAPP'; end if;
  if v_canal is not null and v_canal not in ('WHATSAPP', 'TELEFONE', 'PRESENCIAL', 'EMAIL') then perform recusar_campos('Diga como pediu', 'canal'); end if;
  select * into v_ativo from clientes_sem_avisos where escritorio_id = p_escritorio and cliente_id = p_cliente and retirado_em is null;

  if coalesce((p_dados ->> 'retirar')::boolean, false) then
    if v_ativo.id is null then perform recusar_motivo('O cliente já recebe os avisos', 'SEM_PEDIDO'); end if;
    if v_canal is null then perform recusar_campos('Diga como pediu', 'canal'); end if;
    select x.quem, x.contato_id, x.nome, x.papel into q_quem, q_contato, q_nome, q_papel
      from sem_avisos_quem(c, v_quem, p_dados ->> 'contatoId', p_dados ->> 'quemPediu') x;
    update clientes_sem_avisos
       set retirado_em = app_now(), retirado_por = p_pessoa, retirado_quem = q_quem, retirado_contato_id = q_contato,
           retirado_quem_pediu = q_nome, retirado_quem_papel = q_papel, retirado_canal = v_canal
     where id = v_ativo.id;
    perform registrar_historico('cliente.avisos_voltaram', 'clientes_escritorio', p_cliente::text, jsonb_build_object('canal', v_canal));
    return jsonb_build_object('semAvisos', null);
  end if;

  if coalesce(p_dados ->> 'tipo', '') not in ('TODOS', 'COBRANCA') then perform recusar_campos('Escolha o que o cliente não quer receber', 'tipo'); end if;
  if v_origem not in ('CONVERSA', 'FICHA') then perform recusar_campos('Diga por onde o cliente pediu', 'origem'); end if;
  if v_origem = 'FICHA' and v_canal is null then perform recusar_campos('Diga como pediu', 'canal'); end if;
  if v_quem is not null or v_origem = 'FICHA' then
    select x.quem, x.contato_id, x.nome, x.papel into q_quem, q_contato, q_nome, q_papel
      from sem_avisos_quem(c, v_quem, p_dados ->> 'contatoId', p_dados ->> 'quemPediu') x;
  end if;
  begin
    v_dia := nullif(p_dados ->> 'pedidoEm', '')::date;
  exception when others then perform recusar_campos('Escreva a data como dd/mm/aaaa', 'pedidoEm');
  end;
  if v_dia > hoje_brasilia() then
    raise exception 'A data não pode ser depois de hoje' using errcode = 'TC422',
      detail = jsonb_build_object('campos', jsonb_build_array('pedidoEm'), 'motivo', 'DATA_NO_FUTURO')::text;
  end if;
  if v_dia < hoje_brasilia() - 365 then perform recusar_campos('A data é de mais de um ano atrás', 'pedidoEm'); end if;

  if v_ativo.id is not null then
    update clientes_sem_avisos set retirado_em = app_now(), retirado_por = p_pessoa where id = v_ativo.id;
  end if;
  insert into clientes_sem_avisos (escritorio_id, cliente_id, tipo, origem, quem, contato_id, quem_pediu, quem_papel, canal,
                                   pedido_em, registrado_por)
  values (p_escritorio, p_cliente, p_dados ->> 'tipo', v_origem, q_quem, q_contato,
          coalesce(q_nome, nullif(btrim(coalesce(p_dados ->> 'quemPediu', '')), '')), q_papel, v_canal,
          -- O dia de hoje vale com a hora do registro; um dia anterior, ao meio-dia de Brasília.
          case when v_dia is null or v_dia = hoje_brasilia() then app_now()
               else (v_dia + time '12:00') at time zone 'America/Sao_Paulo' end,
          p_pessoa)
  returning id into v_id;
  perform registrar_historico(case when v_ativo.id is null then 'cliente.sem_avisos' else 'cliente.sem_avisos_mudou' end,
                              'clientes_escritorio', p_cliente::text, jsonb_build_object('tipo', p_dados ->> 'tipo', 'canal', v_canal));
  return jsonb_build_object('semAvisos', jsonb_build_object('id', v_id, 'tipo', p_dados ->> 'tipo'));
end $$;

call fechar_acesso();
