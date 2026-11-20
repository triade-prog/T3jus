-- Gerador de petições (EX-09), tela aprovada em docs/design/aprovadas/portal-peticoes (Carol,
-- 19/11/2026), com a revisão pelo advogado responsável (decisões 17 a 27). Sem IA: o texto é o
-- do modelo do escritório; o T3jus troca os campos entre colchetes.
-- - Os 8 modelos padrão do T3jus moram no código (packages/domain/src/peticoes.ts); aqui ficam
--   os modelos que o escritório envia, com as versões (trocar guarda a anterior, decisão 4).
--   Todos com a área Jurídico enviam e trocam modelos (pergunta 1).
-- - Gerar: a API pede ao banco o que conferir (portal_peticao_preparar), monta o .docx na memória
--   e grava (portal_peticao_gravar). Só bloqueiam endereçamento vazio, nenhuma parte e nenhum
--   advogado (decisão 8, pergunta 2); o que falta sai marcado e fica listado.
-- - Revisão (decisão 17): quem gera e não é o responsável pelo caso nem a sócia dona manda para o
--   responsável; responsável sem OAB, para a sócia dona. Situações: RASCUNHO, REVISAO, AJUSTE,
--   APROVADA e REPROVADA (decisão 19). Comentários gerais ou presos a um parágrafo (decisão 22).
--   Cada envio é uma versão (decisão 24); passar a revisão a outro advogado (decisão 27).
-- - Só a aprovada entra nos documentos do caso, com o arquivo limpo (decisões 12 e 25).
-- - Os arquivos ficam no bucket privado documentos-portal: <escritório>/peticoes/<versão>.docx
--   (limpo) e …-rascunho.docx (com "Rascunho · em revisão" no cabeçalho); os modelos em
--   <escritório>/peticoes/modelos/<versão>.docx. O nome que a pessoa dá não define o caminho.

-- ---------------------------------------------------------------------------------------
-- Dados novos no caso e nos documentos.

-- A qualificação da parte contrária (decisão 7): opcional, guardada para as próximas.
alter table casos add column parte_contraria_qualificacao text
  check (length(btrim(parte_contraria_qualificacao)) between 3 and 400);
update inventario_dados
   set o_que = 'Casos e processos: nome, área, parte contrária e a qualificação dela, número, tribunal, vara, valor da causa, etapa e responsável'
 where tabela = 'casos';

