import { describe, expect, it } from "vitest";
import type { PassoCliente, PassoFechamento } from "@t3jus/domain";
import { botaoDoFechamento, destinoPasso, detalheDoPassoFechamento, PASSOS_FEITOS, quemFazFechamento, textoPasso } from "./fichaLigada.ts";

const passo = (x: Partial<PassoCliente>): PassoCliente => ({ tipo: "SEM_PROPOSTA", area: "COMERCIAL", pode: true, quemPode: null, item: null, ...x });

describe("Ficha do cliente ligada: o próximo passo (F3.110)", () => {
  it("sem proposta: fazer a proposta, e o botão leva à proposta nova do cliente", () => {
    const t = textoPasso(passo({}), "Antônia Ferreira Prado");
    expect([t.titulo, t.curto, t.semAcao]).toEqual(["Fazer a proposta", "Sem proposta", null]);
    expect(destinoPasso(passo({}), "c1")).toBe("/comercial/propostas/nova?cliente=c1");
  });
  it("proposta enviada: o número, o envio e o retorno; o botão abre a resposta", () => {
    const p = passo({ tipo: "PROPOSTA_ANDAMENTO", item: { id: "p1", numero: "P-2026-014", enviadaEm: "2026-11-10T13:00:00Z", retorno: { em: "2026-11-20", vencido: false, responsavel: { id: "d", nome: "Diego Almeida" } } } });
    expect(textoPasso(p, "Antônia").oque).toBe("P-2026-014 enviada em 10/11 · retorno 20/11, com Diego.");
    expect(destinoPasso(p, "c1")).toBe("/comercial/propostas/p1?responder=1");
  });
  it("quem não tem a área vê quem pode, pelo primeiro nome", () => {
    const p = passo({ tipo: "CONTRATO_ELABORACAO", area: "CONTRATOS", pode: false, quemPode: ["Marina Ribeiro", "Felipe Matos"] });
    expect(textoPasso(p, "Antônia").semAcao).toBe("Quem registra a assinatura tem a área Contratos: Marina e Felipe.");
  });
  it("caso sem Jurídico: diz com quem está, sem link", () => {
    const p = passo({ tipo: "CASO", area: "JURIDICO", pode: false, quemPode: ["Larissa Costa"], casoResponsavel: { id: "l", nome: "Larissa Costa" } });
    const t = textoPasso(p, "Antônia");
    expect([t.oque, t.semAcao, destinoPasso(p, "c1")]).toEqual(["Caso aberto em Jurídico, com Larissa Costa.", null, null]);
  });
  it("a trilha: assinatura é o terceiro passo, o caso fecha os quatro", () => {
    expect([PASSOS_FEITOS.CONTRATO_ELABORACAO, PASSOS_FEITOS.CASO]).toEqual([2, 4]);
  });
});

