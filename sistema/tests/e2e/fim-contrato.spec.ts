// Fim do contrato e saída da pessoa (F0.14, PT-11), telas aprovadas em
// docs/design/aprovadas/console-fim-contrato: encerrar e reabrir no Console, a carteira com
// "Encerrados", a Equipe T3jus com a entrada apagada, e no Portal o aviso, o "só consulta" e a
// tela depois de entrar com o acesso fechado. A API é simulada; aqui se testa a tela, a
// acessibilidade e o que ela manda.
import { expect, test } from "@playwright/test";
import { C, CA, CLIENTES, d, ficha, h, SESSAO, semViolacoes, simular } from "./console-dados.ts";

const P = "http://localhost:3000";
const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const somar = (iso: string, dias: number) => {
  const [a, m, x] = iso.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(a, m - 1, x + dias)).toISOString().slice(0, 10);
};
const br = (iso: string) => iso.split("-").reverse().join("/");

/** As datas como o banco manda, a partir da data do fim. */
function datas(fimEm: string, situacao: "MARCADO" | "CONSULTA" | "FECHADO", fechado: string | null = null) {
  const fecha = somar(fimEm, 30);
  return {
    fimEm, situacao, consultaAte: somar(fimEm, 29), acessoFechaEm: fecha, acessoFechadoEm: fechado,
    entradasAte: somar(fecha, 90), guardaAte: `${Number(fimEm.slice(0, 4)) + 5}${fimEm.slice(4)}`,
  };
}

const TODAS = [
  "console.contrato.editar", "console.contrato.encerrar", "console.documentos.enviar", "console.documentos.ver", "console.equipe.atribuir",
  "console.estagio.mudar", "console.ficha.editar", "console.ficha.ver", "console.historico.ver", "console.notas.escrever",
  "console.notas.ver", "console.socios.convidar",
];
const ARO = CLIENTES[3]!;
const R = `/v1/clientes/${ARO.id}`;
const encerramento = (situacao: "CONSULTA" | "FECHADO" | "MARCADO", fimEm = hoje) => ({
  ...datas(fimEm, situacao), motivo: "O escritório pediu o fim do contrato.", registradoEm: h(0), estagioAntes: "ATIVO",
  por: { id: CA.pessoaId, nome: CA.nome }, exportadoEm: null,
});

