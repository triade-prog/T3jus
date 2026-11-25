// A OAB de cada advogado na Equipe (EX-12), telas aprovadas em
// docs/design/aprovadas/portal-equipe-oab: a lista com a OAB embaixo do nome, a ficha da pessoa,
// adicionar, editar e remover a inscrição, o convite com a OAB e Sua conta. A API é simulada.
import { quadroAntesDoCommit } from "./quadro.ts";
import { expect, test, type Page } from "@playwright/test";
import { fixarRelogio, h, semViolacoes, simular } from "./console-dados.ts";

const P = "http://localhost:3000";
const ESC = "e0000000-0000-4000-8000-0000000000a1";
const pid = (n: number) => `a0000000-0000-4000-8000-00000000020${n}`;
const vid = (n: number) => `b0000000-0000-4000-8000-00000000020${n}`;
const oid = (n: number) => `c0000000-0000-4000-8000-00000000020${n}`;

const ESCRITORIO = {
  id: ESC, nome: "Ribeiro & Matos", pessoa: "Marina Ribeiro", dono: true, areas: ["COMERCIAL", "CONTRATOS", "FINANCEIRO", "JURIDICO"],
  socios: ["Marina Ribeiro"], pessoas: 3, outrosEscritorios: 0, funcoes: ["SOCIO"], cnpj: null, cidade: "São Paulo", uf: "SP", endereco: null,
  contatos: [], ultimaExportacao: null,
};
const FELIPE_ESC = { ...ESCRITORIO, pessoa: "Felipe Matos", dono: false, areas: ["CONTRATOS", "JURIDICO"], funcoes: ["EQUIPE"] };

const insc = (n: number, uf: string, numero: string, letra: string | null, tipo: "PRINCIPAL" | "SUPLEMENTAR") => {
  const fmt = numero.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return { id: oid(n), uf, numero, letra, tipo, versao: 1, texto: `OAB/${uf} ${fmt}${letra ? `-${letra}` : ""}`, documento: `OAB/${uf} nº ${fmt}${letra ? `-${letra}` : ""}` };
};
const SP = insc(1, "SP", "287104", null, "PRINCIPAL");
const RJ = insc(2, "RJ", "245880", "S", "SUPLEMENTAR");
const pessoa = (n: number, nome: string, areas: string[], oab: unknown[], dono = false) => ({
  vinculoId: vid(n), pessoaId: pid(n), nome, email: `${nome.split(" ")[0]!.toLowerCase()}@ribeiromatos.adv.br`, dono, areas,
  desde: h(4000), versao: 1, senhaCriadaEm: h(4000), conviteEnviadoEm: h(4000), oab,
});
const EQUIPE = [
  pessoa(1, "Marina Ribeiro", ["COMERCIAL", "CONTRATOS", "FINANCEIRO", "JURIDICO"], [insc(3, "SP", "214538", null, "PRINCIPAL")], true),
  pessoa(2, "Felipe Matos", ["CONTRATOS", "JURIDICO"], [SP, RJ]),
  pessoa(3, "Gustavo Lima", ["JURIDICO"], []),
];
const ESC_END = { endereco: "Av. Paulista, 1.000, sala 52, Bela Vista", cidade: "São Paulo", uf: "SP" };
const DADOS_FELIPE = {
  nomeCompleto: "Felipe Matos", tratamento: null, nacionalidade: null, estadoCivil: null, cpf: null, rg: null, rgOrgao: null,
  enderecoDoEscritorio: true, cep: null, endereco: null, bairro: null, cidade: null, uf: null, emailProfissional: null, telefoneProfissional: null,
  atualizadoEm: null, atualizadoPor: null, versao: 0, mudancas: [],
};
const FICHA_FELIPE = {
  ...EQUIPE[1], dados: DADOS_FELIPE, escritorio: ESC_END, frase: "OAB/SP nº 287.104 e OAB/RJ nº 245.880-S",
  contratos: [{ id: "d0000000-0000-4000-8000-000000000201", numero: "C-2026-019", estado: "ATIVO", responsavel: true, cliente: "Farmácia Bom Jesus Ltda." }],
};
const FICHA_GUSTAVO = { ...EQUIPE[2], frase: null, contratos: [], dados: { ...DADOS_FELIPE, nomeCompleto: "Gustavo Lima" }, escritorio: ESC_END };
const ehCelular = (page: Page) => (page.viewportSize()?.width ?? 1000) <= 760;

