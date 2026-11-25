// Tabelas do Portal: toque, leitor de tela e foco (F3.165, PT-10). Plano aprovado pela Carol em 24/11/2026,
// em docs/design/aprovadas/portal-tabelas-toque/.
//
// 1. Todo alvo das tabelas e das listas que as trocam tem área de toque de 44 x 44 px, medida tocando de
//    verdade (elementFromPoint a partir do centro), a 800, 1024, 1280 e 1440 e no celular a 390 e 320.
// 2. No computador o desenho fica igual: o ::after é absoluto e a altura das tabelas a 1024 e 1280 é a
//    gravada antes da regra (portal-tabelas-alturas.json).
// 3. A Agenda do celular fica como estava (fora do alcance da regra).
// 4. No celular, o botão compacto das tabelas e listas tem 44 px visíveis.
// 5. O foco volta a um lugar que existe quando a janela fecha de qualquer jeito (Janela, foco.ts).
// 6. As duas tabelas da Equipe têm nome, e a cópia que sobe a 1024 é lida uma vez só.
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fixarRelogio } from "./console-dados.ts";
import { AGENDA, CONTRATOS, ESCRITORIO, FICHA, LARISSA, MARINA, cid } from "./portal-tabelas-toque-dados.ts";

const P = "http://localhost:3000";
type Resposta = { status: number; corpo?: unknown; texto?: string };
type Tela = { nome: string; url: string; quando: number; respostas: Record<string, Resposta>; clicar?: string[] };
const TELAS: Tela[] = JSON.parse(readFileSync(new URL("./portal-tabelas-telas.json", import.meta.url), "utf8"));
const ALTURAS: Record<string, Record<string, [string, number][]>> = JSON.parse(readFileSync(new URL("./portal-tabelas-alturas.json", import.meta.url), "utf8"));
const tela = (n: string) => structuredClone(TELAS.find((t) => t.nome === n)!);
const celular = () => test.info().project.name === "celular";
const soComputador = () => test.skip(celular(), "caso do computador");
const soCelular = () => test.skip(!celular(), "caso do celular");

async function abrir(page: Page, t: Tela, extra: Record<string, Resposta> = {}) {
  await page.clock.setFixedTime(new Date(t.quando));
  await page.route("**/api/v1/**", async (rota) => {
    const u = new URL(rota.request().url());
    const metodo = rota.request().method();
    const x = extra[`${metodo} ${u.pathname}`] ?? (metodo === "GET" ? t.respostas[u.pathname + u.search] ?? t.respostas[u.pathname] : undefined)
      ?? { status: 404, corpo: { erro: { codigo: "NOT_FOUND" } } };
    await rota.fulfill({ status: x.status, contentType: "application/json", body: x.texto ?? JSON.stringify(x.corpo) });
  });
  await page.goto(`${P}${t.url}`);
  for (const nome of t.clicar ?? []) await page.getByRole("button", { name: nome }).first().click();
  await expect(page.locator(".pt .folha table").first()).toBeAttached();
  await page.evaluate(() => document.fonts.ready);
}

/** API simulada só por caminho (GET), para a ficha do cliente e a Agenda. */
async function simular(page: Page, rotas: Record<string, unknown>) {
  await page.route("**/api/v1/**", async (r) => {
    const c = new URL(r.request().url()).pathname.replace(/^\/api/, "");
    const x = r.request().method() === "GET" ? rotas[c] : undefined;
    await r.fulfill({ status: x ? 200 : 404, contentType: "application/json", body: JSON.stringify(x ?? { erro: { codigo: "NOT_FOUND" } }) });
  });
}

async function largura(page: Page, w: number, h = 900) {
  await page.setViewportSize({ width: w, height: h });
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}

/**
 * Alvos das tabelas e listas da folha com área de toque menor que 44 x 44 px, ou com o centro coberto.
 * A área é varrida com elementFromPoint a partir do centro, de meio em meio pixel: pega o ::after, recortes e
 * sobreposições, e não a caixa desenhada.
 */
