// Carnê de pagamento do Portal (FI-23), tela aprovada em docs/design/aprovadas/portal-carne:
// Escritório › Recebimento (a chave Pix, os erros, o Pix de teste, a troca com confirmação e o
// modo só leitura), a folha "Carnê" e a janela "Gerar carnê" na ficha do contrato, e o carnê em
// A4 para imprimir. A API é simulada; aqui se testa a tela, a acessibilidade e o que ela manda.
import { expect, test, type Page } from "@playwright/test";
import { semViolacoes } from "./console-dados.ts";

const P = "http://localhost:3000";
const ESC = "e0000000-0000-4000-8000-0000000000a1";
const MARINA = { id: "a0000000-0000-4000-8000-000000000101", nome: "Marina Ribeiro" };
const DIEGO = { id: "a0000000-0000-4000-8000-000000000102", nome: "Diego Almeida" };
const CT = "f1000000-0000-4000-8000-000000000122";
const CARNE = "c4000000-0000-4000-8000-000000000001";
const pc = (n: number) => `b2000000-0000-4000-8000-0000000001${String(n).padStart(2, "0")}`;

const ESCRITORIO = {
  id: ESC, nome: "Ribeiro & Matos", pessoa: "Marina Ribeiro", dono: true, areas: ["COMERCIAL", "CONTRATOS", "FINANCEIRO", "JURIDICO"],
  socios: ["Marina Ribeiro"], pessoas: 5, outrosEscritorios: 0, funcoes: ["SOCIO"], cnpj: "11222333000181", cidade: "São Paulo", uf: "SP",
  endereco: "Rua Líbero Badaró, 377, cj. 1204", contatos: [], ultimaExportacao: null,
};
const DIEGO_ESC = { ...ESCRITORIO, pessoa: "Diego Almeida", dono: false, areas: ["COMERCIAL", "FINANCEIRO"], funcoes: ["EQUIPE"] };

const dia = (n: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(Date.now() + n * 864e5));
const em = (n: number, h: string) => `${dia(n)}T${h}:00-03:00`;

const SEM_CHAVE = {
  dono: true, socioDono: MARINA, versao: 0, pixTipo: null, pixChave: null, recebedor: null, cidade: null, instrucoes: null,
  atualizadoPor: null, atualizadoEm: null, sugestao: { recebedor: "Ribeiro & Matos", cidade: "São Paulo", cnpj: "11222333000181" },
};
const COM_CHAVE = {
  ...SEM_CHAVE, versao: 1, pixTipo: "CNPJ", pixChave: "11222333000181", recebedor: "RIBEIRO E MATOS SOC ADV", cidade: "SAO PAULO",
  instrucoes: "Transferência para o Banco do Brasil, agência 1234-5, conta 98765-0.", atualizadoPor: MARINA, atualizadoEm: em(-6, "10:02"),
};

