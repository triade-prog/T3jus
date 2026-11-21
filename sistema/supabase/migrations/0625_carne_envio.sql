-- Mandar o carnê pelo WhatsApp do escritório (parte do F3.79; FI-23). Desenho aprovado em
-- docs/design/aprovadas/portal-carne (estado carne-whats; decisões 10 e 11; API "envios").
-- - A mensagem vai para o contato principal da ficha (e, se marcar, também para o número do
--   próprio cliente), pelo número do escritório, com o PDF gerado no servidor.
-- - Ela entra na fila de envio das conversas (conversa_mensagens, autor AVISO, envio NA_FILA),
--   como os avisos automáticos. Quem tira da fila e entrega é a ligação com a Meta, que ainda
--   não existe: até lá, nada sai. Sem o WhatsApp ligado, o envio é recusado (WHATSAPP_NAO_LIGADO).
-- - Fora da janela de 24 horas (o cliente não escreveu nas últimas 24 horas), a Meta só aceita
--   aviso aprovado. O aviso "Carnê de pagamento" ainda não existe: recusa com
--   JANELA_FECHADA_SEM_MODELO, e a tela explica.
-- - O carnê fica com o histórico dos envios: para quem, quando e a situação da mensagem.

create table carne_envios (
  id             uuid primary key default gen_random_uuid(),
  escritorio_id  uuid not null references escritorios (id) on delete restrict,
  carne_id       uuid not null references carnes (id) on delete restrict,
  conversa_id    uuid not null references conversas (id) on delete restrict,
  mensagem_id    uuid not null references conversa_mensagens (id) on delete restrict,
  para_nome      text not null check (length(btrim(para_nome)) between 1 and 160),
  para_telefone  text not null check (para_telefone ~ '^\+[1-9][0-9]{7,14}$'),
  enviado_por    uuid not null references pessoas (id) on delete restrict,
  enviado_em     timestamptz not null default app_now()
);
create index carne_envios_carne on carne_envios (carne_id, enviado_em desc);
call proteger_tabela_escritorio('carne_envios');
create trigger carne_envios_so_acrescenta before update or delete on carne_envios
  for each row execute function financeiro_so_acrescenta();

insert into inventario_dados (tabela, dado_pessoal, o_que, para_que, base_legal, controlador, prazo, no_fim, situacao, exportar) values
 ('carne_envios', true, 'Os envios do carnê pelo WhatsApp: para quem (nome e telefone), a mensagem, quem mandou e quando',
  'Mandar o carnê ao cliente e mostrar na ficha para quem foi (FI-23)', 'Execução de contrato (LGPD, art. 7º, V)',
  'Escritório', 'Enquanto o escritório for cliente do T3jus e 5 anos depois do fim do contrato', 'Exportados ao escritório e apagados com ele', 'APROVADO', true);

-- Acha ou abre a conversa de um número do cliente.
create function carne_conversa(p_escritorio uuid, k clientes_escritorio, ct jsonb) returns uuid
language plpgsql
set search_path = public
as $$
declare v_id uuid;
begin
  select id into v_id from conversas where escritorio_id = p_escritorio and telefone = ct ->> 'telefone';
  if v_id is null then
    insert into conversas (escritorio_id, telefone, cliente_id, contato_id, nome_contato, papel_contato)
    values (p_escritorio, ct ->> 'telefone', k.id, ct ->> 'id', coalesce(nullif(btrim(ct ->> 'nome'), ''), k.nome), nullif(btrim(coalesce(ct ->> 'papel', '')), ''))
    returning id into v_id;
  end if;
  return v_id;
end $$;

-- O número do próprio cliente, quando é outro que não o do contato principal.
create function carne_titular(k clientes_escritorio) returns jsonb
language sql stable
set search_path = public
as $$
  select c - 'principal' from jsonb_array_elements(k.contatos) c
   where not coalesce((c ->> 'principal')::boolean, false) and lower(btrim(c ->> 'nome')) = lower(btrim(k.nome))
     and c ->> 'telefone' is not null and not telefone_fixo_br(c ->> 'telefone')
   limit 1
$$;

create function carne_envio_linha(e carne_envios) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object('id', e.id, 'para', e.para_nome, 'telefone', e.para_telefone, 'em', e.enviado_em, 'por', pessoa_ref(e.enviado_por),
                            'envio', (select m.envio from conversa_mensagens m where m.id = e.mensagem_id))
$$;

-- Para a prévia: para quem vai, se a conversa está aberta e o que impede o envio agora.
create function portal_carne_envio(p_pessoa uuid, p_escritorio uuid, p_carne uuid, p_area text) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  k carnes;
  c contratos;
  cl clientes_escritorio;
  ct jsonb;
  ti jsonb;
  v_ultima timestamptz;
  v_bloqueio text;
