// F0.6 e F0.3 no Portal do advogado: quem tem vínculo entra; o escritório vem da sessão.
import { assert, assertEquals, assertMatch } from "@std/assert";
import { criarApiPortal } from "./app.ts";
import type { Cerebro } from "../_shared/ia.ts";
import type { Emails, MensagemEmail } from "../_shared/email.ts";
import { abrirEntrada, CAMPOS_DOCUMENTO, CAMPOS_PETICAO, abrirTexto, comprimirJson, conferirDocx, criarDocx, lerZip, paragrafosDocx, type ContextoIa, type DadosDocumentos, type DadosPeticao } from "@t3jus/domain";
import { adminFalso, arquivosFalsos, authFalso, bancoFalso, CODIGO_CERTO, cookieChamado, cookieDe, erro, erroBanco, limitesFalsos, pedido, TOKEN_CONVITE, TOKEN_LINK, TOKEN_RECUPERACAO } from "../_shared/teste_util.ts";

const ANA = "2d9e5b2a-7f3c-4e4d-9a0b-3c4d5e6f7a8b";
const AURORA = "3e0f6c3b-8a4d-4f5e-8b1c-4d5e6f7a8b9c";
const BELA_VISTA = "4f1a7d4c-9b5e-4a6f-9c2d-5e6f7a8b9c0d";
const LARA = "5a2b8e5d-0c6f-4b7a-8d3e-6f7a8b9c0d1e";
const VL_LARA = "6b3c9f6e-1d7a-4c8b-9e4f-7a8b9c0d1e2f";
const CLIENTE = "7c4d0a7f-2e8b-4d9c-8f5a-8b9c0d1e2f3a";
const ANEXO_NOTA = "1a2b3c4d-0000-4000-8000-00000000a001";
const ANEXO_SUMIU = "1a2b3c4d-0000-4000-8000-00000000a002";
const ENTRAR = { email: "ana@exemplo.invalid", senha: "senha-da-socia" };
const PETICAO = "8d5e1b8a-3f9c-4e0d-9a6b-9c0d1e2f3a4b";
const TERMO = "a1180000-0000-4000-8000-000000000001";
const VERSAO_PET = "9e6f2c9b-4a0d-4f1e-8b7c-0d1e2f3a4b5c";
const OAB_ANA = "0f7a3d0c-5b1e-4a2f-9c8d-1e2f3a4b5c6d";
const DADOS_PETICAO: DadosPeticao = {
  caso: { id: CLIENTE, nome: "Pereira x Mercado", area: "TRABALHISTA", numero: null, vara: "45ª Vara do Trabalho de São Paulo", tribunal: null, sistema: null,
    parteContraria: "Mercado Bom Preço Ltda.", parteContrariaQualificacao: null, valorCausa: 8640000, responsavel: { id: ANA, nome: "Ana" } },
  clientes: [{ id: CLIENTE, nome: "Joana Pereira", tipo: "PF", papel: "AUTOR", documento: "52998224725", nacionalidade: "Brasileira", estadoCivil: "SOLTEIRO",
    profissao: "Costureira", rg: null, rgOrgao: null, endereco: "Rua Itapura, 77", bairro: "Tatuapé", cidade: "São Paulo", uf: "SP", cep: "03310000", repNome: null, repCargo: null }],
  advogados: [{ pessoaId: ANA, nome: "Ana Ribeiro", responsavel: true, socioDono: true,
    inscricoes: [{ id: OAB_ANA, uf: "SP", numero: "214538", letra: null, tipo: "PRINCIPAL", versao: 1, texto: "OAB/SP 214.538", documento: "OAB/SP nº 214.538" }] }],
  semOab: [], escritorio: { nome: "Aurora Advocacia", endereco: "Av. Paulista, 2.100", cidade: "São Paulo", uf: "SP" }, hoje: "2026-11-20",
  revisor: null, semRevisao: "RESPONSAVEL",
};
const PEDIDO_PETICAO = {
  modelo: { padrao: "JUNTADA" }, partes: [CLIENTE], advogados: [{ pessoaId: ANA, inscricoes: [OAB_ANA] }],
  enderecamento: "Excelentíssimo(a) Senhor(a) Juiz(íza) da 45ª Vara do Trabalho de São Paulo", cidadeData: "São Paulo, 20 de novembro de 2026",
};

// F3.16: o contrato de Benedito, sem RG, com Ana outorgada (como o desenho aprovado).
const MODELO_DOC = "a1600000-0000-4000-8000-000000000001";
const VERSAO_MODELO_DOC = "a1600000-0000-4000-8000-000000000002";
const GERACAO_DOC = "a1600000-0000-4000-8000-000000000003";
const DADOS_DOCUMENTOS: DadosDocumentos = {
  contrato: { id: CLIENTE, numero: "C-2026-033", objeto: "Aposentadoria por idade", estado: "ELABORACAO", assinadoEm: null, versao: 1 },
  cliente: { id: CLIENTE, nome: "Benedito Souza Lima", tipo: "PF", documento: "52998224725", nacionalidade: "brasileiro", estadoCivil: "CASADO", profissao: "aposentado",
    rg: null, rgOrgao: null, endereco: "Rua das Flores, 120", bairro: "Centro", cidade: "Campinas", uf: "SP", cep: "13010000",
    repNome: null, repCargo: null, repDocumento: null, repEstadoCivil: null, repProfissao: null, versao: 1 },
  condicoes: [{ tipo: "FIXO", valor: 300000, vencimento: "2026-12-10" }],
  casos: [],
  advogados: [{ pessoaId: ANA, nome: "Ana Ribeiro", noContrato: true, responsavel: true, escolhidas: [OAB_ANA],
    inscricoes: [{ id: OAB_ANA, uf: "SP", numero: "214538", letra: null, tipo: "PRINCIPAL", versao: 1, texto: "OAB/SP 214.538", documento: "OAB/SP nº 214.538" }] }],
  semOab: [],
  escritorio: { nome: "Aurora Advocacia", cnpj: "11222333000181", endereco: "Av. Paulista, 2.100", cidade: "São Paulo", uf: "SP", oab: "OAB/SP 31.874" },
  marca: null, hoje: "2026-11-21", modelos: [], atuais: [], ultima: null, mudancas: [], poderesIniciais: [],
};
const PEDIDO_DOCUMENTOS = {
  documentos: [{ tipo: "CONTRATO" }, { tipo: "PROCURACAO" }], outorgados: [{ pessoaId: ANA, inscricoes: [OAB_ANA] }],
  poderes: ["RECEBER_QUITAR"], outroPoder: null, cidadeData: "São Paulo, 21 de novembro de 2026",
};
const NOMES_DOC: Record<string, string> = { CONTRATO: "Contrato de honorários", PROCURACAO: "Procuração", HIPOSSUFICIENCIA: "Declaração de hipossuficiência (pessoa física)" };

const LOGO_TESTE = "10600000-0000-4000-8000-000000000001";

// O recibo como o banco devolve (F3.19, F3.93), com o reembolso pago junto (F3.95).
const RECIBO_TESTE = {
  numero: { ano: 2026, numero: 187 },
  escritorio: { nome: "Aurora Advocacia", cnpj: "11222333000181", endereco: "Rua A, 1", cidade: "Salvador", uf: "BA", contatos: [], whatsapp: null },
  cliente: { id: "c1", nome: "Hélio Batista Corrêa", tipo: "PF", documento: "31848261713" }, pagador: null,
  contrato: { id: "k1", numero: "C-2026-014", objeto: "Ação revisional" },
  parcela: { id: "p1", descricao: "Parcela 3 de 6", vencimento: "2026-10-25", ordem: 3, total: 6 },
  valor: 85000, multaJuros: null, forma: "PIX", pagoEm: "2026-10-15",
  registradoPor: { nome: "Ana", oab: null }, registradoEm: "2026-10-15T15:00:00Z", pagamentoId: "x",
  reembolsos: [{ descricao: "Custas", valor: 12000, forma: "PIX", adiantadoEm: "2026-10-01", caso: null }],
};

function montar(opcoes: { comAutenticador?: boolean; vazadas?: string[]; naoDono?: boolean; semComercial?: boolean; soConsulta?: boolean; ia?: Cerebro | null;
  emails?: Emails; comprovantes?: boolean; recibos?: boolean; logo?: boolean } = {}) {
  const { admin, enviados, contas } = adminFalso({ "lara@aurora.adv.br": LARA });
  const vinculos = new Set([AURORA]);
  const sessoes = new Map<string, string>();
  const falso = authFalso([
    { id: ANA, email: ENTRAR.email, senha: ENTRAR.senha, fatores: opcoes.comAutenticador ? [{ id: crypto.randomUUID(), verificado: true }] : [] },
  ]);
  const db = bancoFalso({
    acesso_portal: (a) => a.p_pessoa === ANA && vinculos.size > 0,
    registrar_acesso: () => 1,
    portal_recebimento: () => ({ dono: true, versao: 0, pixTipo: null, pixChave: null }),
    portal_carne_envio: () => ({
      cliente: { nome: "Hélio Batista Corrêa" }, para: { nome: "Marta Corrêa", papel: "esposa", telefone: "+5511981143059" }, titular: null,
      escritorio: "Aurora Advocacia", ultimaDoCliente: null, bloqueio: "WHATSAPP_NAO_LIGADO", envios: [],
    }),
    portal_carne_enviar: () => ({ envios: [{ id: "e1", para: "Marta Corrêa", telefone: "+5511981143059", em: "2026-11-21T18:00:00-03:00", por: null, envio: "NA_FILA" }] }),
    portal_recebimento_pedir: () => ({ para: { id: "d0000000-0000-4000-8000-000000000001", nome: "Marina Ribeiro" }, jaPedido: false }),
    portal_recebimento_salvar: (a) => ({ versao: Number((a.p_dados as { versao: number }).versao) + 1, desatualizados: 0 }),
    portal_carne_opcoes: (a) => ({ contrato: { id: a.p_contrato }, area: a.p_area, parcelas: [], carnes: [] }),
    portal_carne_gerar: () => ({ id: CLIENTE, parcelas: 2 }),
    portal_carne: () => ({
      id: CLIENTE, formato: "TRES", capa: true, geradoEm: "2026-11-20T15:00:00-03:00",
      escritorio: { nome: "Aurora Advocacia", cnpj: "11222333000181", endereco: null, cidade: "São Paulo", uf: "SP", whatsapp: null },
      cliente: { nome: "Hélio Batista Corrêa", documento: "52998224725", tipo: "PF" }, contrato: { numero: "C-2026-014", objeto: "Ação revisional" },
      pix: { tipo: "CNPJ", chave: "11222333000181", recebedor: "AURORA ADVOCACIA", cidade: "SAO PAULO" }, instrucoes: null,
      parcelas: [
        { descricao: "Parcela 3/6", ordem: 3, total: 6, vencimento: "2026-10-25", valor: 85000, semValor: true, txid: "C2026014P03" },
        { descricao: "Parcela 4/6", ordem: 4, total: 6, vencimento: "2026-11-25", valor: 85000, semValor: false, txid: "C2026014P04" },
      ],
      mudancas: [],
    }),
    meus_escritorios: () => [...vinculos].map((id) => ({ escritorio_id: id, nome: id === AURORA ? "Aurora Advocacia" : "Bela Vista Advogados", funcoes: ["SOCIO"] })),
    escolher_escritorio: (a) => {
      if (!vinculos.has(String(a.p_escritorio))) erroBanco("TC401");
      sessoes.set(String(a.p_sessao), String(a.p_escritorio));
      return null;
    },
    escritorio_da_sessao: (a) => {
      const c = sessoes.get(String(a.p_sessao));
      return c && vinculos.has(c) ? c : null;
    },
    portal_financeiro_envio_preparar: (a) => ({ exportacaoId: a.p_exportacao, mes: "2026-10-01", formato: "XLSX", para: "contato@exemplo.com.br",
      contador: "Paulo Serra", firma: null, escritorio: "Aurora Advocacia", quem: "Ana", responderPara: "ana@aurora.adv.br" }),
    portal_financeiro_envio_registrar: (a) => ({ para: "contato@exemplo.com.br", situacao: a.p_situacao, em: "2026-11-18T10:00:00-03:00", por: null }),
    portal_financeiro_ajustes_salvar: (a) => ({ dados: a.p_dados }),
    portal_financeiro_meta: (a) => ({ dados: a.p_dados }),
    portal_financeiro_meta_tirar: (a) => ({ dados: a.p_dados }),
    portal_financeiro_pasta_preparar: (a) => ({
      exportacaoId: a.p_exportacao, mes: "2026-10-01", formato: "XLSX", pasta: null,
      anexos: opcoes.comprovantes ? [
        { id: ANEXO_NOTA, nome: "nota.pdf", tipo: "application/pdf", tamanho: 9, categoria: "NOTA_FISCAL", dia: "2026-10-05", lancamento: "Aluguel da sala" },
        { id: ANEXO_SUMIU, nome: "guia.pdf", tipo: "application/pdf", tamanho: 9, categoria: "GUIA", dia: "2026-10-06", lancamento: "DAS" },
      ] : [],
      recibos: opcoes.recibos ? [RECIBO_TESTE] : [],
    }),
    portal_financeiro_pasta_registrar: (a) => {
      const partes = a.p_partes as { caminho: string; nome: string; tamanho: number; arquivos: number }[];
      return { id: "pasta-1", partes, arquivos: partes.reduce((s, x) => s + x.arquivos, 0), tamanho: partes.reduce((s, x) => s + x.tamanho, 0), em: "2026-11-18T10:00:00-03:00", por: null };
    },
    exportar_escritorio: (a) => {
      if (!vinculos.has(String(a.p_escritorio))) erroBanco("TC401");
      return { formato: "t3jus.exportacao.v1", geradoEm: "2026-11-18T10:00:00-03:00", escritorio: { id: a.p_escritorio }, pessoas: [], tabelas: {} };
    },
    escritorios_para_escolher: () => [
      { escritorio_id: BELA_VISTA, nome: "Bela Vista Advogados", cidade: "Salvador", uf: "BA", ultima_entrada: "2026-11-18T09:12:00-03:00" },
      { escritorio_id: AURORA, nome: "Aurora Advocacia", cidade: null, uf: null, ultima_entrada: null },
    ],
    dados_convite: () => ({ nome: "Ana", escritorio: "Aurora Advocacia", quem: "Ricardo Almeida", papel: "ESCRITORIO" }),
    aceitar_convite: () => null,
    portal_cobranca: () => ({ soConsultaDesde: null, socioDono: "Ricardo Almeida", veFaturas: true, atraso: null }),
    portal_escritorio: (a) => {
      if (!vinculos.has(String(a.p_escritorio))) erroBanco("TC401");
      return { id: a.p_escritorio, nome: "Aurora Advocacia", dono: true, areas: ["COMERCIAL", "CONTRATOS", "FINANCEIRO", "JURIDICO"] };
    },
    portal_equipe: (a) => {
      if (opcoes.naoDono) erroBanco("TC401");
      return [{ vinculoId: VL_LARA, pessoaId: LARA, nome: "Lara", dono: false, areas: ["JURIDICO"], desde: "2026-11-18", versao: 1, senhaCriadaEm: null, conviteEnviadoEm: "2026-11-18", escritorio: a.p_escritorio }];
    },
    portal_exigir_escrita: () => {
      if (opcoes.soConsulta) erroBanco("TC401", { motivo: "CONTRATO_ENCERRADO" });
      return null;
    },
    portal_equipe_retiradas: () => [{ vinculoId: VL_LARA, pessoaId: LARA, nome: "Lara", retiradaEm: "2026-11-18", saida: { entradaApagaEm: "2027-02-16" } }],
    portal_convidar: () => VL_LARA,
    portal_equipe_pessoa: (a) => ({ vinculoId: VL_LARA, pessoaId: a.p_alvo, nome: "Lara", oab: [], frase: null, contratos: [] }),
    portal_oab_incluir: (a) => ({ id: VL_LARA, uf: (a.p_dados as { uf: string }).uf, frase: "OAB/SP nº 1" }),
    portal_oab_mudar: (a) => ({ id: a.p_inscricao, versao: Number(a.p_versao) + 1 }),
    portal_oab_remover: () => ({ frase: null }),
    portal_conta: (a) => ({ pessoaId: a.p_pessoa, nome: "Ana", oab: [], frase: null, contratos: [], socios: ["Ana"] }),
    portal_conta_dados: () => ({ nomeCompleto: "Ana Paula Souza", versao: 0 }),
    portal_conta_dados_salvar: (a) => ({ ...(a.p_dados as object), versao: Number(a.p_versao) + 1 }),
    portal_escritorio_dados_salvar: (a) => ({ documentos: a.p_dados, versao: Number(a.p_versao) + 1, dadosMudados: { onde: "PORTAL" }, outro: "não sai" }),
    portal_escritorio_advogados: (a) => ({ dono: true, eu: a.p_pessoa, advogados: [], semOab: [] }),
    portal_equipe_pessoa_dados: (a) => ({ nomeCompleto: "Lara", alvo: a.p_alvo, versao: 2, mudancas: [] }),
    portal_equipe_pessoa_dados_salvar: (a) => ({ alvo: a.p_alvo, versao: Number(a.p_versao) + 1, mudancas: [] }),
    portal_mudar_areas: (a) => a.p_areas,
    portal_reenviar_convite: () => LARA,
    portal_retirar: (a) => {
      if (a.p_passar_para === null) erroBanco("TC422", { campos: ["passarPara"] });
      return { versao: 2, passouPara: a.p_passar_para };
    },
    portal_historico_equipe: () => [{ id: 7, ocorrido_em: "2026-11-18T10:00:00-03:00", autor_id: ANA, autor_nome: "Ana", acao: "equipe.retirada", entidade_id: VL_LARA, dados: {}, pessoa_nome: "Lara", para_nome: "Ana" }],
    portal_clientes: (a) => ({ comercial: true, clientes: [{ id: CLIENTE, nome: "Helena Prado", termo: a.p_termo }] }),
    portal_clientes_duplicados: () => [{ id: CLIENTE, nome: "Helena Prado", situacao: "ATIVO", desde: "2026-11-01", por: "DOCUMENTO" }],
    portal_cliente_cadastrar: () => ({ id: CLIENTE, versao: 1 }),
    portal_cliente_editar: (a) => ({ id: a.p_cliente, versao: Number(a.p_versao) + 1 }),
    portal_cliente: (a) => ({ id: a.p_cliente, nome: "Helena Prado", rep_nome: null, estado_civil: "CASADO", criado_em: "2026-11-01", contatos: [{ nome: "Helena", e_principal: true }] }),
    portal_cliente_inativar: () => 3,
    portal_cliente_reativar: () => 4,
    portal_atendimentos: () => { if (opcoes.semComercial) erroBanco("TC401", { motivo: "AREA_NAO_LIBERADA" }); return []; },
    portal_registrar_atendimento: () => "9c8b7a6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d",
    portal_pessoas_escritorio: () => [{ id: ANA, nome: "Ana" }],
    portal_inicio_contatos: (a) => {
      if (a.p_de === "EQUIPE" && opcoes.naoDono) erroBanco("TC401", { motivo: "SO_SOCIO_DONO" });
      return { de: a.p_de, dono: !opcoes.naoDono, vencidos: [], hoje: [], totalVencidos: 0, totalHoje: 0, maisAntigo: null, equipeVencidos: null, pedidosExclusao: null };
    },
    portal_relatorio_resumo: (a) => {
      if (opcoes.naoDono) erroBanco("TC401", { motivo: "SO_SOCIO_DONO" });
      return { periodo: { de: a.p_de, ate: a.p_ate, comparar: a.p_comparar ?? "anterior" } };
    },
    portal_importacao_criar: (a) => ({ id: CLIENTE, ...(a.p_dados as object) }),
    portal_importacao_linha: (a) => ({ linha: { numero: a.p_numero }, dados: a.p_dados }),
    portal_importacao_arquivados: (a) => ({ id: a.p_importacao, versao: Number(a.p_versao) + 1, ...(a.p_dados as object) }),
    portal_importacao_lancamentos: (a) => ({ linhas: [], total: 0, grupo: a.p_grupo }),
    portal_importacao_colunas: (a) => ({ versao: Number(a.p_versao) + 1, dados: a.p_dados }),
    portal_relatorio_cliente: (a) => ({ cliente: { id: a.p_cliente } }),
    portal_relatorio_exportar: (a) => ({ formato: (a.p_dados as { formato: string }).formato }),
    portal_inicio_resumo: () => ({ areas: ["JURIDICO"], dono: false, pedem: { JURIDICO: 2 }, total: 2, compromissos: 0, proximoCompromisso: null }),
    portal_inicio_juridico: (a) => {
      if (a.p_de === "EQUIPE" && opcoes.naoDono) erroBanco("TC401", { motivo: "SO_SOCIO_DONO" });
      return { de: a.p_de, total: 0, mostrando: 0, grupos: [] };
    },
    portal_inicio_audiencias: () => ({ de: "2026-11-19", ate: "2026-11-25", total: 0, itens: [], seguinte: null }),
    portal_inicio_contratos: (a) => ({ de: a.p_de, total: 0, mostrando: 0, grupos: [] }),
    portal_inicio_financeiro: (a) => ({ de: a.p_de }),
    portal_financeiro_repasse_responsavel: () => ({ id: ANA, nome: "Ana" }),
    portal_cliente_pedir_exclusao: (a) => ({ id: "p1", estado: "PENDENTE", ...(a.p_dados as Record<string, unknown>) }),
    portal_cliente_recusar_exclusao: (a) => ({ id: "p1", estado: "RECUSADO", motivoRecusa: a.p_motivo }),
    portal_cliente_excluir_dados: (a) => {
      if (opcoes.naoDono) erroBanco("TC401", { motivo: "SO_SOCIO_DONO" });
      return { protocolo: "EXC-2026-0001", versao: Number(a.p_versao) + 1, pedido: { id: "p1", estado: "ATENDIDO" } };
    },
    portal_cliente_arquivar_lgpd: (a) => {
      if (opcoes.naoDono) erroBanco("TC401", { motivo: "SO_SOCIO_DONO" });
      return { protocolo: "EXC-2026-0002", versao: Number(a.p_versao) + 1, pedido: { id: "p2", estado: "ARQUIVADO" } };
    },
    portal_agenda: (a) => ({ juridico: true, compromissos: [], feriados: [], prazos: [], tiposEscritos: [], de: a.p_de }),
    portal_compromisso_marcar: () => ({ id: CLIENTE, versao: 1 }),
    portal_comercial_retornos: () => ({ algum: false }),
    portal_propostas: () => ({ propostas: [], contagem: { andamento: 0, contrato: 0, recusadas: 0 }, algum: false }),
    portal_proposta_criar: () => ({ id: CLIENTE, numero: "P-2026-001", versao: 1 }),
    portal_proposta_resposta: () => ({ id: CLIENTE, versao: 4, situacao: "RECUSADA" }),
    portal_proposta_enviada: () => 3,
    portal_comercial_funil: (a) => ({ periodo: a.p_periodo }),
    portal_contratos: (a) => ({ algum: false, contagem: { ativos: 0, elaboracao: 0, encerrados: 0, base: 0 }, contratos: [], mostrar: a.p_mostrar }),
    portal_contrato_criar_area: () => ({ id: CLIENTE, numero: "C-2026-001", versao: 1 }),
    portal_proposta: (a) => ({
      id: a.p_proposta, numero: "P-2026-014", cliente: { id: CLIENTE, nome: "Gabriela Teixeira", tipo: "PF" }, servico: "Revisão do benefício",
      responsavel: { id: ANA, nome: "Ana" }, situacao: "ENVIADA", vencida: false, retorno: null, criadaEm: "2026-11-18T10:00:00-03:00",
      condicoes: [{ tipo: "PARCELADO", total: 300000, parcelas: 3, primeiro: "2026-12-10" }], escopo: "Pedido no INSS.\nRecurso, se negado.",
      validaAte: "2026-11-30", enviadaEm: null, respondidaEm: null, motivoRecusa: null, origem: null, versao: 2, retornoCompleto: null,
      podeContrato: true, quemTemContratos: [], contratoPedidoEm: null, historico: [],
    }),
    portal_pessoas_oab: () => [{ id: ANA, nome: "Ana", oab: [] }],
    portal_contratos_pedidos: () => [],
    portal_contrato_inscricoes: () => [],
    portal_contrato_inscricoes_mudar: (a) => {
      if (!(a.p_ids as string[]).length) erroBanco("TC422", { campos: [`inscricoes.${a.p_alvo}`], motivos: { [`inscricoes.${a.p_alvo}`]: "INSCRICAO_OBRIGATORIA" } });
      return { id: a.p_contrato, versao: Number(a.p_versao) + 1, frase: "OAB/SP nº 287.104" };
    },
    portal_contrato_condicoes_area: (a) => {
      if (a.p_dados && !(a.p_dados as Record<string, unknown>).motivo) erroBanco("TC422", { campos: ["motivo"] });
      return { id: a.p_contrato, versao: Number(a.p_versao) + 1, cancelados: 2, novos: 2 };
    },
    portal_contrato_assinatura: (a) => ({ id: a.p_contrato, versao: Number(a.p_versao) + 1, recebimentos: 3, em: a.p_assinado_em }),
    portal_contrato_assinatura_caso: (a) => ({ id: a.p_contrato, versao: Number(a.p_versao) + 1, recebimentos: 3, casoId: CLIENTE, podeVerCaso: true }),
    portal_contrato_caso_opcoes: (a) => ({ contrato: { id: a.p_contrato }, casoLigado: null, escolhe: true }),
    portal_contrato_caso: () => ({ casoId: CLIENTE }),
    portal_contratos_sem_caso: () => ({ podeAbrir: true, quemAbre: null, contratos: [] }),
    portal_cliente_itens: (a) => ({ [String(a.p_tipo).toLowerCase()]: [] }),
    portal_cliente_anterior: () => ({ anterior: { origem: "ASTREA", pago: 200000, total: 4, lembretes: [], lancamentos: [], importacao: null } }),
    portal_contrato_base: (a) => ({ id: a.p_recebimento, valor: 63540, vencimento: "2026-12-15" }),
    portal_financeiro_receber: (a) => ({ algum: true, parcelas: [], mostrar: a.p_mostrar, forma: a.p_forma, responsavel: a.p_responsavel }),
    portal_financeiro_contrato: (a) => ({ id: a.p_contrato, parcelas: [] }),
    portal_financeiro_contrato_adiantados: () => [{ id: "conta", descricao: "Custas da apelação" }],
    portal_financeiro_adiantar: (a) => ({ cliente: a.p_cliente, casos: [], proximaParcela: null }),
    portal_financeiro_receber_registrar_recibo: (a) => {
      if ((a.p_dados as Record<string, unknown>).valor === 90000) erroBanco("TC422", { motivo: "VALOR_ACIMA_DO_SALDO", campos: ["valor"], falta: 85000 });
      return { id: CLIENTE, paga: true, falta: 0, recibo: { ano: 2026, numero: 1 } };
    },
    portal_financeiro_cobranca_anotar: () => ({ id: CLIENTE }),
    portal_recibo: (a) => ({ ...RECIBO_TESTE, pagamentoId: a.p_pagamento }),
    portal_recebimento_marca: () => (opcoes.logo
      ? { tipo: "LOGO", logoId: LOGO_TESTE, largura: 1200, altura: 300, jeito: "SO_LOGO", cor: "ARQUIVO", oab: "OAB/BA 1.234" }
      : { tipo: "LETRA" }),
    portal_recorrencias: () => ({ mes: "2026-11-01", ativas: [], encerradas: [] }),
    portal_recorrencia: (a) => ({ id: a.p_rec, mudancas: [] }),
    portal_recorrencia_mudar: (a) => {
      const d = a.p_dados as { tipo: string; motivo?: string | null };
      if (d.tipo === "ENCERRAR" && !d.motivo) {
        erroBanco("TC422", { campos: ["motivo"], motivos: { motivo: "MOTIVO_OBRIGATORIO" } });
      }
      return { id: "m1", mudouConta: false, cancelouConta: false, contaDoMes: null };
    },
    portal_financeiro_pagar: (a) => ({ algum: true, contas: [], mostrar: a.p_mostrar }),
    portal_financeiro_conta_lancar: () => ({ id: CLIENTE, recorrenteId: null }),
    portal_financeiro_emprestimo_registrar: (a) => {
      const d = a.p_dados as { credorNome?: string | null; valor?: number | null; parcelasTotal?: number | null };
      const campos = [!d.credorNome ? "credorNome" : null, !d.valor ? "valor" : null].filter(Boolean);
      if (campos.length) erroBanco("TC422", { campos });
      return { id: CLIENTE, parcelasCriadas: d.parcelasTotal ?? 0 };
    },
    portal_financeiro_emprestimo: (a) => ({ id: a.p_emprestimo, parcelas: [], devolucoes: [], historico: [] }),
    portal_financeiro_emprestimo_devolucao: () => ({ id: CLIENTE, acimaDoQueFalta: 0, emprestimo: { id: CLIENTE } }),
    portal_financeiro_emprestimo_encerrar: (a) => ({ id: a.p_emprestimo, situacao: { situacao: "ENCERRADO" } }),
    portal_financeiro_emprestimo_cancelar: (a) => {
      const motivo = String((a.p_dados as { motivo?: string | null }).motivo ?? "");
      if (motivo.length < 5) erroBanco("TC422", { campos: ["motivo"] });
      if (a.p_emprestimo === ANEXO_NOTA) erroBanco("TC422", { motivo: "EMPRESTIMO_COM_PAGAMENTO" });
      return { id: a.p_emprestimo, situacao: { situacao: "CANCELADO" } };
    },
    portal_financeiro_conta_paga: (a) => {
      const d = a.p_dados as { pagaEm?: string };
      if ((d.pagaEm ?? "") > "2026-11-18") erroBanco("TC422", { motivo: "DATA_NO_FUTURO", campos: ["pagaEm"] });
      return { id: a.p_conta, pagaEm: d.pagaEm };
    },
    portal_juridico_casos: (a) => ({ situacao: a.p_situacao, q: a.p_q, escritorio: a.p_escritorio, casos: [] }),
    portal_juridico_opcoes: () => ({ etapas: [], contratos: [] }),
    portal_juridico_caso_criar: (a) => ({ id: CLIENTE, versao: 1, numero: (a.p_dados as { numero: string | null }).numero }),
    portal_juridico_caso: (a) => ({ id: a.p_caso, nome: "Benedito x Metalúrgica" }),
    portal_juridico_caso_editar: (a) => ({ id: a.p_caso, versao: (a.p_versao as number) + 1 }),
    portal_juridico_caso_cliente: (a) => ({ id: a.p_caso }),
    portal_juridico_caso_etapa: (a) => {
      const d = a.p_dados as { motivo?: string };
      if (!d.motivo) erroBanco("TC422", { motivo: "MOTIVO_OBRIGATORIO", campos: ["motivo"] });
      return { id: a.p_caso, versao: (a.p_versao as number) + 1, encerrado: false, aviso: null };
    },
    portal_juridico_prazos: (a) => ({ mostrar: a.p_mostrar, responsavel: a.p_responsavel, prazos: [] }),
    portal_juridico_prazo_criar: () => ({ id: CLIENTE }),
    portal_juridico_prazo_cumprido: (a) => {
      if (a.p_prazo === AURORA) erroBanco("TC422", { motivo: "PRAZO_JA_CUMPRIDO" });
      return { id: a.p_prazo, cumpridoEm: "2026-11-18T13:00:00Z" };
    },
    portal_juridico_tarefas: (a) => ({ visao: a.p_visao, tarefas: [], carga: null }),
    portal_juridico_tarefa_criar: () => ({ id: CLIENTE }),
    portal_juridico_tarefa_concluir: (a) => ({ id: a.p_tarefa, concluida: a.p_concluir }),
    portal_juridico_tarefa_chegou: (a) => ({ id: a.p_tarefa }),
    portal_juridico_prazo_editar: (a) => ({ id: a.p_prazo, versao: Number(a.p_versao) + 1, campos: Object.keys(a.p_dados as object) }),
    portal_juridico_tarefa_editar: (a) => ({ id: a.p_tarefa, versao: Number(a.p_versao) + 1, campos: Object.keys(a.p_dados as object) }),
    portal_agenda_casos: () => [{ id: CLIENTE, nome: "Pereira x Mercado Bom Preço", numero: null, parteContraria: null }],
    portal_juridico_etapas: () => ({ podeEditar: true, escritorio: "Ribeiro & Matos", etapas: [] }),
    portal_juridico_etapa_salvar: (a) => ({ id: a.p_id ?? CLIENTE, versao: a.p_versao ? Number(a.p_versao) + 1 : 1, dados: a.p_dados }),
    portal_juridico_etapa_mover: (a) => [{ id: a.p_id, direcao: a.p_direcao }],
    portal_juridico_etapa_remover: (a) => ({ casosMovidos: a.p_mover_para ? 1 : 0, para: a.p_mover_para }),
    portal_juridico_documento_pedir: (a) => ({ id: CLIENTE, ...(a.p_dados as object) }),
    portal_juridico_documento_repedir: (a) => ({ id: a.p_pedido, repedidoEm: "2026-11-19" }),
    portal_juridico_documento_repedir_whatsapp: (a) => ({ id: a.p_pedido, repedidoEm: "2026-11-19", repedido: { envio: "NA_FILA" } }),
    portal_recibo_enviar: (a) => ({ mensagem: { id: "m1", envio: "NA_FILA", arquivo: (a.p_dados as { arquivo: unknown }).arquivo } }),
    portal_juridico_documento_chegou: (a) => ({ id: a.p_pedido, chegouEm: "2026-11-19T22:00:00Z" }),
    portal_juridico_documento_iniciar: () => CLIENTE,
    portal_juridico_documento_para_concluir: () => [{ tipo: "application/pdf", tamanho: 1200 }],
    portal_juridico_documento_concluir: (a) => ({ id: a.p_documento, nome: "peticao.pdf" }),
    portal_juridico_documento_abrir: () => "peticao.pdf",
    portal_cliente_documentos: () => ({ hoje: "2026-11-18", validadeDias: 90, podeAnexar: true, documentos: [], pedidos: [] }),
    portal_cliente_documento_iniciar: () => PETICAO,
    portal_cliente_documento_para_concluir: () => [{ tipo: "application/pdf", tamanho: 2400 }],
    portal_cliente_documento_concluir: (a) => ({ id: a.p_documento, tipo: "RG_CPF", nome: "rg.pdf" }),
    portal_cliente_documento_abrir: () => "rg.pdf",
    portal_cliente_termo_iniciar: () => TERMO,
    portal_documento_dados: (a) => ({ contrato: { id: a.p_contrato }, termoCuratela: { id: TERMO, tipo: "TERMO_CURATELA", nome: "termo-curatela.pdf", anteriores: 0 } }),
    portal_juridico_documentos_inicio: () => ({ podeEditar: true, validadeDias: 90, areas: [] }),
    portal_cliente_documentos_previa: (a) => ({ area: a.p_area, itens: [], cliente: null, contato: null, whatsappLigado: false, modelo: null, escritorio: "Aurora", podeConferir: true }),
    portal_juridico_documento_inicio_salvar: (a) => ({ id: a.p_id ?? CLIENTE, versao: a.p_versao ? Number(a.p_versao) + 1 : 1, ...(a.p_dados as object) }),
    portal_juridico_documento_inicio_mover: (a) => [{ id: a.p_id, direcao: a.p_direcao }],
    portal_juridico_documento_inicio_tirar: (a) => [{ id: a.p_id, versao: a.p_versao }],
    portal_juridico_documentos_inicio_sugestao: (a) => [{ area: a.p_area }],
    portal_anexo_iniciar: () => PETICAO,
    portal_anexo_para_concluir: () => [{ tipo: "application/pdf", tamanho: 84000 }],
    portal_anexo_concluir: (a) => ({ id: a.p_anexo, categoria: "CONTRATO_ASSINADO", nome: "contrato-assinado.pdf" }),
    portal_anexo_abrir: () => "contrato-assinado.pdf",
    portal_contrato_anexos: () => ({ anexos: [] }),
    portal_financeiro_anexos: (a) => ({ anexos: [], contas: a.p_contas, pagamentos: a.p_pagamentos }),
    portal_financeiro_exportacao_anexos: (a) => ({ mes: a.p_mes, semNota: [], anexos: [] }),
    portal_juridico_peticoes: () => ({ minhaResposta: null }),
    portal_juridico_peticoes_responder: (a) => ({ ...(a.p_dados as object), em: "2026-11-19T22:00:00Z" }),
    portal_financeiro_destinacao_feita: (a) => ({ id: a.p_destinacao, situacao: "FEITO", feitoEm: (a.p_dados as { feitoEm: string }).feitoEm }),
    portal_financeiro_destinacao_dispensar: (a) => {
      if (a.p_motivo === null) erroBanco("TC422", { motivo: "MOTIVO_OBRIGATORIO" });
      return { id: a.p_destinacao, situacao: "DISPENSADO" };
    },
    portal_financeiro_levantamento_registrar: () => ({ id: CLIENTE }),
    portal_financeiro_repasses: () => ({ algum: false, levantamentos: [] }),
    portal_financeiro_resumo: (a) => ({ algum: false, escritorio: a.p_escritorio }),
    portal_financeiro_caixa: (a) => ({ saldo: 0, escritorio: a.p_escritorio }),
    portal_conversas: (a) => ({ filtro: a.p_filtro, busca: a.p_busca, escritorio: a.p_escritorio }),
    portal_conversa: (a) => ({ id: a.p_conversa }),
    portal_conversa_contato: (a) => ({ id: a.p_conversa, nome: "Rafaela Moura", telefone: "+5511976402281", clienteId: null, responsavel: null }),
    portal_whatsapp: (a) => ({ escritorio: a.p_escritorio }),
    portal_whatsapp_rascunho: (a) => a.p_dados,
    portal_whatsapp_conferir_numero: (a) => {
      const d = a.p_dados as { telefone: string; receberCodigo: string };
      if (d.receberCodigo === "SMS" && /^\+551130/.test(d.telefone)) erroBanco("TC422", { campos: ["receberCodigo"], motivos: { receberCodigo: "FIXO_SEM_SMS" } });
      return { passo: 2, telefone: d.telefone };
    },
    portal_whatsapp_desligar: (a) => ({ versao: a.p_versao, dados: a.p_dados }),
    portal_whatsapp_aviso_ajustar: (a) => ({ chave: a.p_chave, texto: a.p_texto }),
    portal_ia: (a) => ({ escritorio: a.p_escritorio }),
    portal_ia_teste_contatos: (a) => ({ clientes: [], busca: a.p_busca }),
    portal_ia_teste_contexto: (a) => {
      if (a.p_cliente && a.p_contato !== "k1") erroBanco("TC422", { motivo: "CONTATO_FORA_DA_FICHA" });
      return contextoTeste(Boolean(a.p_cliente));
    },
    portal_ia_testada: (a) => ({ testadaComo: a.p_como }),
    portal_automacoes: (a) => ({ escritorio: a.p_escritorio, automacoes: [] }),
    portal_automacao_ia_contexto: () => { throw new Error("não chega aqui sem pedido"); },
    portal_avisos_automaticos: (a) => ({ tipo: a.p_gatilho, pular: a.p_pular, limite: a.p_limite }),
    portal_automacao: (a) => ({ id: a.p_id }),
    portal_automacao_criar: (a) => ({ dados: a.p_dados }),
    portal_automacao_salvar: (a) => ({ versao: (a.p_versao as number) + 1, dados: a.p_dados }),
    portal_automacao_aprovar_texto: (a) => ({ passo: a.p_passo }),
    portal_automacao_ligar: (a) => {
      if (!(a.p_dados as { desligarConflitos: boolean }).desligarConflitos) erroBanco("TC422", { motivo: "CONFLITO_LIMITE_SEMANAL" });
      return { situacao: "EM_APROVACAO", dados: a.p_dados };
    },
    portal_automacao_desligar: (a) => ({ situacao: "DESLIGADA", motivo: a.p_motivo }),
    portal_automacao_sugerir: (a) => ({ texto: a.p_texto }),
    portal_automacao_quem_entraria: () => ({ disponivel: true, itens: [] }),
    portal_automacao_execucoes: (a) => ({ situacao: a.p_situacao, itens: [] }),
    portal_automacao_simulacao: (a) => ({
      gatilho: "PARCELA_ATRASO", nome: "Cobrança", escritorio: "Aurora", hoje: "2026-11-18T13:12:00Z", parcela: a.p_parcela,
      exemplo: { cliente: "Farmácia Bom Jesus", contato: "Sueli Ramos", papel: "gerente", parcela: "Mensalidade de novembro", valor: 180000, vencimento: "2026-11-15", quemCuida: null },
      fluxo: { passos: [{ id: "g", tipo: "GATILHO", dias: 3 }, { id: "m", tipo: "MENSAGEM", nome: "Cobrança", modeloId: "x" }, { id: "e", tipo: "ESPERA", dias: 5 },
        { id: "r", tipo: "RAMOS", ramos: [{ quando: "PAGOU", passos: [{ id: "f", tipo: "FIM" }] }, { quando: "NADA", passos: [{ id: "p", tipo: "PESSOA", regra: "SOCIA_DONA" }] }] }] },
      textos: { x: "Olá, {nome}. A parcela {parcela}, de {valor}, venceu em {vencimento}. Qualquer dúvida, é só responder." },
      aviso: null, pessoas: {}, socioDono: { id: "1", nome: "Marina Ribeiro" }, quemTemArea: null,
    }),
    portal_cliente_sem_avisos: (a) => ({ dados: a.p_dados }),
    portal_cliente_avisos: (a) => ({ cliente: a.p_cliente }),
    portal_avisos: () => ({ novos: 1, total: 1, itens: [] }),
    portal_aviso_lido: (a) => ({ id: a.p_id }),
    portal_avisos_lidos: (a) => ({ ate: a.p_ate }),
    portal_ia_salvar: (a) => {
      const d = a.p_dados as { nome?: string };
      if (d.nome && !/^assistente virtual/i.test(d.nome)) erroBanco("TC422", { campos: ["nome"], motivo: "NOME_SEM_ASSISTENTE_VIRTUAL" });
      return { versao: (a.p_versao as number) + 1 };
    },
    portal_ia_ligar: () => erroBanco("TC422", { motivo: "SEM_TESTE" }),
    portal_ia_pausar: (a) => ({ situacao: "PAUSADA", versao: a.p_versao }),
    portal_ia_resposta_salvar: (a) => ({ dados: a.p_dados }),
    portal_ia_resposta_situacao: (a) => ({ id: a.p_id, situacao: a.p_situacao }),
    portal_conversa_assumir: (a) => (a.p_versao as number) + 1,
    portal_conversa_devolver: (a) => {
      const d = a.p_dados as { nota?: string; registrarAtendimento?: boolean };
      if (d.registrarAtendimento && !d.nota) erroBanco("TC422", { campos: ["nota"] });
      return (a.p_versao as number) + 1;
    },
    portal_conversa_passar: (a) => (a.p_versao as number) + 1,
    portal_conversa_enviar: (a) => {
      if (a.p_conversa !== CLIENTE) erroBanco("TC422", { motivo: "ASSUMA_PRIMEIRO" });
      return { id: CLIENTE, envio: "NA_FILA" };
    },
    portal_financeiro_exportacao_previa: (a) => ({ mes: a.p_mes, aberto: false }),
    portal_financeiro_exportar: (a) => {
      const d = a.p_dados as { mes?: string; formato?: string };
      if (!d.formato) erroBanco("TC422", { campos: ["formato"] });
      return { id: CLIENTE, mes: d.mes, formato: d.formato, recebimentos: [], despesas: [], terceiros: [] };
    },
    portal_financeiro_repasse_proposta: () => ({ contrato: null, linhas: [], cliente: 100, falta: 0 }),
    portal_financeiro_repasse: (a) => ({
      id: a.p_levantamento, caso: { id: ANA }, tipo: "RPV", valor: 100000, escritorioNome: "Aurora Advocacia",
      cliente: { id: ANA, nome: "Benedito Souza", telefone: "+5511974561180" },
      destinacoes: [{ id: ANA, para: "CLIENTE", nome: "Benedito Souza", valor: 70000, situacao: "FEITO", feitoEm: "2026-11-30", prazo: "2026-11-30" },
                    { id: ANA, para: "HONORARIOS", nome: "Honorários de êxito", valor: 30000, situacao: "FEITO", feitoEm: "2026-11-30", prazo: "2026-11-30" }],
    }),
    portal_financeiro_prestacao_enviar: (a) => ({ id: a.p_levantamento, prestacao: { envio: "NA_FILA", texto: (a.p_dados as { texto: string }).texto } }),
    portal_financeiro_caso_acerto: (a) => ({ casoId: a.p_caso, pendencias: [] }),
    portal_financeiro_exitos: () => ({ total: 840000, n: 1, itens: [{ id: ANA, calculado: 840000 }] }),
    portal_financeiro_exito_lancar: (a) => {
      const d = a.p_dados as { valor?: number | null; motivoAjuste?: string | null };
      if (d.valor !== 840000 && !d.motivoAjuste) erroBanco("TC422", { motivo: "MOTIVO_OBRIGATORIO", campos: ["motivoAjuste"] });
      return { id: a.p_id, situacao: "LANCADO", parcela: { id: CLIENTE, tipo: "EXITO" } };
    },
    portal_financeiro_exito_nao_cobrar: (a) => ({ id: a.p_id, situacao: "NAO_COBRADO", motivoNaoCobrar: (a.p_dados as { motivo: string }).motivo }),
    portal_financeiro_caso_encerrar: (a) => {
      if (a.p_caso === CLIENTE) erroBanco("TC422", { motivo: "PENDENCIAS", falta: 381840, pendencias: [{ tipo: "REPASSE", nome: "Dr. Rui Tavares", valor: 150000 }] });
      return { casoId: a.p_caso, fechado: { em: "2026-11-21T12:00:00Z", por: { id: ANA, nome: "Ana" } } };
    },
    portal_financeiro_prestacao_enviada: (a) => ({ id: a.p_levantamento, prestacaoEm: "2026-11-19T22:00:00Z" }),
    portal_financeiro_conta_reembolsada: (a) => ({ id: a.p_conta, reembolsadoEm: (a.p_dados as { reembolsadoEm: string }).reembolsadoEm }),
    portal_compromisso: (a) => ({ id: a.p_compromisso, titulo: "Conciliação" }),
    portal_compromisso_editar: (a) => {
      if (a.p_motivo === null) erroBanco("TC422", { campos: ["motivo"] });
      return { id: a.p_compromisso, versao: Number(a.p_versao) + 1 };
    },
    portal_compromisso_cancelar: (a) => Number(a.p_versao) + 1,
    // F3.16: o PROCURACAO vem com o modelo do escritório; o resto, com o padrão.
    portal_documento_preparar: (a) => {
      const p = a.p_pedido as { documentos: { tipo: string }[] };
      return {
        pedido: { ...p, documentos: p.documentos.map((d, i) => d.tipo === "PROCURACAO" && a.p_contrato === MODELO_DOC
          ? { tipo: d.tipo, chave: d.tipo, numero: 1, nome: "Procuração do escritório", modeloId: MODELO_DOC, versaoId: VERSAO_MODELO_DOC,
              campos: ["CLIENTE_NOME", "PODERES_ESPECIAIS"], paragrafos: ["Outorgante: [CLIENTE_NOME][PODERES_ESPECIAIS]."] }
          : { tipo: d.tipo, chave: d.tipo, numero: i + 1, nome: NOMES_DOC[d.tipo], padrao: d.tipo === "HIPOSSUFICIENCIA" ? "HIPOSSUFICIENCIA_PF" : d.tipo }) },
        dados: DADOS_DOCUMENTOS,
      };
    },
    portal_documento_gravar: (a) => ({ geracaoId: (a.p_resultado as { geracaoId: string }).geracaoId, documentos: (a.p_resultado as { documentos: unknown[] }).documentos }),
    portal_documento_modelos: () => ({
      modelos: [{ id: MODELO_DOC, padrao: false, tipo: "PROCURACAO", nome: "Procuração do escritório", versao: 2, versaoId: VERSAO_MODELO_DOC, campos: [], desconhecidos: [],
        enviadoPor: { id: ANA, nome: "Ana" }, atualizadoEm: "2026-11-21T10:00:00-03:00", usos: 4, linhaVersao: 2, emRevisao: false, anteriores: [] }],
      usosPadrao: { HIPOSSUFICIENCIA_PF: 2, HIPOSSUFICIENCIA_PJ: 1 }, podeEnviar: true,
    }),
    portal_documento_modelo_enviar: (a) => ({ id: MODELO_DOC, tipo: (a.p_dados as { tipo?: string }).tipo ?? "PROCURACAO", nome: (a.p_dados as { nome?: string }).nome, versao: 1 }),
    portal_documento_arquivo: (a) => ({ id: a.p_id, nome: "procuracao-c-2026-033-benedito-souza-lima.docx", versao: 2, geradoEm: "2026-11-21T19:02:00Z", contrato: "C-2026-033" }),
    portal_documento_geracao: () => ({ numero: "C-2026-033", cliente: "Benedito Souza Lima", versao: 1,
      arquivos: [{ id: MODELO_DOC, nome: "contrato-c-2026-033-benedito-souza-lima.docx", versao: 1, geradoEm: "2026-11-21T19:02:00Z" },
                 { id: VERSAO_MODELO_DOC, nome: "procuracao-c-2026-033-benedito-souza-lima.docx", versao: 1, geradoEm: "2026-11-21T19:02:00Z" }] }),
    portal_peticao_preparar: (a) => ({ pedido: { ...(a.p_pedido as object), numero: null, valorCausa: 8640000, parteContrariaQualificacao: null }, dados: DADOS_PETICAO }),
    portal_peticao_gravar: (a) => {
      const r = a.p_resultado as { peticaoId: string; arquivo: string; marcados: string[] };
      return { id: r.peticaoId, situacao: "APROVADA", arquivo: r.arquivo, marcados: r.marcados, revisor: null, versao: 1 };
    },
    portal_peticao_modelos: () => ({ modelos: [], usosPadrao: { JUNTADA: 2 }, podeEnviar: true }),
    portal_peticao_modelo_enviar: (a) => ({ id: "m1", nome: (a.p_dados as { nome: string }).nome, versao: 1 }),
    portal_peticao_para_aprovar: () => ({ versaoId: VERSAO_PET, nome: "juntada.docx", tamanho: 10 }),
    portal_peticao_decidir: (a) => ({ id: a.p_id, situacao: a.p_documento ? "APROVADA" : "AJUSTE" }),
    portal_peticao_arquivo: (a) => ({ versaoId: VERSAO_PET, nome: "juntada.docx", rascunho: a.p_versao === 1 }),
    portal_peticao_versao_preparar: () => ({ numero: 2, modeloNome: "Juntada de documentos", casoNome: "Pereira x Mercado" }),
    portal_peticao_versao_gravar: (a) => ({ id: a.p_id, situacao: "REVISAO", versao: 2, arquivo: (a.p_resultado as { arquivo: string }).arquivo }),
    portal_pago_antes_nao_paga: (a) => ({ id: CLIENTE, contratoId: a.p_contrato, eraPagoAntes: true, vencimento: "2026-12-10" }),
    portal_pago_antes_foi_paga: (a) => ({ id: a.p_recebimento, contratoId: CLIENTE }),
    portal_recebimento_logo_registrar: (a) => ({ ...(a.p_dados as object), enviadoEm: "2026-11-21T10:00:00-03:00" }),
    portal_recebimento_logo_arquivo: (a) => `${a.p_escritorio}/logos/${a.p_logo}.png`,
    ...limitesFalsos({ login: 5, autenticador: 10, recuperacao: 3, convite: 10 }),
  });
  const storage = arquivosFalsos();
  const app = criarApiPortal("segredo-de-repasse-de-teste", {
    banco: db.banco, auth: falso.auth, urlApp: "https://portal.exemplo", admin, arquivos: storage.arquivos, ia: opcoes.ia, emails: opcoes.emails,
    senhaVazada: (senha) => Promise.resolve((opcoes.vazadas ?? []).includes(senha)),
  });
  return { pedir: pedido(app, "api-portal"), vinculos, enviados, contas, storage, ...falso, ...db };
}

