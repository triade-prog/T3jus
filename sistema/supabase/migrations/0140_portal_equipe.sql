-- 0140 · Equipe do escritório no Portal (F1.6; PA-01, PA-02, PT-20, PT-21, EX-10)
--
-- Sem funções fixas (Carol, 17/11/2026): o sócio dono convida as pessoas e marca, pessoa por
-- pessoa, as áreas que cada uma abre (Comercial, Contratos, Financeiro, Jurídico). As partes
-- comuns (Início, Conversas, Clientes, Agenda, Escritório e Ajuda) todo mundo vê; o sócio vê
-- tudo. Quem entra pela equipe tem um vínculo com a função EQUIPE; as áreas ficam ligadas a
-- esse vínculo e nada se apaga: área retirada fica com a data e quem retirou.
--
-- Ao retirar alguém que já entrou, o sócio diz para quem passa o que era da pessoa (EX-10,
-- Carol em 18/11/2026). Ainda não há tarefas, prazos nem cobranças no sistema: a escolha fica
-- no histórico, e cada área que nascer passa os registros dela por aqui.

insert into funcoes (codigo, nome, sistema) values ('EQUIPE', 'Equipe do escritório', 'PORTAL');

insert into funcao_acoes (funcao, acao) values
  ('EQUIPE', 'escritorio.ver'),
  ('SOCIO', 'escritorio.equipe.gerenciar');

create table areas_liberadas (
  id            uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null references escritorios (id) on delete restrict,
  vinculo_id    uuid not null references vinculos (id) on delete restrict,
  area          text not null check (area in ('COMERCIAL', 'CONTRATOS', 'FINANCEIRO', 'JURIDICO')),
  criado_em     timestamptz not null default app_now(),
  criado_por    uuid not null references pessoas (id) on delete restrict,
  retirado_em   timestamptz,
  retirado_por  uuid references pessoas (id) on delete restrict,
  check ((retirado_em is null) = (retirado_por is null))
);
create unique index areas_liberadas_ativa on areas_liberadas (vinculo_id, area) where retirado_em is null;
create index areas_liberadas_escritorio_idx on areas_liberadas (escritorio_id);
call proteger_tabela_escritorio('areas_liberadas');

-- Área não se apaga; só ganha a data de retirada, uma vez.
create function areas_so_retiram() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Área liberada não se apaga: retire' using errcode = 'TC010';
  end if;
  if old.retirado_em is not null
     or (new.id, new.escritorio_id, new.vinculo_id, new.area, new.criado_em, new.criado_por)
        is distinct from (old.id, old.escritorio_id, old.vinculo_id, old.area, old.criado_em, old.criado_por) then
    raise exception 'Área liberada só muda para retirada' using errcode = 'TC422';
  end if;
  return new;
end $$;
create trigger areas_so_retiram before update or delete on areas_liberadas
  for each row execute function areas_so_retiram();

-- A área é do mesmo escritório do vínculo, e só vínculo da equipe tem área (o sócio vê tudo).
create function areas_do_vinculo_certo() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (select 1 from vinculos v where v.id = new.vinculo_id and v.escritorio_id = new.escritorio_id and v.funcao = 'EQUIPE') then
    raise exception 'A área precisa de um vínculo da equipe deste escritório' using errcode = 'TC422';
  end if;
  return new;
end $$;
create trigger areas_do_vinculo_certo before insert on areas_liberadas
  for each row execute function areas_do_vinculo_certo();

-- Mesmo prazo dos vínculos, que a Carol aprovou na 0090: a área é parte do acesso da pessoa.
insert into inventario_dados (tabela, dado_pessoal, o_que, para_que, base_legal, controlador, prazo, no_fim, situacao, exportar) values
 ('areas_liberadas', true, 'Áreas do Portal que cada pessoa da equipe abre, com quem liberou e quem retirou',
  'Mostrar a cada pessoa só o que o sócio liberou (PA-02)', 'Execução do contrato (LGPD, art. 7º, V)', 'Escritório',
  'Enquanto o escritório for cliente', 'Ficam; a área retirada continua com quem retirou e quando', 'APROVADO', true);

-- ---------------------------------------------------------------------------------------
-- Leitura usada por todas as funções abaixo (dentro do contexto do escritório).

-- O sócio dono é quem tem vínculo de sócio ativo; ele vê tudo e cuida da equipe.
create function e_socio_dono(p_pessoa uuid, p_escritorio uuid) returns boolean
language sql stable
set search_path = public
as $$
  select exists (select 1 from vinculos where pessoa_id = p_pessoa and escritorio_id = p_escritorio
                                         and funcao = 'SOCIO' and revogado_em is null)
