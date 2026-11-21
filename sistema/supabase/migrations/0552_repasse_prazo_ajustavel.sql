-- 0552 · Prazo do repasse ajustável e feriados nacionais (F3.46, FI-05). Desenho aprovado em
-- docs/design/aprovadas/portal-comercial-financeiro-pendencias (decisões 5 e 12 da Carol, 21/11/2026).
-- - O prazo é do escritório, em dias úteis, de 1 a 30 (padrão 3). Quem muda é a sócia dona, em
--   Escritório › Ajustes do financeiro. Vale para o que entrar dali em diante: o prazo de cada parte
--   continua gravado quando o levantamento entra, e o guardião das destinações não deixa mudar.
-- - Dia útil é de segunda a sexta, sem os feriados nacionais (Lei 662/1949, Lei 6.802/1980 e
--   Lei 14.759/2023): 1/1, Sexta-feira Santa, 21/4, 1/5, 7/9, 12/10, 2/11, 15/11, 20/11 e 25/12.

alter table escritorios add column prazo_repasse_dias_uteis integer not null default 3
  check (prazo_repasse_dias_uteis between 1 and 30);

-- O domingo de Páscoa do ano (algoritmo de Meeus/Jones/Butcher).
create function domingo_de_pascoa(p_ano integer) returns date
language plpgsql immutable
as $$
declare
  a integer := p_ano % 19;
  b integer := p_ano / 100;
  c integer := p_ano % 100;
  d integer := b / 4;
  e integer := b % 4;
  f integer := (b + 8) / 25;
  g integer := (b - f + 1) / 3;
  h integer := (19 * a + b - d - g + 15) % 30;
  i integer := c / 4;
  k integer := c % 4;
  l integer := (32 + 2 * e + 2 * i - h - k) % 7;
  m integer := (a + 11 * h + 22 * l) / 451;
begin
  return make_date(p_ano, (h + l - 7 * m + 114) / 31, ((h + l - 7 * m + 114) % 31) + 1);
end $$;

create function feriado_nacional(p_dia date) returns boolean
language sql immutable
as $$
  select to_char(p_dia, 'MM-DD') in ('01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '12-25')
      or (to_char(p_dia, 'MM-DD') = '11-20' and extract(year from p_dia) >= 2024)
      or p_dia = domingo_de_pascoa(extract(year from p_dia)::integer) - 2
$$;

create or replace function somar_dias_uteis(p_dia date, p_dias integer) returns date
language plpgsql immutable
as $$
declare
  d date := p_dia;
  n integer := 0;
begin
  while n < p_dias loop
    d := d + 1;
    if extract(isodow from d) < 6 and not feriado_nacional(d) then n := n + 1; end if;
  end loop;
  return d;
end $$;

-- Dias úteis entre dois dias (quantos dias úteis depois de p_de cai p_ate). Para o "1 dia útil de atraso".
create function dias_uteis_entre(p_de date, p_ate date) returns integer
language sql immutable
as $$
  select count(*)::integer from generate_series(p_de + 1, p_ate, interval '1 day') g(d)
   where extract(isodow from g.d) < 6 and not feriado_nacional(g.d::date)
$$;

-- O prazo passa a vir do escritório em uso (o da sessão).
create or replace function prazo_repasse_dias() returns integer
language sql stable
set search_path = public
as $$ select coalesce((select prazo_repasse_dias_uteis from escritorios where id = contexto_escritorio()), 3) $$;

-- Mudar o prazo: só a sócia dona. Vale para os levantamentos registrados dali em diante.
create function portal_financeiro_prazo_repasse(p_pessoa uuid, p_escritorio uuid, p_dias integer) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_antes integer;
begin
  perform entrar_area(p_pessoa, p_escritorio, 'FINANCEIRO');
  perform entrar_escritorio(p_pessoa, p_escritorio, 'financeiro.ver');
  if not e_socio_dono(p_pessoa, p_escritorio) then
    raise exception 'Só a sócia dona muda o prazo do repasse' using errcode = 'TC401',
      detail = jsonb_build_object('motivo', 'SO_SOCIO_DONO')::text;
  end if;
  if p_dias is null or p_dias not between 1 and 30 then
    perform recusar_campos('O prazo vai de 1 a 30 dias úteis.', 'prazoRepasseDias');
  end if;
  select prazo_repasse_dias_uteis into v_antes from escritorios where id = p_escritorio for update;
  if v_antes is distinct from p_dias then
    update escritorios set prazo_repasse_dias_uteis = p_dias where id = p_escritorio;
    perform registrar_historico('financeiro.prazo_repasse', 'escritorios', p_escritorio::text,
      jsonb_build_object('de', v_antes, 'para', p_dias));
  end if;
  return jsonb_build_object('prazoRepasseDias', p_dias);
end $$;

call fechar_acesso();