Deno.test("sócio sem autenticador entra só com a senha (o autenticador é obrigatório só para a equipe)", async () => {
  const m = montar();
  const r = await m.pedir("/v1/auth/entrar", { corpo: ENTRAR });
  assertEquals(await r.json(), { etapa: "PRONTO" });
  assertMatch(r.headers.get("set-cookie") ?? "", /^__Host-portal=v1\./);
  const s = await m.pedir("/v1/sessao", { cookie: cookieDe(r) });
  assertEquals(await s.json(), {
    pessoaId: ANA,
    escritorioAtual: null,
    escritorios: [{ id: AURORA, nome: "Aurora Advocacia", funcoes: ["SOCIO"] }],
  });
});

Deno.test("quem cadastrou autenticador precisa do código em toda sessão", async () => {
  const m = montar({ comAutenticador: true });
  const r = await m.pedir("/v1/auth/entrar", { corpo: ENTRAR });
  assertEquals(await r.json(), { etapa: "CODIGO" });
  const aal1 = cookieDe(r);
  assertEquals((await erro(await m.pedir("/v1/sessao", { cookie: aal1 }))).codigo, "MFA_REQUIRED");
  const v = await m.pedir("/v1/auth/autenticador/verificar", { corpo: { codigo: CODIGO_CERTO }, cookie: aal1 });
  assertEquals((await m.pedir("/v1/sessao", { cookie: cookieDe(v) })).status, 200);
});

Deno.test("PT-01: sem escritório escolhido na sessão, rota de dado do escritório não abre", async () => {
  const m = montar();
  const cookie = cookieDe(await m.pedir("/v1/auth/entrar", { corpo: ENTRAR }));
  const r = await m.pedir("/v1/escritorio", { cookie });
  assertEquals(r.status, 403);
  assertEquals((await erro(r)).codigo, "ESCRITORIO_REQUIRED");
});

Deno.test("PT-01: o escritório fica na sessão do servidor; o navegador não o manda de novo", async () => {
  const m = montar();
  const cookie = cookieDe(await m.pedir("/v1/auth/entrar", { corpo: ENTRAR }));
  const e = await m.pedir("/v1/sessao/escritorio", { metodo: "PUT", corpo: { escritorioId: AURORA }, cookie });
  assertEquals(await e.json(), { escritorioAtual: AURORA });
  const escolha = m.chamadas.find((c) => c.funcao === "escolher_escritorio")!;
  assertEquals(escolha.args.p_pessoa, ANA);
  assertEquals(typeof escolha.args.p_sessao, "string");

  const r = await m.pedir("/v1/escritorio", { cookie });
  assertEquals(await r.json(), {
    id: AURORA, nome: "Aurora Advocacia", funcoes: ["SOCIO"], dono: true,
    areas: ["COMERCIAL", "CONTRATOS", "FINANCEIRO", "JURIDICO"], outrosEscritorios: 0,
    cobranca: { soConsultaDesde: null, socioDono: "Ricardo Almeida", veFaturas: true, atraso: null },
  });
});

Deno.test("PT-01: escolher escritório sem vínculo é recusado", async () => {
  const m = montar();
  const cookie = cookieDe(await m.pedir("/v1/auth/entrar", { corpo: ENTRAR }));
  const r = await m.pedir("/v1/sessao/escritorio", { metodo: "PUT", corpo: { escritorioId: BELA_VISTA }, cookie });
  assertEquals(r.status, 403);
  assertEquals((await erro(r)).codigo, "FORBIDDEN");
});

Deno.test("PT-21: vínculo revogado para na chamada seguinte", async () => {
  const m = montar();
  const cookie = cookieDe(await m.pedir("/v1/auth/entrar", { corpo: ENTRAR }));
  await m.pedir("/v1/sessao/escritorio", { metodo: "PUT", corpo: { escritorioId: AURORA }, cookie });
  m.vinculos.clear();
  assertEquals((await erro(await m.pedir("/v1/escritorio", { cookie }))).codigo, "FORBIDDEN");
});

// F3.136 (PT-27): o acesso e o escritório da sessão numa consulta só, ao mesmo tempo que o Auth.
async function comEscritorio(m: ReturnType<typeof montar>) {
  const cookie = cookieDe(await m.pedir("/v1/auth/entrar", { corpo: ENTRAR }));
  await m.pedir("/v1/sessao/escritorio", { metodo: "PUT", corpo: { escritorioId: AURORA }, cookie });
  m.chamadas.length = 0;
  return cookie;
}
const doBanco = (m: ReturnType<typeof montar>) => m.chamadas.map((c) => c.funcao).filter((f) => f !== "registrar_acesso");

Deno.test("F3.136: a tela pede ao banco o acesso e o escritório numa consulta só", async () => {
  const m = montar();
  const cookie = await comEscritorio(m);
  assertEquals((await m.pedir("/v1/escritorio/advogados", { cookie })).status, 200);
  assertEquals(doBanco(m), ["acesso_portal_sessao", "portal_escritorio_advogados"]);
  const ctx = m.chamadas.find((c) => c.funcao === "acesso_portal_sessao")!;
  assertEquals(ctx.args.p_pessoa, ANA);
  assertEquals(typeof ctx.args.p_sessao, "string");
});

Deno.test("F3.136: sem escritório escolhido, responde ESCRITORIO_REQUIRED sem perguntar de novo ao banco", async () => {
  const m = montar();
  const cookie = cookieDe(await m.pedir("/v1/auth/entrar", { corpo: ENTRAR }));
  m.chamadas.length = 0;
  assertEquals((await erro(await m.pedir("/v1/escritorio/advogados", { cookie }))).codigo, "ESCRITORIO_REQUIRED");
  assertEquals(doBanco(m), ["acesso_portal_sessao"]);
});

Deno.test("F3.136: /v1/sessao usa o escritório que veio com o acesso", async () => {
  const m = montar();
  const cookie = await comEscritorio(m);
  assertEquals(((await (await m.pedir("/v1/sessao", { cookie })).json()) as { escritorioAtual: string }).escritorioAtual, AURORA);
  assertEquals(doBanco(m), ["acesso_portal_sessao", "meus_escritorios"]);
});

Deno.test("F3.136: sem a migration 0880 no banco, volta às duas consultas de antes", async () => {
  const m = montar();
  const cookie = await comEscritorio(m);
  const rpc = m.banco.rpc.bind(m.banco);
  m.banco.rpc = <T>(f: string, a?: Record<string, unknown>) => (f === "acesso_portal_sessao" ? erroBancoAsync<T>("PGRST202") : rpc<T>(f, a));
  assertEquals((await m.pedir("/v1/escritorio/advogados", { cookie })).status, 200);
  assertEquals(doBanco(m), ["acesso_portal", "escritorio_da_sessao", "portal_escritorio_advogados"]);
  m.vinculos.clear();
  assertEquals((await erro(await m.pedir("/v1/escritorio/advogados", { cookie }))).codigo, "FORBIDDEN");
});

Deno.test("F3.136: o banco responder não basta; sem o Auth aceitar o token, não entra", async () => {
  const m = montar();
  const cookie = await comEscritorio(m);
  m.tokens.clear();
  const r = await m.pedir("/v1/escritorio/advogados", { cookie: cookie.replace(/=v1\..*$/, "=" + cookieForjado()) });
  assertEquals((await erro(r)).codigo, "UNAUTHORIZED");
});

Deno.test("F3.136: a moldura confere o login uma vez só (antes, /v1/escritorio conferia duas)", async () => {
  const m = montar();
  const cookie = await comEscritorio(m);
  assertEquals((await m.pedir("/v1/escritorio", { cookie })).status, 200);
  assertEquals(doBanco(m).sort(), ["acesso_portal_sessao", "meus_escritorios", "portal_cobranca", "portal_escritorio"]);
});

Deno.test("F3.136: token vencido renova e usa a consulta feita junto (mesma pessoa e mesma sessão)", async () => {
  const m = montar();
  const cookie = await comEscritorio(m);
  for (const k of [...m.tokens.keys()]) m.tokens.delete(k);
  const r = await m.pedir("/v1/escritorio/advogados", { cookie });
  assertEquals(r.status, 200);
  assert(cookieDe(r).startsWith("__Host-portal"), "o cookie novo é gravado");
  assertEquals(doBanco(m), ["acesso_portal_sessao", "portal_escritorio_advogados"]);
});

Deno.test("F3.136: na moldura, escritório fora da lista responde ESCRITORIO_REQUIRED mesmo se a ficha falhar antes", async () => {
  const m = montar();
  const cookie = await comEscritorio(m);
  const rpc = m.banco.rpc.bind(m.banco);
  m.banco.rpc = <T>(f: string, a?: Record<string, unknown>) => {
    if (f === "portal_escritorio") return erroBancoAsync<T>("TC401");
    if (f === "meus_escritorios") return new Promise<T>((ok) => setTimeout(() => ok([] as T), 5));
    return rpc<T>(f, a);
  };
  assertEquals((await erro(await m.pedir("/v1/escritorio", { cookie }))).codigo, "ESCRITORIO_REQUIRED");
  m.banco.rpc = <T>(f: string, a?: Record<string, unknown>) => (f === "portal_escritorio" ? erroBancoAsync<T>("TC401") : rpc<T>(f, a));
  assertEquals((await erro(await m.pedir("/v1/escritorio", { cookie }))).codigo, "FORBIDDEN");
});

function erroBancoAsync<T>(codigo: string): Promise<T> {
  try {
    erroBanco(codigo);
  } catch (e) {
    return Promise.reject(e);
  }
  return Promise.reject(new Error("inalcançável"));
}