$$;

-- As áreas que a pessoa abre no escritório: todas para o sócio, as liberadas para a equipe.
create function areas_da_pessoa(p_pessoa uuid, p_escritorio uuid) returns text[]
language sql stable
set search_path = public
as $$
  select case when e_socio_dono(p_pessoa, p_escritorio)
              then array['COMERCIAL', 'CONTRATOS', 'FINANCEIRO', 'JURIDICO']
              else coalesce((select array_agg(a.area order by array_position(array['COMERCIAL', 'CONTRATOS', 'FINANCEIRO', 'JURIDICO'], a.area))
                               from areas_liberadas a join vinculos v on v.id = a.vinculo_id
                              where v.pessoa_id = p_pessoa and v.escritorio_id = p_escritorio and v.funcao = 'EQUIPE'
                                and v.revogado_em is null and a.retirado_em is null), '{}') end
$$;

-- Toda rota de área do Portal entra por aqui: sem a área liberada, recusa como sem permissão.
create function entrar_area(p_pessoa uuid, p_escritorio uuid, p_area text) returns void
language plpgsql
set search_path = public
as $$
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'escritorio.ver');
  if not (p_area = any (areas_da_pessoa(p_pessoa, p_escritorio))) then
    raise exception 'Área não liberada para esta pessoa' using errcode = 'TC401',
      detail = jsonb_build_object('motivo', 'AREA_NAO_LIBERADA')::text;
  end if;
end $$;

-- Áreas pedidas: sem repetição e só as quatro conhecidas. Lista vazia vale (só as partes comuns).
create function areas_validas(p_areas text[]) returns text[]
language plpgsql
set search_path = public
as $$
declare v text[];
begin
  select coalesce(array_agg(distinct a), '{}') into v from unnest(coalesce(p_areas, '{}')) a;
  if exists (select 1 from unnest(v) a where a not in ('COMERCIAL', 'CONTRATOS', 'FINANCEIRO', 'JURIDICO')) then
    perform recusar_campos('Área desconhecida', 'areas');
  end if;
  return v;
end $$;

-- Quando o último convite saiu: o vínculo ou o reenvio mais novo.
create function convite_enviado_em(p_vinculo uuid) returns timestamptz
language sql stable
set search_path = public
as $$
  select greatest(v.criado_em, (select max(h.ocorrido_em) from historico h
                                  where h.escritorio_id = v.escritorio_id and h.entidade = 'vinculo' and h.entidade_id = v.id::text
                                    and h.acao in ('equipe.convite_reenviado', 'socio.convite_reenviado')))
    from vinculos v where v.id = p_vinculo
$$;

-- ---------------------------------------------------------------------------------------
-- Funções da API do Portal (security definer). Todas recebem a pessoa e o escritório que a
-- sessão validou no servidor; o navegador nunca escolhe o escritório.

-- O escritório da sessão, com o que a moldura precisa: as áreas da pessoa, se é o sócio dono
-- e os dados da ficha (só leitura no Portal nesta versão).
create function portal_escritorio(p_pessoa uuid, p_escritorio uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_dono boolean;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'escritorio.ver');
  v_dono := e_socio_dono(p_pessoa, p_escritorio);
  return (
    select jsonb_build_object(
      'id', e.id, 'nome', e.nome, 'cnpj', e.cnpj, 'cidade', e.cidade, 'uf', e.uf, 'endereco', e.endereco,
      'contatos', e.contatos, 'dono', v_dono, 'areas', to_jsonb(areas_da_pessoa(p_pessoa, p_escritorio)),
      'socios', (select coalesce(jsonb_agg(p.nome order by v.criado_em), '[]'::jsonb)
                   from vinculos v join pessoas p on p.id = v.pessoa_id
                  where v.escritorio_id = e.id and v.funcao = 'SOCIO' and v.revogado_em is null),
      'pessoas', (select count(distinct v.pessoa_id) from vinculos v join funcoes f on f.codigo = v.funcao
                   where v.escritorio_id = e.id and f.sistema = 'PORTAL' and v.revogado_em is null),
      'ultimaExportacao', case when v_dono then
                            (select jsonb_build_object('em', h.ocorrido_em, 'por', q.nome)
                               from historico h left join pessoas q on q.id = h.autor_id
                              where h.escritorio_id = e.id and h.acao = 'escritorio.exportado'
                              order by h.id desc limit 1) end)
      from escritorios e where e.id = p_escritorio);
