// Contratos › Procurações e modelos (CH-08, F3.16): rotas, textos e contas das telas, sem React,
// para os testes de unidade. Desenho aprovado em docs/design/aprovadas/portal-procuracoes. As
// regras de verdade (quem pode, o que bloqueia, as versões) estão no servidor
// (0680_documentos_contrato.sql); aqui só o que a tela mostra.

import {
  cidadeDataDocumento, CODIGOS_PODERES, DOCUMENTOS_CONTRATO, fraseOutorgados, outorgadosEscolhidos,
  type DadosDocumentos, type EscolhasDocumentos, type ModeloEmUso, type PoderEspecial, type TipoDocumentoContrato,
} from "@t3jus/domain";

export const ROTAS_DOCUMENTOS = {
  lista: "/contratos/modelos",
  modelos: "/contratos/modelos/modelos",
  gerar: (contrato?: string | null) => (contrato ? `/contratos/modelos/gerar?contrato=${contrato}` : "/contratos/modelos/gerar"),
  contrato: (id: string) => `/contratos/contratos/${id}`,
  documentosDoContrato: (id: string) => `/contratos/contratos/${id}?aba=documentos`,
  novoContrato: "/contratos/contratos/novo",
  cliente: (id: string) => `/clientes/${id}`,
};

export const API_DOCUMENTOS = "/v1/escritorio/documentos";

/** Os poderes na ordem da tela, com o rótulo curto e a ajuda (decisão 11). */
export const PODERES_TELA: Record<PoderEspecial, { rotulo: string; ajuda?: string }> = {
  RECEBER_QUITAR: { rotulo: "Receber e dar quitação", ajuda: "Para levantar alvará e RPV." },
  ACORDO: { rotulo: "Firmar acordo (transigir)" },
  SUBSTABELECER: { rotulo: "Substabelecer", ajuda: "Com ou sem reserva de poderes." },
  DESISTIR: { rotulo: "Desistir da ação" },
  RENUNCIAR: { rotulo: "Renunciar ao direito" },
  RECONHECER: { rotulo: "Reconhecer a procedência do pedido" },
  CITACAO: { rotulo: "Receber citação" },
  CONFESSAR: { rotulo: "Confessar" },
  COMPROMISSO: { rotulo: "Firmar compromisso" },
  HIPOSSUFICIENCIA: { rotulo: "Assinar declaração de hipossuficiência", ajuda: "Em nome do cliente." },
};

/** A chave de um documento: o tipo, ou "OUTRO:<modelo>" (como no banco). */
export const chaveModelo = (m: Pick<ModeloEmUso, "tipo" | "modeloId">) => (m.tipo === "OUTRO" ? `OUTRO:${m.modeloId}` : m.tipo);

/** O nome curto do documento: a aba da prévia e a frase da faixa. */
export function nomeCurto(tipo: TipoDocumentoContrato, nome?: string): string {
  if (tipo === "CONTRATO") return "Contrato";
  if (tipo === "PROCURACAO") return "Procuração";
  if (tipo === "HIPOSSUFICIENCIA") return "Declaração";
  return nome ?? DOCUMENTOS_CONTRATO.OUTRO;
}

/** "Modelo do escritório, v2" ou "Padrão T3jus" (decisão 9). */
export function origemModelo(m: Pick<ModeloEmUso, "padrao" | "numero" | "emRevisao">): string {
  if (m.padrao) return m.emRevisao ? "Padrão T3jus, em revisão" : "Padrão T3jus";
  return `Modelo do escritório, v${m.numero ?? 1}`;
}

export interface FormDocumentos {
  docs: string[];
  outorgados: Record<string, string[]>;
  poderes: PoderEspecial[];
  outroPoder: string;
  cidadeData: string;
}

/** O que já tem assinado na versão mais nova vem desmarcado; o contrato já assinado também (decisões 9 e 19). */
export function chavesAssinadas(d: DadosDocumentos): Set<string> {
  const s = new Set(d.atuais.filter((a) => a.assinado).map((a) => a.chave));
  if (d.contrato.assinadoEm) s.add("CONTRATO");
  return s;
}

