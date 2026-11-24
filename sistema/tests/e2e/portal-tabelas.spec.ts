// Tabelas do Portal (F3.124; decisões da Carol de 23/11/2026, plano aprovado na versão 6): quando a
// tabela não cabe, saem as colunas secundárias e a tabela fica; abaixo de 1360 px de janela, a coluna
// lateral das 8 grades marcadas com pt-desce desce para baixo da folha; onde nem as colunas essenciais
// cabem, ficam os cartões do celular.
//
// Cada tela com tabela é aberta a partir de portal-tabelas-telas.json: o endereço e as respostas GET da
// API gravadas dos testes de cada tela, com o relógio da página parado na hora da gravação (as datas
// relativas, como "vence amanhã", ficam como foram gravadas). Para pôr uma tela nova, veja a regra
// "Tabela nova no Portal" no sistema/README.md.
import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readdirSync, readFileSync } from "node:fs";
import { semViolacoes, TAGS } from "./console-dados.ts";

const P = "http://localhost:3000";
const PRIO: Record<string, { "2"?: string[]; "3"?: string[] }> = JSON.parse(readFileSync(new URL("../../packages/ui/src/portal/prioridades.json", import.meta.url), "utf8"));
const PORTAL = new URL("../../packages/ui/src/portal/", import.meta.url);

type Resposta = { status: number; corpo?: unknown; texto?: string };
type Tela = {
  nome: string;
  url: string;
  /** Hora da gravação (ms): o relógio da página fica parado nela. */
  quando: number;
  /** Respostas GET da API, por caminho e busca (/api/v1/...). */
  respostas: Record<string, Resposta>;
  /** Botões a apertar depois de abrir (por exemplo, a aba "Retiradas" da Equipe). */
  clicar?: string[];
  /** Tabelas com prioridade que a tela mostra, e os cabeçalhos de prioridade de cada uma. */
  prio: Record<string, string[]>;
  /** Grades marcadas com pt-desce que a tela mostra (classe da grade). */
  desce: string[];
};
const TELAS: Tela[] = JSON.parse(readFileSync(new URL("./portal-tabelas-telas.json", import.meta.url), "utf8"));
const LARGURAS = [800, 1024, 1280, 1440, 1920];
const GRADES = ".hn-grade,.fi-grade,.cl-grade,.cv-nc,.cv-av-grade,.au-grade,.wa-grade";

/** As 8 grades que descem (A3), aprovadas uma a uma: tela e classe da grade. Grade nova só desce se entrar aqui e no JSX. */
const DESCEM = [
  "Jurídico · Petições|hn-grade",
  "Contratos · Honorários|hn-grade",
  "Conversas · Automações|au-grade",
  "Conversas · Avisos automáticos|cv-av-grade",
  "A pagar · conta recorrente|fi-grade",
  "Relatórios · um cliente|fi-grade",
  "Repasses · ficha do repasse|fi-grade",
  "Clientes · Importar|hn-grade",
];

const soComputador = () => test.skip(test.info().project.name === "celular", "as faixas e a coluna lateral são do computador");

async function abrir(page: Page, tela: Tela, mudar?: (caminho: string, corpo: unknown) => unknown, extra: Record<string, Resposta> = {}) {
  await page.clock.setFixedTime(new Date(tela.quando));
  await page.route("**/api/v1/**", async (rota) => {
    const u = new URL(rota.request().url());
    const metodo = rota.request().method();
    const chave = u.pathname + u.search;
    const x = extra[`${metodo} ${u.pathname}`] ?? (metodo === "GET" ? tela.respostas[chave] ?? tela.respostas[u.pathname] : undefined)
      ?? { status: 404, corpo: { erro: { codigo: "NOT_FOUND" } } };
    const corpo = mudar && x.corpo !== undefined ? mudar(u.pathname, structuredClone(x.corpo)) : x.corpo;
    await rota.fulfill({ status: x.status, contentType: "application/json", body: x.texto ?? JSON.stringify(corpo) });
  });
  await page.goto(`${P}${tela.url}`);
  for (const nome of tela.clicar ?? []) await page.getByRole("button", { name: nome }).first().click();
  await expect(page.locator(".pt .folha table").first()).toBeAttached();
  await page.evaluate(() => document.fonts.ready);
}

async function largura(page: Page, w: number) {
  await page.setViewportSize({ width: w, height: 900 });
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}

