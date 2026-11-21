-- 0690 · Cobrança dos escritórios que assinam o T3jus (CO-06, F1.18), parte do servidor.
-- Desenho aprovado pela Carol em 20/11/2026 (docs/design/aprovadas/console-cobranca), com as 6
-- recomendações como decisões:
--   1. planos em faixas por número de pessoas, todas as áreas incluídas, um valor único por
--      pessoa a mais, contada no dia da emissão;
--   2. a cobrança começa no dia em que o escritório passa para Ativo: a primeira fatura sai nesse
--      dia e vence no dia escolhido do mês seguinte;
--   3. sem período grátis: desconto de implantação com motivo e prazo;
--   4. aviso ao sócio dono aos 7 dias; aos 30, o Console propõe só consulta e a Administração
--      confirma, com motivo; nada é apagado e pagar devolve o Portal ao normal sozinho;
--   5. o sócio dono vê e paga as faturas no Portal (Pix, boleto ou carnê);
--   6. carnê de 12 parcelas; o próximo sai 20 dias antes da última parcela.
--
-- O meio de pagamento (Pix e boleto de verdade, baixa automática) e o emissor de nota fiscal
-- ainda não foram escolhidos: as faturas e as parcelas têm o lugar do Pix copia e cola e da linha
-- do boleto, vazio até o meio de pagamento existir. A baixa é o registro manual, que passa pelo
-- mesmo caminho que o aviso do meio de pagamento vai usar (cobranca_pagar).
--
-- Dinheiro em centavos inteiros (PT-09); datas de vencimento sem hora, no horário de Brasília.
-- Os nomes têm o prefixo da assinatura para não confundir com o carnê dos honorários do
-- escritório (carnes e carne_parcelas, 0450), que é outra coisa.

-- ---------------------------------------------------------------------------------------
-- 1. Quem pode o quê (desenho, "Ações novas de permissão")

insert into funcao_acoes (funcao, acao) values
  ('ADMINISTRACAO', 'console.cobranca.ver'),
  ('FINANCEIRO',    'console.cobranca.ver'),
  ('ADMINISTRACAO', 'console.cobranca.editar'),
  ('FINANCEIRO',    'console.cobranca.editar'),
  ('ADMINISTRACAO', 'console.planos.editar'),
  ('ADMINISTRACAO', 'console.portal.so_consulta'),
  ('SOCIO',         'portal.faturas.ver');

insert into configuracoes (chave, valor, descricao) values
  ('cobranca_emitir_dias_antes', '20', 'Dias antes do vencimento em que a fatura do escritório é emitida (régua, −20)'),
  ('cobranca_parcelas_por_carne', '12', 'Parcelas de cada carnê da assinatura (decisão 6)'),
  ('cobranca_aviso_portal_dias', '7', 'Dias de atraso em que o Portal mostra a faixa ao sócio dono (régua, +7)'),
  ('cobranca_propor_consulta_dias', '30', 'Dias de atraso em que o Console propõe o Portal só para consulta (régua, +30)'),
  ('cobranca_envios_url', '"https://console.t3jus.pro/api/v1/rotina/cobranca-envios"',
   'Rota da api-console que manda os e-mails da cobrança (vazio: a fila espera)');

-- Liga e desliga a marca das escritas da cobrança. As tabelas da cobrança passam pela trava do
-- contrato encerrado (0210), mas a cobrança continua depois do fim: dá para registrar o
-- pagamento e cancelar a fatura do Mangaba, encerrado com fatura em aberto (desenho, estado 37).
create function cobranca_marcar(p_ligar boolean) returns void
language sql
set search_path = public
as $$ select set_config('t3jus.cobrando', case when p_ligar then 'on' else '' end, true); $$;

-- ---------------------------------------------------------------------------------------
-- 2. Planos (catálogo do T3jus, não é dado de escritório)

create table planos (
  id                uuid primary key default gen_random_uuid(),
  nome              text not null check (length(btrim(nome)) between 2 and 40),
  preco_centavos    integer not null check (preco_centavos between 1 and 100000000),
  pessoas_incluidas integer not null check (pessoas_incluidas between 1 and 999),
  criado_em         timestamptz not null default app_now(),
  criado_por        uuid not null references pessoas (id) on delete restrict,
  arquivado_em      timestamptz,
  arquivado_por     uuid references pessoas (id) on delete restrict,
  arquivado_motivo  text check (length(btrim(arquivado_motivo)) between 1 and 300),
  alterado_em       timestamptz,
  alterado_por      uuid references pessoas (id) on delete restrict,
  versao            integer not null default 1,
  check ((arquivado_em is null) = (arquivado_por is null) and (arquivado_em is null) = (arquivado_motivo is null))
);
create unique index planos_nome_unico on planos (lower(btrim(nome)));
call proteger_tabela_global('planos', 'Catálogo de planos do T3jus: vale para todos os escritórios, não é dado de nenhum');
create trigger controle_versao before update on planos for each row execute function controle_versao();
create trigger planos_sem_exclusao before delete on planos for each row execute function somente_insercao();

-- Pessoa a mais: um valor único para todos os planos (desenho, decisão 8).
create table planos_regras (
  id                      boolean primary key default true check (id),
  pessoa_a_mais_centavos  integer not null check (pessoa_a_mais_centavos between 0 and 10000000),
  alterado_em             timestamptz,
  alterado_por            uuid references pessoas (id) on delete restrict,
  versao                  integer not null default 1
);
call proteger_tabela_global('planos_regras', 'O valor da pessoa a mais, único para todos os planos do T3jus');
create trigger controle_versao before update on planos_regras for each row execute function controle_versao();
create trigger planos_regras_sem_exclusao before delete on planos_regras for each row execute function somente_insercao();
-- R$ 39,00 é o valor de exemplo do desenho; a Administração muda na aba Planos.
insert into planos_regras (pessoa_a_mais_centavos) values (3900);

-- Histórico dos planos: só cresce.
create table planos_eventos (
  id          bigint generated always as identity primary key,
  plano_id    uuid references planos (id) on delete restrict,
  autor_id    uuid not null references pessoas (id) on delete restrict,
  acao        text not null check (acao ~ '^[a-z_.]{3,60}$'),
  dados       jsonb not null default '{}'::jsonb,
  ocorrido_em timestamptz not null default app_now()
);
call proteger_tabela_global('planos_eventos', 'Histórico do catálogo de planos do T3jus (criar, mudar preço, arquivar)');
create trigger planos_eventos_somente_insercao before update or delete on planos_eventos
  for each row execute function somente_insercao();

-- ---------------------------------------------------------------------------------------
-- 3. Assinatura, faturas, carnê e o que fica registrado (dados de cada escritório)