function alvosPequenos(page: Page) {
  return page.evaluate(() => {
    const SEL = "a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button],[role=link],[role=checkbox],[tabindex]:not([tabindex='-1'])";
    const visivel = (e: Element) => !!e.getClientRects().length && getComputedStyle(e).visibility !== "hidden" && getComputedStyle(e).display !== "none";
    const conts = [...document.querySelectorAll(".pt .folha table, .pt .folha .so-cel")].filter((c) => !c.closest("dialog,[role=dialog]") && visivel(c));
    const els: HTMLElement[] = [];
    for (const c of conts) for (const e of c.querySelectorAll<HTMLElement>(SEL)) if (visivel(e) && !els.includes(e)) els.push(e);
    const acerta = (e: Element, x: number, y: number) => { const h = document.elementFromPoint(x, y); return !!h && (h === e || e.contains(h)); };
    const ruins: string[] = [];
    for (const e of els) {
      e.scrollIntoView({ block: "center", inline: "nearest" });
      const r = e.getBoundingClientRect();
      let cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const nome = (e.getAttribute("aria-label") || e.innerText || "").replace(/\s+/g, " ").trim().slice(0, 40);
      if (!acerta(e, cx, cy)) {
        const q = [...e.getClientRects()].find((q) => acerta(e, q.left + q.width / 2, q.top + q.height / 2));
        if (!q) { ruins.push(`${nome}: centro coberto`); continue; }
        cx = q.left + q.width / 2; cy = q.top + q.height / 2;
      }
      let t = cy, b = cy, l = cx, d = cx;
      while (t > cy - 80 && acerta(e, cx, t - 0.5)) t -= 0.5;
      while (b < cy + 80 && acerta(e, cx, b + 0.5)) b += 0.5;
      while (l > cx - r.width - 80 && acerta(e, l - 0.5, cy)) l -= 0.5;
      while (d < cx + r.width + 80 && acerta(e, d + 0.5, cy)) d += 0.5;
      const w = d + 0.5 - l, h = b + 0.5 - t;
      if (w < 44 || h < 44) ruins.push(`${nome}: ${w} x ${h}`);
    }
    return ruins;
  });
}

/** Alvos ao alcance da regra cujo ::after não é absoluto (a área de toque mudaria o desenho). */
function afterNaoAbsoluto(page: Page) {
  return page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".pt .folha :is(table td,:is(.cartoes,.cb-cartoes).so-cel) :is(a[href],button)")]
    .filter((e) => !e.closest("dialog") && !e.matches(".c-nome,.sem-area") && e.getClientRects().length && getComputedStyle(e).display !== "none")
    .filter((e) => getComputedStyle(e, "::after").position !== "absolute")
    .map((e) => (e.getAttribute("aria-label") || e.innerText).replace(/\s+/g, " ").trim().slice(0, 40)));
}

/** Altura de cada tabela visível da folha (fora de janelas). */
function alturas(page: Page) {
  return page.evaluate(() => [...document.querySelectorAll<HTMLTableElement>(".pt .folha table")]
    .filter((t) => !t.closest("dialog,[role=dialog]") && t.getClientRects().length && getComputedStyle(t).display !== "none")
    .map((t) => [t.getAttribute("data-prio-tabela") || t.className.split(" ").slice(0, 2).join("."), Math.round(t.getBoundingClientRect().height)] as [string, number]));
}

/** Botões compactos das tabelas e listas com menos de 44 px de altura visível. */
function compactosBaixos(page: Page) {
  return page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".pt .folha :is(table td,:is(.cartoes,.cb-cartoes).so-cel) .btn-compacto")]
    .filter((e) => !e.closest("dialog") && e.getClientRects().length && getComputedStyle(e).display !== "none" && e.getBoundingClientRect().height < 44)
    .map((e) => `${(e.getAttribute("aria-label") || e.innerText).replace(/\s+/g, " ").trim().slice(0, 40)}: ${e.getBoundingClientRect().height} px`));
}

async function conferirToque(page: Page, nome: string) {
  const cel = celular();
  for (const w of cel ? [390, 320] : [800, 1024, 1280, 1440]) {
    await largura(page, w, cel ? 844 : 900);
    expect(await alvosPequenos(page), `alvos abaixo de 44 px a ${w}`).toEqual([]);
    if (cel) expect(await compactosBaixos(page), `compactos abaixo de 44 px a ${w}`).toEqual([]);
    else expect(await afterNaoAbsoluto(page), `::after fora do fluxo a ${w}`).toEqual([]);
    const gravadas = ALTURAS[nome]?.[String(w)];
    if (gravadas) {
      const agora = await alturas(page);
      expect(agora.map(([t]) => t), `tabelas a ${w}`).toEqual(gravadas.map(([t]) => t));
      agora.forEach(([t, a], i) => expect(Math.abs(a - gravadas[i]![1]), `altura de ${t} a ${w}: ${a}, gravada ${gravadas[i]![1]}`).toBeLessThanOrEqual(1));
    }
  }
}