/** Tabela que passa da folha, célula que transborda mais de 2 px e cartão de lista que passa da folha. */
function problemas(page: Page) {
  return page.evaluate(() => {
    const out: string[] = [];
    const nome = (e: Element) => (e as HTMLElement).innerText?.replace(/\s+/g, " ").trim().slice(0, 40);
    for (const t of document.querySelectorAll<HTMLTableElement>(".pt .folha table")) {
      if (t.closest("dialog,[role=dialog]") || !t.getClientRects().length || getComputedStyle(t).display === "none") continue;
      const r = t.getBoundingClientRect();
      let c = t.parentElement;
      while (c && !c.classList.contains("folha") && getComputedStyle(c).overflowX === "visible") c = c.parentElement;
      if (c && r.right > c.getBoundingClientRect().right + 2) out.push(`${t.className}: passa da folha em ${Math.round(r.right - c.getBoundingClientRect().right)} px`);
      for (const cel of t.querySelectorAll<HTMLElement>("th,td")) {
        if (getComputedStyle(cel).display === "none" || !cel.getClientRects().length) continue;
        if (cel.scrollWidth > cel.clientWidth + 2) out.push(`${t.className}: "${nome(cel)}" transborda ${cel.scrollWidth - cel.clientWidth} px`);
      }
    }
    for (const l of document.querySelectorAll<HTMLElement>(".pt .folha .so-cel")) {
      if (!l.getClientRects().length || getComputedStyle(l).display === "none") continue;
      const f = l.closest(".folha")!.getBoundingClientRect();
      for (const c of l.children) if (c.getBoundingClientRect().right > f.right + 2) out.push(`${l.className}: cartão passa da folha`);
    }
    return [...new Set(out)];
  });
}

/** O menor espaço entre os textos de duas células vizinhas, nas 8 primeiras linhas de cada tabela. */
function respiro(page: Page) {
  return page.evaluate(() => [...document.querySelectorAll<HTMLTableElement>(".pt .folha table")]
    .filter((t) => !t.closest("dialog,[role=dialog]") && t.getClientRects().length && getComputedStyle(t).display === "table")
    .map((t) => {
      const bordas = (c: Element) => {
        let l = Infinity, r = -Infinity;
        const w = document.createTreeWalker(c, NodeFilter.SHOW_TEXT);
        for (let n = w.nextNode(); n; n = w.nextNode()) {
          const el = n.parentElement;
          if (!n.textContent?.trim() || !el || el.closest(".sr,[aria-hidden=true]") || !el.getClientRects().length || getComputedStyle(el).visibility === "hidden") continue;
          const rg = document.createRange(); rg.selectNodeContents(n);
          for (const q of rg.getClientRects()) if (q.width) { l = Math.min(l, q.left); r = Math.max(r, q.right); }
        }
        return { l, r };
      };
      let min = Infinity, onde = "";
      for (const tr of [...t.querySelectorAll(":scope>thead>tr,:scope>tbody>tr")].slice(0, 8)) {
        const cs = [...tr.children].filter((c) => c.getClientRects().length && getComputedStyle(c).display !== "none");
        for (let i = 0; i + 1 < cs.length; i++) {
          const a = bordas(cs[i]!), b = bordas(cs[i + 1]!);
          if (!isFinite(a.r) || !isFinite(b.l)) continue;
          if (b.l - a.r < min) { min = Math.round(b.l - a.r); onde = `${(cs[i] as HTMLElement).innerText.trim().slice(0, 30)} | ${(cs[i + 1] as HTMLElement).innerText.trim().slice(0, 30)}`; }
        }
      }
      return { tabela: t.className, min, onde };
    }));
}

/** Grades com coluna lateral: marcada (pt-desce) e se a coluna lateral está embaixo. */
function grades(page: Page) {
  return page.evaluate((sel) => [...document.querySelectorAll(sel)]
    .filter((g) => !g.closest("dialog,[role=dialog]") && g.children.length >= 2 && g.getClientRects().length)
    .map((g) => {
      const a = g.children[0]!.getBoundingClientRect(), b = g.children[1]!.getBoundingClientRect();
      return { classe: [...g.classList].filter((c) => !c.startsWith("au-grade-") && c !== "pt-desce").join(" "), marcada: g.classList.contains("pt-desce"), embaixo: b.top >= a.bottom - 1 };
    }), GRADES);
}