create table assinaturas (
  id                    uuid primary key default gen_random_uuid(),
  escritorio_id         uuid not null unique references escritorios (id) on delete restrict,
  plano_id              uuid not null references planos (id) on delete restrict,
  -- O preço e as pessoas de quando assinou (ou mudou de plano): mudar o plano no catálogo vale
  -- só para assinaturas novas (desenho, decisão 8).
  preco_centavos        integer not null check (preco_centavos between 1 and 100000000),
  pessoas_incluidas     integer not null check (pessoas_incluidas between 1 and 999),
  dia_vencimento        integer not null check (dia_vencimento between 1 and 28),
  forma                 text not null check (forma in ('PIX', 'BOLETO', 'CARNE')),
  email_cobranca        text not null check (length(email_cobranca) <= 254 and email_cobranca ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  cnpj_nota             text check (cnpj_nota ~ '^[0-9]{14}$'),
  -- Desconto de implantação (decisão 3): sobre a mensalidade, até a competência dita, com motivo.
  desconto_pct          integer check (desconto_pct between 1 and 100),
  desconto_ate          date check (desconto_ate = date_trunc('month', desconto_ate)::date),
  desconto_motivo       text check (length(btrim(desconto_motivo)) between 1 and 300),
  desconto_por          uuid references pessoas (id) on delete restrict,
  parcelas_por_carne    integer check (parcelas_por_carne between 1 and 12),
  -- Quando a cobrança começou (o dia em que passou para Ativo) e a competência da 1ª fatura.
  inicio_cobranca       date,
  primeira_competencia  date check (primeira_competencia = date_trunc('month', primeira_competencia)::date),
  -- Portal só para consulta por atraso (decisão 4): só a Administração liga, com motivo.
  so_consulta_desde     timestamptz,
  so_consulta_motivo    text check (length(btrim(so_consulta_motivo)) between 1 and 300),
  so_consulta_por       uuid references pessoas (id) on delete restrict,
  criado_em             timestamptz not null default app_now(),
  criado_por            uuid not null references pessoas (id) on delete restrict,
  versao                integer not null default 1,
  check ((desconto_pct is null) = (desconto_ate is null) and (desconto_pct is null) = (desconto_motivo is null)),
  check ((forma = 'CARNE') = (parcelas_por_carne is not null)),
  check ((inicio_cobranca is null) = (primeira_competencia is null)),
  check ((so_consulta_desde is null) = (so_consulta_motivo is null) and (so_consulta_desde is null) = (so_consulta_por is null))
);
call proteger_tabela_escritorio('assinaturas');

create table assinatura_carnes (
  id                    uuid primary key default gen_random_uuid(),
  escritorio_id         uuid not null references escritorios (id) on delete restrict,
  assinatura_id         uuid not null references assinaturas (id) on delete restrict,
  numero                text not null check (numero ~ '^[0-9]{4}(/[0-9]{4})?$'),
  primeira_competencia  date not null check (primeira_competencia = date_trunc('month', primeira_competencia)::date),
  parcelas              integer not null check (parcelas between 1 and 12),
  valor_parcela_centavos integer not null check (valor_parcela_centavos >= 0),
  dia_vencimento        integer not null check (dia_vencimento between 1 and 28),
  -- O PDF vem do meio de pagamento ou é montado pelo T3jus (ainda em aberto).
  pdf_path              text,
  gerado_em             timestamptz not null default app_now(),
  gerado_por            uuid references pessoas (id) on delete restrict,
  substituido_em        timestamptz,
  substituido_por_carne uuid references assinatura_carnes (id) on delete restrict,
  substituido_motivo    text check (length(btrim(substituido_motivo)) between 1 and 300),
  substituido_autor     uuid references pessoas (id) on delete restrict,
  check ((substituido_em is null) = (substituido_motivo is null))
);
create index assinatura_carnes_assinatura_idx on assinatura_carnes (assinatura_id, primeira_competencia);
call proteger_tabela_escritorio('assinatura_carnes');

create table faturas (
  id                uuid primary key default gen_random_uuid(),
  escritorio_id     uuid not null references escritorios (id) on delete restrict,
  assinatura_id     uuid not null references assinaturas (id) on delete restrict,
  numero            bigint generated always as identity unique,
  competencia       date not null check (competencia = date_trunc('month', competencia)::date),
  vencimento        date not null,
  plano_nome        text not null,
  forma             text not null check (forma in ('PIX', 'BOLETO', 'CARNE')),
  pessoas_ativas    integer not null check (pessoas_ativas >= 0),
  total_centavos    integer not null check (total_centavos >= 0),
  -- O atraso é calculado: A_VENCER com o vencimento antes de hoje.
  situacao          text not null default 'A_VENCER' check (situacao in ('A_VENCER', 'PAGA', 'CANCELADA')),
  -- Lugar do meio de pagamento (ainda não escolhido).
  pix_copia_cola    text,
  linha_boleto      text,
  emitida_em        timestamptz not null default app_now(),
  paga_em           date,
  forma_paga        text check (forma_paga in ('PIX', 'BOLETO', 'TRANSFERENCIA', 'DINHEIRO', 'OUTRA')),
  baixa             text check (baixa in ('MANUAL', 'MEIO_DE_PAGAMENTO')),
  cancelada_em      timestamptz,
  cancelada_por     uuid references pessoas (id) on delete restrict,
  cancelada_motivo  text check (length(btrim(cancelada_motivo)) between 1 and 300),
  versao            integer not null default 1,
  check ((situacao = 'PAGA') = (paga_em is not null) and (paga_em is null) = (forma_paga is null) and (paga_em is null) = (baixa is null)),
  check ((situacao = 'CANCELADA') = (cancelada_em is not null) and (cancelada_em is null) = (cancelada_motivo is null))
);
create unique index faturas_competencia_unica on faturas (escritorio_id, competencia) where situacao <> 'CANCELADA';
create index faturas_abertas_idx on faturas (escritorio_id, vencimento) where situacao = 'A_VENCER';
call proteger_tabela_escritorio('faturas');

create table assinatura_carne_parcelas (
  id               uuid primary key default gen_random_uuid(),
  escritorio_id    uuid not null references escritorios (id) on delete restrict,
  carne_id         uuid not null references assinatura_carnes (id) on delete restrict,
  numero           integer not null check (numero between 1 and 12),
  competencia      date not null check (competencia = date_trunc('month', competencia)::date),
  vencimento       date not null,
  valor_centavos   integer not null check (valor_centavos >= 0),
  pix_copia_cola   text,
  linha_boleto     text,
  situacao         text not null default 'A_VENCER' check (situacao in ('A_VENCER', 'PAGA', 'CANCELADA')),
  -- A fatura do mês: preenchida na emissão ou quando a parcela é paga adiantada.
  fatura_id        uuid unique references faturas (id) on delete restrict,
  cancelada_em     timestamptz,
  cancelada_motivo text check (length(btrim(cancelada_motivo)) between 1 and 300),
  cancelada_por    uuid references pessoas (id) on delete restrict,
  unique (carne_id, numero),
  check ((situacao = 'CANCELADA') = (cancelada_em is not null) and (cancelada_em is null) = (cancelada_motivo is null))
);
call proteger_tabela_escritorio('assinatura_carne_parcelas');
alter table faturas add column carne_parcela_id uuid unique references assinatura_carne_parcelas (id) on delete restrict;

create table fatura_itens (
  id                      uuid primary key default gen_random_uuid(),
  escritorio_id           uuid not null references escritorios (id) on delete restrict,
  fatura_id               uuid not null references faturas (id) on delete restrict,
  ordem                   integer not null check (ordem between 1 and 20),
  tipo                    text not null check (tipo in ('MENSALIDADE', 'PESSOA_A_MAIS', 'DESCONTO')),
  descricao               text not null check (length(descricao) between 1 and 200),
  quantidade              integer not null check (quantidade >= 1),
  valor_unitario_centavos integer not null,
  valor_centavos          integer not null,
  unique (fatura_id, ordem),
  check (valor_centavos = quantidade * valor_unitario_centavos),
  check ((tipo = 'DESCONTO') = (valor_centavos < 0) or valor_centavos = 0)
);
call proteger_tabela_escritorio('fatura_itens');
create trigger fatura_itens_somente_insercao before update or delete on fatura_itens
  for each row execute function somente_insercao();

-- O que aconteceu na assinatura e em cada fatura: só cresce, nem o dono das tabelas muda.
-- Sem autor é "o sistema" (a rotina ou a volta do acesso ao pagar).
create table fatura_eventos (
  id            bigint generated always as identity primary key,
  escritorio_id uuid not null references escritorios (id) on delete restrict,
  assinatura_id uuid not null references assinaturas (id) on delete restrict,
  fatura_id     uuid references faturas (id) on delete restrict,
  autor_id      uuid references pessoas (id) on delete restrict,
  acao          text not null check (acao ~ '^[a-z_.]{3,60}$'),
  dados         jsonb not null default '{}'::jsonb,
  ocorrido_em   timestamptz not null default app_now()
);
create index fatura_eventos_fatura_idx on fatura_eventos (fatura_id, id);
create index fatura_eventos_assinatura_idx on fatura_eventos (assinatura_id, id);
call proteger_tabela_escritorio('fatura_eventos');
create trigger fatura_eventos_somente_insercao before update or delete on fatura_eventos
  for each row execute function somente_insercao();

create table pagamentos_manuais (
  id               uuid primary key default gen_random_uuid(),
  escritorio_id    uuid not null references escritorios (id) on delete restrict,
  fatura_id        uuid not null unique references faturas (id) on delete restrict,
  pago_em          date not null,
  valor_centavos   integer not null check (valor_centavos >= 0),
  forma            text not null check (forma in ('PIX', 'BOLETO', 'TRANSFERENCIA', 'DINHEIRO', 'OUTRA')),
  comprovante_path text,
  motivo           text not null check (length(btrim(motivo)) between 1 and 300),
  registrado_por   uuid not null references pessoas (id) on delete restrict,
  registrado_em    timestamptz not null default app_now()
);
call proteger_tabela_escritorio('pagamentos_manuais');
create trigger pagamentos_manuais_somente_insercao before update or delete on pagamentos_manuais
  for each row execute function somente_insercao();

-- A fila dos e-mails da cobrança. A rota da api-console manda e registra o resultado.
create table fatura_envios (
  id            uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null references escritorios (id) on delete restrict,
  fatura_id     uuid not null references faturas (id) on delete restrict,
  tipo          text not null check (tipo in ('EMITIDA', 'VENCE_EM_3', 'VENCE_HOJE', 'VENCEU_3', 'VENCEU_7', 'VENCEU_15',
                                              'MANUAL', 'RECIBO', 'CANCELADA')),
  pedido_por    uuid references pessoas (id) on delete restrict,
  criado_em     timestamptz not null default app_now(),
  enviado_em    timestamptz,
  descartado_em timestamptz,
  tentativas    integer not null default 0,
  ultimo_erro   text check (length(ultimo_erro) <= 300)
);
-- Cada passo automático da régua sai uma vez por fatura.
create unique index fatura_envios_passo_unico on fatura_envios (fatura_id, tipo) where tipo <> 'MANUAL';
create index fatura_envios_pendentes_idx on fatura_envios (criado_em) where enviado_em is null and descartado_em is null;
call proteger_tabela_escritorio('fatura_envios');
-- A rota lê a fila de todos os escritórios (como a fila da guarda, 0540), só dentro da rotina.
create policy rotina_cobranca on fatura_envios for select to dominio
  using (current_setting('t3jus.rotina_cobranca', true) = 'on');
-- A aba Planos conta quantos escritórios assinam cada plano (sem abrir as assinaturas).
create policy contando_planos on assinaturas for select to dominio
  using (current_setting('t3jus.contando_planos', true) = 'on');

-- Fatura emitida não muda: só passa de A vencer para Paga ou Cancelada, e o lugar do meio de
-- pagamento pode ser preenchido depois. A carne_parcela_id é ligada na emissão.
create function faturas_so_muda_situacao() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    if current_setting('t3jus.fim_da_guarda', true) = 'on' then return old; end if;
    raise exception 'Fatura não se apaga: cancele com motivo' using errcode = 'TC010';
  end if;
  if (new.escritorio_id, new.assinatura_id, new.numero, new.competencia, new.vencimento, new.plano_nome, new.forma,
      new.pessoas_ativas, new.total_centavos, new.emitida_em)
     is distinct from (old.escritorio_id, old.assinatura_id, old.numero, old.competencia, old.vencimento, old.plano_nome, old.forma,
                       old.pessoas_ativas, old.total_centavos, old.emitida_em)
     or (old.carne_parcela_id is not null and new.carne_parcela_id is distinct from old.carne_parcela_id) then
    raise exception 'A fatura emitida não muda' using errcode = 'TC422', detail = '{"motivo":"FATURA_EMITIDA_NAO_MUDA"}';
  end if;
  if old.situacao <> new.situacao and not (old.situacao = 'A_VENCER' and new.situacao in ('PAGA', 'CANCELADA')) then
    raise exception 'Transição proibida na fatura: % → %', old.situacao, new.situacao using errcode = 'TC023';
  end if;
  if old.situacao <> 'A_VENCER' and (new.paga_em, new.forma_paga, new.cancelada_em, new.cancelada_motivo)
                                    is distinct from (old.paga_em, old.forma_paga, old.cancelada_em, old.cancelada_motivo) then
    raise exception 'Fatura paga ou cancelada não muda' using errcode = 'TC422', detail = '{"motivo":"FATURA_FECHADA"}';
  end if;
  return new;
end $$;
create trigger faturas_so_muda_situacao before update or delete on faturas
  for each row execute function faturas_so_muda_situacao();

-- Parcela não se apaga; só passa de A vencer para Paga ou Cancelada, e ganha a fatura.
create function parcelas_so_muda_situacao() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    if current_setting('t3jus.fim_da_guarda', true) = 'on' then return old; end if;
    raise exception 'Parcela do carnê não se apaga: é cancelada com motivo' using errcode = 'TC010';
  end if;
  if (new.carne_id, new.numero, new.competencia, new.vencimento, new.valor_centavos)
     is distinct from (old.carne_id, old.numero, old.competencia, old.vencimento, old.valor_centavos)
     or (old.fatura_id is not null and new.fatura_id is distinct from old.fatura_id) then
    raise exception 'A parcela do carnê não muda' using errcode = 'TC422', detail = '{"motivo":"PARCELA_NAO_MUDA"}';
  end if;
  if old.situacao <> new.situacao and not (old.situacao = 'A_VENCER' and new.situacao in ('PAGA', 'CANCELADA')) then
    raise exception 'Transição proibida na parcela: % → %', old.situacao, new.situacao using errcode = 'TC023';
  end if;
  return new;
end $$;
create trigger parcelas_so_muda_situacao before update or delete on assinatura_carne_parcelas
  for each row execute function parcelas_so_muda_situacao();

create function carnes_sem_exclusao() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_setting('t3jus.fim_da_guarda', true) = 'on' then return old; end if;
  raise exception 'Carnê não se apaga: é substituído com motivo' using errcode = 'TC010';
end $$;
create trigger carnes_sem_exclusao before delete on assinatura_carnes
  for each row execute function carnes_sem_exclusao();
create trigger assinaturas_sem_exclusao before delete on assinaturas
  for each row execute function carnes_sem_exclusao();

insert into inventario_dados (tabela, dado_pessoal, o_que, para_que, base_legal, controlador, prazo, no_fim, situacao, exportar) values
 ('planos', false, 'Planos do T3jus: nome, preço, pessoas incluídas e se está arquivado', null, null, null, null, null, null, false),
 ('planos_regras', false, 'O valor da pessoa a mais, igual para todos os planos', null, null, null, null, null, null, false),
 ('planos_eventos', false, 'Histórico do catálogo de planos (criar, mudar e arquivar, com o motivo)', null, null, null, null, null, null, false),
 ('assinaturas', true,
  'A assinatura do escritório: plano, preço, pessoas incluídas, dia, forma de pagamento, e-mail de cobrança, CNPJ da nota, desconto e o só consulta por atraso',
  'Cobrar o escritório pelo uso do T3jus (CO-06)', 'Execução de contrato (LGPD, art. 7º, V)', 'T3jus',
  'Enquanto o escritório for cliente do T3jus e 5 anos depois do fim do contrato', 'Apagada no fim da guarda, com o escritório', 'APROVADO', false),
 ('faturas', false, 'Faturas mensais do T3jus ao escritório: competência, vencimento, total, situação e como foi paga', null, null, null, null, null, null, true),
 ('fatura_itens', false, 'Itens de cada fatura: mensalidade, pessoas a mais e desconto', null, null, null, null, null, null, true),
 ('fatura_eventos', false, 'Histórico da assinatura e das faturas (emissão, lembretes, pagamento, cancelamento, só consulta), com o autor', null, null, null, null, null, null, false),
 ('assinatura_carnes', false, 'Carnês da assinatura: período, parcelas, valor e se foi substituído', null, null, null, null, null, null, true),
 ('assinatura_carne_parcelas', false, 'Parcelas de cada carnê da assinatura: competência, vencimento, valor e situação', null, null, null, null, null, null, true),
 ('pagamentos_manuais', false, 'Pagamentos registrados à mão: data, valor, forma, motivo e quem registrou', null, null, null, null, null, null, false),
 ('fatura_envios', false, 'Fila dos e-mails da cobrança: qual passo da régua, quando saiu e o erro, se houve', null, null, null, null, null, null, false);

-- ---------------------------------------------------------------------------------------
-- 4. A trava da escrita: o contrato encerrado (0210) e agora o Portal só para consulta.
--    No só consulta por atraso, quem é do escritório não cria nem muda nada (403
--    PORTAL_SO_CONSULTA). A exportação continua (só escreve no histórico), a equipe T3jus
--    continua atendendo e o que o sistema faz sozinho (as mensagens que chegam pelo WhatsApp, as
--    rotinas) não para: nada se perde enquanto o escritório acerta a fatura.

create function portal_so_consulta_desde(p_escritorio uuid) returns timestamptz
language plpgsql
set search_path = public
as $$
declare v timestamptz; v_antes text := current_setting('t3jus.contando_planos', true);
begin
  perform set_config('t3jus.contando_planos', 'on', true);
  select so_consulta_desde into v from assinaturas where escritorio_id = p_escritorio;
  perform set_config('t3jus.contando_planos', coalesce(v_antes, ''), true);
  return v;
end $$;

create or replace function contrato_aceita_escrita() returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_linha jsonb := to_jsonb(coalesce(new, old));
  v_escritorio uuid := case when tg_table_name = 'escritorios' then (v_linha ->> 'id')::uuid
                            else (v_linha ->> 'escritorio_id')::uuid end;
begin
  if current_setting('t3jus.aplicando_prazos', true) = 'on' or current_setting('t3jus.mudando_contrato', true) = 'on'
     or current_setting('t3jus.cobrando', true) = 'on' then
    return coalesce(new, old);
  end if;
  if tg_table_name = 'vinculos' and not exists (select 1 from funcoes f where f.codigo = v_linha ->> 'funcao' and f.sistema = 'PORTAL') then
    return coalesce(new, old);
  end if;
  if contrato_situacao(v_escritorio) in ('CONSULTA', 'FECHADO') then
    raise exception 'O contrato terminou: o Portal está só para consulta' using errcode = 'TC401',
      detail = jsonb_build_object('motivo', 'CONTRATO_ENCERRADO')::text;
  end if;
  if contexto_pessoa() is not null and not contexto_equipe() and portal_so_consulta_desde(v_escritorio) is not null then
    raise exception 'O Portal está só para consulta por uma pendência com o T3jus' using errcode = 'TC401',
      detail = jsonb_build_object('motivo', 'PORTAL_SO_CONSULTA')::text;
  end if;
  return coalesce(new, old);
end $$;

-- A API confere antes de criar a conta de um convite no Auth.
create or replace function portal_exigir_escrita(p_pessoa uuid, p_escritorio uuid) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'escritorio.ver');
  if contrato_situacao(p_escritorio) <> 'ABERTO' and contrato_situacao(p_escritorio) <> 'MARCADO' then
    raise exception 'O contrato terminou: o Portal está só para consulta' using errcode = 'TC401',
      detail = jsonb_build_object('motivo', 'CONTRATO_ENCERRADO')::text;
  end if;
  if not contexto_equipe() and portal_so_consulta_desde(p_escritorio) is not null then
    raise exception 'O Portal está só para consulta por uma pendência com o T3jus' using errcode = 'TC401',
      detail = jsonb_build_object('motivo', 'PORTAL_SO_CONSULTA')::text;
  end if;
end $$;

-- ---------------------------------------------------------------------------------------
-- 5. Contas da cobrança (funções internas, sem security definer: rodam dentro das da API)

create function competencia_de(p_dia date) returns date
language sql immutable
as $$ select date_trunc('month', p_dia)::date $$;

create function vencimento_de(p_competencia date, p_dia integer) returns date
language sql immutable
as $$ select make_date(extract(year from p_competencia)::int, extract(month from p_competencia)::int, p_dia) $$;

create function mes_por_extenso(p_competencia date) returns text
language sql immutable
as $$
  select (array['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro',
                'outubro', 'novembro', 'dezembro'])[extract(month from p_competencia)::int]
         || ' de ' || extract(year from p_competencia)::int
$$;

-- Quem conta como pessoa: vínculo ativo de função do Portal, no dia da emissão (decisão 1).
create function pessoas_ativas_portal(p_escritorio uuid) returns integer
language plpgsql
set search_path = public
as $$
declare v integer; v_antes text := current_setting('t3jus.lendo_acesso', true);
begin
  perform set_config('t3jus.lendo_acesso', 'on', true);
  select count(distinct v.pessoa_id)::int into v from vinculos v join funcoes f on f.codigo = v.funcao
   where v.escritorio_id = p_escritorio and f.sistema = 'PORTAL' and v.revogado_em is null;
  perform set_config('t3jus.lendo_acesso', coalesce(v_antes, ''), true);
  return v;
