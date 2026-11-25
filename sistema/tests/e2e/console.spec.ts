// Console: carteira de escritórios e ficha do cliente, aba Sócio (telas aprovadas:
// docs/design/aprovadas/console-carteira.html e console-ficha.html). A API é simulada
// (page.route): aqui se testa a tela, a acessibilidade e o que ela manda para o servidor. As
// regras de quem vê o quê estão nos testes do banco e das APIs. As outras telas do Console v1
// estão em console-v1.spec.ts. No celular, a tabela da carteira vira cartões.
import { expect, test } from "@playwright/test";
import { C, CLIENTES, d, ficha, fixarRelogio, id, IN, semViolacoes, SESSAO, simular } from "./console-dados.ts";

// O relógio do navegador fica em AGORA, o mesmo instante de onde os dados contam (F3.164).
test.beforeEach(async ({ page }) => { await fixarRelogio(page); });

test.describe("Console: carteira de escritórios", () => {
  test("mostra só a carteira da pessoa, com resumo, o que pede agora, filtro e busca", async ({ page }) => {
    await simular(page, { "/v1/sessao": { corpo: SESSAO }, "/v1/clientes": { corpo: { clientes: CLIENTES } } });
    await page.goto(`${C}/`);
    await expect(page.getByRole("heading", { level: 1, name: "Carteira de escritórios" })).toBeVisible();
    await expect(page.locator(".quem strong")).toHaveText("Carol Andrade");
    await expect(page.getByRole("button", { name: /Todos os escritórios/ })).toContainText("4");
    await expect(page.getByRole("button", { name: /Com pendência/ })).toContainText("2");
    const pedem = page.getByRole("region", { name: /Pedem você agora/ });
    await expect(pedem.getByRole("link")).toHaveCount(3);
    await expect(pedem.getByRole("link").first()).toContainText("Passar para ativo");
    await expect(pedem.getByRole("link").first()).toHaveAttribute("href", `/clientes/${id(3)}/socio`);
    // Pendências primeiro: Jatobá (3) vem antes.
    const linhas = page.locator("tbody tr:visible, .cartoes > li:visible");
    await expect(linhas).toHaveCount(4);
    await expect(linhas.first()).toContainText("Jatobá Advogados");
    await expect(linhas.first()).toContainText("Ainda não convidado");
    await expect(page.locator("tbody tr:visible, .cartoes > li:visible", { hasText: "Cedro" })).toContainText("Link do convite venceu");
    await semViolacoes(page);

    await page.getByRole("button", { name: /Ativos/ }).click();
    await expect(linhas).toHaveCount(1);
    await expect(linhas.first()).toContainText("Aroeira");
    await page.getByRole("button", { name: /Todos os escritórios/ }).click();
    await page.getByLabel("Buscar na carteira").fill("sao paulo");
    await expect(linhas).toHaveCount(1);
    await expect(linhas.first()).toContainText("Ribeiro");
    await page.getByLabel("Buscar na carteira").fill("nada disso");
    await expect(page.getByText("Nenhum escritório encontrado")).toBeVisible();
  });

  test("carteira vazia explica o que fazer", async ({ page }) => {
    await simular(page, { "/v1/sessao": { corpo: SESSAO }, "/v1/clientes": { corpo: { clientes: [] } } });
    await page.goto(`${C}/`);
    await expect(page.getByText("Nenhum escritório com você ainda")).toBeVisible();
    await expect(page.getByText("Nenhuma implantação esperando por você.")).toBeVisible();
    await semViolacoes(page);
  });

  test("sem sessão, volta para a tela de entrar", async ({ page }) => {
    await simular(page, { "/v1/sessao": { status: 401, corpo: { erro: { codigo: "UNAUTHORIZED" } } }, "/v1/clientes": { status: 401, corpo: { erro: { codigo: "UNAUTHORIZED" } } } });
    await page.goto(`${C}/`);
    await expect(page).toHaveURL(`${C}/entrar`);
  });
});