/** Cookie com um token de formato válido, de outra sessão, que o Auth não conhece. */
function cookieForjado(): string {
  const b64 = (s: string) => btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const token = `${b64('{"alg":"none"}')}.${b64(JSON.stringify({ sub: ANA, session_id: crypto.randomUUID(), aal: "aal1" }))}.x`;
  return `v1.${b64(JSON.stringify({ a: token, r: "refresh-que-nao-existe" }))}`;
}

Deno.test("o cookie do Console não abre o Portal", async () => {
  const m = montar();
  const deLa = cookieDe(await m.pedir("/v1/auth/entrar", { corpo: ENTRAR })).replace("__Host-portal", "__Host-console");
  assertEquals((await erro(await m.pedir("/v1/sessao", { cookie: deLa }))).codigo, "UNAUTHORIZED");
});

Deno.test("PT-15: a exportação sai do escritório da sessão, nunca de um id do navegador", async () => {
  const m = montar();
  const cookie = cookieDe(await m.pedir("/v1/auth/entrar", { corpo: ENTRAR }));
  assertEquals((await erro(await m.pedir("/v1/escritorio/exportacao", { metodo: "POST", corpo: {}, cookie }))).codigo, "ESCRITORIO_REQUIRED");
  await m.pedir("/v1/sessao/escritorio", { metodo: "PUT", corpo: { escritorioId: AURORA }, cookie });
  const r = await m.pedir("/v1/escritorio/exportacao", { metodo: "POST", corpo: { escritorioId: BELA_VISTA }, cookie });
  assertEquals(r.status, 200);
  assertEquals(r.headers.get("content-disposition"), 'attachment; filename="t3jus-exportacao-2026-11-18.json"');
  assertEquals(r.headers.get("cache-control"), "no-store");
  assertEquals((await r.json()).formato, "t3jus.exportacao.v1");
  const chamada = m.chamadas.find((c) => c.funcao === "exportar_escritorio")!;
  assertEquals(chamada.args, { p_pessoa: ANA, p_escritorio: AURORA });
});

Deno.test("manter conectado: marcado, o cookie tem prazo; desmarcado, some ao fechar o navegador", async () => {
  const m = montar();
  const com = (await m.pedir("/v1/auth/entrar", { corpo: ENTRAR })).headers.get("set-cookie") ?? "";
  assertMatch(com, /Max-Age=43200/);
  const sem = await m.pedir("/v1/auth/entrar", { corpo: { ...ENTRAR, manterConectado: false } });
  const cookie = sem.headers.get("set-cookie") ?? "";
  assert(!/Max-Age/.test(cookie), "cookie de sessão não leva Max-Age");
  assertMatch(cookie, /HttpOnly; Secure; SameSite=Strict/);
  assertEquals((await m.pedir("/v1/sessao", { cookie: cookieDe(sem) })).status, 200);
});

Deno.test("link de acesso: a resposta é a mesma exista a conta ou não, e o link volta para a tela de entrar", async () => {
  const m = montar();
  const a = await (await m.pedir("/v1/auth/link", { corpo: { email: ENTRAR.email } })).json();
  const b = await (await m.pedir("/v1/auth/link", { corpo: { email: "ninguem@exemplo.invalid", manterConectado: false } })).json();
  assertEquals(a, b);
  assertEquals(m.links.map((l) => l.voltarPara), ["https://portal.exemplo/entrar/link", "https://portal.exemplo/entrar/link/sessao"]);
});

Deno.test("link de acesso: o token vira sessão uma vez só", async () => {
  const m = montar();
  const r = await m.pedir("/v1/auth/link/usar", { corpo: { tokenHash: TOKEN_LINK } });
  assertEquals(await r.json(), { etapa: "PRONTO" });
  assertEquals((await m.pedir("/v1/sessao", { cookie: cookieDe(r) })).status, 200);
  assertEquals((await erro(await m.pedir("/v1/auth/link/usar", { corpo: { tokenHash: TOKEN_LINK } }))).codigo, "TOKEN_INVALID");
});

Deno.test("link de acesso: quem tem autenticador ainda passa pelo código", async () => {
  const m = montar({ comAutenticador: true });
  const r = await m.pedir("/v1/auth/link/usar", { corpo: { tokenHash: TOKEN_LINK } });
  assertEquals(await r.json(), { etapa: "CODIGO" });
  assertEquals((await erro(await m.pedir("/v1/sessao", { cookie: cookieDe(r) }))).codigo, "MFA_REQUIRED");
});

Deno.test("link de acesso: conta sem vínculo recebe a mesma recusa de link vencido", async () => {
  const m = montar();
  m.vinculos.clear();
  assertEquals((await erro(await m.pedir("/v1/auth/link/usar", { corpo: { tokenHash: TOKEN_LINK } }))).codigo, "TOKEN_INVALID");
});

Deno.test("nova senha pela tela: o link abre uma vez, fica 1 hora num cookie próprio e só serve para salvar a senha", async () => {
  const m = montar();
  const antiga = cookieDe(await m.pedir("/v1/auth/entrar", { corpo: ENTRAR }));
  const aberto = await m.pedir("/v1/auth/redefinir/abrir", { corpo: { tokenHash: TOKEN_RECUPERACAO } });
  assertEquals(await aberto.json(), { email: ENTRAR.email });
  assertMatch(aberto.headers.get("set-cookie") ?? "", /^__Host-portal-link=v1\.[^;]+; Path=\/; Max-Age=3600; HttpOnly; Secure; SameSite=Strict$/);
  const link = cookieChamado(aberto, "__Host-portal-link")!;
  // O cookie do link não é sessão: não abre o Portal.
  assertEquals((await erro(await m.pedir("/v1/sessao", { cookie: link }))).codigo, "UNAUTHORIZED");
  // O mesmo link do e-mail não abre de novo.
  assertEquals((await erro(await m.pedir("/v1/auth/redefinir/abrir", { corpo: { tokenHash: TOKEN_RECUPERACAO } }))).codigo, "TOKEN_INVALID");

  const r = await m.pedir("/v1/auth/redefinir", { cookie: link, corpo: { novaSenha: "marfim-ponte-42" } });
  assertEquals(await r.json(), { ok: true });
  assertEquals(cookieChamado(r, "__Host-portal-link"), "__Host-portal-link=");
  assertEquals(m.senhasTrocadas, [ANA]);
  // Sai da conta nos outros aparelhos (decisão da Carol, 18/11).
  assertEquals((await erro(await m.pedir("/v1/sessao", { cookie: antiga }))).codigo, "UNAUTHORIZED");
  assertEquals((await erro(await m.pedir("/v1/auth/redefinir", { cookie: link, corpo: { novaSenha: "outra-senha-boa" } }))).codigo, "TOKEN_INVALID");
});

Deno.test("nova senha: sem link, ou com o link do convite, não troca", async () => {
  const m = montar();
  assertEquals((await erro(await m.pedir("/v1/auth/redefinir", { corpo: { novaSenha: "marfim-ponte-42" } }))).codigo, "TOKEN_INVALID");
  const convite = cookieChamado(await m.pedir("/v1/auth/criar-senha/abrir", { corpo: { tokenHash: TOKEN_CONVITE } }), "__Host-portal-link")!;
  assertEquals((await erro(await m.pedir("/v1/auth/redefinir", { cookie: convite, corpo: { novaSenha: "marfim-ponte-42" } }))).codigo, "TOKEN_INVALID");
  assertEquals(m.senhasTrocadas, []);
});

Deno.test("senha que aparece em lista de senhas vazadas é recusada antes do Auth", async () => {
  const m = montar({ vazadas: ["advocacia2024"] });
  const link = cookieChamado(await m.pedir("/v1/auth/redefinir/abrir", { corpo: { tokenHash: TOKEN_RECUPERACAO } }), "__Host-portal-link")!;
  assertEquals((await erro(await m.pedir("/v1/auth/redefinir", { cookie: link, corpo: { novaSenha: "advocacia2024" } }))).codigo, "PASSWORD_WEAK");
  assertEquals(m.senhasTrocadas, []);
  // O link continua valendo para tentar outra senha.
  assertEquals((await m.pedir("/v1/auth/redefinir", { cookie: link, corpo: { novaSenha: "marfim-ponte-42" } })).status, 200);
});

Deno.test("PT-20: convite mostra quem convidou, pede nome e Termos, e já entra no Portal", async () => {
  const m = montar();
  const aberto = await m.pedir("/v1/auth/criar-senha/abrir", { corpo: { tokenHash: TOKEN_CONVITE } });
  assertEquals(await aberto.json(), { email: ENTRAR.email, nome: "Ana", escritorio: "Aurora Advocacia", quem: "Ricardo Almeida", papel: "ESCRITORIO" });
  assertEquals(m.chamadas.find((c) => c.funcao === "dados_convite")?.args, { p_pessoa: ANA, p_sistema: "PORTAL" });
  const link = cookieChamado(aberto, "__Host-portal-link")!;

  const semAceite = await m.pedir("/v1/auth/criar-senha", { cookie: link, corpo: { novaSenha: "marfim-ponte-42", nome: "Ana Lima", aceiteTermos: false } });
  assertEquals(await erro(semAceite), { codigo: "VALIDATION_ERROR", detalhes: { campos: ["aceiteTermos"] } });

  const r = await m.pedir("/v1/auth/criar-senha", { cookie: link, corpo: { novaSenha: "marfim-ponte-42", nome: " Ana Lima ", aceiteTermos: true } });
  assertEquals(await r.json(), { etapa: "PRONTO" });
  assertEquals(m.chamadas.find((c) => c.funcao === "aceitar_convite")?.args, { p_pessoa: ANA, p_nome: "Ana Lima", p_sistema: "PORTAL" });
  assertEquals(cookieChamado(r, "__Host-portal-link"), "__Host-portal-link=");
  const sessao = cookieChamado(r, "__Host-portal")!;
  assertEquals((await m.pedir("/v1/sessao", { cookie: sessao })).status, 200);
});

Deno.test("escolha do escritório: a lista vem do banco, do último usado ao mais antigo, com o e-mail de quem entrou", async () => {
  const m = montar();
  const cookie = cookieDe(await m.pedir("/v1/auth/entrar", { corpo: ENTRAR }));
  const r = await m.pedir("/v1/sessao/escolha", { cookie });
  assertEquals(await r.json(), {
    email: ENTRAR.email,
    escritorios: [
      { id: BELA_VISTA, nome: "Bela Vista Advogados", cidade: "Salvador", uf: "BA", ultimaEntrada: "2026-11-18T09:12:00-03:00" },
      { id: AURORA, nome: "Aurora Advocacia", cidade: null, uf: null, ultimaEntrada: null },
    ],
  });
  assertEquals(m.chamadas.find((c) => c.funcao === "escritorios_para_escolher")?.args, { p_pessoa: ANA });
  assertEquals((await erro(await m.pedir("/v1/sessao/escolha"))).codigo, "UNAUTHORIZED");
});

async function noEscritorio(m: ReturnType<typeof montar>) {
  const cookie = cookieDe(await m.pedir("/v1/auth/entrar", { corpo: ENTRAR }));
  await m.pedir("/v1/sessao/escritorio", { metodo: "PUT", corpo: { escritorioId: AURORA }, cookie });
  return cookie;
}

Deno.test("PA-02: a equipe vem com o e-mail do Auth, e o escritório da sessão vai para o banco", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const r = await m.pedir("/v1/escritorio/equipe", { cookie });
  const corpo = await r.json();
  assertEquals(corpo.pessoas[0].email, "lara@aurora.adv.br");
  assertEquals(m.chamadas.find((c) => c.funcao === "portal_equipe")?.args.p_escritorio, AURORA);
});

Deno.test("PA-02: quem não é sócio dono não convida, e a conta nem nasce no Auth", async () => {
  const m = montar({ naoDono: true });
  const cookie = await noEscritorio(m);
  const r = await m.pedir("/v1/escritorio/equipe", { metodo: "POST", corpo: { nome: "Novo", email: "novo@aurora.adv.br", areas: [] }, cookie });
  assertEquals(r.status, 403);
  assertEquals(m.contas["novo@aurora.adv.br"], undefined);
  assert(!m.chamadas.some((c) => c.funcao === "portal_convidar"));
});

Deno.test("F0.14: nos 30 dias só de consulta, o convite não cria a conta no Auth", async () => {
  const m = montar({ soConsulta: true });
  const cookie = await noEscritorio(m);
  const r = await m.pedir("/v1/escritorio/equipe", { metodo: "POST", corpo: { nome: "Novo", email: "novo@aurora.adv.br", areas: [] }, cookie });
  assertEquals(r.status, 403);
  assertEquals((await r.json()).erro.detalhes, { motivo: "CONTRATO_ENCERRADO" });
  assertEquals(m.contas["novo@aurora.adv.br"], undefined);
});

Deno.test("F0.14: a Equipe lista quem foi retirado, com a data em que a entrada some", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const r = await m.pedir("/v1/escritorio/equipe/retiradas", { cookie });
  const p = (await r.json()).pessoas[0];
  assertEquals(p.saida, { entradaApagaEm: "2027-02-16" });
  assert("email" in p);
});

Deno.test("PA-02: convidar cria a conta, manda o link do Portal e grava as áreas", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const r = await m.pedir("/v1/escritorio/equipe", { metodo: "POST", corpo: { nome: "Bia", email: "BIA@aurora.adv.br", areas: ["FINANCEIRO", "FINANCEIRO"] }, cookie });
  assertEquals(r.status, 201);
  assertEquals(m.enviados, [{ email: "bia@aurora.adv.br", voltarPara: "https://portal.exemplo/criar-senha" }]);
  const conv = m.chamadas.find((c) => c.funcao === "portal_convidar")!;
  assertEquals(conv.args.p_areas, ["FINANCEIRO"]);
  assertEquals(conv.args.p_escritorio, AURORA);
});

Deno.test("EX-12: o convite leva a OAB principal; a ficha e Sua conta trazem o e-mail do Auth", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const r = await m.pedir("/v1/escritorio/equipe", {
    metodo: "POST", corpo: { nome: "Bia", email: "bia@aurora.adv.br", areas: [], oab: { uf: "SP", numero: "498.310" } }, cookie,
  });
  assertEquals(r.status, 201);
  assertEquals(m.chamadas.find((c) => c.funcao === "portal_convidar")!.args.p_oab, { uf: "SP", numero: "498.310" });
  const ficha = await (await m.pedir(`/v1/escritorio/equipe/pessoas/${LARA}`, { cookie })).json();
  assertEquals(ficha.email, "lara@aurora.adv.br");
  const conta = await m.pedir("/v1/escritorio/conta", { cookie });
  assertEquals(m.chamadas.find((c) => c.funcao === "portal_conta")!.args, { p_pessoa: ANA, p_escritorio: AURORA });
  assertEquals((await conta.json()).nome, "Ana");
});

Deno.test("EX-15: os dados para os documentos; a pessoa vem da sessão em Sua conta e da rota só na Equipe", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const corpo = { versao: 0, nomeCompleto: "Ana Paula Souza", tratamento: "ADVOGADA", cpf: "529.982.247-25", enderecoDoEscritorio: true };
  const ver = await m.pedir("/v1/escritorio/conta/dados", { cookie });
  assertEquals((await ver.json()).nomeCompleto, "Ana Paula Souza");
  assertEquals(m.chamadas.find((c) => c.funcao === "portal_conta_dados")!.args, { p_pessoa: ANA, p_escritorio: AURORA });
  const salvo = await m.pedir("/v1/escritorio/conta/dados", { metodo: "PUT", corpo: { ...corpo, pessoaId: LARA }, cookie });
  assertEquals((await salvo.json()).versao, 1);
  const args = m.chamadas.find((c) => c.funcao === "portal_conta_dados_salvar")!.args;
  assertEquals(args.p_pessoa, ANA);
  assertEquals(args.p_versao, 0);
  assertEquals((args.p_dados as Record<string, unknown>).pessoaId, undefined);
  const sem = await m.pedir("/v1/escritorio/conta/dados", { metodo: "PUT", corpo: { nomeCompleto: "Ana" }, cookie });
  assertEquals(sem.status, 400);
  const eq = await m.pedir(`/v1/escritorio/equipe/pessoas/${LARA}/dados`, { metodo: "PUT", corpo: { ...corpo, versao: 2 }, cookie });
  assertEquals((await eq.json()).versao, 3);
  assertEquals(m.chamadas.find((c) => c.funcao === "portal_equipe_pessoa_dados_salvar")!.args.p_alvo, LARA);
  const lida = await m.pedir(`/v1/escritorio/equipe/pessoas/${LARA}/dados`, { cookie });
  assertEquals((await lida.json()).alvo, LARA);
});

Deno.test("PA-07: a sócia dona grava os dados do escritório; a lista dos advogados vem do banco", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const corpo = { versao: 4, nome: "Santana", tipo: "SOCIEDADE", razaoSocial: "Santana Advogados", cep: "46250-000", escritorioId: LARA };
  const r = await m.pedir("/v1/escritorio/dados", { metodo: "PUT", corpo, cookie });
  const j = await r.json();
  assertEquals([j.versao, j.dadosMudados.onde, j.outro], [5, "PORTAL", undefined]);
  const args = m.chamadas.find((c) => c.funcao === "portal_escritorio_dados_salvar")!.args;
  assertEquals([args.p_pessoa, args.p_escritorio, args.p_versao], [ANA, AURORA, 4]);
  assertEquals((args.p_dados as Record<string, unknown>).escritorioId, undefined);
  assertEquals((await m.pedir("/v1/escritorio/dados", { metodo: "PUT", corpo: { nome: "X" }, cookie })).status, 400);
  const lista = await (await m.pedir("/v1/escritorio/advogados", { cookie })).json();
  assertEquals(lista.eu, ANA);
});

Deno.test("EX-12: incluir, mudar (com a versão) e remover a inscrição", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const inc = await m.pedir(`/v1/escritorio/equipe/pessoas/${LARA}/oab`, { metodo: "POST", corpo: { uf: "SP", numero: "1", tipo: "PRINCIPAL" }, cookie });
  assertEquals(inc.status, 201);
  assertEquals(m.chamadas.find((c) => c.funcao === "portal_oab_incluir")!.args.p_alvo, LARA);
  const mud = await m.pedir(`/v1/escritorio/equipe/oab/${VL_LARA}`, { metodo: "PUT", corpo: { versao: 2, uf: "RJ", numero: "2", tipo: "PRINCIPAL", trocarPrincipal: true }, cookie });
  assertEquals((await mud.json()).versao, 3);
  const args = m.chamadas.find((c) => c.funcao === "portal_oab_mudar")!.args;
  assertEquals(args.p_versao, 2);
  assertEquals(args.p_dados, { uf: "RJ", numero: "2", tipo: "PRINCIPAL", trocarPrincipal: true });
  const sem = await m.pedir(`/v1/escritorio/equipe/oab/${VL_LARA}/remover`, { metodo: "POST", corpo: {}, cookie });
  assertEquals(sem.status, 400);
  const rem = await m.pedir(`/v1/escritorio/equipe/oab/${VL_LARA}/remover`, { metodo: "POST", corpo: { versao: 3 }, cookie });
  assertEquals(rem.status, 200);
});

Deno.test("IN-01: os pedidos de contrato vêm da sessão, e a rota não cai na ficha do contrato", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const r = await m.pedir("/v1/escritorio/contratos/pedidos", { cookie });
  assertEquals(r.status, 200);
  assertEquals(await r.json(), []);
  assertEquals(m.chamadas.find((c) => c.funcao === "portal_contratos_pedidos")!.args, { p_pessoa: ANA, p_escritorio: AURORA });
  assert(!m.chamadas.some((c) => c.funcao === "portal_contrato"));
});

Deno.test("PA-02: área desconhecida não chega ao banco", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const r = await m.pedir(`/v1/escritorio/equipe/${VL_LARA}/areas`, { metodo: "PUT", corpo: { areas: ["RH"] }, cookie });
  assertEquals(r.status, 400);
  assert(!m.chamadas.some((c) => c.funcao === "portal_mudar_areas"));
});

Deno.test("PT-20: reenviar o convite manda o link de novo para o e-mail do Auth", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const r = await m.pedir(`/v1/escritorio/equipe/${VL_LARA}/reenviar`, { metodo: "POST", cookie });
  assertEquals(await r.json(), { enviado: true });
  assertEquals(m.enviados.at(-1)?.email, "lara@aurora.adv.br");
});

Deno.test("EX-10: retirar sem para quem passar volta o campo; com alguém, passa", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const sem = await m.pedir(`/v1/escritorio/equipe/${VL_LARA}/retirar`, { metodo: "POST", corpo: { versao: 1 }, cookie });
  assertEquals((await erro(sem)).detalhes?.campos, ["passarPara"]);
  const com = await m.pedir(`/v1/escritorio/equipe/${VL_LARA}/retirar`, { metodo: "POST", corpo: { versao: 1, passarPara: ANA }, cookie });
  assertEquals(await com.json(), { versao: 2, passouPara: ANA });
});

Deno.test("PA-02: histórico da equipe com nomes e paginação", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const r = await m.pedir("/v1/escritorio/equipe/historico?antes=10&limite=20", { cookie });
  const corpo = await r.json();
  assertEquals(corpo.eventos[0].passouPara, "Ana");
  const h = m.chamadas.find((c) => c.funcao === "portal_historico_equipe")!;
  assertEquals([h.args.p_antes, h.args.p_limite], [10, 20]);
});

Deno.test("PA-02: as áreas do domínio são as mesmas do banco", async () => {
  const { AREAS_PORTAL } = await import("@t3jus/domain");
  const sql = await Deno.readTextFile(new URL("../../migrations/0140_portal_equipe.sql", import.meta.url));
  const doBanco = /area in \(([^)]+)\)/.exec(sql)?.[1]?.match(/'([A-Z]+)'/g)?.map((s) => s.slice(1, -1));
  assertEquals(doBanco, Object.keys(AREAS_PORTAL));
});

// ------------------------------------------------------------------- Clientes (AP-01, AP-02)

const HELENA = {
  tipo: "PF", nome: " Helena Prado ", documento: "529.982.247-25", cep: "01310-100", estadoCivil: "CASADO", rg: "",
  contatos: [{ nome: "Helena", telefone: "(11) 98888-7777", principal: true }, { nome: "Bia", papel: "filha", email: "BIA@exemplo.invalid", principal: false }],
};

Deno.test("AP-01: cadastrar confere os dados e manda ao banco com os nomes dele, no escritório da sessão", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const r = await m.pedir("/v1/escritorio/clientes", { metodo: "POST", corpo: { ...HELENA, escritorioId: BELA_VISTA }, cookie });
  assertEquals(r.status, 201);
  const ch = m.chamadas.find((c) => c.funcao === "portal_cliente_cadastrar")!;
  assertEquals(ch.args.p_escritorio, AURORA);
  const d = ch.args.p_dados as Record<string, unknown>;
  assertEquals([d.nome, d.documento, d.cep, d.estado_civil, d.rg, d.escritorio_id], ["Helena Prado", "52998224725", "01310100", "CASADO", null, undefined]);
  assertEquals((d.contatos as { telefone: string; email: string }[]).map((x) => x.telefone ?? x.email), ["+5511988887777", "bia@exemplo.invalid"]);
});

Deno.test("AP-01: CPF errado, contato sem telefone nem e-mail ou sem principal não chegam ao banco", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  for (const [corpo, campo] of [
    [{ ...HELENA, documento: "529.982.247-24" }, "documento"],
    [{ ...HELENA, contatos: [{ nome: "Helena", principal: true }] }, "contatos"],
    [{ ...HELENA, contatos: [{ nome: "Helena", telefone: "11988887777", principal: false }] }, "contatos"],
    [{ ...HELENA, tipo: "PJ", documento: "11222333000180" }, "documento"],
  ] as const) {
    const r = await m.pedir("/v1/escritorio/clientes", { metodo: "POST", corpo, cookie });
    assertEquals((await erro(r)).detalhes?.campos, [campo]);
  }
  assert(!m.chamadas.some((c) => c.funcao === "portal_cliente_cadastrar"));
});

Deno.test("AP-07: cadastrar pela conversa leva a conversa ao banco, e a reunião com a conversa também", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const ct = await (await m.pedir(`/v1/escritorio/conversas/${CLIENTE}/contato`, { cookie })).json();
  assertEquals([ct.nome, ct.telefone], ["Rafaela Moura", "+5511976402281"]);
  assertEquals((await m.pedir("/v1/escritorio/conversas/nao-e-id/contato", { cookie })).status, 404);
  assertEquals((await m.pedir("/v1/escritorio/clientes", { metodo: "POST", corpo: { ...HELENA, conversaId: CLIENTE }, cookie })).status, 201);
  assertEquals((m.chamadas.find((c) => c.funcao === "portal_cliente_cadastrar")!.args.p_dados as Record<string, unknown>).conversaId, CLIENTE);
  assertEquals((await erro(await m.pedir("/v1/escritorio/clientes", { metodo: "POST", corpo: { ...HELENA, conversaId: "nao-e-id" }, cookie }))).detalhes?.campos, ["conversaId"]);
  const reuniao = { tipo: "CLIENTE", titulo: "Primeira reunião · Rafaela Moura", inicio: "2026-11-20T17:00:00Z", fim: "2026-11-20T18:00:00Z", modalidade: "PRESENCIAL", responsavelId: CLIENTE };
  assertEquals((await erro(await m.pedir("/v1/escritorio/compromissos", { corpo: { ...reuniao, conversaId: "x" }, cookie }))).detalhes?.campos, ["conversaId"]);
  await m.pedir("/v1/escritorio/compromissos", { corpo: { ...reuniao, conversaId: CLIENTE }, cookie });
  assertEquals((m.chamadas.find((c) => c.funcao === "portal_compromisso_marcar")!.args.p_dados as Record<string, unknown>).conversaId, CLIENTE);
  assert(m.chamadas.filter((c) => c.funcao.startsWith("portal_conversa_contato") || c.funcao === "portal_cliente_cadastrar").every((c) => c.args.p_escritorio === AURORA));
});

Deno.test("AP-01: a busca vai ao banco com o termo, e o filtro errado volta como campo", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const r = await m.pedir("/v1/escritorio/clientes?q=Prado&vencidos=1", { cookie });
  assertEquals((await r.json()).clientes[0].nome, "Helena Prado");
  const ch = m.chamadas.find((c) => c.funcao === "portal_clientes")!;
  assertEquals([ch.args.p_termo, ch.args.p_situacao, ch.args.p_vencidos], ["Prado", "ATIVO", true]);
  const e = await m.pedir("/v1/escritorio/clientes?situacao=APAGADO", { cookie });
  assertEquals((await erro(e)).detalhes?.campos, ["situacao"]);
});

Deno.test("AP-01: a ficha chega com os nomes da API; id fora do formato é não encontrado", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const f = await (await m.pedir(`/v1/escritorio/clientes/${CLIENTE}`, { cookie })).json();
  assertEquals([f.estadoCivil, f.repNome, f.criadoEm], ["CASADO", null, "2026-11-01"]);
  assertEquals((await m.pedir("/v1/escritorio/clientes/abc", { cookie })).status, 404);
});

Deno.test("PT-19: editar leva a versão lida; inativar pede motivo", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const r = await m.pedir(`/v1/escritorio/clientes/${CLIENTE}`, { metodo: "PUT", corpo: { ...HELENA, versao: 2 }, cookie });
  assertEquals(await r.json(), { id: CLIENTE, versao: 3 });
  const sem = await m.pedir(`/v1/escritorio/clientes/${CLIENTE}/inativar`, { metodo: "POST", corpo: { versao: 3, motivo: " " }, cookie });
  assertEquals((await erro(sem)).detalhes?.campos, ["motivo"]);
  const com = await m.pedir(`/v1/escritorio/clientes/${CLIENTE}/inativar`, { metodo: "POST", corpo: { versao: 3, motivo: "Desistiu" }, cookie });
  assertEquals(await com.json(), { versao: 3 });
  const re = await m.pedir(`/v1/escritorio/clientes/${CLIENTE}/reativar`, { metodo: "POST", corpo: { versao: 3 }, cookie });
  assertEquals(await re.json(), { versao: 4 });
});

Deno.test("AP-02: sem a área Comercial os atendimentos são recusados com o motivo", async () => {
  const m = montar({ semComercial: true });
  const cookie = await noEscritorio(m);
  const r = await m.pedir(`/v1/escritorio/clientes/${CLIENTE}/atendimentos`, { cookie });
  assertEquals(r.status, 403);
  assertEquals((await erro(r)).detalhes?.motivo, "AREA_NAO_LIBERADA");
});

Deno.test("AP-06: o próximo contato vai inteiro ou não vai", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const meio = await m.pedir(`/v1/escritorio/clientes/${CLIENTE}/atendimentos`, { metodo: "POST", corpo: { canal: "WHATSAPP", resumo: "Oi", proxEm: "2026-11-20" }, cookie });
  assertEquals((await erro(meio)).detalhes?.campos, ["proxResponsavel", "proxOque"]);
  const ok = await m.pedir(`/v1/escritorio/clientes/${CLIENTE}/atendimentos`, {
    metodo: "POST", corpo: { canal: "WHATSAPP", resumo: "Oi", proxEm: "2026-11-20", proxResponsavel: ANA, proxOque: "Ligar" }, cookie,
  });
  assertEquals(ok.status, 201);
});

Deno.test("AP-01: os valores do domínio são os mesmos do banco", async () => {
  const { ORIGENS, CANAIS, ESTADOS_CIVIS } = await import("@t3jus/domain");
  const sql = await Deno.readTextFile(new URL("../../migrations/0160_portal_clientes.sql", import.meta.url));
  const lista = (re: RegExp) => re.exec(sql)?.[1]?.match(/'([A-Z_]+)'/g)?.map((s) => s.slice(1, -1));
  assertEquals(lista(/origem\s+text check \(origem in \(([^)]+)\)/), Object.keys(ORIGENS));
  assertEquals(lista(/canal\s+text not null check \(canal in \(([^)]+)\)/), Object.keys(CANAIS));
  assertEquals(lista(/estado_civil\s+text check \(estado_civil in \(([^)]+)\)/), Object.keys(ESTADOS_CIVIS));
});

Deno.test("F1.14: o Início pede os contatos da pessoa; \"Da equipe\" só para a dona", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const r = await m.pedir("/v1/escritorio/inicio/contatos", { cookie });
  assertEquals((await r.json()).de, "MEUS");
  const ch = m.chamadas.find((c) => c.funcao === "portal_inicio_contatos")!;
  assertEquals([ch.args.p_de, ch.args.p_limite], ["MEUS", 5]);
  assertEquals((await erro(await m.pedir("/v1/escritorio/inicio/contatos?de=TODOS", { cookie }))).detalhes?.campos, ["de"]);
  const n = montar({ naoDono: true });
  const e = await n.pedir("/v1/escritorio/inicio/contatos?de=EQUIPE", { cookie: await noEscritorio(n) });
  assertEquals([e.status, (await erro(e)).detalhes?.motivo], [403, "SO_SOCIO_DONO"]);
});