end $$;

create function pessoa_a_mais_centavos() returns integer
language sql stable
set search_path = public
as $$ select pessoa_a_mais_centavos from planos_regras $$;

-- Os itens da fatura de uma competência: mensalidade, pessoas a mais e o desconto, que vale
-- sobre a mensalidade (R$ 490,00 + R$ 39,00 − R$ 98,00 = R$ 431,00 no exemplo da Cedro & Lima).
-- Devolve {itens, totalCentavos, pessoas}. Usada na emissão e nas prévias das telas.
create function cobranca_itens(p_preco integer, p_incluidas integer, p_desconto_pct integer, p_desconto_ate date,
                               p_competencia date, p_pessoas integer, p_plano text) returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  v_mais integer := greatest(p_pessoas - p_incluidas, 0);
  v_unit integer := pessoa_a_mais_centavos();
  v_desc integer := 0;
  v_itens jsonb;
begin
  v_itens := jsonb_build_array(jsonb_build_object('tipo', 'MENSALIDADE', 'descricao', 'Plano ' || p_plano || ' · ' || mes_por_extenso(p_competencia),
                                                  'quantidade', 1, 'valorUnitarioCentavos', p_preco, 'valorCentavos', p_preco));
  if v_mais > 0 then
    v_itens := v_itens || jsonb_build_object('tipo', 'PESSOA_A_MAIS',
      'descricao', case when v_mais = 1 then '1 pessoa a mais' else v_mais || ' pessoas a mais' end
                   || ' (' || p_pessoas || ' ativas, ' || p_incluidas || ' incluídas)',
      'quantidade', v_mais, 'valorUnitarioCentavos', v_unit, 'valorCentavos', v_mais * v_unit);
  end if;
  if p_desconto_pct is not null and p_competencia <= p_desconto_ate then
    v_desc := round(p_preco * p_desconto_pct / 100.0)::int;
    if v_desc > 0 then
      v_itens := v_itens || jsonb_build_object('tipo', 'DESCONTO', 'descricao', 'Desconto de implantação (' || p_desconto_pct || '% da mensalidade)',
                                               'quantidade', 1, 'valorUnitarioCentavos', -v_desc, 'valorCentavos', -v_desc);
    end if;
  end if;
  return jsonb_build_object('itens', v_itens, 'pessoas', p_pessoas,
                            'totalCentavos', greatest(p_preco + v_mais * v_unit - v_desc, 0));
end $$;

create function cobranca_itens_da(a assinaturas, p_competencia date) returns jsonb
language sql stable
set search_path = public
as $$
  select cobranca_itens(a.preco_centavos, a.pessoas_incluidas, a.desconto_pct, a.desconto_ate, p_competencia,
                        pessoas_ativas_portal(a.escritorio_id), (select nome from planos where id = a.plano_id))
$$;

-- Dias de atraso da fatura: só a que está em aberto e passou do vencimento.
create function fatura_atraso_dias(f faturas) returns integer
language sql stable
set search_path = public
as $$ select case when f.situacao = 'A_VENCER' and f.vencimento < hoje_brasilia() then hoje_brasilia() - f.vencimento end $$;

-- O maior atraso do escritório do contexto (null: em dia).
create function escritorio_atraso_dias(p_escritorio uuid) returns integer
language sql stable
set search_path = public
as $$
  select max(hoje_brasilia() - f.vencimento)::int from faturas f
   where f.escritorio_id = p_escritorio and f.situacao = 'A_VENCER' and f.vencimento < hoje_brasilia()
$$;

-- Situação para as telas: EM_ATRASO, VENCE_HOJE, A_VENCER, PAGA ou CANCELADA.
create function fatura_situacao(f faturas) returns text
language sql stable
set search_path = public
as $$
  select case when f.situacao <> 'A_VENCER' then f.situacao
              when f.vencimento < hoje_brasilia() then 'EM_ATRASO'
              when f.vencimento = hoje_brasilia() then 'VENCE_HOJE'
              else 'A_VENCER' end
$$;

create function cobranca_evento(p_assinatura uuid, p_fatura uuid, p_acao text, p_dados jsonb default '{}'::jsonb,
                                p_sistema boolean default false) returns void
language plpgsql
set search_path = public
as $$
begin
  insert into fatura_eventos (escritorio_id, assinatura_id, fatura_id, autor_id, acao, dados)
  select a.escritorio_id, a.id, p_fatura, case when p_sistema then null else contexto_pessoa() end, p_acao,
         jsonb_strip_nulls(coalesce(p_dados, '{}'::jsonb))
    from assinaturas a where a.id = p_assinatura;
end $$;

create function cobranca_enfileirar(p_fatura uuid, p_tipo text) returns void
language sql
set search_path = public
as $$
  insert into fatura_envios (escritorio_id, fatura_id, tipo, pedido_por)
  select f.escritorio_id, f.id, p_tipo, case when p_tipo = 'MANUAL' then contexto_pessoa() end
    from faturas f where f.id = p_fatura
  on conflict (fatura_id, tipo) where tipo <> 'MANUAL' do nothing
$$;

-- Conflito de versão com quem mudou e a que horas (como o conflito aprovado da ficha, PT-19).
create function conflito_cobranca(p_tabela regclass, p_id uuid) returns void
language plpgsql
set search_path = public
as $$
declare
  v_atual jsonb;
  v_ultimo record;
begin
  execute format('select to_jsonb(t) from %s t where id = $1', p_tabela) into v_atual using p_id;
  if v_atual is null then raise exception 'Registro não encontrado' using errcode = 'TC404'; end if;
  select e.ocorrido_em, p.nome into v_ultimo from fatura_eventos e left join pessoas p on p.id = e.autor_id
   where ((p_tabela = 'faturas'::regclass and e.fatura_id = p_id) or (p_tabela = 'assinaturas'::regclass and e.assinatura_id = p_id))
   order by e.autor_id is null, e.id desc limit 1;
  raise exception 'Outra pessoa alterou este registro' using errcode = 'TC409',
    detail = jsonb_build_object('versao', v_atual -> 'versao', 'atual', v_atual,
                                'quem', coalesce(v_ultimo.nome, 'O sistema'), 'em', v_ultimo.ocorrido_em)::text;
end $$;

create function motivo_valido(p_motivo text) returns text
language plpgsql
immutable
as $$
begin
  if p_motivo is null or length(btrim(p_motivo)) not between 1 and 300 then
    raise exception 'O motivo é obrigatório' using errcode = 'TC422',
      detail = jsonb_build_object('motivo', 'MOTIVO_OBRIGATORIO', 'campos', jsonb_build_array('motivo'))::text;
  end if;
  return btrim(p_motivo);
end $$;

