// Contratos › Procurações e modelos (CH-08, F3.16): rotas, textos e contas das telas, sem React,
// para os testes de unidade. Desenho aprovado em docs/design/aprovadas/portal-procuracoes. As
// regras de verdade (quem pode, o que bloqueia, as versões) estão no servidor
// (0680_documentos_contrato.sql); aqui só o que a tela mostra.

import {
  aniversario, cidadeDataDocumento, faltaNaSugestao, marcadosDaArea, rotuloAreaDocumentos, type AreaDireito, CODIGOS_PODERES, dataBr, DOCUMENTOS_CONTRATO, faltasDoResponsavel, faltasDoResponsavelComMarcas, faltasNoDocumento, fraseOutorgados, idadeEm, tituloDaIdade,
  outorgadosEscolhidos, PAPEIS_RESPONSAVEL, papelFeminino, situacaoNoDia,
  type Anexo, type ClienteDoDocumento, type DadosDocumentos, type DocumentosDoContrato, type EscolhasDocumentos, type ModeloEmUso, type PoderEspecial,
  type PreviaDocumentos, type TipoDocumentoContrato,
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
  /** A área do seletor "Sugestão para" (CH-14). Opcional: as escolhas guardadas antes dela continuam valendo. */
  area?: AreaDireito | null;
  /** A pessoa mexeu em alguma caixa de documento (CH-14, revisão, ajuste 8): trocar a área não muda nada sozinho. */
  mexeu?: boolean;
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
  const s = d.sugestao ?? null;
  // Gerar de novo: as escolhas da última vez (decisão 19). A primeira: a lista da área (CH-14), ou os três de sempre.
  const base = ultima
    ? ultima.documentos.map((x) => chaveModelo({ tipo: x.tipo, modeloId: x.modeloId }))
    : s ? marcadosDaArea(s.area, s, disponiveis, assinadas) : d.modelos.filter((m) => m.tipo !== "OUTRO").map(chaveModelo);
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
    area: s?.area ?? null,
    // Em Gerar de novo, as caixas vieram da última geração: trocar a área só oferece a sugestão.
    mexeu: !!ultima,
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
    // A área só vai quando fica no contrato (pergunta 2); o servidor confere de novo.
    ...(areaVaiAoContrato(d, f) ? { area: f.area } : {}),
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

// ------------------------------------------------------------- Gerar documentos do menor (F3.142)
// Estados gerar-representado, gerar-assistido, gerar-falta e gerar-fez-18 do desenho aprovado em
// docs/design/aprovadas/portal-responsavel-legal (D25). A conta é a do domínio, com o "hoje" do
// servidor (Brasília), para a tela e o documento dizerem o mesmo. O T3jus não guarda o gênero do
// cliente: onde o desenho diz "ele", vai o primeiro nome, e o particípio leva "(a)" (pergunta 7).

const primeiroNome = (nome: string) => nome.trim().split(/\s+/)[0] ?? nome;

/** "o documento", "os dois documentos", "os três documentos"; nenhum marcado: "os documentos". */
export function quantosDocumentos(n: number): string {
  return ["os documentos", "o documento", "os dois documentos", "os três documentos"][n] ?? `os ${n} documentos`;
}

export type CasoDoMenor = "REPRESENTADO" | "ASSISTIDO" | "FEZ_18";

/**
 * Em que caso do menor a página está, no dia. Fora do menor (PJ, quem assina por si, curatela),
 * null. Sem data de nascimento ou sem quem assina também null: o banco não deixa gravar menor
 * assim (0830), e sem a data não há conta a fazer.
 */
export function casoDoMenor(c: ClienteDoDocumento, hoje: string): CasoDoMenor | null {
  if (c.tipo !== "PF" || c.capacidade !== "MENOR" || !c.nascimento || !c.rlNome?.trim()) return null;
  const s = situacaoNoDia("MENOR", c.nascimento, hoje).situacao;
  return s === "REPRESENTADO" || s === "ASSISTIDO" || s === "FEZ_18" ? s : null;
}

/** Cada falta de quem assina (o texto de faltasDoResponsavel), na forma curta. As marcas vêm do domínio (F3.161). */
export const FALTA_DE_QUEM_ASSINA: Record<string, string> = {
  "o CPF de quem assina": "o CPF",
  "o RG de quem assina": "o RG",
  "a qualificação de quem assina": "a qualificação",
  "o endereço de quem assina": "o endereço",
};

/** As faltas de quem assina, na ordem do domínio, para "o CPF e o RG de Joana", com as marcas que saem no .docx. */
export function faltasDeQuemAssina(c: ClienteDoDocumento): { curta: string; marcas: string[] }[] {
  return faltasDoResponsavelComMarcas(c).flatMap((f) => (FALTA_DE_QUEM_ASSINA[f.falta] ? [{ curta: FALTA_DE_QUEM_ASSINA[f.falta]!, marcas: f.marcas }] : []));
}

/** As faltas do próprio cliente: as do documento menos as de quem assina. */
export function faltasDoProprioCliente(c: ClienteDoDocumento, hoje: string): string[] {
  const rl = new Set(faltasDoResponsavel(c));
  return faltasNoDocumento(c, hoje).filter((f) => !rl.has(f));
}

/** "a mãe", "o pai", "a tutora", "o tutor". */
function papelComArtigo(c: ClienteDoDocumento): string {
  const p = c.rlPapel ?? "MAE";
  return `${papelFeminino(p) ? "a" : "o"} ${PAPEIS_RESPONSAVEL[p].toLowerCase()}`;
}

/** O aviso do representado e do assistido, sem falta de quem assina (gerar-representado, gerar-assistido). */
/** Quem assina pelo menor é tutora ou tutor (F3.140): o aviso e a faixa lembram de juntar o termo de tutela. */
export const assinaTutela = (c: Pick<ClienteDoDocumento, "rlPapel">) => c.rlPapel === "TUTORA" || c.rlPapel === "TUTOR";

/**
 * A frase do termo de tutela no fim do aviso do menor (F3.140, docs/design/aprovadas/portal-termo-tutela,
 * item 5): com o termo na ficha, diz que está lá para baixar; sem ele, só lembra de juntar.
 */
export function fraseDoTermoDeTutela(c: Pick<ClienteDoDocumento, "rlPapel">, temTermo: boolean): string {
  if (!assinaTutela(c)) return "";
  return temTermo ? " Junte uma cópia do termo de tutela à procuração: ele está na ficha, para baixar." : " Junte uma cópia do termo de tutela à procuração.";
}

export function avisoDoMenor(c: ClienteDoDocumento, hoje: string, docs: number, temTermo = false): { titulo: string; texto: string } | null {
  const caso = casoDoMenor(c, hoje);
  if (caso !== "REPRESENTADO" && caso !== "ASSISTIDO") return null;
  const p = primeiroNome(c.nome);
  const r = primeiroNome(c.rlNome!);
  const idade = idadeEm(c.nascimento!, hoje);
  if (caso === "REPRESENTADO") {
    return {
      titulo: tituloDaIdade(p, idade, "REPRESENTADO"),
      texto: `Só ${r} assina, em nome de ${p}, ${quantosDocumentos(docs)}. Em ${dataBr(aniversario(c.nascimento!, 16))}, aos 16 anos, ${p} passa a ser assistido(a), e os dois assinam. O T3jus faz a conta pela data de nascimento, no dia de gerar.${fraseDoTermoDeTutela(c, temTermo)}`,
    };
  }
  return {
    titulo: tituloDaIdade(p, idade, "ASSISTIDO"),
    texto: `Os dois assinam ${quantosDocumentos(docs)}: ${p} e ${papelComArtigo(c)}, ${r}, que o(a) assiste. Em ${dataBr(aniversario(c.nascimento!, 18))}, aos 18 anos, ${p} passa a assinar sozinho(a).${fraseDoTermoDeTutela(c, temTermo)}`,
  };
}

/** O aviso quando falta dado de quem assina (gerar-falta), com as marcas que saem no .docx. */
export function avisoFaltaQuemAssina(c: ClienteDoDocumento, docs: number, temTermo = false): { titulo: string; texto: string } | null {
  const f = faltasDeQuemAssina(c);
  if (!f.length) return null;
  const p = primeiroNome(c.nome);
  const r = c.rlNome?.trim() ? primeiroNome(c.rlNome) : "quem assina";
  const lista = `${juntar(f.map((x) => x.curta))} de ${r}`;
  const marcas = f.flatMap((x) => x.marcas);
  const sai = `${quantosDocumentos(docs)} ${docs === 1 ? "sai" : "saem"}`;
  return {
    titulo: f.length === 1 ? `Falta 1 dado de quem assina por ${p}: ${lista}.` : `Faltam ${f.length} dados de quem assina por ${p}: ${lista}.`,
    texto: `Dá para gerar assim: ${sai} com ${juntar(marcas)}, para preencher à mão ou no Word. Ou complete a ficha antes: ao salvar, você volta para cá.${fraseDoTermoDeTutela(c, temTermo)}`,
  };
}

/** A linha a mais no quadro "Quem assina por…" quando falta dado: "Faltam o CPF e o RG dela". */
export function linhaFaltaNoQuadro(c: ClienteDoDocumento): string | null {
  const f = faltasDeQuemAssina(c);
  if (!f.length) return null;
  const dela = papelFeminino(c.rlPapel) ? "dela" : "dele";
  return `${f.length === 1 ? "Falta" : "Faltam"} ${juntar(f.map((x) => x.curta))} ${dela}`;
}

/** O que o menor não pedia e passa a ir no documento aos 18 anos. */
const ANTES_NAO_IAM = new Set(["o estado civil", "a profissão", "o RG"]);

/** O aviso de quem fez 18 anos e ainda está como menor na ficha (gerar-fez-18). */
export function avisoFez18(c: ClienteDoDocumento, hoje: string): { titulo: string; texto: string; temFalta: boolean } | null {
  if (casoDoMenor(c, hoje) !== "FEZ_18") return null;
  const p = primeiroNome(c.nome);
  const papel = papelComArtigo(c);
  const antes = `${papel.charAt(0).toUpperCase()}${papel.slice(1)}, ${primeiroNome(c.rlNome!)}, que assinava com ${p}, não entra mais.`;
  const faltas = faltasNoDocumento(c, hoje);
  const titulo = `${p} fez 18 anos em ${dataBr(aniversario(c.nascimento!, 18))}: agora assina por si.`;
  if (!faltas.length) return { titulo, texto: antes, temFalta: false };
  const quais = faltas.every((f) => ANTES_NAO_IAM.has(f))
    ? faltas.length === 1 ? `Falta 1 dado de ${p}, que antes não ia no documento: ${faltas[0]}.` : `Faltam ${faltas.length} dados de ${p}, que antes não iam no documento: ${juntar(faltas)}.`
    : tituloFaltas(faltas, c.nome);
  return {
    titulo,
    texto: `${antes} ${quais} Dá para gerar assim: ${faltas.length === 1 ? "sai marcado" : "saem marcados"}, para completar no Word. Ou complete a ficha antes: ao salvar, você volta para cá.`,
    temFalta: true,
  };
}

/** O marcado do cliente como o domínio o monta ("CPF de quem assina de Pedro Alves Souza"). */
const marcadoDoCliente = (f: string, nome: string) => {
  const t = f.replace(/^(o|a|os|as) /, "");
  return `${t.charAt(0).toUpperCase()}${t.slice(1)} de ${nome}`;
};

/**
 * A frase da faixa do botão (decisão 26): a do servidor (ou a de reserva, sem prévia) e, no menor,
 * a lista do que sai marcado e "Em todos, Joana assina por Pedro." A lista só sai quando cada
 * documento da prévia não tem marcado ou tem exatamente os do cliente. Toda falta de quem assina,
 * inclusive a qualificação, deixa marca no .docx (F3.161). Com tutora ou tutor, termina com "Junte o
 * termo de tutela à procuração.", com ou sem "Em todos…" (F3.140, revisão B1).
 */
export function fraseDaFaixaGerar(c: ClienteDoDocumento, hoje: string, prev: PreviaDocumentos | null): string {
  const faltas = faltasNoDocumento(c, hoje);
  const base = prev ? prev.frase : faltas.length ? "Algum dado sai marcado, para completar." : "Nenhum dado sai marcado.";
  const caso = casoDoMenor(c, hoje);
  if (!caso) return base;
  const rl = caso === "FEZ_18" ? [] : faltasDeQuemAssina(c);
  let frase = base;
  const esperados = faltas.map((f) => marcadoDoCliente(f, c.nome));
  const bate = !!prev && /\.$/.test(prev.frase) && esperados.length > 0
    && prev.documentos.some((d) => d.marcados.length)
    && prev.documentos.every((d) => !d.marcados.length || (d.marcados.length === esperados.length && esperados.every((m) => d.marcados.includes(m))));
  if (bate) {
    if (caso === "FEZ_18") frase = `${base.slice(0, -1)}: ${juntar(faltas)} de ${primeiroNome(c.nome)}.`;
    else if (rl.length === faltas.length) frase = `${base.slice(0, -1)}: ${juntar(rl.map((x) => x.curta))} de ${primeiroNome(c.rlNome!)}.`;
  }
  if (caso === "FEZ_18") return frase;
  const termo = (caso === "REPRESENTADO" || caso === "ASSISTIDO") && assinaTutela(c) ? " Junte o termo de tutela à procuração." : "";
  if (rl.length) return `${frase}${termo}`;
  const p = primeiroNome(c.nome);
  const r = primeiroNome(c.rlNome!);
  return `${frase} ${caso === "REPRESENTADO" ? `Em todos, ${r} assina por ${p}.` : `Em todos, ${p} e ${r} assinam.`}${termo}`;
}

// ------------------------------------------------------------- Baixar o contrato no cabeçalho (D29)

const diaBrasilia = (em: string) => {
  const d = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(em));
  return `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;
};

/** O que a linha "Baixar o contrato" do cabeçalho da ficha mostra (D29, docs/design/aprovadas/portal-contrato-pdf-na-ficha). */
export type BaixarNoCabecalho =
  | { tipo: "gerado"; documentoId: string; qual: string }
  | { tipo: "assinado"; anexoId: string; nome: string; formato: "PDF" | "foto"; qual: string }
  | { tipo: "gerar" }
  | null;

/**
 * Sai sempre o contrato de honorários da versão mais recente gerada; com o assinado dessa versão,
 * só o assinado (pergunta 4). Sem contrato gerado: o assinado da folha Assinatura (pergunta 3),
 * senão "Gerar o contrato" para quem pode e fora de encerrado (pergunta 2). Nada enquanto carrega.
 */
export function baixarNoCabecalho(
  docs: DocumentosDoContrato | null | "erro", assinados: Anexo[] | null, situacao: "ELABORACAO" | "ATIVO" | "ENCERRADO",
): BaixarNoCabecalho {
  if (!docs || docs === "erro") return null;
  const doc = docs.documentos.find((d) => d.tipo === "CONTRATO");
  const formato = (nome: string) => (/\.pdf$/i.test(nome) ? "PDF" as const : "foto" as const);
  if (doc) {
    const a = doc.atual.assinados[0];
    if (a) return { tipo: "assinado", anexoId: a.anexoId, nome: a.nome, formato: formato(a.nome), qual: `${a.nome} · anexado em ${diaBrasilia(a.enviadoEm)}` };
    return { tipo: "gerado", documentoId: doc.atual.id, qual: `v${doc.atual.numero} · gerado em ${diaBrasilia(doc.atual.geradoEm)}` };
  }
  const a = assinados?.[0];
  if (a) return { tipo: "assinado", anexoId: a.id, nome: a.nome, formato: formato(a.nome), qual: `${a.nome} · anexado em ${diaBrasilia(a.enviadoEm)}` };
  if (docs.podeGerar && situacao !== "ENCERRADO") return { tipo: "gerar" };
  return null;
}

// ------------------------------------------------------------- O quadro "Quem assina por…" (F3.160, D1 e D2)

/**
 * O nome e a linha do quadro de quem assina em Gerar. No assistido (D1), os dois nomes e a frase de
 * quem assina e como, sem o selo "Assiste"; nos outros, o papel e o CPF com o selo de hoje. A linha
 * termina sempre com "· da ficha do cliente" (D2). O CPF já vem formatado.
 */
export function quadroQuemAssina(c: ClienteDoDocumento, hoje: string, cpf: string | null): { nome: string; linha: string; selo: boolean } {
  const papel = c.rlPapel ? PAPEIS_RESPONSAVEL[c.rlPapel] : null;
  const doc = cpf ? `CPF ${cpf}` : null;
  const fim = "da ficha do cliente";
  if (casoDoMenor(c, hoje) === "ASSISTIDO" && c.rlNome?.trim()) {
    const p = primeiroNome(c.nome);
    const por = c.rlPapel ? `${papelFeminino(c.rlPapel) ? "pela" : "pelo"} ${PAPEIS_RESPONSAVEL[c.rlPapel].toLowerCase()}, ` : "";
    return { nome: `${p} e ${c.rlNome.trim()}`, linha: [`${p} assina, assistido(a) ${por}${primeiroNome(c.rlNome)}`, doc, fim].filter(Boolean).join(" · "), selo: false };
  }
  return { nome: c.rlNome?.trim() || "Não cadastrado", linha: [papel, doc, fim].filter(Boolean).join(" · "), selo: true };
}

// ------------------------------------------------------------- Documentos marcados conforme a área (CH-14, F3.171)
// Estados gerar-* do desenho aprovado em docs/design/aprovadas/portal-documentos-por-area (D36).

/** A área escolhida vai ao contrato ao gerar: em elaboração, sem área e sem caso, e nunca "Outra ou sem área". */
export function areaVaiAoContrato(d: DadosDocumentos, f: Pick<FormDocumentos, "area">): f is { area: AreaDireito } {
  return !!d.sugestao?.gravaNoContrato && !!f.area && f.area !== "OUTRA";
}

/** "Previdenciário"; "contrato sem área" no meio da frase, para OUTRA. */
const areaNaFrase = (a: AreaDireito) => (a === "OUTRA" ? "contrato sem área" : rotuloAreaDocumentos(a));

/** As chaves da lista da área que existem hoje, na ordem dos modelos (as caixas com "sugerido"). */
export function sugeridosDaArea(d: DadosDocumentos, area: AreaDireito | null | undefined): Set<string> {
  const s = d.sugestao;
  if (!s || !area) return new Set();
  const lista = new Set(s.porArea[area] ?? []);
  return new Set(d.modelos.map(chaveModelo).filter((k) => lista.has(k)));
}

/** O que a área marca agora, sem os já assinados (D4). */
export function marcadosAgora(d: DadosDocumentos, area: AreaDireito): string[] {
  return d.sugestao ? marcadosDaArea(area, d.sugestao, d.modelos.map(chaveModelo), chavesAssinadas(d)) : [];
}

/** O nome do documento na lista: "contrato de honorários", "procuração", "requerimento ao INSS". */
function nomeNaLista(d: DadosDocumentos, k: string): string {
  if (k === "CONTRATO") return "contrato de honorários";
  if (k === "PROCURACAO") return "procuração";
  if (k === "HIPOSSUFICIENCIA") return "declaração de hipossuficiência";
  const nome = d.modelos.find((m) => chaveModelo(m) === k)?.nome ?? DOCUMENTOS_CONTRATO.OUTRO;
  return nome.charAt(0).toLowerCase() + nome.slice(1);
}

/** "o contrato, a procuração e a declaração de hipossuficiência" (o aviso de troca de área). */
function comArtigo(d: DadosDocumentos, k: string): string {
  if (k === "CONTRATO") return "o contrato";
  if (k === "PROCURACAO") return "a procuração";
  if (k === "HIPOSSUFICIENCIA") return "a declaração de hipossuficiência";
  return nomeNaLista(d, k);
}

/**
 * A troca de área no seletor (revisão, ajuste 8): sem caixa mexida, a lista nova entra e o aviso de
 * status diz o que veio; com caixa mexida, nada muda e a tela oferece "Usar a sugestão".
 */
export function trocarArea(d: DadosDocumentos, f: FormDocumentos, area: AreaDireito): { form: FormDocumentos; aplicou: boolean } {
  if (f.mexeu) return { form: { ...f, area }, aplicou: false };
  return { form: { ...f, area, docs: marcadosAgora(d, area), mexeu: false }, aplicou: true };
}

/** "A sugestão mudou para Família: vêm marcados o contrato, a procuração e a declaração de hipossuficiência." */
export function fraseTrocaAplicada(d: DadosDocumentos, area: AreaDireito): string {
  const ks = marcadosAgora(d, area);
  const a = `A sugestão mudou para ${rotuloAreaDocumentos(area)}`;
  if (!ks.length) return `${a}: nada vem marcado. Marque os que vão sair.`;
  return `${a}: ${ks.length === 1 ? "vem marcado" : "vêm marcados"} ${juntar(ks.map((k) => comArtigo(d, k)))}.`;
}

/** A linha com "Usar a sugestão" depois de trocar a área tendo mexido (ou em Gerar de novo). */
export function linhaSugestaoDaArea(d: DadosDocumentos, area: AreaDireito): { titulo: string; texto: string } {
  const ks = marcadosAgora(d, area);
  const lista = ks.length ? juntar(ks.map((k) => nomeNaLista(d, k))) : "nenhum documento";
  return {
    titulo: `A sugestão de ${rotuloAreaDocumentos(area)} é: ${lista}.`,
    texto: d.ultima ? "Vieram as escolhas da última geração, então nada mudou sozinho." : "Você já tinha marcado à mão, então nada mudou sozinho.",
  };
}

const horaBr = (em: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }).format(new Date(em)).replace(":", "h");
const diaBrasilia2 = (em: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(em));

/** "hoje, às 15h20" ou "em 20/11, às 9h05". */
export function quandoNaLista(em: string, hoje: string): string {
  const dia = diaBrasilia2(em);
  return dia === hoje ? `hoje, às ${horaBr(em)}` : `em ${dia.slice(8, 10)}/${dia.slice(5, 7)}, às ${horaBr(em)}`;
}

/** "Previdenciário também tem: requerimento ao INSS." em Gerar de novo (pergunta 5), ou null. */
export function linhaTambemTem(d: DadosDocumentos, f: FormDocumentos): { titulo: string; texto: string; chaves: string[]; nomes: string } | null {
  const s = d.sugestao;
  if (!s || !d.ultima || !f.area) return null;
  const falta = faltaNaSugestao(f.area, s, f.docs, d.modelos.map(chaveModelo), chavesAssinadas(d));
  if (!falta.length) return null;
  const nomes = juntar(falta.map((x) => nomeNaLista(d, x.chave)));
  const em = falta.map((x) => x.em).sort().at(-1)!;
  const versao = d.atuais.length ? Math.max(...d.atuais.map((a) => a.numero)) : null;
  const depois = versao ? `depois da versão ${versao}` : "depois da última geração";
  return {
    titulo: `${rotuloAreaDocumentos(f.area)} também tem: ${nomes}.`,
    texto: `${falta.length === 1 ? "Entrou" : "Entraram"} na lista do escritório ${quandoNaLista(em, d.hoje)}, ${depois}.`,
    chaves: falta.map((x) => x.chave),
    nomes,
  };
}

/** De onde veio a área, ao lado do seletor (D2, revisão, ajuste 7). */
export function origemDaArea(d: DadosDocumentos, f: FormDocumentos, restaurou: boolean): string {
  const s = d.sugestao;
  const n = d.contrato.numero;
  if (!s || !f.area) return "";
  const escolheu = f.area !== s.area;
  if (s.gravaNoContrato) {
    if (restaurou && f.area !== "OUTRA") return `Você escolheu. Fica no contrato ${n} ao gerar.`;
    return `O contrato ${n} ainda não tem área e não tem caso. A área que você escolher fica nele ao gerar.`;
  }
  if (s.origem === "CASO") return escolheu ? `Você escolheu. A área do caso ${s.casoNome ?? ""} é ${rotuloAreaDocumentos(s.area)}.` : `a área do caso ${s.casoNome ?? ""}`;
  if (s.origem === "CONTRATO") return escolheu ? `Você escolheu. A área do contrato ${n} é ${rotuloAreaDocumentos(s.area)}.` : `a área do contrato ${n}`;
  return escolheu ? "Você escolheu. Vale só para estes documentos." : `O contrato ${n} não tem área.`;
}

/** A frase embaixo do seletor. */
export function ajudaDaArea(d: DadosDocumentos, f: FormDocumentos, restaurou: boolean): string {
  if (!f.area) return "";
  if (d.ultima && !restaurou) {
    const v = d.atuais.length ? Math.max(...d.atuais.map((a) => a.numero)) : null;
    return `Vieram as escolhas da ${v ? `versão ${v}` : "última geração"}, e não a lista da área. Mude o que precisar antes de gerar.`;
  }
  if (!marcadosAgora(d, f.area).length && !(d.sugestao?.porArea[f.area] ?? []).length) {
    return f.area === "OUTRA"
      ? "Para contrato sem área, o escritório não marca nenhum documento. Escolha a área acima, ou marque os que vão sair."
      : `Para ${rotuloAreaDocumentos(f.area)}, o escritório não marca nenhum documento. Escolha os que vão sair.`;
  }
  return f.area === "OUTRA"
    ? "Vêm marcados os documentos que o escritório escolheu para contrato sem área. Mude o que precisar antes de gerar."
    : `Vêm marcados os documentos que o escritório escolheu para ${areaNaFrase(f.area)}. Mude o que precisar antes de gerar; vale só para estes documentos.`;
}
