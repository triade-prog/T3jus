// A OAB na Equipe (EX-12), tela aprovada em docs/design/aprovadas/portal-equipe-oab: a mesma
// conferência do banco (0430_equipe_oab.sql) para o erro aparecer antes de enviar, e as frases
// de cada erro, presas ao campo e no resumo do topo (decisões 8 a 13).

import { numeroOabLimpo, oabTexto, UFS_BRASIL, type InscricaoOab } from "@t3jus/domain";

export type CampoOab = "uf" | "numero" | "letra" | "tipo";
export type ErrosOab = Partial<Record<CampoOab, string>>;
export interface RascunhoOab {
  uf: string;
  numero: string;
  letra: string;
}

/** Os códigos de erro de cada campo, como o banco devolveria. */
export function conferirOab(r: RascunhoOab, opcional = false): ErrosOab {
  const e: ErrosOab = {};
  const num = r.numero.trim();
  const letra = r.letra.trim();
  if (opcional && !r.uf && !num && !letra) return e;
  if (!r.uf) e.uf = "UF_OBRIGATORIA";
  else if (!(r.uf in UFS_BRASIL)) e.uf = "UF_INVALIDA";
  if (!num) e.numero = "NUMERO_OBRIGATORIO";
  else if (!numeroOabLimpo(num)) e.numero = "NUMERO_INVALIDO";
  if (letra && !/^[A-Za-z]$/.test(letra)) e.letra = "LETRA_INVALIDA";
  // No convite, número sem UF pede a UF; UF sem número pede o número (decisão 11).
  if (!r.uf && !num && !opcional) e.numero = "NUMERO_OBRIGATORIO";
  return e;
}

/** A mensagem presa ao campo. */
export function mensagemOab(campo: CampoOab, codigo: string, pessoa: string, extra?: { nome?: string; texto?: string }): string {
  const pn = pessoa.split(/\s+/)[0] ?? pessoa;
  switch (codigo) {
    case "UF_OBRIGATORIA":
      return `Escolha a UF da seccional em que ${pn} é inscrito.`;
    case "UF_INVALIDA":
      return "Escolha uma UF da lista.";
    case "UF_REPETIDA":
      return `${pn} já tem uma inscrição nesta UF. Para mudar o número, use Editar na inscrição.`;
    case "NUMERO_OBRIGATORIO":
      return `Escreva o número da OAB de ${pn}. Se não é advogado, deixe a UF em “Escolha”.`;
    case "NUMERO_INVALIDO":
      return "Use só números, até 6. A letra, se houver, vai no campo Letra.";
    case "OAB_DE_OUTRA_PESSOA":
      return `${extra?.texto ?? "Esta inscrição"} já está com ${extra?.nome ?? "outra pessoa"} nesta equipe. Confira o número na carteira de ${pn}.`;
    case "LETRA_INVALIDA":
      return "Use uma letra só, de A a Z, como está na carteira.";
    case "PRINCIPAL_JA_EXISTE":
      return `${pn} já tem a inscrição principal. Marque esta como suplementar ou troque a principal.`;
    default:
      return campo === "tipo" ? "Escolha o tipo da inscrição." : "Confira este campo.";
  }
}

/** A linha do resumo de erros, com o rótulo do campo. */
export function resumoOab(campo: CampoOab, codigo: string, extra?: { nome?: string }, prefixo = ""): string {
  const curto: Record<string, string> = {
    UF_OBRIGATORIA: "escolha uma",
    UF_INVALIDA: "escolha uma da lista",
    UF_REPETIDA: "já tem uma inscrição nesta UF",
    NUMERO_OBRIGATORIO: "falta o número",
    NUMERO_INVALIDO: "use só números",
    OAB_DE_OUTRA_PESSOA: `já é de ${extra?.nome ?? "outra pessoa"}`,
    LETRA_INVALIDA: "uma letra só",
    PRINCIPAL_JA_EXISTE: "já existe a principal",
  };
  const rotulo: Record<CampoOab, string> = { uf: "UF da seccional", numero: "Número", letra: "Letra", tipo: "Tipo" };
  return `${prefixo || rotulo[campo]}: ${curto[codigo] ?? "confira"}`;
}

/** Erros que vieram do banco: { campos, motivos, nome }. */
export function errosDoServidor(detalhes: Record<string, unknown> | undefined): { erros: ErrosOab; nome?: string } | null {
  const motivos = detalhes?.motivos;
  if (!motivos || typeof motivos !== "object") return null;
  const erros: ErrosOab = {};
  for (const [k, v] of Object.entries(motivos as Record<string, unknown>)) {
    if (["uf", "numero", "letra", "tipo"].includes(k) && typeof v === "string") erros[k as CampoOab] = v;
  }
  return { erros, nome: typeof detalhes?.nome === "string" ? detalhes.nome : undefined };
}

/** A prévia do que sai no documento, enquanto se digita; null se ainda não forma uma inscrição. */
export function previaOab(r: RascunhoOab): string | null {
  const n = numeroOabLimpo(r.numero.trim());
  if (!r.uf || !(r.uf in UFS_BRASIL) || !n) return null;
  const l = r.letra.trim();
  return oabTexto(r.uf, n, /^[A-Za-z]$/.test(l) ? l : null, true);
}

/** "do Rio de Janeiro", "de São Paulo". */
export function seccional(uf: InscricaoOab["uf"]): string {
  const com = ["RJ", "RS", "RN", "PA", "PR", "PI", "MA", "AC", "AM", "AP", "CE", "ES", "DF", "TO"];
  return `seccional ${com.includes(uf) ? "do" : "de"} ${UFS_BRASIL[uf]}`;
}