-- Gera um carnê da assinatura a partir da competência dita: N parcelas iguais, no dia escolhido.
-- O valor é o da fatura da primeira competência (fica fixo, desenho: "O valor da parcela fica
-- fixo"). O nome é o ano, ou os dois anos ("2026/2027").
create function cobranca_gerar_carne(a assinaturas, p_competencia date, p_sistema boolean) returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_id uuid;
  v_n integer := coalesce(a.parcelas_por_carne, configuracao_int('cobranca_parcelas_por_carne'));
  v_ultima date := (p_competencia + make_interval(months => v_n - 1))::date;
  v_valor integer := (cobranca_itens_da(a, p_competencia) ->> 'totalCentavos')::int;
begin
  insert into assinatura_carnes (escritorio_id, assinatura_id, numero, primeira_competencia, parcelas, valor_parcela_centavos,
                                 dia_vencimento, gerado_por)
  values (a.escritorio_id, a.id,
          extract(year from p_competencia)::int
            || case when extract(year from v_ultima) <> extract(year from p_competencia) then '/' || extract(year from v_ultima)::int else '' end,
          p_competencia, v_n, v_valor, a.dia_vencimento, case when p_sistema then null else contexto_pessoa() end)
  returning id into v_id;
  insert into assinatura_carne_parcelas (escritorio_id, carne_id, numero, competencia, vencimento, valor_centavos)
  select a.escritorio_id, v_id, i, (p_competencia + make_interval(months => i - 1))::date,
         vencimento_de((p_competencia + make_interval(months => i - 1))::date, a.dia_vencimento), v_valor
    from generate_series(1, v_n) i;
  perform cobranca_evento(a.id, null, 'carne.gerado', jsonb_build_object('carneId', v_id,
    'numero', (select numero from assinatura_carnes where id = v_id), 'parcelas', v_n, 'valorParcelaCentavos', v_valor,
    'de', p_competencia, 'ate', v_ultima), p_sistema);
  return v_id;
end $$;

-- A competência seguinte à última que já tem fatura (ou a primeira da cobrança).
create function cobranca_proxima_sem_fatura(a assinaturas) returns date
language sql stable
set search_path = public
as $$
  select coalesce((select (max(f.competencia) + interval '1 month')::date from faturas f
                    where f.assinatura_id = a.id and f.situacao <> 'CANCELADA'),
                  a.primeira_competencia,
                  (competencia_de(hoje_brasilia()) + interval '1 month')::date)
$$;

-- Troca as parcelas ainda sem fatura e não pagas por um carnê novo (desenho, estado 40). Numa
-- transação só: cancela com motivo e autor, sem apagar, marca o carnê de antes como substituído
-- e gera o novo a partir da próxima competência sem fatura. A parcela paga não muda.
-- Sem carnê novo quando a forma deixa de ser Carnê (p_gerar false).
create function cobranca_trocar_carne(a assinaturas, p_motivo text, p_gerar boolean, p_sistema boolean default false) returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_parcelas uuid[];
  v_carnes uuid[];
  v_novo uuid;
  v_inicio date;
begin
  select coalesce(array_agg(p.id order by p.competencia), '{}'), coalesce(array_agg(distinct p.carne_id), '{}')
    into v_parcelas, v_carnes
    from assinatura_carne_parcelas p join assinatura_carnes c on c.id = p.carne_id
   where c.assinatura_id = a.id and c.substituido_em is null and p.situacao = 'A_VENCER' and p.fatura_id is null;
  if cardinality(v_parcelas) = 0 and p_gerar and exists (select 1 from assinatura_carnes c where c.assinatura_id = a.id and c.substituido_em is null) then
    raise exception 'Não há parcela a trocar' using errcode = 'TC422', detail = '{"motivo":"CARNE_SEM_PARCELA_A_TROCAR"}';
  end if;
  update assinatura_carne_parcelas
     set situacao = 'CANCELADA', cancelada_em = app_now(), cancelada_motivo = p_motivo,
         cancelada_por = case when p_sistema then null else contexto_pessoa() end
   where id = any (v_parcelas);
  if p_gerar and a.primeira_competencia is not null then
    v_inicio := cobranca_proxima_sem_fatura(a);
    v_novo := cobranca_gerar_carne(a, v_inicio, p_sistema);
  end if;
  update assinatura_carnes
     set substituido_em = app_now(), substituido_motivo = p_motivo, substituido_por_carne = v_novo,
         substituido_autor = case when p_sistema then null else contexto_pessoa() end
   where id = any (v_carnes);
  if cardinality(v_parcelas) > 0 then
    perform cobranca_evento(a.id, null, 'carne.parcelas_canceladas', jsonb_build_object(
      'parcelas', cardinality(v_parcelas), 'motivo', p_motivo, 'novoCarneId', v_novo), p_sistema);
  end if;
  return jsonb_build_object('canceladas', cardinality(v_parcelas), 'carneNovoId', v_novo);
end $$;

-- Emite a fatura de uma competência. Com carnê, a fatura é a parcela daquele mês (com os mesmos
-- códigos de pagamento); sem carnê que cubra o mês, nasce um carnê novo a partir dele.
create function cobranca_emitir(a assinaturas, p_competencia date, p_avisar boolean default true,
                                p_sistema boolean default false) returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_id uuid;
  v_conta jsonb;
  v_parcela assinatura_carne_parcelas;
  v_carne assinatura_carnes;
  v_venc date := vencimento_de(p_competencia, a.dia_vencimento);
  v_plano text := (select nome from planos where id = a.plano_id);
  v_item jsonb;
  v_ordem integer := 0;
begin
  if a.forma = 'CARNE' then
    select p.* into v_parcela from assinatura_carne_parcelas p join assinatura_carnes c on c.id = p.carne_id
     where c.assinatura_id = a.id and c.substituido_em is null and p.competencia = p_competencia
       and p.situacao = 'A_VENCER' and p.fatura_id is null
     order by c.gerado_em desc limit 1;
    if v_parcela.id is null then
      perform cobranca_gerar_carne(a, p_competencia, p_sistema);
      select p.* into v_parcela from assinatura_carne_parcelas p join assinatura_carnes c on c.id = p.carne_id
       where c.assinatura_id = a.id and c.substituido_em is null and p.competencia = p_competencia
         and p.situacao = 'A_VENCER' and p.fatura_id is null
       order by c.gerado_em desc limit 1;
    end if;
    select * into v_carne from assinatura_carnes where id = v_parcela.carne_id;
    v_venc := v_parcela.vencimento;
    v_conta := jsonb_build_object('pessoas', pessoas_ativas_portal(a.escritorio_id), 'totalCentavos', v_parcela.valor_centavos,
      'itens', jsonb_build_array(jsonb_build_object('tipo', 'MENSALIDADE',
        'descricao', 'Parcela ' || v_parcela.numero || ' de ' || v_carne.parcelas || ' do carnê ' || v_carne.numero
                     || ' · plano ' || v_plano || ' · ' || mes_por_extenso(p_competencia),
        'quantidade', 1, 'valorUnitarioCentavos', v_parcela.valor_centavos, 'valorCentavos', v_parcela.valor_centavos)));
  else
    v_conta := cobranca_itens_da(a, p_competencia);
  end if;

  insert into faturas (escritorio_id, assinatura_id, competencia, vencimento, plano_nome, forma, pessoas_ativas, total_centavos,
                       carne_parcela_id, pix_copia_cola, linha_boleto)
  values (a.escritorio_id, a.id, p_competencia, v_venc, v_plano, a.forma, (v_conta ->> 'pessoas')::int, (v_conta ->> 'totalCentavos')::int,
          v_parcela.id, v_parcela.pix_copia_cola, v_parcela.linha_boleto)
  returning id into v_id;
  for v_item in select * from jsonb_array_elements(v_conta -> 'itens') loop
    v_ordem := v_ordem + 1;
    insert into fatura_itens (escritorio_id, fatura_id, ordem, tipo, descricao, quantidade, valor_unitario_centavos, valor_centavos)
    values (a.escritorio_id, v_id, v_ordem, v_item ->> 'tipo', v_item ->> 'descricao', (v_item ->> 'quantidade')::int,
            (v_item ->> 'valorUnitarioCentavos')::int, (v_item ->> 'valorCentavos')::int);
  end loop;
  -- A soma dos itens é o total, conferida aqui (desenho, "Para quem for programar").
  if (select sum(valor_centavos) from fatura_itens where fatura_id = v_id) <> (v_conta ->> 'totalCentavos')::int
     and (v_conta ->> 'totalCentavos')::int > 0 then
    raise exception 'A soma dos itens não fecha com o total da fatura' using errcode = 'TC422';
  end if;
  if v_parcela.id is not null then
    update assinatura_carne_parcelas set fatura_id = v_id where id = v_parcela.id;
  end if;
  perform cobranca_evento(a.id, v_id, 'fatura.emitida', jsonb_build_object(
    'competencia', p_competencia, 'vencimento', v_venc, 'totalCentavos', (v_conta ->> 'totalCentavos')::int,
    'pessoas', (v_conta ->> 'pessoas')::int, 'parcela', v_parcela.numero), p_sistema);
  if p_avisar and contrato_situacao(a.escritorio_id) in ('ABERTO', 'MARCADO') then
    perform cobranca_enfileirar(v_id, 'EMITIDA');
  end if;
  return v_id;
end $$;

-- Emite o que falta da assinatura: a primeira fatura logo no início da cobrança e as outras 20
-- dias antes do vencimento. Com o contrato encerrado, nada sai (desenho, "Rotina diária").
create function cobranca_emitir_pendentes(p_assinatura uuid, p_sistema boolean default true) returns integer
language plpgsql
set search_path = public
as $$
declare
  a assinaturas;
  v_comp date;
  v_n integer := 0;
  v_dias integer := configuracao_int('cobranca_emitir_dias_antes');
begin
  select * into a from assinaturas where id = p_assinatura;
  if a.primeira_competencia is null or contrato_situacao(a.escritorio_id) not in ('ABERTO', 'MARCADO') then
    return 0;
  end if;
  v_comp := a.primeira_competencia;
  loop
    exit when v_comp <> a.primeira_competencia and vencimento_de(v_comp, a.dia_vencimento) - v_dias > hoje_brasilia();
    exit when v_comp > competencia_de(hoje_brasilia()) + interval '2 months';
    if not exists (select 1 from faturas f where f.escritorio_id = a.escritorio_id and f.competencia = v_comp) then
      perform cobranca_emitir(a, v_comp, true, p_sistema);
      v_n := v_n + 1;
    end if;
    v_comp := (v_comp + interval '1 month')::date;
  end loop;
  return v_n;
end $$;

-- Pagamento confirmado (registro manual ou, depois, o aviso do meio de pagamento): a fatura
-- passa a Paga, a parcela do carnê também, o recibo vai para a fila e, se não sobrar fatura com
-- 30 dias ou mais em aberto, o Portal volta ao normal sozinho (desenho, decisão 4).
create function cobranca_pagar(p_fatura uuid, p_pago_em date, p_forma text, p_baixa text) returns jsonb
language plpgsql
set search_path = public
as $$
declare
  f faturas;
  a assinaturas;
  v_devolveu boolean := false;
begin
  select * into f from faturas where id = p_fatura;
  update faturas set situacao = 'PAGA', paga_em = p_pago_em, forma_paga = p_forma, baixa = p_baixa where id = p_fatura;
  update assinatura_carne_parcelas set situacao = 'PAGA' where fatura_id = p_fatura and situacao = 'A_VENCER';
  perform cobranca_evento(f.assinatura_id, p_fatura, 'fatura.paga', jsonb_build_object(
    'pagaEm', p_pago_em, 'forma', p_forma, 'baixa', p_baixa, 'totalCentavos', f.total_centavos), p_baixa = 'MEIO_DE_PAGAMENTO');
  update fatura_envios set descartado_em = app_now()
   where fatura_id = p_fatura and enviado_em is null and descartado_em is null and tipo not in ('RECIBO', 'CANCELADA');
  perform cobranca_enfileirar(p_fatura, 'RECIBO');
  select * into a from assinaturas where id = f.assinatura_id;
  if a.so_consulta_desde is not null
     and coalesce(escritorio_atraso_dias(a.escritorio_id), 0) < configuracao_int('cobranca_propor_consulta_dias') then
    update assinaturas set so_consulta_desde = null, so_consulta_motivo = null, so_consulta_por = null where id = a.id;
    perform cobranca_evento(a.id, p_fatura, 'acesso.devolvido', jsonb_build_object('pelo', 'PAGAMENTO'), true);
    v_devolveu := true;
  end if;
  return jsonb_build_object('acessoDevolvido', v_devolveu);
end $$;

-- Começa a cobrança (decisão 2): ao passar para Ativo, com a assinatura preparada. A primeira
-- fatura vence no dia escolhido do mês seguinte.
create function cobranca_comecar(p_escritorio uuid) returns void
language plpgsql
set search_path = public
as $$
declare a assinaturas; v_antes text := current_setting('t3jus.cobrando', true);
begin
  select * into a from assinaturas where escritorio_id = p_escritorio;
  if a.id is null or a.inicio_cobranca is not null then return; end if;
  perform cobranca_marcar(true);
  update assinaturas set inicio_cobranca = hoje_brasilia(),
                         primeira_competencia = (competencia_de(hoje_brasilia()) + interval '1 month')::date
   where id = a.id;
  perform cobranca_evento(a.id, null, 'cobranca.comecou', jsonb_build_object('em', hoje_brasilia()));
  perform cobranca_emitir_pendentes(a.id, false);
  perform set_config('t3jus.cobrando', coalesce(v_antes, ''), true);
end $$;

create function cobranca_ao_ativar() returns trigger
language plpgsql
set search_path = public
as $$
begin
  perform cobranca_comecar(new.escritorio_id);
  return null;
end $$;
create trigger cobranca_ao_ativar after update of estado on clientes
  for each row when (new.estado = 'ATIVO' and old.estado = 'IMPLANTACAO')
  execute function cobranca_ao_ativar();

-- ---------------------------------------------------------------------------------------
-- 6. Rotina diária (F0.13): emite, renova o carnê, põe os lembretes da régua na fila e marca o
--    aviso do Portal aos 7 dias e a proposta de só consulta aos 30. Não passa o Portal para só
--    consulta nem apaga nada. Com o contrato encerrado, não emite nem lembra.

-- Os passos automáticos da régua: o tipo do e-mail e o dia, contado do vencimento. Cada passo
-- vale até o próximo, para um dia sem rotina não perder o lembrete.
create function regua_passo(p_dias integer) returns text
language sql immutable
as $$
  select case when p_dias between -3 and -1 then 'VENCE_EM_3'
              when p_dias between 0 and 2 then 'VENCE_HOJE'
              when p_dias between 3 and 6 then 'VENCEU_3'
              when p_dias between 7 and 14 then 'VENCEU_7'
              when p_dias between 15 and 29 then 'VENCEU_15' end
$$;

create function cobranca_rotina() returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  e uuid;
  a assinaturas;
  f faturas;
  v_emitidas integer := 0;
  v_lembretes integer := 0;
  v_carnes integer := 0;
  v_passo text;
  v_ultima assinatura_carne_parcelas;
  v_dias integer := configuracao_int('cobranca_emitir_dias_antes');
  v_aviso integer := configuracao_int('cobranca_aviso_portal_dias');
  v_propor integer := configuracao_int('cobranca_propor_consulta_dias');
  v_lista uuid[];
begin
  perform limpar_contexto();
  perform set_config('t3jus.lendo_acesso', 'on', true);
  select coalesce(array_agg(id order by id), '{}') into v_lista from escritorios;
  perform set_config('t3jus.lendo_acesso', '', true);
  perform cobranca_marcar(true);
  foreach e in array v_lista loop
    perform entrar_escritorio_servico(e);
    select * into a from assinaturas where escritorio_id = e;
    continue when a.id is null or a.primeira_competencia is null
               or contrato_situacao(e) not in ('ABERTO', 'MARCADO');

    -- Carnê: o próximo sai 20 dias antes da última parcela (decisão 6).
    if a.forma = 'CARNE' then
      select p.* into v_ultima from assinatura_carne_parcelas p join assinatura_carnes c on c.id = p.carne_id
       where c.assinatura_id = a.id and c.substituido_em is null
       order by p.competencia desc limit 1;
      if v_ultima.id is not null and v_ultima.vencimento - v_dias <= hoje_brasilia() then
        perform cobranca_gerar_carne(a, (v_ultima.competencia + interval '1 month')::date, true);
        v_carnes := v_carnes + 1;
      end if;
      v_ultima := null;
    end if;

    v_emitidas := v_emitidas + cobranca_emitir_pendentes(a.id, true);

    for f in select * from faturas where escritorio_id = e and situacao = 'A_VENCER' order by vencimento loop
      v_passo := regua_passo(hoje_brasilia() - f.vencimento);
      if v_passo is not null and not exists (select 1 from fatura_envios x where x.fatura_id = f.id and x.tipo = v_passo) then
        perform cobranca_enfileirar(f.id, v_passo);
        v_lembretes := v_lembretes + 1;
      end if;
      if hoje_brasilia() - f.vencimento >= v_aviso
         and not exists (select 1 from fatura_eventos x where x.fatura_id = f.id and x.acao = 'portal.aviso_aceso') then
        perform cobranca_evento(a.id, f.id, 'portal.aviso_aceso', jsonb_build_object('dias', hoje_brasilia() - f.vencimento), true);
      end if;
      if hoje_brasilia() - f.vencimento >= v_propor
         and not exists (select 1 from fatura_eventos x where x.fatura_id = f.id and x.acao = 'consulta.proposta') then
        perform cobranca_evento(a.id, f.id, 'consulta.proposta', jsonb_build_object('dias', hoje_brasilia() - f.vencimento), true);
      end if;
    end loop;
  end loop;
  perform cobranca_marcar(false);
  perform limpar_contexto();
  perform cobranca_envios_chamar();
  return jsonb_build_object('emitidas', v_emitidas, 'lembretes', v_lembretes, 'carnes', v_carnes);
end $$;

-- Chama a rota que manda os e-mails, se há o que mandar e o banco tem o pg_net.
create function cobranca_envios_chamar() returns boolean
language plpgsql
set search_path = public
as $$
declare v_url text := nullif(btrim((select valor #>> '{}' from configuracoes where chave = 'cobranca_envios_url')), '');
begin
  if v_url is null or not exists (select 1 from pg_extension where extname = 'pg_net') then
    return false;
  end if;
  execute 'select net.http_post(url := $1, body := ''{}''::jsonb, timeout_milliseconds := 30000)' using v_url;
  return true;
end $$;

-- Todo dia às 8h de Brasília (11h UTC), onde o pg_cron existe ("Vence hoje", lembrete às 8h).
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('t3jus-cobranca', '0 11 * * *', 'select public.cobranca_rotina()');
  end if;
end $$;

-- A rota pede os e-mails que faltam, com o que cada um precisa dizer. O lembrete de fatura que
-- já foi paga ou cancelada sai da fila sem ir.
create function rotina_cobranca_envios_pendentes(p_limite integer default 20) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  f faturas;
  a assinaturas;
  v_saida jsonb := '[]'::jsonb;
  v_lista jsonb;
begin
  perform limpar_contexto();
  perform set_config('t3jus.rotina_cobranca', 'on', true);
  select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'e', x.escritorio_id) order by x.tentativas, x.criado_em), '[]'::jsonb)
    into v_lista
    from (select * from fatura_envios where enviado_em is null and descartado_em is null and tentativas < 5
           order by tentativas, criado_em limit greatest(least(p_limite, 50), 1)) x;
  perform set_config('t3jus.rotina_cobranca', '', true);
  for r in select * from jsonb_to_recordset(v_lista) as y(id uuid, e uuid) loop
    perform entrar_escritorio_servico(r.e);
    select f2.* into f from faturas f2 join fatura_envios x on x.fatura_id = f2.id where x.id = r.id;
    select * into a from assinaturas where id = f.assinatura_id;
    if f.situacao <> 'A_VENCER' and (select tipo from fatura_envios where id = r.id) not in ('RECIBO', 'CANCELADA') then
      perform cobranca_marcar(true);
      update fatura_envios set descartado_em = app_now() where id = r.id;
      perform cobranca_marcar(false);
      continue;
    end if;
    v_saida := v_saida || jsonb_build_object(
      'id', r.id, 'tipo', (select tipo from fatura_envios where id = r.id),
      'para', a.email_cobranca,
      -- Cópia para o sócio dono (desenho, Régua): o e-mail dele vem do Auth.
      'copiaPessoaId', (select v.pessoa_id from vinculos v where v.escritorio_id = r.e and v.funcao = 'SOCIO' and v.revogado_em is null
                         order by v.criado_em limit 1),
      'socio', (select p.nome from vinculos v join pessoas p on p.id = v.pessoa_id
                 where v.escritorio_id = r.e and v.funcao = 'SOCIO' and v.revogado_em is null order by v.criado_em limit 1),
      'escritorio', (select nome from escritorios where id = r.e),
      'fatura', jsonb_build_object('id', f.id, 'numero', f.numero, 'competencia', f.competencia, 'vencimento', f.vencimento,
                                   'totalCentavos', f.total_centavos, 'pagaEm', f.paga_em, 'atrasoDias', fatura_atraso_dias(f),
                                   'pixCopiaCola', f.pix_copia_cola, 'linhaBoleto', f.linha_boleto),
      -- O lembrete manual leva todas as faturas em aberto do escritório.
      'abertas', (select coalesce(jsonb_agg(jsonb_build_object('competencia', o.competencia, 'vencimento', o.vencimento,
                                                               'totalCentavos', o.total_centavos, 'atrasoDias', fatura_atraso_dias(o))
                                            order by o.vencimento), '[]'::jsonb)
                    from faturas o where o.escritorio_id = r.e and o.situacao = 'A_VENCER'));
  end loop;
  perform limpar_contexto();
  return v_saida;
end $$;

create function rotina_cobranca_envio_registrar(p_id uuid, p_enviado boolean, p_erro text default null) returns void
language plpgsql
security definer
set search_path = public
as $$
declare x fatura_envios; v_e uuid;
begin
  perform limpar_contexto();
  perform set_config('t3jus.rotina_cobranca', 'on', true);
  select escritorio_id into v_e from fatura_envios where id = p_id;
  perform set_config('t3jus.rotina_cobranca', '', true);
  if v_e is null then raise exception 'Envio não encontrado' using errcode = 'TC404'; end if;
  perform entrar_escritorio_servico(v_e);
  perform cobranca_marcar(true);
  update fatura_envios
     set enviado_em = case when p_enviado then app_now() end, tentativas = tentativas + 1,
         ultimo_erro = case when p_enviado then null else left(coalesce(p_erro, 'Falhou'), 300) end
   where id = p_id and enviado_em is null
  returning * into x;
  if x.id is not null and p_enviado then
    perform cobranca_evento((select assinatura_id from faturas where id = x.fatura_id), x.fatura_id, 'email.enviado',
      jsonb_build_object('tipo', x.tipo), true);
  end if;
  perform cobranca_marcar(false);
  perform limpar_contexto();
end $$;

-- ---------------------------------------------------------------------------------------
-- 7. Console: o que as telas leem

-- Uma fatura como as listas mostram.
create function fatura_json(f faturas) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', f.id, 'numero', f.numero, 'competencia', f.competencia, 'vencimento', f.vencimento, 'plano', f.plano_nome,
    'forma', f.forma, 'totalCentavos', f.total_centavos, 'situacao', fatura_situacao(f), 'atrasoDias', fatura_atraso_dias(f),
    'pagaEm', f.paga_em, 'formaPaga', f.forma_paga, 'baixa', f.baixa, 'canceladaEm', f.cancelada_em, 'emitidaEm', f.emitida_em,
    'pessoasAtivas', f.pessoas_ativas, 'versao', f.versao,
    'parcela', (select jsonb_build_object('numero', p.numero, 'de', c.parcelas, 'carne', c.numero, 'carneId', c.id)
                  from assinatura_carne_parcelas p join assinatura_carnes c on c.id = p.carne_id where p.id = f.carne_parcela_id))
