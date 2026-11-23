// F3.134 (AP-08): os textos da folha "Prazo do comprovante", pelo desenho aprovado.
import type { PreviaPrazoComprovante, PrazoComprovanteSalvo } from "@t3jus/domain";
import { describe, expect, it } from "vitest";
import { lerDias, textoAgora, textoCaixa, textoEfeito, textoMudado, textoPedidoAberto, textoSalvo } from "./prazoComprovante.ts";

const previa = (x: Partial<PreviaPrazoComprovante>): PreviaPrazoComprovante => ({
  dias: 60, atual: 90, totalComComprovante: 41, vencidosAgora: 3, vencidosCom: 7, passamAQtd: 0, passamA: [], voltamAEmDiaQtd: 0, voltamAEmDia: [],
  listasComFrase: 4, itensComFrase: 4, ...x,
});
const salvo = (x: Partial<PrazoComprovanteSalvo>): PrazoComprovanteSalvo => ({
  validadeDias: 60, de: 90, mudou: true, passaramA: 4, voltaramAEmDia: 0, textosTrocados: 4, listasTrocadas: 4, naoCouberam: 0, ...x,
});

describe("AP-08: prazo do comprovante", () => {
  it("lê o outro prazo só de 30 a 365", () => {
    expect([lerDias("30"), lerDias("365"), lerDias("29"), lerDias("366"), lerDias("abc"), lerDias(" 120 ")]).toEqual([30, 365, null, null, null, 120]);
  });
  it("a contagem de hoje", () => {
    const t = textoAgora(3, 41, 90)!;
    expect(t.antes + t.destaque + t.depois).toBe("Hoje, 3 dos 41 comprovantes nas fichas dos clientes têm mais de 90 dias e estão em “Precisa de atenção”.");
    const um = textoAgora(1, 41, 90)!;
    expect(um.depois).toContain("tem mais de 90 dias e está em");
    expect(textoAgora(0, 0, 90)).toBeNull();
  });
  it("o efeito: passam, voltam, zero e nada", () => {
    const p = textoEfeito(60, 90, 41, previa({ passamAQtd: 4 }));
    expect(p).toEqual({ tipo: "passam", destaque: "4 comprovantes passam a ficar com “Mais de 60 dias”",
      resto: " e sobem para “Precisa de atenção” na ficha. Com os 3 que já tinham mais de 90, são 7 de 41." });
    const v = textoEfeito(180, 90, 41, previa({ dias: 180, vencidosCom: 0, voltamAEmDiaQtd: 3 }));
    expect(v).toEqual({ tipo: "voltam", destaque: "3 comprovantes voltam a “Em dia”", resto: ". Nenhum comprovante fica com mais de 180 dias." });
    expect(textoEfeito(60, 90, 0, null)).toEqual({ tipo: "zero" });
    expect(textoEfeito(null, 90, 41, null)).toEqual({ tipo: "outro" });
    expect(textoEfeito(90, 90, 41, null)).toEqual({ tipo: "atual" });
    expect(textoEfeito(85, 90, 41, previa({ vencidosCom: 3 }))).toEqual({ tipo: "nada", total: 41 });
    expect((textoEfeito(60, 90, 41, previa({ passamAQtd: 1 })) as { destaque: string }).destaque).toBe("1 comprovante passa a ficar com “Mais de 60 dias”");
  });
  it("o pedido que continua aberto", () => {
    expect(textoPedidoAberto("Antônia Ferreira Prado", "2026-07-02",
      { casoId: "c", caso: "Ferreira Prado x INSS", pedidoEm: "2026-11-18", contato: { nome: "Joana Prado", papel: "Filha" }, peloWhatsapp: true }, "2026-11-18", false))
      .toBe("O pedido de comprovante novo para o caso de Antônia, feito hoje pelo WhatsApp a Joana Prado, filha de Antônia, continua aberto. Se o de 02/07 servir, marque “Já chegou” no caso.");
    expect(textoPedidoAberto("Irene Castro", "2026-07-23", { casoId: "c", caso: "Castro x INSS", pedidoEm: "2026-11-10", contato: null, peloWhatsapp: false }, "2026-11-18", true))
      .toBe("O pedido de comprovante novo para o caso Castro x INSS, feito em 10/11, continua aberto. Se o de 23/07 servir, marque “Já chegou” no caso.");
  });
  it("a caixa do texto ao cliente", () => {
    expect(textoCaixa(90, 180, 4)).toBe("“dos últimos 90 dias” passa a “dos últimos 180 dias” no comprovante das 4 listas que dizem o prazo.");
    expect(textoCaixa(90, 60, 1)).toBe("“dos últimos 90 dias” passa a “dos últimos 60 dias” no comprovante da lista que diz o prazo.");
  });
  it("o aviso depois de salvar", () => {
    expect(textoSalvo(salvo({}), true, true)).toEqual({ titulo: "O prazo agora é de 60 dias.",
      texto: "Os selos das fichas já mudaram: 4 comprovantes passaram a “Mais de 60 dias”. O texto ao cliente passou a dizer “dos últimos 60 dias” em 4 listas. "
        + "Nenhum pedido saiu agora, e os casos já abertos não mudam: o comprovante é pedido de novo quando um caso abrir." });
    expect(textoSalvo(salvo({ textosTrocados: 0, listasTrocadas: 0 }), false, true).texto).toContain("O texto ao cliente não mudou.");
    expect(textoSalvo(salvo({ textosTrocados: 1, listasTrocadas: 1, naoCouberam: 1 }), true, true).texto).toContain("1 texto ficou como estava");
    expect(textoSalvo(salvo({ mudou: false }), true, true).titulo).toBe("O prazo continua em 60 dias.");
  });
  it("quem mudou e quando, na hora de Brasília", () => {
    expect(textoMudado(90, 60, new Date("2026-11-18T13:25:00Z"))).toBe("Mudado por você hoje, às 10h25: de 90 para 60 dias. Fica no histórico do escritório.");
  });
});
