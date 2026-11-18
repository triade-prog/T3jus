import { describe, expect, it } from "vitest";
import { mascararEmail, motivoSuporteSchema, tirarAutenticadorSchema } from "@t3jus/domain";
import { agruparPorDiaSuporte, fraseSuporte, marcarTermo, situacaoAcesso, telefoneParaConferir } from "./suporte.ts";

const esc = (conviteEnviadoEm: string, telefone: string | null = null) => ({
  id: "e", nome: "Ribeiro & Matos", papel: "SOCIO" as const, conviteEnviadoEm, telefone,
});

describe("suporte de acesso (PT-23)", () => {
  it("mascara o e-mail nas janelas, sem mostrar o endereço inteiro", () => {
    expect(mascararEmail("marina@ribeiromatos.adv.br")).toBe("ma***@ribeiromatos.adv.br");
    expect(mascararEmail("a@x.com")).toBe("a***@x.com");
    expect(mascararEmail("sem-arroba")).toBe("***");
  });

  it("motivo é obrigatório e tirar o autenticador exige conferir a identidade", () => {
    expect(motivoSuporteSchema.safeParse({ motivo: "   " }).success).toBe(false);
    expect(motivoSuporteSchema.safeParse({ motivo: "x".repeat(301) }).success).toBe(false);
    expect(tirarAutenticadorSchema.safeParse({ motivo: "Perdeu o celular", identidadeConferida: false }).success).toBe(false);
    expect(tirarAutenticadorSchema.safeParse({ motivo: "Perdeu o celular", identidadeConferida: true }).success).toBe(true);
  });

  it("situação: em dia com senha; sem senha, o convite vale 1 hora", () => {
    const agora = new Date("2026-11-18T18:30:00Z");
    expect(situacaoAcesso({ senhaCriadaEm: "2026-11-01T10:00:00Z", escritorios: [esc("2026-10-01T10:00:00Z")] }, agora)).toBe("EM_DIA");
    expect(situacaoAcesso({ senhaCriadaEm: null, escritorios: [esc("2026-11-18T18:00:00Z")] }, agora)).toBe("CONVITE_PENDENTE");
    expect(situacaoAcesso({ senhaCriadaEm: null, escritorios: [esc("2026-11-18T17:00:00Z")] }, agora)).toBe("CONVITE_VENCIDO");
    // Vale o convite mais novo entre os escritórios.
    expect(situacaoAcesso({ senhaCriadaEm: null, escritorios: [esc("2026-11-18T10:00:00Z"), esc("2026-11-18T18:10:00Z")] }, agora)).toBe("CONVITE_PENDENTE");
  });

  it("o telefone para conferir vem da ficha do escritório", () => {
    expect(telefoneParaConferir({ escritorios: [esc("x"), { ...esc("x", "(11) 3256-4410"), nome: "Cedro" }] })).toEqual({ escritorio: "Cedro", telefone: "(11) 3256-4410" });
    expect(telefoneParaConferir({ escritorios: [esc("x")] })).toBeNull();
  });

  it("histórico: frase, aparelhos e o dia de hoje marcado", () => {
    expect(fraseSuporte({ acao: "suporte.tirou_autenticador", dados: { aparelhos: 2, identidade_conferida: true } })).toEqual({
      fez: "tirou o autenticador", detalhe: "Identidade conferida pelo telefone da ficha · 2 aparelhos desconectados",
    });
    expect(fraseSuporte({ acao: "suporte.desconectou", dados: { aparelhos: 1 } }).detalhe).toBe("1 aparelho desconectado");
    const g = agruparPorDiaSuporte([{ ocorridoEm: "2026-11-18T18:00:00Z" }, { ocorridoEm: "2026-11-14T19:40:00Z" }], new Date("2026-11-18T20:00:00Z"));
    expect(g.map((x) => x.dia)).toEqual(["18/11/2026 · hoje", "14/11/2026"]);
  });

  it("marca o termo buscado no nome, sem montar HTML", () => {
    expect(marcarTermo("Marina Ribeiro", "mari")).toEqual([{ t: "Mari", marca: true }, { t: "na Ribeiro", marca: false }]);
    expect(marcarTermo("Marina Ribeiro", "@ribeiro")).toEqual([{ t: "Marina Ribeiro", marca: false }]);
  });
});