/** A primeira marcação: a da última geração ou os advogados do contrato (decisões 10, 11 e 19). */
export function formInicialDocumentos(d: DadosDocumentos): FormDocumentos {
  const assinadas = chavesAssinadas(d);
  const disponiveis = d.modelos.map(chaveModelo);
  const ultima = d.ultima;
  const base = ultima
    ? ultima.documentos.map((x) => chaveModelo({ tipo: x.tipo, modeloId: x.modeloId }))
    : d.modelos.filter((m) => m.tipo !== "OUTRO").map(chaveModelo);
  const docs = base.filter((k) => disponiveis.includes(k) && !assinadas.has(k));
  const outorgados: Record<string, string[]> = {};
  if (ultima) {
    for (const o of ultima.outorgados) {
      const a = d.advogados.find((x) => x.pessoaId === o.pessoaId);
      const ids = a ? o.inscricoes.filter((i) => a.inscricoes.some((x) => x.id === i)) : [];
      if (ids.length) outorgados[o.pessoaId] = ids;
    }
  }
  if (!Object.keys(outorgados).length) {
    for (const a of d.advogados) if (a.noContrato && a.escolhidas.length) outorgados[a.pessoaId] = [...a.escolhidas];
  }
  return {
    docs,
    outorgados,
    poderes: CODIGOS_PODERES.filter((p) => (ultima?.poderes ?? d.poderesIniciais).includes(p)),
    outroPoder: ultima?.outroPoder ?? "",
    cidadeData: cidadeDataDocumento(d.escritorio, d.hoje),
  };
}

/** O pedido que vai à API, na ordem dos modelos. */
export function pedidoDocumentos(d: DadosDocumentos, f: FormDocumentos): EscolhasDocumentos {
  return {
    documentos: d.modelos.filter((m) => f.docs.includes(chaveModelo(m))).map((m) => ({ tipo: m.tipo, modeloId: m.tipo === "OUTRO" ? m.modeloId : null })),
    outorgados: d.advogados.filter((a) => f.outorgados[a.pessoaId]?.length).map((a) => ({ pessoaId: a.pessoaId, inscricoes: f.outorgados[a.pessoaId]! })),
    poderes: f.poderes,
    outroPoder: f.outroPoder.trim() || null,
    cidadeData: f.cidadeData.trim(),
  };
}

/** "MARINA RIBEIRO, OAB/SP nº 214.538, e FELIPE MATOS, …" (a faixa "No documento:"). */
export function fraseNoDocumentoOutorgados(d: DadosDocumentos, f: FormDocumentos): string {
  const lista = outorgadosEscolhidos(d, pedidoDocumentos(d, f));
  return lista.length ? fraseOutorgados(lista) : "ninguém marcado ainda.";
}

/** Os erros que bloqueiam, conferidos na tela antes de pedir (o servidor confere de novo, decisão 13). */
export function errosDocumentos(f: FormDocumentos): Record<string, string> {
  const e: Record<string, string> = {};
  if (!f.docs.length) e.documentos = "DOCUMENTO_OBRIGATORIO";
  if (!Object.values(f.outorgados).some((x) => x.length)) e.outorgados = "SEM_OUTORGADO";
  if (f.outroPoder.trim().length > 300) e.outroPoder = "TEXTO_LONGO";
  if (f.cidadeData.trim().length < 3) e.cidadeData = "CIDADE_DATA_OBRIGATORIA";
  else if (f.cidadeData.trim().length > 120) e.cidadeData = "CIDADE_DATA_LONGA";
  return e;
}

/** Os erros, ditos para a pessoa, presos ao grupo (decisão 13). */
export const ERROS_DOCUMENTO: Record<string, string> = {
  DOCUMENTO_OBRIGATORIO: "Marque ao menos um documento. Sem documento, não há o que gerar.",
  SEM_OUTORGADO: "Marque ao menos um advogado. Sem outorgado, a procuração não tem a quem dar os poderes, e o contrato não tem quem assine pelo escritório.",
  ADVOGADO_SEM_OAB: "Um dos advogados não tem mais OAB na Equipe. Recarregue a página.",
  INSCRICAO_INVALIDA: "Cada advogado marcado precisa de ao menos uma inscrição.",
  PODER_INVALIDO: "Um dos poderes não vale mais. Recarregue a página.",
  TEXTO_LONGO: "Passou de 300 letras. Encurte.",
  CIDADE_DATA_OBRIGATORIA: "Escreva a cidade e a data. Ex.: São Paulo, 21 de novembro de 2026.",
  CIDADE_DATA_LONGA: "A cidade e a data passaram de 120 letras.",
  MODELO_INVALIDO: "Um dos modelos não está mais disponível. Recarregue a página.",
};

/** O título curto de cada erro no resumo do topo, com link para o grupo. */
export const RESUMO_ERRO_DOCUMENTO: Record<string, string> = {
  documentos: "Nenhum documento marcado",
  outorgados: "Nenhum advogado outorgado",
  poderes: "Poderes especiais",
  outroPoder: "Outro poder",
  cidadeData: "Cidade e data",
};

