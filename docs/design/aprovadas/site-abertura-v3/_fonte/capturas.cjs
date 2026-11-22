// Capturas reais do Portal (app.t3jus.pro) para o Início v3 do site. Reaproveita o gerador da v2
// (site-abertura-v2/_fonte/capturas.cjs) com três mudanças:
//  1. RELÓGIO ÚNICO: todas as telas em quarta-feira, 18/11/2026, 10h15 (Brasília). O relógio do navegador
//     (page.clock) e o do Node (Date, de onde os specs tiram dia(0)) ficam parados no mesmo instante, para
//     o Início, os Prazos, o Resumo e a Agenda dizerem o mesmo dia. Na v2, o Início dizia "domingo, 22".
//  2. TAMANHOS: "largo" (1280x800, a tela inteira dentro da moldura de navegador), "medio" (1120x800,
//     para os recortes dos destaques, que aparecem quase em tamanho real), "amplo" (1440x900, só Prazos: em
//     1120 e 1280 a lista de prazos do Portal aperta a coluna do texto) e "celular" (390x844), sempre 2x.
//  3. Captura da página inteira (fullPage) para recortar o trecho que interessa sem redimensionar e, no celular,
//     uma captura rolada (rolar: y em px) para os destaques: na página inteira a barra de baixo do Portal
//     aparece no meio da imagem.
// Sobe nada sozinho: o Portal precisa estar em http://localhost:3000
//   (cd sistema && pnpm --filter @t3jus/portal build && pnpm --filter @t3jus/portal start).
// Os dados e o "simular" (que responde a **/api/v1/**) vêm do começo de cada spec ponta a ponta
// (sistema/tests/e2e/portal-*.spec.ts). Nada vai a servidor nenhum.
// Uso: node capturas.cjs <pasta-png> [filtro]
const { execFileSync } = require('child_process');
const fs = require('fs'), path = require('path');
const REPO = '/home/claude/t3jus/sistema';
const E2E = path.join(REPO, 'tests/e2e');
const saida = path.resolve(process.argv[2] || '/tmp/t3jus-capturas-v3');
const filtro = process.argv[3] || '';
const AGORA = '2026-11-18T10:15:00-03:00'; // quarta-feira
const tmp = path.join(REPO, '.capturas-site-v3-tmp');
fs.rmSync(tmp, { recursive: true, force: true });
fs.mkdirSync(tmp, { recursive: true });
fs.mkdirSync(saida, { recursive: true });

// Relógio do Node: importado ANTES do começo de cada spec, para dia(0), new Date() etc. darem 18/11.
fs.writeFileSync(path.join(tmp, 'relogio.ts'), `const FIXO = Date.parse(${JSON.stringify(AGORA)});
const Real = Date;
class Parado extends Real { constructor(...a: any[]) { if (a.length === 0) super(FIXO); else super(...(a as [any])); } static now() { return FIXO; } }
(globalThis as any).Date = Parado;
export {};
`);