test.describe("F3.165 · toque de 44 px nas tabelas (testes 1, 2 e 4)", () => {
  for (const t of TELAS) {
    test(t.nome + (t.clicar?.length ? ` (${t.clicar.join(", ")})` : ""), async ({ page }) => {
      test.setTimeout(120_000);
      if (celular()) await page.setViewportSize({ width: 390, height: 844 });
      await abrir(page, structuredClone(t));
      await conferirToque(page, t.nome);
    });
  }

  for (const aba of ["propostas", "contratos", "casos"] as const) {
    test(`Ficha do cliente · ${aba}`, async ({ page }) => {
      test.setTimeout(120_000);
      const gravada = (nome: string, chave: string) => tela(nome).respostas[chave]!.corpo as Record<string, Record<string, unknown>[]>;
      const propostas = gravada("/comercial/propostas", "/api/v1/escritorio/propostas?mostrar=ANDAMENTO").propostas!
        .map((p, i) => ({ ...p, cliente: { id: cid(1), nome: "Antônia Ferreira Prado", tipo: "PF" }, temContrato: i === 0, criadoPor: MARINA }));
      const casos = gravada("/juridico/casos", "/api/v1/escritorio/juridico/casos?situacao=ANDAMENTO").casos!
        .map((c) => ({ ...c, papel: "AUTOR", etapas: 8, contrato: { id: CONTRATOS[0]!.id, numero: "C-2026-031" } }));
      await simular(page, {
        "/v1/escritorio": ESCRITORIO,
        [`/v1/escritorio/clientes/${cid(1)}`]: { ...FICHA, contagens: { propostas: propostas.length, contratos: CONTRATOS.length, casos: casos.length } },
        "/v1/escritorio/pessoas": { pessoas: [MARINA, LARISSA] },
        [`/v1/escritorio/clientes/${cid(1)}/propostas`]: { propostas },
        [`/v1/escritorio/clientes/${cid(1)}/contratos`]: { contratos: CONTRATOS },
        [`/v1/escritorio/clientes/${cid(1)}/casos`]: { casos },
      });
      await page.setViewportSize(celular() ? { width: 390, height: 844 } : { width: 800, height: 900 });
      await page.goto(`${P}/clientes/${cid(1)}?aba=${aba}`);
      await expect(page.locator(".pt .folha table.fl-tab").first()).toBeAttached();
      await page.evaluate(() => document.fonts.ready);
      await conferirToque(page, `Ficha do cliente · ${aba}`);
    });
  }
});

test.describe("F3.165 · a Agenda do celular fica como estava (teste 3)", () => {
  for (const w of [390, 320]) for (const ver of ["semana", "mes"] as const) {
    test(`Agenda a ${w}, vista ${ver}: o canto do cartão abre a ficha, e a borda de um dia não abre o vizinho`, async ({ page }) => {
      soCelular();
      // O mini-calendário do mês muda de 6 para 5 semanas conforme o mês: relógio em AGORA, novembro de 2026 (F3.164).
      await fixarRelogio(page);
      await simular(page, { "/v1/escritorio": ESCRITORIO, "/v1/escritorio/pessoas": { pessoas: [LARISSA] }, "/v1/escritorio/clientes": { comercial: true, clientes: [] }, "/v1/escritorio/agenda": AGENDA });
      await page.setViewportSize({ width: w, height: 844 });
      await page.goto(`${P}/agenda${ver === "mes" ? "?ver=mes" : ""}`);
      await expect(page.locator(".so-cel .ag-it a.t").first()).toBeVisible();
      const r = await page.evaluate(() => {
        const a = document.querySelector<HTMLElement>(".so-cel .ag-it a.t")!;
        a.scrollIntoView({ block: "center" });
        const cx = a.closest(".cx")!.getBoundingClientRect();
        const acerta = (x: number, y: number) => { const h = document.elementFromPoint(x, y); return !!h && (h === a || a.contains(h)); };
        const dias = [...document.querySelectorAll<HTMLElement>(".ag-mini a")].filter((d) => d.checkVisibility());
        let vizinho = 0, pares = 0;
        for (let i = 0; i < dias.length - 1; i++) {
          if (dias[i + 1]!.getBoundingClientRect().top !== dias[i]!.getBoundingClientRect().top) continue;
          pares++;
          dias[i]!.scrollIntoView({ block: "center" });
          const q = dias[i]!.getBoundingClientRect();
          const e = document.elementFromPoint(q.right - 1, q.top + q.height / 2);
          if (e && !(e === dias[i] || dias[i]!.contains(e))) vizinho++;
        }
        return { canto: acerta(cx.right - 6, cx.bottom - 6), vizinho, pares };
      });
      // O canto de baixo do cartão abre a ficha (o de cima, na vista mês, já ficava sob o cabeçalho antes da regra).
      expect(r).toEqual({ canto: true, vizinho: 0, pares: ver === "mes" ? 36 : 0 });
    });
  }
});