end $$;

-- A equipe do escritório (só o sócio dono): o sócio primeiro, depois a equipe por nome.
create function portal_equipe(p_pessoa uuid, p_escritorio uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'escritorio.equipe.gerenciar');
  return (
    select coalesce(jsonb_agg(jsonb_build_object(
             'vinculoId', v.id, 'pessoaId', p.id, 'nome', p.nome, 'dono', v.funcao = 'SOCIO',
             'areas', to_jsonb(areas_da_pessoa(p.id, p_escritorio)), 'desde', v.criado_em, 'versao', v.versao,
             'senhaCriadaEm', p.senha_criada_em, 'conviteEnviadoEm', convite_enviado_em(v.id))
             order by v.funcao <> 'SOCIO', p.nome), '[]'::jsonb)
      from vinculos v join pessoas p on p.id = v.pessoa_id
     where v.escritorio_id = p_escritorio and v.funcao in ('SOCIO', 'EQUIPE') and v.revogado_em is null);
end $$;

-- Convidar alguém para a equipe com as áreas marcadas. A conta no Auth já foi criada pela API.
create function portal_convidar(p_pessoa uuid, p_escritorio uuid, p_convidado uuid, p_nome text, p_areas text[])
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vinculo uuid;
  v_areas text[];
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'escritorio.equipe.gerenciar');
  if length(btrim(coalesce(p_nome, ''))) not between 1 and 120 then
    perform recusar_campos('Escreva o nome da pessoa', 'nome');
  end if;
  v_areas := areas_validas(p_areas);
  perform garantir_pessoa(p_convidado, p_nome);
  if exists (select 1 from vinculos v join funcoes f on f.codigo = v.funcao
              where v.pessoa_id = p_convidado and v.escritorio_id = p_escritorio and f.sistema = 'PORTAL' and v.revogado_em is null) then
    perform recusar_motivo('Esta pessoa já está na equipe', 'JA_NA_EQUIPE');
  end if;
  insert into vinculos (pessoa_id, escritorio_id, funcao, criado_por)
  values (p_convidado, p_escritorio, 'EQUIPE', p_pessoa)
  returning id into v_vinculo;
  insert into areas_liberadas (escritorio_id, vinculo_id, area, criado_por)
  select p_escritorio, v_vinculo, a, p_pessoa from unnest(v_areas) a;
  perform registrar_historico('equipe.convidada', 'vinculo', v_vinculo::text,
    jsonb_build_object('pessoa_id', p_convidado, 'areas', to_jsonb(v_areas)));
  return v_vinculo;
end $$;

-- Mudar as áreas de alguém da equipe. Vale na próxima página que a pessoa abrir.
create function portal_mudar_areas(p_pessoa uuid, p_escritorio uuid, p_vinculo uuid, p_areas text[]) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_membro uuid;
  v_antes text[];
  v_depois text[];
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'escritorio.equipe.gerenciar');
  v_depois := areas_validas(p_areas);
  select pessoa_id into v_membro from vinculos
   where id = p_vinculo and escritorio_id = p_escritorio and funcao = 'EQUIPE' and revogado_em is null;
  if v_membro is null then
    raise exception 'Pessoa não encontrada na equipe' using errcode = 'TC404';
  end if;
  v_antes := areas_da_pessoa(v_membro, p_escritorio);
  update areas_liberadas set retirado_em = app_now(), retirado_por = p_pessoa
   where vinculo_id = p_vinculo and retirado_em is null and not (area = any (v_depois));
  insert into areas_liberadas (escritorio_id, vinculo_id, area, criado_por)
  select p_escritorio, p_vinculo, a, p_pessoa from unnest(v_depois) a where not (a = any (v_antes));
  v_depois := areas_da_pessoa(v_membro, p_escritorio);
  if v_antes is distinct from v_depois then
    perform registrar_historico('equipe.areas_mudadas', 'vinculo', p_vinculo::text,
      jsonb_build_object('pessoa_id', v_membro, 'antes', to_jsonb(v_antes), 'depois', to_jsonb(v_depois)));
  end if;
  return to_jsonb(v_depois);
end $$;

