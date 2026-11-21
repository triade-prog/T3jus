-- 0621 · Os comprovantes do mês num .zip para o contador, com link de 30 dias (F3.89, F3.22b;
-- FI-18, FI-21). Desenho aprovado em docs/design/aprovadas/portal-comercial-financeiro-pendencias
-- (estados ct-exportar, ct-enviado e ct-exportar-falha; decisão 9 da Carol, 21/11/2026: a planilha
-- vai anexada e o .zip vai por link que vale 30 dias).
-- - A pasta junta as notas, guias, boletos e comprovantes anexados (0520) aos lançamentos do mês:
--   as contas pagas no mês e os recebimentos do caixa do escritório no mês. Cada arquivo leva no
--   nome a data e o lançamento.
-- - A API monta o .zip (sem comprimir de novo: PDF e foto já vêm comprimidos), guarda no bucket
--   documentos-portal em <escritório>/exportacoes/<exportação>-<parte>.zip e registra aqui. Cada
--   parte tem até 11 MB (o bucket aceita até 12 MB por arquivo); mês com mais arquivos vira
--   mais de uma parte.
-- - A pasta se monta uma vez por exportação e não muda. Cada envio assina links novos, que valem
--   30 dias; o envio guarda até quando o link vale.
-- - Os arquivos saem com a pasta do escritório no fim da guarda (0540), porque o caminho começa
--   com o id do escritório.

create table exportacao_pastas (
  id             uuid primary key default gen_random_uuid(),
  escritorio_id  uuid not null references escritorios (id) on delete restrict,
  exportacao_id  uuid not null unique references exportacoes_contador (id) on delete restrict,
  partes         jsonb not null check (jsonb_typeof(partes) = 'array' and jsonb_array_length(partes) between 1 and 50),
  arquivos       integer not null check (arquivos between 1 and 5000),
  tamanho        bigint not null check (tamanho between 1 and 2147483647),
  criada_por     uuid not null references pessoas (id) on delete restrict,
  criada_em      timestamptz not null default app_now()
);
call proteger_tabela_escritorio('exportacao_pastas');
create trigger exportacao_pastas_so_acrescenta before update or delete on exportacao_pastas
  for each row execute function financeiro_so_acrescenta();

insert into inventario_dados (tabela, dado_pessoal, o_que, para_que, base_legal, controlador, prazo, no_fim, situacao, exportar) values
 ('exportacao_pastas', true, 'A pasta (.zip) com os comprovantes de uma exportação ao contador: as partes no Storage, quantos arquivos, o tamanho e quem montou',
  'Mandar ao contador os comprovantes do mês por link (FI-21)', 'Execução de contrato (LGPD, art. 7º, V)',
  'Escritório', 'Enquanto o escritório for cliente do T3jus e 5 anos depois do fim do contrato', 'Exportadas ao escritório e apagadas com ele, com os arquivos', 'APROVADO', true);

-- O envio guarda até quando vale o link do .zip (nulo quando não houve .zip).
alter table envios_contador add column link_ate timestamptz;

-- O bucket aceita o .zip e partes de até 12 MB. No banco de teste não há Storage.
do $$
begin
  if to_regclass('storage.buckets') is not null then
    update storage.buckets
       set allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png',
                                      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip'],
           file_size_limit = 12582912
     where id = 'documentos-portal';
  end if;
end $$;

create function pasta_json(x exportacao_pastas) returns jsonb
language sql stable
set search_path = public
as $$
  select case when x.id is null then null else jsonb_build_object(
    'id', x.id, 'partes', x.partes, 'arquivos', x.arquivos, 'tamanho', x.tamanho, 'em', x.criada_em, 'por', pessoa_ref(x.criada_por)) end
$$;

