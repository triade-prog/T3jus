-- Telas do Console aprovadas (F1.5): carteira e ficha do cliente com o que a equipe precisa
-- ver de relance: em que pé está o convite do sócio, quem da equipe atende e a última
-- atividade. Tudo pela pessoa da sessão, conferida no banco (PT-24).

-- Quando a pessoa criou a senha pelo convite (PT-20). É o que separa "convite enviado" de
-- "entrou no Portal" na carteira e no caminho do convite.
alter table pessoas add column senha_criada_em timestamptz;

create or replace function aceitar_convite(p_pessoa uuid, p_nome text, p_sistema text) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if length(btrim(coalesce(p_nome, ''))) not between 1 and 120 then
    raise exception 'Nome inválido' using errcode = 'TC422';
  end if;
  perform definir_pessoa(p_pessoa);
  update pessoas set nome = btrim(p_nome), senha_criada_em = coalesce(senha_criada_em, app_now()) where id = p_pessoa;
  perform registrar_acesso(p_pessoa, 'acesso.convite_aceito', jsonb_build_object('sistema', lower(p_sistema), 'termos_aceitos', true));
end $$;

-- Os sócios do escritório do contexto, do mais antigo ao mais novo, com o caminho do convite:
-- quando o último convite saiu (o primeiro ou um reenvio) e quando a senha foi criada.
create function socios_do_contexto() returns jsonb
language sql stable
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'vinculoId', v.id, 'pessoaId', p.id, 'nome', p.nome, 'desde', v.criado_em,
           'convidadoPor', q.nome, 'senhaCriadaEm', p.senha_criada_em,
           'conviteEnviadoEm', greatest(v.criado_em, (select max(h.ocorrido_em) from historico h
                                                        where h.escritorio_id = v.escritorio_id and h.acao = 'socio.convite_reenviado'
                                                          and h.entidade = 'vinculo' and h.entidade_id = v.id::text)))
           order by v.criado_em), '[]'::jsonb)
    from vinculos v join pessoas p on p.id = v.pessoa_id left join pessoas q on q.id = v.criado_por
   where v.escritorio_id = contexto_escritorio() and v.funcao = 'SOCIO' and v.revogado_em is null
$$;

-- A equipe T3jus atribuída ao escritório do contexto (uma linha por pessoa, com as funções).
create function equipe_do_contexto() returns jsonb
language sql stable
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object('pessoaId', x.id, 'nome', x.nome, 'funcoes', x.funcoes) order by x.nome), '[]'::jsonb)
    from (select p.id, p.nome, array_agg(distinct v.funcao order by v.funcao) as funcoes
            from vinculos v join pessoas p on p.id = v.pessoa_id join funcoes f on f.codigo = v.funcao
           where v.escritorio_id = contexto_escritorio() and f.sistema = 'CONSOLE' and v.revogado_em is null
           group by p.id, p.nome) x
$$;

-- Carteira (CO-01, PT-24): agora com sócios, equipe e a última atividade de cada cliente.
drop function console_carteira(uuid);
create function console_carteira(p_pessoa uuid)
returns table (escritorio_id uuid, nome text, cidade text, uf text, estagio text,
               funcoes text[], situacoes text[], criado_em timestamptz,
               socios jsonb, equipe jsonb, ultima_atividade timestamptz)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  r record;
  v_lista jsonb;