/** "Falta 1 dado de Benedito: o RG." (decisão 13). */
export function tituloFaltas(faltas: string[], nome: string): string {
  const pn = nome.trim().split(/\s+/)[0] ?? nome;
  if (faltas.length === 1) return `Falta 1 dado de ${pn}: ${faltas[0]}.`;
  return `Faltam ${faltas.length} dados de ${pn}: ${juntar(faltas)}.`;
}

export function juntar(l: readonly string[]): string {
  return l.length <= 1 ? (l[0] ?? "") : `${l.slice(0, -1).join(", ")} e ${l[l.length - 1]}`;
}

/** "Vão sair 3 arquivos .docx: contrato, procuração e declaração." (a faixa do botão). */
export function fraseVaoSair(d: DadosDocumentos, f: FormDocumentos): string {
  const nomes = d.modelos.filter((m) => f.docs.includes(chaveModelo(m))).map((m) => nomeCurto(m.tipo, m.nome).toLowerCase());
  if (!nomes.length) return "Nenhum documento marcado.";
  return nomes.length === 1 ? `Vai sair 1 arquivo .docx: ${nomes[0]}.` : `Vão sair ${nomes.length} arquivos .docx: ${juntar(nomes)}.`;
}

/** "Gerar 3 documentos", "Gerar a versão 2" (decisões 7 e 19). */
export function botaoGerar(d: DadosDocumentos, f: FormDocumentos): string {
  const n = f.docs.length;
  if (d.ultima && n) {
    const versoes = d.atuais.filter((a) => f.docs.includes(a.chave)).map((a) => a.numero + 1);
    const v = versoes.length ? Math.max(...versoes) : 1;
    if (v > 1) return `Gerar a versão ${v}`;
  }
  return n === 1 ? "Gerar 1 documento" : `Gerar ${n} documentos`;
}

/** O que a aba da prévia mostra ao lado do nome: "1 falta" ou nada. */
export const seloAba = (marcados: number) => (marcados ? `${marcados} ${marcados === 1 ? "falta" : "faltam"}` : null);

/** Os assinados (decisão 17): PDF ou foto, até 10 MB; o .docx gerado não serve. */
export function problemaDoAssinado(nome: string, tamanho: number): string | null {
  if (/\.docx?$/i.test(nome)) return "Este arquivo é o .docx gerado, não o assinado. Anexe o PDF ou a foto do papel assinado.";
  if (!/\.(pdf|jpe?g|png)$/i.test(nome)) return "Tipo não aceito. Anexe o PDF ou a foto (JPG ou PNG) do papel assinado.";
  if (tamanho > 10 * 1024 * 1024) return "O arquivo passou de 10 MB. Digitalize com qualidade menor ou junte as páginas num PDF só.";
  if (tamanho <= 0) return "O arquivo está vazio. Escolha o PDF ou a foto do papel assinado.";
  return null;
}

/** Várias páginas (F3.99): um PDF só ou até 10 fotos, sem misturar. Cada foto vale como um arquivo. */
export function problemaDosAssinados(arquivos: { name: string; size: number }[]): string | null {
  if (arquivos.length <= 1) return arquivos[0] ? problemaDoAssinado(arquivos[0].name, arquivos[0].size) : null;
  if (arquivos.some((a) => /\.docx?$/i.test(a.name))) return problemaDoAssinado(arquivos.find((a) => /\.docx?$/i.test(a.name))!.name, 1);
  if (arquivos.some((a) => !/\.(jpe?g|png)$/i.test(a.name))) return "Para várias páginas, escolha um PDF só ou até 10 fotos, sem misturar PDF e foto.";
  if (arquivos.length > 10) return `São ${arquivos.length} fotos, e o limite é 10 por documento. Junte as páginas num PDF só.`;
  for (const a of arquivos) {
    const p = problemaDoAssinado(a.name, a.size);
    if (p) return `${a.name}: ${p.charAt(0).toLowerCase()}${p.slice(1)}`;
  }
  return null;
}

/** "Assinado em 30/10" (a lista e a aba Documentos). */
export function seloAssinado(tipo: TipoDocumentoContrato, dia: string | null): string {
  const fem = tipo === "PROCURACAO" || tipo === "HIPOSSUFICIENCIA";
  const quando = dia ? ` em ${dia.slice(8, 10)}/${dia.slice(5, 7)}` : "";
  return `${fem ? "Assinada" : "Assinado"}${quando}`;
}

/** A categoria do anexo assinado de cada documento. */
export function rotuloAssinado(tipo: TipoDocumentoContrato): string {
  if (tipo === "CONTRATO") return "Contrato assinado";
  if (tipo === "PROCURACAO") return "Procuração assinada";
  if (tipo === "HIPOSSUFICIENCIA") return "Declaração assinada";
  return "Documento assinado";
}