Deno.test("F3.26: o Início por áreas tem uma rota por área, do escritório da sessão; \"Da equipe\" só para a dona", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  assertEquals((await (await m.pedir("/v1/escritorio/inicio/resumo", { cookie })).json()).total, 2);
  assertEquals((await (await m.pedir("/v1/escritorio/inicio/audiencias", { cookie })).json()).ate, "2026-11-25");
  assertEquals(typeof m.chamadas.find((c) => c.funcao === "portal_inicio_audiencias")!.args.p_escritorio, "string");
  for (const area of ["contratos", "financeiro", "juridico"]) {
    const r = await m.pedir(`/v1/escritorio/inicio/${area}?de=EQUIPE`, { cookie });
    assertEquals(r.status, 200);
    const ch = m.chamadas.find((c) => c.funcao === `portal_inicio_${area}`)!;
    assertEquals(ch.args.p_de, "EQUIPE");
    assertEquals(typeof ch.args.p_escritorio, "string");
  }
  assertEquals((await erro(await m.pedir("/v1/escritorio/inicio/juridico?de=TODOS", { cookie }))).detalhes?.campos, ["de"]);
  const n = montar({ naoDono: true });
  const e = await n.pedir("/v1/escritorio/inicio/juridico?de=EQUIPE", { cookie: await noEscritorio(n) });
  assertEquals([e.status, (await erro(e)).detalhes?.motivo], [403, "SO_SOCIO_DONO"]);
});

Deno.test("F3.26: trocar o responsável pelo repasse pede alguém e vai ao banco com o repasse da rota", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const ruim = await m.pedir(`/v1/escritorio/financeiro/repasses/${CLIENTE}/responsavel`, { metodo: "PUT", corpo: {}, cookie });
  assertEquals((await erro(ruim)).detalhes?.campos, ["responsavelId"]);
  const ok = await m.pedir(`/v1/escritorio/financeiro/repasses/${CLIENTE}/responsavel`, { metodo: "PUT", corpo: { responsavelId: ANA }, cookie });
  assertEquals((await ok.json()).responsavel.nome, "Ana");
  const ch = m.chamadas.find((c) => c.funcao === "portal_financeiro_repasse_responsavel")!;
  assertEquals([ch.args.p_levantamento, ch.args.p_responsavel], [CLIENTE, ANA]);
});

Deno.test("F3.70: os relatórios do sócio levam o período ao banco, conferem as datas e recusam quem não é a dona", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const r = await m.pedir("/v1/escritorio/financeiro/relatorios/resumo?de=2026-07-01&ate=2026-09-30&comparar=ano_passado", { cookie });
  assertEquals((await r.json()).periodo, { de: "2026-07-01", ate: "2026-09-30", comparar: "ano_passado" });
  const ch = m.chamadas.find((c) => c.funcao === "portal_relatorio_resumo")!;
  assertEquals(typeof ch.args.p_escritorio, "string");
  const ruim = await m.pedir("/v1/escritorio/financeiro/relatorios/resumo?de=01/07/2026&comparar=sempre", { cookie });
  assertEquals((await erro(ruim)).detalhes?.campos, ["de", "comparar"]);
  assertEquals((await (await m.pedir(`/v1/escritorio/financeiro/relatorios/clientes/${CLIENTE}`, { cookie })).json()).cliente.id, CLIENTE);
  const exp = await m.pedir("/v1/escritorio/financeiro/relatorios/exportacoes", { metodo: "POST", corpo: { visao: "clientes", formato: "XLSX" }, cookie });
  assertEquals([exp.status, (await exp.json()).formato], [201, "XLSX"]);
  const semF = await m.pedir("/v1/escritorio/financeiro/relatorios/exportacoes", { metodo: "POST", corpo: { visao: "clientes", formato: "DOC" }, cookie });
  assertEquals((await erro(semF)).detalhes?.campos, ["formato"]);
  const n = montar({ naoDono: true });
  const e = await n.pedir("/v1/escritorio/financeiro/relatorios/resumo", { cookie: await noEscritorio(n) });
  assertEquals([e.status, (await erro(e)).detalhes?.motivo], [403, "SO_SOCIO_DONO"]);
});

Deno.test("F3.55: a planilha é lida na API e ao banco vão só as células; arquivo ruim volta com o motivo", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const csv = new TextEncoder().encode("Nome;CPF\nRosa Almeida;529.982.247-25\n");
  const r = await m.pedir("/v1/escritorio/importacoes?oQue=CLIENTES&nome=clientes.csv", { bruto: csv, cookie });
  assertEquals(r.status, 201);
  assertEquals((await r.json()).abas, [{ nome: "clientes", colunas: ["Nome", "CPF"], linhas: [["Rosa Almeida", "529.982.247-25"]] }]);
  const pdf = await m.pedir("/v1/escritorio/importacoes?oQue=CLIENTES&nome=contrato.pdf", { bruto: new TextEncoder().encode("%PDF-1.7"), cookie });
  assertEquals([pdf.status, (await erro(pdf)).detalhes?.motivo], [400, "ARQUIVO_FORMATO"]);
  const sem = await m.pedir("/v1/escritorio/importacoes?oQue=TUDO&nome=a.csv", { bruto: csv, cookie });
  assertEquals((await erro(sem)).detalhes?.campos, ["oQue"]);
  const linha = await m.pedir(`/v1/escritorio/importacoes/${CLIENTE}/linhas/4`, { metodo: "PATCH", corpo: { campos: { documento: "" }, decisao: "PULAR" }, cookie });
  const lj = await linha.json(); assertEquals(lj.linha?.numero, 4, JSON.stringify(lj));
  const ruim = await m.pedir(`/v1/escritorio/importacoes/${CLIENTE}/linhas/4`, { metodo: "PATCH", corpo: { campos: { senha: "x" } }, cookie });
  assertEquals(ruim.status, 400);
});

Deno.test("F3.56: o backup do Astrea chega lido e comprimido; a API reconhece as abas e liga as colunas pelo modelo", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const backup = await comprimirJson({
    abas: [
      { nome: "Contatos", linhas: 1, colunas: ["Nome", "Tipo", "CPF/CNPJ", "Celular", "Observações"], celulas: [["Rosa Almeida", "Cliente", "529.982.247-25", "11 98451-2290", "x"]] },
      { nome: "Tarefas", linhas: 97, colunas: null, celulas: null },
      { nome: "Honorários", linhas: 1, colunas: ["Cliente", "Valor"], celulas: [["Rosa", "100"]] },
      { nome: "Processos", linhas: 1, colunas: ["Número", "Cliente", "Fase"], celulas: [["1000123-25.2025.5.02.0001", "Rosa Almeida", "Inicial"]] },
    ],
  });
  const r = await m.pedir("/v1/escritorio/importacoes?oQue=CLIENTES&origem=ASTREA&nome=backup.xlsx", { bruto: backup, cookie });
  assertEquals(r.status, 201);
  const d = await r.json();
  assertEquals([d.origem, d.modelo], ["ASTREA", "astrea-2026-11"]);
  assertEquals(d.sistema, [
    { nome: "Contatos", linhas: 1, destino: "CLIENTES", reconhecida: true, porModelo: { 0: "nome", 1: "tipo_contato", 2: "documento", 3: "telefone" } },
    { nome: "Tarefas", linhas: 97, destino: "TAREFAS", reconhecida: true, porModelo: {} },
    { nome: "Honorários", linhas: 1, destino: "FORA", reconhecida: false, porModelo: {} },
    // A parte 2: os processos chegam e viram a segunda prévia, depois dos clientes.
    { nome: "Processos", linhas: 1, destino: "CASOS", reconhecida: true, porModelo: { 0: "numero", 1: "cliente", 2: "etapa" } },
  ]);
  assertEquals(d.abas[1], { nome: "Tarefas", colunas: [], linhas: [] });
  assertEquals(d.abas[2].linhas, [["Rosa", "100"]]);
  const ruim = await m.pedir("/v1/escritorio/importacoes?oQue=CLIENTES&origem=ASTREA&nome=backup.xlsx", { bruto: new TextEncoder().encode("não é gzip"), cookie });
  assertEquals((await erro(ruim)).detalhes?.motivo, "ARQUIVO_FORMATO");
  const csv = new TextEncoder().encode("Nome do cliente;CPF/CNPJ;Celular\nRosa Almeida;529.982.247-25;11 98451-2290\n");
  const adv = await (await m.pedir("/v1/escritorio/importacoes?oQue=CLIENTES&origem=ADVBOX_PLANILHA&nome=clientes.csv", { bruto: csv, cookie })).json();
  assertEquals([adv.origem, adv.modelo, adv.sistema[0].porModelo], ["ADVBOX_PLANILHA", "advbox-2026-11", { 0: "nome", 1: "documento", 2: "telefone" }]);
  // A planilha de processos do ADVBOX: oQue = CASOS, ligada pelo modelo dos processos.
  const proc = new TextEncoder().encode("Processo;Cliente;Advogado responsável;Status\n1000123-25.2025.5.02.0001;Rosa Almeida;Marina;Ativo\n");
  const p = await (await m.pedir("/v1/escritorio/importacoes?oQue=CASOS&origem=ADVBOX_PLANILHA&nome=processos.csv", { bruto: proc, cookie })).json();
  assertEquals([p.oQue, p.sistema[0].destino, p.sistema[0].porModelo], ["CASOS", "CASOS", { 0: "numero", 1: "cliente", 2: "responsavel", 3: "situacao_processo" }]);
});

Deno.test("F1.15: o pedido de exclusão confere data, canal e quem pediu", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const ruim = await m.pedir(`/v1/escritorio/clientes/${CLIENTE}/exclusao/pedido`, { metodo: "POST", corpo: { pedidoEm: "18/11", canal: "FAX" }, cookie });
  assertEquals((await erro(ruim)).detalhes?.campos, ["pedidoEm", "canal"]);
  const ok = await m.pedir(`/v1/escritorio/clientes/${CLIENTE}/exclusao/pedido`, {
    metodo: "POST", corpo: { pedidoEm: "2026-11-18", canal: "WHATSAPP" }, cookie,
  });
  assertEquals(ok.status, 201);
  const sem = await m.pedir(`/v1/escritorio/clientes/${CLIENTE}/exclusao/recusar`, { metodo: "POST", corpo: { motivo: " " }, cookie });
  assertEquals((await erro(sem)).detalhes?.campos, ["motivo"]);
});

Deno.test("F1.15: excluir pede a conferência e o nome; quem não é a dona é recusado com o motivo", async () => {
  const corpo = { pedidoEm: "2026-11-18", canal: "TELEFONE", quemPediu: "TITULAR", versao: 2, nomeConfirmado: "Helena Prado" };
  const m = montar();
  const cookie = await noEscritorio(m);
  const sem = await m.pedir(`/v1/escritorio/clientes/${CLIENTE}/exclusao`, { metodo: "POST", corpo, cookie });
  assertEquals((await erro(sem)).detalhes?.campos, ["conferido"]);
  const ok = await m.pedir(`/v1/escritorio/clientes/${CLIENTE}/exclusao`, { metodo: "POST", corpo: { ...corpo, conferido: true }, cookie });
  assertEquals((await ok.json()).protocolo, "EXC-2026-0001");
  const ch = m.chamadas.find((c) => c.funcao === "portal_cliente_excluir_dados")!;
  assertEquals([ch.args.p_versao, (ch.args.p_dados as Record<string, unknown>).versao], [2, undefined]);
  const n = montar({ naoDono: true });
  const e = await n.pedir(`/v1/escritorio/clientes/${CLIENTE}/exclusao`, { metodo: "POST", corpo: { ...corpo, conferido: true }, cookie: await noEscritorio(n) });
  assertEquals((await erro(e)).detalhes?.motivo, "SO_SOCIO_DONO");
});

Deno.test("F1.16: arquivar a pedido pede a conferência, sem o nome; quem não é a dona é recusado", async () => {
  const corpo = { pedidoEm: "2026-11-18", canal: "EMAIL", quemPediu: "TITULAR", versao: 3 };
  const m = montar();
  const cookie = await noEscritorio(m);
  const sem = await m.pedir(`/v1/escritorio/clientes/${CLIENTE}/arquivar-lgpd`, { metodo: "POST", corpo, cookie });
  assertEquals((await erro(sem)).detalhes?.campos, ["conferido"]);
  const ok = await m.pedir(`/v1/escritorio/clientes/${CLIENTE}/arquivar-lgpd`, { metodo: "POST", corpo: { ...corpo, conferido: true }, cookie });
  assertEquals((await ok.json()).protocolo, "EXC-2026-0002");
  const ch = m.chamadas.find((c) => c.funcao === "portal_cliente_arquivar_lgpd")!;
  assertEquals([ch.args.p_versao, (ch.args.p_dados as Record<string, unknown>).versao], [3, undefined]);
  const n = montar({ naoDono: true });
  const e = await n.pedir(`/v1/escritorio/clientes/${CLIENTE}/arquivar-lgpd`, { metodo: "POST", corpo: { ...corpo, conferido: true }, cookie: await noEscritorio(n) });
  assertEquals((await erro(e)).detalhes?.motivo, "SO_SOCIO_DONO");
});

Deno.test("F1.15: os canais do pedido no domínio são os mesmos do banco", async () => {
  const { CANAIS_PEDIDO } = await import("@t3jus/domain");
  const sql = await Deno.readTextFile(new URL("../../migrations/0170_clientes_pendencias.sql", import.meta.url));
  const lista = /canal\s+text not null check \(canal in \(([^)]+)\)/.exec(sql)?.[1]?.match(/'([A-Z_]+)'/g)?.map((s) => s.slice(1, -1));
  assertEquals(lista, Object.keys(CANAIS_PEDIDO));
});

Deno.test("EX-06: a agenda pede um período válido e a pessoa do filtro; o escritório vem da sessão", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const r = await m.pedir(`/v1/escritorio/agenda?de=2026-11-16&ate=2026-11-22&pessoa=${LARA.toUpperCase()}`, { cookie });
  assertEquals(r.status, 200);
  const ch = m.chamadas.find((c) => c.funcao === "portal_agenda")!;
  assertEquals([ch.args.p_escritorio, ch.args.p_de, ch.args.p_ate, ch.args.p_de_quem], [AURORA, "2026-11-16", "2026-11-22", LARA]);
  assertEquals((await erro(await m.pedir("/v1/escritorio/agenda?de=16/11&ate=2026-11-22", { cookie }))).detalhes?.campos, ["de"]);
  assertEquals((await erro(await m.pedir("/v1/escritorio/agenda?de=2026-11-16&ate=2026-11-22&pessoa=x", { cookie }))).detalhes?.campos, ["pessoa"]);
});

Deno.test("EX-06, PT-03: marcar, remarcar com motivo e cancelar com motivo", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const dados = {
    tipo: "AUDIENCIA", titulo: "Conciliação", inicio: "2026-11-19T16:00:00-03:00", fim: "2026-11-19T17:00:00-03:00",
    modalidade: "VIRTUAL", linkSala: "https://sala.exemplo/1", responsavelId: ANA, lembrete: true,
  };
  const novo = await m.pedir("/v1/escritorio/compromissos", { corpo: dados, cookie });
  assertEquals(novo.status, 201);
  const ch = m.chamadas.find((c) => c.funcao === "portal_compromisso_marcar")!;
  assertEquals((ch.args.p_dados as Record<string, unknown>).tambemVai, []);
  const sem = await m.pedir(`/v1/escritorio/compromissos/${CLIENTE}`, { metodo: "PUT", corpo: { ...dados, versao: 1 }, cookie });
  assertEquals((await erro(sem)).detalhes?.campos, ["motivo"]);
  const com = await m.pedir(`/v1/escritorio/compromissos/${CLIENTE}`, { metodo: "PUT", corpo: { ...dados, versao: 1, motivo: "redesignada" }, cookie });
  assertEquals((await com.json()).versao, 2);
  const ed = m.chamadas.findLast((c) => c.funcao === "portal_compromisso_editar")!;
  assertEquals([(ed.args.p_dados as Record<string, unknown>).versao, ed.args.p_motivo], [undefined, "redesignada"]);
  const vazio = await m.pedir(`/v1/escritorio/compromissos/${CLIENTE}/cancelar`, { corpo: { versao: 2, motivo: " " }, cookie });
  assertEquals((await erro(vazio)).detalhes?.campos, ["motivo"]);
  const ok = await m.pedir(`/v1/escritorio/compromissos/${CLIENTE}/cancelar`, { corpo: { versao: 2, motivo: "acordo", avisar: true }, cookie });
  assertEquals((await ok.json()).versao, 3);
  assertEquals((await m.pedir("/v1/escritorio/compromissos/nao-e-id", { cookie })).status, 404);
});

Deno.test("EX-06: os tipos de compromisso no domínio são os mesmos do banco", async () => {
  const { TIPOS_COMPROMISSO, MODALIDADES } = await import("@t3jus/domain");
  const sql = await Deno.readTextFile(new URL("../../migrations/0180_portal_agenda.sql", import.meta.url));
  const lista = (re: RegExp) => re.exec(sql)?.[1]?.match(/'([A-Z_]+)'/g)?.map((s) => s.slice(1, -1));
  assertEquals(lista(/tipo\s+text not null check \(tipo in \(([^)]+)\)/), Object.keys(TIPOS_COMPROMISSO));
  assertEquals(lista(/modalidade\s+text not null check \(modalidade in \(([^)]+)\)/), Object.keys(MODALIDADES));
});

Deno.test("AP-05, IN-01: proposta com condições, marcar como enviada e registrar a resposta; o escritório vem da sessão", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const dados = {
    clienteId: CLIENTE, servico: "Divórcio consensual", escopo: "Petição e partilha.", responsavelId: ANA, validaAte: "2026-11-30",
    condicoes: [{ tipo: "PARCELADO", total: 400000, parcelas: 4, primeiro: "2026-12-15" }], retorno: { em: "2026-11-25", responsavelId: ANA },
  };
  const novo = await m.pedir("/v1/escritorio/propostas", { corpo: dados, cookie });
  assertEquals(novo.status, 201);
  const ch = m.chamadas.find((c) => c.funcao === "portal_proposta_criar")!;
  assertEquals([ch.args.p_escritorio, (ch.args.p_dados as { condicoes: unknown[] }).condicoes, (ch.args.p_dados as { rascunho: boolean }).rascunho],
    [AURORA, dados.condicoes, false]);
  assertEquals((await (await m.pedir(`/v1/escritorio/propostas/${CLIENTE}/enviada`, { corpo: { versao: 2 }, cookie })).json()).versao, 3);
  const r = await m.pedir(`/v1/escritorio/propostas/${CLIENTE}/resposta`, { corpo: { versao: 3, resposta: "RECUSOU", em: "2026-11-18", canal: "WHATSAPP", motivo: "VALOR_ALTO" }, cookie });
  assertEquals((await r.json()).situacao, "RECUSADA");
  const rs = m.chamadas.find((c) => c.funcao === "portal_proposta_resposta")!;
  assertEquals([rs.args.p_versao, (rs.args.p_dados as Record<string, unknown>).versao], [3, undefined]);
  assertEquals((await erro(await m.pedir("/v1/escritorio/propostas?mostrar=todas", { cookie }))).detalhes?.campos, ["mostrar"]);
  assertEquals((await erro(await m.pedir("/v1/escritorio/comercial/funil?periodo=7", { cookie }))).detalhes?.campos, ["periodo"]);
  assertEquals((await (await m.pedir("/v1/escritorio/comercial/funil?periodo=12", { cookie })).json()).periodo, "12");
  assertEquals((await erro(await m.pedir("/v1/escritorio/comercial/retornos?responsavel=x", { cookie }))).detalhes?.campos, ["responsavel"]);
});

Deno.test("AP-03: encerrar sem proposta e voltar ao funil passam o cliente da rota e o motivo; o escritório vem da sessão", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  await m.pedir(`/v1/escritorio/clientes/${CLIENTE}/funil`, { metodo: "PUT", corpo: { motivo: "NAO_VOLTOU", nota: "Liguei duas vezes.", escritorioId: "x" }, cookie });
  const ch = m.chamadas.find((c) => c.funcao === "portal_funil_encerrar")!;
  assertEquals([ch.args.p_escritorio, ch.args.p_cliente, ch.args.p_motivo, ch.args.p_nota], [AURORA, CLIENTE, "NAO_VOLTOU", "Liguei duas vezes."]);
  await m.pedir(`/v1/escritorio/clientes/${CLIENTE}/funil/voltar`, { metodo: "POST", cookie });
  assertEquals(m.chamadas.find((c) => c.funcao === "portal_funil_voltar")!.args.p_cliente, CLIENTE);
  await m.pedir(`/v1/escritorio/clientes/${CLIENTE}/funil`, { cookie });
  assertEquals(m.chamadas.find((c) => c.funcao === "portal_cliente_funil")!.args.p_escritorio, AURORA);
  assertEquals((await erro(await m.pedir("/v1/escritorio/clientes/x/funil", { cookie }))).codigo, "NOT_FOUND");
});

Deno.test("AP-03: os motivos de sair do funil no domínio são os mesmos do banco", async () => {
  const { MOTIVOS_FORA_FUNIL, MOTIVOS_SAIDA_FUNIL } = await import("@t3jus/domain");
  const sql = await Deno.readTextFile(new URL("../../migrations/0550_funil_sem_proposta.sql", import.meta.url));
  const lista = /motivo\s+text not null check \(motivo in \(([^)]+)\)/.exec(sql)?.[1]?.match(/'([A-Z_]+)'/g)?.map((x) => x.slice(1, -1));
  assertEquals(lista, Object.keys(MOTIVOS_FORA_FUNIL));
  assertEquals(Object.keys(MOTIVOS_SAIDA_FUNIL), Object.keys(MOTIVOS_FORA_FUNIL));
});

Deno.test("AP-05, CH-06: situações, motivos e tipos de honorário no domínio são os mesmos do banco", async () => {
  const { MOTIVOS_RECUSA, TIPOS_HONORARIO } = await import("@t3jus/domain");
  const sql = await Deno.readTextFile(new URL("../../migrations/0190_portal_comercial.sql", import.meta.url));
  const lista = (re: RegExp) => re.exec(sql)?.[1]?.match(/'([A-Z_]+)'/g)?.map((s) => s.slice(1, -1));
  assertEquals(lista(/motivo_recusa\s+text check \(motivo_recusa in \(([^)]+)\)/), Object.keys(MOTIVOS_RECUSA));
  assertEquals(lista(/tipo\s+text not null check \(tipo in \(([^)]+)\)/), Object.keys(TIPOS_HONORARIO));
});

Deno.test("CH-01, CH-04, IN-01: criar o contrato da proposta, registrar a assinatura, mudar com motivo e informar a base; o escritório vem da sessão", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const dados = {
    clienteId: CLIENTE, propostaId: CLIENTE, objeto: "Aposentadoria por idade", responsavelId: ANA, advogados: [ANA],
    condicoes: [{ tipo: "PARCELADO", total: 200000, parcelas: 3, primeiro: "2026-12-10" }],
  };
  const novo = await m.pedir("/v1/escritorio/contratos", { corpo: dados, cookie });
  assertEquals(novo.status, 201);
  const ch = m.chamadas.find((c) => c.funcao === "portal_contrato_criar_area")!;
  assertEquals([ch.args.p_escritorio, (ch.args.p_dados as { advogados: string[] }).advogados], [AURORA, [ANA]]);
  // CH-11: sem o caso, a assinatura é recusada; com ele, vai junto.
  assertEquals((await erro(await m.pedir(`/v1/escritorio/contratos/${CLIENTE}/assinatura`, { corpo: { versao: 1, assinadoEm: "2026-11-18" }, cookie }))).detalhes?.campos, ["caso"]);
  const a = await (await m.pedir(`/v1/escritorio/contratos/${CLIENTE}/assinatura`, { corpo: { versao: 1, assinadoEm: "2026-11-18", caso: { modo: "SEM" } }, cookie })).json();
  assertEquals([a.versao, a.recebimentos], [2, 3]);
  const sem = await erro(await m.pedir(`/v1/escritorio/contratos/${CLIENTE}`, { metodo: "PUT", corpo: { versao: 2, ...dados }, cookie }));
  assertEquals(sem.detalhes?.campos, ["motivo"]);
  const ed = m.chamadas.find((c) => c.funcao === "portal_contrato_condicoes_area")!;
  assertEquals([ed.args.p_versao, (ed.args.p_dados as Record<string, unknown>).versao, (ed.args.p_dados as Record<string, unknown>).clienteId], [2, undefined, undefined]);
  const b = await (await m.pedir(`/v1/escritorio/recebimentos/${CLIENTE}/base`, { corpo: { valor: 211800, fonte: "EXTRATO", vencimento: "2026-12-15" }, cookie })).json();
  assertEquals(b.valor, 63540);
  assertEquals((await erro(await m.pedir("/v1/escritorio/contratos?mostrar=todos", { cookie }))).detalhes?.campos, ["mostrar"]);
  assertEquals((await (await m.pedir("/v1/escritorio/contratos?mostrar=base", { cookie })).json()).mostrar, "BASE");
  assertEquals((await m.pedir("/v1/escritorio/contratos/nao-e-id", { cookie })).status, 404);
});

Deno.test("F3.116, F3.117: a escolha dos arquivados, a prévia agrupada do financeiro e a linha até 10.001; o escritório vem da sessão", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const base = `/v1/escritorio/importacoes/${CLIENTE}`;
  const r = await (await m.pedir(`${base}/arquivados`, { metodo: "PATCH", corpo: { versao: 3, arquivados: "ENCERRADOS" }, cookie })).json();
  assertEquals([r.versao, r.arquivados], [4, "ENCERRADOS"]);
  const ch = m.chamadas.find((c) => c.funcao === "portal_importacao_arquivados")!;
  assertEquals([ch.args.p_escritorio, ch.args.p_versao, ch.args.p_dados], [AURORA, 3, { arquivados: "ENCERRADOS" }]);
  assertEquals((await erro(await m.pedir(`${base}/arquivados`, { metodo: "PATCH", corpo: { versao: 3, arquivados: "TODOS" }, cookie }))).detalhes?.campos, ["arquivados"]);
  // ADVBOX: a escolha vem com as colunas.
  await m.pedir(`${base}/colunas`, { metodo: "PATCH", corpo: { versao: 2, ligacao: { "0": "numero" }, arquivados: "FORA" }, cookie });
  assertEquals((m.chamadas.find((c) => c.funcao === "portal_importacao_colunas")!.args.p_dados as { arquivados: string }).arquivados, "FORA");
  // A prévia agrupada.
  await m.pedir(`${base}/lancamentos?grupo=DESPESAS&q=aluguel&pular=50`, { cookie });
  const l = m.chamadas.find((c) => c.funcao === "portal_importacao_lancamentos")!;
  assertEquals([l.args.p_escritorio, l.args.p_grupo, l.args.p_situacao, l.args.p_q, l.args.p_pular], [AURORA, "DESPESAS", null, "aluguel", 50]);
  assertEquals((await erro(await m.pedir(`${base}/lancamentos?grupo=OUTRO`, { cookie }))).detalhes?.campos, ["grupo"]);
  assertEquals((await m.pedir("/v1/escritorio/importacoes/nao-e-id/lancamentos", { cookie })).status, 404);
  // O backup traz até 10.000 linhas: a última é a 10.001.
  assertEquals((await (await m.pedir(`${base}/linhas/10001`, { metodo: "PATCH", corpo: { decisao: "PULAR" }, cookie })).json()).linha.numero, 10001);
  assertEquals((await m.pedir(`${base}/linhas/10002`, { metodo: "PATCH", corpo: { decisao: "PULAR" }, cookie })).status, 404);
});

Deno.test("F3.56 parte 3: o financeiro do sistema antigo na ficha do cliente; o escritório vem da sessão", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const r = await (await m.pedir(`/v1/escritorio/clientes/${CLIENTE}/anterior`, { cookie })).json();
  assertEquals([r.anterior.origem, r.anterior.pago], ["ASTREA", 200000]);
  const ch = m.chamadas.find((c) => c.funcao === "portal_cliente_anterior")!;
  assertEquals([ch.args.p_escritorio, ch.args.p_cliente], [AURORA, CLIENTE]);
  assertEquals((await m.pedir("/v1/escritorio/clientes/nao-e-id/anterior", { cookie })).status, 404);
});

Deno.test("F3.110, F3.111, CH-10: as abas da ficha, a assinatura que abre o caso e abrir o caso depois; o escritório vem da sessão", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  for (const aba of ["propostas", "contratos", "casos"]) {
    assertEquals((await (await m.pedir(`/v1/escritorio/clientes/${CLIENTE}/${aba}`, { cookie })).json())[aba], []);
  }
  assertEquals(m.chamadas.filter((c) => c.funcao === "portal_cliente_itens").map((c) => [c.args.p_escritorio, c.args.p_tipo]),
    [[AURORA, "PROPOSTAS"], [AURORA, "CONTRATOS"], [AURORA, "CASOS"]]);
  assertEquals((await m.pedir("/v1/escritorio/clientes/nao-e-id/casos", { cookie })).status, 404);
  const caso = { modo: "NOVO", nome: "Ferreira Prado x INSS", area: "PREVIDENCIARIO", responsavelId: ANA, papel: "AUTOR" };
  const a = await (await m.pedir(`/v1/escritorio/contratos/${CLIENTE}/assinatura`, { corpo: { versao: 1, assinadoEm: "2026-11-18", caso }, cookie })).json();
  assertEquals([a.versao, a.casoId, a.podeVerCaso], [2, CLIENTE, true]);
  const ch = m.chamadas.find((c) => c.funcao === "portal_contrato_assinatura_caso")!;
  assertEquals([ch.args.p_escritorio, ch.args.p_assinado_em, (ch.args.p_caso as { modo: string }).modo], [AURORA, "2026-11-18", "NOVO"]);
  assertEquals((await erro(await m.pedir(`/v1/escritorio/contratos/${CLIENTE}/assinatura`, { corpo: { versao: 1, caso: { modo: "TALVEZ" } }, cookie }))).detalhes?.campos, ["caso"]);
  assertEquals((await (await m.pedir(`/v1/escritorio/contratos/${CLIENTE}/caso`, { cookie })).json()).escolhe, true);
  const ab = await (await m.pedir(`/v1/escritorio/contratos/${CLIENTE}/caso`, { corpo: { caso: { modo: "JUNTAR", casoId: CLIENTE } }, cookie })).json();
  assertEquals(ab.casoId, CLIENTE);
  assertEquals(m.chamadas.find((c) => c.funcao === "portal_contrato_caso")!.args.p_escritorio, AURORA);
  // CH-11, F3.125: "não tem caso" pelo Abrir o caso e a lista dos assinados sem caso.
  await m.pedir(`/v1/escritorio/contratos/${CLIENTE}/caso`, { corpo: { caso: { modo: "SEM" } }, cookie });
  assertEquals((m.chamadas.filter((c) => c.funcao === "portal_contrato_caso").at(-1)!.args.p_caso as { modo: string }).modo, "SEM");
  assertEquals((await (await m.pedir("/v1/escritorio/contratos/sem-caso", { cookie })).json()).contratos, []);
  assertEquals(m.chamadas.find((c) => c.funcao === "portal_contratos_sem_caso")!.args.p_escritorio, AURORA);
});

