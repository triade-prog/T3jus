-- Jurídico do Portal, parte 3a (EX-07, EX-09; desenho aprovado em
-- docs/design/aprovadas/portal-juridico, estados etapas e peticoes, decisões 8 e 11):
-- - Etapas do escritório: só a sócia dona edita. Muda nome, "o que é", o texto para o cliente
--   e o "avisar o Financeiro"; adiciona antes da final; sobe e desce; tira uma etapa e, se ela
--   tem casos, eles vão para a etapa escolhida, com a mudança registrada em cada caso. A última
--   é sempre a final: não sobe, não desce e não sai. Nada some: a etapa tirada fica guardada,
--   porque as mudanças de etapa antigas apontam para ela. Cada mudança vai ao histórico.
-- - Petições (EX-09, a validar): o lugar reservado guarda só a resposta à pergunta "você usaria
--   um gerador de petições?", com quem respondeu, sem dado de cliente.

insert into funcao_acoes (funcao, acao) values ('SOCIO', 'juridico.etapas.editar');

-- A etapa tirada sai da ordem (vai para 1001 em diante) e deixa de aparecer.
alter table etapas add column removida_em timestamptz;
alter table etapas drop constraint etapas_ordem_check;
alter table etapas add constraint etapas_ordem_check
  check ((removida_em is null and ordem between 1 and 30) or (removida_em is not null and ordem > 1000));
alter table etapas add constraint etapas_final_fica check (not (final and removida_em is not null));

-- Caso nunca entra numa etapa tirada (vale para cadastrar, mudar etapa e qualquer escrita futura).
create function casos_etapa_viva() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if exists (select 1 from etapas where id = new.etapa_id and removida_em is not null) then
    perform recusar_campos('Essa etapa saiu da lista do escritório.', 'etapaId');
  end if;
  return new;
end $$;
create trigger casos_etapa_viva before insert or update of etapa_id on casos
  for each row execute function casos_etapa_viva();

create or replace function etapas_lista(p_escritorio uuid) returns jsonb
language sql stable
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', e.id, 'ordem', e.ordem, 'nome', e.nome, 'descricao', e.descricao,
           'textoCliente', e.texto_cliente, 'avisaFinanceiro', e.avisa_financeiro, 'final', e.final,
           'casos', (select count(*) from casos c where c.etapa_id = e.id and c.situacao = 'ANDAMENTO')) order by e.ordem), '[]'::jsonb)
    from etapas e where e.escritorio_id = p_escritorio and e.removida_em is null
$$;