// O relógio do navegador fica em AGORA, o mesmo instante de onde os dados contam (F3.164).
test.beforeEach(async ({ page }) => { await fixarRelogio(page); });

test.describe("Equipe com a OAB (EX-12)", () => {
  test("a lista mostra a OAB embaixo do nome e o nome leva à ficha", async ({ page }) => {
    await simular(page, { "/v1/escritorio": { corpo: ESCRITORIO }, "/v1/escritorio/equipe": { corpo: { pessoas: EQUIPE } }, "/v1/escritorio/equipe/retiradas": { corpo: { pessoas: [] } } });
    await page.goto(`${P}/equipe`);
    const onde = ehCelular(page) ? page.getByRole("list", { name: "Pessoas da equipe" }) : page.locator("table");
    await expect(onde.getByText("OAB/RJ 245.880-S")).toBeVisible();
    await expect(onde.getByRole("link", { name: /^Felipe Matos\s?, abrir a ficha$/ })).toHaveAttribute("href", `/equipe/pessoas/${pid(2)}`);
    await expect(page.getByText("A OAB é opcional: só quem é advogado precisa dela.")).toBeVisible();
    await semViolacoes(page);
  });

  test("a ficha mostra como sai no documento; editar e remover a inscrição", async ({ page }) => {
    const pedidos = await simular(page, {
      "/v1/escritorio": { corpo: ESCRITORIO }, "/v1/escritorio/equipe": { corpo: { pessoas: EQUIPE } },
      [`/v1/escritorio/equipe/pessoas/${pid(2)}`]: { corpo: FICHA_FELIPE },
      [`PUT /v1/escritorio/equipe/oab/${oid(2)}`]: { corpo: { ...RJ, tipo: "PRINCIPAL", versao: 2, frase: "x" } },
      [`POST /v1/escritorio/equipe/oab/${oid(2)}/remover`]: { corpo: { frase: "OAB/SP nº 287.104" } },
    });
    await page.goto(`${P}/equipe/pessoas/${pid(2)}`);
    await expect(page.getByRole("heading", { level: 1, name: "Felipe Matos" })).toBeVisible();
    const sai = page.getByRole("region", { name: "Como Felipe sai no contrato e na procuração" });
    await expect(sai.getByText(/inscrito\(a\) na OAB\/SP sob o nº 287\.104 e na OAB\/RJ sob o nº 245\.880-S/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Completar os dados de Felipe" })).toBeVisible();
    // PA-07: os dados para os documentos se mudam em Escritório › Advogados nos documentos.
    await expect(page.getByRole("link", { name: "Advogados nos documentos" }).last()).toHaveAttribute("href", `/meu-escritorio/advogados?editar=${pid(2)}`);
    await expect(page.getByRole("link", { name: "C-2026-019 · Farmácia Bom Jesus Ltda." })).toBeVisible();
    await semViolacoes(page);

    await page.getByRole("button", { name: "Editar a inscrição OAB/RJ 245.880-S de Felipe" }).click();
    const j = page.getByRole("dialog", { name: "Editar a inscrição OAB/RJ 245.880-S" });
    await expect(j.getByLabel("Número")).toBeFocused();
    await expect(j.getByText("Felipe já tem a principal, OAB/SP 287.104.")).toBeVisible();
    await j.getByRole("radio", { name: /^Principal/ }).check();
    await expect(j.getByText("Felipe Matos, OAB/RJ nº 245.880-S e OAB/SP nº 287.104")).toBeVisible();
    await semViolacoes(page);
    await j.getByRole("button", { name: "Salvar inscrição" }).click();
    await expect(j).toBeHidden();
    const put = pedidos.find((p) => p.metodo === "PUT")!;
    expect(put.corpo).toEqual({ uf: "RJ", numero: "245880", letra: "S", tipo: "PRINCIPAL", trocarPrincipal: true, versao: 1 });

    await page.getByRole("button", { name: "Remover a inscrição OAB/RJ 245.880-S de Felipe" }).click();
    const r = page.getByRole("alertdialog", { name: "Remover OAB/RJ 245.880-S de Felipe?" });
    await expect(r.getByRole("button", { name: "Voltar" })).toBeFocused();
    await expect(r.getByText("Os documentos gerados daqui em diante saem só com OAB/SP 287.104.")).toBeVisible();
    await semViolacoes(page);
    await r.getByRole("button", { name: "Remover a inscrição" }).click();
    await expect(r).toBeHidden();
    expect(pedidos.find((p) => p.caminho.endsWith("/remover"))!.corpo).toEqual({ versao: 1 });
  });

  test("adicionar: erros presos aos campos, número de outra pessoa e a prévia", async ({ page }) => {
    const pedidos = await simular(page, {
      "/v1/escritorio": { corpo: ESCRITORIO }, "/v1/escritorio/equipe": { corpo: { pessoas: EQUIPE } },
      [`/v1/escritorio/equipe/pessoas/${pid(3)}`]: { corpo: FICHA_GUSTAVO },
      [`POST /v1/escritorio/equipe/pessoas/${pid(3)}/oab`]: [
        { status: 422, corpo: { erro: { codigo: "VALIDATION_ERROR", detalhes: { campos: ["numero"], motivos: { numero: "OAB_DE_OUTRA_PESSOA" }, nome: "Felipe Matos" } } } },
        { status: 201, corpo: { ...insc(4, "SP", "512907", null, "PRINCIPAL"), frase: "OAB/SP nº 512.907" } },
      ],
    });
    await page.goto(`${P}/equipe/pessoas/${pid(3)}`);
    await expect(page.getByText("Sem OAB cadastrada")).toBeVisible();
    await page.getByRole("button", { name: "Adicionar inscrição" }).first().click();
    const j = page.getByRole("dialog", { name: "Adicionar inscrição na OAB" });
    await expect(j.getByLabel("UF da seccional")).toBeFocused();
    await expect(j.getByText("É a primeira inscrição de Gustavo, então vem como principal.")).toBeVisible();
    await j.getByLabel("Número").fill("51290A");
    await j.getByRole("button", { name: "Salvar inscrição" }).click();
    await expect(j.getByText("Falta acertar 2 pontos")).toBeVisible();
    await expect(j.getByText("Escolha a UF da seccional em que Gustavo é inscrito.")).toBeVisible();
    await expect(j.getByText("Use só números, até 6. A letra, se houver, vai no campo Letra.")).toBeVisible();
    await semViolacoes(page);
    expect(pedidos.filter((p) => p.metodo === "POST")).toHaveLength(0);

    await j.getByLabel("UF da seccional").selectOption("SP");
    await j.getByLabel("Número").fill("287.104");
    await j.getByRole("button", { name: "Salvar inscrição" }).click();
    await expect(j.getByText("OAB/SP 287.104 já está com Felipe Matos nesta equipe. Confira o número na carteira de Gustavo.")).toBeVisible();
    await j.getByLabel("Número").fill("512907");
    await expect(j.getByText("Gustavo Lima, OAB/SP nº 512.907")).toBeVisible();
    await j.getByRole("button", { name: "Salvar inscrição" }).click();
    await expect(page.getByText("Inscrição de Gustavo Lima salva.")).toBeVisible();
  });

  test("o convite leva a OAB principal, opcional", async ({ page }) => {
    const pedidos = await simular(page, {
      "/v1/escritorio": { corpo: ESCRITORIO }, "/v1/escritorio/equipe": { corpo: { pessoas: EQUIPE } }, "/v1/escritorio/equipe/retiradas": { corpo: { pessoas: [] } },
      "POST /v1/escritorio/equipe": { status: 201, corpo: { vinculoId: vid(9) } },
    });
    await page.goto(`${P}/equipe`);
    await page.getByRole("button", { name: "Convidar pessoa" }).first().click();
    const j = page.getByRole("dialog", { name: "Convidar pessoa" });
    await j.getByLabel("Nome completo").fill("Renata Lopes");
    await j.getByLabel("E-mail").fill("renata@ribeiromatos.adv.br");
    await j.getByLabel("UF da seccional").selectOption("RJ");
    await j.getByRole("button", { name: "Enviar convite" }).click();
    await expect(j.getByRole("link", { name: "OAB: falta o número" })).toBeVisible();
    await semViolacoes(page);
    await j.getByLabel("Número").fill("498310");
    await expect(j.getByText("Renata Lopes, OAB/RJ nº 498.310")).toBeVisible();
    await j.getByRole("button", { name: "Enviar convite" }).click();
    await expect(j).toBeHidden();
    expect((pedidos.find((p) => p.metodo === "POST")!.corpo as { oab: unknown }).oab).toEqual({ uf: "RJ", numero: "498310", letra: null });
  });

  test("Sua conta fica só com o que é do sistema e leva aos dados no Escritório (PA-07)", async ({ page }) => {
    await simular(page, {
      "/v1/escritorio": { corpo: FELIPE_ESC },
      "/v1/escritorio/conta": {
        corpo: {
          pessoaId: pid(2), nome: "Felipe Matos", email: "felipe@ribeiromatos.adv.br", dono: false, desde: h(4000), areas: ["CONTRATOS", "JURIDICO"],
          oab: [SP, RJ], frase: FICHA_FELIPE.frase, socios: ["Marina Ribeiro"], dados: DADOS_FELIPE, escritorio: ESC_END, contratos: [],
        },
      },
    });
    await page.goto(`${P}/conta`);
    await expect(page.getByRole("heading", { level: 1, name: "Felipe Matos" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Sua conta no T3jus" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Seus dados para os documentos" })).toHaveCount(0);
    await expect(page.getByLabel("CPF")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Ir para Advogados nos documentos" })).toHaveAttribute("href", "/meu-escritorio/advogados");
    await semViolacoes(page);
    if (ehCelular(page)) {
      await page.getByRole("button", { name: "Mais" }).click();
      await expect(page.getByRole("dialog", { name: "Mais" }).getByRole("link", { name: "Sua conta" })).toHaveAttribute("aria-current", "page");
      await page.keyboard.press("Escape");
    } else {
      await expect(page.locator("#trilho").getByRole("link", { name: /sua conta/ })).toHaveAttribute("aria-current", "page");
    }
  });

  test("Advogados nos documentos: cada um completa os próprios dados (PA-07)", async ({ page }) => {
    const pedidos = await simular(page, {
      "/v1/escritorio": { corpo: FELIPE_ESC },
      "/v1/escritorio/advogados": [{
        corpo: {
          dono: false, eu: pid(2), socios: ["Marina Ribeiro"], escritorio: ESC_END, semOab: [{ pessoaId: pid(3), nome: "Gustavo Lima" }],
          advogados: [
            { pessoaId: pid(2), nome: "Felipe Matos", socioDono: false, inscricoes: [SP, RJ], frase: FICHA_FELIPE.frase, faltas: [], dados: DADOS_FELIPE },
            { pessoaId: pid(1), nome: "Marina Ribeiro", socioDono: true, inscricoes: [insc(3, "SP", "214538", null, "PRINCIPAL")], frase: "OAB/SP nº 214.538", faltas: ["CPF"], dados: null },
          ],
        },
      }],
      "PUT /v1/escritorio/conta/dados": {
        corpo: { ...DADOS_FELIPE, nomeCompleto: "Felipe Augusto Matos", tratamento: "ADVOGADO", nacionalidade: "brasileiro", estadoCivil: "SOLTEIRO",
          cpf: "52998224725", rg: "12.345.678-9", rgOrgao: "SSP/SP", versao: 1 },
      },
    });
    await page.goto(`${P}/meu-escritorio/advogados`);
    await expect(page.getByRole("heading", { level: 1, name: "Quem assina pelo escritório" })).toBeVisible();
    await expect(page.getByText(/só aparece para Marina e para Marina Ribeiro, sócia dona/)).toBeVisible();
    await expect(page.getByText(/Gustavo Lima não assina documentos/)).toBeVisible();
    await expect(page.getByRole("button", { name: /de Marina Ribeiro/ })).toHaveCount(0);
    await semViolacoes(page);

    await page.getByRole("button", { name: /Completar os dados de Felipe Matos/ }).click();
    await page.getByLabel("Nome completo").fill("Felipe Augusto Matos");
    await page.getByLabel("CPF").fill("111.111.111-11");
    await page.getByRole("button", { name: "Salvar dados" }).click();
    await expect(page.getByLabel("CPF")).toHaveAttribute("aria-invalid", "true");
    expect(pedidos.filter((p) => p.metodo === "PUT")).toHaveLength(0);
    await semViolacoes(page);

    await page.getByLabel("CPF").fill("529.982.247-25");
    await page.getByRole("radio", { name: /Advogado/ }).check();
    await page.getByLabel("Nacionalidade").fill("brasileiro");
    await page.getByLabel("Estado civil").selectOption("SOLTEIRO");
    await page.getByLabel("RG", { exact: true }).fill("12.345.678-9");
    await page.getByLabel("Órgão emissor e UF").fill("SSP/SP");
    await page.getByRole("button", { name: "Salvar dados" }).click();
    await expect(page.getByText("Seus dados foram salvos.")).toBeVisible();
    const corpo = pedidos.find((p) => p.metodo === "PUT")!.corpo as { versao: number; nomeCompleto: string; cpf: string; enderecoDoEscritorio: boolean };
    expect(corpo).toMatchObject({ versao: 0, nomeCompleto: "Felipe Augusto Matos", enderecoDoEscritorio: true });
    expect(corpo.cpf.replace(/\D/g, "")).toBe("52998224725");
  });

  // F3.176: com o quadro antes do commit, o rAF depois do await rodaria antes de o campo ser
  // marcado com erro. O foco vem de um efeito, por contador.
  test("número de outra pessoa com o quadro antes do commit: o foco vai ao Número", async ({ page }) => {
    await quadroAntesDoCommit(page);
    await simular(page, {
      "/v1/escritorio": { corpo: ESCRITORIO }, "/v1/escritorio/equipe": { corpo: { pessoas: EQUIPE } },
      [`/v1/escritorio/equipe/pessoas/${pid(3)}`]: { corpo: FICHA_GUSTAVO },
      [`POST /v1/escritorio/equipe/pessoas/${pid(3)}/oab`]: {
        status: 422, corpo: { erro: { codigo: "VALIDATION_ERROR", detalhes: { campos: ["numero"], motivos: { numero: "OAB_DE_OUTRA_PESSOA" }, nome: "Felipe Matos" } } },
      },
    });
    await page.goto(`${P}/equipe/pessoas/${pid(3)}`);
    await page.getByRole("button", { name: "Adicionar inscrição" }).first().click();
    const j = page.getByRole("dialog", { name: "Adicionar inscrição na OAB" });
    await j.getByLabel("Número").fill("287.104");
    // Erro local, sem ir ao servidor: o foco vai ao primeiro campo marcado.
    await j.getByRole("button", { name: "Salvar inscrição" }).click();
    await expect(j.getByLabel("UF da seccional")).toBeFocused();

    await j.getByLabel("UF da seccional").selectOption("SP");
    await j.getByRole("button", { name: "Salvar inscrição" }).click();
    await expect(j.getByText("OAB/SP 287.104 já está com Felipe Matos nesta equipe. Confira o número na carteira de Gustavo.")).toBeVisible();
    await expect(j.getByLabel("Número")).toBeFocused();
  });
});