Deno.test("EX-12: as inscrições de cada advogado no contrato; a pessoa e o escritório vêm da sessão", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const insc = "1b4e28ba-2fa1-11d2-883f-0016d3cca427";
  await m.pedir("/v1/escritorio/contratos", {
    corpo: { clienteId: CLIENTE, objeto: "Aposentadoria", responsavelId: ANA, advogados: [ANA], inscricoes: { [ANA]: [insc.toUpperCase()] },
             condicoes: [{ tipo: "FIXO", valor: 100000, vencimento: "2026-12-10" }] }, cookie,
  });
  const ch = m.chamadas.find((c) => c.funcao === "portal_contrato_criar_area")!;
  assertEquals((ch.args.p_dados as { inscricoes: Record<string, string[]> }).inscricoes, { [ANA]: [insc.toUpperCase()] });
  const ok = await (await m.pedir(`/v1/escritorio/contratos/${CLIENTE}/advogados/${ANA}/inscricoes`, { metodo: "PUT", corpo: { versao: 3, inscricoes: [insc.toUpperCase()] }, cookie })).json();
  assertEquals([ok.versao, ok.frase], [4, "OAB/SP nº 287.104"]);
  const mu = m.chamadas.find((c) => c.funcao === "portal_contrato_inscricoes_mudar")!;
  assertEquals([mu.args.p_escritorio, mu.args.p_alvo, mu.args.p_ids], [AURORA, ANA, [insc]]);
  const vazio = await erro(await m.pedir(`/v1/escritorio/contratos/${CLIENTE}/advogados/${ANA}/inscricoes`, { metodo: "PUT", corpo: { versao: 3, inscricoes: [] }, cookie }));
  assertEquals(vazio.detalhes?.motivos, { [`inscricoes.${ANA}`]: "INSCRICAO_OBRIGATORIA" });
  assertEquals((await m.pedir(`/v1/escritorio/contratos/${CLIENTE}/advogados/nao-e-id/inscricoes`, { metodo: "PUT", corpo: { versao: 3, inscricoes: [insc] }, cookie })).status, 404);
  assertEquals((await (await m.pedir("/v1/escritorio/pessoas/oab", { cookie })).json()).pessoas[0].id, ANA);
});

Deno.test("AP-05: baixar a proposta em .docx no timbrado, na pasta do escritório da sessão, por link temporário", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const r = await (await m.pedir(`/v1/escritorio/propostas/${CLIENTE}/docx`, { corpo: {}, cookie })).json();
  assertMatch(r.url, /^https:\/\/storage\.exemplo\/ler\//);
  const caminho = `${AURORA}/propostas/${CLIENTE}-v2.docx`;
  assertEquals(m.storage.leituras.at(-1), { caminho, segundos: 60, nome: "proposta-p-2026-014-gabriela-teixeira.docx" });
  const texto = await paragrafosDocx(m.storage.bytes.get(caminho)!);
  assert(texto.includes("Revisão do benefício"));
  assert(texto.includes("Recurso, se negado."));
  assert(texto.some((t) => t.startsWith("Parcelado: R$ 3.000,00 em 3 parcelas")));
  assert(texto.includes("Esta proposta vale até 30/11/2026."));
  assertEquals((await m.pedir("/v1/escritorio/propostas/nao-e-id/docx", { corpo: {}, cookie })).status, 404);
});

Deno.test("F3.92: com o logo do escritório, a proposta em Word leva o logo no cabeçalho, no lugar do nome", async () => {
  const m = montar({ logo: true });
  m.storage.bytes.set(`${AURORA}/logos/${LOGO_TESTE}.png`, new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3]));
  const cookie = await noEscritorio(m);
  await m.pedir(`/v1/escritorio/propostas/${CLIENTE}/docx`, { corpo: {}, cookie });
  const bytes = m.storage.bytes.get(`${AURORA}/propostas/${CLIENTE}-v2.docx`)!;
  const docx = lerZip(bytes);
  assertEquals((await abrirEntrada(bytes, docx.get("word/media/logo.png")!)).length, 11);
  const cab = await abrirTexto(bytes, docx.get("word/header1.xml")!);
  assertMatch(cab, /r:embed="rIdLogo"/);
  // 1200 × 300 px cabe em 72 × 18 mm (a altura manda).
  assertMatch(cab, /cx="2592000" cy="648000"/);
  assertMatch(cab, /OAB\/BA 1\.234/);
  assertEquals(cab.includes(">Aurora Advocacia<"), false);
  // Sem logo, o cabeçalho segue com o nome em letra.
  const sem = montar();
  const c2 = await noEscritorio(sem);
  await sem.pedir(`/v1/escritorio/propostas/${CLIENTE}/docx`, { corpo: {}, cookie: c2 });
  const d2 = lerZip(sem.storage.bytes.get(`${AURORA}/propostas/${CLIENTE}-v2.docx`)!);
  assertEquals(d2.has("word/media/logo.png"), false);
});

Deno.test("CH-01: situações do contrato e fontes da base no domínio são as mesmas do banco", async () => {
  const { SITUACOES_CONTRATO, FONTES_BASE } = await import("@t3jus/domain");
  const sql = await Deno.readTextFile(new URL("../../migrations/0200_portal_contratos.sql", import.meta.url));
  const lista = (re: RegExp) => re.exec(sql)?.[1]?.match(/'([A-Z_]+)'/g)?.map((s) => s.slice(1, -1));
  assertEquals(lista(/fonte\s+text not null check \(fonte in \(([^)]+)\)/), Object.keys(FONTES_BASE));
  assertEquals([...new Set(lista(/transicoes_permitidas \(tabela, de, para\) values\s+(\('contratos'[\s\S]*?);/)?.filter((x) => x !== "contratos"))].sort(),
    Object.keys(SITUACOES_CONTRATO).sort());
});

Deno.test("FI-01 a FI-04, FI-14: A receber, ficha de parcelas, registrar recebimento e anotar cobrança; o escritório vem da sessão", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const l = await (await m.pedir(`/v1/escritorio/financeiro/receber?mostrar=vencidas&forma=pix&responsavel=${ANA.toUpperCase()}`, { cookie })).json();
  assertEquals([l.mostrar, l.forma, l.responsavel], ["VENCIDAS", "PIX", ANA.toLowerCase()]);
  assertEquals((await erro(await m.pedir("/v1/escritorio/financeiro/receber?mostrar=tudo", { cookie }))).detalhes?.campos, ["mostrar"]);
  assertEquals((await erro(await m.pedir("/v1/escritorio/financeiro/receber?forma=ouro", { cookie }))).detalhes?.campos, ["forma"]);
  assertEquals((await erro(await m.pedir("/v1/escritorio/financeiro/receber?responsavel=x", { cookie }))).detalhes?.campos, ["responsavel"]);
  assertEquals((await (await m.pedir(`/v1/escritorio/financeiro/contratos/${CLIENTE}`, { cookie })).json()).id, CLIENTE);
  assertEquals((await m.pedir("/v1/escritorio/financeiro/contratos/nao-e-id", { cookie })).status, 404);
  const r = await m.pedir(`/v1/escritorio/financeiro/parcelas/${CLIENTE}/recebimentos`, { corpo: { valor: 85000, recebidoEm: "2026-11-18", forma: "PIX", recibo: true }, cookie });
  assertEquals([r.status, (await r.json()).recibo.numero], [201, 1]);
  const ch = m.chamadas.find((c) => c.funcao === "portal_financeiro_receber_registrar_recibo")!;
  assertEquals([ch.args.p_escritorio, ch.args.p_parcela], [AURORA, CLIENTE]);
  // FI-14: quem pagou vai ao banco; o recibo abre pelo id do recebimento.
  await m.pedir(`/v1/escritorio/financeiro/parcelas/${CLIENTE}/recebimentos`, {
    corpo: { valor: 85000, recebidoEm: "2026-11-18", forma: "PIX", recibo: true, pagador: { tipo: "OUTRO", nome: "Marta", documento: "20577138499" } }, cookie });
  assertEquals((m.chamadas.filter((c) => c.funcao === "portal_financeiro_receber_registrar_recibo").at(-1)!.args.p_dados as Record<string, unknown>).pagador,
    { tipo: "OUTRO", nome: "Marta", documento: "20577138499" });
  const rb = await m.pedir(`/v1/escritorio/recibos/${CLIENTE}`, { cookie });
  assertEquals((await rb.json()).numero.numero, 187);
  // F3.93: o PDF do recibo sai do servidor, fica guardado no escritório da sessão e abre por link curto.
  const pdf = await (await m.pedir(`/v1/escritorio/recibos/${CLIENTE}/pdf`, { cookie })).json();
  assertEquals([pdf.nome, m.storage.guardados.get(`${AURORA}/recibos/${CLIENTE}.pdf`)?.tipo], ["recibo-2026-0187-helio-correa.pdf", "application/pdf"]);
  assertEquals(new TextDecoder().decode(m.storage.bytes.get(`${AURORA}/recibos/${CLIENTE}.pdf`)!.slice(0, 5)), "%PDF-");
  assertEquals(m.storage.leituras.at(-1)!.segundos, 60);
  assertEquals(m.chamadas.find((c) => c.funcao === "portal_recibo")!.args, { p_pessoa: ANA, p_escritorio: AURORA, p_pagamento: CLIENTE });
  assertEquals((await m.pedir("/v1/escritorio/recibos/nao-e-id", { cookie })).status, 404);
  const acima = await erro(await m.pedir(`/v1/escritorio/financeiro/parcelas/${CLIENTE}/recebimentos`, { corpo: { valor: 90000, recebidoEm: "2026-11-18", forma: "PIX" }, cookie }));
  assertEquals([acima.detalhes?.motivo, acima.detalhes?.falta], ["VALOR_ACIMA_DO_SALDO", 85000]);
  const c = await m.pedir(`/v1/escritorio/financeiro/parcelas/${CLIENTE}/cobranca`, {
    corpo: { tipo: "LIGACAO", motivo: "Não atende", proxData: "2026-11-19", proxOque: "Ligar de novo", proxResponsavelId: ANA }, cookie });
  assertEquals(c.status, 201);
});

Deno.test("FI-13 (F3.24): contas que repetem, a ficha e a mudança; o escritório vem da sessão", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  assertEquals((await (await m.pedir("/v1/escritorio/financeiro/recorrencias", { cookie })).json()).ativas, []);
  assertEquals((await (await m.pedir(`/v1/escritorio/financeiro/recorrencias/${CLIENTE}`, { cookie })).json()).id, CLIENTE);
  assertEquals((await m.pedir("/v1/escritorio/financeiro/recorrencias/nao-e-id", { cookie })).status, 404);
  const r = await m.pedir(`/v1/escritorio/financeiro/recorrencias/${CLIENTE}/mudancas`, {
    corpo: { tipo: "VALOR", aPartirDe: "2026-12-01", valor: 378000, dia: 20, motivo: "Reajuste" }, cookie });
  assertEquals(r.status, 201);
  const ch = m.chamadas.find((c) => c.funcao === "portal_recorrencia_mudar")!;
  assertEquals([ch.args.p_escritorio, ch.args.p_rec, (ch.args.p_dados as { valor: number }).valor], [AURORA, CLIENTE, 378000]);
  assertEquals((await erro(await m.pedir(`/v1/escritorio/financeiro/recorrencias/${CLIENTE}/mudancas`, { corpo: { tipo: "PAUSAR" }, cookie }))).codigo, "VALIDATION_ERROR");
  const sem = await erro(await m.pedir(`/v1/escritorio/financeiro/recorrencias/${CLIENTE}/mudancas`, { corpo: { tipo: "ENCERRAR", aPartirDe: "2026-12-01" }, cookie }));
  assertEquals(sem.detalhes?.motivos, { motivo: "MOTIVO_OBRIGATORIO" });
});

Deno.test("FI-13: os motivos de encerrar do domínio são os mesmos do banco", async () => {
  const { MOTIVOS_ENCERRAR } = await import("@t3jus/domain");
  const sql = await Deno.readTextFile(new URL("../../migrations/0534_recorrencia_mudancas.sql", import.meta.url));
  const lista = /v_motivo not in \(([^)]+)\)/.exec(sql)?.[1]?.match(/'([^']+)'/g)?.map((x) => x.slice(1, -1));
  assertEquals(lista, [...MOTIVOS_ENCERRAR]);
});

Deno.test("FI-17: as formas de pagamento do domínio são as mesmas do banco", async () => {
  const { FORMAS_PAGAMENTO } = await import("@t3jus/domain");
  const sql = await Deno.readTextFile(new URL("../../migrations/0220_portal_financeiro_receber.sql", import.meta.url));
  const formas = /select p in \(([^)]+)\)/.exec(sql)?.[1]?.match(/'([A-Z_]+)'/g)?.map((x) => x.slice(1, -1));
  assertEquals(formas, Object.keys(FORMAS_PAGAMENTO));
});

Deno.test("FI-01, FI-07, FI-13: A pagar, lançar conta, marcar paga e reembolso; o escritório vem da sessão", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  assertEquals((await (await m.pedir("/v1/escritorio/financeiro/pagar?mostrar=mes", { cookie })).json()).mostrar, "MES");
  assertEquals((await (await m.pedir("/v1/escritorio/financeiro/pagar", { cookie })).json()).mostrar, "SEMANA");
  assertEquals((await erro(await m.pedir("/v1/escritorio/financeiro/pagar?mostrar=tudo", { cookie }))).detalhes?.campos, ["mostrar"]);
  const l = await m.pedir("/v1/escritorio/financeiro/contas", {
    corpo: { descricao: "Custas recursais", categoria: "CUSTAS", valor: 48500, vencimento: "2026-11-19", adiantada: true, clienteId: CLIENTE, reembolsoComo: "LEVANTAMENTO" }, cookie });
  assertEquals(l.status, 201);
  const ch = m.chamadas.find((c) => c.funcao === "portal_financeiro_conta_lancar")!;
  assertEquals([ch.args.p_escritorio, (ch.args.p_dados as { repete: boolean }).repete], [AURORA, false]);
  assertEquals((await m.pedir(`/v1/escritorio/financeiro/contas/${CLIENTE}/paga`, { corpo: { valor: 48500, pagaEm: "2026-11-18" }, cookie })).status, 200);
  const fut = await erro(await m.pedir(`/v1/escritorio/financeiro/contas/${CLIENTE}/paga`, { corpo: { valor: 48500, pagaEm: "2026-11-20" }, cookie }));
  assertEquals(fut.detalhes?.motivo, "DATA_NO_FUTURO");
  assertEquals((await (await m.pedir(`/v1/escritorio/financeiro/contas/${CLIENTE}/reembolso`, { corpo: { reembolsadoEm: "2026-11-18" }, cookie })).json()).reembolsadoEm, "2026-11-18");
  assertEquals((await m.pedir("/v1/escritorio/financeiro/contas/nao-e-id/paga", { corpo: {}, cookie })).status, 404);
});

Deno.test("F3.23, FI-07: o caso na conta adiantada, a parcela em que volta e o adiantado na ficha do contrato", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const a = await (await m.pedir(`/v1/escritorio/financeiro/adiantar?cliente=${CLIENTE.toUpperCase()}`, { cookie })).json();
  assertEquals(a.cliente, CLIENTE);
  assertEquals((await erro(await m.pedir("/v1/escritorio/financeiro/adiantar?cliente=x", { cookie }))).detalhes?.campos, ["cliente"]);
  await m.pedir("/v1/escritorio/financeiro/contas", {
    corpo: { descricao: "Custas da apelação", categoria: "CUSTAS", valor: 124836, vencimento: "2026-11-21", adiantada: true, clienteId: CLIENTE, casoId: ANA, reembolsoComo: "PROXIMA_PARCELA" }, cookie });
  const ch = m.chamadas.find((c) => c.funcao === "portal_financeiro_conta_lancar")!;
  assertEquals((ch.args.p_dados as { casoId: string }).casoId, ANA);
  const f = await (await m.pedir(`/v1/escritorio/financeiro/contratos/${CLIENTE}`, { cookie })).json();
  assertEquals([f.id, f.adiantados[0].descricao], [CLIENTE, "Custas da apelação"]);
  assertEquals(m.chamadas.find((c) => c.funcao === "portal_financeiro_contrato_adiantados")!.args.p_escritorio, AURORA);
});

Deno.test("FI-05, FI-06, FI-12: Repasses, proposta, registrar, feito, dispensar e prestação; o escritório vem da sessão", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  assertEquals((await m.pedir("/v1/escritorio/financeiro/repasses", { cookie })).status, 200);
  assertEquals((await m.pedir("/v1/escritorio/financeiro/repasses/proposta", { corpo: { casoId: CLIENTE, clienteId: CLIENTE, valor: 100 }, cookie })).status, 200);
  const r = await m.pedir("/v1/escritorio/financeiro/repasses", {
    corpo: { tipo: "RPV", casoId: CLIENTE, clienteId: CLIENTE, valor: 100, entrouEm: "2026-11-17", divisao: [{ para: "CLIENTE", valor: 100 }] }, cookie });
  assertEquals(r.status, 201);
  const ch = m.chamadas.find((c) => c.funcao === "portal_financeiro_levantamento_registrar")!;
  assertEquals([ch.args.p_escritorio, (ch.args.p_dados as { divisao: unknown[] }).divisao.length], [AURORA, 1]);
  assertEquals((await m.pedir(`/v1/escritorio/financeiro/repasses/${CLIENTE}`, { cookie })).status, 200);
  assertEquals((await m.pedir("/v1/escritorio/financeiro/repasses/nao-e-id", { cookie })).status, 404);
  assertEquals((await (await m.pedir(`/v1/escritorio/financeiro/destinacoes/${CLIENTE}/feito`, { corpo: { feitoEm: "2026-11-18" }, cookie })).json()).feitoEm, "2026-11-18");
  assertEquals((await erro(await m.pedir(`/v1/escritorio/financeiro/destinacoes/${CLIENTE}/dispensar`, { corpo: {}, cookie }))).detalhes?.motivo, "MOTIVO_OBRIGATORIO");
  assertEquals((await m.pedir(`/v1/escritorio/financeiro/repasses/${CLIENTE}/prestacao`, { corpo: {}, cookie })).status, 200);
});

Deno.test("FI-05: tipos de levantamento e destinações do domínio são os mesmos do banco", async () => {
  const { TIPOS_LEVANTAMENTO, PARA_DESTINACAO, PRAZO_REPASSE_DIAS, somarDiasUteis } = await import("@t3jus/domain");
  const sql = await Deno.readTextFile(new URL("../../migrations/0280_portal_financeiro_repasses.sql", import.meta.url));
  const lista = (re: RegExp) => re.exec(sql)?.[1]?.match(/'([A-Z_]+)'/g)?.map((x) => x.slice(1, -1));
  assertEquals(lista(/tipo\s+text not null check \(tipo in \(([^)]+)\)/), Object.keys(TIPOS_LEVANTAMENTO));
  assertEquals(lista(/para\s+text not null check \(para in \(([^)]+)\)/), Object.keys(PARA_DESTINACAO));
  assertEquals(/prazo_repasse_dias\(\) returns integer\s+language sql immutable\s+as \$\$ select (\d+)/.exec(sql)?.[1], String(PRAZO_REPASSE_DIAS));
  assertEquals(somarDiasUteis("2026-11-19", 3), "2026-11-25"); // 20/11 é feriado nacional (0552)
});

Deno.test("FI-09, FI-21: Resumo, Caixa e exportação para o contador; o escritório vem da sessão", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  assertEquals((await (await m.pedir("/v1/escritorio/financeiro/resumo", { cookie })).json()).escritorio, AURORA);
  assertEquals((await (await m.pedir("/v1/escritorio/financeiro/caixa", { cookie })).json()).escritorio, AURORA);
  assertEquals((await (await m.pedir("/v1/escritorio/financeiro/exportacoes/previa?mes=2026-10-01", { cookie })).json()).mes, "2026-10-01");
  assertEquals((await erro(await m.pedir("/v1/escritorio/financeiro/exportacoes/previa?mes=outubro", { cookie }))).detalhes?.campos, ["mes"]);
  const e = await m.pedir("/v1/escritorio/financeiro/exportacoes", { corpo: { mes: "2026-10-01", formato: "CSV" }, cookie });
  assertEquals(e.status, 201);
  const ch = m.chamadas.find((c) => c.funcao === "portal_financeiro_exportar")!;
  assertEquals(ch.args.p_escritorio, AURORA);
  assertEquals((await erro(await m.pedir("/v1/escritorio/financeiro/exportacoes", { corpo: { mes: "2026-10-01", formato: "PDF" }, cookie }))).detalhes?.campos, ["formato"]);
});

Deno.test("PD-07, AP-02: Conversas, lista, conversa, assumir, devolver, passar e escrever; o escritório vem da sessão", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const l = await (await m.pedir("/v1/escritorio/conversas?mostrar=resolvidas&q=Marta", { cookie })).json();
  assertEquals([l.filtro, l.busca, l.escritorio], ["RESOLVIDAS", "Marta", AURORA]);
  assertEquals((await erro(await m.pedir("/v1/escritorio/conversas?mostrar=todas", { cookie }))).detalhes?.campos, ["mostrar"]);
  assertEquals((await (await m.pedir(`/v1/escritorio/conversas/${CLIENTE}`, { cookie })).json()).id, CLIENTE);
  assertEquals((await (await m.pedir(`/v1/escritorio/conversas/${CLIENTE}/assumir`, { corpo: { versao: 2 }, cookie })).json()).versao, 3);
  assertEquals((await erro(await m.pedir(`/v1/escritorio/conversas/${CLIENTE}/devolver`, { corpo: { versao: 3, registrarAtendimento: true }, cookie }))).detalhes?.campos, ["nota"]);
  assertEquals((await (await m.pedir(`/v1/escritorio/conversas/${CLIENTE}/devolver`, { corpo: { versao: 3, nota: "Liga às 14h", registrarAtendimento: true }, cookie })).json()).versao, 4);
  assertEquals((await erro(await m.pedir(`/v1/escritorio/conversas/${CLIENTE}/passar`, { corpo: { versao: 4, pessoa: "Paula" }, cookie }))).detalhes?.campos, ["pessoa"]);
  await m.pedir(`/v1/escritorio/conversas/${CLIENTE}/passar`, { corpo: { versao: 4, pessoa: AURORA.toUpperCase(), recado: "Confere?" }, cookie });
  assertEquals((m.chamadas.find((c) => c.funcao === "portal_conversa_passar")!.args.p_dados as { pessoa: string }).pessoa, AURORA);
  const e = await m.pedir(`/v1/escritorio/conversas/${CLIENTE}/mensagens`, { corpo: { texto: "Oi, Marta" }, cookie });
  assertEquals(e.status, 201);
  assertEquals((await erro(await m.pedir(`/v1/escritorio/conversas/${CLIENTE}/mensagens`, { corpo: { texto: "  " }, cookie }))).detalhes?.campos, ["texto"]);
});

Deno.test("PA-04: WhatsApp e IA, o número do Brasil vira E.164, nada de token, e o escritório vem da sessão", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  assertEquals((await (await m.pedir("/v1/escritorio/whatsapp", { cookie })).json()).escritorio, AURORA);
  const ok = await (await m.pedir("/v1/escritorio/whatsapp/conferir-numero", { corpo: { telefone: "(11) 97405-2210", receberCodigo: "SMS", confirmouNumero: true }, cookie })).json();
  assertEquals(ok.telefone, "+5511974052210");
  assertEquals((await erro(await m.pedir("/v1/escritorio/whatsapp/conferir-numero", { corpo: { telefone: "(11) 3032-4410", receberCodigo: "SMS" }, cookie }))).detalhes?.motivos,
    { receberCodigo: "FIXO_SEM_SMS" });
  assertEquals((await erro(await m.pedir("/v1/escritorio/whatsapp/rascunho", { metodo: "PUT", corpo: { passo: 9 }, cookie }))).detalhes?.campos, ["passo"]);
  assertEquals((await (await m.pedir("/v1/escritorio/whatsapp/rascunho", { metodo: "PUT", corpo: { passo: 1, receberCodigo: "VOZ" }, cookie })).json()).receberCodigo, "VOZ");
  assertEquals((await (await m.pedir("/v1/escritorio/whatsapp/desligar", { corpo: { versao: 3, motivo: "Trocar", entendi: true }, cookie })).json()).dados,
    { motivo: "Trocar", entendi: true });
  assertEquals((await (await m.pedir("/v1/escritorio/whatsapp/avisos/PARCELA_ATRASO", { corpo: { versao: 2, texto: "Olá, {nome}." }, cookie })).json()).chave, "PARCELA_ATRASO");
  assertEquals((await erro(await m.pedir("/v1/escritorio/whatsapp/avisos/OUTRO", { corpo: { versao: 2, texto: "Olá" }, cookie }))).codigo, "NOT_FOUND");
  assertEquals((await (await m.pedir("/v1/escritorio/ia", { cookie })).json()).escritorio, AURORA);
  assertEquals((await erro(await m.pedir("/v1/escritorio/ia", { metodo: "PATCH", corpo: { versao: 1, nome: "Carla" }, cookie }))).detalhes?.motivo, "NOME_SEM_ASSISTENTE_VIRTUAL");
  assertEquals((await erro(await m.pedir("/v1/escritorio/ia", { metodo: "PATCH", corpo: { versao: 1, tom: "SECO" }, cookie }))).detalhes?.campos, ["tom"]);
  assertEquals((await (await m.pedir("/v1/escritorio/ia", { metodo: "PATCH", corpo: { versao: 1, palavras: ["penhora"] }, cookie })).json()).versao, 2);
  assertEquals((await erro(await m.pedir("/v1/escritorio/ia/ligar", { corpo: { versao: 2, revisou: true }, cookie }))).detalhes?.motivo, "SEM_TESTE");
  assertEquals((await (await m.pedir("/v1/escritorio/ia/pausar", { corpo: { versao: 2 }, cookie })).json()).situacao, "PAUSADA");
  assertEquals((await (await m.pedir("/v1/escritorio/ia/respostas", { corpo: { pergunta: "Sábados", resposta: "Não atendemos." }, cookie })).json()).dados.pergunta, "Sábados");
  assertEquals((await (await m.pedir(`/v1/escritorio/ia/respostas/${CLIENTE}`, { metodo: "PATCH", corpo: { versao: 1, situacao: "ARQUIVADA" }, cookie })).json()).situacao, "ARQUIVADA");
  const tudo = JSON.stringify(m.chamadas.map((c) => c.args));
  assertEquals(/token/i.test(tudo), false);
});

Deno.test("PA-03: Automações, o desenho vai inteiro ao banco, a simulação sai do serviço e nada é enviado", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  assertEquals((await (await m.pedir("/v1/escritorio/automacoes", { cookie })).json()).escritorio, AURORA);
  assertEquals((await erro(await m.pedir("/v1/escritorio/automacoes", { corpo: { gatilho: "SMS", nome: "x" }, cookie }))).detalhes?.campos, ["gatilho"]);
  const criada = await m.pedir("/v1/escritorio/automacoes", { corpo: { gatilho: "PARCELA_ATRASO", nome: "Cobrança gentil" }, cookie });
  assertEquals(criada.status, 201);
  assertEquals((await erro(await m.pedir(`/v1/escritorio/automacoes/${CLIENTE}`, { metodo: "PATCH", corpo: { versao: 1, fluxo: { passos: [], extra: 1 } }, cookie }))).codigo, "VALIDATION_ERROR");
  assertEquals((await (await m.pedir(`/v1/escritorio/automacoes/${CLIENTE}`, { metodo: "PATCH", corpo: { versao: 1, fluxo: { passos: [{ id: "g", tipo: "GATILHO", dias: 3 }] } }, cookie })).json()).versao, 2);
  assertEquals((await erro(await m.pedir(`/v1/escritorio/automacoes/${CLIENTE}/aprovar-texto`, { corpo: { versao: 2, passo: "Msg!" }, cookie }))).detalhes?.campos, ["passo"]);
  assertEquals((await erro(await m.pedir(`/v1/escritorio/automacoes/${CLIENTE}/ligar`, { corpo: { versao: 2, revisou: true }, cookie }))).detalhes?.motivo, "CONFLITO_LIMITE_SEMANAL");
  assertEquals((await (await m.pedir(`/v1/escritorio/automacoes/${CLIENTE}/ligar`, { corpo: { versao: 2, revisou: true, desligarConflitos: true }, cookie })).json()).situacao, "EM_APROVACAO");
  assertEquals((await (await m.pedir(`/v1/escritorio/automacoes/${CLIENTE}/desligar`, { corpo: { versao: 3, motivo: "Pausa" }, cookie })).json()).motivo, "Pausa");
  assertEquals((await erro(await m.pedir(`/v1/escritorio/automacoes/${CLIENTE}/execucoes?situacao=TALVEZ`, { cookie }))).detalhes?.campos, ["situacao"]);
  assertEquals((await (await m.pedir(`/v1/escritorio/automacoes/${CLIENTE}/execucoes?situacao=FALHOU`, { cookie })).json()).situacao, "FALHOU");
  const sim = await (await m.pedir(`/v1/escritorio/automacoes/${CLIENTE}/simular`, { corpo: { parcelaId: CLIENTE, escolha: "NADA" }, cookie })).json();
  assertEquals(sim.caminho.map((c: { rotulo: string }) => c.rotulo), ["1 Gatilho", "2 Mensagem", "3 Espera", "4 Ramos", "Nem pagou, nem respondeu", "5 Passar para Marina"]);
  assertEquals(sim.conversa[1].texto, "Olá, Sueli. A parcela Mensalidade de novembro, de R$ 1.800,00, venceu em 15/11. Qualquer dúvida, é só responder.");
  // A passagem cai na segunda, 23/11 (5 dias corridos depois de quarta, 18/11, dentro do horário).
  assertEquals(sim.conversa.at(-1).em, "2026-11-23T10:20:00-03:00");
  assertEquals((m.chamadas.find((c) => c.funcao === "portal_automacao_simulacao")!.args as { p_parcela: string }).p_parcela, CLIENTE);
  assertEquals((await erro(await m.pedir(`/v1/escritorio/automacoes/${CLIENTE}/simular`, { corpo: { escolha: "TALVEZ" }, cookie }))).detalhes?.campos, ["escolha"]);
  assertEquals((await erro(await m.pedir("/v1/escritorio/automacoes/ia", { corpo: { pedido: "x" }, cookie }))).detalhes?.campos, ["pedido"]);
  assertEquals((await erro(await m.pedir(`/v1/escritorio/automacoes/${CLIENTE}/ia`, { corpo: { pedido: "a".repeat(601) }, cookie }))).codigo, "VALIDATION_ERROR");
  assertEquals(await (await m.pedir("/v1/escritorio/avisos-automaticos?tipo=PARCELA_ATRASO&pular=20", { cookie })).json(), { tipo: "PARCELA_ATRASO", pular: 20, limite: 20 });
  assertEquals((await erro(await m.pedir("/v1/escritorio/avisos-automaticos?pular=-1", { cookie }))).detalhes?.campos, ["pular"]);
  assertEquals((await (await m.pedir(`/v1/escritorio/clientes/${CLIENTE}/sem-avisos`, { corpo: { tipo: "COBRANCA", origem: "CONVERSA" }, cookie })).json()).dados.tipo, "COBRANCA");
  // F3.63: quem pediu, como e o dia; F3.57: o sino.
  assertEquals((await (await m.pedir(`/v1/escritorio/clientes/${CLIENTE}/sem-avisos`, { cookie })).json()).cliente, CLIENTE);
  assertEquals((await erro(await m.pedir(`/v1/escritorio/clientes/${CLIENTE}/sem-avisos`, { corpo: { tipo: "TODOS", origem: "FICHA", canal: "FAX" }, cookie }))).detalhes?.campos, ["canal"]);
  assertEquals((await erro(await m.pedir(`/v1/escritorio/clientes/${CLIENTE}/sem-avisos`, { corpo: { tipo: "TODOS", origem: "FICHA", pedidoEm: "03/11/2026" }, cookie }))).detalhes?.campos, ["pedidoEm"]);
  assertEquals((await (await m.pedir("/v1/escritorio/avisos", { cookie })).json()).novos, 1);
  assertEquals((await (await m.pedir(`/v1/escritorio/avisos/${CLIENTE}/lido`, { corpo: {}, cookie })).json()).id, CLIENTE);
  assertEquals((await (await m.pedir("/v1/escritorio/avisos/lidos", { corpo: { ate: "2026-11-18T10:04:00.123456+00:00" }, cookie })).json()).ate, "2026-11-18T10:04:00.123456+00:00");
  assertEquals((await erro(await m.pedir("/v1/escritorio/avisos/lidos", { corpo: { ate: "ontem" }, cookie }))).detalhes?.campos, ["ate"]);
  assertEquals(m.chamadas.every((c) => !("p_escritorio" in c.args) || c.args.p_escritorio === AURORA), true);
});