begin
  perform carne_entrar(p_pessoa, p_escritorio, p_area, false);
  select * into k from carnes where id = p_carne and escritorio_id = p_escritorio;
  if k.id is null then raise exception 'Carnê não encontrado' using errcode = 'TC404'; end if;
  select * into c from contratos where id = k.contrato_id;
  select * into cl from clientes_escritorio where id = c.cliente_id;
  ct := contato_principal(cl.contatos);
  if ct ->> 'telefone' is null or telefone_fixo_br(ct ->> 'telefone') then ct := null; end if;
  ti := carne_titular(cl);
  if ti ->> 'telefone' is not distinct from ct ->> 'telefone' then ti := null; end if;
  select max(m.criada_em) into v_ultima from conversa_mensagens m join conversas v on v.id = m.conversa_id
   where v.escritorio_id = p_escritorio and v.telefone = ct ->> 'telefone' and m.autor = 'CLIENTE';
  v_bloqueio := case when not whatsapp_ligado(p_escritorio) then 'WHATSAPP_NAO_LIGADO'
                     when ct is null then 'SEM_WHATSAPP'
                     when v_ultima is null or v_ultima < app_now() - interval '24 hours' then 'JANELA_FECHADA_SEM_MODELO' end;
  return jsonb_build_object(
    'cliente', jsonb_build_object('nome', cl.nome),
    'para', case when ct is not null then jsonb_build_object('nome', ct ->> 'nome', 'papel', ct ->> 'papel', 'telefone', ct ->> 'telefone') end,
    'titular', case when ti is not null then jsonb_build_object('nome', ti ->> 'nome', 'telefone', ti ->> 'telefone') end,
    'escritorio', (select e.nome from escritorios e where e.id = p_escritorio),
    'ultimaDoCliente', v_ultima,
    'bloqueio', v_bloqueio,
    'envios', coalesce((select jsonb_agg(carne_envio_linha(e) order by e.enviado_em desc) from carne_envios e where e.carne_id = k.id), '[]'::jsonb));
end $$;

-- Mandar: põe a mensagem com o PDF na fila de cada conversa e guarda o envio.
create function portal_carne_enviar(p_pessoa uuid, p_escritorio uuid, p_carne uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_area text := upper(coalesce(p_dados ->> 'area', ''));
  v_texto text := btrim(coalesce(p_dados ->> 'texto', ''));
  v_arq jsonb := p_dados -> 'arquivo';
  v_prev jsonb;
  k carnes;
  cl clientes_escritorio;
  ct jsonb;
  v_conv uuid;
  v_msg uuid;
  v_n integer := 0;
begin
  perform carne_entrar(p_pessoa, p_escritorio, v_area, true);
  v_prev := portal_carne_envio(p_pessoa, p_escritorio, p_carne, v_area);
  if v_prev ->> 'bloqueio' is not null then
    perform recusar_motivo(case v_prev ->> 'bloqueio'
      when 'WHATSAPP_NAO_LIGADO' then 'O WhatsApp do escritório não está ligado'
      when 'SEM_WHATSAPP' then 'O contato principal não tem celular na ficha'
      else 'Fora da janela de 24 horas, a Meta só aceita aviso aprovado' end, v_prev ->> 'bloqueio');
  end if;
  if length(v_texto) not between 1 and 1024 then perform recusar_campos('Escreva a mensagem', 'texto'); end if;
  if v_arq is null or v_arq ->> 'caminho' is distinct from format('%s/carnes/%s.pdf', p_escritorio, p_carne)
     or length(btrim(coalesce(v_arq ->> 'nome', ''))) not between 5 and 200 or coalesce(v_arq ->> 'bytes', '') !~ '^[0-9]{1,8}$' then
    perform recusar_campos('Confira o PDF', 'arquivo');
  end if;
  select * into k from carnes where id = p_carne;
  select kl.* into cl from clientes_escritorio kl join contratos c on c.cliente_id = kl.id where c.id = k.contrato_id;
  for ct in select x from (select contato_principal(cl.contatos) x
                           union all select carne_titular(cl) where coalesce((p_dados ->> 'tambemCliente')::boolean, false) and v_prev -> 'titular' is not null) t
  loop
    v_conv := carne_conversa(p_escritorio, cl, ct);
    insert into conversa_mensagens (escritorio_id, conversa_id, autor, texto, anexo, aviso_tipo, envio, dados)
    values (p_escritorio, v_conv, 'AVISO', v_texto,
            jsonb_build_object('nome', v_arq ->> 'nome', 'tipo', 'DOCUMENTO', 'bytes', v_arq ->> 'bytes', 'caminho', v_arq ->> 'caminho'),
            'Carnê de pagamento', 'NA_FILA', jsonb_build_object('carne', k.id, 'pessoa', p_pessoa))
    returning id into v_msg;
    update conversas set ultima_em = app_now() where id = v_conv;
    insert into carne_envios (escritorio_id, carne_id, conversa_id, mensagem_id, para_nome, para_telefone, enviado_por)
    values (p_escritorio, k.id, v_conv, v_msg, coalesce(nullif(btrim(ct ->> 'nome'), ''), cl.nome), ct ->> 'telefone', p_pessoa);
    v_n := v_n + 1;
  end loop;
  perform registrar_historico('financeiro.carne_enviado', 'carnes', k.id::text, jsonb_build_object('envios', v_n));
  return jsonb_build_object('envios', coalesce((select jsonb_agg(carne_envio_linha(e) order by e.enviado_em desc) from carne_envios e where e.carne_id = k.id), '[]'::jsonb));
end $$;

-- A folha "Carnê" mostra para quem cada carnê foi.
alter function carne_linha(carnes) rename to carne_linha_sem_envios;
create function carne_linha(k carnes) returns jsonb
language sql stable
set search_path = public
as $$
  select carne_linha_sem_envios(k) || jsonb_build_object('envios',
    coalesce((select jsonb_agg(carne_envio_linha(e) order by e.enviado_em desc) from carne_envios e where e.carne_id = k.id), '[]'::jsonb))
$$;

call fechar_acesso();
