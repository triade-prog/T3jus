// As contas das telas de Procurações e modelos (F3.16), sem React.
import { describe, expect, it } from "vitest";
import { faltasDoResponsavel, marcadosDoModeloDocumento, montarValoresDocumento, type Anexo, type ClienteDoDocumento, type DadosDocumentos, type DocumentosDoContrato, type PreviaDocumentos } from "@t3jus/domain";
import {
  avisoDoMenor, avisoFaltaQuemAssina, avisoFez18, baixarNoCabecalho, botaoGerar, casoDoMenor, errosDocumentos, FALTA_DE_QUEM_ASSINA, faltasDeQuemAssina, faltasDoProprioCliente,
  formInicialDocumentos, fraseDaFaixaGerar, fraseVaoSair, linhaFaltaNoQuadro, pedidoDocumentos, problemaDoAssinado, problemaDosAssinados, quantosDocumentos, seloAssinado, tituloFaltas,
} from "./procuracoes.ts";

const insc = (id: string) => ({ id, uf: "SP", numero: "214538", letra: null, tipo: "PRINCIPAL", versao: 1, texto: "OAB/SP 214.538", documento: "OAB/SP nº 214.538" }) as const;
const base = (extra: Partial<DadosDocumentos> = {}): DadosDocumentos => ({
  contrato: { id: "c", numero: "C-2026-033", objeto: "Aposentadoria", estado: "ELABORACAO", assinadoEm: null, versao: 1 },
  cliente: { id: "cl", nome: "Benedito Souza Lima", tipo: "PF", documento: null, nacionalidade: null, estadoCivil: null, profissao: null, rg: null, rgOrgao: null,
    endereco: null, bairro: null, cidade: null, uf: null, cep: null, repNome: null, repCargo: null, repDocumento: null, repEstadoCivil: null, repProfissao: null, versao: 1 },
  condicoes: [], casos: [],
  advogados: [
    { pessoaId: "m", nome: "Marina Ribeiro", noContrato: true, responsavel: true, inscricoes: [insc("i1")], escolhidas: ["i1"] },
    { pessoaId: "l", nome: "Larissa Costa", noContrato: false, responsavel: false, inscricoes: [insc("i2")], escolhidas: ["i2"] },
  ],
  semOab: [], escritorio: { nome: "Ribeiro & Matos", cnpj: null, endereco: null, cidade: "São Paulo", uf: "SP", oab: null }, marca: null, hoje: "2026-11-21",
  modelos: [
    { tipo: "CONTRATO", modeloId: null, nome: "Contrato de honorários", numero: null, padrao: "CONTRATO", emRevisao: true },
    { tipo: "PROCURACAO", modeloId: null, nome: "Procuração", numero: null, padrao: "PROCURACAO", emRevisao: true },
    { tipo: "HIPOSSUFICIENCIA", modeloId: null, nome: "Declaração de hipossuficiência", numero: null, padrao: "HIPOSSUFICIENCIA_PF", emRevisao: true },
  ],
  atuais: [], ultima: null, mudancas: [], poderesIniciais: ["ACORDO", "RECEBER_QUITAR"],
  ...extra,
});

