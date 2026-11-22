// Plano e faturas no Portal (F1.20, CO-06), telas aprovadas em
// docs/design/aprovadas/console-cobranca/portal-escritorio.html (estados 44 a 51): a folha do
// sócio dono na página Escritório, a janela de pagar, o carnê, a faixa de atraso e o só
// consulta (para o dono e para a equipe). A API é simulada; aqui se testa a tela, a
// acessibilidade e o que ela pede.
import { expect, test, type Page } from "@playwright/test";
import { semViolacoes, simular } from "./console-dados.ts";

const P = "http://localhost:3000";
const V = 49000;

const ESC = {
  id: "e0000000-0000-4000-8000-0000000000a1", nome: "Ribeiro & Matos", pessoa: "Marina Ribeiro", dono: true,
  areas: ["COMERCIAL", "CONTRATOS", "FINANCEIRO", "JURIDICO"], socios: ["Marina Ribeiro"], pessoas: 7, outrosEscritorios: 0, funcoes: ["SOCIO"],
  cnpj: "41276839000134", cidade: "São Paulo", uf: "SP", endereco: "Rua Cardeal Arcoverde, 1749", contatos: [], ultimaExportacao: null,
  encerramento: null,
};
const SEM_COBRANCA = { soConsultaDesde: null, socioDono: "Marina Ribeiro", veFaturas: true, atraso: null };
const EQUIPE = { ...ESC, pessoa: "Larissa Costa", dono: false, areas: ["JURIDICO"], funcoes: ["EQUIPE"] };

const PAGAMENTO = { pixCopiaCola: null, linhaBoleto: null, disponivel: false };
let n = 0;
function fatura(competencia: string, situacao: string, extra: Record<string, unknown> = {}) {
  n += 1;
  const mes = competencia.slice(0, 7);
  return {
    id: `f0000000-0000-4000-8000-${String(n).padStart(12, "0")}`, numero: n, competencia, vencimento: `${mes}-10`, plano: "Escritório", forma: "PIX",
    totalCentavos: V, situacao, atrasoDias: null, pagaEm: null, formaPaga: null, baixa: null, canceladaEm: null, emitidaEm: `${mes}-01T12:00:00Z`,
    pessoasAtivas: 7, versao: 1, parcela: null, pagamento: PAGAMENTO,
    itens: [{ tipo: "MENSALIDADE", descricao: "Mensalidade do plano Escritório", quantidade: 1, valorCentavos: V }],
    ...extra,
  };
}
const paga = (c: string, em: string, forma = "PIX", extra = {}) => fatura(c, "PAGA", { pagaEm: `${em}T15:00:00Z`, formaPaga: forma, baixa: "MANUAL", ...extra });
const ASSINATURA = {
  plano: "Escritório", precoCentavos: V, pessoasIncluidas: 8, pessoasAtivas: 7, pessoaAMaisCentavos: 3900, diaVencimento: 10, forma: "PIX",
  inicioCobranca: "2026-09-01", soConsultaDesde: null, atrasoDias: null,
};
const HOJE = "2026-11-20";

async function abrir(page: Page, rotas: Parameters<typeof simular>[1]) {
  const pedidos = await simular(page, rotas);
  await page.goto(`${P}/meu-escritorio`);
  return pedidos;
}

