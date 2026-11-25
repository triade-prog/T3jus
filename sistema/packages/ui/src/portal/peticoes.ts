// Petições do Portal (EX-09): rotas, textos e contas das telas, sem React, para os testes de
// unidade. Desenho aprovado em docs/design/aprovadas/portal-peticoes. As regras de verdade (quem
// revisa, o que bloqueia, o que sai marcado) estão no servidor; aqui só o que a tela mostra.

import {
  fraseOab, grupoDaArea, nomeDoAdvogadoNaPeticao, SITUACOES_PETICAO, TIPOS_PECA,
  type AdvogadoDaPeticao, type AreaDireito, type AreaModelo, type ModeloPeticao, type SituacaoPeticao, type TipoPeca,
} from "@t3jus/domain";
import type { NomeIcone } from "../Icone.tsx";

export const ROTAS_PETICOES = {
  lista: "/juridico/peticoes",
  modelos: "/juridico/peticoes/modelos",
  nova: (caso?: string | null) => (caso ? `/juridico/peticoes/nova?caso=${caso}` : "/juridico/peticoes/nova"),
  peticao: (id: string) => `/juridico/peticoes/${id}`,
  versao: (id: string) => `/juridico/peticoes/${id}/versao`,
  caso: (id: string) => `/juridico/casos/${id}`,
  cliente: (id: string) => `/clientes/${id}`,
};

/** O selo de cada situação, com texto e ícone (decisão 19): a cor só reforça. */
export const SELO_PETICAO: Record<SituacaoPeticao, { tom: string; icone: NomeIcone; texto: string }> = {
  RASCUNHO: { tom: "neutro", icone: "doc", texto: SITUACOES_PETICAO.RASCUNHO },
  REVISAO: { tom: "andamento", icone: "relogio", texto: SITUACOES_PETICAO.REVISAO },
  AJUSTE: { tom: "atencao", icone: "lapis", texto: SITUACOES_PETICAO.AJUSTE },
  APROVADA: { tom: "ok", icone: "check", texto: SITUACOES_PETICAO.APROVADA },
  REPROVADA: { tom: "neutro", icone: "xis", texto: SITUACOES_PETICAO.REPROVADA },
};

const FUSO = "America/Sao_Paulo";
const diaDe = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
const horaDe = (d: Date) => new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, hour: "2-digit", minute: "2-digit", hour12: false }).format(d).replace(":", "h");

/** "hoje, 15h42", "ontem, 18h20", "16/11, 10h12" ou "12/03/2025, 14h02". */
export function quando(iso: string, agora = new Date()): string {
  const d = new Date(iso);
  const dia = diaDe(d);
  const h = horaDe(d);
  if (dia === diaDe(agora)) return `hoje, ${h}`;
  if (dia === diaDe(new Date(agora.getTime() - 86_400_000))) return `ontem, ${h}`;
  const curto = `${dia.slice(8, 10)}/${dia.slice(5, 7)}`;
  return `${dia.slice(0, 4) === diaDe(agora).slice(0, 4) ? curto : `${curto}/${dia.slice(0, 4)}`}, ${h}`;
}

/** Igual a quando(), com a primeira letra maiúscula, para o começo de uma linha. */
export const Quando = (iso: string, agora = new Date()) => {
  const q = quando(iso, agora);
  return q[0]!.toUpperCase() + q.slice(1);
};

export const primeiroNome = (nome: string) => nome.trim().split(/\s+/)[0] ?? nome;

export const contar = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/** O selo de dados da lista: "Completa" ou "1 marcado" (decisão 2). */
export const textoMarcados = (n: number) => (n ? contar(n, "marcado", "marcados") : "Completa");

