// Dados do escritório para os documentos (PA-07), telas aprovadas em
// docs/design/aprovadas/escritorio-dados-documentos: a frase de como o escritório sai no
// contrato, o que falta, a edição pela sócia dona com a prévia e a leitura para os outros.
// A API é simulada; aqui se testa a tela, a acessibilidade e o que ela manda ao servidor.
import { expect, test } from "@playwright/test";
import { h, semViolacoes, simular } from "./console-dados.ts";

const P = "http://localhost:3000";
const ESC = "e0000000-0000-4000-8000-0000000000a7";

const DOC = {
  nome: "Santana", tipo: null, razaoSocial: null, cnpj: "60814144000103", oabUf: null, oabNumero: null, oab: null, cep: null, logradouro: null,
  numero: null, complemento: null, bairro: null, cidade: "Presidente Jânio Quadros", uf: "BA", endereco: null, enderecoConfira: false,
  telefone: null, email: null, site: null, dona: { pessoaId: "p1", nome: "Carol Santana", dados: null, inscricoes: [] },
};
const ESCRITORIO = {
  id: ESC, nome: "Santana", pessoa: "Carol Santana", dono: true, areas: ["COMERCIAL", "CONTRATOS", "FINANCEIRO", "JURIDICO"], socios: ["Carol Santana"],
  pessoas: 3, outrosEscritorios: 0, funcoes: ["SOCIO"], cnpj: "60814144000103", cidade: "Presidente Jânio Quadros", uf: "BA", endereco: null,
  contatos: [{ nome: "Carol Santana", papel: "Sócia dona", telefone: "+5571991845520", email: "carolina@santana.adv.br" }],
  ultimaExportacao: null, versao: 4, documentos: DOC, dadosMudados: null,
};
const COMPLETO = {
  ...DOC, nome: "Santana Advocacia", tipo: "SOCIEDADE_INDIVIDUAL", razaoSocial: "Santana Sociedade Individual de Advocacia", oabUf: "BA", oabNumero: "4217",
  oab: "OAB/BA 4.217", cep: "45240000", logradouro: "Rua Coronel Zeca Leite", numero: "118", complemento: "sala 2", bairro: "Centro",
  endereco: "Rua Coronel Zeca Leite, 118, sala 2, Centro",
};
const ADVS = { dono: true, eu: "p1", socios: ["Carol Santana"], escritorio: { endereco: null, cidade: "Presidente Jânio Quadros", uf: "BA" }, advogados: [], semOab: [] };

