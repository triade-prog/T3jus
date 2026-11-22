// Faturas de exemplo para os testes do PDF da cobrança (F1.21): os estados do desenho aprovado
// em docs/design/aprovadas/cobranca-pdfs, com dados fictícios.
import type { DocumentoCarne, DocumentoCobranca } from "./cobranca_pdf.ts";

export const EMISSOR = { razaoSocial: "T3jus Tecnologia Ltda", cnpj: "11222333000181", endereco: "Rua do Bom Jesus, 10", cidade: "Recife", uf: "PE",
  contato: "atendimento@t3jus.pro", remetente: "cobranca@t3jus.pro" };
export const PIX = "00020126840014br.gov.bcb.pix0136a1b2c3d4-0000-0000-0000-t3jus0222Fatura 2026/0187 T3jus5204000053039865406431.005802BR5913T3JUS6006RECIFE62070503***6304ABCD";

export const BASE: DocumentoCobranca = {
  id: "f1", numero: 187, competencia: "2026-12-01", vencimento: "2026-12-10", plano: "Escritório", forma: "BOLETO", totalCentavos: 43100,
  situacao: "A_VENCER", atrasoDias: null, emitidaEm: "2026-11-18T12:00:00Z", pessoasAtivas: 9, pessoasIncluidas: 8, hoje: "2026-11-22",
  emissor: null,
  pagador: { nome: "Cedro & Lima Advocacia", cnpj: "22914870000109", email: "financeiro@cedrolima.exemplo.com.br", socio: "Renata Lima",
    endereco: { cep: "50050000", logradouro: "Rua da Aurora", numero: "295", complemento: "sala 1102", bairro: "Boa Vista", cidade: "Recife", uf: "PE" } },
  itens: [
    { tipo: "MENSALIDADE", descricao: "Mensalidade do plano Escritório", quantidade: 1, valorUnitarioCentavos: 49000, valorCentavos: 49000 },
    { tipo: "PESSOA_A_MAIS", descricao: "Pessoa a mais", quantidade: 1, valorUnitarioCentavos: 3900, valorCentavos: 3900 },
    { tipo: "DESCONTO", descricao: "Desconto de 20% na mensalidade", quantidade: 1, valorUnitarioCentavos: -9800, valorCentavos: -9800 },
  ],
  motivoDesconto: "Combinado na proposta de 30/10/2026: desconto de implantação nos 3 primeiros meses.",
  codigos: { provedor: null, pixCopiaCola: null, linhaBoleto: null, codigoBarras: null },
  pagamento: null, canceladaEm: null, outrasAbertas: [], carne: null,
};

export const ESTADOS: Record<string, DocumentoCobranca> = {
  "sem-codigos": BASE,
  padrao: { ...BASE, emissor: EMISSOR, codigos: { provedor: "inter", pixCopiaCola: PIX, linhaBoleto: "07790.00009 00000.000000 20260.187016 4 16560000043100", codigoBarras: "07794165600000431000000900000000002026018701" } },
  "sem-endereco": { ...BASE, emissor: EMISSOR, pagador: { ...BASE.pagador, endereco: null }, codigos: { provedor: "inter", pixCopiaCola: PIX, linhaBoleto: null, codigoBarras: null } },
  atraso: { ...BASE, vencimento: "2026-10-12", situacao: "EM_ATRASO", atrasoDias: 41, outrasAbertas: [{ numero: 201, competencia: "2026-11-01", vencimento: "2026-11-10", totalCentavos: 19000 }] },
  paga: { ...BASE, situacao: "PAGA", codigos: null, pagamento: { pagaEm: "2026-11-20", forma: "PIX", baixa: "MANUAL", registradoEm: "2026-11-20T18:02:00Z", registradoPor: "Carol Andrade" } },
  cancelada: { ...BASE, situacao: "CANCELADA", codigos: null, canceladaEm: "2026-11-20T15:00:00Z" },
  carne: { ...BASE, emissor: EMISSOR, carne: { numero: "2026/2027", parcela: 3, de: 12, geradoEm: "2026-09-15T12:00:00Z" } },
};

const meses = (n: number) => { const d = new Date(Date.UTC(2026, 9 + n, 1)); return d.toISOString().slice(0, 10); };
const venc = (n: number) => `${meses(n).slice(0, 8)}05`;
const pixDe = (n: number) => `00020126900014br.gov.bcb.pix0136a1b2c3d4-0000-t3jus0228Carne 2026/2027 parcela ${n}/125204000053039865406490.005802BR5913T3JUS6006RECIFE62070503***6304AB${String(n).padStart(2, "0")}`;
const PARCELAS: DocumentoCarne["itens"] = Array.from({ length: 12 }, (_, i) => ({
  numero: i + 1, competencia: meses(i), vencimento: venc(i), valorCentavos: 49000, situacao: "A_VENCER" as const, emAtraso: false,
  pagaEm: null, formaPaga: null, canceladaEm: null,
  codigos: { pixCopiaCola: pixDe(i + 1), linhaBoleto: `07790.00009 00000.000208 26202.7000${String(i + 1).padStart(2, "0")}4 8 1590000004900${i % 10}`,
    codigoBarras: `0779${String(1590 + i)}0000049000000900000000208262027000${String(i + 1).padStart(2, "0")}`.slice(0, 44) },
}));

export const CARNE: DocumentoCarne = {
  id: "c1", numero: "2026/2027", parcelas: 12, valorParcelaCentavos: 49000, diaVencimento: 5, primeiraCompetencia: "2026-10-01",
  ultimaCompetencia: "2027-09-01", geradoEm: "2026-09-15T12:00:00Z", hoje: "2026-11-20", emissor: EMISSOR, plano: "Escritório",
  pagador: { nome: "Pequi Advocacia", cnpj: "40721536000110", email: "financeiro@pequi.exemplo.com.br" }, substituto: null, itens: PARCELAS,
};
const pagas = (ps: DocumentoCarne["itens"]) => ps.map((p) => p.numero === 1 ? { ...p, situacao: "PAGA" as const, pagaEm: "2026-10-02", formaPaga: "PIX", codigos: null }
  : p.numero === 2 ? { ...p, situacao: "PAGA" as const, pagaEm: "2026-11-04", formaPaga: "BOLETO", codigos: null } : p);

export const CARNES: Record<string, DocumentoCarne> = {
  padrao: CARNE,
  hoje: { ...CARNE, itens: pagas(PARCELAS) },
  trocado: { ...CARNE, substituto: { numero: "2027", primeiraCompetencia: "2027-01-01", ultimaCompetencia: "2027-12-01", valorParcelaCentavos: 52900 },
    itens: pagas(PARCELAS).map((p) => p.numero >= 4 ? { ...p, situacao: "CANCELADA" as const, canceladaEm: "2026-11-20T15:00:00Z", codigos: null } : p) },
  "sem-codigos": { ...CARNE, emissor: null, itens: PARCELAS.map((p) => ({ ...p, codigos: { pixCopiaCola: null, linhaBoleto: null, codigoBarras: null } })) },
};