/** A linha embaixo do selo da situação, na lista (decisão 19). */
export function detalheSituacao(l: {
  situacao: SituacaoPeticao; versao: number; revisor: { nome: string } | null; paraMim: boolean; marcados: number; geradoPor: { nome: string };
}): string {
  const marc = l.marcados ? ` · ${contar(l.marcados, "dado marcado", "dados marcados")}` : "";
  switch (l.situacao) {
    case "RASCUNHO":
      return "Ainda não foi para a revisão";
    case "REVISAO":
      return `v${l.versao} · com ${l.paraMim ? "você" : (l.revisor?.nome ?? "o revisor")}`;
    case "AJUSTE":
      return `v${l.versao} · pedido por ${l.revisor?.nome ?? "quem revisou"}`;
    case "REPROVADA":
      return `Por ${l.revisor?.nome ?? "quem revisou"} · fica guardada`;
    case "APROVADA":
      return l.revisor ? `Por ${l.revisor.nome}${marc}` : `Sem revisão: gerada por ${primeiroNome(l.geradoPor.nome)}${marc}`;
  }
}

/** Os modelos por grupo de área, na ordem da página de modelos (decisão 4). */
export function gruposDeModelos(modelos: ModeloPeticao[]): { grupo: string; modelos: ModeloPeticao[] }[] {
  const ordem = ["Trabalhista", "Cível, consumidor e saúde"];
  const mapa = new Map<string, ModeloPeticao[]>();
  for (const m of modelos) {
    const g = grupoDaArea(m.area);
    mapa.set(g, [...(mapa.get(g) ?? []), m]);
  }
  const peso = (g: string) => (g === "Para qualquer área" ? 99 : ordem.includes(g) ? ordem.indexOf(g) : 50);
  return [...mapa.entries()]
    .sort((a, b) => peso(a[0]) - peso(b[0]) || a[0].localeCompare(b[0], "pt-BR"))
    .map(([grupo, l]) => ({ grupo, modelos: [...l].sort((a, b) => Number(a.padrao) - Number(b.padrao) || b.usos - a.usos || a.nome.localeCompare(b.nome, "pt-BR")) }));
}

/** Para a nova petição (decisão 6): os da área do caso, os de qualquer área e o resto (fechado). */
export function modelosParaCaso(modelos: ModeloPeticao[], area: AreaDireito): {
  daArea: { grupo: string; modelos: ModeloPeticao[] }; qualquer: ModeloPeticao[]; outras: ModeloPeticao[];
} {
  const g = grupoDaArea(area as AreaModelo);
  const ord = (l: ModeloPeticao[]) => [...l].sort((a, b) => b.usos - a.usos || a.nome.localeCompare(b.nome, "pt-BR"));
  return {
    daArea: { grupo: g, modelos: ord(modelos.filter((m) => m.area !== "QUALQUER" && grupoDaArea(m.area) === g)) },
    qualquer: ord(modelos.filter((m) => m.area === "QUALQUER")),
    outras: ord(modelos.filter((m) => m.area !== "QUALQUER" && grupoDaArea(m.area) !== g)),
  };
}

