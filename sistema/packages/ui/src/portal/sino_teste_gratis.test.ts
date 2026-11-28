// Os avisos do teste grátis nos dois sinos (F1.34, CO-09), com os textos do desenho aprovado em
// docs/design/aprovadas/teste-gratis (o sino tg-socio em inicio.html e os sinos tg-admin e
// tg-financeiro em carteira.html).
import { describe, expect, it } from "vitest";
import { isValidElement, type ReactNode } from "react";
import type { AvisoConsole, AvisoSino } from "@t3jus/domain";
import { descreverAviso } from "./Sino.tsx";
import { descreverAvisoConsole } from "../console/Sino.tsx";

const TESTE = "7e570000-0000-4000-8000-000000000001";
const RIBEIRO = "e5c00000-0000-4000-8000-000000000002";
// O texto de um título ou detalhe (string ou JSX com <b>), sem as marcas.
function texto(n: ReactNode): string {
  if (n === null || n === undefined || typeof n === "boolean") return "";
  if (typeof n === "string" || typeof n === "number") return String(n);
  if (Array.isArray(n)) return n.map(texto).join("");
  if (isValidElement<{ children?: ReactNode }>(n)) return texto(n.props.children);
  return "";
}

function sino(tipo: AvisoSino["tipo"], dados: AvisoSino["dados"] = {}): AvisoSino {
  return { id: "a1", tipo, origem: "testes_gratis", origemId: TESTE, em: "2026-12-04T08:00:00-03:00", lido: false,
           dados: { inicio: "2026-11-27", fim: "2026-12-03", totalDias: 7, soConsultaDesde: "2026-12-04", ...dados } };
}
function console_(tipo: AvisoConsole["tipo"], dados: AvisoConsole["dados"] = {}): AvisoConsole {
  return { id: "c1", tipo, interessadoId: null, em: "2026-12-01T16:20:00-03:00", lido: false, agora: null,
           dados: { escritorio: "Ribeiro & Matos Advocacia", escritorioId: RIBEIRO, inicio: "2026-11-27", fim: "2026-12-03", ...dados } };
}

describe("CO-09: o sino da sócia dona no teste grátis", () => {
  it("os quatro passos, com os textos do desenho", () => {
    const d1 = descreverAviso(sino("TESTE_COMECOU", { origem: "PRIMEIRO_ACESSO" }));
    expect(texto(d1.titulo)).toBe("Boas-vindas. Seu teste vai até quinta-feira, 03/12.");
    expect(d1.detalhe).toBe("O teste começou no seu primeiro acesso.");
    expect(texto(descreverAviso(sino("TESTE_ACABANDO", { faltamDias: 3 })).titulo)).toBe("Seu teste vai até quinta-feira, 03/12.");
    expect(descreverAviso(sino("TESTE_ACABANDO")).detalhe).toBe("Para continuar, fale com a equipe ou aperte Quero assinar.");
    const d7 = descreverAviso(sino("TESTE_ULTIMO_DIA"));
    expect(texto(d7.titulo)).toBe("Hoje é o último dia do seu teste.");
    expect(d7.detalhe).toBe("A partir de amanhã, 04/12, o Portal fica só para consulta até a assinatura.");
    const d8 = descreverAviso(sino("TESTE_ACABOU"));
    expect(texto(d8.titulo)).toBe("O teste terminou em 03/12. Seus dados estão guardados.");
    expect(d8.onde).toBe("Ver o plano");
    expect(d8.href).toBe("/meu-escritorio#plano");
  });
});

describe("CO-09: o sino da equipe T3jus no teste grátis", () => {
  it("o pedido para assinar, urgente no último dia", () => {
    const q = descreverAvisoConsole(console_("TESTE_QUER_ASSINAR", { quem: "Marina Ribeiro", assinaturaPreparada: true, plano: "Escritório" }), "2026-12-01");
    expect(texto(q.titulo)).toBe("Marina Ribeiro pediu para assinar: Ribeiro & Matos Advocacia");
    expect(texto(q.detalhe)).toBe("Pelo Portal. A assinatura está preparada (plano Escritório). O teste vai até quinta, 03/12.");
    expect(q.href).toBe(`/clientes/${RIBEIRO}/assinatura`);
    expect(q.selo?.tom).toBe("atencao");
    expect(descreverAvisoConsole(console_("TESTE_QUER_ASSINAR", { urgente: true, ultimoDia: true }), "2026-12-03").selo?.tom).toBe("urgente");
  });
  it("o começo, o fim chegando, o fim sem assinar e o repetido", () => {
    expect(texto(descreverAvisoConsole(console_("TESTE_COMECOU", { quem: "Marina Ribeiro" })).detalhe))
      .toBe("Primeiro acesso de Marina Ribeiro. Vai até quinta-feira, 03/12.");
    const a = descreverAvisoConsole(console_("TESTE_ACABANDO", { assinaturaPreparada: false, prorrogado: true, fim: "2026-12-04" }));
    expect(texto(a.titulo)).toBe("O teste da Ribeiro & Matos Advocacia acaba na sexta, 04/12");
    expect(texto(a.detalhe)).toBe("Prorrogado. A assinatura ainda não foi preparada.");
    const f = descreverAvisoConsole(console_("TESTE_ACABOU", { fim: "2026-11-29" }));
    expect(texto(f.detalhe)).toBe("Acabou em 29/11. Portal só para consulta desde 30/11. Proposta: encerrar como fim de contrato, com o motivo “teste não assinado”.");
    expect(f.selo?.texto).toBe("Propor encerrar");
    const r = descreverAvisoConsole(console_("TESTE_REPETIDO", { escritorio: "Ingá Advocacia", quem: "Henrique Moura", anterior: "Angico Advocacia Trabalhista", anteriorInicio: "2026-09-10" }));
    expect(texto(r.detalhe)).toBe("Henrique Moura já foi sócio da Angico Advocacia Trabalhista, que teve teste em setembro. O Portal da Ingá Advocacia está só para consulta até a decisão.");
  });
});