test.describe("F0.14: encerrar e reabrir o contrato no Console", () => {
  test("encerrar: datas do quadro, erros presos aos campos, o que vai ao servidor e a ficha só de leitura", async ({ page }) => {
    const aberta = ficha(ARO, TODAS);
    const fechada = { ...aberta, cliente: { ...aberta.cliente, estagio: "ENCERRADO", versao: 3 }, encerramento: encerramento("CONSULTA") };
    const pedidos = await simular(page, {
      "/v1/sessao": { corpo: SESSAO },
      [R]: [{ corpo: aberta }, { corpo: fechada }],
      [`${R}/notas`]: { corpo: { notas: [] } },
      [`${R}/documentos`]: { corpo: { documentos: [] } },
      [`${R}/historico`]: { corpo: { eventos: [] } },
      [`POST ${R}/encerrar`]: { corpo: { versao: 3, encerramento: fechada.encerramento } },
    });
    await page.goto(`${C}/clientes/${ARO.id}/contrato`);
    await expect(page.getByRole("heading", { name: "Estágio" })).toBeVisible();
    await page.getByRole("button", { name: "Encerrar o contrato" }).click();
    const janela = page.getByRole("alertdialog", { name: `Encerrar o contrato da ${ARO.nome}?` });
    await expect(janela).toBeVisible();
    const quadro = janela.getByRole("list", { name: "O que acontece e quando" });
    await expect(quadro).toContainText(br(hoje));
    await expect(quadro).toContainText(`até ${br(somar(hoje, 29)).slice(0, 5)}`);
    await semViolacoes(page);

    await janela.getByRole("button", { name: "Encerrar o contrato" }).click();
    await expect(janela.getByText("Falta acertar 2 pontos, marcados abaixo.")).toBeVisible();
    await expect(janela.getByLabel("Motivo")).toBeFocused();
    await expect(janela.getByLabel("Motivo")).toHaveAttribute("aria-invalid", "true");
    await janela.getByLabel("Motivo").fill("O escritório pediu o fim do contrato.");
    await janela.getByLabel("Nome do escritório").fill("aroeira sociedade de advogados");
    await expect(janela.getByText("O nome confere.")).toBeVisible();
    await janela.getByRole("button", { name: "Encerrar o contrato" }).click();

    await expect(page.getByText(`Contrato da ${ARO.nome} encerrado.`)).toBeVisible();
    const envio = pedidos.find((p) => p.metodo === "POST" && p.caminho === `${R}/encerrar`)!;
    expect(envio.corpo).toEqual({ versao: 2, fimEm: hoje, motivo: "O escritório pediu o fim do contrato.", nomeConfirmado: "aroeira sociedade de advogados" });
    await expect(page.getByRole("note", { name: "Situação do contrato" })).toContainText("Só leitura.");
    await expect(page.getByRole("heading", { name: "Fim do contrato", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Reabrir o contrato" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Encerrar o contrato" })).toHaveCount(0);
    await semViolacoes(page);
  });

  test("reabrir pede o motivo e volta ao estágio de antes; quem não é Administração só lê", async ({ page }) => {
    const base = ficha(ARO, TODAS);
    const fechada = { ...base, cliente: { ...base.cliente, estagio: "ENCERRADO", versao: 3 }, encerramento: encerramento("CONSULTA") };
    const pedidos = await simular(page, {
      "/v1/sessao": { corpo: SESSAO },
      [R]: [{ corpo: fechada }, { corpo: { ...base, cliente: { ...base.cliente, versao: 4 } } }],
      [`${R}/notas`]: { corpo: { notas: [] } },
      [`${R}/documentos`]: { corpo: { documentos: [] } },
      [`${R}/historico`]: { corpo: { eventos: [] } },
      [`POST ${R}/reabrir`]: { corpo: { versao: 4, estagio: "ATIVO" } },
    });
    await page.goto(`${C}/clientes/${ARO.id}/contrato`);
    await expect(page.locator(".ficha-cab .selo-enc")).toHaveText("Encerrado");
    await page.getByRole("button", { name: "Reabrir o contrato" }).click();
    const janela = page.getByRole("dialog", { name: `Reabrir o contrato da ${ARO.nome}?` });
    await expect(janela.getByLabel("Motivo")).toBeFocused();
    await semViolacoes(page);
    await janela.getByRole("button", { name: "Reabrir o contrato" }).click();
    await expect(janela.getByText("Escreva o motivo da reabertura. Ele fica no histórico.")).toBeVisible();
    await janela.getByLabel("Motivo").fill("Renovaram o contrato.");
    await janela.getByRole("button", { name: "Reabrir o contrato" }).click();
    await expect(page.getByText(`Contrato da ${ARO.nome} reaberto.`)).toBeVisible();
    expect(pedidos.find((p) => p.caminho === `${R}/reabrir`)!.corpo).toEqual({ versao: 3, motivo: "Renovaram o contrato." });
    await expect(page.getByRole("button", { name: "Encerrar o contrato" })).toBeVisible();
  });

  test("sem a permissão, a ação de encerrar vira o aviso de quem pode", async ({ page }) => {
    await simular(page, {
      "/v1/sessao": { corpo: SESSAO },
      [R]: { corpo: ficha(ARO, TODAS.filter((p) => p !== "console.contrato.encerrar")) },
      [`${R}/notas`]: { corpo: { notas: [] } },
      [`${R}/documentos`]: { corpo: { documentos: [] } },
      [`${R}/historico`]: { corpo: { eventos: [] } },
    });
    await page.goto(`${C}/clientes/${ARO.id}/contrato`);
    await expect(page.getByText("Quem encerra o contrato é a Administração.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Encerrar o contrato" })).toHaveCount(0);
  });
});

test.describe("F0.14: carteira e Equipe T3jus", () => {
  test("Encerrados ficam no quinto número, com o próximo passo", async ({ page }) => {
    const enc = { ...CLIENTES[2]!, estagio: "ENCERRADO", encerramento: datas(hoje, "CONSULTA") };
    await simular(page, { "/v1/sessao": { corpo: SESSAO }, "/v1/clientes": { corpo: { clientes: [CLIENTES[0], CLIENTES[1], enc, CLIENTES[3]] } } });
    await page.goto(`${C}/`);
    const resumo = page.getByRole("group", { name: "Filtrar a carteira por estágio" });
    await expect(resumo.getByRole("button", { name: /Todos os escritórios/ })).toContainText("3");
    await resumo.getByRole("button", { name: /Encerrados/ }).click();
    await expect(page.getByText("Ribeiro & Matos Advocacia").locator("visible=true")).toBeVisible();
    await expect(page.getByText("Jatobá Advogados")).toHaveCount(0);
    await expect(page.getByText(`Acesso fecha em ${br(somar(hoje, 30))}`).locator("visible=true")).toBeVisible();
    await expect(page.getByRole("region", { name: "Pedem você agora" })).toHaveCount(0);
    await semViolacoes(page);
  });

  test("entrada apagada: e-mail apagado e Convidar de novo com o e-mail em branco", async ({ page }) => {
    const LIA = "c0000000-0000-4000-8000-000000000009";
    await simular(page, {
      "/v1/sessao": { corpo: SESSAO },
      "/v1/equipe": { corpo: { pessoas: [
        { id: CA.pessoaId, nome: CA.nome, email: "carol@t3jus.pro", ativa: true, funcoes: ["ADMINISTRACAO"], desde: d(200), convitePendente: false },
        { id: LIA, nome: "Lia Moura", email: null, ativa: false, funcoes: [], desde: d(190), convitePendente: false, desativadaEm: d(101),
          saida: { entradaApagadaEm: d(11) } },
      ] } },
    });
    await page.goto(`${C}/equipe`);
    await expect(page.getByText("Entrada apagada", { exact: true }).locator("visible=true")).toBeVisible();
    await expect(page.getByText("e-mail apagado").locator("visible=true")).toBeVisible();
    await semViolacoes(page);
    await page.getByRole("button", { name: "Convidar de novo: Lia Moura" }).locator("visible=true").click();
    const janela = page.getByRole("dialog", { name: "Convidar Lia Moura de novo" });
    await expect(janela.getByLabel("Nome completo")).toHaveValue("Lia Moura");
    await expect(janela.getByLabel("E-mail")).toBeFocused();
    await expect(janela.getByLabel("E-mail")).toHaveValue("");
    await janela.getByRole("button", { name: "Enviar convite" }).click();
    await expect(janela.getByText("Escreva o e-mail de Lia. O antigo foi apagado e não temos mais como saber qual era.")).toBeVisible();
    await semViolacoes(page);
  });
});