// A ficha do Financeiro (a mesma forma do portal-financeiro.spec.ts), com 6 parcelas.
const fp = (n: number, d: number, situacao: string) => ({
  id: pc(60 + n), tipo: "PARCELADO", descricao: `Parcela ${n} de 6`, vencimento: dia(d), valor: 85000, recebido: situacao === "PAGA" ? 85000 : 0,
  falta: situacao === "PAGA" ? 0 : 85000, forma: "PIX", situacao, pagaEm: situacao === "PAGA" ? dia(d) : null,
  contrato: { id: CT, numero: "C-2026-014", objeto: "Ação revisional" }, cliente: { id: "c22", nome: "Hélio Batista Corrêa" }, responsavel: DIEGO,
  cobranca: null, cancelado: null, pagamentos: [], eventos: [],
});
const FICHA = {
  id: CT, numero: "C-2026-014", objeto: "Ação revisional", situacao: "ATIVO", cliente: { id: "c22", nome: "Hélio Batista Corrêa" }, responsavel: DIEGO,
  condicoes: [{ tipo: "PARCELADO", total: 510000, parcelas: 6, primeiro: dia(-85) }],
  totais: { contratado: 510000, recebido: 170000, atraso: 85000, aVencer: 255000 }, aguardandoBase: 0,
  parcelas: [fp(1, -85, "PAGA"), fp(2, -55, "PAGA"), fp(3, -24, "VENCIDA"), fp(4, 6, "A_VENCER"), fp(5, 36, "A_VENCER"), fp(6, 66, "A_VENCER")],
};
const op = (n: number, d: number, situacao: string) => ({
  id: pc(60 + n), descricao: `Parcela ${n} de 6`, ordem: n, total: 6, vencimento: dia(d), valor: 85000, situacao, pagaEm: situacao === "PAGA" ? dia(d) : null,
});
const PARCELAS = [op(1, -85, "PAGA"), op(2, -55, "PAGA"), op(3, -24, "VENCIDA"), op(4, 6, "A_VENCER"), op(5, 36, "A_VENCER"), op(6, 66, "A_VENCER")];
const opcoes = (receb: typeof SEM_CHAVE, carnes: unknown[] = [], dono = true) => ({
  contrato: { id: CT, numero: "C-2026-014", objeto: "Ação revisional", situacao: "ATIVO" }, cliente: { id: "c22", nome: "Hélio Batista Corrêa" },
  parcelas: PARCELAS, recebimento: { pixTipo: receb.pixTipo, pixChave: receb.pixChave, recebedor: receb.recebedor, cidade: receb.cidade, instrucoes: receb.instrucoes },
  dono, socioDono: MARINA, carnes,
});
const GERADO = {
  id: CARNE, formato: "TRES", capa: true, geradoPor: DIEGO, geradoEm: em(-1, "15:32"), comPix: true,
  parcelas: [4, 5, 6].map((n) => ({ descricao: `Parcela ${n} de 6`, ordem: n, total: 6, vencimento: dia(6 + 30 * (n - 4)), valor: 85000, semValor: false })),
  mudancas: [],
};

// O carnê para imprimir (como a API devolve, com o Pix de cada parcela já montado).
const PIX4 = "00020126580014br.gov.bcb.pix0114112223330001810218PARCELA 4/6 C-2026-014520400005303986540585000.005802BR5923RIBEIRO E MATOS SOC ADV6009SAO PAULO62150511C2026014P046304ABCD";
const PARA_IMPRIMIR = {
  id: CARNE, formato: "TRES", capa: true, geradoEm: em(0, "15:32"),
  escritorio: { nome: "Ribeiro & Matos", cnpj: "11222333000181", endereco: "Rua Líbero Badaró, 377", cidade: "São Paulo", uf: "SP", whatsapp: "+5511974052210" },
  cliente: { nome: "Hélio Batista Corrêa", documento: "***.982.247-**", tipo: "PF" },
  contrato: { id: CT, numero: "C-2026-014", objeto: "Ação revisional" },
  pix: { tipo: "CNPJ", chave: "11222333000181", recebedor: "RIBEIRO E MATOS SOC ADV", cidade: "SAO PAULO" },
  instrucoes: COM_CHAVE.instrucoes,
  parcelas: [4, 5, 6].map((n) => ({ descricao: `Parcela ${n} de 6`, ordem: n, total: 6, vencimento: dia(6 + 30 * (n - 4)), valor: 85000, semValor: false, txid: `C2026014P0${n}`, pix: PIX4 })),
  mudancas: [],
};

type Resp = { status?: number; corpo: unknown };
type Pedido = { metodo: string; caminho: string; busca: string; corpo: unknown };