$$;

create function carne_json(c assinatura_carnes) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', c.id, 'numero', c.numero, 'parcelas', c.parcelas, 'valorParcelaCentavos', c.valor_parcela_centavos,
    'diaVencimento', c.dia_vencimento, 'primeiraCompetencia', c.primeira_competencia,
    'ultimaCompetencia', (c.primeira_competencia + make_interval(months => c.parcelas - 1))::date,
    'geradoEm', c.gerado_em, 'geradoPor', (select nome from pessoas where id = c.gerado_por),
    'substituidoEm', c.substituido_em, 'substituidoMotivo', c.substituido_motivo, 'pdf', c.pdf_path is not null,
    'itens', coalesce((select jsonb_agg(jsonb_build_object(
        'id', p.id, 'numero', p.numero, 'competencia', p.competencia, 'vencimento', p.vencimento, 'valorCentavos', p.valor_centavos,
        'situacao', p.situacao, 'faturaId', p.fatura_id, 'pagaEm', (select paga_em from faturas where id = p.fatura_id),
        'emAtraso', p.situacao = 'A_VENCER' and p.vencimento < hoje_brasilia(),
        'canceladaMotivo', p.cancelada_motivo) order by p.numero)
      from assinatura_carne_parcelas p where p.carne_id = c.id), '[]'::jsonb))
$$;

-- Os carnês em uso (não substituídos) e o valor que a parcela teria hoje: se for diferente, a
-- folha do carnê avisa que o valor mudou (desenho, regra do carnê).
create function carnes_da_assinatura(a assinaturas) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'emUso', coalesce((select jsonb_agg(carne_json(c) order by c.primeira_competencia)
                         from assinatura_carnes c where c.assinatura_id = a.id and c.substituido_em is null), '[]'::jsonb),
    'substituidos', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'numero', c.numero, 'substituidoEm', c.substituido_em,
                                                                  'motivo', c.substituido_motivo) order by c.substituido_em desc)
                                from assinatura_carnes c where c.assinatura_id = a.id and c.substituido_em is not null), '[]'::jsonb),
    'valorHojeCentavos', (cobranca_itens_da(a, cobranca_proxima_sem_fatura(a)) ->> 'totalCentavos')::int)
$$;

create function assinatura_eventos_json(p_assinatura uuid, p_fatura uuid default null) returns jsonb
language sql stable
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', e.id, 'acao', e.acao, 'dados', e.dados, 'em', e.ocorrido_em,
                                               'autor', case when e.autor_id is null then null
                                                             else jsonb_build_object('id', e.autor_id, 'nome', p.nome) end)
                            order by e.id desc), '[]'::jsonb)
    from fatura_eventos e left join pessoas p on p.id = e.autor_id
   where e.assinatura_id = p_assinatura and (p_fatura is null or e.fatura_id = p_fatura)
$$;

-- Escritórios atribuídos a quem pergunta em que a função dá a ação.
create function escritorios_com_acao(p_pessoa uuid, p_acao text) returns uuid[]
language sql stable
set search_path = public
as $$
  select coalesce(array_agg(distinct v.escritorio_id), '{}')
    from vinculos v join funcao_acoes fa on fa.funcao = v.funcao
   where v.pessoa_id = p_pessoa and v.revogado_em is null and fa.acao = p_acao and v.funcao = any (contexto_equipe_funcoes())
$$;

-- Cobrança › Faturas: o resumo do mês e a lista, dos escritórios que a pessoa atende (PT-24).
create function console_cobranca_faturas(p_pessoa uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  e uuid;
  v_lista jsonb := '[]'::jsonb;
  v_mes date;
begin
  perform entrar_console(p_pessoa, 'console.cobranca.ver');
  v_mes := competencia_de(hoje_brasilia());
  foreach e in array escritorios_com_acao(p_pessoa, 'console.cobranca.ver') loop
    perform entrar_escritorio(p_pessoa, e, 'console.cobranca.ver');
    v_lista := v_lista || coalesce((select jsonb_agg(fatura_json(f) || jsonb_build_object(
        'escritorio', jsonb_build_object('id', x.id, 'nome', x.nome)))
      from faturas f join escritorios x on x.id = f.escritorio_id where f.escritorio_id = e), '[]'::jsonb);
  end loop;
  return (
    with l as (select value as f, value ->> 'situacao' as s, (value ->> 'vencimento')::date as venc,
                      (value ->> 'totalCentavos')::int as total, (value ->> 'atrasoDias')::int as atraso
                 from jsonb_array_elements(v_lista))
    select jsonb_build_object(
      'hoje', hoje_brasilia(),
      'podeEditar', pode_global('console.cobranca.editar'),
      'resumo', jsonb_build_object(
        'aReceberMesCentavos', coalesce((select sum(total) from l where competencia_de(venc) = v_mes and s in ('A_VENCER', 'VENCE_HOJE', 'EM_ATRASO')), 0),
        'recebidoMesCentavos', coalesce((select sum(total) from l where competencia_de(venc) = v_mes and s = 'PAGA'), 0),
        'venceMesCentavos', coalesce((select sum(total) from l where competencia_de(venc) = v_mes and s <> 'CANCELADA'), 0),
        'atraso', jsonb_build_object(
          'totalCentavos', coalesce((select sum(total) from l where s = 'EM_ATRASO'), 0),
          'faturas', (select count(*) from l where s = 'EM_ATRASO'),
          'escritorios', (select count(distinct f -> 'escritorio' ->> 'id') from l where s = 'EM_ATRASO'),
          'faixas', jsonb_build_array(
            jsonb_build_object('ate', 30, 'totalCentavos', coalesce((select sum(total) from l where s = 'EM_ATRASO' and atraso <= 30), 0),
                               'faturas', (select count(*) from l where s = 'EM_ATRASO' and atraso <= 30)),
            jsonb_build_object('ate', 60, 'totalCentavos', coalesce((select sum(total) from l where s = 'EM_ATRASO' and atraso between 31 and 60), 0),
                               'faturas', (select count(*) from l where s = 'EM_ATRASO' and atraso between 31 and 60)),
            jsonb_build_object('ate', 90, 'totalCentavos', coalesce((select sum(total) from l where s = 'EM_ATRASO' and atraso between 61 and 90), 0),
                               'faturas', (select count(*) from l where s = 'EM_ATRASO' and atraso between 61 and 90)),
            jsonb_build_object('ate', null, 'totalCentavos', coalesce((select sum(total) from l where s = 'EM_ATRASO' and atraso > 90), 0),
                               'faturas', (select count(*) from l where s = 'EM_ATRASO' and atraso > 90))))),
      -- As mais urgentes primeiro: em atraso (do mais antigo), vence hoje, a vencer, pagas, canceladas.
      'faturas', coalesce((select jsonb_agg(f order by
          case s when 'EM_ATRASO' then 1 when 'VENCE_HOJE' then 2 when 'A_VENCER' then 3 when 'PAGA' then 4 else 5 end,
          case when s in ('PAGA', 'CANCELADA') then null else venc end, venc desc, f ->> 'numero') from l), '[]'::jsonb)));
end $$;

-- Quantas faturas em atraso pedem ação: o número do item Cobrança no trilho.
create function console_cobranca_atencao(p_pessoa uuid) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare e uuid; v integer := 0;
begin
  perform definir_pessoa(p_pessoa);
  if not pode_global('console.cobranca.ver') then return 0; end if;
  foreach e in array escritorios_com_acao(p_pessoa, 'console.cobranca.ver') loop
    perform entrar_escritorio(p_pessoa, e, 'console.cobranca.ver');
    v := v + (select count(*)::int from faturas f where f.escritorio_id = e and f.situacao = 'A_VENCER' and f.vencimento < hoje_brasilia());
  end loop;
  return v;
end $$;

-- A carteira: "Fatura em atraso · N dias" (só os dias, sem valor, para toda a equipe).
create function console_carteira_cobranca(p_pessoa uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare e uuid; v jsonb := '[]'::jsonb; v_dias integer; v_consulta timestamptz;
begin
  perform definir_pessoa(p_pessoa);
  if not contexto_equipe() then raise exception 'Só a equipe T3jus' using errcode = 'TC401'; end if;
  foreach e in array escritorios_com_acao(p_pessoa, 'console.carteira.ver') loop
    perform entrar_escritorio(p_pessoa, e, 'console.carteira.ver');
    v_dias := escritorio_atraso_dias(e);
    select so_consulta_desde into v_consulta from assinaturas where escritorio_id = e;
    if v_dias is not null or v_consulta is not null then
      v := v || jsonb_build_object('escritorioId', e, 'atrasoDias', v_dias, 'soConsultaDesde', v_consulta);
    end if;
  end loop;
  return v;
end $$;

-- A fatura aberta, com os itens, o histórico, a régua que falta e o que dá para fazer.
create function console_cobranca_fatura(p_pessoa uuid, p_escritorio uuid, p_fatura uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare f faturas; a assinaturas; v_atraso integer;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'console.cobranca.ver');
  select * into f from faturas where id = p_fatura and escritorio_id = p_escritorio;
  if f.id is null then raise exception 'Fatura não encontrada' using errcode = 'TC404'; end if;
  select * into a from assinaturas where id = f.assinatura_id;
  v_atraso := escritorio_atraso_dias(p_escritorio);
  return fatura_json(f) || jsonb_build_object(
    'hoje', hoje_brasilia(),
    'escritorio', (select jsonb_build_object('id', x.id, 'nome', x.nome, 'cnpj', x.cnpj, 'contrato', contrato_situacao(x.id),
                                             'atrasoDias', v_atraso, 'soConsultaDesde', a.so_consulta_desde)
                     from escritorios x where x.id = p_escritorio),
    'assinatura', jsonb_build_object('id', a.id, 'versao', a.versao, 'cnpjNota', a.cnpj_nota),
    'itens', (select jsonb_agg(jsonb_build_object('tipo', i.tipo, 'descricao', i.descricao, 'quantidade', i.quantidade,
                                                  'valorUnitarioCentavos', i.valor_unitario_centavos, 'valorCentavos', i.valor_centavos) order by i.ordem)
                from fatura_itens i where i.fatura_id = f.id),
    -- Lugar do meio de pagamento: vazio até ele ser escolhido (F3.20).
    'pagamento', jsonb_build_object('pixCopiaCola', f.pix_copia_cola, 'linhaBoleto', f.linha_boleto, 'disponivel', f.pix_copia_cola is not null),
    'paraQuem', jsonb_build_object('email', a.email_cobranca,
      'socio', (select p.nome from vinculos v join pessoas p on p.id = v.pessoa_id
                 where v.escritorio_id = p_escritorio and v.funcao = 'SOCIO' and v.revogado_em is null order by v.criado_em limit 1)),
    'pagamentoManual', (select jsonb_build_object('pagoEm', m.pago_em, 'valorCentavos', m.valor_centavos, 'forma', m.forma, 'motivo', m.motivo,
                                                  'por', p.nome, 'em', m.registrado_em)
                          from pagamentos_manuais m join pessoas p on p.id = m.registrado_por where m.fatura_id = f.id),
    'cancelamento', case when f.situacao = 'CANCELADA' then jsonb_build_object('em', f.cancelada_em, 'motivo', f.cancelada_motivo,
                                                                               'por', (select nome from pessoas where id = f.cancelada_por)) end,
    'historico', assinatura_eventos_json(a.id, f.id),
    'envios', coalesce((select jsonb_agg(jsonb_build_object('tipo', x.tipo, 'criadoEm', x.criado_em, 'enviadoEm', x.enviado_em,
                                                            'descartadoEm', x.descartado_em, 'erro', x.ultimo_erro) order by x.criado_em)
                          from fatura_envios x where x.fatura_id = f.id), '[]'::jsonb),
    -- Os próximos passos da régua (com o contrato encerrado, a régua para).
    'proximos', case when f.situacao = 'A_VENCER' and contrato_situacao(p_escritorio) in ('ABERTO', 'MARCADO') then
                  coalesce((select jsonb_agg(jsonb_build_object('tipo', t.tipo, 'dia', f.vencimento + t.d) order by t.d)
                              from (values ('VENCE_EM_3', -3), ('VENCE_HOJE', 0), ('VENCEU_3', 3), ('VENCEU_7', 7), ('VENCEU_15', 15)) t(tipo, d)
                             where f.vencimento + t.d > hoje_brasilia()), '[]'::jsonb)
                else '[]'::jsonb end,
    'proporConsulta', f.situacao = 'A_VENCER' and coalesce(fatura_atraso_dias(f), 0) >= configuracao_int('cobranca_propor_consulta_dias')
                      and a.so_consulta_desde is null,
    'permissoes', jsonb_build_object('editar', pode(p_pessoa, p_escritorio, 'console.cobranca.editar'),
                                     'soConsulta', pode(p_pessoa, p_escritorio, 'console.portal.so_consulta')));
end $$;

-- Prévia da fatura num plano: o que a próxima fatura sem emitir traria (mudar de plano, decisão 12).
create function previa_no_plano(a assinaturas, p planos) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object('competencia', c.comp, 'vencimento', vencimento_de(c.comp, a.dia_vencimento))
         || cobranca_itens(p.preco_centavos, p.pessoas_incluidas, a.desconto_pct, a.desconto_ate, c.comp,
                           pessoas_ativas_portal(a.escritorio_id), p.nome)
    from (select cobranca_proxima_sem_fatura(a) as comp) c
$$;

-- A aba Assinatura da ficha. Implantação e Suporte veem o plano e a situação, sem valores,
-- faturas nem mudanças (desenho, "Decisão sobre Implantação e Suporte").
create function console_assinatura(p_pessoa uuid, p_escritorio uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  a assinaturas;
  pl planos;
  v_valores boolean;
  v_atraso integer;
  v_base jsonb;
  v_estagio text;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'console.ficha.ver');
  v_valores := pode(p_pessoa, p_escritorio, 'console.cobranca.ver');
  select estado into v_estagio from clientes where escritorio_id = p_escritorio;
  select * into a from assinaturas where escritorio_id = p_escritorio;
  v_base := jsonb_build_object(
    'hoje', hoje_brasilia(), 'valores', v_valores, 'estagio', v_estagio, 'contrato', contrato_situacao(p_escritorio),
    'permissoes', jsonb_build_object('editar', pode(p_pessoa, p_escritorio, 'console.cobranca.editar'),
                                     'soConsulta', pode(p_pessoa, p_escritorio, 'console.portal.so_consulta')),
    'pessoasAtivas', pessoas_ativas_portal(p_escritorio),
    'emailSugerido', case when v_valores and a.id is null then
                       (select c ->> 'email' from escritorios x, jsonb_array_elements(x.contatos) c where x.id = p_escritorio and c ? 'email' limit 1) end,
    'cnpjSugerido', case when v_valores and a.id is null then (select cnpj from escritorios where id = p_escritorio) end,
    'planos', case when v_valores then coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'nome', p.nome, 'precoCentavos', p.preco_centavos,
                                                                  'pessoasIncluidas', p.pessoas_incluidas,
                                                                  'previa', case when a.id is not null then previa_no_plano(a, p) end)
                                                order by p.preco_centavos, p.nome)
                                     from planos p where p.arquivado_em is null), '[]'::jsonb) end,
    'pessoaAMaisCentavos', case when v_valores then pessoa_a_mais_centavos() end);
  if a.id is null then
    return v_base || jsonb_build_object('assinatura', null);
  end if;
  select * into pl from planos where id = a.plano_id;
  v_atraso := escritorio_atraso_dias(p_escritorio);
  v_base := v_base || jsonb_build_object('assinatura', jsonb_build_object(
    'id', a.id, 'versao', a.versao,
    'plano', jsonb_build_object('id', pl.id, 'nome', pl.nome, 'arquivado', pl.arquivado_em is not null),
    'pessoasIncluidas', a.pessoas_incluidas, 'diaVencimento', a.dia_vencimento, 'forma', a.forma,
    'inicioCobranca', a.inicio_cobranca, 'primeiraCompetencia', a.primeira_competencia,
    'situacao', case when a.so_consulta_desde is not null then 'SO_CONSULTA' when v_atraso is not null then 'EM_ATRASO'
                     when a.inicio_cobranca is null then 'SEM_COBRANCA' else 'EM_DIA' end,
    'atrasoDias', v_atraso,
    'soConsultaDesde', a.so_consulta_desde,
    'avisoPortal', coalesce(v_atraso, 0) >= configuracao_int('cobranca_aviso_portal_dias'),
    'proporConsulta', coalesce(v_atraso, 0) >= configuracao_int('cobranca_propor_consulta_dias') and a.so_consulta_desde is null));
  if not v_valores then
    return v_base;
  end if;
  return jsonb_set(v_base, '{assinatura}', (v_base -> 'assinatura') || jsonb_build_object(
    'precoCentavos', a.preco_centavos, 'precoDoPlanoHojeCentavos', pl.preco_centavos,
    'emailCobranca', a.email_cobranca, 'cnpjNota', a.cnpj_nota, 'parcelasPorCarne', a.parcelas_por_carne,
    'desconto', case when a.desconto_pct is not null then jsonb_build_object('pct', a.desconto_pct, 'ate', a.desconto_ate,
                                                                            'motivo', a.desconto_motivo, 'por', (select nome from pessoas where id = a.desconto_por)) end,
    'soConsulta', case when a.so_consulta_desde is not null then jsonb_build_object('desde', a.so_consulta_desde, 'motivo', a.so_consulta_motivo,
                                                                                   'por', (select nome from pessoas where id = a.so_consulta_por)) end,
    'proxima', jsonb_build_object('competencia', cobranca_proxima_sem_fatura(a),
                                  'vencimento', vencimento_de(cobranca_proxima_sem_fatura(a), a.dia_vencimento))
               || cobranca_itens_da(a, cobranca_proxima_sem_fatura(a)),
    'abertas', jsonb_build_object(
      'faturas', (select count(*) from faturas f where f.escritorio_id = p_escritorio and f.situacao = 'A_VENCER' and f.vencimento < hoje_brasilia()),
      'totalCentavos', coalesce((select sum(f.total_centavos) from faturas f
                                  where f.escritorio_id = p_escritorio and f.situacao = 'A_VENCER' and f.vencimento < hoje_brasilia()), 0)),
    'carne', case when a.forma = 'CARNE' or exists (select 1 from assinatura_carnes c where c.assinatura_id = a.id) then carnes_da_assinatura(a) end,
    'faturas', coalesce((select jsonb_agg(fatura_json(f) order by f.competencia desc, f.numero desc)
                           from faturas f where f.escritorio_id = p_escritorio), '[]'::jsonb),
    'mudancas', coalesce((select jsonb_agg(x order by (x ->> 'id')::bigint desc) from jsonb_array_elements(assinatura_eventos_json(a.id)) x
                           where x ->> 'acao' in ('assinatura.preparada', 'assinatura.alterada', 'assinatura.plano_mudou', 'cobranca.comecou',
                                                  'carne.gerado', 'carne.parcelas_canceladas', 'acesso.so_consulta', 'acesso.devolvido')), '[]'::jsonb)));
