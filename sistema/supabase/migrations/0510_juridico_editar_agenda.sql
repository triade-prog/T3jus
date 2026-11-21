-- Jurídico ligado à Agenda e editar prazo e tarefa (F3.39, F3.4; EX-02, EX-04, EX-06, PD-04,
-- PD-07). Telas aprovadas em docs/design/aprovadas/portal-juridico (a janela de novo prazo e
-- nova tarefa, que abre preenchida para editar, PT-25) e portal-agenda-conversas (decisão 5:
-- prazos na faixa do dia e nos cartões; "Processo, opcional e só para quem tem o Jurídico").
-- - Prazo e tarefa abertos podem ser editados: o que é, as datas, o responsável e, na tarefa,
--   o que ela espera. Segue a versão lida (PT-19). Cada edição vai para o histórico do caso com
--   os campos que mudaram e, quando muda, o responsável e a data de antes e de depois. Cumprido
--   e concluída não se editam (reabrir a tarefa já existe).
-- - A Agenda passa a trazer os prazos abertos do período (pelo prazo final), com o caso e o
--   número do processo, só para quem tem o Jurídico. Com a pessoa escolhida, só os dela.
-- - O compromisso pode ter um caso (processo). Só quem tem o Jurídico escolhe e vê; quem não tem
--   edita o compromisso sem perder o caso que já estava lá.

alter table prazos add column versao integer not null default 1;
alter table tarefas add column versao integer not null default 1;
call proteger_tabela_escritorio('prazos');
call proteger_tabela_escritorio('tarefas');

alter table compromissos add column caso_id uuid references casos (id) on delete restrict;
create index compromissos_caso on compromissos (caso_id) where caso_id is not null;

update inventario_dados set o_que = 'Compromissos da equipe: tipo, o que é, quando, onde, link da sala, cliente, caso, quem vai, lembrete ao cliente, observações e cancelamento'
 where tabela = 'compromissos';

-- ---------------------------------------------------------------------------------------
-- Peças.

create or replace function prazo_linha(p prazos) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', p.id, 'descricao', p.descricao, 'dataFinal', p.data_final, 'fazerAte', p.fazer_ate, 'intimacaoEm', p.intimacao_em,
    'lembrar', p.lembrar, 'cumpridoEm', p.cumprido_em, 'cumpridoPor', case when p.cumprido_por is not null then pessoa_ref(p.cumprido_por) end,
    'responsavel', pessoa_ref(p.responsavel_id), 'versao', p.versao,
    'caso', (select jsonb_build_object('id', c.id, 'nome', c.nome, 'numero', c.numero_cnj, 'vara', c.vara) from casos c where c.id = p.caso_id))
$$;

create or replace function tarefa_linha(t tarefas) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', t.id, 'titulo', t.titulo, 'venceEm', t.vence_em, 'esperando', t.esperando, 'esperandoDesde', t.esperando_desde,
    'concluidaEm', t.concluida_em, 'concluidaPor', case when t.concluida_por is not null then pessoa_ref(t.concluida_por) end,
    'responsavel', pessoa_ref(t.responsavel_id), 'versao', t.versao,
    'caso', (select jsonb_build_object('id', c.id, 'nome', c.nome) from casos c where c.id = t.caso_id))
$$;

-- O número do processo no padrão do CNJ (NNNNNNN-DD.AAAA.J.TR.OOOO).
create function cnj_formatado(p text) returns text
language sql immutable
as $$
  select case when p ~ '^[0-9]{20}$'
              then substr(p, 1, 7) || '-' || substr(p, 8, 2) || '.' || substr(p, 10, 4) || '.' || substr(p, 14, 1) || '.' || substr(p, 15, 2) || '.' || substr(p, 17, 4)
              else p end
$$;

-- Os campos que mudaram entre duas versões de uma linha (para o histórico).
create function campos_mudados(p_antes jsonb, p_depois jsonb, p_campos text[]) returns text[]
language sql immutable
as $$ select coalesce(array_agg(k order by k), '{}') from unnest(p_campos) k where p_antes -> k is distinct from p_depois -> k $$;

-- ---------------------------------------------------------------------------------------
-- Editar prazo (F3.39).

