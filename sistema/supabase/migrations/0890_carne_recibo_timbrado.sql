-- 0890 · Razão social e contatos do escritório no carnê e no recibo (F3.133; PA-07, FI-23, FI-14).
-- Desenho aprovado pela Carol em 22/11/2026, 23h41 (Bahia), com as 4 recomendações
-- (docs/design/aprovadas/carne-recibo-razao-social): o canhoto continua com o nome curto; o site
-- só no recibo; razão social vazia sai com o nome curto, sem "[falta]"; o WhatsApp numa 5ª linha
-- do recibo. A faixa 0890-0899 é desta frente.
--
-- O papel guarda o timbrado do dia (PT-03): cada carnê e cada cópia de recibo nova leva
-- escritorio_timbrado_json, gravado por gatilho na inserção. Assim nenhuma função de gerar
-- precisa ser copiada aqui, e o que já foi emitido não muda:
--   - carnê antigo (sem a cópia) continua montado com o escritório de hoje e o desenho de antes;
--   - recibo antigo sem cópia (anterior à 0533) continua montado ao vivo, como diz a 0533;
--   - cópia antiga de recibo, sem `comTimbrado`, é devolvida como foi guardada.
-- A tela e os PDFs sabem que é o papel novo por `escritorio.comTimbrado = true`.
--
-- Dado pessoal: sem sociedade, o timbrado leva o nome completo e a OAB principal da sócia dona,
-- e nada mais (nunca CPF, RG, estado civil ou nacionalidade). É o que vai impresso no carnê e no
-- recibo. Por isso a prévia do carnê (portal_carne_opcoes) entrega esses dois dados a quem tem
-- Financeiro ou Contratos, sem o p_com_dona da 0860: quem gera o carnê vê o que vai no papel.
--
-- Segurança: escritorio_timbrado_json e os gatilhos não são security definer e só rodam dentro
-- das funções do Portal; depois do fechar_acesso() só o `dominio` os executa. As leituras de
-- pessoa_dados_documento e oab_inscricao continuam filtradas pelo contexto do escritório. As
-- funções renomeadas (*_sem_timbrado) continuam security definer e conferem o acesso por dentro
-- (carne_entrar), como no resto do repositório.

-- ---------------------------------------------------------------------------------------
-- O timbrado do dia: só o que vai para o papel.

create function escritorio_timbrado_json(p_escritorio uuid) returns jsonb
language sql stable
set search_path = public
as $$
  select (escritorio_documentos_json(x) - 'dona' - 'oabUf' - 'oabNumero') || jsonb_build_object(
    'comTimbrado', true,
    -- Sem telefone e e-mail do escritório, o primeiro contato que tem um deles (sem nome e papel).
    'contatos', case when x.telefone is null and x.email is null then coalesce((
        select jsonb_build_array(jsonb_build_object('telefone', c ->> 'telefone', 'email', c ->> 'email'))
          from jsonb_array_elements(x.contatos) with ordinality t(c, n)
         where nullif(c ->> 'telefone', '') is not null or nullif(c ->> 'email', '') is not null
         order by n limit 1), '[]'::jsonb)
      else '[]'::jsonb end,
    'whatsapp', (select w.numero from whatsapp_escritorio w where w.escritorio_id = x.id and w.situacao <> 'DESLIGADO' limit 1),
    -- Sem sociedade, a sócia dona: o nome completo e a OAB principal, nada mais.
    'dona', case when x.tipo = 'SEM_SOCIEDADE' then (
        select jsonb_build_object('nome', n.nome, 'dados', jsonb_build_object('nomeCompleto', n.nome),
                                  'inscricoes', case when i.texto is not null
                                                     then jsonb_build_array(jsonb_build_object('texto', i.texto, 'tipo', i.tipo))
                                                     else '[]'::jsonb end)
          from pessoas p
          cross join lateral (select coalesce(nullif(btrim(pessoa_dados_json(p.id, x.id) ->> 'nomeCompleto'), ''), p.nome) as nome) n
          left join lateral (select o ->> 'texto' as texto, o ->> 'tipo' as tipo
                               from jsonb_array_elements(oab_inscricoes(p.id, x.id)) o limit 1) i on true
         where p.id = escritorio_socia_dona(x.id)) end)
  from escritorios x where x.id = p_escritorio