test.describe("F1.20: Plano e faturas no Portal", () => {
  test("em dia: o plano, a próxima fatura, a lista e a janela de pagar", async ({ page }) => {
    const dez = fatura("2026-12-01", "A_VENCER");
    await abrir(page, {
      "/v1/escritorio": { corpo: { ...ESC, cobranca: SEM_COBRANCA } },
      "/v1/escritorio/faturas": { corpo: { hoje: HOJE, assinatura: ASSINATURA, faturas: [dez, paga("2026-11-01", "2026-11-09"), paga("2026-10-01", "2026-10-08", "BOLETO")], carne: null } },
    });
    const folha = page.getByRole("region", { name: "Plano e faturas" });
    await expect(folha).toContainText("Só o sócio dono vê esta parte.");
    await expect(folha).toContainText("Até 8 pessoas, com todas as áreas. Hoje são 7. Cada pessoa a mais custa R$ 39,00 por mês.");
    await expect(folha).toContainText("Vence todo dia 10 · Pix ou boleto.");
    await expect(folha).toContainText("Próxima fatura");
    await expect(folha).toContainText("Dezembro de 2026 · vence em 10/12/2026.");
    await expect(folha.getByText("paga em 08/10, boleto").locator("visible=true")).toBeVisible();
    await expect(page.getByRole("note", { name: "Fatura em atraso" })).toHaveCount(0);
    await semViolacoes(page);

    await folha.getByRole("button", { name: "Pagar a fatura de dezembro de 2026" }).locator("visible=true").click();
    const janela = page.getByRole("dialog", { name: "Pagar a fatura de dezembro" });
    await expect(janela).toBeVisible();
    await expect(janela).toContainText("Total");
    await expect(janela).toContainText("Pix e boleto: lugar reservado.");
    await expect(janela.getByRole("button", { name: "Fechar", exact: true }).last()).toBeFocused();
    await semViolacoes(page);
    await janela.getByRole("button", { name: "Fechar", exact: true }).last().click();
    await expect(janela).toBeHidden();
  });

  test("carnê: a próxima parcela, a folha do carnê e a parcela de cada fatura", async ({ page }) => {
    const carne = {
      id: "c0000000-0000-4000-8000-0000000000c1", numero: "2026/2027", parcelas: 12, valorParcelaCentavos: V, diaVencimento: 10,
      primeiraCompetencia: "2026-10-01", ultimaCompetencia: "2027-09-01", geradoEm: "2026-09-15T12:00:00Z", geradoPor: "Carol", substituidoEm: null,
      substituidoMotivo: null, pdf: false,
      itens: Array.from({ length: 12 }, (_, i) => {
        const d = new Date(Date.UTC(2026, 9 + i, 1)).toISOString().slice(0, 10);
        const pagaEm = i === 0 ? "2026-10-10" : i === 1 ? "2026-11-09" : i === 3 ? "2026-11-18" : null;
        return {
          id: `p0000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`, numero: i + 1, competencia: d, vencimento: `${d.slice(0, 7)}-10`, valorCentavos: V,
          situacao: pagaEm ? "PAGA" : "A_VENCER", faturaId: null, pagaEm, emAtraso: false, canceladaMotivo: null,
        };
      }),
    };
    const parc = (numero: number) => ({ parcela: { numero, de: 12, carne: "2026/2027", carneId: carne.id }, forma: "CARNE" });
    await abrir(page, {
      "/v1/escritorio": { corpo: { ...ESC, cobranca: SEM_COBRANCA } },
      "/v1/escritorio/faturas": { corpo: { hoje: HOJE, assinatura: { ...ASSINATURA, forma: "CARNE" }, carne: [carne], faturas: [
        paga("2027-01-01", "2026-11-18", "PIX", parc(4)), fatura("2026-12-01", "A_VENCER", parc(3)), paga("2026-11-01", "2026-11-09", "PIX", parc(2)),
      ] } },
    });
    const folha = page.getByRole("region", { name: "Plano e faturas" });
    await expect(folha).toContainText("Próxima parcela");
    await expect(folha).toContainText("Parcela 3 de 12 · dezembro de 2026 · vence em 10/12/2026.");
    await expect(folha).toContainText("carnê de 12 parcelas, cada uma com Pix e boleto");
    await expect(page.getByRole("heading", { level: 3, name: "Seu carnê 2026/2027" })).toBeVisible();
    await expect(page.getByRole("list", { name: "Parcelas do carnê 2026/2027" }).getByRole("listitem")).toHaveCount(12);
    await expect(folha.getByText("parcela 4 de 12 · paga em 18/11, Pix").locator("visible=true")).toBeVisible();
    await expect(folha.getByRole("button", { name: "Baixar o carnê (PDF)" })).toHaveAttribute("aria-disabled", "true");
    await semViolacoes(page);
  });

  test("atraso de 10 dias: a faixa só para o dono em todas as páginas e a fatura em destaque", async ({ page }) => {
    const nov = fatura("2026-11-01", "EM_ATRASO", { atrasoDias: 10 });
    await simular(page, {
      "/v1/escritorio": { corpo: { ...ESC, cobranca: { ...SEM_COBRANCA, atraso: {
        faturaId: nov.id, competencia: "2026-11-01", vencimento: "2026-11-10", dias: 10, totalCentavos: V, abertas: 1, abertasCentavos: V,
      } } } },
      "/v1/escritorio/faturas": { corpo: { hoje: HOJE, assinatura: { ...ASSINATURA, atrasoDias: 10 }, faturas: [fatura("2026-12-01", "A_VENCER"), nov], carne: null } },
      "/v1/escritorio/clientes": { corpo: { clientes: [] } },
    });
    await page.goto(`${P}/clientes`);
    const tira = page.getByRole("note", { name: "Fatura em atraso" });
    await expect(tira).toContainText("A fatura de novembro venceu em 10/11/2026. Só o sócio dono vê este aviso.");
    await expect(page.getByRole("link", { name: "Novo cliente" }).first()).toBeVisible();
    await semViolacoes(page);
    await tira.getByRole("link", { name: "Ver e pagar" }).click();
    await expect(page).toHaveURL(/\/meu-escritorio#plano$/);
    const folha = page.getByRole("region", { name: "Plano e faturas" });
    await expect(folha).toContainText("Em atraso");
    await expect(folha).toContainText("Novembro de 2026 · venceu em 10/11/2026.");
    await expect(folha.getByText("Em atraso · 10 dias").first()).toBeVisible();
    await semViolacoes(page);
    await folha.getByRole("button", { name: "Pagar agora" }).click();
    await expect(page.getByRole("dialog", { name: "Pagar a fatura de novembro" })).toContainText("Venceu em 10/11/2026.");
  });

  test("só consulta, visto pelo dono: a faixa, pagar a mais antiga e nada de criar", async ({ page }) => {
    const out = fatura("2026-10-01", "EM_ATRASO", { atrasoDias: 41 });
    const nov = fatura("2026-11-01", "EM_ATRASO", { atrasoDias: 10 });
    const cob = { ...SEM_COBRANCA, soConsultaDesde: "2026-11-20T13:00:00Z", atraso: {
      faturaId: out.id, competencia: "2026-10-01", vencimento: "2026-10-10", dias: 41, totalCentavos: V, abertas: 2, abertasCentavos: 2 * V,
    } };
    await simular(page, {
      "/v1/escritorio": { corpo: { ...ESC, cobranca: cob } },
      "/v1/escritorio/faturas": { corpo: { hoje: HOJE, assinatura: { ...ASSINATURA, soConsultaDesde: cob.soConsultaDesde, atrasoDias: 41 }, faturas: [nov, out], carne: null } },
      "/v1/escritorio/clientes": { corpo: { clientes: [] } },
    });
    await page.goto(`${P}/meu-escritorio`);
    const tira = page.getByRole("note", { name: "Situação do Portal" });
    await expect(tira).toContainText("Portal só para consulta desde 20/11/2026.");
    const folha = page.getByRole("region", { name: "Plano e faturas" });
    await expect(folha).toContainText("Portal só para consulta");
    await expect(folha).toContainText("Outubro e novembro de 2026 estão em aberto.");
    await expect(folha).toContainText("Ao pagar as duas, tudo volta ao normal na hora.");
    await expect(folha.getByRole("link", { name: "Falar com o T3jus" })).toHaveAttribute("href", /^mailto:/);
    await expect(page.getByText("A exportação dos dados continua liberada.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Exportar os dados" })).toBeVisible();
    await semViolacoes(page);
    await folha.getByRole("button", { name: "Pagar outubro" }).click();
    await expect(page.getByRole("dialog", { name: "Pagar a fatura de outubro" })).toBeVisible();
    await page.keyboard.press("Escape");

    await page.goto(`${P}/clientes`);
    await expect(page.getByRole("note", { name: "Situação do Portal" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Novo cliente" })).toHaveCount(0);
  });

  test("só consulta, visto pela equipe: a faixa com quem falar, sem valores nem faturas", async ({ page }) => {
    const pedidos = await abrir(page, {
      "/v1/escritorio": { corpo: { ...EQUIPE, cobranca: { soConsultaDesde: "2026-11-20T13:00:00Z", socioDono: "Marina Ribeiro", veFaturas: false, atraso: null } } },
    });
    const tira = page.getByRole("note", { name: "Situação do Portal" });
    await expect(tira).toContainText("O escritório tem uma pendência com o T3jus.");
    await expect(tira).toContainText("fale com Marina Ribeiro, quem cuida do escritório.");
    await expect(tira.getByRole("link")).toHaveCount(0);
    await expect(page.getByText("O Portal está só para consulta. Para voltar ao normal, fale com Marina Ribeiro, quem cuida do escritório.")).toBeVisible();
    await expect(page.getByRole("region", { name: "Plano e faturas" })).toHaveCount(0);
    await expect(page.getByText("R$")).toHaveCount(0);
    expect(pedidos.some((p) => p.caminho === "/v1/escritorio/faturas")).toBe(false);
    await semViolacoes(page);
  });

  test("nenhuma fatura ainda e falha ao carregar com Tentar de novo", async ({ page }) => {
    await abrir(page, {
      "/v1/escritorio": { corpo: { ...ESC, cobranca: SEM_COBRANCA } },
      "/v1/escritorio/faturas": [
        { status: 500, corpo: { erro: { codigo: "INTERNAL_ERROR" } } },
        { corpo: { hoje: HOJE, assinatura: ASSINATURA, faturas: [], carne: null } },
      ],
    });
    const folha = page.getByRole("region", { name: "Plano e faturas" });
    await expect(folha.getByRole("alert")).toContainText("Não deu para carregar as faturas");
    await expect(page.getByRole("heading", { name: "Dados do escritório" })).toBeVisible();
    await semViolacoes(page);
    await folha.getByRole("button", { name: "Tentar de novo" }).click();
    await expect(folha.getByRole("heading", { name: "Nenhuma fatura ainda" })).toBeVisible();
    await expect(folha).toContainText("O plano combinado é o Escritório, R$ 490,00 por mês, até 8 pessoas.");
    await semViolacoes(page);
  });
});
