// Regras do pedido de demonstração (F2.2, SC-02). As mesmas no navegador e no servidor.

export const TAMANHOS = ["Só eu", "2 a 5", "6 a 10", "Mais de 10"] as const;
export const AREAS = [
  "Previdenciário",
  "Trabalhista",
  "Família e sucessões",
  "Cível e consumidor",
  "Empresarial e tributário",
  "Criminal",
  "Várias áreas",
  "Outra",
] as const;

/** Tempo mínimo entre abrir a página e enviar: quem envia antes é robô. */
export const TEMPO_MINIMO_MS = 3000;

export interface Pedido {
  nome: string;
  escritorio: string;
  email: string;
  whats: string;
  tamanho: string;
  area: string;
  msg: string;
  aceite: boolean;
}

export type Campo = "nome" | "escritorio" | "email" | "whats" | "tamanho" | "aceite";
export type Erros = Partial<Record<Campo, string>>;

const limpar = (v: unknown, max: number) =>
  (typeof v === "string" ? v : "").replace(/\s+/g, " ").trim().slice(0, max);

/** Só os dígitos do WhatsApp, sem o +55. */
export function digitosWhats(v: string): string {
  let d = v.replace(/\D/g, "");
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) d = d.slice(2);
  return d;
}

export function normalizar(bruto: Record<string, unknown>): Pedido {
  return {
    nome: limpar(bruto.nome, 120),
    escritorio: limpar(bruto.escritorio, 160),
    email: limpar(bruto.email, 200).toLowerCase(),
    whats: limpar(bruto.whats, 20),
    tamanho: limpar(bruto.tamanho, 20),
    area: (AREAS as readonly string[]).includes(limpar(bruto.area, 40)) ? limpar(bruto.area, 40) : "",
    msg: (typeof bruto.msg === "string" ? bruto.msg : "").trim().slice(0, 1000),
    aceite: bruto.aceite === true || bruto.aceite === "on" || bruto.aceite === "true",
  };
}

export function validar(p: Pedido): Erros {
  const erros: Erros = {};
  if (p.nome.length < 2) erros.nome = "Escreva o seu nome.";
  if (p.escritorio.length < 2) erros.escritorio = "Escreva o nome do escritório.";
  if (!p.email) erros.email = "Escreva o seu e-mail.";
  else if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(p.email)) {
    erros.email = /^[^\s@]+@[^\s@.]+$/.test(p.email)
      ? "Confira o e-mail: falta o final, como “.com.br”."
      : "Confira o e-mail: ele precisa ser como nome@escritorio.com.br.";
  }
  const d = digitosWhats(p.whats);
  if (!p.whats) erros.whats = "Escreva o seu WhatsApp, com DDD.";
  else if (d.length < 10 || d.length > 11 || d.startsWith("0")) {
    erros.whats = "Confira o WhatsApp: com DDD, como (86) 99812-4410.";
  }
  if (!(TAMANHOS as readonly string[]).includes(p.tamanho)) erros.tamanho = "Escolha o tamanho da equipe.";
  if (!p.aceite) erros.aceite = "Para enviar, marque a autorização. Sem ela, não podemos guardar os seus dados.";
  return erros;
}

export function resumoErros(n: number): string {
  return n === 1 ? "Falta acertar 1 ponto, marcado abaixo." : `Falta acertar ${n} pontos, marcados abaixo.`;
}