/** O nível de cada tabela com faixa: inteira, -n colunas fora, cartões ou lista. */
function niveis(page: Page) {
  return page.evaluate(() => [...document.querySelectorAll<HTMLTableElement>(".pt .folha table")]
    .filter((t) => t.matches("[data-sai3],[data-sai2],[data-cartoes]") && !t.closest("dialog,[role=dialog]"))
    .map((t) => {
      const vis = t.getClientRects().length ? getComputedStyle(t).display : "none";
      const fora = [...t.querySelectorAll("thead th[data-prio]")].filter((h) => getComputedStyle(h).display === "none").length;
      return vis === "table" ? (fora ? `-${fora}` : "inteira") : vis === "none" ? "lista" : "cartões";
    }));
}

/** Fonte única: o data-prio de cada <th> e célula é o do prioridades.json. */
function fonte(page: Page) {
  return page.evaluate((prio) => {
    const norm = (s: string | null) => (s || "").trim().replace(/\s+/g, " ").toLocaleUpperCase("pt-BR");
    const erros: string[] = []; const vistas: Record<string, string[]> = {};
    for (const t of document.querySelectorAll<HTMLTableElement>("table[data-prio-tabela]")) {
      const id = t.dataset.prioTabela!; const m = prio[id];
      if (!m) { erros.push(`${id}: não está em prioridades.json`); continue; }
      const esperado = new Map<string, string>();
      for (const p of ["2", "3"] as const) for (const h of m[p] ?? []) esperado.set(norm(h), p);
      const ths = [...t.querySelectorAll(":scope>thead>tr>th")];
      vistas[id] = [...new Set([...(vistas[id] ?? []), ...ths.map((th) => norm(th.textContent)).filter((h) => esperado.has(h))])];
      ths.forEach((th, i) => {
        const quer = i > 0 ? esperado.get(norm(th.textContent)) ?? null : null;
        if (th.getAttribute("data-prio") !== quer) erros.push(`${id}: <th> "${norm(th.textContent)}" com data-prio ${th.getAttribute("data-prio")}, o arquivo diz ${quer}`);
      });
      for (const tr of t.querySelectorAll(":scope>tbody>tr,:scope>tfoot>tr")) {
        let pos = 0;
        for (const c of tr.children as HTMLCollectionOf<HTMLTableCellElement>) {
          const quer = c.colSpan === 1 ? ths[pos]?.getAttribute("data-prio") ?? null : null;
          if (c.getAttribute("data-prio") !== quer) { erros.push(`${id}: célula da coluna ${pos + 1} sem o data-prio do <th>`); break; }
          pos += c.colSpan || 1;
        }
      }
    }
    return { erros: [...new Set(erros)], vistas };
  }, PRIO);
}

/**
 * Faixas em N e N - 1, com dados longos (R$ 123.456,78 em todo valor e um nome mais comprido nas duas
 * primeiras linhas) e a folha com N px de conteúdo: em N, o nível de cima sem transbordo; em N - 1, o de
 * baixo (colunas fora ou cartões), também sem transbordo.
 */
