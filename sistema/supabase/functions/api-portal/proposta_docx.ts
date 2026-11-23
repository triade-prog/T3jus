// Baixar a proposta em .docx no timbrado do escritório (AP-05, F3.6), tela aprovada em
// docs/design/aprovadas/portal-comercial-contratos (decisão 4). O banco confere quem pode ver a
// proposta (área Comercial); aqui se monta o arquivo, que vai para a pasta privada do escritório
// e abre por um link temporário (PT-07), como as petições. Desde o F3.146 (razao-social-sobras),
// o cabeçalho leva as 4 linhas do timbrado, lidas de portal_proposta_timbrado (migration 1000):
// só esta rota recebe esses dados, e não a ficha da proposta que vai ao navegador.

import type { Context, Hono } from "hono";
import {
  criarDocx, ErroDominio, nomeArquivoProposta, paragrafosProposta, pngEmUmaCor, timbradoDoDocx, TIPO_DOCX,
  type EscritorioDoTimbrado, type FichaProposta, type LogoDocx, type MarcaNoDocumento,
} from "@t3jus/domain";
import { VALIDADE_LEITURA_S } from "../_shared/arquivos.ts";
import type { DepsPortal, VarsPortal } from "./app.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const hojeBrasilia = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

/** O PNG do logo para o cabeçalho, com o nome curto (o texto ao lado e o texto alternativo);
 *  nulo quando a marca é o nome em letra ou o arquivo sumiu. */
export async function logoDaProposta(deps: DepsPortal, escritorio: string, m: MarcaNoDocumento | null, nome: string): Promise<LogoDocx | undefined> {
  if (m?.tipo !== "LOGO" || !m.logoId || !UUID.test(m.logoId) || !m.largura || !m.altura) return undefined;
  const png = await deps.arquivos.baixar(`${escritorio}/logos/${m.logoId}.png`);
  if (!png) return undefined;
  return { png: m.cor === "UMA_COR" ? await pngEmUmaCor(png) : png, largura: m.largura, altura: m.altura, comNome: m.jeito === "LOGO_E_NOME", nome };
}

export function rotasPropostaDocx(app: Hono<VarsPortal>, deps: DepsPortal) {
  const quem = (c: Context<VarsPortal>) => ({ p_pessoa: c.get("sessao").pessoaId, p_escritorio: c.get("escritorioId") });

  app.post("/v1/escritorio/propostas/:id/docx", async (c) => {
    const id = c.req.param("id");
    if (!id || !UUID.test(id)) throw new ErroDominio("NOT_FOUND");
    const p = await deps.banco.rpc<FichaProposta>("portal_proposta", { ...quem(c), p_proposta: id.toLowerCase() });
    // O timbrado do dia (escritorio_timbrado_json): sem sociedade, o nome completo e a OAB da sócia
    // dona, mesmo quando quem baixa é da equipe com Comercial (nunca CPF ou RG).
    const esc = await deps.banco.rpc<Omit<EscritorioDoTimbrado, "nome">>("portal_proposta_timbrado", quem(c));
    const nome = (await deps.banco.rpc<{ escritorio_id: string; nome: string }[]>("meus_escritorios", { p_pessoa: c.get("sessao").pessoaId }))
      .find((x) => x.escritorio_id === c.get("escritorioId"))?.nome;
    if (!nome) throw new ErroDominio("ESCRITORIO_REQUIRED");
    const e: EscritorioDoTimbrado = { ...esc, nome };
    // F3.92: a marca de hoje no cabeçalho, como no carnê e no recibo; sem logo, o nome em letra.
    // A OAB do cabeçalho é a de Dados do escritório (decisão 21 de razao-social-sobras), não a da marca.
    const marca = await deps.banco.rpc<MarcaNoDocumento | null>("portal_recebimento_marca", quem(c));
    const logo = await logoDaProposta(deps, c.get("escritorioId"), marca, nome);
    const arquivo = await criarDocx(paragrafosProposta(p, e, hojeBrasilia()), timbradoDoDocx(e, { logo: !!logo }), logo);
    const caminho = `${c.get("escritorioId")}/propostas/${p.id}-v${p.versao}.docx`;
    await deps.arquivos.enviar(caminho, arquivo, TIPO_DOCX, true);
    return c.json({ url: await deps.arquivos.enderecoDeLeitura(caminho, VALIDADE_LEITURA_S, nomeArquivoProposta(p)), validadeSegundos: VALIDADE_LEITURA_S });
  });
}
