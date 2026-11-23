// O acerto do caso na ficha do Jurídico, sem levantamento (F3.132; EX-17, estados 3 e 4).
import { describe, expect, it } from "vitest";
import type { FichaCaso, ResumoAcertoCaso } from "@t3jus/domain";
import { hrefDoAcerto, itensDoAcerto, situacaoDoContratoNoCaso, textoAcertoNoCaso } from "./acertoCaso.ts";

const fin: ResumoAcertoCaso = {
  pendente: true, fechado: null, comValores: true, levantamentoId: null, entrou: null, exitos: [], repasses: [], faltaOutros: true, quemCuida: null,
  contratoId: "ct12", semTerceiros: true, semExito: true,
  outros: [
    { nome: "Noemi Bastos Carvalho · Parcela 6 de 6", tipo: "PARCELA", valor: 100000, prazo: "2026-11-10", cliente: "Noemi Bastos Carvalho", descricao: "Parcela 6 de 6", vencimento: "2026-11-10", junto: null },
    { nome: "Custas iniciais e diligência do oficial", tipo: "REEMBOLSO", valor: 41230, prazo: null, cliente: "Noemi Bastos Carvalho", categoria: "CUSTAS", vencimento: "2026-11-10", junto: "Parcela 6 de 6" },
  ],
  contratos: [
    { id: "ct12", numero: "C-2026-012", situacao: "ATIVO", cliente: "Noemi Bastos Carvalho", assinadoEm: "2026-05-28", encerradoEm: null, encerradoPor: null, recebido: 500000, falta: 100000, tudoRecebido: false },
    { id: "ct13", numero: "C-2026-013", situacao: "ENCERRADO", cliente: "Cláudio Carvalho", assinadoEm: "2026-05-28", encerradoEm: "2026-11-12T12:30:00Z",
      encerradoPor: { id: "f", nome: "Felipe Matos" }, recebido: 150000, falta: 0, ultimaRecebidaEm: "2026-06-02", tudoRecebido: true },
  ],
};
const caso = { encerradoEm: "2026-11-06T20:10:00Z", resultado: "PERDA" as const };
const ficha = (a: ResumoAcertoCaso) => ({ id: "k9", acerto: a, ...caso }) as unknown as FichaCaso;

describe("O acerto do caso sem levantamento (F3.132, EX-17)", () => {
  it("estado 3: a frase diz o que falta receber, e \"Ver o acerto\" leva à folha do contrato", () => {
    expect(textoAcertoNoCaso(ficha(fin))?.frase).toBe("Encerrado com perda em 06/11. Falta o acerto no Financeiro: receber a parcela 6/6 de Noemi e as custas, e encerrar.");
    expect(hrefDoAcerto(fin, "k9")).toBe("/financeiro/a-receber/contratos/ct12#t-fecha-k9");
    expect(hrefDoAcerto({ ...fin, levantamentoId: "lv1" }, "k9")).toBe("/financeiro/repasses/lv1");
    expect(hrefDoAcerto({ ...fin, pendente: false }, "k9")).toBeNull();
  });
  it("estado 3: as linhas, com Cláudio tudo recebido e as custas junto com a parcela", () => {
    const t = itensDoAcerto(fin, caso, "2026-11-18").map((x) => [x.tom, `${x.forte ?? ""}${x.texto}`, x.sub ?? ""]);
    expect(t).toEqual([
      ["ok", "Nenhum valor de terceiros entrou", "Sem levantamento, sem repasse e sem prestação de contas"],
      ["ok", "Sem êxito a cobrar", "O caso terminou com perda em 06/11"],
      ["ok", "Cláudio: tudo recebido", "C-2026-013 · R$ 1.500,00 em 02/06"],
      ["falta", "Noemi: falta a parcela 6/6, R$ 1.000,00", "Venceu em 10/11 · 8 dias de atraso"],
      ["falta", "Custas adiantadas: falta o reembolso de R$ 412,30", "Vai junto com a parcela 6/6 de Noemi"],
      ["depois", "Depois: encerrar no financeiro e o contrato C-2026-012", "Os dois de uma vez, na mesma janela"],
    ]);
  });
  it("estado 4 (PT-02): sem o Financeiro, sem valores nem número de contrato", () => {
    const larissa: ResumoAcertoCaso = { ...fin, comValores: false, outros: null, contratoId: null,
      contratos: fin.contratos.map(({ id, numero, situacao, cliente, assinadoEm, encerradoEm, encerradoPor }) => ({ id, numero, situacao, cliente, assinadoEm, encerradoEm, encerradoPor })) };
    expect(textoAcertoNoCaso(ficha(larissa))?.frase).toBe("Encerrado com perda em 06/11. O acerto está com o Financeiro.");
    expect(hrefDoAcerto(larissa, "k9")).toBeNull();
    expect(itensDoAcerto(larissa, caso, "2026-11-18").map((x) => `${x.tom}: ${x.texto}${x.sub ? ` / ${x.sub}` : ""}`)).toEqual([
      "ok: Nenhum valor de terceiros entrou",
      "ok: Sem êxito a cobrar",
      "depois: O acerto está com o Financeiro / Os valores ficam no Financeiro",
      "depois: Depois: encerrar no financeiro",
    ]);
  });
  it("a folha Contratos ligados: ativo até o acerto, e quem encerrou", () => {
    expect(situacaoDoContratoNoCaso(fin, "ct12")).toBe("ativo até o acerto");
    expect(situacaoDoContratoNoCaso(fin, "ct13")).toBe("Encerrado em 12/11, por Felipe, em Contratos");
  });
  it("com levantamento, o texto de antes continua (API sem os campos novos)", () => {
    const lev: ResumoAcertoCaso = { ...fin, semTerceiros: undefined, semExito: undefined, levantamentoId: "lv1", outros: [{ nome: "Perito", valor: 120000, prazo: "2026-11-20" }] };
    expect(textoAcertoNoCaso(ficha(lev))?.frase).toBe("Encerrado com perda em 06/11. Falta o acerto no Financeiro: pagar Perito e encerrar.");
  });
});