-- O .docx da petição aprovada entra nos documentos do caso (decisão 12).
alter table documentos_caso drop constraint documentos_caso_tipo_check;
alter table documentos_caso add constraint documentos_caso_tipo_check
  check (tipo in ('application/pdf', 'image/jpeg', 'image/png', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'));

-- O bucket dos documentos do Portal passa a aceitar o .docx (petições e modelos). No banco de
-- teste não há Storage; no Supabase, o bucket já existe.
do $$
begin
  if to_regclass('storage.buckets') is not null then
    update storage.buckets
       set allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png',
                                      'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
     where id = 'documentos-portal';
  end if;
end $$;

-- ---------------------------------------------------------------------------------------
-- Tabelas.

create function peticao_padrao_valido(p text) returns boolean
language sql immutable
as $$ select p in ('INICIAL_TRABALHISTA', 'INICIAL_CIVEL', 'CONTESTACAO_TRABALHISTA', 'CONTESTACAO_CIVEL', 'RECURSO_ORDINARIO',
                   'JUNTADA', 'PRAZO', 'MANIFESTACAO') $$;

create function peticao_campos_validos(p text[]) returns boolean
language sql immutable
as $$ select cardinality(p) <= 200 and not exists (select 1 from unnest(p) c where c !~ '^[A-Z][A-Z0-9_]{1,40}$') $$;

create table peticao_modelos (
  id              uuid primary key default gen_random_uuid(),
  ordem           bigint generated always as identity,
  escritorio_id   uuid not null references escritorios (id) on delete restrict,
  nome            text not null check (length(btrim(nome)) between 3 and 120),
  tipo            text not null check (tipo in ('INICIAL', 'CONTESTACAO', 'RECURSO', 'JUNTADA', 'PRAZO', 'MANIFESTACAO', 'OUTRA')),
  area            text not null check (area = 'QUALQUER' or area_direito_valida(area)),
  -- O modelo padrão do T3jus que este substitui (decisão 4: "Usar o do escritório").
  substitui       text check (peticao_padrao_valido(substitui)),
  criado_por      uuid not null references pessoas (id) on delete restrict,
  criado_em       timestamptz not null default app_now(),
  arquivado_em    timestamptz,
  arquivado_por   uuid references pessoas (id) on delete restrict,
  motivo_arquivo  text check (length(btrim(motivo_arquivo)) between 3 and 300),
  versao          integer not null default 1,
  check ((arquivado_em is null) = (arquivado_por is null)),
  check ((arquivado_em is null) = (motivo_arquivo is null))
);
create unique index peticao_modelos_substitui on peticao_modelos (escritorio_id, substitui) where substitui is not null and arquivado_em is null;
create index peticao_modelos_escritorio on peticao_modelos (escritorio_id, ordem);
call proteger_tabela_escritorio('peticao_modelos');

create table peticao_modelo_versoes (
  id              uuid primary key default gen_random_uuid(),
  ordem           bigint generated always as identity,
  escritorio_id   uuid not null references escritorios (id) on delete restrict,
  modelo_id       uuid not null references peticao_modelos (id) on delete restrict,
  numero          integer not null check (numero >= 1),
  nome_arquivo    text not null check (length(btrim(nome_arquivo)) between 1 and 200 and nome_arquivo !~ '[/\\]'),
  tamanho         integer not null check (tamanho between 1 and 5242880),
  campos          text[] not null check (peticao_campos_validos(campos)),
  desconhecidos   text[] not null check (peticao_campos_validos(desconhecidos)),
  -- O texto de cada parágrafo, para a prévia sem abrir o arquivo (decisão 10).
  paragrafos      text[] not null check (cardinality(paragrafos) <= 5000),
  enviado_por     uuid not null references pessoas (id) on delete restrict,
  enviado_em      timestamptz not null default app_now(),
  unique (modelo_id, numero)
);
call proteger_tabela_escritorio('peticao_modelo_versoes');

create table peticoes (
  id                uuid primary key default gen_random_uuid(),
  ordem             bigint generated always as identity,
  escritorio_id     uuid not null references escritorios (id) on delete restrict,
  caso_id           uuid not null references casos (id) on delete restrict,
  modelo_id         uuid references peticao_modelos (id) on delete restrict,
  modelo_versao_id  uuid references peticao_modelo_versoes (id) on delete restrict,
  modelo_padrao     text check (peticao_padrao_valido(modelo_padrao)),
  -- O nome do modelo no dia (o modelo pode ser trocado ou arquivado depois).
  modelo_nome       text not null check (length(btrim(modelo_nome)) between 3 and 120),
  situacao          text not null check (situacao in ('RASCUNHO', 'REVISAO', 'AJUSTE', 'APROVADA', 'REPROVADA')),
  revisor_id        uuid references pessoas (id) on delete restrict,
  versao_atual      integer not null default 1 check (versao_atual >= 1),
  gerado_por        uuid not null references pessoas (id) on delete restrict,
  gerado_em         timestamptz not null default app_now(),
  aprovada_em       timestamptz,
  aprovada_por      uuid references pessoas (id) on delete restrict,
  documento_id      uuid references documentos_caso (id) on delete restrict,
  versao            integer not null default 1,
  check ((modelo_padrao is null) <> (modelo_versao_id is null)),
  check ((modelo_versao_id is null) = (modelo_id is null)),
  check ((situacao = 'APROVADA') = (aprovada_em is not null)),
  check ((aprovada_em is null) = (aprovada_por is null)),
  check ((situacao = 'APROVADA') = (documento_id is not null))
);
create index peticoes_escritorio on peticoes (escritorio_id, ordem desc);
create index peticoes_caso on peticoes (caso_id, ordem desc);
create index peticoes_revisor on peticoes (escritorio_id, revisor_id) where situacao = 'REVISAO';
call proteger_tabela_escritorio('peticoes');

alter table documentos_caso add column peticao_id uuid references peticoes (id) on delete restrict;

-- Cada envio é uma versão (decisão 24). A v1 é a geração.
create table peticao_versoes (
  id              uuid primary key default gen_random_uuid(),
  escritorio_id   uuid not null references escritorios (id) on delete restrict,
  peticao_id      uuid not null references peticoes (id) on delete restrict,
  numero          integer not null check (numero >= 1),
  origem          text not null check (origem in ('DADOS', 'DOCX_EDITADO')),
  nome_arquivo    text not null check (length(btrim(nome_arquivo)) between 1 and 200 and nome_arquivo !~ '[/\\]'),
  tamanho         integer not null check (tamanho between 1 and 5242880),
  -- O que a pessoa escolheu no formulário (para refazer pelos dados, decisão 23).
  escolhas        jsonb not null check (jsonb_typeof(escolhas) = 'object'),
  -- Partes e advogados com a OAB do dia (PT-03).
  dados_do_dia    jsonb not null check (jsonb_typeof(dados_do_dia) = 'object'),
  marcados        text[] not null default '{}' check (cardinality(marcados) <= 100),
  -- A prévia por parágrafo, com as marcas de origem (decisão 10).
  previa          jsonb not null check (jsonb_typeof(previa) = 'array' and jsonb_array_length(previa) <= 5000),
  recado          text check (length(btrim(recado)) between 1 and 1000),
  enviada_por     uuid not null references pessoas (id) on delete restrict,
  enviada_em      timestamptz not null default app_now(),
  unique (peticao_id, numero)
);
call proteger_tabela_escritorio('peticao_versoes');

-- O que aconteceu com a petição: gerada, enviada, cada decisão, passada, versão nova.
create table peticao_eventos (
  id              uuid primary key default gen_random_uuid(),
  ordem           bigint generated always as identity,
  escritorio_id   uuid not null references escritorios (id) on delete restrict,
  peticao_id      uuid not null references peticoes (id) on delete restrict,
  versao_id       uuid not null references peticao_versoes (id) on delete restrict,
  tipo            text not null check (tipo in ('GERADA', 'ENVIADA', 'APROVADA', 'AJUSTE', 'REPROVADA', 'PASSADA', 'VERSAO')),
  por             uuid not null references pessoas (id) on delete restrict,
  para            uuid references pessoas (id) on delete restrict,
  texto           text check (length(btrim(texto)) between 1 and 2000),
  em              timestamptz not null default app_now()
);
create index peticao_eventos_peticao on peticao_eventos (peticao_id, ordem);
call proteger_tabela_escritorio('peticao_eventos');

create table peticao_comentarios (
  id                  uuid primary key default gen_random_uuid(),
  ordem               bigint generated always as identity,
  escritorio_id       uuid not null references escritorios (id) on delete restrict,
  peticao_id          uuid not null references peticoes (id) on delete restrict,
  versao_id           uuid not null references peticao_versoes (id) on delete restrict,
  autor_id            uuid not null references pessoas (id) on delete restrict,
  paragrafo           integer check (paragrafo >= 1),
  trecho              text check (length(trecho) between 1 and 160),
  texto               text not null check (length(btrim(texto)) between 1 and 2000),
  criado_em           timestamptz not null default app_now(),
  -- A decisão que levou o comentário; antes dela, quem escreveu pode desfazer.
  evento_id           uuid references peticao_eventos (id) on delete restrict,
  desfeito_em         timestamptz,
  resolvido_em        timestamptz,
  resolvido_por       uuid references pessoas (id) on delete restrict,
  resolvido_na_versao integer,
  check ((paragrafo is null) = (trecho is null)),
  check (desfeito_em is null or evento_id is null),
  check ((resolvido_em is null) = (resolvido_por is null) and (resolvido_em is null) = (resolvido_na_versao is null)),
  check (resolvido_em is null or evento_id is not null)
);
create index peticao_comentarios_peticao on peticao_comentarios (peticao_id, ordem);
call proteger_tabela_escritorio('peticao_comentarios');

-- Nada se apaga (PT-03).
create function peticao_so_acrescenta() returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'Registro da petição não se muda nem se apaga' using errcode = 'TC023';
end $$;
create trigger peticao_modelo_versoes_so_acrescenta before update or delete on peticao_modelo_versoes
  for each row execute function peticao_so_acrescenta();
create trigger peticao_versoes_so_acrescenta before update or delete on peticao_versoes
  for each row execute function peticao_so_acrescenta();
create trigger peticao_eventos_so_acrescenta before update or delete on peticao_eventos
  for each row execute function peticao_so_acrescenta();

-- O modelo só se arquiva; arquivado não muda mais.
create function peticao_modelo_guarda() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' or old.arquivado_em is not null
     or (to_jsonb(new) - array['arquivado_em', 'arquivado_por', 'motivo_arquivo', 'versao'])
        is distinct from (to_jsonb(old) - array['arquivado_em', 'arquivado_por', 'motivo_arquivo', 'versao']) then
    raise exception 'Modelo de petição só se arquiva' using errcode = 'TC023';
  end if;
  return new;
end $$;
create trigger peticao_modelo_guarda before update or delete on peticao_modelos
  for each row execute function peticao_modelo_guarda();

-- A petição muda só a situação, o revisor e a versão atual; aprovada ou reprovada, não muda mais.
create function peticao_guarda() returns trigger
language plpgsql
set search_path = public
as $$
declare v_muda text[] := array['situacao', 'revisor_id', 'versao_atual', 'aprovada_em', 'aprovada_por', 'documento_id', 'versao'];
begin
  if tg_op = 'DELETE' or old.situacao in ('APROVADA', 'REPROVADA')
     or (to_jsonb(new) - v_muda) is distinct from (to_jsonb(old) - v_muda) then
    raise exception 'Petição não se apaga; depois da decisão final, não muda' using errcode = 'TC023';
  end if;
  return new;
end $$;
create trigger peticao_guarda before update or delete on peticoes
  for each row execute function peticao_guarda();

-- O comentário: a decisão o leva uma vez; antes, quem escreveu desfaz; depois, se resolve uma vez.
create function peticao_comentario_guarda() returns trigger
language plpgsql
set search_path = public
as $$
declare v_muda text[] := array['evento_id', 'desfeito_em', 'resolvido_em', 'resolvido_por', 'resolvido_na_versao'];
begin
  if tg_op = 'DELETE'
     or (to_jsonb(new) - v_muda) is distinct from (to_jsonb(old) - v_muda)
     or old.desfeito_em is not null or old.resolvido_em is not null
     or (old.evento_id is not null and new.evento_id is distinct from old.evento_id) then
    raise exception 'Comentário não se apaga; depois de enviado, só se marca como resolvido' using errcode = 'TC023';
  end if;
  return new;
end $$;
create trigger peticao_comentario_guarda before update or delete on peticao_comentarios
  for each row execute function peticao_comentario_guarda();

insert into inventario_dados (tabela, dado_pessoal, o_que, para_que, base_legal, controlador, prazo, no_fim, situacao, exportar) values
 ('peticao_modelos', false, 'Modelos de petição do escritório: nome, tipo, área, qual padrão substitui e quem enviou', null, null, null, null, null, null, true),
 ('peticao_modelo_versoes', false, 'Versões de cada modelo de petição (o arquivo fica no Storage), com os campos achados e o texto dos parágrafos', null, null, null, null, null, null, true),
 ('peticoes', true, 'Petições geradas: caso, modelo, situação da revisão, quem gerou, quem revisa e quem aprovou',
  'Gerar petições a partir dos modelos do escritório e revisá-las (EX-09)', 'Execução de contrato (LGPD, art. 7º, V) e exercício regular de direitos (art. 7º, VI)',
  'Escritório', 'Enquanto o escritório for cliente do T3jus e 5 anos depois do fim do contrato', 'Exportadas ao escritório e apagadas com ele, com os arquivos', 'APROVADO', true),
 ('peticao_versoes', true, 'Cada versão da petição: o arquivo (no Storage), os dados escolhidos, as partes e os advogados com a OAB do dia, o que faltou e a prévia',
  'Guardar o que foi gerado e revisado (EX-09, PT-03)', 'Execução de contrato (LGPD, art. 7º, V) e exercício regular de direitos (art. 7º, VI)',
  'Escritório', 'Enquanto o escritório for cliente do T3jus e 5 anos depois do fim do contrato', 'Exportadas ao escritório e apagadas com ele, com os arquivos', 'APROVADO', true),
 ('peticao_eventos', true, 'O que aconteceu com cada petição: gerada, enviada, decisões da revisão e o recado ou motivo',
  'Histórico da revisão pelo advogado responsável (EX-09)', 'Execução de contrato (LGPD, art. 7º, V)',
  'Escritório', 'Enquanto o escritório for cliente do T3jus e 5 anos depois do fim do contrato', 'Exportados ao escritório e apagados com ele', 'APROVADO', true),
 ('peticao_comentarios', true, 'Comentários da revisão, gerais ou presos a um parágrafo, com o trecho citado',
  'Pedir e acompanhar ajustes na petição (EX-09)', 'Execução de contrato (LGPD, art. 7º, V)',
  'Escritório', 'Enquanto o escritório for cliente do T3jus e 5 anos depois do fim do contrato', 'Exportados ao escritório e apagados com ele', 'APROVADO', true);

-- Avisos do sino (decisão 20): pedido de revisão ao revisor; decisão a quem gerou; passagem.
alter table avisos_sino drop constraint avisos_sino_tipo_check;
alter table avisos_sino add constraint avisos_sino_tipo_check
  check (tipo in ('CONVERSA_IA', 'CONVERSA_ASSUMIDA', 'CONVERSA_PASSADA', 'AUTOMACAO_SUGESTAO', 'MODELO_APROVADO', 'MODELO_RECUSADO', 'PRAZO_2_DIAS',
                  'PETICAO_REVISAR', 'PETICAO_DECIDIDA', 'PETICAO_PASSADA'));
alter table avisos_sino drop constraint avisos_sino_origem_tabela_check;
alter table avisos_sino add constraint avisos_sino_origem_tabela_check
  check (origem_tabela in ('conversas', 'automacoes', 'prazos', 'peticoes'));

-- ---------------------------------------------------------------------------------------
-- Peças.

-- Recusa com o código de cada campo: { campos, motivos, motivo } (o primeiro motivo).
create function peticao_recusar(p_motivos jsonb, p_mensagem text default 'Confira os dados da petição') returns void
language plpgsql
set search_path = public
as $$
declare v_campos jsonb := (select coalesce(jsonb_agg(k), '[]'::jsonb) from jsonb_object_keys(p_motivos) k);
begin
  raise exception '%', p_mensagem using errcode = 'TC422',
    detail = jsonb_build_object('campos', v_campos, 'motivos', p_motivos,
                                'motivo', (select v from jsonb_each_text(p_motivos) e(k, v) limit 1))::text;
end $$;

create function peticao_tem_oab(p_alvo uuid, p_escritorio uuid) returns boolean
language sql stable
set search_path = public
as $$ select exists (select 1 from oab_inscricao where pessoa_id = p_alvo and escritorio_id = p_escritorio and removido_em is null) $$;

-- Quem está na equipe agora (sócio dono ou equipe, vínculo ativo).
create function peticao_membro(p_alvo uuid, p_escritorio uuid) returns boolean
language sql stable
set search_path = public
as $$
  select exists (select 1 from vinculos where pessoa_id = p_alvo and escritorio_id = p_escritorio
                                          and funcao in ('SOCIO', 'EQUIPE') and revogado_em is null)
$$;

-- A sócia dona (o vínculo de sócio mais antigo).
create function peticao_socio_dono(p_escritorio uuid) returns uuid
language sql stable
set search_path = public
as $$
  select pessoa_id from vinculos where escritorio_id = p_escritorio and funcao = 'SOCIO' and revogado_em is null
   order by criado_em, id limit 1
$$;

-- Decisão 17: quem revisa a petição gerada por p_autor no caso; null quando sai aprovada.
create function peticao_revisor(p_autor uuid, p_escritorio uuid, p_caso uuid, out revisor uuid, out sem_revisao text)
language plpgsql stable
set search_path = public
as $$
declare v_resp uuid := (select responsavel_id from casos where id = p_caso);
begin
  if p_autor = v_resp then sem_revisao := 'RESPONSAVEL'; return; end if;
  if e_socio_dono(p_autor, p_escritorio) then sem_revisao := 'SOCIO_DONO'; return; end if;
  if peticao_tem_oab(v_resp, p_escritorio) and peticao_membro(v_resp, p_escritorio)
     and 'JURIDICO' = any (areas_da_pessoa(v_resp, p_escritorio)) then
    revisor := v_resp;
  else
    revisor := peticao_socio_dono(p_escritorio);
  end if;
end $$;

-- Quem pode revisar: tem OAB e a área Jurídico (decisões 17 e 27).
create function peticao_revisor_valido(p_alvo uuid, p_escritorio uuid) returns boolean
language sql stable
set search_path = public
as $$
  select peticao_membro(p_alvo, p_escritorio) and peticao_tem_oab(p_alvo, p_escritorio)
     and 'JURIDICO' = any (areas_da_pessoa(p_alvo, p_escritorio))
$$;

create function peticao_ler_caso(p_escritorio uuid, p_caso uuid) returns casos
language plpgsql stable
set search_path = public
as $$
declare c casos;
begin
  select * into c from casos where id = p_caso and escritorio_id = p_escritorio;
  if c.id is null then raise exception 'Caso não encontrado' using errcode = 'TC404'; end if;
  return c;
end $$;

-- O que o formulário mostra para o caso (GET …/peticao-dados): clientes com a qualificação,
-- quem pode assinar (só quem tem OAB), quem fica de fora, o escritório e quem revisaria.
create function peticao_dados(p_pessoa uuid, p_escritorio uuid, c casos) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'caso', jsonb_build_object('id', c.id, 'nome', c.nome, 'area', c.area, 'numero', c.numero_cnj, 'vara', c.vara, 'tribunal', c.tribunal,
                               'sistema', c.sistema, 'parteContraria', c.parte_contraria, 'parteContrariaQualificacao', c.parte_contraria_qualificacao,
                               'valorCausa', c.valor_causa, 'responsavel', pessoa_ref(c.responsavel_id)),
    'clientes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', k.id, 'nome', k.nome, 'tipo', k.tipo, 'papel', cc.papel, 'documento', k.documento, 'nacionalidade', k.nacionalidade,
        'estadoCivil', k.estado_civil, 'profissao', k.profissao, 'rg', k.rg, 'rgOrgao', k.rg_orgao, 'endereco', k.endereco,
        'bairro', k.bairro, 'cidade', k.cidade, 'uf', k.uf, 'cep', k.cep, 'repNome', k.rep_nome, 'repCargo', k.rep_cargo) order by cc.ordem)
        from caso_clientes cc join clientes_escritorio k on k.id = cc.cliente_id
       where cc.caso_id = c.id), '[]'::jsonb),
    'advogados', coalesce((
      select jsonb_agg(jsonb_build_object('pessoaId', p.id, 'nome', p.nome, 'responsavel', p.id = c.responsavel_id,
                                          'socioDono', e_socio_dono(p.id, c.escritorio_id), 'inscricoes', oab_inscricoes(p.id, c.escritorio_id))
                       order by p.id <> c.responsavel_id, not e_socio_dono(p.id, c.escritorio_id), p.nome)
        from pessoas p
       where peticao_membro(p.id, c.escritorio_id) and peticao_tem_oab(p.id, c.escritorio_id)), '[]'::jsonb),
    'semOab', coalesce((
      select jsonb_agg(pessoa_ref(p.id) order by p.nome)
        from pessoas p
       where peticao_membro(p.id, c.escritorio_id) and not peticao_tem_oab(p.id, c.escritorio_id)
         and 'JURIDICO' = any (areas_da_pessoa(p.id, c.escritorio_id))), '[]'::jsonb),
    'escritorio', (select jsonb_build_object('nome', e.nome, 'endereco', e.endereco, 'cidade', e.cidade, 'uf', e.uf) from escritorios e where e.id = c.escritorio_id),
    'hoje', hoje_brasilia(),
    'revisor', (select pessoa_ref(r.revisor) from peticao_revisor(p_pessoa, c.escritorio_id, c.id) r),
    'semRevisao', (select r.sem_revisao from peticao_revisor(p_pessoa, c.escritorio_id, c.id) r))
