-- Jurídico do Portal, parte 2: prazos e tarefas (EX-02, EX-03, EX-04, PD-04, PD-05, IN-06,
-- IN-08), tela aprovada em docs/design/aprovadas/portal-juridico (decisões 9 e 10).
-- - Prazo cadastrado à mão: caso, o que é, prazo final, "fazer até" (a margem do escritório),
--   responsável, a data da intimação só para consulta e o lembrete 2 dias antes. O T3jus não
--   lê publicações nem conta dias úteis (VA-02 fica para depois).
-- - Cumprido pede confirmação na tela e fica no histórico do caso; não se desfaz.
-- - Tarefa com responsável e vencimento; "esperando" diz o que ela espera (um documento do
--   cliente ou uma resposta) e desde quando, e alimenta "O que está travando" na ficha.
-- - Concluir e reabrir a tarefa ficam no histórico.
-- - A lista de casos ganha o próximo prazo e as pendências (tarefas esperando alguém), e passa
--   a vir pelo prazo mais próximo.
-- - Quem sai da equipe passa os prazos e as tarefas abertas (EX-10).
-- Ficam para depois: o lembrete no Início e no sino (F3.38) e editar prazo e tarefa (F3.39).

create table prazos (
  id             uuid primary key default gen_random_uuid(),
  escritorio_id  uuid not null references escritorios (id) on delete restrict,
  caso_id        uuid not null references casos (id) on delete restrict,
  descricao      text not null check (length(btrim(descricao)) between 2 and 120),
  data_final     date not null,
  fazer_ate      date,
  intimacao_em   date,
  responsavel_id uuid not null references pessoas (id) on delete restrict,
  lembrar        boolean not null default true,
  cumprido_em    timestamptz,
  cumprido_por   uuid references pessoas (id) on delete restrict,
  criado_por     uuid not null references pessoas (id) on delete restrict,
  criado_em      timestamptz not null default app_now(),
  check (fazer_ate is null or fazer_ate <= data_final),
  check (intimacao_em is null or intimacao_em <= data_final),
  check ((cumprido_em is null) = (cumprido_por is null))
);
create index prazos_abertos on prazos (escritorio_id, data_final) where cumprido_em is null;
create index prazos_caso on prazos (caso_id);
call proteger_tabela_escritorio('prazos');

create table tarefas (
  id               uuid primary key default gen_random_uuid(),
  escritorio_id    uuid not null references escritorios (id) on delete restrict,
  caso_id          uuid not null references casos (id) on delete restrict,
  titulo           text not null check (length(btrim(titulo)) between 2 and 160),
  vence_em         date not null,
  responsavel_id   uuid not null references pessoas (id) on delete restrict,
  esperando        text check (length(btrim(esperando)) between 3 and 160),
  esperando_desde  date,
  concluida_em     timestamptz,
  concluida_por    uuid references pessoas (id) on delete restrict,
  criado_por       uuid not null references pessoas (id) on delete restrict,
  criado_em        timestamptz not null default app_now(),
  check ((esperando is null) = (esperando_desde is null)),
  check ((concluida_em is null) = (concluida_por is null))
);
create index tarefas_abertas on tarefas (escritorio_id, vence_em) where concluida_em is null;
create index tarefas_caso on tarefas (caso_id);
call proteger_tabela_escritorio('tarefas');

insert into inventario_dados (tabela, dado_pessoal, o_que, para_que, base_legal, controlador, prazo, no_fim, situacao, exportar) values
 ('prazos', true, 'Prazos dos casos: o que é, prazo final, margem do escritório, intimação, responsável e quando foi cumprido',
  'Não perder prazo processual (EX-04)', 'Execução de contrato (LGPD, art. 7º, V) e exercício regular de direitos (art. 7º, VI)',
  'Escritório', 'Enquanto o escritório for cliente do T3jus e 5 anos depois do fim do contrato', 'Exportados ao escritório e apagados com ele', 'APROVADO', true),
 ('tarefas', true, 'Tarefas dos casos: o que fazer, vencimento, responsável, o que a tarefa espera e quando foi concluída',
  'Dividir o trabalho da equipe e ver o que está travado (EX-02, PD-05)', 'Execução de contrato (LGPD, art. 7º, V)',
  'Escritório', 'Enquanto o escritório for cliente do T3jus e 5 anos depois do fim do contrato', 'Exportadas ao escritório e apagadas com ele', 'APROVADO', true);

