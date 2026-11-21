-- As próximas audiências no Início do Portal (F3.2, EX-06: "as próximas aparecem na tela
-- inicial"). Desenho aprovado em docs/design/aprovadas/portal-inicio-audiencias (Carol,
-- 21/11/2026): dentro da folha "Agenda de hoje", da equipe toda, só audiências marcadas, de
-- amanhã até 7 dias depois, no máximo 3, as mais próximas primeiro; com o total no período e a
-- seguinte depois da janela, para o pé e o vazio. Todos do escritório veem, como a Agenda.
-- Uma consulta própria, para o trecho carregar e falhar sozinho. Nenhuma tabela nova.

create function portal_inicio_audiencias(p_pessoa uuid, p_escritorio uuid) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_de date := hoje_brasilia() + 1;
  v_ate date := hoje_brasilia() + 7;
begin
  perform entrar_escritorio(p_pessoa, p_escritorio, 'agenda.ver');
  return jsonb_build_object(
    'de', v_de, 'ate', v_ate,
    'total', (select count(*) from compromissos c
               where c.escritorio_id = p_escritorio and c.tipo = 'AUDIENCIA' and c.estado = 'MARCADO'
                 and (c.inicio at time zone 'America/Sao_Paulo')::date between v_de and v_ate),
    'itens', coalesce((select jsonb_agg(compromisso_linha(x) order by x.inicio, x.id) from (
                select c.* from compromissos c
                 where c.escritorio_id = p_escritorio and c.tipo = 'AUDIENCIA' and c.estado = 'MARCADO'
                   and (c.inicio at time zone 'America/Sao_Paulo')::date between v_de and v_ate
                 order by c.inicio, c.id limit 3) x), '[]'::jsonb),
    'seguinte', (select jsonb_build_object('id', c.id, 'inicio', c.inicio, 'titulo', c.titulo) from compromissos c
                  where c.escritorio_id = p_escritorio and c.tipo = 'AUDIENCIA' and c.estado = 'MARCADO'
                    and (c.inicio at time zone 'America/Sao_Paulo')::date > v_ate
                  order by c.inicio, c.id limit 1));
end $$;

call fechar_acesso();
