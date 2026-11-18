-- Telas de acesso aprovadas (F1.4): convite com quem convidou e escolha do escritório com
-- cidade e última entrada. Tudo pela pessoa da sessão, conferida no servidor.

-- Ver o próprio escritório (nome e quem está nele): toda função do Portal tem.
insert into funcao_acoes (funcao, acao) values ('SOCIO', 'escritorio.ver');

-- Convite (PT-20): o nome da pessoa e, no Portal, o escritório e quem convidou (o vínculo
-- ativo mais novo). A tela mostra antes de a pessoa criar a senha.
create function dados_convite(p_pessoa uuid, p_sistema text) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nome text;
  v_escritorio uuid;
  v_por uuid;
  v_quem text;
begin
  perform definir_pessoa(p_pessoa);
  select nome into v_nome from pessoas where id = p_pessoa;
  if p_sistema = 'CONSOLE' then
    return jsonb_build_object('nome', v_nome);
  end if;
  select v.escritorio_id, v.criado_por into v_escritorio, v_por
    from vinculos v join funcoes f on f.codigo = v.funcao and f.sistema = 'PORTAL'
   where v.pessoa_id = p_pessoa and v.revogado_em is null
   order by v.criado_em desc
   limit 1;
  if v_escritorio is null then
    return jsonb_build_object('nome', v_nome);
  end if;
  -- Dentro do escritório do convite: quem convidou aparece se for do mesmo escritório;
  -- convite da equipe T3jus aparece como da equipe, sem o nome.
  begin
    perform entrar_escritorio(p_pessoa, v_escritorio, 'escritorio.ver');
    select nome into v_quem from pessoas where id = v_por;
  exception when sqlstate 'TC401' then
    v_quem := null;
  end;
  return jsonb_build_object(
    'nome', v_nome,
    'escritorio', (select nome from escritorios where id = v_escritorio),
    'quem', v_quem,
    'papel', case when v_quem is null then 'EQUIPE' else 'ESCRITORIO' end);
end $$;

-- Convite aceito: a pessoa confirma o próprio nome e o aceite dos Termos fica no histórico.
create function aceitar_convite(p_pessoa uuid, p_nome text, p_sistema text) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if length(btrim(coalesce(p_nome, ''))) not between 1 and 120 then
    raise exception 'Nome inválido' using errcode = 'TC422';
  end if;
  perform definir_pessoa(p_pessoa);
  update pessoas set nome = btrim(p_nome) where id = p_pessoa;
  perform registrar_acesso(p_pessoa, 'acesso.convite_aceito', jsonb_build_object('sistema', lower(p_sistema), 'termos_aceitos', true));
end $$;

-- Escolha do escritório (Portal): os escritórios com vínculo ativo, do último usado ao mais
-- antigo. A última entrada vem das sessões, que a rotina noturna guarda por 30 dias (PT-11).
create function escritorios_para_escolher(p_pessoa uuid)
returns table (escritorio_id uuid, nome text, cidade text, uf text, ultima_entrada timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform definir_pessoa(p_pessoa);
  return query
    select e.id, e.nome, e.cidade, e.uf,
           (select max(s.escolhido_em) from sessoes_escritorio s where s.pessoa_id = p_pessoa and s.escritorio_id = e.id)
      from escritorios e
     where exists (select 1 from vinculos v join funcoes f on f.codigo = v.funcao
                    where v.pessoa_id = p_pessoa and v.escritorio_id = e.id and v.revogado_em is null and f.sistema = 'PORTAL')
     order by 5 desc nulls last, e.nome;
end $$;

call fechar_acesso();
