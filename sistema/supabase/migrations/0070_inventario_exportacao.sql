-- 0070 · Inventário de dados (F0.11; PT-11, PT-03) e exportação completa do escritório
-- (F0.12; PT-15).
--
-- Regras desta parte:
-- 1. Toda tabela do esquema public está no inventário (inventario_dados), dizendo se guarda
--    dado pessoal e, se guarda, o que é, para que serve, a base legal, quem é o controlador, o
--    prazo e o que acontece no fim. Tabela nova sem linha no inventário faz o teste 008 falhar:
--    não dá para criar dado pessoal sem dizer por quê e até quando.
-- 2. Os prazos nascem como PROPOSTA. Só viram APROVADO com a Carol, numa migration nova. A
--    rotina que apaga o que passou do prazo vem depois da aprovação (F0.13 no painel).
-- 3. O inventário também diz o que entra na exportação do escritório (exportar). A exportação
--    lê o inventário: tabela nova de escritório marcada para exportar entra sozinha.
-- 4. A exportação é do sócio (escritorio.exportar), só do escritório escolhido na sessão. Não
--    leva o que é interno do T3jus (tabelas_internas, histórico interno, vínculos da equipe
--    T3jus), nem sessões. Cada exportação fica no histórico do escritório (PT-03).

create table inventario_dados (
  tabela        text primary key check (tabela ~ '^[a-z][a-z0-9_]*$'),
  dado_pessoal  boolean not null,
  o_que         text not null check (length(btrim(o_que)) between 3 and 160),
  para_que      text check (length(btrim(para_que)) between 3 and 160),
  base_legal    text check (length(btrim(base_legal)) between 3 and 160),
  controlador   text check (length(btrim(controlador)) between 3 and 160),
  prazo         text check (length(btrim(prazo)) between 3 and 200),
  no_fim        text check (length(btrim(no_fim)) between 3 and 200),
  situacao      text check (situacao in ('PROPOSTA', 'APROVADO')),
  exportar      boolean not null default false,
  check (dado_pessoal = (para_que is not null and base_legal is not null and controlador is not null
                         and prazo is not null and no_fim is not null and situacao is not null)),
  check (dado_pessoal or (para_que is null and base_legal is null and controlador is null
                          and prazo is null and no_fim is null and situacao is null))
);
call proteger_tabela_global('inventario_dados', 'Inventário de dados (LGPD), igual para todos os escritórios; só a migration escreve');

-- Prazos propostos em 17/11/2026, a aprovar com a Carol (regra 2).
insert into inventario_dados (tabela, dado_pessoal, o_que, para_que, base_legal, controlador, prazo, no_fim, situacao, exportar) values
 ('escritorios', true, 'Nome, cidade, UF, endereço, CNPJ e contatos (nome, papel, telefone, e-mail)',
  'Cadastrar o escritório cliente e falar com ele', 'Execução do contrato (LGPD, art. 7º, V)', 'T3jus',
  'Enquanto o escritório for cliente e 5 anos depois do fim do contrato',
  'Contatos, endereço e CNPJ apagados; fica o nome do escritório no histórico', 'PROPOSTA', true),
 ('pessoas', true, 'Nome de quem tem acesso (o e-mail fica no Supabase Auth)',
  'Entrar no sistema e responder pelo que fez', 'Execução do contrato (LGPD, art. 7º, V)', 'Escritório, para a sua equipe; T3jus, para a equipe T3jus',
  '90 dias depois de perder o último acesso',
  'A entrada (e-mail e senha) é apagada; o nome fica como autor no histórico', 'PROPOSTA', false),
 ('vinculos', true, 'Quem tem acesso a qual escritório, com que função e desde quando',
  'Dar e tirar acesso; saber quem podia agir', 'Execução do contrato (LGPD, art. 7º, V)', 'Escritório',
  'Enquanto o escritório for cliente', 'Ficam; o revogado continua como autor no histórico', 'PROPOSTA', true),
 ('sessoes_escritorio', true, 'Em que escritório a pessoa está agora',
  'Manter a pessoa no escritório escolhido', 'Execução do contrato (LGPD, art. 7º, V)', 'Escritório',
  '30 dias sem uso', 'Apagadas', 'PROPOSTA', false),
 ('limites_uso', true, 'Contadores de tentativas por e-mail e endereço de rede',
  'Barrar tentativas repetidas de senha e de recuperação', 'Legítimo interesse: segurança (LGPD, art. 7º, IX)', 'T3jus',
  'Até o fim da janela do limite, no máximo 1 dia', 'Apagados', 'PROPOSTA', false),
 ('historico', true, 'Quem fez o quê e quando, sem senha, token nem conteúdo pessoal desnecessário',
  'Auditoria e prova do que aconteceu (PT-03)', 'Execução do contrato; obrigação legal para os registros de acesso (Marco Civil da Internet, art. 15)', 'Escritório, para os eventos dele; T3jus, para os internos',
  'Eventos do escritório: enquanto for cliente e 5 anos depois. Entradas no sistema: 6 meses, o mínimo do Marco Civil',
  'Apagados no fim do prazo, com a contagem do que saiu registrada', 'PROPOSTA', true),
 ('equipe_t3', true, 'Quem é da equipe T3jus e se está ativo',
  'Dar acesso ao Console', 'Execução do contrato de trabalho (LGPD, art. 7º, V)', 'T3jus',
  'Enquanto estiver na equipe e 5 anos depois', 'Ficam como autoria; a entrada segue a regra de pessoas', 'PROPOSTA', false),
 ('equipe_funcoes', true, 'Funções de cada pessoa da equipe T3jus',
  'Limitar o que cada pessoa faz no Console (PT-24)', 'Execução do contrato de trabalho (LGPD, art. 7º, V)', 'T3jus',
  'Enquanto estiver na equipe e 5 anos depois', 'Ficam como autoria', 'PROPOSTA', false),
 ('notas_internas', true, 'Notas da equipe T3jus sobre o escritório cliente, que podem citar pessoas',
  'Atender bem o cliente', 'Legítimo interesse (LGPD, art. 7º, IX)', 'T3jus',
  'Enquanto o escritório for cliente e 5 anos depois do fim do contrato', 'Apagadas', 'PROPOSTA', false);

