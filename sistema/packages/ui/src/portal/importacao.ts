// Importar planilha (F3.55, VA-05): as partes sem tela. Os textos dos problemas, o que é
// obrigatório pela ligação das colunas, a planilha-modelo e a planilha das linhas de fora.

import {
  CAMPOS_CLIENTE_IMPORTACAO, CAMPOS_CONTRATO_IMPORTACAO, NOMES_CAMPO_IMPORTACAO, ORIGENS, reais,
  type CampoImportacao, type CodigoProblema, type LinhaPrevia, type LinhasFora, type ProblemaLinha, type TipoImportado,
} from "@t3jus/domain";
import type { Aba } from "./planilha.ts";

const BASE = "/clientes/importar";
export const ROTAS_IMPORTACAO = {
  enviar: BASE,
  enviarContratos: `${BASE}?contratos=1`,
  modelo: `${BASE}?modelo=1`,
  /** Um passo de uma importação já começada (colunas ou prévia). */
  passo: (id: string, passo: "colunas" | "previa") => `${BASE}/${id}?passo=${passo}`,
  resultado: (id: string) => `/clientes/importacoes/${id}`,
  desfazer: (id: string) => `/clientes/importacoes/${id}?desfazer=1`,
  historico: "/clientes/importacoes",
  clientes: (id: string, juntados = false) => `/clientes?importacao=${id}${juntados ? "&juntados=1" : ""}`,
};

export const NOMES_TIPO_IMPORTADO: Record<TipoImportado, string> = { FIXO: "Fixo", PARCELADO: "Parcelado", MENSAL: "Mensal", EXITO: "Êxito em percentual" };

/** O selo de cada problema (o texto curto da linha). */
export const SELO_PROBLEMA: Record<CodigoProblema, string> = {
  NOME_FALTA: "Sem o nome",
  CONTATO_OBRIGATORIO: "Sem telefone e sem e-mail",
  TELEFONE_INVALIDO: "Telefone ilegível",
  EMAIL_INVALIDO: "E-mail ilegível",
  CPF_INVALIDO: "CPF com dígito errado",
  CNPJ_INVALIDO: "CNPJ com dígito errado",
  DOCUMENTO_INVALIDO: "CPF ou CNPJ incompleto",
  OBJETO_FALTA: "Contrato sem o objeto",
  TIPO_FALTA: "Sem o tipo de honorário",
  VALOR_FALTA: "Contrato sem o valor",
  VALOR_INVALIDO: "Valor ilegível",
  PARCELAS_INVALIDAS: "Número de parcelas ilegível",
  PRIMEIRO_FALTA: "Sem o primeiro vencimento",
  DATA_INVALIDA: "Data que não existe",
  PAGAS_INVALIDAS: "Parcelas pagas a mais",
  RESPONSAVEL_FALTA: "Sem o responsável",
  DUPLICADO: "Possível duplicado: mesmo CPF",
  TELEFONE_DE_OUTRO: "Mesmo telefone de outro cliente",
  SEM_ASSINATURA: "Sem a data da assinatura",
  FORA_DA_LISTA: "Valor fora da lista",
  CAMPO_INVALIDO: "Campo que não dá para ler",
};