Deno.test("PA-03: gatilhos e tipos de passo do domínio são os mesmos do banco", async () => {
  const { GATILHOS, TIPOS_PASSO } = await import("@t3jus/domain");
  const sql = await Deno.readTextFile(new URL("../../migrations/0320_portal_automacoes.sql", import.meta.url));
  // A 0570 refaz a lista de campos com os gatilhos cliente novo e documento pendente: vale a última.
  const sql570 = await Deno.readTextFile(new URL("../../migrations/0570_automacoes_gatilhos_novos.sql", import.meta.url));
  const sql610 = await Deno.readTextFile(new URL("../../migrations/0610_textos_no_tom.sql", import.meta.url));
  for (const [g, info] of Object.entries(GATILHOS)) {
    const re = new RegExp(`when '${g}' then array\\[([^\\]]+)\\]`);
    const linha = (re.exec(sql570) ?? re.exec(sql))?.[1];
    // A 0610 (D5) tira o {link de pagamento} dos gatilhos de parcela.
    const campos = linha?.match(/'([^']+)'/g)?.map((x) => x.slice(1, -1)).filter((c) => !(sql610.includes("'link de pagamento'") && c === "link de pagamento"));
    assertEquals(campos, info.campos, g);
  }
  const tipos = /v_ok := case v_tipo([\s\S]+?) end;/.exec(sql)?.[1]?.match(/when '([A-Z]+)'/g)?.map((x) => x.slice(6, -1));
  assertEquals(tipos, Object.keys(TIPOS_PASSO));
});

Deno.test("PA-04: avisos, assuntos e tons do domínio são os mesmos do banco", async () => {
  const { AVISOS_WHATSAPP, ASSUNTOS_IA, TONS_IA, textoAvisoValido } = await import("@t3jus/domain");
  const sql = await Deno.readTextFile(new URL("../../migrations/0310_portal_whatsapp_ia.sql", import.meta.url));
  const lista = (re: RegExp) => re.exec(sql)?.[1]?.match(/'([A-Z_]+)'/g)?.map((x) => x.slice(1, -1));
  // A 0670 acrescenta o aviso de cancelamento do compromisso (F3.3); a 0721, o pedido de documento e o recibo; a 0722, a base do mês.
  const sql670 = await Deno.readTextFile(new URL("../../migrations/0722_base_mes_whatsapp.sql", import.meta.url));
  assertEquals(/whatsapp_avisos_chave_check\s+check \(chave in \(([^)]+)\)/.exec(sql670)?.[1]?.match(/'([A-Z_]+)'/g)?.map((x) => x.slice(1, -1)),
    Object.keys(AVISOS_WHATSAPP));
  assertEquals(lista(/chave\s+text not null check \(chave in \(([^)]+)\)/), Object.keys(AVISOS_WHATSAPP).filter((k) => !["COMPROMISSO_CANCELADO", "DOCUMENTO_PEDIDO", "RECIBO_PAGAMENTO", "BASE_DO_MES"].includes(k)));
  assertEquals(lista(/assuntos <@ array\[([^\]]+)\]/), Object.keys(ASSUNTOS_IA));
  assertEquals(lista(/tom\s+text not null default 'CORDIAL' check \(tom in \(([^)]+)\)/), Object.keys(TONS_IA));
  assertEquals([textoAvisoValido("{nome}, venceu."), textoAvisoValido("Olá, {nome}. Pague: {link}"), textoAvisoValido("Olá, {nome}. Venceu.")], [false, false, true]);
});

Deno.test("PD-07: motivos e razões do domínio são os mesmos do banco", async () => {
  const { MOTIVOS_CONVERSA, RAZOES_RESPONSAVEL, ENVIO_MENSAGEM } = await import("@t3jus/domain");
  const sql = await Deno.readTextFile(new URL("../../migrations/0300_portal_conversas_mensagens.sql", import.meta.url));
  // A 0330 refaz as listas de motivo e de razão (a IA que atende).
  const sql330 = await Deno.readTextFile(new URL("../../migrations/0330_portal_ia_atende.sql", import.meta.url));
  // A 0626 acrescenta o pedido de não receber avisos (F3.83).
  const sql626 = await Deno.readTextFile(new URL("../../migrations/0626_ia_pedido_sem_avisos.sql", import.meta.url));
  const lista = (re: RegExp, texto = sql) => re.exec(texto)?.[1]?.match(/'([A-Z_]+)'/g)?.map((x) => x.slice(1, -1));
  assertEquals(lista(/check \(motivo in \(([^)]+)\)/, sql626), Object.keys(MOTIVOS_CONVERSA));
  assertEquals(lista(/check \(responsavel_razao in \(([^)]+)\)/, sql330), Object.keys(RAZOES_RESPONSAVEL));
  assertEquals(lista(/envio\s+text check \(envio in \(([^)]+)\)/), Object.keys(ENVIO_MENSAGEM));
});

Deno.test("IN-10: os grupos de honorário cobrem todos os tipos do banco, e o alerta de queda", async () => {
  const { GRUPOS_RECEITA, TIPOS_HONORARIO, receitaPorGrupo, alertaDeQueda } = await import("@t3jus/domain");
  const sql = await Deno.readTextFile(new URL("../../migrations/0200_portal_contratos.sql", import.meta.url));
  const tipos = /tipo\s+text not null check \(tipo in \(([^)]+)\)/.exec(sql)?.[1]?.match(/'([A-Z_]+)'/g)?.map((x) => x.slice(1, -1)).sort();
  assertEquals(Object.values(GRUPOS_RECEITA).flatMap((g) => [...g.tipos]).sort(), tipos);
  assertEquals(Object.keys(TIPOS_HONORARIO).sort(), tipos);
  const g = receitaPorGrupo([{ tipo: "EXITO", valor: 720000, anteriores: 3690000, restante: 0 }, { tipo: "MENSAL", valor: 960000, anteriores: 2880000, restante: 0 }]);
  assertEquals(g.map((x) => x.grupo), ["MENSALIDADES", "EXITO"]);
  assertEquals(alertaDeQueda(g), { grupo: "EXITO", nome: "Êxito", valor: 720000, media: 1230000, pct: 41 });
  assertEquals(alertaDeQueda([{ grupo: "EXITO", nome: "Êxito", valor: 100, anteriores: 3000, restante: 900 }]), null);
});

Deno.test("FI-20, FI-07: categorias de saída e formas de reembolso do domínio são as mesmas do banco", async () => {
  const { CATEGORIAS_SAIDA, CATEGORIAS_LANCAR, REEMBOLSO_COMO, CREDORES_EMPRESTIMO, DEVOLUCAO_EMPRESTIMO } = await import("@t3jus/domain");
  const sql = await Deno.readTextFile(new URL("../../migrations/0230_portal_financeiro_pagar.sql", import.meta.url));
  // A categoria Empréstimos entrou no fim da lista na 0940 (F3.51): a definição que vale é a dela, na ordem.
  const sql0940 = await Deno.readTextFile(new URL("../../migrations/0940_emprestimos.sql", import.meta.url));
  const lista = (re: RegExp, texto = sql) => re.exec(texto)?.[1]?.match(/'([A-Z_]+)'/g)?.map((x) => x.slice(1, -1));
  assertEquals(lista(/categoria_saida_valida\(p text\)[\s\S]*?select p in \(([^)]+)\)/, sql0940), Object.keys(CATEGORIAS_SAIDA));
  assertEquals(Object.keys(CATEGORIAS_LANCAR), Object.keys(CATEGORIAS_SAIDA).filter((k) => k !== "EMPRESTIMOS"));
  assertEquals(lista(/reembolso_como\s+text check \(reembolso_como in \(([^)]+)\)/), Object.keys(REEMBOLSO_COMO));
  assertEquals(lista(/credor_tipo\s+text not null check \(credor_tipo in \(([^)]+)\)/, sql0940), Object.keys(CREDORES_EMPRESTIMO));
  assertEquals(lista(/devolucao\s+text not null check \(devolucao in \(([^)]+)\)/, sql0940), Object.keys(DEVOLUCAO_EMPRESTIMO));
});

Deno.test("FI-20 (F3.51): empréstimos, registrar, ficha, devolução, encerrar e lançado errado; o escritório vem da sessão", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const r = await m.pedir("/v1/escritorio/financeiro/emprestimos", {
    corpo: { credorTipo: "BANCO", credorNome: "Sicoob", valor: 3000000, recebidoEm: "2026-10-05", devolucao: "PARCELAS", parcelasTotal: 24,
      parcelaValor: 145000, proximoVencimento: "2026-10-20", parcelas: [{ n: 1, valor: 150000 }] }, cookie });
  assertEquals([r.status, (await r.json()).parcelasCriadas], [201, 24]);
  const reg = m.chamadas.find((x) => x.funcao === "portal_financeiro_emprestimo_registrar")!;
  assertEquals([reg.args.p_escritorio, (reg.args.p_dados as { credorNome: string }).credorNome], [AURORA, "Sicoob"]);
  assertEquals((await erro(await m.pedir("/v1/escritorio/financeiro/emprestimos", { corpo: { valor: "muito" }, cookie }))).detalhes?.campos, ["valor"]);
  const sem = await erro(await m.pedir("/v1/escritorio/financeiro/emprestimos", { corpo: { credorTipo: "BANCO" }, cookie }));
  assertEquals(sem.detalhes?.campos, ["credorNome", "valor"]);

  assertEquals((await (await m.pedir(`/v1/escritorio/financeiro/emprestimos/${CLIENTE}`, { cookie })).json()).id, CLIENTE);
  assertEquals((await m.pedir("/v1/escritorio/financeiro/emprestimos/nao-e-id", { cookie })).status, 404);
  const ficha = m.chamadas.find((x) => x.funcao === "portal_financeiro_emprestimo")!;
  assertEquals([ficha.args.p_escritorio, ficha.args.p_emprestimo], [AURORA, CLIENTE]);

  const d = await m.pedir(`/v1/escritorio/financeiro/emprestimos/${CLIENTE}/devolucoes`, { corpo: { valor: 250000, pagaEm: "2026-11-10", forma: "PIX" }, cookie });
  assertEquals([d.status, (await d.json()).acimaDoQueFalta], [201, 0]);
  const enc = await m.pedir(`/v1/escritorio/financeiro/emprestimos/${CLIENTE}/encerrar`, { corpo: { motivo: "Quitado com o banco" }, cookie });
  assertEquals([enc.status, (await enc.json()).situacao.situacao], [200, "ENCERRADO"]);
  const curto = await erro(await m.pedir(`/v1/escritorio/financeiro/emprestimos/${CLIENTE}/cancelar`, { corpo: { motivo: "erro" }, cookie }));
  assertEquals(curto.detalhes?.campos, ["motivo"]);
  const pago = await erro(await m.pedir(`/v1/escritorio/financeiro/emprestimos/${ANEXO_NOTA}/cancelar`, { corpo: { motivo: "Lançado errado" }, cookie }));
  assertEquals(pago.detalhes?.motivo, "EMPRESTIMO_COM_PAGAMENTO");
  for (const f of ["portal_financeiro_emprestimo_devolucao", "portal_financeiro_emprestimo_encerrar", "portal_financeiro_emprestimo_cancelar"]) {
    assert(m.chamadas.filter((x) => x.funcao === f).every((x) => x.args.p_escritorio === AURORA), f);
  }
  // Sem a sessão, não chega ao banco.
  assertEquals((await m.pedir(`/v1/escritorio/financeiro/emprestimos/${CLIENTE}`)).status, 401);
});

Deno.test("EX-01, EX-03: Jurídico, lista, cadastrar com o número só em dígitos, ficha e mudar etapa; o escritório vem da sessão", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const l = await (await m.pedir("/v1/escritorio/juridico/casos?situacao=encerrado&q=rosa", { cookie })).json();
  assertEquals([l.situacao, l.q, l.escritorio], ["ENCERRADO", "rosa", AURORA]);
  assertEquals((await erro(await m.pedir("/v1/escritorio/juridico/casos?situacao=tudo", { cookie }))).detalhes?.campos, ["situacao"]);
  assertEquals((await erro(await m.pedir("/v1/escritorio/juridico/casos?etapa=x", { cookie }))).detalhes?.campos, ["filtro"]);
  assertEquals((await m.pedir("/v1/escritorio/juridico/opcoes", { cookie })).status, 200);
  const c = await m.pedir("/v1/escritorio/juridico/casos", {
    corpo: { nome: "Benedito x Metalúrgica", area: "TRABALHISTA", numero: "1001234-77.2026.5.02.0011", clientes: [{ clienteId: CLIENTE, papel: "AUTOR" }] }, cookie });
  assertEquals([c.status, (await c.json()).numero], [201, "10012347720265020011"]);
  assertEquals((await (await m.pedir(`/v1/escritorio/juridico/casos/${CLIENTE}`, { cookie })).json()).id, CLIENTE);
  assertEquals((await (await m.pedir(`/v1/escritorio/juridico/casos/${CLIENTE}`, { metodo: "PUT", corpo: { versao: 2, nome: "Novo" }, cookie })).json()).versao, 3);
  assertEquals((await m.pedir(`/v1/escritorio/juridico/casos/${CLIENTE}/clientes`, { corpo: { clienteId: CLIENTE, papel: "AUTOR" }, cookie })).status, 201);
  const sem = await erro(await m.pedir(`/v1/escritorio/juridico/casos/${CLIENTE}/etapa`, { corpo: { versao: 1, etapaId: CLIENTE }, cookie }));
  assertEquals(sem.detalhes?.motivo, "MOTIVO_OBRIGATORIO");
  assertEquals((await (await m.pedir(`/v1/escritorio/juridico/casos/${CLIENTE}/etapa`, { corpo: { versao: 1, etapaId: CLIENTE, motivo: "Citação" }, cookie })).json()).versao, 2);
  assertEquals((await m.pedir("/v1/escritorio/juridico/casos/nao-e-id", { cookie })).status, 404);
});

Deno.test("EX-01: áreas do direito e o número do CNJ do domínio batem com o banco", async () => {
  const { AREAS_DIREITO, numeroCnjValido, formatarCnj } = await import("@t3jus/domain");
  const sql = await Deno.readTextFile(new URL("../../migrations/0240_portal_juridico_casos.sql", import.meta.url));
  const lista = /area_direito_valida\(p text\)[\s\S]*?select p in \(([^)]+)\)/.exec(sql)?.[1]?.match(/'([A-Z_]+)'/g)?.map((x) => x.slice(1, -1));
  assertEquals(lista, Object.keys(AREAS_DIREITO));
  assertEquals([numeroCnjValido("1001234-77.2026.5.02.0011"), numeroCnjValido("1001234-78.2026.5.02.0011")], [true, false]);
  assertEquals(formatarCnj("10012347720265020011"), "1001234-77.2026.5.02.0011");
});

Deno.test("EX-02, EX-04: prazos e tarefas, filtros, cadastrar, cumprir, concluir, reabrir e já chegou", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  assertEquals((await (await m.pedir("/v1/escritorio/juridico/prazos?mostrar=meus", { cookie })).json()).mostrar, "MEUS");
  assertEquals((await erro(await m.pedir("/v1/escritorio/juridico/prazos?mostrar=todos", { cookie }))).detalhes?.campos, ["mostrar"]);
  assertEquals((await erro(await m.pedir("/v1/escritorio/juridico/prazos?responsavel=x", { cookie }))).detalhes?.campos, ["responsavel"]);
  assertEquals((await m.pedir("/v1/escritorio/juridico/prazos", { corpo: { casoId: CLIENTE, descricao: "Recurso", dataFinal: "2026-11-19" }, cookie })).status, 201);
  const p = m.chamadas.find((c) => c.funcao === "portal_juridico_prazo_criar")!;
  assertEquals([p.args.p_escritorio, (p.args.p_dados as { lembrar: boolean }).lembrar], [AURORA, true]);
  assertEquals((await m.pedir(`/v1/escritorio/juridico/prazos/${CLIENTE}/cumprido`, { corpo: {}, cookie })).status, 200);
  assertEquals((await erro(await m.pedir(`/v1/escritorio/juridico/prazos/${AURORA}/cumprido`, { corpo: {}, cookie }))).detalhes?.motivo, "PRAZO_JA_CUMPRIDO");
  assertEquals((await (await m.pedir("/v1/escritorio/juridico/tarefas?visao=equipe", { cookie })).json()).visao, "EQUIPE");
  assertEquals((await erro(await m.pedir("/v1/escritorio/juridico/tarefas?visao=todas", { cookie }))).detalhes?.campos, ["visao"]);
  assertEquals((await m.pedir("/v1/escritorio/juridico/tarefas", { corpo: { casoId: CLIENTE, titulo: "Minuta", venceEm: "2026-11-19" }, cookie })).status, 201);
  assertEquals((await (await m.pedir(`/v1/escritorio/juridico/tarefas/${CLIENTE}/concluida`, { corpo: { concluir: false }, cookie })).json()).concluida, false);
  assertEquals((await m.pedir(`/v1/escritorio/juridico/tarefas/${CLIENTE}/chegou`, { corpo: {}, cookie })).status, 200);
  assertEquals((await m.pedir("/v1/escritorio/juridico/tarefas/nao-e-id/chegou", { corpo: {}, cookie })).status, 404);
});

Deno.test("F3.39, F3.4: editar prazo e tarefa pela versão (sem trocar o caso) e os casos para o compromisso", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const p = await m.pedir(`/v1/escritorio/juridico/prazos/${CLIENTE}`, {
    metodo: "PUT", corpo: { versao: 1, casoId: AURORA, descricao: "Recurso", dataFinal: "2026-11-20", responsavelId: CLIENTE }, cookie });
  assertEquals((await p.json()).versao, 2);
  const ch = m.chamadas.find((c) => c.funcao === "portal_juridico_prazo_editar")!;
  assertEquals([ch.args.p_escritorio, ch.args.p_versao, "casoId" in (ch.args.p_dados as object), "versao" in (ch.args.p_dados as object)], [AURORA, 1, false, false]);
  assertEquals((await erro(await m.pedir(`/v1/escritorio/juridico/prazos/${CLIENTE}`, { metodo: "PUT", corpo: { descricao: "x" }, cookie }))).detalhes?.campos, ["versao"]);
  const t = await m.pedir(`/v1/escritorio/juridico/tarefas/${CLIENTE}`, { metodo: "PUT", corpo: { versao: 3, titulo: "Minuta", venceEm: "2026-11-21" }, cookie });
  assertEquals((await t.json()).versao, 4);
  assertEquals((await (await m.pedir("/v1/escritorio/agenda/casos", { cookie })).json())[0].nome, "Pereira x Mercado Bom Preço");
});

Deno.test("EX-07, EX-09: etapas do escritório (adicionar, editar com versão, mover, tirar) e a resposta de Petições", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  assertEquals((await (await m.pedir("/v1/escritorio/juridico/etapas", { cookie })).json()).podeEditar, true);
  const nova = await m.pedir("/v1/escritorio/juridico/etapas", { corpo: { nome: "Acordo", textoCliente: "estamos negociando um acordo." }, cookie });
  assertEquals([nova.status, (await nova.json()).versao], [201, 1]);
  assertEquals((await erro(await m.pedir(`/v1/escritorio/juridico/etapas/${CLIENTE}`, { metodo: "PUT", corpo: { nome: "X", textoCliente: "y" }, cookie }))).detalhes?.campos, ["versao"]);
  assertEquals((await (await m.pedir(`/v1/escritorio/juridico/etapas/${CLIENTE}`, { metodo: "PUT", corpo: { versao: 3, nome: "Acordo", textoCliente: "estamos negociando." }, cookie })).json()).versao, 4);
  assertEquals((await erro(await m.pedir(`/v1/escritorio/juridico/etapas/${CLIENTE}/mover`, { corpo: { direcao: "LADO" }, cookie }))).codigo, "VALIDATION_ERROR");
  assertEquals((await (await m.pedir(`/v1/escritorio/juridico/etapas/${CLIENTE}/mover`, { corpo: { direcao: "SOBE" }, cookie })).json())[0].direcao, "SOBE");
  assertEquals((await (await m.pedir(`/v1/escritorio/juridico/etapas/${CLIENTE}/remover`, { corpo: { moverPara: AURORA }, cookie })).json()).casosMovidos, 1);
  assertEquals((await erro(await m.pedir(`/v1/escritorio/juridico/etapas/${CLIENTE}/remover`, { corpo: { moverPara: "x" }, cookie }))).detalhes?.campos, ["moverPara"]);
  assertEquals((await (await m.pedir("/v1/escritorio/juridico/peticoes", { cookie })).json()).minhaResposta, null);
  const r = await m.pedir("/v1/escritorio/juridico/peticoes", { corpo: { resposta: "AS_VEZES", comoFazHoje: "Copio a última." }, cookie });
  assertEquals([r.status, (await r.json()).resposta], [201, "AS_VEZES"]);
  assertEquals((await m.pedir("/v1/escritorio/juridico/peticoes", { corpo: { resposta: "TALVEZ" }, cookie })).status, 400);
  const salvar = m.chamadas.filter((c) => c.funcao === "portal_juridico_etapa_salvar");
  assertEquals(salvar.map((c) => c.args.p_escritorio), [AURORA, AURORA]);
});

Deno.test("AP-08 e EX-18: documentos pessoais em duas etapas e a lista por área, no escritório da sessão", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  assertEquals((await (await m.pedir(`/v1/escritorio/clientes/${ANA}/documentos`, { cookie })).json()).validadeDias, 90);
  assertEquals((await erro(await m.pedir(`/v1/escritorio/clientes/${ANA}/documentos`, { corpo: { tipo: "PASSAPORTE", nome: "p.pdf", arquivoTipo: "application/pdf", tamanho: 10 }, cookie }))).detalhes?.campos, ["tipo"]);
  assertEquals((await erro(await m.pedir(`/v1/escritorio/clientes/${ANA}/documentos`, { corpo: { tipo: "RG_CPF", nome: "rg.pdf", arquivoTipo: "application/pdf", tamanho: 10, fotos: 11 }, cookie }))).detalhes?.campos, ["fotos"]);
  const ini = await m.pedir(`/v1/escritorio/clientes/${ANA}/documentos`, { corpo: { tipo: "RG_CPF", nome: "rg.pdf", arquivoTipo: "application/pdf", tamanho: 2400, fotos: 2 }, cookie });
  assertEquals(ini.status, 201);
  assertEquals(m.storage.pedidosDeEnvio, [`${AURORA}/${PETICAO}`]);
  assertEquals((await erro(await m.pedir(`/v1/escritorio/clientes/documentos/${PETICAO}/concluir`, { corpo: {}, cookie }))).detalhes?.motivo, "ARQUIVO_NAO_CHEGOU");
  m.storage.guardados.set(`${AURORA}/${PETICAO}`, { tamanho: 2400, tipo: "application/pdf" });
  assertEquals((await (await m.pedir(`/v1/escritorio/clientes/documentos/${PETICAO}/concluir`, { corpo: {}, cookie })).json()).nome, "rg.pdf");
  const abrir = await (await m.pedir(`/v1/escritorio/clientes/documentos/${PETICAO}/abrir`, { corpo: {}, cookie })).json();
  assertMatch(abrir.url, /^https:\/\/storage\.exemplo\/ler\//);

  assertEquals((await (await m.pedir("/v1/escritorio/juridico/documentos-inicio", { cookie })).json()).podeEditar, true);
  assertEquals((await erro(await m.pedir("/v1/escritorio/juridico/documentos-inicio", { corpo: { nome: "CNIS", seHouver: false }, cookie }))).detalhes?.campos, ["area"]);
  assertEquals((await m.pedir("/v1/escritorio/juridico/documentos-inicio", { corpo: { area: "PREVIDENCIARIO", nome: "Extrato do CNIS", seHouver: false }, cookie })).status, 201);
  assertEquals((await erro(await m.pedir(`/v1/escritorio/juridico/documentos-inicio/${CLIENTE}`, { metodo: "PATCH", corpo: { nome: "Extrato do CNIS", seHouver: false }, cookie }))).detalhes?.campos, ["versao"]);
  assertEquals((await (await m.pedir(`/v1/escritorio/juridico/documentos-inicio/${CLIENTE}`, { metodo: "PATCH", corpo: { nome: "Extrato do CNIS", seHouver: true, versao: 2 }, cookie })).json()).versao, 3);
  assertEquals((await m.pedir(`/v1/escritorio/juridico/documentos-inicio/${CLIENTE}/mover`, { corpo: { direcao: "SOBE" }, cookie })).status, 200);
  assertEquals((await m.pedir(`/v1/escritorio/juridico/documentos-inicio/${CLIENTE}/tirar`, { corpo: { versao: 3 }, cookie })).status, 200);
  assertEquals((await m.pedir("/v1/escritorio/juridico/documentos-inicio/sugestao", { corpo: { area: "OUTRA" }, cookie })).status, 400);
  assertEquals((await m.pedir("/v1/escritorio/juridico/documentos-inicio/sugestao", { corpo: { area: "FAMILIA" }, cookie })).status, 200);
  // A prévia na abertura do caso (EX-18): a área precisa existir; o cliente é opcional.
  assertEquals((await erro(await m.pedir("/v1/escritorio/juridico/documentos-inicio/previa?area=NADA", { cookie }))).detalhes?.campos, ["area"]);
  assertEquals((await m.pedir("/v1/escritorio/juridico/documentos-inicio/previa?area=PREVIDENCIARIO&cliente=nao-e-id", { cookie })).status, 404);
  assertEquals((await (await m.pedir(`/v1/escritorio/juridico/documentos-inicio/previa?area=PREVIDENCIARIO&cliente=${ANA}`, { cookie })).json()).area, "PREVIDENCIARIO");
  assertEquals(m.chamadas.find((c) => c.funcao === "portal_cliente_documentos_previa")?.args.p_cliente, ANA);
  // As portas do caso aceitam "documentos"; o que vem a mais na lista é recusado.
  assertEquals((await m.pedir(`/v1/escritorio/contratos/${CLIENTE}/caso`, { corpo: { caso: { modo: "NOVO", documentos: { pedir: ["nao-e-id"] } } }, cookie })).status, 400);
  const chamadas = m.chamadas.filter((c) => c.funcao.startsWith("portal_cliente_documento") || c.funcao.startsWith("portal_juridico_documento_inicio") || c.funcao.startsWith("portal_juridico_documentos_inicio"));
  assert(chamadas.length >= 8 && chamadas.every((c) => c.args.p_escritorio === AURORA));
});

Deno.test("F3.118 / AP-01: termo de curatela em duas etapas, no escritório da sessão", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const corpo = { nome: "termo-curatela.pdf", arquivoTipo: "application/pdf", tamanho: 2400 };
  // O escritório e o tipo vindos do navegador são descartados (M3): vale o da sessão.
  const ini = await m.pedir(`/v1/escritorio/clientes/${ANA}/termo-curatela`, { corpo: { ...corpo, escritorioId: BELA_VISTA, tipo: "RG_CPF" }, cookie });
  assertEquals(ini.status, 201);
  assertEquals((await ini.json()).id, TERMO);
  assertEquals(m.storage.pedidosDeEnvio, [`${AURORA}/${TERMO}`]);
  const chamada = m.chamadas.find((c) => c.funcao === "portal_cliente_termo_iniciar")!;
  assertEquals([chamada.args.p_escritorio, chamada.args.p_cliente, chamada.args.p_dados], [AURORA, ANA, corpo]);
  assertEquals((await erro(await m.pedir(`/v1/escritorio/clientes/${ANA}/termo-curatela`, { corpo: { ...corpo, tamanho: 10485761 }, cookie }))).detalhes?.campos, ["tamanho"]);
  assertEquals((await erro(await m.pedir(`/v1/escritorio/clientes/${ANA}/termo-curatela`, { corpo: { ...corpo, arquivoTipo: "application/msword" }, cookie }))).detalhes?.campos, ["arquivoTipo"]);
  assertEquals((await m.pedir("/v1/escritorio/clientes/nao-e-id/termo-curatela", { corpo, cookie })).status, 404);
  // Concluir e abrir são as rotas de Documentos pessoais, pelo id.
  assertEquals((await erro(await m.pedir(`/v1/escritorio/clientes/documentos/${TERMO}/concluir`, { corpo: {}, cookie }))).detalhes?.motivo, "ARQUIVO_NAO_CHEGOU");
  m.storage.guardados.set(`${AURORA}/${TERMO}`, { tamanho: 2400, tipo: "application/pdf" });
  assertEquals((await m.pedir(`/v1/escritorio/clientes/documentos/${TERMO}/concluir`, { corpo: {}, cookie })).status, 200);
  const abrir = await (await m.pedir(`/v1/escritorio/clientes/documentos/${TERMO}/abrir`, { corpo: {}, cookie })).json();
  assertMatch(abrir.url, /^https:\/\/storage\.exemplo\/ler\//);
  // Gerar documentos recebe o termo como veio do banco.
  const dados = await (await m.pedir(`/v1/escritorio/contratos/${CLIENTE}/documentos-dados`, { cookie })).json();
  assertEquals(dados.termoCuratela.id, TERMO);
  assert(m.chamadas.filter((c) => c.funcao.startsWith("portal_cliente_") || c.funcao === "portal_documento_dados").every((c) => c.args.p_escritorio === AURORA));
});

