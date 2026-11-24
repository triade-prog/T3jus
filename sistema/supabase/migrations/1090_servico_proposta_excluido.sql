-- O serviço da proposta do cliente excluído a pedido do titular (F3.159; PT-11), pela decisão da
-- Carol (24/11/2026) e pelo plano revisado (project-files t3jus/f3-156/plano.md e revisao.md). Fecha
-- o M6 da revisão da F3.141: na exclusão, só o escopo saía; o serviço (texto livre, até 160 letras)
-- podia trazer o nome ("Divórcio de Maria Silva") e ficava na lista do Comercial, na ficha da
-- proposta, nos pedidos de contrato e no Word gerado depois.
--
-- 1. Na exclusão, propostas.servico vira o texto fixo "Serviço apagado a pedido do titular" (35
--    letras; cabe no check de 2 a 160 da 0190), no mesmo UPDATE do escopo: a versão sobe uma vez
--    só. A proposta sem escopo agora também sobe uma versão; a fila da 0970 (z_cliente_excluido_
--    arquivos, que roda depois pelo nome) cobre a série -v1..-vN até a versão final. Apagar um
--    caminho que não existe conta como sucesso. Sem evento novo: cliente.dados_excluidos (0170) já
--    registra a exclusão, e o escopo também saía sem evento.
-- 2. O serviço não volta pela edição: proposta_conferir (0190) exige o cliente ATIVO.
-- 3. Os clientes já excluídos ficam para a 1091, que chama propostas_servico_preencher_excluidos.
--    A função também reabre na fila o Word da última versão de antes da troca: um Word baixado
--    depois de a fila concluir regravou -v<versão final> com o serviço antigo, e o banco não sabe se
--    isso aconteceu (1030). A linha reaberta espera 15 minutos, como na 0970.
--
-- Função recriada e de onde parte:
--   comercial_apagar_do_excluido ........ 0190 (nunca recriada depois)
-- Novas: servico_apagado_texto, propostas_servico_preencher_excluidos (a 1091 chama).
--
-- Fica para outro item (F3.172, PT-11): o sino guarda uma cópia do serviço e do nome do cliente em
-- avisos_sino.dados (proposta_resumo_aviso da 0532, no PEDIDO_CONTRATO; e o CLIENTE_FEZ_18 da 0830).

-- ---------------------------------------------------------------------------------------
-- 1. O texto fixo.
create function servico_apagado_texto() returns text
language sql
immutable
as $$ select 'Serviço apagado a pedido do titular'::text $$;

-- ---------------------------------------------------------------------------------------
-- 2. Na exclusão: corpo da 0190, com o serviço no mesmo UPDATE do escopo.
create or replace function comercial_apagar_do_excluido() returns trigger
language plpgsql
set search_path = public
as $$
begin
  delete from retornos_cliente where cliente_id = new.id;
  update propostas set escopo = null, servico = servico_apagado_texto()
   where cliente_id = new.id and (escopo is not null or servico is distinct from servico_apagado_texto());
  return new;
end $$;

-- ---------------------------------------------------------------------------------------
-- 3. Os clientes excluídos antes desta migration (a 1091 chama). No molde de
-- arquivos_apagar_preencher_excluidos (0970): liga as marcas fim_da_guarda (para ver as linhas sob
-- o RLS forçado) e aplicando_prazos (trava do contrato só de consulta) só durante a chamada e as
-- devolve como estavam. Para cada proposta de cliente EXCLUIDO que ainda tem o serviço livre (ou o
-- escopo), troca o serviço, limpa o escopo e reabre na fila o .docx da versão de antes da troca:
--   * a linha concluída volta a pendente (tentativas zeradas, sem erro, conferir_ate em 15 min);
--   * a linha que ainda espera fica como está (a rota já vai apagar);
--   * sem linha (cliente excluído antes da 0970 e ainda sem a 0971), a linha entra.
-- Quando a linha reaberta conclui, rotina_arquivos_apagar_registrar solta de novo o
-- cliente.arquivos_apagados daquele cliente (é a limpeza do Word gerado depois da exclusão).
-- Devolve {escritório: {propostas, docxReabertos}}, com docxReabertos contando as linhas reabertas
-- e as que entraram. Idempotente: chamada de novo, não acha nada.
create function propostas_servico_preencher_excluidos() returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_guarda text := coalesce(current_setting('t3jus.fim_da_guarda', true), '');
  v_prazos text := coalesce(current_setting('t3jus.aplicando_prazos', true), '');
  r record;
  v_caminho text;
  v_docx integer;
  v_esc jsonb := '{}'::jsonb;
  v_um jsonb;
begin
  perform limpar_contexto();
  perform set_config('t3jus.fim_da_guarda', 'on', true);
  perform set_config('t3jus.aplicando_prazos', 'on', true);
  for r in select p.id, p.escritorio_id, p.cliente_id, p.versao
             from propostas p join clientes_escritorio c on c.id = p.cliente_id
            where c.estado = 'EXCLUIDO'
              and (p.servico is distinct from servico_apagado_texto() or p.escopo is not null)
            order by p.escritorio_id, p.id
            for update of p loop
    update propostas set escopo = null, servico = servico_apagado_texto() where id = r.id;

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

    v_um := coalesce(v_esc -> r.escritorio_id::text, '{"propostas": 0, "docxReabertos": 0}'::jsonb);
    v_esc := v_esc || jsonb_build_object(r.escritorio_id::text, jsonb_build_object(
      'propostas', (v_um ->> 'propostas')::integer + 1,
      'docxReabertos', (v_um ->> 'docxReabertos')::integer + v_docx));
  end loop;
  perform set_config('t3jus.fim_da_guarda', v_guarda, true);
  perform set_config('t3jus.aplicando_prazos', v_prazos, true);
  return v_esc;
end $$;

-- ---------------------------------------------------------------------------------------
-- 4. Inventário (PT-11): muda só o destino no pedido do titular. Texto da 0970 com o serviço;
-- a situação continua APROVADO, com o ok da Carol antes do merge.
update inventario_dados
   set no_fim = 'Exportadas ao escritório e apagadas com ele. A pedido do titular, saem o que está incluído e os .docx gerados, e o serviço vira um texto fixo'
 where tabela = 'propostas';

call fechar_acesso();