async function faixas(page: Page) {
  await largura(page, 1440);
  await page.evaluate(() => {
    const w = window as unknown as { __orig: [Text, string][] }; w.__orig = [];
    for (const tb of document.querySelectorAll(".pt .folha table tbody")) {
      for (const tr of [...tb.querySelectorAll(":scope>tr")].slice(0, 2)) {
        const ws = document.createTreeWalker(tr, NodeFilter.SHOW_TEXT); const ns: Text[] = [];
        for (let n = ws.nextNode(); n; n = ws.nextNode()) ns.push(n as Text);
        for (const n of ns) if (/R\$\s?-?[\d.]+,\d\d/.test(n.data)) { w.__orig.push([n, n.data]); n.data = n.data.replace(/R\$\s?-?[\d.]+,\d\d/g, "R$ 123.456,78"); }
        const ths = [...(tb.closest("table")?.querySelectorAll("thead th") ?? [])];
        const ci = ths.findIndex((h) => /cliente|contrato|conta|nome|pessoa|proposta|quem|automa/i.test(h.textContent || ""));
        const alvo = ci >= 0 ? tr.children[ci]?.querySelector("a,strong,b") ?? tr.children[ci] : null;
        if (alvo?.firstChild?.nodeType === 3) { const t = alvo.firstChild as Text; w.__orig.push([t, t.data]); t.data += " Empreendimentos Imobiliários"; }
      }
    }
  });
  const tabelas = await page.evaluate(() => [...document.querySelectorAll("table")].map((t, i) => ({ i, ok: !!t.closest(".pt .folha") && !t.closest("dialog,[role=dialog]") && t.matches("[data-sai3],[data-sai2],[data-cartoes]") })).filter((x) => x.ok).map((x) => x.i));
  const erros: string[] = [];
  for (const i of tabelas) {
    const prep = (px: number | null) => page.evaluate(([i, px]) => {
      const t = document.querySelectorAll("table")[i as number]!; const f = t.closest(".folha") as HTMLElement;
      if (px === null) for (const p of ["width", "max-width", "min-width", "box-sizing"]) f.style.removeProperty(p);
      else Object.assign(f.style, { boxSizing: "content-box", width: `${px}px`, maxWidth: "none", minWidth: "0" });
      const p3 = t.querySelector('th[data-prio="3"]'), p2 = t.querySelector('th[data-prio="2"]');
      return { classe: t.className, display: t.getClientRects().length ? getComputedStyle(t).display : "none", fora3: p3 ? getComputedStyle(p3).display === "none" : null, fora2: p2 ? getComputedStyle(p2).display === "none" : null,
        sai3: p3 ? Number(t.getAttribute("data-sai3") || 0) : 0, sai2: p2 ? Number(t.getAttribute("data-sai2") || 0) : 0, cartoes: Number(t.getAttribute("data-cartoes") || 0) };
    }, [i, px] as const);
    const info = await prep(null);
    for (const [nome, n] of [["data-sai3", info.sai3], ["data-sai2", info.sai2], ["data-cartoes", info.cartoes]] as const) {
      if (!n) continue;
      const em = await prep(n);
      const pEm = em.display === "table" ? await problemasDe(page, i) : [];
      const ab = await prep(n - 1);
      const pAb = ab.display === "table" ? await problemasDe(page, i) : [];
      const desceu = nome === "data-sai3" ? ab.fora3 === true : nome === "data-sai2" ? ab.fora2 === true : ab.display !== "table";
      if (pEm.length) erros.push(`${info.classe} ${nome}=${n}: transborda em N (${pEm[0]})`);
      if (pAb.length) erros.push(`${info.classe} ${nome}=${n}: transborda em N - 1 (${pAb[0]})`);
      if (!desceu) erros.push(`${info.classe} ${nome}=${n}: em N - 1 não mudou de nível`);
    }
    await prep(null);
  }
  await page.evaluate(() => { for (const [n, d] of (window as unknown as { __orig: [Text, string][] }).__orig.reverse()) n.data = d; });
  return erros;
}

/** Problemas só da tabela i (transbordo de célula acima de 2 px ou tabela passando da folha). */
function problemasDe(page: Page, i: number) {
  return page.evaluate(async (i) => {
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const t = document.querySelectorAll("table")[i]!; const f = t.closest(".folha")!; const out: string[] = [];
    if (t.getBoundingClientRect().right > f.getBoundingClientRect().right + 2) out.push(`passa da folha em ${Math.round(t.getBoundingClientRect().right - f.getBoundingClientRect().right)} px`);
    for (const cel of t.querySelectorAll<HTMLElement>("th,td")) {
      if (getComputedStyle(cel).display === "none" || !cel.getClientRects().length) continue;
      if (cel.scrollWidth > cel.clientWidth + 2) out.push(`"${cel.innerText.replace(/\s+/g, " ").trim().slice(0, 40)}" transborda ${cel.scrollWidth - cel.clientWidth} px`);
    }
    return out;
  }, i);
}