$$;

create function portal_peticao_dados(p_pessoa uuid, p_escritorio uuid, p_caso uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform entrar_area(p_pessoa, p_escritorio, 'JURIDICO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'juridico.ver');
  return peticao_dados(p_pessoa, p_escritorio, peticao_ler_caso(p_escritorio, p_caso));
end $$;

-- O modelo escolhido: o padrão (pelo código) ou a versão mais nova do modelo do escritório.
create function peticao_modelo_escolhido(p_escritorio uuid, p_modelo jsonb) returns jsonb
language plpgsql stable
set search_path = public
as $$
declare
  v_padrao text := nullif(btrim(coalesce(p_modelo ->> 'padrao', '')), '');
  v_id uuid;
  m peticao_modelos;
  v peticao_modelo_versoes;
begin
  if v_padrao is not null then
    if not peticao_padrao_valido(v_padrao)
       or exists (select 1 from peticao_modelos where escritorio_id = p_escritorio and substitui = v_padrao and arquivado_em is null) then
      return null;
    end if;
    return jsonb_build_object('padrao', v_padrao);
  end if;
  begin
    v_id := (p_modelo ->> 'modeloId')::uuid;
  exception when others then return null;
  end;
  select * into m from peticao_modelos where id = v_id and escritorio_id = p_escritorio and arquivado_em is null;
  if m.id is null then return null; end if;
  select * into v from peticao_modelo_versoes where modelo_id = m.id order by numero desc limit 1;
  return jsonb_build_object('modeloId', m.id, 'versaoId', v.id, 'nome', m.nome, 'numero', v.numero, 'campos', to_jsonb(v.campos),
                            'paragrafos', to_jsonb(v.paragrafos));
end $$;

-- Confere o pedido (decisão 8). Só bloqueiam o que impede a peça de existir: endereçamento,
-- partes e advogados (com inscrições válidas). Devolve o pedido limpo e o modelo.
create function peticao_conferir(p_escritorio uuid, c casos, p_pedido jsonb) returns jsonb
language plpgsql stable
set search_path = public
as $$
declare
  e jsonb := '{}'::jsonb;
  v_modelo jsonb := peticao_modelo_escolhido(p_escritorio, coalesce(p_pedido -> 'modelo', '{}'::jsonb));
  v_partes uuid[];
  v_adv jsonb;
  v_numero text := nullif(regexp_replace(coalesce(p_pedido ->> 'numero', ''), '\D', '', 'g'), '');
  v_end text := btrim(coalesce(p_pedido ->> 'enderecamento', ''));
  v_data text := btrim(coalesce(p_pedido ->> 'cidadeData', ''));
  v_qualif text := nullif(btrim(coalesce(p_pedido ->> 'parteContrariaQualificacao', '')), '');
  a jsonb;
  v_pid uuid;
  v_insc uuid[];
begin
  if v_modelo is null then e := e || '{"modelo": "MODELO_INVALIDO"}'; end if;
  if length(v_end) < 3 then e := e || '{"enderecamento": "ENDERECAMENTO_OBRIGATORIO"}';
  elsif length(v_end) > 400 then e := e || '{"enderecamento": "ENDERECAMENTO_LONGO"}'; end if;

  begin
    select coalesce(array_agg(distinct x::uuid), '{}') into v_partes from jsonb_array_elements_text(coalesce(p_pedido -> 'partes', '[]'::jsonb)) x;
  exception when others then v_partes := null;
  end;
  if v_partes is null or exists (select 1 from unnest(v_partes) x where not exists (select 1 from caso_clientes where caso_id = c.id and cliente_id = x)) then
    e := e || '{"partes": "PARTE_INVALIDA"}';
  elsif cardinality(v_partes) = 0 then
    e := e || '{"partes": "PARTE_OBRIGATORIA"}';
  end if;

  v_adv := '[]'::jsonb;
  for a in select * from jsonb_array_elements(coalesce(p_pedido -> 'advogados', '[]'::jsonb)) loop
    begin
      v_pid := (a ->> 'pessoaId')::uuid;
      select coalesce(array_agg(distinct x::uuid), '{}') into v_insc from jsonb_array_elements_text(coalesce(a -> 'inscricoes', '[]'::jsonb)) x;
    exception when others then v_pid := null;
    end;
    if v_pid is null or not peticao_membro(v_pid, p_escritorio) or not peticao_tem_oab(v_pid, p_escritorio) then
      e := e || '{"advogados": "ADVOGADO_SEM_OAB"}';
    elsif cardinality(v_insc) = 0 or exists (select 1 from unnest(v_insc) x where not exists (
            select 1 from oab_inscricao where id = x and pessoa_id = v_pid and escritorio_id = p_escritorio and removido_em is null)) then
      e := e || '{"advogados": "INSCRICAO_INVALIDA"}';
    elsif v_adv @> jsonb_build_array(jsonb_build_object('pessoaId', v_pid)) then
      e := e || '{"advogados": "ADVOGADO_REPETIDO"}';
    else
      v_adv := v_adv || jsonb_build_array(jsonb_build_object('pessoaId', v_pid, 'inscricoes', to_jsonb(v_insc)));
    end if;
  end loop;
  if jsonb_array_length(coalesce(p_pedido -> 'advogados', '[]'::jsonb)) = 0 then e := e || '{"advogados": "SEM_ADVOGADO"}'; end if;

  if v_numero is not null and not numero_cnj_valido(v_numero) then e := e || '{"numero": "NUMERO_CNJ_INVALIDO"}';
  elsif v_numero is not null and coalesce((p_pedido ->> 'gravarNumero')::boolean, false) and c.numero_cnj is null
        and exists (select 1 from casos where escritorio_id = p_escritorio and numero_cnj = v_numero and id <> c.id) then
    e := e || '{"numero": "NUMERO_EM_OUTRO_CASO"}';
  end if;
  if length(v_data) < 3 then e := e || '{"cidadeData": "CIDADE_DATA_OBRIGATORIA"}';
  elsif length(v_data) > 120 then e := e || '{"cidadeData": "CIDADE_DATA_LONGA"}'; end if;
  if v_qualif is not null and length(v_qualif) > 400 then e := e || '{"parteContrariaQualificacao": "TEXTO_LONGO"}'; end if;
  if (p_pedido ->> 'valorCausa') is not null and (p_pedido ->> 'valorCausa') !~ '^[1-9][0-9]{0,14}$' then e := e || '{"valorCausa": "VALOR_INVALIDO"}'; end if;

  if e <> '{}'::jsonb then perform peticao_recusar(e); end if;
  return jsonb_build_object('modelo', v_modelo, 'partes', to_jsonb(v_partes), 'advogados', v_adv, 'enderecamento', v_end,
                            'numero', v_numero, 'gravarNumero', coalesce((p_pedido ->> 'gravarNumero')::boolean, false) and v_numero is not null,
                            'valorCausa', case when p_pedido ? 'valorCausa' then p_pedido -> 'valorCausa' else to_jsonb(c.valor_causa) end,
                            'parteContrariaQualificacao', case when p_pedido ? 'parteContrariaQualificacao' then to_jsonb(v_qualif) else to_jsonb(c.parte_contraria_qualificacao) end,
                            'cidadeData', v_data);
end $$;

-- Antes de gerar (e na prévia): confere e devolve os dados e o modelo. Não grava nada.
create function portal_peticao_preparar(p_pessoa uuid, p_escritorio uuid, p_caso uuid, p_pedido jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare c casos;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'JURIDICO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'juridico.editar');
  perform portal_exigir_escrita(p_pessoa, p_escritorio);
  c := peticao_ler_caso(p_escritorio, p_caso);
  return jsonb_build_object('pedido', peticao_conferir(p_escritorio, c, p_pedido), 'dados', peticao_dados(p_pessoa, p_escritorio, c));
end $$;

-- O que a versão grava sobre o dia: as partes e os advogados com a frase da OAB (PT-03).
create function peticao_dados_do_dia(p_escritorio uuid, p_pedido jsonb) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'partes', coalesce((select jsonb_agg(jsonb_build_object('id', k.id, 'nome', k.nome) order by x.n)
                          from jsonb_array_elements_text(p_pedido -> 'partes') with ordinality x(id, n)
                          join clientes_escritorio k on k.id = x.id::uuid), '[]'::jsonb),
    'advogados', coalesce((select jsonb_agg(jsonb_build_object('pessoaId', p.id, 'nome', p.nome,
                                    'frase', oab_frase(p.id, p_escritorio, array(select jsonb_array_elements_text(a -> 'inscricoes')::uuid))) order by n)
                             from jsonb_array_elements(p_pedido -> 'advogados') with ordinality y(a, n)
                             join pessoas p on p.id = (a ->> 'pessoaId')::uuid), '[]'::jsonb),
    'enderecamento', p_pedido -> 'enderecamento', 'cidadeData', p_pedido -> 'cidadeData', 'numero', p_pedido -> 'numero',
    'valorCausa', p_pedido -> 'valorCausa')
$$;

-- Confere o resultado que a API montou (o arquivo e a prévia).
create function peticao_conferir_resultado(p jsonb) returns void
language plpgsql
set search_path = public
as $$
begin
  if p ->> 'versaoId' is null or p ->> 'arquivo' is null or (p ->> 'tamanho') is null
     or jsonb_typeof(p -> 'previa') <> 'array' or jsonb_typeof(coalesce(p -> 'marcados', '[]'::jsonb)) <> 'array' then
    raise exception 'Resultado da petição incompleto' using errcode = 'TC422';
  end if;
end $$;

-- Aprovada: entra nos documentos do caso, com o arquivo que a API já copiou (decisão 25).
create function peticao_aprovar(p_pessoa uuid, x peticoes, p_documento uuid) returns void
language plpgsql
set search_path = public
as $$
declare v peticao_versoes;
begin
  if p_documento is null then raise exception 'Falta o documento da aprovada' using errcode = 'TC422'; end if;
  select * into v from peticao_versoes where peticao_id = x.id and numero = x.versao_atual;
  insert into documentos_caso (id, escritorio_id, caso_id, categoria, nome, tipo, tamanho, situacao, enviado_por, concluido_em, peticao_id)
  values (p_documento, x.escritorio_id, x.caso_id, 'PETICAO', v.nome_arquivo,
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document', v.tamanho, 'PRONTO', p_pessoa, app_now(), x.id);
  update peticoes set situacao = 'APROVADA', aprovada_em = app_now(), aprovada_por = p_pessoa, documento_id = p_documento, revisor_id = null
   where id = x.id;
end $$;

-- Gera a petição (decisões 8, 17 e 18). p_resultado vem da API: { peticaoId, versaoId,
-- documentoId (quando sai aprovada), modeloNome, arquivo, tamanho, marcados, previa }.
create function portal_peticao_gravar(p_pessoa uuid, p_escritorio uuid, p_caso uuid, p_pedido jsonb, p_resultado jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c casos;
  v_ped jsonb;
  r record;
  v_sit text;
  v_id uuid := (p_resultado ->> 'peticaoId')::uuid;
  v_ver uuid := (p_resultado ->> 'versaoId')::uuid;
  x peticoes;
  v_enviar boolean := coalesce((p_pedido ->> 'enviar')::boolean, false);
  v_recado text := nullif(btrim(coalesce(p_pedido ->> 'recado', '')), '');
begin
  perform entrar_area(p_pessoa, p_escritorio, 'JURIDICO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'juridico.editar');
  perform portal_exigir_escrita(p_pessoa, p_escritorio);
  perform peticao_conferir_resultado(p_resultado);
  select * into c from casos where id = p_caso and escritorio_id = p_escritorio for update;
  if c.id is null then raise exception 'Caso não encontrado' using errcode = 'TC404'; end if;
  v_ped := peticao_conferir(p_escritorio, c, p_pedido);
  select * into r from peticao_revisor(p_pessoa, p_escritorio, c.id);
  if r.sem_revisao is null and r.revisor is null then
    raise exception 'Não há quem revise' using errcode = 'TC422', detail = jsonb_build_object('motivo', 'SEM_REVISOR')::text;
  end if;
  v_sit := case when r.sem_revisao is not null then 'APROVADA' when v_enviar then 'REVISAO' else 'RASCUNHO' end;

  insert into peticoes (id, escritorio_id, caso_id, modelo_id, modelo_versao_id, modelo_padrao, modelo_nome, situacao, revisor_id, gerado_por)
  values (v_id, p_escritorio, c.id, (v_ped -> 'modelo' ->> 'modeloId')::uuid, (v_ped -> 'modelo' ->> 'versaoId')::uuid,
          v_ped -> 'modelo' ->> 'padrao', coalesce(v_ped -> 'modelo' ->> 'nome', p_resultado ->> 'modeloNome'),
          'RASCUNHO', r.revisor, p_pessoa)
  returning * into x;
  insert into peticao_versoes (id, escritorio_id, peticao_id, numero, origem, nome_arquivo, tamanho, escolhas, dados_do_dia, marcados, previa, recado, enviada_por)
  values (v_ver, p_escritorio, x.id, 1, 'DADOS', p_resultado ->> 'arquivo', (p_resultado ->> 'tamanho')::integer, v_ped,
          peticao_dados_do_dia(p_escritorio, v_ped), array(select jsonb_array_elements_text(coalesce(p_resultado -> 'marcados', '[]'::jsonb))),
          p_resultado -> 'previa', case when v_sit = 'REVISAO' then v_recado end, p_pessoa);
  insert into peticao_eventos (escritorio_id, peticao_id, versao_id, tipo, por) values (p_escritorio, x.id, v_ver, 'GERADA', p_pessoa);

  -- O número escrito vai para o caso só quando pedido e o caso ainda não tem (decisão 7); a
  -- qualificação da parte contrária fica guardada para as próximas.
  if (v_ped ->> 'gravarNumero')::boolean and c.numero_cnj is null then
    update casos set numero_cnj = v_ped ->> 'numero' where id = c.id;
    perform registrar_historico('juridico.caso_editado', 'casos', c.id::text, jsonb_build_object('campos', jsonb_build_array('numero'), 'peticao', x.id));
  end if;
  if (v_ped ->> 'parteContrariaQualificacao') is distinct from c.parte_contraria_qualificacao then
    update casos set parte_contraria_qualificacao = v_ped ->> 'parteContrariaQualificacao' where id = c.id;
  end if;

  perform registrar_historico('juridico.peticao_gerada', 'casos', c.id::text, jsonb_build_object('peticao', x.id, 'situacao', v_sit));
  if v_sit = 'APROVADA' then
    perform peticao_aprovar(p_pessoa, x, (p_resultado ->> 'documentoId')::uuid);
    insert into peticao_eventos (escritorio_id, peticao_id, versao_id, tipo, por, texto)
    values (p_escritorio, x.id, v_ver, 'APROVADA', p_pessoa, case r.sem_revisao when 'RESPONSAVEL' then 'Sem revisão: gerada pelo responsável' else 'Sem revisão: gerada pela sócia dona' end);
  elsif v_sit = 'REVISAO' then
    update peticoes set situacao = 'REVISAO' where id = x.id;
    insert into peticao_eventos (escritorio_id, peticao_id, versao_id, tipo, por, para, texto) values (p_escritorio, x.id, v_ver, 'ENVIADA', p_pessoa, r.revisor, v_recado);
    perform aviso_sino(p_escritorio, r.revisor, p_pessoa, 'PETICAO_REVISAR', 'peticoes', x.id,
      jsonb_build_object('quem', (select nome from pessoas where id = p_pessoa), 'modelo', x.modelo_nome, 'caso', c.nome, 'versao', 1));
    perform registrar_historico('juridico.peticao_enviada_revisao', 'casos', c.id::text, jsonb_build_object('peticao', x.id, 'revisor', r.revisor));
  end if;
  return peticao_resultado(x.id);
end $$;

create function peticao_resultado(p_id uuid) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object('id', x.id, 'situacao', x.situacao, 'arquivo', v.nome_arquivo, 'marcados', to_jsonb(v.marcados),
                            'revisor', pessoa_ref(x.revisor_id), 'versao', x.versao_atual, 'documentoId', x.documento_id)
    from peticoes x join peticao_versoes v on v.peticao_id = x.id and v.numero = x.versao_atual
   where x.id = p_id
$$;

-- A petição do escritório, para quem tem Jurídico.
create function peticao_ler(p_escritorio uuid, p_id uuid, p_trava boolean default false) returns peticoes
language plpgsql
set search_path = public
as $$
declare x peticoes;
begin
  if p_trava then
    select * into x from peticoes where id = p_id and escritorio_id = p_escritorio for update;
  else
    select * into x from peticoes where id = p_id and escritorio_id = p_escritorio;
  end if;
  if x.id is null then raise exception 'Petição não encontrada' using errcode = 'TC404'; end if;
  return x;
end $$;

create function peticao_pode_revisar(p_pessoa uuid, x peticoes) returns boolean
language sql stable
set search_path = public
as $$ select x.situacao = 'REVISAO' and (x.revisor_id = p_pessoa or e_socio_dono(p_pessoa, x.escritorio_id)) and x.gerado_por <> p_pessoa $$;

create function peticao_exigir_revisor(p_pessoa uuid, x peticoes) returns void
language plpgsql
set search_path = public
as $$
begin
  if x.situacao <> 'REVISAO' then
    raise exception 'A petição não está em revisão' using errcode = 'TC422', detail = jsonb_build_object('motivo', 'SITUACAO_INVALIDA')::text;
  end if;
  if not peticao_pode_revisar(p_pessoa, x) then
    raise exception 'Só quem revisa decide' using errcode = 'TC401', detail = jsonb_build_object('motivo', 'SEM_PERMISSAO_REVISAR')::text;
  end if;
end $$;

-- Linha da lista (decisão 2).
create function peticao_linha(x peticoes, p_pessoa uuid) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', x.id, 'modelo', x.modelo_nome, 'arquivo', v.nome_arquivo,
    'caso', (select jsonb_build_object('id', c.id, 'nome', c.nome) from casos c where c.id = x.caso_id),
    'geradoPor', pessoa_ref(x.gerado_por), 'geradoEm', x.gerado_em, 'marcados', cardinality(v.marcados),
    'situacao', x.situacao, 'revisor', pessoa_ref(x.revisor_id), 'versao', x.versao_atual,
    'paraMim', x.situacao = 'REVISAO' and x.revisor_id = p_pessoa)
    from peticao_versoes v where v.peticao_id = x.id and v.numero = x.versao_atual
$$;

create function portal_peticoes(p_pessoa uuid, p_escritorio uuid, p_filtro jsonb default '{}'::jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_q text := sem_acento(btrim(coalesce(p_filtro ->> 'q', '')));
  v_visao text := coalesce(nullif(p_filtro ->> 'visao', ''), 'TODAS');
  v_modelo text := nullif(p_filtro ->> 'modelo', '');
  v_caso uuid;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'JURIDICO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'juridico.ver');
  begin
    v_caso := nullif(p_filtro ->> 'caso', '')::uuid;
  exception when others then v_caso := null;
  end;
  return jsonb_build_object(
    'peticoes', coalesce((
      select jsonb_agg(peticao_linha(x, p_pessoa) order by x.ordem desc)
        from (select x.* from peticoes x join casos c on c.id = x.caso_id
               where x.escritorio_id = p_escritorio
                 and (v_caso is null or x.caso_id = v_caso)
                 and (v_visao <> 'MINHAS' or x.gerado_por = p_pessoa)
                 and (v_visao <> 'REVISAR' or (x.situacao = 'REVISAO' and x.revisor_id = p_pessoa))
                 and (v_modelo is null or coalesce(x.modelo_id::text, x.modelo_padrao) = v_modelo)
                 and (v_q = '' or sem_acento(c.nome) like '%' || v_q || '%' or sem_acento(x.modelo_nome) like '%' || v_q || '%'
                      or exists (select 1 from caso_clientes cc join clientes_escritorio k on k.id = cc.cliente_id
                                  where cc.caso_id = c.id and sem_acento(k.nome) like '%' || v_q || '%'))
               order by x.ordem desc limit 200) x), '[]'::jsonb),
    'paraRevisar', (select count(*) from peticoes where escritorio_id = p_escritorio and situacao = 'REVISAO' and revisor_id = p_pessoa),
    'modelos', coalesce((select jsonb_agg(distinct jsonb_build_object('id', coalesce(modelo_id::text, modelo_padrao), 'nome', modelo_nome))
                           from peticoes where escritorio_id = p_escritorio), '[]'::jsonb));
end $$;

-- A ficha da petição: o resultado, a revisão e o ajuste (decisões 11, 21, 23 a 26).
create function portal_peticao(p_pessoa uuid, p_escritorio uuid, p_id uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  x peticoes;
  v peticao_versoes;
  c casos;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'JURIDICO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'juridico.ver');
  x := peticao_ler(p_escritorio, p_id);
  select * into v from peticao_versoes where peticao_id = x.id and numero = x.versao_atual;
  select * into c from casos where id = x.caso_id;
  return jsonb_build_object(
    'id', x.id,
    'modelo', jsonb_build_object('id', coalesce(x.modelo_id::text, x.modelo_padrao), 'nome', x.modelo_nome, 'padrao', x.modelo_padrao is not null,
                                 'versao', (select numero from peticao_modelo_versoes where id = x.modelo_versao_id)),
    'arquivo', v.nome_arquivo,
    'caso', jsonb_build_object('id', c.id, 'nome', c.nome, 'numero', c.numero_cnj, 'responsavel', pessoa_ref(c.responsavel_id),
                               'prazo', (select jsonb_build_object('data', p.data_final, 'descricao', p.descricao) from prazos p
                                          where p.caso_id = c.id and p.cumprido_em is null order by p.data_final limit 1)),
    'situacao', x.situacao, 'versaoAtual', x.versao_atual, 'versao', x.versao,
    'geradoPor', pessoa_ref(x.gerado_por), 'geradoEm', x.gerado_em, 'revisor', pessoa_ref(x.revisor_id),
    'aprovadaEm', x.aprovada_em, 'aprovadaPor', pessoa_ref(x.aprovada_por), 'documentoId', x.documento_id,
    'dados', jsonb_build_object('partes', v.dados_do_dia -> 'partes', 'advogados', v.dados_do_dia -> 'advogados',
                                'enderecamento', v.escolhas -> 'enderecamento', 'cidadeData', v.escolhas -> 'cidadeData',
                                'numero', coalesce(v.escolhas ->> 'numero', c.numero_cnj), 'valorCausa', v.escolhas -> 'valorCausa'),
    'escolhas', v.escolhas,
    'previa', v.previa, 'previaEditada', v.origem = 'DOCX_EDITADO',
    'versoes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', w.id, 'numero', w.numero, 'origem', w.origem, 'arquivo', w.nome_arquivo, 'marcados', to_jsonb(w.marcados),
        'enviadaPor', pessoa_ref(w.enviada_por), 'enviadaEm', w.enviada_em, 'recado', w.recado,
        'decisao', (select jsonb_build_object('tipo', ev.tipo, 'por', pessoa_ref(ev.por), 'em', ev.em, 'motivo', ev.texto)
                      from peticao_eventos ev where ev.versao_id = w.id and ev.tipo in ('APROVADA', 'AJUSTE', 'REPROVADA')
                     order by ev.ordem desc limit 1)) order by w.numero desc)
        from peticao_versoes w where w.peticao_id = x.id), '[]'::jsonb),
    'comentarios', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', k.id, 'versao', (select numero from peticao_versoes where id = k.versao_id), 'autor', pessoa_ref(k.autor_id),
        'paragrafo', k.paragrafo, 'trecho', k.trecho, 'texto', k.texto, 'criadoEm', k.criado_em, 'enviado', k.evento_id is not null,
        'resolvidoEm', k.resolvido_em, 'resolvidoNaVersao', k.resolvido_na_versao) order by k.ordem)
        from peticao_comentarios k
       where k.peticao_id = x.id and k.desfeito_em is null and (k.evento_id is not null or k.autor_id = p_pessoa)), '[]'::jsonb),
    'eventos', coalesce((
      select jsonb_agg(jsonb_build_object('tipo', ev.tipo, 'por', pessoa_ref(ev.por), 'para', pessoa_ref(ev.para), 'texto', ev.texto,
                                          'versao', (select numero from peticao_versoes where id = ev.versao_id), 'em', ev.em) order by ev.ordem)
        from peticao_eventos ev where ev.peticao_id = x.id), '[]'::jsonb),
    'pode', jsonb_build_object(
      'revisar', peticao_pode_revisar(p_pessoa, x),
      'novaVersao', x.situacao = 'AJUSTE' and (x.gerado_por = p_pessoa or e_socio_dono(p_pessoa, p_escritorio)),
      'enviar', x.situacao = 'RASCUNHO' and (x.gerado_por = p_pessoa or e_socio_dono(p_pessoa, p_escritorio)),
      'passar', peticao_pode_revisar(p_pessoa, x)));
