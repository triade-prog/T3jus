// As contas e os textos da folha "Documentos por área" (CH-14, F3.170), sem React. Os textos são os
// do desenho aprovado em docs/design/aprovadas/portal-documentos-por-area (D36; Carol, 24/11/2026).

import { rotuloAreaDocumentos, SUGESTAO_T3JUS_DOCUMENTOS, type AreaDireito, type LinhaDocumentosPorArea, type ModeloDaArea } from "@t3jus/domain";

const NOMES_FIXOS: Record<string, string> = {
  CONTRATO: "contrato de honorários",
  PROCURACAO: "procuração",
  HIPOSSUFICIENCIA: "declaração de hipossuficiência",
};

const minuscula = (t: string) => (t ? t.charAt(0).toLowerCase() + t.slice(1) : t);
const maiuscula = (t: string) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : t);

/** "a" ou "o", pelo jeito do nome (declaração, certidão, ata: "a"; requerimento, termo: "o"). */
export function generoDoNome(nome: string): "a" | "o" {
  const p = nome.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  return /(a|ção|são|dão|dade|gem)$/.test(p) ? "a" : "o";
}

/** O nome do documento no meio da frase: "contrato de honorários", "requerimento ao INSS". */
export function nomeDoDocumento(chave: string, modelos: readonly ModeloDaArea[]): string {
  return NOMES_FIXOS[chave] ?? minuscula(modelos.find((m) => m.chave === chave)?.nome ?? "outro documento");
}

/** "a procuração", "o requerimento ao INSS". */
export function comArtigoDoc(chave: string, modelos: readonly ModeloDaArea[]): string {
  const n = nomeDoDocumento(chave, modelos);
  return `${chave === "CONTRATO" ? "o" : chave in NOMES_FIXOS ? "a" : generoDoNome(n)} ${n}`;
}

export function juntarE(xs: readonly string[]): string {
  if (xs.length <= 1) return xs[0] ?? "";
  return `${xs.slice(0, -1).join(", ")} e ${xs[xs.length - 1]}`;
}

/** As chaves na ordem dos modelos (os três de sempre e depois os outros). */
export function naOrdem(chaves: Iterable<string>, modelos: readonly ModeloDaArea[]): string[] {
  const s = new Set(chaves);
  return modelos.map((m) => m.chave).filter((k) => s.has(k));
}

/** "Contrato de honorários, procuração e declaração de hipossuficiência", ou "" sem nenhum. */
export function textoDaLista(chaves: readonly string[], modelos: readonly ModeloDaArea[]): string {
  return maiuscula(juntarE(naOrdem(chaves, modelos).map((k) => nomeDoDocumento(k, modelos))));
}

const diaBrasilia = (em: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(em));
const horaBrasilia = (em: string) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }).format(new Date(em)).replace(":", "h").replace(/^0(\d)/, "$1");

