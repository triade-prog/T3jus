// Histórico administrativo do Console (CO-04): cada ação do banco vira uma frase para quem
// lê. As pessoas citadas nos dados vêm por id; quem chama diz o nome que conhece.

import { CATEGORIAS_DOCUMENTO, diaBrasilia, ESTAGIOS, FUNCOES_CONSOLE } from "@t3jus/domain";

export interface EventoHistorico {
  id: number;
  ocorridoEm: string;
  autor: { id: string; nome: string | null } | null;
  acao: string;
  entidade: string;
  entidadeId: string | null;
  dados: Record<string, unknown> | null;
  interno?: boolean;
}

export interface FraseEvento {
  /** Quem fez (em negrito na tela); null quando foi o sistema. */
  quem: string | null;
  /** O que fez, depois do nome. */
  fez: string;
  /** Linha de detalhe, opcional. */
  detalhe?: string;
}

const CAMPOS_FICHA: Record<string, string> = {
  nome: "nome", cidade: "cidade", uf: "UF", endereco: "endereço", cnpj: "CNPJ", contatos: "contatos",
};

const nomeFuncao = (f: unknown) => (typeof f === "string" && f in FUNCOES_CONSOLE ? FUNCOES_CONSOLE[f as keyof typeof FUNCOES_CONSOLE] : String(f ?? ""));
const lista = (v: unknown) => (Array.isArray(v) ? v.map(nomeFuncao).join(", ") : "");

/** "2026-11-30" vira "30/11/2026"; um instante vira o dia de Brasília (F3.175). */
export function dataDoEvento(v: unknown): string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v) ? diaBrasilia(v).split("-").reverse().join("/") : "uma data";
}