test.describe("F0.14: o Portal no fim do contrato", () => {
  const ESC = {
    id: "e0000000-0000-4000-8000-0000000000a1", nome: "Ribeiro & Matos", pessoa: "Marina Ribeiro", dono: true,
    areas: ["COMERCIAL", "CONTRATOS", "FINANCEIRO", "JURIDICO"], socios: ["Marina Ribeiro"], pessoas: 3, outrosEscritorios: 0, funcoes: ["SOCIO"],
    cnpj: "41276839000134", cidade: "São Paulo", uf: "SP", endereco: "Rua Cardeal Arcoverde, 1749", contatos: [], ultimaExportacao: null,
    encerramento: datas(hoje, "CONSULTA"),
  };

  test("Escritório: o aviso com as datas, Baixar os dados abre a exportação; Clientes sem criar nada", async ({ page }) => {
    await simular(page, { "/v1/escritorio": { corpo: ESC }, "/v1/escritorio/clientes": { corpo: { clientes: [] } } });
    await page.goto(`${P}/meu-escritorio`);
    const aviso = page.getByRole("region", { name: `O contrato com o T3jus terminou em ${br(hoje)}` });
    await expect(aviso).toBeVisible();
    await expect(aviso).toContainText(`Acesso fecha: ${br(somar(hoje, 30))}`);
    await semViolacoes(page);
    await aviso.getByRole("button", { name: "Baixar os dados" }).click();
    await expect(page.getByRole("dialog", { name: "Exportar os dados da Ribeiro & Matos?" })).toBeVisible();
    await page.keyboard.press("Escape");

    await page.goto(`${P}/clientes`);
    await expect(page.getByRole("note").filter({ hasText: `Só consulta até ${br(somar(hoje, 29))}.` })).toBeVisible();
    await expect(page.getByRole("link", { name: "Novo cliente" })).toHaveCount(0);
    await semViolacoes(page);
  });

  test("quem não é a dona vê o aviso sem o botão de baixar", async ({ page }) => {
    await simular(page, { "/v1/escritorio": { corpo: { ...ESC, pessoa: "Larissa Costa", dono: false, areas: ["JURIDICO"], funcoes: ["EQUIPE"] } } });
    await page.goto(`${P}/meu-escritorio`);
    await expect(page.getByText("Quem baixa os dados é Marina Ribeiro, quem cuida do escritório.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Baixar os dados" })).toHaveCount(0);
    await semViolacoes(page);
  });

  test("depois de entrar, só com escritório de acesso fechado: O acesso terminou", async ({ page }) => {
    const fim = somar(hoje, -40);
    await simular(page, {
      "/v1/sessao/escolha": { corpo: { email: "larissa@exemplo.invalid", escritorios: [
        { id: ESC.id, nome: "Ribeiro & Matos Advocacia", cidade: "São Paulo", uf: "SP", ultimaEntrada: null, encerramento: datas(fim, "FECHADO", h(240)) },
      ] } },
    });
    await page.goto(`${P}/escritorio`);
    await expect(page.getByRole("heading", { level: 1, name: "O acesso terminou" })).toBeFocused();
    await expect(page.getByText("Ribeiro & Matos Advocacia", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Falar com o T3jus" })).toHaveAttribute("href", "mailto:atendimento@exemplo.com.br");
    await semViolacoes(page);
  });
});