Deno.test("EX-05: documentos do caso (pedir, pedir de novo, já chegou, enviar em duas etapas e abrir) no caminho do escritório da sessão", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const p = await m.pedir(`/v1/escritorio/juridico/casos/${CLIENTE}/pedidos`, { corpo: { descricao: "CTPS digital", clienteId: ANA }, cookie });
  assertEquals(p.status, 201);
  assertEquals((await (await m.pedir(`/v1/escritorio/juridico/pedidos/${CLIENTE}/de-novo`, { corpo: {}, cookie })).json()).repedidoEm, "2026-11-19");
  assertEquals((await m.pedir(`/v1/escritorio/juridico/pedidos/${CLIENTE}/chegou`, { corpo: {}, cookie })).status, 200);
  assertEquals((await m.pedir("/v1/escritorio/juridico/pedidos/nao-e-id/chegou", { corpo: {}, cookie })).status, 404);

  assertEquals((await erro(await m.pedir(`/v1/escritorio/juridico/casos/${CLIENTE}/documentos`, { corpo: { categoria: "PETICAO", nome: "a/b.pdf", tipo: "application/pdf", tamanho: 10 }, cookie }))).detalhes?.campos, ["nome"]);
  assertEquals((await m.pedir(`/v1/escritorio/juridico/casos/${CLIENTE}/documentos`, { corpo: { categoria: "PETICAO", nome: "x.exe", tipo: "application/x-msdownload", tamanho: 10 }, cookie })).status, 400);
  const ini = await m.pedir(`/v1/escritorio/juridico/casos/${CLIENTE}/documentos`, { corpo: { categoria: "PETICAO", nome: "peticao.pdf", tipo: "application/pdf", tamanho: 1200 }, cookie });
  assertEquals(ini.status, 201);
  assertEquals((await ini.json()).id, CLIENTE);
  assertEquals(m.storage.pedidosDeEnvio, [`${AURORA}/${CLIENTE}`]);

  // Sem o arquivo no Storage, não conclui.
  assertEquals((await erro(await m.pedir(`/v1/escritorio/juridico/documentos/${CLIENTE}/concluir`, { corpo: {}, cookie }))).detalhes?.motivo, "ARQUIVO_NAO_CHEGOU");
  m.storage.guardados.set(`${AURORA}/${CLIENTE}`, { tamanho: 999, tipo: "application/pdf" });
  assertEquals((await erro(await m.pedir(`/v1/escritorio/juridico/documentos/${CLIENTE}/concluir`, { corpo: {}, cookie }))).detalhes?.motivo, "ARQUIVO_NAO_CHEGOU");
  m.storage.guardados.set(`${AURORA}/${CLIENTE}`, { tamanho: 1200, tipo: "application/pdf" });
  assertEquals((await (await m.pedir(`/v1/escritorio/juridico/documentos/${CLIENTE}/concluir`, { corpo: {}, cookie })).json()).nome, "peticao.pdf");

  const abrir = await (await m.pedir(`/v1/escritorio/juridico/documentos/${CLIENTE}/abrir`, { corpo: {}, cookie })).json();
  assertMatch(abrir.url, /^https:\/\/storage\.exemplo\/ler\//);
  assertEquals(m.storage.leituras, [{ caminho: `${AURORA}/${CLIENTE}`, segundos: 60, nome: "peticao.pdf" }]);
  const pedidos = m.chamadas.filter((c) => c.funcao.startsWith("portal_juridico_documento"));
  assert(pedidos.every((c) => c.args.p_escritorio === AURORA));
});

function contextoTeste(comCliente: boolean): ContextoIa {
  return {
    escritorio: "Aurora Advocacia",
    config: { nome: "Assistente virtual da Aurora", apresentacao: "Olá! Sou a assistente virtual da Aurora.", tom: "CORDIAL", assuntos: ["ANDAMENTO_CASO"],
      palavras: [], dias: [1, 2, 3, 4, 5], horaInicio: "09:00", horaFim: "18:00", msgForaHorario: "Uma pessoa vê {próximo atendimento}.",
      telefoneUrgencia: null, situacao: "DESLIGADA" },
    agora: "2026-11-18T10:12", feriados: [],
    cliente: comCliente ? { nome: "Antônia Prado" } : null,
    contato: comCliente ? { nome: "Joana Prado", papel: "filha", principal: true } : null,
    quemResponde: { nome: "Lara Souza", razao: "CASO" }, comercial: "Diego Alves", respostas: [],
    dados: comCliente ? { casos: [{ nome: "Prado x INSS", etapa: "Recurso enviado", desde: "2026-11-16", texto: "O recurso foi enviado.", quemEscreveu: "Lara Souza", responsavel: "Lara Souza" }] } : {},
  };
}

Deno.test("PA-05: Testar sem enviar responde com o contexto da ficha, confere as regras fixas e libera ligar", async () => {
  const pedidos: string[] = [];
  const ia: Cerebro = {
    pensar(p) {
      pedidos.push(p.instrucoes);
      const ultima = p.mensagens.at(-1)?.content ?? "";
      return Promise.resolve(/ganho/.test(ultima)
        ? { acao: "RESPONDER", texto: "Acho que você vai ganhar.", motivo: null, fonte: null, resolvida: false, naoSoube: null }
        : { acao: "RESPONDER", texto: "O recurso foi enviado em 16/11.", motivo: null, fonte: "Jurídico › Prado x INSS › etapa Recurso enviado", resolvida: false, naoSoube: null });
    },
  };
  const m = montar({ ia });
  const cookie = await noEscritorio(m);
  const r = await (await m.pedir("/v1/escritorio/ia/testar", { corpo: { clienteId: CLIENTE, contatoId: "k1", mensagens: [{ autor: "CLIENTE", texto: "Como está o processo?" }] }, cookie })).json();
  assertEquals(r.plano.fonte, "Jurídico › Prado x INSS › etapa Recurso enviado");
  assertEquals(r.plano.enviar, "Olá! Sou a assistente virtual da Aurora.\n\nO recurso foi enviado em 16/11.");
  assertEquals(r.ia.testadaComo, "um contato da ficha");
  assert(pedidos[0]!.includes("Prado x INSS"));
  const barrada = await (await m.pedir("/v1/escritorio/ia/testar", { corpo: { clienteId: CLIENTE, contatoId: "k1", mensagens: [
    { autor: "CLIENTE", texto: "Oi" }, { autor: "IA", texto: "Olá! Sou a assistente virtual." }, { autor: "CLIENTE", texto: "Tenho ganho de causa?" }] }, cookie })).json();
  assertEquals([barrada.plano.passar, barrada.plano.barrada, barrada.plano.passariaPara], ["REGRA_FIXA", "OPINIAO", "Lara Souza"]);
  const novo = await (await m.pedir("/v1/escritorio/ia/testar", { corpo: { mensagens: [{ autor: "CLIENTE", texto: "Oi" }] }, cookie })).json();
  assertEquals(novo.ia.testadaComo, "um número desconhecido");
  assert(!pedidos[2]!.includes("Prado x INSS"));
  assertEquals((await erro(await m.pedir("/v1/escritorio/ia/testar", { corpo: { clienteId: CLIENTE, contatoId: "k9", mensagens: [{ autor: "CLIENTE", texto: "Oi" }] }, cookie }))).detalhes?.motivo,
    "CONTATO_FORA_DA_FICHA");
  assertEquals((await erro(await m.pedir("/v1/escritorio/ia/testar", { corpo: { mensagens: [] }, cookie }))).detalhes?.campos, ["mensagens"]);
  assertEquals((await (await m.pedir("/v1/escritorio/ia/teste/clientes?q=prado", { cookie })).json()).busca, "prado");
});

Deno.test("PA-05: sem a chave da IA, o teste diz que ela está indisponível", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const e = await erro(await m.pedir("/v1/escritorio/ia/testar", { corpo: { mensagens: [{ autor: "CLIENTE", texto: "Oi" }] }, cookie }));
  assertEquals([e.codigo, e.detalhes?.motivo], ["UPSTREAM_UNAVAILABLE", "IA_INDISPONIVEL"]);
});

// ------------------------------------------------------------------------------- petições (EX-09)

Deno.test("EX-09: gerar monta o .docx com os dados, grava o limpo, o rascunho e, aprovada, o documento do caso", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const r = await m.pedir(`/v1/escritorio/peticoes/casos/${CLIENTE}/gerar`, { corpo: PEDIDO_PETICAO, cookie });
  assertEquals(r.status, 201);
  const g = m.chamadas.find((c) => c.funcao === "portal_peticao_gravar")!.args;
  const res = g.p_resultado as { versaoId: string; documentoId: string; arquivo: string; marcados: string[]; previa: { t: string; texto: string }[][] };
  assertEquals(res.arquivo, "juntada-de-documentos-pereira-x-mercado.docx");
  assertEquals(res.marcados, ["RG de Joana Pereira", "Número do processo"]);
  assertEquals(res.previa[0], [{ t: "formulario", texto: PEDIDO_PETICAO.enderecamento }]);
  const limpo = m.storage.bytes.get(`${AURORA}/peticoes/${res.versaoId}.docx`)!;
  assertEquals((await conferirDocx(limpo)).campos, []);
  assert((await paragrafosDocx(limpo)).some((p) => p.startsWith("JOANA PEREIRA, brasileira, solteiro(a), costureira, portador(a) do RG nº [RG: falta]")));
  assert(m.storage.bytes.has(`${AURORA}/peticoes/${res.versaoId}-rascunho.docx`));
  assertEquals(m.storage.bytes.get(`${AURORA}/${res.documentoId}`), limpo);
});

Deno.test("EX-09: a prévia não grava nada e conta os campos", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const r = await (await m.pedir(`/v1/escritorio/peticoes/casos/${CLIENTE}/previa`, { corpo: PEDIDO_PETICAO, cookie })).json();
  assertEquals(r.campos, { total: 6, cadastro: 2, formulario: 2, preenchidos: 4 });
  assertEquals(r.semRevisao, "RESPONSAVEL");
  assertEquals(m.storage.bytes.size, 0);
  assert(!m.chamadas.some((c) => c.funcao === "portal_peticao_gravar"));
});

Deno.test("EX-09: enviar modelo confere o .docx, aponta o campo desconhecido e recusa PDF", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const docx = await criarDocx([{ texto: "[ENDERECAMENTO]" }, { texto: "Em face de [NOME_RECLAMADA]" }]);
  const r = await m.pedir("/v1/escritorio/peticoes/modelos?nome=Juntada%20do%20escrit%C3%B3rio&tipo=JUNTADA&area=QUALQUER&substitui=JUNTADA&arquivo=juntada.docx", { bruto: docx, cookie });
  assertEquals(r.status, 201);
  assertEquals((await r.json()).conferencia.desconhecidos, [{ campo: "NOME_RECLAMADA", sugestao: "PARTE_CONTRARIA" }]);
  const conf = m.chamadas.find((c) => c.funcao === "portal_peticao_modelo_enviar")!.args;
  assertEquals((conf.p_conferido as { campos: string[] }).campos, ["ENDERECAMENTO", "NOME_RECLAMADA"]);
  const pdf = await m.pedir("/v1/escritorio/peticoes/modelos/conferir", { bruto: new TextEncoder().encode("%PDF-1.7"), cookie });
  assertEquals((await erro(pdf)).detalhes, { campos: ["arquivo"], motivo: "ARQUIVO_PDF" });
  const sem = await m.pedir("/v1/escritorio/peticoes/modelos?nome=X&tipo=JUNTADA&area=QUALQUER", { bruto: docx, cookie });
  assertEquals((await erro(sem)).detalhes?.campos, ["nome", "arquivo"]);
});

Deno.test("EX-09: a lista de modelos junta os 8 padrão com o uso de cada um", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const r = await (await m.pedir("/v1/escritorio/peticoes/modelos", { cookie })).json();
  assertEquals(r.modelos.length, 8);
  assertEquals(r.modelos.find((x: { id: string }) => x.id === "JUNTADA").usos, 2);
  assertEquals(r.campos.length, CAMPOS_PETICAO.length);
});

Deno.test("EX-09: aprovar copia o arquivo limpo para os documentos; o rascunho baixa com a marca", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  m.storage.bytes.set(`${AURORA}/peticoes/${VERSAO_PET}.docx`, new Uint8Array([1, 2, 3]));
  const r = await (await m.pedir(`/v1/escritorio/peticoes/${PETICAO}/decisao`, { corpo: { decisao: "APROVAR", versao: 1 }, cookie })).json();
  assertEquals(r.situacao, "APROVADA");
  const doc = m.chamadas.find((c) => c.funcao === "portal_peticao_decidir")!.args.p_documento as string;
  assertEquals(m.storage.bytes.get(`${AURORA}/${doc}`), new Uint8Array([1, 2, 3]));
  const ajuste = await m.pedir(`/v1/escritorio/peticoes/${PETICAO}/decisao`, { corpo: { decisao: "AJUSTE", versao: 1, comentario: "Corrija" }, cookie });
  assertEquals((await ajuste.json()).situacao, "AJUSTE");
  const b = await (await m.pedir(`/v1/escritorio/peticoes/${PETICAO}/abrir?versao=1`, { metodo: "POST", cookie })).json();
  assertEquals(b.rascunho, true);
  assertEquals(m.storage.leituras.at(-1), { caminho: `${AURORA}/peticoes/${VERSAO_PET}-rascunho.docx`, segundos: 60, nome: "rascunho-juntada.docx" });
});

Deno.test("EX-09: a versão editada no Word passa pela conferência e a prévia é o texto do arquivo", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const docx = await criarDocx([{ texto: "Corrigido." }, { texto: "RG [RG: falta]" }]);
  const r = await m.pedir(`/v1/escritorio/peticoes/${PETICAO}/versoes/docx?recado=Pronto&resolvidos=${VERSAO_PET}`, { bruto: docx, cookie });
  assertEquals(r.status, 201);
  assertEquals((await r.json()).faltas, 1);
  const a = m.chamadas.find((c) => c.funcao === "portal_peticao_versao_gravar")!.args;
  assertEquals(a.p_dados, { origem: "DOCX_EDITADO", resolvidos: [VERSAO_PET], recado: "Pronto" });
  assertEquals((a.p_resultado as { previa: unknown }).previa, [[{ t: "fixo", texto: "Corrigido." }], [{ t: "fixo", texto: "RG " }, { t: "falta", texto: "[RG: falta]" }]]);
  assertEquals((a.p_resultado as { arquivo: string }).arquivo, "juntada-de-documentos-pereira-x-mercado-v2.docx");
});

// ------------------------------------------------------------------------------- contrato, procuração e declaração (F3.16)

Deno.test("F3.16: gerar faz um .docx por documento, no timbrado, e só então grava a geração", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const r = await m.pedir(`/v1/escritorio/contratos/${CLIENTE}/documentos`, { corpo: PEDIDO_DOCUMENTOS, cookie });
  assertEquals(r.status, 201);
  const g = m.chamadas.find((c) => c.funcao === "portal_documento_gravar")!.args;
  assertEquals([g.p_escritorio, g.p_contrato], [AURORA, CLIENTE]);
  const res = g.p_resultado as { geracaoId: string; padraoDe: string; documentos: { id: string; chave: string; arquivo: string; marcados: string[] }[] };
  assertEquals(res.padraoDe, "2026-11-22");
  assertEquals(res.documentos.map((d) => [d.chave, d.arquivo]), [
    ["CONTRATO", "contrato-c-2026-033-benedito-souza-lima.docx"], ["PROCURACAO", "procuracao-c-2026-033-benedito-souza-lima-v2.docx"]]);
  assertEquals(res.documentos[1]!.marcados, ["RG de Benedito Souza Lima"]);
  const procuracao = m.storage.bytes.get(`${AURORA}/documentos/${res.documentos[1]!.id}.docx`)!;
  assertEquals((await conferirDocx(procuracao)).campos, []);
  const texto = (await paragrafosDocx(procuracao)).join("\n");
  assert(texto.includes("ANA RIBEIRO, OAB/SP nº 214.538"));
  assert(texto.includes("poderes especiais para receber e dar quitação"));
  const contrato = (await paragrafosDocx(m.storage.bytes.get(`${AURORA}/documentos/${res.documentos[0]!.id}.docx`)!)).join("\n");
  assert(contrato.includes("R$ 3.000,00 (três mil reais)"));
});

Deno.test("F3.16: o modelo do escritório é baixado do Storage e preenchido; a prévia não grava nada", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  m.storage.bytes.set(`${AURORA}/documentos/modelos/${VERSAO_MODELO_DOC}.docx`, await criarDocx([{ texto: "Outorgante: [CLIENTE_NOME][PODERES_ESPECIAIS]." }]));
  const previa = await (await m.pedir(`/v1/escritorio/contratos/${MODELO_DOC}/documentos/previa`, { corpo: PEDIDO_DOCUMENTOS, cookie })).json();
  assertEquals(previa.documentos.map((d: { nome: string; marcados: string[] }) => [d.nome, d.marcados.length]), [["Contrato de honorários", 1], ["Procuração do escritório", 0]]);
  assertEquals(previa.frase, "1 dado sai marcado.");
  assertEquals(m.storage.bytes.size, 1);
  assert(!m.chamadas.some((c) => c.funcao === "portal_documento_gravar"));
  await m.pedir(`/v1/escritorio/contratos/${MODELO_DOC}/documentos`, { corpo: PEDIDO_DOCUMENTOS, cookie });
  const res = m.chamadas.find((c) => c.funcao === "portal_documento_gravar")!.args.p_resultado as { documentos: { id: string }[] };
  const feito = await paragrafosDocx(m.storage.bytes.get(`${AURORA}/documentos/${res.documentos[1]!.id}.docx`)!);
  assertEquals(feito, ["Outorgante: BENEDITO SOUZA LIMA, com os poderes especiais para receber e dar quitação."]);
});

Deno.test("F3.16: a lista de modelos põe o padrão só onde o escritório não tem o seu", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const r = await (await m.pedir("/v1/escritorio/documentos/modelos", { cookie })).json();
  assertEquals(r.modelos.map((x: { id: string }) => x.id), ["CONTRATO", MODELO_DOC, "HIPOSSUFICIENCIA_PF"]);
  const declaracao = r.modelos[2];
  assertEquals([declaracao.usos, declaracao.emRevisao, declaracao.codigos.length], [3, true, 2]);
  assertEquals(r.campos.length, CAMPOS_DOCUMENTO.length);
});

Deno.test("F3.16: enviar modelo confere o arquivo e avisa o campo esperado que falta; PDF é recusado", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const docx = await criarDocx([{ texto: "Outorgante: [CLIENTE_NOME], [NOME_CLIENTE]." }]);
  const r = await m.pedir("/v1/escritorio/documentos/modelos?nome=Procura%C3%A7%C3%A3o%20nova&tipo=procuracao&arquivo=procuracao.docx", { bruto: docx, cookie });
  assertEquals(r.status, 201);
  const conf = (await r.json()).conferencia;
  assertEquals([conf.faltaEsperado?.campo, conf.desconhecidos[0].sugestao], ["PODERES_ESPECIAIS", "CLIENTE_NOME"]);
  const a = m.chamadas.find((c) => c.funcao === "portal_documento_modelo_enviar")!.args;
  assertEquals([a.p_escritorio, (a.p_dados as { tipo: string }).tipo, (a.p_conferido as { desconhecidos: string[] }).desconhecidos], [AURORA, "PROCURACAO", ["NOME_CLIENTE"]]);
  assert(m.storage.bytes.has(`${AURORA}/documentos/modelos/${(a.p_conferido as { versaoId: string }).versaoId}.docx`));
  const pdf = await m.pedir("/v1/escritorio/documentos/modelos/conferir?tipo=CONTRATO", { bruto: new TextEncoder().encode("%PDF-1.7"), cookie });
  assertEquals((await erro(pdf)).detalhes, { campos: ["arquivo"], motivo: "ARQUIVO_PDF" });
  assertEquals((await erro(await m.pedir("/v1/escritorio/documentos/modelos/conferir?tipo=PETICAO", { bruto: docx, cookie }))).detalhes?.campos, ["tipo"]);
});

Deno.test("F3.16: Baixar todos junta os arquivos da geração num .zip com os nomes certos", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const contrato = await criarDocx([{ texto: "CONTRATO DE HONORÁRIOS", estilo: "titulo" }, { texto: "Cláusula primeira." }], ["Ribeiro & Matos"]);
  const procuracao = await criarDocx([{ texto: "PROCURAÇÃO", estilo: "titulo" }]);
  m.storage.bytes.set(`${AURORA}/documentos/${MODELO_DOC}.docx`, contrato);
  m.storage.bytes.set(`${AURORA}/documentos/${VERSAO_MODELO_DOC}.docx`, procuracao);
  const r = await (await m.pedir(`/v1/escritorio/documentos/geracoes/${GERACAO_DOC}/zip`, { metodo: "POST", cookie })).json();
  assertMatch(r.url, /^https:\/\/storage\.exemplo\/ler\//);
  assertEquals(m.storage.leituras.at(-1), { caminho: `${AURORA}/documentos/zip/${GERACAO_DOC}.zip`, segundos: 60, nome: "documentos-c-2026-033-benedito-souza-lima.zip" });
  const zip = m.storage.bytes.get(`${AURORA}/documentos/zip/${GERACAO_DOC}.zip`)!;
  const entradas = lerZip(zip);
  // D23, pergunta 2: Word e PDF, cada um na sua pasta.
  assertEquals([...entradas.keys()], [
    "Word/contrato-c-2026-033-benedito-souza-lima.docx", "Word/procuracao-c-2026-033-benedito-souza-lima.docx",
    "PDF/contrato-c-2026-033-benedito-souza-lima.pdf", "PDF/procuracao-c-2026-033-benedito-souza-lima.pdf",
  ]);
  assertEquals(await abrirEntrada(zip, entradas.get("Word/procuracao-c-2026-033-benedito-souza-lima.docx")!), procuracao);
  const pdfNoZip = await abrirEntrada(zip, entradas.get("PDF/contrato-c-2026-033-benedito-souza-lima.pdf")!);
  assertEquals(new TextDecoder().decode(pdfNoZip.slice(0, 5)), "%PDF-");
  await m.pedir(`/v1/escritorio/documentos/${MODELO_DOC}/abrir`, { metodo: "POST", cookie });
  assertEquals(m.storage.leituras.at(-1)!.caminho, `${AURORA}/documentos/${MODELO_DOC}.docx`);
});

Deno.test("D23: o documento também sai em PDF, guardado ao lado do .docx, e diz se o modelo tem tabela ou imagem", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  m.storage.bytes.set(`${AURORA}/documentos/${MODELO_DOC}.docx`, await criarDocx([{ texto: "PROCURAÇÃO", estilo: "titulo" }, { texto: "Outorgante: Benedito." }], ["Ribeiro & Matos", "CNPJ 41.276.839/0001-34"]));
  const r = await (await m.pedir(`/v1/escritorio/documentos/${MODELO_DOC}/abrir?formato=pdf`, { metodo: "POST", cookie })).json();
  assertEquals(r.complexo, false);
  assertEquals(m.storage.leituras.at(-1), { caminho: `${AURORA}/documentos/${MODELO_DOC}.pdf`, segundos: 60, nome: "procuracao-c-2026-033-benedito-souza-lima.pdf" });
  assertEquals(m.storage.guardados.get(`${AURORA}/documentos/${MODELO_DOC}.pdf`)?.tipo, "application/pdf");
  const pdf = new TextDecoder("latin1").decode(m.storage.bytes.get(`${AURORA}/documentos/${MODELO_DOC}.pdf`)!);
  assert(pdf.startsWith("%PDF-"));
  // Sem o .docx no Storage, o PDF não sai e o erro diz qual é.
  const falta = await m.pedir(`/v1/escritorio/documentos/${VERSAO_MODELO_DOC}/abrir?formato=pdf`, { metodo: "POST", cookie });
  assertEquals((await erro(falta)).detalhes, { motivo: "PDF_INDISPONIVEL" });
});

Deno.test("F3.16: o assinado entra pelos anexos com a versão e a data; data em formato errado é recusada", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const corpo = { dono: "CONTRATO", donoId: CLIENTE, nome: "procuracao-assinada.pdf", tipo: "application/pdf", tamanho: 1200, documentoId: MODELO_DOC, assinadoEm: "2026-11-21" };
  assertEquals((await m.pedir("/v1/escritorio/anexos", { corpo, cookie })).status, 201);
  const a = m.chamadas.find((c) => c.funcao === "portal_anexo_iniciar")!.args.p_dados as { documentoId: string; assinadoEm: string };
  assertEquals([a.documentoId, a.assinadoEm], [MODELO_DOC, "2026-11-21"]);
  assertEquals((await erro(await m.pedir("/v1/escritorio/anexos", { corpo: { ...corpo, assinadoEm: "21/11/2026" }, cookie }))).detalhes?.campos, ["assinadoEm"]);
});

Deno.test("FI-23: Escritório › Recebimento normaliza a chave Pix, o recebedor e a cidade antes do banco", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  assertEquals((await (await m.pedir("/v1/escritorio/recebimento", { cookie })).json()).versao, 0);
  const r = await m.pedir("/v1/escritorio/recebimento", { metodo: "PUT", cookie,
    corpo: { versao: 0, pixTipo: "CNPJ", pixChave: "11.222.333/0001-81", recebedor: "Aurora Advocacia", cidade: "São Paulo", instrucoes: "  Pague no escritório.  " } });
  assertEquals((await r.json()).versao, 1);
  const a = m.chamadas.find((c) => c.funcao === "portal_recebimento_salvar")!.args;
  assertEquals(a.p_escritorio, AURORA);
  assertEquals(a.p_dados, { versao: 0, pixTipo: "CNPJ", pixChave: "11222333000181", recebedor: "AURORA ADVOCACIA", cidade: "SAO PAULO", instrucoes: "Pague no escritório." });
  const e = await erro(await m.pedir("/v1/escritorio/recebimento", { metodo: "PUT", cookie,
    corpo: { versao: 1, pixTipo: "CPF", pixChave: "123", recebedor: "Advocacia Ribeiro Matos e Associados", cidade: "" } }));
  assertEquals(e.detalhes?.campos, ["pixChave", "recebedor", "cidade"]);
  assertEquals(m.chamadas.filter((c) => c.funcao === "portal_recebimento_salvar").length, 1);
});

Deno.test("F3.80: pedir a chave Pix à sócia dona leva a área e o contrato; área errada nem chega ao banco", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const r = await m.pedir("/v1/escritorio/recebimento/pedido", { cookie, corpo: { area: "CONTRATOS", contratoId: CLIENTE } });
  assertEquals((await r.json()).para.nome, "Marina Ribeiro");
  const a = m.chamadas.find((c) => c.funcao === "portal_recebimento_pedir")!.args;
  assertEquals(a.p_escritorio, AURORA);
  assertEquals(a.p_dados, { area: "CONTRATOS", contratoId: CLIENTE });
  const e = await erro(await m.pedir("/v1/escritorio/recebimento/pedido", { cookie, corpo: { area: "JURIDICO" } }));
  assertEquals(e.codigo, "VALIDATION_ERROR");
  assertEquals(m.chamadas.filter((c) => c.funcao === "portal_recebimento_pedir").length, 1);
});

Deno.test("FI-23: gerar o carnê e imprimir com o Pix de cada parcela; a vencida sai sem valor e o CPF pela metade", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const o = await (await m.pedir(`/v1/escritorio/contratos/${CLIENTE}/carnes?area=contratos`, { cookie })).json();
  assertEquals(o.area, "CONTRATOS");
  assertEquals((await erro(await m.pedir(`/v1/escritorio/contratos/${CLIENTE}/carnes?area=juridico`, { cookie }))).detalhes?.campos, ["area"]);
  const g = await m.pedir(`/v1/escritorio/contratos/${CLIENTE}/carnes`, { cookie, corpo: { area: "FINANCEIRO", parcelas: [CLIENTE.toUpperCase()] } });
  assertEquals(g.status, 201);
  const a = m.chamadas.find((c) => c.funcao === "portal_carne_gerar")!.args;
  assertEquals(a.p_dados, { area: "FINANCEIRO", parcelas: [CLIENTE], formato: "TRES", capa: true });
  const k = await (await m.pedir(`/v1/escritorio/carnes/${CLIENTE}`, { cookie })).json();
  assertEquals(k.cliente.documento, "***.982.247-**");
  assertMatch(k.parcelas[1].pix, /^000201.*5406850\.00.*0511C2026014P04.*6304[0-9A-F]{4}$/);
  assert(!k.parcelas[0].pix.includes("5406"), "a vencida sai sem valor");
  assertEquals((await m.pedir("/v1/escritorio/carnes/nao-e-id", { cookie })).status, 404);
});

Deno.test("F3.14, CH-07: o êxito para conferir, lançar com o motivo e não cobrar, sempre no escritório da sessão", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  assertEquals((await (await m.pedir("/v1/escritorio/financeiro/exitos", { cookie })).json()).n, 1);
  const e = await erro(await m.pedir(`/v1/escritorio/financeiro/exitos/${ANA}/lancar`, { corpo: { valor: 700000, vencimento: "2026-12-15" }, cookie }));
  assertEquals(e.detalhes?.motivo, "MOTIVO_OBRIGATORIO");
  const ok = await (await m.pedir(`/v1/escritorio/financeiro/exitos/${ANA}/lancar`, {
    corpo: { valor: 700000, vencimento: "2026-12-15", forma: "PIX", motivoAjuste: "Desconto combinado" }, cookie })).json();
  assertEquals(ok.parcela.tipo, "EXITO");
  const nc = await (await m.pedir(`/v1/escritorio/financeiro/exitos/${ANA}/nao-cobrar`, { corpo: { motivo: "PERDOADO", explicacao: "Renegociado" }, cookie })).json();
  assertEquals(nc.situacao, "NAO_COBRADO");
  assertEquals((await m.pedir("/v1/escritorio/financeiro/exitos/x/lancar", { corpo: {}, cookie })).status, 404);
  assert(m.chamadas.filter((c) => c.funcao.startsWith("portal_financeiro_exito")).every((c) => c.args.p_escritorio === AURORA));
});