/** A explicação de cada problema, com o que fazer. */
export function explicaProblema(p: ProblemaLinha, l?: Pick<LinhaPrevia, "duplicado" | "telefoneDe">): string {
  const campo = NOMES_CAMPO_IMPORTACAO[p.campo] ?? p.campo;
  const v = p.valor ? `“${p.valor}”` : "";
  switch (p.codigo) {
    case "CPF_INVALIDO": return "Confira o CPF: o último dígito não bate com os anteriores. Veja se algum número foi trocado, ou apague para importar sem CPF.";
    case "CNPJ_INVALIDO": return "Confira o CNPJ: os dígitos finais não batem com os anteriores. Corrija ou apague para importar sem CNPJ.";
    case "DOCUMENTO_INVALIDO": return `${v} não tem 11 dígitos (CPF) nem 14 (CNPJ). Corrija ou apague.`;
    case "CONTATO_OBRIGATORIO": return "Sem telefone nem e-mail, o escritório não tem como falar com o cliente. Escreva um dos dois ou pule a linha.";
    case "TELEFONE_INVALIDO": return `${v} não parece um telefone. Escreva com o DDD, como (11) 98451-2290.`;
    case "EMAIL_INVALIDO": return `${v} não parece um e-mail.`;
    case "NOME_FALTA": return "A linha não tem o nome do cliente.";
    case "DATA_INVALIDA": return `${campo} ${v}: a data não existe ou ainda não chegou. Escreva como 10/09/2026.`;
    case "VALOR_INVALIDO": return `${v} não dá para ler como valor. Escreva como 4.800,00 (ou 30% no êxito).`;
    case "PARCELAS_INVALIDAS": return "O parcelado precisa do número de parcelas, de 1 a 120.";
    case "PRIMEIRO_FALTA": return "Falta o primeiro vencimento (no fixo, a data do pagamento).";
    case "PAGAS_INVALIDAS": return `${v} parcelas pagas é mais do que o contrato tem.`;
    case "RESPONSAVEL_FALTA": return p.valor ? `${v} não está na Equipe. Escolha no passo 2 quem fica com os contratos dele.` : "Falta o responsável pelo contrato.";
    case "OBJETO_FALTA": return "O contrato precisa do objeto (o serviço contratado).";
    case "TIPO_FALTA": return p.valor ? `${v} não é um tipo de honorário que a planilha traz. Use fixo, parcelado, mensal ou êxito.` : "Falta o tipo de honorário.";
    case "VALOR_FALTA": return "O contrato precisa do valor.";
    case "DUPLICADO": return l?.duplicado ? `Mesmo CPF de ${l.duplicado.nome}, já cadastrado.` : "Mesmo CPF de um cliente já cadastrado.";
    case "TELEFONE_DE_OUTRO": return l?.telefoneDe ? `É o telefone de ${l.telefoneDe.nome}. Pode ser da família.` : "É o telefone de outro cliente. Pode ser da família.";
    case "SEM_ASSINATURA": return "O contrato entra em elaboração e vai ao Financeiro quando a assinatura for registrada.";
    case "FORA_DA_LISTA": return `${v} não está na lista de ${campo.toLowerCase()}. O campo fica vazio, ou escolha um da lista.`;
    case "CAMPO_INVALIDO": return `${campo} ${v} não dá para ler. O campo fica vazio, ou corrija.`;
  }
}

/** Os obrigatórios pela ligação (decisão 14), na ordem da lista ao lado. */
export type Obrigatorio = "nome" | "contato" | "objeto" | "tipo" | "valor" | "parcelas" | "primeiro" | "responsavel";
export const NOMES_OBRIGATORIO: Record<Obrigatorio, string> = {
  nome: "Nome ou razão social", contato: "Telefone ou e-mail", objeto: "Objeto do contrato", tipo: "Tipo de honorário",
  valor: "Valor", parcelas: "Número de parcelas (no parcelado)", primeiro: "Primeiro vencimento", responsavel: "Responsável pelo contrato",
};

export function obrigatorios(contratos: boolean): Obrigatorio[] {
  return contratos ? ["nome", "contato", "objeto", "tipo", "valor", "parcelas", "primeiro", "responsavel"] : ["nome", "contato"];
}

/** O que falta ligar, olhando a ligação e os tipos escolhidos nos pares. */
export function faltaLigar(ligacao: Record<string, string>, contratos: boolean, tipos: string[]): Obrigatorio[] {
  const tem = new Set(Object.values(ligacao).filter(Boolean));
  const f: Obrigatorio[] = [];
  if (!tem.has("nome")) f.push("nome");
  if (!tem.has("telefone") && !tem.has("email")) f.push("contato");
  if (contratos) {
    for (const k of ["objeto", "tipo", "valor"] as const) if (!tem.has(k)) f.push(k);
    if (tipos.includes("PARCELADO") && !tem.has("parcelas")) f.push("parcelas");
    if (tipos.some((t) => t === "FIXO" || t === "PARCELADO" || t === "MENSAL") && !tem.has("primeiro")) f.push("primeiro");
  }
  return f;
}

/** As colunas onde vive cada obrigatório (para a lista ao lado: "Coluna C e D"). */
export function ondeLigado(ligacao: Record<string, string>, letras: string[], o: Obrigatorio): string {
  const campos = o === "contato" ? ["telefone", "email"] : [o];
  const ls = Object.entries(ligacao).filter(([, c]) => campos.includes(c)).map(([i]) => letras[Number(i)]).filter(Boolean);
  return ls.length === 0 ? "" : ls.length === 1 ? `Coluna ${ls[0]}` : `Colunas ${ls.join(" e ")}`;
}

/** As opções do "Vai para" de cada grupo, sem os campos que a pessoa não pode importar. */
export function camposDoGrupo(grupo: "cliente" | "contrato", comercial: boolean): CampoImportacao[] {
  if (grupo === "contrato") return [...CAMPOS_CONTRATO_IMPORTACAO];
  return CAMPOS_CLIENTE_IMPORTACAO.filter((c) => comercial || (c !== "origem" && c !== "origem_indicacao"));
}

export function ehCampoContrato(c: string | null | undefined): boolean {
  return !!c && (CAMPOS_CONTRATO_IMPORTACAO as readonly string[]).includes(c);
}

