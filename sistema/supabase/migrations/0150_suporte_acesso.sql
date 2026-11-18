-- Suporte de acesso pelo Console (F1.3, PT-23), tela aprovada em
-- docs/design/aprovadas/console-suporte. A equipe T3jus ajuda quem não consegue entrar sem
-- nunca ver nem escolher a senha: o link de nova senha vai só para o e-mail já cadastrado.
-- Suporte e Administração buscam só pessoas dos escritórios que atendem (PT-24) e agem com
-- motivo obrigatório. O evento fica no histórico interno com o motivo e, sem o motivo, no
-- histórico da equipe do Portal, para o sócio dono saber (decisões da Carol, 18/11/2026).

-- As funções do domínio leem o e-mail em auth.users e contam e encerram as sessões em
-- auth.sessions (o Auth recusa o token de uma sessão apagada). Só essas duas tabelas, e só
-- dentro das funções abaixo; o papel dominio não tem login.
do $$
begin
  grant usage on schema auth to dominio;
  grant select (id, email) on auth.users to dominio;
  grant select, delete on auth.sessions to dominio;
exception when insufficient_privilege then
  raise exception 'Quem roda as migrations precisa poder liberar auth.users e auth.sessions ao papel dominio';
end
$$;

insert into funcao_acoes (funcao, acao) values
  ('ADMINISTRACAO', 'console.suporte.ver'),
  ('ADMINISTRACAO', 'console.suporte.agir'),
  ('SUPORTE', 'console.suporte.ver'),
  ('SUPORTE', 'console.suporte.agir');

-- A sessão diz se a pessoa vê o item Suporte no menu.
create or replace function console_sessao(p_pessoa uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v jsonb;
begin
  perform definir_pessoa(p_pessoa);
  if not contexto_equipe() then
    raise exception 'Só a equipe T3jus' using errcode = 'TC401';
  end if;
  select jsonb_build_object(
    'pessoaId', p.id,
    'nome', p.nome,
    'funcoes', to_jsonb(contexto_equipe_funcoes()),
    'acoes', coalesce((select jsonb_agg(distinct fa.acao order by fa.acao) from funcao_acoes fa
                        where fa.funcao = any (contexto_equipe_funcoes())
                          and fa.acao in ('console.escritorios.criar', 'console.equipe.gerenciar', 'console.historico.equipe',
                                          'console.suporte.ver')), '[]'::jsonb))
    into v from pessoas p where p.id = p_pessoa;
  return v;
end $$;

-- Os escritórios em que quem age tem a ação, lidos antes de entrar em cada um (entrar troca
-- o contexto). Só a equipe T3jus.
create function suporte_escritorios(p_pessoa uuid, p_acao text) returns uuid[]
language plpgsql
set search_path = public
as $$
declare v uuid[];
begin
  perform definir_pessoa(p_pessoa);
  if not contexto_equipe() or not pode_global(p_acao) then
    raise exception 'Só o Suporte e a Administração' using errcode = 'TC401';
  end if;
  select coalesce(array_agg(distinct v.escritorio_id), '{}') into v
    from vinculos v
   where v.pessoa_id = p_pessoa and v.revogado_em is null and pode(p_pessoa, v.escritorio_id, p_acao);
  return v;
end $$;

-- As pessoas do Portal (sócio e equipe) do escritório do contexto, com e-mail e convite.
create function suporte_pessoas_do_contexto() returns jsonb
language sql stable
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', p.id, 'nome', p.nome, 'email', u.email, 'senhaCriadaEm', p.senha_criada_em,
           'escritorio', jsonb_build_object('id', e.id, 'nome', e.nome,
                                            'papel', case when v.funcao = 'SOCIO' then 'SOCIO' else 'EQUIPE' end,
                                            'conviteEnviadoEm', convite_enviado_em(v.id),
                                            'telefone', (select c ->> 'telefone' from jsonb_array_elements(e.contatos) c
                                                          where c ? 'telefone' limit 1)))), '[]'::jsonb)
    from vinculos v
    join funcoes f on f.codigo = v.funcao and f.sistema = 'PORTAL'
    join pessoas p on p.id = v.pessoa_id
    join escritorios e on e.id = v.escritorio_id
    left join auth.users u on u.id = p.id
   where v.escritorio_id = contexto_escritorio() and v.revogado_em is null
$$;