-- A página Etapas do escritório: a lista com a versão de cada uma, os encerrados na final e se
-- quem abriu pode editar.
create function portal_juridico_etapas(p_pessoa uuid, p_escritorio uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform entrar_area(p_pessoa, p_escritorio, 'JURIDICO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'juridico.ver');
  perform etapas_garantir(p_escritorio);
  return jsonb_build_object(
    'podeEditar', e_socio_dono(p_pessoa, p_escritorio),
    'escritorio', (select nome from escritorios where id = p_escritorio),
    'etapas', (select jsonb_agg(x || jsonb_build_object('versao', e.versao,
                 'encerrados', case when e.final then (select count(*) from casos c where c.etapa_id = e.id and c.situacao = 'ENCERRADO') end)
                 order by e.ordem)
                 from jsonb_array_elements(etapas_lista(p_escritorio)) x join etapas e on e.id = (x ->> 'id')::uuid));
end $$;

create function etapa_erros(p_dados jsonb) returns text[]
language plpgsql immutable
as $$
declare e text[] := '{}';
begin
  if length(btrim(coalesce(p_dados ->> 'nome', ''))) not between 2 and 60 then e := e || 'nome'::text; end if;
  if nullif(btrim(coalesce(p_dados ->> 'descricao', '')), '') is not null and length(btrim(p_dados ->> 'descricao')) not between 2 and 200 then
    e := e || 'descricao'::text;
  end if;
  if length(btrim(coalesce(p_dados ->> 'textoCliente', ''))) not between 10 and 240 then e := e || 'textoCliente'::text; end if;
  return e;
end $$;

create function etapa_do_escritorio(p_escritorio uuid, p_id uuid) returns etapas
language plpgsql stable
set search_path = public
as $$
declare r etapas;
begin
  select * into r from etapas where id = p_id and escritorio_id = p_escritorio and removida_em is null;
  if not found then raise exception 'Etapa não encontrada' using errcode = 'TC404'; end if;
  return r;
end $$;

-- Adicionar (sem id: entra logo antes da final) ou salvar uma etapa.
create function portal_juridico_etapa_salvar(p_pessoa uuid, p_escritorio uuid, p_id uuid, p_versao integer, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  e text[];
  r etapas;
  v_final etapas;
  v_versao integer;
  v_desc text := nullif(btrim(coalesce(p_dados ->> 'descricao', '')), '');
  v_aviso boolean := coalesce((p_dados ->> 'avisaFinanceiro')::boolean, false);
begin
  perform entrar_area(p_pessoa, p_escritorio, 'JURIDICO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'juridico.etapas.editar');
  perform etapas_garantir(p_escritorio);
  e := etapa_erros(p_dados);
  if exists (select 1 from etapas where escritorio_id = p_escritorio and removida_em is null and id is distinct from p_id
              and sem_acento(btrim(nome)) = sem_acento(btrim(p_dados ->> 'nome'))) and not 'nome' = any (e) then
    perform recusar_motivo('Já existe uma etapa com esse nome.', 'ETAPA_NOME_REPETIDO');
  end if;
  if cardinality(e) > 0 then perform recusar_campos('Confira os campos da etapa.', variadic e); end if;

  if p_id is null then
    select * into v_final from etapas where escritorio_id = p_escritorio and final;
    if v_final.ordem >= 30 then perform recusar_motivo('O escritório pode ter até 30 etapas.', 'ETAPAS_DEMAIS'); end if;
    update etapas set ordem = ordem + 1 where id = v_final.id;
    insert into etapas (escritorio_id, ordem, nome, descricao, texto_cliente, avisa_financeiro)
    values (p_escritorio, v_final.ordem, btrim(p_dados ->> 'nome'), v_desc, btrim(p_dados ->> 'textoCliente'), v_aviso)
    returning * into r;
    perform registrar_historico('juridico.etapa_criada', 'etapas', r.id::text,
      jsonb_build_object('etapa', r.nome, 'ordem', r.ordem));
    return jsonb_build_object('id', r.id, 'versao', r.versao);
  end if;

  r := etapa_do_escritorio(p_escritorio, p_id);
  update etapas set nome = btrim(p_dados ->> 'nome'), descricao = v_desc, texto_cliente = btrim(p_dados ->> 'textoCliente'),
         avisa_financeiro = case when final then false else v_aviso end
   where id = p_id and versao = p_versao
  returning versao into v_versao;
  if v_versao is null then perform conflito_versao('etapas', p_id); end if;
  perform registrar_historico('juridico.etapa_editada', 'etapas', p_id::text, jsonb_build_object(
    'antes', jsonb_build_object('etapa', r.nome, 'descricao', r.descricao, 'textoCliente', r.texto_cliente, 'avisaFinanceiro', r.avisa_financeiro),
    'depois', jsonb_build_object('etapa', btrim(p_dados ->> 'nome'), 'descricao', v_desc, 'textoCliente', btrim(p_dados ->> 'textoCliente'),
                                 'avisaFinanceiro', v_aviso and not r.final)));
  return jsonb_build_object('id', p_id, 'versao', v_versao);
end $$;

-- Subir ou descer uma posição. A final e a vizinha dela não trocam.
create function portal_juridico_etapa_mover(p_pessoa uuid, p_escritorio uuid, p_id uuid, p_direcao text) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r etapas;
  v etapas;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'JURIDICO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'juridico.etapas.editar');
  if p_direcao not in ('SOBE', 'DESCE') then perform recusar_campos('Direção inválida.', 'direcao'); end if;
  r := etapa_do_escritorio(p_escritorio, p_id);
  select * into v from etapas where escritorio_id = p_escritorio and removida_em is null
     and ordem = r.ordem + case when p_direcao = 'SOBE' then -1 else 1 end;
  if r.final or v.id is null or v.final then
    perform recusar_motivo('A última etapa é sempre a final e não muda de lugar.', 'ETAPA_FINAL_FIXA');
  end if;
  update etapas set ordem = case when id = r.id then v.ordem else r.ordem end where id in (r.id, v.id);
  perform registrar_historico('juridico.etapa_movida', 'etapas', r.id::text,
    jsonb_build_object('etapa', r.nome, 'de', r.ordem, 'para', v.ordem));
  return etapas_lista(p_escritorio);
end $$;

-- Tirar uma etapa. Com casos, pede para qual etapa eles vão; cada caso ganha a mudança no
-- histórico dele, sem aviso ao cliente. A etapa fica guardada, fora da lista.
create function portal_juridico_etapa_remover(p_pessoa uuid, p_escritorio uuid, p_id uuid, p_mover_para uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r etapas;
  d etapas;
  n integer;
  v_fora integer;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'JURIDICO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'juridico.etapas.editar');
  r := etapa_do_escritorio(p_escritorio, p_id);
  if r.final then perform recusar_motivo('A última etapa é sempre a final e não sai da lista.', 'ETAPA_FINAL_FIXA'); end if;
  if (select count(*) from etapas where escritorio_id = p_escritorio and removida_em is null) <= 2 then
    perform recusar_motivo('O escritório precisa de pelo menos uma etapa além da final.', 'ETAPAS_DE_MENOS');
  end if;
  select count(*) into n from casos where etapa_id = r.id;
  if n > 0 then
    if p_mover_para is null or p_mover_para = r.id then perform recusar_campos('Escolha para qual etapa os casos vão.', 'moverPara'); end if;
    d := etapa_do_escritorio(p_escritorio, p_mover_para);
    if d.final then perform recusar_campos('Os casos não vão para a final por aqui: ela pede o resultado na ficha.', 'moverPara'); end if;
    insert into caso_etapa_mudancas (escritorio_id, caso_id, de_etapa_id, para_etapa_id, motivo, por)
    select p_escritorio, c.id, r.id, d.id, 'A etapa “' || r.nome || '” saiu da lista do escritório.', p_pessoa
      from casos c where c.etapa_id = r.id;
    update casos set etapa_id = d.id, etapa_desde = app_now() where etapa_id = r.id;
  end if;
  select coalesce(max(ordem), 1000) + 1 into v_fora from etapas where escritorio_id = p_escritorio and removida_em is not null;
  update etapas set removida_em = app_now(), ordem = v_fora where id = r.id;
  update etapas set ordem = ordem - 1 where escritorio_id = p_escritorio and removida_em is null and ordem > r.ordem;
  perform registrar_historico('juridico.etapa_removida', 'etapas', r.id::text,
    jsonb_build_object('etapa', r.nome, 'casos', n, 'moverPara', d.nome));
  return jsonb_build_object('casosMovidos', n, 'para', d.nome);
end $$;

-- ------------------------------------------------------------------------- Petições (EX-09)

create table peticao_interesse (
  id             uuid primary key default gen_random_uuid(),
  escritorio_id  uuid not null references escritorios (id) on delete restrict,
  pessoa_id      uuid not null references pessoas (id) on delete restrict,
  resposta       text not null check (resposta in ('SEMANA', 'AS_VEZES', 'NAO')),
  como_faz_hoje  text check (length(btrim(como_faz_hoje)) between 2 and 1000),
  em             timestamptz not null default app_now()
);
create index peticao_interesse_escritorio on peticao_interesse (escritorio_id, em desc);
call proteger_tabela_escritorio('peticao_interesse');

insert into inventario_dados (tabela, dado_pessoal, o_que, para_que, base_legal, controlador, prazo, no_fim, situacao, exportar) values
 ('peticao_interesse', true, 'Resposta à pergunta sobre o gerador de petições: quem respondeu, a resposta e como faz hoje',
  'Decidir se o gerador de petições vale a pena (EX-09)', 'Legítimo interesse (LGPD, art. 7º, IX)',
  'T3jus', 'Enquanto o escritório for cliente do T3jus e 5 anos depois do fim do contrato', 'Exportadas ao escritório e apagadas com ele', 'APROVADO', true);

create function portal_juridico_peticoes(p_pessoa uuid, p_escritorio uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform entrar_area(p_pessoa, p_escritorio, 'JURIDICO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'juridico.ver');
  return jsonb_build_object('minhaResposta', (
    select jsonb_build_object('resposta', resposta, 'comoFazHoje', como_faz_hoje, 'em', em)
      from peticao_interesse where escritorio_id = p_escritorio and pessoa_id = p_pessoa order by em desc limit 1));
end $$;

create function portal_juridico_peticoes_responder(p_pessoa uuid, p_escritorio uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  e text[] := '{}';
  v_como text := nullif(btrim(coalesce(p_dados ->> 'comoFazHoje', '')), '');
  r peticao_interesse;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'JURIDICO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'juridico.ver');
  if coalesce(p_dados ->> 'resposta', '') not in ('SEMANA', 'AS_VEZES', 'NAO') then e := e || 'resposta'::text; end if;
  if v_como is not null and length(v_como) not between 2 and 1000 then e := e || 'comoFazHoje'::text; end if;
  if cardinality(e) > 0 then perform recusar_campos('Confira a resposta.', variadic e); end if;
  insert into peticao_interesse (escritorio_id, pessoa_id, resposta, como_faz_hoje)
  values (p_escritorio, p_pessoa, p_dados ->> 'resposta', v_como) returning * into r;
  return jsonb_build_object('resposta', r.resposta, 'comoFazHoje', r.como_faz_hoje, 'em', r.em);
end $$;

call fechar_acesso();