-- Antes de montar ou de assinar: a exportação, a pasta que já existe (se existe) e, se não existe,
-- os anexos do mês com a data e o lançamento de cada um.
create function portal_financeiro_pasta_preparar(p_pessoa uuid, p_escritorio uuid, p_exportacao uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  x exportacoes_contador;
  v_pasta exportacao_pastas;
  v_fm date;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'FINANCEIRO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'financeiro.ver');
  select * into x from exportacoes_contador where id = p_exportacao and escritorio_id = p_escritorio;
  if x.id is null then raise exception 'Exportação não encontrada' using errcode = 'TC404'; end if;
  select * into v_pasta from exportacao_pastas where exportacao_id = x.id;
  v_fm := (x.mes + interval '1 month')::date - 1;
  return jsonb_build_object(
    'exportacaoId', x.id, 'mes', x.mes, 'formato', x.formato,
    'pasta', pasta_json(v_pasta),
    'anexos', case when v_pasta.id is not null then '[]'::jsonb else coalesce((
      select jsonb_agg(l.j order by l.dia, l.lancamento, l.criado) from (
        select jsonb_build_object('id', a.id, 'nome', a.nome, 'tipo', a.tipo, 'tamanho', a.tamanho, 'categoria', a.categoria,
                                  'dia', c.paga_em, 'lancamento', c.descricao) j, c.paga_em dia, c.descricao lancamento, a.concluido_em criado
          from anexos a join contas_pagar c on c.id = a.conta_id
         where a.escritorio_id = p_escritorio and a.situacao = 'PRONTO' and c.paga_em between x.mes and v_fm
        union all
        select jsonb_build_object('id', a.id, 'nome', a.nome, 'tipo', a.tipo, 'tamanho', a.tamanho, 'categoria', a.categoria,
                                  'dia', p.recebido_em, 'lancamento', 'Recebimento de ' || k.nome || ' · ' || rp.descricao),
               p.recebido_em, 'Recebimento de ' || k.nome, a.concluido_em
          from anexos a
          join pagamentos_recebidos p on p.id = a.pagamento_id
          join recebimentos_previstos rp on rp.id = p.parcela_id
          join contratos ct on ct.id = rp.contrato_id
          join clientes_escritorio k on k.id = ct.cliente_id
         where a.escritorio_id = p_escritorio and a.situacao = 'PRONTO' and p.caixa = 'ESCRITORIO' and p.recebido_em between x.mes and v_fm
      ) l), '[]'::jsonb) end);
end $$;

-- Depois de montar: as partes que a API guardou no Storage.
create function portal_financeiro_pasta_registrar(p_pessoa uuid, p_escritorio uuid, p_exportacao uuid, p_partes jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  x exportacoes_contador;
  v exportacao_pastas;
  p jsonb;
  v_n integer := 0;
  v_t bigint := 0;
  i integer := 0;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'FINANCEIRO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'financeiro.ver');
  select * into x from exportacoes_contador where id = p_exportacao and escritorio_id = p_escritorio;
  if x.id is null then raise exception 'Exportação não encontrada' using errcode = 'TC404'; end if;
  select * into v from exportacao_pastas where exportacao_id = x.id;
  if v.id is not null then return pasta_json(v); end if;
  if p_partes is null or jsonb_typeof(p_partes) <> 'array' or jsonb_array_length(p_partes) not between 1 and 50 then
    perform recusar_campos('Confira as partes', 'partes');
  end if;
  for p in select * from jsonb_array_elements(p_partes) loop
    i := i + 1;
    -- O caminho é sempre o que a API monta: <escritório>/exportacoes/<exportação>-<parte>.zip.
    if p ->> 'caminho' is distinct from format('%s/exportacoes/%s-%s.zip', p_escritorio, x.id, i)
       or coalesce((p ->> 'arquivos')::integer, 0) < 1 or coalesce((p ->> 'tamanho')::bigint, 0) not between 1 and 12582912 then
      perform recusar_campos('Confira as partes', 'partes');
    end if;
    v_n := v_n + (p ->> 'arquivos')::integer;
    v_t := v_t + (p ->> 'tamanho')::bigint;
  end loop;
  insert into exportacao_pastas (escritorio_id, exportacao_id, partes, arquivos, tamanho, criada_por)
  values (p_escritorio, x.id, p_partes, v_n, v_t, p_pessoa) returning * into v;
  perform registrar_historico('financeiro.pasta_contador', 'exportacoes_contador', x.id::text,
    jsonb_build_object('mes', x.mes, 'partes', jsonb_array_length(p_partes), 'arquivos', v_n, 'tamanho', v_t));
  return pasta_json(v);
end $$;

-- Mandar: o e-mail leva os links da pasta, se houver. A pasta vem junto do que o e-mail precisa.
alter function portal_financeiro_envio_preparar(uuid, uuid, uuid) rename to financeiro_envio_preparar_sem_pasta;
create function portal_financeiro_envio_preparar(p_pessoa uuid, p_escritorio uuid, p_exportacao uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return financeiro_envio_preparar_sem_pasta(p_pessoa, p_escritorio, p_exportacao)
    || jsonb_build_object('pasta', (select pasta_json(x) from exportacao_pastas x where x.exportacao_id = p_exportacao and x.escritorio_id = p_escritorio));
end $$;

-- O registro do envio guarda até quando o link vale (nulo quando não houve .zip).
drop function portal_financeiro_envio_registrar(uuid, uuid, uuid, text);
create function portal_financeiro_envio_registrar(p_pessoa uuid, p_escritorio uuid, p_exportacao uuid, p_situacao text,
                                                  p_link_ate timestamptz default null) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  x exportacoes_contador;
  c contadores;
  e envios_contador;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'FINANCEIRO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'financeiro.ver');
  select * into x from exportacoes_contador where id = p_exportacao and escritorio_id = p_escritorio;
  if x.id is null then raise exception 'Exportação não encontrada' using errcode = 'TC404'; end if;
  if p_situacao is null or p_situacao not in ('ENVIADO', 'FALHOU') then perform recusar_campos('Confira a situação', 'situacao'); end if;
  if p_link_ate is not null and p_link_ate not between app_now() and app_now() + interval '31 days' then
    perform recusar_campos('Confira o link', 'linkAte');
  end if;
  select * into c from contadores where escritorio_id = p_escritorio;
  if c.escritorio_id is null then perform recusar_motivo('O escritório ainda não tem contador cadastrado.', 'SEM_CONTADOR'); end if;
  insert into envios_contador (escritorio_id, exportacao_id, para, situacao, enviado_por, link_ate)
  values (p_escritorio, x.id, c.email, p_situacao, p_pessoa, case when p_situacao = 'ENVIADO' then p_link_ate end) returning * into e;
  perform registrar_historico('financeiro.envio_contador', 'exportacoes_contador', x.id::text,
    jsonb_strip_nulls(jsonb_build_object('mes', x.mes, 'situacao', p_situacao, 'linkAte', e.link_ate)));
  return envio_json(e);
end $$;

create or replace function envio_json(x envios_contador) returns jsonb
language sql stable
set search_path = public
as $$
  select case when x.id is null then null else jsonb_build_object(
    'para', x.para, 'situacao', x.situacao, 'em', x.enviado_em, 'por', pessoa_ref(x.enviado_por), 'linkAte', x.link_ate) end
$$;

call fechar_acesso();
