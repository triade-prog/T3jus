-- Os 16 e os 18 anos de quem nasceu em 29/02 (F3.161; CH-08, AP-01). Plano:
-- planos/F3.161-faltas-quem-assina.md, com os "Ajustes da revisão" por cima.
--
-- A regra. Quem nasceu em 29/02, num ano sem 29/02, completa o ano em 01/03: o Código Civil,
-- art. 132, § 3º ("os prazos de meses e anos expiram no dia de igual número do de início, ou no
-- imediato, se faltar exata correspondência"), e a Lei 810/1949, art. 3º ("quando no ano ou mês do
-- vencimento não houver o dia correspondente ao do início do prazo, este findará no primeiro dia
-- subsequente"). É o dia em que idade_em (age()) já vira a idade. Mas a data dos 16 e dos 18 era
-- nascimento + interval 'N years', que dá 28/02: a ficha mostrava "fez 18 anos em 28/02" e o sino
-- avisava no dia 28/02, quando cliente_assina ainda dizia ASSISTIDO e "Agora assina por si" recusava
-- com CLIENTE_NAO_FEZ_18. (A data dos 16 já saía certa, porque 16 é múltiplo de 4; a função nova
-- vale para as duas.)
--
-- O que muda (3 funções, 6 expressões, mais a função nova):
--   1. aniversario_em(nascimento, anos): a soma; se o nascimento é 29/02 e a soma caiu em 28/02,
--      + 1 dia. (Não usar nascimento - 1 + N anos + 1: erra quem nasceu em 01/03 de ano comum quando
--      o ano alvo é bissexto.) A mesma conta do aniversario() do domínio (responsavel_legal.ts).
--   2. cliente_assina: faz16 e faz18.
--   3. portal_cliente_assina_por_si: o "ate" de clientes_quem_assinava (véspera dos 18) e o fez18 do
--      histórico.
--   4. avisar_clientes_fez_18: a data do aviso ('em') e o filtro dos últimos 30 dias.
-- Cada função é copiada inteira da 0830 (language, volatilidade, security definer onde há,
-- search_path), com só essas expressões trocadas: create or replace troca todos os atributos, e
-- sem security definer a rota e o pg_cron esbarrariam no RLS. Nenhuma migration depois da 0830
-- redefine as três; a 0960, a 1030 e a 1092 só leem cliente_assina(c) ->> 'situacao', que não muda.
--
-- Nada já gravado muda: clientes_quem_assinava.ate e os avisos antigos de quem nasceu em 29/02 e já
-- passou a assinar por si ficam com 28/02 (histórico só de inserção). O not exists do sino é por
-- pessoa e cliente, sem a data: quem foi avisado em 28/02 não recebe de novo em 01/03.
--
-- Sem tabela, sem dado, sem texto novo. Idempotente (create or replace nas quatro).
-- Volta, se der errado: recriar as três funções com o texto da 0830 e, só depois,
-- drop function aniversario_em(date, integer) (o corpo SQL em texto não registra a dependência).

-- ---------------------------------------------------------------------------------------
-- 1. A data do aniversário de N anos

create or replace function aniversario_em(p_nascimento date, p_anos integer) returns date
language sql immutable
set search_path = public
as $$
  select case when extract(month from p_nascimento) = 2 and extract(day from p_nascimento) = 29
               and extract(day from (p_nascimento + make_interval(years => p_anos))) = 28
              then (p_nascimento + make_interval(years => p_anos))::date + 1
              else (p_nascimento + make_interval(years => p_anos))::date end
$$;

-- ---------------------------------------------------------------------------------------
-- 2. Quem assina, no dia (da 0830, seção 2)

create or replace function cliente_assina(c clientes_escritorio, p_dia date default null) returns jsonb
language sql stable
set search_path = public
as $$
  with d as (select coalesce(p_dia, hoje_brasilia()) dia),
       i as (select case when c.nascimento is not null then idade_em(c.nascimento, d.dia) end idade from d)
  select jsonb_build_object(
    'situacao', case c.capacidade when 'PLENA' then 'PROPRIO' when 'CURATELA' then 'CURATELA'
                  else case when i.idade >= 18 then 'FEZ_18' when i.idade >= 16 then 'ASSISTIDO' else 'REPRESENTADO' end end,
    'idade', i.idade,
    'faz16', case when c.nascimento is not null then aniversario_em(c.nascimento, 16) end,
    'faz18', case when c.nascimento is not null then aniversario_em(c.nascimento, 18) end,
    'modo', c.cur_modo)
  from i
$$;

-- ---------------------------------------------------------------------------------------
-- 3. "Agora assina por si" (da 0830, seção 5)

create or replace function portal_cliente_assina_por_si(p_pessoa uuid, p_escritorio uuid, p_cliente uuid, p_versao integer, p_dados jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c clientes_escritorio;
  v_civil text := nullif(btrim(coalesce(p_dados ->> 'estado_civil', '')), '');
  v_prof text := nullif(btrim(coalesce(p_dados ->> 'profissao', '')), '');
  v_versao integer;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'clientes.editar');
  if p_versao is null then perform recusar_campos('Falta a versão lida', 'versao'); end if;
  select * into c from clientes_escritorio where id = p_cliente and escritorio_id = p_escritorio;
  if c.id is null then raise exception 'Cliente não encontrado' using errcode = 'TC404'; end if;
  if c.estado in ('EXCLUIDO', 'ARQUIVADO') then
    perform recusar_motivo('Este cliente não muda mais', case c.estado when 'EXCLUIDO' then 'CLIENTE_EXCLUIDO' else 'CLIENTE_ARQUIVADO' end);
  end if;
  if cliente_assina(c) ->> 'situacao' <> 'FEZ_18' then
    perform recusar_motivo('O cliente ainda não fez 18 anos', 'CLIENTE_NAO_FEZ_18');
  end if;
  if v_civil is not null and v_civil not in ('SOLTEIRO', 'CASADO', 'UNIAO_ESTAVEL', 'SEPARADO', 'DIVORCIADO', 'VIUVO') then
    perform recusar_campos('Escolha uma das opções', 'estado_civil');
  end if;
  if v_prof is not null and length(v_prof) not between 2 and 80 then perform recusar_campos('Escreva a profissão', 'profissao'); end if;

  update clientes_escritorio set
    capacidade = 'PLENA', nascimento = null, rl_papel = null, rl_nome = null, rl_documento = null, rl_rg = null, rl_rg_orgao = null,
    rl_nacionalidade = null, rl_estado_civil = null, rl_profissao = null, rl_mora_junto = null, rl_cep = null, rl_endereco = null,
    rl_bairro = null, rl_cidade = null, rl_uf = null,
    estado_civil = coalesce(v_civil, estado_civil), profissao = coalesce(v_prof, profissao)
   where id = p_cliente and escritorio_id = p_escritorio and versao = p_versao
  returning versao into v_versao;
  if v_versao is null then perform conflito_versao('clientes_escritorio', p_cliente); end if;
  insert into clientes_quem_assinava (escritorio_id, cliente_id, papel, nome, documento, ate, registrado_por)
  values (p_escritorio, p_cliente, c.rl_papel, c.rl_nome, c.rl_documento, (aniversario_em(c.nascimento, 18) - 1), p_pessoa);
  perform registrar_historico('cliente.passou_a_assinar', 'cliente', p_cliente::text,
    jsonb_build_object('fez18', aniversario_em(c.nascimento, 18),
                       'campos', to_jsonb(array_remove(array['capacidade', 'nascimento', 'rl_nome',
                                   case when v_civil is not null then 'estado_civil' end, case when v_prof is not null then 'profissao' end], null))));
  return jsonb_build_object('id', p_cliente, 'versao', v_versao);
end $$;

-- ---------------------------------------------------------------------------------------
-- 4. O sino dos 18 anos (da 0830, seção 7)

create or replace function avisar_clientes_fez_18() returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lista uuid[];
  v_esc uuid;
  v_hoje date := hoje_brasilia();
  v_n integer := 0;
  p record;
begin
  perform limpar_contexto();
  perform set_config('t3jus.lendo_acesso', 'on', true);
  select coalesce(array_agg(id order by id), '{}') into v_lista from escritorios;
  perform set_config('t3jus.lendo_acesso', 'off', true);
  foreach v_esc in array v_lista loop
    perform entrar_escritorio_servico(v_esc);
    for p in
      select distinct k.id cliente_id, k.nome, k.rl_papel, k.rl_nome, aniversario_em(k.nascimento, 18) fez, r.pessoa_id
        from clientes_escritorio k
        join lateral (select ct.responsavel_id pessoa_id from contratos ct
                       where ct.cliente_id = k.id and ct.escritorio_id = v_esc and ct.estado <> 'ENCERRADO'
                      union
                      select s.responsavel_id from casos s join caso_clientes cc on cc.caso_id = s.id
                       where cc.cliente_id = k.id and s.escritorio_id = v_esc and s.situacao = 'ANDAMENTO') r on true
       where k.escritorio_id = v_esc and k.capacidade = 'MENOR' and k.estado = 'ATIVO'
         and aniversario_em(k.nascimento, 18) between v_hoje - 30 and v_hoje
         and not exists (select 1 from avisos_sino a
                          where a.escritorio_id = v_esc and a.tipo = 'CLIENTE_FEZ_18' and a.origem_id = k.id and a.pessoa_id = r.pessoa_id)
    loop
      perform aviso_sino(v_esc, p.pessoa_id, null, 'CLIENTE_FEZ_18', 'clientes', p.cliente_id, jsonb_build_object(
        'cliente', p.nome, 'em', to_char(p.fez, 'DD/MM/YYYY'),
        'quem', split_part(p.rl_nome, ' ', 1) || case p.rl_papel when 'MAE' then ', a mãe' when 'PAI' then ', o pai'
                                                                 when 'TUTORA' then ', a tutora' else ', o tutor' end));
      v_n := v_n + 1;
    end loop;
  end loop;
  perform limpar_contexto();
  return jsonb_build_object('avisos', v_n, 'em', v_hoje);
end $$;

call fechar_acesso();
