// A aba Implantação da ficha (CO-08, F1.47): os textos e as contas da tela, fora do componente
// para os testes. Desenho aprovado em docs/design/aprovadas/console-implantacao (D43, DC14), com
// os geradores em _fonte/ficha_im.py.

import {
  AREAS_PORTAL, diaBrasilia, FORMAS_TREINO, TEMAS_TREINO,
  type ConsoleImplantacao, type FormaTreino, type SituacaoImplantacao, type TemaTreino, type TreinoImplantacao,
} from "@t3jus/domain";
import type { NomeIcone } from "../Icone.tsx";
import { dataBr, diasEntre } from "./cobranca.ts";

export type ImplantacaoDoEscritorio = NonNullable<ConsoleImplantacao["implantacao"]>;
export type PessoaDaImplantacao = SituacaoImplantacao["pessoas"][number];

const MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** "Juliana Prado e Joana Freitas"; "A, B e C". */
export function juntarNomes(nomes: readonly string[]): string {
  if (nomes.length <= 1) return nomes[0] ?? "";
  return `${nomes.slice(0, -1).join(", ")} e ${nomes.at(-1)}`;
}

/** 90 → "1h30"; 60 → "1h"; 45 → "45 min". */
export function duracao(min: number): string {
  const h = Math.floor(min / 60), m = min % 60;
  if (!h) return `${m} min`;
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

/** "2026-11-24" → "24/11". */
export function diaMesCurto(iso: string): string {
  return dataBr(iso).slice(0, 5);
}

/** O disco do dia do treino: "24" e "nov". */
export function discoDoDia(iso: string): { dia: string; mes: string } {
  return { dia: iso.slice(8, 10), mes: MESES_CURTOS[Number(iso.slice(5, 7)) - 1] ?? "" };
}

const dias = (n: number) => `${n} ${n === 1 ? "dia" : "dias"}`;

export type TomPrazo = "ok" | "atencao" | "urgente";

/** O prazo da implantação aberta, como o topo da aba mostra (D43: im-aberta, im-perto, im-hoje e
 * im-passou). Faltando 7 dias ou menos, atenção; no dia e depois, urgente. */
export function prazoNaTela(i: Pick<ImplantacaoDoEscritorio, "prazoAte" | "abertaEm">, hoje: string) {
  const faltam = diasEntre(hoje, i.prazoAte);
  const prazo = dataBr(i.prazoAte);
  const tom: TomPrazo = faltam <= 0 ? "urgente" : faltam <= 7 ? "atencao" : "ok";
  if (faltam > 0) {
    return { faltam, tom, disco: String(faltam), titulo: `até ${prazo}`, detalhe: `faltam ${dias(faltam)} · hoje é ${dataBr(hoje)}`,
      selo: tom === "atencao" ? `Faltam ${dias(faltam)}` : null };
  }
  if (faltam === 0) {
    return { faltam, tom, disco: "0", titulo: `vence hoje, ${prazo}`, detalhe: `prazo de ${dias(diasEntre(i.abertaEm, i.prazoAte))}`, selo: "Vence hoje" };
  }
  return { faltam, tom, disco: `+${-faltam}`, titulo: `venceu em ${prazo}`, detalhe: `passou há ${dias(-faltam)} · hoje é ${dataBr(hoje)}`, selo: "Passou do prazo" };
}

/** A dica do cabeçalho da ficha, embaixo de "Concluir a implantação" (D43, cabeçalhos im-*). */
export function dicaDoCabecalho(prazoAte: string, hoje: string, s?: Pick<SituacaoImplantacao, "treinadas" | "total"> | null): string {
  const faltam = diasEntre(hoje, prazoAte);
  const prazo = dataBr(prazoAte);
  if (faltam === 0) return `O prazo da implantação vence hoje, ${prazo}.`;
  if (faltam < 0) return `O prazo da implantação passou em ${prazo}, há ${dias(-faltam)}.`;
  const todas = s && s.total > 0 && s.treinadas === s.total ? ` ${s.total === 1 ? "A pessoa foi treinada" : `As ${s.total} pessoas foram treinadas`}.` : "";
  return `Prazo da implantação: ${prazo}, faltam ${dias(faltam)}.${todas}`;
}

/** Concluída: "9 dias antes do prazo (16/12/2026)". */
export function conclusaoNoPrazo(concluidaEm: string, prazoAte: string): string {
  const dia = diaBrasilia(concluidaEm);
  const d = diasEntre(dia, prazoAte);
  if (d === 0) return `no dia do prazo (${dataBr(prazoAte)})`;
  return d > 0 ? `${dias(d)} antes do prazo (${dataBr(prazoAte)})` : `${dias(-d)} depois do prazo (${dataBr(prazoAte)})`;
}

export const ICONE_FORMA: Record<FormaTreino, NomeIcone> = { VIDEO: "treino", PRESENCIAL: "presencial", TELEFONE: "telefone" };
/** Como o treino foi, em minúsculas, depois de quem participou. */
export const COMO_FORMA: Record<FormaTreino, string> = { VIDEO: "por videochamada", PRESENCIAL: "presencial", TELEFONE: "por ligação" };
/** As explicações das opções na janela de registrar. */
export const AJUDA_FORMA: Record<FormaTreino, string> = { VIDEO: "Por videochamada", PRESENCIAL: "No escritório", TELEFONE: "Por ligação" };

export const nomeTema = (t: TemaTreino) => TEMAS_TREINO[t] ?? t;
export const nomeForma = (f: FormaTreino) => FORMAS_TREINO[f] ?? f;

/** "Tempo de treino: 3h30 em 2 treinos, sem contar o desfeito." */
export function tempoDeTreino(treinos: readonly TreinoImplantacao[]): string {
  const valem = treinos.filter((t) => !t.desfeito);
  const desfeitos = treinos.length - valem.length;
  const total = valem.reduce((s, t) => s + t.duracaoMin, 0);
  const n = valem.length;
  return `${n ? duracao(total) : "0 min"} em ${n} ${n === 1 ? "treino" : "treinos"}${desfeitos ? `, sem contar ${desfeitos === 1 ? "o desfeito" : `os ${desfeitos} desfeitos`}` : ""}`;
}

/** Quem é a pessoa no escritório, com as áreas: "Sócio · vê tudo", "Equipe · Jurídico e Contratos". */
export function papelDaPessoa(p: Pick<PessoaDaImplantacao, "funcao" | "areas">): string {
  const nomes = p.areas.map((a) => AREAS_PORTAL[a as keyof typeof AREAS_PORTAL] ?? a);
  const todas = Object.keys(AREAS_PORTAL).every((a) => p.areas.includes(a));
  const quem = p.funcao === "SOCIO" ? "Sócio" : "Equipe";
  return `${quem} · ${todas ? "vê tudo" : nomes.length ? juntarNomes(nomes) : "partes comuns"}`;
}

/** O treino de cada pessoa na lista: o selo e a linha de baixo (D43, Pessoas do escritório). */
export function treinoDaPessoa(p: PessoaDaImplantacao, treinos: readonly TreinoImplantacao[]): { treinada: boolean; texto: string } {
  if (p.treino.treinada) {
    return { treinada: true, texto: `${diaMesCurto(p.treino.dia)} · ${nomeForma(p.treino.forma).toLowerCase()}, ${duracao(p.treino.duracaoMin)}` };
  }
  const desfeito = treinos.find((t) => t.desfeito && t.pessoas.some((x) => x.id === p.id));
  if (desfeito) return { treinada: false, texto: `o registro de ${diaMesCurto(desfeito.dia)} foi desfeito` };
  if (!p.convite.aceitou) return { treinada: false, texto: "o treino fica para depois do primeiro acesso" };
  return { treinada: false, texto: "ainda sem treino registrado" };
}

/** As pessoas sem treino, pelo nome. */
export function semTreino(s: Pick<SituacaoImplantacao, "pessoas">): string[] {
  return s.pessoas.filter((p) => !p.treino.treinada).map((p) => p.nome);
}

const ORIGEM: Record<string, string> = { PLANILHA: "Planilha", ASTREA: "Planilha do Astrea", ADVBOX_PLANILHA: "Planilha do ADVBOX" };
const O_QUE: Record<string, string> = { CLIENTES: "clientes", CLIENTES_CONTRATOS: "clientes e contratos" };

export type MarcaFeito = "sim" | "meio" | "nao";

/** "O que já aconteceu", calculado no servidor (1183): os quatro itens do desenho. */
export function oQueJaAconteceu(s: SituacaoImplantacao, abertaEm: string | null): { marca: MarcaFeito; icone: NomeIcone; titulo: string; texto: string }[] {
  const socio = s.socioEntrou;
  const imp = s.importacao;
  const faltam = semTreino(s);
  return [
    socio.entrou
      ? { marca: "sim", icone: "check", titulo: "Um sócio entrou no Portal",
        texto: `${socio.pessoa ? `${socio.pessoa.nome}, em ` : "Em "}${socio.dia ? dataBr(socio.dia) : "data não registrada"}.${socio.dia && abertaEm === socio.dia ? " A implantação começou aqui." : ""}` }
      : { marca: "nao", icone: "pessoas", titulo: "Nenhum sócio entrou no Portal ainda", texto: "A implantação conta do primeiro acesso de um sócio." },
    imp.concluida
      ? { marca: "sim", icone: "check", titulo: "Importação concluída",
        texto: `${ORIGEM[imp.origem ?? ""] ?? "Planilha"}${imp.em ? `, em ${dataBr(imp.em)}` : ""}${imp.oQue ? ` · ${O_QUE[imp.oQue] ?? imp.oQue}` : ""}.` }
      : { marca: "nao", icone: "baixar", titulo: "Importação ainda não feita", texto: "O escritório importa a planilha em Escritório › Importar, com a ajuda da equipe." },
    s.whatsapp.ligado
      ? { marca: "sim", icone: "check", titulo: "WhatsApp ligado", texto: s.whatsapp.desde ? `Desde ${dataBr(s.whatsapp.desde)}.` : "Ligado no Portal do escritório." }
      : { marca: "nao", icone: "whats", titulo: "WhatsApp ainda não ligado", texto: "O escritório liga em Escritório › Integrações, com a ajuda da equipe." },
    {
      marca: s.total > 0 && s.treinadas === s.total ? "sim" : s.treinadas > 0 ? "meio" : "nao", icone: s.total > 0 && s.treinadas === s.total ? "check" : "pessoas",
      titulo: `${s.treinadas} de ${s.total} ${s.total === 1 ? "pessoa treinada" : "pessoas treinadas"}`,
      texto: s.total === 0 ? "Ninguém com acesso ao Portal ainda." : faltam.length ? `Falta${faltam.length === 1 ? "" : "m"} ${faltam.length}: ${juntarNomes(faltam)}. Veja abaixo.` : "Todas as pessoas com acesso ao Portal.",
    },
  ];
}

/** O que a pessoa digitou ("27/11/2026") em ISO, ou null. */
export function lerDia(t: string): string | null {
  const m = /^\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s*$/.exec(t);
  if (!m) return null;
  const iso = `${m[3]}-${m[2]!.padStart(2, "0")}-${m[1]!.padStart(2, "0")}`;
  const d = new Date(`${iso}T12:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== iso ? null : iso;
}

/** Os campos de "Registrar treino" conferidos na tela, antes de enviar (o banco confere de novo). */
export function conferirTreino(v: { dia: string; duracao: string; pessoas: readonly string[] }, hoje: string): { campos: Set<string>; noFuturo: boolean } {
  const campos = new Set<string>();
  const dia = lerDia(v.dia);
  const noFuturo = !!dia && dia > hoje;
  if (!dia || noFuturo) campos.add("dia");
  const n = /^\d{1,3}$/.test(v.duracao.trim()) ? Number(v.duracao) : NaN;
  if (!(n >= 15 && n <= 480)) campos.add("duracaoMin");
  if (!v.pessoas.length) campos.add("pessoas");
  return { campos, noFuturo };
}

/** O efeito na 1ª fatura (prévia da regra, bloco da assinatura e janela de concluir). */
export function linhasDaImplantacao(o: { descricao: string; valorCentavos: number; isenta: boolean; texto: string | null }) {
  const linhas = [{ texto: `Implantação assistida · ${o.descricao}`, valorCentavos: o.valorCentavos, negativo: false }];
  if (o.isenta) linhas.push({ texto: `Isenção da implantação · ${o.texto ?? "Isenta"}`, valorCentavos: -o.valorCentavos, negativo: true });
  return linhas;
}
