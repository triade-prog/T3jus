-- Conversas › Avisos automáticos (F3.64; PA-03, PD-07). Tela aprovada em
-- docs/design/aprovadas/portal-conversas-automacoes (estado avisos): o que saiu sozinho pelo
-- WhatsApp nos últimos 7 dias, com o tipo, o cliente, para quem foi, quando e a situação
-- (na fila, enviada, entregue, lida, respondeu ou não entregue, com o motivo). A execução que
-- falhou antes de sair (sem WhatsApp, texto incompleto) também aparece, como não entregue.
-- Cada pessoa vê só os avisos das automações das suas áreas (automacao_visivel).

create function aviso_automatico_linha(m conversa_mensagens, e automacao_execucoes, a automacoes) returns jsonb
language sql stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', coalesce(m.id, e.id), 'mensagemId', m.id, 'execucaoId', e.id,
    'gatilho', a.gatilho, 'automacao', jsonb_build_object('id', a.id, 'nome', a.nome),
    'nome', coalesce(m.aviso_tipo, a.nome), 'detalhe', e.rotulo,
    'cliente', jsonb_build_object('id', k.id, 'nome', k.nome),
    'para', case when c.id is not null then jsonb_build_object('nome', c.nome_contato, 'papel', c.papel_contato) end,
    'conversaId', c.id,
    'em', coalesce(m.criada_em, e.terminada_em, e.iniciada_em),
    'texto', m.texto,
    'situacao', case
      when m.id is null then 'NAO_ENTREGUE'
      when m.envio = 'FALHOU' then 'NAO_ENTREGUE'
      when r.texto is not null then 'RESPONDEU'
      else m.envio end,
    'motivo', case when m.id is null then e.motivo when m.envio = 'FALHOU' then m.envio_motivo end,
    'resposta', left(r.texto, 160))
    from clientes_escritorio k
    left join conversas c on c.id = coalesce(m.conversa_id, e.conversa_id)
    left join lateral (
      select x.texto from conversa_mensagens x
       where m.id is not null and x.conversa_id = m.conversa_id and x.autor = 'CLIENTE' and x.criada_em > m.criada_em
         and not exists (select 1 from conversa_mensagens y where y.conversa_id = m.conversa_id and y.autor = 'AVISO'
                          and y.criada_em > m.criada_em and y.criada_em < x.criada_em)
       order by x.criada_em limit 1) r on true
   where k.id = e.cliente_id
$$;

create function portal_avisos_automaticos(p_pessoa uuid, p_escritorio uuid, p_gatilho text default null, p_limite integer default 20,
                                          p_pular integer default 0) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_desde timestamptz := app_now() - interval '7 days'; v_itens jsonb; v_total integer; v_falhas integer; v_tipos jsonb;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'conversas.ver');
  if p_gatilho is not null and automacao_area(p_gatilho) is null then perform recusar_campos('Tipo inválido', 'tipo'); end if;
  if coalesce(p_limite, 0) not between 1 and 100 or coalesce(p_pular, -1) < 0 then perform recusar_campos('Página inválida', 'limite'); end if;
  with lista as materialized (
    select l j, (l ->> 'em')::timestamptz em, l ->> 'gatilho' gatilho, l ->> 'situacao' = 'NAO_ENTREGUE' falha
      from (
        select aviso_automatico_linha(m, e, a) l
          from conversa_mensagens m
          join automacao_execucoes e on e.id = (m.dados ->> 'execucao')::uuid
          join automacoes a on a.id = e.automacao_id
         where m.escritorio_id = p_escritorio and m.autor = 'AVISO' and m.criada_em >= v_desde
           and automacao_visivel(p_pessoa, p_escritorio, a)
        union all
        select aviso_automatico_linha(null, e, a)
          from automacao_execucoes e join automacoes a on a.id = e.automacao_id
         where e.escritorio_id = p_escritorio and e.situacao = 'FALHOU' and e.terminada_em >= v_desde
           and automacao_visivel(p_pessoa, p_escritorio, a)
           and not exists (select 1 from conversa_mensagens m where m.conversa_id = e.conversa_id and m.dados ->> 'execucao' = e.id::text)) x),
  filtrada as (select * from lista where p_gatilho is null or gatilho = p_gatilho)
  select (select coalesce(jsonb_object_agg(g, n), '{}'::jsonb) from (select gatilho g, count(*) n from lista group by gatilho) t),
         (select count(*) from filtrada), (select count(*) from filtrada where falha),
         (select coalesce(jsonb_agg(y.j order by y.falha desc, y.em desc), '[]'::jsonb)
            from (select * from filtrada order by falha desc, em desc limit p_limite offset p_pular) y)
    into v_tipos, v_total, v_falhas, v_itens;
  return jsonb_build_object('itens', v_itens, 'total', v_total, 'naoEntregues', v_falhas, 'porTipo', v_tipos,
                            'socioDono', (select pessoa_ref(automacao_socio_dono(p_escritorio))),
                            'dono', e_socio_dono(p_pessoa, p_escritorio));
end $$;

call fechar_acesso();
