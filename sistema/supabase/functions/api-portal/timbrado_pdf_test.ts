// O timbrado no PDF do carnê e do recibo gerados no servidor (F3.133; PA-07, FI-23, FI-14), desenho
// aprovado em docs/design/aprovadas/carne-recibo-razao-social. Os 6 escritórios do elenco, com a
// parcela vencida, sem Pix e 1 por folha: nada passa da faixa (folga de 1 mm ou mais, decisão 14);
// CNPJ, OAB, CEP e telefone não quebram no meio; o recibo continua em 1 página.
import { assert, assertEquals } from "@std/assert";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { brCodePix, type CarneParaImprimir, type EscritorioNoPapel, type ReciboParaImprimir } from "@t3jus/domain";
import { folgasDoCarne, linhasCorridas, MM, pdfDoCarne } from "./carne_pdf.ts";
import { folgasDoRecibo, pdfDoRecibo } from "./recibo_pdf.ts";

const RAZAO_LONGA = "SANTANA, LIMA, OLIVEIRA, ALBUQUERQUE CAVALCANTI, VASCONCELOS FIGUEIREDO, MENEZES, ANDRADE, "
  + "QUEIROZ MONTEIRO E BITTENCOURT PRADO SOCIEDADE DE ADVOGADOS";

const completa: EscritorioNoPapel = {
  comTimbrado: true, nome: "Santana Advocacia", tipo: "SOCIEDADE", razaoSocial: "SANTANA, LIMA E OLIVEIRA SOCIEDADE DE ADVOGADOS",
  cnpj: "47318552000106", oab: "OAB/BA 4.217", cep: "41820020", logradouro: "Av. Tancredo Neves", numero: "1.632", complemento: "sala 1.208",
  bairro: "Caminho das Árvores", cidade: "Salvador", uf: "BA", endereco: "Av. Tancredo Neves, 1.632, sala 1.208, Caminho das Árvores",
  enderecoConfira: false, telefone: "7133524180", email: "contato@santana.adv.br", site: "santana.adv.br", contatos: [], whatsapp: "+5571991874402", dona: null,
};
const ESCRITORIOS: Record<string, EscritorioNoPapel> = {
  completa,
  "sem-sociedade": {
    ...completa, nome: "Carol Santana Advocacia", tipo: "SEM_SOCIEDADE", razaoSocial: null, cnpj: null, oab: null, email: "carolina@santana.adv.br", site: null,
    dona: { nome: "Carolina Soares Santana", dados: { nomeCompleto: "Carolina Soares Santana" }, inscricoes: [{ texto: "OAB/BA 63.876-S", tipo: "PRINCIPAL" }] },
  },
  "razao-vazia": { ...completa, razaoSocial: null, oab: null, telefone: null, email: null, site: null, contatos: [{ telefone: "+5571988771020", email: "carol@santana.adv.br" }] },
  // Nome curto sem "Advocacia": a marca ganha a linha "ADVOCACIA" embaixo (decisão 4).
  "sem-advocacia": {
    ...completa, nome: "Ribeiro & Matos", razaoSocial: RAZAO_LONGA, cnpj: "41276839000134", oab: "OAB/SP 31.874", cep: "05407002",
    logradouro: "Rua Cardeal Arcoverde", numero: "1749", complemento: "sala 92", bairro: "Pinheiros", cidade: "São Paulo", uf: "SP",
    endereco: "Rua Cardeal Arcoverde, 1749, sala 92, Pinheiros", telefone: "1130517720", email: "financeiro@ribeiromatos.adv.br", whatsapp: "+5511974052210",
  },
  "razao-longa": { ...completa, razaoSocial: RAZAO_LONGA },
  "razao-longa-logo": { ...completa, razaoSocial: RAZAO_LONGA },
};
const MARCA_LOGO = { tipo: "LOGO" as const, logoId: "10900000-0000-4000-8000-000000000001", largura: 1440, altura: 380, jeito: "SO_LOGO" as const, cor: "ARQUIVO" as const, oab: "OAB/BA 4.217" };

function carne(e: EscritorioNoPapel, o: { vencida?: boolean; pix?: boolean; formato?: "TRES" | "UM"; logo?: boolean } = {}): CarneParaImprimir {
  const pix = o.pix === false ? null : { tipo: "CNPJ" as const, chave: "47318552000106", recebedor: "SANTANA LIMA OLIVEIRA ADV", cidade: "SALVADOR" };
  return {
    id: "c4000000-0000-4000-8000-000000000133", formato: o.formato ?? "TRES", capa: (o.formato ?? "TRES") === "TRES", geradoEm: "2026-11-22T15:32:00-03:00",
    marca: o.logo ? MARCA_LOGO : null, escritorio: e,
    cliente: { nome: "HÉLIO BATISTA CORRÊA DE ALBUQUERQUE MONTENEGRO", documento: "***.982.247-**", tipo: "PF" },
    contrato: { id: "f1000000-0000-4000-8000-000000000014", numero: "C-2026-014", objeto: "Ação revisional de contrato bancário com pedido de tutela" },
    pix, instrucoes: o.pix === false ? "Transferência para o Banco do Brasil, agência 1234-5, conta 98765-0, em nome do escritório." : null,
    parcelas: [1, 2, 3, 4, 5].map((n) => {
      const p = { descricao: `Parcela ${n} de 6`, ordem: n, total: 6, vencimento: `2026-${String(9 + n).padStart(2, "0")}-25`, valor: 85000,
        semValor: !!o.vencida && n === 1, txid: `C2026014P0${n}` };
      return { ...p, pix: pix ? brCodePix({ chave: pix.chave, recebedor: pix.recebedor, cidade: pix.cidade, valor: p.semValor ? null : p.valor, txid: p.txid, info: `Parcela ${n}/6 C-2026-014` }) : null };
    }),
    mudancas: [],
  };
}