describe("Procurações e modelos: a página de gerar", () => {
  it("começa com os três documentos, os advogados do contrato e os poderes na ordem da tela", () => {
    const f = formInicialDocumentos(base());
    expect(f.docs).toEqual(["CONTRATO", "PROCURACAO", "HIPOSSUFICIENCIA"]);
    expect(f.outorgados).toEqual({ m: ["i1"] });
    expect(f.poderes).toEqual(["RECEBER_QUITAR", "ACORDO"]);
    expect(f.cidadeData).toBe("São Paulo, 21 de novembro de 2026");
    expect(fraseVaoSair(base(), f)).toBe("Vão sair 3 arquivos .docx: contrato, procuração e declaração.");
    expect(botaoGerar(base(), f)).toBe("Gerar 3 documentos");
    expect(pedidoDocumentos(base(), f).outorgados).toEqual([{ pessoaId: "m", inscricoes: ["i1"] }]);
  });

  it("o contrato já assinado e o documento com assinado vêm desmarcados; gerar de novo vira versão 2", () => {
    const d = base({
      contrato: { id: "c", numero: "C-2026-033", objeto: "x", estado: "ATIVO", assinadoEm: "2026-09-02", versao: 2 },
      atuais: [{ chave: "PROCURACAO", tipo: "PROCURACAO", modeloId: null, numero: 1, geradoEm: "2026-09-01T12:00:00Z", assinado: false }],
      ultima: { geracaoId: "g", em: "2026-09-01T12:00:00Z", por: { id: "m", nome: "Marina Ribeiro" }, documentos: [{ tipo: "CONTRATO", modeloId: null }, { tipo: "PROCURACAO", modeloId: null }],
        outorgados: [{ pessoaId: "l", inscricoes: ["i2"] }], poderes: ["DESISTIR"], outroPoder: "representar perante o INSS", cidadeData: "x" },
    });
    const f = formInicialDocumentos(d);
    expect(f.docs).toEqual(["PROCURACAO"]);
    expect(f.outorgados).toEqual({ l: ["i2"] });
    expect(f.outroPoder).toBe("representar perante o INSS");
    expect(botaoGerar(d, f)).toBe("Gerar a versão 2");
  });

  it("só bloqueia nenhum documento e nenhum outorgado (e o tamanho dos textos)", () => {
    const f = { docs: [], outorgados: {}, poderes: [], outroPoder: "", cidadeData: "SP" };
    expect(errosDocumentos(f)).toEqual({ documentos: "DOCUMENTO_OBRIGATORIO", outorgados: "SEM_OUTORGADO", cidadeData: "CIDADE_DATA_OBRIGATORIA" });
    expect(tituloFaltas(["o RG"], "Benedito Souza Lima")).toBe("Falta 1 dado de Benedito: o RG.");
    expect(tituloFaltas(["o RG", "a profissão"], "Benedito Souza Lima")).toBe("Faltam 2 dados de Benedito: o RG e a profissão.");
  });
});

describe("Procurações e modelos: os assinados", () => {
  it("o .docx gerado não serve como assinado; PDF e foto até 10 MB, sim", () => {
    expect(problemaDoAssinado("contrato.docx", 100)).toMatch(/é o .docx gerado/);
    expect(problemaDoAssinado("contrato.pdf", 11 * 1024 * 1024)).toMatch(/10 MB/);
    expect(problemaDoAssinado("foto.JPG", 900)).toBeNull();
    // Várias páginas (F3.99): um PDF só ou até 10 fotos, sem misturar.
    const foto = (n: number) => ({ name: `IMG_${n}.jpg`, size: 2_000_000 });
    expect(problemaDosAssinados([])).toBeNull();
    expect(problemaDosAssinados([foto(1), foto(2), { name: "p3.png", size: 900 }])).toBeNull();
    expect(problemaDosAssinados(Array.from({ length: 10 }, (_, i) => foto(i)))).toBeNull();
    expect(problemaDosAssinados(Array.from({ length: 11 }, (_, i) => foto(i)))).toMatch(/São 11 fotos, e o limite é 10/);
    expect(problemaDosAssinados([foto(1), { name: "resto.pdf", size: 900 }])).toMatch(/sem misturar PDF e foto/);
    expect(problemaDosAssinados([foto(1), { name: "contrato.docx", size: 900 }])).toMatch(/é o .docx gerado/);
    expect(problemaDosAssinados([foto(1), { name: "grande.jpg", size: 11 * 1024 * 1024 }])).toMatch(/^grande\.jpg: o arquivo passou de 10 MB/);
    expect(seloAssinado("PROCURACAO", "2026-10-30")).toBe("Assinada em 30/10");
    expect(seloAssinado("CONTRATO", null)).toBe("Assinado");
  });
});

