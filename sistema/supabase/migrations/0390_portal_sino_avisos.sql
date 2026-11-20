-- O sino de avisos do Portal (F3.57; PD-07, PA-01, PT-03). Tela aprovada em
-- docs/design/aprovadas/portal-sem-avisos-sino (sino.html). Chega no sino o que pede aquela
-- pessoa: a conversa que a IA passou para ela, a conversa dela que alguém assumiu, a conversa que
-- alguém passou para ela e, para a sócia dona, a sugestão de mudança numa automação e a resposta
-- da Meta a um texto. O lembrete de prazo em 2 dias (F3.38) usa o mesmo tipo quando a rotina
-- diária existir. Cada pessoa lê só os próprios avisos; os dados vão gravados já sem o que ela
-- não pode ver. Ficam 30 dias no painel e continuam guardados; marcar como lido não apaga nada.

create table avisos_sino (
  id             uuid primary key default gen_random_uuid(),
  escritorio_id  uuid not null references escritorios (id) on delete restrict,
  pessoa_id      uuid not null references pessoas (id) on delete restrict,
  tipo           text not null check (tipo in ('CONVERSA_IA', 'CONVERSA_ASSUMIDA', 'CONVERSA_PASSADA', 'AUTOMACAO_SUGESTAO',
                                               'MODELO_APROVADO', 'MODELO_RECUSADO', 'PRAZO_2_DIAS')),
  -- Nomes, trecho e motivo do momento em que o aviso nasceu.
  dados          jsonb not null default '{}'::jsonb check (jsonb_typeof(dados) = 'object'),
  -- O registro que explica o aviso (a conversa, a automação, o prazo), para o link.
  origem_tabela  text not null check (origem_tabela in ('conversas', 'automacoes', 'prazos')),
  origem_id      uuid not null,
  criado_em      timestamptz not null default app_now(),
  lido_em        timestamptz
);
create index avisos_sino_pessoa on avisos_sino (escritorio_id, pessoa_id, criado_em desc);
call proteger_tabela_escritorio('avisos_sino');

-- Só se acrescentam; depois, muda só a marca de lido (e uma vez).
create function avisos_sino_guardiao() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' or old.lido_em is not null
     or (to_jsonb(new) - 'lido_em') is distinct from (to_jsonb(old) - 'lido_em') then
    raise exception 'Aviso não se muda nem se apaga: só se marca como lido' using errcode = 'TC023';
  end if;
  return new;
end $$;
create trigger avisos_sino_guardiao before update or delete on avisos_sino
  for each row execute function avisos_sino_guardiao();

insert into inventario_dados (tabela, dado_pessoal, o_que, para_que, base_legal, controlador, prazo, no_fim, situacao, exportar) values
 ('avisos_sino', true,
  'Os avisos do sino de cada pessoa da equipe: o que aconteceu, com o nome do cliente e um trecho da mensagem, e quando foi lido',
  'Avisar a pessoa do que pede a ação dela e levar ao lugar certo (PD-07)',
  'Execução de contrato e legítimo interesse (LGPD, art. 7º, V e IX)', 'Escritório',
  'Enquanto o escritório for cliente do T3jus',
  'Exportados ao escritório e apagados com ele', 'APROVADO', true);

-- Grava um aviso para uma pessoa (nunca para quem fez a ação).
create function aviso_sino(p_escritorio uuid, p_pessoa uuid, p_autor uuid, p_tipo text, p_tabela text, p_origem uuid, p_dados jsonb)
returns void
language sql
set search_path = public
as $$
  insert into avisos_sino (escritorio_id, pessoa_id, tipo, dados, origem_tabela, origem_id)
  select p_escritorio, p_pessoa, p_tipo, jsonb_strip_nulls(p_dados), p_tabela, p_origem
   where p_pessoa is not null and p_pessoa is distinct from p_autor
$$;

-- Conversas: a IA passou, alguém assumiu a conversa de outra pessoa, alguém passou a conversa.
create function avisos_sino_da_conversa() returns trigger
language plpgsql
set search_path = public
as $$
declare
  c conversas;
  v jsonb;
begin
  if new.evento not in ('IA_PASSOU', 'ASSUMIU', 'PASSOU') then return null; end if;
  select * into c from conversas where id = new.conversa_id;
  v := jsonb_build_object(
    'conversa', conversa_nome(c),
    'contato', case when c.nome_contato is distinct from conversa_nome(c) then c.nome_contato end,
    'quem', (select nome from pessoas where id = new.pessoa_id));
  if new.evento = 'IA_PASSOU' then
    perform aviso_sino(new.escritorio_id, (new.dados ->> 'para')::uuid, null, 'CONVERSA_IA', 'conversas', c.id,
      v || jsonb_build_object('motivo', new.dados ->> 'motivo',
                              'trecho', (select left(m.texto, 200) from conversa_mensagens m
                                          where m.conversa_id = c.id and m.autor = 'CLIENTE' and m.texto is not null
                                          order by m.criada_em desc, m.id desc limit 1)));
  elsif new.evento = 'ASSUMIU' then
    perform aviso_sino(new.escritorio_id, (new.dados ->> 'de')::uuid, new.pessoa_id, 'CONVERSA_ASSUMIDA', 'conversas', c.id, v);
  else
    perform aviso_sino(new.escritorio_id, (new.dados ->> 'para')::uuid, new.pessoa_id, 'CONVERSA_PASSADA', 'conversas', c.id,
      v || jsonb_build_object('recado', left(new.texto, 300)));
  end if;
  return null;
