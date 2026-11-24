import { describe, expect, it } from "vitest";
import { linhasDoReciboAntigo } from "./proposta_docx.ts";
import {
  assinaturaDoRecibo, camposDoEscritorioNaCapa, identificacaoDoCarne, linhasDoTimbreRecibo, mesmoNome, razaoLonga, razaoSocialEmBranco, subMarcaAdvocacia,
  textoDaLinha, timbradoDoDocx, timbradoDoEscritorio, type EscritorioNoPapel, type LinhaDoPapel,
} from "./timbrado.ts";

// O elenco do desenho aprovado (docs/design/aprovadas/carne-recibo-razao-social, _fonte/rs_dados.py).
const RAZAO_LONGA = "SANTANA, LIMA, OLIVEIRA, ALBUQUERQUE CAVALCANTI, VASCONCELOS FIGUEIREDO, MENEZES, ANDRADE, "
  + "QUEIROZ MONTEIRO E BITTENCOURT PRADO SOCIEDADE DE ADVOGADOS";

const completa: EscritorioNoPapel = {
  comTimbrado: true, nome: "Santana Advocacia", tipo: "SOCIEDADE", razaoSocial: "SANTANA, LIMA E OLIVEIRA SOCIEDADE DE ADVOGADOS",
  cnpj: "47318552000106", oab: "OAB/BA 4.217", cep: "41820020", logradouro: "Av. Tancredo Neves", numero: "1.632", complemento: "sala 1.208",
  bairro: "Caminho das Árvores", cidade: "Salvador", uf: "BA", endereco: "Av. Tancredo Neves, 1.632, sala 1.208, Caminho das Árvores",
  enderecoConfira: false, telefone: "7133524180", email: "contato@santana.adv.br", site: "santana.adv.br", contatos: [],
  whatsapp: "+5571991874402", dona: null,
};
const semSociedade: EscritorioNoPapel = {
  ...completa, nome: "Carol Santana Advocacia", tipo: "SEM_SOCIEDADE", razaoSocial: null, cnpj: null, oab: null, email: "carolina@santana.adv.br", site: null,
  // O CPF não deveria chegar (a 0890 não manda), mas mesmo assim não vai para o papel.
  dona: { nome: "Carolina Soares Santana", dados: { nomeCompleto: "Carolina Soares Santana", cpf: "52998224725" } as { nomeCompleto: string },
    inscricoes: [{ texto: "OAB/BA 63.876-S", tipo: "PRINCIPAL" }] },
};
const vazia: EscritorioNoPapel = {
  ...completa, razaoSocial: null, oab: null, telefone: null, email: null, site: "santana.adv.br",
  contatos: [{ telefone: null, email: null }, { telefone: "+5571988771020", email: "carol@santana.adv.br" }],
};
const ribeiro: EscritorioNoPapel = {
  ...completa, nome: "Ribeiro & Matos", razaoSocial: "Ribeiro & Matos Sociedade de Advogados", cnpj: "41276839000134", oab: "OAB/SP 31.874",
  cep: "05407002", logradouro: "Rua Cardeal Arcoverde", numero: "1749", complemento: "sala 92", bairro: "Pinheiros", cidade: "São Paulo", uf: "SP",
  telefone: "1130517720", email: "financeiro@ribeiromatos.adv.br", site: "ribeiromatos.adv.br", whatsapp: "+5511974052210",
};
const t = (l: LinhaDoPapel | null) => (l ? textoDaLinha(l) : null);

