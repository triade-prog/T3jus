-- 1103 · A custa adiantada com baixa sem receber volta a descontar do Rendeu (F3.192; FI-07, FI-25,
-- IN-15). Plano (v5, Parte B), aprovado na segunda revisão sem ajuste, e sim da Carol em 26/11/2026.
--
-- A regra que volta (a da 0410): o Rendeu é Entrou menos as despesas de caso adiantadas, pagas no
-- período, que não voltaram até o último dia dele. A custa que teve baixa sem receber não voltou,
-- então continua descontando, com ou sem baixa. A 1010 (seção 11) tinha tirado essa custa do
-- desconto, e perdoar as custas fazia o Rendeu subir.
--
-- Um mês fechado não muda com uma baixa ou um desfazer: o número depende só de paga_em e de
-- reembolsado_em.
--
-- O que muda: só sai uma condição do where de relatorio_adiantadas, e o retorno fica igual. Não há
-- drop nem create: o pg_get_functiondef dá CREATE OR REPLACE, e a ACL e o dono ficam. A troca é por
-- trecho exato, que para a migration se não aparecer exatamente uma vez (como a 1010, a 1100 e a
-- 1101). conta_reembolso_baixado_no_dia fica no banco, sem uso: a reversão volta a precisar dela.
-- Quem lê relatorio_adiantadas (o resumo, por cliente, um cliente, áreas, responsáveis e a
-- exportação) usa select *, soma valor e filtra, então nenhum muda. "A pagar" (o que cobrar)
-- continua sem a custa baixada (1010, seção 12).

-- ---------------------------------------------------------------------------------------
-- 0. Troca de um trecho exato numa função que já existe (cópia da t1010_trocar).
create function t1103_trocar(p_funcao regprocedure, p_de text, p_para text, p_vezes integer default 1) returns void
language plpgsql
as $$
declare
  v_def text := pg_get_functiondef(p_funcao);
  v_n integer := (length(v_def) - length(replace(v_def, p_de, ''))) / length(p_de);
begin
  if v_n <> p_vezes then raise exception 'O trecho aparece % vezes em % (esperado %): %', v_n, p_funcao, p_vezes, left(p_de, 80); end if;
  execute replace(v_def, p_de, p_para);
end $$;

-- ---------------------------------------------------------------------------------------
-- 1. Sai a condição que a 1010 acrescentou (1010:907-910).
select t1103_trocar('relatorio_adiantadas(uuid,date,date)',
  $q$     and (c.reembolsado_em is null or c.reembolsado_em > p_ate)
     and not conta_reembolso_baixado_no_dia(c.id, p_ate)$q$,
  $q$     and (c.reembolsado_em is null or c.reembolsado_em > p_ate)
     -- 1103 (F3.192): a custa com baixa sem receber não voltou e continua descontando do Rendeu.$q$);

-- ---------------------------------------------------------------------------------------
-- 2. Nada mais muda.
drop function t1103_trocar(regprocedure, text, text, integer);

call fechar_acesso();