test.describe("Console: ficha do cliente, aba Sócio", () => {
  test("convite pendente: caminho do convite e reenviar", async ({ page }) => {
    const c = CLIENTES[1]!;
    const pedidos = await simular(page, {
      "/v1/sessao": { corpo: SESSAO },
      [`/v1/clientes/${c.id}`]: { corpo: ficha(c) },
      [`/v1/clientes/${c.id}/notas`]: { corpo: { notas: [{ id: "n1", texto: "Prefere WhatsApp depois das 17h.", criadoEm: d(2), autor: { id: IN.pessoaId, nome: "Inês Nogueira" } }] } },
      [`POST /v1/clientes/${c.id}/socios/${c.socios[0]!.vinculoId}/reenviar`]: { corpo: { enviado: true } },
    });
    await page.goto(`${C}/clientes/${c.id}`);
    await expect(page).toHaveURL(`${C}/clientes/${c.id}/socio`);
    await expect(page.getByRole("heading", { level: 1, name: c.nome })).toBeVisible();
    await expect(page.getByText("3 de 4")).toBeVisible();
    await expect(page.getByRole("link", { name: /Sócio/ })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("heading", { name: "Renata Lima" })).toBeVisible();
    await expect(page.getByText("Link do convite venceu")).toBeVisible();
    await expect(page.getByText("renata@cedroelima.adv.br")).toBeVisible();
    await expect(page.getByText("Prefere WhatsApp depois das 17h.")).toBeVisible();
    const ativar = page.getByRole("button", { name: "Passar para ativo" });
    await expect(ativar).toHaveAttribute("aria-disabled", "true");
    await semViolacoes(page);

    await page.getByRole("button", { name: "Reenviar convite por e-mail" }).click();
    await expect(page.getByText("Convite reenviado para renata@cedroelima.adv.br. O link novo vale por 1 hora.")).toBeVisible();
    expect(pedidos.filter((p) => p.metodo === "POST").map((p) => p.caminho)).toEqual([`/v1/clientes/${c.id}/socios/${c.socios[0]!.vinculoId}/reenviar`]);
  });

  test("sem sócio: confere o formulário antes de mandar o convite", async ({ page }) => {
    const c = CLIENTES[0]!;
    const pedidos = await simular(page, {
      "/v1/sessao": { corpo: SESSAO },
      [`/v1/clientes/${c.id}`]: { corpo: ficha(c) },
      [`/v1/clientes/${c.id}/notas`]: { corpo: { notas: [] } },
      [`POST /v1/clientes/${c.id}/socios`]: { status: 201, corpo: { vinculoId: "v", contaNova: true } },
    });
    await page.goto(`${C}/clientes/${c.id}/socio`);
    await expect(page.getByRole("heading", { name: "Convidar o sócio dono" })).toBeVisible();
    await page.getByLabel("Nome completo").fill("Marcos Jatobá");
    await page.getByLabel("E-mail").fill("marcos@jatoba");
    await page.getByRole("button", { name: "Enviar convite" }).click();
    await expect(page.getByText(/Confira o e-mail/)).toBeVisible();
    await expect(page.getByLabel("E-mail")).toHaveAttribute("aria-invalid", "true");
    expect(pedidos.filter((p) => p.metodo === "POST")).toEqual([]);
    await semViolacoes(page);

    await page.getByLabel("E-mail").fill("marcos@jatoba.adv.br");
    await page.getByRole("button", { name: "Enviar convite" }).click();
    await expect(page.getByText("Convite enviado para marcos@jatoba.adv.br. O link vale por 1 hora.")).toBeVisible();
    expect(pedidos.find((p) => p.metodo === "POST")?.corpo).toEqual({ nome: "Marcos Jatobá", email: "marcos@jatoba.adv.br" });
  });

  test("implantação pronta: o cabeçalho leva para mudar o estágio, com o motivo obrigatório", async ({ page }) => {
    const c = CLIENTES[2]!;
    const pedidos = await simular(page, {
      "/v1/sessao": { corpo: SESSAO },
      [`/v1/clientes/${c.id}`]: [{ corpo: ficha(c) }, { corpo: ficha(c) }, { corpo: { ...ficha(c), cliente: { estagio: "ATIVO", referenciaContrato: "Contrato 2026/031", versao: 3 } } }],
      [`/v1/clientes/${c.id}/notas`]: { corpo: { notas: [] } },
      [`/v1/clientes/${c.id}/documentos`]: { corpo: { documentos: [] } },
      [`PUT /v1/clientes/${c.id}/estagio`]: { corpo: { versao: 3 } },
    });
    await page.goto(`${C}/clientes/${c.id}/socio`);
    await expect(page.getByText("4 de 4")).toBeVisible();
    await expect(page.getByText("Entrou no Portal")).toBeVisible();
    await page.getByRole("link", { name: "Passar para ativo" }).click();
    await expect(page).toHaveURL(`${C}/clientes/${c.id}/contrato?mudar=1`);
    const janela = page.getByRole("dialog", { name: `Passar ${c.nome} para Ativo?` });
    await expect(janela).toBeVisible();
    await expect(janela.getByLabel("Motivo")).toBeFocused();
    await janela.getByRole("button", { name: "Passar para ativo" }).click();
    await expect(janela.getByText("Escreva o motivo da mudança. Ele fica no histórico.")).toBeVisible();
    await expect(janela.getByLabel("Motivo")).toHaveAttribute("aria-invalid", "true");
    expect(pedidos.filter((p) => p.metodo === "PUT")).toEqual([]);
    await semViolacoes(page);
    await janela.getByLabel("Motivo").fill("Sócia entrou no Portal e o contrato está assinado.");
    await janela.getByRole("button", { name: "Passar para ativo" }).click();
    await expect(page.getByText(`${c.nome} agora está Ativo.`)).toBeVisible();
    expect(pedidos.find((p) => p.metodo === "PUT")?.corpo).toEqual({ versao: 2, estagio: "ATIVO", motivo: "Sócia entrou no Portal e o contrato está assinado." });
  });

  test("aba inexistente não existe", async ({ page }) => {
    const c = CLIENTES[3]!;
    await simular(page, { "/v1/sessao": { corpo: SESSAO } });
    const r = await page.goto(`${C}/clientes/${c.id}/qualquer`);
    expect(r?.status()).toBe(404);
  });

  test("cliente fora da carteira: aviso sem detalhes", async ({ page }) => {
    await simular(page, { "/v1/sessao": { corpo: SESSAO }, [`/v1/clientes/${id(9)}`]: { status: 403, corpo: { erro: { codigo: "FORBIDDEN" } } } });
    await page.goto(`${C}/clientes/${id(9)}/socio`);
    await expect(page.getByText("Este escritório não está na sua carteira.")).toBeVisible();
  });
});