describe("Jornada do cliente: o fechamento, o contrato sem caso e o fim (EX-16, CH-13)", () => {
  const CASO = { id: "k1", nome: "Ferreira Prado x INSS", resultado: "GANHO" as const, encerradoEm: "2026-10-30T15:00:00Z" };
  const exito = { tipo: "EXITO" as const, area: "FINANCEIRO" as const, feito: false, em: null, valor: 1159200, percentual: 3000 };
  const repasse = { tipo: "REPASSE" as const, area: "FINANCEIRO" as const, feito: false, em: null, valor: 2512800, prazo: "2026-11-19",
                    levantamentoId: "lv1", entrou: { tipo: "RPV", valor: 3864000, em: "2026-11-12" } };
  const fin = { tipo: "FINANCEIRO" as const, area: "FINANCEIRO" as const, feito: false, em: null, valor: 381840, pendentes: ["Parceiro", "Perito"], levantamentoId: "lv1" };
  const ctr = { tipo: "CONTRATO" as const, area: "CONTRATOS" as const, feito: false, em: null, contratos: [{ id: "ct1", numero: "C-2025-047" }] };
  const fecha = (passos: PassoFechamento[], x: Partial<PassoCliente> = {}) =>
    passo({ tipo: "FECHAMENTO", area: passos.find((p) => !p.feito)?.area ?? "FINANCEIRO", item: { caso: CASO, passos }, quemFaz: ["Marina Ribeiro", "Diego Almeida"], ...x });

  it("passo 1: conferir o êxito, com o valor e quem faz", () => {
    const p = fecha([exito, repasse, fin, ctr]);
    const t = textoPasso(p, "Antônia Ferreira Prado");
    expect([t.titulo, t.sobre, t.curto, t.detalhe]).toEqual(["Fechar o caso", "Próximo passo · fechamento", "Fechar o caso", "conferir o êxito"]);
    expect(t.oque).toBe("Ferreira Prado x INSS terminou com ganho em 30/10. Faltam 4 coisas para Antônia sair do escritório com tudo acertado.");
    expect(detalheDoPassoFechamento(exito, [exito])).toBe("Êxito de R$ 11.592,00 (30%), calculado pelo contrato");
    expect(quemFazFechamento(p)).toBe("Quem faz: a área Financeiro (Marina e Diego).");
    expect(destinoPasso(p, "c1")).toBe("/financeiro/a-receber");
  });
  it("passo 2 e 3: o repasse e o acerto levam à ficha do repasse", () => {
    const p2 = fecha([{ ...exito, feito: true, em: "2026-11-10T12:00:00Z", por: { id: "d", nome: "Diego Almeida" } }, repasse, fin, ctr]);
    expect(textoPasso(p2, "Antônia").oque).toBe("A RPV de R$ 38.640,00 entrou em 12/11. A parte de Antônia espera o repasse.");
    expect(botaoDoFechamento(repasse)).toEqual({ rotulo: "Registrar o repasse", href: "/financeiro/repasses/lv1", icone: "enviar" });
    expect(detalheDoPassoFechamento(p2.item!.passos![0]!, p2.item!.passos!)).toBe("Conferido por Diego em 10/11");
    const p3 = fecha([{ ...exito, feito: true }, { ...repasse, feito: true, em: "2026-11-13" }, fin, ctr]);
    expect(textoPasso(p3, "Antônia").oque).toBe("Antônia recebeu em 13/11. No financeiro do caso ainda faltam Parceiro e Perito.");
    expect(botaoDoFechamento(fin).rotulo).toBe("Ver o acerto");
    expect(detalheDoPassoFechamento(ctr, p3.item!.passos!)).toBe("C-2025-047, junto com o financeiro");
  });
  it("passo 4: encerrar o contrato abre a janela na ficha do contrato", () => {
    const p = fecha([{ ...exito, feito: true }, { ...fin, feito: true, em: "2026-11-17T12:00:00Z", valor: null }, ctr]);
    expect(textoPasso(p, "Antônia").oque).toBe("O caso foi encerrado no financeiro em 17/11. O contrato C-2025-047 ficou ativo, sem nada a cobrar.");
    expect(destinoPasso(p, "c1")).toBe("/contratos/contratos/ct1?encerrar=1");
    expect(detalheDoPassoFechamento(ctr, p.item!.passos!)).toBe("Não foi encerrado junto com o financeiro");
  });
  it("sem a área do passo: quem faz, sem valores (decisão 16)", () => {
    const semValor = { ...fin, valor: null, pendentes: null };
    const p = fecha([{ ...exito, feito: true }, semValor, ctr], { pode: false, quemPode: ["Marina Ribeiro", "Diego Almeida", "Bianca Lopes"] });
    expect(textoPasso(p, "Antônia").semAcao).toBe("Quem faz: a área Financeiro, que não está liberada para você. Marina, Diego e Bianca.");
    expect(detalheDoPassoFechamento(semValor, [semValor])).toBe("Falta pagar terceiros");
  });
  it("contrato ativo sem caso e cliente atendido", () => {
    const ca = passo({ tipo: "CONTRATO_ATIVO", area: "CONTRATOS", item: { id: "ct9", numero: "C-2026-040", objeto: "Consultoria trabalhista mensal",
      proximo: { vencimento: "2026-12-10", descricao: "Mensalidade 3", valor: 120000 } } });
    expect(textoPasso(ca, "Auto Peças").oque).toBe("C-2026-040 · Consultoria trabalhista mensal. Sem caso, marcado na assinatura. Próximo recebimento em 10/12, R$ 1.200,00.");
    expect(destinoPasso(ca, "c1")).toBe("/contratos/contratos/ct9");
    expect(PASSOS_FEITOS.CONTRATO_ATIVO).toBe(3);
    const at = passo({ tipo: "ATENDIDO", item: { caso: CASO, passos: [], fim: "2026-11-18T12:00:00Z" } });
    const t = textoPasso(at, "Antônia");
    expect([t.titulo, t.oque, t.detalhe]).toEqual(["Cliente atendido", "Tudo acertado em 18/11. Ferreira Prado x INSS: ganho, encerrado no escritório.", "caso encerrado e acertado em 18/11"]);
    expect(destinoPasso(at, "c1")).toBe("/comercial/propostas/nova?cliente=c1");
  });
  it("decisão 13: o contrato em elaboração avisa que entra no caso que já existe", () => {
    const p = passo({ tipo: "CONTRATO_ELABORACAO", area: "CONTRATOS", item: { id: "ct1", numero: "C-2026-031", criadoEm: "2026-11-16T12:00:00Z", juntarA: "Ferreira Prado x INSS" } });
    expect(textoPasso(p, "Antônia").oque).toBe("C-2026-031 em elaboração desde 16/11. Ao registrar, o contrato entra no caso Ferreira Prado x INSS, que já existe.");
  });
});

