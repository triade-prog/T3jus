import { describe, expect, it } from "vitest";
import { textoAvisoEtapa } from "@t3jus/domain";
import * as mod from "./juridico.ts";
import { botaoMudar, fraseAvisoEtapa, juntarNomes, situacaoEnvioEtapa, linhaProcesso, posicaoEtapa, proximaEtapa, telefoneBr } from "./juridico.ts";

const etapas = [1, 2, 3, 4, 5, 6, 7, 8].map((ordem) => ({ ordem, nome: `E${ordem}` }));

describe("Jurídico, casos (EX-01, EX-03, EX-14)", () => {
  it("a linha do processo mostra o número no padrão do CNJ ou que ainda não tem", () => {
    expect(linhaProcesso({ numero: "10012347720265020011", area: "TRABALHISTA" })).toBe("1001234-77.2026.5.02.0011 · Trabalhista");
    expect(linhaProcesso({ numero: null, area: "FAMILIA" })).toBe("Sem número ainda · Família");
  });

  it("posição e próxima etapa", () => {
    expect(posicaoEtapa(5, etapas)).toBe("5 de 8");
    expect(proximaEtapa(5, etapas)).toBe("E6");
    expect(proximaEtapa(8, etapas)).toBeNull();
  });

  it("o botão diz para onde vai e se avisa", () => {
    expect(botaoMudar("Recurso", false, true)).toBe("Mudar para Recurso e avisar");
    expect(botaoMudar("Encerrado", true, false)).toBe("Encerrar o caso");
    expect(botaoMudar(null, false, true)).toBe("Mudar etapa");
  });

  it("nomes e telefone", () => {
    expect(juntarNomes(["Joana", "Carlos"])).toBe("Joana e Carlos");
    expect(juntarNomes(["A", "B", "C"])).toBe("A, B e C");
    expect(telefoneBr("+5511985521034")).toBe("(11) 98552-1034");
  });

  it("o aviso ao cliente igual ao do servidor", () => {
    expect(textoAvisoEtapa("Joana Pereira", "Ribeiro & Matos", "Joana x Mercado Bom Preço", "vamos pedir para o tribunal rever a decisão."))
      .toBe("Olá, Joana. Aqui é do escritório Ribeiro & Matos. Novidade no caso Joana x Mercado Bom Preço: vamos pedir para o tribunal rever a decisão. Qualquer dúvida, é só responder esta mensagem.");
  });
});

describe("Aviso de etapa pela fila do WhatsApp (F3.37)", () => {
  it("diz se o aviso sai", () => {
    expect(fraseAvisoEtapa({ whatsappLigado: true, automacaoLigada: true }).sai).toBe(true);
    expect(fraseAvisoEtapa({ whatsappLigado: false, automacaoLigada: true }).texto).toContain("ainda não está ligado");
    expect(fraseAvisoEtapa({ whatsappLigado: true, automacaoLigada: false }).texto).toContain("está desligada");
    expect(fraseAvisoEtapa(undefined).sai).toBe(false);
  });
  it("a situação de cada cliente", () => {
    const c = { id: "1", nome: "Eduardo Nascimento" };
    expect(situacaoEnvioEtapa({ cliente: c, situacao: "CONCLUIDA", motivo: null, mensagem: { envio: "LIDA", em: "2026-12-01T13:15:00Z", envioEm: null, motivo: null } })).toBe("lido");
    expect(situacaoEnvioEtapa({ cliente: c, situacao: "FICOU_DE_FORA", motivo: "Sem WhatsApp no contato principal da ficha.", mensagem: null }))
      .toBe("não saiu: sem WhatsApp no contato principal da ficha.");
    expect(situacaoEnvioEtapa({ cliente: c, situacao: null, motivo: null, mensagem: null })).toBe("ainda não saiu");
  });
});

describe("Jurídico, prazos e tarefas (EX-02, EX-04)", () => {
  const hoje = "2026-11-18"; // quarta
  it("a urgência vem escrita", () => {
    const { urgenciaPrazo, urgenciaTarefa, textoFazerAte } = mod;
    expect(urgenciaPrazo("2026-11-18", hoje)).toEqual({ texto: "Vence hoje", tom: "urgente" });
    expect(urgenciaPrazo("2026-11-19", hoje).texto).toBe("Amanhã");
    expect(urgenciaPrazo("2026-11-21", hoje).texto).toBe("Em 3 dias");
    expect(urgenciaPrazo("2026-11-16", hoje).texto).toBe("Venceu 16/11");
    expect(urgenciaTarefa("2026-11-17", hoje).texto).toBe("Venceu ontem");
    expect(urgenciaTarefa("2026-11-20", hoje).texto).toBe("20/11 · sex");
    expect(textoFazerAte("2026-11-18", hoje)).toBe("fazer até hoje");
  });
  it("os grupos de prazos e de tarefas", () => {
    const { gruposPrazos, gruposTarefas, textoEsperando } = mod;
    const p = ["2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20", "2026-11-26"].map((dataFinal) => ({ dataFinal }));
    expect(gruposPrazos(p, hoje).map((g) => [g.titulo, g.itens.length])).toEqual([
      ["Vencidos", 1], ["Hoje · quarta, 18/11", 1], ["Amanhã · quinta, 19/11", 1], ["Até sexta", 1], ["Depois", 1],
    ]);
    const t = [{ venceEm: "2026-11-17", esperando: null }, { venceEm: "2026-11-18", esperando: null }, { venceEm: "2026-11-17", esperando: "o cliente" }];
    expect(gruposTarefas(t, hoje).map((g) => g.chave)).toEqual(["atrasadas", "hoje", "esperando"]);
    expect(textoEsperando("o cliente: CTPS digital", "2026-11-10", hoje)).toBe("Esperando o cliente: CTPS digital, há 8 dias");
  });
});