end $$;

-- Planos (catálogo): Administração e Financeiro veem; quantos escritórios assinam cada plano e,
-- dos que a pessoa atende, quais.
create function console_planos(p_pessoa uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_meus uuid[]; v jsonb;
begin
  perform entrar_console(p_pessoa, 'console.cobranca.ver');
  v_meus := escritorios_com_acao(p_pessoa, 'console.ficha.ver');
  perform set_config('t3jus.contando_planos', 'on', true);
  perform set_config('t3jus.lendo_acesso', 'on', true);
  select jsonb_build_object(
    'podeEditar', pode_global('console.planos.editar'),
    'pessoaAMais', (select jsonb_build_object('centavos', r.pessoa_a_mais_centavos, 'versao', r.versao) from planos_regras r),
    'planos', coalesce((select jsonb_agg(jsonb_build_object(
        'id', p.id, 'nome', p.nome, 'precoCentavos', p.preco_centavos, 'pessoasIncluidas', p.pessoas_incluidas,
        'arquivadoEm', p.arquivado_em, 'arquivadoMotivo', p.arquivado_motivo, 'versao', p.versao, 'criadoEm', p.criado_em,
        'assinantes', (select count(*) from assinaturas a where a.plano_id = p.id),
        -- Quem continua no preço antigo (o preço da assinatura é o de quando assinou).
        'noPrecoAntigo', (select count(*) from assinaturas a where a.plano_id = p.id and a.preco_centavos <> p.preco_centavos),
        'escritorios', coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'nome', x.nome, 'precoCentavos', a.preco_centavos) order by x.nome)
                                   from assinaturas a join escritorios x on x.id = a.escritorio_id
                                  where a.plano_id = p.id and a.escritorio_id = any (v_meus)), '[]'::jsonb))
        order by p.arquivado_em is not null, p.preco_centavos, p.nome) from planos p), '[]'::jsonb),
    'historico', coalesce((select jsonb_agg(jsonb_build_object('id', e.id, 'acao', e.acao, 'dados', e.dados, 'em', e.ocorrido_em,
                                                               'planoId', e.plano_id, 'autor', q.nome) order by e.id desc)
                             from (select * from planos_eventos order by id desc limit 50) e join pessoas q on q.id = e.autor_id), '[]'::jsonb))
    into v;
  perform set_config('t3jus.contando_planos', '', true);
  perform set_config('t3jus.lendo_acesso', '', true);
  return v;
end $$;

-- ---------------------------------------------------------------------------------------
-- 8. Console: o que as telas fazem