describe("Baixar o contrato no cabeçalho da ficha (D29)", () => {
  const pessoa = { id: "m", nome: "Marina Ribeiro" };
  const versao = (n: number, assinados: { anexoId: string; nome: string }[] = []) => ({
    id: `v${n}`, numero: n, arquivo: `contrato-v${n}.docx`, geracaoId: "g", modelo: { nome: "Contrato", padrao: true, numero: null }, geradoPor: pessoa,
    geradoEm: "2026-09-01T15:00:00Z", marcados: [], assinados: assinados.map((a) => ({ ...a, assinadoEm: null, enviadoPor: pessoa, enviadoEm: "2026-09-02T15:00:00Z" })),
  });
  const docs = (documentos: DocumentosDoContrato["documentos"], podeGerar = true): DocumentosDoContrato => ({
    contrato: { id: "c", numero: "C-2026-019", estado: "ATIVO", assinadoEm: null, versao: 1, cliente: { id: "cl", nome: "Farmácia Bom Jesus Ltda." } },
    documentos, faltam: 0, ultima: null, podeGerar,
  });
  const contrato = (v: ReturnType<typeof versao>) => ({ chave: "CONTRATO", tipo: "CONTRATO" as const, nome: "Contrato de honorários", situacao: "FALTA" as const, atual: v, anteriores: [] });
  const procuracao = { chave: "PROCURACAO", tipo: "PROCURACAO" as const, nome: "Procuração", situacao: "FALTA" as const, atual: versao(1), anteriores: [] };
  const anexo = { id: "a1", categoria: "CONTRATO_ASSINADO", nome: "assinado.jpg", tipo: "IMAGEM", tamanho: 10, donoId: "c", enviadoPor: pessoa, enviadoEm: "2026-09-03T15:00:00Z" } as unknown as Anexo;

  it("nada enquanto carrega ou com erro", () => {
    expect(baixarNoCabecalho(null, null, "ATIVO")).toBeNull();
    expect(baixarNoCabecalho("erro", [], "ATIVO")).toBeNull();
  });
  it("o contrato gerado mais recente, com a versão e o dia em Brasília", () => {
    expect(baixarNoCabecalho(docs([procuracao, contrato(versao(2))]), [], "ATIVO")).toEqual({ tipo: "gerado", documentoId: "v2", qual: "v2 · gerado em 01/09/2026" });
  });
  it("com o assinado do contrato, só o assinado (pergunta 4)", () => {
    expect(baixarNoCabecalho(docs([contrato(versao(1, [{ anexoId: "x", nome: "contrato-assinado.pdf" }]))]), [], "ATIVO"))
      .toEqual({ tipo: "assinado", anexoId: "x", nome: "contrato-assinado.pdf", formato: "PDF", qual: "contrato-assinado.pdf · anexado em 02/09/2026" });
  });
  it("sem contrato gerado, o assinado da folha Assinatura (pergunta 3)", () => {
    expect(baixarNoCabecalho(docs([procuracao]), [anexo], "ATIVO")).toMatchObject({ tipo: "assinado", anexoId: "a1", formato: "foto" });
  });
  it("sem nada: Gerar o contrato para quem pode, fora de encerrado (pergunta 2)", () => {
    expect(baixarNoCabecalho(docs([]), [], "ATIVO")).toEqual({ tipo: "gerar" });
    expect(baixarNoCabecalho(docs([]), [], "ENCERRADO")).toBeNull();
    expect(baixarNoCabecalho(docs([], false), [], "ATIVO")).toBeNull();
  });
});

// ------------------------------------------------------------- Gerar documentos do menor (F3.142)