const L = ['largo', 'medio', 'celular'];
const LC = ['largo', 'celular'];
const CAPS = [
  { nome: 'inicio', tams: L, spec: 'portal-inicio', setup: `
    const AG = JSON.parse(JSON.stringify(COMUNS[\`GET /v1/escritorio/agenda?de=\${dia(0)}&ate=\${dia(0)}\`].corpo));
    AG.compromissos[0].inicio = \`\${dia(0)}T14:30:00-03:00\`; AG.compromissos[0].fim = \`\${dia(0)}T15:10:00-03:00\`;
    const R = marina()["GET /v1/escritorio/inicio/resumo"].corpo;
    await simular(page, marina({ [\`GET /v1/escritorio/agenda?de=\${dia(0)}&ate=\${dia(0)}\`]: { corpo: AG },
      "GET /v1/escritorio/inicio/resumo": { corpo: { ...R, proximoCompromisso: { ...R.proximoCompromisso, inicio: \`\${dia(0)}T14:30:00-03:00\` } } } }));`, url: '`${P}/`', h1: true },
  { nome: 'conversas', tams: L, spec: 'portal-conversas', setup: 'await simular(page, comuns());', url: '`${P}/conversas?c=${HEL}`' },
  { nome: 'propostas', tams: L, spec: 'portal-comercial', setup: 'await simular(page, comuns());', url: '`${P}/comercial/propostas`', h1: true },
  { nome: 'proposta-ficha', tams: L, spec: 'portal-comercial', setup: 'await simular(page, { ...comuns(), [`GET /v1/escritorio/propostas/${prop(16)}`]: { corpo: F16 } });', url: '`${P}/comercial/propostas/${prop(16)}`', h1: true },
  { nome: 'contratos', tams: LC, spec: 'portal-contratos', setup: 'await simular(page, comuns());', url: '`${P}/contratos`', h1: true },
  { nome: 'financeiro-resumo', tams: L, spec: 'portal-financeiro-caixa', setup: 'await simular(page, comuns());', url: '`${P}/financeiro`', h1: true },
  { nome: 'financeiro-caixa', tams: LC, spec: 'portal-financeiro-caixa', setup: 'await simular(page, comuns());', url: '`${P}/financeiro/caixa`', h1: true },
  { nome: 'a-receber', tams: L, rolar: 1000, spec: 'portal-financeiro', setup: 'await simular(page, comuns());', url: '`${P}/financeiro/a-receber`', h1: true },
  { nome: 'repasses', tams: L, rolar: 735, spec: 'portal-financeiro-repasses', setup: 'await simular(page, comuns());', url: '`${P}/financeiro/repasses`', h1: true },
  { nome: 'carne', tams: L, spec: 'portal-carne', setup: `await simular(page, {
      "/v1/escritorio": { corpo: DIEGO_ESC }, "/v1/escritorio/pessoas": { corpo: { pessoas: [DIEGO, MARINA] } },
      [\`GET /v1/escritorio/financeiro/contratos/\${CT}\`]: { corpo: FICHA },
      [\`GET /v1/escritorio/contratos/\${CT}/carnes\`]: { corpo: opcoes(COM_CHAVE, [], false) },
      [\`GET /v1/escritorio/carnes/\${CARNE}\`]: { corpo: PARA_IMPRIMIR } });`, url: '`${P}/financeiro/a-receber/contratos/${CT}`',
    antes: `await page.getByRole("region", { name: "Carnê" }).waitFor(); await page.getByRole("button", { name: "Gerar carnê" }).first().click(); await page.getByRole("dialog", { name: "Gerar carnê" }).waitFor();`, janela: true },
  { nome: 'casos', tams: LC, spec: 'portal-juridico-casos', setup: 'await simular(page, comuns());', url: '`${P}/juridico/casos`', h1: true },
  // As petições do caso (cartão da lateral) vêm de sistema/tests/e2e/portal-peticoes.spec.ts: a linha 1 da lista é deste caso.
  // Único ajuste: gerada ontem às 14h42 (no spec, 18/11 às 14h42, depois das 10h15 do relógio parado).
  { nome: 'caso-ficha', tams: L, spec: 'portal-juridico-casos', setup: `await simular(page, { ...comuns(), [\`GET /v1/escritorio/peticoes?caso=\${CASO}\`]: { corpo: { paraRevisar: 0, modelos: [], peticoes: [
      { id: "d1000000-0000-4000-8000-000000000001", modelo: "Recurso ordinário", arquivo: "recurso-ordinário.docx", caso: { id: CASO, nome: "Pereira x Mercado Bom Preço" }, geradoPor: { id: "b1000000-0000-4000-8000-000000000001", nome: "Marina Ribeiro" }, geradoEm: "2026-11-17T17:42:00Z", marcados: 1, situacao: "APROVADA", revisor: null, versao: 1, paraMim: false } ] } } });`, url: '`${P}/juridico/casos/${CASO}`', h1: true },
  { nome: 'prazos', tams: ['amplo', 'celular'], rolar: 440, spec: 'portal-juridico-prazos', setup: 'await simular(page, comuns());', url: '`${P}/juridico/prazos`', h1: true },
  { nome: 'agenda', tams: L, spec: 'portal-agenda', setup: 'await simular(page, comuns());', url: '`${P}/agenda`', h1: true },
];