create function portal_juridico_prazo_editar(p_pessoa uuid, p_escritorio uuid, p_prazo uuid, p_versao integer, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  a prazos;
  n prazos;
  e text[];
  v_versao integer;
  v_mudou text[];
begin
  perform entrar_area(p_pessoa, p_escritorio, 'JURIDICO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'juridico.editar');
  if p_versao is null then perform recusar_campos('Falta a versão lida', 'versao'); end if;
  select * into a from prazos where id = p_prazo and escritorio_id = p_escritorio;
  if a.id is null then raise exception 'Prazo não encontrado' using errcode = 'TC404'; end if;
  if a.cumprido_em is not null then perform recusar_motivo('Este prazo já foi cumprido e não muda mais', 'PRAZO_JA_CUMPRIDO'); end if;
  -- O caso não muda: o prazo é do caso em que nasceu.
  e := array_remove(prazo_erros(p_escritorio, coalesce(p_dados, '{}'::jsonb) || jsonb_build_object('casoId', a.caso_id)), 'casoId');
  -- A intimação que já estava gravada continua valendo, mesmo que o dia tenha passado.
  if json_data(p_dados, 'intimacaoEm') is not distinct from a.intimacao_em and json_data(p_dados, 'intimacaoEm') <= coalesce(json_data(p_dados, 'dataFinal'), a.data_final) then
    e := array_remove(e, 'intimacaoEm');
  end if;
  if cardinality(e) > 0 then perform recusar_campos('Confira o prazo', variadic e); end if;
  update prazos set descricao = btrim(p_dados ->> 'descricao'), data_final = json_data(p_dados, 'dataFinal'), fazer_ate = json_data(p_dados, 'fazerAte'),
         intimacao_em = json_data(p_dados, 'intimacaoEm'), responsavel_id = (p_dados ->> 'responsavelId')::uuid,
         lembrar = coalesce((p_dados ->> 'lembrar')::boolean, a.lembrar)
   where id = a.id and versao = p_versao
  returning * into n;
  if n.id is null then perform conflito_versao('prazos', a.id); end if;
  v_mudou := campos_mudados(to_jsonb(a), to_jsonb(n), array['descricao', 'data_final', 'fazer_ate', 'intimacao_em', 'responsavel_id', 'lembrar']);
  if cardinality(v_mudou) > 0 then
    perform registrar_historico('juridico.prazo_editado', 'casos', a.caso_id::text, jsonb_strip_nulls(jsonb_build_object(
      'prazo', a.id, 'descricao', n.descricao, 'campos', to_jsonb(v_mudou),
      'dataFinal', case when 'data_final' = any (v_mudou) then jsonb_build_object('de', a.data_final, 'para', n.data_final) end,
      'responsavel', case when 'responsavel_id' = any (v_mudou) then jsonb_build_object('de', a.responsavel_id, 'para', n.responsavel_id) end)));
  end if;
  return jsonb_build_object('id', n.id, 'versao', n.versao, 'campos', to_jsonb(v_mudou));
end $$;

-- ---------------------------------------------------------------------------------------
-- Editar tarefa (F3.39). "Esperando" que começa agora conta de hoje; o que já esperava guarda
-- o dia em que começou.

create function portal_juridico_tarefa_editar(p_pessoa uuid, p_escritorio uuid, p_tarefa uuid, p_versao integer, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  a tarefas;
  n tarefas;
  e text[];
  v_esp text := nullif(btrim(coalesce(p_dados ->> 'esperando', '')), '');
  v_mudou text[];
begin
  perform entrar_area(p_pessoa, p_escritorio, 'JURIDICO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'juridico.editar');
  if p_versao is null then perform recusar_campos('Falta a versão lida', 'versao'); end if;
  select * into a from tarefas where id = p_tarefa and escritorio_id = p_escritorio;
  if a.id is null then raise exception 'Tarefa não encontrada' using errcode = 'TC404'; end if;
  if a.concluida_em is not null then perform recusar_motivo('Esta tarefa já foi concluída. Reabra para mudar', 'TAREFA_JA_CONCLUIDA'); end if;
  e := array_remove(tarefa_erros(p_escritorio, coalesce(p_dados, '{}'::jsonb) || jsonb_build_object('casoId', a.caso_id)), 'casoId');
  if cardinality(e) > 0 then perform recusar_campos('Confira a tarefa', variadic e); end if;
  update tarefas set titulo = btrim(p_dados ->> 'titulo'), vence_em = json_data(p_dados, 'venceEm'),
         responsavel_id = (p_dados ->> 'responsavelId')::uuid, esperando = v_esp,
         esperando_desde = case when v_esp is null then null else coalesce(a.esperando_desde, hoje_brasilia()) end
   where id = a.id and versao = p_versao
  returning * into n;
  if n.id is null then perform conflito_versao('tarefas', a.id); end if;
  v_mudou := campos_mudados(to_jsonb(a), to_jsonb(n), array['titulo', 'vence_em', 'responsavel_id', 'esperando']);
  if cardinality(v_mudou) > 0 then
    perform registrar_historico('juridico.tarefa_editada', 'casos', a.caso_id::text, jsonb_strip_nulls(jsonb_build_object(
      'tarefa', a.id, 'titulo', n.titulo, 'campos', to_jsonb(v_mudou),
      'venceEm', case when 'vence_em' = any (v_mudou) then jsonb_build_object('de', a.vence_em, 'para', n.vence_em) end,
      'responsavel', case when 'responsavel_id' = any (v_mudou) then jsonb_build_object('de', a.responsavel_id, 'para', n.responsavel_id) end)));
  end if;
  return jsonb_build_object('id', n.id, 'versao', n.versao, 'campos', to_jsonb(v_mudou));
end $$;

-- ---------------------------------------------------------------------------------------
-- Agenda (F3.4).

-- O caso do compromisso, como a Agenda e a ficha mostram.
create function compromisso_caso_ref(p_caso uuid) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object('id', c.id, 'nome', c.nome, 'numero', c.numero_cnj, 'parteContraria', c.parte_contraria)
    from casos c where c.id = p_caso
$$;

-- O caso pedido para um compromisso: só de quem tem o Jurídico, do escritório. Sem o Jurídico,
-- o caso que já estava fica (p_atual).
create function compromisso_caso_pedido(p_pessoa uuid, p_escritorio uuid, p_dados jsonb, p_atual uuid) returns uuid
language plpgsql stable
set search_path = public
as $$
declare v uuid;
begin
  if not (coalesce(p_dados, '{}'::jsonb) ? 'casoId') then return p_atual; end if;
  if not tem_juridico(p_pessoa, p_escritorio) then
    if nullif(p_dados ->> 'casoId', '') is null or (p_dados ->> 'casoId') = p_atual::text then return p_atual; end if;
    raise exception 'O caso só pode ser escolhido por quem tem o Jurídico' using errcode = 'TC401',
      detail = jsonb_build_object('motivo', 'AREA_NAO_LIBERADA')::text;
  end if;
  begin v := nullif(p_dados ->> 'casoId', '')::uuid; exception when others then perform recusar_campos('Confira o compromisso', 'casoId'); end;
  if v is not null and not exists (select 1 from casos where id = v and escritorio_id = p_escritorio) then
    perform recusar_campos('Confira o compromisso', 'casoId');
  end if;
  return v;
end $$;

create or replace function portal_agenda(p_pessoa uuid, p_escritorio uuid, p_de date, p_ate date, p_de_quem uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_juridico boolean;
  v_ini timestamptz;
  v_fim timestamptz;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'agenda.ver');
  if p_de is null or p_ate is null or p_ate < p_de or p_ate - p_de > 62 then
    perform recusar_campos('Período inválido', 'de', 'ate');
  end if;
  if p_de_quem is not null and not pessoa_do_escritorio(p_de_quem, p_escritorio) then
    perform recusar_campos('Pessoa fora do escritório', 'pessoa');
  end if;
  v_juridico := tem_juridico(p_pessoa, p_escritorio);
  v_ini := p_de::timestamp at time zone 'America/Sao_Paulo';
  v_fim := (p_ate + 1)::timestamp at time zone 'America/Sao_Paulo';
  return jsonb_build_object(
    'juridico', v_juridico,
    'algum', exists (select 1 from compromissos c where c.escritorio_id = p_escritorio),
    'compromissos', coalesce((
      select jsonb_agg(compromisso_linha(c)
                       || case when v_juridico and c.caso_id is not null then jsonb_build_object('caso', compromisso_caso_ref(c.caso_id)) else '{}'::jsonb end
                       order by c.inicio, c.fim, c.titulo)
        from compromissos c
       where c.escritorio_id = p_escritorio and c.inicio < v_fim and c.fim > v_ini
         and (p_de_quem is null or c.responsavel_id = p_de_quem or p_de_quem = any (c.tambem_vai))), '[]'::jsonb),
    'feriados', coalesce((select jsonb_agg(jsonb_build_object('data', f.data, 'nome', f.nome) order by f.data)
                            from feriados f where f.data between p_de and p_ate), '[]'::jsonb),
    -- Os prazos abertos do período, pelo prazo final (PD-04, PD-07). Nunca para quem não tem a área.
    'prazos', case when v_juridico then coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', p.id, 'titulo', p.descricao, 'vence', p.data_final, 'fazerAte', p.fazer_ate,
               'processo', coalesce(cnj_formatado(c.numero_cnj), c.nome),
               'caso', jsonb_build_object('id', c.id, 'nome', c.nome),
               'responsavel', pessoa_ref(p.responsavel_id))
             order by p.data_final, p.criado_em)
        from prazos p join casos c on c.id = p.caso_id
       where p.escritorio_id = p_escritorio and p.cumprido_em is null and p.data_final between p_de and p_ate
         and (p_de_quem is null or p.responsavel_id = p_de_quem)), '[]'::jsonb) end,
    'tiposEscritos', coalesce((select jsonb_agg(t order by t) from (select distinct c.tipo_escrito t from compromissos c
                                                                     where c.escritorio_id = p_escritorio and c.tipo_escrito is not null) x), '[]'::jsonb));