/** A condição de uma linha em texto: "Parcelado · 6 de R$ 800,00". */
export function condicaoTexto(c: NonNullable<LinhaPrevia["contrato"]>): string {
  if (!c.tipo) return "Sem o tipo de honorário";
  const nome = c.tipo === "EXITO" ? "Êxito" : NOMES_TIPO_IMPORTADO[c.tipo];
  if (c.valor === null) return nome;
  if (c.tipo === "EXITO") return `${nome} · ${String(c.valor / 100).replace(".", ",")}%`;
  if (c.tipo === "PARCELADO" && c.parcelas) {
    const base = Math.floor(c.valor / c.parcelas);
    return c.valor % c.parcelas === 0 ? `${nome} · ${c.parcelas} de ${reais(base)}` : `${nome} · ${reais(c.valor)} em ${c.parcelas}`;
  }
  return `${nome} · ${reais(c.valor)}`;
}

/** "2 de R$ 1.666,67 e 1 de R$ 1.666,66" (o centavo que sobra vai para as primeiras). */
export function resumoParcelas(valores: number[]): string {
  const grupos: { v: number; n: number }[] = [];
  for (const v of valores) {
    const g = grupos.at(-1);
    if (g && g.v === v) g.n++;
    else grupos.push({ v, n: 1 });
  }
  return grupos.map((g) => `${g.n} de ${reais(g.v)}`).join(" e ");
}

export const nomeDoMes = (ym: string) => {
  const [a, m] = ym.split("-");
  const nomes = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${nomes[Number(m) - 1]}/${a}`;
};

// ------------------------------------------------------------------------------------- planilhas

/** A planilha-modelo (decisão 6): os nomes das colunas e uma linha de exemplo. */
export function abaModelo(contratos: boolean): Aba[] {
  const cli = ["Nome ou razão social", "CPF ou CNPJ", "Telefone ou WhatsApp", "E-mail", "Com quem falar", "Papel do contato", "Nacionalidade", "Estado civil",
    "Profissão", "RG", "Órgão emissor do RG", "CEP", "Endereço", "Bairro", "Cidade", "UF", "Origem", "Quem indicou"];
  const exCli = ["Rosa Almeida", "529.982.247-25", "(11) 98451-2290", "rosa.almeida@exemplo.com.br", "", "", "Brasileira", "Casado(a)", "Professora",
    "32.418.776-5", "SSP/SP", "05425-070", "Rua Cardeal Arcoverde, 1200, ap. 54", "Pinheiros", "São Paulo", "SP", ORIGENS.INDICACAO_CLIENTE, "Irene Castro"];
  const ctr = ["Objeto do contrato", "Tipo de honorário", "Valor", "Número de parcelas", "Primeiro vencimento", "Parcelas já pagas", "Data da assinatura",
    "Responsável pelo contrato"];
  const exCtr = ["Aposentadoria por idade", "Parcelado", "4.800,00", "6", "10/09/2026", "2", "02/09/2026", "Marina Ribeiro"];
  const nomes = contratos ? [...cli, ...ctr] : cli;
  const ex = contratos ? [...exCli, ...exCtr] : exCli;
  return [{ nome: contratos ? "Clientes e contratos" : "Clientes", larguras: nomes.map((n) => Math.max(14, Math.min(36, n.length + 4))), linhas: [nomes, ex] }];
}

/** A planilha das linhas de fora (decisão 28): só elas, com a linha da planilha e o motivo. */
export function abaFora(f: LinhasFora): Aba[] {
  const campos = Object.entries(f.ligacao).sort(([a], [b]) => Number(a) - Number(b)).map(([, c]) => c);
  const motivo = (l: LinhasFora["linhas"][number]) => {
    const ps = l.problemas.filter((p) => p.nivel === "ERRO");
    const lista = (ps.length ? ps : l.problemas).map((p) => SELO_PROBLEMA[p.codigo]);
    if (l.situacao === "PULADA") return `${lista.length ? `${lista.join("; ")} · ` : ""}pulada por você`;
    return lista.join("; ") || "Não entrou";
  };
  return [{
    nome: "Linhas de fora",
    larguras: [10, 40, ...campos.map(() => 22)],
    linhas: [
      ["Linha", "Motivo", ...campos.map((c) => NOMES_CAMPO_IMPORTACAO[c] ?? c)],
      ...f.linhas.map((l) => [l.numero, motivo(l), ...campos.map((c) => l.valores[c] ?? "")]),
    ],
  }];
}

export function nomeArquivoFora(arquivo: string): string {
  return `linhas-de-fora-${arquivo.replace(/\.[^.]+$/, "").replace(/[^\w.-]+/g, "-").slice(0, 60)}.xlsx`;
}