end $$;
create trigger avisos_sino_da_conversa after insert on conversa_mensagens
  for each row when (new.autor = 'SISTEMA') execute function avisos_sino_da_conversa();

-- Automações: a sugestão da equipe e a resposta da Meta vão para a sócia dona (ou os sócios donos).
create function avisos_sino_da_automacao() returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_tipo text := case new.tipo when 'SUGESTAO' then 'AUTOMACAO_SUGESTAO' when 'META_APROVOU' then 'MODELO_APROVADO'
                               when 'META_RECUSOU' then 'MODELO_RECUSADO' end;
  v jsonb;
  d uuid;
begin
  if v_tipo is null then return null; end if;
  v := jsonb_build_object(
    'automacao', (select nome from automacoes where id = new.automacao_id),
    'quem', (select nome from pessoas where id = new.pessoa_id),
    'texto', case when new.tipo = 'SUGESTAO' then left(new.detalhe ->> 'texto', 300) end,
    'modelo', new.detalhe ->> 'nome',
    'motivo', left(new.detalhe ->> 'motivo', 300));
  for d in select v2.pessoa_id from vinculos v2
            where v2.escritorio_id = new.escritorio_id and v2.funcao = 'SOCIO' and v2.revogado_em is null loop
    perform aviso_sino(new.escritorio_id, d, new.pessoa_id, v_tipo, 'automacoes', new.automacao_id, v);
  end loop;
  return null;
end $$;
create trigger avisos_sino_da_automacao after insert on automacao_eventos
  for each row when (new.tipo in ('SUGESTAO', 'META_APROVOU', 'META_RECUSOU')) execute function avisos_sino_da_automacao();

-- ---------------------------------------------------------------------------------------
-- Leituras e marcas do Portal. Todo mundo da equipe tem o sino; cada um vê só o seu.

create function aviso_sino_linha(a avisos_sino) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object('id', a.id, 'tipo', a.tipo, 'dados', a.dados, 'origem', a.origem_tabela, 'origemId', a.origem_id,
                            'em', a.criado_em, 'lido', a.lido_em is not null)
$$;

-- Os avisos dos últimos 30 dias (os mais novos primeiro), com quantos ainda não foram lidos.
create function portal_avisos(p_pessoa uuid, p_escritorio uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_desde timestamptz := app_now() - interval '30 days';
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'conversas.ver');
  return (
    with meus as (
      select a.* from avisos_sino a
       where a.escritorio_id = p_escritorio and a.pessoa_id = p_pessoa and a.criado_em >= v_desde
       order by a.criado_em desc, a.id desc limit 200)
    select jsonb_build_object(
      'novos', (select count(*) from meus where lido_em is null),
      'total', (select count(*) from meus),
      'itens', coalesce((select jsonb_agg(aviso_sino_linha(m) order by m.criado_em desc, m.id desc) from meus m), '[]'::jsonb)));
end $$;

-- Abrir um aviso marca como lido (o de outra pessoa nem aparece).
create function portal_aviso_lido(p_pessoa uuid, p_escritorio uuid, p_id uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'conversas.ver');
  if not exists (select 1 from avisos_sino where id = p_id and escritorio_id = p_escritorio and pessoa_id = p_pessoa) then
    raise exception 'Aviso não encontrado' using errcode = 'TC404';
  end if;
  update avisos_sino set lido_em = app_now() where id = p_id and lido_em is null;
  return portal_avisos(p_pessoa, p_escritorio);
end $$;

-- Marcar todos como lidos até o instante do último aviso mostrado: o que chegou depois continua novo.
create function portal_avisos_lidos(p_pessoa uuid, p_escritorio uuid, p_ate timestamptz) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_n integer;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'conversas.ver');
  if p_ate is null then perform recusar_campos('Falta até quando marcar', 'ate'); end if;
  update avisos_sino set lido_em = app_now()
   where escritorio_id = p_escritorio and pessoa_id = p_pessoa and lido_em is null and criado_em <= p_ate;
  get diagnostics v_n = row_count;
  return portal_avisos(p_pessoa, p_escritorio) || jsonb_build_object('marcados', v_n);
end $$;

call fechar_acesso();