describe("Fechamento sem levantamento na ficha do cliente (F3.132; EX-16, FI-08)", () => {
  const CASO = { id: "k9", nome: "Carvalho x Construtora Lume", resultado: "PERDA" as const, encerradoEm: "2026-11-06T20:10:00Z" };
  const fin = { tipo: "FINANCEIRO" as const, area: "FINANCEIRO" as const, feito: false, em: null, valor: 141230, pendentes: ["parcela 6 de 6", "custas"],
                contratoId: "ct12", casoId: "k9", aVencer: null, comLevantamento: false };
  const ctr = { tipo: "CONTRATO" as const, area: "CONTRATOS" as const, feito: false, em: null, contratos: [{ id: "ct12", numero: "C-2026-012" }] };
  const fecha = (passos: PassoFechamento[], x: Partial<PassoCliente> = {}) =>
    passo({ tipo: "FECHAMENTO", area: "FINANCEIRO", item: { caso: CASO, passos }, quemFaz: ["Marina Ribeiro", "Diego Almeida", "Bianca Lopes"], ...x });

  it("estado 1: com o Financeiro, \"Ver o acerto\" leva à folha do contrato, com o caso no hash (decisão 4)", () => {
    const p = fecha([fin, ctr]);
    expect(botaoDoFechamento(fin)).toEqual({ rotulo: "Ver o acerto", href: "/financeiro/a-receber/contratos/ct12#t-fecha-k9", icone: "cadeado" });
    expect(destinoPasso(p, "c1")).toBe("/financeiro/a-receber/contratos/ct12#t-fecha-k9");
    expect(detalheDoPassoFechamento(fin, [fin, ctr])).toBe("Faltam R$ 1.412,30: parcela 6/6 e custas");
    expect(textoPasso(p, "Noemi").oque).toBe("Carvalho x Construtora Lume terminou com perda em 06/11. Falta o acerto no financeiro e encerrar o contrato.");
    expect(quemFazFechamento(p)).toBe("Quem faz: a área Financeiro (Marina, Diego e Bianca). O contrato pode ser encerrado junto.");
  });
  it("estado 2: sem o Financeiro, sem valor nem link: \"Com o Financeiro\"", () => {
    const larissa = { ...fin, valor: null, pendentes: null, contratoId: null, casoId: null };
    const p = fecha([larissa, ctr], { pode: false, quemPode: ["Marina Ribeiro"] });
    expect(botaoDoFechamento(larissa).href).toBeNull();
    expect(detalheDoPassoFechamento(larissa, [larissa, ctr])).toBe("Com o Financeiro");
    expect(textoPasso(p, "Noemi").oque).toBe("Carvalho x Construtora Lume terminou com perda em 06/11. O acerto do caso está com o Financeiro.");
  });
  it("estado 15 (pergunta 1): esperando o êxito, sem tom de atraso", () => {
    const joana = { ...fin, valor: 840000, pendentes: ["êxito de Joana"], aVencer: { vencimento: "2026-12-15", descricao: "Êxito", cliente: "Joana Pereira", exito: true } };
    const p = fecha([joana, ctr], { item: { caso: { ...CASO, nome: "Pereira x Mercado Bom Preço", resultado: "ACORDO", encerradoEm: "2026-11-18T17:50:00Z" }, passos: [joana, ctr] } });
    expect(detalheDoPassoFechamento(joana, [joana, ctr])).toBe("Esperando o êxito de Joana, em 15/12");
    expect(textoPasso(p, "Joana").oque).toBe("Pereira x Mercado Bom Preço terminou com acordo em 18/11. Nada está atrasado: o fechamento espera o êxito de Joana.");
    const parcela = { ...joana, aVencer: { vencimento: "2027-03-10", descricao: "Parcela 6 de 6", cliente: "Noemi", exito: false } };
    expect(detalheDoPassoFechamento(parcela, [parcela])).toBe("Esperando a parcela 6/6, em 10/03");
  });
  it("tudo recebido sem levantamento não diz \"repassado\"; com levantamento, continua como era", () => {
    expect(detalheDoPassoFechamento({ ...fin, valor: 0 }, [fin])).toBe("Tudo recebido");
    const lev = { tipo: "FINANCEIRO" as const, area: "FINANCEIRO" as const, feito: false, em: null, valor: 0, levantamentoId: "lv1" };
    expect(detalheDoPassoFechamento(lev, [lev])).toBe("Tudo recebido e repassado");
    expect(detalheDoPassoFechamento({ ...lev, valor: null }, [lev])).toBe("Falta pagar terceiros");
    expect(botaoDoFechamento(lev).href).toBe("/financeiro/repasses/lv1");
  });
  it("para quem tem o Financeiro, o passo sem levantamento sempre tem para onde ir", () => {
    expect(botaoDoFechamento({ ...fin, casoId: null }).href).toBe("/financeiro/a-receber/contratos/ct12#t-fecha");
  });
});
