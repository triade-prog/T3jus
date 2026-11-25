// Suporte de acesso no Console (F1.3, PT-23), tela aprovada em docs/design/aprovadas/console-suporte.
// A API é simulada; aqui se testa a tela, a acessibilidade e o que ela manda ao servidor.
import { quadroAntesDoCommit } from "./quadro.ts";
import { expect, test } from "@playwright/test";
import { C, CLIENTES, d, ficha, h, SESSAO, semViolacoes, simular } from "./console-dados.ts";

const SUPORTE = { ...SESSAO, nome: "Bruno Seixas", funcoes: ["SUPORTE"], acoes: ["console.suporte.ver"] };
const MARINA = "a0000000-0000-4000-8000-0000000000aa";
const RENATA = "a0000000-0000-4000-8000-0000000000bb";
const RM = { id: "e0000000-0000-4000-8000-000000000009", nome: "Ribeiro & Matos Advocacia", papel: "SOCIO", conviteEnviadoEm: d(200), telefone: "(11) 3256-4410" };
const PR = { id: "e0000000-0000-4000-8000-000000000008", nome: "Prado Ribeiro Consultoria", papel: "EQUIPE", conviteEnviadoEm: d(90), telefone: null };

const pessoaMarina = { id: MARINA, nome: "Marina Ribeiro", email: "marina@ribeiromatos.adv.br", senhaCriadaEm: d(200), escritorios: [RM, PR] };
const pessoaRenata = {
  id: RENATA, nome: "Renata Lima", email: "renata@cedroelima.adv.br", senhaCriadaEm: null,
  escritorios: [{ ...RM, id: "e0000000-0000-4000-8000-000000000007", nome: "Cedro & Lima Advocacia", conviteEnviadoEm: h(26), telefone: "(81) 3421-0098" }],
};
const fichaMarina = (extra: Record<string, unknown> = {}) => ({
  ...pessoaMarina, podeAgir: true, aparelhos: 2, emailConfirmado: true, ultimaEntrada: h(3), autenticadorDesde: d(199), senhaTrocadaEm: d(7), ...extra,
});
const fichaRenata = { ...pessoaRenata, podeAgir: true, aparelhos: 0, emailConfirmado: false, ultimaEntrada: null, autenticadorDesde: null };
const HIST = {
  eventos: [
    { ocorridoEm: d(4), autor: { id: "x", nome: "Bruno Seixas" }, acao: "suporte.link_senha", dados: { motivo: "Ligou dizendo que esqueceu a senha." } },
  ],
};
const P = `/v1/suporte/pessoas/${MARINA}`;

