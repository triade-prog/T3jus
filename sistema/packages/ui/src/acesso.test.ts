// Telas de acesso: link de acesso, QR do autenticador, regras da senha, convite e escolha do escritório.
import { describe, expect, it } from "vitest";
import { imagemQr, lerLinkDoEndereco } from "./Entrar.tsx";
import { chamarApi, textoDoErro } from "./api.ts";
import { textoConvite } from "./CriarSenha.tsx";
import { filtrarEscritorios, metaEscritorio, quandoEntrou } from "./EscolherEscritorio.tsx";
import { estadoTamanho, textoFaltam } from "./pecas.tsx";

describe("link de acesso", () => {
  it("lê o token e mantém conectado em /entrar/link", () => {
    expect(lerLinkDoEndereco({ pathname: "/entrar/link", search: "?token_hash=abc" })).toEqual({ tokenHash: "abc", manterConectado: true });
  });
  it("/entrar/link/sessao quer dizer até fechar o navegador", () => {
    expect(lerLinkDoEndereco({ pathname: "/entrar/link/sessao/", search: "?token_hash=abc" })).toEqual({ tokenHash: "abc", manterConectado: false });
  });
  it("sem token, nada a trocar", () => {
    expect(lerLinkDoEndereco({ pathname: "/entrar/link", search: "" }).tokenHash).toBeNull();
  });
});

describe("QR do autenticador", () => {
  it("SVG cru vira data: codificado", () => {
    expect(imagemQr("<svg/>")).toBe("data:image/svg+xml;charset=utf-8,%3Csvg%2F%3E");
  });
  it("data: do Auth em utf-8 também", () => {
    expect(imagemQr("data:image/svg+xml;utf-8,<svg/>")).toBe("data:image/svg+xml;charset=utf-8,%3Csvg%2F%3E");
  });
});

describe("chamarApi", () => {
  const resposta = (status: number, corpo: unknown) => () => Promise.resolve(new Response(JSON.stringify(corpo), { status }));
  it("traduz o código do erro em texto", async () => {
    const r = await chamarApi("/v1/auth/entrar", { corpo: {}, buscar: resposta(401, { erro: { codigo: "INVALID_CREDENTIALS" } }) });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(textoDoErro(r.erro)).toBe("E-mail ou senha não conferem.");
  });
  it("código desconhecido não chega à tela", async () => {
    const r = await chamarApi("/x", { buscar: resposta(500, { erro: { codigo: "QUALQUER" } }) });
    expect(!r.ok && r.erro.codigo).toBe("INTERNAL_ERROR");
  });
  it("rede fora do ar", async () => {
    const r = await chamarApi("/x", { buscar: () => Promise.reject(new Error("off")) });
    expect(!r.ok && r.erro.codigo).toBe("UPSTREAM_UNAVAILABLE");
  });
});

describe("nova senha e convite", () => {
  it("a regra do tamanho conta os caracteres e só fica vermelha depois de tentar salvar", () => {
    expect(estadoTamanho("Gabinete7", false)).toEqual({ estado: "falta", info: "faltam 3" });
    expect(estadoTamanho("Gabinete-sete", false)).toEqual({ estado: "ok", info: "13 caracteres" });
    expect(estadoTamanho("abcdefghijk", true)).toEqual({ estado: "erro", info: "falta 1" });
    expect(estadoTamanho("", false)).toEqual({ estado: "falta", info: "" });
  });

  it("o aviso do topo diz quantos pontos faltam", () => {
    expect(textoFaltam(1)).toBe("Falta acertar 1 ponto, marcado abaixo.");
    expect(textoFaltam(2)).toBe("Falta acertar 2 pontos, marcados abaixo.");
  });

  it("o painel do convite mostra o sócio que convidou, ou a equipe T3jus", () => {
    const portal = { sistema: "portal" as const, nomeSistema: "Portal do advogado" };
    expect(textoConvite({ email: "a@x.br", escritorio: "Almeida & Prado", quem: "Ricardo Almeida", papel: "ESCRITORIO" }, portal))
      .toEqual({ de: "de", quem: "Ricardo Almeida", papel: ", sócio", onde: "Almeida & Prado" });
    expect(textoConvite({ email: "a@x.br", escritorio: "Ipê", quem: null, papel: "EQUIPE" }, portal))
      .toEqual({ de: "da", quem: "Equipe T3jus", papel: "", onde: "Ipê" });
    expect(textoConvite({ email: "a@t3jus.pro" }, { sistema: "console", nomeSistema: "Console T3jus" }))
      .toEqual({ de: "da", quem: "Equipe T3jus", papel: "", onde: "Console T3jus" });
  });
});

describe("escolha do escritório", () => {
  const agora = new Date("2026-11-18T15:00:00-03:00");
  it("a última entrada aparece no horário de Brasília", () => {
    expect(quandoEntrou("2026-11-18T12:12:00Z", agora)).toBe("hoje, 9h12");
    expect(quandoEntrou("2026-11-17T21:40:00Z", agora)).toBe("ontem, 18h40");
    expect(quandoEntrou("2026-11-12T13:00:00Z", agora)).toBe("12 nov.");
    expect(quandoEntrou("2025-10-02T13:00:00Z", agora)).toBe("2 out. 2025");
  });

  it("a linha do escritório junta a cidade e a última entrada", () => {
    const e = { id: "1", nome: "Ipê", cidade: "Salvador", uf: "BA", ultimaEntrada: "2026-11-18T12:12:00Z" };
    expect(metaEscritorio(e, agora)).toBe("Salvador, BA · Última entrada hoje, 9h12");
    expect(metaEscritorio({ ...e, cidade: null, uf: null, ultimaEntrada: null }, agora)).toBe("Sem entrada nos últimos 30 dias");
  });

  it("a busca acha pelo nome ou pela cidade, sem ligar para acento", () => {
    const lista = [
      { id: "1", nome: "Ipê Advocacia", cidade: "Brasília", uf: "DF", ultimaEntrada: null },
      { id: "2", nome: "Cedro Advogados", cidade: "Goiânia", uf: "GO", ultimaEntrada: null },
    ];
    expect(filtrarEscritorios(lista, "ipe").map((e) => e.id)).toEqual(["1"]);
    expect(filtrarEscritorios(lista, "goiania").map((e) => e.id)).toEqual(["2"]);
    expect(filtrarEscritorios(lista, "  ")).toHaveLength(2);
  });
});
