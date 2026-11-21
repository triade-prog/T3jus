// "Não foi paga" na folha "Pago antes do T3jus" (F3.84, VA-05) e o logo do escritório no carnê e
// no recibo (F3.81, FI-23; resto do F3.19, FI-14). Telas aprovadas em
// docs/design/aprovadas/portal-nao-paga-logo. O banco confere quem pode e o que muda
// (0600_nao_foi_paga.sql, 0601_marca_logo_oab.sql).
//
// O logo chega já como PNG: a tela lê o PNG, o JPG ou o SVG, corta a margem e manda os pixels
// em PNG. Aqui o PNG é aberto de novo e conferido com a mesma conta da tela (packages/domain/src/
// logo.ts) antes de ir para o arquivo do escritório. O SVG e o JPG enviados não são guardados.

import type { Context, Hono } from "hono";
import {
  analisarLogo, ErroDominio, ErroPng, foiPagaSchema, lerPng, LOGO_MAX_BYTES, LOGO_MAX_LADO, LOGO_MAX_PNG_BYTES, naoPagaSchema,
  type FormatoLogo, type LogoEscritorio, type RecebimentoPrevisto,
} from "@t3jus/domain";
import { lerCorpo } from "../_shared/validar.ts";
import type { DepsPortal, VarsPortal } from "./app.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FORMATOS: FormatoLogo[] = ["PNG", "JPG", "SVG"];

function idDaRota(c: Context, nome: string): string {
  const id = c.req.param(nome);
  if (!id || !UUID.test(id)) throw new ErroDominio("NOT_FOUND");
  return id.toLowerCase();
}

/** O corte que a tela fez, em "esquerda,topo,direita,baixo" (só para guardar e mostrar). */
function corteDaConsulta(v: string | undefined): Record<string, number> {
  const n = (v ?? "").split(",").map((x) => Number(x));
  if (n.length !== 4 || n.some((x) => !Number.isInteger(x) || x < 0 || x > 100000)) return {};
  return { esquerda: n[0]!, topo: n[1]!, direita: n[2]!, baixo: n[3]! };
}

export function rotasPagoAntesLogo(app: Hono<VarsPortal>, deps: DepsPortal) {
  const quem = (c: Context<VarsPortal>) => ({ p_pessoa: c.get("sessao").pessoaId, p_escritorio: c.get("escritorioId") });

  // ------------------------------------------------------------------ Não foi paga (F3.84)
  // A parcela que veio como paga na planilha volta a ser cobrada: o registro da planilha fica.
  app.post("/v1/escritorio/contratos/:id/pago-antes/:recebimentoId/nao-paga", async (c) => {
    const d = await lerCorpo(c, naoPagaSchema);
    return c.json(await deps.banco.rpc<RecebimentoPrevisto>("portal_pago_antes_nao_paga", {
      ...quem(c), p_contrato: idDaRota(c, "id"), p_recebimento: idDaRota(c, "recebimentoId"),
      p_dados: { vencimento: d.vencimento ?? "ORIGINAL", motivo: d.motivo },
    }), 201);
  });

  // "Foi paga, sim": desfaz a correção enquanto a parcela nova não teve movimento.
  app.post("/v1/escritorio/recebimentos/:id/foi-paga", async (c) => {
    const d = await lerCorpo(c, foiPagaSchema);
    return c.json(await deps.banco.rpc<{ id: string; contratoId: string }>("portal_pago_antes_foi_paga", {
      ...quem(c), p_recebimento: idDaRota(c, "id"), p_dados: d,
    }));
  });

  // ------------------------------------------------------------------ Logo do escritório (F3.81)
  // O PNG vem no corpo; nome, formato e tamanho do arquivo enviado vêm na consulta.
  app.post("/v1/escritorio/recebimento/logo", async (c) => {
    const nome = (c.req.query("nome") ?? "").trim().slice(0, 200);
    const formato = (c.req.query("formato") ?? "").toUpperCase() as FormatoLogo;
    const enviado = Number(c.req.query("bytes") ?? "");
    const campos: string[] = [];
    if (!nome) campos.push("nome");
    if (!FORMATOS.includes(formato)) campos.push("formato");
    if (!Number.isInteger(enviado) || enviado <= 0) campos.push("bytes");
    if (campos.length) throw new ErroDominio("VALIDATION_ERROR", { campos });
    if (enviado > LOGO_MAX_BYTES) throw new ErroDominio("VALIDATION_ERROR", { motivo: "LOGO_GRANDE" });
    if (Number(c.req.header("content-length") ?? 0) > LOGO_MAX_PNG_BYTES) throw new ErroDominio("VALIDATION_ERROR", { motivo: "LOGO_GRANDE" });
    const png = new Uint8Array(await c.req.arrayBuffer());
    if (!png.length || png.length > LOGO_MAX_PNG_BYTES) throw new ErroDominio("VALIDATION_ERROR", { motivo: "LOGO_GRANDE" });
    let lido;
    try {
      lido = await lerPng(png, LOGO_MAX_LADO);
    } catch (e) {
      if (e instanceof ErroPng) throw new ErroDominio("VALIDATION_ERROR", { motivo: "LOGO_FORMATO" });
      throw e;
    }
    const a = analisarLogo(lido.rgba, lido.largura, lido.altura);
    if (a.recusa) throw new ErroDominio("VALIDATION_ERROR", { motivo: a.recusa });
    const id = crypto.randomUUID();
    // Primeiro o banco confere (só a sócia dona) e devolve o caminho; depois o arquivo é gravado.
    // Se a gravação falhar, o registro fica sem arquivo e não é usado: a tela mostra o erro.
    const logo = await deps.banco.rpc<LogoEscritorio>("portal_recebimento_logo_registrar", {
      ...quem(c),
      p_dados: {
        id, nome, formato, bytes: enviado, largura: lido.largura, altura: lido.altura,
        corte: corteDaConsulta(c.req.query("corte")), contraste: a.contraste, passa: a.passa,
      },
    });
    await deps.arquivos.enviar(`${c.get("escritorioId")}/logos/${id}.png`, png, "image/png");
    return c.json({ ...logo, cores: a.cores }, 201);
  });

  // A imagem do logo, para a tela e para imprimir o carnê e o recibo. Toda a equipe abre.
  app.get("/v1/escritorio/logos/:id", async (c) => {
    const caminho = await deps.banco.rpc<string>("portal_recebimento_logo_arquivo", { ...quem(c), p_logo: idDaRota(c, "id") });
    const bytes = await deps.arquivos.baixar(caminho);
    if (!bytes) throw new ErroDominio("NOT_FOUND");
    c.header("Content-Type", "image/png");
    c.header("Cache-Control", "private, max-age=86400, immutable");
    c.header("X-Content-Type-Options", "nosniff");
    return c.body(bytes as unknown as ArrayBuffer);
  });
}