/** "v2 · enviado por Marina Ribeiro em 02/10/2026" ou "padrão do T3jus · atualizado em 01/11/2026". */
export function linhaVersaoModelo(m: Pick<ModeloPeticao, "padrao" | "versao" | "enviadoPor" | "atualizadoEm">): string {
  const d = diaDe(new Date(m.atualizadoEm));
  const data = `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;
  return m.padrao ? `padrão do T3jus · atualizado em ${data}` : `v${m.versao} · enviado por ${m.enviadoPor?.nome ?? "alguém da equipe"} em ${data}`;
}

export const usado = (n: number) => `usado ${n} ${n === 1 ? "vez" : "vezes"}`;

/** O tipo de peça que o modelo padrão de cada código ocupa (para "Substitui"). */
export const nomeTipo = (t: TipoPeca) => TIPOS_PECA[t];

/** A frase "No documento:" enquanto a pessoa marca (decisão 7). */
export function fraseNoDocumento(advogados: AdvogadoDaPeticao[], escolhidos: Record<string, string[]>): string {
  const partes = advogados
    .filter((a) => escolhidos[a.pessoaId]?.length)
    .map((a) => `${nomeDoAdvogadoNaPeticao(a).toUpperCase()}, ${fraseOab(a.inscricoes.filter((i) => escolhidos[a.pessoaId]!.includes(i.id)))}`);
  if (!partes.length) return "ninguém assina ainda.";
  return `${partes.reduce((s, x, i, l) => (i === 0 ? x : `${s}${i === l.length - 1 ? ", e " : ", "}${x}`), "")}.`;
}

/** Quem assina, curto, para a faixa dos passos: "Marina e Felipe assinam". */
export function quemAssina(advogados: AdvogadoDaPeticao[], escolhidos: Record<string, string[]>): string {
  const n = advogados.filter((a) => escolhidos[a.pessoaId]?.length).map((a) => primeiroNome(a.nome));
  if (!n.length) return "";
  const nomes = n.length === 1 ? n[0]! : `${n.slice(0, -1).join(", ")} e ${n.at(-1)}`;
  return `${nomes} ${n.length === 1 ? "assina" : "assinam"}`;
}

/** As inscrições marcadas por padrão: todas, a principal primeiro (decisão da Carol na Equipe · OAB). */
export function escolhaPadrao(advogados: AdvogadoDaPeticao[]): Record<string, string[]> {
  const r: Record<string, string[]> = {};
  const resp = advogados.find((a) => a.responsavel);
  for (const a of resp ? [resp] : advogados.filter((x) => x.socioDono).slice(0, 1)) r[a.pessoaId] = a.inscricoes.map((i) => i.id);
  return r;
}

/** O papel de cada advogado na lista "Quem assina". */
export function papelAdvogado(a: Pick<AdvogadoDaPeticao, "responsavel" | "socioDono">): string {
  if (a.responsavel) return "Responsável pelo caso";
  if (a.socioDono) return "Sócia dona";
  return "Também no escritório";
}

/** Os erros que bloqueiam, ditos para a pessoa, presos ao campo (decisão 8). */
export const ERROS_PETICAO: Record<string, string> = {
  ENDERECAMENTO_OBRIGATORIO: "Escreva para quem vai a petição. Ex.: Excelentíssimo(a) Senhor(a) Juiz(íza) da 45ª Vara do Trabalho de São Paulo – SP.",
  ENDERECAMENTO_LONGO: "O endereçamento passou de 400 letras. Encurte.",
  PARTE_OBRIGATORIA: "Marque ao menos um cliente. Sem parte, a petição não tem por quem falar.",
  PARTE_INVALIDA: "Um dos clientes não está mais no caso. Recarregue a página.",
  SEM_ADVOGADO: "Marque ao menos um advogado. Sem advogado, a petição não tem quem assine.",
  ADVOGADO_SEM_OAB: "Um dos advogados não tem mais OAB na Equipe. Recarregue a página.",
  INSCRICAO_INVALIDA: "Cada advogado marcado precisa de ao menos uma inscrição.",
  ADVOGADO_REPETIDO: "O mesmo advogado foi marcado duas vezes. Recarregue a página.",
  NUMERO_CNJ_INVALIDO: "Confira o número do processo: 20 dígitos no formato 0000000-00.0000.0.00.0000.",
  NUMERO_EM_OUTRO_CASO: "Este número já está em outro caso do escritório. Confira, ou não grave no caso.",
  CIDADE_DATA_OBRIGATORIA: "Escreva a cidade e a data. Ex.: São Paulo, 18 de novembro de 2026.",
  CIDADE_DATA_LONGA: "A cidade e a data passaram de 120 letras.",
  VALOR_INVALIDO: "Escreva o valor em reais, como 86.400,00.",
  TEXTO_LONGO: "Passou de 400 letras. Encurte.",
  MODELO_INVALIDO: "Este modelo não está mais disponível. Volte e escolha outro.",
};

/** Os títulos curtos do resumo de erros no topo, com link para o campo. */
export const RESUMO_ERRO: Record<string, string> = {
  enderecamento: "Endereçamento vazio",
  partes: "Nenhuma parte marcada",
  advogados: "Nenhum advogado marcado",
  numero: "Número do processo",
  cidadeData: "Cidade e data",
  valorCausa: "Valor da causa",
  parteContrariaQualificacao: "Qualificação da parte contrária",
  modelo: "Modelo",
};

/** Os erros do arquivo do modelo ou da versão editada (decisões 5 e 23). */
export const ERROS_ARQUIVO: Record<string, string> = {
  ARQUIVO_PDF: "Este arquivo é PDF. O modelo precisa ser do Word (.docx), para o T3jus preencher e você editar depois. No Word: Arquivo › Salvar como › Documento do Word.",
  ARQUIVO_DOC_ANTIGO: "Este arquivo é do Word antigo (.doc). No Word: Arquivo › Salvar como › Documento do Word (.docx).",
  ARQUIVO_MACRO: "Este arquivo tem macro (.docm). Por segurança, o T3jus não aceita. No Word: Arquivo › Salvar como › Documento do Word (.docx).",
  ARQUIVO_GRANDE: "O arquivo passou de 5 MB. Tire imagens grandes do modelo e salve de novo.",
  ARQUIVO_VAZIO: "O arquivo está vazio. Escolha o .docx do modelo.",
  ARQUIVO_INVALIDO: "Não deu para ler este arquivo como .docx. Abra no Word e salve de novo como Documento do Word.",
  ZIP_INVALIDO: "Não deu para ler este arquivo como .docx. Abra no Word e salve de novo como Documento do Word.",
  ZIP_PROTEGIDO: "O arquivo está protegido por senha. Tire a senha no Word e salve de novo.",
  ZIP_GRANDE: "O arquivo é grande demais por dentro. Tire imagens grandes e salve de novo.",
};

export const erroDoArquivo = (motivo: unknown) => ERROS_ARQUIVO[String(motivo)] ?? ERROS_ARQUIVO.ARQUIVO_INVALIDO!;

/** "Word · 58 KB". */
export function tamanhoArquivo(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}

/** O botão do passo final (decisões 10 e 18). */
export function botaoFinal(revisor: { nome: string } | null, marcados: number): string {
  if (revisor) return `Enviar para revisão de ${revisor.nome}`;
  return marcados ? `Gerar com ${contar(marcados, "dado marcado", "dados marcados")}` : "Gerar o .docx";
}

/** Por que sai aprovada, sem revisão (decisão 17). */
export function frasePulaRevisao(motivo: "RESPONSAVEL" | "SOCIO_DONO" | null, socioDonoTambem = false): string {
  if (motivo === "SOCIO_DONO") return "Você é a sócia dona: a petição sai aprovada, sem revisão.";
  if (motivo === "RESPONSAVEL") return socioDonoTambem ? "Você é a sócia dona e a responsável pelo caso: a petição sai aprovada, sem revisão." : "Você é a responsável pelo caso: a petição sai aprovada, sem revisão.";
  return "";
}

/** O botão da decisão na revisão (decisão 21). */
export function botaoDecisao(d: "APROVAR" | "AJUSTE" | "REPROVAR" | null, versao: number, quemGerou: string): string {
  if (d === "APROVAR") return `Aprovar a versão ${versao}`;
  if (d === "AJUSTE") return `Pedir ajuste a ${primeiroNome(quemGerou)}`;
  if (d === "REPROVAR") return "Reprovar";
  return "Enviar decisão";
}

/** O nome que cita o parágrafo no botão de comentar e no comentário (decisão 22). */
export function trechoCurto(texto: string, max = 160): string {
  const t = texto.replace(/\s+/g, " ").trim();
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`;
}
