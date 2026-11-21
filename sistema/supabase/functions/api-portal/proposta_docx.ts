// Baixar a proposta em .docx no timbrado do escritório (AP-05, F3.6), tela aprovada em
// docs/design/aprovadas/portal-comercial-contratos (decisão 4). O banco confere quem pode ver a
// proposta (área Comercial); aqui se monta o arquivo, que vai para a pasta privada do escritório
// e abre por um link temporário (PT-07), como as petições.

import type { Context, Hono } from "hono";
import {
  criarDocx, ErroDominio, linhasTimbrado, nomeArquivoProposta, paragrafosProposta, pngEmUmaCor, TIPO_DOCX,
  type EscritorioDoTimbrado, type FichaProposta, type LogoDocx, type MarcaNoDocumento,
} from "@t3jus/domain";
import { VALIDADE_LEITURA_S } from "../_shared/arquivos.ts";
import type { DepsPortal, VarsPortal } from "./app.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const hojeBrasilia = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

/** O PNG do logo para o cabeçalho; nulo quando a marca é o nome em letra ou o arquivo sumiu. */
export async function logoDaProposta(deps: DepsPortal, escritorio: string, m: MarcaNoDocumento | null): Promise<LogoDocx | undefined> {
  if (m?.tipo !== "LOGO" || !m.logoId || !UUID.test(m.logoId) || !m.largura || !m.altura) return undefined;
  const png = await deps.arquivos.baixar(`${escritorio}/logos/${m.logoId}.png`);
  if (!png) return undefined;
  return { png: m.cor === "UMA_COR" ? await pngEmUmaCor(png) : png, largura: m.largura, altura: m.altura, comNome: m.jeito === "LOGO_E_NOME" };
}

export function rotasPropostaDocx(app: Hono<VarsPortal>, deps: DepsPortal) {
  const quem = (c: Context<VarsPortal>) => ({ p_pessoa: c.get("sessao").pessoaId, p_escritorio: c.get("escritorioId") });

  app.post("/v1/escritorio/propostas/:id/docx", async (c) => {
    const id = c.req.param("id");
    if (!id || !UUID.test(id)) throw new ErroDominio("NOT_FOUND");
    const p = await deps.banco.rpc<FichaProposta>("portal_proposta", { ...quem(c), p_proposta: id.toLowerCase() });
    const esc = await deps.banco.rpc<Omit<EscritorioDoTimbrado, "nome">>("portal_escritorio", quem(c));
    const nome = (await deps.banco.rpc<{ escritorio_id: string; nome: string }[]>("meus_escritorios", { p_pessoa: c.get("sessao").pessoaId }))
      .find((x) => x.escritorio_id === c.get("escritorioId"))?.nome;
    if (!nome) throw new ErroDominio("ESCRITORIO_REQUIRED");
    const e: EscritorioDoTimbrado = { ...esc, nome };
    // F3.92: a marca de hoje no cabeçalho, como no carnê e no recibo; sem logo, o nome em letra.
    const marca = await deps.banco.rpc<MarcaNoDocumento | null>("portal_recebimento_marca", quem(c));
    const arquivo = await criarDocx(paragrafosProposta(p, e, hojeBrasilia()), linhasTimbrado({ ...e, oab: marca?.oab ?? e.oab ?? null }),
      await logoDaProposta(deps, c.get("escritorioId"), marca));
    const caminho = `${c.get("escritorioId")}/propostas/${p.id}-v${p.versao}.docx`;
    await deps.arquivos.enviar(caminho, arquivo, TIPO_DOCX, true);
    return c.json({ url: await deps.arquivos.enderecoDeLeitura(caminho, VALIDADE_LEITURA_S, nomeArquivoProposta(p)), validadeSegundos: VALIDADE_LEITURA_S });
  });
}
