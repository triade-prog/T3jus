-- O "sobre" das condições ÊXITO e RECORRENTE do cliente excluído a pedido do titular (F3.179; PT-11,
-- CH-06), pelo plano revisado (project-files t3jus/f3-180/plano.md, seção 6, e revisao.md, G1 e M1).
-- Decisões da Carol: D3, o "sobre" vira o texto fixo "Base apagada a pedido do titular" na exclusão,
-- na proposta e na cópia do aviso PEDIDO_CONTRATO; D4, a etapa, o reajuste e o nome do ATO ficam
-- como estão (descrevem o serviço, não a pessoa).
--
-- A causa. honorario_condicoes.params (0190) guarda, no ÊXITO e no RECORRENTE, o "sobre" (texto livre
-- de 2 a 120 letras, por exemplo "do que Maria receber do INSS"). A exclusão trocava o serviço e
-- apagava o escopo da proposta (1090), mas não tocava nas condições. O aviso PEDIDO_CONTRATO copia as
-- condições inteiras em avisos_sino.dados.condicoes (proposta_resumo_aviso, 0532), e
-- aviso_sino_dados_do_excluido (1110 e 1114) deixava essa chave como estava. O inventário dizia que
-- honorario_condicoes não tem dado pessoal; com o "sobre" livre, isso não se sustenta.
--
-- 1. condicao_sobre_apagado_texto(): o texto fixo (32 letras, cabe no check de 2 a 120 da 0190; a
--    tela lê "30% da base apagada a pedido do titular", porque o de() de honorarios.ts trata "base"
--    como feminino). condicao_do_excluido(tipo, params): a condição com o "sobre" trocado, só no
--    ÊXITO e no RECORRENTE e só quando a chave existe. Pura e idempotente. Serve às duas trocas: a
--    linha de honorario_condicoes (tipo na coluna) e o elemento do aviso (tipo dentro do elemento).
-- 2. Na exclusão: comercial_apagar_do_excluido (corpo da 1090) troca, depois do UPDATE das propostas
--    e numa instrução própria, o "sobre" das condições das propostas do cliente. A ordem propostas →
--    condições é a mesma de portal_proposta_editar (0190: UPDATE da proposta, depois honorario_gravar,
--    que apaga e reinsere as condições). A edição que confirma enquanto a exclusão espera a proposta já
--    está visível quando o UPDATE das condições começa (READ COMMITTED, instrução nova); a edição que
--    chega depois cai em conflito de versão, porque a exclusão subiu a versão da proposta (1090).
--    As condições de dona CONTRATO não entram: o contrato de qualquer situação prende o cliente (0460,
--    1118; F3.195).
-- 3. No sino: aviso_sino_dados_do_excluido recriada a partir do corpo EM VIGOR, o da 1114 (revisão,
--    G1), com o ramo das conversas igual e uma linha a mais no ramo das outras origens: quando
--    dados.condicoes é uma lista, cada elemento ÊXITO ou RECORRENTE com "sobre" ganha o texto fixo, na
--    mesma ordem. Continua pura e idempotente. O guardião (avisos_sino_guardiao, 1114) e o nascer
--    (avisos_sino_nasce, 1114) chamam esta função e passam a aceitar e a aplicar a troca nova sem
--    serem recriados.
-- 4. O Word já gerado. Na exclusão, nada novo: a fila da 0970 (z_cliente_excluido_arquivos, que roda
--    depois pelo nome) já cobre -v1..-v<final>. Nos já excluídos, honorario_sobre_preencher_excluidos
--    reabre na fila o .docx da última versão de cada proposta trocada, como a 1090, porque um Word
--    baixado depois da fila concluir regravou -v<final> com o "sobre" antigo.
-- 5. Os já excluídos ficam para a 1136 (sem volta): honorario_sobre_preencher_excluidos() e, de novo,
--    avisos_sino_preencher_excluidos() (1110), que com a função nova acha os PEDIDO_CONTRATO com o
--    "sobre" antigo.
-- 6. Inventário: honorario_condicoes passa a ter dado pessoal (todos os campos no mesmo UPDATE, pelos
--    dois checks da 0070; precedente 0890), aprovado, com o ok da Carol antes do merge; propostas e
--    avisos_sino citam o "sobre" no destino a pedido do titular (revisão, M1: até 200 letras, e as
--    frases que os pgTAP 133, 141, 150 e 155 procuram continuam lá).
--
-- O que fica (README, "Arquivos do cliente excluído"):
--   - o histórico proposta.editada guarda condicoes_antes e condicoes_depois (0190) com o "sobre", para
--     sempre (o histórico só recebe inserção, PT-03), como a cópia do detalhe da dispensa (1116);
--   - a etapa, o reajuste e o nome de cada ATO (D4);
--   - se um dia alguém chamar honorario_gravar fora da edição sem travar a proposta antes, a ordem
--     propostas → condições quebra (anotado no README, no Comercial).
--
-- Testes: pgTAP 168 (168_sobre_condicao_excluido_test.sql), Vitest em honorarios.test.ts (a frase da
-- tela) e tests/concorrencia/exclusao-sino-simultaneo.sh (o "sobre" do aviso nos cenários 1 e 2, e o
-- cenário 3: a edição segura a proposta e a exclusão troca o "sobre" gravado por ela).
-- Ordem da publicação (painel, P26): a contagem só de leitura (project-files
-- t3jus/f3-180/contagem-antes-1136.sql); esta 1135; com o ok da Carol, a 1136, e conferir {} nas duas
-- funções na segunda chamada. Nada a publicar no Portal, na api-portal nem na api-console. Se for
-- preciso voltar: recriar comercial_apagar_do_excluido da 1090 e aviso_sino_dados_do_excluido da 1114;
-- o que a 1136 trocar não volta.
--
-- Funções recriadas e de onde partem (cada uma copiada inteira da versão mais nova, com language,
-- volatilidade e search_path, e só o que está dito trocado):
--   comercial_apagar_do_excluido ........ 1090 (o UPDATE das condições depois do das propostas)
--   aviso_sino_dados_do_excluido ........ 1114 (a linha das condições no ramo das outras origens)
-- Novas: condicao_sobre_apagado_texto, condicao_do_excluido, honorario_sobre_preencher_excluidos (a
-- 1136 chama). Nenhuma é security definer.