-- ---------------------------------------------------------------------------------------
-- Peças.

create function prazo_linha(p prazos) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', p.id, 'descricao', p.descricao, 'dataFinal', p.data_final, 'fazerAte', p.fazer_ate, 'intimacaoEm', p.intimacao_em,
    'lembrar', p.lembrar, 'cumpridoEm', p.cumprido_em, 'cumpridoPor', case when p.cumprido_por is not null then pessoa_ref(p.cumprido_por) end,
    'responsavel', pessoa_ref(p.responsavel_id),
    'caso', (select jsonb_build_object('id', c.id, 'nome', c.nome, 'numero', c.numero_cnj, 'vara', c.vara) from casos c where c.id = p.caso_id))
$$;

create function tarefa_linha(t tarefas) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', t.id, 'titulo', t.titulo, 'venceEm', t.vence_em, 'esperando', t.esperando, 'esperandoDesde', t.esperando_desde,
    'concluidaEm', t.concluida_em, 'concluidaPor', case when t.concluida_por is not null then pessoa_ref(t.concluida_por) end,
    'responsavel', pessoa_ref(t.responsavel_id),
    'caso', (select jsonb_build_object('id', c.id, 'nome', c.nome) from casos c where c.id = t.caso_id))
$$;

-- O caso precisa ser do escritório e estar em andamento para ganhar prazo ou tarefa.
create function caso_aberto_do_escritorio(p_caso uuid, p_escritorio uuid) returns boolean
language sql stable
set search_path = public
as $$ select exists (select 1 from casos where id = p_caso and escritorio_id = p_escritorio and situacao = 'ANDAMENTO') $$;

-- A linha da lista de casos ganha o próximo prazo e as pendências (decisão 2).
create or replace function caso_linha(c casos) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', c.id, 'nome', c.nome, 'area', c.area, 'numero', c.numero_cnj, 'situacao', c.situacao, 'resultado', c.resultado,
    'parteContraria', c.parte_contraria,
    'cliente', (select jsonb_build_object('id', k.id, 'nome', k.nome) from caso_clientes cc join clientes_escritorio k on k.id = cc.cliente_id
                 where cc.caso_id = c.id order by cc.ordem limit 1),
    'outrosClientes', (select count(*) - 1 from caso_clientes cc where cc.caso_id = c.id),
    'semContrato', exists (select 1 from caso_clientes cc where cc.caso_id = c.id and cc.contrato_id is null),
    'etapa', (select jsonb_build_object('id', e.id, 'ordem', e.ordem, 'nome', e.nome, 'final', e.final) from etapas e where e.id = c.etapa_id),
    'responsavel', pessoa_ref(c.responsavel_id),
    'etapaDesde', c.etapa_desde,
    'proximoPrazo', (select jsonb_build_object('data', p.data_final, 'fazerAte', p.fazer_ate, 'descricao', p.descricao)
                       from prazos p where p.caso_id = c.id and p.cumprido_em is null order by p.data_final, p.criado_em limit 1),
    'pendencias', (select count(*) from tarefas t where t.caso_id = c.id and t.concluida_em is null and t.esperando is not null))
$$;

-- A lista de casos passa a vir pelo prazo mais próximo; sem prazo, pelo nome.
create or replace function portal_juridico_casos(p_pessoa uuid, p_escritorio uuid, p_situacao text default 'ANDAMENTO', p_q text default null,
                                                 p_responsavel uuid default null, p_etapa uuid default null) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_q text := nullif(btrim(coalesce(p_q, '')), '');
  v_dig text := regexp_replace(coalesce(p_q, ''), '[^0-9]', '', 'g');