describe("timbrado no carnê e no recibo (F3.133, PA-07)", () => {
  it("as 4 linhas aprovadas, com sociedade", () => {
    const l = timbradoDoEscritorio(completa);
    expect(l.nome).toBe("SANTANA, LIMA E OLIVEIRA SOCIEDADE DE ADVOGADOS");
    expect(t(l.documento)).toBe("CNPJ 47.318.552/0001-06 · OAB/BA 4.217");
    expect(t(l.sede)).toBe("Av. Tancredo Neves, 1.632, sala 1.208, Caminho das Árvores, Salvador/BA, CEP 41820-020");
    expect(t(l.contato)).toBe("(71) 3352-4180 · contato@santana.adv.br · santana.adv.br");
  });

  it("CNPJ, OAB, CEP e telefones são pedaços inteiros (não quebram no meio)", () => {
    const l = timbradoDoEscritorio(completa);
    expect(l.documento.filter((p) => p.inteiro).map((p) => p.texto)).toEqual(["CNPJ 47.318.552/0001-06", "OAB/BA 4.217"]);
    expect(l.sede.at(-1)).toEqual({ texto: "CEP 41820-020", inteiro: true });
    expect(l.contato[0]).toEqual({ texto: "(71) 3352-4180", inteiro: true });
  });

  it("sem sociedade: o nome completo e a OAB da sócia dona, sem CPF", () => {
    const l = timbradoDoEscritorio(semSociedade);
    expect(l.nome).toBe("Carolina Soares Santana");
    expect(t(l.documento)).toBe("OAB/BA 63.876-S · sem CNPJ");
    expect(t(l.contato)).toBe("(71) 3352-4180 · carolina@santana.adv.br");
    const a = assinaturaDoRecibo(semSociedade);
    expect(a.nome).toBe("Carolina Soares Santana");
    expect(t(a.documento)).toBe("OAB/BA 63.876-S");
    const tudo = JSON.stringify([l, a, linhasDoTimbreRecibo(semSociedade), identificacaoDoCarne(semSociedade), camposDoEscritorioNaCapa(semSociedade)]);
    expect(tudo).not.toContain("52998224725");
    expect(tudo).not.toContain("529.982");
  });

  it("sem sociedade e sem sócia dona: o nome curto e só \"sem CNPJ\"", () => {
    const e = { ...semSociedade, dona: null };
    expect(timbradoDoEscritorio(e).nome).toBe("Carol Santana Advocacia");
    expect(identificacaoDoCarne(e)).toEqual({ nome: null, documento: [{ texto: "sem CNPJ" }] });
    expect(assinaturaDoRecibo(e)).toEqual({ nome: "Carol Santana Advocacia", documento: null });
  });

  it("razão social vazia: sai o nome curto, sem \"[falta]\", e o primeiro contato", () => {
    const l = timbradoDoEscritorio(vazia);
    expect(l.nome).toBe("Santana Advocacia");
    expect(t(l.documento)).toBe("CNPJ 47.318.552/0001-06");
    expect(t(l.contato)).toBe("(71) 98877-1020 · carol@santana.adv.br");
    expect(identificacaoDoCarne(vazia)).toEqual({ nome: null, documento: l.documento });
    expect(linhasDoTimbreRecibo(vazia).destaque).toBeNull();
    expect(assinaturaDoRecibo(vazia).nome).toBe("Santana Advocacia");
    expect(t(assinaturaDoRecibo(vazia).documento)).toBe("CNPJ 47.318.552/0001-06");
    expect(JSON.stringify([l, linhasDoTimbreRecibo(vazia), camposDoEscritorioNaCapa(vazia)])).not.toMatch(/falta|confira/i);
  });

  it("sede incompleta ou para conferir: o que houver, sem \"confira\"", () => {
    const e = { ...completa, enderecoConfira: true, endereco: "Av. Tancredo Neves 1632 sl 1208" };
    expect(t(timbradoDoEscritorio(e).sede)).toBe("Av. Tancredo Neves 1632 sl 1208, Salvador/BA, CEP 41820-020");
    expect(t(timbradoDoEscritorio({ ...completa, cep: null, numero: null }).sede)).toBe(`${completa.endereco}, Salvador/BA`);
    expect(timbradoDoEscritorio({ ...completa, cep: null, endereco: null, cidade: null, uf: null }).sede).toEqual([]);
  });

  it("decisão 3: não repete o que a marca já diz (maiúsculas, acentos, pontuação e \"&\")", () => {
    expect(mesmoNome("Ribeiro & Matos", "RIBEIRO E MATOS")).toBe(true);
    expect(mesmoNome("Ribeiro &amp; Matos", "ribeiro e matos.")).toBe(true);
    expect(mesmoNome("Advocacia São João", "ADVOCACIA SAO JOAO")).toBe(true);
    expect(mesmoNome("Santana Advocacia", "SANTANA, LIMA E OLIVEIRA SOCIEDADE DE ADVOGADOS")).toBe(false);
    const igual = { ...completa, razaoSocial: "SANTANA ADVOCACIA" };
    expect(identificacaoDoCarne(igual)?.nome).toBeNull();
    expect(linhasDoTimbreRecibo(igual).destaque).toBeNull();
    expect(camposDoEscritorioNaCapa(igual).nome).toBeNull();
    // a assinatura fica com a razão social como está guardada
    expect(assinaturaDoRecibo(igual).nome).toBe("SANTANA ADVOCACIA");
  });

  it("decisão 4: o \"Advocacia\" embaixo só quando o nome curto não diz isso", () => {
    expect(subMarcaAdvocacia("Santana Advocacia")).toBeNull();
    expect(subMarcaAdvocacia("Carol Santana Advogada")).toBeNull();
    expect(subMarcaAdvocacia("Escritório de ADVOCACIA Lima")).toBeNull();
    expect(subMarcaAdvocacia("Ribeiro & Matos")).toBe("Advocacia");
  });

  it("decisão 13: mais de 90 letras deixa a letra menor", () => {
    expect(RAZAO_LONGA).toHaveLength(150);
    expect(razaoLonga("x".repeat(90))).toBe(false);
    expect(razaoLonga("x".repeat(91))).toBe(true);
    expect(razaoLonga(timbradoDoEscritorio({ ...completa, razaoSocial: RAZAO_LONGA }).nome)).toBe(true);
    expect(timbradoDoEscritorio({ ...completa, razaoSocial: RAZAO_LONGA }).nome).toBe(RAZAO_LONGA);
  });

  it("sociedade individual: razão social e CNPJ", () => {
    const e = { ...completa, tipo: "SOCIEDADE_INDIVIDUAL" as const, razaoSocial: "Carolina Santana Sociedade Individual de Advocacia" };
    expect(identificacaoDoCarne(e)).toEqual({ nome: "Carolina Santana Sociedade Individual de Advocacia", documento: timbradoDoEscritorio(e).documento });
    expect(t(assinaturaDoRecibo(e).documento)).toBe("CNPJ 47.318.552/0001-06 · OAB/BA 4.217");
  });

  it("recibo: a razão social em destaque, as 3 linhas e o WhatsApp por último (decisão 5)", () => {
    const r = linhasDoTimbreRecibo(completa);
    expect(r.destaque).toBe("SANTANA, LIMA E OLIVEIRA SOCIEDADE DE ADVOGADOS");
    expect(r.linhas.map(t)).toEqual([
      "CNPJ 47.318.552/0001-06 · OAB/BA 4.217",
      "Av. Tancredo Neves, 1.632, sala 1.208, Caminho das Árvores, Salvador/BA, CEP 41820-020",
      "(71) 3352-4180 · contato@santana.adv.br · santana.adv.br",
      "WhatsApp (71) 99187-4402",
    ]);
    expect(linhasDoTimbreRecibo(ribeiro).destaque).toBe("Ribeiro & Matos Sociedade de Advogados");
  });

  it("pergunta 4: o WhatsApp igual ao telefone não se repete (com ou sem +55)", () => {
    expect(linhasDoTimbreRecibo({ ...completa, telefone: "71991874402" }).linhas.map(t)).not.toContainEqual(expect.stringMatching(/^WhatsApp/));
    expect(linhasDoTimbreRecibo({ ...vazia, whatsapp: "+5571988771020" }).linhas.map(t)).not.toContainEqual(expect.stringMatching(/^WhatsApp/));
    expect(linhasDoTimbreRecibo({ ...completa, whatsapp: null }).linhas).toHaveLength(3);
  });

  it("decisão 11: o site só no recibo; a capa do carnê sem ele", () => {
    const c = camposDoEscritorioNaCapa(completa);
    expect(c.nome).toBe("SANTANA, LIMA E OLIVEIRA SOCIEDADE DE ADVOGADOS");
    expect(c.linhas.map(t)).toEqual([
      "CNPJ 47.318.552/0001-06 · OAB/BA 4.217",
      "Av. Tancredo Neves, 1.632, sala 1.208, Caminho das Árvores, Salvador/BA, CEP 41820-020",
      "(71) 3352-4180 · contato@santana.adv.br",
    ]);
    expect(JSON.stringify(identificacaoDoCarne(completa))).not.toContain("santana.adv.br\"");
  });

  it("sem telefone e e-mail do escritório: o primeiro contato que tem um deles, sem o site", () => {
    expect(t(timbradoDoEscritorio(vazia).contato)).not.toContain("santana.adv.br ·");
    expect(timbradoDoEscritorio({ ...vazia, contatos: null }).contato).toEqual([]);
  });

  it("o recibo antigo (linhasDoReciboAntigo) continua com as 3 linhas de antes (PT-03)", () => {
    expect(linhasDoReciboAntigo(completa)).toEqual([
      "SANTANA, LIMA E OLIVEIRA SOCIEDADE DE ADVOGADOS",
      "CNPJ 47.318.552/0001-06 · OAB/BA 4.217 · Av. Tancredo Neves, 1.632, sala 1.208, Caminho das Árvores · Salvador/BA · CEP 41820-020",
      "(71) 3352-4180 · contato@santana.adv.br · santana.adv.br",
    ]);
  });
});