-- ---------------------------------------------------------------------------------------
-- 1. Funções puras.
create function condicao_sobre_apagado_texto() returns text
language sql
immutable
as $$ select 'Base apagada a pedido do titular'::text $$;

-- A condição depois da exclusão: no ÊXITO e no RECORRENTE com "sobre", o texto fixo; o resto igual.
create function condicao_do_excluido(p_tipo text, p_params jsonb) returns jsonb
language sql
immutable
as $$
  select case when p_tipo in ('EXITO', 'RECORRENTE') and jsonb_typeof(p_params) = 'object' and p_params ? 'sobre'
              then p_params || jsonb_build_object('sobre', condicao_sobre_apagado_texto())
              else p_params end
$$;

-- ---------------------------------------------------------------------------------------
-- 2. Na exclusão: corpo da 1090, com o UPDATE das condições numa instrução própria, depois do das
-- propostas (a ordem da edição).
create or replace function comercial_apagar_do_excluido() returns trigger
language plpgsql
set search_path = public
as $$
begin
  delete from retornos_cliente where cliente_id = new.id;
  update propostas set escopo = null, servico = servico_apagado_texto()
   where cliente_id = new.id and (escopo is not null or servico is distinct from servico_apagado_texto());
  update honorario_condicoes h set params = condicao_do_excluido(h.tipo, h.params)
   where h.escritorio_id = new.escritorio_id and h.dono_tipo = 'PROPOSTA'
     and h.dono_id in (select p.id from propostas p where p.escritorio_id = new.escritorio_id and p.cliente_id = new.id)
     and h.params is distinct from condicao_do_excluido(h.tipo, h.params);
  return new;
end $$;

-- ---------------------------------------------------------------------------------------
-- 3. No sino: corpo da 1114 (o ramo das conversas igual), com as condições no ramo das outras
-- origens. Só troca a chave que existe; idempotente.
create or replace function aviso_sino_dados_do_excluido(a avisos_sino) returns jsonb
language sql
stable
set search_path = public
as $$
  select case when a.origem_tabela = 'conversas' then
           (a.dados - array['contato', 'trecho', 'recado', 'arquivo', 'texto']) || jsonb_build_object('conversa', 'Cliente excluído')
         else
           (a.dados - case when a.tipo = 'CLIENTE_FEZ_18' then array['em', 'quem'] else '{}'::text[] end)
           || case when a.dados ? 'cliente' then jsonb_build_object('cliente', 'Cliente excluído') else '{}'::jsonb end
           || case when a.dados ? 'servico' then jsonb_build_object('servico', servico_apagado_texto()) else '{}'::jsonb end
           || case when jsonb_typeof(a.dados -> 'condicoes') = 'array' then jsonb_build_object('condicoes',
                (select coalesce(jsonb_agg(condicao_do_excluido(x.c ->> 'tipo', x.c) order by x.n), '[]'::jsonb)
                   from jsonb_array_elements(a.dados -> 'condicoes') with ordinality x(c, n)))
              else '{}'::jsonb end
         end
$$;

-- ---------------------------------------------------------------------------------------
-- 4. Os clientes excluídos antes desta migration (a 1136 chama). No molde de
-- propostas_servico_preencher_excluidos (1090): liga as marcas fim_da_guarda (para ver as linhas sob
-- o RLS forçado) e aplicando_prazos (a trava do contrato só de consulta) só durante a chamada e as
-- devolve como estavam. Para cada proposta de cliente EXCLUIDO com condição de "sobre" livre, trava a
-- proposta (a ordem propostas → condições, a mesma da exclusão e da edição), troca o "sobre" e reabre
-- na fila o .docx da versão final (a versão da proposta não muda aqui):
--   * a linha concluída volta a pendente (tentativas zeradas, sem erro, conferir_ate em 15 min);
--   * a linha que ainda espera fica como está (a rota já vai apagar);
--   * sem linha, a linha entra.
-- Devolve {escritório: {propostas, condicoes, docxReabertos}}, e {} quando não há nada. Idempotente:
-- chamada de novo, não acha nada.
create function honorario_sobre_preencher_excluidos() returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_guarda text := coalesce(current_setting('t3jus.fim_da_guarda', true), '');
  v_prazos text := coalesce(current_setting('t3jus.aplicando_prazos', true), '');
  r record;
  v_caminho text;
  v_cond integer;
  v_docx integer;
  v_esc jsonb := '{}'::jsonb;
  v_um jsonb;