$$;

-- ---------------------------------------------------------------------------------------
-- O carnê guarda o timbrado do dia. O gatilho sobrescreve o que vier no insert.

alter table carnes add column timbrado jsonb check (timbrado is null or jsonb_typeof(timbrado) = 'object');

create function carne_timbrado_do_dia() returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.timbrado := escritorio_timbrado_json(new.escritorio_id);
  return new;
end $$;
create trigger carnes_timbrado_do_dia before insert on carnes
  for each row execute function carne_timbrado_do_dia();

-- portal_carne usa a cópia. Com ela, o nome curto e o WhatsApp também passam a ser os do dia
-- do carnê (antes eram lidos ao vivo). Carnê antigo, sem cópia, fica como antes.
alter function portal_carne(uuid, uuid, uuid, text) rename to portal_carne_sem_timbrado;
create function portal_carne(p_pessoa uuid, p_escritorio uuid, p_carne uuid, p_area text) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v jsonb := portal_carne_sem_timbrado(p_pessoa, p_escritorio, p_carne, p_area);
  t jsonb;
begin
  select k.timbrado into t from carnes k where k.id = p_carne and k.escritorio_id = p_escritorio;
  return case when t is not null then jsonb_set(v, '{escritorio}', t) else v end;
end $$;

-- A prévia da janela "Gerar carnê" leva o timbrado de hoje (o que vai sair no Gerar).
alter function portal_carne_opcoes(uuid, uuid, uuid, text) rename to carne_opcoes_sem_timbrado;
create function portal_carne_opcoes(p_pessoa uuid, p_escritorio uuid, p_contrato uuid, p_area text) returns jsonb
language sql
security definer
set search_path = public
as $$
  select carne_opcoes_sem_timbrado(p_pessoa, p_escritorio, p_contrato, p_area)
         || jsonb_build_object('timbrado', escritorio_timbrado_json(p_escritorio))
$$;

-- ---------------------------------------------------------------------------------------
-- A cópia do recibo guarda o timbrado do dia. Só portal_financeiro_receber_registrar_recibo
-- grava em recibo_copias (0533, envolvida na 0640); recibo_montar não muda.

create function recibo_copia_timbrado_do_dia() returns trigger
language plpgsql
set search_path = public
as $$
declare t jsonb := escritorio_timbrado_json(new.escritorio_id);
begin
  if t is not null then new.dados := jsonb_set(new.dados, '{escritorio}', t); end if;
  return new;
end $$;
create trigger recibo_copias_timbrado_do_dia before insert on recibo_copias
  for each row execute function recibo_copia_timbrado_do_dia();

-- ---------------------------------------------------------------------------------------
-- Inventário (PT-11): a cópia passa a ter, sem sociedade, o nome completo e a OAB da sócia dona.
-- carnes vira dado pessoal, com a finalidade, a base, o prazo e o destino iguais aos de
-- recibo_copias (os prazos dependem do ok da Carol, junto com o desenho).

update inventario_dados
   set o_que = 'Papel de cada recibo: timbrado (sem sociedade, nome e OAB da sócia dona), cliente, quem pagou (nome e CPF ou CNPJ), contrato, parcela, valor e quem registrou'
 where tabela = 'recibo_copias';
update inventario_dados i
   set dado_pessoal = true,
       o_que = 'Carnês gerados para os contratos: formato, capa, a chave usada, quem gerou, quando e o timbrado do dia (sem sociedade, nome completo e OAB da sócia dona)',
       para_que = r.para_que, base_legal = r.base_legal, controlador = r.controlador, prazo = r.prazo, no_fim = r.no_fim, situacao = r.situacao
  from inventario_dados r
 where i.tabela = 'carnes' and r.tabela = 'recibo_copias';

call fechar_acesso();