-- Criar e editar plano (só Administração). O preço novo vale só para assinaturas novas.
create function console_plano_salvar(p_pessoa uuid, p_plano uuid, p_versao integer, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nome text := btrim(coalesce(p_dados ->> 'nome', ''));
  v_preco integer;
  v_pessoas integer;
  v_campos text[] := '{}';
  p planos;
  v_id uuid;
begin
  perform entrar_console(p_pessoa, 'console.planos.editar');
  begin v_preco := (p_dados ->> 'precoCentavos')::int; exception when others then v_preco := null; end;
  begin v_pessoas := (p_dados ->> 'pessoasIncluidas')::int; exception when others then v_pessoas := null; end;
  if length(v_nome) not between 2 and 40 then v_campos := v_campos || 'nome'::text; end if;
  if v_preco is null or v_preco not between 1 and 100000000 then v_campos := v_campos || 'preco'::text; end if;
  if v_pessoas is null or v_pessoas not between 1 and 999 then v_campos := v_campos || 'pessoas'::text; end if;
  if cardinality(v_campos) > 0 then
    raise exception 'Confira o plano' using errcode = 'TC422',
      detail = jsonb_build_object('campos', to_jsonb(v_campos), 'motivo', case when 'preco' = any (v_campos) then 'PRECO_INVALIDO' end)::text;
  end if;
  if exists (select 1 from planos x where lower(btrim(x.nome)) = lower(v_nome) and x.id is distinct from p_plano) then
    perform recusar_campos('Já existe um plano com este nome', 'nome');
  end if;
  if p_plano is null then
    insert into planos (nome, preco_centavos, pessoas_incluidas, criado_por) values (v_nome, v_preco, v_pessoas, p_pessoa) returning * into p;
    insert into planos_eventos (plano_id, autor_id, acao, dados)
    values (p.id, p_pessoa, 'plano.criado', jsonb_build_object('nome', v_nome, 'precoCentavos', v_preco, 'pessoasIncluidas', v_pessoas));
    return jsonb_build_object('id', p.id, 'versao', p.versao);
  end if;
  select * into p from planos where id = p_plano;
  if p.id is null then raise exception 'Plano não encontrado' using errcode = 'TC404'; end if;
  if p.versao <> p_versao then perform conflito_versao('planos', p_plano); end if;
  update planos set nome = v_nome, preco_centavos = v_preco, pessoas_incluidas = v_pessoas, alterado_em = app_now(), alterado_por = p_pessoa
   where id = p_plano returning versao into p_versao;
  insert into planos_eventos (plano_id, autor_id, acao, dados)
  values (p_plano, p_pessoa, 'plano.alterado', jsonb_strip_nulls(jsonb_build_object(
    'nome', case when p.nome <> v_nome then jsonb_build_object('de', p.nome, 'para', v_nome) end,
    'precoCentavos', case when p.preco_centavos <> v_preco then jsonb_build_object('de', p.preco_centavos, 'para', v_preco) end,
    'pessoasIncluidas', case when p.pessoas_incluidas <> v_pessoas then jsonb_build_object('de', p.pessoas_incluidas, 'para', v_pessoas) end)));
  return jsonb_build_object('id', p_plano, 'versao', p_versao);
end $$;

-- Arquivar em vez de apagar: some para novas assinaturas, quem assina continua. Desarquivar pode.
create function console_plano_arquivar(p_pessoa uuid, p_plano uuid, p_versao integer, p_arquivar boolean, p_motivo text) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare p planos; v_motivo text;
begin
  perform entrar_console(p_pessoa, 'console.planos.editar');
  v_motivo := motivo_valido(p_motivo);
  select * into p from planos where id = p_plano;
  if p.id is null then raise exception 'Plano não encontrado' using errcode = 'TC404'; end if;
  if p.versao <> p_versao then perform conflito_versao('planos', p_plano); end if;
  if p_arquivar then
    if p.arquivado_em is not null then perform recusar_motivo('O plano já está arquivado', 'PLANO_ARQUIVADO'); end if;
    update planos set arquivado_em = app_now(), arquivado_por = p_pessoa, arquivado_motivo = v_motivo where id = p_plano returning versao into p_versao;
  else
    if p.arquivado_em is null then perform recusar_motivo('O plano não está arquivado', 'PLANO_NAO_ARQUIVADO'); end if;
    update planos set arquivado_em = null, arquivado_por = null, arquivado_motivo = null where id = p_plano returning versao into p_versao;
  end if;
  insert into planos_eventos (plano_id, autor_id, acao, dados)
  values (p_plano, p_pessoa, case when p_arquivar then 'plano.arquivado' else 'plano.desarquivado' end, jsonb_build_object('motivo', v_motivo));
  return jsonb_build_object('versao', p_versao);
end $$;

create function console_pessoa_a_mais(p_pessoa uuid, p_versao integer, p_centavos integer) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare r planos_regras;
begin
  perform entrar_console(p_pessoa, 'console.planos.editar');
  if p_centavos is null or p_centavos not between 0 and 10000000 then perform recusar_campos('Confira o valor', 'pessoaAMais'); end if;
  select * into r from planos_regras;
  if r.versao <> p_versao then
    raise exception 'Outra pessoa alterou este registro' using errcode = 'TC409',
      detail = jsonb_build_object('versao', r.versao, 'atual', to_jsonb(r))::text;
  end if;
  update planos_regras set pessoa_a_mais_centavos = p_centavos, alterado_em = app_now(), alterado_por = p_pessoa returning versao into p_versao;
  insert into planos_eventos (plano_id, autor_id, acao, dados)
  values (null, p_pessoa, 'pessoa_a_mais.alterada', jsonb_build_object('de', r.pessoa_a_mais_centavos, 'para', p_centavos));
  return jsonb_build_object('versao', p_versao);
end $$;

-- Os campos da assinatura, conferidos juntos (os erros voltam presos aos campos).
create function assinatura_dados(p_dados jsonb, p_criar boolean) returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  v_campos text[] := '{}';
  v_dia integer;
  v_pct integer;
  v_ate date;
  v_parcelas integer;
  v_email text := lower(btrim(coalesce(p_dados ->> 'emailCobranca', '')));
  v_cnpj text := nullif(regexp_replace(coalesce(p_dados ->> 'cnpjNota', ''), '[^0-9]', '', 'g'), '');
  v_forma text := p_dados ->> 'forma';
  v_plano planos;
begin
  if p_criar then
    begin
      select * into v_plano from planos where id = (p_dados ->> 'planoId')::uuid;
    exception when others then v_plano := null;
    end;
    if v_plano.id is null then v_campos := v_campos || 'plano'::text;
    elsif v_plano.arquivado_em is not null then
      raise exception 'O plano está arquivado' using errcode = 'TC422',
        detail = jsonb_build_object('motivo', 'PLANO_ARQUIVADO', 'campos', jsonb_build_array('plano'))::text;
    end if;
  end if;
  begin v_dia := (p_dados ->> 'diaVencimento')::int; exception when others then v_dia := null; end;
  if v_dia is null or v_dia not between 1 and 28 then v_campos := v_campos || 'diaVencimento'::text; end if;
  if coalesce(v_forma, '') not in ('PIX', 'BOLETO', 'CARNE') then v_campos := v_campos || 'forma'::text; end if;
  if length(v_email) > 254 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then v_campos := v_campos || 'emailCobranca'::text; end if;
  if v_cnpj is not null and v_cnpj !~ '^[0-9]{14}$' then v_campos := v_campos || 'cnpjNota'::text; end if;
  if p_dados -> 'desconto' is not null and jsonb_typeof(p_dados -> 'desconto') = 'object' then
    begin v_pct := (p_dados -> 'desconto' ->> 'pct')::int; exception when others then v_pct := null; end;
    begin v_ate := competencia_de((p_dados -> 'desconto' ->> 'ate')::date); exception when others then v_ate := null; end;
    if v_pct is null or v_pct not between 1 and 100 then v_campos := v_campos || 'descontoPct'::text; end if;
    if v_ate is null then v_campos := v_campos || 'descontoAte'::text; end if;
    if length(btrim(coalesce(p_dados -> 'desconto' ->> 'motivo', ''))) not between 1 and 300 then v_campos := v_campos || 'descontoMotivo'::text; end if;
  end if;
  if v_forma = 'CARNE' then
    begin v_parcelas := coalesce((p_dados ->> 'parcelasPorCarne')::int, configuracao_int('cobranca_parcelas_por_carne'));
    exception when others then v_parcelas := null; end;
    if v_parcelas is null or v_parcelas not between 1 and 12 then v_campos := v_campos || 'parcelasPorCarne'::text; end if;
  end if;
  if cardinality(v_campos) > 0 then
    raise exception 'Confira a assinatura' using errcode = 'TC422', detail = jsonb_build_object('campos', to_jsonb(v_campos))::text;
  end if;
  return jsonb_build_object('plano', v_plano.id, 'preco', v_plano.preco_centavos, 'pessoas', v_plano.pessoas_incluidas,
    'dia', v_dia, 'forma', v_forma, 'email', v_email, 'cnpj', v_cnpj,
    'pct', v_pct, 'ate', v_ate, 'motivoDesconto', btrim(p_dados -> 'desconto' ->> 'motivo'), 'parcelas', v_parcelas);
end $$;

-- Preparar (sem versão) ou editar a assinatura. Em implantação, nenhuma fatura sai (decisão 2);
-- com o escritório já Ativo, a cobrança começa hoje. Com carnê em uso, mudar o dia gera um
-- carnê novo; trocar a forma para Carnê gera o primeiro; sair do Carnê cancela as parcelas
-- ainda sem fatura (desenho, regras do carnê). Mudar só o e-mail ou o CNPJ não mexe no carnê.
create function console_assinatura_salvar(p_pessoa uuid, p_escritorio uuid, p_versao integer, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  a assinaturas;
  n assinaturas;
  d jsonb;
  v_estagio text;
  v_mudou jsonb := '{}'::jsonb;
  v_carne jsonb;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'console.cobranca.editar');
  if contrato_situacao(p_escritorio) not in ('ABERTO', 'MARCADO') then
    perform recusar_motivo('O contrato terminou: a assinatura não muda mais', 'CONTRATO_ENCERRADO');
  end if;
  select * into a from assinaturas where escritorio_id = p_escritorio;
  perform cobranca_marcar(true);
  if a.id is null then
    d := assinatura_dados(p_dados, true);
    insert into assinaturas (escritorio_id, plano_id, preco_centavos, pessoas_incluidas, dia_vencimento, forma, email_cobranca, cnpj_nota,
                             desconto_pct, desconto_ate, desconto_motivo, desconto_por, parcelas_por_carne, criado_por)
    values (p_escritorio, (d ->> 'plano')::uuid, (d ->> 'preco')::int, (d ->> 'pessoas')::int, (d ->> 'dia')::int, d ->> 'forma',
            d ->> 'email', d ->> 'cnpj', (d ->> 'pct')::int, (d ->> 'ate')::date, d ->> 'motivoDesconto',
            case when d ->> 'pct' is not null then p_pessoa end, (d ->> 'parcelas')::int, p_pessoa)
    returning * into n;
    perform cobranca_evento(n.id, null, 'assinatura.preparada', jsonb_build_object(
      'plano', (select nome from planos where id = n.plano_id), 'precoCentavos', n.preco_centavos, 'dia', n.dia_vencimento,
      'forma', n.forma, 'descontoPct', n.desconto_pct, 'descontoAte', n.desconto_ate, 'descontoMotivo', n.desconto_motivo));
    select estado into v_estagio from clientes where escritorio_id = p_escritorio;
    if v_estagio = 'ATIVO' then perform cobranca_comecar(p_escritorio); end if;
    perform cobranca_marcar(false);
    return jsonb_build_object('id', n.id, 'versao', (select versao from assinaturas where id = n.id));
  end if;

  if p_versao is null or a.versao <> p_versao then perform conflito_cobranca('assinaturas', a.id); end if;
  d := assinatura_dados(p_dados, false);
  update assinaturas
     set dia_vencimento = (d ->> 'dia')::int, forma = d ->> 'forma', email_cobranca = d ->> 'email', cnpj_nota = d ->> 'cnpj',
         desconto_pct = (d ->> 'pct')::int, desconto_ate = (d ->> 'ate')::date, desconto_motivo = d ->> 'motivoDesconto',
         desconto_por = case when (d ->> 'pct') is null then null
                             when (a.desconto_pct, a.desconto_ate, a.desconto_motivo) is not distinct from ((d ->> 'pct')::int, (d ->> 'ate')::date, d ->> 'motivoDesconto')
                             then a.desconto_por else p_pessoa end,
         parcelas_por_carne = (d ->> 'parcelas')::int
   where id = a.id returning * into n;
  -- O que mudou, para "Mudanças da assinatura" (o e-mail não vai para o histórico: é dado pessoal).
  if a.dia_vencimento <> n.dia_vencimento then v_mudou := v_mudou || jsonb_build_object('dia', jsonb_build_object('de', a.dia_vencimento, 'para', n.dia_vencimento)); end if;
  if a.forma <> n.forma then v_mudou := v_mudou || jsonb_build_object('forma', jsonb_build_object('de', a.forma, 'para', n.forma)); end if;
  if a.email_cobranca <> n.email_cobranca then v_mudou := v_mudou || jsonb_build_object('emailCobranca', true); end if;
  if a.cnpj_nota is distinct from n.cnpj_nota then v_mudou := v_mudou || jsonb_build_object('cnpjNota', true); end if;
  if (a.desconto_pct, a.desconto_ate, a.desconto_motivo) is distinct from (n.desconto_pct, n.desconto_ate, n.desconto_motivo) then
    v_mudou := v_mudou || jsonb_build_object('desconto', jsonb_build_object('pct', n.desconto_pct, 'ate', n.desconto_ate, 'motivo', n.desconto_motivo));
  end if;
  if a.parcelas_por_carne is distinct from n.parcelas_por_carne then
    v_mudou := v_mudou || jsonb_build_object('parcelasPorCarne', jsonb_build_object('de', a.parcelas_por_carne, 'para', n.parcelas_por_carne));
  end if;
  if v_mudou <> '{}'::jsonb then perform cobranca_evento(a.id, null, 'assinatura.alterada', v_mudou); end if;

  if a.forma = 'CARNE' and n.forma <> 'CARNE' then
    v_carne := cobranca_trocar_carne(n, 'A forma de pagamento mudou para ' || case n.forma when 'PIX' then 'Pix' else 'boleto' end, false);
  elsif n.forma = 'CARNE' and a.forma <> 'CARNE' and n.primeira_competencia is not null then
    perform cobranca_gerar_carne(n, cobranca_proxima_sem_fatura(n), false);
  elsif n.forma = 'CARNE' and (a.dia_vencimento <> n.dia_vencimento or a.parcelas_por_carne is distinct from n.parcelas_por_carne)
        and exists (select 1 from assinatura_carnes c where c.assinatura_id = n.id and c.substituido_em is null) then
    v_carne := cobranca_trocar_carne(n, case when a.dia_vencimento <> n.dia_vencimento
                                             then 'O dia de vencimento mudou de ' || a.dia_vencimento || ' para ' || n.dia_vencimento
                                             else 'As parcelas por carnê mudaram' end, true);
  end if;
  perform cobranca_marcar(false);
  return jsonb_build_object('id', n.id, 'versao', (select versao from assinaturas where id = n.id), 'carne', v_carne);
end $$;

-- Mudar de plano (decisão 12): vale na próxima fatura ainda não emitida, sem proporcional; a
-- assinatura guarda o preço do dia. Com carnê em uso, gera um carnê novo.
create function console_assinatura_mudar_plano(p_pessoa uuid, p_escritorio uuid, p_versao integer, p_plano uuid, p_motivo text) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare a assinaturas; n assinaturas; p planos; v_motivo text; v_de text; v_carne jsonb;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'console.cobranca.editar');
  v_motivo := motivo_valido(p_motivo);
  if contrato_situacao(p_escritorio) not in ('ABERTO', 'MARCADO') then
    perform recusar_motivo('O contrato terminou: a assinatura não muda mais', 'CONTRATO_ENCERRADO');
  end if;
  select * into a from assinaturas where escritorio_id = p_escritorio;
  if a.id is null then raise exception 'Assinatura não encontrada' using errcode = 'TC404'; end if;
  if a.versao <> p_versao then perform conflito_cobranca('assinaturas', a.id); end if;
  select * into p from planos where id = p_plano;
  if p.id is null then perform recusar_campos('Escolha o plano', 'plano'); end if;
  if p.arquivado_em is not null then perform recusar_motivo('O plano está arquivado', 'PLANO_ARQUIVADO'); end if;
  if p.id = a.plano_id then perform recusar_motivo('O escritório já está neste plano', 'MESMO_PLANO'); end if;
  v_de := (select nome from planos where id = a.plano_id);
  perform cobranca_marcar(true);
  update assinaturas set plano_id = p.id, preco_centavos = p.preco_centavos, pessoas_incluidas = p.pessoas_incluidas
   where id = a.id returning * into n;
  perform cobranca_evento(a.id, null, 'assinatura.plano_mudou', jsonb_build_object(
    'de', v_de, 'para', p.nome, 'precoDeCentavos', a.preco_centavos, 'precoParaCentavos', p.preco_centavos,
    'valeEm', cobranca_proxima_sem_fatura(n), 'motivo', v_motivo));
  if n.forma = 'CARNE' and exists (select 1 from assinatura_carnes c where c.assinatura_id = n.id and c.substituido_em is null) then
    v_carne := cobranca_trocar_carne(n, 'Mudança de plano: ' || v_de || ' para ' || p.nome || '. ' || v_motivo, true);
  end if;
  perform cobranca_marcar(false);
  return jsonb_build_object('versao', (select versao from assinaturas where id = a.id), 'carne', v_carne);
end $$;

-- Gerar um carnê novo (estado 40): Administração e Financeiro, com motivo.
create function console_carne_novo(p_pessoa uuid, p_escritorio uuid, p_versao integer, p_motivo text) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare a assinaturas; v_motivo text; v jsonb;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'console.cobranca.editar');
  v_motivo := motivo_valido(p_motivo);
  select * into a from assinaturas where escritorio_id = p_escritorio;
  if a.id is null then raise exception 'Assinatura não encontrada' using errcode = 'TC404'; end if;
  if a.versao <> p_versao then perform conflito_cobranca('assinaturas', a.id); end if;
  if a.forma <> 'CARNE' or a.primeira_competencia is null then
    perform recusar_motivo('A assinatura não paga por carnê', 'CARNE_SEM_PARCELA_A_TROCAR');
  end if;
  perform cobranca_marcar(true);
  v := cobranca_trocar_carne(a, v_motivo, true);
  -- A versão sobe: o carnê é parte da assinatura que a tela leu.
  update assinaturas set forma = forma where id = a.id;
  perform cobranca_marcar(false);
  return v || jsonb_build_object('versao', (select versao from assinaturas where id = a.id));
end $$;

