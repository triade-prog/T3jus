// Dados e ajudantes dos testes de tela do Console: a API é simulada (page.route).
import { expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

export const C = "http://localhost:3001";
export const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
// Relógio fixo dos testes de tela (F3.164): uma terça às 15h de Brasília, longe das duas
// meias-noites (UTC e Brasília) e dentro das datas fixas dos dados. h() e d() contam a partir dele,
// então todo arquivo que os usa fixa também o relógio do navegador, com test.beforeEach. No
// Playwright, setTimeout e requestAnimationFrame continuam andando no tempo real, mas Date.now fica
// parado (um cache "por 15 s" nunca vence dentro da página). Chamar antes do primeiro goto.
export const AGORA = new Date("2026-11-24T15:00:00-03:00");
export const agora = AGORA.getTime();
/** Dia em Brasília, n dias depois de AGORA: "2026-11-24". */
export const diaIso = (n = 0) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(agora + n * 864e5));
/** O mesmo dia em dd/mm/aaaa. */
export const diaBr = (n = 0) => new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(agora + n * 864e5));
/** Instante "hoje às hh:mm" de Brasília, em ISO. */
export const hojeAs = (hhmm: string) => new Date(`${diaIso()}T${hhmm}:00-03:00`).toISOString();
export async function fixarRelogio(page: Page, quando: Date = AGORA) { await page.clock.setFixedTime(quando); }
export const h = (n: number) => new Date(agora - n * 3600e3).toISOString();
export const d = (n: number) => h(n * 24);
export const id = (n: number) => `e0000000-0000-4000-8000-00000000000${n}`;
export const CA = { pessoaId: "c0000000-0000-4000-8000-000000000001", nome: "Carol Andrade", funcoes: ["ADMINISTRACAO"] };
export const IN = { pessoaId: "c0000000-0000-4000-8000-000000000002", nome: "Inês Nogueira", funcoes: ["IMPLANTACAO"] };
export const socio = (n: number, nome: string, desde: string, senha: string | null) => ({
  vinculoId: `f0000000-0000-4000-8000-00000000000${n}`, pessoaId: `a0000000-0000-4000-8000-00000000000${n}`, nome, desde,
  conviteEnviadoEm: desde, convidadoPor: "Carol Andrade", senhaCriadaEm: senha,
});
export const base = { cidade: "Recife", uf: "PE", funcoes: ["ADMINISTRACAO"], equipe: [CA] };
export const CLIENTES = [
  { ...base, id: id(1), nome: "Jatobá Advogados", estagio: "IMPLANTACAO", situacoes: ["SEM_SOCIO", "SEM_CONTATO", "SEM_CONTRATO"], criadoEm: d(3), socios: [], ultimaAtividade: d(3) },
  { ...base, id: id(2), nome: "Cedro & Lima Advocacia", estagio: "IMPLANTACAO", situacoes: [], criadoEm: d(14), socios: [socio(2, "Renata Lima", d(6), null)], equipe: [CA, IN], ultimaAtividade: d(4) },
  { ...base, id: id(3), nome: "Ribeiro & Matos Advocacia", cidade: "São Paulo", uf: "SP", estagio: "IMPLANTACAO", situacoes: [], criadoEm: d(20), socios: [socio(3, "Marina Ribeiro", d(12), d(11))], ultimaAtividade: h(3) },
  { ...base, id: id(4), nome: "Aroeira Sociedade de Advogados", cidade: "Belo Horizonte", uf: "MG", estagio: "ATIVO", situacoes: [], criadoEm: d(90), socios: [socio(4, "Paulo Aroeira", d(80), d(77))], ultimaAtividade: d(1) },
];
export const SESSAO = { pessoaId: CA.pessoaId, nome: "Carol Andrade", funcoes: ["ADMINISTRACAO"], acoes: [] };
export const PERMISSOES = ["console.estagio.mudar", "console.ficha.ver", "console.notas.ver", "console.socios.convidar"];

export function ficha(c: (typeof CLIENTES)[number], permissoes = PERMISSOES) {
  return {
    escritorio: { id: c.id, nome: c.nome, cidade: c.cidade, uf: c.uf, cnpj: "22914870000166", criadoEm: c.criadoEm, versao: 3 },
    cliente: { estagio: c.estagio, referenciaContrato: "Contrato 2026/031", versao: 2 },
    socios: c.socios.map((s) => ({ ...s, email: "renata@cedroelima.adv.br" })),
    equipe: c.equipe.map((p) => ({ vinculoId: p.pessoaId, pessoaId: p.pessoaId, nome: p.nome, funcao: p.funcoes[0] })),
    situacoes: c.situacoes, ultimaAtividade: c.ultimaAtividade, permissoes,
  };
}

type Resposta = { status?: number; corpo: unknown };
export async function simular(page: Page, rotas: Record<string, Resposta | Resposta[]>, pedidos: { metodo: string; caminho: string; corpo: unknown }[] = []) {
  await page.route("**/api/v1/**", async (rota) => {
    const url = new URL(rota.request().url());
    const caminho = url.pathname.replace(/^\/api/, "");
    const metodo = rota.request().method();
    pedidos.push({ metodo, caminho, corpo: rota.request().postDataJSON() });
    const r = rotas[`${metodo} ${caminho}`] ?? rotas[caminho];
    const lista = Array.isArray(r) ? r : r ? [r] : [{ status: 404, corpo: { erro: { codigo: "NOT_FOUND" } } }];
    const vez = pedidos.filter((p) => p.caminho === caminho && p.metodo === metodo).length - 1;
    const x = lista[Math.min(vez, lista.length - 1)]!;
    await rota.fulfill({ status: x.status ?? 200, contentType: "application/json", body: JSON.stringify(x.corpo) });
  });
  return pedidos;
}

export async function semViolacoes(page: Page) {
  // A barra do celular é fixa no topo: rolada, ela cobre parte do que passa por baixo e o axe
  // acusa alvo pequeno. Confere com a página no topo, como ela abre.
  await page.evaluate(() => window.scrollTo(0, 0));
  // A janela abre com uma animação curta de opacidade: o axe mede a cor só depois que ela acaba.
  await page.evaluate(() =>
    Promise.all(document.getAnimations().filter((a) => a.effect?.getTiming().iterations !== Infinity).map((a) => a.finished.catch(() => null))),
  );
  // Na troca de tela sem recarga, o título da página nova chega logo depois do conteúdo.
  await expect(page).toHaveTitle(/\S/);
  const axe = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  expect(axe.violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

