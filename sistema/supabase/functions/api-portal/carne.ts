// Rotas do carnê de pagamento (FI-23), tela aprovada em docs/design/aprovadas/portal-carne. O banco
// confere quem pode e o que entra (0450_portal_carne.sql); aqui a chave Pix é normalizada antes
// de ir ao banco e o Pix copia e cola de cada parcela é montado da cópia guardada no carnê
// (packages/domain/src/pix.ts). Sem provedor de pagamento: a baixa continua manual.

import type { Context, Hono } from "hono";
import {
  documentoParcial, enviarCarneSchema, ErroDominio, gerarCarneSchema, pedirChavePixSchema, textoEnvioCarne, LIMITE_CIDADE, LIMITE_RECEBEDOR, normalizarChavePix, pixDaParcela,
  salvarRecebimentoSchema, textoPix,
  type CarneParaImprimir, type EnvioCarne, type OpcoesCarne, type PdfDoCarne, type PedidoChavePix, type PreviaEnvioCarne, type RecebimentoEscritorio, type RecebimentoSalvo, type TipoChavePix,
} from "@t3jus/domain";
import { VALIDADE_LEITURA_S } from "../_shared/arquivos.ts";
import { lerCorpo } from "../_shared/validar.ts";
import { nomeDoPdfCarne, pdfDoCarne } from "./carne_pdf.ts";
import type { DepsPortal, VarsPortal } from "./app.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const AREAS = ["FINANCEIRO", "CONTRATOS"] as const;

function idDaRota(c: Context, nome: string): string {
  const id = c.req.param(nome);
  if (!id || !UUID.test(id)) throw new ErroDominio("NOT_FOUND");
  return id.toLowerCase();
}

function areaDaConsulta(c: Context): (typeof AREAS)[number] {
  const a = (c.req.query("area") || "FINANCEIRO").toUpperCase();
  if (!(AREAS as readonly string[]).includes(a)) throw new ErroDominio("VALIDATION_ERROR", { campos: ["area"] });
  return a as (typeof AREAS)[number];
}

/** O que o banco devolve para imprimir: o mesmo do carnê, sem o Pix montado e com o documento inteiro. */
type CarneDoBanco = Omit<CarneParaImprimir, "parcelas"> & { parcelas: Omit<CarneParaImprimir["parcelas"][number], "pix">[] };

function pick<T extends object, K extends keyof T>(o: T, chaves: K[]): Partial<Pick<T, K>> {
  const r: Partial<Pick<T, K>> = {};
  for (const k of chaves) if (o[k] !== undefined) r[k] = k === "logoId" && typeof o[k] === "string" ? (o[k] as string).toLowerCase() as T[K] : o[k];
  return r;
}