function cabeca(spec) {
  const src = fs.readFileSync(path.join(E2E, spec + '.spec.ts'), 'utf8');
  const linhas = src.split('\n');
  const i = linhas.findIndex((l) => /^test(\.describe|\.beforeEach)?\(/.test(l));
  return linhas.slice(0, i).join('\n').replace(/from "\.\//g, `from "${E2E}/`).replace(/from "\.\.\/\.\.\//g, `from "${REPO}/`);
}

const VP = { amplo: { width: 1440, height: 900 }, largo: { width: 1280, height: 800 }, medio: { width: 1120, height: 800 }, celular: { width: 390, height: 844 } };
const porSpec = {};
for (const c of CAPS) if (!filtro || c.nome.includes(filtro)) (porSpec[c.spec] ||= []).push(c);
for (const [spec, caps] of Object.entries(porSpec)) {
  let t = `import "./relogio.ts";\n` + cabeca(spec) + `\nvoid expect;\nconst VP = ${JSON.stringify(VP)};\n`;
  for (const c of caps) {
    t += `test(${JSON.stringify('captura ' + c.nome)}, async ({ browser }) => {
  for (const tam of ${JSON.stringify(c.tams)}) {
    const mobile = tam === "celular";
    const ctx = await browser.newContext({ viewport: (VP as any)[tam], deviceScaleFactor: 2, isMobile: mobile, hasTouch: mobile, reducedMotion: "reduce", locale: "pt-BR", timezoneId: "America/Sao_Paulo" });
    const page = await ctx.newPage();
    await page.clock.setFixedTime(new Date(${JSON.stringify(AGORA)}));
    ${c.setup}
    await page.goto(${c.url});
    ${c.h1 ? 'await page.getByRole("heading", { level: 1 }).first().waitFor();' : ''}
    ${c.antes || ''}
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(600);
    await page.screenshot({ path: ${JSON.stringify(saida)} + "/portal-${c.nome}-" + tam + ".png" });
    // conferência: nenhum estado de erro, carregando ou vazio indevido na tela fotografada
    console.log("ESTADO ${c.nome} " + tam + " :: " + JSON.stringify((await page.evaluate(() => document.body.innerText)).split("\\n").filter((l) => /não deu|tentar de novo|carregando|nenhum|nenhuma|erro|não encontr|sem dados/i.test(l))));
    ${c.janela ? '' : `await page.screenshot({ path: ${JSON.stringify(saida)} + "/portal-${c.nome}-" + tam + "-inteira.png", fullPage: true });`}
    ${c.rolar ? `if (mobile) { await page.evaluate(() => window.scrollTo(0, ${c.rolar})); await page.waitForTimeout(300); await page.screenshot({ path: ${JSON.stringify(saida)} + "/portal-${c.nome}-celular-rolada.png" }); }` : ''}
    await ctx.close();
  }
});\n`;
  }
  fs.writeFileSync(path.join(tmp, spec + '.capt.spec.ts'), t);
}
fs.writeFileSync(path.join(tmp, 'pw.config.ts'), `import { defineConfig } from "@playwright/test";\nexport default defineConfig({ use: { launchOptions: { executablePath: process.env.PW_CHROMIUM_PATH || "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell" } }, testDir: ".", testMatch: /\\.capt\\.spec\\.ts$/, workers: 3, timeout: 120000, reporter: "list" });\n`);
try {
  execFileSync(path.join(REPO, 'node_modules/.bin/playwright'), ['test', '-c', path.join(tmp, 'pw.config.ts')], { cwd: REPO, stdio: 'inherit' });
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