insert into inventario_dados (tabela, dado_pessoal, o_que) values
 ('tabelas_sem_escritorio', false, 'Motivo de cada tabela que não separa por escritório'),
 ('tabelas_internas', false, 'Lista das tabelas que o escritório nunca vê'),
 ('inventario_dados', false, 'Este inventário'),
 ('configuracoes', false, 'Prazos e limites do sistema'),
 ('app_relogio', false, 'Relógio da aplicação para os testes'),
 ('funcoes', false, 'Funções que dão acesso'),
 ('funcao_acoes', false, 'O que cada função pode fazer'),
 ('estados_iniciais', false, 'Estado com que cada registro nasce'),
 ('transicoes_permitidas', false, 'Mudanças de estado permitidas'),
 ('clientes', false, 'Estágio do escritório cliente e referência do contrato (interno)');

-- ---------------------------------------------------------------------------------------
-- Exportação completa do escritório (F0.12, regras 3 e 4).

insert into funcao_acoes (funcao, acao) values ('SOCIO', 'escritorio.exportar');

create function exportar_escritorio(p_pessoa uuid, p_escritorio uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  t        record;
  v_linhas jsonb;
  v_tabelas jsonb := '{}'::jsonb;
  v_filtro text;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'escritorio.exportar');

  for t in
    select i.tabela
      from inventario_dados i
      join information_schema.columns c
        on c.table_schema = 'public' and c.table_name = i.tabela and c.column_name = 'escritorio_id'
     where i.exportar
       and not exists (select 1 from tabelas_internas ti where ti.tabela = i.tabela)
     order by i.tabela
  loop
    -- O que é do T3jus não sai, mesmo em tabela do escritório.
    v_filtro := case t.tabela
      when 'historico' then ' and not x.interno'
      when 'vinculos' then ' and exists (select 1 from funcoes f where f.codigo = x.funcao and f.sistema = ''PORTAL'')'
      else '' end;
    execute format('select coalesce(jsonb_agg(to_jsonb(x)), ''[]''::jsonb) from %I x where x.escritorio_id = $1%s',
                   t.tabela, v_filtro)
      into v_linhas using p_escritorio;
    v_tabelas := v_tabelas || jsonb_build_object(t.tabela, v_linhas);
  end loop;

  perform registrar_historico('escritorio.exportado', 'escritorio', p_escritorio::text,
    jsonb_build_object('tabelas', (select jsonb_agg(k order by k) from jsonb_object_keys(v_tabelas) k)));

  return jsonb_build_object(
    'formato', 't3jus.exportacao.v1',
    'geradoEm', app_now(),
    'escritorio', (select to_jsonb(e) from escritorios e where e.id = p_escritorio),
    'pessoas', (
      select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'nome', p.nome) order by p.nome, p.id), '[]'::jsonb)
        from pessoas p
       where exists (select 1 from vinculos v join funcoes f on f.codigo = v.funcao
                      where v.pessoa_id = p.id and v.escritorio_id = p_escritorio and f.sistema = 'PORTAL')),
    'tabelas', v_tabelas);
end $$;

call fechar_acesso();