describe("Gerar documentos do menor (F3.142)", () => {
  const HOJE = "2026-11-22";
  const pedro = (extra: Partial<ClienteDoDocumento> = {}): ClienteDoDocumento => ({
    id: "cl", nome: "Pedro Henrique Alves Souza", tipo: "PF", documento: "48821390730", nacionalidade: "brasileiro", estadoCivil: null, profissao: null,
    rg: null, rgOrgao: null, endereco: "Rua das Acácias, 418", bairro: "Vila Mariana", cidade: "São Paulo", uf: "SP", cep: "04117030",
    repNome: null, repCargo: null, repDocumento: null, repEstadoCivil: null, repProfissao: null, versao: 1,
    capacidade: "MENOR", nascimento: "2014-03-14", rlPapel: "MAE", rlNome: "Joana Alves Souza", rlDocumento: "37764021563", rlRg: "28.441.903-7", rlRgOrgao: "SSP/SP",
    rlNacionalidade: "brasileira", rlEstadoCivil: "DIVORCIADO", rlProfissao: "auxiliar administrativa", rlMoraJunto: true,
    ...extra,
  });
  const lucas = (extra: Partial<ClienteDoDocumento> = {}) => pedro({ nome: "Lucas Ferreira Moura", nascimento: "2010-02-03", rlPapel: "PAI", rlNome: "Marcos Ferreira Moura", ...extra });
  const rafaela = (extra: Partial<ClienteDoDocumento> = {}) => pedro({ nome: "Rafaela Nunes Torres", nascimento: "2008-11-19", rlPapel: "TUTORA", rlNome: "Cleusa Nunes", rg: "41.207.338-0", ...extra });
  // A prévia como o servidor monta: os marcados vêm do domínio, não escritos à mão.
  const escritorio = { nome: "Ribeiro & Matos", cnpj: "41207338000105", endereco: "Rua Tabapuã, 1.123", cidade: "São Paulo", uf: "SP", oab: null } as DadosDocumentos["escritorio"];
  const previa = (c: ClienteDoDocumento, campos: readonly (readonly string[])[], extra: Partial<DadosDocumentos> = {}): PreviaDocumentos => {
    const d = base({ cliente: c, hoje: HOJE, escritorio, ...extra });
    const v = montarValoresDocumento(d, pedidoDocumentos(d, formInicialDocumentos(d)));
    const docs = campos.map((cs) => ({ tipo: "PROCURACAO" as const, modeloId: null, nome: "Procuração", paragrafos: [], marcados: marcadosDoModeloDocumento(v, cs), desconhecidos: [] }));
    const n = docs.map((x) => x.marcados.length);
    const max = Math.max(0, ...n);
    const dado = (k: number) => `${k} ${k === 1 ? "dado sai marcado" : "dados saem marcados"}`;
    const frase = max === 0 ? "Nenhum dado sai marcado." : n.every((x) => x === max) && n.length > 1 ? `${dado(max)} em cada um.` : `${dado(n.reduce((a, b) => a + b, 0))}.`;
    return { documentos: docs, frase };
  };
  const CLIENTE = ["CLIENTE_QUALIFICACAO", "CLIENTE_ASSINATURA"];

  it("representado e assistido: o aviso do dia, como no desenho, com o “(a)” e o primeiro nome", () => {
    expect(avisoDoMenor(pedro(), HOJE, 3)).toEqual({
      titulo: "Pedro tem 12 anos hoje: é representado(a).",
      texto: "Só Joana assina, em nome de Pedro, os três documentos. Em 14/03/2030, aos 16 anos, Pedro passa a ser assistido(a), e os dois assinam. O T3jus faz a conta pela data de nascimento, no dia de gerar.",
    });
    expect(avisoDoMenor(lucas(), HOJE, 3)).toEqual({
      titulo: "Lucas tem 16 anos hoje: é assistido(a).",
      texto: "Os dois assinam os três documentos: Lucas e o pai, Marcos, que o(a) assiste. Em 03/02/2028, aos 18 anos, Lucas passa a assinar sozinho(a).",
    });
    expect(avisoDoMenor(rafaela(), HOJE, 3)).toBeNull();
  });

  it("quantos documentos: o documento, os dois, os três, e nenhum marcado", () => {
    expect(quantosDocumentos(1)).toBe("o documento");
    expect(quantosDocumentos(2)).toBe("os dois documentos");
    expect(quantosDocumentos(3)).toBe("os três documentos");
    expect(quantosDocumentos(0)).toBe("os documentos");
    expect(quantosDocumentos(4)).toBe("os 4 documentos");
    expect(avisoDoMenor(pedro(), HOJE, 1)!.texto).toContain("Só Joana assina, em nome de Pedro, o documento.");
    expect(avisoDoMenor(lucas(), HOJE, 0)!.texto).toContain("Os dois assinam os documentos: Lucas");
  });

  it("as bordas da idade: na véspera dos 16, no dia dos 16, no dia dos 18, e quem nasceu em 29/02", () => {
    expect(casoDoMenor(pedro({ nascimento: "2010-11-23" }), HOJE)).toBe("REPRESENTADO");
    expect(casoDoMenor(pedro({ nascimento: "2010-11-22" }), HOJE)).toBe("ASSISTIDO");
    expect(casoDoMenor(pedro({ nascimento: "2008-11-22" }), HOJE)).toBe("FEZ_18");
    expect(casoDoMenor(pedro({ nascimento: "2008-11-23" }), HOJE)).toBe("ASSISTIDO");
    // 16 anos depois de um ano bissexto é outro ano bissexto: a data dos 16 é 29/02; a dos 18, 28/02.
    expect(avisoDoMenor(pedro({ nascimento: "2012-02-29" }), "2026-11-22", 3)!.texto).toContain("Em 29/02/2028, aos 16 anos");
    expect(avisoDoMenor(pedro({ nascimento: "2012-02-29" }), "2028-02-29", 3)!.texto).toContain("Em 28/02/2030, aos 18 anos");
  });

  it("o gênero de quem assina vem do papel", () => {
    expect(avisoDoMenor(lucas({ rlPapel: "TUTOR", rlNome: "Paulo Moura" }), HOJE, 3)!.texto).toContain("Lucas e o tutor, Paulo, que o(a) assiste.");
    expect(avisoDoMenor(lucas({ rlPapel: "MAE", rlNome: "Joana Souza" }), HOJE, 3)!.texto).toContain("Lucas e a mãe, Joana, que o(a) assiste.");
    expect(avisoFez18(rafaela(), HOJE)!.texto).toMatch(/^A tutora, Cleusa, que assinava com Rafaela, não entra mais\./);
    expect(avisoFez18(rafaela({ rlPapel: "PAI", rlNome: "Marcos Torres" }), HOJE)!.texto).toMatch(/^O pai, Marcos, que assinava com Rafaela/);
    expect(linhaFaltaNoQuadro(pedro({ rlDocumento: null, rlRg: null }))).toBe("Faltam o CPF e o RG dela");
    expect(linhaFaltaNoQuadro(lucas({ rlRg: null }))).toBe("Falta o RG dele");
    expect(linhaFaltaNoQuadro(pedro())).toBeNull();
  });

  it("as faltas de quem assina saem do domínio, com a marca do .docx", () => {
    const c = pedro({ rlDocumento: null, rlRg: null });
    expect(faltasDeQuemAssina(c)).toEqual([
      { curta: "o CPF", marca: "[CPF DE QUEM ASSINA: falta]" },
      { curta: "o RG", marca: "[RG DE QUEM ASSINA: falta]" },
    ]);
    const tudo = pedro({ rlDocumento: null, rlRg: null, rlProfissao: null, rlMoraJunto: false, rlEndereco: null });
    expect(faltasDeQuemAssina(tudo).map((x) => x.curta)).toEqual(["o CPF", "o RG", "a qualificação", "o endereço"]);
    expect(faltasDeQuemAssina(tudo)).toHaveLength(faltasDoResponsavel(tudo).length);
    // Todo texto possível do domínio está no mapa, menos o "quem assina pelo cliente", que o banco não deixa existir.
    const todos = faltasDoResponsavel({ rlNome: "", rlMoraJunto: false });
    expect(todos.filter((f) => !FALTA_DE_QUEM_ASSINA[f])).toEqual(["quem assina pelo cliente"]);
    expect(Object.values(FALTA_DE_QUEM_ASSINA).map((x) => x.marca)).toEqual(["[CPF DE QUEM ASSINA: falta]", "[RG DE QUEM ASSINA: falta]", null, "[ENDEREÇO DE QUEM ASSINA: falta]"]);
  });

  it("falta dado de quem assina: o aviso em atenção, no plural, no singular e sem marca", () => {
    expect(avisoFaltaQuemAssina(pedro({ rlDocumento: null, rlRg: null }), 3)).toEqual({
      titulo: "Faltam 2 dados de quem assina por Pedro: o CPF e o RG de Joana.",
      texto: "Dá para gerar assim: os três documentos saem com [CPF DE QUEM ASSINA: falta] e [RG DE QUEM ASSINA: falta], para preencher à mão ou no Word. Ou complete a ficha antes.",
    });
    expect(avisoFaltaQuemAssina(pedro({ rlRg: null }), 1)).toEqual({
      titulo: "Falta 1 dado de quem assina por Pedro: o RG de Joana.",
      texto: "Dá para gerar assim: o documento sai com [RG DE QUEM ASSINA: falta], para preencher à mão ou no Word. Ou complete a ficha antes.",
    });
    expect(avisoFaltaQuemAssina(pedro({ rlMoraJunto: false, rlEndereco: null }), 2)!.texto).toContain("os dois documentos saem com [ENDEREÇO DE QUEM ASSINA: falta]");
    expect(avisoFaltaQuemAssina(pedro({ rlProfissao: null }), 3)).toEqual({
      titulo: "Falta 1 dado de quem assina por Pedro: a qualificação de Joana.",
      texto: "Dá para gerar assim, para preencher à mão ou no Word. Ou complete a ficha antes.",
    });
    expect(avisoFaltaQuemAssina(pedro(), 3)).toBeNull();
  });

  it("as faltas do próprio cliente ficam sem as de quem assina", () => {
    expect(faltasDoProprioCliente(pedro({ nacionalidade: null, rlRg: null }), HOJE)).toEqual(["a nacionalidade"]);
    expect(faltasDoProprioCliente(pedro(), HOJE)).toEqual([]);
  });

  it("fez 18: o título da ficha, quem não entra mais e o que antes não ia no documento", () => {
    expect(avisoFez18(rafaela({ estadoCivil: null, profissao: null }), HOJE)).toEqual({
      titulo: "Rafaela fez 18 anos em 19/11/2026: agora assina por si.",
      texto: "A tutora, Cleusa, que assinava com Rafaela, não entra mais. Faltam 2 dados de Rafaela, que antes não iam no documento: o estado civil e a profissão. Dá para gerar assim: saem marcados, para completar no Word. Ou complete a ficha antes.",
      temFalta: true,
    });
    expect(avisoFez18(rafaela({ estadoCivil: "SOLTEIRO", profissao: null }), HOJE)!.texto)
      .toContain("Falta 1 dado de Rafaela, que antes não ia no documento: a profissão. Dá para gerar assim: sai marcado, para completar no Word.");
    expect(avisoFez18(rafaela({ estadoCivil: "SOLTEIRO", profissao: null, documento: null }), HOJE)!.texto)
      .toContain("não entra mais. Faltam 2 dados de Rafaela: a profissão e o CPF. Dá para gerar assim");
    expect(avisoFez18(rafaela({ estadoCivil: "SOLTEIRO", profissao: "estudante" }), HOJE))
      .toEqual({ titulo: "Rafaela fez 18 anos em 19/11/2026: agora assina por si.", texto: "A tutora, Cleusa, que assinava com Rafaela, não entra mais.", temFalta: false });
    expect(avisoFez18(pedro(), HOJE)).toBeNull();
  });

  it("a faixa: “Em todos”, a lista do que sai marcado e a frase do servidor quando não bate", () => {
    expect(fraseDaFaixaGerar(pedro(), HOJE, previa(pedro(), [CLIENTE, CLIENTE, CLIENTE]))).toBe("Nenhum dado sai marcado. Em todos, Joana assina por Pedro.");
    expect(fraseDaFaixaGerar(lucas(), HOJE, previa(lucas(), [CLIENTE]))).toBe("Nenhum dado sai marcado. Em todos, Lucas e Marcos assinam.");
    const falta = pedro({ rlDocumento: null, rlRg: null });
    expect(fraseDaFaixaGerar(falta, HOJE, previa(falta, [CLIENTE, CLIENTE, CLIENTE]))).toBe("2 dados saem marcados em cada um: o CPF e o RG de Joana.");
    // Um documento sem campo do cliente não atrapalha a lista.
    expect(fraseDaFaixaGerar(falta, HOJE, previa(falta, [CLIENTE, ["ADVOGADOS_QUALIFICACAO"]]))).toBe("2 dados saem marcados: o CPF e o RG de Joana.");
    // Com a qualificação de quem assina, que não deixa marca, fica só a frase do servidor.
    const qual = pedro({ rlRg: null, rlProfissao: null });
    expect(fraseDaFaixaGerar(qual, HOJE, previa(qual, [CLIENTE]))).toBe("2 dados saem marcados.");
    // Falta misturada (do cliente e de quem assina): só a frase do servidor.
    const mist = pedro({ nacionalidade: null, rlRg: null });
    expect(fraseDaFaixaGerar(mist, HOJE, previa(mist, [CLIENTE]))).toBe("2 dados saem marcados.");
    // Marcado de advogado junto: só a frase do servidor.
    const adv = { advogados: [{ pessoaId: "m", nome: "Marina Ribeiro", noContrato: true, responsavel: true, inscricoes: [insc("i1")], escolhidas: ["i1"],
      dados: { tratamento: "ADVOGADA", nacionalidade: null, estadoCivil: null, profissao: null, documento: null, endereco: null, versao: 1 } }] } as unknown as Partial<DadosDocumentos>;
    const comAdv = previa(falta, [[...CLIENTE, "ADVOGADOS_QUALIFICACAO"]], adv);
    expect(comAdv.documentos[0]!.marcados.length).toBeGreaterThan(2);
    expect(fraseDaFaixaGerar(falta, HOJE, comAdv)).toBe(comAdv.frase);
    // Fez 18: a lista com o nome de quem agora assina, sem "Em todos".
    const rafa = rafaela({ estadoCivil: null, profissao: null });
    expect(fraseDaFaixaGerar(rafa, HOJE, previa(rafa, [CLIENTE]))).toBe("2 dados saem marcados: o estado civil e a profissão de Rafaela.");
    // Sem prévia: a frase de reserva e o "Em todos".
    expect(fraseDaFaixaGerar(pedro(), HOJE, null)).toBe("Nenhum dado sai marcado. Em todos, Joana assina por Pedro.");
    expect(fraseDaFaixaGerar(falta, HOJE, null)).toBe("Algum dado sai marcado, para completar.");
    // Fora do menor, como antes.
    expect(fraseDaFaixaGerar(pedro({ capacidade: "PLENA" }), HOJE, null)).toBe("Algum dado sai marcado, para completar.");
  });

  it("sem data de nascimento ou sem quem assina: nenhum caso do menor, sem erro", () => {
    expect(casoDoMenor(pedro({ nascimento: null }), HOJE)).toBeNull();
    expect(casoDoMenor(pedro({ rlNome: null }), HOJE)).toBeNull();
    expect(casoDoMenor(pedro({ rlNome: "  " }), HOJE)).toBeNull();
    expect(casoDoMenor(pedro({ tipo: "PJ" }), HOJE)).toBeNull();
    expect(casoDoMenor(pedro({ capacidade: "CURATELA" }), HOJE)).toBeNull();
    expect(avisoDoMenor(pedro({ nascimento: null }), HOJE, 3)).toBeNull();
    expect(avisoFez18(pedro({ nascimento: null }), HOJE)).toBeNull();
    expect(fraseDaFaixaGerar(pedro({ nascimento: null, rlRg: "1" }), HOJE, null)).toBe("Algum dado sai marcado, para completar.");
  });
});
