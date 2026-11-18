-- Telas do Console v1 aprovadas pela Carol em 18/11/2026 (F1.8). O que as telas pedem a
-- mais do banco:
-- 1. o conflito de edição da ficha diz quem salvou antes e a que horas (decisão 5);
-- 2. o motivo de mudar o estágio é obrigatório e vai para o histórico (decisão 4);
-- 3. a Equipe T3jus mostra quem ainda não criou a senha (convite pendente, decisão 6).

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
    -- Quem salvou a ficha por último e quando: o conflito de edição diz quem salvou antes (PT-19).
    'fichaAlteradaPor', (select p.nome from historico h left join pessoas p on p.id = h.autor_id
                          where h.escritorio_id = c.id and h.acao = 'ficha.alterada' order by h.id desc limit 1),
    'fichaAlteradaEm', (select h.ocorrido_em from historico h
                         where h.escritorio_id = c.id and h.acao = 'ficha.alterada' order by h.id desc limit 1),
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

-- Estágio (CO-01) com motivo obrigatório. As recusas de regra vêm antes, para a tela dizer o
-- que impede a mudança; o motivo vazio é erro do campo.
create or replace function console_mudar_estagio(p_pessoa uuid, p_escritorio uuid, p_versao integer, p_estagio text, p_motivo text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cliente uuid;
  v_atual text;
  v_versao integer;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'console.estagio.mudar');
  select id, estado into v_cliente, v_atual from clientes where escritorio_id = p_escritorio;
  if v_atual = p_estagio then
    perform recusar_motivo('O cliente já está neste estágio', 'MESMO_ESTAGIO');
  end if;
  if p_estagio = 'ATIVO' and 'SEM_SOCIO' = any (situacoes_cliente(p_escritorio)) then
    perform recusar_motivo('Convide o sócio antes de concluir a implantação', 'SEM_SOCIO');
  end if;
  if length(btrim(coalesce(p_motivo, ''))) not between 1 and 300 then
    perform recusar_campos('Escreva o motivo da mudança', 'motivo');
  end if;
  perform definir_transicao(case p_estagio when 'ATIVO' then 'IMPLANTACAO_CONCLUIDA' else 'ESTAGIO_ALTERADO' end, btrim(p_motivo));
  update clientes set estado = p_estagio where id = v_cliente and versao = p_versao returning versao into v_versao;
  if v_versao is null then perform conflito_versao('clientes', v_cliente); end if;
  return v_versao;
end $$;

-- Equipe T3jus com quem ainda não criou a senha (convite pendente). O e-mail vem do Auth, na API.
drop function console_equipe(uuid);
create function console_equipe(p_pessoa uuid)
returns table (pessoa_id uuid, nome text, ativa boolean, funcoes text[], desde timestamptz, senha_criada_em timestamptz)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  perform entrar_console(p_pessoa, 'console.equipe.gerenciar');
  return query
    select e.pessoa_id, p.nome, e.ativa,
           coalesce(array_agg(ef.funcao order by ef.funcao) filter (where ef.funcao is not null), '{}'),
           e.criado_em, p.senha_criada_em
      from equipe_t3 e join pessoas p on p.id = e.pessoa_id
      left join equipe_funcoes ef on ef.pessoa_id = e.pessoa_id and ef.retirada_em is null
     group by e.pessoa_id, p.nome, e.ativa, e.criado_em, p.senha_criada_em
     order by e.ativa desc, p.nome;
end $$;

call fechar_acesso();