-- Registrar pagamento manual (estado 11): para quem pagou fora da cobrança.
create function console_fatura_pagamento_manual(p_pessoa uuid, p_escritorio uuid, p_fatura uuid, p_versao integer, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  f faturas;
  v_pago date;
  v_valor integer;
  v_forma text := p_dados ->> 'forma';
  v_motivo text := btrim(coalesce(p_dados ->> 'motivo', ''));
  v_campos text[] := '{}';
  v_motivo_erro text;
  v jsonb;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'console.cobranca.editar');
  select * into f from faturas where id = p_fatura and escritorio_id = p_escritorio;
  if f.id is null then raise exception 'Fatura não encontrada' using errcode = 'TC404'; end if;
  -- Já registrado por outra pessoa: o conflito diz quem e quando (registrar de novo contaria duas vezes).
  if f.versao <> p_versao or f.situacao = 'PAGA' then perform conflito_cobranca('faturas', f.id); end if;
  if f.situacao = 'CANCELADA' then perform recusar_motivo('A fatura foi cancelada', 'FATURA_CANCELADA'); end if;
  begin v_pago := (p_dados ->> 'pagoEm')::date; exception when others then v_pago := null; end;
  begin v_valor := (p_dados ->> 'valorCentavos')::int; exception when others then v_valor := null; end;
  if v_pago is null then v_campos := v_campos || 'pagoEm'::text;
  elsif v_pago > hoje_brasilia() then v_campos := v_campos || 'pagoEm'::text; v_motivo_erro := 'DATA_NO_FUTURO'; end if;
  if v_valor is null then v_campos := v_campos || 'valor'::text;
  elsif v_valor <> f.total_centavos then v_campos := v_campos || 'valor'::text; v_motivo_erro := coalesce(v_motivo_erro, 'VALOR_DIFERENTE_DA_FATURA'); end if;
  if coalesce(v_forma, '') not in ('PIX', 'BOLETO', 'TRANSFERENCIA', 'DINHEIRO', 'OUTRA') then v_campos := v_campos || 'forma'::text; end if;
  if length(v_motivo) not between 1 and 300 then v_campos := v_campos || 'motivo'::text; v_motivo_erro := coalesce(v_motivo_erro, 'MOTIVO_OBRIGATORIO'); end if;
  if cardinality(v_campos) > 0 then
    raise exception 'Confira o pagamento' using errcode = 'TC422',
      detail = jsonb_strip_nulls(jsonb_build_object('campos', to_jsonb(v_campos), 'motivo', v_motivo_erro))::text;
  end if;
  perform cobranca_marcar(true);
  insert into pagamentos_manuais (escritorio_id, fatura_id, pago_em, valor_centavos, forma, motivo, registrado_por)
  values (p_escritorio, f.id, v_pago, v_valor, v_forma, v_motivo, p_pessoa);
  perform cobranca_evento(f.assinatura_id, f.id, 'pagamento.registrado', jsonb_build_object('pagoEm', v_pago, 'forma', v_forma, 'motivo', v_motivo));
  v := cobranca_pagar(f.id, v_pago, v_forma, 'MANUAL');
  perform cobranca_marcar(false);
  return v || jsonb_build_object('versao', (select versao from faturas where id = f.id));
end $$;

-- Parcela paga adiantada (regra do carnê): a fatura do mês já nasce paga, ligada à parcela.
create function console_parcela_pagamento_manual(p_pessoa uuid, p_escritorio uuid, p_parcela uuid, p_dados jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  p assinatura_carne_parcelas;
  a assinaturas;
  v_fatura uuid;
  v_versao integer;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'console.cobranca.editar');
  select * into p from assinatura_carne_parcelas where id = p_parcela and escritorio_id = p_escritorio;
  if p.id is null then raise exception 'Parcela não encontrada' using errcode = 'TC404'; end if;
  if p.situacao <> 'A_VENCER' then perform recusar_motivo('A parcela já foi paga ou cancelada', 'PARCELA_FECHADA'); end if;
  if p.fatura_id is not null then
    select versao into v_versao from faturas where id = p.fatura_id;
    return console_fatura_pagamento_manual(p_pessoa, p_escritorio, p.fatura_id, v_versao, p_dados);
  end if;
  select a2.* into a from assinaturas a2 join assinatura_carnes c on c.assinatura_id = a2.id where c.id = p.carne_id;
  perform cobranca_marcar(true);
  v_fatura := cobranca_emitir(a, p.competencia, false, false);
  perform cobranca_marcar(false);
  if (select carne_parcela_id from faturas where id = v_fatura) is distinct from p.id then
    raise exception 'A parcela não está no carnê em uso' using errcode = 'TC422', detail = '{"motivo":"PARCELA_FECHADA"}';
  end if;
  select versao into v_versao from faturas where id = v_fatura;
  return console_fatura_pagamento_manual(p_pessoa, p_escritorio, v_fatura, v_versao, p_dados) || jsonb_build_object('faturaId', v_fatura);
end $$;

-- Cancelar (estado 17): a fatura não é apagada; o escritório recebe um e-mail sem o motivo.
create function console_fatura_cancelar(p_pessoa uuid, p_escritorio uuid, p_fatura uuid, p_versao integer, p_motivo text) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare f faturas; v_motivo text;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'console.cobranca.editar');
  v_motivo := motivo_valido(p_motivo);
  select * into f from faturas where id = p_fatura and escritorio_id = p_escritorio;
  if f.id is null then raise exception 'Fatura não encontrada' using errcode = 'TC404'; end if;
  if f.versao <> p_versao then perform conflito_cobranca('faturas', f.id); end if;
  if f.situacao = 'PAGA' then perform recusar_motivo('A fatura já foi paga', 'FATURA_JA_PAGA'); end if;
  if f.situacao = 'CANCELADA' then perform recusar_motivo('A fatura já foi cancelada', 'FATURA_CANCELADA'); end if;
  perform cobranca_marcar(true);
  update faturas set situacao = 'CANCELADA', cancelada_em = app_now(), cancelada_por = p_pessoa, cancelada_motivo = v_motivo
   where id = f.id returning versao into p_versao;
  update assinatura_carne_parcelas set situacao = 'CANCELADA', cancelada_em = app_now(), cancelada_motivo = v_motivo, cancelada_por = p_pessoa
   where fatura_id = f.id and situacao = 'A_VENCER';
  update fatura_envios set descartado_em = app_now()
   where fatura_id = f.id and enviado_em is null and descartado_em is null and tipo not in ('RECIBO', 'CANCELADA');
  perform cobranca_evento(f.assinatura_id, f.id, 'fatura.cancelada', jsonb_build_object('motivo', v_motivo));
  perform cobranca_enfileirar(f.id, 'CANCELADA');
  perform cobranca_marcar(false);
  return jsonb_build_object('versao', p_versao);
end $$;

-- Lembrete agora (decisão 6 do desenho): o e-mail da régua na hora, com todas as faturas em
-- aberto. Vale também com o contrato encerrado (lá, os lembretes são só manuais).
create function console_fatura_lembrete(p_pessoa uuid, p_escritorio uuid, p_fatura uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare f faturas;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'console.cobranca.editar');
  select * into f from faturas where id = p_fatura and escritorio_id = p_escritorio;
  if f.id is null then raise exception 'Fatura não encontrada' using errcode = 'TC404'; end if;
  if f.situacao <> 'A_VENCER' then perform recusar_motivo('Só fatura em aberto recebe lembrete', 'FATURA_FECHADA'); end if;
  perform cobranca_marcar(true);
  perform cobranca_enfileirar(f.id, 'MANUAL');
  perform cobranca_evento(f.assinatura_id, f.id, 'lembrete.pedido', '{}'::jsonb);
  perform cobranca_marcar(false);
  return jsonb_build_object('ok', true);
end $$;

-- Só consulta por atraso (decisão 4): só a Administração, com motivo, e só passados 30 dias.
create function console_portal_so_consulta(p_pessoa uuid, p_escritorio uuid, p_versao integer, p_motivo text) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare a assinaturas; v_motivo text;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'console.portal.so_consulta');
  v_motivo := motivo_valido(p_motivo);
  select * into a from assinaturas where escritorio_id = p_escritorio;
  if a.id is null then raise exception 'Assinatura não encontrada' using errcode = 'TC404'; end if;
  if a.versao <> p_versao then perform conflito_cobranca('assinaturas', a.id); end if;
  if a.so_consulta_desde is not null then perform recusar_motivo('O Portal já está só para consulta', 'JA_SO_CONSULTA'); end if;
  if coalesce(escritorio_atraso_dias(p_escritorio), 0) < configuracao_int('cobranca_propor_consulta_dias') then
    perform recusar_motivo('Só com fatura em atraso há 30 dias ou mais', 'SEM_ATRASO_30');
  end if;
  perform cobranca_marcar(true);
  update assinaturas set so_consulta_desde = app_now(), so_consulta_motivo = v_motivo, so_consulta_por = p_pessoa
   where id = a.id returning versao into p_versao;
  perform cobranca_evento(a.id, null, 'acesso.so_consulta', jsonb_build_object('motivo', v_motivo,
    'atrasoDias', escritorio_atraso_dias(p_escritorio)));
  perform cobranca_marcar(false);
  return jsonb_build_object('versao', p_versao);
end $$;

-- "Devolver o acesso agora" (estado 36), antes do pagamento, para quando a sócia já mandou o
-- comprovante: só a Administração, com motivo.
create function console_portal_normal(p_pessoa uuid, p_escritorio uuid, p_versao integer, p_motivo text) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare a assinaturas; v_motivo text;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'console.portal.so_consulta');
  v_motivo := motivo_valido(p_motivo);
  select * into a from assinaturas where escritorio_id = p_escritorio;
  if a.id is null then raise exception 'Assinatura não encontrada' using errcode = 'TC404'; end if;
  if a.versao <> p_versao then perform conflito_cobranca('assinaturas', a.id); end if;
  if a.so_consulta_desde is null then perform recusar_motivo('O Portal não está só para consulta', 'NAO_ESTA_SO_CONSULTA'); end if;
  perform cobranca_marcar(true);
  update assinaturas set so_consulta_desde = null, so_consulta_motivo = null, so_consulta_por = null
   where id = a.id returning versao into p_versao;
  perform cobranca_evento(a.id, null, 'acesso.devolvido', jsonb_build_object('pelo', 'ADMINISTRACAO', 'motivo', v_motivo));
  perform cobranca_marcar(false);
  return jsonb_build_object('versao', p_versao);
end $$;

-- ---------------------------------------------------------------------------------------
-- 9. Portal: a moldura e "Plano e faturas" (só o sócio dono vê valores)

-- O que a moldura precisa para as faixas: o só consulta para todos (com o nome da sócia dona);
-- o atraso de 7 dias ou mais, com a fatura, só para o sócio dono (desenho, 25 e 26).
create function portal_cobranca(p_pessoa uuid, p_escritorio uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dono boolean;
  v_consulta timestamptz;
  f faturas;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'escritorio.ver');
  v_dono := pode(p_pessoa, p_escritorio, 'portal.faturas.ver');
  select so_consulta_desde into v_consulta from assinaturas where escritorio_id = p_escritorio;
  if v_dono then
    select * into f from faturas where escritorio_id = p_escritorio and situacao = 'A_VENCER'
                                   and vencimento <= hoje_brasilia() - configuracao_int('cobranca_aviso_portal_dias')
     order by vencimento limit 1;
  end if;
  return jsonb_build_object(
    'soConsultaDesde', v_consulta,
    'socioDono', (select p.nome from vinculos v join pessoas p on p.id = v.pessoa_id
                   where v.escritorio_id = p_escritorio and v.funcao = 'SOCIO' and v.revogado_em is null order by v.criado_em limit 1),
    'veFaturas', v_dono,
    'atraso', case when f.id is not null then jsonb_build_object(
      'faturaId', f.id, 'competencia', f.competencia, 'vencimento', f.vencimento, 'dias', fatura_atraso_dias(f),
      'totalCentavos', f.total_centavos,
      'abertas', (select count(*) from faturas o where o.escritorio_id = p_escritorio and o.situacao = 'A_VENCER' and o.vencimento < hoje_brasilia()),
      'abertasCentavos', (select coalesce(sum(o.total_centavos), 0) from faturas o
                           where o.escritorio_id = p_escritorio and o.situacao = 'A_VENCER' and o.vencimento < hoje_brasilia())) end);
end $$;

create function portal_plano_faturas(p_pessoa uuid, p_escritorio uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare a assinaturas; pl planos;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'portal.faturas.ver');
  select * into a from assinaturas where escritorio_id = p_escritorio;
  if a.id is null then
    return jsonb_build_object('hoje', hoje_brasilia(), 'assinatura', null, 'faturas', '[]'::jsonb);
  end if;
  select * into pl from planos where id = a.plano_id;
  return jsonb_build_object(
    'hoje', hoje_brasilia(),
    'assinatura', jsonb_build_object(
      'plano', pl.nome, 'precoCentavos', a.preco_centavos, 'pessoasIncluidas', a.pessoas_incluidas,
      'pessoasAtivas', pessoas_ativas_portal(p_escritorio), 'pessoaAMaisCentavos', pessoa_a_mais_centavos(),
      'diaVencimento', a.dia_vencimento, 'forma', a.forma, 'inicioCobranca', a.inicio_cobranca,
      'soConsultaDesde', a.so_consulta_desde, 'atrasoDias', escritorio_atraso_dias(p_escritorio)),
    'faturas', coalesce((select jsonb_agg(fatura_json(f) || jsonb_build_object(
        'itens', (select jsonb_agg(jsonb_build_object('tipo', i.tipo, 'descricao', i.descricao, 'quantidade', i.quantidade,
                                                      'valorCentavos', i.valor_centavos) order by i.ordem) from fatura_itens i where i.fatura_id = f.id),
        'pagamento', jsonb_build_object('pixCopiaCola', f.pix_copia_cola, 'linhaBoleto', f.linha_boleto, 'disponivel', f.pix_copia_cola is not null))
        order by f.competencia desc, f.numero desc)
      from faturas f where f.escritorio_id = p_escritorio and f.situacao <> 'CANCELADA'), '[]'::jsonb),
    'carne', case when a.forma = 'CARNE' then
               (select coalesce(jsonb_agg(carne_json(c) order by c.primeira_competencia), '[]'::jsonb)
                  from assinatura_carnes c where c.assinatura_id = a.id and c.substituido_em is null) end);
end $$;

call fechar_acesso();
