// Tela de entrar: leitura do link de acesso e o QR do autenticador.
import { describe, expect, it } from "vitest";
import { imagemQr, lerLinkDoEndereco } from "./Entrar.tsx";
import { chamarApi, textoDoErro } from "./api.ts";

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
