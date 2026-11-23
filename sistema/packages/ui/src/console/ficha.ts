// Dados da ficha do cliente no Console (GET /v1/clientes/:id) e o que as abas calculam deles.
// Módulo simples (sem "use client"), para os testes e as páginas do servidor usarem.

import {
  conferirFormEscritorio, formDoEscritorio, linhaDaSede, TEXTO_ERRO_ESCRITORIO, TIPOS_ESCRITORIO, fichaSchema, type DadosEscritorioDocumentos, type EncerramentoConsole,
  type FormEscritorio, type SocioCliente,
} from "@t3jus/domain";

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
  } & Partial<Omit<DadosEscritorioDocumentos, "nome" | "cnpj" | "cidade" | "uf" | "endereco" | "dona">>;
  cliente: { estagio: "IMPLANTACAO" | "ATIVO" | "ENCERRADO"; referenciaContrato: string | null; versao: number };
  /** Fim do contrato registrado (F0.14); null enquanto não há. */
  encerramento?: EncerramentoConsole | null;
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
/** O rascunho: os campos dos documentos (PA-07) e os contatos. O endereço antigo vem só para comparar. */
export interface RascunhoFicha extends FormEscritorio {
  endereco: string;
  contatos: { chave: number; nome: string; papel: string; telefone: string; email: string }[];
}

let proximaChave = 1;
export const novaChave = () => proximaChave++;

export function rascunhoDe(f: FichaDoCliente): RascunhoFicha {
  const e = f.escritorio;
  return {
    ...formDoEscritorio({ ...e, endereco: e.endereco ?? null, oab: e.oab ?? null }),
    // Ficha sem as partes (servidor antes da 0860): o texto antigo vai para a rua, como na migração.
    ...(e.logradouro === undefined && e.endereco ? { logradouro: e.endereco } : {}),
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
  const t = (x: string) => (x.trim() ? x.trim() : null);
  const sem = r.tipo === "SEM_SOCIEDADE";
  const v = fichaSchema.safeParse({
    versao, nome: r.nome, cidade: r.cidade, uf: r.uf, cnpj: sem ? null : r.cnpj, contatos,
    documentos: {
      tipo: r.tipo || null, razaoSocial: sem ? null : t(r.razaoSocial), oabUf: sem ? null : t(r.oabUf), oabNumero: sem ? null : t(r.oabNumero.replace(/\D/g, "")),
      cep: t(r.cep.replace(/\D/g, "")), logradouro: t(r.logradouro), numero: t(r.numero), complemento: t(r.complemento), bairro: t(r.bairro),
      telefone: t(r.telefone.replace(/\D/g, "")), email: t(r.email), site: t(r.site),
    },
  });
  // Os campos dos documentos: a mesma conferência do Portal e do servidor (0860).
  const doc = conferirFormEscritorio(r, "CONSOLE");
  const extra: ErrosFicha = {};
  for (const [k, cod] of Object.entries(doc)) {
    if (cod && !["nome", "cnpj", "cidade", "uf"].includes(k)) extra[k] = TEXTO_ERRO_ESCRITORIO[cod] ?? "Confira este campo.";
  }
  if (v.success && !Object.keys(extra).length) return { ok: true, corpo: v.data };
  const erros: ErrosFicha = { ...extra };
  if (v.success) return { ok: false, erros };
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
  const tipo = (x: string) => (x ? TIPOS_ESCRITORIO[x as keyof typeof TIPOS_ESCRITORIO]?.nome ?? x : "");
  par("Tipo", tipo(salvo.tipo), tipo(meu.tipo));
  par("Razão social", salvo.razaoSocial, meu.razaoSocial);
  par("Registro na OAB", `${salvo.oabUf} ${salvo.oabNumero}`.trim(), `${meu.oabUf} ${meu.oabNumero.replace(/\D/g, "")}`.trim());
  const sede = (r: RascunhoFicha) => [r.cep.replace(/\D/g, ""), r.logradouro, r.numero, r.complemento, r.bairro].map(limpa).filter(Boolean).join(", ");
  par("Sede", sede(salvo), sede(meu));
  par("Telefone", salvo.telefone.replace(/\D/g, ""), meu.telefone.replace(/\D/g, ""));
  par("E-mail", salvo.email, meu.email);
  par("Site", salvo.site, meu.site);
  const resumo = (r: RascunhoFicha) => r.contatos.map((c) => `${c.nome}|${c.papel}|${c.telefone.replace(/\D/g, "")}|${c.email.toLowerCase()}`).join(";");
  if (resumo(salvo) !== resumo(meu)) {
    const n = (r: RascunhoFicha) => (r.contatos.length === 1 ? "1 contato" : `${r.contatos.length} contatos`);
    lista.push({ campo: "Contatos", salvo: n(salvo), meu: n(meu) });
  }
  return lista;
}

/** A sede numa linha só, para a leitura da ficha; o texto antigo, se ainda não foi separado. */
export function sedeDaFicha(f: FichaDoCliente): string | null {
  const e = f.escritorio;
  return linhaDaSede({ ...e, endereco: e.endereco ?? null }) ?? (e.endereco?.trim() || null);
}
