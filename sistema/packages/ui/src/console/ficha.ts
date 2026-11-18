// Dados da ficha do cliente no Console (GET /v1/clientes/:id) e o que as abas calculam deles.
// Módulo simples (sem "use client"), para os testes e as páginas do servidor usarem.

import { fichaSchema, type SocioCliente } from "@t3jus/domain";

export interface ContatoFicha {
  nome: string;
  papel: string;
  telefone?: string | null;
  email?: string | null;
}

export interface FichaDoCliente {
  escritorio: {
    id: string;
    nome: string;
    cidade: string | null;
    uf: string | null;
    endereco?: string | null;
    cnpj: string | null;
    contatos?: ContatoFicha[];
    criadoEm: string;
    versao: number;
  };
  cliente: { estagio: "IMPLANTACAO" | "ATIVO"; referenciaContrato: string | null; versao: number };
  socios: SocioCliente[];
  equipe: { vinculoId: string; pessoaId: string; nome: string; funcao: string; desde?: string; versao?: number }[];
  situacoes: string[];
  ultimaAtividade: string;
  /** Quem salvou a ficha por último e quando (o conflito de edição diz isso). */
  fichaAlteradaPor?: string | null;
  fichaAlteradaEm?: string | null;
  permissoes: string[];
}

export interface Nota {
  id: string;
  texto: string;
  criadoEm: string;
  autor: { id: string; nome: string | null };
}

/** "22.914.870/0001-09". */
export function formatarCnpj(d: string): string {
  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

/** "+5581997342210" vira "(81) 99734-2210"; fora do Brasil, fica como veio. */
export function formatarTelefone(t: string): string {
  const m = /^\+55(\d{2})(\d{4,5})(\d{4})$/.exec(t);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : t;
}

/** O que a pessoa escreve no formulário da ficha. */
export interface RascunhoFicha {
  nome: string;
  cnpj: string;
  cidade: string;
  uf: string;
  endereco: string;
  contatos: { chave: number; nome: string; papel: string; telefone: string; email: string }[];
}

let proximaChave = 1;
export const novaChave = () => proximaChave++;

export function rascunhoDe(f: FichaDoCliente): RascunhoFicha {
  const e = f.escritorio;
  return {
    nome: e.nome,
    cnpj: e.cnpj ? formatarCnpj(e.cnpj) : "",
    cidade: e.cidade ?? "",
    uf: e.uf ?? "",
    endereco: e.endereco ?? "",
    contatos: (e.contatos ?? []).map((c) => ({
      chave: novaChave(),
      nome: c.nome,
      papel: c.papel,
      telefone: c.telefone ? formatarTelefone(c.telefone) : "",
      email: c.email ?? "",
    })),
  };
}

/** Erros do formulário, pela chave do campo ("nome", "contato.3.email", "contato.3.par"). */
export type ErrosFicha = Record<string, string>;

/**
 * Confere o rascunho com o mesmo esquema da API e devolve o corpo pronto ou os erros, com os
 * textos aprovados.
 */
export function conferirFicha(r: RascunhoFicha, versao: number):
  | { ok: true; corpo: ReturnType<typeof fichaSchema.parse> }
  | { ok: false; erros: ErrosFicha } {
  const contatos = r.contatos.map((c) => ({
    nome: c.nome,
    papel: c.papel,
    ...(c.telefone.trim() ? { telefone: c.telefone } : {}),
    ...(c.email.trim() ? { email: c.email } : {}),
  }));
  const v = fichaSchema.safeParse({
    versao, nome: r.nome, cidade: r.cidade, uf: r.uf, endereco: r.endereco, cnpj: r.cnpj, contatos,
  });
  if (v.success) return { ok: true, corpo: v.data };
  const erros: ErrosFicha = {};
  for (const i of v.error.issues) {
    const [campo, n, sub] = i.path;
    if (campo === "contatos" && typeof n === "number") {
      const c = r.contatos[n]!;
      const primeiro = c.nome.trim().split(/\s+/)[0] || "este contato";
      if (sub === "telefone" && !c.telefone.trim() && !c.email.trim()) erros[`contato.${c.chave}.par`] = `Informe telefone ou e-mail de ${primeiro}.`;
      else if (sub === "telefone") erros[`contato.${c.chave}.telefone`] = "Confira o telefone, com o DDD.";
      else if (sub === "email") erros[`contato.${c.chave}.email`] = "Confira o e-mail: falta o @ ou o final, como .adv.br.";
      else if (sub === "nome") erros[`contato.${c.chave}.nome`] = "Escreva o nome.";
      else if (sub === "papel") erros[`contato.${c.chave}.papel`] = "Escreva o papel, como Sócia ou Secretária.";
      continue;
    }
    if (campo === "nome") erros.nome = "Escreva o nome do escritório.";
    else if (campo === "cnpj") erros.cnpj = "Os dígitos do CNPJ não conferem. Confira o número no cartão do CNPJ.";
    else if (campo === "cidade") erros.cidade = "O nome da cidade precisa de ao menos 2 letras.";
    else if (campo === "uf") erros.uf = "Escolha a UF.";
    else if (campo === "endereco") erros.endereco = "O endereço tem no máximo 200 caracteres.";
  }
  return { ok: false, erros };
}

/** Campos que mudaram entre a versão salva e o que a pessoa escreveu (conflito de edição). */
export function camposDiferentes(salvo: RascunhoFicha, meu: RascunhoFicha): { campo: string; salvo: string; meu: string }[] {
  const limpa = (s: string) => s.trim();
  const lista: { campo: string; salvo: string; meu: string }[] = [];
  const par = (campo: string, a: string, b: string) => {
    if (limpa(a) !== limpa(b)) lista.push({ campo, salvo: a || "Em branco", meu: b || "Em branco" });
  };
  par("Nome", salvo.nome, meu.nome);
  par("CNPJ", salvo.cnpj.replace(/\D/g, ""), meu.cnpj.replace(/\D/g, ""));
  par("Cidade", salvo.cidade, meu.cidade);
  par("UF", salvo.uf, meu.uf);
  par("Endereço", salvo.endereco, meu.endereco);
  const resumo = (r: RascunhoFicha) => r.contatos.map((c) => `${c.nome}|${c.papel}|${c.telefone.replace(/\D/g, "")}|${c.email.toLowerCase()}`).join(";");
  if (resumo(salvo) !== resumo(meu)) {
    const n = (r: RascunhoFicha) => (r.contatos.length === 1 ? "1 contato" : `${r.contatos.length} contatos`);
    lista.push({ campo: "Contatos", salvo: n(salvo), meu: n(meu) });
  }
  return lista;
}