begin
  perform limpar_contexto();
  perform set_config('t3jus.fim_da_guarda', 'on', true);
  perform set_config('t3jus.aplicando_prazos', 'on', true);
  for r in select p.id, p.escritorio_id, p.cliente_id, p.versao
             from propostas p join clientes_escritorio c on c.id = p.cliente_id and c.escritorio_id = p.escritorio_id
            where c.estado = 'EXCLUIDO'
              and exists (select 1 from honorario_condicoes h
                           where h.escritorio_id = p.escritorio_id and h.dono_tipo = 'PROPOSTA' and h.dono_id = p.id
                             and h.params is distinct from condicao_do_excluido(h.tipo, h.params))
            order by p.escritorio_id, p.id
            for update of p loop
    update honorario_condicoes h set params = condicao_do_excluido(h.tipo, h.params)
     where h.escritorio_id = r.escritorio_id and h.dono_tipo = 'PROPOSTA' and h.dono_id = r.id
       and h.params is distinct from condicao_do_excluido(h.tipo, h.params);
    get diagnostics v_cond = row_count;

    v_caminho := r.escritorio_id::text || '/propostas/' || r.id::text || '-v' || greatest(r.versao, 1)::text || '.docx';
    update arquivos_apagar set concluido_em = null, tentativas = 0, ultimo_erro = null,
                               conferir_ate = app_now() + interval '15 minutes'
     where bucket = 'documentos-portal' and caminho = v_caminho and concluido_em is not null;
    get diagnostics v_docx = row_count;
    if v_docx = 0 then
      insert into arquivos_apagar (escritorio, bucket, caminho, motivo, cliente_id, conferir_ate)
      values (r.escritorio_id, 'documentos-portal', v_caminho, 'EXCLUSAO_TITULAR', r.cliente_id, app_now() + interval '15 minutes')
      on conflict (bucket, caminho) do nothing;
      get diagnostics v_docx = row_count;
    end if;

    v_um := coalesce(v_esc -> r.escritorio_id::text, '{"propostas": 0, "condicoes": 0, "docxReabertos": 0}'::jsonb);
    v_esc := v_esc || jsonb_build_object(r.escritorio_id::text, jsonb_build_object(
      'propostas', (v_um ->> 'propostas')::integer + 1,
      'condicoes', (v_um ->> 'condicoes')::integer + v_cond,
      'docxReabertos', (v_um ->> 'docxReabertos')::integer + v_docx));
  end loop;
  perform set_config('t3jus.fim_da_guarda', v_guarda, true);
  perform set_config('t3jus.aplicando_prazos', v_prazos, true);
  return v_esc;
end $$;

-- ---------------------------------------------------------------------------------------
-- 5. Inventário (PT-11). honorario_condicoes passa a ter dado pessoal: todos os campos no mesmo
-- UPDATE (checks da 0070). O prazo é o das propostas e dos contratos, donos das condições (revisão,
-- m5). As outras duas mudam só o destino no pedido do titular. Situação APROVADO, com o ok da Carol
-- antes do merge.
update inventario_dados
   set dado_pessoal = true,
       o_que = 'Condições de honorário das propostas e dos contratos: tipo, valores, datas, percentuais, etapas e sobre o quê (texto livre)',
       para_que = 'Combinar e cobrar os honorários da proposta e do contrato (AP-05, CH-01)',
       base_legal = 'Procedimentos preliminares e execução de contrato, a pedido do titular (LGPD, art. 7º, V)',
       controlador = 'Escritório',
       prazo = 'Enquanto o escritório for cliente do T3jus',
       no_fim = 'Exportadas ao escritório e apagadas com ele. A pedido do titular, o sobre das condições de êxito e recorrente da proposta vira texto fixo',
       situacao = 'APROVADO'
 where tabela = 'honorario_condicoes';
update inventario_dados
   set no_fim = 'Exportadas ao escritório e apagadas com ele. A pedido do titular, saem o que está incluído e os .docx gerados, e o serviço vira um texto fixo, como o sobre das condições de êxito e recorrente'
 where tabela = 'propostas';
update inventario_dados
   set no_fim = 'Exportados ao escritório e apagados com ele. A pedido do titular, viram texto fixo o cliente, o serviço e o sobre das condições; saem a data dos 18 anos, quem assinava e o texto da conversa apagada'
 where tabela = 'avisos_sino';

call fechar_acesso();
