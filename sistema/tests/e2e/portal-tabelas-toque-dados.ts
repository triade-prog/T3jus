// Dados dos testes de toque (F3.165) que o portal-tabelas-telas.json não tem: a ficha do cliente (as 3 tabelas
// fl-tab: Propostas, Contratos e Casos) e a Agenda do celular. Vieram da medição do plano aprovado
// (docs/design/aprovadas/portal-tabelas-toque/).
import { h } from "./console-dados.ts";

const ESC = "e0000000-0000-4000-8000-0000000000a1";
export const cid = (n: number) => `c1000000-0000-4000-8000-0000000002${String(n).padStart(2, "0")}`;
export const MARINA = { id: "a0000000-0000-4000-8000-000000000101", nome: "Marina Ribeiro" };
const DIEGO = { id: "a0000000-0000-4000-8000-000000000103", nome: "Diego Almeida" };
export const LARISSA = { id: "a0000000-0000-4000-8000-000000000105", nome: "Larissa Costa" };
const CT = "b2000000-0000-4000-8000-000000000031";
const PR = "b1000000-0000-4000-8000-000000000014";

export const ESCRITORIO = {
  id: ESC, nome: "Ribeiro & Matos", pessoa: "Marina Ribeiro", dono: true, areas: ["COMERCIAL", "CONTRATOS", "FINANCEIRO", "JURIDICO"],
  socios: ["Marina Ribeiro"], pessoas: 5, outrosEscritorios: 0, funcoes: ["SOCIO"], cnpj: null, cidade: "São Paulo", uf: "SP", endereco: null,
  contatos: [], ultimaExportacao: null,
};

export const dia = (n: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(Date.now() + n * 864e5));

export const FICHA = {
  id: cid(1), tipo: "PF", nome: "Antônia Ferreira Prado", documento: "52998224725", nacionalidade: "brasileira", estadoCivil: "VIUVO", profissao: "Aposentada",
  rg: "12.345.678-9", rgOrgao: "SSP/SP", cep: "04117030", endereco: "Rua das Acácias, 418", bairro: "Vila Mariana", cidade: "São Paulo", uf: "SP",
  repNome: null, repCargo: null, repDocumento: null, repEstadoCivil: null, repProfissao: null, situacao: "ATIVO", inativadoEm: null,
  motivoInativacao: null, inativadoPor: null, criadoEm: h(24 * 22), criadoPor: MARINA, versao: 3, comercial: true, podeInativar: true, faltando: [],
  alterado: null, contatos: [{ id: "d0000000-0000-4000-8000-000000000201", nome: "Antônia Ferreira Prado", papel: null, telefone: "+5511987654321", email: null, principal: true }],
  origem: "GOOGLE", origemIndicacao: null, atendimentos: 4, primeiroAtendimento: null,
  proxContato: { em: dia(2), oque: "Confirmar a assinatura", vencido: false, responsavel: DIEGO },
  passo: { tipo: "CONTRATO_ELABORACAO", area: "CONTRATOS", pode: true, quemPode: null, item: { id: CT, numero: "C-2026-031", objeto: "Pensão por morte", versao: 2, criadoEm: h(48) } },
  contagens: { propostas: 2, contratos: 1, casos: 0 },
  noEscritorio: {
    proposta: { id: PR, numero: "P-2026-014", situacao: "ACEITA", servico: "Pensão por morte", em: h(24 * 10) },
    contrato: { id: CT, numero: "C-2026-031", situacao: "ELABORACAO", objeto: "Pensão por morte", assinadoEm: null },
  },
};

export const CONTRATOS = [{
  id: CT, numero: "C-2026-031", objeto: "Pensão por morte", situacao: "ELABORACAO", cliente: { id: cid(1), nome: "Antônia Ferreira Prado", tipo: "PF" },
  responsavel: LARISSA, condicoes: [{ tipo: "FIXO", valor: 150000, vencimento: dia(10) }], proximo: null, basePendente: null, criadoEm: h(48),
  assinadoEm: null, semCaso: false, area: "PREVIDENCIARIO", proposta: { id: PR, numero: "P-2026-014" }, caso: null,
}];

// Agenda: dois compromissos de hoje, para medir o cartão e os dias do mês no celular.
const em = (n: number, hora: string) => `${dia(n)}T${hora}:00-03:00`;
const comp = (n: number, x: Record<string, unknown>) => ({
  id: `b1000000-0000-4000-8000-0000000001${String(n).padStart(2, "0")}`, tipo: "CLIENTE", tipoEscrito: null, titulo: "Reunião com cliente",
  inicio: em(0, "14:30"), fim: em(0, "15:30"), modalidade: "PRESENCIAL", local: "Escritório", situacao: "MARCADO", lembrete: false,
  responsavel: LARISSA, tambemVai: [], cliente: null, ...x,
});
export const AGENDA = {
  juridico: true, algum: true, feriados: [], prazos: [], tiposEscritos: [],
  compromissos: [comp(4, {}), comp(2, { tipo: "INTERNO", titulo: "Reunião de sócios", inicio: em(0, "16:00"), fim: em(0, "17:00") })],
};