describe("o .docx tem as 4 linhas (F3.146, PA-07, razao-social-sobras D4)", () => {
  const linhas = (x: ReturnType<typeof timbradoDoDocx>) => [x.nome, ...x.linhas.map(textoDaLinha)];

  it("sociedade completa: as 4 linhas, com o site", () => {
    const d = timbradoDoDocx(completa, { logo: false });
    expect(linhas(d)).toEqual([
      "SANTANA, LIMA E OLIVEIRA SOCIEDADE DE ADVOGADOS",
      "CNPJ 47.318.552/0001-06 · OAB/BA 4.217",
      "Av. Tancredo Neves, 1.632, sala 1.208, Caminho das Árvores, Salvador/BA, CEP 41820-020",
      "(71) 3352-4180 · contato@santana.adv.br · santana.adv.br",
    ]);
    expect(d.longa).toBe(false);
    // CNPJ, OAB, CEP, telefone, e-mail e site não quebram no meio.
    expect(d.linhas.flat().filter((p) => p.inteiro).map((p) => p.texto)).toEqual([
      "CNPJ 47.318.552/0001-06", "OAB/BA 4.217", "CEP 41820-020", "(71) 3352-4180", "contato@santana.adv.br", "santana.adv.br",
    ]);
  });

  it("com logo, a razão social diferente do nome curto fica (decisão 17)", () => {
    expect(timbradoDoDocx(completa, { logo: true }).nome).toBe("SANTANA, LIMA E OLIVEIRA SOCIEDADE DE ADVOGADOS");
  });

  it("sem sociedade: o nome completo e 'OAB · sem CNPJ', nunca o CPF", () => {
    const d = timbradoDoDocx(semSociedade, { logo: false });
    expect(linhas(d).slice(0, 2)).toEqual(["Carolina Soares Santana", "OAB/BA 63.876-S · sem CNPJ"]);
    expect(JSON.stringify(d)).not.toContain("52998224725");
  });

  it("razão social vazia: o nome curto, sem [falta]; com logo, a 1ª linha sai (o logo já diz o nome)", () => {
    const sem = timbradoDoDocx(vazia, { logo: false });
    expect(sem.nome).toBe("Santana Advocacia");
    expect(JSON.stringify(sem)).not.toMatch(/falta|confira/);
    // Sem telefone e e-mail do escritório, o primeiro contato que tem um deles, sem o site.
    expect(textoDaLinha(sem.linhas.at(-1)!)).toBe("(71) 98877-1020 · carol@santana.adv.br");
    expect(timbradoDoDocx(vazia, { logo: true }).nome).toBeNull();
  });

  it("razão igual ao nome curto: com logo sai, sem logo fica", () => {
    const igual = { ...completa, razaoSocial: "SANTANA ADVOCACIA" };
    expect(timbradoDoDocx(igual, { logo: true }).nome).toBeNull();
    expect(timbradoDoDocx(igual, { logo: false }).nome).toBe("SANTANA ADVOCACIA");
  });

  it("150 letras: a letra menor (decisão 18)", () => {
    const d = timbradoDoDocx({ ...completa, razaoSocial: RAZAO_LONGA }, { logo: true });
    expect(d.nome).toHaveLength(150);
    expect(d.longa).toBe(true);
  });

  it("sede antiga com 'confira': o texto antigo e a cidade, sem 'confira' (decisão 20)", () => {
    const antigo = { ...completa, cep: null, logradouro: null, numero: null, complemento: null, bairro: null, endereco: "Av. Tancredo Neves 1632 sl 1208 - Caminho das Arvores", enderecoConfira: true };
    const d = timbradoDoDocx(antigo, { logo: false });
    expect(textoDaLinha(d.linhas[1]!)).toBe("Av. Tancredo Neves 1632 sl 1208 - Caminho das Arvores, Salvador/BA");
    expect(JSON.stringify(d)).not.toMatch(/confira|falta/);
  });

  it("a OAB é a de Dados do escritório (decisão 21): a função não lê a marca", () => {
    const d = timbradoDoDocx({ ...completa, oab: "OAB/BA 4.217" }, { logo: false });
    expect(textoDaLinha(d.linhas[0]!)).toBe("CNPJ 47.318.552/0001-06 · OAB/BA 4.217");
  });
});