begin
  perform entrar_area(p_pessoa, p_escritorio, 'JURIDICO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'juridico.ver');
  if coalesce(p_situacao, '') not in ('ANDAMENTO', 'ENCERRADO') then perform recusar_campos('Confira o filtro', 'situacao'); end if;
  perform etapas_garantir(p_escritorio);
  return jsonb_build_object(
    'hoje', hoje_brasilia(),
    'etapas', etapas_lista(p_escritorio),
    'totais', jsonb_build_object(
      'andamento', (select count(*) from casos where escritorio_id = p_escritorio and situacao = 'ANDAMENTO'),
      'encerrados', (select count(*) from casos where escritorio_id = p_escritorio and situacao = 'ENCERRADO'),
      'prazoHoje', (select count(distinct p.caso_id) from prazos p where p.escritorio_id = p_escritorio and p.cumprido_em is null and p.data_final = hoje_brasilia())),
    'responsaveis', coalesce((select jsonb_agg(pessoa_ref(r) order by (pessoa_ref(r) ->> 'nome'))
                                from (select distinct responsavel_id r from casos where escritorio_id = p_escritorio) s), '[]'::jsonb),
    'souDono', e_socio_dono(p_pessoa, p_escritorio),
    'casos', coalesce((
      select jsonb_agg(caso_linha(c) order by
               (select min(p.data_final) from prazos p where p.caso_id = c.id and p.cumprido_em is null) nulls last, c.nome)
        from casos c
       where c.escritorio_id = p_escritorio and c.situacao = p_situacao
         and (p_responsavel is null or c.responsavel_id = p_responsavel)
         and (p_etapa is null or c.etapa_id = p_etapa)
         and (v_q is null
              or sem_acento(c.nome) like '%' || sem_acento(v_q) || '%'
              or sem_acento(c.parte_contraria) like '%' || sem_acento(v_q) || '%'
              or (length(v_dig) >= 4 and c.numero_cnj like '%' || v_dig || '%')
              or exists (select 1 from caso_clientes cc join clientes_escritorio k on k.id = cc.cliente_id
                          where cc.caso_id = c.id and sem_acento(k.nome) like '%' || sem_acento(v_q) || '%'))), '[]'::jsonb));
end $$;

-- A ficha ganha os prazos, as tarefas e "O que está travando" (decisão 4).
create or replace function portal_juridico_caso(p_pessoa uuid, p_escritorio uuid, p_caso uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c casos;
  v_valores boolean;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'JURIDICO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'juridico.ver');
  select * into c from casos where id = p_caso and escritorio_id = p_escritorio;
  if c.id is null then raise exception 'Caso não encontrado' using errcode = 'TC404'; end if;
  v_valores := caso_ve_honorarios(p_pessoa, p_escritorio);
  return caso_linha(c) || jsonb_build_object(
    'tribunal', c.tribunal, 'vara', c.vara, 'sistema', c.sistema, 'distribuidoEm', c.distribuido_em, 'valorCausa', c.valor_causa,
    'avisarCliente', c.avisar_cliente, 'encerradoEm', c.encerrado_em, 'versao', c.versao, 'criadoEm', c.criado_em,
    'veHonorarios', v_valores,
    'clientes', caso_clientes_lista(c.id, v_valores),
    'etapas', etapas_lista(p_escritorio),
    'hoje', hoje_brasilia(),
    'mudancas', coalesce((select jsonb_agg(jsonb_build_object(
        'para', (select jsonb_build_object('ordem', e.ordem, 'nome', e.nome) from etapas e where e.id = m.para_etapa_id),
        'de', (select jsonb_build_object('ordem', e.ordem, 'nome', e.nome) from etapas e where e.id = m.de_etapa_id),
        'motivo', m.motivo, 'resultado', m.resultado, 'aviso', m.aviso_texto, 'avisoEnviadoEm', m.aviso_enviado_em,
        'por', pessoa_ref(m.por), 'em', m.em) order by m.ordem desc)
      from caso_etapa_mudancas m where m.caso_id = c.id), '[]'::jsonb),
    'quemTemContratos', quem_tem_area(p_escritorio, 'CONTRATOS'),
    -- Abertos primeiro, do mais próximo; depois os cumpridos nos últimos 30 dias.
    'prazos', coalesce((select jsonb_agg(prazo_linha(p) order by (p.cumprido_em is not null), p.data_final, p.cumprido_em desc)
                          from prazos p where p.caso_id = c.id
                           and (p.cumprido_em is null or p.cumprido_em > app_now() - interval '30 days')), '[]'::jsonb),
    'tarefas', coalesce((select jsonb_agg(tarefa_linha(t) order by (t.concluida_em is not null), t.vence_em, t.concluida_em desc)
                           from tarefas t where t.caso_id = c.id
                            and (t.concluida_em is null or t.concluida_em > app_now() - interval '30 days')), '[]'::jsonb));
end $$;

-- ---------------------------------------------------------------------------------------
-- Prazos (decisão 9).

create function portal_juridico_prazos(p_pessoa uuid, p_escritorio uuid, p_mostrar text default 'ABERTOS', p_responsavel uuid default null) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform entrar_area(p_pessoa, p_escritorio, 'JURIDICO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'juridico.ver');
  if coalesce(p_mostrar, '') not in ('ABERTOS', 'MEUS', 'CUMPRIDOS') then perform recusar_campos('Confira o filtro', 'mostrar'); end if;
  return jsonb_build_object(
    'hoje', hoje_brasilia(),
    'totais', jsonb_build_object(
      'abertos', (select count(*) from prazos where escritorio_id = p_escritorio and cumprido_em is null),
      'meus', (select count(*) from prazos where escritorio_id = p_escritorio and cumprido_em is null and responsavel_id = p_pessoa),
      'hoje', (select count(*) from prazos where escritorio_id = p_escritorio and cumprido_em is null and data_final <= hoje_brasilia())),
    'responsaveis', coalesce((select jsonb_agg(pessoa_ref(r) order by (pessoa_ref(r) ->> 'nome'))
                                from (select distinct responsavel_id r from prazos where escritorio_id = p_escritorio) s), '[]'::jsonb),
    'prazos', coalesce((
      select jsonb_agg(prazo_linha(p) order by case when p_mostrar = 'CUMPRIDOS' then p.cumprido_em end desc nulls last, p.data_final, p.criado_em)
        from prazos p
       where p.escritorio_id = p_escritorio
         and (p_responsavel is null or p.responsavel_id = p_responsavel)
         and case p_mostrar
               when 'CUMPRIDOS' then p.cumprido_em is not null and p.cumprido_em > app_now() - interval '60 days'
               when 'MEUS' then p.cumprido_em is null and p.responsavel_id = p_pessoa
               else p.cumprido_em is null end), '[]'::jsonb));
end $$;

create function prazo_erros(p_escritorio uuid, d jsonb) returns text[]
language plpgsql
set search_path = public
as $$
declare
  e text[] := '{}';
  v_caso uuid;
  v_resp uuid;
  v_final date := json_data(d, 'dataFinal');
  v_ate date := json_data(d, 'fazerAte');
  v_int date := json_data(d, 'intimacaoEm');
begin
  begin v_caso := nullif(d ->> 'casoId', '')::uuid; exception when others then v_caso := null; end;
  begin v_resp := nullif(d ->> 'responsavelId', '')::uuid; exception when others then v_resp := null; end;
  if v_caso is null or not caso_aberto_do_escritorio(v_caso, p_escritorio) then e := e || 'casoId'::text; end if;
  if not coalesce(json_texto_ok(d, 'descricao', 2, 120), false) then e := e || 'descricao'::text; end if;
  if v_final is null then e := e || 'dataFinal'::text; end if;
  if nullif(d ->> 'fazerAte', '') is not null and (v_ate is null or (v_final is not null and v_ate > v_final)) then e := e || 'fazerAte'::text; end if;
  if nullif(d ->> 'intimacaoEm', '') is not null and (v_int is null or v_int > hoje_brasilia() or (v_final is not null and v_int > v_final)) then e := e || 'intimacaoEm'::text; end if;
  if v_resp is null or not pessoa_do_escritorio(v_resp, p_escritorio) then e := e || 'responsavelId'::text; end if;
  return e;
end $$;

create function portal_juridico_prazo_criar(p_pessoa uuid, p_escritorio uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  e text[];
  v_id uuid;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'JURIDICO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'juridico.editar');
  e := prazo_erros(p_escritorio, p_dados);
  if cardinality(e) > 0 then perform recusar_campos('Confira o prazo', variadic e); end if;
  insert into prazos (escritorio_id, caso_id, descricao, data_final, fazer_ate, intimacao_em, responsavel_id, lembrar, criado_por)
  values (p_escritorio, (p_dados ->> 'casoId')::uuid, btrim(p_dados ->> 'descricao'), json_data(p_dados, 'dataFinal'),
          json_data(p_dados, 'fazerAte'), json_data(p_dados, 'intimacaoEm'), (p_dados ->> 'responsavelId')::uuid,
          coalesce((p_dados ->> 'lembrar')::boolean, true), p_pessoa)
  returning id into v_id;
  perform registrar_historico('juridico.prazo_cadastrado', 'casos', p_dados ->> 'casoId',
    jsonb_build_object('prazo', v_id, 'descricao', btrim(p_dados ->> 'descricao'), 'dataFinal', p_dados ->> 'dataFinal', 'responsavel', p_dados ->> 'responsavelId'));
  return jsonb_build_object('id', v_id);
end $$;

create function portal_juridico_prazo_cumprido(p_pessoa uuid, p_escritorio uuid, p_prazo uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  p prazos;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'JURIDICO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'juridico.editar');
  select * into p from prazos where id = p_prazo and escritorio_id = p_escritorio for update;
  if p.id is null then raise exception 'Prazo não encontrado' using errcode = 'TC404'; end if;
  if p.cumprido_em is not null then perform recusar_motivo('Este prazo já foi marcado como cumprido', 'PRAZO_JA_CUMPRIDO'); end if;
  update prazos set cumprido_em = app_now(), cumprido_por = p_pessoa where id = p.id;
  perform registrar_historico('juridico.prazo_cumprido', 'casos', p.caso_id::text, jsonb_build_object('prazo', p.id, 'descricao', p.descricao));
  return jsonb_build_object('id', p.id, 'cumpridoEm', app_now());
end $$;

-- ---------------------------------------------------------------------------------------
-- Tarefas (decisão 10).

create function portal_juridico_tarefas(p_pessoa uuid, p_escritorio uuid, p_visao text default 'MINHAS', p_responsavel uuid default null) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hoje date := hoje_brasilia();
begin
  perform entrar_area(p_pessoa, p_escritorio, 'JURIDICO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'juridico.ver');
  if coalesce(p_visao, '') not in ('MINHAS', 'EQUIPE') then perform recusar_campos('Confira o filtro', 'visao'); end if;
  return jsonb_build_object(
    'hoje', v_hoje,
    'totais', (select jsonb_build_object(
        'minhas', count(*) filter (where responsavel_id = p_pessoa),
        'equipe', count(*),
        'atrasadas', count(*) filter (where vence_em < v_hoje and (p_visao = 'EQUIPE' or responsavel_id = p_pessoa)),
        'esperando', count(*) filter (where esperando is not null and (p_visao = 'EQUIPE' or responsavel_id = p_pessoa)))
      from tarefas where escritorio_id = p_escritorio and concluida_em is null),
    'responsaveis', coalesce((select jsonb_agg(pessoa_ref(r) order by (pessoa_ref(r) ->> 'nome'))
                                from (select distinct responsavel_id r from tarefas where escritorio_id = p_escritorio and concluida_em is null) s), '[]'::jsonb),
    'tarefas', coalesce((
      select jsonb_agg(tarefa_linha(t) order by t.vence_em, t.criado_em)
        from tarefas t
       where t.escritorio_id = p_escritorio and t.concluida_em is null
         and (p_visao = 'EQUIPE' or t.responsavel_id = p_pessoa)
         and (p_visao = 'MINHAS' or p_responsavel is null or t.responsavel_id = p_responsavel)), '[]'::jsonb),
    -- Carga da equipe (IN-08), só na visão da equipe: casos em andamento e tarefas abertas de cada pessoa.
    'carga', case when p_visao = 'EQUIPE' then coalesce((
      select jsonb_agg(jsonb_build_object('pessoa', pessoa_ref(x.pessoa), 'casos', x.casos, 'tarefas', x.tarefas, 'atrasadas', x.atrasadas)
                       order by (pessoa_ref(x.pessoa) ->> 'nome'))
        from (select q.pessoa,
                     (select count(*) from casos c where c.escritorio_id = p_escritorio and c.situacao = 'ANDAMENTO' and c.responsavel_id = q.pessoa) casos,
                     (select count(*) from tarefas t where t.escritorio_id = p_escritorio and t.concluida_em is null and t.responsavel_id = q.pessoa) tarefas,
                     (select count(*) from tarefas t where t.escritorio_id = p_escritorio and t.concluida_em is null and t.responsavel_id = q.pessoa and t.vence_em < v_hoje) atrasadas
                from (select responsavel_id pessoa from casos where escritorio_id = p_escritorio and situacao = 'ANDAMENTO'
                      union select responsavel_id from tarefas where escritorio_id = p_escritorio and concluida_em is null) q) x), '[]'::jsonb) end);
end $$;

create function tarefa_erros(p_escritorio uuid, d jsonb) returns text[]
language plpgsql
set search_path = public
as $$
declare
  e text[] := '{}';
  v_caso uuid;
  v_resp uuid;
begin
  begin v_caso := nullif(d ->> 'casoId', '')::uuid; exception when others then v_caso := null; end;
  begin v_resp := nullif(d ->> 'responsavelId', '')::uuid; exception when others then v_resp := null; end;
  if v_caso is null or not caso_aberto_do_escritorio(v_caso, p_escritorio) then e := e || 'casoId'::text; end if;
  if not coalesce(json_texto_ok(d, 'titulo', 2, 160), false) then e := e || 'titulo'::text; end if;
  if json_data(d, 'venceEm') is null then e := e || 'venceEm'::text; end if;
  if v_resp is null or not pessoa_do_escritorio(v_resp, p_escritorio) then e := e || 'responsavelId'::text; end if;
  if nullif(btrim(coalesce(d ->> 'esperando', '')), '') is not null and not coalesce(json_texto_ok(d, 'esperando', 3, 160), false) then
    e := e || 'esperando'::text;
  end if;
  return e;
end $$;

create function portal_juridico_tarefa_criar(p_pessoa uuid, p_escritorio uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  e text[];
  v_id uuid;
  v_esp text := nullif(btrim(coalesce(p_dados ->> 'esperando', '')), '');
begin
  perform entrar_area(p_pessoa, p_escritorio, 'JURIDICO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'juridico.editar');
  e := tarefa_erros(p_escritorio, p_dados);
  if cardinality(e) > 0 then perform recusar_campos('Confira a tarefa', variadic e); end if;
  insert into tarefas (escritorio_id, caso_id, titulo, vence_em, responsavel_id, esperando, esperando_desde, criado_por)
  values (p_escritorio, (p_dados ->> 'casoId')::uuid, btrim(p_dados ->> 'titulo'), json_data(p_dados, 'venceEm'),
          (p_dados ->> 'responsavelId')::uuid, v_esp, case when v_esp is not null then hoje_brasilia() end, p_pessoa)
  returning id into v_id;
  perform registrar_historico('juridico.tarefa_criada', 'casos', p_dados ->> 'casoId',
    jsonb_build_object('tarefa', v_id, 'titulo', btrim(p_dados ->> 'titulo'), 'responsavel', p_dados ->> 'responsavelId', 'esperando', v_esp));
  return jsonb_build_object('id', v_id);
end $$;

-- Concluir ou reabrir (p_concluir false). Reabrir volta a tarefa para a lista.
create function portal_juridico_tarefa_concluir(p_pessoa uuid, p_escritorio uuid, p_tarefa uuid, p_concluir boolean default true) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  t tarefas;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'JURIDICO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'juridico.editar');
  select * into t from tarefas where id = p_tarefa and escritorio_id = p_escritorio for update;
  if t.id is null then raise exception 'Tarefa não encontrada' using errcode = 'TC404'; end if;
  if p_concluir and t.concluida_em is not null then perform recusar_motivo('Esta tarefa já foi concluída', 'TAREFA_JA_CONCLUIDA'); end if;
  if not p_concluir and t.concluida_em is null then perform recusar_motivo('Esta tarefa está aberta', 'TAREFA_ABERTA'); end if;
  update tarefas set concluida_em = case when p_concluir then app_now() end, concluida_por = case when p_concluir then p_pessoa end
   where id = t.id;
  perform registrar_historico(case when p_concluir then 'juridico.tarefa_concluida' else 'juridico.tarefa_reaberta' end, 'casos', t.caso_id::text,
    jsonb_build_object('tarefa', t.id, 'titulo', t.titulo));
  return jsonb_build_object('id', t.id, 'concluida', p_concluir);
end $$;

-- "Já chegou": a tarefa deixa de esperar alguém e sai de "O que está travando".
create function portal_juridico_tarefa_chegou(p_pessoa uuid, p_escritorio uuid, p_tarefa uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  t tarefas;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'JURIDICO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'juridico.editar');
  select * into t from tarefas where id = p_tarefa and escritorio_id = p_escritorio for update;
  if t.id is null then raise exception 'Tarefa não encontrada' using errcode = 'TC404'; end if;
  if t.esperando is null then perform recusar_motivo('Esta tarefa não está esperando ninguém', 'TAREFA_NAO_ESPERA'); end if;
  update tarefas set esperando = null, esperando_desde = null where id = t.id;
  perform registrar_historico('juridico.tarefa_destravada', 'casos', t.caso_id::text,
    jsonb_build_object('tarefa', t.id, 'esperava', t.esperando, 'desde', t.esperando_desde));
  return jsonb_build_object('id', t.id);
end $$;

-- Quem saiu da equipe passa os prazos e as tarefas abertas (EX-10).
create function prazos_tarefas_passar_de_quem_saiu() returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_de uuid := (new.dados ->> 'pessoa_id')::uuid;
  v_para uuid := (new.dados ->> 'passou_para')::uuid;
begin
  if v_de is null or v_para is null then return new; end if;
  update prazos set responsavel_id = v_para where escritorio_id = new.escritorio_id and responsavel_id = v_de and cumprido_em is null;
  update tarefas set responsavel_id = v_para where escritorio_id = new.escritorio_id and responsavel_id = v_de and concluida_em is null;
  return new;
end $$;
create trigger prazos_tarefas_passar_de_quem_saiu after insert on historico
  for each row when (new.acao = 'equipe.retirada') execute function prazos_tarefas_passar_de_quem_saiu();

call fechar_acesso();