Deno.test("F3.85, F3.14: o reembolso vai junto no registrar; o encerramento leva os valores dos clientes", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  await m.pedir(`/v1/escritorio/financeiro/parcelas/${CLIENTE}/recebimentos`, {
    corpo: { valor: 240000, recebidoEm: "2026-11-28", forma: "CHEQUE_PRE", reembolso: { valor: 124836, forma: "PIX" } }, cookie });
  assertEquals((m.chamadas.findLast((c) => c.funcao === "portal_financeiro_receber_registrar_recibo")!.args.p_dados as Record<string, unknown>).reembolso,
    { valor: 124836, forma: "PIX" });
  await m.pedir(`/v1/escritorio/juridico/casos/${ANA}/etapa`, {
    corpo: { versao: 1, etapaId: ANA, motivo: "Acordo", resultado: "ACORDO", valores: { [CLIENTE]: 2800000 }, previstoEm: "2026-12-15" }, cookie });
  const d = m.chamadas.findLast((c) => c.funcao === "portal_juridico_caso_etapa")!.args.p_dados as Record<string, unknown>;
  assertEquals([d.valores, d.previstoEm], [{ [CLIENTE]: 2800000 }, "2026-12-15"]);
});

Deno.test("F3.79: o PDF do carnê sai do servidor uma vez e fica guardado; o envio leva o PDF e a mensagem", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const caminho = `${AURORA}/carnes/${CLIENTE}.pdf`;
  const r = await (await m.pedir(`/v1/escritorio/carnes/${CLIENTE}/pdf?area=financeiro`, { cookie })).json();
  assertEquals(r.nome, "carne-helio-correa-C-2026-014.pdf");
  const pdf = m.storage.bytes.get(caminho)!;
  assertEquals(new TextDecoder().decode(pdf.slice(0, 5)), "%PDF-");
  assertEquals(m.storage.guardados.get(caminho)?.tipo, "application/pdf");
  assertEquals(m.storage.leituras.at(-1), { caminho, segundos: 60, nome: "carne-helio-correa-C-2026-014.pdf" });
  // Pedir de novo usa o guardado.
  await m.pedir(`/v1/escritorio/carnes/${CLIENTE}/pdf`, { cookie });
  assertEquals(m.storage.bytes.get(caminho), pdf);

  const p = await (await m.pedir(`/v1/escritorio/carnes/${CLIENTE}/envio?area=financeiro`, { cookie })).json();
  assertEquals(p.bloqueio, "WHATSAPP_NAO_LIGADO");
  assertEquals(p.arquivo, { nome: "carne-helio-correa-C-2026-014.pdf", tamanho: pdf.length, folhas: 1 });
  assertMatch(p.texto, /^Olá, Marta! Aqui está o carnê dos honorários do Hélio, contrato C-2026-014: as parcelas 3 a 4, de R\$ 850,00, que vencem todo dia 25\./);
  const e = await m.pedir(`/v1/escritorio/carnes/${CLIENTE}/envios`, { cookie, corpo: { area: "FINANCEIRO", texto: "  Olá, Marta!  ", tambemCliente: true } });
  assertEquals(e.status, 201);
  const a = m.chamadas.find((c) => c.funcao === "portal_carne_enviar")!.args;
  assertEquals(a.p_dados, { area: "FINANCEIRO", texto: "Olá, Marta!", tambemCliente: true,
    arquivo: { caminho, nome: "carne-helio-correa-C-2026-014.pdf", bytes: String(pdf.length) } });
  assertEquals((await erro(await m.pedir(`/v1/escritorio/carnes/${CLIENTE}/envios`, { cookie, corpo: { area: "FINANCEIRO", texto: "" } }))).codigo, "VALIDATION_ERROR");
});

Deno.test("F3.45, FI-08: a ficha do repasse traz o acerto do caso; encerrar devolve as pendências", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const f = await (await m.pedir(`/v1/escritorio/financeiro/repasses/${CLIENTE}`, { cookie })).json();
  assertEquals(f.acerto.casoId, ANA);
  assertEquals(m.chamadas.find((c) => c.funcao === "portal_financeiro_caso_acerto")!.args.p_escritorio, AURORA);
  const ok = await (await m.pedir(`/v1/escritorio/financeiro/casos/${ANA}/encerrar`, { corpo: {}, cookie })).json();
  assertEquals(ok.fechado.por.nome, "Ana");
  const e = await erro(await m.pedir(`/v1/escritorio/financeiro/casos/${CLIENTE}/encerrar`, { corpo: {}, cookie }));
  assertEquals([e.detalhes?.motivo, e.detalhes?.falta], ["PENDENCIAS", 381840]);
  assertEquals((await m.pedir("/v1/escritorio/financeiro/casos/x/encerrar", { corpo: {}, cookie })).status, 404);
  // EX-17: em cadeia, os contratos vão ao banco com a versão lida.
  await m.pedir(`/v1/escritorio/financeiro/casos/${ANA}/encerrar`, { corpo: { contratos: [{ id: CLIENTE, versao: 3 }] }, cookie });
  assertEquals(m.chamadas.filter((c) => c.funcao === "portal_financeiro_caso_encerrar").at(-1)!.args.p_contratos, [{ id: CLIENTE, versao: 3 }]);
  assertEquals(m.chamadas.filter((c) => c.funcao === "portal_financeiro_caso_encerrar")[0]!.args.p_contratos, []);
  const r = await erro(await m.pedir(`/v1/escritorio/financeiro/casos/${ANA}/encerrar`, { corpo: { contratos: [{ id: "x", versao: 0 }] }, cookie }));
  assertEquals(r.codigo, "VALIDATION_ERROR");
});

Deno.test("CH-01, FI-18: anexos do contrato, da conta e do recebimento, enviados em duas etapas no caminho do escritório da sessão", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const corpo = { dono: "CONTRATO", donoId: CLIENTE, nome: "contrato-assinado.pdf", tipo: "application/pdf", tamanho: 84000 };
  assertEquals((await erro(await m.pedir("/v1/escritorio/anexos", { corpo: { ...corpo, nome: "a/b.pdf" }, cookie }))).detalhes?.campos, ["nome"]);
  assertEquals((await m.pedir("/v1/escritorio/anexos", { corpo: { ...corpo, dono: "CASO" }, cookie })).status, 400);
  assertEquals((await m.pedir("/v1/escritorio/anexos", { corpo: { ...corpo, tipo: "application/msword" }, cookie })).status, 400);
  const ini = await m.pedir("/v1/escritorio/anexos", { corpo, cookie });
  assertEquals([ini.status, (await ini.json()).id], [201, PETICAO]);
  assertEquals(m.storage.pedidosDeEnvio.at(-1), `${AURORA}/${PETICAO}`);

  // Sem o arquivo no Storage, ou com outro tamanho, não conclui.
  assertEquals((await erro(await m.pedir(`/v1/escritorio/anexos/${PETICAO}/concluir`, { corpo: {}, cookie }))).detalhes?.motivo, "ARQUIVO_NAO_CHEGOU");
  m.storage.guardados.set(`${AURORA}/${PETICAO}`, { tamanho: 10, tipo: "application/pdf" });
  assertEquals((await erro(await m.pedir(`/v1/escritorio/anexos/${PETICAO}/concluir`, { corpo: {}, cookie }))).detalhes?.motivo, "ARQUIVO_NAO_CHEGOU");
  m.storage.guardados.set(`${AURORA}/${PETICAO}`, { tamanho: 84000, tipo: "application/pdf" });
  assertEquals((await (await m.pedir(`/v1/escritorio/anexos/${PETICAO}/concluir`, { corpo: {}, cookie })).json()).nome, "contrato-assinado.pdf");

  const abrir = await (await m.pedir(`/v1/escritorio/anexos/${PETICAO}/abrir`, { corpo: {}, cookie })).json();
  assertMatch(abrir.url, /^https:\/\/storage\.exemplo\/ler\//);
  assertEquals(m.storage.leituras.at(-1), { caminho: `${AURORA}/${PETICAO}`, segundos: 60, nome: "contrato-assinado.pdf" });
  assertEquals((await m.pedir("/v1/escritorio/anexos/nao-e-id/abrir", { corpo: {}, cookie })).status, 404);

  assertEquals((await (await m.pedir(`/v1/escritorio/contratos/${CLIENTE}/anexos`, { cookie })).json()).anexos, []);
  const busca = await (await m.pedir("/v1/escritorio/financeiro/anexos/buscar", { corpo: { contas: [CLIENTE] }, cookie })).json();
  assertEquals([busca.contas, busca.pagamentos], [[CLIENTE], []]);
  assertEquals((await m.pedir("/v1/escritorio/financeiro/anexos/buscar", { corpo: { contas: ["x"] }, cookie })).status, 400);
  assertEquals((await (await m.pedir("/v1/escritorio/financeiro/exportacoes/anexos?mes=2026-11-01", { cookie })).json()).mes, "2026-11-01");
  assertEquals((await m.pedir("/v1/escritorio/financeiro/exportacoes/anexos?mes=novembro", { cookie })).status, 400);
  assert(m.chamadas.filter((c) => c.funcao.includes("anexo")).every((c) => c.args.p_escritorio === AURORA));
});

Deno.test("F3.71: trocar quem cuida do repasse leva o motivo opcional ao banco", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  await m.pedir(`/v1/escritorio/financeiro/repasses/${CLIENTE}/responsavel`, { metodo: "PUT", corpo: { responsavelId: ANA, motivo: "Férias até 30/11." }, cookie });
  const ch = m.chamadas.find((c) => c.funcao === "portal_financeiro_repasse_responsavel")!;
  assertEquals([ch.args.p_levantamento, ch.args.p_responsavel, ch.args.p_motivo], [CLIENTE, ANA, "Férias até 30/11."]);
  const longo = await m.pedir(`/v1/escritorio/financeiro/repasses/${CLIENTE}/responsavel`, { metodo: "PUT", corpo: { responsavelId: ANA, motivo: "x".repeat(201) }, cookie });
  assertEquals((await erro(longo)).detalhes?.campos, ["motivo"]);
});

Deno.test("F3.46: anotar o atraso passa a parte da rota e os dados; o prazo do escritório vai com o número", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const corpo = { motivo: "DOCUMENTO", texto: "Falta a nota.", proximaEm: "2026-11-20", proximaComId: ANA, oQue: "Cobrar a nota por e-mail" };
  await m.pedir(`/v1/escritorio/financeiro/destinacoes/${CLIENTE}/atraso`, { metodo: "POST", corpo, cookie });
  const ch = m.chamadas.find((c) => c.funcao === "portal_financeiro_destinacao_atraso")!;
  assertEquals([ch.args.p_escritorio, ch.args.p_destinacao, (ch.args.p_dados as { oQue: string }).oQue], [AURORA, CLIENTE, "Cobrar a nota por e-mail"]);
  const ruim = await m.pedir(`/v1/escritorio/financeiro/destinacoes/${CLIENTE}/atraso`, { metodo: "POST", corpo: { motivo: "PREGUICA" }, cookie });
  assertEquals((await erro(ruim)).detalhes?.campos, ["motivo"]);
  await m.pedir("/v1/escritorio/financeiro/ajustes/prazo-repasse", { metodo: "PUT", corpo: { prazoRepasseDias: 5 }, cookie });
  assertEquals(m.chamadas.find((c) => c.funcao === "portal_financeiro_prazo_repasse")!.args.p_dias, 5);
});

Deno.test("F3.46: os motivos do atraso no domínio são os mesmos do banco", async () => {
  const { MOTIVOS_ATRASO_REPASSE } = await import("@t3jus/domain");
  const sql = await Deno.readTextFile(new URL("../../migrations/0553_repasse_atraso.sql", import.meta.url));
  const lista = /motivo\s+text not null check \(motivo in \(([^)]+)\)/.exec(sql)?.[1]?.match(/'([A-Z_]+)'/g)?.map((x) => x.slice(1, -1));
  assertEquals(lista, Object.keys(MOTIVOS_ATRASO_REPASSE));
});

Deno.test("F3.48: registrar o RPV a caminho e mudar a data levam os dados ao banco; o escritório vem da sessão", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const corpo = { tipo: "RPV", casoId: CLIENTE, clienteId: CLIENTE, tribunal: "TJSP", devedor: "Prefeitura", valor: 1840000, expedidoEm: "2026-11-18", estimadaMes: "2027-01-01" };
  await m.pedir("/v1/escritorio/financeiro/a-caminho", { metodo: "POST", corpo, cookie });
  const ch = m.chamadas.find((c) => c.funcao === "portal_financeiro_requisicao_registrar")!;
  assertEquals([ch.args.p_escritorio, (ch.args.p_dados as { valor: number }).valor], [AURORA, 1840000]);
  await m.pedir(`/v1/escritorio/financeiro/a-caminho/${CLIENTE}/data`, { metodo: "POST", corpo: { situacao: "NAO_VAI_ENTRAR", motivo: "Cancelado." }, cookie });
  assertEquals(m.chamadas.find((c) => c.funcao === "portal_financeiro_requisicao_data")!.args.p_requisicao, CLIENTE);
  const ruim = await m.pedir(`/v1/escritorio/financeiro/a-caminho/${CLIENTE}/data`, { metodo: "POST", corpo: { situacao: "TALVEZ" }, cookie });
  assertEquals((await erro(ruim)).detalhes?.campos, ["situacao"]);
  await m.pedir("/v1/escritorio/financeiro/repasses", { metodo: "POST", corpo: { tipo: "RPV", requisicaoId: CLIENTE, divisao: [] }, cookie });
  assertEquals((m.chamadas.find((c) => c.funcao === "portal_financeiro_levantamento_registrar")!.args.p_dados as { requisicaoId: string }).requisicaoId, CLIENTE);
});

Deno.test("F3.50: mandar ao contador anexa a planilha, responde para quem exportou e registra se saiu", async () => {
  const mandados: MensagemEmail[] = [];
  const m = montar({ emails: { enviar: (x) => { mandados.push(x); return Promise.resolve(); } } });
  const cookie = await noEscritorio(m);
  const r = await m.pedir(`/v1/escritorio/financeiro/exportacoes/${CLIENTE}/enviar`, { metodo: "POST", corpo: { nome: "financeiro-2026-10.xlsx", arquivo: "UEsDBA==" }, cookie });
  assertEquals((await r.json()).situacao, "ENVIADO");
  assertEquals(mandados[0]!.para, "contato@exemplo.com.br");
  assertEquals(mandados[0]!.responderPara, "ana@aurora.adv.br");
  assertEquals(mandados[0]!.anexos, [{ nome: "financeiro-2026-10.xlsx", base64: "UEsDBA==" }]);
  assertEquals(mandados[0]!.assunto, "Financeiro de outubro de 2026 · Aurora Advocacia");
  assertEquals(m.chamadas.find((c) => c.funcao === "portal_financeiro_envio_registrar")!.args.p_escritorio, AURORA);
});

Deno.test("F3.89: os comprovantes do mês vão num .zip guardado no escritório, por link de 30 dias no e-mail", async () => {
  const mandados: MensagemEmail[] = [];
  const m = montar({ comprovantes: true, emails: { enviar: (x) => { mandados.push(x); return Promise.resolve(); } } });
  m.storage.bytes.set(`${AURORA}/${ANEXO_NOTA}`, new TextEncoder().encode("%PDF-nota"));
  const cookie = await noEscritorio(m);
  const r = await m.pedir(`/v1/escritorio/financeiro/exportacoes/${CLIENTE}/enviar`, { metodo: "POST", corpo: { nome: "financeiro-2026-10.xlsx", arquivo: "UEsDBA==" }, cookie });
  assertEquals((await r.json()).situacao, "ENVIADO");
  const caminho = `${AURORA}/exportacoes/${CLIENTE}-1.zip`;
  assertEquals(m.storage.guardados.get(caminho)?.tipo, "application/zip");
  // O arquivo que sumiu do Storage fica de fora; o resto vai, com a data e o lançamento no nome.
  const zip = lerZip(m.storage.bytes.get(caminho)!);
  assertEquals([...zip.keys()], ["2026-10-05 - Aluguel da sala - Nota fiscal.pdf"]);
  const reg = m.chamadas.find((c) => c.funcao === "portal_financeiro_pasta_registrar")!;
  assertEquals([reg.args.p_escritorio, (reg.args.p_partes as { nome: string }[])[0]!.nome], [AURORA, "comprovantes-outubro-2026.zip"]);
  assertEquals(m.storage.leituras.at(-1), { caminho, segundos: 30 * 24 * 60 * 60, nome: "comprovantes-outubro-2026.zip" });
  assertMatch(mandados[0]!.html, /Baixar os comprovantes/);
  assertMatch(mandados[0]!.texto, /storage\.exemplo\/ler\/.*exportacoes/);
  assertEquals(mandados[0]!.anexos?.length, 1);
  const ate = m.chamadas.find((c) => c.funcao === "portal_financeiro_envio_registrar")!.args.p_link_ate as string;
  assertEquals(Math.round((new Date(ate).getTime() - Date.now()) / 864e5), 30);
});

Deno.test("F3.93: os recibos do mês vão em PDF na pasta Recibos do .zip, mesmo sem comprovante anexado", async () => {
  const m = montar({ recibos: true });
  const cookie = await noEscritorio(m);
  const p = await (await m.pedir(`/v1/escritorio/financeiro/exportacoes/${CLIENTE}/pasta`, { metodo: "POST", corpo: {}, cookie })).json();
  assertEquals(p.pasta.arquivos, 1);
  const zip = lerZip(m.storage.bytes.get(`${AURORA}/exportacoes/${CLIENTE}-1.zip`)!);
  assertEquals([...zip.keys()], ["Recibos/2026-10-15 - Recibo 2026-0187 - Hélio Batista Corrêa.pdf"]);
  const com = montar({ recibos: true, comprovantes: true });
  com.storage.bytes.set(`${AURORA}/${ANEXO_NOTA}`, new TextEncoder().encode("%PDF-nota"));
  const c2 = await noEscritorio(com);
  await com.pedir(`/v1/escritorio/financeiro/exportacoes/${CLIENTE}/pasta`, { metodo: "POST", corpo: {}, cookie: c2 });
  assertEquals([...lerZip(com.storage.bytes.get(`${AURORA}/exportacoes/${CLIENTE}-1.zip`)!).keys()],
    ["2026-10-05 - Aluguel da sala - Nota fiscal.pdf", "Recibos/2026-10-15 - Recibo 2026-0187 - Hélio Batista Corrêa.pdf"]);
});

Deno.test("F3.22b: baixar os comprovantes monta a pasta e devolve links curtos; sem comprovantes, nada", async () => {
  const m = montar({ comprovantes: true });
  m.storage.bytes.set(`${AURORA}/${ANEXO_NOTA}`, new TextEncoder().encode("%PDF-nota"));
  const cookie = await noEscritorio(m);
  const r = await m.pedir(`/v1/escritorio/financeiro/exportacoes/${CLIENTE}/pasta`, { metodo: "POST", corpo: {}, cookie });
  const p = await r.json();
  assertEquals([p.pasta.arquivos, p.pasta.partes[0].nome], [1, "comprovantes-outubro-2026.zip"]);
  assertEquals(m.storage.leituras.at(-1)!.segundos, 60);
  const sem = montar();
  const c2 = await noEscritorio(sem);
  assertEquals(await (await sem.pedir(`/v1/escritorio/financeiro/exportacoes/${CLIENTE}/pasta`, { metodo: "POST", corpo: {}, cookie: c2 })).json(), { pasta: null });
  assertEquals((await sem.pedir("/v1/escritorio/financeiro/exportacoes/nao-e-id/pasta", { metodo: "POST", corpo: {}, cookie: c2 })).status, 404);
});

Deno.test("F3.50: sem o Resend, ou se ele recusa, o envio fica como não saiu", async () => {
  const sem = montar();
  const c1 = await noEscritorio(sem);
  const r1 = await sem.pedir(`/v1/escritorio/financeiro/exportacoes/${CLIENTE}/enviar`, { metodo: "POST", corpo: { nome: "a.xlsx", arquivo: "UEsDBA==" }, cookie: c1 });
  assertEquals((await r1.json()).situacao, "FALHOU");
  const recusa = montar({ emails: { enviar: () => Promise.reject(new Error("Resend respondeu 500")) } });
  const c2 = await noEscritorio(recusa);
  const r2 = await recusa.pedir(`/v1/escritorio/financeiro/exportacoes/${CLIENTE}/enviar`, { metodo: "POST", corpo: { nome: "a.xlsx", arquivo: "UEsDBA==" }, cookie: c2 });
  assertEquals((await r2.json()).situacao, "FALHOU");
  const vazio = await recusa.pedir(`/v1/escritorio/financeiro/exportacoes/${CLIENTE}/enviar`, { metodo: "POST", corpo: { nome: "a.xlsx" }, cookie: c2 });
  assertEquals((await erro(vazio)).detalhes?.campos, ["arquivo"]);
});

Deno.test("F3.50 e F3.49: os ajustes e a meta vão ao banco com o escritório da sessão", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  await m.pedir("/v1/escritorio/financeiro/ajustes", { metodo: "PUT", corpo: { contador: { nome: "Paulo Serra", email: "contato@exemplo.com.br" }, prazoRepasseDias: 2 }, cookie });
  const a = m.chamadas.find((c) => c.funcao === "portal_financeiro_ajustes_salvar")!;
  assertEquals([a.args.p_escritorio, (a.args.p_dados as { prazoRepasseDias: number }).prazoRepasseDias], [AURORA, 2]);
  await m.pedir("/v1/escritorio/financeiro/meta", { metodo: "PUT", corpo: { valor: 5000000, mes: "2026-11-01", soMes: false }, cookie });
  assertEquals((m.chamadas.find((c) => c.funcao === "portal_financeiro_meta")!.args.p_dados as { valor: number }).valor, 5000000);
  await m.pedir("/v1/escritorio/financeiro/meta/tirar", { metodo: "POST", corpo: { mes: "2026-12-01" }, cookie });
  const t = m.chamadas.find((c) => c.funcao === "portal_financeiro_meta_tirar")!;
  assertEquals([t.args.p_escritorio, (t.args.p_dados as { mes: string }).mes], [AURORA, "2026-12-01"]);
});

Deno.test("F3.50: o lembrete do contador no domínio é o mesmo tipo do banco", async () => {
  const sql = await Deno.readTextFile(new URL("../../migrations/0557_envio_contador.sql", import.meta.url));
  assertEquals(sql.includes("'EXPORTAR_CONTADOR'"), true);
});

/** Um PNG RGBA de 8 bits, sem filtro, com um retângulo pintado no meio. */
async function pngComRetangulo(largura: number, altura: number, cor: [number, number, number]): Promise<Uint8Array> {
  const cru = new Uint8Array((largura * 4 + 1) * altura);
  for (let y = 10; y < altura - 10; y++) {
    for (let x = 10; x < largura - 10; x++) cru.set([...cor, 255], y * (largura * 4 + 1) + 1 + x * 4);
  }
  const idat = new Uint8Array(await new Response(new Blob([cru]).stream().pipeThrough(new CompressionStream("deflate"))).arrayBuffer());
  const crc = (b: Uint8Array) => {
    let c = ~0;
    for (const x of b) { c ^= x; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); }
    return ~c >>> 0;
  };
  const pedaco = (nome: string, dados: Uint8Array) => {
    const out = new Uint8Array(12 + dados.length);
    const dv = new DataView(out.buffer);
    dv.setUint32(0, dados.length);
    out.set([...nome].map((ch) => ch.charCodeAt(0)), 4);
    out.set(dados, 8);
    dv.setUint32(8 + dados.length, crc(out.subarray(4, 8 + dados.length)));
    return out;
  };
  const ihdr = new Uint8Array(13);
  new DataView(ihdr.buffer).setUint32(0, largura);
  new DataView(ihdr.buffer).setUint32(4, altura);
  ihdr[8] = 8; ihdr[9] = 6;
  const partes = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), pedaco("IHDR", ihdr), pedaco("IDAT", idat), pedaco("IEND", new Uint8Array())];
  const total = new Uint8Array(partes.reduce((t, x) => t + x.length, 0));
  let o = 0;
  for (const x of partes) { total.set(x, o); o += x.length; }
  return total;
}

Deno.test("F3.84, VA-05: \"Não foi paga\" e \"Foi paga, sim\" vão ao banco com o escritório da sessão", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const r = await m.pedir(`/v1/escritorio/contratos/${CLIENTE}/pago-antes/${VERSAO_PET.toUpperCase()}/nao-paga`, { cookie, corpo: { motivo: "O cliente diz que não pagou" } });
  assertEquals(r.status, 201);
  const a = m.chamadas.find((c) => c.funcao === "portal_pago_antes_nao_paga")!.args;
  assertEquals([a.p_escritorio, a.p_contrato, a.p_recebimento], [AURORA, CLIENTE, VERSAO_PET]);
  assertEquals(a.p_dados, { vencimento: "ORIGINAL", motivo: "O cliente diz que não pagou" });
  assertEquals((await erro(await m.pedir(`/v1/escritorio/contratos/${CLIENTE}/pago-antes/nao-e-id/nao-paga`, { cookie, corpo: { motivo: "abc" } }))).codigo, "NOT_FOUND");
  const f = await m.pedir(`/v1/escritorio/recebimentos/${CLIENTE}/foi-paga`, { cookie, corpo: { motivo: "Achei o comprovante" } });
  assertEquals((await f.json()).contratoId, CLIENTE);
  assertEquals(m.chamadas.find((c) => c.funcao === "portal_pago_antes_foi_paga")!.args.p_dados, { motivo: "Achei o comprovante" });
});

Deno.test("F3.44: a prestação de contas pelo WhatsApp leva o texto montado do registro, o mesmo da prévia", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const r = await m.pedir(`/v1/escritorio/financeiro/repasses/${CLIENTE}/prestacao/envio`, { corpo: { texto: "o navegador não manda o texto" }, cookie });
  assertEquals(r.status, 201);
  const a = m.chamadas.find((c) => c.funcao === "portal_financeiro_prestacao_enviar")!.args;
  assertEquals([a.p_escritorio, a.p_levantamento], [AURORA, CLIENTE]);
  const texto = (a.p_dados as { texto: string }).texto;
  assertEquals(texto.startsWith("Olá, Benedito. Aqui é do escritório Aurora Advocacia."), true);
  assertEquals(texto.includes("Fica para você: R$ 700,00"), true);
});

Deno.test("F3.19: mandar o recibo pelo WhatsApp gera e guarda o PDF e passa o caminho montado no servidor", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const r = await m.pedir(`/v1/escritorio/recibos/${CLIENTE}/envio`, { corpo: {}, cookie });
  assertEquals(r.status, 201);
  const caminho = `${AURORA}/recibos/${CLIENTE}.pdf`;
  assertEquals(m.storage.guardados.get(caminho)?.tipo, "application/pdf");
  const a = m.chamadas.find((c) => c.funcao === "portal_recibo_enviar")!.args;
  assertEquals([a.p_escritorio, a.p_pagamento], [AURORA, CLIENTE]);
  const arq = (a.p_dados as { arquivo: { caminho: string; nome: string; bytes: string } }).arquivo;
  assertEquals([arq.caminho, arq.nome, arq.bytes], [caminho, "recibo-2026-0187-helio-correa.pdf", String(m.storage.guardados.get(caminho)!.tamanho)]);
});

Deno.test("F3.42: \"Pedir de novo\" pelo WhatsApp chama a função da fila com o pedido da rota", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const r = await m.pedir(`/v1/escritorio/juridico/pedidos/${CLIENTE}/de-novo/whatsapp`, { corpo: {}, cookie });
  assertEquals(r.status, 200);
  assertEquals(m.chamadas.find((c) => c.funcao === "portal_juridico_documento_repedir_whatsapp")!.args, { p_pessoa: ANA, p_escritorio: AURORA, p_pedido: CLIENTE });
});

Deno.test("F3.81: o PNG do logo é conferido de novo na API e guardado na pasta do escritório da sessão", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  const png = await pngComRetangulo(720, 240, [0x69, 0x27, 0x46]);
  const r = await m.pedir("/v1/escritorio/recebimento/logo?nome=logo-aurora.svg&formato=SVG&bytes=9000&corte=12,4,12,4", { bruto: png, cookie });
  assertEquals(r.status, 201);
  const logo = await r.json();
  assertEquals([logo.largura, logo.altura, logo.passa, logo.formato], [720, 240, true, "SVG"]);
  assertEquals(logo.corte, { esquerda: 12, topo: 4, direita: 12, baixo: 4 });
  const a = m.chamadas.find((c) => c.funcao === "portal_recebimento_logo_registrar")!.args;
  assertEquals(a.p_escritorio, AURORA);
  const caminho = `${AURORA}/logos/${logo.id}.png`;
  assertEquals(m.storage.guardados.get(caminho), { tamanho: png.length, tipo: "image/png" });
  // Abrir o logo: o caminho vem do banco; a imagem sai como PNG.
  const img = await m.pedir(`/v1/escritorio/logos/${logo.id}`, { cookie });
  assertEquals(img.headers.get("content-type"), "image/png");
  assertEquals(new Uint8Array(await img.arrayBuffer()).length, png.length);
  // Recusas: pequeno, arquivo grande, não é PNG, formato que não entra.
  const pequeno = await pngComRetangulo(300, 120, [0, 0, 0]);
  assertEquals((await erro(await m.pedir("/v1/escritorio/recebimento/logo?nome=a.png&formato=PNG&bytes=900", { bruto: pequeno, cookie }))).detalhes?.motivo, "LOGO_PEQUENO");
  assertEquals((await erro(await m.pedir("/v1/escritorio/recebimento/logo?nome=a.png&formato=PNG&bytes=2000000", { bruto: png, cookie }))).detalhes?.motivo, "LOGO_GRANDE");
  assertEquals((await erro(await m.pedir("/v1/escritorio/recebimento/logo?nome=a.png&formato=PNG&bytes=900", { bruto: new TextEncoder().encode("%PDF-1.7"), cookie }))).detalhes?.motivo, "LOGO_FORMATO");
  assertEquals((await erro(await m.pedir("/v1/escritorio/recebimento/logo?nome=a.pdf&formato=PDF&bytes=900", { bruto: png, cookie }))).detalhes?.campos, ["formato"]);
  assertEquals(m.chamadas.filter((c) => c.funcao === "portal_recebimento_logo_registrar").length, 1);
});

Deno.test("F3.81, F3.19: Salvar a marca e a OAB passa só o que a tela mandou", async () => {
  const m = montar();
  const cookie = await noEscritorio(m);
  await m.pedir("/v1/escritorio/recebimento", { metodo: "PUT", cookie,
    corpo: { versao: 2, marca: "LOGO", logoId: VERSAO_PET.toUpperCase(), logoCor: "UMA_COR", oabUf: "SP", oabNumero: "31.874" } });
  const a = m.chamadas.find((c) => c.funcao === "portal_recebimento_salvar")!.args;
  assertEquals(a.p_dados, { versao: 2, pixTipo: null, pixChave: null, recebedor: null, cidade: null, instrucoes: null,
    marca: "LOGO", logoId: VERSAO_PET, logoCor: "UMA_COR", oabUf: "SP", oabNumero: "31.874" });
});