export function fraseDoEvento(e: EventoHistorico, nomeDe: (id: string) => string | null = () => null): FraseEvento {
  const quem = e.autor ? (e.autor.nome ?? "Alguém da equipe") : null;
  const d = e.dados ?? {};
  const pessoa = typeof d.pessoa_id === "string" ? nomeDe(d.pessoa_id) : null;
  const alvo = e.entidade === "pessoa" && e.entidadeId ? nomeDe(e.entidadeId) : null;
  switch (e.acao) {
    case "escritorio.cadastrado":
      return { quem, fez: "cadastrou o escritório em implantação" };
    case "ficha.alterada": {
      const campos = Array.isArray(d.campos) ? d.campos.map((c) => CAMPOS_FICHA[String(c)] ?? String(c)) : [];
      return { quem, fez: "editou a ficha", detalhe: campos.length ? `Campos: ${campos.join(", ")}` : undefined };
    }
    case "socio.convidado":
      return { quem, fez: pessoa ? `convidou ${pessoa} como sócio dono` : "convidou o sócio dono" };
    case "socio.convite_reenviado":
      return { quem, fez: pessoa ? `reenviou o convite de ${pessoa}` : "reenviou o convite do sócio" };
    case "vinculo.revogado":
      return { quem, fez: "encerrou um acesso ao escritório" };
    case "contrato.alterado":
      return { quem, fez: "alterou a referência do contrato" };
    case "documento.anexado": {
      const cat = typeof d.categoria === "string" ? CATEGORIAS_DOCUMENTO[d.categoria as keyof typeof CATEGORIAS_DOCUMENTO] : undefined;
      return { quem, fez: "anexou um documento", detalhe: cat };
    }
    case "documento.aberto":
      return { quem, fez: "abriu um documento" };
    case "nota.escrita":
      return { quem, fez: "escreveu uma nota interna" };
    case "equipe.atribuida":
      return { quem, fez: `atribuiu ${pessoa ?? "alguém da equipe"}${d.funcao ? ` como ${nomeFuncao(d.funcao)}` : ""}` };
    case "equipe.atribuicao_retirada":
      return { quem, fez: "retirou alguém da equipe deste cliente" };
    case "equipe.membro_cadastrado":
      return { quem, fez: `cadastrou ${alvo ?? "uma pessoa"} na equipe`, detalhe: lista(d.funcoes) ? `Funções: ${lista(d.funcoes)}` : undefined };
    case "equipe.funcoes_alteradas":
      return { quem, fez: `mudou as funções de ${alvo ?? "uma pessoa"}`, detalhe: `De ${lista(d.antes) || "nenhuma"} para ${lista(d.depois) || "nenhuma"}` };
    case "equipe.membro_desativado":
      return { quem, fez: `desativou ${alvo ?? "uma pessoa"}` };
    case "escritorio.exportado":
      return { quem, fez: "exportou os dados do escritório" };
    case "contrato.encerramento_marcado":
      return { quem, fez: `marcou o fim do contrato para ${dataDoEvento(d.fim_em)}`, detalhe: typeof d.motivo === "string" ? `“${d.motivo}”` : undefined };
    case "contrato.encerramento_desmarcado":
      return { quem, fez: "desmarcou o fim do contrato", detalhe: typeof d.motivo === "string" ? `“${d.motivo}”` : undefined };
    case "contrato.convites_cancelados":
      return { quem, fez: "cancelou os convites pendentes do escritório", detalhe: typeof d.quantidade === "number" ? `${d.quantidade} ${d.quantidade === 1 ? "convite" : "convites"}` : undefined };
    case "contrato.acesso_fechado":
      return { quem, fez: "fechou o acesso do escritório, 30 dias depois do fim do contrato", detalhe: typeof d.sessoes === "number" ? `${d.sessoes} ${d.sessoes === 1 ? "sessão encerrada" : "sessões encerradas"}` : undefined };
    case "contrato.aviso_enviado": {
      const quemRecebe = pessoa ? `${pessoa}, quem cuida do escritório,` : "quem cuida do escritório";
      return d.tipo === "FECHA_EM_3"
        ? { quem, fez: `lembrou ${quemRecebe} por e-mail que o acesso fecha em 3 dias`, detalhe: `Acesso fecha em ${dataDoEvento(d.acesso_fecha_em)}` }
        : { quem, fez: `avisou ${quemRecebe} por e-mail do fim do contrato`, detalhe: `Prazo para baixar os dados: até ${dataDoEvento(d.consulta_ate)}` };
    }
    case "pessoa.entrada_apagada":
      return { quem, fez: `apagou a entrada (e-mail e senha) de ${alvo ?? "uma pessoa"}`, detalhe: "90 dias sem nenhum acesso · o nome continua como autor no histórico" };
    case "dados.prazos_aplicados":
      return { quem, fez: "aplicou os prazos de guarda dos dados" };
    case "estado.mudou": {
      if (e.entidade === "clientes" && d.para === "ENCERRADO") {
        return { quem, fez: "encerrou o contrato", detalhe: typeof d.motivo === "string" ? `“${d.motivo}”` : undefined };
      }
      if (e.entidade === "clientes" && d.de === "ENCERRADO") {
        return { quem, fez: "reabriu o contrato", detalhe: typeof d.motivo === "string" ? `“${d.motivo}”` : undefined };
      }
      if (e.entidade === "clientes" && typeof d.para === "string" && d.para in ESTAGIOS) {
        return {
          quem,
          fez: `passou o cliente para ${ESTAGIOS[d.para as keyof typeof ESTAGIOS]}`,
          detalhe: typeof d.motivo === "string" ? `“${d.motivo}”` : undefined,
        };
      }
      return { quem, fez: "mudou uma situação", detalhe: typeof d.motivo === "string" ? `“${d.motivo}”` : undefined };
    }
    default:
      return { quem, fez: "registrou uma ação" };
  }
}

/** Agrupa os eventos por dia (horário de Brasília), mantendo a ordem. */
export function agruparPorDia(eventos: EventoHistorico[]): { dia: string; eventos: EventoHistorico[] }[] {
  const fmt = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" });
  const grupos: { dia: string; eventos: EventoHistorico[] }[] = [];
  for (const e of eventos) {
    const dia = fmt.format(new Date(e.ocorridoEm));
    const ultimo = grupos.at(-1);
    if (ultimo?.dia === dia) ultimo.eventos.push(e);
    else grupos.push({ dia, eventos: [e] });
  }
  return grupos;
}