export function rotasCarne(app: Hono<VarsPortal>, deps: DepsPortal) {
  const quem = (c: Context<VarsPortal>) => ({ p_pessoa: c.get("sessao").pessoaId, p_escritorio: c.get("escritorioId") });

  // ------------------------------------------------------------------ Escritório › Recebimento
  app.get("/v1/escritorio/recebimento", async (c) => {
    return c.json(await deps.banco.rpc<RecebimentoEscritorio>("portal_recebimento", quem(c)));
  });

  // Só a sócia dona (o banco recusa com SO_SOCIO_DONO). A chave vai normalizada; o nome do
  // recebedor e a cidade, em maiúsculas sem acento, como o banco mostra no app de quem paga.
  app.put("/v1/escritorio/recebimento", async (c) => {
    const d = await lerCorpo(c, salvarRecebimentoSchema);
    const campos: string[] = [];
    const tipo = (d.pixTipo ?? null) as TipoChavePix | null;
    const bruta = d.pixChave?.trim() || null;
    let chave: string | null = null;
    if (tipo && bruta) {
      chave = normalizarChavePix(tipo, bruta);
      if (!chave) campos.push("pixChave");
    } else if (tipo || bruta) campos.push(tipo ? "pixChave" : "pixTipo");
    const recebedor = d.recebedor ? textoPix(d.recebedor) : null;
    const cidade = d.cidade ? textoPix(d.cidade) : null;
    if (recebedor && recebedor.length > LIMITE_RECEBEDOR) campos.push("recebedor");
    if (cidade && cidade.length > LIMITE_CIDADE) campos.push("cidade");
    if (tipo && !recebedor && !campos.includes("recebedor")) campos.push("recebedor");
    if (tipo && !cidade && !campos.includes("cidade")) campos.push("cidade");
    if (campos.length) throw new ErroDominio("VALIDATION_ERROR", { campos });
    return c.json(await deps.banco.rpc<RecebimentoSalvo>("portal_recebimento_salvar", {
      ...quem(c),
      p_dados: {
        versao: d.versao, pixTipo: tipo, pixChave: chave, recebedor, cidade, instrucoes: d.instrucoes?.trim() || null,
        // A marca e a OAB só vão quando a tela manda (o banco mantém o que não veio).
        ...pick(d, ["marca", "logoId", "logoJeito", "logoCor", "oabUf", "oabNumero"]),
      },
    }));
  });

  // F3.80: quem gera carnês e não é dono pede a chave; a sócia dona recebe o aviso no sino.
  app.post("/v1/escritorio/recebimento/pedido", async (c) => {
    const d = await lerCorpo(c, pedirChavePixSchema);
    return c.json(await deps.banco.rpc<PedidoChavePix>("portal_recebimento_pedir", { ...quem(c), p_dados: d }));
  });

  // ------------------------------------------------------------------ Carnê de um contrato
  app.get("/v1/escritorio/contratos/:id/carnes", async (c) => {
    return c.json(await deps.banco.rpc<OpcoesCarne>("portal_carne_opcoes", { ...quem(c), p_contrato: idDaRota(c, "id"), p_area: areaDaConsulta(c) }));
  });

  app.post("/v1/escritorio/contratos/:id/carnes", async (c) => {
    const d = await lerCorpo(c, gerarCarneSchema);
    return c.json(await deps.banco.rpc<{ id: string; parcelas: number }>("portal_carne_gerar", {
      ...quem(c), p_contrato: idDaRota(c, "id"), p_dados: { ...d, parcelas: d.parcelas.map((x) => x.toLowerCase()) },
    }), 201);
  });

  // Os dados para imprimir, com o Pix de cada parcela e o documento do cliente pela metade.
  const paraImprimir = async (c: Context<VarsPortal>, id: string, area: string): Promise<CarneParaImprimir> => {
    const k = await deps.banco.rpc<CarneDoBanco>("portal_carne", { ...quem(c), p_carne: id, p_area: area });
    return {
      ...k,
      cliente: { ...k.cliente, documento: documentoParcial(k.cliente.documento) },
      parcelas: k.parcelas.map((p) => ({ ...p, pix: pixDaParcela(k.pix, p, k.contrato.numero) })),
    };
  };
  app.get("/v1/escritorio/carnes/:id", async (c) => {
    return c.json(await paraImprimir(c, idDaRota(c, "id"), areaDaConsulta(c)));
  });

  // F3.79: o PDF do carnê, gerado no servidor uma vez e guardado em <escritório>/carnes/<carnê>.pdf
  // (o carnê não muda: gerar de novo cria outro). Quem pode ver o carnê pode baixar.
  const garantirPdf = async (c: Context<VarsPortal>, k: CarneParaImprimir) => {
    const caminho = `${c.get("escritorioId")}/carnes/${k.id}.pdf`;
    const info = await deps.arquivos.info(caminho);
    if (info) return { caminho, nome: nomeDoPdfCarne(k), tamanho: info.tamanho };
    let pdf: Uint8Array;
    try {
      pdf = await pdfDoCarne(k);
    } catch {
      throw new ErroDominio("VALIDATION_ERROR", { motivo: "CARNE_PDF_FALHOU" });
    }
    await deps.arquivos.enviar(caminho, pdf, "application/pdf", true);
    return { caminho, nome: nomeDoPdfCarne(k), tamanho: pdf.length };
  };
  const folhas = (k: CarneParaImprimir) => (k.formato === "UM" ? k.parcelas.length : Math.ceil((k.parcelas.length + (k.capa ? 1 : 0)) / 3));

  app.get("/v1/escritorio/carnes/:id/pdf", async (c) => {
    const k = await paraImprimir(c, idDaRota(c, "id"), areaDaConsulta(c));
    const a = await garantirPdf(c, k);
    const r: PdfDoCarne = { url: await deps.arquivos.enderecoDeLeitura(a.caminho, VALIDADE_LEITURA_S, a.nome), nome: a.nome, tamanho: a.tamanho };
    return c.json(r);
  });

  // A prévia da mensagem (estado carne-whats): para quem vai, o texto, o PDF e o que impede agora.
  app.get("/v1/escritorio/carnes/:id/envio", async (c) => {
    const id = idDaRota(c, "id"), area = areaDaConsulta(c);
    const k = await paraImprimir(c, id, area);
    const e = await deps.banco.rpc<Omit<PreviaEnvioCarne, "texto" | "arquivo">>("portal_carne_envio", { ...quem(c), p_carne: id, p_area: area });
    const a = await garantirPdf(c, k);
    const r: PreviaEnvioCarne = { ...e, texto: textoEnvioCarne({ ...k, escritorio: { ...k.escritorio, nome: e.escritorio } }, e.para?.nome ?? k.cliente.nome),
      arquivo: { nome: a.nome, tamanho: a.tamanho, folhas: folhas(k) } };
    return c.json(r);
  });

  // Mandar: a mensagem e o PDF entram na fila da conversa. Quem entrega é a ligação com a Meta.
  app.post("/v1/escritorio/carnes/:id/envios", async (c) => {
    const id = idDaRota(c, "id");
    const d = await lerCorpo(c, enviarCarneSchema);
    const k = await paraImprimir(c, id, d.area);
    const a = await garantirPdf(c, k);
    return c.json(await deps.banco.rpc<{ envios: EnvioCarne[] }>("portal_carne_enviar", {
      ...quem(c), p_carne: id, p_dados: { ...d, arquivo: { caminho: a.caminho, nome: a.nome, bytes: String(a.tamanho) } },
    }), 201);
  });
}