for (const [nome, e] of Object.entries(ESCRITORIOS)) {
  const logo = nome.endsWith("-logo");
  for (const [caso, o] of [["vencida", { vencida: true }], ["sem Pix", { pix: false, vencida: true }], ["1 por folha", { formato: "UM", vencida: true }]] as const) {
    Deno.test(`F3.133: carnê ${nome}, ${caso}: cada via, canhoto e capa com 1 mm de folga ou mais`, async () => {
      const c = carne(e, { ...o, logo });
      const pdf = await pdfDoCarne(c);
      assertEquals(new TextDecoder().decode(pdf.slice(0, 5)), "%PDF-");
      const folgas = await folgasDoCarne(c);
      assert(folgas.length > 0);
      const aperto = folgas.filter((f) => f.mm < 1);
      assertEquals(aperto, [], `passa da faixa: ${JSON.stringify(aperto)}`);
    });
  }
}

Deno.test("F3.133: CNPJ, OAB e CEP não quebram no meio, nem com a razão social de 150 letras", async () => {
  const doc = await PDFDocument.create();
  const r = await doc.embedFont(StandardFonts.Helvetica), b = await doc.embedFont(StandardFonts.HelveticaBold);
  for (const largura of [40, 60, 98, 120]) {
    const linhas = linhasCorridas([
      { texto: RAZAO_LONGA, forte: true }, { texto: " · " }, { texto: "CNPJ 47.318.552/0001-06", inteiro: true }, { texto: " · " },
      { texto: "OAB/BA 4.217", inteiro: true }, { texto: " · " }, { texto: "Av. Tancredo Neves, 1.632, Salvador/BA, " }, { texto: "CEP 41820-020", inteiro: true },
    ], r, b, 6, largura * MM);
    const palavras = linhas.flatMap((l) => l.palavras.map((p) => p.s));
    assert(palavras.includes("CNPJ 47.318.552/0001-06") && palavras.includes("OAB/BA 4.217") && palavras.includes("CEP 41820-020"));
    for (const l of linhas) {
      const ultima = l.palavras.at(-1)!.s;
      assert(!["CNPJ", "OAB/BA", "CEP"].includes(ultima), `a linha termina em "${ultima}"`);
    }
  }
});

function recibo(e: EscritorioNoPapel, logo = false): ReciboParaImprimir {
  return {
    numero: { ano: 2026, numero: 187 }, marca: logo ? MARCA_LOGO : null, escritorio: e,
    cliente: { id: "c22", nome: "Hélio Batista Corrêa", tipo: "PF", documento: "52998224725" },
    pagador: { tipo: "OUTRO", nome: "Marta Corrêa de Albuquerque Montenegro", documento: "31848261713", papel: "Esposa" },
    contrato: { id: "f1000000-0000-4000-8000-000000000014", numero: "C-2026-014", objeto: "Ação revisional de contrato bancário com pedido de tutela" },
    parcela: { id: "b1", descricao: "Parcela 3 de 6", vencimento: "2026-11-10", ordem: 3, total: 6 },
    valor: 85000, multaJuros: 2380, forma: "PIX", pagoEm: "2026-11-18", registradoPor: { nome: "Carol Santana", oab: "OAB/BA 63.876-S" },
    registradoEm: "2026-11-18T15:20:00-03:00", pagamentoId: "a9000000-0000-4000-8000-000000000041",
    reembolsos: [{ descricao: "Custas iniciais", valor: 32000, forma: "PIX", adiantadoEm: "2026-10-02", caso: "Hélio x Banco" }],
  };
}

for (const [nome, e] of Object.entries(ESCRITORIOS)) {
  Deno.test(`F3.133: recibo ${nome} com o timbrado continua em 1 página A4`, async () => {
    const pdf = await pdfDoRecibo(recibo(e, nome.endsWith("-logo")));
    const doc = await PDFDocument.load(pdf);
    assertEquals(doc.getPageCount(), 1);
    // O pior caso: quem pagou, multa e juros e um reembolso. Nada fica por cima do local e da data nem do pé.
    const f = await folgasDoRecibo(recibo(e, nome.endsWith("-logo")));
    assert(f.dados >= 1 && f.assinatura >= 1, JSON.stringify(f));
    // O autor é quem assina: a razão social, ou a sócia dona sem sociedade.
    assertEquals(doc.getAuthor(), nome === "sem-sociedade" ? "Carolina Soares Santana" : nome === "razao-vazia" ? "Santana Advocacia"
      : (e.razaoSocial ?? "").replace(/\s+/g, " "));
  });
}

Deno.test("F3.133: carnê e recibo antigos, sem o timbrado, saem como antes (o autor é o nome curto)", async () => {
  const antigo = { nome: "Ribeiro & Matos", cnpj: "41276839000134", endereco: "Rua Augusta, 1200", cidade: "São Paulo", uf: "SP", whatsapp: null, oab: "OAB/SP 31.874" };
  assertEquals((await PDFDocument.load(await pdfDoCarne(carne(antigo)))).getAuthor(), "Ribeiro & Matos");
  assertEquals((await PDFDocument.load(await pdfDoRecibo(recibo({ ...antigo, contatos: [] })))).getAuthor(), "Ribeiro & Matos");
  const folgas = await folgasDoCarne(carne(antigo, { vencida: true }));
  assertEquals(folgas.filter((f) => f.mm < 1), []);
});