-- Reenviar o convite de quem ainda não criou a senha. Devolve a pessoa, para a API achar o e-mail.
create function portal_reenviar_convite(p_pessoa uuid, p_escritorio uuid, p_vinculo uuid) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_membro uuid;
  v_criada timestamptz;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'escritorio.equipe.gerenciar');
  select v.pessoa_id, p.senha_criada_em into v_membro, v_criada
    from vinculos v join pessoas p on p.id = v.pessoa_id
   where v.id = p_vinculo and v.escritorio_id = p_escritorio and v.funcao = 'EQUIPE' and v.revogado_em is null;
  if v_membro is null then
    raise exception 'Pessoa não encontrada na equipe' using errcode = 'TC404';
  end if;
  if v_criada is not null then
    perform recusar_motivo('Esta pessoa já criou a senha', 'JA_ENTROU');
  end if;
  perform registrar_historico('equipe.convite_reenviado', 'vinculo', p_vinculo::text, jsonb_build_object('pessoa_id', v_membro));
  return v_membro;
end $$;

-- Retirar alguém da equipe (PT-21): o vínculo é revogado e as áreas, retiradas; a autoria
-- antiga fica. Quem já entrou precisa de alguém para receber o que era dela (EX-10); convite
-- pendente só é cancelado. Segue a versão lida (PT-19).
create function portal_retirar(p_pessoa uuid, p_escritorio uuid, p_vinculo uuid, p_versao integer, p_passar_para uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_membro uuid;
  v_criada timestamptz;
  v_versao integer;
  v_para uuid;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'escritorio.equipe.gerenciar');
  select v.pessoa_id, p.senha_criada_em into v_membro, v_criada
    from vinculos v join pessoas p on p.id = v.pessoa_id
   where v.id = p_vinculo and v.escritorio_id = p_escritorio and v.funcao = 'EQUIPE' and v.revogado_em is null;
  if v_membro is null then
    raise exception 'Pessoa não encontrada na equipe' using errcode = 'TC404';
  end if;
  if v_criada is not null then
    if p_passar_para is null then
      perform recusar_campos('Escolha para quem passa o que era desta pessoa', 'passarPara');
    end if;
    if p_passar_para = v_membro or not exists (
         select 1 from vinculos v join funcoes f on f.codigo = v.funcao
          where v.pessoa_id = p_passar_para and v.escritorio_id = p_escritorio and f.sistema = 'PORTAL' and v.revogado_em is null) then
      perform recusar_campos('Escolha alguém que continua na equipe', 'passarPara');
    end if;
    v_para := p_passar_para;
  end if;

  update vinculos set revogado_em = app_now(), revogado_por = p_pessoa
   where id = p_vinculo and versao = p_versao and revogado_em is null
  returning versao into v_versao;
  if v_versao is null then
    perform conflito_versao('vinculos', p_vinculo);
  end if;
  update areas_liberadas set retirado_em = app_now(), retirado_por = p_pessoa
   where vinculo_id = p_vinculo and retirado_em is null;

  perform registrar_historico(case when v_criada is null then 'equipe.convite_cancelado' else 'equipe.retirada' end,
    'vinculo', p_vinculo::text, jsonb_strip_nulls(jsonb_build_object('pessoa_id', v_membro, 'passou_para', v_para)));
  return jsonb_strip_nulls(jsonb_build_object('versao', v_versao, 'passouPara', v_para));
end $$;

-- Histórico da equipe (só o sócio dono): convites, áreas, retiradas e exportações, do mais
-- novo ao mais antigo, de página em página.
create function portal_historico_equipe(p_pessoa uuid, p_escritorio uuid, p_antes bigint default null, p_limite integer default 50)
returns table (id bigint, ocorrido_em timestamptz, autor_id uuid, autor_nome text, acao text, entidade_id text,
               dados jsonb, pessoa_nome text, para_nome text)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'escritorio.equipe.gerenciar');
  return query
    select h.id, h.ocorrido_em, h.autor_id, a.nome, h.acao, h.entidade_id, h.dados, m.nome, t.nome
      from historico h
      left join pessoas a on a.id = h.autor_id
      left join pessoas m on m.id = (h.dados ->> 'pessoa_id')::uuid
      left join pessoas t on t.id = (h.dados ->> 'passou_para')::uuid
     where h.escritorio_id = p_escritorio and not h.interno
       and h.acao in ('equipe.convidada', 'equipe.areas_mudadas', 'equipe.convite_reenviado', 'equipe.convite_cancelado',
                      'equipe.retirada', 'socio.convidado', 'escritorio.exportado')
       and (p_antes is null or h.id < p_antes)
     order by h.id desc
     limit least(greatest(coalesce(p_limite, 50), 1), 200);
end $$;

call fechar_acesso();