describe("razaoSocialEmBranco: o motivo da linha de aviso (F3.146, decisão 10)", () => {
  it("sociedade ou sociedade individual sem razão social: RAZAO", () => {
    expect(razaoSocialEmBranco({ tipo: "SOCIEDADE", razaoSocial: null })).toBe("RAZAO");
    expect(razaoSocialEmBranco({ tipo: "SOCIEDADE_INDIVIDUAL", razaoSocial: "" })).toBe("RAZAO");
    expect(razaoSocialEmBranco({ tipo: "SOCIEDADE", razaoSocial: "   " })).toBe("RAZAO");
  });
  it("tipo em branco e sem razão social (escritório migrado): TIPO", () => {
    expect(razaoSocialEmBranco({ tipo: null, razaoSocial: null })).toBe("TIPO");
    expect(razaoSocialEmBranco({ razaoSocial: " " })).toBe("TIPO");
  });
  it("sem sociedade ou com a razão preenchida: sem aviso", () => {
    expect(razaoSocialEmBranco({ tipo: "SEM_SOCIEDADE", razaoSocial: null })).toBeNull();
    expect(razaoSocialEmBranco({ tipo: "SOCIEDADE", razaoSocial: "SANTANA ADVOCACIA" })).toBeNull();
    expect(razaoSocialEmBranco({ tipo: null, razaoSocial: "Santana Sociedade de Advogados" })).toBeNull();
  });
});