/** "hoje, às 15h20" ou "em 10/11/2026". */
export function quandoMudou(em: string, hoje: string): string {
  const d = diaBrasilia(em);
  return d === hoje ? `hoje, às ${horaBrasilia(em)}` : `em ${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;
}

/** "15h18". */
export const horaDe = horaBrasilia;

/** A linha de baixo de cada área: "Mudada por Marina Ribeiro em 10/11/2026" ou "O escritório ainda não mudou.". */
export function quemMudou(l: LinhaDocumentosPorArea, hoje: string): string {
  if (!l.salva) return "O escritório ainda não mudou.";
  const quem = l.atualizadoPor?.nome ?? "alguém da equipe";
  return l.atualizadoEm ? `Mudada por ${quem} ${quandoMudou(l.atualizadoEm, hoje)}` : `Mudada por ${quem}`;
}

/** O cabeçalho da área aberta. */
export function cabecalhoDaArea(l: LinhaDocumentosPorArea, hoje: string): string {
  const a = l.salva ? quemMudou(l, hoje) : "O escritório ainda não mudou";
  return `${a} · a sugestão do T3jus é contrato de honorários, procuração e declaração de hipossuficiência`;
}

/** "previdenciário"; "contrato sem área" para OUTRA. */
export function areaMinuscula(a: AreaDireito): string {
  return a === "OUTRA" ? "sem área" : rotuloAreaDocumentos(a).toLowerCase();
}

/** A legenda das caixas. */
export function legendaDaArea(a: AreaDireito): string {
  return a === "OUTRA"
    ? "O que vem marcado em Gerar documentos, nos contratos sem área"
    : `O que vem marcado em Gerar documentos, nos contratos de ${areaMinuscula(a)}`;
}

/** De onde é o modelo, embaixo da caixa: "Do escritório, v2", "Padrão do T3jus", "Outro documento do escritório". */
export function origemDoModelo(m: ModeloDaArea, hoje: string): string {
  if (m.tipo === "OUTRO") return `Outro documento do escritório${m.enviadoEm && diaBrasilia(m.enviadoEm) === hoje ? " · enviado hoje" : ""}`;
  const base = m.doEscritorio ? `Do escritório${m.numero ? `, v${m.numero}` : ""}` : "Padrão do T3jus";
  return m.tipo === "HIPOSSUFICIENCIA" && !m.doEscritorio ? `${base} · para empresa, sai a versão de pessoa jurídica` : base;
}

/** O nome na caixa: "Contrato de honorários", "Declaração de residência". */
export function nomeNaCaixa(m: ModeloDaArea): string {
  return maiuscula(nomeDoDocumento(m.chave, [m]));
}

/** O aviso de salvo. */
export function avisoSalvo(a: AreaDireito, chaves: readonly string[], modelos: readonly ModeloDaArea[]): { titulo: string; texto: string } {
  const onde = a === "OUTRA" ? "num contrato sem área" : `num contrato de ${areaMinuscula(a)}`;
  const ks = naOrdem(chaves, modelos);
  const texto = ks.length
    ? `Da próxima vez que alguém abrir Gerar documentos ${onde}, ${ks.length === 1 ? "vem marcado" : "vêm marcados"} ${juntarE(ks.map((k) => comArtigoDoc(k, modelos)))}.`
    : `Da próxima vez que alguém abrir Gerar documentos ${onde}, nada vem marcado; quem gera escolhe.`;
  return { titulo: `${rotuloAreaDocumentos(a)} salvo.`, texto };
}

/** "Salvar Previdenciário". */
export const botaoSalvar = (a: AreaDireito) => `Salvar ${rotuloAreaDocumentos(a)}`;

/** A lista é a sugestão do T3jus (o botão "Voltar à sugestão do T3jus" não faz nada). */
export function ehSugestao(chaves: readonly string[]): boolean {
  const s = new Set(chaves);
  return s.size === SUGESTAO_T3JUS_DOCUMENTOS.length && SUGESTAO_T3JUS_DOCUMENTOS.every((k) => s.has(k));
}

export interface ConflitoDaArea {
  titulo: string;
  texto: string;
  linhas: { chave: string; documento: string; salvo: string; meu: string }[];
}

/**
 * A comparação quando outra pessoa salvou a área enquanto esta editava: o que ela tirou ou pôs
 * (em relação ao que estava quando a área foi aberta) e as caixas que ficaram diferentes.
 */
export function conflitoDaArea(a: AreaDireito, antes: readonly string[], salvo: LinhaDocumentosPorArea, meu: readonly string[], modelos: readonly ModeloDaArea[]): ConflitoDaArea {
  const quem = salvo.atualizadoPor?.nome ?? "Outra pessoa";
  const primeiro = salvo.atualizadoPor?.nome.split(/\s+/)[0] ?? "Ela";
  const titulo = `${quem} mudou ${rotuloAreaDocumentos(a)}${salvo.atualizadoEm ? ` às ${horaDe(salvo.atualizadoEm)}` : ""}, enquanto você editava.`;
  const tirou = naOrdem(antes.filter((k) => !salvo.documentos.includes(k)), modelos);
  const pos = naOrdem(salvo.documentos.filter((k) => !antes.includes(k)), modelos);
  const partes = [
    tirou.length ? `tirou ${juntarE(tirou.map((k) => comArtigoDoc(k, modelos)))}` : "",
    pos.length ? `pôs ${juntarE(pos.map((k) => comArtigoDoc(k, modelos)))}` : "",
  ].filter(Boolean);
  const meio = partes.length ? ` ${primeiro} ${juntarE(partes)}.` : "";
  const todos = naOrdem([...salvo.documentos, ...meu], modelos);
  const marca = (k: string, sim: boolean) => {
    const g = k === "CONTRATO" ? "o" : k in NOMES_FIXOS ? "a" : generoDoNome(nomeDoDocumento(k, modelos));
    return `${sim ? "marcad" : "desmarcad"}${g}`;
  };
  const linhas = todos
    .filter((k) => salvo.documentos.includes(k) !== meu.includes(k))
    .map((k) => ({ chave: k, documento: maiuscula(nomeDoDocumento(k, modelos)), salvo: marca(k, salvo.documentos.includes(k)), meu: marca(k, meu.includes(k)) }));
  return {
    titulo,
    texto: linhas.length
      ? `Nada do que você marcou se perdeu.${meio} Compare e escolha qual versão fica.`
      : `Nada do que você marcou se perdeu.${meio} A versão salva é igual à sua; salve para confirmar.`,
    linhas,
  };
}

/** As áreas salvas em que o modelo vem marcado (a janela de arquivar). */
export function areasComOModelo(chave: string, areas: readonly LinhaDocumentosPorArea[]): AreaDireito[] {
  return areas.filter((l) => l.salva && l.documentos.includes(chave)).map((l) => l.area);
}

/** O aviso da janela de arquivar, quando o modelo vem marcado em alguma área. */
export function avisoArquivar(nome: string, areas: readonly AreaDireito[]): { titulo: string; texto: string } | null {
  if (!areas.length) return null;
  const g = generoDoNome(nome);
  const ele = g === "a" ? "Ela" : "Ele";
  const nomes = juntarE(areas.map(rotuloAreaDocumentos));
  const essas = areas.length === 1 ? "dessa área continuam" : `dessas ${areas.length === 2 ? "duas" : areas.length} áreas continuam`;
  return {
    titulo: `${ele} também deixa de vir marcad${g} em ${nomes}.`,
    texto: `As outras escolhas ${essas} como estão. Nas outras áreas, ${g === "a" ? "ela" : "ele"} já não vinha marcad${g}.`,
  };
}

/** "Arquivar a declaração de residência?" e a descrição da janela. */
export function tituloArquivar(nome: string): { titulo: string; descricao: string } {
  const g = generoDoNome(nome);
  const n = minuscula(nome);
  return {
    titulo: `Arquivar ${g} ${n}?`,
    descricao: `${g === "a" ? "Ela" : "Ele"} sai de Gerar documentos. Os documentos já gerados com ${g === "a" ? "ela" : "ele"} continuam como estavam, para baixar.`,
  };
}