test.describe("Dados do escritório para os documentos (PA-07)", () => {
  test("a sócia dona vê o que falta e completa, com a prévia do contrato", async ({ page }) => {
    const pedidos = await simular(page, {
      "/v1/escritorio": [{ corpo: ESCRITORIO }, { corpo: { ...ESCRITORIO, nome: "Santana Advocacia", versao: 5, documentos: COMPLETO, dadosMudados: { em: h(0), por: "Carol Santana", onde: "PORTAL" } } }],
      "/v1/escritorio/advogados": { corpo: ADVS },
      "PUT /v1/escritorio/dados": { corpo: { documentos: COMPLETO, versao: 5, dadosMudados: null } },
    });
    await page.goto(`${P}/meu-escritorio`);
    const sai = page.getByRole("region", { name: "Como o escritório sai no contrato" });
    await expect(sai.getByText("[RAZÃO SOCIAL: falta]")).toBeVisible();
    await expect(sai.getByText(/Faltam 4 de 5: o tipo, a razão social, o registro da sociedade na OAB e o endereço da sede\./)).toBeVisible();
    await expect(page.getByRole("link", { name: "Advogados nos documentos" }).first()).toHaveAttribute("href", "/meu-escritorio/advogados");
    await semViolacoes(page);

    await sai.getByRole("button", { name: "Completar agora" }).click();
    await expect(page.getByLabel("Nome no T3jus")).toBeFocused();
    await page.getByLabel("CNPJ", { exact: true }).fill("60.814.144/0001-30");
    await page.getByLabel("Rua, avenida ou travessa").fill("Rua Coronel Zeca Leite");
    await page.getByRole("button", { name: "Salvar dados do escritório" }).click();
    await expect(page.getByText("Falta acertar 3 pontos, marcados abaixo.")).toBeVisible();
    await expect(page.getByLabel("CNPJ", { exact: true })).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByLabel("Número", { exact: true })).toHaveAttribute("aria-invalid", "true");
    expect(pedidos.filter((p) => p.metodo === "PUT")).toHaveLength(0);
    await semViolacoes(page);

    await page.getByLabel("Nome no T3jus").fill("Santana Advocacia");
    await page.getByRole("radio", { name: /^Sociedade individual de advocacia/ }).check();
    await page.getByLabel("Razão social").fill("Santana Sociedade Individual de Advocacia");
    await page.getByLabel("CNPJ", { exact: true }).fill("60.814.144/0001-03");
    await page.getByLabel("Registro na OAB: seccional").selectOption("BA");
    await page.getByLabel("Registro na OAB: número").fill("4217");
    await page.getByLabel("CEP").fill("45240000");
    await page.getByLabel("Número", { exact: true }).fill("118");
    await page.getByLabel(/Complemento/).fill("sala 2");
    await page.getByLabel("Bairro").fill("Centro");
    const previa = page.getByRole("complementary", { name: "Prévia" });
    await expect(previa.getByText(/SANTANA SOCIEDADE INDIVIDUAL DE ADVOCACIA/).first()).toBeVisible();
    await expect(previa.getByText(/CEP 45240-000/).first()).toBeVisible();
    await page.getByRole("button", { name: "Salvar dados do escritório" }).click();
    await expect(page.getByText("Dados do escritório salvos.")).toBeVisible();
    const corpo = pedidos.find((p) => p.metodo === "PUT")!.corpo;
    expect(corpo).toMatchObject({
      versao: 4, nome: "Santana Advocacia", tipo: "SOCIEDADE_INDIVIDUAL", razaoSocial: "Santana Sociedade Individual de Advocacia", cnpj: "60814144000103",
      oabUf: "BA", oabNumero: "4217", cep: "45240000", logradouro: "Rua Coronel Zeca Leite", numero: "118", complemento: "sala 2", bairro: "Centro",
      cidade: "Presidente Jânio Quadros", uf: "BA",
    });
    await expect(page.getByText("5 de 5 dados preenchidos.")).toBeVisible();
    await semViolacoes(page);
  });

  test("sem sociedade, razão social, CNPJ e OAB somem e a contratada é a sócia dona", async ({ page }) => {
    const pedidos = await simular(page, {
      "/v1/escritorio": { corpo: { ...ESCRITORIO, documentos: COMPLETO } },
      "/v1/escritorio/advogados": { corpo: ADVS },
      "PUT /v1/escritorio/dados": { corpo: { documentos: COMPLETO, versao: 5, dadosMudados: null } },
    });
    await page.goto(`${P}/meu-escritorio`);
    await page.getByRole("button", { name: "Editar dados" }).click();
    await page.getByRole("radio", { name: /^Advogada ou advogado sem sociedade/ }).check();
    await expect(page.getByLabel("Razão social")).toHaveCount(0);
    await expect(page.getByLabel("CNPJ", { exact: true })).toHaveCount(0);
    await expect(page.getByText(/O contrato sai com Carol Santana como contratada/)).toBeVisible();
    await semViolacoes(page);
    await page.getByRole("button", { name: "Salvar dados do escritório" }).click();
    await expect(page.getByText("Dados do escritório salvos.")).toBeVisible();
    expect(pedidos.find((p) => p.metodo === "PUT")!.corpo).toMatchObject({ tipo: "SEM_SOCIEDADE", razaoSocial: null, cnpj: null, oabUf: null, oabNumero: null });
  });

  test("o endereço antigo, num texto só, pede para conferir", async ({ page }) => {
    const antigo = { ...DOC, logradouro: "Rua da Aurora, 295, sala 1102", endereco: "Rua da Aurora, 295, sala 1102", enderecoConfira: true };
    await simular(page, { "/v1/escritorio": { corpo: { ...ESCRITORIO, documentos: antigo } }, "/v1/escritorio/advogados": { corpo: ADVS } });
    await page.goto(`${P}/meu-escritorio`);
    await expect(page.getByText("[ENDEREÇO DO ESCRITÓRIO: confira]").first()).toBeVisible();
    await page.getByRole("button", { name: "Editar dados" }).click();
    await expect(page.getByText("Confira o endereço: ele estava num texto só.")).toBeVisible();
    await expect(page.getByLabel("Rua, avenida ou travessa")).toHaveValue("Rua da Aurora, 295, sala 1102");
    await semViolacoes(page);
  });

  test("quem não é a sócia dona lê, sem editar, e sabe com quem falar", async ({ page }) => {
    await simular(page, {
      "/v1/escritorio": { corpo: { ...ESCRITORIO, pessoa: "Rafael Menezes", dono: false, areas: ["JURIDICO"], funcoes: ["EQUIPE"], documentos: COMPLETO } },
      "/v1/escritorio/advogados": { corpo: { ...ADVS, dono: false, eu: "p2" } },
    });
    await page.goto(`${P}/meu-escritorio`);
    await expect(page.getByText(/Quem muda estes dados é Carol Santana, sócia dona/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Editar dados" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Completar agora" })).toHaveCount(0);
    await semViolacoes(page);
  });
});