/** Onde está o foco: o nome do elemento, ou "perdido" (body) ou "escondido". */
const foco = (page: Page) => page.evaluate(() => {
  const a = document.activeElement as HTMLElement | null;
  if (!a || a === document.body) return "perdido";
  if (!a.checkVisibility() || a.getBoundingClientRect().width <= 1) return "escondido";
  return (a.getAttribute("aria-label") || a.innerText || "").replace(/\s+/g, " ").trim();
});

test.describe("F3.165 · o foco volta quando a janela fecha (teste 5)", () => {
  for (const como of ["Cancelar", "Fechar", "Esc"] as const) {
    test(`A pagar a 1280: Paga, depois ${como}: volta ao mesmo Paga`, async ({ page }) => {
      soComputador();
      await page.setViewportSize({ width: 1280, height: 900 });
      await abrir(page, tela("Financeiro · A pagar"));
      const b = page.locator("table[data-prio-tabela=a-pagar] tbody").getByRole("button", { name: /^Paga/ }).first();
      await b.click();
      const j = page.getByRole("dialog");
      await expect(j).toBeVisible();
      if (como === "Esc") await page.keyboard.press("Escape");
      else await j.getByRole("button", { name: como, exact: true }).click();
      await expect(j).toHaveCount(0);
      await expect(b).toBeFocused();
    });
  }

  for (const w of [1280, 390]) test(`A receber a ${w}: Registrar, depois Cancelar: volta ao mesmo Registrar`, async ({ page }) => {
    test.skip(celular() !== (w === 390));
    await page.setViewportSize({ width: w, height: w === 390 ? 844 : 900 });
    await abrir(page, tela("Financeiro · A receber"));
    const b = page.locator("table[data-prio-tabela=a-receber] tbody").getByRole("button", { name: /^Registrar recebimento/ }).filter({ visible: true }).first();
    await b.click();
    const j = page.getByRole("dialog");
    await expect(j).toBeVisible();
    await j.getByRole("button", { name: "Cancelar", exact: true }).click();
    await expect(j).toHaveCount(0);
    await expect(b).toBeFocused();
  });

  test("A pagar: Anexar da cópia a 1024, a tela passa a 1280 com a janela aberta, Esc: vai ao Anexar da coluna", async ({ page }) => {
    soComputador();
    await page.setViewportSize({ width: 1024, height: 900 });
    await abrir(page, tela("Financeiro · A pagar"), { "POST /api/v1/escritorio/financeiro/anexos/buscar": { status: 200, corpo: { anexos: [] } } });
    const linha = page.locator("table[data-prio-tabela=a-pagar] tbody>tr").filter({ has: page.locator(".pt-sobe").getByRole("button", { name: /Anexar/ }) }).first();
    await linha.locator(".pt-sobe").getByRole("button", { name: /Anexar/ }).click();
    const j = page.getByRole("dialog", { name: "Anexar nota, guia ou boleto" });
    await expect(j).toBeVisible();
    await largura(page, 1280);
    await page.keyboard.press("Escape");
    await expect(j).toBeHidden();
    await expect.poll(() => foco(page)).toBe("Anexar a nota, guia ou boleto de Custas recursais");
    await expect(linha.locator(".pt-sobe").getByRole("button", { name: /Anexar/ })).toBeHidden();
  });

  /** Retira alguém da Equipe pela janela; a lista que volta do servidor já não tem a pessoa. */
  async function retirar(page: Page, quem: string, atraso: number, mudar?: (t: Tela) => void) {
    await page.setViewportSize({ width: 1280, height: 900 });
    const t = tela("/equipe");
    mudar?.(t);
    const eq = t.respostas["/api/v1/escritorio/equipe"]!.corpo as { pessoas: { nome: string; vinculoId: string }[] };
    const p = eq.pessoas.find((x) => x.nome === quem)!;
    let retirou = false;
    page.on("request", (r) => {
      if (r.method() === "POST" && r.url().endsWith("/retirar")) { retirou = true; eq.pessoas = eq.pessoas.filter((x) => x.nome !== quem); }
    });
    await abrir(page, t, { [`POST /api/v1/escritorio/equipe/${p.vinculoId}/retirar`]: { status: 200, corpo: { versao: 2 } } });
    if (atraso) await page.route("**/api/v1/escritorio/equipe", async (rota) => {
      if (retirou && rota.request().method() === "GET") await new Promise((r) => setTimeout(r, atraso));
      await rota.fallback();
    });
    await page.getByRole("button", { name: `Retirar ${quem} da equipe` }).first().click();
    const j = page.getByRole("alertdialog");
    const sel = j.getByRole("combobox");
    await sel.selectOption((await sel.locator("option").nth(1).getAttribute("value"))!);
    await j.getByRole("button", { name: /^Retirar/ }).click();
    await expect(j).toBeHidden();
    await expect(page.getByRole("button", { name: `Retirar ${quem} da equipe` })).toHaveCount(0, { timeout: 5000 });
  }

  test("Equipe: Retirar Felipe Matos, a resposta chega na hora: vai à linha que ficou no lugar", async ({ page }) => {
    soComputador();
    await retirar(page, "Felipe Matos", 0);
    await expect.poll(() => foco(page)).toMatch(/^Gustavo Lima/);
  });

  test("Equipe: Retirar Felipe Matos, a lista volta 600 ms depois: vai à linha que ficou no lugar", async ({ page }) => {
    soComputador();
    await retirar(page, "Felipe Matos", 600);
    await expect.poll(() => foco(page)).toMatch(/^Gustavo Lima/);
  });

  test("Equipe: Retirar Gustavo Lima, a última linha: vai à anterior", async ({ page }) => {
    soComputador();
    await retirar(page, "Gustavo Lima", 0);
    await expect.poll(() => foco(page)).toMatch(/^Felipe Matos/);
  });

  test("Equipe: Retirar, depois Esc: volta ao mesmo Retirar", async ({ page }) => {
    soComputador();
    await page.setViewportSize({ width: 1280, height: 900 });
    await abrir(page, tela("/equipe"));
    const b = page.getByRole("button", { name: "Retirar Felipe Matos da equipe" }).first();
    await b.click();
    const j = page.getByRole("alertdialog");
    await expect(j).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(j).toBeHidden();
    await expect(b).toBeFocused();
  });

  test("Equipe: a tabela fica vazia; o título da folha é .sr, então o foco vai ao h1", async ({ page }) => {
    soComputador();
    await retirar(page, "Felipe Matos", 0, (t) => {
      const eq = t.respostas["/api/v1/escritorio/equipe"]!.corpo as { pessoas: { nome: string }[] };
      eq.pessoas = eq.pessoas.filter((x) => x.nome !== "Gustavo Lima");
    });
    await expect(page.locator("table[data-prio-tabela=equipe]")).toHaveCount(0);
    await expect(page.locator("h1").first()).toBeFocused();
  });
});