begin
  perform definir_pessoa(p_pessoa);
  if not contexto_equipe() then
    raise exception 'Só a equipe T3jus' using errcode = 'TC401';
  end if;
  -- A lista sai inteira antes do laço: entrar em cada cliente troca o contexto.
  select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'funcoes', x.funcoes) order by x.nome, x.id), '[]'::jsonb)
    into v_lista
    from (select v.escritorio_id as id, c.nome, array_agg(distinct v.funcao order by v.funcao) as funcoes
            from vinculos v join escritorios c on c.id = v.escritorio_id
           where v.pessoa_id = p_pessoa and v.revogado_em is null and v.funcao = any (contexto_equipe_funcoes())
           group by v.escritorio_id, c.nome) x;
  for r in select * from jsonb_to_recordset(v_lista) as y(id uuid, funcoes text[])
  loop
    if pode(p_pessoa, r.id, 'console.carteira.ver') then
      perform entrar_escritorio(p_pessoa, r.id, 'console.carteira.ver');
      return query
        select c.id, c.nome, c.cidade, c.uf, cl.estado, r.funcoes, situacoes_cliente(c.id), c.criado_em,
               socios_do_contexto(), equipe_do_contexto(),
               greatest(c.criado_em, (select max(h.ocorrido_em) from historico h where h.escritorio_id = c.id))
          from escritorios c join clientes cl on cl.escritorio_id = c.id
         where c.id = r.id;
    end if;
  end loop;
end $$;

-- A ficha completa (CO-02), com o caminho do convite de cada sócio e a última atividade.
create or replace function console_ficha(p_pessoa uuid, p_escritorio uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v jsonb;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'console.ficha.ver');
  select jsonb_build_object(
    'escritorio', jsonb_build_object(
      'id', c.id, 'nome', c.nome, 'cidade', c.cidade, 'uf', c.uf, 'endereco', c.endereco,
      'cnpj', c.cnpj, 'contatos', c.contatos,
      'versao', c.versao, 'criadoEm', c.criado_em),
    'cliente', jsonb_build_object('estagio', cl.estado, 'referenciaContrato', cl.referencia_contrato, 'versao', cl.versao),
    'socios', socios_do_contexto(),
    'equipe', coalesce((
      select jsonb_agg(jsonb_build_object('vinculoId', v.id, 'pessoaId', p.id, 'nome', p.nome, 'funcao', v.funcao,
                                          'desde', v.criado_em, 'versao', v.versao) order by p.nome, v.funcao)
        from vinculos v join pessoas p on p.id = v.pessoa_id join funcoes f on f.codigo = v.funcao
       where v.escritorio_id = c.id and f.sistema = 'CONSOLE' and v.revogado_em is null), '[]'::jsonb),
    'situacoes', to_jsonb(situacoes_cliente(c.id)),
    'ultimaAtividade', greatest(c.criado_em, (select max(h.ocorrido_em) from historico h where h.escritorio_id = c.id)),
    'permissoes', coalesce((
      select jsonb_agg(distinct fa.acao order by fa.acao)
        from vinculos v join funcao_acoes fa on fa.funcao = v.funcao
       where v.pessoa_id = p_pessoa and v.escritorio_id = c.id and v.revogado_em is null
         and v.funcao = any (contexto_equipe_funcoes())), '[]'::jsonb))
    into v
    from escritorios c join clientes cl on cl.escritorio_id = c.id
   where c.id = p_escritorio;
  return v;
end $$;

-- Reenviar o convite do sócio (PT-20): só para quem ainda não criou a senha. Devolve a pessoa,
-- para a API achar o e-mail no Auth e mandar o convite de novo.
create function console_reenviar_convite(p_pessoa uuid, p_escritorio uuid, p_vinculo uuid) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_convidado uuid;
  v_criada timestamptz;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'console.socios.convidar');
  select v.pessoa_id, p.senha_criada_em into v_convidado, v_criada
    from vinculos v join pessoas p on p.id = v.pessoa_id
   where v.id = p_vinculo and v.escritorio_id = p_escritorio and v.funcao = 'SOCIO' and v.revogado_em is null;
  if v_convidado is null then
    raise exception 'Sócio não encontrado' using errcode = 'TC404';
  end if;
  if v_criada is not null then
    perform recusar_motivo('O sócio já criou a senha', 'JA_ENTROU');
  end if;
  perform registrar_historico('socio.convite_reenviado', 'vinculo', p_vinculo::text, jsonb_build_object('pessoa_id', v_convidado));
  return v_convidado;
end $$;

call fechar_acesso();