end $$;

-- O arquivo para baixar (decisão 19): a versão pedida (ou a atual); limpo só se aprovada.
create function portal_peticao_arquivo(p_pessoa uuid, p_escritorio uuid, p_id uuid, p_versao integer default null) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  x peticoes;
  v peticao_versoes;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'JURIDICO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'juridico.ver');
  x := peticao_ler(p_escritorio, p_id);
  select * into v from peticao_versoes where peticao_id = x.id and numero = coalesce(p_versao, x.versao_atual);
  if v.id is null then raise exception 'Versão não encontrada' using errcode = 'TC404'; end if;
  perform registrar_historico('juridico.peticao_baixada', 'casos', x.caso_id::text, jsonb_build_object('peticao', x.id, 'versao', v.numero));
  return jsonb_build_object('versaoId', v.id, 'nome', v.nome_arquivo,
                            'rascunho', not (x.situacao = 'APROVADA' and v.numero = x.versao_atual));
end $$;

-- Mandar o rascunho para a revisão (decisão 18).
create function portal_peticao_enviar(p_pessoa uuid, p_escritorio uuid, p_id uuid, p_recado text) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  x peticoes;
  r record;
  v peticao_versoes;
  v_recado text := nullif(btrim(coalesce(p_recado, '')), '');
begin
  perform entrar_area(p_pessoa, p_escritorio, 'JURIDICO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'juridico.editar');
  perform portal_exigir_escrita(p_pessoa, p_escritorio);
  x := peticao_ler(p_escritorio, p_id, true);
  if x.gerado_por <> p_pessoa and not e_socio_dono(p_pessoa, p_escritorio) then
    raise exception 'Só quem gerou envia' using errcode = 'TC401', detail = jsonb_build_object('motivo', 'SEM_PERMISSAO')::text;
  end if;
  if x.situacao = 'REVISAO' then
    raise exception 'Já está em revisão' using errcode = 'TC422', detail = jsonb_build_object('motivo', 'JA_EM_REVISAO')::text;
  end if;
  if x.situacao <> 'RASCUNHO' then
    raise exception 'Só o rascunho se envia' using errcode = 'TC422', detail = jsonb_build_object('motivo', 'SITUACAO_INVALIDA')::text;
  end if;
  if length(coalesce(v_recado, '')) > 1000 then perform peticao_recusar('{"recado": "TEXTO_LONGO"}'); end if;
  select * into r from peticao_revisor(x.gerado_por, p_escritorio, x.caso_id);
  if r.revisor is null then
    raise exception 'Não há quem revise' using errcode = 'TC422', detail = jsonb_build_object('motivo', 'SEM_REVISOR')::text;
  end if;
  select * into v from peticao_versoes where peticao_id = x.id and numero = x.versao_atual;
  update peticoes set situacao = 'REVISAO', revisor_id = r.revisor where id = x.id;
  insert into peticao_eventos (escritorio_id, peticao_id, versao_id, tipo, por, para, texto) values (p_escritorio, x.id, v.id, 'ENVIADA', p_pessoa, r.revisor, v_recado);
  perform aviso_sino(p_escritorio, r.revisor, p_pessoa, 'PETICAO_REVISAR', 'peticoes', x.id,
    jsonb_build_object('quem', (select nome from pessoas where id = p_pessoa), 'modelo', x.modelo_nome,
                       'caso', (select nome from casos where id = x.caso_id), 'versao', x.versao_atual));
  perform registrar_historico('juridico.peticao_enviada_revisao', 'casos', x.caso_id::text, jsonb_build_object('peticao', x.id, 'revisor', r.revisor));
  return peticao_resultado(x.id);
end $$;

-- Comentar (decisão 22): geral ou preso a um parágrafo da prévia da versão atual.
create function portal_peticao_comentar(p_pessoa uuid, p_escritorio uuid, p_id uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  x peticoes;
  v peticao_versoes;
  v_par integer;
  v_texto text := btrim(coalesce(p_dados ->> 'texto', ''));
  v_trecho text;
  k peticao_comentarios;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'JURIDICO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'juridico.editar');
  perform portal_exigir_escrita(p_pessoa, p_escritorio);
  x := peticao_ler(p_escritorio, p_id, true);
  perform peticao_exigir_revisor(p_pessoa, x);
  select * into v from peticao_versoes where peticao_id = x.id and numero = x.versao_atual;
  begin
    v_par := nullif(p_dados ->> 'paragrafo', '')::integer;
  exception when others then v_par := -1;
  end;
  if v_texto = '' then perform peticao_recusar('{"texto": "TEXTO_OBRIGATORIO"}'); end if;
  if length(v_texto) > 2000 then perform peticao_recusar('{"texto": "TEXTO_LONGO"}'); end if;
  if v_par is not null and (v_par < 1 or v_par > jsonb_array_length(v.previa)) then perform peticao_recusar('{"paragrafo": "PARAGRAFO_INVALIDO"}'); end if;
  if v_par is not null then
    select left(btrim(string_agg(s ->> 'texto', '' order by n)), 160) into v_trecho
      from jsonb_array_elements(v.previa -> (v_par - 1)) with ordinality e(s, n);
    v_trecho := coalesce(nullif(v_trecho, ''), '(parágrafo ' || v_par || ')');
  end if;
  insert into peticao_comentarios (escritorio_id, peticao_id, versao_id, autor_id, paragrafo, trecho, texto)
  values (p_escritorio, x.id, v.id, p_pessoa, v_par, v_trecho, v_texto) returning * into k;
  return jsonb_build_object('id', k.id, 'versao', v.numero, 'autor', pessoa_ref(p_pessoa), 'paragrafo', k.paragrafo, 'trecho', k.trecho,
                            'texto', k.texto, 'criadoEm', k.criado_em, 'enviado', false, 'resolvidoEm', null, 'resolvidoNaVersao', null);
end $$;

-- Desfazer o comentário antes de enviar a decisão.
create function portal_peticao_comentario_desfazer(p_pessoa uuid, p_escritorio uuid, p_comentario uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare k peticao_comentarios;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'JURIDICO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'juridico.editar');
  select * into k from peticao_comentarios where id = p_comentario and escritorio_id = p_escritorio and autor_id = p_pessoa
                                             and evento_id is null and desfeito_em is null for update;
  if k.id is null then raise exception 'Comentário não encontrado' using errcode = 'TC404'; end if;
  update peticao_comentarios set desfeito_em = app_now() where id = k.id;
  return jsonb_build_object('id', k.id, 'desfeito', true);
end $$;

-- Antes de aprovar: confere quem decide e a versão, sem gravar; a API copia o arquivo.
create function portal_peticao_para_aprovar(p_pessoa uuid, p_escritorio uuid, p_id uuid, p_versao integer) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  x peticoes;
  v peticao_versoes;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'JURIDICO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'juridico.editar');
  perform portal_exigir_escrita(p_pessoa, p_escritorio);
  x := peticao_ler(p_escritorio, p_id);
  perform peticao_exigir_revisor(p_pessoa, x);
  if p_versao is distinct from x.versao_atual then
    raise exception 'Chegou uma versão nova' using errcode = 'TC409', detail = jsonb_build_object('motivo', 'VERSAO_DESATUALIZADA')::text;
  end if;
  select * into v from peticao_versoes where peticao_id = x.id and numero = x.versao_atual;
  return jsonb_build_object('versaoId', v.id, 'nome', v.nome_arquivo, 'tamanho', v.tamanho);
end $$;

-- A decisão (decisão 21): aprovar, pedir ajuste ou reprovar. O comentário geral é obrigatório
-- para reprovar (o motivo) e, no ajuste, ele ou um comentário num parágrafo.
create function portal_peticao_decidir(p_pessoa uuid, p_escritorio uuid, p_id uuid, p_dados jsonb, p_documento uuid default null) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  x peticoes;
  v peticao_versoes;
  v_dec text := upper(coalesce(p_dados ->> 'decisao', ''));
  v_com text := nullif(btrim(coalesce(p_dados ->> 'comentario', '')), '');
  v_ev uuid;
  v_tipo text;
  v_pendentes integer;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'JURIDICO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'juridico.editar');
  perform portal_exigir_escrita(p_pessoa, p_escritorio);
  x := peticao_ler(p_escritorio, p_id, true);
  perform peticao_exigir_revisor(p_pessoa, x);
  if (p_dados ->> 'versao') is distinct from x.versao_atual::text then
    raise exception 'Chegou uma versão nova' using errcode = 'TC409', detail = jsonb_build_object('motivo', 'VERSAO_DESATUALIZADA')::text;
  end if;
  if v_dec not in ('APROVAR', 'AJUSTE', 'REPROVAR') then perform peticao_recusar('{"decisao": "DECISAO_OBRIGATORIA"}'); end if;
  if length(coalesce(v_com, '')) > 2000 then perform peticao_recusar('{"comentario": "TEXTO_LONGO"}'); end if;
  select * into v from peticao_versoes where peticao_id = x.id and numero = x.versao_atual;
  select count(*) into v_pendentes from peticao_comentarios
   where peticao_id = x.id and versao_id = v.id and autor_id = p_pessoa and evento_id is null and desfeito_em is null;
  if v_dec = 'AJUSTE' and v_com is null and v_pendentes = 0 then perform peticao_recusar('{"comentario": "COMENTARIO_OBRIGATORIO"}', 'Escreva o que precisa ajustar'); end if;
  if v_dec = 'REPROVAR' and v_com is null then perform peticao_recusar('{"comentario": "MOTIVO_OBRIGATORIO"}', 'Escreva o motivo da reprovação'); end if;

  v_tipo := case v_dec when 'APROVAR' then 'APROVADA' when 'AJUSTE' then 'AJUSTE' else 'REPROVADA' end;
  insert into peticao_eventos (escritorio_id, peticao_id, versao_id, tipo, por, para, texto)
  values (p_escritorio, x.id, v.id, v_tipo, p_pessoa, x.gerado_por, v_com) returning id into v_ev;
  if v_com is not null then
    insert into peticao_comentarios (escritorio_id, peticao_id, versao_id, autor_id, texto, evento_id)
    values (p_escritorio, x.id, v.id, p_pessoa, v_com, v_ev);
  end if;
  update peticao_comentarios set evento_id = v_ev
   where peticao_id = x.id and versao_id = v.id and autor_id = p_pessoa and evento_id is null and desfeito_em is null;

  if v_tipo = 'APROVADA' then
    perform peticao_aprovar(p_pessoa, x, p_documento);
  else
    update peticoes set situacao = v_tipo where id = x.id;
  end if;
  perform aviso_sino(p_escritorio, x.gerado_por, p_pessoa, 'PETICAO_DECIDIDA', 'peticoes', x.id,
    jsonb_build_object('quem', (select nome from pessoas where id = p_pessoa), 'decisao', v_tipo, 'modelo', x.modelo_nome,
                       'caso', (select nome from casos where id = x.caso_id), 'versao', x.versao_atual));
  perform registrar_historico('juridico.peticao_' || lower(case v_tipo when 'AJUSTE' then 'ajuste_pedido' else v_tipo end), 'casos', x.caso_id::text,
    jsonb_build_object('peticao', x.id, 'versao', x.versao_atual));
  return portal_peticao(p_pessoa, p_escritorio, x.id);
end $$;

-- Quem pode receber a revisão (decisão 27): com OAB e Jurídico, fora o revisor atual e quem gerou.
create function portal_peticao_revisores(p_pessoa uuid, p_escritorio uuid, p_id uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare x peticoes;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'JURIDICO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'juridico.ver');
  x := peticao_ler(p_escritorio, p_id);
  return coalesce((
    select jsonb_agg(pessoa_ref(p.id) || jsonb_build_object('frase', oab_frase(p.id, p_escritorio)) order by p.nome)
      from pessoas p
     where peticao_revisor_valido(p.id, p_escritorio) and p.id <> x.gerado_por and p.id is distinct from x.revisor_id), '[]'::jsonb);
end $$;

create function portal_peticao_passar(p_pessoa uuid, p_escritorio uuid, p_id uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  x peticoes;
  v_para uuid;
  v_motivo text := nullif(btrim(coalesce(p_dados ->> 'motivo', '')), '');
  v_ver uuid;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'JURIDICO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'juridico.editar');
  perform portal_exigir_escrita(p_pessoa, p_escritorio);
  x := peticao_ler(p_escritorio, p_id, true);
  perform peticao_exigir_revisor(p_pessoa, x);
  begin
    v_para := (p_dados ->> 'pessoaId')::uuid;
  exception when others then v_para := null;
  end;
  if v_para is null or v_para = x.gerado_por or v_para is not distinct from x.revisor_id or not peticao_revisor_valido(v_para, p_escritorio) then
    perform peticao_recusar('{"pessoaId": "REVISOR_INVALIDO"}', 'Escolha um advogado com OAB e a área Jurídico');
  end if;
  if length(coalesce(v_motivo, '')) > 300 then perform peticao_recusar('{"motivo": "TEXTO_LONGO"}'); end if;
  select id into v_ver from peticao_versoes where peticao_id = x.id and numero = x.versao_atual;
  update peticoes set revisor_id = v_para where id = x.id;
  insert into peticao_eventos (escritorio_id, peticao_id, versao_id, tipo, por, para, texto) values (p_escritorio, x.id, v_ver, 'PASSADA', p_pessoa, v_para, v_motivo);
  perform aviso_sino(p_escritorio, v_para, p_pessoa, 'PETICAO_REVISAR', 'peticoes', x.id,
    jsonb_build_object('quem', (select nome from pessoas where id = x.gerado_por), 'passadaPor', (select nome from pessoas where id = p_pessoa),
                       'modelo', x.modelo_nome, 'caso', (select nome from casos where id = x.caso_id), 'versao', x.versao_atual, 'motivo', v_motivo));
  perform aviso_sino(p_escritorio, x.gerado_por, p_pessoa, 'PETICAO_PASSADA', 'peticoes', x.id,
    jsonb_build_object('quem', (select nome from pessoas where id = p_pessoa), 'para', (select nome from pessoas where id = v_para),
                       'modelo', x.modelo_nome, 'caso', (select nome from casos where id = x.caso_id)));
  perform registrar_historico('juridico.peticao_revisao_passada', 'casos', x.caso_id::text, jsonb_build_object('peticao', x.id, 'para', v_para));
  return portal_peticao(p_pessoa, p_escritorio, x.id);
end $$;

-- Nova versão depois do ajuste (decisão 23): refeita pelos dados ou o .docx editado no Word.
-- Primeiro a API pergunta se pode (e, pelos dados, confere o pedido); depois grava.
create function portal_peticao_versao_preparar(p_pessoa uuid, p_escritorio uuid, p_id uuid, p_pedido jsonb default null) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  x peticoes;
  c casos;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'JURIDICO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'juridico.editar');
  perform portal_exigir_escrita(p_pessoa, p_escritorio);
  x := peticao_ler(p_escritorio, p_id);
  if x.gerado_por <> p_pessoa and not e_socio_dono(p_pessoa, p_escritorio) then
    raise exception 'Só quem gerou envia a versão nova' using errcode = 'TC401', detail = jsonb_build_object('motivo', 'SEM_PERMISSAO')::text;
  end if;
  if x.situacao <> 'AJUSTE' then
    raise exception 'A versão nova vem depois do ajuste pedido' using errcode = 'TC422', detail = jsonb_build_object('motivo', 'SITUACAO_INVALIDA')::text;
  end if;
  c := peticao_ler_caso(p_escritorio, x.caso_id);
  return jsonb_build_object(
    'numero', x.versao_atual + 1, 'modeloNome', x.modelo_nome, 'casoNome', c.nome,
    'pedido', case when p_pedido is null then null
                   else peticao_conferir(p_escritorio, c, p_pedido || jsonb_build_object('modelo', jsonb_build_object(
                          'padrao', x.modelo_padrao, 'modeloId', x.modelo_id))) end,
    'dados', case when p_pedido is null then null else peticao_dados(x.gerado_por, p_escritorio, c) end);
end $$;

-- p_dados: { origem, escolhas (pelos dados), resolvidos, recado }; p_resultado como em gravar.
create function portal_peticao_versao_gravar(p_pessoa uuid, p_escritorio uuid, p_id uuid, p_dados jsonb, p_resultado jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  x peticoes;
  c casos;
  v_origem text := upper(coalesce(p_dados ->> 'origem', ''));
  v_ped jsonb;
  v_ant peticao_versoes;
  v_ver uuid := (p_resultado ->> 'versaoId')::uuid;
  v_n integer;
  v_recado text := nullif(btrim(coalesce(p_dados ->> 'recado', '')), '');
begin
  perform entrar_area(p_pessoa, p_escritorio, 'JURIDICO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'juridico.editar');
  perform portal_exigir_escrita(p_pessoa, p_escritorio);
  perform peticao_conferir_resultado(p_resultado);
  x := peticao_ler(p_escritorio, p_id, true);
  if x.gerado_por <> p_pessoa and not e_socio_dono(p_pessoa, p_escritorio) then
    raise exception 'Só quem gerou envia a versão nova' using errcode = 'TC401', detail = jsonb_build_object('motivo', 'SEM_PERMISSAO')::text;
  end if;
  if x.situacao <> 'AJUSTE' then
    raise exception 'A versão nova vem depois do ajuste pedido' using errcode = 'TC422', detail = jsonb_build_object('motivo', 'SITUACAO_INVALIDA')::text;
  end if;
  if v_origem not in ('DADOS', 'DOCX_EDITADO') then perform peticao_recusar('{"origem": "ORIGEM_INVALIDA"}'); end if;
  if length(coalesce(v_recado, '')) > 1000 then perform peticao_recusar('{"recado": "TEXTO_LONGO"}'); end if;
  c := peticao_ler_caso(p_escritorio, x.caso_id);
  select * into v_ant from peticao_versoes where peticao_id = x.id and numero = x.versao_atual;
  v_ped := case when v_origem = 'DADOS'
                then peticao_conferir(p_escritorio, c, (p_dados -> 'escolhas') || jsonb_build_object('modelo', jsonb_build_object('padrao', x.modelo_padrao, 'modeloId', x.modelo_id)))
                else v_ant.escolhas end;
  v_n := x.versao_atual + 1;
  insert into peticao_versoes (id, escritorio_id, peticao_id, numero, origem, nome_arquivo, tamanho, escolhas, dados_do_dia, marcados, previa, recado, enviada_por)
  values (v_ver, p_escritorio, x.id, v_n, v_origem, p_resultado ->> 'arquivo', (p_resultado ->> 'tamanho')::integer, v_ped,
          case when v_origem = 'DADOS' then peticao_dados_do_dia(p_escritorio, v_ped) else v_ant.dados_do_dia end,
          array(select jsonb_array_elements_text(coalesce(p_resultado -> 'marcados', '[]'::jsonb))), p_resultado -> 'previa', v_recado, p_pessoa);
  update peticao_comentarios set resolvido_em = app_now(), resolvido_por = p_pessoa, resolvido_na_versao = v_n
   where peticao_id = x.id and evento_id is not null and resolvido_em is null
     and id in (select jsonb_array_elements_text(coalesce(p_dados -> 'resolvidos', '[]'::jsonb))::uuid);
  update peticoes set versao_atual = v_n, situacao = 'REVISAO' where id = x.id;
  insert into peticao_eventos (escritorio_id, peticao_id, versao_id, tipo, por, para, texto) values (p_escritorio, x.id, v_ver, 'VERSAO', p_pessoa, x.revisor_id, v_recado);
  perform aviso_sino(p_escritorio, x.revisor_id, p_pessoa, 'PETICAO_REVISAR', 'peticoes', x.id,
    jsonb_build_object('quem', (select nome from pessoas where id = p_pessoa), 'modelo', x.modelo_nome, 'caso', c.nome, 'versao', v_n));
  perform registrar_historico('juridico.peticao_versao_enviada', 'casos', c.id::text, jsonb_build_object('peticao', x.id, 'versao', v_n));
  return peticao_resultado(x.id);
end $$;

-- ---------------------------------------------------------------------------------------
-- Modelos do escritório (decisões 4 e 5). Os padrão vêm do código; aqui, os enviados e o uso.

create function peticao_modelo_linha(m peticao_modelos) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', m.id, 'padrao', false, 'nome', m.nome, 'tipo', m.tipo, 'area', m.area, 'substitui', m.substitui,
    'versao', v.numero, 'versaoId', v.id, 'campos', to_jsonb(v.campos), 'desconhecidos', to_jsonb(v.desconhecidos),
    'enviadoPor', pessoa_ref(v.enviado_por), 'atualizadoEm', v.enviado_em, 'linhaVersao', m.versao,
    'usos', (select count(*) from peticoes x where x.modelo_id = m.id))
    from peticao_modelo_versoes v where v.modelo_id = m.id order by v.numero desc limit 1
$$;

create function portal_peticao_modelos(p_pessoa uuid, p_escritorio uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform entrar_area(p_pessoa, p_escritorio, 'JURIDICO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'juridico.ver');
  return jsonb_build_object(
    'modelos', coalesce((select jsonb_agg(peticao_modelo_linha(m) order by m.ordem) from peticao_modelos m
                          where m.escritorio_id = p_escritorio and m.arquivado_em is null), '[]'::jsonb),
    'usosPadrao', coalesce((select jsonb_object_agg(modelo_padrao, n) from (
                              select modelo_padrao, count(*) n from peticoes where escritorio_id = p_escritorio and modelo_padrao is not null
                               group by modelo_padrao) u), '{}'::jsonb),
    'podeEnviar', pode(p_pessoa, p_escritorio, 'juridico.editar') and contrato_situacao(p_escritorio) in ('ABERTO', 'MARCADO'));
end $$;

-- Enviar modelo novo (p_modelo nulo) ou versão nova de um modelo (decisão 4: a anterior fica).
-- p_conferido vem da API, que leu o arquivo: { versaoId, arquivo, tamanho, campos, desconhecidos, paragrafos }.
create function portal_peticao_modelo_enviar(p_pessoa uuid, p_escritorio uuid, p_modelo uuid, p_dados jsonb, p_conferido jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  m peticao_modelos;
  e jsonb := '{}'::jsonb;
  v_nome text := btrim(coalesce(p_dados ->> 'nome', ''));
  v_tipo text := upper(coalesce(p_dados ->> 'tipo', ''));
  v_area text := upper(coalesce(p_dados ->> 'area', ''));
  v_subst text := nullif(upper(btrim(coalesce(p_dados ->> 'substitui', ''))), '');
  v_n integer;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'JURIDICO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'juridico.editar');
  perform portal_exigir_escrita(p_pessoa, p_escritorio);
  if p_modelo is null then
    if length(v_nome) not between 3 and 120 then e := e || '{"nome": "NOME_OBRIGATORIO"}'; end if;
    if v_tipo not in ('INICIAL', 'CONTESTACAO', 'RECURSO', 'JUNTADA', 'PRAZO', 'MANIFESTACAO', 'OUTRA') then e := e || '{"tipo": "TIPO_INVALIDO"}'; end if;
    if not (v_area = 'QUALQUER' or coalesce(area_direito_valida(v_area), false)) then e := e || '{"area": "AREA_INVALIDA"}'; end if;
    if v_subst is not null and not peticao_padrao_valido(v_subst) then e := e || '{"substitui": "MODELO_INVALIDO"}';
    elsif v_subst is not null and exists (select 1 from peticao_modelos where escritorio_id = p_escritorio and substitui = v_subst and arquivado_em is null) then
      e := e || '{"substitui": "PADRAO_JA_TROCADO"}';
    end if;
    if e <> '{}'::jsonb then perform peticao_recusar(e, 'Confira os dados do modelo'); end if;
    insert into peticao_modelos (escritorio_id, nome, tipo, area, substitui, criado_por)
    values (p_escritorio, v_nome, v_tipo, v_area, v_subst, p_pessoa) returning * into m;
    v_n := 1;
  else
    select * into m from peticao_modelos where id = p_modelo and escritorio_id = p_escritorio and arquivado_em is null for update;
    if m.id is null then raise exception 'Modelo não encontrado' using errcode = 'TC404'; end if;
    v_n := (select max(numero) + 1 from peticao_modelo_versoes where modelo_id = m.id);
  end if;
  insert into peticao_modelo_versoes (id, escritorio_id, modelo_id, numero, nome_arquivo, tamanho, campos, desconhecidos, paragrafos, enviado_por)
  values ((p_conferido ->> 'versaoId')::uuid, p_escritorio, m.id, v_n, p_conferido ->> 'arquivo', (p_conferido ->> 'tamanho')::integer,
          array(select jsonb_array_elements_text(p_conferido -> 'campos')),
          array(select jsonb_array_elements_text(p_conferido -> 'desconhecidos')),
          array(select jsonb_array_elements_text(p_conferido -> 'paragrafos')), p_pessoa);
  perform registrar_historico(case when v_n = 1 then 'peticao.modelo_enviado' else 'peticao.modelo_trocado' end, 'peticao_modelos', m.id::text,
    jsonb_build_object('versao', v_n, 'substitui', m.substitui));
  return peticao_modelo_linha(m);
end $$;

create function portal_peticao_modelo_arquivar(p_pessoa uuid, p_escritorio uuid, p_modelo uuid, p_versao integer, p_motivo text) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare m peticao_modelos;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'JURIDICO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'juridico.editar');
  perform portal_exigir_escrita(p_pessoa, p_escritorio);
  select * into m from peticao_modelos where id = p_modelo and escritorio_id = p_escritorio and arquivado_em is null for update;
  if m.id is null then raise exception 'Modelo não encontrado' using errcode = 'TC404'; end if;
  if m.versao <> p_versao then perform conflito_versao('peticao_modelos', m.id); end if;
  if length(btrim(coalesce(p_motivo, ''))) not between 3 and 300 then perform peticao_recusar('{"motivo": "MOTIVO_OBRIGATORIO"}'); end if;
  update peticao_modelos set arquivado_em = app_now(), arquivado_por = p_pessoa, motivo_arquivo = btrim(p_motivo) where id = m.id;
  perform registrar_historico('peticao.modelo_arquivado', 'peticao_modelos', m.id::text, jsonb_build_object('substitui', m.substitui));
  return jsonb_build_object('id', m.id, 'arquivado', true);
end $$;

-- Baixar o modelo do escritório: a versão mais nova (ou a pedida).
create function portal_peticao_modelo_arquivo(p_pessoa uuid, p_escritorio uuid, p_modelo uuid, p_versao integer default null) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v peticao_modelo_versoes;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'JURIDICO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'juridico.ver');
  select v2.* into v from peticao_modelo_versoes v2 join peticao_modelos m on m.id = v2.modelo_id
   where m.id = p_modelo and m.escritorio_id = p_escritorio and (p_versao is null or v2.numero = p_versao)
   order by v2.numero desc limit 1;
  if v.id is null then raise exception 'Modelo não encontrado' using errcode = 'TC404'; end if;
  return jsonb_build_object('versaoId', v.id, 'nome', v.nome_arquivo);
end $$;

call fechar_acesso();