test.describe("Console: suporte de acesso", () => {
  test("busca: só quem atende, com a situação, e sem resultado explica o alcance", async ({ page }) => {
    const pedidos = await simular(page, {
      "/v1/sessao": { corpo: SUPORTE },
      "/v1/suporte/pessoas": [{ corpo: { pessoas: [pessoaMarina, pessoaRenata] } }, { corpo: { pessoas: [] } }],
    });
    await page.goto(`${C}/suporte`);
    await expect(page.getByRole("heading", { level: 1, name: "Suporte de acesso" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Busque a pessoa que pediu ajuda" })).toBeVisible();
    await semViolacoes(page);

    // Menos de 2 letras: erro preso ao campo, nada vai ao servidor.
    await page.getByLabel("Nome ou e-mail").fill("m");
    await page.getByRole("button", { name: "Buscar" }).click();
    await expect(page.getByText("Escreva ao menos 2 letras do nome ou do e-mail.")).toBeVisible();
    await expect(page.getByLabel("Nome ou e-mail")).toHaveAttribute("aria-invalid", "true");
    expect(pedidos.filter((p) => p.caminho === "/v1/suporte/pessoas")).toHaveLength(0);

    await page.getByLabel("Nome ou e-mail").fill("marina");
    await page.getByRole("button", { name: "Buscar" }).click();
    await expect(page.getByText("2 pessoas")).toBeVisible();
    const linha = page.getByRole("link", { name: /Marina Ribeiro/ });
    await expect(linha).toContainText("Acesso em dia");
    await expect(linha).toHaveAttribute("href", `/suporte?pessoa=${MARINA}&q=marina`);
    await expect(page.getByRole("link", { name: /Renata Lima/ })).toContainText("Convite vencido");
    await expect(page).toHaveURL(/\/suporte\?q=marina$/);
    await semViolacoes(page);

    await page.getByLabel("Nome ou e-mail").fill("mariana coutto");
    await page.getByRole("button", { name: "Buscar" }).click();
    await expect(page.getByRole("heading", { name: "Ninguém encontrado para “mariana coutto”" })).toBeVisible();
    await expect(page.getByText("peça à Administração para atribuir você a ele")).toBeVisible();
    await semViolacoes(page);
  });

  test("ficha: situação da conta, e-mail inteiro só na ficha e ações com motivo", async ({ page }) => {
    const pedidos = await simular(page, {
      "/v1/sessao": { corpo: SUPORTE },
      [P]: [{ corpo: fichaMarina() }, { corpo: fichaMarina() }],
      [`${P}/historico`]: [{ corpo: HIST }, {
        corpo: { eventos: [{ ocorridoEm: new Date().toISOString(), autor: { id: "x", nome: "Bruno Seixas" }, acao: "suporte.link_senha", dados: { motivo: "Pediu ao telefone" } }, ...HIST.eventos] },
      }],
      [`POST ${P}/link-senha`]: { corpo: { email: "ma***@ribeiromatos.adv.br" } },
    });
    await page.goto(`${C}/suporte?pessoa=${MARINA}&q=marina`);
    await expect(page.getByRole("heading", { level: 1, name: "Marina Ribeiro" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Resultados para “marina”" })).toHaveAttribute("href", "/suporte?q=marina");
    await expect(page.locator(".sa-email")).toHaveText("marina@ribeiromatos.adv.br");
    await expect(page.getByText("verificado · não muda por aqui")).toBeVisible();
    await expect(page.locator(".sa-num")).toHaveText("2");
    // F1.12: a data da última troca de senha, como no desenho aprovado.
    await expect(page.getByText(/^última troca em \d{2}\/\d{2}\/\d{4}$/)).toBeVisible();
    await expect(page.getByText("Ligou dizendo que esqueceu a senha.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Escritórios · 2" })).toBeVisible();
    await semViolacoes(page);

    // Link de nova senha: e-mail mascarado na janela, motivo obrigatório.
    await page.getByRole("button", { name: "Mandar link" }).click();
    const janela = page.getByRole("dialog", { name: "Mandar link de nova senha para Marina?" });
    await expect(janela).toBeVisible();
    await expect(janela.getByText("ma***@ribeiromatos.adv.br")).toBeVisible();
    await expect(janela.getByText("marina@ribeiromatos.adv.br")).toHaveCount(0);
    await expect(janela.getByLabel("Motivo")).toBeFocused();
    await semViolacoes(page);
    await janela.getByRole("button", { name: "Mandar link" }).click();
    await expect(janela.getByText("Falta acertar 1 ponto, marcado abaixo.")).toBeVisible();
    await expect(janela.getByText("Nenhum link foi enviado.")).toBeVisible();
    await expect(janela.getByLabel("Motivo")).toHaveAttribute("aria-invalid", "true");
    await expect(janela.getByLabel("Motivo")).toBeFocused();
    expect(pedidos.filter((p) => p.metodo === "POST")).toHaveLength(0);

    await janela.getByLabel("Motivo").fill("Pediu ao telefone");
    await expect(janela.getByText("17 de 300 caracteres")).toBeVisible();
    await janela.getByRole("button", { name: "Mandar link" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Link enviado para ma***@ribeiromatos.adv.br." })).toBeVisible();
    await expect(janela).toBeHidden();
    expect(pedidos.find((p) => p.metodo === "POST")).toEqual({ metodo: "POST", caminho: `${P}/link-senha`, corpo: { motivo: "Pediu ao telefone" } });
    await expect(page.locator(".eventos li.sa-novo")).toContainText("Pediu ao telefone");
    await semViolacoes(page);
  });

  test("link de nova senha: limite de 3 por hora e falha do servidor mantêm a janela", async ({ page }) => {
    await simular(page, {
      "/v1/sessao": { corpo: SUPORTE },
      [P]: { corpo: fichaMarina() },
      [`${P}/historico`]: { corpo: HIST },
      [`POST ${P}/link-senha`]: [{ status: 503, corpo: { erro: { codigo: "UPSTREAM_UNAVAILABLE" } } }, { status: 429, corpo: { erro: { codigo: "RATE_LIMITED" } } }],
    });
    await page.goto(`${C}/suporte?pessoa=${MARINA}`);
    await page.getByRole("button", { name: "Mandar link" }).click();
    const janela = page.getByRole("dialog");
    await janela.getByLabel("Motivo").fill("Pediu ao telefone");
    await janela.getByRole("button", { name: "Mandar link" }).click();
    await expect(janela.getByText("Não deu para concluir agora.")).toBeVisible();
    await expect(janela.getByLabel("Motivo")).toHaveValue("Pediu ao telefone");
    await expect(janela.getByRole("button", { name: "Tentar de novo" })).toBeFocused();
    await semViolacoes(page);
    await janela.getByRole("button", { name: "Tentar de novo" }).click();
    await expect(janela.getByText("Marina já recebeu 3 links na última hora.")).toBeVisible();
    await expect(janela.locator('button[type="submit"]')).toHaveAttribute("aria-disabled", "true");
    await semViolacoes(page);
  });

  // F3.176: com o quadro antes do commit, um rAF depois do await rodaria com o botão ainda
  // desabilitado e sem data-tentar, e o foco se perderia. O foco vem de um efeito, por contador.
  test("falha do servidor com o quadro antes do commit: o foco vai ao Tentar de novo a cada falha", async ({ page }) => {
    await quadroAntesDoCommit(page);
    const falha = { status: 503, corpo: { erro: { codigo: "UPSTREAM_UNAVAILABLE" } } };
    await simular(page, {
      "/v1/sessao": { corpo: SUPORTE },
      [P]: { corpo: fichaMarina() },
      [`${P}/historico`]: { corpo: HIST },
      [`POST ${P}/link-senha`]: [falha, falha, { status: 429, corpo: { erro: { codigo: "RATE_LIMITED" } } }],
    });
    await page.goto(`${C}/suporte?pessoa=${MARINA}`);
    await page.getByRole("button", { name: "Mandar link" }).click();
    const janela = page.getByRole("dialog");
    const motivo = janela.getByLabel("Motivo");
    const tentar = janela.getByRole("button", { name: "Tentar de novo" });
    const resposta = () => page.waitForResponse((r) => r.url().endsWith("/link-senha"));
    await motivo.fill("Pediu ao telefone");
    let r = resposta();
    await janela.getByRole("button", { name: "Mandar link" }).click();
    await r;
    await expect(janela.getByText("Não deu para concluir agora.")).toBeVisible();
    await expect(tentar).toBeFocused();

    // Depois da falha, digitar no Motivo mantém o foco lá: o efeito só roda com falha nova.
    await motivo.focus();
    await motivo.pressSequentially(" agora");
    await expect(motivo).toHaveValue("Pediu ao telefone agora");
    await expect(motivo).toBeFocused();

    // A mesma falha de novo: o foco volta ao Tentar de novo.
    r = resposta();
    await tentar.click();
    await r;
    await expect(janela.getByText("Não deu para concluir agora.")).toBeVisible();
    await expect(tentar).toBeFocused();

    // A terceira dá o limite, como antes.
    await tentar.click();
    await expect(janela.getByText("Marina já recebeu 3 links na última hora.")).toBeVisible();
  });

  test("motivo recusado pelo servidor com o quadro antes do commit: o foco vai ao Motivo", async ({ page }) => {
    await quadroAntesDoCommit(page);
    await simular(page, {
      "/v1/sessao": { corpo: SUPORTE },
      [P]: { corpo: fichaMarina() },
      [`${P}/historico`]: { corpo: HIST },
      [`POST ${P}/link-senha`]: { status: 422, corpo: { erro: { codigo: "VALIDATION_ERROR", detalhes: { campos: ["motivo"] } } } },
    });
    await page.goto(`${C}/suporte?pessoa=${MARINA}`);
    await page.getByRole("button", { name: "Mandar link" }).click();
    const janela = page.getByRole("dialog");
    const motivo = janela.getByLabel("Motivo");
    await motivo.fill("Pediu ao telefone");
    await janela.getByRole("button", { name: "Mandar link" }).click();
    await expect(motivo).toHaveAttribute("aria-invalid", "true");
    await expect(motivo).toBeFocused();
  });

  test("tirar o autenticador: alertdialog, foco no Cancelar e conferência obrigatória", async ({ page }) => {
    const pedidos = await simular(page, {
      "/v1/sessao": { corpo: SUPORTE },
      [P]: [{ corpo: fichaMarina() }, { corpo: fichaMarina({ aparelhos: 0, autenticadorDesde: null }) }],
      [`${P}/historico`]: { corpo: HIST },
      [`POST ${P}/tirar-autenticador`]: { corpo: { aparelhos: 2 } },
    });
    await page.goto(`${C}/suporte?pessoa=${MARINA}`);
    await page.getByRole("button", { name: "Tirar autenticador" }).click();
    const janela = page.getByRole("alertdialog", { name: "Tirar o autenticador de Marina?" });
    await expect(janela.getByRole("button", { name: "Cancelar" })).toBeFocused();
    await expect(janela.getByText("(11) 3256-4410")).toBeVisible();
    await semViolacoes(page);
    await janela.getByRole("button", { name: "Tirar o autenticador" }).click();
    await expect(janela.getByText("Falta acertar 2 pontos, marcados abaixo.")).toBeVisible();
    await expect(janela.getByText("O autenticador continua cadastrado.")).toBeVisible();
    await expect(janela.getByRole("checkbox")).toBeFocused();
    // No celular, o toque deixa o botão em hover; confere a tela como ela fica, sem o dedo em cima.
    await page.mouse.move(0, 0);
    await semViolacoes(page);
    await janela.getByRole("checkbox").check();
    await janela.getByLabel("Motivo").fill("Perdeu o celular. Liguei no telefone da ficha.");
    await janela.getByRole("button", { name: "Tirar o autenticador" }).click();
    await expect(page.getByText("O autenticador de Marina foi tirado.")).toBeVisible();
    expect(pedidos.find((p) => p.metodo === "POST")?.corpo).toEqual({ motivo: "Perdeu o celular. Liguei no telefone da ficha.", identidadeConferida: true });
    await expect(page.getByRole("button", { name: "Tirar autenticador" })).toHaveCount(0);
    await expect(page.getByText("Nenhum aparelho conectado agora.")).toBeVisible();
  });

  test("convite vencido: reenviar em destaque; senha e desconectar ficam de fora com o motivo", async ({ page }) => {
    const R = `/v1/suporte/pessoas/${RENATA}`;
    const pedidos = await simular(page, {
      "/v1/sessao": { corpo: SUPORTE },
      [R]: { corpo: fichaRenata },
      [`${R}/historico`]: { corpo: { eventos: [] } },
      [`POST ${R}/reenviar-convite`]: { corpo: { email: "re***@cedroelima.adv.br" } },
    });
    await page.goto(`${C}/suporte?pessoa=${RENATA}`);
    await expect(page.getByRole("link", { name: "Nova busca" })).toBeVisible();
    await expect(page.locator(".sa-selos")).toContainText("Convite vencido");
    await expect(page.getByText("Libera quando Renata criar a senha pelo convite.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Mandar link" })).toHaveCount(0);
    await expect(page.getByText("Nenhum atendimento de suporte ainda.", { exact: false })).toBeVisible();
    await semViolacoes(page);
    await page.getByRole("button", { name: "Reenviar convite" }).click();
    const janela = page.getByRole("dialog", { name: "Reenviar o convite para Renata?" });
    await janela.getByLabel("Motivo").fill("O convite venceu antes de abrir.");
    await janela.getByRole("button", { name: "Reenviar convite" }).click();
    await expect(page.getByText("Convite reenviado para re***@cedroelima.adv.br.")).toBeVisible();
    expect(pedidos.find((p) => p.metodo === "POST")?.caminho).toBe(`${R}/reenviar-convite`);
  });

  test("quem não tem Suporte nem Administração não vê o item e recebe a recusa", async ({ page }) => {
    await simular(page, { "/v1/sessao": { corpo: { ...SESSAO, funcoes: ["FINANCEIRO"], acoes: [] } } });
    await page.goto(`${C}/suporte`);
    await expect(page.getByRole("heading", { name: "Esta página é de Suporte e Administração" })).toBeVisible();
    await expect(page.locator('a.item[href="/suporte"]')).toHaveCount(0);
    await semViolacoes(page);
  });

  test("o item Suporte aparece no menu e a aba Sócio tem o atalho", async ({ page }) => {
    const cedro = CLIENTES[1]!;
    await simular(page, {
      "/v1/sessao": { corpo: SUPORTE },
      [`/v1/clientes/${cedro.id}`]: { corpo: ficha(cedro, ["console.ficha.ver", "console.suporte.ver"]) },
      [`/v1/clientes/${cedro.id}/notas`]: { corpo: { notas: [] } },
    });
    await page.goto(`${C}/clientes/${cedro.id}/socio`);
    const socio = ficha(cedro).socios[0]!;
    await expect(page.getByRole("link", { name: `Suporte de acesso de ${socio.nome}` })).toHaveAttribute("href", `/suporte?pessoa=${socio.pessoaId}`);
    if ((page.viewportSize()?.width ?? 1000) > 760) await expect(page.locator('a.item[href="/suporte"]')).toBeVisible();
    await semViolacoes(page);
  });
});
