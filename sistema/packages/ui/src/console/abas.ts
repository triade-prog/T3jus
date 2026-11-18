// Abas da ficha do cliente, na ordem da tela aprovada. Fora do componente de cliente para a
// página do servidor poder conferir a aba do endereço.
export const ABAS_FICHA = {
  ficha: "Ficha",
  socio: "Sócio",
  contrato: "Contrato e documentos",
  equipe: "Equipe T3jus",
  notas: "Notas internas",
  historico: "Histórico",
} as const;
export type AbaFicha = keyof typeof ABAS_FICHA;

export const ehAbaFicha = (a: string): a is AbaFicha => Object.hasOwn(ABAS_FICHA, a);