test.describe("Tabelas do Portal (F3.124): as marcas no código", () => {
  test("as 8 grades que descem estão marcadas no JSX, e só elas", async () => {
    soComputador();
    const marcas: string[] = [];
    for (const arq of readdirSync(PORTAL).filter((a) => a.endsWith(".tsx"))) {
      const s = readFileSync(new URL(arq, PORTAL), "utf8");
      marcas.push(...[...s.matchAll(/className=(?:"([^"]*\bpt-desce\b[^"]*)"|\{desce \? "([^"]*)")/g)].map((m) => `${arq}: ${m[1] ?? m[2]}`));
      marcas.push(...[...s.matchAll(/<Grade .* desce \/>/g)].map(() => `${arq}: Grade desce`));
    }
    expect(marcas.sort()).toEqual([
      "Automacoes.tsx: au-grade pt-desce",
      "AvisosAutomaticos.tsx: cv-av-grade pt-desce",
      "Contratos.tsx: hn-grade pt-desce",
      "FinanceiroRepasses.tsx: fi-grade pt-desce",
      "Importacao.tsx: Grade desce",
      "Importacao.tsx: hn-grade pt-desce",
      "ImportacaoCasos.tsx: Grade desce",
      "ImportacaoFinanceiro.tsx: Grade desce",
      "ImportacaoSistemas.tsx: Grade desce",
      "Peticoes.tsx: hn-grade pt-desce",
      "Recorrentes.tsx: fi-grade pt-desce",
      "Relatorios.tsx: fi-grade pt-desce",
    ].sort());
  });

  test("as telas cobrem toda tabela e todo cabeçalho de prioridades.json, e as 8 grades que descem", async () => {
    soComputador();
    const vistos = new Map<string, Set<string>>();
    for (const t of TELAS) for (const [id, hs] of Object.entries(t.prio)) for (const h of hs) (vistos.get(id) ?? vistos.set(id, new Set()).get(id)!).add(h);
    const faltam: string[] = [];
    for (const [id, m] of Object.entries(PRIO)) for (const h of [...(m["2"] ?? []), ...(m["3"] ?? [])]) if (!vistos.get(id)?.has(h.toLocaleUpperCase("pt-BR"))) faltam.push(`${id}: ${h}`);
    expect(faltam).toEqual([]);
    expect([...new Set(TELAS.flatMap((t) => t.desce.map((c) => `${t.nome}|${c}`)))].sort()).toEqual([...DESCEM].sort());
  });
});

test.describe("Tabelas do Portal (F3.124): cada tela", () => {
  for (const tela of TELAS) {
    test(tela.nome + (tela.clicar?.length ? ` (${tela.clicar.join(", ")})` : ""), async ({ page }) => {
      soComputador();
      test.setTimeout(120_000);
      await abrir(page, tela);
      const f = await fonte(page);
      expect(f.erros).toEqual([]);
      for (const [id, hs] of Object.entries(tela.prio)) expect(f.vistas[id] ?? [], `cabeçalhos de ${id}`).toEqual(expect.arrayContaining(hs));
      for (const w of LARGURAS) {
        await largura(page, w);
        expect(await problemas(page), `transbordo a ${w}`).toEqual([]);
        for (const r of await respiro(page)) expect(r.min, `respiro de ${r.tabela} a ${w} (${r.onde})`).toBeGreaterThanOrEqual(8);
        const gs = await grades(page);
        expect(gs.filter((g) => g.marcada).map((g) => g.classe).sort(), `grades marcadas a ${w}`).toEqual([...tela.desce].sort());
        // A 800, algumas grades sem marca já empilhavam antes (regras próprias das telas); a A3 vale de 1024 em diante.
        if (w >= 1024) for (const g of gs) expect(g.embaixo, `${g.classe} a ${w}`).toBe(g.marcada && w < 1360);
        if (w !== 1920 && (await niveis(page)).some((n) => n !== "inteira")) {
          const axe = await new AxeBuilder({ page }).withTags(TAGS).analyze();
          expect(axe.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`), `axe a ${w}`).toEqual([]);
        }
      }
      expect(await faixas(page)).toEqual([]);
    });
  }
});

const tela = (nome: string) => TELAS.find((t) => t.nome === nome)!;

test.describe("Tabelas do Portal (F3.124): o que sobe e as propostas E4 e E5", () => {
  for (const w of [1024, 1280]) test(`A pagar a ${w}: a nota que sobe tem um só Anexar, que abre a janela e devolve o foco`, async ({ page }) => {
    soComputador();
    await page.setViewportSize({ width: w, height: 900 });
    await abrir(page, tela("Financeiro · A pagar"), undefined, { "POST /api/v1/escritorio/financeiro/anexos/buscar": { status: 200, corpo: { anexos: [] } } });
    const tabela = page.locator("table[data-prio-tabela=a-pagar]");
    const linha = tabela.getByRole("row").filter({ has: page.getByRole("button", { name: /Anexar/ }) }).first();
    await expect(linha).toBeVisible();
    const coluna = await tabela.getByRole("columnheader", { name: "Nota ou guia" }).isVisible();
    expect(coluna).toBe(w === 1280);
    await expect(linha.getByRole("button", { name: /Anexar/ })).toHaveCount(1);
    if (!coluna) await expect(linha.locator(".pt-sobe").getByRole("button", { name: /Anexar/ })).toBeVisible();
    await semViolacoes(page);
    const anexar = linha.getByRole("button", { name: /Anexar/ });
    await anexar.click();
    const j = page.getByRole("dialog", { name: "Anexar nota, guia ou boleto" });
    await expect(j).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(j).toBeHidden();
    await expect(anexar).toBeFocused();
  });

  for (const w of [1024, 1280]) test(`A receber a ${w}: "Sem aviso automático" aparece uma vez, na coluna ou na Situação`, async ({ page }) => {
    soComputador();
    await page.setViewportSize({ width: w, height: 900 });
    await abrir(page, tela("Financeiro · A receber"), (caminho, corpo) => {
      const c = corpo as { parcelas?: { semAvisoAutomatico?: boolean }[] };
      if (caminho === "/api/v1/escritorio/financeiro/receber" && c.parcelas?.[0]) c.parcelas[0].semAvisoAutomatico = true;
      return c;
    });
    const tabela = page.locator("table[data-prio-tabela=a-receber]");
    const linha = tabela.locator("tbody>tr").filter({ hasText: "Sem aviso automático" });
    await expect(linha).toHaveCount(1);
    const coluna = await tabela.getByRole("columnheader", { name: "Forma e cobrança" }).isVisible();
    expect(coluna).toBe(w === 1280);
    await expect(linha.getByText("Sem aviso automático").filter({ visible: true })).toHaveCount(1);
    if (!coluna) await expect(linha.locator(".pt-sobe")).toHaveText("Forma e cobrança: Sem aviso automático");
    await expect(linha.getByRole("cell", { name: /Sem aviso automático/ })).toHaveCount(1);
    await semViolacoes(page);
  });

  test("E4: \"Falta ligar N\" no alto de Ligar as colunas só com a coluna lateral embaixo", async ({ page }) => {
    soComputador();
    const t = tela("Clientes · Importar");
    for (const w of [1024, 1280, 1440]) {
      await page.setViewportSize({ width: w, height: 900 });
      if (w === 1024) {
        await abrir(page, t);
        // A coluna A deixa de ir para o Nome: falta ligar o Nome.
        await page.getByLabel("Coluna A, Nome do cliente: vai para").selectOption("");
      }
      const linha = page.locator(".im-falta-curta");
      if (w === 1440) { await expect(linha).toBeHidden(); continue; }
      await expect(linha).toBeVisible();
      await expect(linha).toContainText(/^Falta ligar \d+ campos? obrigatórios?: .+\. Ver o que é obrigatório$/);
      const link = linha.getByRole("link", { name: "Ver o que é obrigatório" });
      expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      if (w === 1024) await semViolacoes(page);
      await link.click();
      await expect(page).toHaveURL(/#t-obr$/);
      expect(Math.round((await page.locator("#t-obr").boundingBox())!.y)).toBeLessThanOrEqual(1);
      await page.evaluate(() => window.scrollTo(0, 0));
    }
  });

  test("E5: \"Ver a mensagem\" leva até a prévia e põe o foco no título quando ela está fora da tela", async ({ page }) => {
    soComputador();
    const t = tela("Conversas · Avisos automáticos");
    for (const w of [1024, 1280, 1440]) {
      await page.setViewportSize({ width: w, height: 900 });
      if (w === 1024) await abrir(page, t);
      await page.evaluate(() => window.scrollTo(0, 0));
      const botao = page.locator("table").getByRole("button", { name: /^Ver a mensagem/ }).last();
      await botao.focus();
      await page.keyboard.press("Enter");
      const titulo = page.locator("#t-prev");
      if (w === 1440) {
        await expect(botao).toBeFocused();
      } else {
        await expect(titulo).toBeFocused();
        await expect(titulo).toBeInViewport();
      }
    }
    await semViolacoes(page);
  });
});