end $$;

create or replace function portal_compromisso(p_pessoa uuid, p_escritorio uuid, p_compromisso uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c compromissos;
  v_juridico boolean;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'agenda.ver');
  select * into c from compromissos where id = p_compromisso and escritorio_id = p_escritorio;
  if c.id is null then raise exception 'Compromisso não encontrado' using errcode = 'TC404'; end if;
  v_juridico := tem_juridico(p_pessoa, p_escritorio);
  return compromisso_linha(c) || jsonb_build_object(
    'linkSala', c.link_sala, 'observacoes', c.observacoes, 'versao', c.versao, 'criadoEm', c.criado_em,
    'criadoPor', pessoa_ref(c.criado_por),
    'juridico', v_juridico,
    -- O caso só vai para quem tem o Jurídico; quem não tem sabe apenas que há um (para não apagá-lo sem querer).
    'caso', case when v_juridico and c.caso_id is not null then compromisso_caso_ref(c.caso_id) end,
    'temCaso', c.caso_id is not null,
    'contatoCliente', (select contato_principal(k.contatos) from clientes_escritorio k where k.id = c.cliente_id and k.estado <> 'EXCLUIDO'),
    'cancelamento', case when c.estado = 'CANCELADO' then jsonb_build_object(
      'em', c.cancelado_em, 'por', pessoa_ref(c.cancelado_por), 'motivo', c.motivo_cancelamento, 'avisar', c.avisar_cancelamento) end,
    'historico', coalesce((
      select jsonb_agg(jsonb_build_object('em', h.ocorrido_em, 'acao', h.acao, 'autor', p.nome, 'dados', h.dados) order by h.id)
        from historico h left join pessoas p on p.id = h.autor_id
       where h.escritorio_id = p_escritorio and h.entidade = 'compromissos' and h.entidade_id = c.id::text), '[]'::jsonb));
