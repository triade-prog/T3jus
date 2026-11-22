-- Aviso de fatura em atraso no sino do Console (F1.22, CO-06).
-- O sino do Console (0590, desenho aprovado em docs/design/aprovadas/console-interessado-sino)
-- ganha o primeiro aviso fora de Interessados, a candidata 6 do desenho, que a cobrança aprovada
-- (docs/design/aprovadas/console-cobranca, decisão 4) já marcava em dois momentos da régua:
--   - aos 7 dias, quando o Portal acende a faixa para o sócio dono;
--   - aos 30 dias, quando o Console passa a propor o Portal só para consulta.
-- Os dois momentos já viram eventos da fatura na rotina das 8h (portal.aviso_aceso e
-- consulta.proposta, 0690), uma vez cada. O aviso nasce desses eventos, para a Administração e o
-- Financeiro que atendem o escritório (PT-24: os mesmos que veem a fatura em Cobrança), e leva à
-- fatura. Sem dado pessoal: o nome do escritório, o mês, o valor e os dias.

alter table avisos_console drop constraint avisos_console_tipo_check;
alter table avisos_console add constraint avisos_console_tipo_check
  check (tipo in ('INTERESSADO_NOVO', 'INTERESSADO_ATRIBUIDO', 'INTERESSADO_VENCIDO', 'FATURA_ATRASO'));
-- A fatura do aviso (a fatura não se apaga, 0690).
alter table avisos_console add column fatura_id uuid references faturas (id) on delete restrict;
alter table avisos_console add constraint avisos_console_fatura check ((tipo = 'FATURA_ATRASO') = (fatura_id is not null));
create index avisos_console_fatura on avisos_console (fatura_id) where fatura_id is not null;

update inventario_dados
   set o_que = 'Avisos do sino da equipe T3jus: o interessado (nome, trecho da mensagem), a fatura de escritório em atraso e quando foi lido'
 where tabela = 'avisos_console';

-- Quem recebe: Administração e Financeiro com vínculo ativo ao escritório, ainda com a função
-- na equipe T3jus ativa.
create function pessoas_cobranca_do_escritorio(p_escritorio uuid) returns setof uuid
language sql stable
set search_path = public
as $$
  select distinct v.pessoa_id
    from vinculos v
    join funcao_acoes fa on fa.funcao = v.funcao and fa.acao = 'console.cobranca.ver'
    join equipe_funcoes f on f.pessoa_id = v.pessoa_id and f.funcao = v.funcao and f.retirada_em is null
    join equipe_t3 e on e.pessoa_id = v.pessoa_id and e.ativa
   where v.escritorio_id = p_escritorio and v.revogado_em is null
   order by 1
$$;

create function avisos_console_da_fatura() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  f faturas;
  v_nome text;
  v_antes text;
  p uuid;
begin
  select * into f from faturas where id = new.fatura_id;
  if f.id is null then return null; end if;
  v_antes := current_setting('t3jus.lendo_acesso', true);
  perform set_config('t3jus.lendo_acesso', 'on', true);
  select nome into v_nome from escritorios where id = f.escritorio_id;
  for p in select pessoas_cobranca_do_escritorio(f.escritorio_id) loop
    insert into avisos_console (pessoa_id, tipo, fatura_id, dados)
    values (p, 'FATURA_ATRASO', f.id, jsonb_strip_nulls(jsonb_build_object(
      'escritorio', v_nome, 'escritorioId', f.escritorio_id, 'numero', f.numero,
      'competencia', f.competencia, 'vencimento', f.vencimento, 'totalCentavos', f.total_centavos,
      'dias', coalesce((new.dados ->> 'dias')::int, hoje_brasilia() - f.vencimento),
      'marco', case when new.acao = 'consulta.proposta' then 'CONSULTA' else 'AVISO' end)));
  end loop;
  perform set_config('t3jus.lendo_acesso', coalesce(v_antes, ''), true);
  return null;
end $$;
create trigger avisos_console_da_fatura after insert on fatura_eventos
  for each row when (new.acao in ('portal.aviso_aceso', 'consulta.proposta') and new.fatura_id is not null)
  execute function avisos_console_da_fatura();

-- ---------------------------------------------------------------------------------------
-- Leituras: o aviso de fatura só enquanto a pessoa ainda vê Cobrança (a permissão de agora),
-- como o de interessado com Interessados. A resposta diz também se a pessoa vê Cobrança, para o
-- sino vazio dizer o que chega ali.

create or replace function aviso_console_visivel(p_tipo text) returns boolean
language sql stable
set search_path = public
as $$
  select case when p_tipo like 'INTERESSADO_%' then pode_global('console.interessados.ver')
              when p_tipo like 'FATURA_%' then pode_global('console.cobranca.ver')
              else true end
$$;

create or replace function console_avisos(p_pessoa uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_desde timestamptz := app_now() - interval '30 days';
begin
  perform entrar_equipe(p_pessoa);
  return (
    with meus as (
      select a.* from avisos_console a
       where a.pessoa_id = p_pessoa and a.criado_em >= v_desde and aviso_console_visivel(a.tipo)
       order by a.criado_em desc, a.id desc limit 200)
    select jsonb_build_object(
      'novos', (select count(*) from meus where lido_em is null),
      'total', (select count(*) from meus),
      'veInteressados', pode_global('console.interessados.ver'),
      'veCobranca', pode_global('console.cobranca.ver'),
      'itens', coalesce((select jsonb_agg(jsonb_build_object(
          'id', m.id, 'tipo', m.tipo, 'dados', m.dados, 'interessadoId', m.interessado_id, 'faturaId', m.fatura_id,
          'em', m.criado_em, 'lido', m.lido_em is not null,
          -- O aviso é uma foto do momento; "agora" diz quem cuida hoje do pedido.
          'agora', case when m.tipo = 'INTERESSADO_NOVO' then (select p.nome from interessados i join pessoas p on p.id = i.responsavel_id
                                                                where i.id = m.interessado_id) end)
        order by m.criado_em desc, m.id desc) from meus m), '[]'::jsonb)));
end $$;

create or replace function console_avisos_lidos(p_pessoa uuid, p_ate timestamptz) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_n integer;
begin
  perform entrar_equipe(p_pessoa);
  if p_ate is null then perform recusar_campos('Falta até quando marcar', 'ate'); end if;
  update avisos_console set lido_em = app_now()
   where pessoa_id = p_pessoa and lido_em is null and criado_em <= p_ate and aviso_console_visivel(tipo);
  get diagnostics v_n = row_count;
  return console_avisos(p_pessoa) || jsonb_build_object('marcados', v_n);
end $$;

call fechar_acesso();
