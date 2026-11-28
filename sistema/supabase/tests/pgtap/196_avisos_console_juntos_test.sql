-- 1186 (CO-09 e CO-08): o sino do Console aceita e esconde os avisos do teste grátis e da
-- implantação, qualquer que seja a ordem em que a 1163 e a 1184 entraram.
begin;
select plan(9);

select ok(pg_get_constraintdef((select oid from pg_constraint where conname = 'avisos_console_tipo_check')) like '%' || t || '%',
          'avisos_console aceita ' || t)
  from unnest(array['TESTE_COMECOU', 'TESTE_QUER_ASSINAR', 'TESTE_REPETIDO', 'IMPLANTACAO_PRAZO', 'IMPLANTACAO_CARNE_RECUSADO', 'FATURA_ATRASO']) t;

select ok(position('console.teste.ver' in pg_get_functiondef('aviso_console_visivel(text)'::regprocedure)) > 0,
          'aviso_console_visivel: o teste grátis só com console.teste.ver');
select ok(position('console.implantacao.ver' in pg_get_functiondef('aviso_console_visivel(text)'::regprocedure)) > 0,
          'aviso_console_visivel: a implantação só com console.implantacao.ver');
select ok(position('console.implantacao.regras' in pg_get_functiondef('aviso_console_visivel(text)'::regprocedure)) > 0,
          'aviso_console_visivel: o fim da isenção só com console.implantacao.regras');

select * from finish();
rollback;