end $$;

-- Os casos em andamento, para escolher o processo do compromisso (só com o Jurídico).
create function portal_agenda_casos(p_pessoa uuid, p_escritorio uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform entrar_area(p_pessoa, p_escritorio, 'JURIDICO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'agenda.ver');
  return coalesce((select jsonb_agg(compromisso_caso_ref(c.id)
                                    || jsonb_build_object('clientes', (select coalesce(jsonb_agg(cc.cliente_id order by cc.ordem), '[]'::jsonb)
                                                                         from caso_clientes cc where cc.caso_id = c.id))
                                    order by c.nome)
                     from casos c where c.escritorio_id = p_escritorio and c.situacao = 'ANDAMENTO'), '[]'::jsonb);
end $$;

create or replace function portal_compromisso_marcar(p_pessoa uuid, p_escritorio uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  n compromissos;
  v_id uuid;
  v_versao integer;
  v_caso uuid;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'agenda.editar');
  n := compromisso_conferir(p_escritorio, p_dados);
  v_caso := compromisso_caso_pedido(p_pessoa, p_escritorio, p_dados, null);
  perform definir_transicao('MARCADO');
  insert into compromissos (escritorio_id, tipo, tipo_escrito, titulo, inicio, fim, modalidade, local, link_sala, cliente_id,
                            responsavel_id, tambem_vai, lembrete_cliente, observacoes, caso_id, criado_por)
  values (p_escritorio, n.tipo, n.tipo_escrito, n.titulo, n.inicio, n.fim, n.modalidade, n.local, n.link_sala, n.cliente_id,
          n.responsavel_id, n.tambem_vai, n.lembrete_cliente, n.observacoes, v_caso, p_pessoa)
  returning id, versao into v_id, v_versao;
  perform registrar_historico('compromisso.marcado', 'compromissos', v_id::text,
    jsonb_strip_nulls(jsonb_build_object('inicio', n.inicio, 'tipo', n.tipo, 'lembrete', n.lembrete_cliente, 'caso', v_caso)));
  return jsonb_build_object('id', v_id, 'versao', v_versao);
end $$;

create or replace function portal_compromisso_editar(p_pessoa uuid, p_escritorio uuid, p_compromisso uuid, p_versao integer,
                                                     p_dados jsonb, p_motivo text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  a compromissos;
  n compromissos;
  v_versao integer;
  v_campos text[];
  v_motivo text := nullif(btrim(coalesce(p_motivo, '')), '');
  v_caso uuid;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'agenda.editar');
  if p_versao is null then perform recusar_campos('Falta a versão lida', 'versao'); end if;
  select * into a from compromissos where id = p_compromisso and escritorio_id = p_escritorio;
  if a.id is null then raise exception 'Compromisso não encontrado' using errcode = 'TC404'; end if;
  if a.estado = 'CANCELADO' then perform recusar_motivo('O compromisso foi cancelado', 'COMPROMISSO_CANCELADO'); end if;
  n := compromisso_conferir(p_escritorio, p_dados);
  v_caso := compromisso_caso_pedido(p_pessoa, p_escritorio, p_dados, a.caso_id);
  if (n.inicio, n.fim) is distinct from (a.inicio, a.fim) and (v_motivo is null or length(v_motivo) > 300) then
    perform recusar_campos('Escreva o motivo da remarcação', 'motivo');
  end if;
  update compromissos set
    tipo = n.tipo, tipo_escrito = n.tipo_escrito, titulo = n.titulo, inicio = n.inicio, fim = n.fim, modalidade = n.modalidade,
    local = n.local, link_sala = n.link_sala, cliente_id = n.cliente_id, responsavel_id = n.responsavel_id, tambem_vai = n.tambem_vai,
    lembrete_cliente = n.lembrete_cliente, observacoes = n.observacoes, caso_id = v_caso
   where id = p_compromisso and escritorio_id = p_escritorio and versao = p_versao
  returning versao into v_versao;
  if v_versao is null then perform conflito_versao('compromissos', p_compromisso); end if;
  if (n.inicio, n.fim) is distinct from (a.inicio, a.fim) then
    perform registrar_historico('compromisso.remarcado', 'compromissos', p_compromisso::text,
      jsonb_build_object('de', a.inicio, 'para', n.inicio, 'motivo', v_motivo));
  end if;
  select coalesce(array_agg(k order by k), '{}') into v_campos
    from unnest(array['tipo', 'tipo_escrito', 'titulo', 'modalidade', 'local', 'link_sala', 'cliente_id', 'responsavel_id',
                      'tambem_vai', 'lembrete_cliente', 'observacoes', 'caso_id']) k
   where to_jsonb(a) -> k is distinct from (select to_jsonb(c) -> k from compromissos c where c.id = p_compromisso);
  if cardinality(v_campos) > 0 then
    perform registrar_historico('compromisso.editado', 'compromissos', p_compromisso::text, jsonb_build_object('campos', to_jsonb(v_campos)));
  end if;
  return jsonb_build_object('id', p_compromisso, 'versao', v_versao);
end $$;

call fechar_acesso();