-- Junta as linhas de cada escritório numa pessoa só, com a lista dos escritórios.
create function suporte_agrupar(p_linhas jsonb) returns jsonb
language sql immutable
as $$
  select coalesce(jsonb_agg(x.pessoa order by x.pessoa ->> 'nome', x.pessoa ->> 'id'), '[]'::jsonb)
    from (select jsonb_build_object(
                   'id', l ->> 'id', 'nome', min(l ->> 'nome'), 'email', min(l ->> 'email'),
                   'senhaCriadaEm', min(l ->> 'senhaCriadaEm'),
                   'escritorios', jsonb_agg(l -> 'escritorio' order by l -> 'escritorio' ->> 'nome')) as pessoa
            from jsonb_array_elements(p_linhas) l
           group by l ->> 'id') x
$$;

-- Buscar por nome ou e-mail, só nos escritórios atendidos (decisão 1 da Carol).
create function console_suporte_buscar(p_pessoa uuid, p_termo text) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_termo text := lower(btrim(coalesce(p_termo, '')));
  v_padrao text;
  v_linhas jsonb := '[]'::jsonb;
  e uuid;
begin
  if length(v_termo) < 2 or length(v_termo) > 120 then
    perform recusar_campos('Escreva ao menos 2 letras do nome ou do e-mail', 'q');
  end if;
  v_padrao := '%' || replace(replace(replace(v_termo, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  foreach e in array suporte_escritorios(p_pessoa, 'console.suporte.ver') loop
    perform entrar_escritorio(p_pessoa, e, 'console.suporte.ver');
    v_linhas := v_linhas || coalesce((
      select jsonb_agg(l) from jsonb_array_elements(suporte_pessoas_do_contexto()) l
       where lower(l ->> 'nome') like v_padrao or lower(coalesce(l ->> 'email', '')) like v_padrao), '[]'::jsonb);
  end loop;
  return (select coalesce(jsonb_agg(p), '[]'::jsonb)
            from (select p from jsonb_array_elements(suporte_agrupar(v_linhas)) p limit 30) x);
end $$;

-- A ficha de acesso de uma pessoa: escritórios em comum, papel, convite e aparelhos.
-- Pessoa fora dos escritórios atendidos responde como pessoa que não existe.
create function console_suporte_pessoa(p_pessoa uuid, p_alvo uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_linhas jsonb := '[]'::jsonb;
  v_agir boolean := false;
  v jsonb;
  e uuid;
begin
  foreach e in array suporte_escritorios(p_pessoa, 'console.suporte.ver') loop
    perform entrar_escritorio(p_pessoa, e, 'console.suporte.ver');
    v_linhas := v_linhas || coalesce((
      select jsonb_agg(l) from jsonb_array_elements(suporte_pessoas_do_contexto()) l where (l ->> 'id')::uuid = p_alvo), '[]'::jsonb);
    if exists (select 1 from jsonb_array_elements(v_linhas) l
                where (l ->> 'id')::uuid = p_alvo and (l -> 'escritorio' ->> 'id')::uuid = e) then
      v_agir := v_agir or pode(p_pessoa, e, 'console.suporte.agir');
    end if;
  end loop;
  v := suporte_agrupar(v_linhas) -> 0;
  if v is null then
    raise exception 'Pessoa não encontrada' using errcode = 'TC404';
  end if;
  return v || jsonb_build_object(
    'podeAgir', v_agir,
    'aparelhos', (select count(*) from auth.sessions s where s.user_id = p_alvo and (s.not_after is null or s.not_after > now())));
end $$;

-- Registra a ação de suporte em cada escritório em comum: no histórico interno com o motivo
-- e no histórico da equipe sem ele. Devolve em quantos escritórios registrou.
create function suporte_registrar(p_pessoa uuid, p_alvo uuid, p_acao text, p_motivo text, p_dados jsonb default '{}'::jsonb)
returns integer
language plpgsql
set search_path = public
as $$
declare
  v_motivo text := btrim(coalesce(p_motivo, ''));
  v_n integer := 0;
  v_vinculo uuid;
  v_funcao text;
  v_criada timestamptz;
  e uuid;
begin
  if length(v_motivo) not between 1 and 300 then
    perform recusar_campos('Escreva o motivo, com até 300 caracteres', 'motivo');
  end if;
  foreach e in array suporte_escritorios(p_pessoa, 'console.suporte.agir') loop
    perform entrar_escritorio(p_pessoa, e, 'console.suporte.agir');
    select v.id, v.funcao, p.senha_criada_em into v_vinculo, v_funcao, v_criada
      from vinculos v join funcoes f on f.codigo = v.funcao and f.sistema = 'PORTAL'
      join pessoas p on p.id = v.pessoa_id
     where v.escritorio_id = e and v.pessoa_id = p_alvo and v.revogado_em is null
     limit 1;
    continue when v_vinculo is null;
    if p_acao = 'suporte.reenviou_convite' and v_criada is not null then
      perform recusar_motivo('Esta pessoa já criou a senha', 'JA_ENTROU');
    end if;
    perform registrar_historico_interno(p_acao, 'pessoa', p_alvo::text, p_dados || jsonb_build_object('motivo', v_motivo));
    if p_acao = 'suporte.reenviou_convite' then
      -- O convite novo conta para a validade de 1 hora e aparece no histórico da equipe.
      perform registrar_historico(case when v_funcao = 'SOCIO' then 'socio.convite_reenviado' else 'equipe.convite_reenviado' end,
                                  'vinculo', v_vinculo::text, jsonb_build_object('pessoa_id', p_alvo, 'suporte', true));
    else
      perform registrar_historico(p_acao, 'pessoa', p_alvo::text, p_dados || jsonb_build_object('pessoa_id', p_alvo));
    end if;
    v_n := v_n + 1;
  end loop;
  if v_n = 0 then
    raise exception 'Pessoa não encontrada' using errcode = 'TC404';
  end if;
  return v_n;
end $$;

-- Link de nova senha e reenviar convite: a API confere e registra aqui antes de pedir ao Auth.
create function console_suporte_registrar(p_pessoa uuid, p_alvo uuid, p_acao text, p_motivo text) returns integer
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_acao not in ('suporte.link_senha', 'suporte.reenviou_convite') then
    raise exception 'Ação de suporte desconhecida' using errcode = 'TC422';
  end if;
  return suporte_registrar(p_pessoa, p_alvo, p_acao, p_motivo);
end $$;

-- Desconectar de todos os aparelhos (e, ao tirar o autenticador, o mesmo): registra e apaga
-- as sessões do Auth; o Auth deixa de aceitar o token e a renovação. Devolve quantas caíram.
create function console_suporte_desconectar(p_pessoa uuid, p_alvo uuid, p_motivo text, p_tirar_autenticador boolean default false)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_n integer;
begin
  select count(*) into v_n from auth.sessions s where s.user_id = p_alvo;
  perform suporte_registrar(p_pessoa, p_alvo,
    case when p_tirar_autenticador then 'suporte.tirou_autenticador' else 'suporte.desconectou' end, p_motivo,
    jsonb_build_object('aparelhos', v_n) || case when p_tirar_autenticador then '{"identidade_conferida": true}'::jsonb else '{}'::jsonb end);
  delete from auth.sessions s where s.user_id = p_alvo;
  return v_n;
end $$;

-- O histórico de suporte da pessoa, só nos escritórios atendidos. A mesma ação em vários
-- escritórios aparece uma vez.
create function console_suporte_historico(p_pessoa uuid, p_alvo uuid)
returns table (ocorrido_em timestamptz, autor_id uuid, autor_nome text, acao text, dados jsonb)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_linhas jsonb := '[]'::jsonb;
  e uuid;
begin
  foreach e in array suporte_escritorios(p_pessoa, 'console.suporte.ver') loop
    perform entrar_escritorio(p_pessoa, e, 'console.suporte.ver');
    v_linhas := v_linhas || coalesce((
      select jsonb_agg(jsonb_build_object('em', h.ocorrido_em, 'autor', h.autor_id, 'nome', a.nome, 'acao', h.acao, 'dados', h.dados))
        from historico h left join pessoas a on a.id = h.autor_id
       where h.escritorio_id = e and h.interno and h.entidade = 'pessoa' and h.entidade_id = p_alvo::text
         and h.acao like 'suporte.%'), '[]'::jsonb);
  end loop;
  return query
    select distinct on ((l ->> 'em')::timestamptz, l ->> 'acao', (l ->> 'autor')::uuid)
           (l ->> 'em')::timestamptz, (l ->> 'autor')::uuid, l ->> 'nome', l ->> 'acao', l -> 'dados'
      from jsonb_array_elements(v_linhas) l
     order by (l ->> 'em')::timestamptz desc, l ->> 'acao', (l ->> 'autor')::uuid
     limit 100;
end $$;

call fechar_acesso();