test.describe("F3.165 · nomes para o leitor de tela (teste 6)", () => {
  test("Equipe: as duas tabelas têm nome", async ({ page }) => {
    soComputador();
    await page.setViewportSize({ width: 1280, height: 900 });
    await abrir(page, tela("/equipe"));
    await expect(page.getByRole("table", { name: "Pessoas da equipe" })).toBeVisible();
    await page.unrouteAll({ behavior: "ignoreErrors" });
    await abrir(page, tela("/equipe (2)"));
    await expect(page.getByRole("table", { name: "Pessoas retiradas" })).toBeVisible();
  });

  test("A pagar a 1024: \"Nota ou guia: Falta a nota fiscal\" aparece uma vez, com um só Anexar", async ({ page }) => {
    soComputador();
    await page.setViewportSize({ width: 1024, height: 900 });
    await abrir(page, tela("Financeiro · A pagar"));
    const linha = page.locator("table[data-prio-tabela=a-pagar] tbody>tr").filter({ hasText: "Custas recursais" }).first();
    const celulas = linha.getByRole("cell", { name: /Falta a nota fiscal/ });
    await expect(celulas).toHaveCount(1);
    await expect(celulas).toHaveAccessibleName(/Nota ou guia: Falta a nota fiscal/);
    await expect(linha.getByRole("button", { name: /^Anexar/ })).toHaveCount(1);
  });
});