async function simular(page: Page, rotas: Record<string, Resp | Resp[]>) {
  const pedidos: Pedido[] = [];
  await page.route("**/api/v1/**", async (rota) => {
    const url = new URL(rota.request().url());
    const caminho = url.pathname.replace(/^\/api/, "");
    const metodo = rota.request().method();
    pedidos.push({ metodo, caminho, busca: url.search, corpo: rota.request().postDataJSON() });
    const r = rotas[`${metodo} ${caminho}${url.search}`] ?? rotas[`${metodo} ${caminho}`] ?? rotas[caminho];
    const lista = Array.isArray(r) ? r : r ? [r] : [{ status: 404, corpo: { erro: { codigo: "NOT_FOUND" } } }];
    const vez = pedidos.filter((p) => p.caminho === caminho && p.metodo === metodo).length - 1;
    const x = lista[Math.min(vez, lista.length - 1)]!;
    await rota.fulfill({ status: x.status ?? 200, contentType: "application/json", body: JSON.stringify(x.corpo) });
  });
  return pedidos;
}

test.describe("Carnê de pagamento do Portal (FI-23)", () => {
  test("FI-23: Recebimento sem chave, erros, Pix de teste e salvar", async ({ page }) => {
    const pedidos = await simular(page, {
      "/v1/escritorio": { corpo: ESCRITORIO },
      "GET /v1/escritorio/recebimento": [{ corpo: SEM_CHAVE }, { corpo: COM_CHAVE }],
      "PUT /v1/escritorio/recebimento": { corpo: { versao: 1, desatualizados: 0 } },
    });
    await page.goto(`${P}/meu-escritorio/recebimento`);
    await expect(page.getByRole("heading", { level: 1, name: "Recebimento" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Seções do Escritório" }).getByRole("link", { name: "Recebimento" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByText("Sem chave Pix, o carnê sai só com as instruções em texto.")).toBeVisible();
    await expect(page.getByText("O QR de teste aparece quando")).toBeVisible();
    await semViolacoes(page);

    await page.getByLabel("Tipo da chave").selectOption("CNPJ");
    await page.getByRole("textbox", { name: "Chave Pix", exact: true }).fill("11.222.333/0001-80");
    await page.getByLabel("Nome do recebedor").fill("Ribeiro e Matos Sociedade de Advogados");
    await page.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByText("Falta acertar 3 pontos")).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Chave Pix", exact: true })).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByText("Este CNPJ não confere")).toBeVisible();
    await expect(page.getByText("Passa de 25 letras")).toBeVisible();
    await expect(page.getByText("Escreva a cidade da conta")).toBeVisible();
    await semViolacoes(page);

    await page.getByRole("textbox", { name: "Chave Pix", exact: true }).fill("11.222.333/0001-81");
    await page.getByLabel("Nome do recebedor").fill("Ribeiro e Matos Soc Adv");
    await page.getByLabel("Cidade", { exact: true }).fill("São Paulo");
    await expect(page.getByRole("img", { name: "QR Code do Pix de teste, sem valor" })).toBeVisible();
    await expect(page.getByText("Deve aparecer RIBEIRO E MATOS SOC ADV")).toBeVisible();
    await page.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Recebimento salvo" })).toBeVisible();
    const put = pedidos.find((p) => p.metodo === "PUT")!;
    expect(put.corpo).toEqual({ versao: 0, pixTipo: "CNPJ", pixChave: "11.222.333/0001-81", recebedor: "Ribeiro e Matos Soc Adv", cidade: "São Paulo", instrucoes: null,
      marca: "LETRA", logoId: null, logoJeito: null, logoCor: null });
    await expect(page.getByRole("textbox", { name: "Chave Pix", exact: true })).toHaveValue("11.222.333/0001-81");
  });

  test("FI-23: trocar a chave pede confirmação e diz quantos carnês ficaram desatualizados", async ({ page }) => {
    const pedidos = await simular(page, {
      "/v1/escritorio": { corpo: ESCRITORIO },
      "GET /v1/escritorio/recebimento": [{ corpo: COM_CHAVE }, { corpo: { ...COM_CHAVE, versao: 2, pixTipo: "EMAIL", pixChave: "financeiro@ribeiromatos.adv.br" } }],
      "PUT /v1/escritorio/recebimento": { corpo: { versao: 2, desatualizados: 1 } },
    });
    await page.goto(`${P}/meu-escritorio/recebimento`);
    await expect(page.getByRole("textbox", { name: "Chave Pix", exact: true })).toHaveValue("11.222.333/0001-81");
    await page.getByLabel("Tipo da chave").selectOption("EMAIL");
    await page.getByRole("textbox", { name: "Chave Pix", exact: true }).fill("Financeiro@RibeiroMatos.adv.br");
    await page.getByRole("button", { name: "Salvar" }).click();
    const j = page.getByRole("alertdialog", { name: "Trocar a chave Pix?" });
    await expect(j).toBeVisible();
    await expect(j).toContainText("Hoje: CNPJ 11.222.333/0001-81");
    await expect(j).toContainText("Depois: E-mail financeiro@ribeiromatos.adv.br");
    await expect(j.getByRole("button", { name: "Voltar" })).toBeFocused();
    await semViolacoes(page);
    expect(pedidos.some((p) => p.metodo === "PUT")).toBe(false);
    await j.getByRole("button", { name: "Trocar a chave" }).click();
    await expect(page.getByText("1 carnê ficou desatualizado com a troca da chave.")).toBeVisible();
    expect(pedidos.find((p) => p.metodo === "PUT")!.corpo).toMatchObject({ versao: 1, pixTipo: "EMAIL" });
  });

  test("FI-23: quem não é dono vê o recebimento só para ler", async ({ page }) => {
    await simular(page, {
      "/v1/escritorio": { corpo: DIEGO_ESC },
      "GET /v1/escritorio/recebimento": { corpo: { ...COM_CHAVE, dono: false } },
    });
    await page.goto(`${P}/meu-escritorio/recebimento`);
    await expect(page.getByText("Você vê esta página só para ler.")).toBeVisible();
    await expect(page.getByText("Quem muda a chave Pix, as instruções e a marca é Marina Ribeiro")).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Chave Pix", exact: true })).toHaveCount(0);
    await expect(page.getByText("11.222.333/0001-81", { exact: true })).toBeVisible();
    await expect(page.getByRole("img", { name: "QR Code do Pix de teste, sem valor" })).toBeVisible();
    await semViolacoes(page);
  });

  test("FI-23: gerar o carnê na ficha do Financeiro e abrir para imprimir", async ({ page }) => {
    await page.addInitScript(() => { (window as unknown as { impresso: number }).impresso = 0; window.print = () => { (window as unknown as { impresso: number }).impresso++; }; });
    const pedidos = await simular(page, {
      "/v1/escritorio": { corpo: DIEGO_ESC },
      "/v1/escritorio/pessoas": { corpo: { pessoas: [DIEGO, MARINA] } },
      [`GET /v1/escritorio/financeiro/contratos/${CT}`]: { corpo: FICHA },
      [`GET /v1/escritorio/contratos/${CT}/carnes`]: { corpo: opcoes(COM_CHAVE, [], false) },
      [`POST /v1/escritorio/contratos/${CT}/carnes`]: { corpo: { id: CARNE, parcelas: 3 } },
      [`GET /v1/escritorio/carnes/${CARNE}`]: { corpo: PARA_IMPRIMIR },
    });
    await page.goto(`${P}/financeiro/a-receber/contratos/${CT}`);
    const folha = page.getByRole("region", { name: "Carnê" });
    await expect(folha).toContainText("Nenhum carnê gerado para este contrato.");
    await expect(folha).toContainText("chave CNPJ 11.222.333/0001-81");
    expect(pedidos.find((p) => p.caminho.endsWith("/carnes"))!.busca).toBe("?area=financeiro");
    await semViolacoes(page);

    await page.getByRole("button", { name: "Gerar carnê" }).first().click();
    const j = page.getByRole("dialog", { name: "Gerar carnê" });
    await expect(j.getByRole("radio", { name: /As que ainda vão vencer/ })).toBeChecked();
    await expect(j).toContainText("Parcelas 4/6 a 6/6 · 3 parcelas · R$ 2.550,00");
    await expect(j).toContainText("2 folhas A4");
    await expect(j).toContainText("Só Marina Ribeiro, a sócia dona, muda a chave.");
    await expect(j).toContainText("O Pix do carnê não dá baixa sozinho");
    await semViolacoes(page);

    await j.getByRole("radio", { name: /Escolher as parcelas/ }).check();
    await expect(j.getByRole("checkbox", { name: /Parcela 1\/6/ })).toBeDisabled();
    const venc = j.getByRole("checkbox", { name: /Parcela 3\/6/ });
    await expect(venc).not.toBeChecked();
    await expect(j).toContainText('Sai marcada "vencida", com o Pix sem valor');
    await venc.check();
    await j.getByRole("checkbox", { name: /Parcela 6\/6/ }).uncheck();
    await j.getByRole("radio", { name: /1 parcela por folha/ }).check();
    await expect(j.getByRole("checkbox", { name: /Incluir a capa/ })).toBeDisabled();
    await expect(j).toContainText("3 folhas A4");
    await j.getByRole("button", { name: "Gerar e imprimir" }).click();

    await page.waitForURL(`**/carnes/${CARNE}?area=financeiro`);
    const post = pedidos.find((p) => p.metodo === "POST")!;
    expect(post.corpo).toEqual({ area: "FINANCEIRO", parcelas: [pc(63), pc(64), pc(65)], formato: "UM", capa: false });
    await expect(page.getByRole("heading", { level: 1, name: /Carnê de Hélio Batista Corrêa/ })).toBeVisible();
    await expect.poll(() => page.evaluate(() => (window as unknown as { impresso: number }).impresso)).toBe(1);
    await expect(page.getByRole("region", { name: "Folha 1 de 2" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Via do cliente, parcela 4 de 6" })).toContainText("***.982.247-**");
    await expect(page.getByRole("img", { name: "QR Code do Pix da parcela 4 de 6, R$ 850,00" })).toBeVisible();
    await expect(page.getByText("C2026014P04").first()).toBeVisible();
    await expect(page.getByText("(11) 97405-2210").first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Voltar à ficha" })).toHaveAttribute("href", `/financeiro/a-receber/contratos/${CT}`);
    await semViolacoes(page);
  });

  test("FI-23: carnê desatualizado na ficha e sem chave para quem não é dono", async ({ page }) => {
    const desat = { ...GERADO, mudancas: [{ tipo: "VENCIMENTO", parcela: "Parcela 5 de 6", era: dia(36), agora: dia(41) }] };
    await simular(page, {
      "/v1/escritorio": { corpo: DIEGO_ESC },
      "/v1/escritorio/pessoas": { corpo: { pessoas: [DIEGO, MARINA] } },
      [`GET /v1/escritorio/financeiro/contratos/${CT}`]: { corpo: FICHA },
      [`GET /v1/escritorio/contratos/${CT}/carnes`]: { corpo: opcoes(SEM_CHAVE, [desat, { ...GERADO, id: "x", geradoEm: em(-20, "09:00") }], false) },
    });
    await page.goto(`${P}/financeiro/a-receber/contratos/${CT}`);
    const folha = page.getByRole("region", { name: "Carnê" });
    await expect(folha).toContainText("Carnê desatualizado: uma coisa mudou.");
    await expect(folha).toContainText("O vencimento da parcela 5 de 6 passou de");
    await expect(folha.getByText("Desatualizado", { exact: true })).toBeVisible();
    await expect(folha).toContainText("Substituído pelo de");
    await expect(folha.getByRole("link", { name: "Abrir para imprimir" }).first()).toHaveAttribute("href", `/carnes/${CARNE}?area=financeiro`);
    await semViolacoes(page);
    await folha.getByRole("button", { name: "Gerar de novo" }).click();
    const j = page.getByRole("dialog", { name: "Gerar carnê" });
    await expect(j).toContainText("O escritório ainda não tem chave Pix no T3jus.");
    await expect(j).toContainText("Quem cadastra é Marina Ribeiro, a sócia dona");
    await expect(j.getByRole("link", { name: "Cadastrar a chave Pix" })).toHaveCount(0);
    await semViolacoes(page);
  });

  test("F3.80: quem não é dono pede a chave Pix à sócia dona pela janela", async ({ page }) => {
    const pedidos = await simular(page, {
      "/v1/escritorio": { corpo: DIEGO_ESC },
      "/v1/escritorio/pessoas": { corpo: { pessoas: [DIEGO, MARINA] } },
      [`GET /v1/escritorio/financeiro/contratos/${CT}`]: { corpo: FICHA },
      [`GET /v1/escritorio/contratos/${CT}/carnes`]: { corpo: opcoes(SEM_CHAVE, [], false) },
      "POST /v1/escritorio/recebimento/pedido": { corpo: { para: MARINA, jaPedido: false } },
    });
    await page.goto(`${P}/financeiro/a-receber/contratos/${CT}`);
    await page.getByRole("button", { name: "Gerar carnê" }).first().click();
    const j = page.getByRole("dialog", { name: "Gerar carnê" });
    await j.getByRole("button", { name: "Pedir a Marina Ribeiro" }).click();
    await expect(j.getByRole("button", { name: "Pedido a Marina Ribeiro" })).toBeDisabled();
    await expect(j.getByRole("status").filter({ hasText: "recebeu o pedido no sino" }).last()).toBeVisible();
    expect(pedidos.find((p) => p.caminho === "/v1/escritorio/recebimento/pedido")?.corpo).toEqual({ area: "FINANCEIRO", contratoId: CT });
    await semViolacoes(page);
  });
  test("F3.79: baixar o PDF do servidor e mandar o carnê pelo WhatsApp, que espera a Meta", async ({ page }) => {
    const previa = {
      cliente: { nome: "Hélio Batista Corrêa" }, para: { nome: "Marta Corrêa", papel: "esposa", telefone: "+5511981143059" },
      titular: { nome: "Hélio Batista Corrêa", telefone: "+5511996027735" }, escritorio: "Ribeiro & Matos",
      ultimaDoCliente: em(0, "09:12"), bloqueio: null, envios: [],
      texto: "Olá, Marta! Aqui está o carnê dos honorários do Hélio, contrato C-2026-014.\n\nRibeiro & Matos",
      arquivo: { nome: "carne-helio-correa-C-2026-014.pdf", tamanho: 214000, folhas: 2 },
    };
    const envio = { id: "e1", para: "Marta Corrêa", telefone: "+5511981143059", em: em(0, "10:05"), por: DIEGO, envio: "NA_FILA" };
    const pedidos = await simular(page, {
      "/v1/escritorio": { corpo: DIEGO_ESC },
      "/v1/escritorio/pessoas": { corpo: { pessoas: [DIEGO, MARINA] } },
      [`GET /v1/escritorio/financeiro/contratos/${CT}`]: { corpo: FICHA },
      [`GET /v1/escritorio/contratos/${CT}/carnes`]: [
        { corpo: opcoes(COM_CHAVE, [GERADO], false) }, { corpo: opcoes(COM_CHAVE, [{ ...GERADO, envios: [envio] }], false) }],
      [`GET /v1/escritorio/carnes/${CARNE}/pdf`]: { corpo: { url: `${P}/arquivo-teste.pdf`, nome: previa.arquivo.nome, tamanho: 214000 } },
      [`GET /v1/escritorio/carnes/${CARNE}/envio`]: { corpo: previa },
      [`POST /v1/escritorio/carnes/${CARNE}/envios`]: { status: 201, corpo: { envios: [envio] } },
    });
    await page.route("**/arquivo-teste.pdf", (r) => r.fulfill({ status: 200, contentType: "application/pdf", body: "%PDF-1.7" }));
    await page.goto(`${P}/financeiro/a-receber/contratos/${CT}`);
    const folha = page.getByRole("region", { name: "Carnê" });
    const baixou = page.waitForEvent("download");
    await folha.getByRole("button", { name: "Baixar PDF" }).click();
    expect((await baixou).suggestedFilename()).toBe("carne-helio-correa-C-2026-014.pdf");
    expect(pedidos.find((p) => p.caminho.endsWith("/pdf"))!.busca).toBe("?area=financeiro");

    await folha.getByRole("button", { name: "Mandar pelo WhatsApp" }).click();
    const j = page.getByRole("dialog", { name: "Mandar o carnê pelo WhatsApp" });
    await expect(j).toContainText("Para Marta Corrêa (esposa de Hélio)");
    await expect(j).toContainText("carne-helio-correa-C-2026-014.pdf");
    await expect(j).toContainText("2 folhas A4 · 209 KB");
    await expect(j).toContainText("A conversa está aberta: Marta escreveu ao escritório");
    await semViolacoes(page);
    await j.getByRole("checkbox", { name: /Mandar também a Hélio/ }).check();
    await j.getByRole("button", { name: "Enviar a Marta" }).click();
    await expect(j).toHaveCount(0);
    expect(pedidos.find((p) => p.metodo === "POST" && p.caminho.endsWith("/envios"))!.corpo).toEqual({ area: "FINANCEIRO", texto: previa.texto, tambemCliente: true });
    await expect(page.getByText("Carnê na fila do WhatsApp")).toBeVisible();
    await expect(folha).toContainText("Marta Corrêa em");
    await expect(folha).toContainText("na fila, esperando a ligação do WhatsApp com a Meta");
  });

  test("F3.79: sem o WhatsApp ligado, a janela explica e oferece o PDF", async ({ page }) => {
    await simular(page, {
      "/v1/escritorio": { corpo: DIEGO_ESC },
      "/v1/escritorio/pessoas": { corpo: { pessoas: [DIEGO, MARINA] } },
      [`GET /v1/escritorio/financeiro/contratos/${CT}`]: { corpo: FICHA },
      [`GET /v1/escritorio/contratos/${CT}/carnes`]: { corpo: opcoes(COM_CHAVE, [GERADO], false) },
      [`GET /v1/escritorio/carnes/${CARNE}/envio`]: { corpo: {
        cliente: { nome: "Hélio Batista Corrêa" }, para: { nome: "Marta Corrêa", papel: null, telefone: "+5511981143059" }, titular: null,
        escritorio: "Ribeiro & Matos", ultimaDoCliente: null, bloqueio: "WHATSAPP_NAO_LIGADO", envios: [], texto: "Olá, Marta!",
        arquivo: { nome: "carne.pdf", tamanho: 90000, folhas: 1 } } },
    });
    await page.goto(`${P}/financeiro/a-receber/contratos/${CT}`);
    await page.getByRole("region", { name: "Carnê" }).getByRole("button", { name: "Mandar pelo WhatsApp" }).click();
    const j = page.getByRole("dialog", { name: "Mandar o carnê pelo WhatsApp" });
    await expect(j).toContainText("O WhatsApp do escritório ainda não está ligado ao T3jus.");
    await expect(j.getByRole("button", { name: "Enviar a Marta" })).toBeDisabled();
    await expect(j.getByRole("button", { name: "Baixar PDF" })).toBeVisible();
    await semViolacoes(page);
  });
});
