// O cabeçalho do .docx com as 4 linhas do timbrado (F3.146; PA-07), desenho aprovado em
// docs/design/aprovadas/razao-social-sobras (D4, decisões 15 a 22). Os 6 escritórios do elenco de
// timbrado_pdf_test.ts, com e sem logo: a proposta e o contrato padrão saem com as linhas no
// cabeçalho, sem "[falta]" nem "confira"; o PDF do contrato sai com o CNPJ inteiro; o alto do
// cabeçalho no PDF fica dentro da medida aprovada em D4 e o corpo começa abaixo do fio vinho.
import { assert, assertEquals } from "@std/assert";
import {
  abrirTexto, criarDocx, lerDocxParaPdf, lerZip, modeloPadraoDocumento, paragrafosPadraoDocumento, timbradoDoDocx,
  type EscritorioNoPapel, type LogoDocx, type ParagrafoDocx,
} from "@t3jus/domain";
import { pdfDoDocx } from "./documento_pdf.ts";

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
  "sem-advocacia": {
    ...completa, nome: "Ribeiro & Matos", razaoSocial: RAZAO_LONGA, cnpj: "41276839000134", oab: "OAB/SP 31.874", cep: "05407002",
    logradouro: "Rua Cardeal Arcoverde", numero: "1749", complemento: "sala 92", bairro: "Pinheiros", cidade: "São Paulo", uf: "SP",
    endereco: "Rua Cardeal Arcoverde, 1749, sala 92, Pinheiros", telefone: "1130517720", email: "financeiro@ribeiromatos.adv.br", whatsapp: "+5511974052210",
  },
  "razao-longa": { ...completa, razaoSocial: RAZAO_LONGA },
  "razao-longa-logo": { ...completa, razaoSocial: RAZAO_LONGA },
};

// Um PNG de 1440 × 380 (o logo largo do elenco), só o cabeçalho conta: a imagem é de 1 pixel.
const PNG = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="), (c) => c.charCodeAt(0));
const logoDe = (e: EscritorioNoPapel): LogoDocx => ({ png: PNG, largura: 1440, altura: 380, comNome: false, nome: e.nome });

const PROPOSTA: ParagrafoDocx[] = [
  { texto: "PROPOSTA DE HONORÁRIOS ADVOCATÍCIOS", estilo: "titulo" },
  { texto: "Apresentamos a proposta para o serviço abaixo." },
];
const CONTRATO = modeloPadraoDocumento("CONTRATO")!;

// O alto do cabeçalho aprovado em D4 (NOTAS.md, "A medida do cabeçalho"), com o logo de 12 mm, mais
// a folga do leiaute simples do PDF (2 mm entre o logo e as linhas e 2 mm até o fio).
const LIMITE_D4 = { semLogo: 18.5, comLogo: 31.8, longa: 26.7, longaLogo: 39.7 };
const FOLGA_PDF = 3;

for (const [nome, e] of Object.entries(ESCRITORIOS)) {
  for (const comLogo of [false, true]) {
    Deno.test(`F3.146: ${nome}${comLogo ? ", com logo" : ""}: a proposta e o contrato padrão com as linhas do timbrado`, async () => {
      const logo = comLogo ? logoDe(e) : undefined;
      const tim = timbradoDoDocx(e, { logo: comLogo });
      for (const pars of [PROPOSTA, paragrafosPadraoDocumento(CONTRATO, e)]) {
        const docx = await criarDocx(pars, tim, logo);
        const z = lerZip(docx);
        const hdr = await abrirTexto(docx, z.get("word/header1.xml")!);
        assertEquals(/falta|confira/.test(hdr), false, "nenhum [falta] nem confira no cabeçalho");
        assertEquals(hdr.match(/<w:p>/g)?.length, (tim.nome ? 1 : 0) + tim.linhas.length + (comLogo ? 1 : 0));
        assertEquals(/<w:pgMar [^>]*w:header="567"/.test(await abrirTexto(docx, z.get("word/document.xml")!)), true);

        const lido = await lerDocxParaPdf(docx);
        const texto = lido.cabecalho.map((p) => p.pedacos.map((x) => x.texto).join("")).join("\n").replace(/ /g, " ");
        if (e.cnpj) assert(texto.includes("47.318.552/0001-06") || texto.includes("41.276.839/0001-34"), "o CNPJ sai inteiro no PDF");
        if (e.tipo === "SEM_SOCIEDADE") assert(texto.includes("OAB/BA 63.876-S · sem CNPJ"));

        const { pdf, fioMm, corpoMm } = await pdfDoDocx(docx, { contrato: "C-2026-014", versao: 1, geradoEm: "2026-11-23T10:00:00-03:00" });
        assertEquals(new TextDecoder().decode(pdf.slice(0, 5)), "%PDF-");
        assert(fioMm !== null);
        assert(corpoMm > fioMm!, "o corpo começa abaixo do fio vinho");
        const longa = !!tim.nome && tim.longa;
        const limite = comLogo ? (longa ? LIMITE_D4.longaLogo : LIMITE_D4.comLogo) : longa ? LIMITE_D4.longa : LIMITE_D4.semLogo;
        const alto = fioMm! - 10;
        assert(alto <= limite + FOLGA_PDF, `o cabeçalho tem ${alto.toFixed(1)} mm, acima dos ${limite} mm aprovados`);
      }
    });
  }
}
